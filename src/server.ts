import webSocket, { Data } from 'ws';
import { Room } from './room';
import { Lobby } from './lobby';
import { ErrorJSON } from './messages';

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

function sendRoomsToAllUsers() {}

function processMessage(ws: webSocket, msg: Data) {
  if (typeof msg === 'string') {
    const msgJSON = JSON.parse(msg);
    if (msgJSON.connect_room) {
      if (msgJSON.connect_room !== '') {
        lobby.createRoom(ws, msgJSON.connect_room);
      } else {
        disconnectFromRoom(ws);
      }
    }
  }
}

function disconnectFromRoom(ws: webSocket) {}

// function getRoomWhereUserIsConnected(): Room | undefined {
//   rooms.forEach((r) => {
//     r.getAdminsAndUsers();
//   });
// }
