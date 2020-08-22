import { Room } from './room';
import { User } from './user';
import webSocket from 'ws';
import { IncomingMessage } from 'http';
import { RoomsJSON, ErrorJSON } from './messages';
import { DESTROY_ROOM } from './event-types';
import PubSub from 'pubsub-js';

export class Lobby {
  private rooms: Room[] = [];
  private users: User[] = [];

  constructor() {
    PubSub.subscribe(DESTROY_ROOM, (msg: any, room: Room) => {
      this.destroyRoom(room);
      this.broadcastRooms();
    });
  }

  createUser(ws: webSocket, req: IncomingMessage) {
    //TODO use req to get name from headers
    const user = new User('user' + this.getRandomInt(100), ws);
    this.users.push(user);
    user.sendMessage(this.getRoomsJSON());
  }

  destroyUser(ws: webSocket) {
    const user = this.getUser(ws);
    //TODO check if user is in a room
    console.log(`Removing user ${user.getName()}`);
    this.removeFromArray(user, this.users);
  }

  createRoom(ws: webSocket, roomName: string) {
    const user = this.getUser(ws);
    if (roomName === '') {
      user.sendMessage(
        this.generateError('create_room', "The room name can't be empty")
      );
      return;
    } else if (this.roomExists(roomName)) {
      user.sendMessage(
        this.generateError(
          'create_room',
          'A room with this name already exists'
        )
      );
      return;
    } else if (user.getRoom(this.rooms) !== undefined) {
      user.sendMessage(
        this.generateError('create_room', 'You are already in a room')
      );
      return;
    }
    const room = new Room(roomName, user);
    this.rooms.push(room);
    this.broadcastRooms();
  }

  connectToRoom(ws: webSocket, roomName: string) {
    const room = this.rooms.find((r) => r.getName() === roomName);
    const user = this.getUser(ws);
    if (room === undefined) {
      user.sendMessage(
        this.generateError(
          'connect_room',
          "A room with this name doesn't exist"
        )
      );
      return;
    } else if (user.getRoom(this.rooms) !== undefined) {
      user.sendMessage(
        this.generateError('connect_room', 'You are already in a room')
      );
      return;
    }
    room.addUser(user);
  }

  disconnectFromRoom(ws: webSocket) {
    const user = this.getUser(ws);
    const room = user.getRoom(this.rooms);
    if (room === undefined) {
      user.sendMessage(
        this.generateError('connect_room', "You aren't in a room")
      );
      return;
    }
    room.removeAdminOrUser(user);
    user.sendMessage(this.getRoomsJSON());
  }

  private destroyRoom(room: Room) {
    console.log(`Destroying room "${room.getName()}"`);
    this.removeFromArray(room, this.rooms);
  }

  private broadcastRooms() {
    console.log('Broadcasting rooms');
    this.getFreeUsers().forEach((u) => u.sendMessage(this.getRoomsJSON()));
  }

  private getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  private getUser(ws: webSocket): User {
    return this.users.find((u) => {
      return u.getWs() === ws;
    })!;
  }

  private getFreeUsers(): User[] {
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

  private removeFromArray<T>(obj: T, array: T[]) {
    const index = array.indexOf(obj);
    if (index > -1) {
      array.splice(index, 1);
    }
  }

  private generateError(command: string, message: string): ErrorJSON {
    const error = {} as ErrorJSON;
    error.command = command;
    error.message = message;
    return error;
  }
}
