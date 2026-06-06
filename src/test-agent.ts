import 'dotenv/config.js';
import { handleUserMessage } from './agent/router.js';

const SESSION_ID = 'test';

function log(prefix: string, data: unknown) {
  if (typeof data === 'string') {
    process.stdout.write(data);
  } else {
    console.log(`[${prefix}]`, JSON.stringify(data, null, 2));
  }
}

async function runTest(label: string, message: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${label}`);
  console.log(`INPUT: ${message}`);
  console.log('='.repeat(60));

  for await (const event of handleUserMessage(SESSION_ID, message)) {
    switch (event.type) {
      case 'token':
        process.stdout.write(event.content as string);
        break;
      case 'tool_call':
        log('TOOL_CALL', { tool: event.tool, args: event.args });
        break;
      case 'tool_result':
        log('TOOL_RESULT', { tool: event.tool });
        break;
      case 'plan_ready':
        log('PLAN_READY', event.plan);
        break;
      case 'booking_complete':
        log('BOOKING_COMPLETE', event.results);
        break;
      case 'error':
        log('ERROR', event.message);
        break;
      case 'done':
        console.log('\n[DONE]');
        break;
    }
  }
}

async function main() {
  console.log('=== Agent E2E Test ===');
  console.log(`Model: ${process.env.MODEL || 'deepseek-chat'}`);
  console.log(`API Key: ${process.env.DEEPSEEK_API_KEY ? '***configured***' : '***MISSING***'}`);

  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('\nError: DEEPSEEK_API_KEY is required. Set it in .env');
    process.exit(1);
  }

  // Test 1: Planning
  await runTest(
    'Planning — 家庭半日活动',
    '今天下午想带孩子和老婆出去，老婆在减肥，孩子5岁，推荐一个半日活动方案',
  );

  // Test 2: Confirmation
  await runTest(
    'Confirmation — 确认方案',
    '确认，就这样吧',
  );

  // Test 3: Completed state
  await runTest(
    'Completed — 重新开始',
    '再来一个方案',
  );
}

main().catch(console.error);
