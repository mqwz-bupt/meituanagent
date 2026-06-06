import type { Restaurant, Activity } from '../types.js';
import { restaurants } from './restaurants.js';
import { activities } from './activities.js';
import { getCouponsForScenario } from './coupons.js';

// === 餐厅搜索 ===

export interface RestaurantFilter {
  cuisine?: string;
  maxPrice?: number;
  kidFriendly?: boolean;
  dietFriendly?: boolean;
  groupSize?: number;
  maxDistance?: number;
  tags?: string[];
  district?: string;
}

export function searchRestaurants(filter: RestaurantFilter): Restaurant[] {
  let result = [...restaurants];

  if (filter.cuisine) {
    result = result.filter(r =>
      r.cuisine.includes(filter.cuisine!) || r.tags.some(t => t.includes(filter.cuisine!))
    );
  }
  if (filter.maxPrice !== undefined) {
    result = result.filter(r => r.avgPrice <= filter.maxPrice!);
  }
  if (filter.kidFriendly !== undefined) {
    result = result.filter(r => r.kidFriendly === filter.kidFriendly);
  }
  if (filter.dietFriendly !== undefined) {
    result = result.filter(r => r.dietFriendly === filter.dietFriendly);
  }
  if (filter.groupSize !== undefined) {
    result = result.filter(r => r.groupMax >= filter.groupSize!);
  }
  if (filter.maxDistance !== undefined) {
    result = result.filter(r => r.distance <= filter.maxDistance!);
  }
  if (filter.tags && filter.tags.length > 0) {
    result = result.filter(r =>
      filter.tags!.some(t => r.tags.some(rt => rt.includes(t)))
    );
  }
  if (filter.district) {
    result = result.filter(r => r.district === filter.district);
  }

  result.sort((a, b) => b.rating - a.rating);
  return result;
}

// === 活动搜索 ===

export interface ActivityFilter {
  type?: string;
  maxPrice?: number;
  groupSize?: number;
  maxDistance?: number;
  tags?: string[];
  minAge?: number;
  district?: string;
}

export function searchActivities(filter: ActivityFilter): Activity[] {
  let result = [...activities];

  if (filter.type) {
    result = result.filter(a =>
      a.type.includes(filter.type!) || a.tags.some(t => t.includes(filter.type!))
    );
  }
  if (filter.maxPrice !== undefined) {
    result = result.filter(a => a.price <= filter.maxPrice!);
  }
  if (filter.groupSize !== undefined) {
    result = result.filter(a => a.groupMin <= filter.groupSize! && a.groupMax >= filter.groupSize!);
  }
  if (filter.maxDistance !== undefined) {
    result = result.filter(a => a.distance <= filter.maxDistance!);
  }
  if (filter.tags && filter.tags.length > 0) {
    result = result.filter(a =>
      filter.tags!.some(t => a.tags.some(at => at.includes(t)))
    );
  }
  if (filter.minAge !== undefined) {
    result = result.filter(a => {
      const as = a.ageSuitability;
      if (as.type === 'all') return true;
      return as.minAge <= filter.minAge!;
    });
  }
  if (filter.district) {
    result = result.filter(a => a.district === filter.district);
  }

  result.sort((a, b) => a.price - b.price);
  return result;
}

// === 可用性查询（模拟库存）===

export interface AvailabilityResult {
  available: boolean;
  remainingSlots: number;
  timeSlots: string[];
  estimatedWait: string;
  // === 业务真实化新增字段 ===
  status: string;             // available | queue_required | full | closed | sold_out | no_available_slot
  recommendAction: string;    // book_now | take_queue_number | choose_alternative | adjust_time
  capacityLeft: number;       // 剩余容量
  tableType?: string;         // 如 "4人桌"
  reservationRequired?: boolean;
  reason?: string;
}

const slotInventory: Record<string, number> = {};
const availabilityOverrides = new Map<string, AvailabilityResult>();

export function setAvailabilityOverride(
  id: string,
  timeSlot: string,
  result: AvailabilityResult,
): void {
  availabilityOverrides.set(getSlotKey(id, timeSlot), result);
}

export function clearAvailabilityOverrides(): void {
  availabilityOverrides.clear();
}

function getSlotKey(id: string, slot: string): string {
  return `${id}:${slot}`;
}

function getInventory(key: string): number {
  if (!(key in slotInventory)) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
    }
    slotInventory[key] = Math.abs(hash) % 11;
  }
  return slotInventory[key];
}

