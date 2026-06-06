# 美团本地活动规划Agent — 系统架构设计

> 版本: v1.0 | 日期: 2026-05-10
> 关联文档: PRD `.claude/PRPs/prds/meituan-local-activity-agent.prd.md` | 蓝图 `plans/full-system-build.md`

---

## 1. 架构总览

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Browser (Chat UI)                            │
│  ┌──────────────┐  ┌──────────────────────────────────────────────┐  │
│  │  Chat Input   │  │  Plan Timeline Cards / Booking Status       │  │
│  └──────┬───────┘  └──────────────────────────────────────────────┘  │
└─────────┼────────────────────────────────────────────────────────────┘
          │ SSE (Server-Sent Events)
┌─────────▼────────────────────────────────────────────────────────────┐
│                       Express Server (src/server.ts)                  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Session Router (TypeScript code)                               │  │
│  │  根据 session.state 路由到对应 Agent:                            │  │
│  │    PLANNING/IDLE/REVISED → Planning Agent                      │  │
│  │    PLAN_READY + 确认    → Execution Agent                      │  │
│  │    PLAN_READY + 修改    → Planning Agent (revise)              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Session State Machine:                                              │
│  IDLE → PLANNING → PLAN_READY → CONFIRMED → EXECUTING → COMPLETED   │
│             ↑           ↓                                            │
│             └─ REVISED ─┘                                            │
│                                                                      │
│  ┌──────────────────────┐       ┌──────────────────────┐            │
│  │   Planning Agent      │       │   Execution Agent     │            │
│  │                       │       │                       │            │
│  │  Vercel AI SDK        │       │  Vercel AI SDK        │            │
│  │  streamText()         │       │  generateText()       │            │
│  │  model: DeepSeek V4   │       │  model: DeepSeek V4   │            │
│  │  system: PLANNING     │       │  system: EXECUTING    │            │
│  │                       │       │                       │            │
│  │  可用工具:             │       │  可用工具:             │            │
│  │  - search_restaurants │       │  - book_restaurant    │            │
│  │  - search_activities  │       │  - book_activity      │            │
│  │  - check_availability │       │  - order_delivery     │            │
│  │  - get_route          │       │                       │            │
│  │  - get_weather        │       │  输入: plan JSON      │            │
│  │                       │       │  输出: booking results │            │
│  │  输入: 用户消息       │       │       + share text     │            │
│  │  输出: 流式文本       │       └──────────────────────┘            │
│  │       + plan JSON     │                                         │
│  └──────────────────────┘                                          │
│              │                           │                           │
│              └───────────┬───────────────┘                           │
│                          ▼                                           │
│                  ┌───────────────┐                                    │
│                  │  Tool Layer    │                                    │
│                  │  (Zod schemas) │                                    │
│                  └───────┬───────┘                                    │
│                          ▼                                           │
│                  ┌───────────────┐                                    │
│                  │  Data Layer    │                                    │
│                  │  真实北京POI   │                                    │
│                  │  + 模拟库存   │                                    │
│                  └───────────────┘                                    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. 核心架构决策

### 2.1 Supervisor = TypeScript代码，不是LLM

Supervisor不是一个额外的LLM调用，而是Express路由中的代码逻辑。

| 维度 | Supervisor as Code | Supervisor as LLM |
|------|-------------------|-------------------|
| 延迟 | 0ms（直接路由） | +1-3s（额外LLM调用） |
| 可靠性 | 100%确定性 | 可能路由错误 |
| 调试 | 状态转移可日志追踪 | LLM决策不透明 |
| Demo安全 | 无意外 | 可能现场翻车 |

多Agent故事依然成立：Planning Agent和Execution Agent是**不同的LLM调用实例**，拥有不同的system prompt、不同的工具集、不同的行为模式。

### 2.2 两阶段Agent，而非三阶段

将"搜索Agent"和"规划Agent"合并为**Planning Agent**：

