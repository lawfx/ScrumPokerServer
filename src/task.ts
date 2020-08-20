import { Estimate } from './estimate';

export class Task {
  private name: string;
  private estimates: Estimate[] = [];

  constructor(name: string) {
    this.name = name;
  }

  addEstimate(user: string, estimate: number) {
    this.estimates.push(new Estimate(user, estimate));
  }

  getEstimates() {
    return this.estimates;
  }
}
