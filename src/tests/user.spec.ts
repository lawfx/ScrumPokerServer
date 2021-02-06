import { expect } from 'chai';
import { Room } from '../room';
import { User, UserRole } from '../user';

describe('User', () => {
  describe('is created', () => {
    it('should have correct name', () => {
      const user0 = new User('user0');
      expect(user0.getName()).to.equal('user0');
    });
  });

  describe('createRoom', () => {
    it('should not be undefined, have correct name, contain one admin and is set as current room in the user', () => {
      const user0 = new User('user0');
      const room0 = user0.createRoom('room0');
      expect(room0).to.not.equal(undefined);
      expect(room0?.getName()).to.equal('room0');
      countUsersInRoom(room0!, 1, 1, 0, 0);
      expect(user0.getCurrentRoom()).to.equal(room0);
    });

    it('should return undefined if the user is already in a room', () => {
      const user0 = new User('user0');
      const room0 = user0.createRoom('room0')!;
      expect(user0.createRoom('room1')).to.equal(undefined);
      countUsersInRoom(room0, 1, 1, 0, 0);
      expect(user0.getCurrentRoom()).to.equal(room0);
    });
  });

  describe('joinRoom', () => {
    it('should return true, update number of users in the room and current room is set correctly for the user', () => {
      const user0 = new User('user0');
      const user1 = new User('user1');
      const room0 = user0.createRoom('room0')!;
      expect(user1.joinRoom(room0)).to.be.true;
      countUsersInRoom(room0, 2, 1, 1, 0);
      expect(user1.getCurrentRoom()).to.be.equal(room0);

      const user2 = new User('user2');
      user2.joinRoom(room0, UserRole.Estimator);
      countUsersInRoom(room0, 3, 1, 2, 0);

      const user3 = new User('user3');
      user3.joinRoom(room0, UserRole.Spectator);
      countUsersInRoom(room0, 4, 1, 2, 1);
    });

    it('should return false if the user is already in a room', () => {
      const user0 = new User('user0');
      const room0 = user0.createRoom('room0')!;
      expect(user0.joinRoom(room0)).to.be.false;
      countUsersInRoom(room0, 1, 1, 0, 0);
      expect(user0.getCurrentRoom()).to.be.equal(room0);
    });
  });

  describe('leaveRoom', () => {
    it('should return true, should update number of users in the room and unset current room from the user', () => {
      const user0 = new User('user0');
      const room0 = user0.createRoom('room0')!;
      expect(user0.leaveRoom()).to.be.true;
      countUsersInRoom(room0, 0, 0, 0, 0);
      expect(user0.getCurrentRoom()).to.be.equal(undefined);
    });

    it('should return false on leaving room if the user is not in any', () => {
      const user0 = new User('user0');
      expect(user0.leaveRoom()).to.be.false;
    });
  });

  function countUsersInRoom(room: Room, all: number, admins: number, estimators: number, spectators: number) {
    expect(room.getAllUsers().length).to.be.equal(all);
    expect(room.getAdmins().length).to.be.equal(admins);
    expect(room.getEstimators().length).to.be.equal(estimators);
    expect(room.getSpectators().length).to.be.equal(spectators);
  }
});
