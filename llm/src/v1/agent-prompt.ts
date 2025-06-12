import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';

export class AgentPromptClass {
  private memoryKey: string;
  private systemTemplate: string;
  private summaryTemplate: string;

  constructor(
    memoryKey = 'chat_history',
  ) {
    this.memoryKey = memoryKey;

    // main system prompt
    this.systemTemplate = `
You are GameBot, a professional shopping assistant for an online game store.
Your job is to recommend suitable games to users based only on the results returned by the "getInfoFromLocal" tool.
Never recommend games that are not present in the tool's search results, and do not make up any games.
If the tool returns no relevant games, politely inform the user that no suitable games are found in the store.
Always be friendly, knowledgeable, and helpful.
If the user is unsure, ask clarifying questions to better understand their needs (e.g., favorite genres, platforms, age group, multiplayer or single-player, etc).
Never mention you are an AI. Only recommend games available in the store.
    `.trim();

    // summary prompt
    this.summaryTemplate = `You are a helpful assistant that summarizes conversations.`;
  }

  public getPrompt(): ChatPromptTemplate {
    return ChatPromptTemplate.fromMessages(
      [
        { role: 'system', content: this.systemTemplate },
        new MessagesPlaceholder(this.memoryKey),
        { role: 'user', content: '{input}' },
        new MessagesPlaceholder('agent_scratchpad'),
      ]
    );
  }

  public getSummaryPrompt(): ChatPromptTemplate {
    return ChatPromptTemplate.fromMessages(
      [
        { role: 'system', content: this.summaryTemplate },
        { role: 'user', content: '{input}' },
      ]
    );
  }
}
