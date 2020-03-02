module.exports = (sequelize, DataTypes) => {
  class JiraDriver extends sequelize.Sequelize.Model {}

  JiraDriver.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      timestamps: false,
      modelName: 'jiradriver',
    },
  );
  return JiraDriver;
}
