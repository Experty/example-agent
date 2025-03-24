import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import fetch from 'node-fetch';

interface FearGreedResponse {
  name?: string;
  data?: {
    value: string;
    value_classification: string;
    timestamp: string;
    time_until_update: string;
  }[];
  metadata?: {
    error?: string;
  };
}

interface FearGreedIndex {
  value: number;
  description: string;
  classification: string;
}

interface MarketSentimentData {
  globalFearGreedIndex: FearGreedIndex;
  interpretation: string;
  timestamp: string;
  timeUpdated: string;
}

interface MarketSentimentResponse {
  status: string;
  symbol: string;
  marketSentimentData?: MarketSentimentData;
  message?: string;
}

const analyzeMarketSentiment = async (
  symbol: string
): Promise<MarketSentimentResponse> => {
  try {
    const response = await fetch('https://api.alternative.me/fng/');

    if (!response.ok) {
      throw new Error(
        `Failed to fetch market sentiment data: ${response.statusText}`
      );
    }

    const data = (await response.json()) as FearGreedResponse;

    if (!data.data || data.data.length === 0) {
      return {
        status: 'error',
        symbol: symbol,
        message: 'No market sentiment data available',
      };
    }

    const fearGreedIndex = parseInt(data.data[0].value);

    let fearGreedDescription: string = 'Neutral';
    if (fearGreedIndex >= 0 && fearGreedIndex <= 25) {
      fearGreedDescription = 'Extreme Fear';
    } else if (fearGreedIndex > 25 && fearGreedIndex <= 45) {
      fearGreedDescription = 'Fear';
    } else if (fearGreedIndex > 45 && fearGreedIndex <= 55) {
      fearGreedDescription = 'Neutral';
    } else if (fearGreedIndex > 55 && fearGreedIndex <= 75) {
      fearGreedDescription = 'Greed';
    } else if (fearGreedIndex > 75 && fearGreedIndex <= 100) {
      fearGreedDescription = 'Extreme Greed';
    }

    let marketSentiment: string = 'neutral';
    if (fearGreedDescription === 'Extreme Fear') {
      marketSentiment = 'extremely bearish (potentially oversold)';
    } else if (fearGreedDescription === 'Fear') {
      marketSentiment = 'bearish';
    } else if (fearGreedDescription === 'Greed') {
      marketSentiment = 'bullish';
    } else if (fearGreedDescription === 'Extreme Greed') {
      marketSentiment = 'extremely bullish (potentially overbought)';
    }

    return {
      status: 'success',
      symbol: symbol,
      marketSentimentData: {
        globalFearGreedIndex: {
          value: fearGreedIndex,
          description: fearGreedDescription,
          classification: data.data[0].value_classification,
        },
        interpretation: marketSentiment,
        timestamp: data.data[0].timestamp,
        timeUpdated: data.data[0].time_until_update,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      symbol: symbol,
      message: errorMessage,
    };
  }
};

export const marketSentiment = createTool({
  id: 'Analyze Market Sentiment',
  inputSchema: z.object({
    symbol: z
      .string()
      .describe(
        'The cryptocurrency symbol to analyze sentiment for (e.g., bitcoin, ethereum)'
      ),
  }),
  description:
    'Analyzes the current market sentiment for a cryptocurrency using the Fear & Greed Index',
  execute: async ({ context: { symbol } }) => {
    console.log(`Analyzing market sentiment for ${symbol}...`);
    return await analyzeMarketSentiment(symbol);
  },
});
