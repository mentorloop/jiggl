module.exports = (sequelize, DataTypes) => {
  class TogglProject extends sequelize.Sequelize.Model {}

  TogglProject.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      project: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      timestamps: false,
      modelName: 'togglproject',
    },
  );
  return TogglProject;
};
