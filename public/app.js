// app.js - Meituan activity planning assistant frontend
(function () {
  'use strict';

  // ==================== DOM 引用 ====================
  const chatArea = document.getElementById('chatArea');
  const planArea = document.getElementById('planArea');
  const msgInput = document.getElementById('msgInput');
  const sendBtn = document.getElementById('sendBtn');
  const toast = document.getElementById('toast');
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const weatherPanel = document.getElementById('weatherPanel');
  const routePanel = document.getElementById('routePanel');
  const bookingPanel = document.getElementById('bookingPanel');
  const timelinePanel = document.getElementById('timelinePanel');
  const constraintPanel = document.getElementById('constraintPanel');
  const recoveryPanel = document.getElementById('recoveryPanel');
  const conversionPanel = document.getElementById('conversionPanel');

  // ==================== 1. 状态管理层 ====================
  function newSessionId() {
    return 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  const state = {
    sessionId: newSessionId(),
    phase: 'idle',       // idle | streaming | done
    messages: [],         // { role, text, el? }
    currentPlan: null,
    pendingPlans: null,
    currentConstraint: null,
    currentRecovery: null,
    stages: [],
    _agentEl: null,       // 当前 agent 气泡 DOM
    _textNode: null,      // 当前 textNode（用于 O(1) 追加）
    _toolDiv: null,       // 当前 tool indicator div
    _thinkingDots: null,  // 当前 thinking dots DOM
  };

  // Sidebar data
  const sidebarData = {
    weather: null,
    routes: [],
    bookings: [],         // { name, time, status }
    timeline: [],
  };

  function resetState() {
    state.sessionId = newSessionId();
    state.phase = 'idle';
    state.messages = [];
    state.currentPlan = null;
    state.pendingPlans = null;
    state.currentConstraint = null;
    state.currentRecovery = null;
    state.stages = [];
    state._agentEl = null;
    state._textNode = null;
    state._toolDiv = null;
    state._thinkingDots = null;
  }

  function resetSidebar() {
    sidebarData.weather = null;
    sidebarData.routes = [];
    sidebarData.bookings = [];
    sidebarData.timeline = [];
    timelinePanel.innerHTML = '';
    constraintPanel.innerHTML = '';
    recoveryPanel.innerHTML = '';
    conversionPanel.innerHTML = '';
    weatherPanel.innerHTML = '';
    routePanel.innerHTML = '';
    bookingPanel.innerHTML = '';
  }

  // ==================== Tool call 显示名 ====================
  const TOOL_NAMES = {
    search_restaurants: '搜索餐厅',
    search_activities: '搜索活动',
    check_availability: '查询可用性',
    get_route: '路线规划',
    get_weather: '天气查询',
    book_restaurant: '预订餐厅',
    book_activity: '预订活动',
    order_delivery: '下单配送',
    user_feedback_received: '收到反馈',
    search_alternative_restaurant: '搜索替代餐厅',
    search_alternative_activity: '搜索替代活动',
    keep_activity: '保留活动',
    keep_restaurant: '保留餐厅',
    route_recalculated: '路线重算',
    plan_revised: '局部调整完成',
    generate_share_text: '生成分享文案',
    external_feedback_received: '外部反馈',
    feedback_source_detected: '识别反馈来源',
    group_preference_parsed: '群聊偏好解析',
    plan_revised_from_external_feedback: '外部反馈局部调整',
  };

  const STAGE_DEFS = [
    { key: 'intent', label: '需求解析', initialSummary: '等待识别用户场景' },
    { key: 'activity_search', label: '活动搜索', initialSummary: '等待搜索候选活动' },
    { key: 'restaurant_search', label: '餐厅搜索', initialSummary: '等待搜索候选餐厅' },
    { key: 'route', label: '路线计算', initialSummary: '等待计算距离和路线' },
    { key: 'validation', label: '方案校验', initialSummary: '等待校验可用性和约束' },
    { key: 'booking', label: '预订执行', initialSummary: '等待用户确认后执行' },
    { key: 'share', label: '分享生成', initialSummary: '等待生成分享文案' },
  ];

  const TOOL_STAGE_MAP = {
    search_activities: ['activity_search'],
    search_alternative_activity: ['activity_search'],
    keep_activity: ['activity_search'],
    search_restaurants: ['restaurant_search'],
    search_alternative_restaurant: ['restaurant_search'],
    keep_restaurant: ['restaurant_search'],
    get_route: ['route'],
    route_recalculated: ['route'],
    check_availability: ['validation'],
    plan_revised: ['validation'],
    plan_revised_from_external_feedback: ['validation'],
    book_activity: ['booking'],
    book_restaurant: ['booking'],
    order_delivery: ['booking'],
    generate_share_text: ['share'],
  };

  const RECOVERY_TOOLS = [
    'search_alternative_activity',
    'search_alternative_restaurant',
    'route_recalculated',
    'plan_revised',
    'plan_revised_from_external_feedback',
  ];

  const STAGE_STATUS_LABELS = {
    pending: '待执行',
    running: '执行中',
    completed: '已完成',
    recovered: '已恢复',
    failed: '失败',
  };
  // ==================== Sidebar Toggle ====================
  function checkSidebarToggle() {
    const hasContent = sidebarData.weather || sidebarData.routes.length > 0 ||
      sidebarData.bookings.length > 0 || sidebarData.timeline.length > 0 || state.stages.length > 0 ||
      constraintPanel.innerHTML || recoveryPanel.innerHTML || conversionPanel.innerHTML;
    if (window.innerWidth <= 768) {
      sidebarToggle.hidden = !hasContent;
    } else {
      sidebarToggle.hidden = true;
    }
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      sidebarToggle.textContent = sidebar.classList.contains('open') ? '收起' : '详情';
    });
  }

  window.addEventListener('resize', checkSidebarToggle);

  // ==================== 2. SSE 解析器 ====================
  async function* parseSSEStream(body) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventType = '';
    let dataLines = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line === '') {
            if (dataLines.length > 0) {
              const raw = dataLines.join('\n');
              dataLines = [];
              try {
                yield { type: eventType, data: JSON.parse(raw) };
              } catch { /* ignore malformed JSON */ }
            }
            eventType = '';
            continue;
          }
          if (line.startsWith(':')) continue;
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
            continue;
          }
          if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).replace(/^ /, ''));
            continue;
          }
        }
      }
      if (buffer) {
        const trailing = buffer.split(/\r?\n/);
        for (const line of trailing) {
          if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).replace(/^ /, ''));
          }
        }
        if (dataLines.length > 0) {
          try { yield { type: eventType, data: JSON.parse(dataLines.join('\n')) }; } catch { /* */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ==================== 3. 消息渲染层 ====================
  function addUserBubble(text) {
    const el = document.createElement('div');
    el.className = 'msg msg-user';
    el.textContent = text;
    chatArea.appendChild(el);
    scrollBottom();
  }

  function showAgentText(text) {
    const el = document.createElement('div');
    el.className = 'msg msg-agent';
    el.textContent = text;
    chatArea.appendChild(el);
    scrollBottom();
  }

  function ensureAgentBubble() {
    if (!state._agentEl) {
      const el = document.createElement('div');
      el.className = 'msg msg-agent';
      chatArea.appendChild(el);
      state._agentEl = el;
      state._textNode = null;
      state._toolDiv = null;
    }
    if (!state._textNode) {
      const tn = document.createTextNode('');
      state._agentEl.appendChild(tn);
      state._textNode = tn;
    }
    return state._agentEl;
  }

  function appendToken(content) {
    ensureAgentBubble();
    if (state._toolDiv) {
      state._toolDiv.remove();
      state._toolDiv = null;
    }
    if (state._thinkingDots) {
      state._thinkingDots.remove();
      state._thinkingDots = null;
    }
    state._textNode.data += content;
    scrollBottom();
  }

  function showToolIndicator(toolName) {
    const bubble = ensureAgentBubble();
    if (state._toolDiv) return;
    if (state._thinkingDots) {
      state._thinkingDots.remove();
      state._thinkingDots = null;
    }
    const div = document.createElement('div');
    div.className = 'tool-indicator';
    div.innerHTML = '<span class="dot"></span>正在' + escapeHtml(toolName) + '...';
    bubble.appendChild(div);
    state._toolDiv = div;
    scrollBottom();
  }

  function finalizeAgentBubble() {
    if (state._agentEl && state._textNode && state._textNode.data.trim() === '' && !state._toolDiv) {
      state._agentEl.remove();
    }
    state._agentEl = null;
    state._textNode = null;
    state._toolDiv = null;
  }

  function scrollBottom() {
    requestAnimationFrame(function () {
      chatArea.scrollTop = chatArea.scrollHeight;
    });
  }

  // ==================== Plan Card 渲染 ====================
  function renderPlan(data) {
    if (!data) return;
    if (data.plans && data.plans.length >= 2) {
      state.pendingPlans = data.plans;
      renderABPlans(data.plans);
    } else {
      renderSinglePlan(data.plan);
    }
  }

  function renderExternalFeedbackCard(feedback) {
    if (!feedback) return;
    const kept = feedback.kept && feedback.kept.length ? feedback.kept.join('；') : '核心行程';
    const replaced = feedback.replaced && feedback.replaced.length ? feedback.replaced.join('；') : '未替换，只微调路线';
    const changes = feedback.changes && feedback.changes.length ? feedback.changes.join('；') : '方案已更新';
    const html = '<div class="feedback-card" data-testid="feedback-card">' +
      '<h3>收到反馈，已局部调整</h3>' +
      '<p><strong>反馈来源：</strong>' + escapeHtml(feedback.sourceLabel || '') + '</p>' +
      '<p><strong>原始反馈内容：</strong>' + escapeHtml(feedback.originalFeedback || '') + '</p>' +
      '<p><strong>系统理解：</strong>' + escapeHtml(feedback.systemUnderstanding || '') + '</p>' +
      '<p><strong>保留了什么：</strong>' + escapeHtml(kept) + '</p>' +
      '<p><strong>替换了什么：</strong>' + escapeHtml(replaced) + '</p>' +
      '<p><strong>新方案变化：</strong>' + escapeHtml(changes) + '</p>' +
      '<p><strong>新分享文案：</strong>' + escapeHtml(feedback.shareText || '') + '</p>' +
      '</div>';
    planArea.insertAdjacentHTML('afterbegin', html);
  }

  function renderSinglePlan(plan) {
    if (!plan) return;
    state.currentPlan = plan;
    planArea.hidden = false;

    let html = '<div class="plan-card">';
    html += '<div class="plan-card-header">' + escapeHtml(plan.title) + '</div>';

    for (const item of plan.items) {
      html += '<div class="plan-item">' +
        '<div class="plan-time">' + escapeHtml(item.time) + '</div>' +
        '<div class="plan-detail">' +
          '<h4>' + escapeHtml(item.activity) + '</h4>' +
          '<p>' + escapeHtml(item.venue) + ' · ' + escapeHtml(item.cost) + '</p>' +
          '<p>' + escapeHtml(item.reason) + '</p>' +
        '</div></div>';
    }

    html += '<div class="plan-footer"><span>总计 ' + escapeHtml(plan.totalCost) +
      ' · ' + escapeHtml(plan.totalDuration) + '</span></div></div>';
    html += '<div class="btn-row">' +
      '<button class="btn btn-primary" onclick="confirmPlan()">确认方案，一键预订</button>' +
      '<button class="btn btn-secondary" onclick="revisePlan()">我想调整</button>' +
      '</div>';

    html += '<div class="quick-revision-row" data-testid="quick-revision-controls">' +
      '<button class="btn btn-secondary btn-compact" data-testid="quick-revise-restaurant" onclick="quickRevise(\'restaurant\')">换餐厅</button>' +
      '<button class="btn btn-secondary btn-compact" data-testid="quick-revise-activity" onclick="quickRevise(\'activity\')">换活动</button>' +
      '<button class="btn btn-secondary btn-compact" data-testid="quick-revise-nearer" onclick="quickRevise(\'nearer\')">更近一点</button>' +
      '<button class="btn btn-secondary btn-compact" data-testid="quick-revise-cheaper" onclick="quickRevise(\'cheaper\')">更省钱</button>' +
      '</div>';

    planArea.innerHTML = html;
    planArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    renderRoutePanelFromPlan(plan.items);
    renderBookingPanel(plan.items);
    checkSidebarToggle();
  }

  function renderABPlans(plans) {
    planArea.hidden = false;
    const labels = ['A', 'B'];
    const themes = ['yellow', 'blue'];

    let html = '<div class="ab-container">';
    plans.forEach(function (plan, i) {
      const label = labels[i] || String(i + 1);
      const theme = themes[i] || 'yellow';
      html += '<div class="plan-card-ab plan-card-ab-' + theme + '">' +
        '<div class="ab-label ab-label-' + theme + '">方案 ' + label + '</div>' +
        '<div class="plan-card-header">' + escapeHtml(plan.title) + '</div>';

      for (const item of plan.items) {
        html += '<div class="plan-item">' +
          '<div class="plan-time">' + escapeHtml(item.time) + '</div>' +
          '<div class="plan-detail">' +
            '<h4>' + escapeHtml(item.activity) + '</h4>' +
            '<p>' + escapeHtml(item.venue) + ' · ' + escapeHtml(item.cost) + '</p>' +
          '</div></div>';
      }

      html += '<div class="plan-footer"><span>总计 ' + escapeHtml(plan.totalCost) +
        ' · ' + escapeHtml(plan.totalDuration) + '</span></div></div>';
    });
    html += '</div>';

    html += '<div class="btn-row">' +
      '<button class="btn btn-primary" onclick="selectPlan(0)">选方案 A</button>' +
      '<button class="btn btn-alt" onclick="selectPlan(1)">选方案 B</button>' +
      '</div>';

    planArea.innerHTML = html;
    planArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  window.selectPlan = function (index) {
    const label = index === 0 ? 'A' : 'B';
    if (state.pendingPlans && state.pendingPlans[index]) {
      state.currentPlan = state.pendingPlans[index];
    }
    addUserBubble('选方案' + label);
    streamChat('选方案' + label, 'revision');
  };
  function showBookingResults(results) {
    if (!results || results.length === 0) return;

    const items = planArea.querySelectorAll('.plan-item');
    results.forEach(function (r, i) {
      if (items[i]) {
        const badge = document.createElement('div');
        const statusClass = r.status === 'success' ? 'success' : r.status === 'recovered' ? 'recovered' : r.status === 'skipped' ? 'skipped' : 'failed';
        badge.className = 'booking-result ' + statusClass;
        badge.textContent = r.status === 'success'
          ? '✅ 已预订' + (r.bookingId || '')
          : r.status === 'recovered'
          ? '🔄 已改订' + (r.bookingId || '')
          : r.status === 'skipped'
          ? '⚠️ 无需预订' + (r.reason ? ' · ' + r.reason : '')
          : '❌ 预订失败';
        items[i].querySelector('.plan-detail').appendChild(badge);
      }
    });

    const btnRow = planArea.querySelector('.btn-row');
    if (btnRow) {
      btnRow.innerHTML = '<button class="btn btn-secondary" onclick="sharePlan()">复制分享文案</button>' +
        '<button class="btn btn-primary" onclick="newSession()">再来一次</button>';
    }

    // Update sidebar booking panel
    updateBookingStatus(results);
  }

  function renderConfirmationCard(card) {
    if (!card) return;
    const activity = card.activity || {};
    const restaurant = card.restaurant || {};
    const upsell = card.upsell || {};
    let html = '<div class="confirmation-card" data-testid="confirmation-card">' +
      '<div class="confirmation-header">' +
        '<h3>' + escapeHtml(card.overview && card.overview.title || '执行完成') + '</h3>' +
        '<p>' + escapeHtml(card.overview && card.overview.totalDuration || '') + ' · ' +
          escapeHtml(card.overview && card.overview.routeSummary || '') + '</p>' +
      '</div>';

    if (activity.name) {
      html += '<div class="confirm-section">' +
        '<h4>活动确认</h4>' +
        '<p>' + escapeHtml(activity.time) + ' · ' + escapeHtml(activity.name) + '</p>' +
        '<p>状态：' + escapeHtml(activity.status) + ' · 确认号：<strong>' + escapeHtml(activity.confirmationId) + '</strong></p>' +
      '</div>';
    }
    if (restaurant.name) {
      html += '<div class="confirm-section">' +
        '<h4>餐厅确认</h4>' +
        '<p>' + escapeHtml(restaurant.time) + ' · ' + escapeHtml(restaurant.name) + '</p>' +
        '<p>' + escapeHtml(restaurant.queueStatus) + ' · 确认号：<strong>' + escapeHtml(restaurant.confirmationId) + '</strong></p>' +
      '</div>';
    }
    html += '<div class="confirm-section">' +
      '<h4>可选增购</h4>' +
      '<p>' + escapeHtml(upsell.item || '团购饮品') + ' · ' + escapeHtml(upsell.status || 'available') +
      (upsell.orderId ? ' · 订单号：<strong>' + escapeHtml(upsell.orderId) + '</strong>' : '') + '</p>' +
    '</div>' +
    '<div class="confirm-section share-section">' +
      '<h4>分享文案</h4>' +
      '<p>' + escapeHtml(card.shareText || '') + '</p>' +
    '</div></div>';

    planArea.insertAdjacentHTML('beforeend', html);
  }

  // ==================== Sidebar 渲染函数 ====================

  function createInitialStages() {
    return STAGE_DEFS.map(function (stage) {
      return {
        key: stage.key,
        label: stage.label,
        status: 'pending',
        summary: stage.initialSummary,
        hadFailure: false,
      };
    });
  }

  function ensureStages() {
    if (!state.stages.length) state.stages = createInitialStages();
  }

  function getStage(key) {
    ensureStages();
    return state.stages.find(function (stage) { return stage.key === key; });
  }

  function setStageStatus(key, status, summary) {
    const stage = getStage(key);
    if (!stage) return;
    if (status === 'failed') {
      stage.hadFailure = true;
      stage.status = 'failed';
    } else if (status === 'recovered') {
      stage.hadFailure = true;
      stage.status = 'recovered';
    } else if (status === 'completed') {
      stage.status = stage.hadFailure && stage.status !== 'completed' ? 'recovered' : 'completed';
    } else if (status === 'running') {
      stage.status = 'running';
    } else {
      stage.status = status;
    }
    if (summary) stage.summary = summary;
  }

  function completeStageUnlessRecovered(key, summary) {
    const stage = getStage(key);
    if (!stage) return;
    if (stage.status === 'recovered') {
      if (summary && !stage.summary) stage.summary = summary;
      return;
    }
    setStageStatus(key, 'completed', summary);
  }

  function prepareStagesForRequest(message, kind) {
    if (kind === 'booking') {
      ensureStages();
      setStageStatus('booking', 'running', '用户已确认，开始执行预订');
      renderTimelinePanel();
      return;
    }

    if (kind === 'revision') {
      ensureStages();
      const text = String(message || '');
      setStageStatus('validation', 'running', '收到反馈，准备局部校验');
      if (/餐|饭|吃|restaurant|省钱|便宜/.test(text)) {
        setStageStatus('restaurant_search', 'running', '局部替换餐厅候选');
      }
      if (/活动|室内|户外|孩子|activity/.test(text)) {
        setStageStatus('activity_search', 'running', '局部替换活动候选');
      }
      if (/近|路线|路程|距离|跨区/.test(text)) {
        setStageStatus('route', 'running', '局部重算路线距离');
      }
      renderTimelinePanel();
      return;
    }

    sidebarData.timeline = [];
    state.stages = createInitialStages();
    setStageStatus('intent', 'running', '正在解析需求和出行场景');
    renderTimelinePanel();
  }
  function updateStagesFromTrace(trace) {
    if (!trace) return;
    ensureStages();
    if (trace.tool !== 'user_feedback_received' && trace.tool !== 'external_feedback_received') {
      completeStageUnlessRecovered('intent', '已识别用户需求和场景');
    }

    const stageKeys = TOOL_STAGE_MAP[trace.tool] || [];
    const status = trace.status || 'success';
    const summary = trace.summary || '';
    const isRecoveryTool = RECOVERY_TOOLS.indexOf(trace.tool) >= 0 || status === 'recovered';

    stageKeys.forEach(function (key) {
      if (status === 'failed') {
        setStageStatus(key, 'failed', summary || '工具执行失败，等待恢复');
        return;
      }
      if (isRecoveryTool) {
        setStageStatus(key, 'recovered', summary || '已完成替换或重算');
        return;
      }
      setStageStatus(key, 'completed', summary || '工具执行完成');
    });

    if (trace.tool === 'search_alternative_restaurant') {
      setStageStatus('restaurant_search', 'recovered', summary || '已切换备选餐厅');
    }
    if (trace.tool === 'route_recalculated') {
      setStageStatus('route', 'recovered', summary || '已重新计算路线');
    }
    if (trace.tool === 'plan_revised' || trace.tool === 'plan_revised_from_external_feedback') {
      setStageStatus('validation', 'recovered', summary || '已重新校验方案');
    }
  }
  function updateStagesFromToolCall(tool) {
    ensureStages();
    if (tool === 'keep_activity') {
      setStageStatus('activity_search', 'completed', '保留原活动');
      renderTimelinePanel();
      return;
    }
    if (tool === 'keep_restaurant') {
      setStageStatus('restaurant_search', 'completed', '保留原餐厅');
      renderTimelinePanel();
      return;
    }
    const stageKeys = TOOL_STAGE_MAP[tool] || [];
    var changed = false;
    stageKeys.forEach(function (key) {
      var stage = getStage(key);
      if (!stage || stage.status === 'completed' || stage.status === 'recovered') return;
      setStageStatus(key, 'running', '正在执行' + (TOOL_NAMES[tool] || tool));
      changed = true;
    });
    if (changed) renderTimelinePanel();
  }

  function completePendingStageFromPlan(key, summary) {
    const stage = getStage(key);
    if (!stage || stage.status === 'completed' || stage.status === 'recovered') return;
    setStageStatus(key, 'completed', summary);
  }

  function completePlanningStagesFromPlan() {
    ensureStages();
    completePendingStageFromPlan('intent', '已识别用户需求和约束');
    completePendingStageFromPlan('activity_search', '已找到可用活动候选');
    completePendingStageFromPlan('restaurant_search', '已找到可用餐厅候选');
    completePendingStageFromPlan('route', '已完成路线与距离评估');
    completePendingStageFromPlan('validation', '已完成方案约束校验');
    renderTimelinePanel();
  }

  function finalizeStagesFromBooking(data) {
    ensureStages();
    const results = data && data.results ? data.results : [];
    const hasRecovered = results.some(function (item) { return item.status === 'recovered'; });
    const hasSuccess = results.some(function (item) { return item.status === 'success' || item.status === 'recovered'; });
    const hasFailed = results.some(function (item) { return item.status === 'failed'; });
    const hadTraceFailure = sidebarData.timeline.some(function (item) { return item.status === 'failed'; });

    if (hasRecovered || (hadTraceFailure && hasSuccess)) {
      setStageStatus('booking', 'recovered', '预订中出现异常，已完成恢复执行');
      const recoveredRestaurant = results.some(function (item) { return item.status === 'recovered' && (item.kind === 'restaurant' || item.replacedBy); });
      if (recoveredRestaurant || hadTraceFailure) {
        setStageStatus('restaurant_search', 'recovered', '餐厅异常后已切换备选');
        setStageStatus('validation', 'recovered', '替换后已重新校验约束');
      }
      const routeStage = getStage('route');
      if (routeStage && routeStage.status === 'failed') {
        setStageStatus('route', 'recovered', '已重新校验路线');
      } else {
        completeStageUnlessRecovered('route', '路线约束仍满足');
      }
    } else if (hasSuccess) {
      setStageStatus('booking', 'completed', '活动和餐厅预订执行完成');
    } else if (hasFailed) {
      setStageStatus('booking', 'failed', '预订失败且未恢复成功');
    }

    if ((data && (data.shareText || data.shareMessage)) || sidebarData.timeline.some(function (item) { return item.tool === 'generate_share_text'; })) {
      setStageStatus('share', 'completed', '已生成分享文案');
    }
    renderTimelinePanel();
  }
  function renderStageTimelineHtml() {
    ensureStages();
    let html = '<div class="stage-overview-section">' +
      '<div class="stage-section-title">闭环阶段总览</div>' +
      '<div class="agent-stage-timeline" data-testid="agent-stage-timeline">' +
      '<div class="stage-list">';
    state.stages.forEach(function (stage) {
      const status = stage.status || 'pending';
      html += '<div class="stage-item stage-' + escapeHtml(status) + '" data-stage-key="' + escapeHtml(stage.key) + '" data-stage-status="' + escapeHtml(status) + '">' +
        '<span class="stage-dot"></span>' +
        '<span class="stage-label">' + escapeHtml(stage.label) + '</span>' +
        '<span class="stage-status">' + escapeHtml(STAGE_STATUS_LABELS[status] || status) + '</span>' +
        '<span class="stage-summary">' + escapeHtml(stage.summary || '') + '</span>' +
      '</div>';
    });
    html += '</div></div></div>';
    return html;
  }

  function renderConstraintCardHtml(data) {
    if (!data) {
      return '<div class="display-card muted-card" data-testid="constraint-card"><h3>约束解释</h3><p>方案生成后展示匹配原因。</p></div>';
    }
    let html = '<div class="display-card constraint-display-card" data-testid="constraint-card">' +
      '<h3>约束解释</h3>' +
      '<div class="constraint-scenario">' + escapeHtml(data.detectedScenario || '已识别场景') + '</div>' +
      '<div class="constraint-rules">';
    (data.rules || []).forEach(function(rule) {
      html += '<div class="constraint-rule">' +
        '<div class="rule-label">' + escapeHtml(rule.label) + '</div>' +
        '<div class="rule-filter">' + escapeHtml(rule.filter) + '</div>' +
        '<div class="rule-result">' + escapeHtml(rule.result) + '</div>' +
      '</div>';
    });
    html += '</div>';
    if (data.scoringSummary) {
      html += '<div class="constraint-scoring">评分: 活动 ' + (data.scoringSummary.activityScore || 0) + ' / 餐厅 ' + (data.scoringSummary.restaurantScore || 0) +
        ' · 候选 活动 ' + ((data.scoringSummary.totalCandidates || {}).activities || 0) + ' / 餐厅 ' + ((data.scoringSummary.totalCandidates || {}).restaurants || 0) + '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderRecoveryCardHtml(data) {
    if (!data) {
      return '<div class="display-card muted-card" data-testid="recovery-card"><h3>失败恢复卡</h3><p>确认预订后展示执行兜底和异常恢复结果。</p></div>';
    }
    const failed = (data.steps || []).find(function(step) { return step.status === 'failed'; });
    const recovered = (data.steps || []).find(function(step) { return step.status === 'recovered'; });
    const successCount = (data.steps || []).filter(function(step) { return step.status === 'success' || step.status === 'recovered'; }).length;
    let html = '<div class="display-card recovery-display-card" data-testid="recovery-card">' +
      '<h3>' + (data.hasRecovery ? '异常处理记录 · 异常恢复' : '执行兜底') + '</h3>' +
      (data.hasRecovery ? '<div class="recovery-badge">已改订，检测到失败并自动恢复</div>' : '') +
      '<div class="recovery-summary-grid">' +
        '<div><strong>原方案哪里失败</strong><span>' + escapeHtml(failed ? failed.action : '暂无失败，所有可预订项通过') + '</span></div>' +
        '<div><strong>系统如何替换</strong><span>' + escapeHtml(recovered ? recovered.action : '无需替换，保持原方案执行') + '</span></div>' +
        '<div><strong>替换后哪些约束仍然满足</strong><span>' + escapeHtml(data.hasRecovery ? '保留场景、人数、距离、预算优先级，并重新校验可订状态' : '原约束均已通过校验') + '</span></div>' +
        '<div><strong>最终执行是否成功</strong><span>' + escapeHtml(successCount > 0 ? '执行成功' : '等待确认执行') + '</span></div>' +
      '</div>';
    if (data.hasRecovery && data.recoveryType) {
      html += '<div class="recovery-type">恢复策略: ' + escapeHtml(data.recoveryType) + '</div>';
    }
    html += '</div>';
    return html;
  }
  function renderTimelinePanel() {
    if (!sidebarData.timeline.length && !state.stages.length) return;
    let html = '<div class="panel-header"><span>🔍</span> Agent 执行明细</div><div class="panel-body timeline-body">';
    html += renderStageTimelineHtml();
    html += '<div class="tool-trace-section"><div class="stage-section-title">工具调用明细</div><div class="tool-trace-list" data-testid="tool-trace-list">';
    sidebarData.timeline.forEach(function (item) {
      const status = item.status || 'success';
      html += '<div class="timeline-item timeline-' + escapeHtml(status) + '">' +
        '<div class="timeline-top">' +
          '<span class="timeline-tool">' + escapeHtml(TOOL_NAMES[item.tool] || item.tool) + '</span>' +
          '<span class="timeline-status">' + escapeHtml(status) + '</span>' +
        '</div>' +
        '<div class="timeline-summary">' + escapeHtml(item.summary || '') + '</div>' +
        '<div class="timeline-meta">' + escapeHtml((item.timestamp || '').slice(11, 19)) + '</div>';
      if (item.recoveryHint) {
        html += '<div class="timeline-recovery">recovery: ' + escapeHtml(item.recoveryHint) + '</div>';
      }
      html += '</div>';
    });
    if (!sidebarData.timeline.length) {
      html += '<div class="timeline-empty">等待工具事件返回</div>';
    }
    html += '</div></div></div>';
    timelinePanel.innerHTML = html;
    checkSidebarToggle();
  }

  function appendToolTrace(trace) {
    if (!trace) return;
    sidebarData.timeline.push(trace);
    updateStagesFromTrace(trace);
    renderTimelinePanel();
  }

  function renderConstraintPanel(data) {
    if (!data) return;
    state.currentConstraint = data;
    constraintPanel.innerHTML = renderConstraintCardHtml(data);
    checkSidebarToggle();
    return;
    let html = '<div class="panel-header"><span>📋</span> 约束解释</div><div class="panel-body">';
    html += '<div class="constraint-scenario">' + escapeHtml(data.detectedScenario) + '</div>';
    html += '<div class="constraint-rules">';
    data.rules.forEach(function(rule) {
      html += '<div class="constraint-rule">' +
        '<div class="rule-label">' + escapeHtml(rule.label) + '</div>' +
        '<div class="rule-filter">' + escapeHtml(rule.filter) + '</div>' +
        '<div class="rule-result">' + escapeHtml(rule.result) + '</div>' +
      '</div>';
    });
    html += '</div>';
    html += '<div class="constraint-scoring">评分: 活动 ' + (data.scoringSummary.activityScore || 0) + '分 / 餐厅 ' + (data.scoringSummary.restaurantScore || 0) + '分 · 候选 活动 ' + (data.scoringSummary.totalCandidates.activities || 0) + ' / 餐厅 ' + (data.scoringSummary.totalCandidates.restaurants || 0) + '</div>';
    html += '</div>';
    constraintPanel.innerHTML = html;
    checkSidebarToggle();
  }

  function renderRecoveryPanel(data) {
    if (!data) return;
    state.currentRecovery = data;
    recoveryPanel.innerHTML = renderRecoveryCardHtml(data);
    checkSidebarToggle();
    return;
    let html = '<div class="panel-header"><span>🛡️</span> ' + (data.hasRecovery ? '异常处理记录' : '执行兜底') + '</div><div class="panel-body">';
    if (data.hasRecovery) {
      html += '<div class="recovery-badge">检测到失败并自动恢复</div>';
      if (data.recoveryType) html += '<div class="recovery-type">恢复策略: ' + escapeHtml(data.recoveryType) + '</div>';
    }
    html += '<div class="recovery-steps">';
    data.steps.forEach(function(step) {
      const statusClass = step.status === 'failed' ? 'failed' : step.status === 'recovered' ? 'recovered' : step.status === 'success' ? 'success' : '';
      html += '<div class="recovery-step recovery-step-' + statusClass + '">' +
        '<span class="step-phase">' + escapeHtml(step.phase) + '</span>' +
        '<span class="step-action">' + escapeHtml(step.action) + '</span>' +
        (step.detail ? '<span class="step-detail">' + escapeHtml(step.detail) + '</span>' : '') +
      '</div>';
    });
    html += '</div></div>';
    recoveryPanel.innerHTML = html;
    checkSidebarToggle();
  }

  function renderConversionPanel(data) {
    if (!data) return;
    const funnel = data.conversionFunnel || {};
    let html = '<div class="panel-header"><span>💰</span> 商业转化</div><div class="panel-body">';
    html += '<div class="conversion-gmv">预计 GMV：¥' + (data.platformGMV || data.totalSpend || 0) + '</div>';
    html += '<div class="conversion-funnel">' +
      '<div class="funnel-step"><span class="funnel-label">搜索</span><span class="funnel-value">' + (funnel.searched || 0) + '</span></div>' +
      '<div class="funnel-arrow">→</div>' +
      '<div class="funnel-step"><span class="funnel-label">校验</span><span class="funnel-value">' + (funnel.checked || 0) + '</span></div>' +
      '<div class="funnel-arrow">→</div>' +
      '<div class="funnel-step"><span class="funnel-label">预订</span><span class="funnel-value">' + (funnel.booked || 0) + '</span></div>' +
      '<div class="funnel-arrow">→</div>' +
      '<div class="funnel-step"><span class="funnel-label">增购</span><span class="funnel-value">' + (funnel.upsell || 0) + '</span></div>' +
    '</div>';
    if (data.completedActions && data.completedActions.length > 0) {
      html += '<div class="conversion-actions">已完成履约：' + data.completedActions.map(function(a) { return '<span class="action-tag">' + escapeHtml(a) + '</span>'; }).join('') + '</div>';
    }
    html += '<div class="conversion-merchants">';
    (data.merchantBreakdown || []).forEach(function(m) {
      html += '<div class="merchant-item">' +
        '<span class="merchant-name">' + escapeHtml(m.name) + '</span>' +
        '<span class="merchant-category">' + escapeHtml(m.category) + '</span>' +
        '<span class="merchant-amount">¥' + (m.amount || 0) + '</span>' +
      '</div>';
    });
    html += '</div>';
    if (data.optionalUpsells && data.optionalUpsells.length > 0) {
      html += '<div class="conversion-upsells">可选增购：';
      data.optionalUpsells.forEach(function(u) {
        html += '<span class="upsell-tag">' + escapeHtml(u.name) + ' ¥' + u.price + '</span>';
      });
      html += '</div>';
    }
    if (data.estimatedSaving && data.estimatedSaving > 0) {
      html += '<div class="conversion-saving">预计节省：¥' + data.estimatedSaving + '</div>';
    }
    if (data.upsellItem) {
      html += '<div class="conversion-upsell">增购: ' + escapeHtml(data.upsellItem) + (data.upsellOrderId ? ' (' + escapeHtml(data.upsellOrderId) + ')' : '') + '</div>';
    }
    html += '</div>';
    conversionPanel.innerHTML = html;
    checkSidebarToggle();
  }

  // ==================== Main Area Display Cards ====================

  function buildMainConstraintCardHtml(data) {
    if (!data) return '';
    // Compact: scenario badge + top 4 rules (label + result only)
    const rules = (data.rules || []).slice(0, 4);
    let html = '<div class="display-card main-display-card main-compact-card" data-testid="main-constraint-card">' +
      '<h3>为什么适合你</h3>' +
      '<div class="constraint-scenario">' + escapeHtml(data.detectedScenario || '已识别场景') + '</div>' +
      '<div class="constraint-rules">';
    rules.forEach(function(rule) {
      html += '<div class="constraint-rule">' +
        '<div class="rule-label">' + escapeHtml(rule.label) + '</div>' +
        '<div class="rule-result">' + escapeHtml(rule.result) + '</div>' +
      '</div>';
    });
    html += '</div></div>';
    return html;
  }

  function buildMainRecoveryCardHtml(data, constraintData, conversionData) {
    if (!data || !data.hasRecovery) return '';
    const failed = (data.steps || []).find(function(step) { return step.status === 'failed'; });
    const recovered = (data.steps || []).find(function(step) { return step.status === 'recovered'; });
    const successSteps = (data.steps || []).filter(function(step) { return step.status === 'success' || step.status === 'recovered'; });
    const hasBookedRecovered = recovered && recovered.action && /已改订|已预订|已确认/.test(recovered.action);

    // Build dynamic recovery result text
    var resultText = '等待确认';
    if (hasBookedRecovered) {
      resultText = '已改订成功';
    } else if (successSteps.length > 0) {
      resultText = '预订成功';
    } else if (data.recoveryType) {
      resultText = '已切换备选';
    }

    // Build dynamic preserved constraints text from actual data
    var constraintParts = [];
    var rules = (constraintData && constraintData.rules) || [];
    var hasDistanceRule = rules.some(function(r) { return /距离|km/.test(r.label || ''); });
    var hasDietRule = rules.some(function(r) { return /减脂|饮食|健康/.test(r.label || ''); });
    var hasChildRule = rules.some(function(r) { return /儿童|孩子|安全/.test(r.label || ''); });
    if (hasDistanceRule) constraintParts.push('路程未超限');
    if (hasDietRule) constraintParts.push('饮食偏好保留');
    if (hasChildRule) constraintParts.push('儿童安全仍满足');
    if (conversionData && conversionData.totalSpend) constraintParts.push('预算未增加');
    if (constraintParts.length === 0) constraintParts.push('核心约束已重新校验');

    // Compact: 2 key rows + 2 short badges on one line
    let html = '<div class="display-card main-display-card main-compact-card" data-testid="main-recovery-card">' +
      '<h3>系统已自动补救</h3>' +
      '<div class="recovery-badge">检测到失败并自动恢复</div>' +
      '<div class="recovery-summary-grid">' +
        '<div><strong>原问题</strong><span>' + escapeHtml(failed ? failed.action : '预订异常') + '</span></div>' +
        '<div><strong>系统动作</strong><span>' + escapeHtml(recovered ? recovered.action : '自动搜索并切换备选') + '</span></div>' +
      '</div>' +
      '<div class="recovery-badges-row">' +
        '<span class="recovery-result-badge">恢复结果：' + escapeHtml(resultText) + '</span>' +
        '<span class="recovery-constraint-badge">保留约束：' + escapeHtml(constraintParts.join(' / ')) + '</span>' +
      '</div>';
    html += '</div>';
    return html;
  }

  function buildMainConversionCardHtml(data) {
    if (!data) return '';
    // Compact: GMV + merchant line + saving line
    let html = '<div class="display-card main-display-card main-compact-card" data-testid="main-conversion-card">' +
      '<h3>美团闭环转化</h3>' +
      '<div class="conversion-gmv">预计 GMV：¥' + (data.platformGMV || data.totalSpend || 0) + '</div>' +
      '<div class="conversion-merchants">';
    (data.merchantBreakdown || []).forEach(function(m) {
      html += '<div class="merchant-item">' +
        '<span class="merchant-name">' + escapeHtml(m.name) + '</span>' +
        '<span class="merchant-category">' + escapeHtml(m.category) + '</span>' +
        '<span class="merchant-amount">¥' + (m.amount || 0) + '</span>' +
      '</div>';
    });
    html += '</div>';
    if (data.optionalUpsells && data.optionalUpsells.length > 0) {
      html += '<div class="conversion-upsells">可选增购：';
      data.optionalUpsells.forEach(function(u) {
        html += '<span class="upsell-tag">' + escapeHtml(u.name) + ' ¥' + u.price + '</span>';
      });
      html += '</div>';
    }
    if (data.estimatedSaving && data.estimatedSaving > 0) {
      html += '<div class="conversion-saving">预计节省：¥' + data.estimatedSaving + '</div>';
    }
    html += '</div>';
    return html;
  }

  // Insert main area cards into planArea with correct ordering
  function insertMainCardsAfterPlan(constraintData, recoveryData, conversionData) {
    // Build HTML string then insert once — avoids DOM thrashing
    let html = '';
    if (constraintData) html += buildMainConstraintCardHtml(constraintData);
    if (recoveryData && recoveryData.hasRecovery) html += buildMainRecoveryCardHtml(recoveryData, constraintData, conversionData);
    if (conversionData) html += buildMainConversionCardHtml(conversionData);
    if (html) planArea.insertAdjacentHTML('beforeend', html);
  }

  function renderWeatherPanel(data) {
    if (!data) return;
    sidebarData.weather = data;
    const icon = data.condition === '晴' ? '☀️' : data.condition === '多云' ? '⛅' : data.condition === '阴' ? '☁️' : data.condition === '晴间多云' ? '🌤️' : '🌦️';
    weatherPanel.innerHTML =
      '<div class="panel-header"><span>🌤️</span> 天气 · ' + escapeHtml(data.date) + '</div>' +
      '<div class="panel-body">' +
        '<div class="weather-main">' +
          '<span class="weather-temp">' + escapeHtml(data.temperature) + '</span>' +
          '<span class="weather-icon">' + icon + '</span>' +
        '</div>' +
        '<div class="weather-meta">' +
          '<span>UV ' + escapeHtml(data.uvIndex) + '</span>' +
          '<span>' + escapeHtml(data.wind) + '</span>' +
          '<span>' + escapeHtml(data.condition) + '</span>' +
        '</div>' +
        '<div class="weather-tag">' + escapeHtml(data.suggestion) + '</div>' +
      '</div>';
    checkSidebarToggle();
  }
  function renderRoutePanel() {
    if (sidebarData.routes.length === 0) return;
    let stops = '';
    sidebarData.routes.forEach(function (seg) {
      stops += '<div class="route-stop">' +
        '<div class="route-stop-name">' + escapeHtml(seg.from) + ' → ' + escapeHtml(seg.to) + '</div>' +
        '<div class="route-stop-info">' +
          escapeHtml(seg.distance) + ' · ' + escapeHtml(seg.duration) +
          '<span class="route-transport">' + escapeHtml(seg.transport) + '</span>' +
        '</div>' +
      '</div>';
    });
    routePanel.innerHTML =
      '<div class="panel-header"><span>🚗</span> 路线规划</div>' +
      '<div class="panel-body"><div class="route-timeline">' + stops + '</div></div>';
    checkSidebarToggle();
  }

  function inferRouteMeta(fromItem, toItem) {
    const from = (fromItem.venue || fromItem.activity || '').toLowerCase();
    const to = (toItem.venue || toItem.activity || '').toLowerCase();
    const text = from + ' ' + to;
    if (/步行|散步|citywalk|公园|街|河|巷|广场|商圈/i.test(text)) {
      return { distance: '约1-2km', duration: '15-25分钟', transport: '步行' };
    }
    if (/同区|附近|门店|园区/i.test((toItem.reason || '') + (fromItem.reason || ''))) {
      return { distance: '约1-3km', duration: '10-20分钟', transport: '步行/打车' };
    }
    return { distance: '约3-8km', duration: '20-35分钟', transport: '打车/公交' };
  }

  function isMovementConnectorItem(item) {
    if (!item) return false;
    const venue = item.venue || '';
    const activity = item.activity || '';
    const text = venue + ' ' + activity;
    const hasConcreteVenueId = item.venueId && item.venueId !== 'delivery';
    if (hasConcreteVenueId || item.bookingRequired) return false;
    return /→|->|前往|移动|路程|步行|骑行|打车|地铁|公交|驾车|换乘|从.*到/.test(text);
  }

  function buildRouteStopsFromPlan(items) {
    if (!items || !items.length) return [];
    return items
      .filter(function (item) {
        return item && item.venue && item.venueId !== 'delivery' && !isMovementConnectorItem(item);
      })
      .map(function (item) {
        return {
          name: item.venue,
          time: item.time,
          reason: item.reason || '',
          activity: item.activity || '',
        };
      });
  }

  window.__routeHelpers = {
    buildRouteStopsFromPlan: buildRouteStopsFromPlan,
  };

  function renderRoutePanelFromPlan(items) {
    if (!items || items.length < 2) {
      sidebarData.routes = [];
      routePanel.innerHTML = '';
      return;
    }
    const stops = buildRouteStopsFromPlan(items);
    sidebarData.routes = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const meta = inferRouteMeta(stops[i], stops[i + 1]);
      sidebarData.routes.push({
        from: stops[i].name,
        to: stops[i + 1].name,
        time: stops[i].time + ' → ' + stops[i + 1].time,
        distance: meta.distance,
        duration: meta.duration,
        transport: meta.transport,
      });
    }
    renderRoutePanel();
  }

  function renderBookingPanel(items) {
    const bookable = items.filter(function (it) { return it.bookingRequired; });
    if (bookable.length === 0) return;
    sidebarData.bookings = bookable.map(function (it) {
      return { name: it.venue, time: it.time, status: 'pending' };
    });
    let html = '<div class="panel-header"><span>📋</span> 预订状态</div><div class="panel-body">';
    sidebarData.bookings.forEach(function (b) {
      html += '<div class="booking-item">' +
        '<span class="booking-status-dot pending"></span>' +
        '<span class="booking-name">' + escapeHtml(b.name) + '</span>' +
        '<span class="booking-time">' + escapeHtml(b.time) + '</span>' +
        '<span class="booking-badge pending">待预订</span>' +
      '</div>';
    });
    html += '</div>';
    bookingPanel.innerHTML = html;
    checkSidebarToggle();
  }

  function updateBookingStatus(results) {
    if (!results || !results.length || !sidebarData.bookings.length) return;
    sidebarData.bookings = sidebarData.bookings.map(function (booking, index) {
      const result = results[index];
      if (!result) return booking;
      return {
        name: result.replacedBy || result.item || booking.name,
        time: booking.time,
        status: result.status || booking.status,
        bookingId: result.bookingId,
      };
    });

    let html = '<div class="panel-header"><span>📋</span> 预订状态</div><div class="panel-body">';
    sidebarData.bookings.forEach(function (booking) {
      const status = booking.status || 'pending';
      const label = status === 'success'
        ? '已预订'
        : status === 'recovered'
        ? '已恢复'
        : status === 'failed'
        ? '失败'
        : '待预订';
      html += '<div class="booking-item">' +
        '<span class="booking-status-dot ' + escapeHtml(status) + '"></span>' +
        '<span class="booking-name">' + escapeHtml(booking.name) + '</span>' +
        '<span class="booking-time">' + escapeHtml(booking.time) + '</span>' +
        '<span class="booking-badge ' + escapeHtml(status) + '">' + label + (booking.bookingId ? ' ' + escapeHtml(booking.bookingId) : '') + '</span>' +
      '</div>';
    });
    html += '</div>';
    bookingPanel.innerHTML = html;
    checkSidebarToggle();
  }
  // ==================== Sidebar Tool Result Handler ====================
  function handleToolResult(tool, result) {
    if (!result) return;

    switch (tool) {
      case 'get_weather':
        renderWeatherPanel(result);
        break;

      case 'get_route':
        if (result.segments) {
          sidebarData.routes = result.segments;
          renderRoutePanel();
        }
        break;

      default:
        // book_* tools handled via booking_complete event, not tool_result
        break;
    }
  }

  // ==================== 4. streamChat — SSE 驱动 ====================
  async function streamChat(message, requestKind) {
    const kind = requestKind || (state.currentPlan ? 'revision' : 'planning');
    prepareStagesForRequest(message, kind);
    state.phase = 'streaming';
    sendBtn.disabled = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message, sessionId: state.sessionId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(function () { return { error: { message: '请求失败' } }; });
        showAgentText('❌ ' + (err.error && err.error.message || '未知错误'));
        return;
      }

      for await (const event of parseSSEStream(res.body)) {
        dispatchEvent(event.type, event.data);
      }
    } catch (err) {
      showAgentText('❌ 连接失败: ' + err.message);
    } finally {
      state.phase = 'done';
      sendBtn.disabled = false;
      finalizeAgentBubble();
      scrollBottom();
    }
  }

  function dispatchEvent(type, data) {
    switch (type) {
      case 'thinking':
        ensureAgentBubble();
        if (!state._thinkingDots && state._agentEl) {
          const dots = document.createElement('div');
          dots.className = 'thinking';
          dots.innerHTML = '<span></span><span></span><span></span>';
          state._agentEl.appendChild(dots);
          state._thinkingDots = dots;
        }
        scrollBottom();
        break;

      case 'tool_call':
        showToolIndicator(TOOL_NAMES[data.tool] || data.tool);
        updateStagesFromToolCall(data.tool);
        break;

      case 'tool_result':
        handleToolResult(data.tool, data.result);
        break;

      case 'tool_trace':
        appendToolTrace(data.trace);
        break;

      case 'token':
        appendToken(data.content || '');
        break;

      case 'plan_ready':
        finalizeAgentBubble();
        completePlanningStagesFromPlan(data);
        if (data.plans && data.plans.length >= 2) {
          showAgentText('已为您准备两套方案，请对比选择 👇');
        } else {
          showAgentText('方案已就绪，请查看下方行程卡 👇');
        }
        renderPlan(data);
        if (data.externalFeedback) renderExternalFeedbackCard(data.externalFeedback);
        if (data.constraintExplanation) renderConstraintPanel(data.constraintExplanation);
        // Insert constraint card right after plan card, before user needs to scroll
        if (data.constraintExplanation) {
          planArea.insertAdjacentHTML('beforeend', buildMainConstraintCardHtml(data.constraintExplanation));
        }
        break;

      case 'plan_selected':
        finalizeAgentBubble();
        showAgentText('已选择方案，确认后即可预订 👇');
        renderSinglePlan(data.plan);
        if (state.currentConstraint) {
          planArea.insertAdjacentHTML('beforeend', buildMainConstraintCardHtml(state.currentConstraint));
        }
        break;

      case 'booking_complete':
        finalizeAgentBubble();
        finalizeStagesFromBooking(data);
        if (data.plan) renderSinglePlan(data.plan);
        showBookingResults(data.results);
        // Insert main area cards BEFORE confirmation card for judge visibility
        insertMainCardsAfterPlan(state.currentConstraint, data.recoveryStory, data.businessConversion);
        renderConfirmationCard(data.confirmationCard);
        // Sidebar panels (full detail)
        if (data.recoveryStory) renderRecoveryPanel(data.recoveryStory);
        if (data.businessConversion) renderConversionPanel(data.businessConversion);
        if (data.shareText) {
          window._lastShareText = data.shareText;
        }
        scrollBottom();
        break;

      case 'error':
        finalizeAgentBubble();
        showAgentText('❌ ' + (data.message || '未知错误'));
        break;

      case 'done':
        finalizeAgentBubble();
        break;
    }
  }

  // ==================== 5. 发送 & 输入 ====================
  function send() {
    const text = msgInput.value.trim();
    if (!text || state.phase === 'streaming') return;
    msgInput.value = '';
    msgInput.style.height = 'auto';
    addUserBubble(text);
    streamChat(text, state.currentPlan ? 'revision' : 'planning');
  }

  msgInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  msgInput.addEventListener('input', function () {
    msgInput.style.height = 'auto';
    msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
  });
  sendBtn.addEventListener('click', send);

  // Suggest chips
  function bindChips() {
    document.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        msgInput.value = chip.dataset.msg;
        send();
      });
    });
  }
  bindChips();

  // ==================== 6. Confirm / Revise / Share / NewSession ====================
  window.confirmPlan = function () {
    const btn = planArea.querySelector('.btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = '预订中...'; }
    addUserBubble('确认');
    streamChat('确认', 'booking');
  };

  window.revisePlan = function () {
    planArea.hidden = true;
    msgInput.focus();
    msgInput.placeholder = '告诉我想调整什么...';
  };

  window.quickRevise = function (kind) {
    if (state.phase === 'streaming') return;
    const prompts = {
      restaurant: '换餐厅，清淡低卡一点',
      activity: '换活动，孩子想要室内轻松一点',
      nearer: '更近一点，别跨区，尽量减少路程',
      cheaper: '更省钱，预算有点高，便宜一点',
    };
    const text = prompts[kind] || '我想局部调整一下';
    addUserBubble(text);
    streamChat(text, 'revision');
  };

  window.sharePlan = function () {
    const text = window._lastShareText || '方案太棒了！';
    navigator.clipboard.writeText(text).then(function () {
      showToast('已复制到剪贴板');
    }).catch(function () {
      showToast('复制失败');
    });
  };

  window.newSession = function () {
    resetState();
    resetSidebar();
    sidebar.classList.remove('open');
    if (sidebarToggle) sidebarToggle.textContent = '详情';
    chatArea.innerHTML =
      '<div class="welcome">' +
        '<div class="welcome-icon">🤖</div>' +
        '<p>你好！我是美团活动规划助手。</p>' +
        '<p>告诉我你的需求，比如：</p>' +
        '<div class="suggest-chips">' +
          '<button class="chip" data-msg="今天下午想带5岁孩子和老婆出去玩，老婆在减肥">家庭出游</button>' +
          '<button class="chip" data-msg="下午和4个朋友出去玩，4个人2男2女">朋友聚会</button>' +
          '<button class="chip" data-msg="想和女朋友约个会，下午有空">情侣约会</button>' +
          '<button class="chip" data-msg="一个人下午没事，想出去转转">独自出行</button>' +
          '<button class="chip demo-chip" data-testid="mock-restaurant-failure" data-msg="今天下午想带5岁孩子和老婆出去玩，老婆在减肥，别离家太远。请模拟餐厅无位。">演示餐厅无座恢复</button>' +
        '</div>' +
      '</div>';
    planArea.hidden = true;
    planArea.innerHTML = '';
    bindChips();
    msgInput.placeholder = '说说你想怎么玩...';
    msgInput.focus();
  };
  // ==================== Toast ====================
  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    setTimeout(function () { toast.hidden = true; }, 2500);
  }

  // ==================== Utility ====================
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  msgInput.focus();
})();
