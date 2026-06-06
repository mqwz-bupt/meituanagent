/**
 * revision.ts — 用户反馈后局部重规划
 * 识别反馈意图，保留未被否定的部分，只替换有问题的活动/餐厅。
 */
import type { Activity, Plan, PlanItem, Restaurant, ToolTraceEvent } from '../types.js';
import {
  type UserConstraints,
  type RouteArtifacts,
  type BookingExecutionResult,
  trace,
  buildRouteArtifacts,
  buildPlan,
  generateShareText,
  sortCandidatesByDistrict,
  isActivityChildSafe,
  isRestaurantDietSafe,
} from './closed-loop.js';
import {
  checkAvailability,
  searchActivities,
  searchRestaurants,
  getRestaurantById,
  getActivityById,
} from '../mock/data.js';
import { getDistrictDistance } from '../district.js';

// ============================================================
// Feedback Intent Parsing
// ============================================================

export type FeedbackType =
  | 'restaurant_replace'
  | 'activity_replace'
  | 'route_adjust'
  | 'budget_adjust'
  | 'queue_avoid';

export type FeedbackSource = 'wife' | 'friend' | 'group' | 'child' | 'self';

export interface FeedbackIntent {
  type: FeedbackType;
  reason: string;
  feedbackSource: FeedbackSource;
  sourceLabel: string;
  originalFeedback: string;
  systemUnderstanding: string;
  avoidCuisine?: string;
  preferIndoor?: boolean;
  maxQueueMinutes?: number;
  maxPrice?: number;
  preferSameDistrict?: boolean;
}

export interface ExternalFeedbackSummary {
  feedbackSource: FeedbackSource;
  sourceLabel: string;
  originalFeedback: string;
  intent: FeedbackType;
  systemUnderstanding: string;
  kept: string[];
  replaced: string[];
  changes: string[];
  shareText: string;
}

// 关键词 → 反馈类型映射（优先级从上到下）
const FEEDBACK_RULES: Array<{
  pattern: RegExp;
  type: FeedbackType;
  reason: string;
  extras?: Partial<FeedbackIntent>;
}> = [
  { pattern: /不想排队|不用等|排队.*太长|等.*太久/, type: 'queue_avoid', reason: '不想排队', extras: { maxQueueMinutes: 15 } },
  { pattern: /太油|油腻|清淡|低脂|低卡|轻食|健康/, type: 'restaurant_replace', reason: '饮食偏好' },
  { pattern: /孩子.*不喜欢|不喜欢.*活动|换个.*活动|室内/, type: 'activity_replace', reason: '孩子不喜欢活动', extras: { preferIndoor: true } },
  { pattern: /太远|近一点|别跨区|路程.*长|移动.*太久/, type: 'route_adjust', reason: '路线太远', extras: { preferSameDistrict: true } },
  { pattern: /预算.*高|有点高|便宜|太贵|省钱|节约/, type: 'budget_adjust', reason: '预算高' },
  // 排队优先检测（在 restaurant_replace 之前）
  { pattern: /不想排队|排队.*太长|等.*太久|不用等/, type: 'queue_avoid', reason: '排队等待', extras: { maxQueueMinutes: 15 } },
  // 餐厅替换类
  { pattern: /太油|油腻|清淡|低脂|低卡|轻食|健康吃/, type: 'restaurant_replace', reason: '饮食偏好' },
  { pattern: /不想吃.*[日料寿司烧烤火锅炸鸡自助]|太咸|太辣/, type: 'restaurant_replace', reason: '口味偏好' },
  { pattern: /换.*餐厅|换.*饭店|换.*吃/, type: 'restaurant_replace', reason: '餐厅更换' },
  // 活动替换类
  { pattern: /孩子.*不喜欢|不喜欢.*活动|换个.*活动/, type: 'activity_replace', reason: '活动偏好' },
  { pattern: /室内|不想.*户外|不想.*室外/, type: 'activity_replace', reason: '室内偏好', extras: { preferIndoor: true } },
  { pattern: /轻松|休闲|不累|不耗体力/, type: 'activity_replace', reason: '体力偏好' },
  { pattern: /朋友不想逛展|不想逛/, type: 'activity_replace', reason: '活动偏好' },
  // 路线调整类
  { pattern: /太远|别跨区|移动.*太长|离家近|不要.*跨/, type: 'route_adjust', reason: '距离偏好', extras: { preferSameDistrict: true } },
  // 预算调整类
  { pattern: /预算.*高|便宜|别太贵|太贵|省钱|节约/, type: 'budget_adjust', reason: '预算偏好' },
];

