import { WebSocket } from 'ws';

// v1 agent (evaluator with langsmith)
import { ChatOpenAI } from '@langchain/openai';
import { createToolCallingAgent, AgentExecutor } from 'langchain/agents';
import { AgentPromptClass } from './agent-prompt';
import { MemoryClass } from './memory';
import { lemonLawQualificationTool } from './tools';

export const startSingleAgent = async (ws: WebSocket, sessionId: string, input: string) => {
  try {
    // 1. llm
    const chat = new ChatOpenAI({
      modelName: process.env.BASE_MODEL!,
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
      }],
      temperature: 0.0,
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
  } catch (e) {
    console.error("error", e)
  }
}