- 搜索和规划高度耦合（LLM需要根据搜索结果实时调整方案）
- 分离需要额外的上下文传递，增加复杂度和失败风险
- 两阶段 = 两次LLM调用 = 清晰的多Agent故事 + 简单的实现

### 2.3 状态机驱动

会话状态由TypeScript代码管理，不依赖LLM判断当前阶段。

---

## 3. Agent调用链路

### 3.1 Session Router逻辑

```
用户发送消息
    ↓
加载 session (from Map<sessionId, Session>)
    ↓
switch (session.state)
    ↓
┌─────────────────────────────────────────────────────┐
│ case 'IDLE':                                        │
│   session.state = 'PLANNING'                        │
│   → planningAgent.chat(session, message)            │
│                                                     │
│ case 'PLANNING':                                    │
│   → planningAgent.chat(session, message)            │
│                                                     │
│ case 'PLAN_READY':                                  │
│   if (isConfirmation(message))  // 正则+关键词匹配  │
│     session.state = 'CONFIRMED'                     │
│     → executionAgent.execute(session)               │
│   else                                              │
│     session.state = 'REVISED'                       │
│     → planningAgent.revise(session, message)        │
│                                                     │
│ case 'EXECUTING':                                   │
│   → "预订进行中，请稍候"                             │
│                                                     │
│ case 'COMPLETED':                                   │
│   → "已全部完成，发送新消息开始新的规划"              │
└─────────────────────────────────────────────────────┘
```

### 3.2 Planning Agent工具调用链路（家庭场景示例）

```
用户: "今天下午想带孩子和老婆出去，老婆在减肥，别太远"

Step 1: search_activities({ type: "亲子", ageRange: "3-6", distance: 5 })
  → [{ name:"奇乐儿儿童乐园", duration:"1.5h", price:128, location:"朝阳大悦城" },
     { name:"中国科学技术馆", duration:"2h", price:30, location:"奥林匹克公园" },
     ...]

Step 2: get_weather({ date: "today", location: "北京朝阳" })
  → { temp: 28, condition: "晴", uv: "强", suggestion: "注意防晒，适合户外" }

Step 3: search_restaurants({ dietary: true, kidFriendly: true, distance: 5 })
  → [{ name:"外婆家(朝阳大悦城)", dietMenu: true, kidsMenu: true, rating: 4.5 },
     { name:"西贝莜面村(蓝色港湾)", dietMenu: true, kidsMenu: true, rating: 4.6 },
     ...]

Step 4: check_availability({ restaurantId: "wpojia-001", timeSlot: "17:30", partySize: 3 })
  → { available: true, tables: 2, waitTime: "无需等位" }

Step 5: get_route({ locations: ["家", "奇乐儿儿童乐园", "外婆家(朝阳大悦城)"] })
  → { totalDistance: "8.5km",
      segments: [
        { from: "家", to: "奇乐儿儿童乐园", time: "20min", distance: "4.2km" },
        { from: "奇乐儿儿童乐园", to: "外婆家", time: "5min", distance: "0.3km" }
      ]}

Step 6: LLM生成结构化方案 → 输出 plan JSON + 流式描述文本
```

### 3.3 Execution Agent工具调用链路

```
用户: "确认"

Step 1: book_activity({ activityId: "park-001", timeSlot: "14:00-15:30", partySize: 3 })
  → { status: "success", bookingId: "BK20260510-001", confirmation: "预约成功" }

Step 2: book_restaurant({ restaurantId: "wpojia-001", timeSlot: "17:30",
                          partySize: 3, notes: "需要儿童椅，推荐低卡菜品" })
  → { status: "success", bookingId: "BK20260510-002", confirmation: "已预订3人位" }

Step 3: 生成分享文案:
  "搞定了！下午2点出发，计划如下：
   14:00-15:30 亲子乐园 @ 朝阳大悦城（适合5岁小朋友）
   16:00-17:00 散步 @ 朝阳公园（天气晴好，适合户外）
   17:30-19:00 晚餐 @ 外婆家（有低卡菜品，已预约3人位）
   预估总花费：约420元
   所有预订已确认，直接出发就行！"
```

