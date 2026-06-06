import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession, transitionState } from '../state.js';

const modelText = `
这里是模型直接生成的方案，但没有调用工具。

\`\`\`json
{
  "title": "未核验方案",
  "items": [
    {
      "time": "14:00-16:00",
      "activity": "亲子活动",
      "venue": "某亲子乐园",
      "venueId": "a001",
      "cost": "约 100 元",
      "reason": "适合孩子",
      "bookingRequired": true
    },
    {
      "time": "17:00-18:00",
      "activity": "晚餐",
      "venue": "某餐厅",
      "venueId": "r001",
      "cost": "约 300 元",
      "reason": "适合家庭",
      "bookingRequired": true
    }
  ],
  "totalCost": "约 400 元",
  "totalDuration": "约 4 小时",
  "notes": ["需要确认可用性"]
}
\`\`\`
`;

vi.mock('@ai-sdk/deepseek', () => ({
  deepseek: vi.fn(() => ({ provider: 'mock-deepseek' })),
}));

vi.mock('ai', () => ({
  Output: {
    object: vi.fn((value: unknown) => value),
  },
  stepCountIs: vi.fn((count: number) => ({ count })),
  streamText: vi.fn(() => ({
    fullStream: (async function* () {
      yield { type: 'text-delta', text: modelText };
    })(),
    text: Promise.resolve(modelText),
  })),
  generateText: vi.fn(() => Promise.resolve({
    output: Promise.resolve({
      plans: [{
        title: '未核验方案',
        items: [
          {
            time: '14:00-16:00',
            activity: '亲子活动',
            venue: '某亲子乐园',
            venueId: 'a001',
            cost: '约 100 元',
            reason: '适合孩子',
            bookingRequired: true,
          },
          {
            time: '17:00-18:00',
            activity: '晚餐',
            venue: '某餐厅',
            venueId: 'r001',
            cost: '约 300 元',
            reason: '适合家庭',
            bookingRequired: true,
          },
        ],
        totalCost: '约 400 元',
        totalDuration: '约 4 小时',
        notes: ['需要确认可用性'],
      }],
    }),
  })),
  tool: vi.fn((definition: unknown) => definition),
}));

describe('planning required-tool guard', () => {
  const oldApiKey = process.env.DEEPSEEK_API_KEY;
  const oldDemoMode = process.env.DEMO_MODE;

  afterEach(() => {
    process.env.DEEPSEEK_API_KEY = oldApiKey;
    process.env.DEMO_MODE = oldDemoMode;
  });

  it('falls back to deterministic planning instead of surfacing missing-tool guard to users', async () => {
    process.env.DEEPSEEK_API_KEY = 'test-key';
    delete process.env.DEMO_MODE;

    const { runPlanningAgent } = await import('../agent/planning.js');
    const session = createSession('planning-guard-fallback');
    transitionState(session, 'PLANNING');

    const events = [];
    for await (const event of runPlanningAgent(
      session,
      '今天下午想带 5 岁孩子和老婆出去玩几个小时，别离家太远，老婆最近在减肥',
    )) {
      events.push(event);
    }

    expect(events.some(event => event.type === 'error' && event.code === 'MISSING_REQUIRED_TOOL_GUARD')).toBe(false);
    expect(events.some(event => event.type === 'plan_ready')).toBe(true);
    expect(events.some(event => event.type === 'tool_trace' && event.trace.tool === 'check_availability')).toBe(true);
    expect(events.some(event => event.type === 'tool_trace' && event.trace.tool === 'get_route')).toBe(true);
    expect(session.currentPlan).not.toBeNull();
  });

  it('emits tool_call before matching tool_trace so the UI can show running stages', async () => {
    process.env.DEMO_MODE = 'true';

    const { runDemoPlanningAgent } = await import('../agent/demo.js');
    const session = createSession('stream-visibility-order');

    const events: Array<{ type: string; tool?: string; trace?: { tool?: string } }> = [];
    for await (const event of runDemoPlanningAgent(session, '今天下午想带5岁孩子和老婆出去玩，老婆在减肥')) {
      if (event.type === 'tool_call' || event.type === 'tool_trace') {
        events.push(event as { type: string; tool?: string; trace?: { tool?: string } });
      }
    }

    const firstToolCall = events.findIndex(event => event.type === 'tool_call');
    const firstToolTrace = events.findIndex(event => event.type === 'tool_trace');
    expect(firstToolCall).toBeGreaterThanOrEqual(0);
    expect(firstToolTrace).toBeGreaterThanOrEqual(0);
    expect(firstToolCall).toBeLessThan(firstToolTrace);
    expect(events[firstToolTrace]?.trace?.tool).toBe(events[firstToolCall]?.tool);
  });
});
