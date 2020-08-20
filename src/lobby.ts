import { Room } from './room';
import { User } from './user';
import webSocket from 'ws';
import { IncomingMessage } from 'http';
import { RoomsJSON, ErrorJSON } from './messages';

export class Lobby {
  private rooms: Room[] = [];
  private users: User[] = [];

  constructor() {}

  addUser(ws: webSocket, req: IncomingMessage) {
    //TODO use req to get name from headers
    const user = new User('user' + this.getRandomInt(100), ws);
    this.users.push(user);
    user.sendMessage(JSON.stringify(this.getRoomsJSON()));
  }

  removeUser(ws: webSocket) {
    const user = this.findUserByWS(ws);
    console.log(`Removing user ${user.getName()}`);
    const index = this.users.indexOf(user);
    if (index > -1) {
      this.users.splice(index, 1);
    }
  }

  createRoom(ws: webSocket, roomName: string) {
    if (this.roomExists(roomName)) {
      const error = {} as ErrorJSON;
      error.command = 'connect_room';
      error.message = 'A room with this name already exists';
      this.findUserByWS(ws).sendMessage(JSON.stringify(error));
      return;
    }
    const room = new Room(roomName, this.findUserByWS(ws));
    this.rooms.push(room);
  }

  private getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  private findUserByWS(ws: webSocket): User {
    return this.users.find((u) => {
      return u.getWs() === ws;
    })!;
  }

  private roomExists(roomName: string): boolean {
    return this.rooms.find((r) => r.getName() === roomName) !== undefined;
  }

  private getRoomsJSON() {
    let roomsJson = {} as RoomsJSON;
    roomsJson.rooms = [];
    this.rooms.forEach((r) => {
      roomsJson.rooms.push(r.getName());
    });
    return roomsJson;
  }
}
