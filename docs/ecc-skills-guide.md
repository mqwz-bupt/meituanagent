# ECC Skills 完整使用指南与黑客松工作流

> 生成时间：2026-05-14
> 安装来源：Everything Claude Code (ECC) `2.0.0-rc.1`
> 本机位置：`C:\Users\hzn20\.codex`

这份文档按你当前 Codex 里已安装的 ECC skills 生成，不再使用超宽表格。
每个 skill 都有独立的用途、优点、局限和案例；长描述保持简短，方便在 Codex 里搜索。

## 当前安装状态

- 已安装 ECC skills：129 个。
- 已安装 ECC agents：63 个，位于 `C:\Users\hzn20\.codex\agents`。
- ECC slash commands：**不可用**。你这次是通过 fallback installer 安装的，安装状态里 `commands-core` 被跳过。所以 ECC 的 `/xxx` 命令不要当成可用功能。

## 怎么用

用自然语言点名 skill 即可，不要写成 slash command。

```text
使用 verification-loop skill，帮我对这个美团 Agent Demo 做发布前验收。
使用 product-capability skill，把这个项目包装成评委能快速理解的产品能力说明。
使用 e2e-testing skill，为 Web UI 写一条从输入需求到预订完成的端到端测试。
```

## 分类目录

### 黑客松高优先级（12）

`agent-architecture-audit` · `agent-harness-construction` · `agent-introspection-debugging` · `blueprint` · `e2e-testing` · `error-handling` · `eval-harness` · `product-capability` · `production-audit` · `tdd-workflow` · `verification-loop` · `workspace-surface-audit`

### Agent 架构与工作流（14）

`agent-sort` · `agentic-engineering` · `agentic-os` · `ai-first-engineering` · `claude-devfleet` · `continuous-agent-loop` · `continuous-learning` · `continuous-learning-v2` · `council` · `crosspost` · `nanoclaw-repl` · `prompt-optimizer` · `strategic-compact` · `token-budget-advisor`

### 测试、验证与质量（7）

`ai-regression-testing` · `iterative-retrieval` · `plankton-code-quality` · `quality-nonconformance` · `scientific-thinking-scholar-evaluation` · `skill-stocktake` · `swift-protocol-di-testing`

### 前端、设计与媒体（11）

`api-connector-builder` · `dashboard-builder` · `fal-ai-media` · `liquid-glass-design` · `manim-video` · `remotion-video-creation` · `swiftui-patterns` · `team-builder` · `ui-demo` · `video-editing` · `videodb`

### 产品、内容与增长（9）

`article-writing` · `brand-voice` · `connections-optimizer` · `content-engine` · `investor-materials` · `investor-outreach` · `lead-intelligence` · `seo` · `social-graph-ranker`

### 研究与信息检索（9）

`deep-research` · `exa-search` · `market-research` · `research-ops` · `scientific-db-pubmed-database` · `scientific-db-uspto-database` · `scientific-pkg-gget` · `scientific-thinking-literature-review` · `search-first`

### 后端、API 与集成（5）

`code-tour` · `configure-ecc` · `hookify-rules` · `regex-vs-llm-structured-text` · `skill-scout`

### 数据库与数据层（6）

`clickhouse-io` · `content-hash-cache-pattern` · `data-scraper-agent` · `database-migrations` · `mysql-patterns` · `postgres-patterns`

### 安全与合规（14）

`customs-trade-compliance` · `defi-amm-security` · `django-security` · `healthcare-phi-compliance` · `hipaa-compliance` · `laravel-security` · `llm-trading-agent-security` · `perl-security` · `quarkus-security` · `ralphinho-rfc-pipeline` · `security-bounty-hunter` · `security-review` · `security-scan` · `springboot-security`

### DevOps、网络与运维（26）

`automation-audit-ops` · `autonomous-loops` · `cisco-ios-patterns` · `cost-aware-llm-pipeline` · `cost-tracking` · `customer-billing-ops` · `deployment-patterns` · `docker-patterns` · `ecc-tools-cost-audit` · `email-ops` · `enterprise-agent-ops` · `finance-billing-ops` · `github-ops` · `google-workspace-ops` · `homelab-network-readiness` · `homelab-network-setup` · `jira-integration` · `knowledge-ops` · `messages-ops` · `netmiko-ssh-automation` · `network-bgp-diagnostics` · `network-config-validation` · `network-interface-health` · `project-flow-ops` · `terminal-ops` · `unified-notifications-ops`

### 行业领域与供应链（6）

`carrier-relationship-management` · `energy-procurement` · `inventory-demand-planning` · `logistics-exception-management` · `production-scheduling` · `returns-reverse-logistics`

### 语言与框架专项（6）

`foundation-models-on-device` · `jpa-patterns` · `nodejs-keccak256` · `swift-actor-persistence` · `swift-concurrency-6-2` · `x-api`

### 通用与其他（4）

`evm-token-decimals` · `nutrient-document-processing` · `visa-doc-translate` · `windows-desktop-e2e`

## Skills 详解

### 黑客松高优先级

直接服务你的黑客松交付：计划、Agent 架构、工具链、测试、Demo 和验收。

#### agent-architecture-audit

- **定位**：Full-stack diagnostic for agent and LLM applications. Audits the 12-layer agent stack for wrapper regression, memory pollution, tool discipline failures, hidden repair loops, and rendering corruption. Produces severity-ranked findings with code-first fixes....
- **怎么用**：使用 agent-architecture-audit skill，帮我对美团黑客松项目完成一次可交付的检查或改进。
- **优点**：让 agent-architecture-audit 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：agent-architecture-audit 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：审查你的美团 Agent 是否有规划层、工具层、执行层和可观测事件。

#### agent-harness-construction

- **定位**：Design and optimize AI agent action spaces, tool definitions, and observation formatting for higher completion rates.
- **怎么用**：使用 agent-harness-construction skill，帮我对美团黑客松项目完成一次可交付的检查或改进。
- **优点**：对 agent-harness-construction 这类任务能提供比通用提示词更稳定的结构。
- **局限**：agent-harness-construction 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：设计餐厅查询、排队、预约、下单等 Tool 的输入输出结构。

#### agent-introspection-debugging

- **定位**：Structured self-debugging workflow for AI agent failures using capture, diagnosis, contained recovery, and introspection reports.
- **怎么用**：使用 agent-introspection-debugging skill，帮我对美团黑客松项目完成一次可交付的检查或改进。
- **优点**：能把 agent-introspection-debugging 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：agent-introspection-debugging 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：调试“方案看起来对，但预订步骤没有发生”这类 Agent 故障。

#### blueprint

- **定位**：Turn a one-line objective into a step-by-step construction plan for multi-session, multi-agent engineering projects. Each step has a self-contained context brief so a fresh agent can execute it cold. Includes adversarial review gate, dependency graph, paral...
- **怎么用**：使用 blueprint skill，帮我对美团黑客松项目完成一次可交付的检查或改进。
- **优点**：当 blueprint 涉及多个文件或多个决策点时，它能帮你维持上下文一致。
- **局限**：blueprint 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：从零拆出项目路线：场景建模、Tools、Planner、UI、Mock API、测试和文档。

#### e2e-testing

- **定位**：Playwright E2E testing patterns, Page Object Model, configuration, CI/CD integration, artifact management, and flaky test strategies.
- **怎么用**：使用 e2e-testing skill，帮我对美团黑客松项目完成一次可交付的检查或改进。
- **优点**：对 e2e-testing 这类任务能提供比通用提示词更稳定的结构。
- **局限**：e2e-testing 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 Playwright 跑通“输入需求 -> 生成方案 -> 确认 -> 预订 -> 分享”的完整流程。

#### error-handling

- **定位**：Patterns for robust error handling across TypeScript, Python, and Go. Covers typed errors, error boundaries, retries, circuit breakers, and user-facing error messages.
- **怎么用**：使用 error-handling skill，帮我对美团黑客松项目完成一次可交付的检查或改进。
- **优点**：能把 error-handling 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：error-handling 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：把餐厅无位、活动已满、下单失败等情况做成可见的降级方案。

#### eval-harness

- **定位**：Formal evaluation framework for Claude Code sessions implementing eval-driven development (EDD) principles
- **怎么用**：使用 eval-harness skill，帮我对美团黑客松项目完成一次可交付的检查或改进。
- **优点**：能为 eval-harness 补上专门的风险视角，避免只看功能不看交付。
- **局限**：eval-harness 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：为家庭场景和朋友场景建立可重复的评分集，检查是否符合 benchmark.md。

