import webSocket, { Data } from 'ws';
import { Lobby } from './lobby';

const wss = new webSocket.Server({ port: 8080 });
const lobby = new Lobby();

wss.on('connection', (ws, req) => {
  // if (req.headers.username === undefined) {
  //   ws.terminate();
  // }

  lobby.addUser(ws, req);

  ws.on('message', (message) => {
    processMessage(ws, message);
  });

  ws.on('close', (code, reason) => {
    lobby.removeUser(ws);
  });
});

function processMessage(ws: webSocket, msg: Data) {
  if (typeof msg === 'string') {
    const msgJSON = JSON.parse(msg);
    if (msgJSON.create_room !== undefined) {
      lobby.createRoom(ws, msgJSON.create_room.trim());
    } else if (msgJSON.connect_room !== undefined) {
      if (msgJSON.connect_room.trim() !== '') {
        lobby.connectToRoom(ws, msgJSON.connect_room.trim());
      } else {
        lobby.disconnectFromRoom(ws);
      }
    }
  }
}