export function parseFeedbackIntent(feedback: string): FeedbackIntent {
  const feedbackSource = detectFeedbackSource(feedback);
  for (const rule of FEEDBACK_RULES) {
    if (rule.pattern.test(feedback)) {
      const intent: FeedbackIntent = {
        type: rule.type,
        reason: rule.reason,
        feedbackSource,
        sourceLabel: getFeedbackSourceLabel(feedbackSource),
        originalFeedback: feedback,
        systemUnderstanding: /太油|油腻/.test(feedback) ? '餐厅太油' : buildSystemUnderstanding(rule.type, rule.reason),
        ...rule.extras,
      };
      // 提取排除菜系
      const cuisineMatch = feedback.match(/不想吃(.{1,4})/);
      if (cuisineMatch) {
        intent.avoidCuisine = cuisineMatch[1];
      }
      // 从上下文推断额外偏好
      if (/室内/.test(feedback)) intent.preferIndoor = true;
      return intent;
    }
  }
  return {
    type: 'restaurant_replace',
    reason: '用户反馈',
    feedbackSource,
    sourceLabel: getFeedbackSourceLabel(feedbackSource),
    originalFeedback: feedback,
    systemUnderstanding: '餐厅需要调整',
  };
}

function detectFeedbackSource(feedback: string): FeedbackSource {
  if (/老婆|太太|妻子/.test(feedback)) return 'wife';
  if (/群里|群聊|大家|有人说/.test(feedback)) return 'group';
  if (/朋友/.test(feedback)) return 'friend';
  if (/孩子|小朋友|娃/.test(feedback)) return 'child';
  return 'self';
}

function getFeedbackSourceLabel(source: FeedbackSource): string {
  const labels: Record<FeedbackSource, string> = {
    wife: '老婆',
    friend: '朋友',
    group: '群聊',
    child: '孩子',
    self: '自己',
  };
  return labels[source];
}

function buildSystemUnderstanding(type: FeedbackType, reason: string): string {
  if (reason && reason !== '用户反馈' && !reason.endsWith('偏好')) return reason;
  const labels: Record<FeedbackType, string> = {
    restaurant_replace: '餐厅需要调整',
    activity_replace: '活动需要调整',
    route_adjust: '路线太远',
    budget_adjust: '预算高',
    queue_avoid: '不想排队',
  };
  return labels[type];
}

// ============================================================
// Revision Result
// ============================================================

export interface RevisionResult {
  plan: Plan;
  trace: ToolTraceEvent[];
  routeArtifacts: RouteArtifacts;
  replacedActivity?: Activity;
  replacedRestaurant?: Restaurant;
  revisionReason: string;
  shareText: string;
  externalFeedback?: ExternalFeedbackSummary;
}

// ============================================================
// Core: reviseClosedLoopPlan
// ============================================================

