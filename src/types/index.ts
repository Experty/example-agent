export interface Token {
  baseAsset: string;
  tokenName: string;
  tokenLogoUrl: string;
}

export interface Game {
  number: number;
  id: string;
  token: Token;
  answersCount: string;
  successRatePercentage: string;
  quoteAsset: string;
  startTime: string;
  endTime: string;
  stopCollectingAnswersAt: string;
  createdAt: string;
  markers: [];
  price?: number;
}

export interface GameData {
  hidden: boolean;
  number: number;
  id: string;
  previousGame: Game;
}

export interface GameResponse {
  status: 'success';
  data: Game;
}

export interface WebSocketMessage {
  data: GameData;
}

export interface WebSocketSubscribeMessage {
  type: 'subscribe';
  channel: string;
  params: Record<string, never>;
}
