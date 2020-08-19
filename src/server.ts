import ws from 'ws';
import { Room } from './room';
import { User } from './user';

const wss = new ws.Server({ port: 9000 });
let rooms: Room[] = [];

wss.on('connection', (ws, req) => {
  ws.on('message', (message) => {
    console.log('received: %s', message);
  });
});
