import express from 'express';
import bodyParser from 'body-parser';
import { Router } from 'express';
import cors from 'cors';
import { Server } from 'http';

class App {
  public app: express.Application;
  public server?: Server;
  public port: number;

  constructor(router: Router, port: number) {
    this.app = express();
    this.port = port;

    this.initializeMiddlewares();
    this.initializeRouters(router);
  }

  private initializeMiddlewares() {
    this.app.use(bodyParser.json());
    this.app.use(cors());
  }

  private initializeRouters(router: Router) {
    this.app.use('/', router);

    this.app.get('/*', (req, res) => res.send('Skram running!'));
  }

  public listen() {
    this.server = this.app.listen(this.port, () => {
      console.log(`Skram listening on port ${this.port}`);
    });
  }
}

export default App;
