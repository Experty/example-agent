import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface SMAValues {
  sma7: number | null;
  sma25: number | null;
  sma99: number | null;
}

interface SMAPositions {
  aboveSMA7: boolean;
  aboveSMA25: boolean;
  aboveSMA99: boolean;
}

interface SMAData {
  values: SMAValues;
  positions: SMAPositions;
}

interface TechnicalSupportData {
  trend: string;
  rsi: number | null;
  rsiSignal: string;
  sma: SMAData;
}

interface SentimentSupportData {
  marketSentiment: string;
  fearGreedIndex: number;
  fearGreedDescription: string;
}

interface SupportingData {
  technical: TechnicalSupportData;
  sentiment: SentimentSupportData;
}

interface Recommendation {
  signal: string;
  confidenceLevel: string;
  recommendedTimeframe: string;
  technicalAnalysisSignal: string;
  marketSentimentSignal: string;
  timestamp: string;
}

interface TradingRecommendationResponse {
  status: string;
  symbol?: string;
  recommendation?: Recommendation;
  supportingData?: SupportingData;
  message?: string;
}

interface TechnicalDataInput {
  symbol: string;
  currentPrice: number;
  technicalIndicators: {
    sma: {
      sma7: number | null;
      sma25: number | null;
      sma99: number | null;
      aboveSMA7: boolean;
      aboveSMA25: boolean;
      aboveSMA99: boolean;
    };
    rsi: number | null;
    rsiSignal: string;
    trend: string;
  };
}

interface SentimentDataInput {
  symbol: string;
  marketSentimentData: {
    globalFearGreedIndex: {
      value: number;
      description: string;
      classification: string;
    };
    interpretation: string;
    timestamp: string;
    timeUpdated: string;
  };
}

const generateTradingRecommendation = (
  technicalData: TechnicalDataInput, 
  sentimentData: SentimentDataInput
): TradingRecommendationResponse => {
  try {
    const { technicalIndicators } = technicalData;
    const { marketSentimentData } = sentimentData;
    
    const { trend, rsiSignal } = technicalIndicators;
    const marketSentiment = marketSentimentData.interpretation;
    
    let technicalSignal: string = "LONG";
    if (trend === "strongly bullish" || trend === "bullish") {
      technicalSignal = "LONG";
    } else if (trend === "strongly bearish" || trend === "bearish") {
      technicalSignal = "SHORT";
    }
    
    if (rsiSignal === "overbought" && technicalSignal === "LONG") {
      technicalSignal = "SHORT";
    } else if (rsiSignal === "oversold" && technicalSignal === "SHORT") {
      technicalSignal = "LONG";
    }
    
    let sentimentSignal: string = "LONG";
    if (marketSentiment.includes("bullish")) {
      sentimentSignal = "LONG";
      if (marketSentiment.includes("extremely") && marketSentiment.includes("overbought")) {
        sentimentSignal = "SHORT";
      }
    } else if (marketSentiment.includes("bearish")) {
      sentimentSignal = "SHORT";
      if (marketSentiment.includes("extremely") && marketSentiment.includes("oversold")) {
        sentimentSignal = "LONG";
      }
    }
    
    let finalSignal: string = "LONG";
    
    if (technicalSignal === sentimentSignal) {
      finalSignal = technicalSignal;
    } 
    else {
      finalSignal = technicalSignal;
    }
    
    let recommendedTimeframe: string = "medium-term";
    if (finalSignal === "LONG" && trend === "strongly bullish") {
      recommendedTimeframe = "long-term";
    } else if (finalSignal === "SHORT" && trend === "strongly bearish") {
      recommendedTimeframe = "short-term";
    }
    
    let confidenceLevel: string = "medium";
    if (technicalSignal === sentimentSignal && (trend.includes("strongly") || marketSentiment.includes("extremely"))) {
      confidenceLevel = "high";
    } else if (technicalSignal !== sentimentSignal) {
      confidenceLevel = "low";
    }
    
    return {
      status: "success",
      symbol: technicalData.symbol,
      recommendation: {
        signal: finalSignal,
        confidenceLevel,
        recommendedTimeframe,
        technicalAnalysisSignal: technicalSignal,
        marketSentimentSignal: sentimentSignal,
        timestamp: new Date().toISOString()
      },
      supportingData: {
        technical: {
          trend: technicalIndicators.trend,
          rsi: technicalIndicators.rsi,
          rsiSignal: technicalIndicators.rsiSignal,
          sma: {
            values: {
              sma7: technicalIndicators.sma.sma7,
              sma25: technicalIndicators.sma.sma25,
              sma99: technicalIndicators.sma.sma99
            },
            positions: {
              aboveSMA7: technicalIndicators.sma.aboveSMA7,
              aboveSMA25: technicalIndicators.sma.aboveSMA25,
              aboveSMA99: technicalIndicators.sma.aboveSMA99
            }
          }
        },
        sentiment: {
          marketSentiment: marketSentimentData.interpretation,
          fearGreedIndex: marketSentimentData.globalFearGreedIndex.value,
          fearGreedDescription: marketSentimentData.globalFearGreedIndex.description
        }
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      status: "error",
      message: errorMessage || "Error generating trading recommendation"
    };
  }
};

const technicalDataSchema = z.object({
  symbol: z.string(),
  currentPrice: z.number(),
  technicalIndicators: z.object({
    sma: z.object({
      sma7: z.number().nullable(),
      sma25: z.number().nullable(),
      sma99: z.number().nullable(),
      aboveSMA7: z.boolean(),
      aboveSMA25: z.boolean(),
      aboveSMA99: z.boolean()
    }),
    rsi: z.number().nullable(),
    rsiSignal: z.string(),
    trend: z.string()
  })
}).describe("Technical analysis data for the cryptocurrency");

const sentimentDataSchema = z.object({
  symbol: z.string(),
  marketSentimentData: z.object({
    globalFearGreedIndex: z.object({
      value: z.number(),
      description: z.string(),
      classification: z.string()
    }),
    interpretation: z.string(),
    timestamp: z.string(),
    timeUpdated: z.string()
  })
}).describe("Market sentiment data for the cryptocurrency");

export const tradingRecommendation = createTool({
  id: "Generate Trading Recommendation",
  inputSchema: z.object({
    technicalData: technicalDataSchema,
    sentimentData: sentimentDataSchema
  }),
  description: "Generates a trading recommendation (LONG/SHORT) based on technical analysis and market sentiment data",
  execute: async ({ context: { technicalData, sentimentData } }) => {
    console.log(`Generating trading recommendation for ${technicalData.symbol}...`);
    return generateTradingRecommendation(technicalData, sentimentData);
  },
});