export async function reviseClosedLoopPlan(
  existingPlan: Plan,
  constraints: UserConstraints,
  feedback: FeedbackIntent,
  routeArtifacts: RouteArtifacts,
): Promise<RevisionResult> {
  const traceLog: ToolTraceEvent[] = [];

  traceLog.push(trace(
    'user_feedback_received',
    'success',
    `收到用户反馈: ${feedback.reason} (${feedback.type})`,
    { feedbackType: feedback.type, reason: feedback.reason, feedbackSource: feedback.feedbackSource },
  ));

  traceLog.push(trace(
    'external_feedback_received',
    'success',
    `来自${feedback.sourceLabel}反馈: ${feedback.originalFeedback}`,
    { feedbackSource: feedback.feedbackSource, originalFeedback: feedback.originalFeedback },
  ));

  traceLog.push(trace(
    'feedback_source_detected',
    'success',
    `反馈来源：${feedback.sourceLabel}，系统理解：${feedback.systemUnderstanding}`,
    { feedbackSource: feedback.feedbackSource, intent: feedback.type, understanding: feedback.systemUnderstanding },
  ));

  if (feedback.feedbackSource === 'group') {
    traceLog.push(trace(
      'group_preference_parsed',
      'success',
      `来自群聊反馈：${feedback.systemUnderstanding}`,
      { intent: feedback.type, originalFeedback: feedback.originalFeedback },
    ));
  }

  // 从现有 plan 提取当前活动/餐厅
  const currentActivityItem = existingPlan.items.find(it => it.venueId.startsWith('a') && it.bookingRequired);
  const currentRestaurantItem = existingPlan.items.find(it => it.venueId.startsWith('r'));
  const currentActivity = currentActivityItem ? getActivityById(currentActivityItem.venueId) : undefined;
  const currentRestaurant = currentRestaurantItem ? getRestaurantById(currentRestaurantItem.venueId) : undefined;

  let newActivity = currentActivity;
  let newRestaurant = currentRestaurant;
  let replacedActivity: Activity | undefined;
  let replacedRestaurant: Restaurant | undefined;
  let revisionReason = '';

  switch (feedback.type) {
    case 'restaurant_replace':
    case 'queue_avoid': {
      // 保留活动，替换餐厅
      traceLog.push(trace('keep_activity', 'success', `保留活动: ${currentActivity?.name ?? '未知'}`, { activityId: currentActivity?.id }));

      const newRest = findReplacementRestaurant(constraints, currentActivity?.district ?? '朝阳区', currentRestaurant?.id, feedback, traceLog);
      if (newRest) {
        newRestaurant = newRest;
        replacedRestaurant = newRest;
        revisionReason = feedback.type === 'queue_avoid'
          ? `餐厅更换: 原餐厅排队时间长，已换为${newRest.name}（等待约${newRest.queueMinutes ?? 0}分钟）`
          : `餐厅更换: ${feedback.reason}，已换为${newRest.name}`;
      } else {
        revisionReason = '未找到合适的替代餐厅，保持原方案';
      }
      break;
    }

    case 'activity_replace': {
      // 保留餐厅（尽量），替换活动
      traceLog.push(trace('keep_restaurant', 'success', `保留餐厅: ${currentRestaurant?.name ?? '未知'}`, { restaurantId: currentRestaurant?.id }));

      const newAct = findReplacementActivity(constraints, currentRestaurant?.district ?? '朝阳区', currentActivity?.id, feedback, traceLog);
      if (newAct) {
        newActivity = newAct;
        replacedActivity = newAct;
        revisionReason = `活动更换: ${feedback.reason}，已换为${newAct.name}`;
      } else {
        revisionReason = '未找到合适的替代活动，保持原方案';
      }
      break;
    }

    case 'route_adjust': {
      const actDist = currentActivity?.district ?? '朝阳区';
      const restDist = currentRestaurant?.district ?? '朝阳区';
      const currentDist = getDistrictDistance(actDist, restDist);

      if (currentDist <= 4) {
        revisionReason = 'no_better_route_found: 当前方案已在同区，无需调整';
        traceLog.push(trace('keep_activity', 'success', '活动保持不变', { activityId: currentActivity?.id }));
        traceLog.push(trace('keep_restaurant', 'success', '餐厅保持不变', { restaurantId: currentRestaurant?.id }));
      } else {
        // 尝试找同区的替代餐厅
        const sameDistrictRest = findReplacementRestaurant(constraints, actDist, currentRestaurant?.id, { ...feedback, type: 'restaurant_replace', reason: '压缩到同区' }, traceLog);
        const newDistWithRest = sameDistrictRest ? getDistrictDistance(actDist, sameDistrictRest.district) : Infinity;
        if (sameDistrictRest && newDistWithRest < currentDist) {
          newRestaurant = sameDistrictRest;
          replacedRestaurant = sameDistrictRest;
          traceLog.push(trace('keep_activity', 'success', `保留活动: ${currentActivity?.name}`, { activityId: currentActivity?.id }));
          revisionReason = `路线优化: 餐厅换为${sameDistrictRest.name}（${sameDistrictRest.district}），与活动同区`;
        } else {
          // 尝试换活动
          const sameDistrictAct = findReplacementActivity(constraints, restDist, currentActivity?.id, { ...feedback, type: 'activity_replace', reason: '压缩到同区' }, traceLog);
          const newDistWithAct = sameDistrictAct ? getDistrictDistance(sameDistrictAct.district, restDist) : Infinity;
          if (sameDistrictAct && newDistWithAct < currentDist) {
            newActivity = sameDistrictAct;
            replacedActivity = sameDistrictAct;
            traceLog.push(trace('keep_restaurant', 'success', `保留餐厅: ${currentRestaurant?.name}`, { restaurantId: currentRestaurant?.id }));
            revisionReason = `路线优化: 活动换为${sameDistrictAct.name}（${sameDistrictAct.district}），与餐厅同区`;
          } else if (sameDistrictRest && newDistWithRest <= currentDist) {
            newRestaurant = sameDistrictRest;
            replacedRestaurant = sameDistrictRest;
            traceLog.push(trace('keep_activity', 'success', `保留活动: ${currentActivity?.name}`, { activityId: currentActivity?.id }));
            revisionReason = `路线优化: 餐厅换为${sameDistrictRest.name}（距离缩短）`;
          } else {
            revisionReason = 'no_better_route_found: 无法进一步压缩路线距离';
            traceLog.push(trace('keep_activity', 'success', '活动保持不变', {}));
            traceLog.push(trace('keep_restaurant', 'success', '餐厅保持不变', {}));
          }
        }
      }
      break;
    }

    case 'budget_adjust': {
      // 先尝试换更便宜的餐厅
      const cheaperRest = findCheaperRestaurant(constraints, currentActivity?.district ?? '朝阳区', currentRestaurant, traceLog);
      if (cheaperRest && cheaperRest.avgPrice < (currentRestaurant?.avgPrice ?? Infinity)) {
        newRestaurant = cheaperRest;
        replacedRestaurant = cheaperRest;
        traceLog.push(trace('keep_activity', 'success', `保留活动: ${currentActivity?.name}`, { activityId: currentActivity?.id }));
        revisionReason = `预算优化: 餐厅换为${cheaperRest.name}（人均¥${cheaperRest.avgPrice}）`;
      } else {
        const cheaperAct = findCheaperActivity(constraints, currentRestaurant?.district ?? '朝阳区', currentActivity, traceLog);
        if (cheaperAct && cheaperAct.price < (currentActivity?.price ?? Infinity)) {
          newActivity = cheaperAct;
          replacedActivity = cheaperAct;
          traceLog.push(trace('keep_restaurant', 'success', `保留餐厅: ${currentRestaurant?.name}`, { restaurantId: currentRestaurant?.id }));
          revisionReason = `预算优化: 活动换为${cheaperAct.name}（¥${cheaperAct.price}/人）`;
        } else {
          revisionReason = 'no_cheaper_option_found: 当前方案已是该场景最优价格';
          traceLog.push(trace('keep_activity', 'success', '活动保持不变', {}));
          traceLog.push(trace('keep_restaurant', 'success', '餐厅保持不变', {}));
        }
      }
      break;
    }
  }

  // 构建新 plan
  const finalActivity = newActivity ?? currentActivity!;
  const finalRestaurant = newRestaurant ?? currentRestaurant!;
  const newRouteArtifacts = buildRouteArtifacts(finalActivity, finalRestaurant);
  const revisedPlan = buildPlan(constraints, finalActivity, finalRestaurant, newRouteArtifacts, traceLog);

  // 生成分享文案
  const mockResults: BookingExecutionResult[] = [
    { item: finalActivity.name, kind: 'activity', status: 'success', bookingId: `BK-${finalActivity.id.toUpperCase()}-REV` },
    { item: finalRestaurant.name, kind: 'restaurant', status: 'success', bookingId: `BK-${finalRestaurant.id.toUpperCase()}-REV` },
  ];
  const externalFeedback = buildExternalFeedbackSummary(
    feedback,
    currentActivity,
    currentRestaurant,
    finalActivity,
    finalRestaurant,
    routeArtifacts,
    newRouteArtifacts,
    replacedActivity,
    replacedRestaurant,
    '',
  );
  const shareText = generateFeedbackShareText(revisedPlan, feedback, mockResults, externalFeedback.changes);
  externalFeedback.shareText = shareText;

  traceLog.push(trace(
    'route_recalculated',
    'success',
    `路线已更新: ${finalActivity.name}(${finalActivity.district}) → ${finalRestaurant.name}(${finalRestaurant.district})`,
    { activityDistrict: finalActivity.district, restaurantDistrict: finalRestaurant.district, distanceKm: newRouteArtifacts.distanceKm },
    { ...newRouteArtifacts },
  ));

  traceLog.push(trace(
    'plan_revised',
    'success',
    `局部重规划完成: ${revisionReason}`,
    { replacedActivityId: replacedActivity?.id, replacedRestaurantId: replacedRestaurant?.id },
    { revisionReason },
  ));

  traceLog.push(trace(
    'plan_revised_from_external_feedback',
    'success',
    `已按${feedback.sourceLabel}反馈局部调整: ${revisionReason}`,
    { feedbackSource: feedback.feedbackSource, intent: feedback.type },
    { ...externalFeedback },
  ));

  return {
    plan: revisedPlan,
    trace: traceLog,
    routeArtifacts: newRouteArtifacts,
    replacedActivity,
    replacedRestaurant,
    revisionReason,
    shareText,
    externalFeedback,
  };
}