---

## 4. 工具调用模式

### 4.1 工具定义（Vercel AI SDK + Zod）

```typescript
// 所有工具遵循同一模式
tool({
  description: "搜索北京本地餐厅。支持按菜系、价格、饮食需求、亲子友好、人数筛选。",
  parameters: z.object({
    cuisine: z.enum(["川菜","粤菜","日料","韩料","西餐","东南亚","火锅","烧烤","家常菜"]).optional(),
    priceRange: z.enum(["¥","¥¥","¥¥¥"]).optional(),
    dietary: z.boolean().optional().describe("是否有低卡/健康菜单"),
    kidFriendly: z.boolean().optional(),
    groupSize: z.number().optional(),
    distance: z.number().optional().describe("距离(km)，不超过20"),
    timeSlot: z.string().optional().describe("期望用餐时间，如17:30"),
  }),
  execute: async (params) => {
    return searchData('restaurants', params);  // 返回结构化对象，不返回字符串
  }
})
```

### 4.2 设计原则

| 原则 | 说明 |
|------|------|
| 返回结构化对象 | LLM能更好地推理对象字段，而非解析字符串 |
| enum约束参数 | 减少LLM幻觉（如cuisine只能是预定义值） |
| 详细description | 告诉LLM何时用/不用这个工具 |
| execute调用数据层 | handler不含查询逻辑，只做参数验证和委托 |
| <20个工具 | 遵循OpenAI最佳实践，避免工具过多导致选择困难 |

### 4.3 工具注册表

```typescript
// src/tools/registry.ts
interface ToolSets {
  planning: {
    search_restaurants: Tool;
    search_activities: Tool;
    check_availability: Tool;
    get_route: Tool;
    get_weather: Tool;
  };
  execution: {
    book_restaurant: Tool;
    book_activity: Tool;
    order_delivery: Tool;
  };
}
```

---

## 5. 消息流/事件流

### 5.1 SSE事件类型

| 事件类型 | 触发时机 | 数据格式 | 前端处理 |
|---------|---------|---------|---------|
| `thinking` | Agent开始处理 | `{}` | 显示loading动画 |
| `tool_call` | LLM决定调用工具 | `{tool, args}` | 显示"正在搜索活动..." |
| `tool_result` | 工具返回结果 | `{tool, result, count}` | 可选：显示简要预览 |
| `token` | 流式文本token | `{content}` | 逐字渲染到聊天气泡 |
| `plan_ready` | 方案JSON完成 | `{plan: Plan}` | 渲染行程时间线卡片 |
| `booking_complete` | 预订全部完成 | `{results, shareText}` | 显示预订结果+分享按钮 |
| `error` | 发生错误 | `{message, code}` | 显示错误提示 |
| `done` | 本轮对话结束 | `{}` | 隐藏loading |

### 5.2 完整SSE交互时序

