import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { AgentPromptClass } from '../agent-prompt';

// Mock fromMessages before all tests
beforeAll(() => {
  jest.spyOn(ChatPromptTemplate, 'fromMessages').mockImplementation((...args) => {
    // Return an object with toJSON().messages for assertions
    return { toJSON: () => ({ messages: args[0] }) } as any;
  });
});

afterAll(() => {
  (ChatPromptTemplate.fromMessages as jest.Mock).mockRestore();
});

describe('AgentPromptClass', () => {
  beforeEach(() => {
    (ChatPromptTemplate.fromMessages as jest.Mock).mockClear();
  });

  it('getPrompt should call ChatPromptTemplate.fromMessages with correct message order and content', () => {
    const agentPrompt = new AgentPromptClass();
    agentPrompt.getPrompt();

    // Check that fromMessages was called once
    expect(ChatPromptTemplate.fromMessages).toHaveBeenCalledTimes(1);

    // Get the arguments from the call
    const [[messages]] = (ChatPromptTemplate.fromMessages as jest.Mock).mock.calls;

    // Expect four messages: system, placeholder(chat_history), user, placeholder(agent_scratchpad)
    expect(messages).toHaveLength(4);

    // First is the system prompt
    expect(messages[0]).toEqual({
      role: 'system',
      content: expect.stringContaining('You are LemonLawBot'),
    });

    // Second is the memory placeholder
    expect(messages[1]).toBeInstanceOf(MessagesPlaceholder);
    expect((messages[1] as any).variableName).toBe('chat_history');

    // Third is the user input placeholder
    expect(messages[2]).toEqual({
      role: 'user',
      content: '{input}',
    });

    // Fourth is the scratchpad placeholder
    expect(messages[3]).toBeInstanceOf(MessagesPlaceholder);
    expect((messages[3] as any).variableName).toBe('agent_scratchpad');
  });

  it('getSummaryPrompt should call ChatPromptTemplate.fromMessages with only system and user messages', () => {
    const agentPrompt = new AgentPromptClass();
    agentPrompt.getSummaryPrompt();

    expect(ChatPromptTemplate.fromMessages).toHaveBeenCalledTimes(1);
    const [[messages]] = (ChatPromptTemplate.fromMessages as jest.Mock).mock.calls;

    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({
      role: 'system',
      content: expect.stringContaining('You are a helpful assistant that summarizes'),
    });
    expect(messages[1]).toEqual({
      role: 'user',
      content: '{input}',
    });
  });
});