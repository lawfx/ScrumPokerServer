import { User } from './user';

export class Estimate {
  private user: User;
  private estimate: number;

  constructor(user: User, estimate: number) {
    this.user = user;
    this.estimate = estimate;
  }
}
