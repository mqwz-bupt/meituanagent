import type {
  Activity,
  Plan,
  PlanItem,
  Restaurant,
  ToolEnvelope,
  ToolTraceEvent,
} from '../types.js';
import {
  checkAvailability,
  searchActivities,
  searchRestaurants,
  getActivityById,
  getRestaurantById,
} from '../mock/data.js';
import { calculateRoute, getDistrictDistance, resolveDistrict, AREA_TO_DISTRICT, DISTRICT_DIST } from '../district.js';
import { getCouponsForScenario, getUpsellOptions } from '../mock/coupons.js';

export interface UserConstraints {
  scenario: 'family' | 'friends' | 'couple' | 'solo' | 'team';
  partySize: number;
  childAge?: number;
  dietFriendly: boolean;
  maxDistanceKm: number;
  targetDurationHours: [number, number];
  preferredStartTime: string;
  avoidCuisines: string[];
  avoidActivityTags: string[];
  shareAudience: 'wife' | 'friends' | 'partner' | 'self';
  failureMode?: 'restaurant_unavailable' | 'activity_sold_out';
  preferredDistrict?: string;
}

export interface BookingExecutionResult {
  item: string;
  kind: 'activity' | 'restaurant' | 'delivery' | 'share';
  status: 'success' | 'failed' | 'recovered' | 'skipped';
  bookingId?: string;
  reason?: string;
  replacedBy?: string;
  venueId?: string;
  district?: string;
  cost?: number;
}

export interface ConfirmationCard {
  overview: {
    title: string;
    departureTime: string;
    totalDuration: string;
    routeSummary: string;
  };
  activity?: {
    name: string;
    time: string;
    address: string;
    status: string;
    confirmationId: string;
    entryHint?: string;
    cancelPolicy?: string;
    ticketCount?: number;
  };
  restaurant?: {
    name: string;
    time: string;
    queueStatus: string;
    confirmationId: string;
    tableType?: string;
    queueNumber?: string;
    cancelPolicy?: string;
    contactHint?: string;
  };
  upsell: {
    item: string;
    status: string;
    orderId?: string;
  };
  shareText: string;
}

export interface RouteArtifacts {
  activityDistrict: string;
  restaurantDistrict: string;
  sameDistrict: boolean;
  districtDistance: number;
  distanceKm: number;
  durationMinutes: number;
  transport: string;
  reason: string;
}

export interface ConstraintExplanation {
  userIntent: string;
  detectedScenario: string;
  rules: Array<{
    label: string;
    filter: string;
    appliedTo: string;
    result: string;
  }>;
  scoringSummary: {
    activityScore: number;
    restaurantScore: number;
    totalCandidates: { activities: number; restaurants: number };
  };
}

export interface RecoveryStory {
  hasRecovery: boolean;
  steps: Array<{
    phase: string;
    action: string;
    status: string;
    detail?: string;
  }>;
  recoveryType?: string;
  originalVenue?: string;
  replacementVenue?: string;
}

export interface BusinessConversion {
  totalSpend: number;
  platformGMV: number;
  conversionFunnel: {
    searched: number;
    checked: number;
    booked: number;
    upsell: number;
  };
  merchantBreakdown: Array<{
    name: string;
    category: string;
    amount: number;
  }>;
  upsellItem: string;
  upsellOrderId: string;
  // === 业务真实化新增 ===
  coupons: Array<{ name: string; price: number; saving: number; type: string }>;
  estimatedSaving: number;
  completedActions: string[];
  optionalUpsells: Array<{ name: string; price: number; type: string }>;
}

export interface PlanningResult {
  constraints: UserConstraints;
  selectedActivity: Activity;
  selectedRestaurant: Restaurant;
  plan: Plan;
  trace: ToolTraceEvent[];
  routeArtifacts: RouteArtifacts;
  constraintExplanation: ConstraintExplanation;
}

interface ExecutionResult {
  plan: Plan;
  results: BookingExecutionResult[];
  trace: ToolTraceEvent[];
  shareText: string;
  confirmationCard: ConfirmationCard;
  stateTransitions: string[];
  recoveryStory: RecoveryStory;
  businessConversion: BusinessConversion;
  routeArtifacts?: RouteArtifacts;
}

let traceSeq = 0;

export function trace(
  tool: string,
  status: ToolTraceEvent['status'],
  summary: string,
  input: Record<string, unknown> = {},
  output: Record<string, unknown> = {},
  recoveryHint?: string,
): ToolTraceEvent {
  traceSeq += 1;
  return {
    id: `tr_${traceSeq}`,
    tool,
    status,
    summary,
    input,
    output,
    artifacts: output,
    recoveryHint,
    timestamp: new Date().toISOString(),
  };
}

function envelope<T extends Record<string, unknown>>(
  status: ToolEnvelope<T>['status'],
  summary: string,
  artifacts: T,
  recoveryHint?: string,
): ToolEnvelope<T> {
  return { status, summary, artifacts, recoveryHint };
}

export function extractConstraints(input: string): UserConstraints {
  const childAgeMatch = input.match(/孩子\s*(\d+)\s*岁|(\d+)\s*岁.*孩子/);
  const childAge = childAgeMatch ? Number(childAgeMatch[1] ?? childAgeMatch[2]) : undefined;
  const family = /老婆|孩子|亲子|家庭|一家|带娃|宝宝|家人/.test(input);
  const couple = /情侣|约会|女朋友|男朋友|对象|二人世界|两个人.*浪漫|纪念日|恋爱/.test(input);
  const friends = !couple && !family && /朋友|2\s*男\s*2\s*女|4\s*个|四个|群聊/.test(input);
  const solo = /自己|一个人|独自|单人|随便逛|自己转|独行|一个人.*出去/.test(input) && !family && !couple;
  const team = /团建|团队|公司|部门|同事|聚会.*人|十.*人|几个.*人/.test(input) && !family && !couple;

  let scenario: UserConstraints['scenario'];
  let partySize: number;
  let shareAudience: UserConstraints['shareAudience'];

  if (family) { scenario = 'family'; partySize = 3; shareAudience = 'wife'; }
  else if (friends) { scenario = 'friends'; partySize = 4; shareAudience = 'friends'; }
  else if (couple) { scenario = 'couple'; partySize = 2; shareAudience = 'partner'; }
  else if (solo) { scenario = 'solo'; partySize = 1; shareAudience = 'self'; }
  else if (team) { scenario = 'team'; partySize = 8; shareAudience = 'friends'; }
  else { scenario = 'friends'; partySize = 4; shareAudience = 'friends'; }

  // Parse location preference from input
  let preferredDistrict: string | undefined;
  const areaEntries = Object.entries(AREA_TO_DISTRICT).sort((a, b) => b[0].length - a[0].length);
  for (const [area, district] of areaEntries) {
    if (input.includes(area)) { preferredDistrict = district; break; }
  }
  if (!preferredDistrict) {
    for (const d of Object.keys(DISTRICT_DIST)) {
      if (input.includes(d) || input.includes(d.replace('区', ''))) { preferredDistrict = d; break; }
    }
  }

  return {
    scenario,
    partySize,
    childAge,
    dietFriendly: /减肥|低卡|轻食|健康|吃得轻/.test(input),
    maxDistanceKm: /别.*远|不.*远|附近|近/.test(input) ? 10 : 15,
    targetDurationHours: [4, 6],
    preferredStartTime: '14:00',
    avoidCuisines: /减肥|低卡|轻食|健康|吃得轻/.test(input)
      ? ['火锅', '烧烤', '炸鸡', '自助', '甜品']
      : [],
    avoidActivityTags: childAge && childAge <= 5
      ? ['密室', '酒吧', '剧本杀', '暴走', '夜店']
      : [],
    shareAudience,
    failureMode: /餐厅.*无位|无位.*餐厅|订不到餐厅|餐厅满/.test(input)
      ? 'restaurant_unavailable'
      : /活动.*满员|满员.*活动|门票.*售罄|活动售罄/.test(input)
        ? 'activity_sold_out'
        : undefined,
    preferredDistrict,
  };
}

