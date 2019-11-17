module.exports = (sequelize, DataTypes) => {
  class JiraUserType extends sequelize.Sequelize.Model {}

  JiraUserType.init(
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
      modelName: 'jirausertype',
    },
  );
  return JiraUserType;
}
