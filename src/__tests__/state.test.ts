import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  getOrCreateSession,
  getSession,
  transitionState,
  setPlan,
  isConfirmation,
  isRevision,
} from '../state.js';
import type { Plan } from '../types.js';

describe('Session lifecycle', () => {
  it('creates a session with IDLE state', () => {
    const s = createSession('t1');
    expect(s.id).toBe('t1');
    expect(s.state).toBe('IDLE');
    expect(s.history).toEqual([]);
    expect(s.currentPlan).toBeNull();
  });

  it('getOrCreateSession returns existing session', () => {
    const s1 = createSession('t2');
    const s2 = getOrCreateSession('t2');
    expect(s1).toBe(s2);
  });

  it('getOrCreateSession creates new if missing', () => {
    const s = getOrCreateSession('new-id');
    expect(s.state).toBe('IDLE');
  });

  it('getSession returns undefined for missing', () => {
    expect(getSession('nonexistent')).toBeUndefined();
  });
});

describe('State transitions', () => {
  it('follows valid full lifecycle', () => {
    const s = createSession('life');
    expect(transitionState(s, 'PLANNING').ok).toBe(true);
    expect(transitionState(s, 'PLAN_READY').ok).toBe(true);
    expect(transitionState(s, 'CONFIRMED').ok).toBe(true);
    expect(transitionState(s, 'EXECUTING').ok).toBe(true);
    expect(transitionState(s, 'COMPLETED').ok).toBe(true);
    expect(s.state).toBe('COMPLETED');
  });

  it('rejects IDLE to EXECUTING', () => {
    const s = createSession('bad1');
    const r = transitionState(s, 'EXECUTING');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('不允许');
    expect(s.state).toBe('IDLE');
  });

  it('rejects IDLE to COMPLETED', () => {
    const s = createSession('bad2');
    expect(transitionState(s, 'COMPLETED').ok).toBe(false);
  });

  it('rejects COMPLETED to anything', () => {
    const s = createSession('done');
    transitionState(s, 'PLANNING');
    transitionState(s, 'PLAN_READY');
    transitionState(s, 'CONFIRMED');
    transitionState(s, 'EXECUTING');
    transitionState(s, 'COMPLETED');
    expect(transitionState(s, 'PLANNING').ok).toBe(false);
    expect(transitionState(s, 'IDLE').ok).toBe(false);
  });

  it('allows PLANNING to PLAN_READY direct', () => {
    const s = createSession('direct');
    transitionState(s, 'PLANNING');
    expect(transitionState(s, 'PLAN_READY').ok).toBe(true);
  });

  it('allows PLAN_READY to REVISED', () => {
    const s = createSession('rev');
    transitionState(s, 'PLANNING');
    transitionState(s, 'PLAN_READY');
    expect(transitionState(s, 'REVISED').ok).toBe(true);
  });

  it('allows REVISED to PLAN_READY loop', () => {
    const s = createSession('loop');
    transitionState(s, 'PLANNING');
    transitionState(s, 'PLAN_READY');
    transitionState(s, 'REVISED');
    expect(transitionState(s, 'PLAN_READY').ok).toBe(true);
  });

  it('updates updatedAt on transition', () => {
    const s = createSession('time');
    const before = s.updatedAt;
    transitionState(s, 'PLANNING');
    expect(s.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});

describe('Plan management', () => {
  it('sets and stores plan', () => {
    const s = createSession('plan1');
    transitionState(s, 'PLANNING');
    const plan: Plan = {
      title: 'Test Plan',
      items: [
        { time: '14:00-16:00', activity: 'play', venue: 'Park', venueId: 'a001', cost: '50', reason: 'fun' },
      ],
      totalCost: '50',
      totalDuration: '2h',
      notes: [],
    };
    setPlan(s, plan);
    expect(s.currentPlan).not.toBeNull();
    expect(s.currentPlan!.title).toBe('Test Plan');
    expect(s.currentPlan!.items).toHaveLength(1);
  });
});

describe('isConfirmation', () => {
  it.each([
    ['确认', true],
    ['好的，就这样', true],
    ['没问题', true],
    ['可以', true],
    ['行', true],
    ['ok', true],
    ['OK', true],
    ['确定', true],
    ['执行吧', true],
    ['下单', true],
    ['订吧', true],
    ['就这个', true],
    ['同意', true],
    ['  确认  ', true],
    ['确认没问题', true],
  ])('isConfirmation("%s") = %s', (msg, expected) => {
    expect(isConfirmation(msg)).toBe(expected);
  });

  it.each([
    ['换一个', false],
    ['不要这个', false],
    ['算了', false],
    ['你好', false],
    ['我要吃日料', false],
    ['', false],
  ])('isConfirmation negative("%s") = %s', (msg, expected) => {
    expect(isConfirmation(msg)).toBe(expected);
  });
});

describe('isRevision', () => {
  it.each([
    ['换个餐厅', true],
    ['改一下时间', true],
    ['不要这个', true],
    ['算了', true],
    ['换成', true],
    ['修改', true],
    ['调整', true],
    ['去掉', true],
    ['加上', true],
    ['不想吃日料', true],
  ])('isRevision("%s") = %s', (msg, expected) => {
    expect(isRevision(msg)).toBe(expected);
  });

  it.each([
    ['确认', false],
    ['好的', false],
    ['你好', false],
    ['今天天气不错', false],
  ])('isRevision negative("%s") = %s', (msg, expected) => {
    expect(isRevision(msg)).toBe(expected);
  });
});
