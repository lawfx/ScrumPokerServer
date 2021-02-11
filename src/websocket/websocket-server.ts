import { Server } from 'http';
import webSocket from 'ws';
import { WebsocketConnection } from './websocket-connection';

export class WebsocketServer {
  private wss: webSocket.Server;
  private connections: WebsocketConnection[] = [];

  private pingIntervalId: NodeJS.Timeout;
  private readonly pingIntervalMillis = 10000;

  constructor(server: Server) {
    this.wss = new webSocket.Server({ server });

    this.wss.on('connection', async (ws) => {
      this.connections.push(new WebsocketConnection(ws));
    });

    this.wss.on('close', () => {
      clearInterval(this.pingIntervalId);
    });

    this.pingIntervalId = setInterval(() => {
      this.connections.forEach((c) => {
        c.ping();
      });
    }, this.pingIntervalMillis);
  }
}
