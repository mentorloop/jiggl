module.exports = (sequelize, DataTypes) => {
  class JiraIssueType extends sequelize.Sequelize.Model {}

  JiraIssueType.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      // todo - can probably drop this tbh
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      subtask: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      sequelize,
      timestamps: false,
      modelName: 'jiraissuetype',
    },
  );
  return JiraIssueType;
};