#### product-capability

- **定位**：Translate PRD intent, roadmap asks, or product discussions into an implementation-ready capability plan that exposes constraints, invariants, interfaces, and unresolved decisions before multi-service work starts. Use when the user needs an ECC-native PRD-to...
- **怎么用**：使用 product-capability skill，帮我对美团黑客松项目完成一次可交付的检查或改进。
- **优点**：让 product-capability 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：product-capability 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：把项目表达成“本地短时活动规划与执行 Agent”的产品能力。

#### production-audit

- **定位**：Local-evidence production readiness audit for shipped apps, pre-launch reviews, post-merge checks, and "what breaks in prod?" questions without sending repo data to an external audit service.
- **怎么用**：使用 production-audit skill，帮我对美团黑客松项目完成一次可交付的检查或改进。
- **优点**：能把 production-audit 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：production-audit 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：提交前检查 Demo 启动、API、Mock 数据、错误态和文档是否可用。

#### tdd-workflow

- **定位**：Use this skill when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with 80%+ coverage including unit, integration, and E2E tests.
- **怎么用**：使用 tdd-workflow skill，帮我对美团黑客松项目完成一次可交付的检查或改进。
- **优点**：让 tdd-workflow 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：tdd-workflow 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：先写“减肥妈妈、五岁孩子、四人朋友局”的策略测试，再改 planner。

#### verification-loop

- **定位**：A comprehensive verification system for Claude Code sessions.
- **怎么用**：使用 verification-loop skill，帮我对美团黑客松项目完成一次可交付的检查或改进。
- **优点**：让 verification-loop 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：verification-loop 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：做最后验收：`npm test`、`npm run build`、手动 Demo 流程和 benchmark 对照。

#### workspace-surface-audit

- **定位**：Audit the active repo, MCP servers, plugins, connectors, env surfaces, and harness setup, then recommend the highest-value ECC-native skills, hooks, agents, and operator workflows. Use when the user wants help setting up Claude Code or understanding what ca...
- **怎么用**：使用 workspace-surface-audit skill，帮我对美团黑客松项目完成一次可交付的检查或改进。
- **优点**：让 workspace-surface-audit 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：workspace-surface-audit 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：检查项目里哪些文件、脚本、环境变量和工具是评委会看到的交付面。

### Agent 架构与工作流

用于设计、调试或组织 Agent 工作流，适合多步推理、工具调用和长任务。

#### agent-sort

- **定位**：Build an evidence-backed ECC install plan for a specific repo by sorting skills, commands, rules, hooks, and extras into DAILY vs LIBRARY buckets using parallel repo-aware review passes. Use when ECC should be trimmed to what a project actually needs instea...
- **怎么用**：使用 agent-sort skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 agent-sort 问题分解到输入、步骤、验收和输出，方便复盘。
- **局限**：agent-sort 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 agent-sort 检查或设计 Agent 的规划、工具调用和多步执行逻辑。

#### agentic-engineering

- **定位**：Operate as an agentic engineer using eval-first execution, decomposition, and cost-aware model routing.
- **怎么用**：使用 agentic-engineering skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 agentic-engineering 变成团队可共享的操作方法，不只是单次问答。
- **局限**：agentic-engineering 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 agentic-engineering 检查或设计 Agent 的规划、工具调用和多步执行逻辑。

#### agentic-os

- **定位**：Build persistent multi-agent operating systems on Claude Code. Covers kernel architecture, specialist agents, slash commands, file-based memory, scheduled automation, and state management without external databases.
- **怎么用**：使用 agentic-os skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 agentic-os 变成团队可共享的操作方法，不只是单次问答。
- **局限**：agentic-os 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 agentic-os 检查或设计 Agent 的规划、工具调用和多步执行逻辑。

#### ai-first-engineering

- **定位**：Engineering operating model for teams where AI agents generate a large share of implementation output.
- **怎么用**：使用 ai-first-engineering skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 ai-first-engineering 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：ai-first-engineering 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 ai-first-engineering 检查或设计 Agent 的规划、工具调用和多步执行逻辑。

#### claude-devfleet

- **定位**：Orchestrate multi-agent coding tasks via Claude DevFleet — plan projects, dispatch parallel agents in isolated worktrees, monitor progress, and read structured reports.
- **怎么用**：使用 claude-devfleet skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：当 claude-devfleet 涉及多个文件或多个决策点时，它能帮你维持上下文一致。
- **局限**：claude-devfleet 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 claude-devfleet 检查或设计 Agent 的规划、工具调用和多步执行逻辑。

#### continuous-agent-loop

- **定位**：Patterns for continuous autonomous agent loops with quality gates, evals, and recovery controls.
- **怎么用**：使用 continuous-agent-loop skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 continuous-agent-loop 变成团队可共享的操作方法，不只是单次问答。
- **局限**：continuous-agent-loop 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 continuous-agent-loop 检查或设计 Agent 的规划、工具调用和多步执行逻辑。

#### continuous-learning

- **定位**：[DEPRECATED - use continuous-learning-v2] Legacy v1 stop-hook skill extractor. v2 is a strict superset with instinct-based, project-scoped, hook-reliable learning. Do not invoke v1; route continuous learning, session learning, and pattern extraction request...
- **怎么用**：使用 continuous-learning skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 continuous-learning 这类任务能提供比通用提示词更稳定的结构。
- **局限**：continuous-learning 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 continuous-learning 检查或设计 Agent 的规划、工具调用和多步执行逻辑。

#### continuous-learning-v2

- **定位**：Instinct-based learning system that observes sessions via hooks, creates atomic instincts with confidence scoring, and evolves them into skills/commands/agents. v2.1 adds project-scoped instincts to prevent cross-project contamination.
- **怎么用**：使用 continuous-learning-v2 skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 continuous-learning-v2 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：continuous-learning-v2 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 continuous-learning-v2 检查或设计 Agent 的规划、工具调用和多步执行逻辑。

#### council

- **定位**：Convene a four-voice council for ambiguous decisions, tradeoffs, and go/no-go calls. Use when multiple valid paths exist and you need structured disagreement before choosing.
- **怎么用**：使用 council skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 council 的常见失误有预设检查点，能减少遗漏和返工。
- **局限**：council 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 council 检查或设计 Agent 的规划、工具调用和多步执行逻辑。

#### crosspost

- **定位**：Multi-platform content distribution across X, LinkedIn, Threads, and Bluesky. Adapts content per platform using content-engine patterns. Never posts identical content cross-platform. Use when the user wants to distribute content across social platforms.
- **怎么用**：使用 crosspost skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 crosspost 变成团队可共享的操作方法，不只是单次问答。
- **局限**：crosspost 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 crosspost 检查或设计 Agent 的规划、工具调用和多步执行逻辑。

#### nanoclaw-repl

- **定位**：Operate and extend NanoClaw v2, ECC's zero-dependency session-aware REPL built on claude -p.
- **怎么用**：使用 nanoclaw-repl skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 nanoclaw-repl 变成团队可共享的操作方法，不只是单次问答。
- **局限**：nanoclaw-repl 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 nanoclaw-repl 检查或设计 Agent 的规划、工具调用和多步执行逻辑。

#### prompt-optimizer

- **定位**：Analyze raw prompts, identify intent and gaps, match ECC components (skills/commands/agents/hooks), and output a ready-to-paste optimized prompt. Advisory role only — never executes the task itself. TRIGGER when: user says "optimize prompt", "improve my pro...
- **怎么用**：使用 prompt-optimizer skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 prompt-optimizer 问题分解到输入、步骤、验收和输出，方便复盘。
- **局限**：prompt-optimizer 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 prompt-optimizer 检查或设计 Agent 的规划、工具调用和多步执行逻辑。

#### strategic-compact

- **定位**：Suggests manual context compaction at logical intervals to preserve context through task phases rather than arbitrary auto-compaction.
- **怎么用**：使用 strategic-compact skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 strategic-compact 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：strategic-compact 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 strategic-compact 检查或设计 Agent 的规划、工具调用和多步执行逻辑。

#### token-budget-advisor

