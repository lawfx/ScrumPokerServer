import { ResponseEnum } from './enums';
import { ResponsePair } from './models';

export class Utils {
  /**returns a message in the json form of { message: msg } */
  static createMessageJson(msg: string) {
    return { message: msg };
  }

  static getQueryVariable(url: string, variable: string): string | undefined {
    const query = decodeURI(url).substring(2);
    const vars = query.split('&');
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split('=');
      if (pair[0] == variable) {
        return pair[1]?.trim();
      }
    }
  }

  static getResponsePair(responseMessage: ResponseEnum): ResponsePair {
    let pair = {} as ResponsePair;
    pair.message = responseMessage;
    switch (responseMessage) {
      case ResponseEnum.UserNotConnected: {
        pair.code = 404;
        break;
      }
      case ResponseEnum.UserAlreadyConnected: {
        pair.code = 409;
        break;
      }
      case ResponseEnum.UserNotAdmin: {
        pair.code = 401;
        break;
      }
      case ResponseEnum.UserAlreadyInARoom: {
        pair.code = 409;
        break;
      }
      case ResponseEnum.UserNotInARoom: {
        pair.code = 404;
        break;
      }
      case ResponseEnum.RoomnameEmpty: {
        pair.code = 400;
        break;
      }
      case ResponseEnum.RoomnameTooLong: {
        pair.code = 403;
        break;
      }
      case ResponseEnum.RoomNotExists: {
        pair.code = 404;
        break;
      }
      case ResponseEnum.RoomAlreadyExists: {
        pair.code = 409;
        break;
      }
      case ResponseEnum.MalformedRequest: {
        pair.code = 400;
        break;
      }
      case ResponseEnum.UsernameEmpty: {
        pair.code = 400;
        break;
      }
      case ResponseEnum.UsernameTooLong: {
        pair.code = 403;
        break;
      }
      case ResponseEnum.PasswordEmpty: {
        pair.code = 400;
        break;
      }
      case ResponseEnum.WrongCredentials: {
        pair.code = 400;
        break;
      }
      case ResponseEnum.UserAlreadyExists: {
        pair.code = 409;
        break;
      }
      case ResponseEnum.TokenCreationError: {
        pair.code = 500;
        break;
      }
      case ResponseEnum.SecurityQuestionEmpty: {
        pair.code = 400;
        break;
      }
      case ResponseEnum.SecurityQuestionTooLong: {
        pair.code = 403;
        break;
      }
      case ResponseEnum.SecurityAnswerEmpty: {
        pair.code = 400;
        break;
      }
      case ResponseEnum.SecurityAnswerTooLong: {
        pair.code = 403;
        break;
      }
      case ResponseEnum.UserNotExists: {
        pair.code = 404;
        break;
      }
      default: {
        pair.code = 400;
        console.error(responseMessage);
        break;
      }
    }
    return pair;
  }
}
