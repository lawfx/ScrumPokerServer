import crypto from 'crypto';
import { NextFunction, Router, Response } from 'express';
import { Hash, ResponsePair } from './models';
import { UserModel } from './models/user-model';
import config from './config.json';
import { Utils } from './utils';
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import { ResponseEnum } from './enums';

export class Authentication {
  private static readonly SALT_ROUNDS = 20;
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  getRouter(): Router {
    return this.router;
  }

  static hash(password: string, salt: string = this.generateSalt()): Hash {
    let hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    let value = hash.digest('hex');
    const ret = {} as Hash;
    ret.hashedPassword = value;
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

      res.locals.username = authData.username;
      next();
    });
  }

  private setupRoutes() {
    this.router.post('/auth/register', async (req, res) => {
      const resUsername = this.validateUsername(req.body.username);
      const resPassword = this.validatePassword(req.body.password);
      if (resUsername !== ResponseEnum.OK) {
        res
          .status(resUsername.code)
          .send(Utils.createMessageJson(resUsername.message));
        return;
      } else if (resPassword !== ResponseEnum.OK) {
        res
          .status(resPassword.code)
          .send(Utils.createMessageJson(resPassword.message));
        return;
      }

      const username = req.body.username.trim();
      const password = req.body.password.trim();

      const hash = Authentication.hash(password);
      try {
        await UserModel.create({
          username: username,
          passwordHash: hash.hashedPassword,
          salt: hash.salt
        });
        res.sendStatus(201);
      } catch (e) {
        res
          .status(500)
          .json(
            Utils.createMessageJson(
              e.errors[0]?.message ?? ResponseEnum.UnknownError
            )
          );
      }
    });

    this.router.post('/auth/login', async (req, res) => {
      const resUsername = this.validateUsername(req.body.username);
      const resPassword = this.validatePassword(req.body.password);
      if (resUsername !== ResponseEnum.OK) {
        res
          .status(resUsername.code)
          .send(Utils.createMessageJson(resUsername.message));
        return;
      } else if (resPassword !== ResponseEnum.OK) {
        res
          .status(resPassword.code)
          .send(Utils.createMessageJson(resPassword.message));
        return;
      }

      const username = req.body.username.trim();
      const password = req.body.password.trim();

      try {
        const user = await UserModel.findOne({ where: { username: username } });
        if (user === null) {
          res
            .status(401)
            .json(Utils.createMessageJson(ResponseEnum.WrongCredentials));
          return;
        }
        const hash = Authentication.hash(password, user.salt);
        if (hash.hashedPassword === user.passwordHash) {
          this.createToken({ username: username }, '10h', res);
        } else {
          res
            .status(401)
            .json(Utils.createMessageJson(ResponseEnum.WrongCredentials));
        }
      } catch (e) {
        res
          .status(500)
          .json(
            Utils.createMessageJson(
              e.errors[0]?.message ?? ResponseEnum.UnknownError
            )
          );
      }
    });

    this.router.post('/auth/login/guest', async (req, res) => {
      const resUsername = this.validateUsername(req.body.username);
      if (resUsername !== ResponseEnum.OK) {
        res
          .status(resUsername.code)
          .send(Utils.createMessageJson(resUsername.message));
        return;
      }

      const username = req.body.username.trim();

      try {
        const user = await UserModel.findOne({ where: { username: username } });
        if (user !== null) {
          res
            .status(409)
            .json(Utils.createMessageJson(ResponseEnum.UserAlreadyExists));
          return;
        }
        this.createToken({ username: username }, '5h', res);
      } catch (e) {
        res
          .status(500)
          .json(
            Utils.createMessageJson(
              e.errors[0]?.message ?? ResponseEnum.UnknownError
            )
          );
      }
    });
  }

  private createToken(data: object, duration: string | number, res: Response) {
    jwt.sign(
      data,
      config.secretKey,
      { expiresIn: duration },
      (err: any, token: any) => {
        if (err) {
          res
            .status(500)
            .send(Utils.createMessageJson(ResponseEnum.TokenCreationError));
          return;
        }
        res.json({ token: token });
      }
    );
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

  private static generateSalt() {
    return crypto
      .randomBytes(Math.ceil(this.SALT_ROUNDS / 2))
      .toString('hex')
      .slice(0, this.SALT_ROUNDS);
  }
}
