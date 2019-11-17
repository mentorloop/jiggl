module.exports = (sequelize, DataTypes) => {
  class TogglGroup extends sequelize.Sequelize.Model {}

  TogglGroup.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      wid: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      timestamps: false,
      modelName: 'togglgroup',
    },
  );
  return TogglGroup;
};