function buildExternalFeedbackSummary(
  feedback: FeedbackIntent,
  originalActivity: Activity | undefined,
  originalRestaurant: Restaurant | undefined,
  finalActivity: Activity,
  finalRestaurant: Restaurant,
  previousRoute: RouteArtifacts,
  nextRoute: RouteArtifacts,
  replacedActivity: Activity | undefined,
  replacedRestaurant: Restaurant | undefined,
  shareText: string,
): ExternalFeedbackSummary {
  const kept: string[] = [];
  const replaced: string[] = [];
  const changes: string[] = [];

  if (!replacedActivity && originalActivity) kept.push(`活动：${originalActivity.name}`);
  if (!replacedRestaurant && originalRestaurant) kept.push(`餐厅：${originalRestaurant.name}`);
  if (replacedActivity && originalActivity) replaced.push(`活动：${originalActivity.name} → ${finalActivity.name}`);
  if (replacedRestaurant && originalRestaurant) replaced.push(`餐厅：${originalRestaurant.name} → ${finalRestaurant.name}`);

  if (nextRoute.districtDistance < previousRoute.districtDistance || nextRoute.durationMinutes < previousRoute.durationMinutes) {
    changes.push(`距离减少：${previousRoute.distanceKm}km → ${nextRoute.distanceKm}km`);
  }
  if ((finalRestaurant.queueMinutes ?? 0) < (originalRestaurant?.queueMinutes ?? 999)) {
    changes.push(`等待减少：${originalRestaurant?.queueMinutes ?? 0}分钟 → ${finalRestaurant.queueMinutes ?? 0}分钟`);
  }
  if (feedback.type === 'budget_adjust') changes.push('预算下降');
  if (feedback.type === 'restaurant_replace') changes.push(finalRestaurant.dietFriendly || finalRestaurant.lowCalorie ? '餐厅更清淡' : '餐厅已更换');
  if (feedback.type === 'activity_replace') changes.push(finalActivity.indoor ? '活动更适合孩子，且改为室内' : '活动更适合孩子');
  if (changes.length === 0) changes.push('方案保持稳定，未让路线或成本变差');

  return {
    feedbackSource: feedback.feedbackSource,
    sourceLabel: feedback.sourceLabel,
    originalFeedback: feedback.originalFeedback,
    intent: feedback.type,
    systemUnderstanding: feedback.systemUnderstanding,
    kept,
    replaced,
    changes,
    shareText,
  };
}

