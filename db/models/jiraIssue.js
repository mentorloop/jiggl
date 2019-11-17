module.exports = (sequelize, DataTypes) => {
  class JiraIssue extends sequelize.Sequelize.Model {}

  JiraIssue.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      key: {
        type: DataTypes.TEXT,
        unique: true,
      },
      created: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      issueTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      impactId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      epicKey: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      epicId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // => parentId
      // => resolutionid
      // => assigneeId
      // => statusId
      // => reporterId
    },
    {
      sequelize,
      timestamps: false,
      modelName: 'jiraissue',
    },
  );
  return JiraIssue;
};
