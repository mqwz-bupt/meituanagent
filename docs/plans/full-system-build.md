# Blueprint: Meituan Local Activity Planning Agent — Full System Build

> Objective: Build a complete local activity planning & execution Agent from zero.
> Hackathon project for Meituan. Demo-ready Web UI with Mock APIs.
> Mode: Direct (no git/gh). Runtime: Node.js v24 + TypeScript.
> PRD: .claude/PRPs/prds/meituan-local-activity-agent.prd.md

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Browser (Chat UI)                              │
│  ┌───────────┐  ┌────────────────────────────┐  │
│  │ Chat Input │  │ Plan Cards / Timeline      │  │
│  └─────┬─────┘  └────────────────────────────┘  │
└────────┼────────────────────────────────────────┘
         │ SSE (streaming)
┌────────▼────────────────────────────────────────┐
│  Express Server (src/server.ts)                  │
│  ├─ POST /api/chat      → agent conversation    │
│  ├─ POST /api/confirm   → execute bookings      │
│  └─ GET  /api/plan/:id  → plan status           │
├──────────────────────────────────────────────────┤
│  Agent Core (src/agent/)                         │
│  ├─ LLM client (OpenAI-compatible)              │
│  ├─ Tool dispatch loop                           │
│  ├─ Planning strategy (system prompt)            │
│  └─ Conversation history manager                 │
├──────────────────────────────────────────────────┤
│  Tools (src/tools/)                              │
│  ├─ search_restaurants  (筛选餐厅)               │
│  ├─ search_activities   (搜索活动/景点)          │
│  ├─ check_availability  (查询座位/门票)          │
│  ├─ book_restaurant     (预订餐厅)               │
│  ├─ book_activity       (预订活动)               │
│  ├─ order_delivery      (外卖/蛋糕/鲜花配送)     │
│  ├─ get_route           (路线规划)               │
│  └─ get_weather         (天气查询)               │
├──────────────────────────────────────────────────┤
│  Mock Data (src/mock/)                           │
│  ├─ restaurants.json (20+ restaurants)           │
│  ├─ activities.json  (15+ activities)            │
│  └─ venues.json      (parks, malls, etc.)        │
└──────────────────────────────────────────────────┘
```

### Key Decisions

- **TypeScript + Express** — matches available runtime, type safety for tool schemas
- **Vercel AI SDK** — tool-calling + streaming内置，`stopWhile: stepCountIs(N)` 消除手写Agent循环
- **DeepSeek V4** (主LLM) — 中文能力强，成本极低，支持Function Calling，可通过`MODEL`环境变量切换
- **Supervisor + 专家Agent** — 多Agent架构（规划/搜索/执行），代码可控
- **SSE streaming** — `streamText` 开箱即用
- **Vanilla HTML/CSS frontend** — zero frontend build step, fast to iterate
- **真实北京POI + Mock预订** — 搜索层真实数据，预订层模拟
- **In-memory state** — 简单状态机（规划→确认→出行→完成）

---

## Step 1: Project Scaffold

**Goal:** Runnable Express server with TypeScript, dev tooling.

### Context Brief
Greenfield project. No existing code. Node.js v24.13.0 and npm 11.6.2 available. Create the foundation all subsequent steps build on.

### Tasks
- [ ] `npm init -y`, install deps: `express`, `ai`, `@ai-sdk/openai`, `zod`, `dotenv`
- [ ] Install dev deps: `typescript`, `tsx`, `@types/express`, `@types/node`
- [ ] `tsconfig.json` — strict mode, ES2022 target, outDir `./dist`
- [ ] Directory structure:
  ```
  src/
    server.ts          # Express entry
    agent/
      index.ts         # Agent orchestrator
      planner.ts       # Planning strategy & system prompt
      executor.ts      # Confirmation & booking execution
    tools/
      definitions.ts   # Tool schemas (OpenAI function calling format)
      handlers.ts      # Tool implementations
    mock/
      data.ts          # Mock data generators
      restaurants.ts   # Restaurant mock data
      activities.ts    # Activity mock data
    types.ts           # Shared types
  public/
    index.html         # Chat UI
    style.css          # Styles
    app.js             # Frontend logic
  ```
- [ ] `src/server.ts` — Express app serving static files + `/api/health` endpoint
- [ ] `.env.example` with `OPENAI_API_KEY` (DeepSeek key), `OPENAI_BASE_URL` (DeepSeek endpoint), and `MODEL` placeholders
- [ ] In-memory plan store: `Map<sessionId, Plan>` (initialized in server, used by Steps 6-7)
- [ ] npm scripts: `"dev": "tsx src/server.ts"`, `"build": "tsc"`

### Verification
```bash
npm run dev    # server starts on localhost:3000
curl localhost:3000/api/health   # → { "status": "ok" }
```

### Exit Criteria
Server starts, health endpoint responds, TypeScript compiles without errors.

---

## Step 2: Mock Data Layer

**Goal:** Realistic Chinese restaurant, activity, and venue mock data.

Depends on: Step 1

### Context Brief
The mock data must feel real to judges. Chinese names, addresses, prices, ratings, business hours, dietary tags. Data should cover both family and friends scenarios naturally.

### Tasks
- [ ] `src/types.ts` — TypeScript interfaces: `Restaurant`, `Activity`, `Venue`, `Booking`, `Plan`, `PlanItem`, `UserProfile`
- [ ] `src/mock/restaurants.ts` — 20+ restaurants with:
  - Chinese names (e.g., "外婆家", "西贝莜面村", "海底捞")
  - Cuisines, price ranges, ratings, business hours
  - Dietary tags (diet-friendly, kid-friendly, group-friendly)
  - Location (distance from home), wait time, availability
- [ ] `src/mock/activities.ts` — 15+ activities with:
  - Types: 亲子乐园, 展览, citywalk, 电影, 密室逃脱, KTV, 公园, 游乐场
  - Duration, price, age restrictions, group size suitability
  - Time slots, ticket availability
- [ ] `src/mock/data.ts` — Aggregated data with helper functions (search, filter by criteria). 使用真实北京POI数据（真实名称、地址、评分）+ 模拟库存

### Verification
```bash
npx tsx -e "import {searchRestaurants} from './src/mock/data'; console.log(searchRestaurants({dietFriendly: true}).length)"
# Should print a positive number
```

### Exit Criteria
Mock data loads, search/filter helpers return sensible results for both family and friends queries.

---

## Step 3: Tool Definitions & Handlers

**Goal:** All agent tools defined and functional with mock data.

Depends on: Step 2

### Context Brief
These are the tools the LLM will call. Each tool has a JSON schema (for the LLM) and a handler function (that queries mock data). Tools must cover the full flow: search -> check -> book.

### Tasks
- [ ] `src/tools/definitions.ts` — Vercel AI SDK Zod tool schemas:
  - `search_restaurants(cuisine, priceRange, dietary, kidFriendly, groupSize, distance, timeSlot)`
  - `search_activities(type, ageRange, groupSize, duration, distance, timeSlot)`
  - `check_availability(restaurantId/activityId, date, timeSlot, partySize)`
  - `book_restaurant(restaurantId, date, timeSlot, partySize, specialRequests)`
  - `book_activity(activityId, date, timeSlot, partySize)`
  - `order_delivery(item, deliveryTime, deliveryLocation)` — for cake, flowers, etc.
  - `get_route(locations)` — returns travel times between stops
  - `get_weather(date, location)` — weather for outdoor activity planning
- [ ] `src/tools/handlers.ts` — Handler for each tool:
  - Parses LLM arguments
  - Calls mock data layer
  - Returns structured results (not just strings)
- [ ] Tool registry: maps tool name -> { schema, handler }

### Verification
```bash
npx tsx -e "
import {toolRegistry} from './src/tools/handlers';
console.log(Object.keys(toolRegistry));  // lists all 8 tools
"
```

### Exit Criteria
All 8 tools registered, each returns realistic structured data when called with test arguments.

---

## Step 4: Agent Core — LLM Client & Tool Loop

**Goal:** Working agent that can converse and call tools.

Depends on: Step 3

### Context Brief
This is the agent's "brain." It sends messages to the LLM, receives tool calls, executes them, feeds results back, and continues until the LLM produces a final answer. Must support streaming.

### Tasks
- [ ] `src/agent/index.ts` — Supervisor Agent（使用Vercel AI SDK `streamText` + `stopWhile: stepCountIs(N)`）:
  - `chat(userMessage, sessionId)` -> async generator yielding SSE events
  - 调度子Agent：搜索Agent、执行Agent
  - Maintains per-session conversation history
  - System prompt injection
  - Stream tokens to caller as they arrive
- [ ] `src/agent/search.ts` — 搜索Agent（搜索活动+餐厅）
- [ ] `src/agent/executor.ts` — 执行Agent（预订+下单）
- [ ] LLM client: DeepSeek V4 via `@ai-sdk/openai` with custom baseURL
- [ ] SSE event types: `token` (streaming text), `tool_call` (tool being invoked), `plan_ready` (structured plan output), `error`
- [ ] `src/test-agent.ts` — Standalone test script: instantiates agent, sends a test message, prints tool calls and response to stdout. Used for Steps 4-6 verification before API routes exist.

### Verification
```bash
npx tsx src/test-agent.ts "帮我安排一个家庭下午出游计划"
# Should print: tool calls made, their results, and final agent response
```

### Exit Criteria
`test-agent.ts` runs, agent makes multiple tool calls in sequence, and returns a coherent Chinese response.

---

## Step 5: Planning Strategy & System Prompt

**Goal:** Agent produces methodical, realistic plans — not random suggestions.

Depends on: Step 4

### Context Brief
The system prompt is the single most important piece for demo quality. It must guide the LLM to: (1) understand the user's group composition, (2) search methodically, (3) build a time-sequenced itinerary, (4) present it as a structured plan with confirm button.

### Tasks
- [ ] `src/agent/planner.ts` — System prompt (in Chinese) instructing the agent to (Plan-and-Solve模式):
  1. **Clarify** — Extract group type (家庭/朋友/情侣/团建/Solo), group size, constraints (diet, age), time window, location preference
  2. **Research** — Search activities first (determines timing), then restaurants nearby
  3. **Optimize** — Check availability, minimize travel time, respect dietary/age constraints
  4. **Present** — Output a structured plan as JSON (time slots, venues, costs, reasons)
  5. **Execute** — Wait for user confirmation, then book everything
- [ ] Structured plan output format:
  ```json
  {
    "title": "周六下午家庭出游计划",
    "items": [
      { "time": "14:00-15:30", "activity": "...", "venue": "...", "cost": "...", "reason": "..." },
      { "time": "16:00-17:30", "activity": "...", "venue": "...", "cost": "...", "reason": "..." }
    ],
    "totalCost": "xxx",
    "totalDuration": "5.5小时",
    "notes": ["...", "..."]
  }
  ```
- [ ] Inject few-shot examples for all 5 scenarios (家庭/朋友/情侣/团建/Solo) in the system prompt

### Verification
```bash
npx tsx src/test-agent.ts "今天下午想带5岁的孩子和老婆出去玩，老婆在减肥"
npx tsx src/test-agent.ts "和3个朋友下午出去玩，2男2女"
npx tsx src/test-agent.ts "想和女朋友约个会，下午有空"
npx tsx src/test-agent.ts "部门团建8个人，预算人均200"
npx tsx src/test-agent.ts "一个人下午没事，想出去转转"
```

### Exit Criteria
Agent produces time-sequenced plans tailored to each scenario, with correct dietary/age/group accommodations.

---

## Step 6: Confirmation & Execution Flow

**Goal:** User confirms plan, agent executes bookings, shows status.

Depends on: Step 5

### Context Brief
The "one-click execution" is the key differentiator. After the user says "确认", the agent calls all booking tools in sequence and reports success/failure for each item.

### Tasks
- [ ] `src/agent/executor.ts` — Plan execution:
  - Parse user confirmation from conversation
  - Execute bookings in time order
  - Return per-item status (success/pending/failed)
  - Generate a shareable plan summary text following this template:
    ```
    搞定了！下午2点出发，计划如下：
    14:00-15:30 亲子乐园 @ XX mall（适合5岁小朋友）
    16:00-17:30 晚餐 @ 外婆家（有低卡菜品，已预约4人位）
    预估总花费：约380元
    所有预订已确认，直接出发就行！
    ```
- [ ] In-memory plan store: `Map<sessionId, Plan>` (initialized in server.ts, imported here)
- [ ] Confirmation detection: LLM recognizes "确认/好的/就这样/没问题" as confirmation trigger
- [ ] Error simulation: some mock bookings randomly "fail" to demonstrate error handling

### Verification
```bash
# First generate a plan, then confirm
npx tsx src/test-agent.ts "确认"
# Should print booking results (success/fail per item) + shareable plan text
```

### Exit Criteria
Full confirm -> book -> status flow works. Plan summary text is generated in shareable format.

---

## Step 7: Backend API Routes

**Goal:** Express endpoints connecting frontend to agent.

Depends on: Step 6

### Context Brief
Three endpoints: chat (SSE streaming), confirm (POST), plan status (GET). Keep it minimal.

### Tasks
- [ ] `POST /api/chat` — SSE endpoint:
  - Accepts `{ message, sessionId }`
  - Streams agent responses as SSE events
- [ ] `POST /api/confirm` — Plan confirmation:
  - Accepts `{ sessionId }`
  - Executes plan, returns booking results
- [ ] `GET /api/plan/:sessionId` — Current plan status
- [ ] CORS middleware for local dev
- [ ] Error handling middleware

### Verification
```bash
curl -N -X POST localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"帮我安排家庭出游","sessionId":"test1"}'
# Should stream SSE events
```

### Exit Criteria
All three endpoints respond correctly. Chat streams tokens. Confirm returns booking results.

---

## Step 8: Web UI — Chat Shell

**Goal:** Working chat interface with SSE streaming.

Depends on: Step 7

### Context Brief
Get the basic chat working first: user types a message, sees a streamed response. No plan cards yet — just text. This separates the "does SSE work" concern from "does plan rendering work."

### Tasks
- [ ] `public/index.html` — Minimal page: chat area with message bubbles, text input, send button
- [ ] `public/style.css` — Base styling: message bubbles (user right, agent left), input area fixed at bottom
- [ ] `public/app.js` — SSE connection to `/api/chat`, streaming token rendering in message bubbles, loading indicator

### Verification
Open `localhost:3000` in browser -> type a message -> see streamed response appear token-by-token.

### Exit Criteria
Chat works end-to-end: user sends message, agent responds with streaming text in chat bubbles.

---

## Step 9: Web UI — Plan Cards & Actions

**Goal:** Full UI with plan visualization, confirm, and share.

Depends on: Step 8

### Context Brief
Now add the rich plan display on top of the working chat. This is where the demo impresses judges: timeline cards, one-click confirm, shareable plan text. Mobile-responsive since the scenario involves "handing the phone to someone."

### Tasks
- [ ] Plan display area (timeline cards below chat, rendered from structured plan JSON)
- [ ] Confirm button (appears when plan is ready, triggers `/api/confirm`)
- [ ] Share button (copies plan summary text from Step 6 template to clipboard)
- [ ] Toast notifications for booking results
- [ ] Meituan-inspired styling: brand yellow (#FFD100), card layout, animations
- [ ] Mobile-responsive (320px-428px viewport)

### Verification
Open `localhost:3000` -> type a message -> plan appears as timeline cards -> confirm -> booking results show -> share copies text.

### Exit Criteria
Full end-to-end flow works in browser. Both family and friends scenarios produce visible, interactive plans with working confirm and share.

---

## Step 10: Integration Testing & Polish

**Goal:** Both demo scenarios work flawlessly end-to-end.

Depends on: Step 9

### Context Brief
Final quality gate before the design document. Both scenarios must flow smoothly: input -> plan -> confirm -> bookings -> share.

### Tasks
- [ ] Test family scenario: "今天下午有空，想带5岁孩子和老婆出去，老婆最近在减肥，别太远"
- [ ] Test friends scenario: "下午和3个朋友出去玩，4个人2男2女，安排一下"
- [ ] Fix any issues found during testing
- [ ] Add loading states and transition animations
- [ ] Handle edge cases: empty results, all slots full, weather turns bad
- [ ] Session reset / "new conversation" button
- [ ] Mobile viewport testing (browser DevTools)

### Verification
Both scenarios run cleanly from input to shareable plan summary without errors.

### Exit Criteria
Zero console errors. Both scenarios produce complete, sensible plans. UI feels responsive and polished.

---

## Step 11: Design Document

**Goal:** 2-page design doc covering planning strategy, tool call chain, error handling.

Depends on: Step 10

### Context Brief
Required deliverable. Must be concise (<=2 pages) and cover three specific topics. Written in Chinese.

### Tasks
- [ ] Create `docs/design.md` covering:
  1. **Planning策略** — How the agent breaks down a goal into steps, prioritizes venues, handles constraints
  2. **工具调用链路** — The typical tool call sequence with diagram
  3. **异常处理机制** — How failures are handled: retry, fallback, user notification
- [ ] Include architecture diagram (ASCII or embedded image)
- [ ] Keep to <=2 pages

### Verification
Document exists, covers all three required sections, fits within 2 pages.

### Exit Criteria
Design document is complete, in Chinese, and meets the deliverable requirements.

---

## Dependency Graph

```
Step 1 (Scaffold)
  └→ Step 2 (Mock Data)
       └→ Step 3 (Tools)
            └→ Step 4 (Agent Core)
                 └→ Step 5 (Planning Strategy)
                      └→ Step 6 (Execution Flow)
                           └→ Step 7 (Backend API)
                                └→ Step 8 (Chat Shell)
                                     └→ Step 9 (Plan Cards & Actions)
                                          └→ Step 10 (Integration)
                                               └→ Step 11 (Design Doc)
```

All steps are serial. No parallelism — each step directly builds on the previous.

## Total: 11 Steps

---

## Mutation Protocol

If you need to change the plan mid-execution:

- **Skip a step:** Mark it `[SKIPPED]` with reason. Verify dependent steps still work.
- **Split a step:** Create Step N-a and N-b. Both must have their own exit criteria.
- **Insert a step:** Insert between existing steps. Update dependency references.
- **Abandon:** Mark remaining steps `[ABANDONED]` with reason. Note what's already done.

All mutations should be noted in this file with a timestamp.
