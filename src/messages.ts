/** Messages from server to client */
export interface RoomsJSON {
  rooms: string[];
}

export interface RoomiesJSON {
  roomies: RoomiesContentJSON;
}

export interface RoomiesContentJSON {
  admins: string[];
  users: string[];
}

export interface EstimateRequestJSON {
  estimate_request: string;
}

export interface TaskEstimationJSON {
  task_estimation: TaskEstimationContentJSON;
}

export interface TaskEstimationContentJSON {
  task: string;
  estimates: TaskEstimationContentEstimatesJSON[];
}

export interface TaskEstimationContentEstimatesJSON {
  name: string;
  estimate: number;
}

export interface ErrorJSON {
  command: string;
  message: string;
}

export interface CreateRoomJSONClient {
  username: string;
  roomname: string;
}

export interface ConnectRoomJSONClient {
  username: string;
  roomname: string;
}