- **定位**：Offers the user an informed choice about how much response depth to consume before answering. Use this skill when the user explicitly wants to control response length, depth, or token budget. TRIGGER when: "token budget", "token count", "token usage", "toke...
- **怎么用**：使用 token-budget-advisor skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 token-budget-advisor 变成团队可共享的操作方法，不只是单次问答。
- **局限**：token-budget-advisor 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 token-budget-advisor 检查或设计 Agent 的规划、工具调用和多步执行逻辑。

### 测试、验证与质量

用于把质量要求变成可重复的测试、验收和回归流程。

#### ai-regression-testing

- **定位**：Regression testing strategies for AI-assisted development. Sandbox-mode API testing without database dependencies, automated bug-check workflows, and patterns to catch AI blind spots where the same model writes and reviews code.
- **怎么用**：使用 ai-regression-testing skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：当 ai-regression-testing 涉及多个文件或多个决策点时，它能帮你维持上下文一致。
- **局限**：ai-regression-testing 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 ai-regression-testing 把黑客松评审点转成可执行的检查或测试。

#### iterative-retrieval

- **定位**：Pattern for progressively refining context retrieval to solve the subagent context problem
- **怎么用**：使用 iterative-retrieval skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 iterative-retrieval 变成团队可共享的操作方法，不只是单次问答。
- **局限**：iterative-retrieval 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 iterative-retrieval 把黑客松评审点转成可执行的检查或测试。

#### plankton-code-quality

- **定位**：Write-time code quality enforcement using Plankton — auto-formatting, linting, and Claude-powered fixes on every file edit via hooks.
- **怎么用**：使用 plankton-code-quality skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 plankton-code-quality 补上专门的风险视角，避免只看功能不看交付。
- **局限**：plankton-code-quality 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 plankton-code-quality 把黑客松评审点转成可执行的检查或测试。

#### quality-nonconformance

- **定位**：Codified expertise for quality control, non-conformance investigation, root cause analysis, corrective action, and supplier quality management in regulated manufacturing. Informed by quality engineers with 15+ years experience across FDA, IATF 16949, and AS...
- **怎么用**：使用 quality-nonconformance skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 quality-nonconformance 的常见失误有预设检查点，能减少遗漏和返工。
- **局限**：quality-nonconformance 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 quality-nonconformance 把黑客松评审点转成可执行的检查或测试。

#### scientific-thinking-scholar-evaluation

- **定位**：Structured scholarly-work evaluation for papers, proposals, literature reviews, methods sections, evidence quality, citation support, and research-writing feedback.
- **怎么用**：使用 scientific-thinking-scholar-evaluation skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 scientific-thinking-scholar-evaluation 变成团队可共享的操作方法，不只是单次问答。
- **局限**：scientific-thinking-scholar-evaluation 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 scientific-thinking-scholar-evaluation 把黑客松评审点转成可执行的检查或测试。

#### skill-stocktake

- **定位**：Use when auditing Claude skills and commands for quality. Supports Quick Scan (changed skills only) and Full Stocktake modes with sequential subagent batch evaluation.
- **怎么用**：使用 skill-stocktake skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 skill-stocktake 补上专门的风险视角，避免只看功能不看交付。
- **局限**：skill-stocktake 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 skill-stocktake 把黑客松评审点转成可执行的检查或测试。

#### swift-protocol-di-testing

- **定位**：Protocol-based dependency injection for testable Swift code — mock file system, network, and external APIs using focused protocols and Swift Testing.
- **怎么用**：使用 swift-protocol-di-testing skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 swift-protocol-di-testing 的常见失误有预设检查点，能减少遗漏和返工。
- **局限**：swift-protocol-di-testing 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 swift-protocol-di-testing 把黑客松评审点转成可执行的检查或测试。

### 前端、设计与媒体

用于前端体验、视觉呈现、图像或视频类交付。

#### api-connector-builder

- **定位**：Build a new API connector or provider by matching the target repo's existing integration pattern exactly. Use when adding one more integration without inventing a second architecture.
- **怎么用**：使用 api-connector-builder skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：当 api-connector-builder 涉及多个文件或多个决策点时，它能帮你维持上下文一致。
- **局限**：api-connector-builder 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 api-connector-builder 改善 Web Demo 的视觉、交互或演示素材。

#### dashboard-builder

- **定位**：Build monitoring dashboards that answer real operator questions for Grafana, SigNoz, and similar platforms. Use when turning metrics into a working dashboard instead of a vanity board.
- **怎么用**：使用 dashboard-builder skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：当 dashboard-builder 涉及多个文件或多个决策点时，它能帮你维持上下文一致。
- **局限**：dashboard-builder 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 dashboard-builder 改善 Web Demo 的视觉、交互或演示素材。

#### fal-ai-media

- **定位**：Unified media generation via fal.ai MCP — image, video, and audio. Covers text-to-image (Nano Banana), text/image-to-video (Seedance, Kling, Veo 3), text-to-speech (CSM-1B), and video-to-audio (ThinkSound). Use when the user wants to generate images, videos...
- **怎么用**：使用 fal-ai-media skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 fal-ai-media 这类任务能提供比通用提示词更稳定的结构。
- **局限**：fal-ai-media 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 fal-ai-media 改善 Web Demo 的视觉、交互或演示素材。

#### liquid-glass-design

- **定位**：iOS 26 Liquid Glass design system — dynamic glass material with blur, reflection, and interactive morphing for SwiftUI, UIKit, and WidgetKit.
- **怎么用**：使用 liquid-glass-design skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 liquid-glass-design 的常见失误有预设检查点，能减少遗漏和返工。
- **局限**：liquid-glass-design 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 liquid-glass-design 改善 Web Demo 的视觉、交互或演示素材。

#### manim-video

- **定位**：Build reusable Manim explainers for technical concepts, graphs, system diagrams, and product walkthroughs, then hand off to the wider ECC video stack if needed. Use when the user wants a clean animated explainer rather than a generic talking-head script.
- **怎么用**：使用 manim-video skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 manim-video 这类任务能提供比通用提示词更稳定的结构。
- **局限**：manim-video 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 manim-video 改善 Web Demo 的视觉、交互或演示素材。

#### remotion-video-creation

- **定位**：Best practices for Remotion - Video creation in React. 29 domain-specific rules covering 3D, animations, audio, captions, charts, transitions, and more.
- **怎么用**：使用 remotion-video-creation skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：当 remotion-video-creation 涉及多个文件或多个决策点时，它能帮你维持上下文一致。
- **局限**：remotion-video-creation 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 remotion-video-creation 改善 Web Demo 的视觉、交互或演示素材。

#### swiftui-patterns

- **定位**：SwiftUI architecture patterns, state management with @Observable, view composition, navigation, performance optimization, and modern iOS/macOS UI best practices.
- **怎么用**：使用 swiftui-patterns skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：让 swiftui-patterns 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：swiftui-patterns 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 swiftui-patterns 改善 Web Demo 的视觉、交互或演示素材。

#### team-builder

- **定位**：Interactive agent picker for composing and dispatching parallel teams
- **怎么用**：使用 team-builder skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 team-builder 补上专门的风险视角，避免只看功能不看交付。
- **局限**：team-builder 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 team-builder 改善 Web Demo 的视觉、交互或演示素材。

#### ui-demo

- **定位**：Record polished UI demo videos using Playwright. Use when the user asks to create a demo, walkthrough, screen recording, or tutorial video of a web application. Produces WebM videos with visible cursor, natural pacing, and professional feel.
- **怎么用**：使用 ui-demo skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 ui-demo 这类任务能提供比通用提示词更稳定的结构。
- **局限**：ui-demo 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 ui-demo 改善 Web Demo 的视觉、交互或演示素材。

#### video-editing

- **定位**：AI-assisted video editing workflows for cutting, structuring, and augmenting real footage. Covers the full pipeline from raw capture through FFmpeg, Remotion, ElevenLabs, fal.ai, and final polish in Descript or CapCut. Use when the user wants to edit video,...
- **怎么用**：使用 video-editing skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 video-editing 这类任务能提供比通用提示词更稳定的结构。
- **局限**：video-editing 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 video-editing 改善 Web Demo 的视觉、交互或演示素材。

#### videodb

- **定位**：See, Understand, Act on video and audio. See- ingest from local files, URLs, RTSP/live feeds, or live record desktop; return realtime context and playable stream links. Understand- extract frames, build visual/semantic/temporal indexes, and search moments w...
- **怎么用**：使用 videodb skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 videodb 补上专门的风险视角，避免只看功能不看交付。
- **局限**：videodb 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 videodb 改善 Web Demo 的视觉、交互或演示素材。

