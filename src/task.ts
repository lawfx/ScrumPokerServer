import { Estimate } from './estimate';
import { User } from './user';

export class Task {
  private name: string;
  private estimates: Estimate[] = [];

  constructor(name: string) {
    this.name = name;
  }

  addEstimate(user: User, estimate: number) {
    this.estimates.push(new Estimate(user, estimate));
  }

  getEstimates() {
    return this.estimates;
  }
}
