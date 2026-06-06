import { describe, expect, it } from 'vitest';
import type { Plan } from '../types.js';
import { normalizePlansForGlobalRevision } from '../agent/planning.js';

const shortPlan: Plan = {
  title: '方案B：科技馆涨知识 → 奥森吸氧 → 西贝低卡晚餐',
  items: [
    {
      time: '13:00-16:00',
      activity: '中国科学技术馆',
      venue: '中国科学技术馆',
      venueId: 'a001',
      cost: '30元/人，共90元',
      reason: '适合亲子',
      bookingRequired: true,
    },
    {
      time: '16:00-18:00',
      activity: '奥林匹克森林公园散步',
      venue: '奥林匹克森林公园',
      venueId: '',
      cost: '免费',
      reason: '放松',
      bookingRequired: false,
    },
    {
      time: '18:00-19:00',
      activity: '西贝低卡晚餐',
      venue: '西贝莜面村',
      venueId: 'r001',
      cost: '约330元',
      reason: '适合家庭',
      bookingRequired: true,
    },
  ],
  totalCost: '约420元（一家三口）',
  totalDuration: '约6小时（13:00-19:00）',
  notes: [],
};

const longPlan: Plan = {
  title: '方案A：798文艺漫游 → 朝阳公园撒欢 → 蓝色港湾日料晚餐',
  items: [
    {
      time: '10:00-12:00',
      activity: '逛798艺术区',
      venue: '798艺术区',
      venueId: '',
      cost: '免费',
      reason: '上午开场',
      bookingRequired: false,
    },
    {
      time: '12:30-14:30',
      activity: '朝阳公园草坪野餐',
      venue: '朝阳公园',
      venueId: 'a002',
      cost: '约15元',
      reason: '亲子友好',
      bookingRequired: true,
    },
    {
      time: '17:00-18:00',
      activity: '回转寿司晚餐',
      venue: '滨寿司',
      venueId: 'r002',
      cost: '约450元',
      reason: '低负担',
      bookingRequired: true,
    },
  ],
  totalCost: '约585元（一家三口）',
  totalDuration: '约8小时（10:00-18:00）',
  notes: [],
};

describe('multi-plan global revision normalization', () => {
  it('expands every A/B plan when the user says the schedule is too short', () => {
    const plans = normalizePlansForGlobalRevision('太短了我们想玩一整天', [longPlan, shortPlan]);

    expect(plans[0].totalDuration).toContain('10:00-18:00');
    expect(plans[1].title).toContain('全天版');
    expect(plans[1].items[0].time.startsWith('10:00')).toBe(true);
    expect(plans[1].totalDuration).toContain('10:00-19:00');
    expect(plans[1].items.length).toBeGreaterThan(shortPlan.items.length);
  });

  it('does not mutate plans for unrelated feedback', () => {
    const plans = normalizePlansForGlobalRevision('老婆说餐厅太油了', [shortPlan]);

    expect(plans[0]).toEqual(shortPlan);
  });
});
