import { Estimate } from './estimate';
import { User } from './user';

export class EstimateRequest {
  private name: string;
  private estimates: Estimate[] = [];

  constructor(name: string) {
    this.name = name;
  }

  addEstimate(user: User, estimate: number) {
    this.estimates.push(new Estimate(user, estimate));
  }

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

  getEstimates() {
    return this.estimates;
  }

  getName(): string {
    return this.name;
  }

  private hasEstimated(user: User): boolean {
    return (
      this.estimates.find((e) => e.getUser().getName() === user.getName()) !==
      undefined
    );
  }
}
