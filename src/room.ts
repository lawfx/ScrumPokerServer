import { User } from './user';
import {
  RoomiesJSON,
  RoomiesContentJSON,
  EstimateRequestJSON
} from './messages';
import { DESTROY_ROOM } from './event-types';
import PubSub from 'pubsub-js';
import { EstimateRequest } from './estimate-request';
import { Estimate } from './estimate';

export class Room {
  private name: string;
  private admins: User[] = [];
  private users: User[] = [];
  private disconnectedAdmins: string[] = [];

  private destructionTimeoutID?: NodeJS.Timeout;
  private readonly DESTRUCTION_TIMEOUT: number = 60000;

  private task?: EstimateRequest;

  constructor(name: string, admin: User) {
    console.log(`[${name}] Created by ${admin.getName()}`);
    this.name = name;
    this.addAdmin(admin);
  }

  /** Adds a new user to the room. If he was an admin in this room before, he gets added as an admin, otherwise as a regular user. */
  add(user: User) {
    if (this.isDisconnectedAdmin(user)) {
      this.addAdmin(user);
      return;
    }
    this.addUser(user);
  }

  /** Removes an admin or a user from the room. */
  remove(user: User) {
    const isAdmin = this.admins.includes(user);
    if (isAdmin) {
      this.removeAdmin(user);
      return;
    }
    this.removeUser(user);
  }

  createEstimateRequest(user: User, taskName: string) {
    if (this.task !== undefined) {
      console.error(
        `[${this.name}] There is an estimate request already in progress`
      );
      return;
    } else if (taskName === undefined || taskName === '') {
      console.error(`[${this.name}] Task name can't be empty`);
      return;
    } else if (!this.isAdmin(user)) {
      console.error(
        `[${
          this.name
        }] ${user.getName()} tried to send an estimate request but he isn't an admin. How did this happen?`
      );
      return;
    }
    this.task = new EstimateRequest(taskName);
    console.log(`[${this.name}] Estimate request for ${taskName}`);
    this.broadcastEstimateRequest();
  }

  addEstimate(user: User, estimate: number) {}

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

  private addAdmin(admin: User) {
    this.removeFromArray(admin.getName(), this.disconnectedAdmins);
    if (this.destructionTimeoutID !== undefined) {
      clearTimeout(this.destructionTimeoutID);
      this.destructionTimeoutID = undefined;
      console.log(`[${this.name}] Destruction aborted`);
    }
    this.admins.push(admin);
    console.log(`[${this.name}] ${admin.getName()} added as admin`);
    this.broadcastRoomies();
  }

  private removeAdmin(admin: User) {
    console.log(`[${this.name}] Removing admin ${admin.getName()}`);
    this.disconnectedAdmins.push(admin.getName());
    this.removeFromArray(admin, this.admins);
    this.broadcastRoomies();
    if (this.isEmpty()) {
      PubSub.publish(DESTROY_ROOM, this);
    } else if (this.admins.length === 0) {
      console.log(
        `[${this.name}] To be destroyed in ${this.DESTRUCTION_TIMEOUT / 1000}s`
      );
      this.destructionTimeoutID = setTimeout(
        () => PubSub.publish(DESTROY_ROOM, this),
        this.DESTRUCTION_TIMEOUT
      );
    }
  }

  private addUser(user: User) {
    this.users.push(user);
    console.log(`[${this.name}] ${user.getName()} added as user`);
    this.broadcastRoomies();
  }

  private removeUser(user: User) {
    console.log(`[${this.name}] Removing user ${user.getName()}`);
    this.removeFromArray(user, this.users);
    this.broadcastRoomies();
    if (this.isEmpty()) {
      PubSub.publish(DESTROY_ROOM, this);
    }
  }

  private isDisconnectedAdmin(user: User): boolean {
    return this.disconnectedAdmins.includes(user.getName());
  }

  private isAdmin(user: User): boolean {
    return this.admins.includes(user);
  }

  private isEmpty() {
    return this.admins.length === 0 && this.users.length === 0;
  }

  private broadcastRoomies() {
    console.log(`[${this.name}] Broadcasting roomies`);
    [...this.admins, ...this.users].forEach((u) =>
      u.sendMessage(this.getRoomiesJSON())
    );
  }

  private broadcastEstimateRequest() {
    console.log(`[${this.name}] Broadcasting estimate request`);
    [...this.admins, ...this.users].forEach((u) =>
      u.sendMessage(this.getEstimateRequestJSON())
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

  private getEstimateRequestJSON(): EstimateRequestJSON {
    const estimateReq = {} as EstimateRequestJSON;
    estimateReq.estimate_request = this.task!.getName();
    return estimateReq;
  }

  private removeFromArray<T>(obj: T, array: T[]) {
    const index = array.indexOf(obj);
    if (index > -1) {
      array.splice(index, 1);
    }
  }
}
