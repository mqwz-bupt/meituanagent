/**
 * plan-revision.test.ts — 局部重规划 TDD 测试
 * 先写测试，再实现 revision.ts
 */
import { describe, it, expect } from 'vitest';
import { planClosedLoop, buildBusinessConversion, buildConstraintExplanation, type UserConstraints, type RouteArtifacts } from '../agent/closed-loop.js';
import { parseFeedbackIntent, reviseClosedLoopPlan, type FeedbackIntent, type RevisionResult } from '../agent/revision.js';
import { runDemoExecutionAgent, runDemoPlanningAgent } from '../agent/demo.js';
import { createSession, setPlan, transitionState } from '../state.js';
import { getActivityById, getRestaurantById } from '../mock/data.js';

// Helper: 生成一个家庭方案作为 base
async function makeFamilyPlan() {
  return planClosedLoop('今天下午想带5岁孩子和老婆出去玩，老婆在减肥');
}

// Helper: 从 plan items 找到 venueId
function findItemByVenueId(items: Array<{ venueId: string; venue: string }>, prefix: string) {
  return items.find(it => it.venueId.startsWith(prefix));
}

// Helper: 解析 "约 123 元" → 123
function parseCost(costStr: string): number {
  const match = costStr.match(/(\d+)/);
  return match ? Number(match[1]) : Infinity;
}

describe('parseFeedbackIntent', () => {
  it('识别餐厅替换 — 太油了', () => {
    const intent = parseFeedbackIntent('这家餐厅太油了，换一家清淡点的');
    expect(intent.type).toBe('restaurant_replace');
    expect(intent.reason).toContain('饮食偏好');
  });

  it('识别餐厅替换 — 低脂', () => {
    const intent = parseFeedbackIntent('有没有低脂一点的');
    expect(intent.type).toBe('restaurant_replace');
  });

  it('识别餐厅替换 — 不想吃日料', () => {
    const intent = parseFeedbackIntent('老婆不想吃日料');
    expect(intent.type).toBe('restaurant_replace');
    expect(intent.avoidCuisine).toContain('日料');
  });

  it('识别排队 — 不想排队', () => {
    const intent = parseFeedbackIntent('不想排队');
    expect(intent.type).toBe('queue_avoid');
  });

  it('识别活动替换 — 孩子不喜欢', () => {
    const intent = parseFeedbackIntent('孩子不喜欢这个活动，换个室内亲子活动');
    expect(intent.type).toBe('activity_replace');
    expect(intent.preferIndoor).toBe(true);
  });

  it('识别活动替换 — 换个轻松的', () => {
    const intent = parseFeedbackIntent('有没有更轻松的');
    expect(intent.type).toBe('activity_replace');
  });

  it('识别路线调整 — 太远了', () => {
    const intent = parseFeedbackIntent('太远了');
    expect(intent.type).toBe('route_adjust');
  });

  it('识别路线调整 — 别跨区', () => {
    const intent = parseFeedbackIntent('别跨区');
    expect(intent.type).toBe('route_adjust');
  });

  it('识别预算调整 — 预算有点高', () => {
    const intent = parseFeedbackIntent('预算有点高，便宜一点');
    expect(intent.type).toBe('budget_adjust');
  });

  it('识别预算调整 — 别太贵', () => {
    const intent = parseFeedbackIntent('别太贵');
    expect(intent.type).toBe('budget_adjust');
  });
});

describe('external feedback source parsing', () => {
  it('detects wife feedback and restaurant replacement intent', () => {
    const intent = parseFeedbackIntent('老婆说这家餐厅太油了，换清淡点。');
    expect(intent.feedbackSource).toBe('wife');
    expect(intent.type).toBe('restaurant_replace');
    expect(intent.originalFeedback).toContain('老婆');
  });

  it('detects friend feedback and route adjustment intent', () => {
    const intent = parseFeedbackIntent('朋友说太远了，能不能近一点。');
    expect(['friend', 'group']).toContain(intent.feedbackSource);
    expect(intent.type).toBe('route_adjust');
  });

  it('detects group feedback and queue avoidance intent', () => {
    const intent = parseFeedbackIntent('群里有人说不想排队。');
    expect(intent.feedbackSource).toBe('group');
    expect(intent.type).toBe('queue_avoid');
  });

  it('detects child feedback and activity replacement intent', () => {
    const intent = parseFeedbackIntent('孩子不喜欢这个活动，换个室内的。');
    expect(intent.feedbackSource).toBe('child');
    expect(intent.type).toBe('activity_replace');
    expect(intent.preferIndoor).toBe(true);
  });
});

