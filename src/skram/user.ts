import Room from './room';
import Task from './task';
import SkramErrors from '../errors/skram-errors';
import Estimate from './estimate';

class User {
  private name: string;
  private currentRoom?: Room;
  private roomsAsAdmin: Set<Room> = new Set();

  constructor(name: string) {
    this.name = name;
  }

  /**
   * @throws {@link SkramErrors.UserAlreadyInARoom}
   */
  createRoom(name: string): Room {
    if (this.isInRoom()) throw new Error(SkramErrors.UserAlreadyInARoom);

    const room = new Room(name, this);
    this.currentRoom = room;
    this.roomsAsAdmin.add(room);
    return room;
  }

  /**
   * @throws {@link SkramErrors.UserAlreadyInARoom}
   * @throws {@link SkramErrors.RoomAlreadyHasAdmin}
   */
  joinRoom(room: Room, role: UserRole = UserRole.Estimator) {
    if (this.isInRoom()) throw new Error(SkramErrors.UserAlreadyInARoom);
    room.addUser(this, role);
    this.currentRoom = room;
  }

  /**
   * @throws {@link SkramErrors.UserNotInARoom}
   */
  leaveRoom() {
    if (!this.isInRoom()) throw new Error(SkramErrors.UserNotInARoom);
    this.currentRoom!.removeUser(this);
    this.currentRoom = undefined;
  }

  /**
   * @throws {@link SkramErrors.UserNotInARoom}
   * @throws {@link SkramErrors.UserNotAdmin}
   * @param id task ID
   */
  createTask(id: string): Task {
    if (!this.isInRoom()) throw new Error(SkramErrors.UserNotInARoom);
    if (!this.isAdminInCurrentRoom()) throw new Error(SkramErrors.UserNotAdmin);
    const task = new Task(id);
    this.currentRoom!.assignTask(task);
    return task;
  }

  /**
   * @throws {@link SkramErrors.UserNotInARoom}
   * @throws {@link SkramErrors.NoTaskInRoom}
   * @param estimate
   */
  estimate(estimate: number): Estimate {
    if (!this.isInRoom()) throw new Error(SkramErrors.UserNotInARoom);

    const task = this.currentRoom!.getTask();
    if (task === undefined) throw new Error(SkramErrors.NoTaskInRoom);

    try {
      return task.addEstimate(estimate, this);
    } catch (e) {
      throw e;
    }
  }

  /**
   * Returns the name of the user
   */
  getName(): string {
    return this.name;
  }

  /**
   * Returns the current room where the user is, undefined if he is not in any
   */
  getCurrentRoom(): Room | undefined {
    return this.currentRoom;
  }

  // /**
  //  * Returns an array of rooms where the user is an admin
  //  */
  // getRoomsAsAdmin(): ZRoom[] {
  //   return [...this.roomsAsAdmin.keys()];
  // }

  private isAdminInCurrentRoom(): boolean {
    if (!this.isInRoom()) return false;
    return this.roomsAsAdmin.has(this.currentRoom!);
  }

  private isInRoom(): boolean {
    return this.currentRoom !== undefined;
  }
}

enum UserRole {
  Admin,
  Estimator,
  Spectator
}

export default User;
export { UserRole };

// import webSocket from 'ws';
// import { Room } from './room';
// import { skramEmitter, SkramEvents } from './skram-emitter';

// export class User {
//   private name: string;
//   private left_room_reason: string;

//   constructor(name: string) {
//     this.name = name;
//     this.left_room_reason = '';
//     console.log(`New user created: ${this.name}`);
//   }

//   getName() {
//     return this.name;
//   }

//   // getRoom(rooms: Room[]): Room | undefined {
//   //   return rooms.find((r) => r.getUsers().find((u) => u.getWs() === this.ws));
//   // }

//   setLeftRoomReason(reason: string) {
//     this.left_room_reason = reason;
//   }

//   getLeftRoomReason(): string {
//     const reason = this.left_room_reason;
//     this.left_room_reason = '';
//     return reason;
//   }

//   send(message: any) {
//     skramEmitter.emit(SkramEvents.MessageToUser, this, message);
//   }
// }
