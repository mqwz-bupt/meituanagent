import { z } from 'zod';
import { tool } from 'ai';
import { AREA_TO_DISTRICT, DISTRICT_DIST, resolveDistrict } from '../district.js';

// ============================================================
// Planning Agent 工具 (5个)
// ============================================================

export const searchRestaurantsTool = tool({
  description: `搜索北京本地餐厅。支持按菜系、价格上限、饮食需求、亲子友好、人数、距离筛选。
返回餐厅列表（名称、菜系、人均、评分、地址、标签、适合人群、距离）。
使用场景：用户提到吃饭、用餐、聚餐时调用。`,
  inputSchema: z.object({
    cuisine: z.string().optional().describe('菜系关键词，如"川菜""日料""火锅""西餐""亲子"'),
    maxPrice: z.number().optional().describe('人均价格上限（元）'),
    kidFriendly: z.boolean().optional().describe('是否需要亲子友好'),
    dietFriendly: z.boolean().optional().describe('是否需要低卡/健康菜单'),
    groupSize: z.number().optional().describe('用餐人数'),
    maxDistance: z.number().optional().describe('距离上限（km）'),
    tags: z.array(z.string()).optional().describe('标签筛选，如["约会","团建","性价比"]'),
    district: z.string().optional().describe('区名筛选，如"朝阳区""海淀区"，用于搜索同区域餐厅'),
  }),
  execute: async (params) => {
    const { searchRestaurants } = await import('../mock/data.js');
    const results = searchRestaurants(params);
    return {
      count: results.length,
      restaurants: results.map(r => ({
        id: r.id,
        name: r.name,
        cuisine: r.cuisine,
        avgPrice: r.avgPrice,
        priceRange: r.priceRange,
        rating: r.rating,
        address: r.address,
        district: r.district,
        tags: r.tags,
        kidFriendly: r.kidFriendly,
        dietFriendly: r.dietFriendly,
        businessHours: r.businessHours,
        mealSlots: r.mealSlots,
        distance: r.distance,
        description: r.description,
      })),
    };
  },
});

export const searchActivitiesTool = tool({
  description: `搜索北京本地活动、景点、展览、公园等。支持按类型、价格上限、人数、距离、最低年龄筛选。
返回活动列表（名称、类型、价格、地址、时长、年龄段、时间段、标签）。
使用场景：用户提到"玩""逛""活动""景点""展览""亲子""团建"时调用。`,
  inputSchema: z.object({
    type: z.string().optional().describe('活动类型关键词，如"亲子乐园""展览""Citywalk""公园""密室"'),
    maxPrice: z.number().optional().describe('单人价格上限（元）'),
    groupSize: z.number().optional().describe('参与人数'),
    maxDistance: z.number().optional().describe('距离上限（km）'),
    tags: z.array(z.string()).optional().describe('标签筛选，如["亲子","免费","刺激","文艺"]'),
    minAge: z.number().optional().describe('参与者最小年龄（岁）'),
    district: z.string().optional().describe('区名筛选，如"朝阳区""海淀区"，用于搜索同区域活动'),
  }),
  execute: async (params) => {
    const { searchActivities } = await import('../mock/data.js');
    const results = searchActivities(params);
    return {
      count: results.length,
      activities: results.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        price: a.price,
        address: a.address,
        district: a.district,
        duration: a.duration,
        ageSuitability: a.ageSuitability,
        groupMin: a.groupMin,
        groupMax: a.groupMax,
        timeSlots: a.timeSlots,
        tags: a.tags,
        distance: a.distance,
        description: a.description,
      })),
    };
  },
});

