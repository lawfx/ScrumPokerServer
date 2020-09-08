/** Messages from server to client */
export interface RoomsJSON {
  rooms: string[];
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

/** Messages from client to server */

export interface CreateRoomJSONClient {
  username: string;
  roomname: string;
}

export interface ConnectRoomJSONClient {
  username: string;
  roomname: string;
}
