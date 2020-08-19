import { User } from './user';

export class Room {
  private name: string;
  private admin: User;
  private users: User[] = [];

  constructor(name: string, admin: User) {
    this.name = name;
    this.admin = admin;
  }

  getAdminAndUsers() {
    return [this.admin, ...this.users];
  }

  addUser(user: User) {
    this.users.push(user);
  }

  kickUser(user: User) {
    const index = this.users.indexOf(user);
    if (index > -1) {
      this.users.splice(index, 1);
    }
  }
}
