import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from '../types.js';
import { handleUserMessage } from '../agent/router.js';
import { createSession, getSession } from '../state.js';

// Mock planning and execution agents
vi.mock('../agent/planning.js', () => ({
  runPlanningAgent: vi.fn(),
}));

vi.mock('../agent/execution.js', () => ({
  runExecutionAgent: vi.fn(),
}));

import { runPlanningAgent } from '../agent/planning.js';
import { runExecutionAgent } from '../agent/execution.js';

const mockPlanning = runPlanningAgent as unknown as ReturnType<typeof vi.fn>;
const mockExecution = runExecutionAgent as unknown as ReturnType<typeof vi.fn>;

async function collectEvents(gen: AsyncIterable<{ type: string; [key: string]: unknown }>) {
  const events: Array<{ type: string; [key: string]: unknown }> = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

describe('router: IDLE state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions to PLANNING and calls planning agent', async () => {
    mockPlanning.mockImplementation(async function* () {
      yield { type: 'token', content: 'plan' };
      yield { type: 'done' };
    });

    const events = await collectEvents(handleUserMessage('router-idle-1', '想去朝阳公园'));
    expect(mockPlanning).toHaveBeenCalledTimes(1);
    expect(events.some(e => e.type === 'token')).toBe(true);
    expect(events.some(e => e.type === 'done')).toBe(true);

    const session = getSession('router-idle-1');
    expect(session?.state).toBe('PLANNING');
  });
});

describe('router: PLAN_READY state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('confirmation triggers execution agent', async () => {
    mockPlanning.mockImplementation(async function* (session: Session) {
      const { transitionState, setPlan } = await import('../state.js');
      transitionState(session, 'PLAN_READY');
      setPlan(session, {
        title: 'Test',
        items: [{ time: '14:00', activity: 'test', venue: 'Park', venueId: 'a017', cost: '50', reason: 'fun' }],
        totalCost: '50',
        totalDuration: '2h',
        notes: [],
      });
      yield { type: 'plan_ready', plan: session.currentPlan };
      yield { type: 'done' };
    });

    // Phase 1: create plan
    await collectEvents(handleUserMessage('router-confirm-1', '想出去玩'));
    const session = getSession('router-confirm-1');
    expect(session?.state).toBe('PLAN_READY');

    // Phase 2: confirm → execution
    mockExecution.mockImplementation(async function* () {
      yield { type: 'booking_complete', results: [] };
      yield { type: 'done' };
    });

    const events = await collectEvents(handleUserMessage('router-confirm-1', '确认'));
    expect(mockExecution).toHaveBeenCalledTimes(1);
    expect(events.some(e => e.type === 'booking_complete')).toBe(true);
  });

  it('revision triggers planning agent again', async () => {
    mockPlanning.mockImplementation(async function* (session: Session) {
      const { transitionState } = await import('../state.js');
      if (session.state === 'IDLE') {
        transitionState(session, 'PLANNING');
        transitionState(session, 'PLAN_READY');
      }
      yield { type: 'done' };
    });

    // Phase 1: get to PLAN_READY
    await collectEvents(handleUserMessage('router-revise-1', '想出去玩'));

    // Phase 2: revise
    const events = await collectEvents(handleUserMessage('router-revise-1', '换个餐厅'));
    expect(mockPlanning).toHaveBeenCalledTimes(2);
    expect(events.some(e => e.type === 'done')).toBe(true);
  });
});

describe('router: EXECUTING state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error message when already executing', async () => {
    const session = createSession('router-exec-1');
    const { transitionState } = await import('../state.js');
    transitionState(session, 'PLANNING');
    transitionState(session, 'PLAN_READY');
    transitionState(session, 'CONFIRMED');
    transitionState(session, 'EXECUTING');

    const events = await collectEvents(handleUserMessage('router-exec-1', '还在执行吗'));
    expect(events.some(e => e.type === 'error')).toBe(true);
    expect(events.some(e => e.type === 'done')).toBe(true);
  });
});

describe('router: COMPLETED state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns completion message', async () => {
    const session = createSession('router-done-1');
    const { transitionState } = await import('../state.js');
    transitionState(session, 'PLANNING');
    transitionState(session, 'PLAN_READY');
    transitionState(session, 'CONFIRMED');
    transitionState(session, 'EXECUTING');
    transitionState(session, 'COMPLETED');

    const events = await collectEvents(handleUserMessage('router-done-1', '再来一个'));
    expect(events.some(e => e.type === 'token')).toBe(true);
    expect(events.some(e => e.type === 'done')).toBe(true);
  });
});