describe('external feedback revision loop', () => {
  it('老婆反馈餐厅太油：保留活动、替换清淡餐厅、shareText 面向老婆', async () => {
    const base = await makeFamilyPlan();
    const intent = parseFeedbackIntent('老婆说这家餐厅太油了，换清淡点。');

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, intent, base.routeArtifacts);

    expect(intent.feedbackSource).toBe('wife');
    expect(intent.type).toBe('restaurant_replace');
    expect(findItemByVenueId(result.plan.items, 'a')?.venueId).toBe(findItemByVenueId(base.plan.items, 'a')?.venueId);
    expect(findItemByVenueId(result.plan.items, 'r')?.venueId).not.toBe(findItemByVenueId(base.plan.items, 'r')?.venueId);
    expect(result.replacedRestaurant?.dietFriendly || result.replacedRestaurant?.lowCalorie).toBe(true);
    expect(result.shareText).toContain('老婆');
    expect(result.shareText).toMatch(/清淡|低负担|低卡|按你/);
    expect(result.externalFeedback?.feedbackSource).toBe('wife');
    expect(result.externalFeedback?.intent).toBe('restaurant_replace');
    expect(result.trace.map(t => t.tool)).toEqual(expect.arrayContaining([
      'external_feedback_received',
      'feedback_source_detected',
      'plan_revised_from_external_feedback',
    ]));
  });

  it('朋友反馈太远：路线不变差，shareText 适合发群聊', async () => {
    const base = await makeFamilyPlan();
    const intent = parseFeedbackIntent('朋友说太远了，能不能近一点。');

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, intent, base.routeArtifacts);

    expect(['friend', 'group']).toContain(intent.feedbackSource);
    expect(intent.type).toBe('route_adjust');
    expect(result.routeArtifacts.districtDistance).toBeLessThanOrEqual(base.routeArtifacts.districtDistance);
    expect(result.routeArtifacts.durationMinutes).toBeLessThanOrEqual(base.routeArtifacts.durationMinutes);
    expect(result.shareText).toMatch(/大家|朋友|群|按大家意见/);
  });

  it('群聊反馈不想排队：替换餐厅并降低等待', async () => {
    const base = await makeFamilyPlan();
    const originalRestaurantId = findItemByVenueId(base.plan.items, 'r')?.venueId ?? '';
    const originalRestaurant = getRestaurantById(originalRestaurantId);
    const intent = parseFeedbackIntent('群里有人说不想排队。');

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, intent, base.routeArtifacts);

    expect(intent.feedbackSource).toBe('group');
    expect(intent.type).toBe('queue_avoid');
    expect(findItemByVenueId(result.plan.items, 'r')?.venueId).not.toBe(originalRestaurantId);
    expect(result.replacedRestaurant).toBeDefined();
    expect(result.replacedRestaurant!.queueMinutes ?? 0).toBeLessThanOrEqual(originalRestaurant?.queueMinutes ?? 999);
    expect(result.trace.map(t => t.tool)).toEqual(expect.arrayContaining([
      'external_feedback_received',
      'group_preference_parsed',
      'plan_revised_from_external_feedback',
    ]));
  });

  it('孩子反馈不喜欢活动：替换为室内或亲子活动并更新 shareText', async () => {
    const base = await makeFamilyPlan();
    const originalRestaurantId = findItemByVenueId(base.plan.items, 'r')?.venueId;
    const intent = parseFeedbackIntent('孩子不喜欢这个活动，换个室内的。');

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, intent, base.routeArtifacts);

    expect(intent.feedbackSource).toBe('child');
    expect(intent.type).toBe('activity_replace');
    expect(result.replacedActivity).toBeDefined();
    const newActivity = getActivityById(result.replacedActivity!.id);
    expect(newActivity?.indoor || newActivity?.tags.some(t => /亲子|儿童|孩子/.test(t))).toBe(true);
    expect(findItemByVenueId(result.plan.items, 'r')?.venueId).toBeDefined();
    if (findItemByVenueId(result.plan.items, 'r')?.venueId !== originalRestaurantId) {
      expect(result.replacedRestaurant).toBeDefined();
    }
    expect(result.shareText).toMatch(/孩子|室内|更轻松|适合/);
  });
});

