你现在作为美团 AI Hackathon 严格评委，对当前项目做最终提交前复审。不要修改代码，只输出审查报告。

请重点检查：

1. P0 是否完全修复：
- platformGMV 是否只等于 totalSpend，不把 estimatedSaving 加入 GMV。
- revision 后 constraintExplanation 是否更新。
- couple / solo / team 是否不会误走 family 逻辑。
- 相关单测和 E2E 是否覆盖。

2. P1 / P1.5 / P1.6 是否真正提升评委可见性：
- 主区域是否直接展示“为什么适合你”。
- 有恢复时是否直接展示“系统已自动补救”。
- 恢复卡是否包含四个字段：原问题、系统动作、恢复结果、保留约束。
- booking_complete 后是否展示“美团闭环转化”。
- 卡片顺序是否合理：方案卡 → 为什么适合你 → 系统已自动补救（如有）→ 美团闭环转化 → 确认卡。
- 是否仍需要深度滚动才能看到核心卖点。
- Agent 执行明细是否从一开始展示完整 7 阶段：
  需求解析、活动搜索、餐厅搜索、路线计算、方案校验、预订执行、分享生成。

3. 现场演示风险：
- 哪些输入可能触发正则误判？
- 哪些 UI 状态可能让评委看不到亮点？
- 哪些地方看起来像硬编码或假 AI？
- 哪些 E2E 没覆盖？
- 哪些地方可能在现场翻车？

4. 按四个评审维度重新评分：
- 创新性 /25
- 完整性 /25
- 应用效果 /25
- 商业价值 /25
- 总分 /100

5. 给出最后提交前剩余问题：
- P0：不修会明显扣分
- P1：修了明显加分
- P2：锦上添花

要求：
- 必须严格，不要鼓励式废话。
- 必须给出文件路径和函数名证据。
- 如果只是文档写了但代码没有，要标注“文档声称存在但代码证据不足”。
- 如果代码有但 UI 不明显，要标注“工程实现存在但评委不可感知”。
- 不要修改代码。# 美团 AI Hackathon 赛题 06 — 最终提交前复审报告

> 审查时间：2026-06-02 | 审查范围：全量代码 + tsc clean + 184 单测全绿 + E2E 审查
> 审查立场：严格评委标准，零容忍假数据、硬编码、缺链路。本轮只审不改。

---

## 一、P0 修复验证

### P0-1: platformGMV 计算是否修正

**状态：已修复**

证据 `src/agent/closed-loop.ts:1002`:
```typescript
platformGMV: totalSpend,
```

`totalSpend` = 活动费用 + 餐厅费用，不再加 `estimatedSaving`。正确。

测试覆盖：
- `src/__tests__/business-realism.test.ts:126` — `platformGMV > 0`
- `src/__tests__/plan-revision.test.ts:455-495` — budget_adjust 后 GMV 下降断言

**判定：通过。**

### P0-2: revision 后 constraintExplanation 是否更新

**状态：已修复**

证据 `src/agent/demo.ts:64-73`:
```typescript
const revActivityItem = revResult.plan.items.find(i => i.venueId.startsWith('a') && i.bookingRequired);
const revRestaurantItem = revResult.plan.items.find(i => i.venueId.startsWith('r'));
const revActivity = revActivityItem ? getActivityById(revActivityItem.venueId) : undefined;
const revRestaurant = revRestaurantItem ? getRestaurantById(revRestaurantItem.venueId) : undefined;
const revExplanation = (revActivity && revRestaurant)
  ? buildConstraintExplanation(userMessage, constraints, revActivity, revRestaurant, revResult.trace)
  : undefined;

yield { type: 'plan_ready', plan: revResult.plan, constraintExplanation: revExplanation, ... };
```

修改后 `plan_ready` 事件包含基于新活动/餐厅重建的 `constraintExplanation`。正确。