function generateFeedbackShareText(
  plan: Plan,
  feedback: FeedbackIntent,
  results: BookingExecutionResult[],
  changes: string[],
): string {
  const schedule = plan.items.map(i => `${i.time} ${i.venue}`).join('；');
  const confirmed = results
    .filter(r => r.status === 'success' || r.status === 'recovered')
    .map(r => `${r.item}(${r.bookingId})`)
    .join('，');
  const changeText = changes.join('，');

  if (feedback.feedbackSource === 'wife') {
    return `老婆，已按你刚才的反馈局部调整：${changeText}。新的安排是：${schedule}。已确认：${confirmed}。`;
  }
  if (feedback.feedbackSource === 'child') {
    return `给孩子的安排已换得更轻松：${changeText}。新的路线是：${schedule}。`;
  }
  if (feedback.feedbackSource === 'friend' || feedback.feedbackSource === 'group') {
    return `大家，我已按大家意见调整：${changeText}。新方案：${schedule}。已确认：${confirmed}。`;
  }
  return `已根据反馈调整：${changeText}。新方案：${schedule}。`;
}

// ============================================================
// Replacement Helpers
// ============================================================

function findReplacementRestaurant(
  constraints: UserConstraints,
  activityDistrict: string,
  currentRestaurantId: string | undefined,
  feedback: FeedbackIntent,
  traceLog: ToolTraceEvent[],
): Restaurant | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {
    kidFriendly: constraints.scenario === 'family' ? true : undefined,
    dietFriendly: constraints.dietFriendly || undefined,
    groupSize: constraints.partySize,
    maxDistance: constraints.maxDistanceKm,
  };

  let candidates = searchRestaurants(filter)
    .filter(r => r.id !== currentRestaurantId)
    .filter(r => isRestaurantDietSafe(r, constraints));

  // 排队过滤
  if (feedback.type === 'queue_avoid' || feedback.maxQueueMinutes) {
    const currentQueue = currentRestaurantId ? getRestaurantById(currentRestaurantId)?.queueMinutes : undefined;
    const threshold = Math.min(feedback.maxQueueMinutes ?? 15, currentQueue ?? feedback.maxQueueMinutes ?? 15);
    candidates = candidates.filter(r => {
      const enriched = getRestaurantById(r.id);
      return (enriched?.queueMinutes ?? 0) <= threshold;
    });
  }

  // 排除菜系
  if (feedback.avoidCuisine) {
    candidates = candidates.filter(r =>
      !r.cuisine.includes(feedback.avoidCuisine!) && !r.tags.some(t => t.includes(feedback.avoidCuisine!))
    );
  }

  // 饮食偏好（太油 → dietFriendly）
  if (feedback.reason === '饮食偏好') {
    candidates = candidates.filter(r => r.dietFriendly || r.tags.some(t => /低卡|轻食|健康/.test(t)));
  }

  const sorted = sortCandidatesByDistrict(candidates, activityDistrict)
    .sort((a, b) => (getRestaurantById(a.id)?.queueMinutes ?? 0) - (getRestaurantById(b.id)?.queueMinutes ?? 0));

  traceLog.push(trace(
    'search_alternative_restaurant',
    'success',
    `搜索替代餐厅: 候选 ${sorted.length} 个（活动区=${activityDistrict}）`,
    { candidateCount: sorted.length, feedbackType: feedback.type },
  ));

  for (const candidate of sorted) {
    const timeSlot = constraints.scenario === 'family' ? '17:15' : '17:00';
    const avail = checkAvailability(candidate.id, 'today', timeSlot, constraints.partySize);
    if (avail.available) {
      return getRestaurantById(candidate.id) ?? candidate;
    }
  }
  return undefined;
}

