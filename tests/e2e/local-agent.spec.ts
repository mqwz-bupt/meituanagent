import { expect, test } from '@playwright/test';

async function runFlow(page, input: string) {
  await page.goto('/');
  await page.locator('#msgInput').fill(input);
  await page.locator('#sendBtn').click();
  await expect(page.locator('#planArea')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#timelinePanel')).toContainText('搜索', { timeout: 30_000 });
  await page.getByRole('button', { name: /确认|预订/ }).first().click();
  await expect(page.locator('[data-testid="confirmation-card"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#timelinePanel')).toContainText('预订', { timeout: 30_000 });
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(/BK-|RCV-|MOCK|OD-/);
}

const stageKeys = ['intent', 'activity_search', 'restaurant_search', 'route', 'validation', 'booking', 'share'];

function stage(page, key: string) {
  return page.locator(`[data-testid="agent-stage-timeline"] [data-stage-key="${key}"]`);
}

async function expectStageStatus(page, key: string, allowed: string[]) {
  await expect.poll(async () => {
    const status = await stage(page, key).getAttribute('data-stage-status');
    return status ? allowed.includes(status) : false;
  }).toBe(true);
}

test('family scenario: input -> plan -> confirmation -> booking -> share', async ({ page }) => {
  await runFlow(page, '今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(/老婆|减脂|孩子/);
  // Three display cards
  await expect(page.locator('#constraintPanel')).toContainText('约束解释');
  await expect(page.locator('#constraintPanel')).toContainText('5岁儿童安全');
  await expect(page.locator('#conversionPanel')).toContainText('商业转化');
  await expect(page.locator('#conversionPanel')).toContainText('¥');
  await expect(page.locator('#recoveryPanel')).toContainText('执行兜底');
  // Business realism: GMV, completed actions, optional upsell, estimated saving
  await expect(page.locator('#conversionPanel')).toContainText('GMV');
  await expect(page.locator('#conversionPanel')).toContainText('已完成履约');
  await expect(page.locator('#conversionPanel')).toContainText('可选增购');
  await expect(page.locator('#conversionPanel')).toContainText('预计节省');
});

test('friends scenario: input -> plan -> confirmation -> booking -> share', async ({ page }) => {
  await runFlow(page, '今天下午我们 4 个朋友，2 男 2 女，想找个轻松一点的 citywalk 加晚饭安排。');
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(/朋友|大家|4/);
  // Business realism: group coupon or 4-person
  await expect(page.locator('#conversionPanel')).toContainText('商业转化');
  await expect(page.locator('#conversionPanel')).toContainText('团购');
});

test('restaurant full recovery: failed -> recovered -> booking success', async ({ page }) => {
  await runFlow(page, '今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。请模拟餐厅无位。');
  await expect(page.locator('#timelinePanel')).toContainText('failed', { timeout: 30_000 });
  await expect(page.locator('#timelinePanel')).toContainText('recovered', { timeout: 30_000 });
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(/改订|确认号|RCV/);
  // Recovery story card
  await expect(page.locator('#recoveryPanel')).toContainText('异常处理记录');
  await expect(page.locator('#recoveryPanel')).toContainText('已改订');
  // Business realism: recovery shows district strategy
  await expect(page.locator('#recoveryPanel')).toContainText(/recovery/);
});

test('revision: family plan -> restaurant too oily -> partial replan', async ({ page }) => {
  // Step 1: Generate initial family plan
  await page.goto('/');
  await page.locator('#msgInput').fill('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥');
  await page.locator('#sendBtn').click();
  await expect(page.locator('#planArea')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#timelinePanel')).toContainText('搜索', { timeout: 30_000 });

  // Record original plan items: extract venue names from plan items
  const originalPlan = await page.evaluate(() => {
    const items = document.querySelectorAll('#planArea .plan-item');
    return Array.from(items).map(item => {
      const h4 = item.querySelector('h4')?.textContent ?? '';
      const p = item.querySelector('.plan-detail p')?.textContent ?? '';
      return { activity: h4, detail: p };
    });
  });
  // Original has activity (first item) and restaurant (third item with bookingRequired)
  const originalActivityName = originalPlan[0]?.activity ?? '';
  const originalRestaurantDetail = originalPlan[2]?.detail ?? '';
  // Restaurant detail format: "venueName · cost" — extract venue name
  const originalRestaurantName = originalRestaurantDetail.split('·')[0].trim();

  // Step 2: Send revision feedback
  await page.locator('#msgInput').fill('这家餐厅太油了，换一家清淡点的');
  await page.locator('#sendBtn').click();
  await expect(page.locator('#planArea')).toBeVisible({ timeout: 30_000 });

  // Step 3: Assert revision trace in timeline
  await expect(page.locator('#timelinePanel')).toContainText('收到反馈', { timeout: 30_000 });
  await expect(page.locator('#timelinePanel')).toContainText('保留活动');
  await expect(page.locator('#timelinePanel')).toContainText('搜索替代餐厅');
  // Evidence of diet-related revision
  await expect(page.locator('#timelinePanel')).toContainText(/饮食偏好|清淡|低卡|轻食|健康|plan_revised/);
  // Evidence of restaurant replacement
  await expect(page.locator('#timelinePanel')).toContainText(/餐厅更换|更换餐厅|替代餐厅/);

  await expect(page.locator('[data-testid="feedback-card"]')).toBeVisible({ timeout: 30_000 });

  // Step 4: Extract revised plan items
  const revisedPlan = await page.evaluate(() => {
    const items = document.querySelectorAll('#planArea .plan-item');
    return Array.from(items).map(item => {
      const h4 = item.querySelector('h4')?.textContent ?? '';
      const p = item.querySelector('.plan-detail p')?.textContent ?? '';
      return { activity: h4, detail: p };
    });
  });
  const revisedActivityName = revisedPlan[0]?.activity ?? '';
  const revisedRestaurantDetail = revisedPlan[2]?.detail ?? '';
  const revisedRestaurantName = revisedRestaurantDetail.split('·')[0].trim();

  // Activity must stay the same
  expect(revisedActivityName).toBe(originalActivityName);
  // Restaurant must change
  expect(revisedRestaurantName).not.toBe(originalRestaurantName);

  // Step 5: Confirm and book — confirmation card should use new restaurant
  await page.getByRole('button', { name: /确认|预订/ }).first().click();
  await expect(page.locator('[data-testid="confirmation-card"]')).toBeVisible({ timeout: 30_000 });
  // Confirmation card restaurant section should contain new restaurant name
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(revisedRestaurantName);
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(/BK-|RCV-|MOCK|OD-/);
  // Share text should use new restaurant
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(revisedRestaurantName);
});

test('revision: queue avoidance -> no-wait restaurant', async ({ page }) => {
  // Step 1: Generate initial plan
  await page.goto('/');
  await page.locator('#msgInput').fill('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁');
  await page.locator('#sendBtn').click();
  await expect(page.locator('#planArea')).toBeVisible({ timeout: 30_000 });

  // Record original restaurant
  const originalPlan = await page.evaluate(() => {
    const items = document.querySelectorAll('#planArea .plan-item');
    return Array.from(items).map(item => ({
      detail: item.querySelector('.plan-detail p')?.textContent ?? '',
    }));
  });
  const originalRestaurantName = originalPlan[2]?.detail.split('·')[0].trim() ?? '';

  // Step 2: Send queue avoidance feedback
  await page.locator('#msgInput').fill('不想排队，换一家不用等的');
  await page.locator('#sendBtn').click();
  await expect(page.locator('#planArea')).toBeVisible({ timeout: 30_000 });

  // Step 3: Assert revision trace with specific events
  await expect(page.locator('#timelinePanel')).toContainText('收到反馈', { timeout: 30_000 });
  await expect(page.locator('#timelinePanel')).toContainText('搜索替代餐厅');
  // Timeline should contain queue_avoid evidence
  const timelineText = await page.locator('#timelinePanel').textContent();
  expect(timelineText).toMatch(/排队|queue|等待/);
  // Timeline should contain plan_revised evidence
  await expect(page.locator('#timelinePanel')).toContainText(/plan_revised|路线已更新|局部重规划完成/);

  await expect(page.locator('[data-testid="feedback-card"]')).toBeVisible({ timeout: 30_000 });

  // Extract revised restaurant
  const revisedPlan = await page.evaluate(() => {
    const items = document.querySelectorAll('#planArea .plan-item');
    return Array.from(items).map(item => ({
      detail: item.querySelector('.plan-detail p')?.textContent ?? '',
    }));
  });
  const revisedRestaurantName = revisedPlan[2]?.detail.split('·')[0].trim() ?? '';
  // Restaurant should change (queue avoidance found alternative)
  expect(revisedRestaurantName).not.toBe(originalRestaurantName);

  // Step 4: Confirm and book — booking_complete should use alternative restaurant
  await page.getByRole('button', { name: /确认|预订/ }).first().click();
  await expect(page.locator('[data-testid="confirmation-card"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(revisedRestaurantName);
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(/BK-|RCV-|MOCK|OD-/);
});

test('external feedback: friends think route is too far -> local replan card and share copy', async ({ page }) => {
  await page.goto('/');
  await page.locator('#msgInput').fill('今天下午我们 4 个朋友，2 男 2 女，想找个轻松一点的 citywalk 加晚饭安排。');
  await page.locator('#sendBtn').click();
  await expect(page.locator('#planArea')).toBeVisible({ timeout: 30_000 });

  await page.locator('#msgInput').fill('朋友说太远了，能不能近一点。');
  await page.locator('#sendBtn').click();

  await expect(page.locator('[data-testid="feedback-card"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="feedback-card"]')).toContainText('收到反馈，已局部调整');
  await expect(page.locator('[data-testid="feedback-card"]')).toContainText(/反馈来源：朋友|反馈来源：群聊/);
  await expect(page.locator('[data-testid="feedback-card"]')).toContainText('保留了');
  await expect(page.locator('[data-testid="feedback-card"]')).toContainText('替换了');
  await expect(page.locator('[data-testid="feedback-card"]')).toContainText('新分享文案');
  await expect(page.locator('#timelinePanel')).toContainText('来自朋友反馈', { timeout: 30_000 });
});

test('external feedback: wife thinks restaurant is too oily -> keep activity and replace restaurant', async ({ page }) => {
  await page.goto('/');
  await page.locator('#msgInput').fill('今天下午想带5岁孩子和老婆出去玩，老婆在减肥。');
  await page.locator('#sendBtn').click();
  await expect(page.locator('#planArea')).toBeVisible({ timeout: 30_000 });

  const originalPlan = await page.evaluate(() => {
    const items = document.querySelectorAll('#planArea .plan-item');
    return Array.from(items).map(item => ({
      activity: item.querySelector('h4')?.textContent ?? '',
      detail: item.querySelector('.plan-detail p')?.textContent ?? '',
    }));
  });
  const originalActivityName = originalPlan[0]?.activity ?? '';
  const originalRestaurantName = (originalPlan[2]?.detail ?? '').split('路')[0].trim();

  await page.locator('#msgInput').fill('老婆说这家餐厅太油了，换清淡点。');
  await page.locator('#sendBtn').click();

  await expect(page.locator('[data-testid="feedback-card"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="feedback-card"]')).toContainText('反馈来源：老婆');
  await expect(page.locator('[data-testid="feedback-card"]')).toContainText(/餐厅太油|更清淡|清淡/);
  await expect(page.locator('[data-testid="feedback-card"]')).toContainText(/适合发给老婆|老婆/);

  const revisedPlan = await page.evaluate(() => {
    const items = document.querySelectorAll('#planArea .plan-item');
    return Array.from(items).map(item => ({
      activity: item.querySelector('h4')?.textContent ?? '',
      detail: item.querySelector('.plan-detail p')?.textContent ?? '',
    }));
  });
  const revisedActivityName = revisedPlan[0]?.activity ?? '';
  const revisedRestaurantName = (revisedPlan[2]?.detail ?? '').split('路')[0].trim();

  expect(revisedActivityName).toBe(originalActivityName);
  expect(revisedRestaurantName).not.toBe(originalRestaurantName);
});

test('judge-visible stage timeline and cards are visible on family flow', async ({ page }) => {
  await runFlow(page, '今天下午想带5岁孩子和老婆出去玩，老婆在减肥，别离家太远');

  await expect(page.locator('[data-testid="agent-stage-timeline"]')).toContainText('需求解析');
  await expect(page.locator('[data-testid="agent-stage-timeline"]')).toContainText('活动搜索');
  await expect(page.locator('[data-testid="agent-stage-timeline"]')).toContainText('餐厅搜索');
  await expect(page.locator('[data-testid="agent-stage-timeline"]')).toContainText('路线计算');
  await expect(page.locator('[data-testid="agent-stage-timeline"]')).toContainText('方案校验');
  await expect(page.locator('[data-testid="agent-stage-timeline"]')).toContainText('预订执行');
  await expect(page.locator('[data-testid="agent-stage-timeline"]')).toContainText('分享生成');
  await expect(page.locator('[data-testid="constraint-card"]')).toContainText('约束解释');
  await expect(page.locator('[data-testid="recovery-card"]')).toContainText(/执行兜底|异常恢复/);
});

test('judge-visible quick revision buttons use local replan controls', async ({ page }) => {
  await page.goto('/');
  await page.locator('#msgInput').fill('今天下午想带5岁孩子和老婆出去玩，老婆在减肥');
  await page.locator('#sendBtn').click();
  await expect(page.locator('#planArea')).toBeVisible({ timeout: 30_000 });

  await expect(page.locator('[data-testid="quick-revise-restaurant"]')).toBeVisible();
  await expect(page.locator('[data-testid="quick-revise-activity"]')).toBeVisible();
  await expect(page.locator('[data-testid="quick-revise-nearer"]')).toBeVisible();
  await expect(page.locator('[data-testid="quick-revise-cheaper"]')).toBeVisible();

  const originalActivity = await page.locator('#planArea .plan-item').nth(0).textContent();
  await page.locator('[data-testid="quick-revise-restaurant"]').click();
  await expect(page.locator('[data-testid="feedback-card"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#timelinePanel')).toContainText(/保留活动/, { timeout: 30_000 });
  await expect(page.locator('[data-testid="agent-stage-timeline"]')).toContainText(/局部调整|餐厅搜索/);
  await expect(page.locator('#planArea .plan-item').nth(0)).toContainText(originalActivity?.slice(0, 8) ?? '');
});

test('judge-visible mock failure entry explains recovery', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="mock-restaurant-failure"]').click();

  await expect(page.locator('#planArea')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /确认|方案|预订/ }).first().click();

  await expect(page.locator('[data-testid="recovery-card"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="recovery-card"]')).toContainText('原方案哪里失败');
  await expect(page.locator('[data-testid="recovery-card"]')).toContainText('系统如何替换');
  await expect(page.locator('[data-testid="recovery-card"]')).toContainText('仍然满足');
  await expect(page.locator('[data-testid="recovery-card"]')).toContainText('最终执行');
  await expect(page.locator('[data-testid="agent-stage-timeline"]')).toContainText('预订执行');
});
test('stage overview appears immediately with all seven stages', async ({ page }) => {
  await page.goto('/');
  await page.locator('#msgInput').fill('今天下午想带5岁孩子和老婆出去玩，老婆在减肥');
  await page.locator('#sendBtn').click();

  await expect(page.locator('[data-testid="agent-stage-timeline"]')).toBeVisible({ timeout: 5_000 });
  for (const key of stageKeys) {
    await expect(stage(page, key)).toBeVisible();
  }
  await expectStageStatus(page, 'intent', ['running', 'completed']);
});

test('stage overview shows running state before stages complete', async ({ page }) => {
  await page.goto('/');

  const sawActivityRunning = page.evaluate(() => new Promise<boolean>(resolve => {
    const finish = (value: boolean) => {
      observer.disconnect();
      clearTimeout(timer);
      resolve(value);
    };
    const check = () => {
      const item = document.querySelector('[data-testid="agent-stage-timeline"] [data-stage-key="activity_search"]');
      if (item?.getAttribute('data-stage-status') === 'running') finish(true);
    };
    const observer = new MutationObserver(check);
    const timer = window.setTimeout(() => finish(false), 10_000);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-stage-status'],
    });
    check();
  }));

  await page.locator('#msgInput').fill('今天下午想带5岁孩子和老婆出去玩，老婆在减肥，别离家太远');
  await page.locator('#sendBtn').click();

  await expect(sawActivityRunning).resolves.toBe(true);
  await expect(page.locator('#planArea')).toBeVisible({ timeout: 30_000 });
  await expectStageStatus(page, 'activity_search', ['completed', 'recovered']);
});

