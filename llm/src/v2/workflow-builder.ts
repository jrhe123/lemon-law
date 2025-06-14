import { WebSocket } from 'ws';

import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { StateGraph } from "@langchain/langgraph";
import { isAIMessageChunk } from "@langchain/core/messages";

// import nodes
import { collectInfoNode, toolNode } from "./nodes";

// import memory
import { checkpointer } from "./memory";

// collected information
export type CollectedInfo = {
  manufacturer?: string;
  repairOrders?: number;
  repairType?: string;
  daysOOS?: number;
  vehicleAgeYears?: number;
  mileage?: number;
  withinMfrWarranty?: boolean;
};

// define state annotation
export const StateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  nextStep: Annotation<string>(),
  collectedInfo: Annotation<CollectedInfo>(),
  qualificationResult: Annotation<Record<string, any>>(),
});

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
      return "__end__";
    }
  },
  {
    tool: "tool",
    '__end__': "__end__",
  }
);

builder = builder.addEdge("tool", "__end__");
const graph = builder.compile({
  checkpointer,
});

export const startWorkflow = async (ws: WebSocket, sessionId: string, input: string, primaryDone: boolean) => {
  const eventStream = graph.streamEvents(
    { messages: [{ role: "user", content: input }] },
    { version: "v2", configurable: { thread_id: sessionId } },
  );
  for await (const { event, data } of eventStream) {
    if (event === "on_chat_model_stream" && isAIMessageChunk(data.chunk)) {
      ws.send(JSON.stringify({ type: 'graph_step', data: data.chunk.content }));
    }
    if (event === "on_chat_model_end" && !primaryDone) {
      primaryDone = true;
      ws.send(JSON.stringify({ type: "graph_model_end" }));
      break;
    }
  }
  ws.send(JSON.stringify({ type: 'end' }));
}

// console.log("\nWorkflow Graph:");
// const graphJSON = graph.getGraph().toJSON();
// console.log(graphJSON);
