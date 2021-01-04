import { DataTypes, Model } from 'sequelize';
import { db } from './../database';

class UserModel extends Model {
  public id!: number;
  public username!: string;
  public passwordHash!: string;
  public salt!: string;
  public securityQuestion!: string;
  public securityAnswer!: string;
}

UserModel.init(
  {
    username: {
      type: new DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    passwordHash: {
      type: new DataTypes.STRING(128),
      allowNull: false
    },
    salt: {
      type: new DataTypes.STRING(128),
      allowNull: false
    },
    securityQuestion: {
      type: new DataTypes.STRING(100),
      allowNull: false
    },
    securityAnswerHash: {
      type: new DataTypes.STRING(128),
      allowNull: false
    },
    securityAnswerSalt: {
      type: new DataTypes.STRING(128),
      allowNull: false
    }
  },
  {
    timestamps: false,
    tableName: 'users',
    sequelize: db
  }
);

export { UserModel };
