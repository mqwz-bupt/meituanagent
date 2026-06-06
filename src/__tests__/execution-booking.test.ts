import { describe, it, expect } from 'vitest';
import type { PlanItem } from '../types.js';

// ==================== PlanItem.bookingRequired ====================

describe('PlanItem.bookingRequired field', () => {
  it('accepts bookingRequired: true on a restaurant item', () => {
    const item: PlanItem = {
      time: '17:00-18:00',
      activity: '回转寿司晚餐',
      venue: '滨寿司',
      venueId: 'r011',
      cost: '人均150元',
      reason: '亲子友好',
      bookingRequired: true,
    };
    expect(item.bookingRequired).toBe(true);
  });

  it('accepts bookingRequired: false on a free activity', () => {
    const item: PlanItem = {
      time: '14:00-16:30',
      activity: 'Citywalk漫步',
      venue: '五道营胡同',
      venueId: '',
      cost: '免费',
      reason: '文艺胡同氛围',
      bookingRequired: false,
    };
    expect(item.bookingRequired).toBe(false);
  });

  it('accepts bookingRequired: false on transportation', () => {
    const item: PlanItem = {
      time: '16:30-17:00',
      activity: '打车前往三里屯',
      venue: '五道营胡同→三里屯',
      venueId: '',
      cost: '打车约25元',
      reason: '车程23分钟',
      bookingRequired: false,
    };
    expect(item.bookingRequired).toBe(false);
  });

  it('works without bookingRequired (optional field)', () => {
    const item: PlanItem = {
      time: '14:00-16:30',
      activity: '游览公园',
      venue: '朝阳公园',
      venueId: 'a017',
      cost: '5元/人',
      reason: '环境好',
    };
    expect(item.bookingRequired).toBeUndefined();
  });
});

// ==================== extractBookingResults with 'skipped' ====================

describe('extractBookingResults', () => {
  function extractBookingResults(text: string): Array<{ item: string; status: string; bookingId?: string; reason?: string }> {
    const matches = text.match(/```json\s*([\s\S]*?)```/g);
    if (!matches) return [];
    const last = matches[matches.length - 1];
    const inner = last.match(/```json\s*([\s\S]*?)```/);
    if (!inner) return [];
    try {
      const parsed = JSON.parse(inner[1]);
      if (Array.isArray(parsed.results)) return parsed.results;
      return [];
    } catch {
      return [];
    }
  }

  it('parses results with skipped status', () => {
    const text = `
方案执行完毕。

\`\`\`json
{
  "results": [
    { "item": "朝阳公园", "status": "skipped", "reason": "免费活动无需预订" },
    { "item": "步行至蓝色港湾", "status": "skipped", "reason": "交通出行无需预订" },
    { "item": "X先生密室", "status": "success", "bookingId": "BKA1B2C3" },
    { "item": "滨寿司", "status": "failed", "reason": "17:00 时段已满" }
  ],
  "shareText": "搞定了！"
}
\`\`\`
`;
    const results = extractBookingResults(text);
    expect(results).toHaveLength(4);
    expect(results[0].status).toBe('skipped');
    expect(results[0].reason).toBe('免费活动无需预订');
    expect(results[1].status).toBe('skipped');
    expect(results[2].status).toBe('success');
    expect(results[3].status).toBe('failed');
  });

  it('returns empty array for text without JSON block', () => {
    const results = extractBookingResults('just some text');
    expect(results).toEqual([]);
  });

  it('uses last JSON block when multiple exist', () => {
    const text = `
\`\`\`json
{ "results": [{ "item": "old", "status": "success" }] }
\`\`\`

Some more text.

\`\`\`json
{ "results": [{ "item": "new", "status": "skipped", "reason": "test" }] }
\`\`\`
`;
    const results = extractBookingResults(text);
    expect(results).toHaveLength(1);
    expect(results[0].item).toBe('new');
  });
});

// ==================== Planning prompt includes bookingRequired ====================

describe('Planning prompt bookingRequired field', () => {
  it('PLANNING_SYSTEM_PROMPT mentions bookingRequired in JSON schema', async () => {
    const { PLANNING_SYSTEM_PROMPT } = await import('../agent/prompts/planning.js');
    expect(PLANNING_SYSTEM_PROMPT).toContain('bookingRequired');
  });

  it('PLANNING_SYSTEM_PROMPT has bookingRequired in example item', async () => {
    const { PLANNING_SYSTEM_PROMPT } = await import('../agent/prompts/planning.js');
    expect(PLANNING_SYSTEM_PROMPT).toMatch(/"bookingRequired"\s*:\s*(true|false)/);
  });
});

// ==================== Execution prompt references bookingRequired ====================

describe('Execution prompt bookingRequired check', () => {
  it('EXECUTION_SYSTEM_PROMPT mentions bookingRequired', async () => {
    const { EXECUTION_SYSTEM_PROMPT } = await import('../agent/prompts/execution.js');
    expect(EXECUTION_SYSTEM_PROMPT).toContain('bookingRequired');
  });

  it('EXECUTION_SYSTEM_PROMPT instructs to skip when bookingRequired is false', async () => {
    const { EXECUTION_SYSTEM_PROMPT } = await import('../agent/prompts/execution.js');
    expect(EXECUTION_SYSTEM_PROMPT).toMatch(/bookingRequired.*false/);
  });
});
