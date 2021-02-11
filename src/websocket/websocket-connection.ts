import webSocket, { Data } from 'ws';
import { AuthController } from '../controllers/auth-controller';
import { skramEmitter } from '../skram-emitter';
import { v4 as uuidv4 } from 'uuid';
import WebsocketEvents from './websocket-events.enum';
import { ServerToClientMsg, UserConnectedMsg, UserDisconnectedMsg } from './websocket-messages.types';

export class WebsocketConnection {
  private ws: webSocket;
  private isAuthed: boolean;
  private isAlive: boolean;
  private uuid: string;

  constructor(ws: webSocket) {
    this.ws = ws;
    this.uuid = uuidv4();

    this.isAuthed = false;
    this.isAlive = true;

    this.ws.on('message', (msg) => this.processMessage(msg));

    ws.on('close', (code, reason) => {
      console.log(`${code} ${reason}`);

      if (code === 4001 || code === 4003 || code === 4004) return;

      skramEmitter.emit(WebsocketEvents.UserDisconnected, { uuid: this.uuid } as UserDisconnectedMsg);
    });

    this.ws.on('pong', () => this.heartbeat());

    skramEmitter.on(WebsocketEvents.ServerToClient, (data: ServerToClientMsg) => {
      if (data.uuid !== this.uuid) return;

      ws.send(JSON.stringify(data.message));
    });
  }

  ping() {
    if (!this.isAlive) {
      this.ws.close(4002, 'No pong');
      return;
    } else if (!this.isAuthed) {
      this.ws.close(4003, 'Unauthenticated');
      return;
    }

    this.isAlive = false;
    this.ws.ping(() => {});
  }

  private async processMessage(msg: Data) {
    if (typeof msg !== 'string') return;

    try {
      const msgJSON = JSON.parse(msg);
      if (msgJSON.token !== undefined) {
        try {
          const username = await this.authConnection(msgJSON.token.trim());
          this.isAuthed = true;
          skramEmitter.emit(WebsocketEvents.UserConnected, { username: username, uuid: this.uuid } as UserConnectedMsg);
        } catch (e) {
          console.error('Invalid token');
          this.ws.close(4004, 'Invalid token');
        }
      } /* else if (msgJSON.request_estimate !== undefined) {
        if (!(ws as any).isAuthed) return;
        lobby.onNewEstimateRequest(ws, msgJSON.request_estimate);
      } else if (msgJSON.estimate !== undefined) {
        if (!(ws as any).isAuthed) return;
        lobby.onNewEstimate(ws, msgJSON.estimate);
      }*/
    } catch (e) {
      console.error('Got invalid JSON message, ignoring...');
      return;
    }
  }

  private async authConnection(token: string): Promise<string> {
    return new Promise(async (res, rej) => {
      try {
        const username = await AuthController.verifyTokenWS(token);
        res(username);
      } catch (e) {
        rej(e);
      }
    });
  }

  private heartbeat() {
    this.isAlive = true;
  }
}
