import { Estimate } from './estimate';
import { User } from './user';

export class Task {
  private name: string;
  private estimates: Map<User, Estimate> = new Map();
  constructor(name: string) {
    this.name = name;
  }
}

// import { Estimate } from './estimate';
// import { User } from './user';

// export class Task {
//   private id: string;
//   private estimates: Estimate[] = [];

//   constructor(id: string) {
//     this.id = id;
//   }

//   addEstimate(user: User, estimate: number): Estimate | undefined {
//     if (this.hasEstimated(user)) {
//       console.error(
//         `[Task: ${this.id}] ${user.getName()} has already estimated`
//       );
//       return;
//     }
//     const est = new Estimate(user, estimate);
//     this.estimates.push(est);
//     console.log(`[Task: ${this.id}] ${user.getName()} estimated ${estimate}`);
//     return est;
//   }

//   hasEveryoneEstimated(users: User[]): boolean {
//     const usersInRoom = users.length;
//     let userEstimates = 0;
//     users.forEach((u) => {
//       if (this.hasEstimated(u)) {
//         userEstimates++;
//       }
//     });
//     return usersInRoom === userEstimates;
//   }

//   getEstimates() {
//     return this.estimates;
//   }

//   getId(): string {
//     return this.id;
//   }

//   hasEstimated(user: User): boolean {
//     return (
//       this.estimates.find((e) => e.getUser().getName() === user.getName()) !==
//       undefined
//     );
//   }
// }