describe('reviseClosedLoopPlan — 餐厅替换', () => {
  it('只替换餐厅，保留活动不变', async () => {
    const base = await makeFamilyPlan();
    const feedback = parseFeedbackIntent('这家餐厅太油了，换一家清淡点的');

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    // activity 不变
    const origActivity = findItemByVenueId(base.plan.items, 'a');
    const revisedActivity = findItemByVenueId(result.plan.items, 'a');
    expect(revisedActivity?.venueId).toBe(origActivity?.venueId);

    // restaurant 改变
    const origRestaurant = findItemByVenueId(base.plan.items, 'r');
    const revisedRestaurant = findItemByVenueId(result.plan.items, 'r');
    expect(revisedRestaurant?.venueId).not.toBe(origRestaurant?.venueId);
    expect(result.trace.map(t => t.tool)).toContain('keep_activity');

    // 新餐厅应该 dietFriendly 或 lowCalorie
    expect(result.replacedRestaurant).toBeDefined();
    expect(result.replacedRestaurant!.dietFriendly || result.replacedRestaurant!.lowCalorie).toBe(true);

    // shareText 更新 — 不应包含原餐厅名
    expect(result.shareText).not.toContain(base.selectedRestaurant.name);
  });

  it('不想排队 — 新餐厅 queueMinutes 小于阈值', async () => {
    const base = await makeFamilyPlan();
    const feedback = parseFeedbackIntent('不想排队，换一家不用等的');

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    const newRest = result.replacedRestaurant;
    expect(newRest).toBeDefined();
    // 新餐厅 queueMinutes 应 < 15 (阈值)
    const qm = newRest!.queueMinutes ?? 0;
    expect(qm).toBeLessThan(15);

    // trace 包含 search_alternative_restaurant
    const traceTools = result.trace.map(t => t.tool);
    expect(traceTools).toContain('search_alternative_restaurant');
  });

  it('排除指定菜系 — 不想吃日料', async () => {
    const base = await makeFamilyPlan();
    const feedback = parseFeedbackIntent('老婆不想吃日料');

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    // 新餐厅不应包含日料
    const newRest = result.replacedRestaurant;
    expect(newRest).toBeDefined();
    expect(newRest!.cuisine).not.toContain('日料');
    expect(newRest!.cuisine).not.toContain('寿司');
  });
});

describe('reviseClosedLoopPlan — 活动替换', () => {
  it('只替换活动，餐厅尽量不变', async () => {
    const base = await makeFamilyPlan();
    const feedback = parseFeedbackIntent('孩子不喜欢这个活动，换个室内亲子活动');

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    // restaurant 尽量不变（同 district 或同 ID）
    const origRest = findItemByVenueId(base.plan.items, 'r');
    const revisedRest = findItemByVenueId(result.plan.items, 'r');
    expect(revisedRest).toBeDefined();
    expect(revisedRest?.venueId).toBe(origRest?.venueId);
    expect(result.replacedRestaurant).toBeUndefined();
    expect(result.trace.map(t => t.tool)).toContain('keep_restaurant');

    // activity 改变
    const origAct = findItemByVenueId(base.plan.items, 'a');
    const revisedAct = findItemByVenueId(result.plan.items, 'a');
    expect(revisedAct?.venueId).not.toBe(origAct?.venueId);

    // 新活动应该是 childFriendly 且室内
    const newAct = result.replacedActivity;
    expect(newAct).toBeDefined();
    expect(newAct!.tags.some(t => /亲子|儿童|乐园/.test(t))).toBe(true);
    expect(newAct!.indoor).toBe(true);

    // routeArtifacts 更新
    expect(result.routeArtifacts).toBeDefined();
  });
});

