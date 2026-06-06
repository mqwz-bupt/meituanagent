import { streamText, generateText, Output, stepCountIs } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { z } from 'zod';
import type { Session, SSEEvent, Plan } from '../types.js';
import { planningTools } from '../tools/registry.js';
import { setPlan, setPendingPlans, transitionState } from '../state.js';
import { PLANNING_SYSTEM_PROMPT } from './prompts/planning.js';
import { runDemoPlanningAgent } from './demo.js';
import { planClosedLoop } from './closed-loop.js';

const PlanItemSchema = z.object({
  time: z.string(),
  activity: z.string(),
  venue: z.string(),
  venueId: z.string(),
  cost: z.string(),
  reason: z.string(),
  bookingRequired: z.boolean(),
});

const PlanSchema = z.object({
  title: z.string(),
  items: z.array(PlanItemSchema),
  totalCost: z.string(),
  totalDuration: z.string(),
  notes: z.array(z.string()),
});

/** 从 LLM 输出文本中提取所有 ```json 代码块解析为 Plan[] (fallback) */
function extractPlansFromText(text: string): Plan[] {
  const matches = text.match(/```json\s*([\s\S]*?)```/g);
  if (!matches) return [];
  const plans: Plan[] = [];
  for (const block of matches) {
    const inner = block.match(/```json\s*([\s\S]*?)```/);
    if (!inner) continue;
    try {
      const parsed = JSON.parse(inner[1]);
      if (!parsed.title || !Array.isArray(parsed.items)) continue;
      plans.push({
        title: parsed.title,
        items: parsed.items.map((item: Record<string, unknown>) => ({
          time: String(item.time ?? ''),
          activity: String(item.activity ?? ''),
          venue: String(item.venue ?? ''),
          venueId: String(item.venueId ?? ''),
          cost: String(item.cost ?? ''),
          reason: String(item.reason ?? ''),
          bookingRequired: item.bookingRequired === true,
        })),
        totalCost: parsed.totalCost ?? '',
        totalDuration: parsed.totalDuration ?? '',
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      });
    } catch {
      // skip malformed json blocks
    }
  }
  return plans;
}

