# 本地探索周末闲时活动规划 Agent — 设计文档

## 项目概述

一个把"今天下午想出去玩几个小时"变成可执行本地生活订单链路的 Agent：它不仅推荐地点，还会规划 4-6 小时路线、查餐厅/活动可用性、确认后执行 Mock 预约/下单，并生成可直接发给家人或朋友的消息。

## 一、Planning 策略

### 双路径规划架构

系统采用 **LLM 规划 + 确定性闭环 Fallback** 双路径设计：

- **LLM 路径**：使用 DeepSeek 模型 + Vercel AI SDK `streamText` 进行流式推理，通过 Plan-and-Solve 五阶段提示词（明确→研究→优化→呈现→执行）驱动工具调用。`stopWhen: stepCountIs(15)` 限制最大推理轮次，Zod schema 提取结构化 Plan，失败时 fallback 到正则解析。
- **确定性闭环路径**（`closed-loop.ts`）：不依赖 LLM，通过 `extractConstraints` 从用户文本提取结构化约束（场景、人数、儿童年龄、饮食需求等），再用评分函数选活动/选餐厅/算路线。当 LLM 未调用必要工具时自动触发。

### 状态机驱动的会话生命周期

10 个状态节点、约 20 条合法转移边，覆盖从 IDLE 到 COMPLETED 的完整流程：

```text
IDLE → PLANNING → PLAN_READY → USER_CONFIRMING → CONFIRMED → EXECUTING → BOOKING_COMPLETE → COMPLETED
                                    ↕ REVISED                              ↘ FAILED_WITH_RECOVERY_OPTIONS
```

`VALID_TRANSITIONS` 表严格约束每条边，非法转移被拒绝并返回错误信息（如 EXECUTING 状态拒绝新消息）。

### 约束优先级与地理聚类

选址评分遵循三级约束：①安全适配（孩子年龄、活动最低年龄、人数上下限）> ②硬边界（4-6 小时、距离、预算）> ③体验质量（餐前/餐后顺序、步行衔接）。地理聚类引擎（`district.ts`）将北京 50+ 商圈映射到 12 个行政区，使用 12×12 预计算距离矩阵确保活动与餐厅同区优先。

## 二、工具调用链路

### 工具分组与权限隔离

9 个 LLM 可调用工具按职责分为两组，严格隔离读写权限：

| 阶段 | 工具 | 权限 |
|------|------|------|
| **Planning（5 个只读）** | `search_activities`、`search_restaurants`、`check_availability`、`get_route`、`get_weather` | 查询 |
| **Execution（4 个写操作）** | `book_activity`、`book_restaurant`、`order_delivery`、`generate_share_text` | 预订/下单 |

规划阶段 LLM 无法触发预订，执行阶段无法重新搜索。

### 典型调用序列

```text
get_weather → search_activities → search_restaurants → check_availability → get_route
（用户确认后）
→ book_activity → book_restaurant → [order_delivery] → generate_share_text
```

### 守卫机制

- **ID 前缀校验**：`book_restaurant` 只接受 `r-` 前缀 ID，`book_activity` 只接受 `a-` 前缀，防止误操作。
- **重复预订去重**：已预订的 venue 不会被再次预订。
- **10% 模拟失败率**：预订工具随机返回"系统繁忙"，用于验证恢复策略。

## 三、异常处理机制

### 预订失败的三级恢复策略

当预订失败时，`recoverBookingFailure` 按距离优先级搜索替代场地：

1. **同区优先**：在失败场地的同行政区搜索同类型替代。
2. **近区备选**：同区无结果时，按距离矩阵选取最近邻区。
3. **跨区兜底**：以上均失败，返回 `NO_RECOVERY_OPTIONS` 状态。

每次恢复操作都记录 trace 日志（含 recoveryType 标签），前端据此渲染恢复故事卡片。

### Demo 模式 Fallback

当 `DEEPSEEK_API_KEY` 未配置时，系统自动切换到 Demo 模式：使用确定性闭环引擎完成全流程，通过 90ms/60ms 延迟模拟工具调用过程。确保无 API Key 时仍可跑通完整闭环演示。

### 状态机保护

`transitionState` 函数在每次状态变更前校验 `VALID_TRANSITIONS` 表，非法转移返回 `{ok: false, error: string}` 而非抛异常。这防止了如 EXECUTING 阶段接收新用户消息等竞态场景。
