import webSocket, { Data } from 'ws';
import { Lobby } from './lobby';
import express from 'express';
import bodyParser from 'body-parser';
import { ResponseEnum } from './enums';
import { Authentication } from './authentication';

const port = 8080; // default port to listen
const lobby = new Lobby();
const auth = new Authentication();

const app = express();
app.use(bodyParser.json());

app.use('/', lobby.getRouter());
app.use('/', auth.getRouter());

app.get('/*', (req, res) => res.send('Scrum poker server running!'));

const server = app.listen(port, () => console.log(`Listening in ${port}`));
const wss = new webSocket.Server({ server });

wss.on('connection', async (ws, req) => {
  let username: string;
  try {
    username = await Authentication.verifyTokenWS(req);
  } catch (e) {
    console.error('Invalid token');
    ws.close(4003, 'Invalid token');
    return;
  }

  (ws as any).isAlive = true;
  ws.on('pong', () => heartbeat(ws));

  const result = lobby.onNewConnection(ws, username);
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
