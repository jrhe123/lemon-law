import { ChatOpenAI } from '@langchain/openai';
import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { StateGraph, MemorySaver } from "@langchain/langgraph";
import { lemonLawQualificationTool, brandList1, brandList2 } from '../v1/tools';
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import 'dotenv/config';

// prompts
const COLLECT_INFO_SYSTEM_TEMPLATE = `You are LemonLawBot, a professional lawyer assistant for consumers with car issues.

Your job is to help users determine if their car qualifies for lemon law protection by asking relevant questions and collecting all necessary information, strictly following the business logic for each manufacturer group.

Always start by asking for the vehicle manufacturer. If the manufacturer is not covered by the lemon law rules, immediately inform the user that their case is not covered and do not ask further questions.

If the manufacturer is valid, next ask for the number of repair orders. Then, based on the manufacturer group and repair order count, collect only the additional information required:

- For manufacturers in brandList1 (${brandList1.join(", ")}):
  - 1-2 repairs: ask for days out of service, vehicle age (years), and mileage.
  - 3 or more repairs: ask for within manufacturer warranty status only.
- For manufacturers in brandList2 (${brandList2.join(", ")}):
  - 1-2 repairs: ask for repair type (must be Engine, Transmission, or Safety Concern), days out of service, vehicle age (years), and mileage.
  - 3 repairs: ask for repair type (must be Engine, Transmission, or Safety Concern) and within manufacturer warranty status.
  - 4 or more repairs: ask for within manufacturer warranty status only.

If the user provides information out of order, use what they provide and only ask for the missing required information. Continue asking for missing required fields until you have enough information. Do not ask for unnecessary information.

Only cases that match the defined rules are valid. If the user's situation does not match any rule, politely inform them that their case is not covered by the lemon law.

Always be friendly, professional, and helpful.

If the user is unsure or information is missing, ask clarifying questions to collect all required details.`;

const ANALYSIS_SYSTEM_TEMPLATE = `You are an expert at analyzing lemon law assessment conversations.
Your job is to determine if we have collected enough information to make a qualification assessment.

You must analyze the conversation and extract all relevant information about the user's vehicle case.
Pay special attention to:
1. Manufacturer validation
2. Repair order count
3. Additional required information based on manufacturer group and repair count
4. Data type validation for each field`;

const ANALYSIS_HUMAN_TEMPLATE = `Based on the conversation history, determine if we have enough information.
We need at minimum:
- manufacturer (string)
- repairOrders (number)

And depending on the manufacturer group, we may also need:
- repairType (string, for brandList2)
- daysOOS (number)
- vehicleAgeYears (number)
- mileage (number)
- withinMfrWarranty (boolean)

Here is the conversation:
`;

// basic model
const model = new ChatOpenAI({
  model: process.env.BASE_MODEL!,
  streaming: true,
  temperature: 0,
});

// state annotation
const StateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  nextStep: Annotation<string>(),
  collectedInfo: Annotation<{
    manufacturer: string;
    repairOrders: number;
    repairType?: string;
    daysOOS?: number;
    vehicleAgeYears?: number;
    mileage?: number;
    withinMfrWarranty?: boolean;
  }>(),
  qualificationResult: Annotation<Record<string, any>>(),
});

// nodes
const collectInfoNode = async (state: typeof StateAnnotation.State) => {
  // 1. generate response
  const response = await model.invoke([
    { role: "system", content: COLLECT_INFO_SYSTEM_TEMPLATE },
    ...state.messages,
  ]);

  // 2. analyze collected info
  const analysisResponse = await model.invoke([
    { role: "system", content: ANALYSIS_SYSTEM_TEMPLATE },
    { role: "user", content: ANALYSIS_HUMAN_TEMPLATE + JSON.stringify(state.messages, null, 2) }
  ], {
    response_format: { type: "json_object" }
  });

  // 3. parse and validate the response using LCEL
  const parser = StructuredOutputParser.fromZodSchema(
    z.object({
      nextStep: z.enum(["COLLECT", "ASSESS"]),
      collectedInfo: z.object({
        manufacturer: z.string(),
        repairOrders: z.number(),
        repairType: z.string().optional(),
        daysOOS: z.number().optional(),
        vehicleAgeYears: z.number().optional(),
        mileage: z.number().optional(),
        withinMfrWarranty: z.boolean().optional(),
      }),
    })
  );

  const parsedOutput = await parser.parse(analysisResponse.content as string);

  // 4. update state
  return { 
    messages: [response],
    nextStep: parsedOutput.nextStep,
    collectedInfo: {
      ...state.collectedInfo,  // 保留已有信息
      ...parsedOutput.collectedInfo  // 更新新收集的信息
    }
  };
};

const toolNode = async (state: typeof StateAnnotation.State) => {
  // 确保收集到的信息符合工具要求的类型
  const toolInput = {
    manufacturer: state.collectedInfo.manufacturer as string,
    repairOrders: state.collectedInfo.repairOrders as number,
    repairType: state.collectedInfo.repairType as string | undefined,
    daysOOS: state.collectedInfo.daysOOS as number | undefined,
    vehicleAgeYears: state.collectedInfo.vehicleAgeYears as number | undefined,
    mileage: state.collectedInfo.mileage as number | undefined,
    withinMfrWarranty: state.collectedInfo.withinMfrWarranty as boolean | undefined,
  };

  // 调用柠檬法资格评估工具
  const qualificationResult = await lemonLawQualificationTool.invoke(toolInput);
  const result = JSON.parse(qualificationResult as string);

  // 生成评估结果回复
  const response = await model.invoke([
    { role: "system", content: COLLECT_INFO_SYSTEM_TEMPLATE },
    ...state.messages,
    { 
      role: "system", 
      content: `Based on the qualification result: ${JSON.stringify(result)}, provide a clear and helpful response to the user.`
    }
  ]);

  return {
    messages: [response],
    nextStep: "END",
    qualificationResult: result
  };
};

// build the workflow
let builder = new StateGraph(StateAnnotation)
  .addNode("collect_info", collectInfoNode)
  .addNode("tool", toolNode)
  .addEdge("__start__", "collect_info");

builder = builder.addConditionalEdges(
  "collect_info",
  async (state: typeof StateAnnotation.State) => {
    if (state.nextStep === "ASSESS") {
      return "tool";
    } else {
      return "collect_info";
    }
  },
  {
    tool: "tool",
    collect_info: "collect_info"
  }
);

builder = builder.addEdge("tool", "__end__");

const checkpointer = new MemorySaver();
export const graph = builder.compile({
  checkpointer,
});
