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

wss.on('connection', async (ws) => {
  (ws as any).isAlive = true;
  (ws as any).isAuthed = false;
  ws.on('pong', () => heartbeat(ws));

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
    } else if (!(ws as any).isAuthed) {
      ws.close(4003, 'Unauthenticated');
      return;
    }

    (ws as any).isAlive = false;
    ws.ping(() => {});
  });
}, 10000);

async function processMessage(ws: webSocket, msg: Data) {
  if (typeof msg !== 'string') return;

  try {
    const msgJSON = JSON.parse(msg);
    if (msgJSON.token !== undefined) {
      let username: string;
      try {
        username = await Authentication.verifyTokenWS(msgJSON.token.trim());
      } catch (e) {
        console.error('Invalid token');
        ws.close(4003, 'Invalid token');
        return;
      }
      (ws as any).isAuthed = true;
      const result = lobby.onNewConnection(ws, username);
      if (result !== ResponseEnum.OK) {
        ws.close(
          4001,
          result === ResponseEnum.USER_ALREADY_CONNECTED
            ? 'User already connected'
            : 'Unknown error'
        );
      }
    } else if (msgJSON.request_estimate !== undefined) {
      if (!(ws as any).isAuthed) return;
      lobby.onNewEstimateRequest(ws, msgJSON.request_estimate);
    } else if (msgJSON.estimate !== undefined) {
      if (!(ws as any).isAuthed) return;
      lobby.onNewEstimate(ws, msgJSON.estimate);
    }
  } catch (e) {
    console.error('Got invalid JSON message, ignoring...');
    return;
  }
}
