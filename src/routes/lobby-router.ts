import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import lobby from '../controllers/lobby-controller';

class LobbyRouter {
  public router: Router = Router();
  constructor() {
    this.router
      .put('/create', lobby.createRoom)
      .patch('/connect', lobby.joinRoom)
      .patch('/disconnect', lobby.leaveRoom)
      .delete('/destroy', lobby.destroyRoom);
    // this.router.use(AuthController.verifyToken);
  }
}

const lobbyRouter = new LobbyRouter();
export default lobbyRouter;
