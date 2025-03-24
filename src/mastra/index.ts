import { Mastra } from '@mastra/core';
import { cryptoTradingExpert } from './agents';

export const mastra = new Mastra({
  agents: { cryptoTradingExpert },
});
