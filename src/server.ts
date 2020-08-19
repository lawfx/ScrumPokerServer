import webSocket, { Data } from 'ws';
import { Room } from './room';
import { User } from './user';
import { IncomingMessage } from 'http';
import WebSocket from 'ws';

const wss = new webSocket.Server({ port: 8080 });
let rooms: Room[] = [];
let users: User[] = [];

wss.on('connection', (ws, req) => {
  // if (req.headers.username === undefined) {
  //   ws.terminate();
  // }

  createNewUser(ws, req);

  ws.on('message', (message) => {
    processMessage(ws, message);
  });

  ws.on('close', (code, reason) => {});
});

function createNewUser(ws: webSocket, req: IncomingMessage) {
  const user = new User('user' + getRandomInt(100));
  user.addWs(ws);
  users.push(user);
}

function getRandomInt(max: number) {
  return Math.floor(Math.random() * Math.floor(max));
}

function processMessage(ws: WebSocket, msg: Data) {
  if (typeof msg === 'string') {
    const msgJSON = JSON.parse(msg);
    if (msgJSON.connect_room) {
      const room = new Room(msgJSON.connect_room, findByWS(ws));
      rooms.push(room);
      console.log(rooms);
    }
  }
}

function findByWS(ws: WebSocket): User {
  return users.find((u) => {
    return u.getWs() === ws;
  })!;
}
