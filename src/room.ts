import { User } from './user';
import {
  RoomiesJSON,
  RoomiesContentJSON,
  TaskEstimationContentJSON,
  TaskEstimationJSON,
  TaskEstimationContentEstimatesJSON
} from './messages';
import { DESTROY_ROOM } from './event-types';
import PubSub from 'pubsub-js';
import { EstimateRequest } from './estimate-request';

export class Room {
  private name: string;
  private admins: User[] = [];
  private users: User[] = [];
  private disconnectedAdmins: string[] = [];

  private destructionTimeoutID?: NodeJS.Timeout;
  private readonly DESTRUCTION_TIMEOUT: number = 60000;

  private estimateRequest?: EstimateRequest;

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
    } else {
      this.removeUser(user);
    }
    if (this.isEmpty()) {
      if (this.destructionTimeoutID !== undefined) {
        clearTimeout(this.destructionTimeoutID);
        this.destructionTimeoutID = undefined;
        console.log(
          `[${this.name}] Destruction aborted because room will be destroyed immediately`
        );
      }
      PubSub.publish(DESTROY_ROOM, this);
    }
  }

  createEstimateRequest(user: User, estimateRequestId: string) {
    if (this.estimateRequest !== undefined) {
      console.error(
        `[${this.name}] There is an estimate request already in progress`
      );
      return;
    } else if (estimateRequestId === undefined || estimateRequestId === '') {
      console.error(`[${this.name}] Task name can't be empty`);
      return;
    } else if (!this.isAdmin(user)) {
      console.error(
        `[${
          this.name
        }] ${user.getName()} tried to send an estimate request but he isn't an admin.`
      );
      return;
    }
    this.estimateRequest = new EstimateRequest(estimateRequestId);
    console.log(`[${this.name}] Estimate request for ${estimateRequestId}`);
    this.broadcastRoomies();
  }

  addEstimate(user: User, estimate: number) {
    if (this.estimateRequest === undefined) {
      console.error(`[${this.name}] There is no estimate request in progress`);
      return;
    }
    if (this.estimateRequest.addEstimate(user, estimate)) {
      this.broadcastEstimates();
      if (
        this.estimateRequest.hasEveryoneEstimated([
          ...this.admins,
          ...this.users
        ])
      ) {
        this.estimateRequest = undefined;
      }
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
    if (this.admins.length === 0) {
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
    const res = this.getRoomiesJSON();
    [...this.admins, ...this.users].forEach((u) => u.sendMessage(res));
  }

  private broadcastEstimates() {
    console.log(`[${this.name}] Broadcasting estimates`);
    const res = this.getEstimatesJSON();
    this.admins.forEach((u) => u.sendMessage(res));
    this.users
      .filter((u) => this.estimateRequest?.hasEstimated(u))
      .forEach((u) => u.sendMessage(res));
  }

  private getRoomiesJSON(): RoomiesJSON {
    const roomiesJson = {} as RoomiesJSON;
    const roomiesContentJson = {} as RoomiesContentJSON;
    roomiesJson.roomies = roomiesContentJson;
    roomiesContentJson.admins = [];
    roomiesContentJson.users = [];
    roomiesContentJson.estimate_request = this.estimateRequest?.getId() ?? '';
    this.admins.forEach((a) => roomiesContentJson.admins.push(a.getName()));
    this.users.forEach((u) => roomiesContentJson.users.push(u.getName()));
    return roomiesJson;
  }

  private getEstimatesJSON(): TaskEstimationJSON {
    const taskEstimationJson = {} as TaskEstimationJSON;
    const taskEstimationContentJson = {} as TaskEstimationContentJSON;
    taskEstimationJson.task_estimation = taskEstimationContentJson;
    taskEstimationContentJson.task = this.estimateRequest!.getId();
    taskEstimationContentJson.estimates = [];
    this.estimateRequest?.getEstimates().forEach((e) => {
      const taskEstimationContentEstimatesJSON = {} as TaskEstimationContentEstimatesJSON;
      taskEstimationContentEstimatesJSON.name = e.getUser().getName();
      taskEstimationContentEstimatesJSON.estimate = e.getEstimate();
      taskEstimationContentJson.estimates.push(
        taskEstimationContentEstimatesJSON
      );
    });
    return taskEstimationJson;
  }

  private removeFromArray<T>(obj: T, array: T[]) {
    const index = array.indexOf(obj);
    if (index > -1) {
      array.splice(index, 1);
    }
  }
}
