import { expect } from 'chai';
import 'mocha';
import { Room } from '../src/room';
import { User } from '../src/user';

describe('Room', () => {
  it('Kick user', () => {
    const room = new Room('1', new User('user1'));
    const user2 = new User('user2');
    room.addUser(user2);
    const user3 = new User('user3');
    room.addUser(user3);
    room.kickUser(user2);
    expect(room.getAdminAndUsers()[1]).to.equal(user3);
  });
});
