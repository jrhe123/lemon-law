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

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      let primaryDone = false;
      const { input, sessionId, version } = JSON.parse(message.toString());
      if (version === 'v1') {
        // v1: single agent
        await startSingleAgent(ws, sessionId, input);
      } else if (version === 'v2') {
        // v2: langgraph workflow
        await startWorkflow(ws, sessionId, input, primaryDone);
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', data: (e as Error).message }));
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server listening on port ${port}`));