import { Router, Request, Response } from 'express';
import auth, { AuthController, PasswordRecoveryState } from '../controllers/auth-controller';
import { body } from 'express-validator';
import AuthErrors from '../errors/auth-errors';
import GenericErrors from '../errors/generic-errors';

class AuthRouter {
  public router: Router = Router();
  constructor() {
    this.router
      .post(
        '/register',
        body('username')
          .exists()
          .withMessage(GenericErrors.MalformedRequest)
          .isString()
          .withMessage(GenericErrors.MalformedRequest)
          .trim()
          .notEmpty()
          .withMessage(AuthErrors.UsernameEmpty)
          .isLength({ max: 20 })
          .withMessage(AuthErrors.UsernameTooLong),
        body('password')
          .exists()
          .withMessage(GenericErrors.MalformedRequest)
          .isString()
          .withMessage(GenericErrors.MalformedRequest)
          .trim()
          .notEmpty()
          .withMessage(AuthErrors.PasswordEmpty),
        body('security_question')
          .exists()
          .withMessage(GenericErrors.MalformedRequest)
          .isString()
          .withMessage(GenericErrors.MalformedRequest)
          .trim()
          .notEmpty()
          .withMessage(AuthErrors.SecurityQuestionEmpty)
          .isLength({ max: 100 })
          .withMessage(AuthErrors.SecurityQuestionTooLong),
        body('security_answer')
          .exists()
          .withMessage(GenericErrors.MalformedRequest)
          .isString()
          .withMessage(GenericErrors.MalformedRequest)
          .trim()
          .notEmpty()
          .withMessage(AuthErrors.SecurityAnswerEmpty),
        (req: Request, res: Response) => auth.register(req, res)
      )
      .post(
        '/login',
        body('username')
          .exists()
          .withMessage(GenericErrors.MalformedRequest)
          .isString()
          .withMessage(GenericErrors.MalformedRequest)
          .trim()
          .notEmpty()
          .withMessage(AuthErrors.UsernameEmpty)
          .isLength({ max: 20 })
          .withMessage(AuthErrors.UsernameTooLong),
        body('password')
          .exists()
          .withMessage(GenericErrors.MalformedRequest)
          .isString()
          .withMessage(GenericErrors.MalformedRequest)
          .trim()
          .notEmpty()
          .withMessage(AuthErrors.PasswordEmpty),
        (req: Request, res: Response) => auth.login(req, res)
      )
      .post(
        '/login/guest',
        body('username')
          .exists()
          .withMessage(GenericErrors.MalformedRequest)
          .isString()
          .withMessage(GenericErrors.MalformedRequest)
          .trim()
          .notEmpty()
          .withMessage(AuthErrors.UsernameEmpty)
          .isLength({ max: 20 })
          .withMessage(AuthErrors.UsernameTooLong),
        (req: Request, res: Response) => auth.loginAsGuest(req, res)
      )
      .post(
        '/recovery',
        body('username')
          .exists()
          .withMessage(GenericErrors.MalformedRequest)
          .isString()
          .withMessage(GenericErrors.MalformedRequest)
          .trim()
          .notEmpty()
          .withMessage(AuthErrors.UsernameEmpty)
          .isLength({ max: 20 })
          .withMessage(AuthErrors.UsernameTooLong),
        (req: Request, res: Response) => auth.processRecovery(req, res)
      )
      .post(
        '/recovery/answer',
        AuthController.verifyRecoveryToken(PasswordRecoveryState.Requested),
        body('security_answer')
          .exists()
          .withMessage(GenericErrors.MalformedRequest)
          .isString()
          .withMessage(GenericErrors.MalformedRequest)
          .trim()
          .notEmpty()
          .withMessage(AuthErrors.SecurityAnswerEmpty),
        (req: Request, res: Response) => auth.processRecoveryAnswer(req, res)
      )
      .patch(
        '/recovery/password',
        AuthController.verifyRecoveryToken(PasswordRecoveryState.Answered),
        body('password')
          .exists()
          .withMessage(GenericErrors.MalformedRequest)
          .isString()
          .withMessage(GenericErrors.MalformedRequest)
          .trim()
          .notEmpty()
          .withMessage(AuthErrors.PasswordEmpty),
        (req: Request, res: Response) => auth.processRecoveryPassword(req, res)
      );
  }
}

const authRouter = new AuthRouter();
export default authRouter;
