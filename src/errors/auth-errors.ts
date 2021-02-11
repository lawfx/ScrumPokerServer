enum AuthErrors {
  UsernameEmpty = 'Error.UsernameEmpty',
  UsernameTooLong = 'Error.UsernameMoreThan20Chars',
  PasswordEmpty = 'Error.PasswordEmpty',
  WrongCredentials = 'Error.WrongCredentials',
  UserAlreadyExists = 'Error.UserAlreadyExists',
  TokenCreation = 'Error.TokenCreation',
  SecurityQuestionEmpty = 'Error.SecurityQuestionEmpty',
  SecurityQuestionTooLong = 'Error.SecurityQuestionMoreThan100Chars',
  SecurityAnswerEmpty = 'Error.SecurityAnswerEmpty',
  UserNotExists = 'Error.UserNotExists',
  WrongSecurityAnswer = 'Error.WrongSecurityAnswer'
}

export default AuthErrors;