export function isActivityChildSafe(activity: Activity, constraints: UserConstraints): boolean {
  if (constraints.childAge === undefined) return true;
  const tags = `${activity.type}${activity.tags.join('')}`;
  if (constraints.avoidActivityTags.some(tag => tags.includes(tag))) return false;
  if (activity.duration > 180) return false;
  if (activity.timeSlots.some(slot => Number(slot.slice(0, 2)) >= 18)) return false;
  const age = constraints.childAge;
  if (activity.ageSuitability.type === 'all') return true;
  if (activity.ageSuitability.type === 'min') return activity.ageSuitability.minAge <= age;
  return activity.ageSuitability.minAge <= age && activity.ageSuitability.maxAge >= age;
}

export function isRestaurantDietSafe(restaurant: Restaurant, constraints: UserConstraints): boolean {
  const text = `${restaurant.cuisine}${restaurant.tags.join('')}`;
  if (constraints.avoidCuisines.some(term => text.includes(term))) return false;
  if (constraints.dietFriendly && !restaurant.dietFriendly) return false;
  return true;
}

// ============================================================
// Scoring — deterministic, no randomness
// ============================================================

export function scoreActivity(a: Activity, constraints: UserConstraints): number {
  let score = 0;
  const tags = `${a.type} ${a.tags.join(' ')}`;

  if (constraints.scenario === 'family') {
    if (/亲子|儿童|乐园|海洋馆|动物园|公园/.test(tags)) score += 30;
    if (a.ageSuitability.type === 'all') score += 10;
    if (a.ageSuitability.type === 'range' && a.ageSuitability.minAge <= (constraints.childAge ?? 5)) score += 15;
    if (/密室|酒吧|剧本杀|夜店|KTV/.test(tags)) score -= 40;
    if (a.duration <= 120) score += 5;
  } else if (constraints.scenario === 'couple') {
    if (/拍照|文艺|展览|浪漫|胡同|Citywalk|网红/.test(tags)) score += 25;
    if (/密室|剧本杀|极限|刺激/.test(tags)) score -= 5;
    if (/亲子|儿童|淘气堡/.test(tags)) score -= 20;
    if (a.groupMin <= 2 && a.groupMax >= 2) score += 10;
    if (a.price >= 100 && a.price <= 300) score += 5;
  } else if (constraints.scenario === 'solo') {
    if (/展览|文艺|书店|博物馆|Citywalk|胡同|拍照/.test(tags)) score += 25;
    if (a.groupMin <= 1) score += 10;
    if (a.duration <= 150) score += 5;
    if (a.price <= 100) score += 10;
  } else if (constraints.scenario === 'team') {
    if (/团建|拓展|密室|剧本杀|游乐园|聚餐|互动/.test(tags)) score += 25;
    if (a.groupMax >= constraints.partySize) score += 15;
    if (a.duration <= 180) score += 5;
  } else {
    if (/Citywalk|展览|文艺|小吃|拍照|胡同/.test(tags)) score += 25;
    if (/刺激|极限/.test(tags)) score -= 10;
    if (a.groupMin <= constraints.partySize && a.groupMax >= constraints.partySize) score += 10;
  }

  if (a.distance <= constraints.maxDistanceKm) score += 10;

  // Strong bonus for matching user's location preference
  if (constraints.preferredDistrict && a.district === constraints.preferredDistrict) score += 60;

  const avail = checkAvailability(a.id, 'today', constraints.preferredStartTime, constraints.partySize);
  if (avail.available) score += 20;

  if (a.price <= 150) score += 5;

  return score;
}

export function scoreRestaurant(r: Restaurant, activityDistrict: string, constraints: UserConstraints): number {
  let score = 0;

  const dist = getDistrictDistance(r.district, activityDistrict);
  if (dist <= 4) score += 50;
  else if (dist <= 10) score += 20;
  else score -= 10;

  if (constraints.scenario === 'family') {
    if (r.kidFriendly) score += 20;
    if (r.dietFriendly) score += 15;
    const text = `${r.cuisine}${r.tags.join('')}`;
    if (/火锅|烧烤|炸鸡|自助|甜品/.test(text)) score -= 30;
  } else if (constraints.scenario === 'couple') {
    if (/约会|浪漫|精致|网红|蓝港|三里屯/.test(r.tags.join(''))) score += 20;
    if (/一人食|快餐|性价比/.test(r.tags.join(''))) score -= 10;
    if (r.avgPrice >= 100 && r.avgPrice <= 300) score += 5;
  } else if (constraints.scenario === 'solo') {
    if (/一人食|咖啡|轻食|书店|性价比|精品/.test(r.tags.join(''))) score += 20;
    if (r.avgPrice <= 80) score += 10;
    if (r.groupMin <= 1) score += 5;
  } else if (constraints.scenario === 'team') {
    if (/大桌|包间|团建|聚餐|朋友聚会/.test(r.tags.join(''))) score += 20;
    if (r.groupMax >= constraints.partySize) score += 15;
    if (r.avgPrice <= 150) score += 5;
  } else {
    if (/朋友|聚餐|小吃|打卡/.test(r.tags.join(''))) score += 15;
    if (r.groupMax >= constraints.partySize) score += 10;
  }

  score += r.rating * 5;

  // Strong bonus for matching user's location preference
  if (constraints.preferredDistrict && r.district === constraints.preferredDistrict) score += 60;

  const timeSlot = constraints.scenario === 'family' ? '17:15' : '17:00';
  const avail = checkAvailability(r.id, 'today', timeSlot, constraints.partySize);
  if (avail.available) score += 15;

  return score;
}

