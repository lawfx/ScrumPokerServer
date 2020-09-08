import { User } from './user';
import {
  RoomStatusJSON,
  RoomStatusContentJSON,
  RoomStatusUsersJSON,
  RoomStatusTaskJSON,
  RoomStatusTaskEstimateJSON
} from './models-json';
import { DESTROY_ROOM } from './event-types';
import PubSub from 'pubsub-js';
import { EstimateRequest } from './estimate-request';

export class Room {
  private name: string;
  private admins: User[] = [];
  private estimators: User[] = [];
  private disconnectedAdmins: string[] = [];

  private destructionTimeoutID?: NodeJS.Timeout;
  private readonly DESTRUCTION_TIMEOUT: number = 60000;

  private estimateRequest?: EstimateRequest;

  constructor(name: string, admin: User) {
    console.log(`[${name}] Created by ${admin.getName()}`);
    this.name = name;
    this.addAdmin(admin);
  }

  /** Adds a new user to the room. If he was an admin in this room before, he gets added as an admin, otherwise as an estimator. */
  addUser(user: User) {
    if (this.isDisconnectedAdmin(user)) {
      this.addAdmin(user);
      return;
    }
    this.addEstimator(user);
  }

  /** Removes an admin or an estimator from the room. */
  removeUser(user: User) {
    const isAdmin = this.admins.includes(user);
    if (isAdmin) {
      this.removeAdmin(user);
    } else {
      this.removeEstimator(user);
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
    if (estimateRequestId === undefined || estimateRequestId === '') {
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
    this.broadcastRoomStatus();
  }

  addEstimate(user: User, estimate: number) {
    if (this.estimateRequest === undefined) {
      console.error(`[${this.name}] There is no estimate request in progress`);
      return;
    }
    if (this.estimateRequest.addEstimate(user, estimate)) {
      this.broadcastRoomStatus();
      if (
        this.estimateRequest.hasEveryoneEstimated([
          ...this.admins,
          ...this.estimators
        ])
      ) {
        this.estimateRequest = undefined;
      }
    }
  }

  getAdmins() {
    return this.admins;
  }

  getEstimators() {
    return this.estimators;
  }

  getName() {
    return this.name;
  }

  getUsers() {
    return [...this.admins, ...this.estimators];
  }

  isAdmin(user: User): boolean {
    return this.admins.includes(user);
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
    this.broadcastRoomStatus();
  }

  private removeAdmin(admin: User) {
    console.log(`[${this.name}] Removing admin ${admin.getName()}`);
    this.disconnectedAdmins.push(admin.getName());
    this.removeFromArray(admin, this.admins);
    this.broadcastRoomStatus();
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

  private addEstimator(estimator: User) {
    this.estimators.push(estimator);
    console.log(`[${this.name}] ${estimator.getName()} added as estimator`);
    this.broadcastRoomStatus();
  }

  private removeEstimator(estimator: User) {
    console.log(`[${this.name}] Removing estimator ${estimator.getName()}`);
    this.removeFromArray(estimator, this.estimators);
    this.broadcastRoomStatus();
  }

  private isDisconnectedAdmin(user: User): boolean {
    return this.disconnectedAdmins.includes(user.getName());
  }

  private isEmpty() {
    return this.admins.length === 0 && this.estimators.length === 0;
  }

  private broadcastRoomStatus() {
    console.log(`[${this.name}] Broadcasting room status`);
    const roomStatus = this.getRoomStatusJSON();
    const roomStatusNoEstimates = this.getRoomStatusJSON(false);
    this.admins.forEach((u) => u.sendMessage(roomStatus));
    this.estimators.forEach((u) =>
      u.sendMessage(
        this.estimateRequest?.hasEstimated(u)
          ? roomStatus
          : roomStatusNoEstimates
      )
    );
  }

  private getRoomStatusJSON(includeEstimates: boolean = true): RoomStatusJSON {
    const roomStatusJson = {} as RoomStatusJSON;
    const roomStatusContentJson = {} as RoomStatusContentJSON;
    const roomStatusUsersJson = {} as RoomStatusUsersJSON;
    const roomStatusTaskJson = {} as RoomStatusTaskJSON;
    roomStatusJson.room_status = roomStatusContentJson;
    roomStatusContentJson.users = roomStatusUsersJson;
    roomStatusContentJson.task = roomStatusTaskJson;

    roomStatusUsersJson.admins = [];
    roomStatusUsersJson.estimators = [];
    this.admins.forEach((a) => roomStatusUsersJson.admins.push(a.getName()));
    this.estimators.forEach((u) =>
      roomStatusUsersJson.estimators.push(u.getName())
    );

    roomStatusTaskJson.id = this.estimateRequest?.getId() ?? '';
    roomStatusTaskJson.estimates = [];

    if (includeEstimates) {
      this.estimateRequest?.getEstimates().forEach((e) => {
        const roomStatusTaskEstimateJson = {} as RoomStatusTaskEstimateJSON;
        roomStatusTaskEstimateJson.name = e.getUser().getName();
        roomStatusTaskEstimateJson.estimate = e.getEstimate();
        roomStatusTaskJson.estimates.push(roomStatusTaskEstimateJson);
      });
    }

    return roomStatusJson;
  }

  private removeFromArray<T>(obj: T, array: T[]) {
    const index = array.indexOf(obj);
    if (index > -1) {
      array.splice(index, 1);
    }
  }
}