function findReplacementActivity(
  constraints: UserConstraints,
  restaurantDistrict: string,
  currentActivityId: string | undefined,
  feedback: FeedbackIntent,
  traceLog: ToolTraceEvent[],
): Activity | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {
    groupSize: constraints.partySize,
    maxDistance: constraints.maxDistanceKm,
    tags: constraints.scenario === 'family' ? ['亲子'] : constraints.scenario === 'couple' ? ['拍照', '网红'] : constraints.scenario === 'solo' ? ['展览', '文艺'] : constraints.scenario === 'team' ? ['互动', '团建'] : ['Citywalk'],
    minAge: constraints.childAge,
  };

  let candidates = searchActivities(filter)
    .filter(a => a.id !== currentActivityId)
    .filter(a => isActivityChildSafe(a, constraints));

  // 室内偏好
  if (feedback.preferIndoor) {
    candidates = candidates.filter(a => {
      const enriched = getActivityById(a.id);
      return enriched?.indoor === true;
    });
  }

  // 轻松偏好：短时长
  if (feedback.reason === '体力偏好') {
    candidates = candidates.filter(a => a.duration <= 120);
  }

  const sorted = sortCandidatesByDistrict(candidates, restaurantDistrict);

  traceLog.push(trace(
    'search_alternative_activity',
    'success',
    `搜索替代活动: 候选 ${sorted.length} 个（餐厅区=${restaurantDistrict}）`,
    { candidateCount: sorted.length, feedbackType: feedback.type },
  ));

  for (const candidate of sorted) {
    const avail = checkAvailability(candidate.id, 'today', constraints.preferredStartTime, constraints.partySize);
    if (avail.available) {
      return getActivityById(candidate.id) ?? candidate;
    }
  }
  return undefined;
}

