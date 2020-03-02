module.exports = (sequelize, DataTypes) => {
  class JiraImpact extends sequelize.Sequelize.Model {}

  JiraImpact.init(
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
      modelName: 'jiraimpact',
    },
  );
  return JiraImpact;
};
