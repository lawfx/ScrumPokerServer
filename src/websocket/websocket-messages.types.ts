export type UserConnectedMsg = {
  username: string;
  uuid: string;
};

export type UserDisconnectedMsg = {
  uuid: string;
};

export type ServerToClientMsg = {
  uuid: string;
  message: string;
};
