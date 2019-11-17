module.exports = (sequelize, DataTypes) => {
  class JiraComponent extends sequelize.Sequelize.Model {}

  JiraComponent.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      timestamps: false,
      modelName: 'jiracomponent',
    },
  );
  return JiraComponent;
};
