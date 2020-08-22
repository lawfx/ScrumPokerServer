import webSocket from 'ws';
import { Room } from './room';

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

  getRoom(rooms: Room[]): Room | undefined {
    return rooms.find((r) =>
      r.getAdminsAndUsers().find((u) => u.getWs() === this.ws)
    );
  }

  sendMessage(message: any) {
    this.ws.send(JSON.stringify(message));
  }
}
