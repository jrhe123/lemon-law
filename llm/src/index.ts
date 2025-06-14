import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';

// v1 agent (evaluator with langsmith)
import { startSingleAgent } from './v1/build-agent';

// v2 agent workflow
import { startWorkflow } from './v2/workflow-builder';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// HTTP + WebSocket for v1
const serverV1 = createServer(app);
const wssV1 = new WebSocketServer({ server: serverV1 });

wssV1.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const { input, sessionId } = JSON.parse(message.toString());
      await startSingleAgent(ws, sessionId, input);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', data: (e as Error).message }));
    }
  });
});

// HTTP + WebSocket for v2
const serverV2 = createServer(app);
const wssV2 = new WebSocketServer({ server: serverV2 });

wssV2.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const { input, sessionId } = JSON.parse(message.toString());
      await startWorkflow(ws, sessionId, input);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', data: (e as Error).message }));
    }
  });
});

const portV1 = process.env.PORT_V1 || 3000;
const portV2 = process.env.PORT_V2 || 3001;

serverV1.listen(portV1, () => console.log(`V1 Server listening on port ${portV1}`));
serverV2.listen(portV2, () => console.log(`V2 Server listening on port ${portV2}`));