function parseMinutes(value: string): number | null {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatMinutes(minutes: number): string {
  const hh = Math.floor(minutes / 60).toString().padStart(2, '0');
  const mm = (minutes % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function getPlanTimeRange(plan: Plan): { start: number; end: number } | null {
  const starts: number[] = [];
  const ends: number[] = [];
  for (const item of plan.items) {
    const [startText, endText] = item.time.split('-');
    const start = parseMinutes(startText ?? '');
    const end = parseMinutes(endText ?? '');
    if (start !== null) starts.push(start);
    if (end !== null) ends.push(end);
  }
  if (!starts.length || !ends.length) return null;
  return { start: Math.min(...starts), end: Math.max(...ends) };
}

function isWholeDayRevisionRequest(message: string): boolean {
  return /太短|时间.*短|玩.*整天|一整天|全天|久一点|更久|延长|拉长/.test(message);
}

function expandPlanToWholeDay(plan: Plan): Plan {
  const range = getPlanTimeRange(plan);
  if (!range) return plan;
  const currentHours = (range.end - range.start) / 60;
  const targetStart = 10 * 60;
  const targetEnd = Math.max(range.end, 18 * 60);
  if (currentHours >= 7 && range.start <= 11 * 60 && range.end >= 18 * 60) {
    return plan;
  }

  const items = plan.items.map(item => ({ ...item }));
  const firstItem = items[0];
  if (firstItem && range.start > targetStart + 30) {
    const bufferEnd = Math.max(targetStart + 90, range.start - 60);
    items.unshift({
      time: `${formatMinutes(targetStart)}-${formatMinutes(bufferEnd)}`,
      activity: '上午轻松开场',
      venue: `${firstItem.venue}周边`,
      venueId: '',
      cost: '免费或低消费',
      reason: '用户希望玩一整天，补充上午低负担活动作为开场。',
      bookingRequired: false,
    });
    if (bufferEnd < range.start) {
      items.splice(1, 0, {
        time: `${formatMinutes(bufferEnd)}-${formatMinutes(range.start)}`,
        activity: '午餐/休整与前往首站',
        venue: `${firstItem.venue}附近`,
        venueId: '',
        cost: '按需消费',
        reason: '衔接上午活动和原方案首站，避免全天行程断档。',
        bookingRequired: false,
      });
    }
  }

  const lastRange = getPlanTimeRange({ ...plan, items });
  const lastItem = items[items.length - 1];
  if (lastItem && lastRange && lastRange.end < targetEnd) {
    items.push({
      time: `${formatMinutes(lastRange.end)}-${formatMinutes(targetEnd)}`,
      activity: '傍晚加长活动',
      venue: `${lastItem.venue}周边`,
      venueId: '',
      cost: '免费或低消费',
      reason: '用户反馈时间太短，补充傍晚散步/商圈逛逛，让方案达到全天长度。',
      bookingRequired: false,
    });
  }

  const finalRange = getPlanTimeRange({ ...plan, items }) ?? range;
  const finalHours = Math.round(((finalRange.end - finalRange.start) / 60) * 10) / 10;

  return {
    ...plan,
    title: plan.title.includes('全天版') ? plan.title : `全天版：${plan.title}`,
    items,
    totalDuration: `约${finalHours}小时（${formatMinutes(finalRange.start)}-${formatMinutes(finalRange.end)}）`,
    notes: [...plan.notes, '已根据“时间太短/想玩一整天”的反馈扩展为全天节奏。'],
  };
}

export function normalizePlansForGlobalRevision(message: string, plans: Plan[]): Plan[] {
  if (!isWholeDayRevisionRequest(message)) return plans;
  return plans.map(expandPlanToWholeDay);
}

async function* runVerifiedFallbackPlan(
  session: Session,
  userMessage: string,
): AsyncGenerator<SSEEvent> {
  const result = await planClosedLoop(userMessage);

  yield {
    type: 'token',
    content: '模型输出缺少必要工具核验，已自动切换到确定性闭环规划，重新完成可用性查询和路线校验。',
  };

  for (const item of result.trace) {
    yield { type: 'tool_trace', trace: item };
    yield { type: 'tool_call', tool: item.tool, args: item.input ?? {} };
    yield { type: 'tool_result', tool: item.tool, result: item.output ?? item.artifacts };
  }

  setPlan(session, result.plan);
  setPendingPlans(session, null);
  transitionState(session, 'PLAN_READY');
  transitionState(session, 'USER_CONFIRMING');
  session.planningContext = {
    constraints: result.constraints as unknown as Record<string, unknown>,
    routeArtifacts: result.routeArtifacts as unknown as Record<string, unknown>,
  };
  session.history.push({ role: 'assistant', content: JSON.stringify(result.plan) });

  yield { type: 'plan_ready', plan: result.plan, constraintExplanation: result.constraintExplanation };
}

export async function* runPlanningAgent(
  session: Session,
  userMessage: string,
): AsyncGenerator<SSEEvent> {
  // 追加用户消息到历史
  session.history.push({ role: 'user', content: userMessage });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || process.env.DEMO_MODE === 'true') {
    yield* runDemoPlanningAgent(session, userMessage);
    return;
  }

  try {
    const calledTools = new Set<string>();
    const result = streamText({
      model: deepseek(process.env.MODEL || 'deepseek-chat'),
      system: PLANNING_SYSTEM_PROMPT,
      messages: session.history.map(h => ({ role: h.role, content: h.content })),
      tools: planningTools,
      stopWhen: stepCountIs(15),
    });

    // 流式输出事件
    for await (const event of result.fullStream) {
      switch (event.type) {
        case 'text-delta':
          yield { type: 'token', content: event.text };
          break;
        case 'tool-call':
          calledTools.add(event.toolName);
          yield {
            type: 'tool_call',
            tool: event.toolName,
            args: event.input as Record<string, unknown>,
          };
          break;
        case 'tool-result':
          yield {
            type: 'tool_result',
            tool: event.toolName,
            result: event.output,
          };
          break;
        case 'tool-error':
          yield {
            type: 'error',
            message: `工具 ${event.toolName} 执行失败: ${String(event.error)}`,
          };
          break;
      }
    }

    // 流结束，用 schema 提取 Plan(s)，失败则 fallback 到正则
    const fullText = await result.text;
    let plans: Plan[] = [];

    try {
      const schemaResult = await generateText({
        model: deepseek(process.env.MODEL || 'deepseek-chat'),
        system: '你是JSON提取器。从用户文本中提取所有方案对象，返回一个JSON数组。每个方案必须包含: title, items(数组), totalCost, totalDuration, notes(数组)。每个item包含: time, activity, venue, venueId, cost, reason, bookingRequired(布尔)。如果文本包含多个方案，全部提取。',
        prompt: fullText,
        output: Output.object({ schema: z.object({ plans: z.array(PlanSchema) }) }),
      });
      const output = await schemaResult.output;
      if (output?.plans?.length) {
        plans = output.plans as Plan[];
      }
    } catch {
      // schema extraction failed, fallback to regex
    }

    if (plans.length === 0) {
      plans = extractPlansFromText(fullText);
    }
    const hasAvailabilityCheck = calledTools.has('check_availability');
    const hasRoute = calledTools.has('get_route');

    if (plans.length > 0 && (!hasAvailabilityCheck || !hasRoute)) {
      yield* runVerifiedFallbackPlan(session, userMessage);
      yield { type: 'done' };
      return;
    }

    const normalizedPlans = normalizePlansForGlobalRevision(userMessage, plans);

    if (normalizedPlans.length >= 2) {
      setPlan(session, normalizedPlans[0]);
      setPendingPlans(session, normalizedPlans);
      transitionState(session, 'PLAN_READY');
      transitionState(session, 'USER_CONFIRMING');
      yield { type: 'plan_ready', plan: normalizedPlans[0], plans: normalizedPlans };
    } else if (normalizedPlans.length === 1) {
      setPlan(session, normalizedPlans[0]);
      setPendingPlans(session, null);
      transitionState(session, 'PLAN_READY');
      transitionState(session, 'USER_CONFIRMING');
      yield { type: 'plan_ready', plan: normalizedPlans[0] };
    }

    // 追加助手消息到历史
    session.history.push({ role: 'assistant', content: fullText });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    yield { type: 'error', message: `Planning Agent 错误: ${message}` };
  }

  yield { type: 'done' };
}
