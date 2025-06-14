import { ChatOpenAI } from '@langchain/openai';
import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { StateGraph, MemorySaver } from "@langchain/langgraph";
import { lemonLawQualificationTool } from '../v1/tools';
import { AgentPromptClass } from '../v1/agent-prompt';
import 'dotenv/config';

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
  streaming: true,
});

const StateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  nextStep: Annotation<string>(),
  collectedInfo: Annotation<Record<string, any>>(),
  qualificationResult: Annotation<Record<string, any>>(),
});

const agentPrompt = new AgentPromptClass();

const initialAssessment = async (state: typeof StateAnnotation.State) => {
  const prompt = await agentPrompt.getPrompt().format({ input: "" });
  const response = await model.invoke([
    { role: "system", content: prompt },
    ...state.messages,
  ]);

  // 分析回复，确定下一步
  const ANALYSIS_SYSTEM_TEMPLATE = `You are an expert at analyzing lemon law assessment conversations.
Your job is to determine the next step in the assessment process.`;
  
  const ANALYSIS_HUMAN_TEMPLATE = `Based on the conversation history, determine the next step.
Respond with a JSON object containing a single key called "nextStep" with one of the following values:

If we need to collect more information, respond with "COLLECT_INFO"
If we have enough information to make a qualification assessment, respond with "ASSESS"
If the conversation is complete, respond with "END"

Here is the conversation:
${JSON.stringify(state.messages, null, 2)}`;

  const analysisResponse = await model.invoke([
    { role: "system", content: ANALYSIS_SYSTEM_TEMPLATE },
    { role: "user", content: ANALYSIS_HUMAN_TEMPLATE }
  ], {
    response_format: { type: "json_object" }
  });

  const analysisOutput = JSON.parse(analysisResponse.content as string);
  return { 
    messages: [response],
    nextStep: analysisOutput.nextStep,
    collectedInfo: state.collectedInfo || {}
  };
};

const assessQualification = async (state: typeof StateAnnotation.State) => {
  // 从对话中提取信息
  const EXTRACTION_SYSTEM_TEMPLATE = `Extract relevant information for lemon law qualification from the conversation.`;
  
  const EXTRACTION_HUMAN_TEMPLATE = `Extract the following information from the conversation:
- manufacturer
- repairOrders
- repairType (if mentioned)
- daysOOS (if mentioned)
- vehicleAgeYears (if mentioned)
- mileage (if mentioned)
- withinMfrWarranty (if mentioned)

Respond with a JSON object containing these fields.`;

  const extractionResponse = await model.invoke([
    { role: "system", content: EXTRACTION_SYSTEM_TEMPLATE },
    ...state.messages,
    { role: "user", content: EXTRACTION_HUMAN_TEMPLATE }
  ], {
    response_format: { type: "json_object" }
  });

  const extractedInfo = JSON.parse(extractionResponse.content as string);
  
  // 调用柠檬法资格评估工具
  const qualificationResult = await lemonLawQualificationTool.invoke(extractedInfo);
  const result = JSON.parse(qualificationResult as string);

  // 生成评估结果回复
  const prompt = await agentPrompt.getPrompt().format({ input: "" });
  const response = await model.invoke([
    { role: "system", content: prompt },
    ...state.messages,
    { 
      role: "system", 
      content: `Based on the qualification result: ${JSON.stringify(result)}, provide a clear and helpful response to the user.`
    }
  ]);

  return {
    messages: [response],
    nextStep: "END",
    collectedInfo: extractedInfo,
    qualificationResult: result
  };
};

// 构建工作流
let builder = new StateGraph(StateAnnotation)
  .addNode("initial_assessment", initialAssessment)
  .addNode("assess_qualification", assessQualification)
  .addEdge("__start__", "initial_assessment");

builder = builder.addConditionalEdges(
  "initial_assessment",
  async (state: typeof StateAnnotation.State) => {
    if (state.nextStep === "ASSESS") {
      return "assess";
    } else if (state.nextStep === "END") {
      return "__end__";
    } else {
      return "collect";
    }
  },
  {
    assess: "assess_qualification",
    collect: "initial_assessment",
    __end__: "__end__"
  }
);

builder = builder.addEdge("assess_qualification", "__end__");

const checkpointer = new MemorySaver();
export const graph = builder.compile({
  checkpointer,
});