describe('reviseClosedLoopPlan — 路线调整', () => {
  it('太远 — 优先同区或距离下降', async () => {
    const base = await makeFamilyPlan();
    const feedback = parseFeedbackIntent('太远了，尽量同区');

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    // sameDistrict 应为 true 或 districtDistance 应下降或不增加
    if (result.routeArtifacts.sameDistrict) {
      expect(result.routeArtifacts.sameDistrict).toBe(true);
    } else {
      expect(result.routeArtifacts.districtDistance).toBeLessThanOrEqual(base.routeArtifacts.districtDistance);
    }

    // 不应无关替换所有节点 — 至少有一个保留
    const keptActivity = findItemByVenueId(base.plan.items, 'a')?.venueId
      === findItemByVenueId(result.plan.items, 'a')?.venueId;
    const keptRestaurant = findItemByVenueId(base.plan.items, 'r')?.venueId
      === findItemByVenueId(result.plan.items, 'r')?.venueId;
    expect(keptActivity || keptRestaurant).toBe(true);
  });

  it('route_adjust 不应替换成更差方案 — districtDistance 不增加', async () => {
    const base = await makeFamilyPlan();
    const feedback = parseFeedbackIntent('太远了，别跨区');

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    // districtDistance 不应增加
    expect(result.routeArtifacts.districtDistance).toBeLessThanOrEqual(base.routeArtifacts.districtDistance);
    // durationMinutes 不应增加
    expect(result.routeArtifacts.durationMinutes).toBeLessThanOrEqual(base.routeArtifacts.durationMinutes);
  });

  it('找不到更近方案时不应替换成更差方案', async () => {
    const base = await makeFamilyPlan();
    // 如果已经同区，应返回 no_better_route_found
    if (base.routeArtifacts.sameDistrict) {
      const feedback = parseFeedbackIntent('太远了，别跨区');
      const result = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);
      expect(result.revisionReason).toContain('no_better_route_found');
      // plan 不应变
      expect(result.plan).toEqual(base.plan);
    }
  });
});

describe('reviseClosedLoopPlan — 预算调整', () => {
  it('太贵 — 总花费下降', async () => {
    const base = await makeFamilyPlan();
    const feedback = parseFeedbackIntent('预算有点高，便宜一点');

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    // 总花费应下降
    const origCost = parseCost(base.plan.totalCost);
    const revisedCost = parseCost(result.plan.totalCost);
    expect(revisedCost).toBeLessThan(origCost);

    // 不应清空原计划
    expect(result.plan.items.length).toBeGreaterThanOrEqual(base.plan.items.length - 1);
  });

  it('budget_adjust 新餐厅人均应低于原餐厅', async () => {
    const base = await makeFamilyPlan();
    const feedback = parseFeedbackIntent('预算有点高，便宜一点');

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    if (result.replacedRestaurant) {
      expect(result.replacedRestaurant.avgPrice).toBeLessThan(base.selectedRestaurant.avgPrice);
    }
  });

  it('找不到更便宜方案时不应假装优化成功', async () => {
    // 用一个已经很便宜的方案测试 — budget_adjust 如果找不到更便宜的应返回 no_cheaper_option_found
    const base = await makeFamilyPlan();
    // 强行设置一个极低的预算让 findCheaperRestaurant 失败
    const cheapConstraints = { ...base.constraints };
    // 不修改 constraints — 让正常流程测试
    // 如果方案已是最便宜，revisionReason 应包含 no_cheaper_option_found
    const feedback = parseFeedbackIntent('预算有点高，便宜一点');
    const result = await reviseClosedLoopPlan(base.plan, cheapConstraints, feedback, base.routeArtifacts);

    // 如果没有替换任何东西，reason 应包含 no_cheaper_option_found
    if (!result.replacedRestaurant && !result.replacedActivity) {
      expect(result.revisionReason).toContain('no_cheaper_option_found');
      expect(result.plan).toEqual(base.plan);
    }
  });
});

