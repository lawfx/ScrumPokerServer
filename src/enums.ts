export enum ResponseEnum {
  //lobby

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
  UnknownError = 'Error.Unknown',
  //auth
  UsernameEmpty = 'Error.UsernameEmpty',
  UsernameTooLong = 'Error.UsernameMoreThan20Chars',
  PasswordEmpty = 'Error.PasswordEmpty',
  WrongCredentials = 'Error.WrongCredentials',
  UserAlreadyExists = 'Error.UserAlreadyExists',
  TokenCreationError = 'Error.TokenCreation'
}
