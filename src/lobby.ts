import { Room } from './room';
import { User } from './user';
import webSocket from 'ws';
import {
  ErrorJSON,
  LobbyStatusJSON,
  LobbyStatusContentJSON,
  RoomDestructionMessage
} from './models';
import { DESTROY_ROOM } from './event-types';
import PubSub from 'pubsub-js';
import { Router } from 'express';
import { ResponseEnum } from './enums';
import { Utils } from './utils';
import { Authentication } from './authentication';

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

  onNewConnection(ws: webSocket, username: string): ResponseEnum {
    const user = this.createUser(username);
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
    this.router.put('/rooms/create', Authentication.verifyToken, (req, res) => {
      const username = res.locals.username;
      const roomname = req.body.roomname;
      let result;
      if (typeof roomname !== 'string') {
        result = ResponseEnum.MalformedRequest;
      } else {
        result = this.createRoom(username, roomname?.trim());
      }
      if (result === ResponseEnum.OK) {
        res.sendStatus(201);
      } else {
        const resPair = Utils.getResponsePair(result);
        res.status(resPair.code).json(Utils.createMessageJson(resPair.message));
      }
    });

    this.router.patch(
      '/rooms/connect',
      Authentication.verifyToken,
      (req, res) => {
        const username = res.locals.username;
        const roomname = req.body.roomname;
        let result;
        if (typeof roomname !== 'string') {
          result = ResponseEnum.MalformedRequest;
        } else {
          result = this.connectToRoom(username, roomname?.trim());
        }
        if (result === ResponseEnum.OK) {
          res.sendStatus(200);
        } else {
          const resPair = Utils.getResponsePair(result);
          res
            .status(resPair.code)
            .json(Utils.createMessageJson(resPair.message));
        }
      }
    );

    this.router.patch(
      '/rooms/disconnect',
      Authentication.verifyToken,
      (req, res) => {
        const username = res.locals.username;
        const result = this.disconnectFromRoom(username);
        if (result === ResponseEnum.OK) {
          res.sendStatus(200);
        } else {
          const resPair = Utils.getResponsePair(result);
          res
            .status(resPair.code)
            .json(Utils.createMessageJson(resPair.message));
        }
      }
    );

    this.router.delete(
      '/rooms/destroy',
      Authentication.verifyToken,
      (req, res) => {
        const username = res.locals.username;
        const result = this.destroyRoomOrderedByUser(username);
        if (result === ResponseEnum.OK) {
          res.sendStatus(200);
        } else {
          const resPair = Utils.getResponsePair(result);
          res
            .status(resPair.code)
            .json(Utils.createMessageJson(resPair.message));
        }
      }
    );
  }

  private createUser(name: string): User | ResponseEnum {
    if (this.getUserByName(name) !== undefined) {
      return ResponseEnum.UserAlreadyConnected;
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
      return ResponseEnum.MalformedRequest;
    }

    const user = this.getUserByName(username);
    if (user === undefined) {
      return ResponseEnum.UserNotConnected;
    } else if (roomName.length === 0) {
      return ResponseEnum.RoomnameEmpty;
    } else if (this.roomExists(roomName)) {
      return ResponseEnum.RoomAlreadyExists;
    } else if (roomName.length > 20) {
      return ResponseEnum.RoomnameTooLong;
    } else if (user.getRoom(this.rooms) !== undefined) {
      return ResponseEnum.UserAlreadyInARoom;
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
      return ResponseEnum.MalformedRequest;
    }

    const user = this.getUserByName(username);
    if (user === undefined) {
      return ResponseEnum.UserNotConnected;
    }
    const room = user.getRoom(this.rooms);
    if (room === undefined) {
      return ResponseEnum.UserNotInARoom;
    } else if (!room.isAdmin(user)) {
      return ResponseEnum.UserNotAdmin;
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
      return ResponseEnum.MalformedRequest;
    }

    const room = this.rooms.find((r) => r.getName() === roomname);
    const user = this.getUserByName(username);
    if (user === undefined) {
      return ResponseEnum.UserNotConnected;
    } else if (room === undefined) {
      return ResponseEnum.RoomNotExists;
    } else if (user.getRoom(this.rooms) !== undefined) {
      return ResponseEnum.UserAlreadyInARoom;
    }
    room.addUser(user);
    return ResponseEnum.OK;
  }

  private disconnectFromRoom(username: string): ResponseEnum {
    if (username === undefined || username === null) {
      return ResponseEnum.MalformedRequest;
    }

    const user = this.getUserByName(username);
    if (user === undefined) {
      return ResponseEnum.UserNotConnected;
    }
    const room = user.getRoom(this.rooms);
    if (room === undefined) {
      return ResponseEnum.UserNotInARoom;
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
}
