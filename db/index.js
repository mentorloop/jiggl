const _ = require('lodash');
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
  hours: {
    type: Sequelize.FLOAT,
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
  },
  issueTypeId: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  projectId: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  impactId: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  epicKey: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  epicId: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },

  // => parentId
  // => resolutionid
  // => assigneeId
  // => statusId
  // => reporterId
});

const JiraIssueType = sequelize.define('jiraissuetype', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
  },
  // todo - can probably drop this tbh
  description: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  name: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  subtask: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
  },
});

const JiraProject = sequelize.define('jiraprojects', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
  },
  key: {
    type: Sequelize.TEXT,
    unique: true,
  },
});

const JiraImpact = sequelize.define('jiraimpacts', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
  },
  value: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
});

const JiraComponent = sequelize.define('jiracomponents', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
  },
  name: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
});

const JiraDriver = sequelize.define('jiradrivers', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
  },
  value: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
});

const JiraUserType = sequelize.define('jirausertypes', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
  },
  value: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
});

const JiraClient = sequelize.define('jiraclients', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  value: {
    type: Sequelize.TEXT,
    allowNull: false,
    unique: true,
  },
});

const JiraProductLabel = sequelize.define('jiraproductlabels', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  value: {
    type: Sequelize.TEXT,
    allowNull: false,
    unique: true,
  },
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

// jiraissue.issueTypeId => jiraissuetype.id
JiraIssue.belongsTo(JiraIssueType, {
  foreignKey: 'issueTypeId',
});

JiraIssue.belongsTo(JiraProject, {
  foreignKey: 'projectId',
});

JiraIssue.belongsTo(JiraImpact, {
  foreignKey: 'impactId',
});

JiraIssue.belongsTo(JiraIssue, {
  foreignKey: 'epicId'
});

// jiraissue <=> jiraissuecomponents <=> jiracomponent
JiraIssue.belongsToMany(JiraComponent, { through: 'jiraissuecomponents', foreignKey: 'issueId', as: 'components' });
JiraComponent.belongsToMany(JiraIssue, { through: 'jiraissuecomponents', foreignKey: 'componentId', as: 'issues' });

// jiraissue <=> jiraissuedrivers <=> jiradrivers
JiraIssue.belongsToMany(JiraDriver, { through: 'jiraissuedrivers', foreignKey: 'issueId', as: 'drivers' });
JiraDriver.belongsToMany(JiraIssue, { through: 'jiraissuedrivers', foreignKey: 'driverId', as: 'issues' });

// jiraissue <=> jiraissueclients <=> jiraclients
JiraIssue.belongsToMany(JiraClient, { through: 'jiraissueclients', foreignKey: 'issueId', as: 'clients' });
JiraClient.belongsToMany(JiraIssue, { through: 'jiraissueclients', foreignKey: 'clientId', as: 'issues' });

// jiraissue <=> jiraproductlabels <=> jiracomponent
JiraIssue.belongsToMany(JiraProductLabel, { through: 'jiraissueproductlabels', foreignKey: 'issueId', as: 'productLabels' });
JiraProductLabel.belongsToMany(JiraIssue, { through: 'jiraissueproductlabels', foreignKey: 'productLabelId', as: 'issues' });

// jiraissue <=> jiraissueusertypes <=> jirausertypes
JiraIssue.belongsToMany(JiraUserType, { through: 'jiraissueusertypes', foreignKey: 'issueId', as: 'userTypes' });
JiraUserType.belongsToMany(JiraIssue, { through: 'jiraissueusertypes', foreignKey: 'userTypeId', as: 'issues' });


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
  .then(entries => entries.map(e => e.get()));

// get all jira issues that have an epic key
// but aren't yet linked to an epic
const getJiraIssuesWithEpics = () =>
  JiraIssue.findAll({
    where: {
      epicKey: {
        [Sequelize.Op.ne]: null,
      },
      epicId: null,
    },
    attributes: ['id', 'epicKey'],
  })
  .then(issues => issues.map(i => i.get()));

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

const updateJiraIssueEpic = (jiraIssueIds, epicId) =>
  JiraIssue.update({
    epicId,
  }, {
    where: {
      id: {
        [Sequelize.Op.in]: [].concat(jiraIssueIds)
      },
    },
  });

const forceSyncDB = () => sequelize.sync({ force: true });

const createJiraIssue = async (issue) => {
  await JiraIssueType.create(issue.issueType)
    .catch(ignoreUniqueErrors);

  await JiraProject.create(issue.project)
    .catch(ignoreUniqueErrors);

  if (issue.impact) {
    await JiraImpact.create(issue.impact)
      .catch(ignoreUniqueErrors);
  }

  const drivers = await Promise.all(issue.drivers.map(({ id, value }) => JiraDriver.findOrCreate({
      where: {
        id,
      },
      defaults: {
        id,
        value,
      },
    }).then(([model]) => model)));

  const components = await Promise.all(issue.components.map(({ id, name }) => JiraComponent.findOrCreate({
      where: {
        id,
      },
      defaults: {
        id,
        name,
      },
    }).then(([model]) => model)));

  const productLabels = await Promise.all(issue.productLabels.map(productLabel => JiraProductLabel.findOrCreate({
    where: {
      value: productLabel,
    }
  }).then(([model]) => model)));

  const userTypes = await Promise.all(issue.userTypes.map(({ id, value }) => JiraUserType.findOrCreate({
    where: {
      id,
    },
    defaults: {
      id,
      value,
    },
  }).then(([model]) => model)));

  const clients = await Promise.all(issue.clients.map(client => JiraClient.findOrCreate({
    where: {
      value: client,
    }
  }).then(([model]) => model)));

  const safeIssueFields = Object.keys(JiraIssue.tableAttributes);

   JiraIssue.findOrCreate({
    where: {
      id: issue.id,
    },
    defaults: _.pick(issue, safeIssueFields),
  }).then(([model]) => model)
    .then(savedIssue => savedIssue.setComponents(components)
      .then(() => savedIssue.setDrivers(drivers))
      .then(() => savedIssue.setProductLabels(productLabels))
      .then(() => savedIssue.setClients(clients))
      .then(() => savedIssue.setUserTypes(userTypes))
    );
}


sequelize.sync({ force: false }).catch((error) => {
  console.log('Error with sequelize.sync()');
  throw error;
});


module.exports = {
  TogglEntry,
  TogglUser,
  TogglProject,
  JiraIssue,
  JiraIssueType,
  JiraProject,
  JiraImpact,
  JiraDriver,
  JiraClient,
  JiraComponent,
  JiraProductLabel,
  JiraUserType,
  createTogglProject,
  createTogglUser,
  getTogglEntriesWithIssueKey,
  getJiraIssuesWithEpics,
  updateTogglEntryIssue,
  updateJiraIssueEpic,
  createJiraIssue,
  forceSyncDB,
};
