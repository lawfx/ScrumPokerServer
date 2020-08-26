import { User } from './user';
import { RoomiesJSON, RoomiesContentJSON } from './messages';
import { DESTROY_ROOM } from './event-types';
import PubSub from 'pubsub-js';

export class Room {
  private name: string;
  private admins: User[] = [];
  private users: User[] = [];
  private disconnectedAdmins: string[] = [];

  constructor(name: string, admin: User) {
    console.log(`New room "${name}" created by ${admin.getName()}`);
    this.name = name;
    this.addAdmin(admin);
  }

  addAdmin(admin: User) {
    this.admins.push(admin);
    console.log(`${admin.getName()} added as admin to ${this.getName()}`);
    this.broadcastRoomies();
  }

  removeAdmin(admin: User) {
    console.log(`Removing admin ${admin.getName()} from ${this.getName()}`);
    this.removeFromArray(admin, this.admins);
    this.broadcastRoomies();
    if (this.isEmpty()) {
      PubSub.publish(DESTROY_ROOM, this);
    }
  }

  addUser(user: User) {
    this.users.push(user);
    console.log(`${user.getName()} added as user to ${this.getName()}`);
    this.broadcastRoomies();
  }

  removeUser(user: User) {
    console.log(`Removing user ${user.getName()} from ${this.getName()}`);
    this.removeFromArray(user, this.users);
    this.broadcastRoomies();
    if (this.isEmpty()) {
      PubSub.publish(DESTROY_ROOM, this);
    }
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

  removeAdminOrUser(user: User) {
    const isAdmin = this.admins.includes(user);
    if (isAdmin) {
      this.disconnectedAdmins.push(user.getName());
      this.removeAdmin(user);
      return;
    }
    this.removeUser(user);
  }

  private isEmpty() {
    return this.admins.length === 0 && this.users.length === 0;
  }

  private broadcastRoomies() {
    console.log(`Broadcasting roomies of room ${this.getName()}`);
    [...this.admins, ...this.users].forEach((u) =>
      u.sendMessage(this.getRoomiesJSON())
    );
  }

  private getRoomiesJSON(): RoomiesJSON {
    const roomiesJson = {} as RoomiesJSON;
    const roomiesContentJson = {} as RoomiesContentJSON;
    roomiesJson.roomies = roomiesContentJson;
    roomiesContentJson.admins = [];
    roomiesContentJson.users = [];
    this.admins.forEach((a) => roomiesContentJson.admins.push(a.getName()));
    this.users.forEach((u) => roomiesContentJson.users.push(u.getName()));
    return roomiesJson;
  }

  private removeFromArray<T>(obj: T, array: T[]) {
    const index = array.indexOf(obj);
    if (index > -1) {
      array.splice(index, 1);
    }
  }
}