describe('reviseClosedLoopPlan — trace', () => {
  it('局部重规划 trace 包含关键事件', async () => {
    const base = await makeFamilyPlan();
    const feedback = parseFeedbackIntent('这家餐厅太油了，换一家清淡点的');

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    const tools = result.trace.map(t => t.tool);
    expect(tools).toContain('user_feedback_received');
    expect(tools).toContain('plan_revised');
    expect(tools).toContain('route_recalculated');
    // 应有 keep_activity 或 keep_restaurant
    const hasKeep = tools.some(t => t === 'keep_activity' || t === 'keep_restaurant');
    expect(hasKeep).toBe(true);
  });

  it('revisionReason 存在', async () => {
    const base = await makeFamilyPlan();
    const feedback = parseFeedbackIntent('太贵了');

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    expect(result.revisionReason).toBeDefined();
    expect(result.revisionReason!.length).toBeGreaterThan(0);
  });
});

describe('P0: revision 后确认执行使用 revised plan', () => {
  it('执行阶段使用 revised restaurant，不是原 restaurant 也不是重新规划的', async () => {
    // 1. 生成初始家庭方案
    const base = await makeFamilyPlan();
    const originalActivity = findItemByVenueId(base.plan.items, 'a')!;
    const originalRestaurant = findItemByVenueId(base.plan.items, 'r')!;
    expect(originalActivity).toBeDefined();
    expect(originalRestaurant).toBeDefined();

    // 2. 用户反馈：太油了 → 生成 revised plan
    const feedback = parseFeedbackIntent('这家餐厅太油了，换一家清淡点的');
    const revResult = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    // 验证 revision 成功替换了餐厅
    const revisedRestaurant = findItemByVenueId(revResult.plan.items, 'r')!;
    expect(revisedRestaurant.venueId).not.toBe(originalRestaurant.venueId);

    // 3. 模拟 session 状态：设置 planningContext 并确认执行
    const session = createSession('test-revision-exec');
    setPlan(session, revResult.plan);
    session.planningContext = {
      constraints: revResult.routeArtifacts as unknown as Record<string, unknown>,
      routeArtifacts: revResult.routeArtifacts as unknown as Record<string, unknown>,
    };
    // 设置正确的 planningContext: constraints 来自 base，routeArtifacts 来自 revision
    session.planningContext = {
      constraints: base.constraints as unknown as Record<string, unknown>,
      routeArtifacts: revResult.routeArtifacts as unknown as Record<string, unknown>,
    };

    // 4. 执行 booking
    const events: Array<{ type: string; [key: string]: unknown }> = [];
    for await (const event of runDemoExecutionAgent(session)) {
      events.push(event);
    }

    // 5. 断言：execution 使用的应该是 revised restaurant
    const bookingEvent = events.find(e => e.type === 'booking_complete');
    expect(bookingEvent).toBeDefined();

    const shareText = (bookingEvent as { shareText?: string })?.shareText ?? '';
    const confirmationCard = (bookingEvent as { confirmationCard?: { restaurant?: { name: string } } })?.confirmationCard;
    const businessConversion = (bookingEvent as { businessConversion?: { merchantBreakdown: Array<{ name: string; category: string }> } })?.businessConversion;

    // 5a. shareText 包含 revised restaurant 名，不包含原 restaurant 名
    expect(shareText).toContain(revisedRestaurant.venue);
    expect(shareText).not.toContain(originalRestaurant.venue);

    // 5b. confirmationCard 包含 revised restaurant
    expect(confirmationCard?.restaurant?.name).toBe(revisedRestaurant.venue);

    // 5c. businessConversion merchantBreakdown 包含 revised restaurant
    const restMerchant = businessConversion?.merchantBreakdown.find(m => m.category === '餐饮');
    expect(restMerchant?.name).toBe(revisedRestaurant.venue);

    // 5d. activity 保持不变
    const actMerchant = businessConversion?.merchantBreakdown.find(m => m.category === '活动');
    expect(actMerchant?.name).toBe(originalActivity.venue);
  });
});