test('planning fallback completes the five planning stages', async ({ page }) => {
  await page.goto('/');
  await page.locator('#msgInput').fill('今天下午想带5岁孩子和老婆出去玩，老婆在减肥，别离家太远');
  await page.locator('#sendBtn').click();
  await expect(page.locator('#planArea')).toBeVisible({ timeout: 30_000 });

  for (const key of ['intent', 'activity_search', 'restaurant_search', 'route', 'validation']) {
    await expectStageStatus(page, key, ['completed', 'recovered']);
  }
});

test('normal booking finalizes booking and share stages', async ({ page }) => {
  await runFlow(page, '今天下午想带5岁孩子和老婆出去玩，老婆在减肥，别离家太远');

  await expectStageStatus(page, 'booking', ['completed']);
  await expectStageStatus(page, 'share', ['completed']);
});

test('restaurant failure recovery keeps full chain and raw trace evidence', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="mock-restaurant-failure"]').click();
  await expect(page.locator('#planArea')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /确认|方案|预订/ }).first().click();
  await expect(page.locator('[data-testid="confirmation-card"]')).toBeVisible({ timeout: 30_000 });

  await expectStageStatus(page, 'activity_search', ['completed', 'recovered']);
  await expectStageStatus(page, 'route', ['completed', 'recovered']);
  await expectStageStatus(page, 'restaurant_search', ['completed', 'recovered']);
  await expectStageStatus(page, 'validation', ['completed', 'recovered']);
  await expectStageStatus(page, 'booking', ['completed', 'recovered']);
  await expectStageStatus(page, 'share', ['completed']);
  await expect(page.locator('[data-testid="tool-trace-list"]')).toContainText('failed');
  await expect(page.locator('[data-testid="tool-trace-list"]')).toContainText('recovered');
});

