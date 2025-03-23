import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import fetch from "node-fetch";

interface BinancePriceResponse {
  symbol: string;
  price: string;
}

interface PriceResponse {
  status: string;
  symbol: string;
  price?: number;
  currency?: string;
  timestamp?: string;
  message?: string;
}

const formatBinanceSymbol = (symbol: string): string => {
  const normalizedSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${normalizedSymbol}USDT`;
};

const getCryptoPrice = async (symbol: string): Promise<PriceResponse> => {
  try {
    const binanceSymbol = formatBinanceSymbol(symbol);
    
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`);
    
    if (!response.ok) {
      if (response.status === 400) {
        return {
          status: "error",
          symbol: symbol,
          message: `Could not find price data for ${symbol} on Binance. Symbol may not be supported.`
        };
      }
      
      throw new Error(`Failed to fetch price data: ${response.statusText}`);
    }
    
    const data = await response.json() as BinancePriceResponse;
    
    return {
      status: "success",
      symbol: symbol,
      price: parseFloat(data.price),
      currency: "USDT",
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      status: "error",
      symbol: symbol,
      message: errorMessage
    };
  }
};

export const cryptoPrice = createTool({
  id: "Get Crypto Price",
  inputSchema: z.object({
    symbol: z.string().describe("The cryptocurrency symbol to get the price for (e.g., BTC, ETH, SOL)"),
  }),
  description: "Fetches the current price of a cryptocurrency in USDT from Binance",
  execute: async ({ context: { symbol } }) => {
    console.log(`Fetching price for ${symbol} from Binance...`);
    return await getCryptoPrice(symbol);
  },
});