describe('P1: budget_adjust GMV/platformGMV 强验证', () => {
  it('budget_adjust 后 platformGMV 下降', async () => {
    const base = await makeFamilyPlan();
    const feedback = parseFeedbackIntent('预算有点高，便宜一点');

    // 1. 记录原始 GMV
    const originalConversion = buildBusinessConversion(base.plan, base.constraints, [], base.trace, []);
    const originalGMV = originalConversion.platformGMV;
    const originalCost = parseCost(base.plan.totalCost);

    // 2. Revision
    const result = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    // 如果成功替换了更便宜的方案
    if (result.replacedRestaurant || result.replacedActivity) {
      const revisedCost = parseCost(result.plan.totalCost);
      expect(revisedCost).toBeLessThanOrEqual(originalCost);

      // 3. 用 buildBusinessConversion 计算 revised GMV
      const revisedConversion = buildBusinessConversion(result.plan, base.constraints, [], result.trace, []);
      expect(revisedConversion.platformGMV).toBeLessThanOrEqual(originalGMV);
      expect(revisedConversion.totalSpend).toBeLessThanOrEqual(originalConversion.totalSpend);
    } else {
      // 没有更便宜的方案 — 应返回 no_cheaper_option_found
      expect(result.revisionReason).toContain('no_cheaper_option_found');
    }
  });

  it('budget_adjust 不允许假装优化成功但 GMV 没下降', async () => {
    const base = await makeFamilyPlan();
    const feedback = parseFeedbackIntent('预算有点高，便宜一点');
    const originalConversion = buildBusinessConversion(base.plan, base.constraints, [], base.trace, []);

    const result = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    if (result.replacedRestaurant) {
      // 如果替换了餐厅，验证 GMV 确实下降
      const revisedConversion = buildBusinessConversion(result.plan, base.constraints, [], result.trace, []);
      expect(revisedConversion.platformGMV).toBeLessThanOrEqual(originalConversion.platformGMV);
    }
  });
});

describe('P2: planningContext 保存 shareText', () => {
  it('revision 后 planningContext.shareText 包含 revised restaurant', async () => {
    const base = await makeFamilyPlan();
    const originalRestaurant = findItemByVenueId(base.plan.items, 'r')!;
    const feedback = parseFeedbackIntent('这家餐厅太油了，换一家清淡点的');

    const revResult = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    // shareText 存在
    expect(revResult.shareText).toBeDefined();
    expect(revResult.shareText.length).toBeGreaterThan(0);

    // 找到 revised restaurant
    const revisedRestaurant = findItemByVenueId(revResult.plan.items, 'r')!;
    if (revisedRestaurant.venueId !== originalRestaurant.venueId) {
      // shareText 包含 revised restaurant
      expect(revResult.shareText).toContain(revisedRestaurant.venue);
      // shareText 不包含被替换掉的 restaurant
      expect(revResult.shareText).not.toContain(originalRestaurant.venue);
    }
  });

  it('revision 后 demo agent 保存 shareText 到 planningContext', async () => {
    const session = createSession('test-sharetext');
    const events: Array<{ type: string; [key: string]: unknown }> = [];

    // 1. 初始规划
    for await (const event of runDemoPlanningAgent(session, '今天下午想带5岁孩子和老婆出去玩，老婆在减肥')) {
      events.push(event);
    }
    expect(session.planningContext).toBeDefined();

    // 2. Revision
    for await (const event of runDemoPlanningAgent(session, '这家餐厅太油了，换一家清淡点的')) {
      events.push(event);
    }

    // 3. planningContext.shareText 应存在
    expect(session.planningContext?.shareText).toBeDefined();
    expect(session.planningContext!.shareText!.length).toBeGreaterThan(0);
  });
});