// === P0-3: New scenario E2E tests ===

test('couple scenario: romantic date plan without child safety constraints', async ({ page }) => {
  await runFlow(page, '今天下午想和女朋友出去约会，找个浪漫一点的地方');
  // Plan should not mention family/children themes
  const planText = await page.locator('#planArea').textContent();
  expect(planText).not.toContain('亲子');
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(/BK-|RCV-|MOCK|OD-/);
});

test('solo scenario: single person exploration plan', async ({ page }) => {
  await runFlow(page, '今天下午自己一个人出去逛逛，找个展览或者咖啡厅坐坐');
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(/BK-|RCV-|MOCK|OD-/);
  const planText = await page.locator('#planArea').textContent();
  expect(planText).not.toContain('亲子');
});

test('team scenario: group team building plan', async ({ page }) => {
  await runFlow(page, '公司部门团建下午活动加聚餐，8个人左右，找个大桌能坐得下的地方');
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(/BK-|RCV-|MOCK|OD-/);
  const planText = await page.locator('#planArea').textContent();
  expect(planText).not.toContain('亲子');
});

// === P0-3: Full-flow E2E for couple, solo, team ===

test('couple full flow: plan -> constraint card -> booking -> scenario semantic', async ({ page }) => {
  await runFlow(page, '今天下午想和女朋友约个会，她最近在减肥，想轻松一点有氛围感。');
  // Constraint card visible without child safety
  await expect(page.locator('[data-testid="main-constraint-card"]')).toBeVisible({ timeout: 30_000 });
  const constraintText = await page.locator('[data-testid="main-constraint-card"]').textContent();
  expect(constraintText).not.toContain('亲子');
  expect(constraintText).not.toContain('孩子安全');
  expect(constraintText).not.toContain('儿童安全');
  // Scenario semantic: plan area should have couple-themed content
  const planText = await page.locator('#planArea').textContent();
  expect(planText).toMatch(/约会|情侣|氛围|浪漫|拍照|展览|散步|漫步|文艺|二人/);
  // Booking completed
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(/BK-|RCV-|MOCK|OD-/);
});

