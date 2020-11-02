import crypto from 'crypto';
import { NextFunction, Router, Response } from 'express';
import { Hash } from './models';
import { UserModel } from './models/user-model';
import config from './config.json';
import { Utils } from './utils';
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';

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

  static async verifyTokenWS(req: IncomingMessage): Promise<string> {
    return new Promise((res, rej) => {
      const token = req.headers['token'];
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
      res.sendStatus(403);
      return;
    }
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    jwt.verify(bearerToken, config.secretKey, (err: any, authData: any) => {
      if (err) {
        res.sendStatus(403);
        return;
      }

      res.locals.username = authData.username;
      next();
    });
  }

  private setupRoutes() {
    this.router.post('/auth/register', async (req, res) => {
      if (
        typeof req.body.username !== 'string' ||
        typeof req.body.password !== 'string'
      ) {
        res.status(400).json(Utils.createMessageJson('Malformed request'));
        return;
      }

      const username = req.body.username?.trim();
      const password = req.body.password?.trim();

      if (
        username === '' ||
        username === undefined ||
        password === '' ||
        password === undefined
      ) {
        res.status(400).json(Utils.createMessageJson('Malformed request'));
        return;
      }
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
            Utils.createMessageJson(e.errors[0]?.message ?? 'unknown error')
          );
      }
    });

    this.router.post('/auth/login', async (req, res) => {
      if (
        typeof req.body.username !== 'string' ||
        typeof req.body.password !== 'string'
      ) {
        res.status(400).json(Utils.createMessageJson('Malformed request'));
        return;
      }
      const username = req.body.username?.trim();
      const password = req.body.password?.trim();

      try {
        const user = await UserModel.findOne({ where: { username: username } });
        if (user === null) {
          res.status(404).json(Utils.createMessageJson('User not found'));
          return;
        }
        const hash = Authentication.hash(password, user.salt);
        if (hash.hashedPassword === user.passwordHash) {
          this.createToken({ username: username }, '10h', res);
        } else {
          res.status(401).json(Utils.createMessageJson('Wrong password'));
        }
      } catch (e) {
        res
          .status(500)
          .json(
            Utils.createMessageJson(e.errors[0]?.message ?? 'Unknown error')
          );
      }
    });

    this.router.post('/auth/login/guest', async (req, res) => {
      if (typeof req.body.username !== 'string') {
        res.status(400).json(Utils.createMessageJson('Malformed request'));
        return;
      }
      const username = req.body.username?.trim();

      try {
        const user = await UserModel.findOne({ where: { username: username } });
        if (user !== null) {
          res.status(409).json(Utils.createMessageJson('User exists'));
          return;
        }
        this.createToken({ username: username }, '5h', res);
      } catch (e) {
        res
          .status(500)
          .json(
            Utils.createMessageJson(e.errors[0]?.message ?? 'Unknown error')
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
          res.status(500).send(Utils.createMessageJson('Error creating token'));
          return;
        }
        res.json({ token: token });
      }
    );
  }

  private static generateSalt() {
    return crypto
      .randomBytes(Math.ceil(this.SALT_ROUNDS / 2))
      .toString('hex')
      .slice(0, this.SALT_ROUNDS);
  }

  /**This method is just for internal testing of the websocket */
  static async _verifyTokenWS(req: IncomingMessage): Promise<string> {
    return new Promise((res, rej) => {
      const token = Utils.getQueryVariable(req.url!, 'token');
      if (token === undefined) {
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
}
