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

  static verifyToken(req: IncomingMessage, res: Response, next: NextFunction) {
    const bearerHeader = req.headers['authorization'];
    if (bearerHeader !== undefined) {
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
    } else {
      res.sendStatus(403);
    }
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
          jwt.sign(
            { username: username },
            config.secretKey,
            (err: any, token: any) => {
              res.json({ token: token });
            }
          );
        } else {
          res.status(400).json(Utils.createMessageJson('Wrong password'));
        }
      } catch (e) {
        res
          .status(500)
          .json(
            Utils.createMessageJson(e.errors[0]?.message ?? 'unknown error')
          );
      }
    });
  }

  private static generateSalt() {
    return crypto
      .randomBytes(Math.ceil(this.SALT_ROUNDS / 2))
      .toString('hex')
      .slice(0, this.SALT_ROUNDS);
  }
}
