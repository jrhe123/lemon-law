import { ConversationSummaryBufferMemory } from "langchain/memory";
import { RedisChatMessageHistory } from "@langchain/redis";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { RunnableSequence } from "@langchain/core/runnables";
import { AgentPromptClass } from './agent-prompt';

export class MemoryClass {
  constructor(
    private memoryKey = process.env.MEMORY_KEY!,
    private model = process.env.BASE_MODEL!
  ) {}

  private async getHistory(sessionId: string) {
    const config = process.env.REDIS_URL ? { url: process.env.REDIS_URL } : undefined;
    const history = new RedisChatMessageHistory({
      sessionId,
      config,
    });
    const messages: BaseMessage[] = await history.getMessages();
    if (messages.length > 10) {
      const convo = messages.map(m => `${m.getType()}: ${m.content.toString()}`).join('\n');
      const summaryPrompt = new AgentPromptClass(this.memoryKey).getSummaryPrompt();
      const llm = new ChatOpenAI({
        modelName: this.model,
        temperature: 0.0,
      });
      const chain = RunnableSequence.from([summaryPrompt, llm]);
      const summaryResult = await chain.invoke({ input: convo });
      let summaryText = '';
      if (typeof summaryResult === 'string') {
        summaryText = summaryResult;
      } else if (summaryResult && typeof summaryResult.content === 'string') {
        summaryText = summaryResult.content;
      } else if (summaryResult && typeof summaryResult.text === 'string') {
        summaryText = summaryResult.text;
      } else {
        summaryText = JSON.stringify(summaryResult);
      }
      await history.clear();
      await history.addMessage(new AIMessage(summaryText));
    }
    return history;
  }

  public async createMemory(sessionId: string) {
    const chatHistory = await this.getHistory(sessionId);
    const llm = new ChatOpenAI({
      modelName: this.model,
      temperature: 0.0,
    });
    return new ConversationSummaryBufferMemory({
      memoryKey: this.memoryKey,
      chatHistory,
      llm,
      returnMessages: true,
      humanPrefix: "user",
      aiPrefix: "assistant",
    });
  }
}