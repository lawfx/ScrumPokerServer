import webSocket from 'ws';
import { Room } from './room';

export class User {
  private name: string;
  private ws: webSocket;
  private room?: Room;

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

  addToRoom(room: Room) {
    this.room = room;
  }

  exitRoom() {
    this.room = undefined;
  }

  getRoom(): Room | undefined {
    return this.room;
  }

  sendMessage(message: string) {
    this.ws.send(message);
  }
}
