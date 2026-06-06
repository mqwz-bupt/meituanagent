import type { Session, SSEEvent } from '../types.js';
import { runDemoExecutionAgent } from './demo.js';

export async function* runExecutionAgent(
  session: Session,
): AsyncGenerator<SSEEvent> {
  if (!session.currentPlan) {
    yield { type: 'error', message: '没有可执行的方案' };
    yield { type: 'done' };
    return;
  }

  // Execution 始终走 closed-loop mock — booking 是确定性逻辑，不依赖 LLM
  yield* runDemoExecutionAgent(session);
}
