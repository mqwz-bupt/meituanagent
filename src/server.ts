import 'dotenv/config';
import express from 'express';
import type { Socket } from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isTestShutdownEnabled = process.env.NODE_ENV === 'test' || process.env.E2E === 'true';
const sockets = new Set<Socket>();
const sseHeartbeats = new Set<NodeJS.Timeout>();
let isShuttingDown = false;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// CORS for local dev
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      hasApiKey: !!process.env.DEEPSEEK_API_KEY,
      model: process.env.MODEL || 'deepseek-chat',
    },
  });
});

// POST /api/chat — SSE streaming endpoint
app.post('/api/test/shutdown', (_req, res) => {
  if (!isTestShutdownEnabled) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'not found' } });
    return;
  }

  res.status(202).json({ data: { status: 'shutting_down' } });
  setImmediate(() => shutdown('test_api'));
});

app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || !sessionId) {
    res.status(400).json({ error: { code: 'MISSING_PARAMS', message: '需要 message 和 sessionId' } });
    return;
  }
  if (typeof message !== 'string' || message.length > 2000) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'message 必须是字符串且不超过2000字' } });
    return;
  }
  if (typeof sessionId !== 'string' || sessionId.length > 64) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'sessionId 格式不合法' } });
    return;
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.write('retry: 3000\n\n'); // 客户端断线3秒后重连
  res.flushHeaders();

  // 心跳：每15秒发送一次，防止代理/浏览器断开连接
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 15000);
  sseHeartbeats.add(heartbeat);
  const clearHeartbeat = () => {
    clearInterval(heartbeat);
    sseHeartbeats.delete(heartbeat);
  };

  // Client disconnect guard — use res.on('close'), NOT req.on('close').
  // Express 5 fires req 'close' when the request body is fully received,
  // not when the TCP connection drops. res 'close' fires on actual disconnect.
  let clientClosed = false;
  res.on('close', () => { clientClosed = true; clearHeartbeat(); });

  let eventId = 0;
  const writeSSE = (event: { type: string; [key: string]: unknown }) => {
    eventId++;
    res.write(`id: ${eventId}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const { handleUserMessage } = await import('./agent/router.js');
    const gen = handleUserMessage(sessionId, message);
    while (true) {
      const { value: event, done } = await gen.next();
      if (done || !event) break;
      if (clientClosed) break;
      writeSSE(event);
      if (event.type === 'done') break;
    }
  } catch (err) {
    if (!clientClosed) {
      const errMsg = err instanceof Error ? err.message : String(err);
      writeSSE({ type: 'error', message: errMsg, code: 'INTERNAL_ERROR' });
      writeSSE({ type: 'done' });
    }
  } finally {
    clearHeartbeat();
    res.end();
  }
});

// GET /api/plan/:sessionId — Current plan status
app.get('/api/plan/:sessionId', async (req, res) => {
  try {
    const { getSession } = await import('./state.js');
    const session = getSession(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: '会话不存在' } });
      return;
    }
    res.json({
      data: {
        sessionId: session.id,
        state: session.state,
        plan: session.currentPlan,
        updatedAt: session.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: msg } });
  }
});

const server = app.listen(PORT, () => {
  console.log(`[server] 美团活动规划Agent运行在 http://localhost:${PORT}`);
  console.log(`[server] API: POST /api/chat | GET /api/plan/:id | GET /api/health`);
  if (!process.env.DEEPSEEK_API_KEY) {
    console.warn('[server] ⚠️  未设置DEEPSEEK_API_KEY，Agent功能将不可用');
  }
});

// Graceful shutdown — ensures Playwright webServer can kill the process after tests
server.on('connection', (socket) => {
  sockets.add(socket);
  socket.on('close', () => sockets.delete(socket));
});

function shutdown(reason: string) {
  if (isShuttingDown) {
    console.log(`[shutdown] shutdown requested: ${reason} (already running)`);
    return;
  }
  isShuttingDown = true;

  console.log(`[shutdown] shutdown requested: ${reason}`);
  const forceExitTimer = setTimeout(() => {
    console.log('[shutdown] force exit fallback');
    process.exit(0);
  }, 3000);

  console.log('[shutdown] closing server');
  for (const heartbeat of sseHeartbeats) {
    clearInterval(heartbeat);
  }
  sseHeartbeats.clear();

  server.close(() => {
    console.log('[shutdown] server closed');
    clearTimeout(forceExitTimer);
    process.exit(0);
  });

  server.closeIdleConnections?.();
  server.closeAllConnections?.();

  console.log(`[shutdown] destroying sockets: ${sockets.size}`);
  for (const socket of sockets) {
    socket.destroy();
  }
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
