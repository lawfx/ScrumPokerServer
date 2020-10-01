import { expect } from 'chai';
import 'mocha';
import { Room } from '../room';
import { User } from '../user';
import webSocket from 'ws';
import { Lobby } from '../lobby';
import { Server } from 'http';
import { setupHttpServer, setupWebSocketServer } from '../server';

// let lobby: Lobby;
// let server: Server;
// let wss: webSocket.Server;

// before(() => {
//   lobby = new Lobby();
//   server = setupHttpServer(8080, lobby);
//   wss = setupWebSocketServer(server, lobby);
// });

// after(() => {
//   wss.close();
//   server.close();
// });

// describe('Room', () => {
//   it('should create room', () => {
//     const ws = new webSocket('ws://localhost:8080?name=nikos');

//     // expect(room.getAdminsAndUsers()[1]).to.equal(user3);
//   });
// });
