 module.exports = (sequelize, DataTypes) => {
  class TogglEntry extends sequelize.Sequelize.Model {}

  TogglEntry.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    pid: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tid: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    uid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    start: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end: {
      type: DataTypes.DATE,
      alowNull: false,
    },
    dur: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    hours: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    user: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    project: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    issueKey: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    issueId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    timestamps: false,
    modelName: 'togglentry',
  });
  return TogglEntry;
};
