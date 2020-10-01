import { expect } from 'chai';
import { after, before } from 'mocha';
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

// describe('User', () => {
//   it('should create user', (done) => {
//     const ws = new webSocket('ws://localhost:8080?name=nikos');
//     setTimeout(() => {
//       expect(lobby.getUsers().length).to.be.equal(1);
//       ws.close();
//       done();
//     }, 500);
//   });

//   it("shouldn't create user due to empty name", (done) => {
//     const ws = new webSocket('ws://localhost:8080?name=');
//     setTimeout(() => {
//       expect(lobby.getUsers().length).to.be.equal(0);
//       done();
//     }, 500);
//   });

//   it("shouldn't create user due to no name param", (done) => {
//     const ws = new webSocket('ws://localhost:8080');
//     setTimeout(() => {
//       expect(lobby.getUsers().length).to.be.equal(0);
//       done();
//     }, 500);
//   });
// });
