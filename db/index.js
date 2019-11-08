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
  logging: false,
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
  },
  issueKey: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  issueId: {
    type: Sequelize.INTEGER,
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

const JiraIssue = sequelize.define('jiraissue', {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  key: {
    type: Sequelize.TEXT,
    unique: true,
  },
  created: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  updated: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  summary: {
    type: Sequelize.TEXT,
    allowNull: false,
  }
  // => projectid
  // => resolutionid
  // => assigneeId
  // => statusId
  // => reporterId
  // => parentid
  // => impactId
});

// togglentry.uid => toggleusers.id
TogglEntry.belongsTo(TogglUser, {
  foreignKey: 'uid'
});

// togglentry.pid => toggleprojects.id
TogglEntry.belongsTo(TogglProject, {
  foreignKey: 'pid',
});

// togglentry.issueId => jiraissues.id
TogglEntry.belongsTo(JiraIssue, {
  foreignKey: 'issueId',
});


// find or create toggl project
const createTogglProject = props => TogglProject.create(props)
  .catch(ignoreUniqueErrors)

// find or create toggl user
const createTogglUser = props => TogglUser.create(props)
  .catch(ignoreUniqueErrors)


// get toggl entries that have an issue key
// but aren't yet linked to an issue
const getTogglEntriesWithIssueKey = () =>
  TogglEntry.findAll({
    where: {
      issueKey: {
        [Sequelize.Op.ne]: null,
      },
      issueId: null,
    },
    attributes: ['id', 'issueKey'],
  })
  .then(entries => entries.map(e => e.get()))

// link toggleentries to a jiraissue
const updateTogglEntryIssue = (togglEntryIds, issueId) =>
  TogglEntry.update({
    issueId,
  }, {
    where: {
      id: {
        [Sequelize.Op.in]: [].concat(togglEntryIds),
      },
    },
  });


sequelize.sync({ force: false }).catch((error) => {
  console.log('Error with sequelize.sync()');
  throw error;
});


module.exports = {
  TogglEntry,
  TogglUser,
  TogglProject,
  JiraIssue,
  createTogglProject,
  createTogglUser,
  getTogglEntriesWithIssueKey,
  updateTogglEntryIssue,
};
