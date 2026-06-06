import type { SSEEvent } from '../types.js';
import type { Session } from '../types.js';
import { getOrCreateSession, setPlan, transitionState, isConfirmation, isRevision, isPlanSelection, setPendingPlans } from '../state.js';
import { runPlanningAgent } from './planning.js';
import { runExecutionAgent } from './execution.js';

export async function* handleUserMessage(
  sessionId: string,
  userMessage: string,
): AsyncGenerator<SSEEvent> {
  const session = getOrCreateSession(sessionId);

  switch (session.state) {
    case 'IDLE': {
      transitionState(session, 'PLANNING');
      yield* runPlanningAgent(session, userMessage);
      break;
    }

    case 'PLANNING': {
      yield* runPlanningAgent(session, userMessage);
      break;
    }

    case 'PLAN_READY':
    case 'USER_CONFIRMING': {
      // A/B 方案选择优先检测
      const sel = isPlanSelection(userMessage);
      if (sel.selected && session.pendingPlans && session.pendingPlans.length > sel.index) {
        const selectedPlan = session.pendingPlans[sel.index];
        setPlan(session, selectedPlan);
        setPendingPlans(session, null);
        yield { type: 'plan_selected', plan: selectedPlan };
        break;
      }
      if (isConfirmation(userMessage)) {
        const confirmSourceState = session.state;
        const t0 = confirmSourceState === 'PLAN_READY'
          ? transitionState(session, 'USER_CONFIRMING')
          : { ok: true as const };
        if (!t0.ok) {
          yield { type: 'error', message: `状态异常: ${t0.error}` };
          yield { type: 'done' };
          break;
        }
        const t1 = transitionState(session, 'CONFIRMED');
        const t2 = transitionState(session, 'EXECUTING');
        if (!t1.ok || !t2.ok) {
          const errMsg = !t1.ok ? (t1 as { ok: false; error: string }).error : (t2 as { ok: false; error: string }).error;
          yield { type: 'error', message: `状态异常: ${errMsg}` };
          yield { type: 'done' };
          break;
        }
        yield* runExecutionAgent(session);
      } else if (isRevision(userMessage)) {
        transitionState(session, 'REVISED');
        yield* runPlanningAgent(session, userMessage);
      } else {
        // 其他输入也当作修改处理
        transitionState(session, 'REVISED');
        yield* runPlanningAgent(session, userMessage);
      }
      break;
    }

    case 'REVISED': {
      yield* runPlanningAgent(session, userMessage);
      break;
    }

    case 'CONFIRMED': {
      const t = transitionState(session, 'EXECUTING');
      if (!t.ok) {
        yield { type: 'error', message: `状态异常: ${t.error}` };
        yield { type: 'done' };
        break;
      }
      yield* runExecutionAgent(session);
      break;
    }

    case 'EXECUTING': {
      yield { type: 'error', message: '正在执行中，请稍候...' };
      yield { type: 'done' };
      break;
    }

    case 'COMPLETED': {
      yield { type: 'token', content: '预订已完成！如需重新规划，请发送新的需求。' };
      yield { type: 'done' };
      break;
    }
  }
}
