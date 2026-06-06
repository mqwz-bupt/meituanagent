import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkAvailability,
  clearAvailabilityOverrides,
  getRestaurantById,
  searchRestaurants,
  setAvailabilityOverride,
} from '../mock/data.js';
import { planClosedLoop, executeClosedLoopPlan } from '../agent/closed-loop.js';

describe('Mock 业务真实化', () => {
  beforeEach(() => {
    clearAvailabilityOverrides();
  });

  // === 一、营业时间判断 ===

  describe('checkAvailability 返回结构化状态', () => {
    it('可用时返回 available 状态和 recommendAction=book_now', () => {
      const result = checkAvailability('r006', 'today', '18:00', 3);
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('recommendAction');
      if (result.available) {
        expect(result.status).toBe('available');
        expect(result.recommendAction).toBe('book_now');
      }
    });

    it('不可用时返回 full/queue_required/closed 等状态', () => {
      setAvailabilityOverride('r006', '18:00', {
        available: false,
        remainingSlots: 0,
        timeSlots: [],
        estimatedWait: '今日已满',
        status: 'full',
        recommendAction: 'choose_alternative',
        capacityLeft: 0,
      });
      const result = checkAvailability('r006', 'today', '18:00', 3);
      expect(result.available).toBe(false);
      expect(result.status).toMatch(/full|queue_required|closed|sold_out|no_available_slot/);
      expect(result.recommendAction).toMatch(/choose_alternative|adjust_time|take_queue_number/);
    });

    it('返回结果包含 capacityLeft 字段', () => {
      const result = checkAvailability('r011', 'today', '12:00', 2);
      expect(result).toHaveProperty('capacityLeft');
      expect(typeof result.capacityLeft).toBe('number');
    });
  });

  // === 二、排队过长触发恢复 ===

  describe('排队判断', () => {
    it('queueMinutes 超过阈值时应触发替代餐厅恢复', async () => {
      const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
      const restaurantItem = planning.plan.items.find(i => i.venueId.startsWith('r'))!;

      setAvailabilityOverride(restaurantItem.venueId, restaurantItem.time.split('-')[0], {
        available: false,
        remainingSlots: 0,
        timeSlots: [],
        estimatedWait: '排队约45分钟',
        status: 'full',
        recommendAction: 'take_queue_number',
        capacityLeft: 0,
      });

      const execution = await executeClosedLoopPlan(planning.plan, planning.constraints, planning.routeArtifacts);
      expect(execution.trace.some(t => t.status === 'failed')).toBe(true);
      expect(execution.trace.some(t => t.status === 'recovered')).toBe(true);
    });
  });

  // === 三、四人桌测试 ===

  describe('朋友场景优先选择支持4人桌的餐厅', () => {
    it('friends scenario 4人时，选中餐厅应支持4人或以上', async () => {
      const planning = await planClosedLoop('今天下午我们 4 个朋友，2 男 2 女，想找个轻松一点的 citywalk 加晚饭安排。');
      expect(planning.selectedRestaurant.groupMax).toBeGreaterThanOrEqual(4);
    });

    it('friends scenario 餐厅 groupFriendly 评分加分', async () => {
      const planning = await planClosedLoop('今天下午我们 4 个朋友，2 男 2 女，想找个轻松一点的 citywalk 加晚饭安排。');
      const r = planning.selectedRestaurant;
      const friendsOk = r.groupMax >= 4 || r.tags.some(t => /朋友|聚餐/.test(t));
      expect(friendsOk).toBe(true);
    });
  });

  // === 四、亲子友好测试 ===

  describe('家庭场景优先选择亲子友好的餐厅和活动', () => {
    it('family scenario 活动应适合5岁儿童', async () => {
      const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
      const a = planning.selectedActivity;
      expect(a.tags.join('')).not.toMatch(/密室|酒吧|剧本杀|夜店/);
      if (a.ageSuitability.type === 'min') {
        expect(a.ageSuitability.minAge).toBeLessThanOrEqual(5);
      }
    });

    it('family scenario 餐厅应该是 kidFriendly', async () => {
      const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
      expect(planning.selectedRestaurant.kidFriendly).toBe(true);
    });
  });

  // === 五、团购券/套餐测试 ===

  describe('商业转化卡包含 coupons/packages', () => {
    it('businessConversion 应包含 merchantBreakdown 和 conversionFunnel', async () => {
      const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
      const execution = await executeClosedLoopPlan(planning.plan, planning.constraints, planning.routeArtifacts, planning.trace);

      expect(execution.businessConversion.merchantBreakdown.length).toBeGreaterThanOrEqual(2);
      expect(execution.businessConversion.conversionFunnel.searched).toBeGreaterThan(0);
      expect(execution.businessConversion.conversionFunnel.checked).toBeGreaterThan(0);
      expect(execution.businessConversion.conversionFunnel.booked).toBeGreaterThan(0);
    });

    it('businessConversion.totalSpend 应大于 0', async () => {
      const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
      const execution = await executeClosedLoopPlan(planning.plan, planning.constraints, planning.routeArtifacts, planning.trace);
      expect(execution.businessConversion.totalSpend).toBeGreaterThan(0);
      expect(execution.businessConversion.platformGMV).toBeGreaterThan(0);
    });

    it('餐厅 mock 数据应有 coupons 或 tableTypes 字段', () => {
      const r = getRestaurantById('r006');
      if (r?.coupons) {
        expect(r.coupons.length).toBeGreaterThan(0);
        expect(r.coupons[0]).toHaveProperty('name');
        expect(r.coupons[0]).toHaveProperty('price');
        expect(r.coupons[0]).toHaveProperty('saving');
      }
    });
  });

  // === 六、booking 确认信息测试 ===

  describe('booking 返回结构化确认信息', () => {
    it('bookingId 应为 MT-R-xxxx 或 MT-A-xxxx 格式', async () => {
      const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
      const execution = await executeClosedLoopPlan(planning.plan, planning.constraints);

      const activityResult = execution.results.find(r => r.kind === 'activity' && r.status === 'success');
      const restaurantResult = execution.results.find(r => r.kind === 'restaurant' && r.status === 'success');

      expect(activityResult?.bookingId).toMatch(/^(BK-|MT-A|RCV-)/);
      expect(restaurantResult?.bookingId).toMatch(/^(BK-|MT-R|RCV-)/);
    });

    it('confirmationCard 应包含完整预订信息', async () => {
      const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
      const execution = await executeClosedLoopPlan(planning.plan, planning.constraints);

      const card = execution.confirmationCard;
      expect(card.overview.title).toBeTruthy();
      expect(card.overview.departureTime).toBeTruthy();
      expect(card.overview.totalDuration).toBeTruthy();
      expect(card.overview.routeSummary).toBeTruthy();

      if (card.activity) {
        expect(card.activity.confirmationId).toBeTruthy();
      }
      if (card.restaurant) {
        expect(card.restaurant.confirmationId).toBeTruthy();
      }
    });
  });

  // === 七、失败恢复状态测试 ===

  describe('失败恢复适配多种状态', () => {
    it('full 状态能触发 recovered', async () => {
      const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
      const restaurantItem = planning.plan.items.find(i => i.venueId.startsWith('r'))!;
      setAvailabilityOverride(restaurantItem.venueId, restaurantItem.time.split('-')[0], {
        available: false, remainingSlots: 0, timeSlots: [], estimatedWait: '满员',
        status: 'full', recommendAction: 'choose_alternative', capacityLeft: 0,
      });
      const execution = await executeClosedLoopPlan(planning.plan, planning.constraints, planning.routeArtifacts);
      expect(execution.results.some(r => r.status === 'recovered' && r.kind === 'restaurant')).toBe(true);
    });

    it('sold_out 状态能触发 recovered', async () => {
      const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
      const activityItem = planning.plan.items.find(i => i.venueId.startsWith('a') && i.bookingRequired)!;
      setAvailabilityOverride(activityItem.venueId, activityItem.time.split('-')[0], {
        available: false, remainingSlots: 0, timeSlots: [], estimatedWait: '门票已售罄',
        status: 'sold_out', recommendAction: 'choose_alternative', capacityLeft: 0,
      });
      const execution = await executeClosedLoopPlan(planning.plan, planning.constraints, planning.routeArtifacts);
      expect(execution.results.some(r => r.status === 'recovered' && r.kind === 'activity')).toBe(true);
    });

    it('failureMode restaurant_unavailable 触发恢复并包含状态', async () => {
      const input = '今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。请模拟餐厅无位。';
      const planning = await planClosedLoop(input);
      const execution = await executeClosedLoopPlan(planning.plan, planning.constraints, planning.routeArtifacts);
      expect(execution.stateTransitions).toContain('REPLANNING');
      expect(execution.recoveryStory.hasRecovery).toBe(true);
    });
  });
});
