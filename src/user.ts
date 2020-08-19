import webSocket from 'ws';
import { Room } from './room';

export class User {
  private name: string;
  private ws?: webSocket;
  private room?: Room;

  constructor(name: string) {
    this.name = name;
  }

  getWs(): webSocket | undefined {
    return this.ws;
  }

  addWs(ws: webSocket) {
    this.ws = ws;
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
}
