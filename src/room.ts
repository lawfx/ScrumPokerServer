import { RoomErr, UserErr } from './return';
import { Task } from './task';
import { User, UserRole } from './user';

export class Room {
  private name: string;
  private users: Map<User, UserRole> = new Map();
  private task?: Task;
  constructor(name: string, user: User) {
    this.name = name;
    this.addAdmin(user);
    this.task = undefined;
  }

  /**
   * @throws {@link UserErr.UnknownUserRole}
   * @param user
   * @param role
   */
  addUser(user: User, role: UserRole = UserRole.Estimator) {
    switch (role) {
      case UserRole.Admin:
        this.addAdmin(user);
        break;
      case UserRole.Estimator:
        this.addEstimator(user);
        break;
      case UserRole.Spectator:
        this.addSpectator(user);
        break;
      default:
        throw new Error(UserErr.UnknownUserRole);
    }
  }

  removeUser(user: User) {
    if (!this.users.delete(user)) {
      throw new Error(RoomErr.UserNotFoundInRoom);
    }
  }

  assignTask(task: Task): boolean {
    this.task = task;
    return true;
  }

  getAllUsers(): User[] {
    return [...this.users.keys()];
  }

  getAdmins(): User[] {
    return this.getUsersOfType(UserRole.Admin);
  }

  getEstimators(): User[] {
    return this.getUsersOfType(UserRole.Estimator);
  }

  getSpectators(): User[] {
    return this.getUsersOfType(UserRole.Spectator);
  }

  getName(): string {
    return this.name;
  }

  getTask(): Task | undefined {
    return this.task;
  }

  /**
   * @throws {@link Err.AdminAlreadySet}
   * @param user
   */
  private addAdmin(user: User) {
    if (this.getUsersOfType(UserRole.Admin).length !== 0) {
      throw new Error(RoomErr.AlreadyHasAdmin);
    }
    this.users.set(user, UserRole.Admin);
  }

  private addEstimator(user: User) {
    this.users.set(user, UserRole.Estimator);
  }

  private addSpectator(user: User) {
    this.users.set(user, UserRole.Spectator);
  }

  private getUsersOfType(role: UserRole): User[] {
    const users: User[] = [];
    this.users.forEach((r, u) => {
      if (r === role) {
        users.push(u);
      }
    });
    return users;
  }
}

// import { User } from './user';
// import {
//   RoomStatusJSON,
//   RoomStatusContentJSON,
//   RoomStatusUsersJSON,
//   RoomStatusTaskJSON,
//   RoomStatusTaskEstimateJSON,
//   RoomDestructionMessage
// } from './models';
// import { Task } from './task';
// import { UserRole } from './enums';
// import { EventEmitter } from 'events';
// import { DESTROY_ROOM } from './event-types';

// export class Room {
//   private name: string;
//   private admins: User[] = [];
//   private estimators: User[] = [];
//   private spectators: User[] = [];
//   private disconnectedAdmins: string[] = [];
//   private roomEmitter: EventEmitter;

//   private destructionTimeoutID?: NodeJS.Timeout;
//   private readonly DESTRUCTION_TIMEOUT: number = 60000;

//   private task?: Task;

//   private _isBeingDestroyed = false;

//   constructor(name: string, admin: User) {
//     console.log(`[Room: ${name}] Created by ${admin.getName()}`);
//     this.name = name;
//     this.addAdmin(admin);
//     this.roomEmitter = new EventEmitter();
//   }

//   /** Adds a new user to the room. If he was an admin in this room before, he gets added as an admin, otherwise as an estimator or spectator. */
//   addUser(user: User, role = UserRole.Estimator) {
//     if (this.isDisconnectedAdmin(user)) {
//       this.addAdmin(user);
//       return;
//     }
//     if (role === UserRole.Estimator) {
//       this.addEstimator(user);
//     } else {
//       this.addSpectator(user);
//     }
//   }

//   /** Removes an admin or an estimator from the room. */
//   removeUser(user: User) {
//     const isAdmin = this.admins.includes(user);
//     if (isAdmin) {
//       this.removeAdmin(user);
//     } else {
//       const isEstimator = this.estimators.includes(user);
//       if (isEstimator) {
//         this.removeEstimator(user);
//       } else {
//         this.removeSpectator(user);
//       }
//     }
//     if (this.isEmpty()) {
//       if (this.destructionTimeoutID !== undefined) {
//         clearTimeout(this.destructionTimeoutID);
//         this.destructionTimeoutID = undefined;
//         console.log(`[Room: ${this.name}] Destruction aborted because room will be destroyed immediately`);
//       }
//       const roomDestructionMessage = {} as RoomDestructionMessage;
//       roomDestructionMessage.room = this;
//       roomDestructionMessage.reason = '';
//       this.roomEmitter.emit(DESTROY_ROOM, roomDestructionMessage);
//     }
//   }

//   createTask(user: User, taskId: string): Task | undefined {
//     if (taskId === undefined || taskId.length === 0) {
//       console.error(`[Room: ${this.name}] Task name can't be empty`);
//       return;
//     } else if (taskId.length > 20) {
//       console.error(`[Room: ${this.name}] Task name can't exceed 20 characters`);
//       return;
//     } else if (!this.isAdmin(user)) {
//       console.error(`[Room: ${this.name}] ${user.getName()} tried to send a task estimate request but he isn't an admin.`);
//       return;
//     }
//     this.task = new Task(taskId);
//     console.log(`[Room: ${this.name}] Task ${taskId} created`);
//     this.broadcastRoomStatus();
//     return this.task;
//   }

//   getAdmins() {
//     return this.admins;
//   }

//   getEstimators() {
//     return this.estimators;
//   }

