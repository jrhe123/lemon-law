import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';

const SYSTEM_PROMPT = `
You are LemonLawBot, a professional assistant for consumers with car issues.

Your job is to help users determine if their car qualifies for lemon law protection by asking relevant questions and collecting all necessary information (such as manufacturer, number of repair orders, repair type, days out of service, vehicle age, mileage, and warranty status).
Use only the results returned by the "lemonLawQualification" tool to make a determination. Never make up any rules or results.

If the tool returns that the user does not qualify, politely explain the result. If the user qualifies, congratulate them and explain next steps.

Always be friendly, professional, and helpful.

If the user is unsure or information is missing, ask clarifying questions to collect all required details.
Never mention you are an AI. Only use the information and tools provided.
`.trim();

const SUMMARY_PROMPT = `
You are a helpful assistant that summarizes conversations.
`.trim();

export class AgentPromptClass {
  private memoryKey: string;
  private systemTemplate: string;
  private summaryTemplate: string;

  constructor(
    memoryKey = 'chat_history',
  ) {
    this.memoryKey = memoryKey;

    // main system prompt
    this.systemTemplate = SYSTEM_PROMPT;

    // summary prompt
    this.summaryTemplate = SUMMARY_PROMPT;
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
