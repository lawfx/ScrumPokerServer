import webSocket, { Data } from 'ws';
import { Lobby } from './lobby';
import express, { NextFunction, Response } from 'express';
import bodyParser from 'body-parser';
import { ResponseEnum } from './enums';
import { IncomingMessage } from 'http';
// import { dbConfig } from './database';
import jwt from 'jsonwebtoken';
// import { Hasher } from './hasher';
// import { Hash } from './models';
import * as config from './config.json';

const port = 8080; // default port to listen
const lobby = new Lobby();
// const hasher = new Hasher();
// console.log(hasher.hash('yolo').hashedPassword.length);
// console.log(hasher.hash('nikos').hashedPassword.length);

// console.log(config.secretKey);
// console.log(compare());

// dbConfig
//   .authenticate()
//   .then(() => console.log('Database authenticated'))
//   .catch((err) => console.error(err));
const app = express();
app.use(bodyParser.json());

app.use('/', lobby.getRouter());

app.post('/login', (req, res) => {
  const user = {
    username: req.body.username
  };
  jwt.sign(user, config.secretKey, (err: any, token: any) => {
    console.log(token);
    res.json({ token: token });
  });
});

app.post('/api/test', verifyToken, (req, res) => {
  jwt.verify(
    (req as any).token,
    config.secretKey,
    (err: any, authData: any) => {
      if (err) {
        res.sendStatus(403);
        return;
      }

      console.log(authData);
      res.send('test success');
    }
  );
});

app.get('/*', (req, res) => res.send('Scrum poker server running!'));

const server = app.listen(port, () => console.log(`Listening in ${port}`));
const wss = new webSocket.Server({ server });

wss.on('connection', (ws, req) => {
  (ws as any).isAlive = true;
  ws.on('pong', () => heartbeat(ws));
  // if (req.headers.username === undefined) {
  //   ws.close();
  // }

  const result = lobby.onNewConnection(ws, req);
  if (result !== ResponseEnum.OK) {
    ws.close(
      4001,
      result === ResponseEnum.USERNAME_EMPTY
        ? 'Username is empty'
        : result === ResponseEnum.USERNAME_TOO_LONG
        ? "Username can't exceed 20 characters"
        : result === ResponseEnum.USER_ALREADY_EXISTS
        ? 'User already exists'
        : 'Unknown error'
    );
  }

  ws.on('message', (message) => {
    processMessage(ws, message);
  });

  ws.on('close', (code, reason) => {
    console.log(`${code} ${reason}`);
    if (code !== 4001) {
      lobby.onCloseConnection(ws);
    }
  });
});

wss.on('close', function close() {
  clearInterval(pingInterval);
});

function heartbeat(ws: webSocket) {
  (ws as any).isAlive = true;
}

const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!(ws as any).isAlive) {
      ws.close(4002, 'No pong');
      return;
    }

    (ws as any).isAlive = false;
    ws.ping(() => {});
  });
}, 10000);

function verifyToken(req: IncomingMessage, res: Response, next: NextFunction) {
  const bearerHeader = req.headers['authorization'];
  if (bearerHeader !== undefined) {
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    (req as any).token = bearerToken;
    next();
  } else {
    res.sendStatus(403);
  }
}

function processMessage(ws: webSocket, msg: Data) {
  if (typeof msg !== 'string') return;

  try {
    const msgJSON = JSON.parse(msg);
    if (msgJSON.request_estimate !== undefined) {
      lobby.onNewEstimateRequest(ws, msgJSON.request_estimate);
    } else if (msgJSON.estimate !== undefined) {
      lobby.onNewEstimate(ws, msgJSON.estimate);
    }
  } catch (e) {
    console.error('Got invalid JSON message, ignoring...');
    return;
  }
}

// function compare(password: string, hash: Hash) {
//   if (password === undefined || password === null || password === '') {
//     return false;
//   }
//   let passwordData = hasher.hash(password, hash.salt);
//   if (passwordData.hashedPassword === hash.hashedPassword) {
//     return true;
//   }
//   return false;
// }
