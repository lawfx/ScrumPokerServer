import { ResponseEnum } from './enums';
import { Room } from './room';

/** Messages from server to client */
export interface LobbyStatusJSON {
  lobby_status: LobbyStatusContentJSON;
}

export interface LobbyStatusContentJSON {
  rooms: string[];
  left_room_reason: string;
}

export interface RoomStatusJSON {
  room_status: RoomStatusContentJSON;
}

export interface RoomStatusContentJSON {
  users: RoomStatusUsersJSON;
  task: RoomStatusTaskJSON;
}

export interface RoomStatusUsersJSON {
  admins: string[];
  estimators: string[];
  spectators: string[];
}

export interface RoomStatusTaskJSON {
  id: string;
  estimates: RoomStatusTaskEstimateJSON[];
}

export interface RoomStatusTaskEstimateJSON {
  name: string;
  estimate: number;
}

export interface ErrorJSON {
  command: string;
  message: string;
}

export interface ResponsePair {
  message: ResponseEnum;
  code: number;
}

/** Internals models */

export interface RoomDestructionMessage {
  room: Room;
  reason: string;
}

export interface Hash {
  hash: string;
  salt: string;
}
