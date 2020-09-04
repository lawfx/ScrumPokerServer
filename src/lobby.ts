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
import { Router, Response } from 'express';
import { FuncRetEnum } from './enums';

export class Lobby {
  private rooms: Room[] = [];
  private users: User[] = [];
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
    // we don't need to delete the users from the room or something, because they are only referenced in there
    // so when we delete the room they are considered in no room
    PubSub.subscribe(DESTROY_ROOM, (msg: any, room: Room) => {
      this.destroyRoom(room);
      this.broadcastRooms();
    });
  }

  getRouter(): Router {
    return this.router;
  }

  createUser(ws: webSocket, req: IncomingMessage): FuncRetEnum {
    //TODO use req to get name from headers
    const name = this.getQueryVariable(req.url!, 'name');
    if (name === undefined || name.length === 0) {
      return FuncRetEnum.USERNAME_EMPTY;
    } else if (this.getUserByName(name) !== undefined) {
      return FuncRetEnum.USER_ALREADY_EXISTS;
    }
    const user = new User(name, ws);
    this.users.push(user);
    user.sendMessage(this.getRoomsJSON());
    return FuncRetEnum.OK;
  }

  destroyUser(ws: webSocket) {
    const user = this.getUserByWS(ws);
    console.log(`Removing user ${user.getName()}`);
    const room = user.getRoom(this.rooms);
    room?.remove(user);
    this.removeFromArray(user, this.users);
  }

  requestEstimate(ws: webSocket, estimateRequestId: string) {
    const user = this.getUserByWS(ws);
    const room = user.getRoom(this.rooms);
    if (room === undefined) {
      console.error(
        `${user.getName()} requested estimate but is not in a room`
      );
      return;
    }
    room.createEstimateRequest(user, estimateRequestId?.trim());
  }

  addEstimate(ws: webSocket, estimate: number) {
    const user = this.getUserByWS(ws);
    const room = user.getRoom(this.rooms);
    if (room === undefined) {
      console.error(`${user.getName()} sent an estimate but is not in a room`);
      return;
    } else if (typeof estimate !== 'number') {
      console.error(`${user.getName()} sent invalid estimate`);
      return;
    }
    room.addEstimate(user, estimate);
  }

  private setupRoutes() {
    this.router.put('/rooms/create', (req, res) => {
      const msg: CreateRoomJSONClient = req.body;
      const result = this.createRoom(
        msg.username?.trim(),
        msg.roomname?.trim()
      );
      if (result === FuncRetEnum.OK) {
        res.status(201).send(this.createResponseREST('Room created'));
      } else {
        this.processResult(result, res);
      }
    });

    this.router.patch('/rooms/connect', (req, res) => {
      const msg: ConnectRoomJSONClient = req.body;
      const result = this.connectToRoom(
        msg.username?.trim(),
        msg.roomname?.trim()
      );
      if (result === FuncRetEnum.OK) {
        res
          .status(200)
          .send(this.createResponseREST(`Connected to ${msg.roomname}`));
      } else {
        this.processResult(result, res);
      }
    });

    this.router.patch('/rooms/disconnect', (req, res) => {
      const username = req.body.username;
      const result = this.disconnectFromRoom(username?.trim());
      if (result === FuncRetEnum.OK) {
        res.status(200).send(this.createResponseREST(`Disconnected from room`));
      } else {
        this.processResult(result, res);
      }
    });
  }

  private createRoom(username: string, roomName: string): FuncRetEnum {
    if (
      username === undefined ||
      username === null ||
      roomName === undefined ||
      roomName === null
    ) {
      return FuncRetEnum.MALFORMED_REQUEST;
    }

    const user = this.getUserByName(username);
    if (user === undefined) {
      return FuncRetEnum.USER_NOT_EXISTS;
    } else if (roomName === '') {
      return FuncRetEnum.ROOMNAME_EMPTY;
    } else if (this.roomExists(roomName)) {
      return FuncRetEnum.ROOM_ALREADY_EXISTS;
    } else if (user.getRoom(this.rooms) !== undefined) {
      return FuncRetEnum.ALREADY_IN_A_ROOM;
    }
    const room = new Room(roomName, user);
    this.rooms.push(room);
    this.broadcastRooms();
    return FuncRetEnum.OK;
  }

  private destroyRoom(room: Room) {
    console.log(`[${room.getName()}] Destroyed`);
    this.removeFromArray(room, this.rooms);
  }

  private connectToRoom(username: string, roomname: string): FuncRetEnum {
    if (
      username === undefined ||
      username === null ||
      roomname === undefined ||
      roomname === null
    ) {
      return FuncRetEnum.MALFORMED_REQUEST;
    }

    const room = this.rooms.find((r) => r.getName() === roomname);
    const user = this.getUserByName(username);
    if (user === undefined) {
      return FuncRetEnum.USER_NOT_EXISTS;
    } else if (room === undefined) {
      return FuncRetEnum.ROOM_NOT_EXISTS;
    } else if (user.getRoom(this.rooms) !== undefined) {
      return FuncRetEnum.ALREADY_IN_A_ROOM;
    }
    room.add(user);
    return FuncRetEnum.OK;
  }

  private disconnectFromRoom(username: string): FuncRetEnum {
    if (username === undefined || username === null) {
      return FuncRetEnum.MALFORMED_REQUEST;
    }

    const user = this.getUserByName(username);
    if (user === undefined) {
      return FuncRetEnum.USER_NOT_EXISTS;
    }
    const room = user.getRoom(this.rooms);
    if (room === undefined) {
      return FuncRetEnum.NOT_IN_A_ROOM;
    }
    room.remove(user);
    user.sendMessage(this.getRoomsJSON());
    return FuncRetEnum.OK;
  }

  private broadcastRooms() {
    console.log('Broadcasting rooms');
    this.getFreeUsers().forEach((u) => u.sendMessage(this.getRoomsJSON()));
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

  private processResult(result: FuncRetEnum, res: Response) {
    let code: number;
    let message: string;
    switch (result) {
      case FuncRetEnum.USERNAME_EMPTY: {
        code = 400;
        message = 'Username is empty';
        break;
      }
      case FuncRetEnum.USER_NOT_EXISTS: {
        code = 404;
        message = 'User not found';
        break;
      }
      case FuncRetEnum.USER_ALREADY_EXISTS: {
        code = 409;
        message = 'User already exists';
        break;
      }
      case FuncRetEnum.ROOMNAME_EMPTY: {
        code = 400;
        message = 'Room name is empty';
        break;
      }
      case FuncRetEnum.ROOM_NOT_EXISTS: {
        code = 404;
        message = 'Room not found';
        break;
      }
      case FuncRetEnum.ROOM_ALREADY_EXISTS: {
        code = 409;
        message = 'Room already exists';
        break;
      }
      case FuncRetEnum.ALREADY_IN_A_ROOM: {
        code = 409;
        message = 'Already in a room';
        break;
      }
      case FuncRetEnum.NOT_IN_A_ROOM: {
        code = 404;
        message = 'Not in a room';
        break;
      }
      case FuncRetEnum.MALFORMED_REQUEST: {
        code = 400;
        message = 'Malformed request';
        break;
      }
      default: {
        code = 400;
        message = 'Unhandled result. Contact admin';
        console.error(result);
        break;
      }
    }
    res.status(code).send(this.createResponseREST(message));
  }

  private getQueryVariable(url: string, variable: string): string | undefined {
    const query = decodeURI(url).substring(2);
    const vars = query.split('&');
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split('=');
      if (pair[0] == variable) {
        return pair[1]?.trim();
      }
    }
  }
}
