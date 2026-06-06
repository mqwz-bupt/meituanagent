import type { SSEEvent, Session, ToolTraceEvent } from '../types.js';
import { clearAvailabilityOverrides, getActivityById, getRestaurantById } from '../mock/data.js';
import { setPendingPlans, setPlan, transitionState } from '../state.js';
import { executeClosedLoopPlan, planClosedLoop, buildConstraintExplanation, type UserConstraints, type RouteArtifacts } from './closed-loop.js';
import { parseFeedbackIntent, reviseClosedLoopPlan } from './revision.js';

function configureDemoFailureFixture(): void {
  clearAvailabilityOverrides();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function* emitToolEvents(trace: ToolTraceEvent[]): AsyncGenerator<SSEEvent> {
  for (const item of trace) {
    yield { type: 'tool_call', tool: item.tool, args: item.input ?? {} };
    await sleep(90);
    yield { type: 'tool_trace', trace: item };
    yield { type: 'tool_result', tool: item.tool, result: item.output ?? item.artifacts };
    await sleep(60);
  }
}

export async function* runDemoPlanningAgent(
  session: Session,
  userMessage: string,
): AsyncGenerator<SSEEvent> {
  configureDemoFailureFixture();
  session.history.push({ role: 'user', content: userMessage });
  yield { type: 'thinking' };
  await sleep(600);

  // 局部重规划：已有方案 + 用户反馈
  if (session.currentPlan && session.planningContext) {
    const feedback = parseFeedbackIntent(userMessage);
    const constraints = session.planningContext.constraints as unknown as UserConstraints;
    if (feedback.feedbackSource === 'wife' || feedback.feedbackSource === 'child') {
      constraints.shareAudience = 'wife';
    }
    if (feedback.feedbackSource === 'friend' || feedback.feedbackSource === 'group') {
      constraints.shareAudience = 'friends';
    }
    const routeArtifacts = session.planningContext.routeArtifacts as unknown as RouteArtifacts;

    const revResult = await reviseClosedLoopPlan(session.currentPlan, constraints, feedback, routeArtifacts);

    yield* emitToolEvents(revResult.trace);

    setPlan(session, revResult.plan);
    setPendingPlans(session, null);
    transitionState(session, 'PLAN_READY');
    transitionState(session, 'USER_CONFIRMING');
    session.planningContext = {
      constraints: constraints as unknown as Record<string, unknown>,
      routeArtifacts: revResult.routeArtifacts as unknown as Record<string, unknown>,
      shareText: revResult.shareText,
      externalFeedback: revResult.externalFeedback as unknown as Record<string, unknown>,
    };
    session.history.push({ role: 'assistant', content: JSON.stringify(revResult.plan) });

    yield { type: 'token', content: `已根据反馈局部调整方案：${revResult.revisionReason}。请查看更新后的方案。` };

    // 重建 constraintExplanation 以反映修改后的方案
    const revActivityItem = revResult.plan.items.find(i => i.venueId.startsWith('a') && i.bookingRequired);
    const revRestaurantItem = revResult.plan.items.find(i => i.venueId.startsWith('r'));
    const revActivity = revActivityItem ? getActivityById(revActivityItem.venueId) : undefined;
    const revRestaurant = revRestaurantItem ? getRestaurantById(revRestaurantItem.venueId) : undefined;
    const revExplanation = (revActivity && revRestaurant)
      ? buildConstraintExplanation(userMessage, constraints, revActivity, revRestaurant, revResult.trace)
      : undefined;

    yield { type: 'plan_ready', plan: revResult.plan, constraintExplanation: revExplanation, externalFeedback: revResult.externalFeedback };
    yield { type: 'done' };
    return;
  }

  // 全新规划
  const result = await planClosedLoop(userMessage);
  yield* emitToolEvents(result.trace);

  setPlan(session, result.plan);
  setPendingPlans(session, null);
  transitionState(session, 'PLAN_READY');
  transitionState(session, 'USER_CONFIRMING');
  // 保存 planning context 供后续 revision 使用
  session.planningContext = {
    constraints: result.constraints as unknown as Record<string, unknown>,
    routeArtifacts: result.routeArtifacts as unknown as Record<string, unknown>,
  };
  session.history.push({ role: 'assistant', content: JSON.stringify(result.plan) });

  yield { type: 'token', content: '已完成活动搜索、餐厅搜索、可用性核验和路线规划，等待你确认后执行预订。' };
  yield { type: 'plan_ready', plan: result.plan, constraintExplanation: result.constraintExplanation };
  yield { type: 'done' };
}

export async function* runDemoExecutionAgent(session: Session): AsyncGenerator<SSEEvent> {
  if (!session.currentPlan) {
    yield { type: 'error', message: '没有可执行的方案' };
    yield { type: 'done' };
    return;
  }

  // 优先使用 session 中已保存的 planningContext（revision 后的约束和路线）
  // 仅在没有任何上下文时 fallback 到重新规划
  let constraints: UserConstraints;
  let routeArtifacts: RouteArtifacts;
  let planningTrace: ToolTraceEvent[];

  if (session.planningContext) {
    constraints = session.planningContext.constraints as unknown as UserConstraints;
    routeArtifacts = session.planningContext.routeArtifacts as unknown as RouteArtifacts;
    planningTrace = [];
  } else {
    const lastUserMessage = [...session.history].reverse().find(item => item.role === 'user')?.content ?? '';
    const planResult = await planClosedLoop(lastUserMessage);
    constraints = planResult.constraints;
    routeArtifacts = planResult.routeArtifacts;
    planningTrace = planResult.trace;
  }

  const result = await executeClosedLoopPlan(session.currentPlan, constraints, routeArtifacts, planningTrace);

  yield* emitToolEvents(result.trace);

  yield {
    type: 'booking_complete',
    plan: result.plan,
    results: result.results.map(item => ({
      item: item.item,
      status: item.status,
      bookingId: item.bookingId,
      replacedBy: item.replacedBy,
      venueId: item.venueId,
      district: item.district,
    })),
    shareText: result.shareText,
    confirmationCard: result.confirmationCard,
    recoveryStory: result.recoveryStory,
    businessConversion: result.businessConversion,
  };

  const completed = transitionState(session, 'BOOKING_COMPLETE');
  if (completed.ok) transitionState(session, 'COMPLETED');
  session.history.push({ role: 'assistant', content: result.shareText });
  yield { type: 'done' };
}
