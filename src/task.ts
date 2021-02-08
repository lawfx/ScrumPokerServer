import { Estimate } from './estimate';
import { Err } from './return';
import { User } from './user';

export class Task {
  private id: string;
  private estimates: Estimate[] = [];

  constructor(id: string) {
    this.id = id;
  }

  /**
   * @throws {@link Err.UserAlreadyEstimated}
   * @param estimate
   * @param user
   */
  addEstimate(estimate: number, user: User): Estimate {
    if (this.hasEstimated(user)) throw new Error(Err.UserAlreadyEstimated);
    const est = new Estimate(user, estimate);
    this.estimates.push(est);
    return est;
  }

  //TODO move this to room
  hasEveryoneEstimated(users: User[]): boolean {
    const usersInRoom = users.length;
    let userEstimates = 0;
    users.forEach((u) => {
      if (this.hasEstimated(u)) {
        userEstimates++;
      }
    });
    return usersInRoom === userEstimates;
  }

  getEstimates(): Estimate[] {
    return this.estimates;
  }

  getId(): string {
    return this.id;
  }

  hasEstimated(user: User): boolean {
    return this.estimates.find((e) => e.getUser().getName() === user.getName()) !== undefined;
  }
}