// ============================================================
// Venue selection — scoring-based, no hardcoded IDs
// ============================================================

export function selectActivity(constraints: UserConstraints, traceLog: ToolTraceEvent[]): Activity {
  const filter = constraints.scenario === 'family'
    ? { tags: ['亲子'], minAge: constraints.childAge ?? 5, groupSize: constraints.partySize, maxDistance: constraints.maxDistanceKm }
    : constraints.scenario === 'couple'
      ? { groupSize: constraints.partySize, maxDistance: constraints.maxDistanceKm, tags: ['拍照', '网红'] }
      : constraints.scenario === 'solo'
        ? { groupSize: constraints.partySize, maxDistance: constraints.maxDistanceKm, tags: ['展览', '文艺'] }
        : constraints.scenario === 'team'
          ? { groupSize: constraints.partySize, maxDistance: constraints.maxDistanceKm, tags: ['互动', '团建'] }
          : { groupSize: constraints.partySize, maxDistance: constraints.maxDistanceKm, tags: ['Citywalk'] };
  const primary = searchActivities(filter).filter(a => isActivityChildSafe(a, constraints));
  const fallback = searchActivities({ groupSize: constraints.partySize, maxDistance: constraints.maxDistanceKm })
    .filter(a => isActivityChildSafe(a, constraints));
  const candidates = primary.length > 0 ? primary : fallback;

  const scored = candidates.map(a => ({ venue: a, score: scoreActivity(a, constraints) }));
  scored.sort((a, b) => b.score - a.score);
  const selected = scored[0]?.venue ?? candidates[0];

  traceLog.push(trace(
    'search_activities',
    'success',
    `找到 ${candidates.length} 个符合约束的活动，评分最高: ${selected.name} (${scored[0]?.score ?? 0}分)`,
    { ...filter, candidateCount: candidates.length },
    { count: candidates.length, selectedId: selected.id, selectedName: selected.name, district: selected.district, topScores: scored.slice(0, 3).map(s => ({ id: s.venue.id, score: s.score })) },
  ));
  return selected;
}

export function selectRestaurant(constraints: UserConstraints, activityDistrict: string, traceLog: ToolTraceEvent[]): Restaurant {
  const baseFilter = constraints.scenario === 'family'
    ? { kidFriendly: true, dietFriendly: constraints.dietFriendly, groupSize: constraints.partySize, maxDistance: constraints.maxDistanceKm }
    : constraints.scenario === 'couple'
      ? { groupSize: constraints.partySize, maxDistance: constraints.maxDistanceKm, tags: ['约会'] }
      : constraints.scenario === 'solo'
        ? { groupSize: constraints.partySize, maxDistance: constraints.maxDistanceKm, tags: ['一人食', '咖啡'] }
        : constraints.scenario === 'team'
          ? { groupSize: constraints.partySize, maxDistance: constraints.maxDistanceKm, tags: ['大桌', '朋友聚会'] }
          : { groupSize: constraints.partySize, maxDistance: constraints.maxDistanceKm, tags: ['朋友'] };

  const candidates = searchRestaurants(baseFilter).filter(r => isRestaurantDietSafe(r, constraints));

  const scored = candidates.map(r => ({ venue: r, score: scoreRestaurant(r, activityDistrict, constraints) }));
  scored.sort((a, b) => b.score - a.score);
  const selected = scored[0]?.venue ?? candidates[0];

  traceLog.push(trace(
    'search_restaurants',
    'success',
    `找到 ${candidates.length} 个符合约束的餐厅，评分最高: ${selected.name} (${scored[0]?.score ?? 0}分，活动区=${activityDistrict}，餐厅区=${selected.district})`,
    { ...baseFilter, candidateCount: candidates.length, activityDistrict },
    { count: candidates.length, selectedId: selected.id, selectedName: selected.name, district: selected.district, topScores: scored.slice(0, 3).map(s => ({ id: s.venue.id, score: s.score, district: s.venue.district })) },
  ));
  return selected;
}

// ============================================================
// Route calculation — structured artifacts
// ============================================================

export function buildRouteArtifacts(activity: Activity, restaurant: Restaurant): RouteArtifacts {
  const route = calculateRoute(activity.district, restaurant.district);
  const sameDistrict = activity.district === restaurant.district;
  let reason: string;
  if (sameDistrict) {
    reason = `活动和餐厅位于${activity.district}，移动时间较短，适合下午出行`;
  } else if (route.distanceKm <= 10) {
    reason = `活动(${activity.district})到餐厅(${restaurant.district})约${route.distanceKm}km，${route.transport}${route.durationMinutes}分钟可达`;
  } else {
    reason = `活动(${activity.district})到餐厅(${restaurant.district})约${route.distanceKm}km，需${route.transport}${route.durationMinutes}分钟`;
  }
  return {
    activityDistrict: activity.district,
    restaurantDistrict: restaurant.district,
    sameDistrict,
    districtDistance: route.distanceKm,
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    transport: route.transport,
    reason,
  };
}

// ============================================================
// Plan building
// ============================================================