### 产品、内容与增长

用于产品叙事、内容生产、投资人材料、增长和用户沟通。

#### article-writing

- **定位**：Write articles, guides, blog posts, tutorials, newsletter issues, and other long-form content in a distinctive voice derived from supplied examples or brand guidance. Use when the user wants polished written content longer than a paragraph, especially when ...
- **怎么用**：使用 article-writing skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 article-writing 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：article-writing 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 article-writing 准备路演文案、产品卖点或对外说明。

#### brand-voice

- **定位**：Build a source-derived writing style profile from real posts, essays, launch notes, docs, or site copy, then reuse that profile across content, outreach, and social workflows. Use when the user wants voice consistency without generic AI writing tropes.
- **怎么用**：使用 brand-voice skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：当 brand-voice 涉及多个文件或多个决策点时，它能帮你维持上下文一致。
- **局限**：brand-voice 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 brand-voice 准备路演文案、产品卖点或对外说明。

#### connections-optimizer

- **定位**：Reorganize the user's X and LinkedIn network with review-first pruning, add/follow recommendations, and channel-specific warm outreach drafted in the user's real voice. Use when the user wants to clean up following lists, grow toward current priorities, or ...
- **怎么用**：使用 connections-optimizer skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 connections-optimizer 的常见失误有预设检查点，能减少遗漏和返工。
- **局限**：connections-optimizer 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 connections-optimizer 准备路演文案、产品卖点或对外说明。

#### content-engine

- **定位**：Create platform-native content systems for X, LinkedIn, TikTok, YouTube, newsletters, and repurposed multi-platform campaigns. Use when the user wants social posts, threads, scripts, content calendars, or one source asset adapted cleanly across platforms.
- **怎么用**：使用 content-engine skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 content-engine 这类任务能提供比通用提示词更稳定的结构。
- **局限**：content-engine 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 content-engine 准备路演文案、产品卖点或对外说明。

#### investor-materials

- **定位**：Create and update pitch decks, one-pagers, investor memos, accelerator applications, financial models, and fundraising materials. Use when the user needs investor-facing documents, projections, use-of-funds tables, milestone plans, or materials that must st...
- **怎么用**：使用 investor-materials skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 investor-materials 补上专门的风险视角，避免只看功能不看交付。
- **局限**：investor-materials 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 investor-materials 准备路演文案、产品卖点或对外说明。

#### investor-outreach

- **定位**：Draft cold emails, warm intro blurbs, follow-ups, update emails, and investor communications for fundraising. Use when the user wants outreach to angels, VCs, strategic investors, or accelerators and needs concise, personalized, investor-facing messaging.
- **怎么用**：使用 investor-outreach skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 investor-outreach 补上专门的风险视角，避免只看功能不看交付。
- **局限**：investor-outreach 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 investor-outreach 准备路演文案、产品卖点或对外说明。

#### lead-intelligence

- **定位**：AI-native lead intelligence and outreach pipeline. Replaces Apollo, Clay, and ZoomInfo with agent-powered signal scoring, mutual ranking, warm path discovery, source-derived voice modeling, and channel-specific outreach across email, LinkedIn, and X. Use wh...
- **怎么用**：使用 lead-intelligence skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 lead-intelligence 问题分解到输入、步骤、验收和输出，方便复盘。
- **局限**：lead-intelligence 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 lead-intelligence 准备路演文案、产品卖点或对外说明。

#### seo

- **定位**：Audit, plan, and implement SEO improvements across technical SEO, on-page optimization, structured data, Core Web Vitals, and content strategy. Use when the user wants better search visibility, SEO remediation, schema markup, sitemap/robots work, or keyword...
- **怎么用**：使用 seo skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 seo 变成团队可共享的操作方法，不只是单次问答。
- **局限**：seo 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 seo 准备路演文案、产品卖点或对外说明。

#### social-graph-ranker

- **定位**：Weighted social-graph ranking for warm intro discovery, bridge scoring, and network gap analysis across X and LinkedIn. Use when the user wants the reusable graph-ranking engine itself, not the broader outreach or network-maintenance workflow layered on top...
- **怎么用**：使用 social-graph-ranker skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：当 social-graph-ranker 涉及多个文件或多个决策点时，它能帮你维持上下文一致。
- **局限**：social-graph-ranker 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 social-graph-ranker 准备路演文案、产品卖点或对外说明。

### 研究与信息检索

用于搜索、调研、学术评估或市场情报。

#### deep-research

- **定位**：Multi-source deep research using firecrawl and exa MCPs. Searches the web, synthesizes findings, and delivers cited reports with source attribution. Use when the user wants thorough research on any topic with evidence and citations.
- **怎么用**：使用 deep-research skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：让 deep-research 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：deep-research 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 deep-research 补充竞品、行业、资料或技术证据。

#### exa-search

- **定位**：Neural search via Exa MCP for web, code, and company research. Use when the user needs web search, code examples, company intel, people lookup, or AI-powered deep research with Exa's neural search engine.
- **怎么用**：使用 exa-search skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 exa-search 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：exa-search 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 exa-search 补充竞品、行业、资料或技术证据。

#### market-research

- **定位**：Conduct market research, competitive analysis, investor due diligence, and industry intelligence with source attribution and decision-oriented summaries. Use when the user wants market sizing, competitor comparisons, fund research, technology scans, or rese...
- **怎么用**：使用 market-research skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：当 market-research 涉及多个文件或多个决策点时，它能帮你维持上下文一致。
- **局限**：market-research 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 market-research 补充竞品、行业、资料或技术证据。

#### research-ops

- **定位**：Evidence-first current-state research workflow for ECC. Use when the user wants fresh facts, comparisons, enrichment, or a recommendation built from current public evidence and any supplied local context.
- **怎么用**：使用 research-ops skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：让 research-ops 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：research-ops 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 research-ops 补充竞品、行业、资料或技术证据。

#### scientific-db-pubmed-database

- **定位**：Direct PubMed and NCBI E-utilities search workflows for biomedical literature, MeSH queries, PMID lookup, citation retrieval, and API-backed literature monitoring.
- **怎么用**：使用 scientific-db-pubmed-database skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 scientific-db-pubmed-database 这类任务能提供比通用提示词更稳定的结构。
- **局限**：scientific-db-pubmed-database 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 scientific-db-pubmed-database 补充竞品、行业、资料或技术证据。

#### scientific-db-uspto-database

- **定位**：USPTO patent and trademark data workflow for official record lookup, PatentSearch queries, TSDR checks, assignment data, and reproducible IP research logs.
- **怎么用**：使用 scientific-db-uspto-database skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 scientific-db-uspto-database 这类任务能提供比通用提示词更稳定的结构。
- **局限**：scientific-db-uspto-database 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 scientific-db-uspto-database 补充竞品、行业、资料或技术证据。

#### scientific-pkg-gget

- **定位**：gget CLI and Python workflow for quick genomic database queries, sequence lookup, BLAST-style searches, enrichment checks, and reproducible bioinformatics evidence logs.
- **怎么用**：使用 scientific-pkg-gget skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 scientific-pkg-gget 这类任务能提供比通用提示词更稳定的结构。
- **局限**：scientific-pkg-gget 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 scientific-pkg-gget 补充竞品、行业、资料或技术证据。

#### scientific-thinking-literature-review

- **定位**：Systematic literature-review workflow for academic, biomedical, technical, and scientific topics, including search planning, source screening, synthesis, citation checks, and evidence logging.
- **怎么用**：使用 scientific-thinking-literature-review skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 scientific-thinking-literature-review 补上专门的风险视角，避免只看功能不看交付。
- **局限**：scientific-thinking-literature-review 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 scientific-thinking-literature-review 补充竞品、行业、资料或技术证据。

#### search-first

- **定位**：Research-before-coding workflow. Search for existing tools, libraries, and patterns before writing custom code. Invokes the researcher agent.
- **怎么用**：使用 search-first skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 search-first 补上专门的风险视角，避免只看功能不看交付。
- **局限**：search-first 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 search-first 补充竞品、行业、资料或技术证据。

### 后端、API 与集成

用于后端能力、API 接入、错误处理、文档和工程规范。

#### code-tour

