import { env } from '../config';
import debug from 'debug';
import { mastra } from '../mastra';
import wsService from '../services/ws';
import { GameData, WebSocketMessage } from '../types';
import { fetchGame, getActiveLiveGame, insertAnswer } from '../utils/api';
import { Agent } from '@mastra/core';
const log = debug('app:index');

const query = (baseAsset: string) => `
I'm interested in trading ${baseAsset} right now. Please analyze ${baseAsset} by:
1. Getting the current price using cryptoPrice
2. Performing technical analysis with technicalAnalysis using one minute timeframes
3. Analyzing market sentiment with marketSentiment
4. Generating a trading recommendation with tradingRecommendation

Based on all this data, tell me if I should go LONG or SHORT on ${baseAsset} for the next 15 minutes, and explain your reasoning.

IMPORTANT: Format your final answer as a JSON object with these fields:
{
  "recommendation": "LONG" or "SHORT",
  "price": the current price as a number,
  "reasoning": a short explanation of your reasoning
}
DO NOT include any explanatory text outside of this JSON object.
`;

const processGame = async (agent: Agent, gameData: GameData) => {
  try {
    const game = await fetchGame(gameData.id);
    if (!game) {
      log('Game not found');
      return;
    }

    log('Generating agent response');

    const result = await agent.generate(query(game.data.token.baseAsset));
    const response = JSON.parse(result.text.toString());
    log('Processing agent response', response);

    if (
      response.recommendation !== 'LONG' &&
      response.recommendation !== 'SHORT'
    ) {
      log('Invalid recommendation:', response.recommendation);
      return;
    }

    await insertAnswer({ answer: response.recommendation.toLowerCase() });
  } catch (error) {
    log('Error processing agent response:', error);
  }
};

async function main() {
  log(`Environment: ${env.NODE_ENV}`);
  const agent = mastra.getAgent('cryptoTradingExpert');

  const activeGame = await getActiveLiveGame().catch(() => undefined);

  if (activeGame?.data) {
    log('Active game found:', activeGame?.data);
    await processGame(agent, activeGame?.data);
  }

  wsService
    .connect()
    .then(() => {
      log('Connected to WebSocket');

      wsService.onMessage(async (message: object) => {
        const gameData = (message as WebSocketMessage).data;
        log('Received data from ws');
        await processGame(agent, gameData);
      });
    })
    .catch((error) => {
      log('Failed to connect:', error);
    });
}

main();