describe('P0: revision 后 constraintExplanation 跟随新 plan 更新', () => {
  it('餐厅替换后 constraintExplanation 引用新餐厅而非旧餐厅', async () => {
    // 1. 生成初始家庭方案
    const base = await planClosedLoop('今天下午想带5岁孩子和老婆出去玩，老婆在减肥');
    const oldRestaurantName = base.selectedRestaurant.name;
    const oldActivityName = base.selectedActivity.name;

    // 2. 记录初始 constraintExplanation 中引用的餐厅名
    const oldExplanation = base.constraintExplanation;
    expect(oldExplanation).toBeDefined();
    const oldRulesText = oldExplanation.rules.map(r => r.result).join(' ');
    // 旧解释应包含旧餐厅名
    expect(oldRulesText).toContain(oldRestaurantName);

    // 3. 触发 revision：餐厅太油
    const feedback = parseFeedbackIntent('这家餐厅太油了，换一家清淡点的');
    const revResult = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    // 4. 验证 plan 中餐厅已变更
    const newRestaurantItem = findItemByVenueId(revResult.plan.items, 'r')!;
    expect(newRestaurantItem).toBeDefined();
    expect(newRestaurantItem.venue).not.toBe(oldRestaurantName);
    const newRestaurantName = newRestaurantItem.venue;

    // 5. 重建 constraintExplanation（与 demo.ts revision 分支逻辑一致）
    const newActivityItem = revResult.plan.items.find(i => i.venueId.startsWith('a') && i.bookingRequired)!;
    const newRestaurant = getRestaurantById(newRestaurantItem.venueId);
    const newActivity = getActivityById(newActivityItem.venueId);
    expect(newRestaurant).toBeDefined();
    expect(newActivity).toBeDefined();

    const newExplanation = buildConstraintExplanation(
      '这家餐厅太油了，换一家清淡点的',
      base.constraints,
      newActivity!,
      newRestaurant!,
      revResult.trace,
    );

    // 6. 新解释引用新餐厅名，不引用旧餐厅名
    const newRulesText = newExplanation.rules.map(r => r.result).join(' ');
    expect(newRulesText).toContain(newRestaurantName);
    expect(newRulesText).not.toContain(oldRestaurantName);

    // 7. 活动名应保持不变（只替换了餐厅）
    const newActivityRefs = newExplanation.rules
      .filter(r => /活动/.test(r.appliedTo || ''))
      .map(r => r.result)
      .join(' ');
    if (newActivityRefs) {
      expect(newActivityRefs).toContain(oldActivityName);
    }
  });

  it('活动替换后 constraintExplanation 引用新活动而非旧活动', async () => {
    const base = await planClosedLoop('今天下午想带5岁孩子和老婆出去玩，老婆在减肥');
    const oldActivityName = base.selectedActivity.name;

    const feedback = parseFeedbackIntent('孩子不喜欢这个活动，换个室内亲子活动');
    const revResult = await reviseClosedLoopPlan(base.plan, base.constraints, feedback, base.routeArtifacts);

    // 活动应已变更
    const newActivityItem = revResult.plan.items.find(i => i.venueId.startsWith('a') && i.bookingRequired)!;
    expect(newActivityItem.venue).not.toBe(oldActivityName);

    const newActivity = getActivityById(newActivityItem.venueId);
    const newRestaurantItem = revResult.plan.items.find(i => i.venueId.startsWith('r'))!;
    const newRestaurant = getRestaurantById(newRestaurantItem.venueId);

    const newExplanation = buildConstraintExplanation(
      '孩子不喜欢这个活动，换个室内亲子活动',
      base.constraints,
      newActivity!,
      newRestaurant!,
      revResult.trace,
    );

    // 新解释应引用新活动名
    const newRulesText = newExplanation.rules.map(r => r.result).join(' ');
    expect(newRulesText).toContain(newActivity!.name);
    expect(newRulesText).not.toContain(oldActivityName);
  });
});
