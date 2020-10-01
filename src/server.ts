import webSocket, { Data } from 'ws';
import { Lobby } from './lobby';
import express from 'express';
import bodyParser from 'body-parser';
import { ResponseEnum } from './enums';
import { Server } from 'http';

const port = 8080; // default port to listen
let server: Server;
let lobby: Lobby;

if (require.main === module) {
  console.log('called directly');
  lobby = new Lobby();
  server = setupHttpServer(port, lobby);
  setupWebSocketServer(server, lobby);
} else {
  console.log('required as a module');
}

export function setupHttpServer(port: number, lobby: Lobby): Server {
  const app = express();
  app.use(bodyParser.json());

  app.use('/', lobby.getRouter());

  app.get('/', (req, res) => res.send('Scrum poker server running!'));

  const server = app.listen(port, () => console.log(`Listening in ${port}`));
  return server;
}
export function setupWebSocketServer(
  server: Server,
  lobby: Lobby
): webSocket.Server {
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

  return wss;
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