**测试覆盖缺口：** 没有单测断言 `constraintExplanation` 在 revision 后引用新餐厅名称。`src/__tests__/plan-revision.test.ts` 只测试了 `plan.items`、`shareText`、`businessConversion` 的替换，没有测试 `constraintExplanation` 字段。

**判定：逻辑已修复，但缺少专门断言。建议补充 1 个测试。**

### P0-3: couple / solo / team 是否不误走 family

**状态：已修复**

证据 `src/agent/closed-loop.ts:198-216` `extractConstraints()`:

```typescript
const family = /老婆|孩子|亲子|家庭|减肥/.test(input);
const couple = /情侣|约会|女朋友|男朋友|对象|二人世界|两个人.*浪漫|纪念日|恋爱/.test(input) && !family;
const friends = !couple && /朋友|2\s*男\s*2\s*女|4\s*个|四个|群聊/.test(input);
const solo = /自己|一个人|独自|单人|随便逛|自己转|独行|一个人.*出去/.test(input) && !family && !couple;
const team = /团建|团队|公司|部门|同事|聚会.*人|十.*人|几个.*人/.test(input) && !family && !couple;
```

优先级链：family > couple > friends > solo > team > fallback(friends)。`couple` 和 `solo`、`team` 均排除 `family`。`couple` 排除在 `friends` 之前。

实测验证（13 条输入）：
| 输入 | 期望 | 实际 | 结果 |
|------|------|------|------|
| 想和女朋友约个会 | couple | couple | OK |
| 和对象出去 | couple | couple | OK |
| 和男朋友约会 | couple | couple | OK |
| 自己一个人出去 | solo | solo | OK |
| 一个人随便逛 | solo | solo | OK |
| 公司团建 | team | team | OK |
| 部门聚餐十来个人 | team | team | OK |
| 闺蜜两人逛街吃饭 | friends | friends | OK |

**单元测试覆盖：** `closed-loop-agent.test.ts:289-355` — couple/solo/team 各有 3 个测试（识别、无儿童约束、分享文案），共 9 个。

**E2E 覆盖缺口：** E2E 仍然只覆盖 family 和 friends。couple/solo/team 无 E2E 测试。评委点击"情侣约会"chip 后的行为未经 Playwright 验证。

**判定：后端逻辑已修复，单测覆盖。E2E 未覆盖是残留风险。**

---

## 二、P1 评委可见性验证

### 2.1 主区域是否直接展示"为什么适合你"

**状态：已实现**

证据 `public/app.js:862-878` `buildMainConstraintCardHtml()` — 标题为"为什么适合你"，显示场景标签 + 4 条规则。

插入时机 `public/app.js:1195-1197`:
```javascript
if (data.constraintExplanation) {
  planArea.insertAdjacentHTML('beforeend', buildMainConstraintCardHtml(data.constraintExplanation));
}
```

`plan_ready` 事件触发后直接插入 `planArea`（主区域），不需要滚动侧边栏。

**判定：通过。但注意"为什么适合你"卡片在 plan 卡片下方，如果方案卡很长，仍需轻微滚动。**

### 2.2 有恢复时是否直接展示"系统已自动补救"

**状态：已实现**

证据 `public/app.js:880-898` `buildMainRecoveryCardHtml()`:
- 标题"系统已自动补救"
- 四个字段：原问题、系统动作、恢复结果、保留约束

插入时机 `public/app.js:1215`:
```javascript
insertMainCardsAfterPlan(state.currentConstraint, data.recoveryStory, data.businessConversion);
```

仅在 `recoveryData.hasRecovery === true` 时渲染。

**四字段检查：**
| 字段 | 代码位置 | 内容 |
|------|----------|------|
| 原问题 | `app.js:890` | `failed.action` |
| 系统动作 | `app.js:891` | `recovered.action` |
| 恢复结果 | `app.js:894` | badge "预订成功"/"等待确认" |
| 保留约束 | `app.js:895` | badge "预算不变/路程未超限/饮食偏好保留" |

