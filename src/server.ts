import webSocket, { Data } from 'ws';
import { Lobby } from './lobby';
import express from 'express';
import bodyParser from 'body-parser';
import { CreateRoomJSONClient } from './models-json';
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
  // if (req.headers.username === undefined) {
  //   ws.close();
  // }

  const result = lobby.createUser(ws, req);
  if (result !== FuncRetEnum.OK) {
    ws.close(
      4001,
      result === FuncRetEnum.USERNAME_EMPTY
        ? 'Username is empty'
        : result === FuncRetEnum.USER_ALREADY_EXISTS
        ? 'User already exists'
        : 'Unknown error'
    );
  }

  ws.on('message', (message) => {
    processMessage(ws, message);
  });

  ws.on('close', (code, reason) => {
    if (code !== 4001) {
      lobby.destroyUser(ws);
    }
  });
});

function processMessage(ws: webSocket, msg: Data) {
  if (typeof msg !== 'string') return;

  try {
    const msgJSON = JSON.parse(msg);
    if (msgJSON.request_estimate !== undefined) {
      lobby.requestEstimate(ws, msgJSON.request_estimate);
    } else if (msgJSON.estimate !== undefined) {
      lobby.addEstimate(ws, msgJSON.estimate);
    }
  } catch (e) {
    console.error('Got invalid JSON message, ignoring...');
    return;
  }
}
