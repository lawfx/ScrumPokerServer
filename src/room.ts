import { User } from './user';

export class Room {
  private name: string;
  private users: User[] = [];

  constructor(name: string, user: User) {
    this.name = name;
    this.users.push(user);
  }

  getUsers() {
    return this.users;
  }

  addUser(user: User) {
    this.users.push(user);
  }

  removeUser(user: User) {
    const index = this.users.indexOf(user);
    if (index > -1) {
      this.users.splice(index, 1);
    }
  }
}
