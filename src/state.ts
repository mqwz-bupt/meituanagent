import type { Session, SessionState, Plan } from './types.js';

// === Session 存储 ===

const sessions = new Map<string, Session>();

export function createSession(id: string): Session {
  const now = new Date();
  const session: Session = {
    id,
    state: 'IDLE',
    history: [],
    currentPlan: null,
    pendingPlans: null,
    createdAt: now,
    updatedAt: now,
  };
  sessions.set(id, session);
  return session;
}

export function getOrCreateSession(id: string): Session {
  return sessions.get(id) ?? createSession(id);
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

// === 状态转移 ===

const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
  IDLE: ['PLANNING'],
  PLANNING: ['PLAN_READY', 'PLANNING'],
  PLAN_READY: ['USER_CONFIRMING', 'CONFIRMED', 'REVISED'],
  USER_CONFIRMING: ['CONFIRMED', 'REVISED'],
  REVISED: ['PLAN_READY', 'REVISED'],
  CONFIRMED: ['EXECUTING'],
  EXECUTING: ['REPLANNING', 'BOOKING_COMPLETE', 'FAILED_WITH_RECOVERY_OPTIONS', 'COMPLETED'],
  REPLANNING: ['EXECUTING', 'BOOKING_COMPLETE', 'FAILED_WITH_RECOVERY_OPTIONS'],
  BOOKING_COMPLETE: ['COMPLETED'],
  FAILED_WITH_RECOVERY_OPTIONS: ['REVISED', 'COMPLETED'],
  COMPLETED: [],
};

export function transitionState(
  session: Session,
  newState: SessionState,
): { ok: true } | { ok: false; error: string } {
  const allowed = VALID_TRANSITIONS[session.state];
  if (!allowed.includes(newState)) {
    return { ok: false, error: `不允许从 ${session.state} 转移到 ${newState}` };
  }
  session.state = newState;
  session.updatedAt = new Date();
  return { ok: true };
}

// === Plan 管理 ===

export function setPlan(session: Session, plan: Plan): void {
  session.currentPlan = plan;
  session.updatedAt = new Date();
}

export function setPendingPlans(session: Session, plans: Plan[] | null): void {
  session.pendingPlans = plans;
  session.updatedAt = new Date();
}

// === 确认/修改检测 ===

const CONFIRM_KEYWORDS = /^(确认|好的|就这样|没问题|可以|行|ok|确定|执行|下单|订吧|就这个|同意)/i;

export function isConfirmation(message: string): boolean {
  const trimmed = message.trim().slice(0, 6);
  return CONFIRM_KEYWORDS.test(trimmed);
}

const REVISION_KEYWORDS = /(换|改|不要|算了|换成|修改|调整|去掉|加上|不想)/;

export function isRevision(message: string): boolean {
  return REVISION_KEYWORDS.test(message);
}

const PLAN_SELECTION_RE = /^选方案([ABab])/;

export function isPlanSelection(message: string): { selected: boolean; index: number } {
  const m = message.trim().match(PLAN_SELECTION_RE);
  if (!m) return { selected: false, index: -1 };
  const letter = m[1].toUpperCase();
  return { selected: true, index: letter === 'A' ? 0 : 1 };
}
