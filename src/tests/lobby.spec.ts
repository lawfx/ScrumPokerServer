import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import app from '../server';

chai.use(chaiHttp);

before(() => {
  app.server?.close();
});

describe('Hello API Request', () => {
  it('should return response on call', () => {
    return chai
      .request(app.app)
      .get('/')
      .then((res) => {
        expect(res.text).to.eql('Skram running!');
      });
  });
});
