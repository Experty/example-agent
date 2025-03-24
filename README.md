# Creating Your Own AI Agent with Mastra.ai

This repository demonstrates how to build a specialized AI agent using the Mastra.ai framework. This example shows a Crypto Trading Expert agent that provides cryptocurrency trading recommendations based on technical analysis and market sentiment.

## Prerequisites

- Node.js (v20 or higher)
- NPM or PNPM

## Getting Started

1. Clone this repository
2. Install the dependencies:

```bash
pnpm install
```

3. Set up your environment variables by creating a `.env` file based on the `.env.example` template:

```bash
cp .env.example .env
```

Then edit the `.env` file to add your required environment variables:

```
# Required environment variables
NODE_ENV=development
OPENAI_API_KEY=your_openai_api_key
WS_URL=ws://localhost:3000
```

The application won't start without these required environment variables.

4. Run the agent in development mode:

```bash
pnpm playground
```

This command launches the Mastra playground where you can interact with your agent.

## Project Structure

```
├── src/
│   └── mastra/
│       ├── agents/         # Agent definitions
│       ├── tools/          # Custom tools
│       └── index.ts        # Main entry point
├── package.json
└── tsconfig.json
```

## Creating Your Own Agent

### Step 1: Define Your Agent

Create a new file in the `src/mastra/agents` directory. Let's look at how the crypto trading expert is defined:

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";
import * as tools from "../tools";

// Initialize memory for the agent
const memory = new Memory({
  options: {
    lastMessages: 10,
    semanticRecall: {
      topK: 2,
      messageRange: {
        before: 2,
        after: 1,
      },
    },
    workingMemory: {
      enabled: true,
    },
  },
});

// Create the agent
export const cryptoTradingExpert = new Agent({
  name: "Crypto Trading Expert",
  instructions: `Your detailed instructions go here...`,
  model: openai("gpt-4o-mini"), // Choose the OpenAI model to use
  memory,
  tools: {
    // Define the tools your agent can use
    cryptoPrice: tools.cryptoPrice,
    technicalAnalysis: tools.technicalAnalysis,
    marketSentiment: tools.marketSentiment,
    tradingRecommendation: tools.tradingRecommendation,
  },
});
```

### Step 2: Create Custom Tools

Tools are functions that your agent can use to interact with external systems, process data, or perform specific tasks. Create tools in the `src/mastra/tools` directory:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const myCustomTool = createTool({
  id: "My Custom Tool",
  inputSchema: z.object({
    // Define the input parameters using Zod schema
    param1: z.string().describe("Description of parameter 1"),
    param2: z.number().describe("Description of parameter 2"),
  }),
  description: "Description of what this tool does",
  execute: async ({ context: { param1, param2 } }) => {
    // Implement your tool's functionality
    console.log(`Tool executed with params: ${param1}, ${param2}`);

    // Return the result
    return {
      status: "success",
      result: "Some result",
    };
  },
});
```

### Step 3: Register Your Tools

Export your tools from the `src/mastra/tools/index.ts` file:

```typescript
export { myCustomTool } from "./myCustomTool";
```

### Step 4: Register Your Agent

Add your agent to the main Mastra instance in `src/mastra/index.ts`:

```typescript
import { Mastra } from "@mastra/core";
import { myAgent } from "./agents/my-agent";

export const mastra = new Mastra({
  agents: { myAgent },
});
```

## Key Components

### Agent Configuration

- **name**: A descriptive name for your agent
- **instructions**: Detailed instructions for your agent (prompt engineering)
- **model**: The LLM model to use
- **memory**: Memory configuration for conversational history
- **tools**: Custom tools the agent can use to perform tasks

### Memory Configuration

Memory allows your agent to remember past interactions:

```typescript
const memory = new Memory({
  options: {
    lastMessages: 10, // Remember the last 10 messages
    semanticRecall: {
      // Enable retrieval of semantically similar past messages
      topK: 2,
      messageRange: {
        before: 2,
        after: 1,
      },
    },
    workingMemory: {
      // Enable structured working memory
      enabled: true,
    },
  },
});
```

### Tools

Tools follow a standard pattern:

1. Define input schema using Zod
2. Implement the tool's functionality
3. Return structured data

## Best Practices

1. **Clear Instructions**: Provide detailed instructions to your agent about its purpose, capabilities, and how to respond
2. **Error Handling**: Implement robust error handling in your tools
3. **Type Safety**: Use TypeScript and Zod schemas for type safety
4. **Memory Usage**: Configure memory appropriately for your use case
5. **Tool Design**: Create focused tools that do one thing well

## Further Resources

- [Mastra.ai Documentation](https://docs.mastra.ai)
- [OpenAI Documentation](https://platform.openai.com/docs)
