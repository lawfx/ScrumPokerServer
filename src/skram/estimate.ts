import User from './user';

class Estimate {
  private user: User;
  private estimate: number;

  constructor(user: User, estimate: number) {
    this.user = user;
    this.estimate = estimate;
  }

  getUser(): User {
    return this.user;
  }

  getEstimate(): number {
    return this.estimate;
  }
}

export default Estimate;
