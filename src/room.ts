import { User } from './user';
import {
  RoomStatusJSON,
  RoomStatusContentJSON,
  RoomStatusUsersJSON,
  RoomStatusTaskJSON,
  RoomStatusTaskEstimateJSON,
  RoomDestructionMessage
} from './models';
import { DESTROY_ROOM } from './event-types';
import PubSub from 'pubsub-js';
import { Task } from './task';

export class Room {
  private name: string;
  private admins: User[] = [];
  private estimators: User[] = [];
  private disconnectedAdmins: string[] = [];

  private destructionTimeoutID?: NodeJS.Timeout;
  private readonly DESTRUCTION_TIMEOUT: number = 60000;

  private task?: Task;

  constructor(name: string, admin: User) {
    console.log(`[Room: ${name}] Created by ${admin.getName()}`);
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
          `[Room: ${this.name}] Destruction aborted because room will be destroyed immediately`
        );
      }
      const roomDestructionMessage = {} as RoomDestructionMessage;
      roomDestructionMessage.room = this;
      roomDestructionMessage.reason = '';
      PubSub.publish(DESTROY_ROOM, roomDestructionMessage);
    }
  }

  createTask(user: User, taskId: string) {
    if (taskId === undefined || taskId === '') {
      console.error(`[Room: ${this.name}] Task name can't be empty`);
      return;
    } else if (!this.isAdmin(user)) {
      console.error(
        `[Room: ${
          this.name
        }] ${user.getName()} tried to send a task estimate request but he isn't an admin.`
      );
      return;
    }
    this.task = new Task(taskId);
    console.log(`[Room: ${this.name}] Task ${taskId} created`);
    this.broadcastRoomStatus();
  }

  addEstimate(user: User, estimate: number) {
    if (this.task === undefined) {
      console.error(`[Room: ${this.name}] There is no task in progress`);
      return;
    }
    if (this.task.addEstimate(user, estimate)) {
      this.broadcastRoomStatus();
      if (
        this.task.hasEveryoneEstimated([...this.admins, ...this.estimators])
      ) {
        this.task = undefined;
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
      console.log(`[Room: ${this.name}] Destruction aborted`);
    }
    this.admins.push(admin);
    console.log(`[Room: ${this.name}] ${admin.getName()} added as admin`);
    this.broadcastRoomStatus();
  }

  private removeAdmin(admin: User) {
    console.log(`[Room: ${this.name}] Removing admin ${admin.getName()}`);
    this.disconnectedAdmins.push(admin.getName());
    this.removeFromArray(admin, this.admins);
    this.broadcastRoomStatus();
    if (this.admins.length === 0) {
      console.log(
        `[Room: ${this.name}] To be destroyed in ${
          this.DESTRUCTION_TIMEOUT / 1000
        }s`
      );
      this.destructionTimeoutID = setTimeout(() => {
        const roomDestructionMessage = {} as RoomDestructionMessage;
        roomDestructionMessage.room = this;
        roomDestructionMessage.reason = 'No admin in room for a minute';
        PubSub.publish(DESTROY_ROOM, roomDestructionMessage);
      }, this.DESTRUCTION_TIMEOUT);
    }
  }

  private addEstimator(estimator: User) {
    this.estimators.push(estimator);
    console.log(
      `[Room: ${this.name}] ${estimator.getName()} added as estimator`
    );
    this.broadcastRoomStatus();
  }

  private removeEstimator(estimator: User) {
    console.log(
      `[Room: ${this.name}] Removing estimator ${estimator.getName()}`
    );
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
    console.log(`[Room: ${this.name}] Broadcasting room status`);
    const roomStatus = this.getRoomStatusJSON();
    const roomStatusNoEstimates = this.getRoomStatusJSON(false);
    this.admins.forEach((u) => u.sendMessage(roomStatus));
    this.estimators.forEach((u) =>
      u.sendMessage(
        this.task?.hasEstimated(u) ? roomStatus : roomStatusNoEstimates
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

    roomStatusTaskJson.id = this.task?.getId() ?? '';
    roomStatusTaskJson.estimates = [];

    if (includeEstimates) {
      this.task?.getEstimates().forEach((e) => {
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
