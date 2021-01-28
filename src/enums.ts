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
  TokenCreationError = 'Error.TokenCreation',
  SecurityQuestionEmpty = 'Error.SecurityQuestionEmpty',
  SecurityQuestionTooLong = 'Error.SecurityQuestionMoreThan100Chars',
  SecurityAnswerEmpty = 'Error.SecurityAnswerEmpty',
  UserNotExists = 'Error.UserNotExists',
  WrongSecurityAnswer = 'Error.WrongSecurityAnswer'
}

export enum UserRole {
  Admin = 'admin',
  Estimator = 'estimator',
  Spectator = 'spectator',
  Unknown = 'unknown'
}

export enum PasswordRecoveryState {
  Requested,
  Answered
}
