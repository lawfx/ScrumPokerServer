import { Room } from './room';
import { Task } from './task';

export class User {
  private name: string;
  private currentRoom?: Room;
  private roomsAsAdmin: Set<Room> = new Set();

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Returns undefined if the user is already in a room, the room if it's created successfully
   */
  createRoom(name: string): Room | undefined {
    if (this.isAlreadyInRoom()) return undefined;

    const room = new Room(name, this);
    this.currentRoom = room;
    this.roomsAsAdmin.add(room);
    return room;
  }

  /**
   * Returns false if the user is already in a room, true if he joins successfully
   */
  joinRoom(room: Room, role: UserRole = UserRole.Estimator): boolean {
    if (this.isAlreadyInRoom()) return false;
    if (!room.addUser(this, role)) return false;
    this.currentRoom = room;
    return true;
  }

  /**
   * Returns false if the user is not in a room, true if he leaves successfully
   */
  leaveRoom(): boolean {
    if (!this.isAlreadyInRoom()) return false;
    if (!this.currentRoom?.removeUser(this)) return false;
    this.currentRoom = undefined;
    return true;
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

  private isAlreadyInRoom(): boolean {
    return this.currentRoom !== undefined;
  }
}

export enum UserRole {
  Admin,
  Estimator,
  Spectator
}

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
