"use strict";
module.exports = {
  up: function(migration, DataTypes, done) {
    console.log("Running migration for users");
    migration.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      username: {
        type: DataTypes.STRING,
        unique: true
      },
      password: {
        type: DataTypes.STRING
      },
      location: {
        type: DataTypes.STRING
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    }).complete(done);
  },
  down: function(migration, DataTypes, done) {
    migration.dropTable('Users').done(done);
  }
};