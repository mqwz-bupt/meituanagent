// 工具注册表 — 按 Agent 分组导出工具集

import type { Tool } from 'ai';

export {
  searchRestaurantsTool,
  searchActivitiesTool,
  checkAvailabilityTool,
  getRouteTool,
  getWeatherTool,
  bookRestaurantTool,
  bookActivityTool,
  orderDeliveryTool,
  generateShareTextTool,
} from './definitions.js';

import {
  searchRestaurantsTool,
  searchActivitiesTool,
  checkAvailabilityTool,
  getRouteTool,
  getWeatherTool,
  bookRestaurantTool,
  bookActivityTool,
  orderDeliveryTool,
  generateShareTextTool,
} from './definitions.js';

/** Planning Agent 可用工具（搜索 + 查询） */
export const planningTools: Record<string, Tool> = {
  search_restaurants: searchRestaurantsTool,
  search_activities: searchActivitiesTool,
  check_availability: checkAvailabilityTool,
  get_route: getRouteTool,
  get_weather: getWeatherTool,
};

/** Execution Agent 可用工具（预订 + 配送） */
export const executionTools: Record<string, Tool> = {
  book_restaurant: bookRestaurantTool,
  book_activity: bookActivityTool,
  order_delivery: orderDeliveryTool,
  generate_share_text: generateShareTextTool,
};

/** 所有工具（调试用） */
export const allTools: Record<string, Tool> = {
  ...planningTools,
  ...executionTools,
};
