import crypto from 'crypto';
import { NextFunction, Response, Request } from 'express';
import { UserModel } from '../models/user.model';
import config from '../config/config.json';
import { Utils } from '../utils';
import jwt from 'jsonwebtoken';
import AuthErrors from '../errors/auth-errors';
import { validationResult } from 'express-validator';
import { Hash, LoginReq, RegisterReq } from '../types/auth-types';
import GenericErrors from '../errors/generic-errors';

class AuthController {
  private static readonly SALT_ROUNDS = 20;
  private readonly RECOVERY_TOKEN_TIMEOUT = '10m';
  private readonly LOGIN_TOKEN_TIMEOUT = '10h';
  private readonly LOGIN_GUEST_TOKEN_TIMEOUT = '5h';

  constructor() {}

  async register(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(Utils.createResponse(errors.array()[0].msg));
    }

    const msg: RegisterReq = req.body;

    const hash = AuthController.hash(msg.password);
    const securityAnswerHash = AuthController.hash(msg.security_answer);
    try {
      await UserModel.create({
        username: msg.username,
        passwordHash: hash.hash,
        salt: hash.salt,
        securityQuestion: msg.security_question,
        securityAnswerHash: securityAnswerHash.hash,
        securityAnswerSalt: securityAnswerHash.salt
      });
      res.sendStatus(201);
    } catch (e) {
      res.status(500).json(Utils.createResponse(e.errors[0]?.message ?? GenericErrors.UnknownError));
    }
  }

  async login(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(Utils.createResponse(errors.array()[0].msg));
    }

    const msg: LoginReq = req.body;

    try {
      const user = await UserModel.findOne({ where: { username: msg.username } });
      if (user === null) throw new Error(AuthErrors.WrongCredentials);

      const hash = AuthController.hash(msg.password, user.salt);
      if (hash.hash !== user.passwordHash) throw new Error(AuthErrors.WrongCredentials);

      const token = await this.createToken({ username: msg.username }, this.LOGIN_TOKEN_TIMEOUT);
      res.json({ token: token });
    } catch (e) {
      switch (e.message) {
        case AuthErrors.WrongCredentials:
          res.status(400).send(Utils.createResponse(e.message));
          break;
        case AuthErrors.TokenCreation:
          res.status(500).send(Utils.createResponse(e.message));
          break;
        default:
          res.status(500).json(Utils.createResponse(e.errors[0]?.message ?? GenericErrors.UnknownError));
          break;
      }
    }
  }

  async loginAsGuest(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(Utils.createResponse(errors.array()[0].msg));
    }

    const username: string = req.body.username;

    try {
      const user = await UserModel.findOne({ where: { username: username } });
      if (user !== null) throw new Error(AuthErrors.UserAlreadyExists);

      const token = await this.createToken({ username: username }, this.LOGIN_GUEST_TOKEN_TIMEOUT);
      res.json({ token: token });
    } catch (e) {
      switch (e.message) {
        case AuthErrors.UserAlreadyExists:
          res.status(409).send(Utils.createResponse(e.message));
          break;
        case AuthErrors.TokenCreation:
          res.status(500).send(Utils.createResponse(e.message));
          break;
        default:
          res.status(500).json(Utils.createResponse(e.errors[0]?.message ?? GenericErrors.UnknownError));
          break;
      }
    }
  }

  async processRecovery(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(Utils.createResponse(errors.array()[0].msg));
    }

    const username: string = req.body.username;

    try {
      const user = await UserModel.findOne({ where: { username: username } });
      if (user === null) throw new Error(AuthErrors.UserNotExists);

      const token = await this.createToken({ username: username, recovery: PasswordRecoveryState.Requested }, this.RECOVERY_TOKEN_TIMEOUT);
      res.json({ question: user.securityQuestion, token: token });
    } catch (e) {
      switch (e.message) {
        case AuthErrors.UserNotExists:
          res.status(404).send(Utils.createResponse(e.message));
          break;
        case AuthErrors.TokenCreation:
          res.status(500).send(Utils.createResponse(e.message));
          break;
        default:
          res.status(500).json(Utils.createResponse(e.errors[0]?.message ?? GenericErrors.UnknownError));
          break;
      }
    }
  }

  async processRecoveryAnswer(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(Utils.createResponse(errors.array()[0].msg));
    }

    const username = res.locals.username;
    const answer = req.body.security_answer.trim();

    try {
      const user = await UserModel.findOne({ where: { username: username } });
      if (user === null) throw new Error(AuthErrors.UserNotExists);

      const hash = AuthController.hash(answer, user.securityAnswerSalt);
      if (hash.hash !== user.securityAnswerHash) throw new Error(AuthErrors.WrongSecurityAnswer);

      const token = await this.createToken(
        {
          username: username,
          recovery: PasswordRecoveryState.Answered
        },
        this.RECOVERY_TOKEN_TIMEOUT
      );
      res.json({ token: token });
    } catch (e) {
      switch (e.message) {
        case AuthErrors.UserNotExists:
          res.status(404).send(Utils.createResponse(e.message));
          break;
        case AuthErrors.WrongSecurityAnswer:
          res.status(400).send(Utils.createResponse(e.message));
          break;
        case AuthErrors.TokenCreation:
          res.status(500).send(Utils.createResponse(e.message));
          break;
        default:
          res.status(500).json(Utils.createResponse(e.errors[0]?.message ?? GenericErrors.UnknownError));
          break;
      }
    }
  }

  async processRecoveryPassword(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(Utils.createResponse(errors.array()[0].msg));
    }

    const username = res.locals.username;
    const password = req.body.password;

    const hash = AuthController.hash(password);
    try {
      await UserModel.update(
        {
          passwordHash: hash.hash,
          salt: hash.salt
        },
        { where: { username: username } }
      );
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json(Utils.createResponse(e.errors[0]?.message ?? GenericErrors.UnknownError));
    }
  }

  static hash(stringToHash: string, salt: string = this.generateSalt()): Hash {
    let hash = crypto.createHmac('sha512', salt);
    hash.update(stringToHash);
    let value = hash.digest('hex');
    const ret = {} as Hash;
    ret.hash = value;
    ret.salt = salt;
    return ret;
  }

  static async verifyTokenWS(token: string): Promise<string> {
    return new Promise((res, rej) => {
      if (token === undefined || typeof token !== 'string') {
        return rej('Malformed token');
      }
      jwt.verify(token, config.secretKey, (err: any, authData: any) => {
        if (err) {
          return rej(err);
        }
        if (authData.recovery) {
          return rej('Cannot accept websocket connection with a recovery token');
        }

        return res(authData.username);
      });
    });
  }

  static verifyToken(req: Request, res: Response, next: NextFunction) {
    const bearerHeader = req.headers['authorization'];
    if (bearerHeader === undefined) {
      res.sendStatus(401);
      return;
    }
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    jwt.verify(bearerToken, config.secretKey, (err: any, authData: any) => {
      if (err) {
        res.sendStatus(401);
        return;
      }
      if (authData.recovery) {
        console.error(`[${authData.username}] Cannot accept request with a recovery token`);
        res.sendStatus(401);
        return;
      }

      res.locals.username = authData.username;
      next();
    });
  }

  static verifyRecoveryToken(recoveryState: PasswordRecoveryState) {
    return function (req: Request, res: Response, next: NextFunction) {
      const bearerHeader = req.headers['authorization'];
      if (bearerHeader === undefined) {
        res.sendStatus(401);
        return;
      }
      const bearer = bearerHeader.split(' ');
      const bearerToken = bearer[1];
      jwt.verify(bearerToken, config.secretKey, (err: any, authData: any) => {
        if (err) {
          res.sendStatus(401);
          return;
        }
        if (authData.recovery !== recoveryState) {
          console.error(`[${authData.username}] Wrong recovery state`);
          res.sendStatus(401);
          return;
        }

        res.locals.username = authData.username;
        next();
      });
    };
  }

  /**
   * @throws AuthErrors.TokenCreation
   * @param data
   * @param duration
   */
  private createToken(data: object, duration: string | number): Promise<any> {
    return new Promise((res, rej) => {
      jwt.sign(data, config.secretKey, { expiresIn: duration }, (err: any, token: any) => {
        if (err) {
          rej(AuthErrors.TokenCreation);
        }
        res(token);
      });
    });
  }

  private static generateSalt() {
    return crypto
      .randomBytes(Math.ceil(this.SALT_ROUNDS / 2))
      .toString('hex')
      .slice(0, this.SALT_ROUNDS);
  }
}

export enum PasswordRecoveryState {
  Requested,
  Answered
}

const authController = new AuthController();
export default authController;
export { AuthController };