```
Browser                          Express Server
  │                                  │
  │── POST /api/chat ───────────────→│
  │   {message, sessionId}           │
  │                                  │ 加载session → state=IDLE
  │                                  │ state → PLANNING
  │                                  │ 启动 Planning Agent
  │                                  │
  │← SSE: event: thinking ──────────│
  │                                  │
  │← SSE: event: tool_call ─────────│ {tool:"search_activities", args:{...}}
  │                                  │
  │← SSE: event: tool_result ───────│ {tool:"search_activities", result:[...]}
  │                                  │
  │← SSE: event: token ─────────────│ "我为你找到了几个适合..."
  │← SSE: event: token ─────────────│ "带着5岁小朋友的亲子活动..."
  │                                  │
  │← SSE: event: tool_call ─────────│ {tool:"search_restaurants", args:{...}}
  │← SSE: event: tool_result ───────│ {tool:"search_restaurants", result:[...]}
  │                                  │
  │← SSE: event: token ─────────────│ "餐厅方面，推荐..."
  │← SSE: event: token ─────────────│ (持续流式输出)
  │                                  │
  │← SSE: event: plan_ready ────────│ {plan:{title, items, totalCost, notes}}
  │← SSE: event: done ──────────────│
  │                                  │ state → PLAN_READY
  │                                  │
  │ [用户看到行程卡片 + "确认方案"按钮]
  │                                  │
  │── POST /api/chat ───────────────→│
  │   {message:"确认", sessionId}    │
  │                                  │ isConfirmation("确认") = true
  │                                  │ state → CONFIRMED
  │                                  │ 启动 Execution Agent
  │                                  │
  │← SSE: event: tool_call ─────────│ {tool:"book_activity", args:{...}}
  │← SSE: event: tool_result ───────│ {status:"success", bookingId:"BK001"}
  │← SSE: event: tool_call ─────────│ {tool:"book_restaurant", args:{...}}
  │← SSE: event: tool_result ───────│ {status:"success", bookingId:"BK002"}
  │                                  │
  │← SSE: event: booking_complete ──│ {results:[...], shareText:"搞定了！..."}
  │← SSE: event: done ──────────────│
  │                                  │ state → COMPLETED
  │                                  │
  │ [用户看到预订确认 + "分享计划"按钮]
```

### 5.3 SSE实现模式（Express侧）

```typescript
// src/server.ts 中的 /api/chat 路由
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const session = sessions.get(sessionId) || createSession(sessionId);
  const agent = routeToAgent(session, message);

  for await (const event of agent) {
    sendEvent(event.type, event.data);
  }

  res.end();
});
```

---

## 6. 错误恢复策略

### 6.1 四级错误恢复

```
┌──────────────────────────────────────────────────────────┐
│ Level 1: 工具级重试                                       │
│                                                          │
│ 单个工具调用失败（网络超时/参数异常）                       │
│   → 自动重试1次（相同参数）                               │
│   → 仍然失败 → 进入 Level 2                              │
├──────────────────────────────────────────────────────────┤
│ Level 2: 智能降级                                        │
│                                                          │
│ 特定场所预订失败（满座/售罄）                              │
│   → 搜索同类型替代场所                                    │
│   → 预订替代方案                                          │
│   → 告知用户替换原因                                      │
│   → 无替代 → 进入 Level 3                                │
├──────────────────────────────────────────────────────────┤
│ Level 3: 用户介入                                        │
│                                                          │
│ 所有替代方案不可用                                         │
│   → 标记该环节为"需手动预订"                               │
│   → 方案中标注并提供场所信息（地址、电话）                   │
│   → 其余环节继续执行                                      │
├──────────────────────────────────────────────────────────┤
│ Level 4: 全局恢复                                        │
│                                                          │
│ LLM超时 / 超过maxSteps / 生成无效JSON / SSE断连           │
│   → 已有部分结果：展示部分结果                             │
│   → 完全无结果：友好提示+重新开始按钮                      │
│   → Session状态异常：重置为PLANNING                       │
│   → SSE断连：前端自动重连，服务端保留session               │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Execution Agent内嵌错误处理

Execution Agent的system prompt包含以下强制规则：

```
预订执行规则（必须严格遵守）：

1. 按时间顺序依次执行预订，不可并行（确保时序正确）
2. 每个预订最多重试1次
3. 预订失败时：
   a. 调用 search_restaurants/search_activities 找到同类型替代
   b. 调用 check_availability 确认替代方案可用
   c. 尝试预订替代方案
   d. 如果替代也失败，标记为"需手动预订"并继续执行后续环节
4. 所有预订完成后：
   - 成功的：显示预订确认号和详情
   - 替代的：标注原方案→替代方案，说明替换原因
   - 失败的：提供场所信息（名称、地址、电话）供用户手动预订
