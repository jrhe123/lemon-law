import { tool } from "@langchain/core/tools";
import { z } from "zod";

// web search tool
export const search = tool(
  async ({ query }: { query: string }) => {
    return `GTA 6 is coming soon! ${query}`;
  },
  {
    name: "search",
    description: "Get the latest game news or information. Use this when the user wants to know about trending or newly released games.",
    schema: z.object({
      query: z.string().describe("search query"),
    }),
  }
);

