import webSocket from 'ws';
import { RoomsJSON } from './messages';

export class User {
  private name: string;
  private ws: webSocket;

  constructor(name: string, ws: webSocket) {
    this.name = name;
    this.ws = ws;
    console.log(`New user created: ${this.name}`);
  }

  getWs(): webSocket {
    return this.ws;
  }

  getName() {
    return this.name;
  }

  sendMessage(message: string) {
    this.ws.send(message);
  }
}
