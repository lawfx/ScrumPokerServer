import { Room } from './room';
import { User } from './user';
import webSocket from 'ws';
import { IncomingMessage } from 'http';
import {
  RoomsJSON,
  ErrorJSON,
  RoomiesJSON,
  RoomiesContentJSON
} from './messages';

export class Lobby {
  private rooms: Room[] = [];
  private users: User[] = [];

  constructor() {}

  createUser(ws: webSocket, req: IncomingMessage) {
    //TODO use req to get name from headers
    const user = new User('user' + this.getRandomInt(100), ws);
    this.users.push(user);
    user.sendMessage(JSON.stringify(this.getRoomsJSON()));
  }

  destroyUser(ws: webSocket) {
    const user = this.findUser(ws);
    //TODO check if user is in a room
    console.log(`Removing user ${user.getName()}`);
    const index = this.users.indexOf(user);
    if (index > -1) {
      this.users.splice(index, 1);
    }
  }

  createRoom(ws: webSocket, roomName: string) {
    const user = this.findUser(ws);
    if (roomName === '') {
      user.sendMessage(
        JSON.stringify(
          this.generateError('create_room', "The room name can't be empty")
        )
      );
      return;
    } else if (this.roomExists(roomName)) {
      user.sendMessage(
        JSON.stringify(
          this.generateError(
            'create_room',
            'A room with this name already exists'
          )
        )
      );
      return;
    } else if (user.getRoom(this.rooms) !== undefined) {
      user.sendMessage(
        JSON.stringify(
          this.generateError('create_room', 'You are already in a room')
        )
      );
      return;
    }
    const room = new Room(roomName, user);
    this.rooms.push(room);
    user.sendMessage(JSON.stringify(this.getRoomiesJSON(room)));
    this.sendRoomsToFreeUsers();
  }

  connectToRoom(ws: webSocket, roomName: string) {
    const room = this.rooms.find((r) => r.getName() === roomName);
    const user = this.findUser(ws);
    if (room === undefined) {
      user.sendMessage(
        JSON.stringify(
          this.generateError(
            'connect_room',
            "A room with this name doesn't exist"
          )
        )
      );
      return;
    } else if (user.getRoom(this.rooms) !== undefined) {
      user.sendMessage(
        JSON.stringify(
          this.generateError('connect_room', 'You are already in a room')
        )
      );
      return;
    }

    room.addUser(user);
    user.sendMessage(JSON.stringify(this.getRoomiesJSON(room)));
  }

  disconnectFromRoom(ws: webSocket) {
    const user = this.findUser(ws);
    const room = user.getRoom(this.rooms);
    if (room === undefined) {
      user.sendMessage(
        JSON.stringify(
          this.generateError('connect_room', "You aren't in a room")
        )
      );
      return;
    }
    room.removeAdminOrUser(user);
    user.sendMessage(JSON.stringify(this.getRoomsJSON()));
  }

  private sendRoomsToFreeUsers() {
    this.findFreeUsers().forEach((u) =>
      u.sendMessage(JSON.stringify(this.getRoomsJSON()))
    );
  }

  private getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  private findUser(ws: webSocket): User {
    return this.users.find((u) => {
      return u.getWs() === ws;
    })!;
  }

  private findFreeUsers(): User[] {
    return this.users.filter((u) => u.getRoom(this.rooms) === undefined);
  }

  private roomExists(roomName: string): boolean {
    return this.rooms.find((r) => r.getName() === roomName) !== undefined;
  }

  private getRoomsJSON(): RoomsJSON {
    const roomsJson = {} as RoomsJSON;
    roomsJson.rooms = [];
    this.rooms.forEach((r) => roomsJson.rooms.push(r.getName()));
    return roomsJson;
  }

  private getRoomiesJSON(room: Room): RoomiesJSON {
    const roomiesJson = {} as RoomiesJSON;
    const roomiesContentJson = {} as RoomiesContentJSON;
    roomiesJson.roomies = roomiesContentJson;
    roomiesContentJson.admins = [];
    roomiesContentJson.users = [];
    room
      .getAdmins()
      .forEach((a) => roomiesContentJson.admins.push(a.getName()));
    room.getUsers().forEach((u) => roomiesContentJson.users.push(u.getName()));
    return roomiesJson;
  }

  // private removeFromArray<T>(obj: T, array: T[]) {
  //   const index = array.indexOf(obj);
  //   if (index > -1) {
  //     array.splice(index, 1);
  //   }
  // }

  private generateError(command: string, message: string): ErrorJSON {
    const error = {} as ErrorJSON;
    error.command = command;
    error.message = message;
    return error;
  }
}
