import { Lobby } from './lobby';
import express from 'express';
import bodyParser from 'body-parser';
// import { ResponseEnum } from './enums';
import { Authentication } from './authentication';
import cors from 'cors';
import { WebsocketServer } from './websocket-server';

const port = 8080; // default port to listen
const lobby = new Lobby();
const auth = new Authentication();

const app = express();
app.use(bodyParser.json());
app.use(cors());

// app.use('/', lobby.getRouter());
app.use('/', auth.getRouter());

app.get('/*', (req, res) => res.send('Scrum poker server running!'));

const server = app.listen(port, () => console.log(`Listening in ${port}`));
const wss = new WebsocketServer(server);