**判定：四字段完整。但第三、四字段是硬编码 badge，不是动态从恢复结果中提取。如果恢复后预算实际改变了，badge 仍然显示"预算不变"——与事实不符。标注：工程实现存在但内容部分硬编码。**

### 2.3 booking_complete 后是否展示"美团闭环转化"

**状态：已实现**

证据 `public/app.js:901-928` `buildMainConversionCardHtml()` — 标题"美团闭环转化"，显示 GMV、商户明细、可选增购、预计节省。

插入时机同上 `app.js:1215`。

### 2.4 卡片顺序是否合理

**代码执行顺序** (`public/app.js:1209-1216`):

```
1. renderSinglePlan(data.plan)          — 方案卡
2. showBookingResults(data.results)     — 方案卡内追加预订状态
3. insertMainCardsAfterPlan(...)        — 插入三张卡片:
   a. 为什么适合你 (constraint)
   b. 系统已自动补救 (recovery, 仅 hasRecovery)
   c. 美团闭环转化 (conversion)
4. renderConfirmationCard(...)          — 确认卡
```

**实际 DOM 顺序：** 方案卡 → 预订状态 → 为什么适合你 → 系统已自动补救(如有) → 美团闭环转化 → 确认卡

**判定：顺序合理。但注意：三张卡片在 booking_complete 后才出现，plan_ready 时只有"为什么适合你"。**

### 2.5 是否仍需深度滚动

**plan_ready 阶段：** 方案卡 + "为什么适合你" — 无需滚动侧边栏，主区域可见。

**booking_complete 阶段：** 方案卡(已更新) + 预订状态 + 三张卡片 + 确认卡 — 在 1920x1080 屏幕上需要约 1-2 次滚动才能看到确认卡。

**移动端：** 侧边栏需手动点击"详情"展开。主区域卡片全部在 planArea 内，无需展开侧边栏。

**判定：比上轮明显改善。核心卖点不再藏在侧边栏。但 confirmation card 在最底部，评委可能需要滚动。**

### 2.6 Agent 执行明细 — 7 阶段是否完整展示

**状态：已实现**

证据 `public/app.js:102-110` `STAGE_DEFS`:
```
需求解析(intent) → 活动搜索(activity_search) → 餐厅搜索(restaurant_search)
→ 路线计算(route) → 方案校验(validation) → 预订执行(booking) → 分享生成(share)
```

初始化时机 `public/app.js:560`:
```javascript
state.stages = createInitialStages();
setStageStatus('intent', 'running', '正在解析需求和出行场景');
```

在 `streamChat()` 调用时立即创建 7 个阶段（全部 pending，intent 设为 running）。不需要等工具返回。

E2E 验证 `tests/e2e/local-agent.spec.ts:284-294`:
```typescript
test('stage overview appears immediately with all seven stages', ...)
```

**判定：通过。7 阶段在用户发送消息后立即全部可见，状态随工具调用实时更新。**

---

## 三、现场演示风险

### 3.1 正则误判风险

**风险点 1：`减肥` 关键词导致 couple 误判为 family**

`extractConstraints()` 中 family 匹配规则：`/老婆|孩子|亲子|家庭|减肥/`

如果用户输入"和女朋友出去，她最近在减肥"，`减肥` 命中 family → scenario=family，partySize=3，shareAudience=wife。

**复现概率：中等。** "减肥"通常与"老婆"搭配，但"女朋友减肥"完全合理。

**文件：** `src/agent/closed-loop.ts:201`

**风险点 2："朋友"关键词太宽**

`detectFeedbackSource()` (`revision.ts:131`): `if (/朋友/.test(feedback)) return 'friend';`

如果用户说"老婆说朋友推荐的那家餐厅不好"，`朋友` 先命中 → feedbackSource='friend' → 分享文案变成"大家"而非"老婆"。

**复现概率：低。** 通常是单独说"老婆说"。