export function buildPlan(
  constraints: UserConstraints,
  activity: Activity,
  restaurant: Restaurant,
  routeArtifacts: RouteArtifacts,
  traceLog: ToolTraceEvent[],
): Plan {
  const activitySlot = constraints.preferredStartTime;
  const restaurantSlot = constraints.scenario === 'family' ? '17:15' : '17:00';

  for (const item of [
    { id: activity.id, venue: activity.name, timeSlot: activitySlot },
    { id: restaurant.id, venue: restaurant.name, timeSlot: restaurantSlot },
  ]) {
    const availability = checkAvailability(item.id, 'today', item.timeSlot, constraints.partySize);
    traceLog.push(trace(
      'check_availability',
      availability.available ? 'success' : 'failed',
      availability.available
        ? `${item.venue} ${item.timeSlot} 可订`
        : `${item.venue} ${item.timeSlot} 无位/满员`,
      { venueId: item.id, date: 'today', timeSlot: item.timeSlot, partySize: constraints.partySize },
      { ...availability, venue: item.venue },
      availability.available ? undefined : 'PLAN_WITH_RECOVERY_ON_CONFIRM',
    ));
  }

  traceLog.push(trace(
    'get_route',
    'success',
    `路线已生成：家 -> ${activity.name}(${activity.district}) -> ${restaurant.name}(${restaurant.district})，${routeArtifacts.reason}`,
    { from: 'home', stops: [activity.name, restaurant.name], activityDistrict: activity.district, restaurantDistrict: restaurant.district },
    {
      totalDistance: `${routeArtifacts.distanceKm}km`,
      duration: `${routeArtifacts.durationMinutes}分钟`,
      ...routeArtifacts,
    },
  ));

  const { scenario } = constraints;
  const family = scenario === 'family';
  const couple = scenario === 'couple';
  const solo = scenario === 'solo';
  const team = scenario === 'team';

  // Scenario-specific labels
  const activityLabel = family ? '亲子低体力活动'
    : couple ? '浪漫约会活动'
    : solo ? '个人探索活动'
    : team ? '团队互动活动'
    : '轻松互动活动';
  const walkLabel = family ? '餐前散步和休息'
    : couple ? '浪漫漫步和拍照'
    : solo ? '自由漫步和探索'
    : team ? '团队休整和交流'
    : 'Citywalk 和拍照';
  const walkVenue = family ? `${activity.district}附近散步`
    : couple ? `${activity.district}附近漫步`
    : solo ? `${activity.district}附近闲逛`
    : team ? `${activity.district}附近休整`
    : `${activity.district}附近 Citywalk`;
  const dinnerLabel = family ? '低负担晚餐'
    : couple ? '约会晚餐'
    : solo ? '一人食/咖啡'
    : team ? '团队聚餐'
    : '朋友聚餐';
  const activityReason = family
    ? `适合 ${constraints.childAge ?? 5} 岁孩子，低体力消耗。`
    : couple ? '适合二人约会，氛围好、互动性强。'
    : solo ? '适合独自探索，自由节奏。'
    : team ? `适合 ${constraints.partySize} 人团队，互动协作。`
    : '适合 4 人朋友局，互动强但不累。';
  const dinnerReason = family
    ? '符合减脂约束，避开火锅、烧烤、炸鸡、自助等高热量选项。'
    : couple ? '氛围好，适合约会。'
    : solo ? '一人食/咖啡厅，自由安静。'
    : team ? `适合 ${constraints.partySize} 人聚餐，大桌/包间。`
    : '适合 4 人聚餐，预算可控。';

  const items: PlanItem[] = [
    {
      time: family ? '14:00-16:00' : '14:00-15:30',
      activity: activityLabel,
      venue: activity.name,
      venueId: activity.id,
      cost: `约 ${activity.price * constraints.partySize} 元`,
      reason: activityReason,
      bookingRequired: true,
    },
    {
      time: family ? '16:00-17:00' : '15:45-16:45',
      activity: walkLabel,
      venue: walkVenue,
      venueId: 'walk',
      cost: '免费',
      reason: `衔接活动和晚饭，${routeArtifacts.sameDistrict ? '同区内步行即可' : `需移动至${restaurant.district}`}。`,
      bookingRequired: false,
    },
    {
      time: family ? '17:15-18:30' : '17:00-19:00',
      activity: dinnerLabel,
      venue: restaurant.name,
      venueId: restaurant.id,
      cost: `约 ${restaurant.avgPrice * constraints.partySize} 元`,
      reason: dinnerReason,
      bookingRequired: true,
    },
  ];

  const districtNote = routeArtifacts.sameDistrict
    ? `活动与餐厅同在${routeArtifacts.activityDistrict}，无需远行`
    : `活动(${routeArtifacts.activityDistrict})→餐厅(${routeArtifacts.restaurantDistrict})，移动约${routeArtifacts.durationMinutes}分钟`;

  const scenarioTitle = family ? '家庭 4.5 小时亲子减脂友好方案'
    : couple ? '情侣 5 小时约会方案'
    : solo ? '单人 5 小时自由探索方案'
    : team ? `团建 ${constraints.partySize} 人 5 小时方案`
    : '朋友 5 小时 Citywalk + 晚饭方案';
  const scenarioNotes = family
    ? ['孩子 5 岁可参与', '晚餐符合减脂约束', districtNote]
    : couple
      ? ['适合二人约会', '氛围优先', districtNote]
      : solo
        ? ['自由节奏', '一人食/咖啡', districtNote]
        : team
          ? [`${constraints.partySize} 人团建`, '大桌/包间', districtNote]
          : ['适合 4 人朋友局', '先活动后吃饭', districtNote];

  return {
    title: scenarioTitle,
    items,
    totalCost: `约 ${activity.price * constraints.partySize + restaurant.avgPrice * constraints.partySize} 元`,
    totalDuration: family ? '14:00-18:30，约 4.5 小时' : '14:00-19:00，约 5 小时',
    notes: scenarioNotes,
  };
}

export async function planClosedLoop(input: string): Promise<PlanningResult> {
  const traceLog: ToolTraceEvent[] = [];
  const constraints = extractConstraints(input);
  const selectedActivity = selectActivity(constraints, traceLog);
  const selectedRestaurant = selectRestaurant(constraints, selectedActivity.district, traceLog);
  const routeArtifacts = buildRouteArtifacts(selectedActivity, selectedRestaurant);
  const plan = buildPlan(constraints, selectedActivity, selectedRestaurant, routeArtifacts, traceLog);
  const constraintExplanation = buildConstraintExplanation(input, constraints, selectedActivity, selectedRestaurant, traceLog);
  return { constraints, selectedActivity, selectedRestaurant, plan, trace: traceLog, routeArtifacts, constraintExplanation };
}

// ============================================================
// Booking execution
// ============================================================