test('solo full flow: plan -> constraint card -> booking -> scenario semantic', async ({ page }) => {
  await runFlow(page, '今天下午我一个人出去走走，想安静一点，可以喝咖啡看书。');
  // Constraint card visible without child safety
  await expect(page.locator('[data-testid="main-constraint-card"]')).toBeVisible({ timeout: 30_000 });
  const constraintText = await page.locator('[data-testid="main-constraint-card"]').textContent();
  expect(constraintText).not.toContain('亲子');
  expect(constraintText).not.toContain('孩子安全');
  // Scenario semantic
  const planText = await page.locator('#planArea').textContent();
  expect(planText).toMatch(/一个人|独自|自由|咖啡|书店|轻食|安静|展览|文艺/);
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(/BK-|RCV-|MOCK|OD-/);
});

test('team full flow: plan -> constraint card -> booking -> scenario semantic', async ({ page }) => {
  await runFlow(page, '今天下午同事团建，8个人，预算适中，最好活动和吃饭都能安排。');
  // Constraint card visible without child safety
  await expect(page.locator('[data-testid="main-constraint-card"]')).toBeVisible({ timeout: 30_000 });
  const constraintText = await page.locator('[data-testid="main-constraint-card"]').textContent();
  expect(constraintText).not.toContain('亲子');
  expect(constraintText).not.toContain('孩子安全');
  // Scenario semantic
  const planText = await page.locator('#planArea').textContent();
  expect(planText).toMatch(/团建|同事|多人|预算|大桌|包间|团队|聚餐|互动/);
  await expect(page.locator('[data-testid="confirmation-card"]')).toContainText(/BK-|RCV-|MOCK|OD-/);
});