**风险点 3：默认 fallback 是 friends**

`extractConstraints()` 最后一行：`else { scenario = 'friends'; partySize = 4; }`

任何无法匹配的输入（"下午出去走走"、"找个地方坐坐"）都走 friends，partySize=4。评委输入一个模糊需求会看到"适合 4 人朋友局"。

**复现概率：中高。** 评委可能随意输入短句测试。

### 3.2 UI 状态风险

**风险点 1："再来一次"后 stages 未清空**

`window.newSession()` (`app.js:1306-1329`) 调用 `resetState()` → `state.stages = []`。但侧边栏的 `timelinePanel.innerHTML` 在 `resetSidebar()` 中被清空。下一轮 `prepareStagesForRequest()` 会重新 `createInitialStages()`。

**判定：无风险。**

**风险点 2：booking_complete 后方案卡被 renderSinglePlan 覆盖**

`app.js:1212`: `if (data.plan) renderSinglePlan(data.plan)` — 这会用 booking 后的 plan（可能含 replaced 标记）覆盖原始方案卡。

**风险点：** 如果恢复后 plan.title 变了，方案卡标题会变。这是正确行为，但评委可能困惑"标题怎么变了"。

### 3.3 看起来像假 AI 的地方

**风险点 1：Demo 模式无 LLM 调用**

`src/agent/demo.ts` 全文无 `streamText`、无 AI SDK import。所有响应是确定性代码。`sleep(600)` 模拟延迟。

**评委感知：** "正在搜索餐厅..."、"正在查询可用性..." 等工具指示器确实在流式展示（emitToolEvents 有 90ms/60ms 延迟），给了一定的"AI 在思考"感。但总时间约 2-3 秒，明显比真实 LLM 快。

**风险点 2：方案内容基于 Mock 数据**

100 个活动 + 100 个餐厅是北京真实 POI 名称（朝阳公园、三里屯等），评分和价格范围合理。但每次相同输入产生相同结果（确定性评分函数，无随机性）。

**评委感知：** 如果评委输入完全相同的需求两次，会得到完全相同的方案。这在 Demo 场景下可接受，但敏感的评委会注意到。

### 3.4 E2E 未覆盖的场景

| 场景 | 单测 | E2E | 风险 |
|------|------|-----|------|
| 家庭场景完整流程 | OK | OK | 无 |
| 朋友场景完整流程 | OK | OK | 无 |
| 情侣场景完整流程 | OK(3 tests) | 无 | **中** — 前端 chip 存在但未经 E2E 验证 |
| 单人场景完整流程 | OK(3 tests) | 无 | **中** |
| 团建场景完整流程 | OK(3 tests) | 无 | **中** |
| 餐厅恢复 + Mock 入口 | OK | OK | 无 |
| 餐厅太油 revision | OK | OK | 无 |
| 不想排队 revision | OK | OK | 无 |
| 路线太远外部反馈 | OK | OK | 无 |
| 老婆太油外部反馈 | OK | OK | 无 |
| 快改按钮 | OK | OK | 无 |
| 路线失败恢复 | 无专门测试 | 无 | **中** — 代码存在但未测试 |

### 3.5 现场可能翻车的地方

1. **评委输入"减肥"相关但非家庭场景** → family 误判 → 方案出现"儿童安全"约束 → 明显不合理
2. **评委连续两次完全相同输入** → 相同方案 → 质疑"这是不是硬编码"
3. **评委点击"情侣约会" chip → 方案正常但 E2E 未验证过 → 可能有未知前端 bug**
4. **Mock 失败恢复演示 → 如果 Mock 餐厅恰好是唯一可选的 → recovery 返回 null → 预订失败无恢复 → 评委看到"预订失败且未恢复成功"**

---

## 四、四维评分

### 创新性 /25 — **21 分**

