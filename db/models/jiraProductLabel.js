module.exports = (sequelize, DataTypes) => {
  class JiraProductLabel extends sequelize.Sequelize.Model {}

  JiraProductLabel.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
    },
    {
      sequelize,
      timestamps: false,
      modelName: 'jiraproductlabel',
    },
  );
  return JiraProductLabel;
}