//   getSpectators() {
//     return this.spectators;
//   }

//   getName() {
//     return this.name;
//   }

//   getUsers() {
//     return [...this.admins, ...this.estimators, ...this.spectators];
//   }

//   isAdmin(user: User): boolean {
//     return this.admins.includes(user);
//   }

//   isEstimator(user: User): boolean {
//     return this.estimators.includes(user);
//   }

//   isSpectator(user: User): boolean {
//     return this.spectators.includes(user);
//   }

//   getCurrentTask(): Task | undefined {
//     return this.task;
//   }

//   getEmitter(): EventEmitter {
//     return this.roomEmitter;
//   }

//   isBeingDestroyed(): boolean {
//     return this._isBeingDestroyed;
//   }

//   setToDestroy() {
//     this._isBeingDestroyed = true;
//   }

//   broadcastRoomStatus() {
//     console.log(`[Room: ${this.name}] Broadcasting room status`);
//     const roomStatus = this.getRoomStatusJSON();
//     const roomStatusNoEstimates = this.getRoomStatusJSON(false);
//     [...this.admins, ...this.spectators].forEach((u) => u.sendMessage(roomStatus));
//     this.estimators.forEach((u) => u.sendMessage(this.task?.hasEstimated(u) ? roomStatus : roomStatusNoEstimates));
//   }

//   private addAdmin(admin: User) {
//     this.removeFromArray(admin.getName(), this.disconnectedAdmins);
//     if (this.destructionTimeoutID !== undefined) {
//       clearTimeout(this.destructionTimeoutID);
//       this.destructionTimeoutID = undefined;
//       console.log(`[Room: ${this.name}] Destruction aborted`);
//     }
//     this.admins.push(admin);
//     console.log(`[Room: ${this.name}] ${admin.getName()} added as admin`);
//     this.broadcastRoomStatus();
//   }

//   private removeAdmin(admin: User) {
//     console.log(`[Room: ${this.name}] Removing admin ${admin.getName()}`);
//     this.disconnectedAdmins.push(admin.getName());
//     this.removeFromArray(admin, this.admins);
//     this.broadcastRoomStatus();
//     if (this.admins.length === 0) {
//       console.log(`[Room: ${this.name}] To be destroyed in ${this.DESTRUCTION_TIMEOUT / 1000}s`);
//       this.destructionTimeoutID = setTimeout(() => {
//         const roomDestructionMessage = {} as RoomDestructionMessage;
//         roomDestructionMessage.room = this;
//         roomDestructionMessage.reason = 'No admin in room for a minute';
//         this.roomEmitter.emit(DESTROY_ROOM, roomDestructionMessage);
//       }, this.DESTRUCTION_TIMEOUT);
//     }
//   }

//   private addEstimator(estimator: User) {
//     this.estimators.push(estimator);
//     console.log(`[Room: ${this.name}] ${estimator.getName()} added as estimator`);
//     this.broadcastRoomStatus();
//   }

//   private removeEstimator(estimator: User) {
//     console.log(`[Room: ${this.name}] Removing estimator ${estimator.getName()}`);
//     this.removeFromArray(estimator, this.estimators);
//     this.broadcastRoomStatus();
//   }

//   private addSpectator(spectator: User) {
//     this.spectators.push(spectator);
//     console.log(`[Room: ${this.name}] ${spectator.getName()} added as spectator`);
//     this.broadcastRoomStatus();
//   }

//   private removeSpectator(spectator: User) {
//     console.log(`[Room: ${this.name}] Removing spectator ${spectator.getName()}`);
//     this.removeFromArray(spectator, this.spectators);
//     this.broadcastRoomStatus();
//   }

//   private isDisconnectedAdmin(user: User): boolean {
//     return this.disconnectedAdmins.includes(user.getName());
//   }

//   private isEmpty() {
//     return this.admins.length === 0 && this.estimators.length === 0;
//   }

//   private getRoomStatusJSON(includeEstimates: boolean = true): RoomStatusJSON {
//     const roomStatusJson = {} as RoomStatusJSON;
//     const roomStatusContentJson = {} as RoomStatusContentJSON;
//     const roomStatusUsersJson = {} as RoomStatusUsersJSON;
//     const roomStatusTaskJson = {} as RoomStatusTaskJSON;
//     roomStatusJson.room_status = roomStatusContentJson;
//     roomStatusContentJson.users = roomStatusUsersJson;
//     roomStatusContentJson.task = roomStatusTaskJson;

//     roomStatusUsersJson.admins = [];
//     roomStatusUsersJson.estimators = [];
//     roomStatusUsersJson.spectators = [];
//     this.admins.forEach((a) => roomStatusUsersJson.admins.push(a.getName()));
//     this.estimators.forEach((u) => roomStatusUsersJson.estimators.push(u.getName()));
//     this.spectators.forEach((u) => roomStatusUsersJson.spectators.push(u.getName()));

//     roomStatusTaskJson.id = this.task?.getId() ?? '';
//     roomStatusTaskJson.estimates = [];

//     if (includeEstimates) {
//       this.task?.getEstimates().forEach((e) => {
//         const roomStatusTaskEstimateJson = {} as RoomStatusTaskEstimateJSON;
//         roomStatusTaskEstimateJson.name = e.getUser().getName();
//         roomStatusTaskEstimateJson.estimate = e.getEstimate();
//         roomStatusTaskJson.estimates.push(roomStatusTaskEstimateJson);
//       });
//     }

//     return roomStatusJson;
//   }

//   private removeFromArray<T>(obj: T, array: T[]) {
//     const index = array.indexOf(obj);
//     if (index > -1) {
//       array.splice(index, 1);
//     }
//   }
// }