- **定位**：Create CodeTour `.tour` files — persona-targeted, step-by-step walkthroughs with real file and line anchors. Use for onboarding tours, architecture walkthroughs, PR tours, RCA tours, and structured "explain how this works" requests.
- **怎么用**：使用 code-tour skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 code-tour 这类任务能提供比通用提示词更稳定的结构。
- **局限**：code-tour 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 code-tour 改进 API、工具封装、错误处理或工程文档。

#### configure-ecc

- **定位**：Interactive installer for Everything Claude Code — guides users through selecting and installing skills and rules to user-level or project-level directories, verifies paths, and optionally optimizes installed files.
- **怎么用**：使用 configure-ecc skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：让 configure-ecc 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：configure-ecc 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 configure-ecc 改进 API、工具封装、错误处理或工程文档。

#### hookify-rules

- **定位**：This skill should be used when the user asks to create a hookify rule, write a hook rule, configure hookify, add a hookify rule, or needs guidance on hookify rule syntax and patterns.
- **怎么用**：使用 hookify-rules skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 hookify-rules 补上专门的风险视角，避免只看功能不看交付。
- **局限**：hookify-rules 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 hookify-rules 改进 API、工具封装、错误处理或工程文档。

#### regex-vs-llm-structured-text

- **定位**：Decision framework for choosing between regex and LLM when parsing structured text — start with regex, add LLM only for low-confidence edge cases.
- **怎么用**：使用 regex-vs-llm-structured-text skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：让 regex-vs-llm-structured-text 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：regex-vs-llm-structured-text 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 regex-vs-llm-structured-text 改进 API、工具封装、错误处理或工程文档。

#### skill-scout

- **定位**：Search existing local, marketplace, GitHub, and web skill sources before creating a new skill. Use when the user wants to create, build, fork, or find a skill for a workflow.
- **怎么用**：使用 skill-scout skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 skill-scout 的常见失误有预设检查点，能减少遗漏和返工。
- **局限**：skill-scout 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 skill-scout 改进 API、工具封装、错误处理或工程文档。

### 数据库与数据层

用于数据建模、查询优化、迁移、缓存和数据收集。

#### clickhouse-io

- **定位**：ClickHouse database patterns, query optimization, analytics, and data engineering best practices for high-performance analytical workloads.
- **怎么用**：使用 clickhouse-io skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 clickhouse-io 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：clickhouse-io 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 clickhouse-io 设计或审查本地活动、餐厅、预约和订单数据。

#### content-hash-cache-pattern

- **定位**：Cache expensive file processing results using SHA-256 content hashes — path-independent, auto-invalidating, with service layer separation.
- **怎么用**：使用 content-hash-cache-pattern skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：当 content-hash-cache-pattern 涉及多个文件或多个决策点时，它能帮你维持上下文一致。
- **局限**：content-hash-cache-pattern 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 content-hash-cache-pattern 设计或审查本地活动、餐厅、预约和订单数据。

#### data-scraper-agent

- **定位**：Build a fully automated AI-powered data collection agent for any public source — job boards, prices, news, GitHub, sports, anything. Scrapes on a schedule, enriches data with a free LLM (Gemini Flash), stores results in Notion/Sheets/Supabase, and learns fr...
- **怎么用**：使用 data-scraper-agent skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 data-scraper-agent 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：data-scraper-agent 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 data-scraper-agent 设计或审查本地活动、餐厅、预约和订单数据。

#### database-migrations

- **定位**：Database migration best practices for schema changes, data migrations, rollbacks, and zero-downtime deployments across PostgreSQL, MySQL, and common ORMs (Prisma, Drizzle, Kysely, Django, TypeORM, golang-migrate).
- **怎么用**：使用 database-migrations skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 database-migrations 的常见失误有预设检查点，能减少遗漏和返工。
- **局限**：database-migrations 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 database-migrations 设计或审查本地活动、餐厅、预约和订单数据。

#### mysql-patterns

- **定位**：MySQL and MariaDB schema, query, indexing, transaction, replication, and connection-pool patterns for production backends.
- **怎么用**：使用 mysql-patterns skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 mysql-patterns 补上专门的风险视角，避免只看功能不看交付。
- **局限**：mysql-patterns 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 mysql-patterns 设计或审查本地活动、餐厅、预约和订单数据。

#### postgres-patterns

- **定位**：PostgreSQL database patterns for query optimization, schema design, indexing, and security. Based on Supabase best practices.
- **怎么用**：使用 postgres-patterns skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：当 postgres-patterns 涉及多个文件或多个决策点时，它能帮你维持上下文一致。
- **局限**：postgres-patterns 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 postgres-patterns 设计或审查本地活动、餐厅、预约和订单数据。

### 安全与合规

用于安全审查、合规检查、隐私数据处理和高风险系统防护。

#### customs-trade-compliance

- **定位**：Codified expertise for customs documentation, tariff classification, duty optimization, restricted party screening, and regulatory compliance across multiple jurisdictions. Informed by trade compliance specialists with 15+ years experience. Includes HS clas...
- **怎么用**：使用 customs-trade-compliance skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 customs-trade-compliance 问题分解到输入、步骤、验收和输出，方便复盘。
- **局限**：customs-trade-compliance 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 customs-trade-compliance 审查用户偏好、位置、订单和密钥相关风险。

#### defi-amm-security

- **定位**：Security checklist for Solidity AMM contracts, liquidity pools, and swap flows. Covers reentrancy, CEI ordering, donation or inflation attacks, oracle manipulation, slippage, admin controls, and integer math.
- **怎么用**：使用 defi-amm-security skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：当 defi-amm-security 涉及多个文件或多个决策点时，它能帮你维持上下文一致。
- **局限**：defi-amm-security 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 defi-amm-security 审查用户偏好、位置、订单和密钥相关风险。

#### django-security

- **定位**：Django security best practices, authentication, authorization, CSRF protection, SQL injection prevention, XSS prevention, and secure deployment configurations.
- **怎么用**：使用 django-security skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 django-security 变成团队可共享的操作方法，不只是单次问答。
- **局限**：django-security 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 django-security 审查用户偏好、位置、订单和密钥相关风险。

#### healthcare-phi-compliance

- **定位**：Protected Health Information (PHI) and Personally Identifiable Information (PII) compliance patterns for healthcare applications. Covers data classification, access control, audit trails, encryption, and common leak vectors.
- **怎么用**：使用 healthcare-phi-compliance skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 healthcare-phi-compliance 这类任务能提供比通用提示词更稳定的结构。
- **局限**：healthcare-phi-compliance 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 healthcare-phi-compliance 审查用户偏好、位置、订单和密钥相关风险。

#### hipaa-compliance

- **定位**：HIPAA-specific entrypoint for healthcare privacy and security work. Use when a task is explicitly framed around HIPAA, PHI handling, covered entities, BAAs, breach posture, or US healthcare compliance requirements.
- **怎么用**：使用 hipaa-compliance skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 hipaa-compliance 这类任务能提供比通用提示词更稳定的结构。
- **局限**：hipaa-compliance 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 hipaa-compliance 审查用户偏好、位置、订单和密钥相关风险。

#### laravel-security

- **定位**：Laravel security best practices for authn/authz, validation, CSRF, mass assignment, file uploads, secrets, rate limiting, and secure deployment.
- **怎么用**：使用 laravel-security skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：让 laravel-security 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：laravel-security 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 laravel-security 审查用户偏好、位置、订单和密钥相关风险。

#### llm-trading-agent-security

- **定位**：Security patterns for autonomous trading agents with wallet or transaction authority. Covers prompt injection, spend limits, pre-send simulation, circuit breakers, MEV protection, and key handling.
- **怎么用**：使用 llm-trading-agent-security skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 llm-trading-agent-security 这类任务能提供比通用提示词更稳定的结构。
- **局限**：llm-trading-agent-security 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 llm-trading-agent-security 审查用户偏好、位置、订单和密钥相关风险。

#### perl-security

- **定位**：Comprehensive Perl security covering taint mode, input validation, safe process execution, DBI parameterized queries, web security (XSS/SQLi/CSRF), and perlcritic security policies.
- **怎么用**：使用 perl-security skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 perl-security 这类任务能提供比通用提示词更稳定的结构。
- **局限**：perl-security 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 perl-security 审查用户偏好、位置、订单和密钥相关风险。

#### quarkus-security

