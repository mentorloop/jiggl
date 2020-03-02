module.exports = (sequelize, DataTypes) => {
  class JiraProject extends sequelize.Sequelize.Model {}

  JiraProject.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      key: {
        type: DataTypes.TEXT,
        unique: true,
      },
    },
    {
      sequelize,
      timestamps: false,
      modelName: 'jiraproject',
    },
  );
  return JiraProject;
};
