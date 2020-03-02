module.exports = (sequelize, DataTypes) => {
  class TogglUser extends sequelize.Sequelize.Model {}

  TogglUser.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      user: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      timestamps: false,
      modelName: 'toggluser',
    },
  );
  return TogglUser;
};
