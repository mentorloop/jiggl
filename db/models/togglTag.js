module.exports = (sequelize, DataTypes) => {
  class TogglTag extends sequelize.Sequelize.Model {}

  TogglTag.init(
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
      modelName: 'toggltag',
    },
  );
  return TogglTag;
};