- **定位**：Quarkus Security best practices for authentication, authorization, JWT/OIDC, RBAC, input validation, CSRF, secrets management, and dependency security.
- **怎么用**：使用 quarkus-security skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：让 quarkus-security 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：quarkus-security 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 quarkus-security 审查用户偏好、位置、订单和密钥相关风险。

#### ralphinho-rfc-pipeline

- **定位**：RFC-driven multi-agent DAG execution pattern with quality gates, merge queues, and work unit orchestration.
- **怎么用**：使用 ralphinho-rfc-pipeline skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：让 ralphinho-rfc-pipeline 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：ralphinho-rfc-pipeline 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 ralphinho-rfc-pipeline 审查用户偏好、位置、订单和密钥相关风险。

#### security-bounty-hunter

- **定位**：Hunt for exploitable, bounty-worthy security issues in repositories. Focuses on remotely reachable vulnerabilities that qualify for real reports instead of noisy local-only findings.
- **怎么用**：使用 security-bounty-hunter skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 security-bounty-hunter 问题分解到输入、步骤、验收和输出，方便复盘。
- **局限**：security-bounty-hunter 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 security-bounty-hunter 审查用户偏好、位置、订单和密钥相关风险。

#### security-review

- **定位**：Use this skill when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features. Provides comprehensive security checklist and patterns.
- **怎么用**：使用 security-review skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 security-review 变成团队可共享的操作方法，不只是单次问答。
- **局限**：security-review 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 security-review 审查用户偏好、位置、订单和密钥相关风险。

#### security-scan

- **定位**：Scan your Claude Code configuration (.claude/ directory) for security vulnerabilities, misconfigurations, and injection risks using AgentShield. Checks CLAUDE.md, settings.json, MCP servers, hooks, and agent definitions.
- **怎么用**：使用 security-scan skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 security-scan 这类任务能提供比通用提示词更稳定的结构。
- **局限**：security-scan 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 security-scan 审查用户偏好、位置、订单和密钥相关风险。

#### springboot-security

- **定位**：Spring Security best practices for authn/authz, validation, CSRF, secrets, headers, rate limiting, and dependency security in Java Spring Boot services.
- **怎么用**：使用 springboot-security skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 springboot-security 问题分解到输入、步骤、验收和输出，方便复盘。
- **局限**：springboot-security 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 springboot-security 审查用户偏好、位置、订单和密钥相关风险。

### DevOps、网络与运维

用于部署、CI/CD、运维、成本、通知、工作区和网络排查。

#### automation-audit-ops

- **定位**：Evidence-first automation inventory and overlap audit workflow for ECC. Use when the user wants to know which jobs, hooks, connectors, MCP servers, or wrappers are live, broken, redundant, or missing before fixing anything.
- **怎么用**：使用 automation-audit-ops skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 automation-audit-ops 变成团队可共享的操作方法，不只是单次问答。
- **局限**：automation-audit-ops 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 automation-audit-ops 检查本地启动、构建、部署、成本或运行证据。

#### autonomous-loops

- **定位**：Patterns and architectures for autonomous Claude Code loops — from simple sequential pipelines to RFC-driven multi-agent DAG systems.
- **怎么用**：使用 autonomous-loops skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 autonomous-loops 的常见失误有预设检查点，能减少遗漏和返工。
- **局限**：autonomous-loops 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 autonomous-loops 检查本地启动、构建、部署、成本或运行证据。

#### cisco-ios-patterns

- **定位**：Cisco IOS and IOS-XE review patterns for show commands, config hierarchy, wildcard masks, ACL placement, interface hygiene, and safe change-window verification.
- **怎么用**：使用 cisco-ios-patterns skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 cisco-ios-patterns 补上专门的风险视角，避免只看功能不看交付。
- **局限**：cisco-ios-patterns 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 cisco-ios-patterns 检查本地启动、构建、部署、成本或运行证据。

#### cost-aware-llm-pipeline

- **定位**：Cost optimization patterns for LLM API usage — model routing by task complexity, budget tracking, retry logic, and prompt caching.
- **怎么用**：使用 cost-aware-llm-pipeline skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 cost-aware-llm-pipeline 变成团队可共享的操作方法，不只是单次问答。
- **局限**：cost-aware-llm-pipeline 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 cost-aware-llm-pipeline 检查本地启动、构建、部署、成本或运行证据。

#### cost-tracking

- **定位**：Track and report Claude Code token usage, spending, and budgets from a local cost-tracking database. Use when the user asks about costs, spending, usage, tokens, budgets, or cost breakdowns by project, tool, session, or date.
- **怎么用**：使用 cost-tracking skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 cost-tracking 这类任务能提供比通用提示词更稳定的结构。
- **局限**：cost-tracking 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 cost-tracking 检查本地启动、构建、部署、成本或运行证据。

#### customer-billing-ops

- **定位**：Operate customer billing workflows such as subscriptions, refunds, churn triage, billing-portal recovery, and plan analysis using connected billing tools like Stripe. Use when the user needs to help a customer, inspect subscription state, or manage revenue-...
- **怎么用**：使用 customer-billing-ops skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 customer-billing-ops 这类任务能提供比通用提示词更稳定的结构。
- **局限**：customer-billing-ops 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 customer-billing-ops 检查本地启动、构建、部署、成本或运行证据。

#### deployment-patterns

- **定位**：Deployment workflows, CI/CD pipeline patterns, Docker containerization, health checks, rollback strategies, and production readiness checklists for web applications.
- **怎么用**：使用 deployment-patterns skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 deployment-patterns 变成团队可共享的操作方法，不只是单次问答。
- **局限**：deployment-patterns 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 deployment-patterns 检查本地启动、构建、部署、成本或运行证据。

#### docker-patterns

- **定位**：Docker and Docker Compose patterns for local development, container security, networking, volume strategies, and multi-service orchestration.
- **怎么用**：使用 docker-patterns skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 docker-patterns 的常见失误有预设检查点，能减少遗漏和返工。
- **局限**：docker-patterns 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 docker-patterns 检查本地启动、构建、部署、成本或运行证据。

#### ecc-tools-cost-audit

- **定位**：Evidence-first ECC Tools burn and billing audit workflow. Use when investigating runaway PR creation, quota bypass, premium-model leakage, duplicate jobs, or GitHub App cost spikes in the ECC Tools repo.
- **怎么用**：使用 ecc-tools-cost-audit skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：让 ecc-tools-cost-audit 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：ecc-tools-cost-audit 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 ecc-tools-cost-audit 检查本地启动、构建、部署、成本或运行证据。

#### email-ops

- **定位**：Evidence-first mailbox triage, drafting, send verification, and sent-mail-safe follow-up workflow for ECC. Use when the user wants to organize email, draft or send through the real mail surface, or prove what landed in Sent.
- **怎么用**：使用 email-ops skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 email-ops 补上专门的风险视角，避免只看功能不看交付。
- **局限**：email-ops 不能保证外部依赖、API 或平台规则是最新，有时需要再查官方来源。
- **使用案例**：用 email-ops 检查本地启动、构建、部署、成本或运行证据。

#### enterprise-agent-ops

- **定位**：Operate long-lived agent workloads with observability, security boundaries, and lifecycle management.
- **怎么用**：使用 enterprise-agent-ops skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 enterprise-agent-ops 问题分解到输入、步骤、验收和输出，方便复盘。
- **局限**：enterprise-agent-ops 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 enterprise-agent-ops 检查本地启动、构建、部署、成本或运行证据。

#### finance-billing-ops

- **定位**：Evidence-first revenue, pricing, refunds, team-billing, and billing-model truth workflow for ECC. Use when the user wants a sales snapshot, pricing comparison, duplicate-charge diagnosis, or code-backed billing reality instead of generic payments advice.
- **怎么用**：使用 finance-billing-ops skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 finance-billing-ops 这类任务能提供比通用提示词更稳定的结构。
- **局限**：finance-billing-ops 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 finance-billing-ops 检查本地启动、构建、部署、成本或运行证据。

#### github-ops

- **定位**：GitHub repository operations, automation, and management. Issue triage, PR management, CI/CD operations, release management, and security monitoring using the gh CLI. Use when the user wants to manage GitHub issues, PRs, CI status, releases, contributors, s...
- **怎么用**：使用 github-ops skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 github-ops 变成团队可共享的操作方法，不只是单次问答。
- **局限**：github-ops 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 github-ops 检查本地启动、构建、部署、成本或运行证据。

#### google-workspace-ops

