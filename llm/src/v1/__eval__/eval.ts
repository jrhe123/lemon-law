import "dotenv/config";

// import langsmith
import { createLLMAsJudge, CORRECTNESS_PROMPT } from "openevals";
import { evaluate } from "langsmith/evaluation";

// import langchain
import { ChatOpenAI } from "@langchain/openai";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";

// import agent and tools
import { AgentPromptClass } from "../agent-prompt";
import { lemonLawQualificationTool } from "../tools";

async function target(inputs: {
  input: string;
}): Promise<{ answer: string }> {
  const llm = new ChatOpenAI({ modelName: process.env.BASE_MODEL!, temperature: 0.0 });
  const prompt = new AgentPromptClass().getPrompt();
  const agent = await createToolCallingAgent({ llm, tools: [lemonLawQualificationTool], prompt });
  const executor = new AgentExecutor({ agent, tools: [lemonLawQualificationTool] });
  const result = await executor.invoke({ input: inputs.input, chat_history: [] });
  return { answer: result.output || "" };
}

const correctnessEvaluator = async (params: {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  referenceOutputs?: Record<string, unknown>;
}) => {
  const evaluator = createLLMAsJudge({
    prompt: CORRECTNESS_PROMPT,
    model: "openai:gpt-4o-mini",
    feedbackKey: "correctness",
  });
  const evaluatorResult = await evaluator({
    inputs: params.inputs.input,
    outputs: params.outputs.answer,
    referenceOutputs: params.referenceOutputs?.output,
  });
  return evaluatorResult;
};

async function main() {
  await evaluate(target, {
    data: "lemon-law-eval-dataset",
    evaluators: [
      correctnessEvaluator,
    ],
    experimentPrefix: "lemon-law-eval-dataset",
    maxConcurrency: 1,
  });
}

main().catch(console.error);