function findCheaperRestaurant(
  constraints: UserConstraints,
  activityDistrict: string,
  currentRestaurant: Restaurant | undefined,
  traceLog: ToolTraceEvent[],
): Restaurant | undefined {
  const maxPrice = currentRestaurant ? currentRestaurant.avgPrice - 1 : undefined;
  const candidates = searchRestaurants({
    kidFriendly: constraints.scenario === 'family' ? true : undefined,
    dietFriendly: constraints.dietFriendly || undefined,
    groupSize: constraints.partySize,
    maxPrice,
    maxDistance: constraints.maxDistanceKm,
  })
    .filter(r => r.id !== currentRestaurant?.id)
    .filter(r => isRestaurantDietSafe(r, constraints));

  const sorted = sortCandidatesByDistrict(candidates, activityDistrict);

  traceLog.push(trace(
    'search_alternative_restaurant',
    'success',
    `搜索更便宜餐厅: 候选 ${sorted.length} 个（预算上限 ¥${maxPrice ?? '不限'}）`,
    { maxPrice, candidateCount: sorted.length },
  ));

  for (const candidate of sorted) {
    const timeSlot = constraints.scenario === 'family' ? '17:15' : '17:00';
    const avail = checkAvailability(candidate.id, 'today', timeSlot, constraints.partySize);
    if (avail.available) return getRestaurantById(candidate.id) ?? candidate;
  }
  return undefined;
}

function findCheaperActivity(
  constraints: UserConstraints,
  restaurantDistrict: string,
  currentActivity: Activity | undefined,
  traceLog: ToolTraceEvent[],
): Activity | undefined {
  const maxPrice = currentActivity ? currentActivity.price - 1 : undefined;
  const candidates = searchActivities({
    groupSize: constraints.partySize,
    maxPrice,
    maxDistance: constraints.maxDistanceKm,
    tags: constraints.scenario === 'family' ? ['亲子'] : constraints.scenario === 'couple' ? ['拍照', '网红'] : constraints.scenario === 'solo' ? ['展览', '文艺'] : constraints.scenario === 'team' ? ['互动', '团建'] : ['Citywalk'],
    minAge: constraints.childAge,
  })
    .filter(a => a.id !== currentActivity?.id)
    .filter(a => isActivityChildSafe(a, constraints));

  const sorted = sortCandidatesByDistrict(candidates, restaurantDistrict);

  traceLog.push(trace(
    'search_alternative_activity',
    'success',
    `搜索更便宜活动: 候选 ${sorted.length} 个（预算上限 ¥${maxPrice ?? '不限'}）`,
    { maxPrice, candidateCount: sorted.length },
  ));

  for (const candidate of sorted) {
    const avail = checkAvailability(candidate.id, 'today', constraints.preferredStartTime, constraints.partySize);
    if (avail.available) return getActivityById(candidate.id) ?? candidate;
  }
  return undefined;
}
