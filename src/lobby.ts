import { Room } from './room';
import { User } from './user';
import webSocket from 'ws';
import { IncomingMessage } from 'http';
import {
  RoomsJSON,
  ErrorJSON,
  CreateRoomJSONClient,
  ConnectRoomJSONClient
} from './messages';
import { DESTROY_ROOM } from './event-types';
import PubSub from 'pubsub-js';
import { Router } from 'express';

export class Lobby {
  private rooms: Room[] = [];
  private users: User[] = [];
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
    PubSub.subscribe(DESTROY_ROOM, (msg: any, room: Room) => {
      this.destroyRoom(room);
      this.broadcastRooms();
    });
  }

  getRouter(): Router {
    return this.router;
  }

  createUser(ws: webSocket, req: IncomingMessage): string | undefined {
    //TODO use req to get name from headers
    const name = this.getQueryVariable(req.url!, 'name');
    if (name === undefined || name.length === 0) {
      return "Name can't be empty";
    } else if (this.getUserByName(name) !== undefined) {
      return 'A user with that name already exists';
    }
    const user = new User(name, ws);
    this.users.push(user);
    user.sendMessage(this.getRoomsJSON());
  }

  destroyUser(ws: webSocket) {
    const user = this.getUserByWS(ws);
    //TODO check if user is in a room
    console.log(`Removing user ${user.getName()}`);
    this.removeFromArray(user, this.users);
  }

  private setupRoutes() {
    this.router.put('/rooms/create', (req, res) => {
      const msg: CreateRoomJSONClient = req.body;
      const result = this.createRoom(msg.username.trim(), msg.roomname.trim());
      if (result !== undefined) {
        res.status(400).send(this.createResponseREST(result));
        return;
      }
      res.status(201).send(this.createResponseREST('Room created'));
    });

    this.router.patch('/rooms/connect', (req, res) => {
      const msg: ConnectRoomJSONClient = req.body;
      const result = this.connectToRoom(
        msg.username.trim(),
        msg.roomname.trim()
      );
      if (result !== undefined) {
        res.status(400).send(this.createResponseREST(result));
        return;
      }
      res
        .status(200)
        .send(this.createResponseREST(`Connected to ${msg.roomname}`));
    });

    this.router.patch('/rooms/disconnect', (req, res) => {
      const username = req.body.username;
      const result = this.disconnectFromRoom(username.trim());
      if (result !== undefined) {
        res.status(400).send(this.createResponseREST(result));
        return;
      }
      res.status(200).send(this.createResponseREST(`Disconnected from room`));
    });
  }

  private createRoom(username: string, roomName: string): string | undefined {
    const user = this.getUserByName(username);
    if (user === undefined) {
      return 'User not found';
    } else if (roomName === '') {
      return "The room name can't be empty";
    } else if (this.roomExists(roomName)) {
      return 'A room with this name already exists';
    } else if (user.getRoom(this.rooms) !== undefined) {
      return 'You are already in a room';
    }
    const room = new Room(roomName, user);
    this.rooms.push(room);
    this.broadcastRooms();
  }

  private destroyRoom(room: Room) {
    console.log(`Destroying room "${room.getName()}"`);
    this.removeFromArray(room, this.rooms);
  }

  private connectToRoom(
    username: string,
    roomname: string
  ): string | undefined {
    const room = this.rooms.find((r) => r.getName() === roomname);
    const user = this.getUserByName(username);
    if (user === undefined) {
      return 'User not found';
    }
    if (room === undefined) {
      return "A room with this name doesn't exist";
    } else if (user.getRoom(this.rooms) !== undefined) {
      return 'You are already in a room';
    }
    room.addUser(user);
  }

  private disconnectFromRoom(username: string): string | undefined {
    const user = this.getUserByName(username);
    if (user === undefined) {
      return 'User not found';
    }
    const room = user.getRoom(this.rooms);
    if (room === undefined) {
      return "You aren't in a room";
    }
    room.removeAdminOrUser(user);
    user.sendMessage(this.getRoomsJSON());
  }

  private broadcastRooms() {
    console.log('Broadcasting rooms');
    this.getFreeUsers().forEach((u) => u.sendMessage(this.getRoomsJSON()));
  }

  private getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  private getUserByWS(ws: webSocket): User {
    return this.users.find((u) => u.getWs() === ws)!;
  }

  private getUserByName(name: string): User | undefined {
    return this.users.find((u) => u.getName() === name);
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

  private createResponseREST(msg: string): string {
    return JSON.stringify({ message: msg });
  }

  private getQueryVariable(url: string, variable: string): string | undefined {
    const query = url.substring(2);
    const vars = query.split('&');
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split('=');
      if (pair[0] == variable) {
        return pair[1].replace(/%20/g, '');
      }
    }
  }
}
