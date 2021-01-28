import crypto from 'crypto';
import { NextFunction, Router, Response } from 'express';
import { Hash, ResponsePair } from './models';
import { UserModel } from './models/user-model';
import config from './config.json';
import { Utils } from './utils';
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import { PasswordRecoveryState, ResponseEnum } from './enums';

export class Authentication {
  private static readonly SALT_ROUNDS = 20;
  private readonly RECOVERY_TOKEN_TIMEOUT = '10m';
  private readonly LOGIN_TOKEN_TIMEOUT = '10h';
  private readonly LOGIN_GUEST_TOKEN_TIMEOUT = '5h';
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  getRouter(): Router {
    return this.router;
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
        return rej();
      }
      jwt.verify(token, config.secretKey, (err: any, authData: any) => {
        if (err) {
          console.error(err);
          return rej();
        }
        if (authData.recovery) {
          console.error(`[${authData.username}] Cannot accept websocket connection with a recovery token`);
          return rej();
        }

        return res(authData.username);
      });
    });
  }

  static verifyToken(req: IncomingMessage, res: Response, next: NextFunction) {
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

  private verifyRecoveryToken(recoveryState: PasswordRecoveryState) {
    return function (req: IncomingMessage, res: Response, next: NextFunction) {
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

  private setupRoutes() {
    this.router.post('/auth/register', async (req, res) => {
      const resUsername = this.validateUsername(req.body.username);
      const resPassword = this.validatePassword(req.body.password);
      const resSecQuestion = this.validateSecurityQuestion(req.body.security_question);
      const resSecAnswer = this.validateSecurityAnswer(req.body.security_answer);
      if (resUsername !== ResponseEnum.OK) {
        res.status(resUsername.code).send(Utils.createMessageJson(resUsername.message));
        return;
      } else if (resPassword !== ResponseEnum.OK) {
        res.status(resPassword.code).send(Utils.createMessageJson(resPassword.message));
        return;
      } else if (resSecQuestion !== ResponseEnum.OK) {
        res.status(resSecQuestion.code).send(Utils.createMessageJson(resSecQuestion.message));
        return;
      } else if (resSecAnswer !== ResponseEnum.OK) {
        res.status(resSecAnswer.code).send(Utils.createMessageJson(resSecAnswer.message));
        return;
      }

      const username = req.body.username.trim();
      const password = req.body.password.trim();
      const question = req.body.security_question.trim();
      const answer = req.body.security_answer.trim();

      const hash = Authentication.hash(password);
      const securityAnswerHash = Authentication.hash(answer);
      try {
        await UserModel.create({
          username: username,
          passwordHash: hash.hash,
          salt: hash.salt,
          securityQuestion: question,
          securityAnswerHash: securityAnswerHash.hash,
          securityAnswerSalt: securityAnswerHash.salt
        });
        res.sendStatus(201);
      } catch (e) {
        res.status(500).json(Utils.createMessageJson(e.errors[0]?.message ?? ResponseEnum.UnknownError));
      }
    });

    this.router.post('/auth/login', async (req, res) => {
      const resUsername = this.validateUsername(req.body.username);
      const resPassword = this.validatePassword(req.body.password);
      if (resUsername !== ResponseEnum.OK) {
        res.status(resUsername.code).send(Utils.createMessageJson(resUsername.message));
        return;
      } else if (resPassword !== ResponseEnum.OK) {
        res.status(resPassword.code).send(Utils.createMessageJson(resPassword.message));
        return;
      }

      const username = req.body.username.trim();
      const password = req.body.password.trim();

      try {
        const user = await UserModel.findOne({ where: { username: username } });
        if (user === null) {
          res.status(401).json(Utils.createMessageJson(ResponseEnum.WrongCredentials));
          return;
        }
        const hash = Authentication.hash(password, user.salt);
        if (hash.hash === user.passwordHash) {
          try {
            const token = await this.createToken({ username: username }, this.LOGIN_TOKEN_TIMEOUT);
            res.json({ token: token });
          } catch (e) {
            res.status(e.code).json(Utils.createMessageJson(e.message));
          }
        } else {
          res.status(401).json(Utils.createMessageJson(ResponseEnum.WrongCredentials));
        }
      } catch (e) {
        res.status(500).json(Utils.createMessageJson(e.errors[0]?.message ?? ResponseEnum.UnknownError));
      }
    });

    this.router.post('/auth/login/guest', async (req, res) => {
      const resUsername = this.validateUsername(req.body.username);
      if (resUsername !== ResponseEnum.OK) {
        res.status(resUsername.code).send(Utils.createMessageJson(resUsername.message));
        return;
      }

      const username = req.body.username.trim();

      try {
        const user = await UserModel.findOne({ where: { username: username } });
        if (user !== null) {
          res.status(409).json(Utils.createMessageJson(ResponseEnum.UserAlreadyExists));
          return;
        }
        try {
          const token = await this.createToken({ username: username }, this.LOGIN_GUEST_TOKEN_TIMEOUT);
          res.json({ token: token });
        } catch (e) {
          res.status(e.code).json(Utils.createMessageJson(e.message));
        }
      } catch (e) {
        res.status(500).json(Utils.createMessageJson(e.errors[0]?.message ?? ResponseEnum.UnknownError));
      }
    });

    this.router.post('/auth/recovery', async (req, res) => {
      const resUsername = this.validateUsername(req.body.username);
      if (resUsername !== ResponseEnum.OK) {
        res.status(resUsername.code).send(Utils.createMessageJson(resUsername.message));
        return;
      }

      const username = req.body.username.trim();

      try {
        const user = await UserModel.findOne({ where: { username: username } });
        if (user === null) {
          const resPair = Utils.getResponsePair(ResponseEnum.UserNotExists);
          res.status(resPair.code).json(Utils.createMessageJson(resPair.message));
          return;
        }
        try {
          const token = await this.createToken({ username: username, recovery: PasswordRecoveryState.Requested }, this.RECOVERY_TOKEN_TIMEOUT);
          res.json({ question: user.securityQuestion, token: token });
        } catch (e) {
          res.status(e.code).json(Utils.createMessageJson(e.message));
        }
      } catch (e) {
        res.status(500).json(Utils.createMessageJson(e.errors[0]?.message ?? ResponseEnum.UnknownError));
      }
    });

    this.router.post('/auth/recovery/answer', this.verifyRecoveryToken(PasswordRecoveryState.Requested), async (req, res) => {
      const username = res.locals.username;
      const resSecAnswer = this.validateSecurityAnswer(req.body.security_answer);
      if (resSecAnswer !== ResponseEnum.OK) {
        res.status(resSecAnswer.code).send(Utils.createMessageJson(resSecAnswer.message));
        return;
      }

      const answer = req.body.security_answer.trim();

      try {
        const user = await UserModel.findOne({
          where: { username: username }
        });
        if (user === null) {
          const resPair = Utils.getResponsePair(ResponseEnum.UserNotExists);
          res.status(resPair.code).json(Utils.createMessageJson(resPair.message));
          return;
        }
        const hash = Authentication.hash(answer, user.securityAnswerSalt);
        if (hash.hash === user.securityAnswerHash) {
          try {
            const token = await this.createToken(
              {
                username: username,
                recovery: PasswordRecoveryState.Answered
              },
              this.RECOVERY_TOKEN_TIMEOUT
            );
            res.json({ token: token });
          } catch (e) {
            res.status(e.code).json(Utils.createMessageJson(e.message));
          }
        } else {
          res.status(401).json(Utils.createMessageJson(ResponseEnum.WrongSecurityAnswer));
        }
      } catch (e) {
        res.status(500).json(Utils.createMessageJson(e.errors[0]?.message ?? ResponseEnum.UnknownError));
      }
    });

    this.router.patch('/auth/recovery/password', this.verifyRecoveryToken(PasswordRecoveryState.Answered), async (req, res) => {
      const username = res.locals.username;
      const resPassword = this.validatePassword(req.body.password);
      if (resPassword !== ResponseEnum.OK) {
        res.status(resPassword.code).send(Utils.createMessageJson(resPassword.message));
        return;
      }

      const password = req.body.password.trim();
      const hash = Authentication.hash(password);
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
        res.status(500).json(Utils.createMessageJson(e.errors[0]?.message ?? ResponseEnum.UnknownError));
      }
    });
  }

  private createToken(data: object, duration: string | number): Promise<any> {
    return new Promise((res, rej) => {
      jwt.sign(data, config.secretKey, { expiresIn: duration }, (err: any, token: any) => {
        if (err) {
          rej(Utils.getResponsePair(ResponseEnum.TokenCreationError));
        }
        res(token);
      });
    });
  }

  private validatePassword(password: any): ResponsePair | ResponseEnum.OK {
    if (typeof password !== 'string') {
      return Utils.getResponsePair(ResponseEnum.MalformedRequest);
    }
    password = password.trim();
    if (password.length === 0) {
      return Utils.getResponsePair(ResponseEnum.PasswordEmpty);
    }
    return ResponseEnum.OK;
  }

  private validateUsername(username: any): ResponsePair | ResponseEnum.OK {
    if (typeof username !== 'string') {
      return Utils.getResponsePair(ResponseEnum.MalformedRequest);
    }
    username = username.trim();
    if (username.length === 0) {
      return Utils.getResponsePair(ResponseEnum.UsernameEmpty);
    } else if (username.length > 20) {
      return Utils.getResponsePair(ResponseEnum.UsernameTooLong);
    }
    return ResponseEnum.OK;
  }

  private validateSecurityQuestion(question: any): ResponsePair | ResponseEnum.OK {
    if (typeof question !== 'string') {
      return Utils.getResponsePair(ResponseEnum.MalformedRequest);
    }
    question = question.trim();
    if (question.length === 0) {
      return Utils.getResponsePair(ResponseEnum.SecurityQuestionEmpty);
    } else if (question.length > 100) {
      return Utils.getResponsePair(ResponseEnum.SecurityQuestionTooLong);
    }
    return ResponseEnum.OK;
  }

  private validateSecurityAnswer(answer: any): ResponsePair | ResponseEnum.OK {
    if (typeof answer !== 'string') {
      return Utils.getResponsePair(ResponseEnum.MalformedRequest);
    }
    answer = answer.trim();
    if (answer.length === 0) {
      return Utils.getResponsePair(ResponseEnum.SecurityAnswerEmpty);
    }
    return ResponseEnum.OK;
  }

  private static generateSalt() {
    return crypto
      .randomBytes(Math.ceil(this.SALT_ROUNDS / 2))
      .toString('hex')
      .slice(0, this.SALT_ROUNDS);
  }
}