export const checkAvailabilityTool = tool({
  description: `查询餐厅或活动在指定日期时段的可用性（座位/门票余量）。
返回是否可用、剩余数量、备选时段。
使用场景：选定场所后、预订前，确认是否有空位。`,
  inputSchema: z.object({
    venueId: z.string().describe('餐厅或活动ID，如"r001""a003"'),
    date: z.string().describe('日期，如"2026-05-10"或"今天""明天"'),
    timeSlot: z.string().describe('时段，如"14:00""17:30"'),
    partySize: z.number().min(1).describe('人数'),
  }),
  execute: async (params) => {
    const { checkAvailability, getRestaurantById, getActivityById } = await import('../mock/data.js');
    const venue = getRestaurantById(params.venueId) ?? getActivityById(params.venueId);
    if (!venue) {
      return { error: { code: 'NOT_FOUND', message: `未找到ID为 ${params.venueId} 的场所` } };
    }
    const result = checkAvailability(params.venueId, params.date, params.timeSlot, params.partySize);
    return { venueName: venue.name, ...result };
  },
});

// === 路线规划辅助：复用 district.ts 的区域距离矩阵 ===

export const getRouteTool = tool({
  description: `查询两个地点之间的路线距离和预估时间。
返回总距离、总时间、分段路线和交通方式。
使用场景：规划行程时计算移动时间，确保时间安排合理。支持北京各区智能距离估算。`,
  inputSchema: z.object({
    from: z.string().describe('出发地，如"国贸""朝阳公园""家"'),
    to: z.string().describe('目的地，如"蓝色港湾""三里屯"'),
  }),
  execute: async (params) => {
    const { activities } = await import('../mock/activities.js');
    const { restaurants } = await import('../mock/restaurants.js');
    const allVenues = [
      ...activities.map(a => ({ name: a.name, district: a.district })),
      ...restaurants.map(r => ({ name: r.name, district: r.district })),
    ];

    const fromDist = resolveDistrict(params.from, allVenues);
    const toDist = resolveDistrict(params.to, allVenues);

    let distanceKm: number;
    if (fromDist && toDist && DISTRICT_DIST[fromDist]?.[toDist] !== undefined) {
      distanceKm = DISTRICT_DIST[fromDist][toDist];
    } else {
      const hash = Math.abs((params.from + params.to).split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0));
      distanceKm = 5 + (hash % 18);
    }

    let durationMin: number;
    let transport: string;
    if (distanceKm <= 2) {
      durationMin = Math.round(distanceKm * 12);
      transport = '步行';
    } else if (distanceKm <= 5) {
      durationMin = Math.round(5 + distanceKm * 3);
      transport = '骑行/打车';
    } else if (distanceKm <= 15) {
      durationMin = Math.round(10 + distanceKm * 2.5);
      transport = '打车/公交';
    } else {
      durationMin = Math.round(15 + distanceKm * 2);
      transport = '地铁/驾车';
    }

    return {
      from: params.from,
      to: params.to,
      distance: `${distanceKm}km`,
      duration: `${durationMin}分钟`,
      segments: [{
        from: params.from,
        to: params.to,
        distance: `${distanceKm}km`,
        duration: `${durationMin}分钟`,
        transport,
      }],
    };
  },
});

export const getWeatherTool = tool({
  description: `查询北京指定日期的天气情况。
返回温度、天气状况、出行建议。
使用场景：规划户外活动前查询天气，影响室内/室外选择。`,
  inputSchema: z.object({
    date: z.string().describe('日期，如"2026-05-10""今天""明天""周六"'),
    location: z.string().optional().describe('地区，如"朝阳""海淀"，默认北京全市'),
  }),
  execute: async (params) => {
    const conditions = [
      { temp: 28, condition: '晴', uv: '强', wind: '微风', suggestion: '适合户外活动，注意防晒' },
      { temp: 25, condition: '多云', uv: '中等', wind: '微风', suggestion: '适合户外活动，体感舒适' },
      { temp: 22, condition: '阴', uv: '弱', wind: '3-4级', suggestion: '户外活动可，建议带外套' },
      { temp: 30, condition: '晴间多云', uv: '强', wind: '微风', suggestion: '偏热，建议室内+户外搭配' },
    ];
    const idx = Math.abs(params.date.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) % conditions.length;
    const w = conditions[idx];
    return {
      date: params.date,
      location: params.location ?? '北京',
      temperature: `${w.temp}°C`,
      condition: w.condition,
      uvIndex: w.uv,
      wind: w.wind,
      suggestion: w.suggestion,
    };
  },
});

