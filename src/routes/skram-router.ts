import { Router } from 'express';
import lobbyRouter from './lobby-router';
import authRouter from './auth-router';

class SkramRouter {
  public router: Router = Router();

  constructor() {
    this.router.use('/rooms', lobbyRouter.router);
    this.router.use('/auth', authRouter.router);
  }
}

const skramRouter = new SkramRouter();

export default skramRouter;