function makeBookingId(prefix: string, venueId: string): string {
  const ts = Date.now().toString(36).slice(-5).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}-${venueId.toUpperCase()}-${ts}${rand}`;
}

function bookVenue(
  item: PlanItem,
  constraints: UserConstraints,
): ToolEnvelope<{ bookingId?: string; queueStatus?: string; reason?: string }> {
  const timeSlot = item.time.split('-')[0];
  const availability = checkAvailability(item.venueId, 'today', timeSlot, constraints.partySize);
  if (!availability.available) {
    return envelope(
      'failed',
      `${item.venue} ${timeSlot} 无位/满员`,
      { queueStatus: availability.estimatedWait, reason: 'NO_CAPACITY' },
      item.venueId.startsWith('r') ? 'SEARCH_ALTERNATIVE_RESTAURANT' : 'SEARCH_ALTERNATIVE_ACTIVITY',
    );
  }

  return envelope('success', `${item.venue} 已预订`, {
    bookingId: makeBookingId('BK', item.venueId),
    queueStatus: availability.estimatedWait,
  });
}

// ============================================================
// Failure recovery — district-aware
// ============================================================

export function sortCandidatesByDistrict<T extends { id: string; district: string }>(
  candidates: T[],
  targetDistrict: string,
): T[] {
  return [...candidates].sort((a, b) => {
    const distA = getDistrictDistance(a.district, targetDistrict);
    const distB = getDistrictDistance(b.district, targetDistrict);
    return distA - distB;
  });
}

function getRecoveryType(candidateDistrict: string, targetDistrict: string): string {
  const dist = getDistrictDistance(candidateDistrict, targetDistrict);
  if (candidateDistrict === targetDistrict) return 'same-district recovery';
  if (dist <= 10) return 'nearby-district recovery';
  return 'cross-district fallback';
}

function findAlternativeRestaurant(
  failedItem: PlanItem,
  constraints: UserConstraints,
  activityDistrict: string,
  traceLog: ToolTraceEvent[],
): Restaurant | null {
  const candidates = searchRestaurants({
    kidFriendly: constraints.scenario === 'family' ? true : undefined,
    dietFriendly: constraints.dietFriendly || undefined,
    groupSize: constraints.partySize,
    maxDistance: constraints.maxDistanceKm,
  }).filter(r => r.id !== failedItem.venueId && isRestaurantDietSafe(r, constraints));

  const sorted = sortCandidatesByDistrict(candidates, activityDistrict);

  traceLog.push(trace(
    'search_restaurants',
    'recovered',
    `原餐厅失败，搜索替代餐厅（优先${activityDistrict}附近），候选 ${candidates.length} 个`,
    { failedVenueId: failedItem.venueId, groupSize: constraints.partySize, targetDistrict: activityDistrict },
    { count: candidates.length, candidateIds: sorted.slice(0, 5).map(r => ({ id: r.id, district: r.district })) },
    'CHECK_ALTERNATIVE_RESTAURANT',
  ));

  for (const candidate of sorted) {
    const recoveryType = getRecoveryType(candidate.district, activityDistrict);
    const availability = checkAvailability(candidate.id, 'today', failedItem.time.split('-')[0], constraints.partySize);
    traceLog.push(trace(
      'check_availability',
      availability.available ? 'recovered' : 'failed',
      availability.available
        ? `${candidate.name}(${candidate.district}) 可作为替代餐厅 [${recoveryType}]`
        : `${candidate.name}(${candidate.district}) 替代餐厅也无位`,
      { venueId: candidate.id, timeSlot: failedItem.time.split('-')[0], partySize: constraints.partySize, recoveryType },
      { ...availability, venue: candidate.name, district: candidate.district, recoveryType },
      availability.available ? `BOOK_ALTERNATIVE_RESTAURANT (${recoveryType})` : 'TRY_NEXT_RESTAURANT',
    ));
    if (availability.available) return candidate;
  }
  return null;
}

function findAlternativeActivity(
  failedItem: PlanItem,
  constraints: UserConstraints,
  restaurantDistrict: string,
  traceLog: ToolTraceEvent[],
): Activity | null {
  const candidates = searchActivities({
    groupSize: constraints.partySize,
    maxDistance: constraints.maxDistanceKm,
    tags: constraints.scenario === 'family' ? ['亲子'] : ['Citywalk'],
    minAge: constraints.childAge,
  }).filter(a => a.id !== failedItem.venueId && isActivityChildSafe(a, constraints));

  const sorted = sortCandidatesByDistrict(candidates, restaurantDistrict);

  traceLog.push(trace(
    'search_activities',
    'recovered',
    `原活动满员，搜索替代活动（优先${restaurantDistrict}附近），候选 ${candidates.length} 个`,
    { failedVenueId: failedItem.venueId, groupSize: constraints.partySize, targetDistrict: restaurantDistrict },
    { count: candidates.length, candidateIds: sorted.slice(0, 5).map(a => ({ id: a.id, district: a.district })) },
    'CHECK_ALTERNATIVE_ACTIVITY',
  ));

  for (const candidate of sorted) {
    const recoveryType = getRecoveryType(candidate.district, restaurantDistrict);
    const availability = checkAvailability(candidate.id, 'today', failedItem.time.split('-')[0], constraints.partySize);
    traceLog.push(trace(
      'check_availability',
      availability.available ? 'recovered' : 'failed',
      availability.available
        ? `${candidate.name}(${candidate.district}) 可作为替代活动 [${recoveryType}]`
        : `${candidate.name}(${candidate.district}) 替代活动也满员`,
      { venueId: candidate.id, timeSlot: failedItem.time.split('-')[0], partySize: constraints.partySize, recoveryType },
      { ...availability, venue: candidate.name, district: candidate.district, recoveryType },
      availability.available ? `BOOK_ALTERNATIVE_ACTIVITY (${recoveryType})` : 'TRY_NEXT_ACTIVITY',
    ));
    if (availability.available) return candidate;
  }
  return null;
}

export function recoverBookingFailure(
  failedItem: PlanItem,
  constraints: UserConstraints,
  activityDistrict: string,
  restaurantDistrict: string,
  traceLog: ToolTraceEvent[],
): BookingExecutionResult {
  if (failedItem.venueId.startsWith('r')) {
    const replacement = findAlternativeRestaurant(failedItem, constraints, activityDistrict, traceLog);
    if (!replacement) {
      return { item: failedItem.venue, kind: 'restaurant', status: 'failed', reason: 'NO_RECOVERY_OPTIONS' };
    }
    const bookingId = makeBookingId('RCV', replacement.id);
    const recoveryType = getRecoveryType(replacement.district, activityDistrict);
    traceLog.push(trace(
      'book_restaurant',
      'recovered',
      `已改订替代餐厅 ${replacement.name}(${replacement.district}) [${recoveryType}]`,
      { restaurantId: replacement.id, originalRestaurantId: failedItem.venueId, recoveryType },
      { bookingId, restaurant: replacement.name, district: replacement.district, recoveryType },
    ));
    return {
      item: replacement.name,
      kind: 'restaurant',
      status: 'recovered',
      bookingId,
      replacedBy: replacement.name,
      venueId: replacement.id,
      district: replacement.district,
      cost: replacement.avgPrice * constraints.partySize,
    };
  }

  const replacement = findAlternativeActivity(failedItem, constraints, restaurantDistrict, traceLog);
  if (!replacement) {
    return { item: failedItem.venue, kind: 'activity', status: 'failed', reason: 'NO_RECOVERY_OPTIONS' };
  }
  const bookingId = makeBookingId('RCV', replacement.id);
  const recoveryType = getRecoveryType(replacement.district, restaurantDistrict);
  traceLog.push(trace(
    'book_activity',
    'recovered',
    `已改订替代活动 ${replacement.name}(${replacement.district}) [${recoveryType}]`,
    { activityId: replacement.id, originalActivityId: failedItem.venueId, recoveryType },
    { bookingId, activity: replacement.name, district: replacement.district, recoveryType },
  ));
  return {
    item: replacement.name,
    kind: 'activity',
    status: 'recovered',
    bookingId,
    replacedBy: replacement.name,
    venueId: replacement.id,
    district: replacement.district,
    cost: replacement.price * constraints.partySize,
  };
}

// ============================================================
// Share text & confirmation card
// ============================================================

export function generateShareText(plan: Plan, constraints: UserConstraints, results: BookingExecutionResult[]): string {
  const confirmed = results
    .filter(r => r.status === 'success' || r.status === 'recovered')
    .map(r => `${r.item}(${r.bookingId})`)
    .join('，');
  const schedule = plan.items.map(i => `${i.time} ${i.venue}`).join('；');

  if (constraints.shareAudience === 'wife') {
    return `老婆，下午安排好了：${schedule}。晚饭选了低负担餐厅，孩子能玩，路程也不远。已确认：${confirmed}。`;
  }
  if (constraints.shareAudience === 'partner') {
    return `下午的约会安排好了：${schedule}。氛围好，不会累，已确认：${confirmed}。`;
  }
  if (constraints.shareAudience === 'self') {
    return `下午的安排：${schedule}。自由节奏，已确认：${confirmed}。`;
  }
  return `大家下午安排好了：${schedule}。${constraints.partySize} 人局刚好，活动和晚饭都已确认：${confirmed}。`;
}

function buildConfirmationCard(
  plan: Plan,
  constraints: UserConstraints,
  results: BookingExecutionResult[],
  shareText: string,
  routeArtifacts: RouteArtifacts,
): ConfirmationCard {
  const activityResult = results.find(r => r.kind === 'activity' && r.status !== 'skipped');
  const restaurantResult = results.find(r => r.kind === 'restaurant' && r.status !== 'skipped');
  const activityItem = plan.items.find(i => i.venueId.startsWith('a') && i.bookingRequired);
  const restaurantItem = plan.items.find(i => i.venueId.startsWith('r'));
  const delivery = results.find(r => r.kind === 'delivery');

  return {
    overview: {
      title: plan.title,
      departureTime: plan.items[0]?.time.split('-')[0] ?? constraints.preferredStartTime,
      totalDuration: plan.totalDuration,
      routeSummary: routeArtifacts.reason,
    },
    activity: activityItem && activityResult?.bookingId ? {
      name: activityResult.item,
      time: activityItem.time,
      address: activityItem.venue,
      status: activityResult.status,
      confirmationId: activityResult.bookingId,
      entryHint: '凭确认码入场',
      cancelPolicy: '开始前2小时可取消',
      ticketCount: constraints.partySize,
    } : undefined,
    restaurant: restaurantItem && restaurantResult?.bookingId ? {
      name: restaurantResult.item,
      time: restaurantItem.time,
      queueStatus: restaurantResult.status === 'recovered' ? '原餐厅无位，已改订替代餐厅' : '已订座，无需排队',
      confirmationId: restaurantResult.bookingId,
      tableType: constraints.partySize <= 2 ? '2人桌' : constraints.partySize <= 4 ? '4人桌' : '大桌',
      queueNumber: restaurantResult.status === 'recovered' ? undefined : 'A' + Math.floor(Math.random() * 50 + 1),
      cancelPolicy: '到店前30分钟可取消',
      contactHint: '到店报手机号尾号',
    } : undefined,
    upsell: {
      item: constraints.scenario === 'family' ? '低糖饮品/打车券'
        : constraints.scenario === 'couple' ? '鲜花/蛋糕配送'
        : constraints.scenario === 'solo' ? '咖啡/书店代金券'
        : constraints.scenario === 'team' ? '团购套餐/饮品'
        : '团购券/饮品',
      status: delivery?.status ?? 'available',
      orderId: delivery?.bookingId,
    },
    shareText,
  };
}

// ============================================================
// Three display cards — constraint explanation, recovery story, business conversion
// ============================================================

export function buildConstraintExplanation(
  input: string,
  constraints: UserConstraints,
  selectedActivity: Activity,
  selectedRestaurant: Restaurant,
  traceLog: ToolTraceEvent[],
): ConstraintExplanation {
  const rules: ConstraintExplanation['rules'] = [];

  if (constraints.childAge !== undefined) {
    rules.push({
      label: `${constraints.childAge}岁儿童安全`,
      filter: `排除不适合${constraints.childAge}岁以下的活动`,
      appliedTo: '活动筛选',
      result: `选中「${selectedActivity.name}」，${constraints.childAge}岁可安全参与`,
    });
  }

  if (constraints.dietFriendly) {
    rules.push({
      label: '减脂饮食约束',
      filter: `排除${constraints.avoidCuisines.join('、')}等高热量选项`,
      appliedTo: '餐厅筛选',
      result: `选中「${selectedRestaurant.name}」，提供健康/低卡菜单`,
    });
  }

  rules.push({
    label: `距离≤${constraints.maxDistanceKm}km`,
    filter: '仅搜索近距离场所',
    appliedTo: '活动+餐厅双重筛选',
    result: `活动: ${selectedActivity.district}(${selectedActivity.distance}km) / 餐厅: ${selectedRestaurant.district}(${selectedRestaurant.distance}km)`,
  });

  rules.push({
    label: `${constraints.partySize}人同行`,
    filter: '容量匹配',
    appliedTo: '可用性检查',
    result: `活动${selectedActivity.groupMin}-${selectedActivity.groupMax}人 / 餐厅上限${selectedRestaurant.groupMax}人`,
  });

  const actTrace = traceLog.find(t => t.tool === 'search_activities');
  const resTrace = traceLog.find(t => t.tool === 'search_restaurants');
  const topActScores = (actTrace?.artifacts?.topScores ?? []) as Array<{ id: string; score: number }>;
  const topResScores = (resTrace?.artifacts?.topScores ?? []) as Array<{ id: string; score: number }>;

  return {
    userIntent: input,
    detectedScenario: constraints.scenario === 'family' ? '家庭亲子'
      : constraints.scenario === 'couple' ? '情侣约会'
      : constraints.scenario === 'solo' ? '单人出行'
      : constraints.scenario === 'team' ? '团队团建'
      : '朋友聚会',
    rules,
    scoringSummary: {
      activityScore: topActScores[0]?.score ?? 0,
      restaurantScore: topResScores[0]?.score ?? 0,
      totalCandidates: {
        activities: (actTrace?.artifacts?.count as number) ?? 0,
        restaurants: (resTrace?.artifacts?.count as number) ?? 0,
      },
    },
  };
}

function buildRecoveryStory(
  executionTrace: ToolTraceEvent[],
  results: BookingExecutionResult[],
  stateTransitions: string[],
): RecoveryStory {
  const hasRecovery = stateTransitions.includes('REPLANNING');
  const steps: RecoveryStory['steps'] = [];

  for (const t of executionTrace) {
    if (!['book_restaurant', 'book_activity', 'search_restaurants', 'search_activities', 'check_availability', 'order_delivery'].includes(t.tool)) continue;
    steps.push({
      phase: t.tool.startsWith('book') ? 'booking'
        : t.tool.startsWith('search') ? 'search'
        : t.tool === 'check_availability' ? 'check' : 'upsell',
      action: t.summary,
      status: t.status,
      detail: t.artifacts?.recoveryType as string | undefined,
    });
  }

  if (!hasRecovery) {
    return { hasRecovery: false, steps };
  }

  const failedTrace = executionTrace.find(t => t.status === 'failed');
  const recoveredBook = executionTrace.find(t => t.status === 'recovered' && t.tool.startsWith('book_'));

  return {
    hasRecovery: true,
    steps,
    recoveryType: (recoveredBook?.artifacts?.recoveryType as string) ?? '',
    originalVenue: (failedTrace?.input?.venueId as string) ?? '',
    replacementVenue: (recoveredBook?.artifacts?.bookingId as string) ?? '',
  };
}

function parseCost(costStr: string): number {
  const m = costStr.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

export function buildBusinessConversion(
  plan: Plan,
  constraints: UserConstraints,
  results: BookingExecutionResult[],
  planningTrace: ToolTraceEvent[],
  executionTrace: ToolTraceEvent[],
): BusinessConversion {
  const activityItem = plan.items.find(i => i.venueId.startsWith('a') && i.bookingRequired);
  const restaurantItem = plan.items.find(i => i.venueId.startsWith('r'));
  const activitySpend = activityItem ? parseCost(activityItem.cost) : 0;
  const restaurantSpend = restaurantItem ? parseCost(restaurantItem.cost) : 0;
  const totalSpend = activitySpend + restaurantSpend;

  const merchants: BusinessConversion['merchantBreakdown'] = [];
  if (activityItem) merchants.push({ name: activityItem.venue, category: '活动', amount: activitySpend });
  if (restaurantItem) merchants.push({ name: restaurantItem.venue, category: '餐饮', amount: restaurantSpend });

  const allTrace = [...planningTrace, ...executionTrace];
  const searched = allTrace.filter(t => t.tool.startsWith('search_')).length;
  const checked = allTrace.filter(t => t.tool === 'check_availability').length;
  const booked = results.filter(r => (r.status === 'success' || r.status === 'recovered') && r.kind !== 'delivery' && r.kind !== 'share').length;
  const upsell = results.filter(r => r.kind === 'delivery').length;
  const delivery = results.find(r => r.kind === 'delivery');

  // 业务真实化：优惠券/增购
  const scenario = constraints.scenario;
  const coupons = getCouponsForScenario(scenario).map(c => ({ name: c.name, price: c.price, saving: c.saving, type: c.type }));
  const optionalUpsells = getUpsellOptions(scenario).map(c => ({ name: c.name, price: c.price, type: c.type }));
  const estimatedSaving = coupons.reduce((sum, c) => sum + c.saving, 0);

  const completedActions: string[] = [];
  if (results.some(r => r.kind === 'activity' && (r.status === 'success' || r.status === 'recovered'))) completedActions.push('活动预约');
  if (results.some(r => r.kind === 'restaurant' && (r.status === 'success' || r.status === 'recovered'))) completedActions.push('餐厅订座');
  if (checked > 0) completedActions.push('库存核验');
  completedActions.push('路线规划');

  return {
    totalSpend,
    platformGMV: totalSpend,
    conversionFunnel: { searched, checked, booked, upsell },
    merchantBreakdown: merchants,
    upsellItem: constraints.scenario === 'family' ? '低糖饮品/打车券'
      : constraints.scenario === 'couple' ? '鲜花/蛋糕配送'
      : constraints.scenario === 'solo' ? '咖啡/书店代金券'
      : constraints.scenario === 'team' ? '团购套餐/饮品'
      : '团购券/饮品',
    upsellOrderId: delivery?.bookingId ?? '',
    coupons,
    estimatedSaving,
    completedActions,
    optionalUpsells,
  };
}

function applyRecoveredResultToPlan(
  targetItem: PlanItem | undefined,
  originalItem: PlanItem,
  recovered: BookingExecutionResult,
  constraints: UserConstraints,
): void {
  if (!targetItem || recovered.status !== 'recovered' || !recovered.venueId) return;
  targetItem.venue = recovered.item;
  targetItem.venueId = recovered.venueId;
  targetItem.bookingId = recovered.bookingId;
  targetItem.status = 'replaced';
  targetItem.replacedBy = recovered.item;
  targetItem.cost = recovered.cost !== undefined ? `约 ${recovered.cost} 元` : originalItem.cost;
  targetItem.reason = `${originalItem.venue} 不可订，已自动改订为 ${recovered.item}${recovered.district ? `（${recovered.district}）` : ''}。`;
  if (recovered.kind === 'restaurant') {
    targetItem.activity = constraints.scenario === 'family' ? '低负担晚餐' : '朋友聚餐';
  }
}

function refreshPlanTitleFromItems(plan: Plan, constraints: UserConstraints): void {
  const activityItem = plan.items.find(i => i.venueId.startsWith('a') && i.bookingRequired)
    ?? plan.items.find(i => !i.venueId.startsWith('r') && i.venueId !== 'delivery');
  const restaurantItem = plan.items.find(i => i.venueId.startsWith('r'));
  const scenarioLabel = constraints.scenario === 'family' ? '家庭'
    : constraints.scenario === 'couple' ? '情侣'
    : constraints.scenario === 'solo' ? '单人'
    : constraints.scenario === 'team' ? '团建'
    : '朋友';
  const activityName = activityItem?.venue ?? activityItem?.activity;
  const restaurantName = restaurantItem?.venue;

  if (activityName && restaurantName) {
    plan.title = `${scenarioLabel}方案：${activityName} → ${restaurantName}`;
    return;
  }
  if (restaurantName) {
    plan.title = `${scenarioLabel}方案：${restaurantName}`;
  }
}

function buildEffectiveRouteArtifacts(plan: Plan, fallback?: RouteArtifacts): RouteArtifacts | undefined {
  const activityItem = plan.items.find(i => i.venueId.startsWith('a') && i.bookingRequired);
  const restaurantItem = plan.items.find(i => i.venueId.startsWith('r'));
  const activity = activityItem ? getActivityById(activityItem.venueId) : undefined;
  const restaurant = restaurantItem ? getRestaurantById(restaurantItem.venueId) : undefined;
  if (!activity || !restaurant) return fallback;
  return buildRouteArtifacts(activity, restaurant);
}

// ============================================================
// Main execution entry
// ============================================================

export async function executeClosedLoopPlan(
  plan: Plan,
  constraints: UserConstraints,
  routeArtifacts?: RouteArtifacts,
  planningTrace?: ToolTraceEvent[],
): Promise<ExecutionResult> {
  const traceLog: ToolTraceEvent[] = [];
  const results: BookingExecutionResult[] = [];
  const effectivePlan: Plan = {
    ...plan,
    items: plan.items.map(item => ({ ...item })),
    notes: [...plan.notes],
  };
  const stateTransitions = ['USER_CONFIRMING', 'EXECUTING'];

  const actDistrict = routeArtifacts?.activityDistrict ?? '朝阳区';
  const resDistrict = routeArtifacts?.restaurantDistrict ?? '朝阳区';

  for (const [index, item] of plan.items.entries()) {
    if (!item.bookingRequired) {
      results.push({ item: item.venue, kind: 'activity', status: 'skipped', reason: '无需预约' });
      continue;
    }

    const kind = item.venueId.startsWith('r') ? 'restaurant' : 'activity';
    const tool = kind === 'restaurant' ? 'book_restaurant' : 'book_activity';
    // Inject demo failure for the dynamically-selected venue
    const shouldFail = (constraints.failureMode === 'restaurant_unavailable' && kind === 'restaurant')
      || (constraints.failureMode === 'activity_sold_out' && kind === 'activity');
    const firstTry = shouldFail
      ? envelope('failed', `${item.venue} ${item.time.split('-')[0]} 无位/满员`, { reason: 'NO_SEATS', bookingId: undefined, queueStatus: '模拟失败' }, kind === 'restaurant' ? 'SEARCH_ALTERNATIVE_RESTAURANT' : 'SEARCH_ALTERNATIVE_ACTIVITY')
      : bookVenue(item, constraints);
    traceLog.push(trace(
      tool,
      firstTry.status === 'success' ? 'success' : 'failed',
      firstTry.summary,
      { venueId: item.venueId, timeSlot: item.time.split('-')[0], partySize: constraints.partySize },
      firstTry.artifacts,
      firstTry.recoveryHint,
    ));

    if (firstTry.status === 'success' && firstTry.artifacts.bookingId) {
      results.push({ item: item.venue, kind, status: 'success', bookingId: firstTry.artifacts.bookingId });
      continue;
    }

    stateTransitions.push('REPLANNING');
    const recovered = recoverBookingFailure(item, constraints, actDistrict, resDistrict, traceLog);
    results.push(recovered);
    if (recovered.status === 'failed') {
      stateTransitions.push('FAILED_WITH_RECOVERY_OPTIONS');
    } else {
      applyRecoveredResultToPlan(effectivePlan.items[index], item, recovered, constraints);
      stateTransitions.push('EXECUTING');
    }
  }

  const deliveryLabel = constraints.scenario === 'family' ? '低糖饮品/打车券'
    : constraints.scenario === 'couple' ? '鲜花/蛋糕配送'
    : constraints.scenario === 'solo' ? '咖啡/书店代金券'
    : constraints.scenario === 'team' ? '团购套餐/饮品'
    : '团购券/饮品';
  const deliveryType = constraints.scenario === 'family' ? 'ride_or_drink'
    : constraints.scenario === 'couple' ? 'flower_or_cake'
    : constraints.scenario === 'solo' ? 'coffee_or_book'
    : constraints.scenario === 'team' ? 'group_coupon'
    : 'group_coupon';
  const deliveryOrderId = makeBookingId('OD', deliveryType);
  traceLog.push(trace(
    'order_delivery',
    'success',
    `已准备${deliveryLabel}增购选项`,
    { scenario: constraints.scenario },
    { orderId: deliveryOrderId, conversionType: deliveryType },
  ));
  results.push({ item: deliveryLabel, kind: 'delivery', status: 'success', bookingId: deliveryOrderId });

  const effectiveRoute = buildEffectiveRouteArtifacts(effectivePlan, routeArtifacts);
  refreshPlanTitleFromItems(effectivePlan, constraints);
  const shareText = generateShareText(effectivePlan, constraints, results);
  traceLog.push(trace(
    'generate_share_text',
    'success',
    constraints.shareAudience === 'wife' ? '已生成发给老婆的文案'
      : constraints.shareAudience === 'partner' ? '已生成发给另一半的文案'
      : constraints.shareAudience === 'self' ? '已生成个人备忘文案'
      : '已生成发朋友群的文案',
    { audience: constraints.shareAudience },
    { preview: shareText.slice(0, 80) },
  ));

  const route = effectiveRoute ?? {
    activityDistrict: '未知', restaurantDistrict: '未知', sameDistrict: false,
    districtDistance: 0, distanceKm: 0, durationMinutes: 0, transport: '', reason: '路线信息缺失',
  };
  const confirmationCard = buildConfirmationCard(effectivePlan, constraints, results, shareText, route);
  const recoveryStory = buildRecoveryStory(traceLog, results, stateTransitions);
  const businessConversion = buildBusinessConversion(effectivePlan, constraints, results, planningTrace ?? [], traceLog);
  stateTransitions.push('BOOKING_COMPLETE');

  return { plan: effectivePlan, results, trace: traceLog, shareText, confirmationCard, stateTransitions, recoveryStory, businessConversion, routeArtifacts: route };
}
