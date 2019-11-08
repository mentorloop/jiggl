const Sequelize = require('sequelize');

const {
  DB_DATABASE,
  DB_USER,
  DB_PASSWORD,
  DB_DIALECT,
  DB_STORAGE,
} = require('../lib/config');
const { ignoreUniqueErrors } = require('./util');


const sequelize = new Sequelize(DB_DATABASE, DB_USER, DB_PASSWORD, {
  dialect: DB_DIALECT,
  storage: DB_STORAGE, // only applies to sqlite
});


const TogglEntry = sequelize.define('togglentry', {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  pid: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  tid: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  uid: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  description: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  start: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  end: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  dur: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  user: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  project: {
    type: Sequelize.TEXT,
    allowNull: true,
  }
});

const TogglUser = sequelize.define('toggluser', {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  user: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
});

const TogglProject = sequelize.define('togglproject', {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  project: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
}) ;


// togglentry.uid => toggleusers.id
TogglUser.hasMany(TogglEntry, {
  foreignKey: 'uid'
});

// togglentry.pid => toggleprojects.id
TogglProject.hasMany(TogglEntry, {
  foreignKey: 'pid',
});


sequelize.sync({ force: true }).then(() => {
  console.log('sequelize synced');
});


// find or create toggl project
const createTogglProject = props => TogglProject.create(props)
  .catch(ignoreUniqueErrors)

// find or create toggl user
const createTogglUser = props => TogglUser.create(props)
  .catch(ignoreUniqueErrors)


module.exports = {
  TogglEntry,
  TogglUser,
  TogglProject,
  createTogglProject,
  createTogglUser,
};
