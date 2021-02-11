import { expect } from 'chai';
import Estimate from '../skram/estimate';
import Room from '../skram/room';
import User, { UserRole } from '../skram/user';
import SkramErr from '../errors/skram-errors';

describe('User', () => {
  describe('is created', () => {
    it('should have correct name', () => {
      const user0 = new User('user0');
      expect(user0.getName()).to.equal('user0');
    });
  });

  describe('createRoom', () => {
    it('should be Room, have correct name, contain one admin and is set as current room in the user', () => {
      const user0 = new User('user0');
      const room0 = user0.createRoom('room0');
      expect(room0).to.be.instanceOf(Room);
      expect(room0.getName()).to.equal('room0');
      countUsersInRoom(room0!, 1, 1, 0, 0);
      expect(user0.getCurrentRoom()).to.equal(room0);
    });

    it('should throw Error if the user is already in a room', () => {
      const user0 = new User('user0');
      const room0 = user0.createRoom('room0');
      expect(() => user0.createRoom('room1')).to.throw(SkramErr.UserAlreadyInARoom);
      countUsersInRoom(room0, 1, 1, 0, 0);
      expect(user0.getCurrentRoom()).to.equal(room0);
    });
  });

  describe('joinRoom', () => {
    it('update number of users in the room and current room is set correctly for the user', () => {
      const user0 = new User('user0');
      const user1 = new User('user1');
      const room0 = user0.createRoom('room0')!;
      user1.joinRoom(room0);
      countUsersInRoom(room0, 2, 1, 1, 0);
      expect(user1.getCurrentRoom()).to.be.equal(room0);
      const user2 = new User('user2');
      user2.joinRoom(room0, UserRole.Estimator);
      countUsersInRoom(room0, 3, 1, 2, 0);
      const user3 = new User('user3');
      user3.joinRoom(room0, UserRole.Spectator);
      countUsersInRoom(room0, 4, 1, 2, 1);
    });

    it('should throw RoomAlreadyHasAdmin if an other admin tries to join, and the original admin should remain in the room', () => {
      const user0 = new User('user0');
      const room0 = user0.createRoom('room0')!;
      const user1 = new User('user1');
      expect(() => user1.joinRoom(room0, UserRole.Admin)).to.throw(SkramErr.RoomAlreadyHasAdmin);
      countUsersInRoom(room0!, 1, 1, 0, 0);
      expect(room0!.getAdmins()[0]).to.be.equal(user0);
    });

    it('should throw UserAlreadyInARoom if the user is already in a room', () => {
      const user0 = new User('user0');
      const room0 = user0.createRoom('room0')!;
      expect(() => user0.joinRoom(room0)).to.throw(SkramErr.UserAlreadyInARoom);
      countUsersInRoom(room0, 1, 1, 0, 0);
      expect(user0.getCurrentRoom()).to.be.equal(room0);
    });
  });

  describe('leaveRoom', () => {
    it('should update number of users in the room and unset current room from the user', () => {
      const user0 = new User('user0');
      const room0 = user0.createRoom('room0')!;
      user0.leaveRoom();
      countUsersInRoom(room0, 0, 0, 0, 0);
      expect(user0.getCurrentRoom()).to.be.equal(undefined);
    });

    it('should throw UserNotInARoom on leaving room if the user is not in any', () => {
      const user0 = new User('user0');
      expect(() => user0.leaveRoom()).to.throw(SkramErr.UserNotInARoom);
    });
  });

  describe('createTask', () => {
    it('should create a task, task has correct id, task is assigned to the room', () => {
      const user0 = new User('user0');
      const room0 = user0.createRoom('room0');
      const task0 = user0.createTask('task0');
      expect(task0.getId()).to.be.equal('task0');
      expect(room0.getTask()).to.be.equal(task0);
    });

    it('should throw UserNotInARoom if the user tries to create a Task without being in a room', () => {
      const user0 = new User('user0');
      expect(() => user0.createTask('task0')).to.throw(SkramErr.UserNotInARoom);
    });

    it('should throw UserNotAdmin if an other user other than the admin tries to create a Task', () => {
      const user0 = new User('user0');
      const user1 = new User('user1');
      const room0 = user0.createRoom('room0');
      user1.joinRoom(room0);
      expect(() => user1.createTask('task0')).to.throw(SkramErr.UserNotAdmin);
    });
  });

  describe('estimate', () => {
    it('should estimate a task, return the estimate and validate Estimate variables', () => {
      const user0 = new User('user0');
      user0.createRoom('room0');
      user0.createTask('task0');
      const est0 = user0.estimate(1);
      expect(est0).to.be.instanceOf(Estimate);
      expect(est0.getUser()).to.be.equal(user0);
      expect(est0.getEstimate()).to.be.equal(1);
    });

    it('should throw UserNotInARoom if he tries to estimate without being in a room', () => {
      const user0 = new User('user0');
      expect(() => user0.estimate(1)).to.throw(SkramErr.UserNotInARoom);
    });

    it('should throw NoTaskInRoom if he tries to estimate without an active task', () => {
      const user0 = new User('user0');
      user0.createRoom('room0');
      expect(() => user0.estimate(1)).to.throw(SkramErr.NoTaskInRoom);
    });

    it('should throw UserHasAlreadyEstimated if he tries to estimate more than once', () => {
      const user0 = new User('user0');
      user0.createRoom('room0');
      user0.createTask('task0');
      user0.estimate(1);
      expect(() => user0.estimate(1)).to.throw(SkramErr.UserAlreadyEstimated);
    });
  });

  function countUsersInRoom(room: Room, all: number, admins: number, estimators: number, spectators: number) {
    expect(room.getAllUsers().length).to.be.equal(all);
    expect(room.getAdmins().length).to.be.equal(admins);
    expect(room.getEstimators().length).to.be.equal(estimators);
    expect(room.getSpectators().length).to.be.equal(spectators);
  }
});
