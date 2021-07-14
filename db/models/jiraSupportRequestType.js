module.exports = (sequelize, DataTypes) => {
  class JiraSupportRequestType extends sequelize.Sequelize.Model {}

  JiraSupportRequestType.init(
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
      modelName: 'jirasupportrequesttype',
    },
  );
  return JiraSupportRequestType;
}