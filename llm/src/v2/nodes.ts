import { z } from "zod";
import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ChatOpenAI } from '@langchain/openai';

import { StateAnnotation, CollectedInfo } from "./workflow-builder"
import { COLLECT_INFO_SYSTEM_TEMPLATE, ANALYSIS_SYSTEM_TEMPLATE, ANALYSIS_HUMAN_TEMPLATE } from './agent-prompt';
import { lemonLawQualificationTool } from '../v1/tools';

// basic model
const model = new ChatOpenAI({
  model: process.env.BASE_MODEL!,
  streaming: true,
  temperature: 0,
});

// get recent conversation history
const getRecentMessages = (messages: BaseMessage[], maxTurns: number = 10) => {
  // ensure at least one system message
  const systemMessages = messages.filter(msg => msg._getType() === "system");
  const recentMessages = messages.slice(-maxTurns * 2);
  return [...systemMessages, ...recentMessages];
};

export const collectInfoNode = async (state: typeof StateAnnotation.State) => {
  try {
    // 1. analyze collected info
    const analysisResponse = await model.invoke([
      { role: "system", content: ANALYSIS_SYSTEM_TEMPLATE },
      { role: "user", content: ANALYSIS_HUMAN_TEMPLATE + JSON.stringify(getRecentMessages(state.messages), null, 2) }
    ], {
      response_format: { type: "json_object" },
    });

    // 2. parse and validate the response using LCEL
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        nextStep: z.enum(["ASSESS", "END"]),
        collectedInfo: z.object({
          manufacturer: z.string().optional(),
          repairOrders: z.number().optional(),
          repairType: z.string().optional(),
          daysOOS: z.number().optional(),
          vehicleAgeYears: z.number().optional(),
          mileage: z.number().optional(),
          withinMfrWarranty: z.boolean().optional(),
        }),
      })
    );
    const parsedOutput = await parser.parse(analysisResponse.content as string);

    // 3. update state with partial information
    const updatedCollectedInfo: CollectedInfo = {
      ...state.collectedInfo,
    };
    // update with new information, not overwrite existing information
    if (parsedOutput.collectedInfo) {
      Object.entries(parsedOutput.collectedInfo).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          (updatedCollectedInfo as Record<string, unknown>)[key] = value;
        }
      });
    }

    // 4. generate response
    const response = await model.invoke(
      [
        { role: "system", content: COLLECT_INFO_SYSTEM_TEMPLATE },
        ...getRecentMessages(state.messages),
      ],
      {
        metadata: {
          // indicate whether to end the workflow & websocket emit
          nextStep: parsedOutput.nextStep,
        }
      }
    );
    return { 
      messages: [new AIMessage(response.content as string)],
      nextStep: parsedOutput.nextStep,
      collectedInfo: updatedCollectedInfo
    };
  } catch (error) {
    console.error('Error in collectInfoNode:', error);
    throw new Error(`Failed to collect information: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const toolNode = async (state: typeof StateAnnotation.State) => {
  const chain = RunnableSequence.from([
    // prepare tool input
    RunnablePassthrough.assign({
      toolInput: () => ({
        manufacturer: state.collectedInfo.manufacturer as string,
        repairOrders: state.collectedInfo.repairOrders as number,
        repairType: state.collectedInfo.repairType as string | undefined,
        daysOOS: state.collectedInfo.daysOOS as number | undefined,
        vehicleAgeYears: state.collectedInfo.vehicleAgeYears as number | undefined,
        mileage: state.collectedInfo.mileage as number | undefined,
        withinMfrWarranty: state.collectedInfo.withinMfrWarranty as boolean | undefined,
      })
    }),
    // call lemon law qualification tool
    async ({ toolInput }) => {
      try {
        const result = await lemonLawQualificationTool.invoke(toolInput);
        return JSON.parse(result as string);
      } catch (error) {
        console.error('Error in lemon law qualification:', error);
        throw new Error(`Failed to process lemon law qualification: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    // generate assessment result response
    async (result) => {
      try {
        const response = await model.invoke([
          { role: "system", content: COLLECT_INFO_SYSTEM_TEMPLATE },
          ...getRecentMessages(state.messages),
          {
            role: "system",
            content: `You must strictly follow the following qualification result when responding to the user.
***IMPORTANT***
Qualification result: ${JSON.stringify(result)}
If "qualified" is false, politely inform the user that their case does NOT qualify for lemon law protection, and explain the reason.
If "qualified" is true, congratulate the user and explain that their case qualifies for lemon law protection.
Do NOT contradict the qualification result. Do NOT make up any additional rules.`
          },
        ], {
          metadata: {
            // always end the workflow
            nextStep: "END",
          }
        });
        return {
          messages: [new AIMessage(response.content as string)],
          nextStep: "END",
          qualificationResult: result
        };
      } catch (error) {
        console.error('Error generating response:', error);
        throw new Error(`Failed to generate assessment response: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  ]);

  return chain.invoke({});
};