- **定位**：Operate across Google Drive, Docs, Sheets, and Slides as one workflow surface for plans, trackers, decks, and shared documents. Use when the user needs to find, summarize, edit, migrate, or clean up Google Workspace assets without dropping to raw tool calls.
- **怎么用**：使用 google-workspace-ops skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 google-workspace-ops 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：google-workspace-ops 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 google-workspace-ops 检查本地启动、构建、部署、成本或运行证据。

#### homelab-network-readiness

- **定位**：Readiness checklist for homelab VLAN segmentation, local DNS filtering, and WireGuard-style remote access before changing router, firewall, DHCP, or VPN configuration.
- **怎么用**：使用 homelab-network-readiness skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 homelab-network-readiness 补上专门的风险视角，避免只看功能不看交付。
- **局限**：homelab-network-readiness 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 homelab-network-readiness 检查本地启动、构建、部署、成本或运行证据。

#### homelab-network-setup

- **定位**：Practical home and homelab network planning for gateways, switches, access points, IP ranges, DHCP reservations, DNS, cabling, and common beginner mistakes.
- **怎么用**：使用 homelab-network-setup skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 homelab-network-setup 这类任务能提供比通用提示词更稳定的结构。
- **局限**：homelab-network-setup 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 homelab-network-setup 检查本地启动、构建、部署、成本或运行证据。

#### jira-integration

- **定位**：Use this skill when retrieving Jira tickets, analyzing requirements, updating ticket status, adding comments, or transitioning issues. Provides Jira API patterns via MCP or direct REST calls.
- **怎么用**：使用 jira-integration skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 jira-integration 的常见失误有预设检查点，能减少遗漏和返工。
- **局限**：jira-integration 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 jira-integration 检查本地启动、构建、部署、成本或运行证据。

#### knowledge-ops

- **定位**：Knowledge base management, ingestion, sync, and retrieval across multiple storage layers (local files, MCP memory, vector stores, Git repos). Use when the user wants to save, organize, sync, deduplicate, or search across their knowledge systems.
- **怎么用**：使用 knowledge-ops skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：让 knowledge-ops 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：knowledge-ops 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 knowledge-ops 检查本地启动、构建、部署、成本或运行证据。

#### messages-ops

- **定位**：Evidence-first live messaging workflow for ECC. Use when the user wants to read texts or DMs, recover a recent one-time code, inspect a thread before replying, or prove which message source was actually checked.
- **怎么用**：使用 messages-ops skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 messages-ops 问题分解到输入、步骤、验收和输出，方便复盘。
- **局限**：messages-ops 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 messages-ops 检查本地启动、构建、部署、成本或运行证据。

#### netmiko-ssh-automation

- **定位**：Safe Python Netmiko patterns for read-only collection, bounded batch SSH, TextFSM parsing, guarded config changes, timeouts, and network automation error handling.
- **怎么用**：使用 netmiko-ssh-automation skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 netmiko-ssh-automation 补上专门的风险视角，避免只看功能不看交付。
- **局限**：netmiko-ssh-automation 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 netmiko-ssh-automation 检查本地启动、构建、部署、成本或运行证据。

#### network-bgp-diagnostics

- **定位**：Diagnostics-only BGP troubleshooting patterns for neighbor state, route exchange, prefix policy, AS path inspection, and safe evidence collection.
- **怎么用**：使用 network-bgp-diagnostics skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：让 network-bgp-diagnostics 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：network-bgp-diagnostics 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 network-bgp-diagnostics 检查本地启动、构建、部署、成本或运行证据。

#### network-config-validation

- **定位**：Pre-deployment checks for router and switch configuration, including dangerous commands, duplicate addresses, subnet overlaps, stale references, management-plane risk, and IOS-style security hygiene.
- **怎么用**：使用 network-config-validation skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 network-config-validation 这类任务能提供比通用提示词更稳定的结构。
- **局限**：network-config-validation 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 network-config-validation 检查本地启动、构建、部署、成本或运行证据。

#### network-interface-health

- **定位**：Diagnose interface errors, drops, CRCs, duplex mismatches, flapping, speed negotiation issues, and counter trends on routers, switches, and Linux hosts.
- **怎么用**：使用 network-interface-health skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 network-interface-health 这类任务能提供比通用提示词更稳定的结构。
- **局限**：network-interface-health 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 network-interface-health 检查本地启动、构建、部署、成本或运行证据。

#### project-flow-ops

- **定位**：Operate execution flow across GitHub and Linear by triaging issues and pull requests, linking active work, and keeping GitHub public-facing while Linear remains the internal execution layer. Use when the user wants backlog control, PR triage, or GitHub-to-L...
- **怎么用**：使用 project-flow-ops skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 project-flow-ops 补上专门的风险视角，避免只看功能不看交付。
- **局限**：project-flow-ops 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 project-flow-ops 检查本地启动、构建、部署、成本或运行证据。

#### terminal-ops

- **定位**：Evidence-first repo execution workflow for ECC. Use when the user wants a command run, a repo checked, a CI failure debugged, or a narrow fix pushed with exact proof of what was executed and verified.
- **怎么用**：使用 terminal-ops skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 terminal-ops 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：terminal-ops 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 terminal-ops 检查本地启动、构建、部署、成本或运行证据。

#### unified-notifications-ops

- **定位**：Operate notifications as one ECC-native workflow across GitHub, Linear, desktop alerts, hooks, and connected communication surfaces. Use when the real problem is alert routing, deduplication, escalation, or inbox collapse.
- **怎么用**：使用 unified-notifications-ops skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 unified-notifications-ops 补上专门的风险视角，避免只看功能不看交付。
- **局限**：unified-notifications-ops 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 unified-notifications-ops 检查本地启动、构建、部署、成本或运行证据。

### 行业领域与供应链

用于特定行业场景，例如物流、供应链、能源、财务和客服运营。

#### carrier-relationship-management

- **定位**：Codified expertise for managing carrier portfolios, negotiating freight rates, tracking carrier performance, allocating freight, and maintaining strategic carrier relationships. Informed by transportation managers with 15+ years experience. Includes scoreca...
- **怎么用**：使用 carrier-relationship-management skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 carrier-relationship-management 的常见失误有预设检查点，能减少遗漏和返工。
- **局限**：carrier-relationship-management 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 carrier-relationship-management 借鉴行业运营流程，优化“从规划到执行”的交付链路。

#### energy-procurement

- **定位**：Codified expertise for electricity and gas procurement, tariff optimization, demand charge management, renewable PPA evaluation, and multi-facility energy cost management. Informed by energy procurement managers with 15+ years experience at large commercial...
- **怎么用**：使用 energy-procurement skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 energy-procurement 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：energy-procurement 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 energy-procurement 借鉴行业运营流程，优化“从规划到执行”的交付链路。

#### inventory-demand-planning

- **定位**：Codified expertise for demand forecasting, safety stock optimization, replenishment planning, and promotional lift estimation at multi-location retailers. Informed by demand planners with 15+ years experience managing hundreds of SKUs. Includes forecasting ...
- **怎么用**：使用 inventory-demand-planning skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 inventory-demand-planning 这类任务能提供比通用提示词更稳定的结构。
- **局限**：inventory-demand-planning 的建议会受代码上下文影响，上下文不足时需要先读文件。
- **使用案例**：用 inventory-demand-planning 借鉴行业运营流程，优化“从规划到执行”的交付链路。

#### logistics-exception-management

- **定位**：Codified expertise for handling freight exceptions, shipment delays, damages, losses, and carrier disputes. Informed by logistics professionals with 15+ years operational experience. Includes escalation protocols, carrier-specific behaviors, claims procedur...
- **怎么用**：使用 logistics-exception-management skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 logistics-exception-management 变成团队可共享的操作方法，不只是单次问答。
- **局限**：logistics-exception-management 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 logistics-exception-management 借鉴行业运营流程，优化“从规划到执行”的交付链路。

#### production-scheduling

- **定位**：Codified expertise for production scheduling, job sequencing, line balancing, changeover optimization, and bottleneck resolution in discrete and batch manufacturing. Informed by production schedulers with 15+ years experience. Includes TOC/drum-buffer-rope,...
- **怎么用**：使用 production-scheduling skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：让 production-scheduling 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：production-scheduling 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 production-scheduling 借鉴行业运营流程，优化“从规划到执行”的交付链路。

#### returns-reverse-logistics

