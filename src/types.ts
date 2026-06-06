// src/types.ts

export type SessionState =
  | 'IDLE' | 'PLANNING' | 'PLAN_READY' | 'REVISED'
  | 'USER_CONFIRMING' | 'CONFIRMED' | 'EXECUTING' | 'REPLANNING'
  | 'BOOKING_COMPLETE' | 'FAILED_WITH_RECOVERY_OPTIONS' | 'COMPLETED';

export interface PlanItem {
  time: string;
  activity: string;
  venue: string;
  venueId: string;
  cost: string;
  reason: string;
  bookingRequired?: boolean;
  bookingId?: string;
  status?: 'pending' | 'success' | 'replaced' | 'failed';
  replacedBy?: string;
}

export interface Plan {
  title: string;
  items: PlanItem[];
  totalCost: string;
  totalDuration: string;
  notes: string[];
}

export interface ToolTraceEvent {
  id: string;
  tool: string;
  status: 'pending' | 'success' | 'failed' | 'recovered';
  summary: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  artifacts: Record<string, unknown>;
  recoveryHint?: string;
  timestamp: string;
}

export interface ToolEnvelope<T = Record<string, unknown>> {
  status: 'success' | 'failed' | 'recovered';
  summary: string;
  artifacts: T;
  recoveryHint?: string;
}

export interface PlanningContext {
  constraints: Record<string, unknown>;
  routeArtifacts: Record<string, unknown>;
  shareText?: string;
  externalFeedback?: Record<string, unknown>;
}

export interface Session {
  id: string;
  state: SessionState;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentPlan: Plan | null;
  pendingPlans: Plan[] | null;
  planningContext?: PlanningContext;
  createdAt: Date;
  updatedAt: Date;
}

/** 可用性状态 */
export type AvailabilityStatus = 'available' | 'queue_required' | 'full' | 'closed' | 'sold_out' | 'no_suitable_table' | 'no_available_slot';

/** 推荐动作 */
export type RecommendAction = 'book_now' | 'take_queue_number' | 'choose_alternative' | 'adjust_time';

/** 餐厅可用餐段 */
export type MealSlot = 'lunch' | 'dinner' | 'afternoon_tea' | 'all_day';

export interface TableType {
  name: string;            // 如 "4人桌", "包间", "吧台"
  capacity: number;        // 最大座位数
  count: number;           // 该类型桌数
}

export interface Coupon {
  id: string;
  name: string;            // 如 "满100减20团购券"
  type: 'coupon' | 'package' | 'drink' | 'cake' | 'flower' | 'ride';
  price: number;           // 券价
  originalPrice: number;   // 原价
  saving: number;          // 节省金额
  applicableScenario: string[];  // 如 ['family', 'friends']
  reason: string;          // 推荐理由
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  priceRange: string;
  avgPrice: number;
  rating: number;
  address: string;
  district: string;
  businessHours: string;
  mealSlots: MealSlot[];   // 可预订餐段
  tags: string[];
  kidFriendly: boolean;
  dietFriendly: boolean;
  groupMin: number;        // 最少人数（如亲子餐厅要求1大1小）
  groupMax: number;
  distance: number;        // km from city center
  description: string;
  // === 业务真实化新增字段 ===
  tableTypes?: TableType[];
  availableSlots?: string[];     // 今日可订时段
  queueMinutes?: number;         // 当前排队等待分钟数
  currentCapacity?: number;      // 当前剩余座位
  maxCapacity?: number;          // 最大座位容量
  reservationRequired?: boolean; // 是否必须预约
  coupons?: Coupon[];            // 可用团购券/套餐
  lowCalorie?: boolean;          // 是否有低卡菜单
  childMenu?: boolean;           // 是否有儿童餐
  cancelPolicy?: string;         // 取消政策
}

/** 活动适合的年龄段 */
export type AgeSuitability =
  | { type: 'all' }
  | { type: 'min'; minAge: number }
  | { type: 'range'; minAge: number; maxAge: number };

export interface Activity {
  id: string;
  name: string;
  type: string;
  price: number;
  address: string;
  district: string;
  duration: number;        // minutes
  ageSuitability: AgeSuitability;
  groupMin: number;
  groupMax: number;
  timeSlots: string[];
  description: string;
  tags: string[];
  distance: number;        // km from city center
  // === 业务真实化新增字段 ===
  availableSlots?: string[];     // 今日可入场时段
  currentCapacity?: number;      // 当前剩余名额
  maxCapacity?: number;          // 最大容量
  ticketRequired?: boolean;      // 是否需要门票/预约
  indoor?: boolean;              // 是否室内
  outdoor?: boolean;             // 是否户外
  cancelPolicy?: string;         // 取消政策
}

export type SSEEvent =
  | { type: 'thinking' }
  | { type: 'tool_call'; tool: string; args: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; result: unknown; count?: number }
  | { type: 'tool_trace'; trace: ToolTraceEvent }
  | { type: 'token'; content: string }
  | { type: 'plan_ready'; plan: Plan; plans?: Plan[]; constraintExplanation?: unknown; externalFeedback?: unknown }
  | { type: 'plan_selected'; plan: Plan }
  | { type: 'booking_complete'; plan?: Plan; results: Array<{ item: string; status: string; bookingId?: string; replacedBy?: string; venueId?: string; district?: string }>; shareText: string; confirmationCard?: unknown; recoveryStory?: unknown; businessConversion?: unknown }
  | { type: 'error'; message: string; code?: string }
  | { type: 'done' };
