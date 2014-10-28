"use strict";

module.exports = function(sequelize, DataTypes) {
  var Post = sequelize.define("Post", {
    tag: DataTypes.INTEGER,
    title: DataTypes.STRING,
    body: DataTypes.TEXT,
    UserId: DataTypes.INTEGER
  }, {
    classMethods: {
      associate: function(models) {
        Post.belongsTo(models.User);
      }
    }
  });

  return Post;
};