- **定位**：Codified expertise for returns authorization, receipt and inspection, disposition decisions, refund processing, fraud detection, and warranty claims management. Informed by returns operations managers with 15+ years experience. Includes grading frameworks, ...
- **怎么用**：使用 returns-reverse-logistics skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 returns-reverse-logistics 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：returns-reverse-logistics 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 returns-reverse-logistics 借鉴行业运营流程，优化“从规划到执行”的交付链路。

### 语言与框架专项

用于特定语言、框架或 SDK 的实现和审查。

#### foundation-models-on-device

- **定位**：Apple FoundationModels framework for on-device LLM — text generation, guided generation with @Generable, tool calling, and snapshot streaming in iOS 26+.
- **怎么用**：使用 foundation-models-on-device skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：让 foundation-models-on-device 的输出更像工程流程，而不是一段泛泛的建议。
- **局限**：foundation-models-on-device 适合提高结构和检查质量，不是自动完成所有修改的保证。
- **使用案例**：用 foundation-models-on-device 审查特定技术栈的实现和安全细节。

#### jpa-patterns

- **定位**：JPA/Hibernate patterns for entity design, relationships, query optimization, transactions, auditing, indexing, pagination, and pooling in Spring Boot.
- **怎么用**：使用 jpa-patterns skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 jpa-patterns 补上专门的风险视角，避免只看功能不看交付。
- **局限**：jpa-patterns 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 jpa-patterns 审查特定技术栈的实现和安全细节。

#### nodejs-keccak256

- **定位**：Prevent Ethereum hashing bugs in JavaScript and TypeScript. Node's sha3-256 is NIST SHA3, not Ethereum Keccak-256, and silently breaks selectors, signatures, storage slots, and address derivation.
- **怎么用**：使用 nodejs-keccak256 skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 nodejs-keccak256 相关的经验转成可执行清单，适合在时间紧的场景里快速对齐。
- **局限**：nodejs-keccak256 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 nodejs-keccak256 审查特定技术栈的实现和安全细节。

#### swift-actor-persistence

- **定位**：Thread-safe data persistence in Swift using actors — in-memory cache with file-backed storage, eliminating data races by design.
- **怎么用**：使用 swift-actor-persistence skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 swift-actor-persistence 变成团队可共享的操作方法，不只是单次问答。
- **局限**：swift-actor-persistence 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 swift-actor-persistence 审查特定技术栈的实现和安全细节。

#### swift-concurrency-6-2

- **定位**：Swift 6.2 Approachable Concurrency — single-threaded by default, @concurrent for explicit background offloading, isolated conformances for main actor types.
- **怎么用**：使用 swift-concurrency-6-2 skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 swift-concurrency-6-2 这类任务能提供比通用提示词更稳定的结构。
- **局限**：swift-concurrency-6-2 不会替代你的代码运行和真实测试，关键结论仍要用本地证据确认。
- **使用案例**：用 swift-concurrency-6-2 审查特定技术栈的实现和安全细节。

#### x-api

- **定位**：X/Twitter API integration for posting tweets, threads, reading timelines, search, and analytics. Covers OAuth auth patterns, rate limits, and platform-native content posting. Use when the user wants to interact with X programmatically.
- **怎么用**：使用 x-api skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 x-api 的常见失误有预设检查点，能减少遗漏和返工。
- **局限**：x-api 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 x-api 审查特定技术栈的实现和安全细节。

### 通用与其他

通用辅助类 skill，适合作为其他工作流的补充。

#### evm-token-decimals

- **定位**：Prevent silent decimal mismatch bugs across EVM chains. Covers runtime decimal lookup, chain-aware caching, bridged-token precision drift, and safe normalization for bots, dashboards, and DeFi tools.
- **怎么用**：使用 evm-token-decimals skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能为 evm-token-decimals 补上专门的风险视角，避免只看功能不看交付。
- **局限**：evm-token-decimals 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 evm-token-decimals 处理项目里对应的专项辅助任务。

#### nutrient-document-processing

- **定位**：Process, convert, OCR, extract, redact, sign, and fill documents using the Nutrient DWS API. Works with PDFs, DOCX, XLSX, PPTX, HTML, and images.
- **怎么用**：使用 nutrient-document-processing skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：能把 nutrient-document-processing 问题分解到输入、步骤、验收和输出，方便复盘。
- **局限**：nutrient-document-processing 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 nutrient-document-processing 处理项目里对应的专项辅助任务。

#### visa-doc-translate

- **定位**：Translate visa application documents (images) to English and create a bilingual PDF with original and translation
- **怎么用**：使用 visa-doc-translate skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：对 visa-doc-translate 的常见失误有预设检查点，能减少遗漏和返工。
- **局限**：visa-doc-translate 需要明确输入和边界，否则容易输出过大或过虚的方案。
- **使用案例**：用 visa-doc-translate 处理项目里对应的专项辅助任务。

#### windows-desktop-e2e

- **定位**：E2E testing for Windows native desktop apps (WPF, WinForms, Win32/MFC, Qt) using pywinauto and Windows UI Automation.
- **怎么用**：使用 windows-desktop-e2e skill，基于当前代码库和我给的目标，输出可执行的建议或修改。
- **优点**：适合把 windows-desktop-e2e 变成团队可共享的操作方法，不只是单次问答。
- **局限**：windows-desktop-e2e 更像专项工具，不适合被泛用到与它无关的问题上。
- **使用案例**：用 windows-desktop-e2e 处理项目里对应的专项辅助任务。

## 为你的黑客松设计的完整工作流

### 0. 赛题对齐

- 读取 `benchmark.md` 和 `question.md`，把评审点拆成检查表：4-6 小时方案、家庭/朋友场景、餐厅有位、活动衔接、一键执行、分享文案。
- 使用 `workspace-surface-audit` 确认现有交付面：CLI/Web UI、Mock API、测试、文档。

### 1. 产品能力定义

- 使用 `product-capability` 把 Demo 定义为：本地场景短时活动规划与执行 Agent。
- 产出三个一句话：用户目标、Agent 完成的动作、评委应该看到的亮点。

### 2. Agent 与 Tool 设计

- 使用 `agent-harness-construction` 定义 Tool schema：地点搜索、路线计算、餐厅查询、排队/预约、活动预订、下单、分享。
- 使用 `agent-architecture-audit` 检查架构是否包含规划、决策、执行、观测和降级。

### 3. 先写验收样例

- 使用 `tdd-workflow` 写核心用例：家庭场景、朋友场景、无位置或无库存的降级场景。
- 使用 `eval-harness` 把 `benchmark.md` 转成评分规则：相关性、可执行性、工具链完整性、异常处理。

### 4. 实现和补齐短板

- 优先补齐三件事：执行链路真实可见、Mock API 足够像真实系统、UI 能展示“已安排”而不只是“已生成”。
- 使用 `error-handling` 补齐无位、预约失败、活动冲突和时间不足的处理。

### 5. UI 和演示打磨

- 使用 `impeccable` 审查 UI，把首屏改成直接可操作的 Agent 界面，少做营销式说明。
- 使用 `e2e-testing` 或 `ui-demo` 跑一遍可视化演示流程。

### 6. 文档与路演

- 设计文档控制在 2 页内：Planning 策略、Tool 调用链路、异常处理机制。
- 使用 `brand-voice` 和 `content-engine` 准备 3 分钟演示话术：一句话问题、实时计划、一键执行、异常降级。

### 7. 最后验收

- 使用 `verification-loop` 跑：`npm test`、`npm run build`、手动 Web Demo、文档检查。
- 使用 `production-audit` 做提交前检查：启动说明、Mock 数据、端口、异常态、答辩备用截图。

## 最小必用组合

- `workspace-surface-audit`：先明确现状和交付面。
- `product-capability`：把项目讲成评委听得懂的能力。
- `agent-harness-construction`：把 Tools 和调用链路设计清楚。
- `tdd-workflow` 和 `e2e-testing`：让 Demo 不是靠运气跑通。
- `error-handling`：补上评委最容易问的失败场景。
- `verification-loop` 和 `production-audit`：提交前做最后闭环。

## 注意事项

- ECC skills 只是工作流和专项知识，不等于已经执行命令或修改代码。
- 你当前没有 ECC slash commands，要用自然语言点名 skill。
- 黑客松最值得投入的不是再多加几个页面，而是把“规划 -> 查询 -> 执行 -> 降级 -> 分享”做成可见的闭环。
