import webSocket, { Data } from 'ws';
import { Lobby } from './lobby';
import express from 'express';
import bodyParser from 'body-parser';
import { FuncRetEnum } from './enums';

const app = express();
app.use(bodyParser.json());
const port = 8080; // default port to listen

const lobby = new Lobby();

app.use('/', lobby.getRouter());

app.get('/', (req, res) => res.send('Scrum poker server running!'));

const server = app.listen(port, () => console.log(`Listening in ${port}`));

const wss = new webSocket.Server({ server });

wss.on('connection', (ws, req) => {
  (ws as any).isAlive = true;
  ws.on('pong', () => heartbeat(ws));
  // if (req.headers.username === undefined) {
  //   ws.close();
  // }

  const result = lobby.createUser(ws, req);
  if (result !== FuncRetEnum.OK) {
    ws.close(
      4001,
      result === FuncRetEnum.USERNAME_EMPTY
        ? 'Username is empty'
        : result === FuncRetEnum.USERNAME_TOO_LONG
        ? "Username can't exceed 20 characters"
        : result === FuncRetEnum.USER_ALREADY_EXISTS
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
      lobby.destroyUser(ws);
    }
  });
});

wss.on('close', function close() {
  clearInterval(pingInterval);
});

function processMessage(ws: webSocket, msg: Data) {
  if (typeof msg !== 'string') return;

  try {
    const msgJSON = JSON.parse(msg);
    if (msgJSON.request_estimate !== undefined) {
      lobby.requestTaskEstimate(ws, msgJSON.request_estimate);
    } else if (msgJSON.estimate !== undefined) {
      lobby.addEstimate(ws, msgJSON.estimate);
    }
  } catch (e) {
    console.error('Got invalid JSON message, ignoring...');
    return;
  }
}

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
