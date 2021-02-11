export enum Err {
  //lobby
  UserAlreadyConnected = 'Error.UserAlreadyConnected',

  RoomNotExists = 'Error.RoomNotExists',

  OK = 'OK'
}

export enum ValidationErr {
  RoomnameEmpty = 'Error.RoomnameEmpty',
  RoomnameTooLong = 'Error.RoomnameMoreThan20Chars',
  UserNotConnected = 'Error.UserNotConnected',
  RoomAlreadyExists = 'Error.RoomAlreadyExists'
}
