import webSocket from 'ws';
import { Room } from './room';

export class User {
  private name: string;
  private ws: webSocket;
  private left_room_reason: string;

  constructor(name: string, ws: webSocket) {
    this.name = name;
    this.ws = ws;
    this.left_room_reason = '';
    console.log(`New user created: ${this.name}`);
  }

  getWs(): webSocket {
    return this.ws;
  }

  getName() {
    return this.name;
  }

  getRoom(rooms: Room[]): Room | undefined {
    return rooms.find((r) => r.getUsers().find((u) => u.getWs() === this.ws));
  }

  setLeftRoomReason(reason: string) {
    this.left_room_reason = reason;
  }

  getLeftRoomReason(): string {
    const reason = this.left_room_reason;
    this.left_room_reason = '';
    return reason;
  }

  sendMessage(message: any) {
    this.ws.send(JSON.stringify(message));
  }
}