| 加分项 | 分值 | 证据 |
|--------|------|------|
| 闭环执行（不是推荐，是预订） | +8 | `executeClosedLoopPlan()` 全自动预订 + 确认号 |
| 局部重规划（保留好的，替换差的） | +5 | `reviseClosedLoopPlan()` 4 种反馈类型 |
| 外部反馈来源检测 | +3 | `detectFeedbackSource()` wife/friend/group/child/self |
| 7 阶段时间线实时展示 | +2 | `STAGE_DEFS` + mutation-free state update |
| 失败恢复 + 故事叙述 | +3 | `recoverBookingFailure()` + `recoveryStory` 四字段 |

| 扣分项 | 分值 | 证据 |
|--------|------|------|
| 约束提取是正则不是 LLM | -2 | `extractConstraints()` 纯正则 |
| Demo 模式无真实 AI 推理 | -1 | `demo.ts` 无 AI SDK import |

### 完整性 /25 — **22 分**

| 加分项 | 分值 | 证据 |
|--------|------|------|
| 规划→校验→预订→分享→兜底全链路 | +8 | 11 个环节全部实现（第三节验证） |
| 5 种场景均后端区分 | +5 | couple/solo/team 评分函数 + 方案标签 + 分享文案 |
| 184 单测 + 12 E2E | +4 | `vitest run` 全绿 |
| 商业指标闭环 | +3 | GMV + 漏斗 + 优惠券 + 增购 |
| 约束解释 + 修改更新 | +2 | `buildConstraintExplanation` 修改后重建 |

| 扣分项 | 分值 | 证据 |
|--------|------|------|
| couple/solo/team 无 E2E 测试 | -2 | `tests/e2e/` 只有 family/friends |
| A/B 方案未实现 | -1 | `renderABPlans()` 有骨架但服务端不生成两套方案 |

### 应用效果 /25 — **20 分**

| 加分项 | 分值 | 证据 |
|--------|------|------|
| 主区域卡片提升（不再藏侧边栏） | +4 | `buildMainConstraintCardHtml` + `insertMainCardsAfterPlan` |
| 7 阶段立即展示 | +3 | `createInitialStages()` 在发送时立即调用 |
| 快改按钮 + Mock 失败入口 | +3 | 4 个 quick-revise + 1 个 demo-chip |
| 工具调用指示器 | +2 | `showToolIndicator()` 流式展示 |
| 分享文案受众感知 | +3 | wife/partner/friends/self 四种文案 |

| 扣分项 | 分值 | 证据 |
|--------|------|------|
| 恢复卡片第三、四字段部分硬编码 | -2 | `app.js:895` "预算不变"是固定文本 |
| confirmation card 需要滚动才能看到 | -1 | 在三张卡片之后 |
| constraintExplanation revision 无专门测试 | -2 | 逻辑已修但无断言保护 |

### 商业价值 /25 — **21 分**

| 加分项 | 分值 | 证据 |
|--------|------|------|
| GMV 计算已修正 | +4 | `platformGMV: totalSpend` |
| 漏斗转化（搜索→校验→预订→增购） | +3 | `conversionFunnel` 四阶段 |
| 优惠券 + 增购推荐 | +3 | `getCouponsForScenario()` + `getUpsellOptions()` |
| 确认卡（美团风格） | +3 | 确认号 + 取消政策 + 入场提示 |
| 团购/场景差异化增购 | +2 | family→低糖饮品, couple→鲜花, team→团购套餐 |

| 扣分项 | 分值 | 证据 |
|--------|------|------|
| 分享文案无美团 POI 链接 | -2 | 纯文本，无跳转 |
| 无真实支付/下单流程 | -1 | 全部 Mock |
| 优惠券未应用到 GMV 计算 | -1 | `estimatedSaving` 独立于 `platformGMV` |

### 总分

| 维度 | 得分 |
|------|------|
| 创新性 | 21/25 |
| 完整性 | 22/25 |
| 应用效果 | 20/25 |
| 商业价值 | 21/25 |
| **总计** | **84/100** |

