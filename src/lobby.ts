import { Room } from './room';
import { User } from './user';
import webSocket from 'ws';
import { IncomingMessage } from 'http';
import {
  ErrorJSON,
  CreateRoomJSONClient,
  ConnectRoomJSONClient,
  LobbyStatusJSON,
  LobbyStatusContentJSON,
  RoomDestructionMessage
} from './models';
import { DESTROY_ROOM } from './event-types';
import PubSub from 'pubsub-js';
import { Router, Response } from 'express';
import { ResponseEnum } from './enums';
import { Utils } from './utils';

export class Lobby {
  private rooms: Room[] = [];
  private users: User[] = [];
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
    // we don't need to delete the users from the room, because they are only referenced in there
    // so when we delete the room they are considered in no room
    PubSub.subscribe(
      DESTROY_ROOM,
      (msg: any, roomDestructionMessage: RoomDestructionMessage) => {
        if (
          this.destroyRoom(
            roomDestructionMessage.room,
            roomDestructionMessage.reason
          )
        ) {
          this.broadcastLobbyStatus();
        }
      }
    );
  }

  getRouter(): Router {
    return this.router;
  }

  onNewConnection(ws: webSocket, req: IncomingMessage): ResponseEnum {
    //TODO use req to get name from headers
    const name = this.getQueryVariable(req.url!, 'name');
    const user = this.createUser(name);
    if (user instanceof User) {
      user.setWs(ws);
      user.sendMessage(this.getLobbyStatusJSON());
      return ResponseEnum.OK;
    }
    return user;
  }

  onCloseConnection(ws: webSocket) {
    const user = this.getUserByWS(ws);
    if (user === undefined) return;
    this.destroyUser(user);
  }

  onNewEstimateRequest(ws: webSocket, taskId: string) {
    const user = this.getUserByWS(ws);
    if (user === undefined) return;
    const room = user.getRoom(this.rooms);
    if (room === undefined) {
      console.error(
        `${user.getName()} requested a task estimate but is not in a room`
      );
      return;
    }
    room.createTask(user, taskId?.trim());
  }

  onNewEstimate(ws: webSocket, estimate: number) {
    const user = this.getUserByWS(ws);
    if (user === undefined) return;
    const room = user.getRoom(this.rooms);
    if (room === undefined) {
      console.error(`${user.getName()} sent an estimate but is not in a room`);
      return;
    } else if (typeof estimate !== 'number') {
      console.error(`${user.getName()} sent invalid estimate`);
      return;
    }
    const est = room.getCurrentTask()?.addEstimate(user, estimate);
    if (est === undefined) return;
    room.broadcastRoomStatus();
  }

  getRooms(): Room[] {
    return this.rooms;
  }

  getUsers(): User[] {
    return this.users;
  }

  private setupRoutes() {
    this.router.put('/rooms/create', (req, res) => {
      const msg: CreateRoomJSONClient = req.body;
      let result;
      if (
        typeof msg.username !== 'string' ||
        typeof msg.roomname !== 'string'
      ) {
        result = ResponseEnum.MALFORMED_REQUEST;
      } else {
        result = this.createRoom(msg.username?.trim(), msg.roomname?.trim());
      }
      if (result === ResponseEnum.OK) {
        res.status(201).json(Utils.createMessageJson('Room created'));
      } else {
        this.processResult(result, res);
      }
    });

    this.router.patch('/rooms/connect', (req, res) => {
      const msg: ConnectRoomJSONClient = req.body;
      let result;
      if (
        typeof msg.username !== 'string' ||
        typeof msg.roomname !== 'string'
      ) {
        result = ResponseEnum.MALFORMED_REQUEST;
      } else {
        result = this.connectToRoom(msg.username?.trim(), msg.roomname?.trim());
      }
      if (result === ResponseEnum.OK) {
        res
          .status(200)
          .json(Utils.createMessageJson(`Connected to ${msg.roomname}`));
      } else {
        this.processResult(result, res);
      }
    });

    this.router.patch('/rooms/disconnect', (req, res) => {
      const username = req.body.username;
      let result;
      if (typeof username !== 'string') {
        result = ResponseEnum.MALFORMED_REQUEST;
      } else {
        result = this.disconnectFromRoom(username?.trim());
      }
      if (result === ResponseEnum.OK) {
        res.status(200).json(Utils.createMessageJson(`Disconnected from room`));
      } else {
        this.processResult(result, res);
      }
    });

    this.router.delete('/rooms/destroy', (req, res) => {
      const username = req.body.username;
      let result;
      if (typeof username !== 'string') {
        result = ResponseEnum.MALFORMED_REQUEST;
      } else {
        result = this.destroyRoomOrderedByUser(username?.trim());
      }
      if (result === ResponseEnum.OK) {
        res.status(200).json(Utils.createMessageJson(`Room destroyed`));
      } else {
        this.processResult(result, res);
      }
    });
  }

  private createUser(name?: string): User | ResponseEnum {
    if (name === undefined || name.length === 0) {
      return ResponseEnum.USERNAME_EMPTY;
    } else if (name.length > 20) {
      return ResponseEnum.USERNAME_TOO_LONG;
    } else if (this.getUserByName(name) !== undefined) {
      return ResponseEnum.USER_ALREADY_EXISTS;
    }
    const user = new User(name);
    this.users.push(user);
    return user;
  }

  private destroyUser(user: User) {
    console.log(`Destroying user ${user.getName()}`);
    const room = user.getRoom(this.rooms);
    room?.removeUser(user);
    this.removeFromArray(user, this.users);
  }

  private createRoom(username: string, roomName: string): ResponseEnum {
    if (
      username === undefined ||
      username === null ||
      roomName === undefined ||
      roomName === null
    ) {
      return ResponseEnum.MALFORMED_REQUEST;
    }

    const user = this.getUserByName(username);
    if (user === undefined) {
      return ResponseEnum.USER_NOT_EXISTS;
    } else if (roomName.length === 0) {
      return ResponseEnum.ROOMNAME_EMPTY;
    } else if (this.roomExists(roomName)) {
      return ResponseEnum.ROOM_ALREADY_EXISTS;
    } else if (roomName.length > 20) {
      return ResponseEnum.ROOMNAME_TOO_LONG;
    } else if (user.getRoom(this.rooms) !== undefined) {
      return ResponseEnum.ALREADY_IN_A_ROOM;
    }
    const room = new Room(roomName, user);
    this.rooms.push(room);
    this.broadcastLobbyStatus();
    return ResponseEnum.OK;
  }

  private destroyRoom(room: Room, reason: string): boolean {
    if (!this.roomExists(room.getName())) {
      // console.log(`[${room.getName()}] Room already destroyed`);
      return false;
    }
    console.log(`[${room.getName()}] Destroyed, reason: ${reason}`);
    room.getUsers().forEach((u) => {
      u.setLeftRoomReason(reason);
      room.removeUser(u);
    });
    this.removeFromArray(room, this.rooms);
    return true;
  }

  private destroyRoomOrderedByUser(username: string): ResponseEnum {
    if (username === undefined || username === null) {
      return ResponseEnum.MALFORMED_REQUEST;
    }

    const user = this.getUserByName(username);
    if (user === undefined) {
      return ResponseEnum.USER_NOT_EXISTS;
    }
    const room = user.getRoom(this.rooms);
    if (room === undefined) {
      return ResponseEnum.NOT_IN_A_ROOM;
    } else if (!room.isAdmin(user)) {
      return ResponseEnum.USER_NOT_ADMIN;
    }

    //removing the user first so that he won't get the reason for destroying the room too
    room.removeUser(user);
    this.destroyRoom(room, 'Destroyed by admin');
    this.broadcastLobbyStatus();
    return ResponseEnum.OK;
  }

  private connectToRoom(username: string, roomname: string): ResponseEnum {
    if (
      username === undefined ||
      username === null ||
      roomname === undefined ||
      roomname === null
    ) {
      return ResponseEnum.MALFORMED_REQUEST;
    }

    const room = this.rooms.find((r) => r.getName() === roomname);
    const user = this.getUserByName(username);
    if (user === undefined) {
      return ResponseEnum.USER_NOT_EXISTS;
    } else if (room === undefined) {
      return ResponseEnum.ROOM_NOT_EXISTS;
    } else if (user.getRoom(this.rooms) !== undefined) {
      return ResponseEnum.ALREADY_IN_A_ROOM;
    }
    room.addUser(user);
    return ResponseEnum.OK;
  }

  private disconnectFromRoom(username: string): ResponseEnum {
    if (username === undefined || username === null) {
      return ResponseEnum.MALFORMED_REQUEST;
    }

    const user = this.getUserByName(username);
    if (user === undefined) {
      return ResponseEnum.USER_NOT_EXISTS;
    }
    const room = user.getRoom(this.rooms);
    if (room === undefined) {
      return ResponseEnum.NOT_IN_A_ROOM;
    }
    room.removeUser(user);
    user.sendMessage(this.getLobbyStatusJSON());
    return ResponseEnum.OK;
  }

  private broadcastLobbyStatus() {
    console.log('Broadcasting lobby status');
    this.getFreeUsers().forEach((u) =>
      u.sendMessage(this.getLobbyStatusJSON(u.getLeftRoomReason()))
    );
  }

  private getUserByWS(ws: webSocket): User | undefined {
    return this.users.find((u) => u.getWs() === ws);
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

  private getLobbyStatusJSON(left_room_reason: string = ''): LobbyStatusJSON {
    const lobbyStatusJson = {} as LobbyStatusJSON;
    const lobbyStatusContentJson = {} as LobbyStatusContentJSON;
    lobbyStatusJson.lobby_status = lobbyStatusContentJson;

    lobbyStatusContentJson.rooms = [];
    this.rooms.forEach((r) => lobbyStatusContentJson.rooms.push(r.getName()));
    lobbyStatusContentJson.left_room_reason = left_room_reason;

    return lobbyStatusJson;
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

  private processResult(result: ResponseEnum, res: Response) {
    let code: number;
    let message: string;
    switch (result) {
      case ResponseEnum.USERNAME_EMPTY: {
        code = 400;
        message = 'Username is empty';
        break;
      }
      case ResponseEnum.USER_NOT_EXISTS: {
        code = 404;
        message = 'User not found';
        break;
      }
      case ResponseEnum.USER_ALREADY_EXISTS: {
        code = 409;
        message = 'User already exists';
        break;
      }
      case ResponseEnum.USER_NOT_ADMIN: {
        code = 401;
        message = 'User not admin';
        break;
      }
      case ResponseEnum.ROOMNAME_EMPTY: {
        code = 400;
        message = 'Room name is empty';
        break;
      }
      case ResponseEnum.ROOMNAME_TOO_LONG: {
        code = 403;
        message = 'Room name length exceeds 20 characters';
        break;
      }
      case ResponseEnum.ROOM_NOT_EXISTS: {
        code = 404;
        message = 'Room not found';
        break;
      }
      case ResponseEnum.ROOM_ALREADY_EXISTS: {
        code = 409;
        message = 'Room already exists';
        break;
      }
      case ResponseEnum.ALREADY_IN_A_ROOM: {
        code = 409;
        message = 'Already in a room';
        break;
      }
      case ResponseEnum.NOT_IN_A_ROOM: {
        code = 404;
        message = 'Not in a room';
        break;
      }
      case ResponseEnum.MALFORMED_REQUEST: {
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
    res.status(code).json(Utils.createMessageJson(message));
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
