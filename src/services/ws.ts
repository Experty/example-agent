import WebSocket from 'ws';
import { env } from '../config';

// configuration
const WS_URL = `ws://${env.API_URL}/ws`;
const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: ((data: object) => void)[] = [];

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(WS_URL);

        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data.toString());
            this.messageHandlers.forEach((handler) => handler(data));
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.socket.onclose = () => {
          console.log('WebSocket connection closed');
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        this.attemptReconnect();
        reject(error);
      }
    });
  }

  send(data: {
    type: string;
    channel: 'agent_live_game_list';
    params: Record<string, object>;
  }): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }

    try {
      this.socket.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  onMessage(handler: (data: object) => void): void {
    this.messageHandlers.push(handler);
  }

  removeMessageHandler(handler: (data: object) => void): void {
    this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
  }

  private attemptReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(
        `Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`
      );
      return;
    }

    this.reconnectAttempts += 1;
    console.log(
      `Attempting to reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch();
    }, RECONNECT_INTERVAL);
  }

  disconnect(): void {
    console.log('Disconnecting from WebSocket');
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

const wsService = new WebSocketService();

process.on('SIGINT', () => {
  console.log('Process interrupted, closing WebSocket connection');
  wsService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Process terminated, closing WebSocket connection');
  wsService.disconnect();
  process.exit(0);
});

process.on('beforeExit', () => {
  console.log('Process exiting, closing WebSocket connection');
  wsService.disconnect();
});

// Optional: handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  wsService.disconnect();
  process.exit(1);
});

export default wsService;
