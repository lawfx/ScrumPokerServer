import { Sequelize } from 'sequelize';
import config from './config.json';

class Database {
  private sequelize: Sequelize;
  constructor(reset: boolean) {
    console.log('Creating database...');
    this.sequelize = new Sequelize(
      config.database.name,
      config.database.username,
      config.database.password,
      {
        dialect: 'sqlite',
        storage: config.database.storage
      }
    );

    this.sequelize.authenticate();
    this.sequelize.sync({ force: reset });
  }

  getSequelize(): Sequelize {
    return this.sequelize;
  }
}

export const db = new Database(false).getSequelize();
