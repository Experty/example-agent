import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import fetch from 'node-fetch';

type BinanceKlineDataPoint = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

interface SMAData {
  sma7: number | null;
  sma25: number | null;
  sma99: number | null;
  aboveSMA7: boolean;
  aboveSMA25: boolean;
  aboveSMA99: boolean;
}

interface ShortTermIndicators {
  sma5: number | null;
  sma10: number | null;
  ema9: number | null;
  ema21: number | null;
  aboveSMA5: boolean;
  aboveSMA10: boolean;
  aboveEMA9: boolean;
  aboveEMA21: boolean;
  macdSignal: string;
  shortTermTrend: string;
}

interface TechnicalIndicators {
  sma: SMAData;
  rsi: number | null;
  rsiSignal: string;
  trend: string;
  shortTerm?: ShortTermIndicators;
  recommendation?: string;
}

interface TechnicalAnalysisResponse {
  status: string;
  symbol?: string;
  currentPrice?: number;
  technicalIndicators?: TechnicalIndicators;
  timestamp?: string;
  message?: string;
}

const formatBinanceSymbol = (symbol: string): string => {
  const normalizedSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${normalizedSymbol}USDC`;
};

const calculateSMA = (prices: number[], period: number): number | null => {
  if (prices.length < period) {
    return null;
  }

  const sum = prices.slice(prices.length - period).reduce((a, b) => a + b, 0);
  return sum / period;
};

const calculateEMA = (prices: number[], period: number): number | null => {
  if (prices.length < period) {
    return null;
  }

  const k = 2 / (period + 1);
  let ema = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }

  return ema;
};

const calculateMACD = (
  prices: number[]
): { macd: number | null; signal: number | null; histogram: number | null } => {
  if (prices.length < 26) {
    return { macd: null, signal: null, histogram: null };
  }

  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);

  if (ema12 === null || ema26 === null) {
    return { macd: null, signal: null, histogram: null };
  }

  const macd = ema12 - ema26;
  const signal = calculateEMA([...Array(8).fill(0), macd], 9);
  const histogram = macd - (signal || 0);

  return { macd, signal, histogram };
};

const calculateRSI = (prices: number[], period: number = 14): number | null => {
  if (prices.length <= period) {
    return null;
  }

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const gains = changes.map((change) => (change > 0 ? change : 0));
  const losses = changes.map((change) => (change < 0 ? Math.abs(change) : 0));

  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return rsi;
};

const performTechnicalAnalysis = async (
  symbol: string,
  timeframe: string = 'daily',
  days: number = 30
): Promise<TechnicalAnalysisResponse> => {
  try {
    const endTime = Date.now();
    let startTime: number;
    let interval: string;

    const binanceSymbol = formatBinanceSymbol(symbol);

    switch (timeframe) {
      case '1m':
        interval = '1m';
        startTime = endTime - Math.min(days, 1) * 24 * 60 * 60 * 1000;
        break;
      case '5m':
        interval = '5m';
        startTime = endTime - Math.min(days, 3) * 24 * 60 * 60 * 1000;
        break;
      case '15m':
        interval = '15m';
        startTime = endTime - Math.min(days, 7) * 24 * 60 * 60 * 1000;
        break;
      case 'hourly':
        interval = '1h';
        startTime = endTime - Math.min(days, 14) * 24 * 60 * 60 * 1000;
        break;
      case 'daily':
      default:
        interval = days > 90 ? '1w' : '1d';
        startTime = endTime - days * 24 * 60 * 60 * 1000;
    }

    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=1000`;

    const apiResponse = await fetch(url);

    if (!apiResponse.ok) {
      if (apiResponse.status === 400) {
        return {
          status: 'error',
          symbol: symbol,
          message: `Could not find historical data for ${symbol} on Binance. Symbol may not be supported.`,
        };
      }

      throw new Error(
        `Failed to fetch historical data: ${apiResponse.statusText}`
      );
    }

    const data = (await apiResponse.json()) as BinanceKlineDataPoint[];

    if (!data || data.length === 0) {
      return {
        status: 'error',
        message: 'No price data available',
      };
    }

    const prices = data.map((kline) => parseFloat(kline[4]));
    const currentPrice = prices[prices.length - 1];

    const sma7 = calculateSMA(prices, 7);
    const sma25 = calculateSMA(prices, 25);
    const sma99 = calculateSMA(prices, Math.min(99, prices.length - 1));
    const rsi = calculateRSI(prices);

    const aboveSMA7 = currentPrice > (sma7 ?? 0);
    const aboveSMA25 = currentPrice > (sma25 ?? 0);
    const aboveSMA99 = currentPrice > (sma99 ?? 0);

    let trend: string = 'neutral';
    if (aboveSMA7 && aboveSMA25 && aboveSMA99) {
      trend = 'strongly bullish';
    } else if (aboveSMA7 && aboveSMA25) {
      trend = 'bullish';
    } else if (!aboveSMA7 && !aboveSMA25 && !aboveSMA99) {
      trend = 'strongly bearish';
    } else if (!aboveSMA7 && !aboveSMA25) {
      trend = 'bearish';
    }

    let rsiSignal: string = 'neutral';
    if (rsi !== null) {
      if (rsi > 70) {
        rsiSignal = 'overbought';
      } else if (rsi < 30) {
        rsiSignal = 'oversold';
      }
    }

    const analysisResult: TechnicalAnalysisResponse = {
      status: 'success',
      symbol: symbol,
      currentPrice,
      technicalIndicators: {
        sma: {
          sma7,
          sma25,
          sma99,
          aboveSMA7,
          aboveSMA25,
          aboveSMA99,
        },
        rsi,
        rsiSignal,
        trend,
      },
      timestamp: new Date().toISOString(),
    };

    if (['1m', '5m', '15m', 'hourly'].includes(timeframe)) {
      const shortTermRSI = calculateRSI(prices, 7);
      const sma5 = calculateSMA(prices, 5);
      const sma10 = calculateSMA(prices, 10);
      const ema9 = calculateEMA(prices, 9);
      const ema21 = calculateEMA(prices, 21);
      const { macd, signal, histogram } = calculateMACD(prices);

      const aboveSMA5 = currentPrice > (sma5 ?? 0);
      const aboveSMA10 = currentPrice > (sma10 ?? 0);
      const aboveEMA9 = currentPrice > (ema9 ?? 0);
      const aboveEMA21 = currentPrice > (ema21 ?? 0);

      let shortTermTrend = 'neutral';
      let macdSignal = 'neutral';

      if (aboveSMA5 && aboveSMA10 && aboveEMA9 && aboveEMA21) {
        shortTermTrend = 'strongly bullish';
      } else if ((aboveSMA5 && aboveSMA10) || (aboveEMA9 && aboveEMA21)) {
        shortTermTrend = 'bullish';
      } else if (!aboveSMA5 && !aboveSMA10 && !aboveEMA9 && !aboveEMA21) {
        shortTermTrend = 'strongly bearish';
      } else if ((!aboveSMA5 && !aboveSMA10) || (!aboveEMA9 && !aboveEMA21)) {
        shortTermTrend = 'bearish';
      }

      if (histogram !== null && signal !== null && macd !== null) {
        if (histogram > 0 && histogram > 0.0001 * currentPrice) {
          if (macd > 0) {
            macdSignal = 'strongly bullish';
          } else {
            macdSignal = 'bullish';
          }
        } else if (
          histogram < 0 &&
          Math.abs(histogram) > 0.0001 * currentPrice
        ) {
          if (macd < 0) {
            macdSignal = 'strongly bearish';
          } else {
            macdSignal = 'bearish';
          }
        }
      }

      let recommendation = 'neutral';

      if (timeframe === '1m') {
        if (
          (shortTermTrend.includes('bullish') &&
            macdSignal.includes('bullish')) ||
          (shortTermRSI !== null &&
            shortTermRSI < 30 &&
            shortTermTrend.includes('bullish'))
        ) {
          recommendation = 'LONG';
        } else if (
          (shortTermTrend.includes('bearish') &&
            macdSignal.includes('bearish')) ||
          (shortTermRSI !== null &&
            shortTermRSI > 70 &&
            shortTermTrend.includes('bearish'))
        ) {
          recommendation = 'SHORT';
        }
      }

      if (analysisResult.technicalIndicators) {
        analysisResult.technicalIndicators.shortTerm = {
          sma5,
          sma10,
          ema9,
          ema21,
          aboveSMA5,
          aboveSMA10,
          aboveEMA9,
          aboveEMA21,
          macdSignal,
          shortTermTrend,
        };

        analysisResult.technicalIndicators.recommendation = recommendation;
      }
    }

    return analysisResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      message: errorMessage,
    };
  }
};

export const technicalAnalysis = createTool({
  id: 'Perform Technical Analysis',
  inputSchema: z.object({
    symbol: z
      .string()
      .describe('The cryptocurrency symbol to analyze (e.g., BTC, ETH, SOL)'),
    timeframe: z
      .enum(['1m', '5m', '15m', 'hourly', 'daily'])
      .optional()
      .describe(
        'Timeframe for analysis (1m, 5m, 15m, hourly, daily). Default: daily'
      ),
    days: z
      .number()
      .optional()
      .describe('Number of days of historical data to analyze (default: 30)'),
  }),
  description:
    'Performs technical analysis on a cryptocurrency using historical price data from Binance',
  execute: async ({ context: { symbol, timeframe = 'daily', days = 30 } }) => {
    console.log(
      `Performing technical analysis for ${symbol} over ${timeframe} timeframe...`
    );
    return await performTechnicalAnalysis(symbol, timeframe, days);
  },
});
