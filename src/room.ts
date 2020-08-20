import { User } from './user';

export class Room {
  private name: string;
  private admins: User[] = [];
  private users: User[] = [];
  private disconnectedAdmins: User[] = [];

  constructor(name: string, admin: User) {
    this.name = name;
    this.admins.push(admin);
    console.log(`New room "${name}" created by ${admin.getName()}`);
  }

  addAdmin(admin: User) {
    this.admins.push(admin);
  }

  removeAdmin(admin: User) {
    this.removeFromArray(admin, this.admins);
  }

  getAdmins() {
    return this.admins;
  }

  getUsers() {
    return this.users;
  }

  getName() {
    return this.name;
  }

  getAdminsAndUsers() {
    return [...this.admins, ...this.users];
  }

  addUser(user: User) {
    this.users.push(user);
  }

  removeUser(user: User) {
    this.removeFromArray(user, this.users);
  }

  removeAdminOrUser(user: User) {
    const isAdmin = this.admins.includes(user);
    if (isAdmin) {
      this.disconnectedAdmins.push(user);
      this.removeFromArray(user, this.admins);
      return;
    }
    this.removeFromArray(user, this.users);
  }

  private removeFromArray<T>(obj: T, array: T[]) {
    const index = array.indexOf(obj);
    if (index > -1) {
      array.splice(index, 1);
    }
  }
}