// === P1: Main area display card tests ===

test('main area shows constraint card "为什么适合你" for family scenario', async ({ page }) => {
  await runFlow(page, '今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
  await expect(page.locator('[data-testid="main-constraint-card"]')).toBeVisible();
  await expect(page.locator('[data-testid="main-constraint-card"]')).toContainText('为什么适合你');
  await expect(page.locator('[data-testid="main-constraint-card"]')).toContainText(/儿童|安全|减脂|距离/);
});

test('main area constraint card excludes child safety for couple scenario', async ({ page }) => {
  await runFlow(page, '今天下午想和女朋友出去约会，找个浪漫一点的地方');
  await expect(page.locator('[data-testid="main-constraint-card"]')).toBeVisible();
  const cardText = await page.locator('[data-testid="main-constraint-card"]').textContent();
  expect(cardText).not.toContain('亲子');
  expect(cardText).not.toContain('孩子安全');
});

test('main area constraint card excludes child safety for solo scenario', async ({ page }) => {
  await runFlow(page, '今天下午自己一个人出去逛逛，找个展览或者咖啡厅坐坐');
  await expect(page.locator('[data-testid="main-constraint-card"]')).toBeVisible();
  const cardText = await page.locator('[data-testid="main-constraint-card"]').textContent();
  expect(cardText).not.toContain('亲子');
  expect(cardText).not.toContain('孩子安全');
});

test('main area constraint card excludes child safety for team scenario', async ({ page }) => {
  await runFlow(page, '公司部门团建下午活动加聚餐，8个人左右，找个大桌能坐得下的地方');
  await expect(page.locator('[data-testid="main-constraint-card"]')).toBeVisible();
  const cardText = await page.locator('[data-testid="main-constraint-card"]').textContent();
  expect(cardText).not.toContain('亲子');
  expect(cardText).not.toContain('孩子安全');
});

test('main area shows recovery card after mock restaurant failure', async ({ page }) => {
  await runFlow(page, '今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。请模拟餐厅无位。');
  await expect(page.locator('[data-testid="main-recovery-card"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="main-recovery-card"]')).toContainText('系统已自动补救');
  await expect(page.locator('[data-testid="main-recovery-card"]')).toContainText('原问题');
  await expect(page.locator('[data-testid="main-recovery-card"]')).toContainText('系统动作');
  await expect(page.locator('[data-testid="main-recovery-card"]')).toContainText('恢复结果');
  await expect(page.locator('[data-testid="main-recovery-card"]')).toContainText('保留约束');
});

test('main area shows conversion card "美团闭环转化" after booking', async ({ page }) => {
  await runFlow(page, '今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
  await expect(page.locator('[data-testid="main-conversion-card"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="main-conversion-card"]')).toContainText('美团闭环转化');
  await expect(page.locator('[data-testid="main-conversion-card"]')).toContainText('GMV');
  await expect(page.locator('[data-testid="main-conversion-card"]')).toContainText('¥');
});

test('main area constraint card updates after revision', async ({ page }) => {
  await page.goto('/');
  await page.locator('#msgInput').fill('今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥');
  await page.locator('#sendBtn').click();
  await expect(page.locator('#planArea')).toBeVisible({ timeout: 30_000 });

  // Initial constraint card visible
  await expect(page.locator('[data-testid="main-constraint-card"]')).toBeVisible();
  await expect(page.locator('[data-testid="main-constraint-card"]')).toContainText('为什么适合你');

  // Send revision
  await page.locator('#msgInput').fill('这家餐厅太油了，换一家清淡点的');
  await page.locator('#sendBtn').click();
  await expect(page.locator('#planArea')).toBeVisible({ timeout: 30_000 });

  // Constraint card still visible and updated after revision
  await expect(page.locator('[data-testid="main-constraint-card"]')).toBeVisible();
  await expect(page.locator('[data-testid="main-constraint-card"]')).toContainText('为什么适合你');
});

// === P1.5: Card ordering and visibility ===

test('main area cards appear before confirmation card after booking', async ({ page }) => {
  await runFlow(page, '今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
  // All main cards visible
  await expect(page.locator('[data-testid="main-constraint-card"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="main-conversion-card"]')).toBeVisible({ timeout: 30_000 });
  // Verify constraint card comes before confirmation card in DOM order
  const cards = await page.locator('#planArea > .display-card, #planArea > .confirmation-card').all();
  const constraintIdx = await (async () => {
    for (let i = 0; i < cards.length; i++) {
      const id = await cards[i].getAttribute('data-testid');
      if (id === 'main-constraint-card') return i;
    }
    return -1;
  })();
  const confirmIdx = await (async () => {
    for (let i = 0; i < cards.length; i++) {
      const id = await cards[i].getAttribute('data-testid');
      if (id === 'confirmation-card') return i;
    }
    return -1;
  })();
  expect(constraintIdx).toBeGreaterThanOrEqual(0);
  expect(confirmIdx).toBeGreaterThanOrEqual(0);
  expect(constraintIdx).toBeLessThan(confirmIdx);
});

test('recovery card hidden when no recovery event', async ({ page }) => {
  await runFlow(page, '今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。');
  // No recovery event — main-recovery-card should NOT be in DOM
  await expect(page.locator('[data-testid="main-recovery-card"]')).toHaveCount(0, { timeout: 30_000 });
});

test('recovery card has dynamic preserved constraints (not hardcoded)', async ({ page }) => {
  await runFlow(page, '今天下午想和老婆孩子出去玩几个小时，孩子 5 岁，老婆最近在减肥，别离家太远。请模拟餐厅无位。');
  await expect(page.locator('[data-testid="main-recovery-card"]')).toBeVisible({ timeout: 30_000 });
  // Must contain all four fields
  await expect(page.locator('[data-testid="main-recovery-card"]')).toContainText('保留约束');
  await expect(page.locator('[data-testid="main-recovery-card"]')).toContainText('恢复结果');
  await expect(page.locator('[data-testid="main-recovery-card"]')).toContainText('原问题');
  await expect(page.locator('[data-testid="main-recovery-card"]')).toContainText('系统动作');
  // Must NOT contain the old hardcoded exact string
  const cardText = await page.locator('[data-testid="main-recovery-card"]').textContent();
  expect(cardText).not.toContain('预算不变 / 路程未超限 / 饮食偏好保留');
  // Should contain at least one dynamic constraint derived from data
  expect(cardText).toMatch(/路程|饮食|预算|儿童|核心约束/);
});