// ============================================================
// Execution Agent 工具 (3个)
// ============================================================

// === 预订去重守卫 ===
const bookedVenueIds = new Set<string>();

export function resetBookingTracker(): void {
  bookedVenueIds.clear();
}

export const bookRestaurantTool = tool({
  description: `预订餐厅座位。需要提供餐厅ID、日期、时段、人数和特殊需求。
返回预订状态、预订号、确认信息。
使用场景：用户确认方案后，Execution Agent执行餐厅预订。
注意：restaurantId 必须以 "r" 开头。`,
  inputSchema: z.object({
    restaurantId: z.string().describe('餐厅ID，如"r001"'),
    date: z.string().describe('预订日期，如"2026-05-10"'),
    timeSlot: z.string().describe('预订时段，如"17:30""18:00"'),
    partySize: z.number().min(1).max(20).describe('用餐人数'),
    specialRequests: z.string().optional().describe('特殊需求，如"需要儿童椅""推荐低卡菜品""靠窗位置"'),
  }),
  execute: async (params) => {
    // 守卫1：ID前缀校验
    if (!params.restaurantId.startsWith('r')) {
      return { error: { code: 'INVALID_ID', message: `餐厅ID必须以r开头，收到: ${params.restaurantId}。请使用 book_activity 预订活动` } };
    }
    // 守卫2：重复预订检查
    const dedupKey = `${params.restaurantId}:${params.date}:${params.timeSlot}`;
    if (bookedVenueIds.has(dedupKey)) {
      return { error: { code: 'DUPLICATE_BOOKING', message: `${params.restaurantId} ${params.date} ${params.timeSlot} 已预订，请勿重复提交` } };
    }

    const { getRestaurantById, checkAvailability } = await import('../mock/data.js');
    const restaurant = getRestaurantById(params.restaurantId);
    if (!restaurant) {
      return { error: { code: 'NOT_FOUND', message: `未找到ID为 ${params.restaurantId} 的餐厅` } };
    }
    const avail = checkAvailability(params.restaurantId, params.date, params.timeSlot, params.partySize);
    if (!avail.available) {
      return {
        error: {
          code: 'SLOT_UNAVAILABLE',
          message: `${restaurant.name} ${params.timeSlot} 时段已满`,
          alternativeSlots: avail.timeSlots,
        },
      };
    }
    if (Math.random() < 0.1) {
      return { error: { code: 'BOOKING_FAILED', message: `${restaurant.name} 预订系统繁忙，请稍后重试` } };
    }
    const bookingId = `BK${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    bookedVenueIds.add(dedupKey); // 登记已预订
    return {
      status: 'success',
      bookingId,
      restaurant: restaurant.name,
      date: params.date,
      timeSlot: params.timeSlot,
      partySize: params.partySize,
      specialRequests: params.specialRequests,
      confirmation: `已成功预订 ${restaurant.name} ${params.timeSlot} ${params.partySize}人位`,
    };
  },
});

export const bookActivityTool = tool({
  description: `预订活动/景点门票。需要提供活动ID、日期、时段、人数。
返回预订状态、预订号、确认信息。
使用场景：用户确认方案后，Execution Agent执行活动预订。
注意：activityId 必须以 "a" 开头。`,
  inputSchema: z.object({
    activityId: z.string().describe('活动ID，如"a001"'),
    date: z.string().describe('预订日期，如"2026-05-10"'),
    timeSlot: z.string().describe('入场时段，如"14:00""10:00"'),
    partySize: z.number().min(1).max(20).describe('参与人数'),
  }),
  execute: async (params) => {
    // 守卫1：ID前缀校验
    if (!params.activityId.startsWith('a')) {
      return { error: { code: 'INVALID_ID', message: `活动ID必须以a开头，收到: ${params.activityId}。请使用 book_restaurant 预订餐厅` } };
    }
    // 守卫2：重复预订检查
    const dedupKey = `${params.activityId}:${params.date}:${params.timeSlot}`;
    if (bookedVenueIds.has(dedupKey)) {
      return { error: { code: 'DUPLICATE_BOOKING', message: `${params.activityId} ${params.date} ${params.timeSlot} 已预订，请勿重复提交` } };
    }

    const { getActivityById, checkAvailability } = await import('../mock/data.js');
    const activity = getActivityById(params.activityId);
    if (!activity) {
      return { error: { code: 'NOT_FOUND', message: `未找到ID为 ${params.activityId} 的活动` } };
    }
    const avail = checkAvailability(params.activityId, params.date, params.timeSlot, params.partySize);
    if (!avail.available) {
      return {
        error: {
          code: 'SLOT_UNAVAILABLE',
          message: `${activity.name} ${params.timeSlot} 时段已满`,
          alternativeSlots: avail.timeSlots,
        },
      };
    }
    if (Math.random() < 0.1) {
      return { error: { code: 'BOOKING_FAILED', message: `${activity.name} 预订系统繁忙，请稍后重试` } };
    }
    const bookingId = `BK${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    bookedVenueIds.add(dedupKey); // 登记已预订
    return {
      status: 'success',
      bookingId,
      activity: activity.name,
      date: params.date,
      timeSlot: params.timeSlot,
      partySize: params.partySize,
      confirmation: `已成功预订 ${activity.name} ${params.timeSlot} ${params.partySize}人门票`,
    };
  },
});

export const orderDeliveryTool = tool({
  description: `下配送订单（蛋糕、鲜花、饮品等）。需要提供商品、配送时间、地址。
返回订单状态、订单号、预估配送时间。
使用场景：用户想在行程中安排蛋糕/鲜花等配送，增加仪式感。`,
  inputSchema: z.object({
    item: z.string().describe('配送商品，如"生日蛋糕""鲜花束""奶茶"'),
    deliveryTime: z.string().describe('期望配送时间，如"15:00""16:30"'),
    deliveryAddress: z.string().describe('配送地址，如"朝阳区朝阳公园南门"'),
    recipientName: z.string().optional().describe('收件人姓名'),
    note: z.string().optional().describe('备注，如"无糖""生日快乐卡片"'),
  }),
  execute: async (params) => {
    if (Math.random() < 0.05) {
      return { error: { code: 'BOOKING_FAILED', message: '配送服务暂时不可用，请稍后重试' } };
    }
    const orderId = `OD${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    return {
      status: 'success',
      orderId,
      item: params.item,
      deliveryTime: params.deliveryTime,
      deliveryAddress: params.deliveryAddress,
      estimatedDelivery: `${params.deliveryTime} ± 15分钟`,
      recipientName: params.recipientName,
      note: params.note,
      confirmation: `已下单 ${params.item}，预计 ${params.deliveryTime} 送达 ${params.deliveryAddress}`,
    };
  },
});

export const generateShareTextTool = tool({
  description: '生成可直接发给老婆或朋友群的分享文案。执行完成后必须调用，返回结构化文案和受众。',
  inputSchema: z.object({
    audience: z.enum(['wife', 'friends']).describe('分享对象'),
    title: z.string().describe('方案标题'),
    schedule: z.array(z.string()).describe('行程摘要'),
    confirmations: z.array(z.string()).describe('确认号摘要'),
  }),
  execute: async (params) => {
    const prefix = params.audience === 'wife'
      ? '老婆，下午安排好了：'
      : '大家下午安排好了：';
    const text = `${prefix}${params.schedule.join('；')}。已确认：${params.confirmations.join('，')}。`;
    return {
      status: 'success',
      summary: params.audience === 'wife' ? '已生成发给老婆的文案' : '已生成发朋友群的文案',
      artifacts: {
        audience: params.audience,
        shareText: text,
      },
    };
  },
});
