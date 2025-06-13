import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';

// v1 agent
import { ChatOpenAI } from '@langchain/openai';
import { createToolCallingAgent, AgentExecutor } from 'langchain/agents';
import { AgentPromptClass } from './v1/agent-prompt';
import { MemoryClass } from './v1/memory';
import { lemonLawQualificationTool } from './v1/tools';

// v2 chain

// v3 graph

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const server = createServer(app);
const wss = new WebSocketServer({ server });

const singleAgent = async (ws: WebSocket, sessionId: string, input: string) => {
  const base = process.env.BASE_MODEL!;
    // 1. llm
    const chat = new ChatOpenAI({
      modelName: base,
      streaming: true,
      callbacks: [{
        handleLLMNewToken(token: string) {
          ws.send(JSON.stringify({ type: 'token', data: token }));
        },
        handleLLMEnd() {
          ws.send(JSON.stringify({ type: 'end' }));
        },
        handleLLMError(e: Error) {
          ws.send(JSON.stringify({ type: 'error', data: e.message }));
        }
      }]
    });
    // 2. prompt
    const prompt = new AgentPromptClass(process.env.MEMORY_KEY!).getPrompt();
    // 3. memory
    const memory = await new MemoryClass().createMemory(sessionId);
    // 4. tools
    const tools = [lemonLawQualificationTool];
    // 5. agent
    const agent = await createToolCallingAgent({ llm: chat, tools, prompt });
    // 6. executor
    const executor = new AgentExecutor({ agent, tools });
    // 7. chat_history
    const chat_history = await memory.chatHistory.getMessages?.() ?? [];
    // 8. invoke
    const result = await executor.invoke({ input, chat_history, memory });
    // 9. save to memory
    await memory.saveContext({ input }, { output: result.output });
}

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const { input, sessionId } = JSON.parse(message.toString());
      await singleAgent(ws, sessionId, input);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', data: (e as Error).message }));
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server listening on port ${port}`));