相比上轮 78 分提升 6 分，主要来自：P0 GMV 修复（+2）、场景覆盖扩展（+2）、主区域卡片提升（+2）。

---

## 五、提交前剩余问题

### P0 — 不修会明显扣分

| # | 问题 | 文件 | 影响 | 修复量 |
|---|------|------|------|--------|
| 1 | **"减肥"关键词导致 couple 误判为 family** | `closed-loop.ts:201` | 评委输入"女朋友减肥"→ 方案出现儿童安全约束 | 1 行：从 family 正则移除 `减肥`，单独检测 |
| 2 | **恢复卡片"保留约束"badge 硬编码** | `app.js:895` | 恢复后预算实际变了仍显示"预算不变" | ~5 行：从 recoveryData 动态构建 |

### P1 — 修了明显加分

| # | 问题 | 文件 | 影响 | 修复量 |
|---|------|------|------|--------|
| 1 | **默认 fallback 是 friends (partySize=4)** | `closed-loop.ts:216` | 模糊输入得到 4 人方案 | 3 行：fallback 改为根据输入推断 |
| 2 | **couple/solo/team 无 E2E** | `tests/e2e/` | 评委点 chip 可能触发未测 bug | 3 个 E2E test |
| 3 | **constraintExplanation revision 无测试保护** | `plan-revision.test.ts` | 回归无检测 | 1 个 test |
| 4 | **Demo 模式 AI 感不足** | `demo.ts:32` | 所有响应 2-3 秒完成，像假 AI | 增大 sleep 或加打字机效果 |

### P2 — 锦上添花

| # | 问题 | 文件 | 影响 |
|---|------|------|------|
| 1 | 分享文案无美团 POI 链接 | `closed-loop.ts:782-798` | 无法直接跳转到商家 |
| 2 | A/B 方案未实现 | `router.ts` / `demo.ts` | 服务端不生成两套方案 |
| 3 | 路线失败恢复无专门测试 | `closed-loop-agent.test.ts` | 代码存在但无回归保护 |
| 4 | 相同输入产生相同结果 | `closed-loop.ts` scoring | 确定性评分，无随机性 |

---

## 附录 A：正则误判矩阵

| 用户输入 | 命中场景 | 是否正确 | 风险 |
|----------|----------|----------|------|
| "今天下午想带5岁孩子和老婆出去玩" | family | 正确 | 无 |
| "下午和3个朋友出去玩，4个人" | friends | 正确 | 无 |
| "想和女朋友约个会" | couple | 正确 | 无 |
| "和对象出去" | couple | 正确 | 无 |
| "自己一个人出去" | solo | 正确 | 无 |
| "公司团建" | team | 正确 | 无 |
| "和女朋友出去，她最近在减肥" | **family** (因为"减肥") | **错误** | **P0** |
| "下午出去走走" | friends (fallback) | 不确定 | P1 |
| "闺蜜两人逛街吃饭" | friends (fallback) | 不确定 | P1 |
| "老婆说朋友推荐的不好" → revision | feedbackSource=friend | **错误** (应为 wife) | P2 |

## 附录 B：代码行数统计

| 文件 | 行数 | 功能 |
|------|------|------|
| src/agent/closed-loop.ts | 1173 | 核心规划+执行引擎 |
| src/agent/revision.ts | 642 | 局部重规划 |
| src/agent/demo.ts | 149 | Demo 模式 Agent |
| src/agent/router.ts | 95 | 会话路由 |
| src/agent/planning.ts | ~120 | LLM 规划 Agent |
| src/agent/execution.ts | ~30 | 执行 Agent 入口 |
| public/app.js | 1345 | 前端 UI |
| public/style.css | ~600 | 样式 |
| src/__tests__/ (11 files) | ~1200 | 184 tests |
| tests/e2e/ (1 file) | 362 | 12 E2E tests |
| **总计** | ~4600 | |