5. 生成分享文案，反映最终执行结果（非原始计划）
```

### 6.3 Planning Agent防护措施

| 异常 | 检测方式 | 恢复策略 |
|------|---------|---------|
| 生成无效plan JSON | Schema验证 | 重试提取JSON；降级为纯文本方案 |
| 工具调用顺序错乱 | System Prompt约束 | Plan-and-Solve模式强制先搜索后规划 |
| 超过maxSteps | `maxSteps: 10` 限制 | 展示已有结果，提示用户细化需求 |
| 未调用必要工具 | System Prompt强制 | 提示"至少搜索1次活动和1次餐厅" |
| LLM产生幻觉数据 | System Prompt约束 | "只使用工具返回的数据，不要编造场所名称" |

### 6.4 状态机异常处理

```
非法状态转移（如 PLAN_READY 直接跳到 EXECUTING）
  → 拒绝转移，返回当前状态允许的操作提示

Session过期（长时间无活动）
  → 保留plan数据，重置对话历史，提示用户重新开始

SSE连接中断
  → 服务端保留session状态
  → 前端重连后发送最后收到的eventId
  → 服务端从断点续传（或返回当前状态摘要）
```

---

## 7. 数据层设计

### 7.1 数据策略

| 层级 | 数据来源 | 说明 |
|------|---------|------|
| 搜索发现 | **真实北京POI数据** | 真实场所名称、地址、评分、价格 |
| 库存查询 | **模拟数据** | 基于概率的座位/门票可用性 |
| 预订执行 | **Mock API** | 模拟预订成功/失败 |
| 天气查询 | **真实API**（可选） | 如接入免费天气API |
| 路线距离 | **直线距离计算** | Haversine公式，近似合理 |

### 7.2 五种场景数据覆盖

| 场景 | 需要的数据特征 | 示例数据 |
|------|--------------|---------|
| 家庭 | 亲子标签、低卡菜单、儿童设施 | 奇乐儿儿童乐园、外婆家(低卡菜单) |
| 朋友 | 群体活动、多人餐厅 | 密室逃脱、海底捞(大桌) |
| 情侣 | 氛围标签、浪漫路线 | 798展览、特色Bistro |
| 团建 | 大团体、预算友好 | 剧本杀(10人场)、烤肉(大桌) |
| Solo | 一人友好、性价比 | Citywalk路线、一人食拉面 |

---

## 8. 目录结构

```
src/
  server.ts              # Express入口 + API路由 + SSE
  types.ts               # 全局TypeScript接口
  state.ts               # Session状态机

  agent/
    router.ts            # Session路由（根据state选择Agent）
    planning.ts          # Planning Agent（streamText + search tools）
    execution.ts         # Execution Agent（generateText + booking tools）
    prompts/
      planning.ts        # Plan-and-Solve系统提示词
      execution.ts       # 执行系统提示词（含错误处理规则）
      scenarios.ts       # 5种场景few-shot示例

  tools/
    definitions.ts       # 8个Zod工具Schema定义
    handlers.ts          # 8个工具执行Handler
    registry.ts          # 工具注册表（按Agent分组）

  mock/
    restaurants.ts       # 北京餐厅数据（20+）
    activities.ts        # 北京活动/景点数据（15+）
    data.ts              # 统一搜索接口 + 过滤函数

  test-agent.ts          # 端到端测试脚本

public/
  index.html             # 聊天UI
  style.css              # 美团风格样式
  app.js                 # 前端SSE消费+渲染逻辑
```

---

## 9. 技术栈速查

| 组件 | 技术 | 版本/包名 |
|------|------|----------|
| 运行时 | Node.js | v24.13.0 |
| 语言 | TypeScript | strict mode, ES2022 |
| Web框架 | Express | ^4 |
| Agent框架 | Vercel AI SDK | `ai` + `@ai-sdk/openai` |
| Schema验证 | Zod | ^3 |
| LLM | DeepSeek V4 | 通过OpenAI兼容API接入 |
| 开发工具 | tsx | 直接运行TypeScript |
| 前端 | Vanilla HTML/CSS/JS | 无构建步骤 |
