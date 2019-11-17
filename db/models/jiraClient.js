module.exports = (sequelize, DataTypes) => {

  class JiraClient extends sequelize.Sequelize.Model {}

  JiraClient.init(
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
      modelName: 'jiraclient',
    },
  );
  return JiraClient;
}
