import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAvailabilityOverrides,
  setAvailabilityOverride,
} from '../mock/data.js';
import {
  executeClosedLoopPlan,
  extractConstraints,
  planClosedLoop,
} from '../agent/closed-loop.js';

describe('closed-loop local activity agent', () => {
  beforeEach(() => {
    clearAvailabilityOverrides();
  });

  it('"家人" triggers family scenario and "奥森" parses to 朝阳区', () => {
    const constraints = extractConstraints('今天想带家人去奥森玩，孩子 5 岁');
    expect(constraints.scenario).toBe('family');
    expect(constraints.partySize).toBe(3);
    expect(constraints.childAge).toBe(5);
    expect(constraints.preferredDistrict).toBe('朝阳区');
  });

  it('"减肥" alone does not trigger family — couple with diet stays couple', () => {
    const constraints = extractConstraints('和女朋友出去，她最近在减肥');
    expect(constraints.scenario).toBe('couple');
    expect(constraints.partySize).toBe(2);
    expect(constraints.dietFriendly).toBe(true);
    expect(constraints.shareAudience).toBe('partner');
    expect(constraints.avoidActivityTags).toEqual([]);
  });

  it('"减肥" with family keywords still triggers family', () => {
    const constraints = extractConstraints('老婆最近在减肥，想带孩子出去玩');
    expect(constraints.scenario).toBe('family');
    expect(constraints.partySize).toBe(3);
    expect(constraints.dietFriendly).toBe(true);
    expect(constraints.shareAudience).toBe('wife');
  });

  it('"减肥" with friends keywords stays friends', () => {
    const constraints = extractConstraints('朋友里有人减肥，想吃健康点');
    expect(constraints.scenario).toBe('friends');
    expect(constraints.dietFriendly).toBe(true);
  });

  it('"和对象约会，想吃健康一点" triggers couple', () => {
    const constraints = extractConstraints('和对象约会，想吃健康一点');
    expect(constraints.scenario).toBe('couple');
    expect(constraints.dietFriendly).toBe(true);
  });

  it('runs the family scenario through planning, booking, and wife share text', async () => {
    const input = '今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。';
    const planning = await planClosedLoop(input);
    const execution = await executeClosedLoopPlan(planning.plan, planning.constraints);

    expect(planning.constraints.scenario).toBe('family');
    expect(planning.constraints.childAge).toBe(5);
    expect(planning.constraints.dietFriendly).toBe(true);
    expect(planning.constraints.maxDistanceKm).toBeLessThanOrEqual(10);
    expect(planning.plan.items.some(item => item.venueId.startsWith('a'))).toBe(true);
    expect(planning.plan.items.some(item => item.venueId.startsWith('r'))).toBe(true);
    expect(planning.plan.items.find(item => item.venueId.startsWith('r'))?.reason).toContain('减脂');

    const tools = [...planning.trace, ...execution.trace].map(t => t.tool);
    expect(tools).toEqual(expect.arrayContaining([
      'search_activities',
      'search_restaurants',
      'check_availability',
      'get_route',
      'book_activity',
      'book_restaurant',
      'generate_share_text',
    ]));
    expect(execution.results.filter(r => r.status === 'success').every(r => !!r.bookingId)).toBe(true);
    expect(execution.shareText).toContain('老婆');
  });

  it('runs the friends scenario through planning, booking, and group chat share text', async () => {
    const input = '今天下午我们 4 个朋友，2 男 2 女，想找个轻松一点的 citywalk 加晚饭安排。';
    const planning = await planClosedLoop(input);
    const execution = await executeClosedLoopPlan(planning.plan, planning.constraints);

    expect(planning.constraints.scenario).toBe('friends');
    expect(planning.constraints.partySize).toBe(4);
    expect(planning.plan.title).toContain('朋友');
    expect(execution.shareText).toMatch(/群|朋友|大家/);
    expect(execution.results.filter(r => r.status === 'success').length).toBeGreaterThanOrEqual(2);
  });

  it('automatically replaces a full restaurant and books the recovered venue', async () => {
    const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');

    // Make the dynamically-selected restaurant unavailable at its time slot
    const restaurantItem = planning.plan.items.find(i => i.venueId.startsWith('r'))!;
    setAvailabilityOverride(restaurantItem.venueId, restaurantItem.time.split('-')[0], {
      available: false,
      remainingSlots: 0,
      timeSlots: [],
      estimatedWait: '当前时段已满',
      status: 'full',
      recommendAction: 'choose_alternative',
      capacityLeft: 0,
    });

    const execution = await executeClosedLoopPlan(planning.plan, planning.constraints, planning.routeArtifacts);

    const failed = execution.trace.find(t => t.tool === 'book_restaurant' && t.status === 'failed');
    const recoveredSearch = execution.trace.find(t => t.tool === 'search_restaurants' && t.status === 'recovered');
    const recoveredBooking = execution.trace.find(t => t.tool === 'book_restaurant' && t.status === 'recovered');

    expect(failed?.summary).toContain('无位');
    expect(recoveredSearch).toBeTruthy();
    expect(recoveredBooking?.artifacts.bookingId).toBeTruthy();
    expect(execution.results.some(r => r.status === 'recovered' && r.kind === 'restaurant')).toBe(true);
  });

  it('automatically replaces a full activity through REPLANNING', async () => {
    const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');

    // Make the dynamically-selected activity unavailable at its time slot
    const activityItem = planning.plan.items.find(i => i.venueId.startsWith('a') && i.bookingRequired)!;
    setAvailabilityOverride(activityItem.venueId, activityItem.time.split('-')[0], {
      available: false,
      remainingSlots: 0,
      timeSlots: [],
      estimatedWait: '门票已售罄',
      status: 'sold_out',
      recommendAction: 'choose_alternative',
      capacityLeft: 0,
    });

    const execution = await executeClosedLoopPlan(planning.plan, planning.constraints, planning.routeArtifacts);

    expect(execution.stateTransitions).toContain('REPLANNING');
    expect(execution.trace.some(t => t.tool === 'search_activities' && t.status === 'recovered')).toBe(true);
    expect(execution.results.some(r => r.status === 'recovered' && r.kind === 'activity')).toBe(true);
  });

  it('extracts diet constraints and excludes high-calorie restaurants', () => {
    const constraints = extractConstraints('老婆最近在减肥，想吃得轻一点，别安排火锅烧烤自助');
    const planningPromise = planClosedLoop('老婆最近在减肥，想吃得轻一点，别安排火锅烧烤自助');

    expect(constraints.dietFriendly).toBe(true);
    return planningPromise.then(planning => {
      const restaurant = planning.selectedRestaurant;
      expect(restaurant.dietFriendly).toBe(true);
      expect(restaurant.tags.join('')).not.toMatch(/火锅|烧烤|炸鸡|自助/);
    });
  });

  it('filters unsuitable activities for a five year old child', async () => {
    const planning = await planClosedLoop('孩子 5 岁，下午想出去玩，别太累也别太晚');
    const activity = planning.selectedActivity;

    expect(activity.tags.join('')).not.toMatch(/密室|酒吧|剧本杀/);
    expect(activity.duration).toBeLessThanOrEqual(180);
    expect(activity.timeSlots.some(slot => Number(slot.slice(0, 2)) >= 18)).toBe(false);
  });

  it('produces a trace timeline with search/check/book/share events', async () => {
    const planning = await planClosedLoop('今天下午我们 4 个朋友，2 男 2 女，citywalk 加晚饭');
    const execution = await executeClosedLoopPlan(planning.plan, planning.constraints);
    const trace = [...planning.trace, ...execution.trace];

    expect(trace.every(t => t.timestamp && t.summary && t.status)).toBe(true);
    expect(trace.map(t => t.tool)).toEqual(expect.arrayContaining([
      'search_activities',
      'search_restaurants',
      'check_availability',
      'get_route',
      'book_activity',
      'book_restaurant',
      'generate_share_text',
    ]));
  });

  it('booking_complete contains non-empty activity and restaurant confirmation IDs', async () => {
    const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
    const execution = await executeClosedLoopPlan(planning.plan, planning.constraints);

    const activity = execution.results.find(r => r.kind === 'activity');
    const restaurant = execution.results.find(r => r.kind === 'restaurant');
    expect(activity?.bookingId).toMatch(/^BK-|^MOCK|^RCV-/);
    expect(restaurant?.bookingId).toMatch(/^BK-|^MOCK|^RCV-/);
    expect(execution.confirmationCard.activity?.confirmationId).toBe(activity?.bookingId);
    expect(execution.confirmationCard.restaurant?.confirmationId).toBe(restaurant?.bookingId);
  });

  it('family scenario selects same or nearby district restaurant', async () => {
    const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');

    // Activity and restaurant should not be hardcoded
    expect(planning.selectedActivity.id).toBeDefined();
    expect(planning.selectedRestaurant.id).toBeDefined();

    // District distance should be reasonable (not cross-city)
    const dist = planning.routeArtifacts.districtDistance;
    expect(dist).toBeLessThanOrEqual(15);

    // Route artifacts must have structured fields
    expect(planning.routeArtifacts.activityDistrict).toBeTruthy();
    expect(planning.routeArtifacts.restaurantDistrict).toBeTruthy();
    expect(typeof planning.routeArtifacts.sameDistrict).toBe('boolean');
    expect(planning.routeArtifacts.distanceKm).toBeGreaterThan(0);
    expect(planning.routeArtifacts.durationMinutes).toBeGreaterThan(0);

    // Scoring output in trace
    const searchTrace = planning.trace.find(t => t.tool === 'search_restaurants');
    expect(searchTrace?.artifacts.topScores).toBeDefined();
  });

  it('friends scenario route is reasonable', async () => {
    const planning = await planClosedLoop('今天下午我们 4 个朋友，2 男 2 女，想找个轻松一点的 citywalk 加晚饭安排。');

    expect(planning.routeArtifacts.activityDistrict).toBeTruthy();
    expect(planning.routeArtifacts.restaurantDistrict).toBeTruthy();
    expect(planning.routeArtifacts.durationMinutes).toBeLessThanOrEqual(60);

    // Route trace must contain structured artifacts
    const routeTrace = planning.trace.find(t => t.tool === 'get_route');
    expect(routeTrace?.artifacts.sameDistrict).toBeDefined();
    expect(routeTrace?.artifacts.activityDistrict).toBeTruthy();
    expect(routeTrace?.artifacts.restaurantDistrict).toBeTruthy();
  });

  it('restaurant recovery prefers same district', async () => {
    const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');

    // Make the selected restaurant unavailable
    const restaurantItem = planning.plan.items.find(i => i.venueId.startsWith('r'))!;
    setAvailabilityOverride(restaurantItem.venueId, restaurantItem.time.split('-')[0], {
      available: false,
      remainingSlots: 0,
      timeSlots: [],
      estimatedWait: '当前时段已满',
      status: 'full',
      recommendAction: 'choose_alternative',
      capacityLeft: 0,
    });

    const execution = await executeClosedLoopPlan(planning.plan, planning.constraints, planning.routeArtifacts);

    // Should have failed → recovered trace
    expect(execution.trace.some(t => t.status === 'failed')).toBe(true);
    expect(execution.trace.some(t => t.status === 'recovered')).toBe(true);

    // Recovery trace should contain district info
    const recoveredTrace = execution.trace.find(t => t.status === 'recovered' && t.tool === 'book_restaurant');
    expect(recoveredTrace?.artifacts.recoveryType).toMatch(/same-district|nearby-district|cross-district/);
  });

  it('route artifacts are structured, not static strings', async () => {
    const planning = await planClosedLoop('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');

    const route = planning.routeArtifacts;
    // Must have all structured fields
    expect(route.activityDistrict).toBeTruthy();
    expect(route.restaurantDistrict).toBeTruthy();
    expect(typeof route.sameDistrict).toBe('boolean');
    expect(typeof route.districtDistance).toBe('number');
    expect(typeof route.distanceKm).toBe('number');
    expect(typeof route.durationMinutes).toBe('number');
    expect(typeof route.transport).toBe('string');
    expect(route.reason).toContain(route.activityDistrict);
    expect(route.reason).toContain('分钟');
  });

  it('failureMode triggers restaurant failure on dynamically-selected venue', async () => {
    const input = '今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。请模拟餐厅无位。';
    const planning = await planClosedLoop(input);

    // failureMode should be set
    expect(planning.constraints.failureMode).toBe('restaurant_unavailable');

    const execution = await executeClosedLoopPlan(planning.plan, planning.constraints, planning.routeArtifacts);

    // The dynamically-selected restaurant should have failed
    const failed = execution.trace.find(t => t.tool === 'book_restaurant' && t.status === 'failed');
    expect(failed).toBeTruthy();
    expect(failed!.input?.venueId).toBe(planning.selectedRestaurant.id);
    expect(failed!.artifacts.reason).toBe('NO_SEATS');

    // Recovery should succeed
    const recovered = execution.trace.find(t => t.tool === 'book_restaurant' && t.status === 'recovered');
    expect(recovered).toBeTruthy();
    expect(recovered!.artifacts.recoveryType).toMatch(/same-district|nearby-district|cross-district/);
    expect(execution.results.some(r => r.status === 'recovered' && r.kind === 'restaurant')).toBe(true);

    const recoveredResult = execution.results.find(r => r.status === 'recovered' && r.kind === 'restaurant');
    const executedRestaurant = execution.plan.items.find(item => item.venueId.startsWith('r'));
    expect(recoveredResult?.venueId).toBeDefined();
    expect(executedRestaurant?.venueId).toBe(recoveredResult?.venueId);
    expect(executedRestaurant?.venue).toBe(recoveredResult?.item);
    expect(execution.plan.title).toContain(recoveredResult!.item);
    expect(execution.plan.title).not.toContain(planning.selectedRestaurant.name);
    expect(execution.shareText).toContain(recoveredResult!.item);
    expect(execution.confirmationCard.restaurant?.name).toBe(recoveredResult?.item);
    expect(execution.confirmationCard.overview.title).toContain(recoveredResult!.item);
    expect(execution.businessConversion.merchantBreakdown.some(m => m.name === recoveredResult?.item)).toBe(true);
  });

  it('failureMode triggers activity failure on dynamically-selected venue', async () => {
    const input = '今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。请模拟活动满员。';
    const planning = await planClosedLoop(input);

    expect(planning.constraints.failureMode).toBe('activity_sold_out');

    const execution = await executeClosedLoopPlan(planning.plan, planning.constraints, planning.routeArtifacts);

    const failed = execution.trace.find(t => t.tool === 'book_activity' && t.status === 'failed');
    expect(failed).toBeTruthy();
    expect(failed!.input?.venueId).toBe(planning.selectedActivity.id);
    expect(failed!.artifacts.reason).toBe('NO_SEATS');

    const recovered = execution.trace.find(t => t.tool === 'book_activity' && t.status === 'recovered');
    expect(recovered).toBeTruthy();
    expect(execution.results.some(r => r.status === 'recovered' && r.kind === 'activity')).toBe(true);
    expect(execution.stateTransitions).toContain('REPLANNING');
  });

  // === P0-3: New scenario tests ===

  describe('couple scenario', () => {
    it('identifies couple scenario and generates romantic plan', async () => {
      const constraints = extractConstraints('今天下午想和对象出去约会，想找个浪漫一点的地方');
      expect(constraints.scenario).toBe('couple');
      expect(constraints.partySize).toBe(2);
      expect(constraints.shareAudience).toBe('partner');
      expect(constraints.avoidActivityTags).toEqual([]);
    });

    it('couple plan does not include child safety constraints', async () => {
      const planning = await planClosedLoop('今天下午想和女朋友出去约会，找个文艺一点的地方');
      expect(planning.constraints.scenario).toBe('couple');
      expect(planning.selectedActivity.tags.join('')).not.toMatch(/亲子/);
      expect(planning.constraintExplanation.rules.some(r => r.label.includes('儿童安全'))).toBe(false);
      expect(planning.constraintExplanation.detectedScenario).toBe('情侣约会');
    });

    it('couple execution produces partner share text', async () => {
      const planning = await planClosedLoop('和男朋友下午出去约会，找个有情调的地方');
      const execution = await executeClosedLoopPlan(planning.plan, planning.constraints);
      expect(execution.shareText).toContain('约会');
    });
  });

  describe('solo scenario', () => {
    it('identifies solo scenario with partySize 1', async () => {
      const constraints = extractConstraints('今天下午自己一个人出去逛逛，随便找个地方坐坐');
      expect(constraints.scenario).toBe('solo');
      expect(constraints.partySize).toBe(1);
      expect(constraints.shareAudience).toBe('self');
    });

    it('solo plan prefers low-cost and freedom', async () => {
      const planning = await planClosedLoop('今天下午一个人出去转转，想去看看展览或者找个咖啡厅坐坐');
      expect(planning.constraints.scenario).toBe('solo');
      expect(planning.constraintExplanation.detectedScenario).toBe('单人出行');
      expect(planning.constraintExplanation.rules.some(r => r.label.includes('儿童安全'))).toBe(false);
    });

    it('solo execution produces self share text', async () => {
      const planning = await planClosedLoop('今天自己出去随便逛逛');
      const execution = await executeClosedLoopPlan(planning.plan, planning.constraints);
      expect(execution.shareText).toContain('安排');
    });
  });

  describe('team scenario', () => {
    it('identifies team scenario with larger party size', async () => {
      const constraints = extractConstraints('公司部门团建，大概8个人，找个能大桌聚餐的地方');
      expect(constraints.scenario).toBe('team');
      expect(constraints.partySize).toBe(8);
      expect(constraints.shareAudience).toBe('friends');
    });

    it('team plan supports large group', async () => {
      const planning = await planClosedLoop('部门团建下午活动加聚餐，十来个人，预算别太高');
      expect(planning.constraints.scenario).toBe('team');
      expect(planning.constraintExplanation.detectedScenario).toBe('团队团建');
      expect(planning.constraintExplanation.rules.some(r => r.label.includes('儿童安全'))).toBe(false);
    });

    it('team execution produces group share text', async () => {
      const planning = await planClosedLoop('公司团建下午活动加聚餐，8个人左右');
      const execution = await executeClosedLoopPlan(planning.plan, planning.constraints);
      expect(execution.shareText).toMatch(/大家|安排/);
    });
  });
});
