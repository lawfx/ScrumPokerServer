export enum ResponseEnum {
  //lobby
  UsernameEmpty = 'Error.UsernameEmpty',
  UsernameTooLong = 'Error.UsernameMoreThan20Chars',
  UserNotConnected = 'Error.UserNotConnected',
  UserAlreadyConnected = 'Error.UserAlreadyConnected',
  UserNotAdmin = 'Error.UserNotAdmin',
  UserAlreadyInARoom = 'Error.UserAlreadyInARoom',
  UserNotInARoom = 'Error.UserNotInARoom',
  RoomnameEmpty = 'Error.RoomnameEmpty',
  RoomnameTooLong = 'Error.RoomnameMoreThan20Chars',
  RoomNotExists = 'Error.RoomNotExists',
  RoomAlreadyExists = 'Error.RoomAlreadyExists',
  OK = 'OK',
  MalformedRequest = 'Error.MalformedRequest',
  UnknownError = 'Error.UnknownError',
  //auth
  WrongCredentials = 'Error.WrongCredentials',
  UserAlreadyExists = 'Error.UserAlreadyExists',
  TokenCreationError = 'Error.TokenCreation'
}