export function checkAvailability(
  id: string,
  _date: string,
  timeSlot: string,
  partySize: number,
): AvailabilityResult {
  const key = getSlotKey(id, timeSlot);
  const override = availabilityOverrides.get(key);
  if (override) return override;

  const remaining = getInventory(key);

  if (remaining >= partySize) {
    return {
      available: true,
      remainingSlots: remaining - partySize,
      timeSlots: [timeSlot],
      estimatedWait: '无需等待',
      status: 'available',
      recommendAction: 'book_now',
      capacityLeft: remaining - partySize,
    };
  }

  const activity = activities.find(a => a.id === id);
  const restaurant = restaurants.find(r => r.id === id);
  const altSlots: string[] = [];

  if (activity) {
    for (const slot of activity.timeSlots) {
      const slotRemaining = getInventory(getSlotKey(id, slot));
      if (slotRemaining >= partySize) {
        altSlots.push(slot);
      }
    }
  } else if (restaurant) {
    // 从营业时间内生成具体时段（每30分钟一个），而非 "lunch"/"dinner" 标签
    const [openHour] = restaurant.businessHours.split('-').map(s => s.trim());
    const closeStr = restaurant.businessHours.split('-')[1]?.trim() ?? '21:00';
    const openH = parseInt(openHour.split(':')[0], 10);
    const closeH = parseInt(closeStr.split(':')[0], 10);
    for (let h = openH; h < closeH; h++) {
      for (const m of ['00', '30']) {
        const slot = `${String(h).padStart(2, '0')}:${m}`;
        const slotRemaining = getInventory(getSlotKey(id, slot));
        if (slotRemaining >= partySize) {
          altSlots.push(slot);
        }
      }
    }
  }

  const hasAlts = altSlots.length > 0;
  const venueName = activity?.name ?? restaurant?.name ?? id;
  let status: string;
  let recommendAction: string;
  let reason: string;

  if (hasAlts) {
    status = 'no_available_slot';
    recommendAction = 'adjust_time';
    reason = `${venueName} ${timeSlot} 时段已满，其他时段有位`;
  } else {
    status = 'full';
    recommendAction = 'choose_alternative';
    reason = `${venueName} 今日已满，建议选择其他场所`;
  }

  return {
    available: false,
    remainingSlots: 0,
    timeSlots: altSlots,
    estimatedWait: hasAlts ? `当前时段已满，可选: ${altSlots.join(', ')}` : '今日已满',
    status,
    recommendAction,
    capacityLeft: 0,
    reason,
  };
}

// === 按ID查询（含业务真实化字段丰富）===

/** 基于已有字段推导桌型 */
function inferTableTypes(r: Restaurant) {
  const types = [{ name: '2人桌', capacity: 2, count: 4 }];
  if (r.groupMax >= 4) types.push({ name: '4人桌', capacity: 4, count: 3 });
  if (r.groupMax >= 8) types.push({ name: '大桌/包间', capacity: r.groupMax, count: 1 });
  return types;
}

/** 基于营业时间生成可订时段 */
function inferAvailableSlots(businessHours: string): string[] {
  const parts = businessHours.split('-').map(s => s.trim());
  const openH = parseInt(parts[0]?.split(':')[0] ?? '11', 10);
  const closeH = parseInt(parts[1]?.split(':')[0] ?? '21', 10);
  const slots: string[] = [];
  for (let h = openH; h < closeH; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

/** 推导取消政策 */
function inferCancelPolicy(r: Restaurant): string {
  if (r.cuisine.includes('火锅') || r.cuisine.includes('烧烤')) return '到店前1小时可取消';
  return '到店前30分钟可取消';
}

/** 基于已有字段推导排队时间 */
function inferQueueMinutes(r: Restaurant): number {
  const hash = r.id.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  return Math.abs(hash) % 25; // 0-24 分钟
}

export function getRestaurantById(id: string): Restaurant | undefined {
  const r = restaurants.find(r => r.id === id);
  if (!r) return undefined;
  // 丰富业务字段（不在原始数据中存储，运行时推导）
  return {
    ...r,
    tableTypes: r.tableTypes ?? inferTableTypes(r),
    availableSlots: r.availableSlots ?? inferAvailableSlots(r.businessHours),
    queueMinutes: r.queueMinutes ?? inferQueueMinutes(r),
    currentCapacity: r.currentCapacity ?? (r.groupMax * 3),
    maxCapacity: r.maxCapacity ?? (r.groupMax * 5),
    reservationRequired: r.reservationRequired ?? (r.avgPrice >= 100),
    lowCalorie: r.lowCalorie ?? r.dietFriendly,
    childMenu: r.childMenu ?? r.kidFriendly,
    cancelPolicy: r.cancelPolicy ?? inferCancelPolicy(r),
    coupons: getCouponsForScenario(r.kidFriendly ? 'family' : 'friends').slice(0, 2),
  };
}

export function getActivityById(id: string): Activity | undefined {
  const a = activities.find(a => a.id === id);
  if (!a) return undefined;
  return {
    ...a,
    availableSlots: a.availableSlots ?? a.timeSlots,
    currentCapacity: a.currentCapacity ?? (a.groupMax * 5),
    maxCapacity: a.maxCapacity ?? (a.groupMax * 10),
    ticketRequired: a.ticketRequired ?? (a.price > 0),
    indoor: a.indoor ?? a.tags.some(t => /室内|博物馆|密室|KTV|电玩|VR|桌游/.test(t)),
    outdoor: a.outdoor ?? a.tags.some(t => /公园|户外|Citywalk|骑行/.test(t)),
    cancelPolicy: a.cancelPolicy ?? '开始前2小时可取消',
  };
}
