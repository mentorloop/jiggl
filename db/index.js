const Sequelize = require('sequelize');

const {
  DB_DATABASE,
  DB_USERNAME,
  DB_PASSWORD,
  DB_DIALECT,
  DB_STORAGE,
  DB_HOST,
} = require('../lib/config');
const { ignoreUniqueErrors, definedFieldsOnly, getModel } = require('./util');
const log = require('../lib/log');

const sequelize = new Sequelize(DB_DATABASE, DB_USERNAME, DB_PASSWORD, {
  host: DB_HOST,
  dialect: DB_DIALECT,
  storage: DB_STORAGE, // only applies to sqlite
  logging: false,
});

const models = {
  TogglEntry: sequelize.import(__dirname + '/models/togglEntry'),
  TogglUser: sequelize.import(__dirname + '/models/togglUser'),
  TogglProject: sequelize.import(__dirname + '/models/togglProject'),
  TogglGroup: sequelize.import(__dirname + '/models/togglGroup'),
  JiraIssue: sequelize.import(__dirname + '/models/jiraIssue'),
  JiraIssueType: sequelize.import(__dirname + '/models/jiraIssueType'),
  JiraProject: sequelize.import(__dirname + '/models/jiraProject'),
  JiraImpact: sequelize.import(__dirname + '/models/jiraImpact'),
  JiraComponent: sequelize.import(__dirname + '/models/jiraComponent'),
  JiraDriver: sequelize.import(__dirname + '/models/jiraDriver'),
  JiraUserType: sequelize.import(__dirname + '/models/jiraUserType'),
  JiraClient: sequelize.import(__dirname + '/models/jiraClient'),
  JiraProductLabel: sequelize.import(__dirname + '/models/jiraProductLabel'),
  JiraSupportRequestType: sequelize.import(__dirname + '/models/jiraSupportRequestType'),
};

const getModels = models => models.map(m => m.get());

const notNull = {
  [Sequelize.Op.ne]: null,
};

// get distinct column values from a table
// https://github.com/sequelize/sequelize/issues/2996
const distinct = (model, columnName) => model.findAll({
    attributes: [columnName],
    group: columnName,
  }).then(r => r.map(x => x.get(columnName)));


// togglentry.uid => toggleusers.id
models.TogglEntry.belongsTo(models.TogglUser, {
  foreignKey: 'uid',
});

// togglentry.pid => toggleprojects.id
models.TogglEntry.belongsTo(models.TogglProject, {
  foreignKey: 'pid',
});

// togglentry.issueId => jiraissues.id
models.TogglEntry.belongsTo(models.JiraIssue, {
  foreignKey: 'issueId',
});

// jiraissue.issueTypeId => jiraissuetype.id
models.JiraIssue.belongsTo(models.JiraIssueType, {
  foreignKey: 'issueTypeId',
});

models.JiraIssue.belongsTo(models.JiraProject, {
  foreignKey: 'projectId',
});

models.JiraIssue.belongsTo(models.JiraImpact, {
  foreignKey: 'impactId',
});

models.JiraIssue.belongsTo(models.JiraIssue, {
  foreignKey: 'epicId',
  as: 'epic',
});

models.JiraIssue.belongsTo(models.JiraIssue, {
  foreignKey: 'parentId',
  as: 'parent',
});

models.JiraIssue.belongsTo(models.JiraSupportRequestType, {
  foreignKey: 'supportRequestTypeId',
});

// jiraissue <=> jiraissuecomponents <=> jiracomponent
models.JiraIssue.belongsToMany(models.JiraComponent, {
  through: 'jiraissuecomponents',
  foreignKey: 'issueId',
  as: 'components',
});
models.JiraComponent.belongsToMany(models.JiraIssue, {
  through: 'jiraissuecomponents',
  foreignKey: 'componentId',
  as: 'issues',
});

// jiraissue <=> jiraissuedrivers <=> jiradrivers
models.JiraIssue.belongsToMany(models.JiraDriver, {
  through: 'jiraissuedrivers',
  foreignKey: 'issueId',
  as: 'drivers',
});
models.JiraDriver.belongsToMany(models.JiraIssue, {
  through: 'jiraissuedrivers',
  foreignKey: 'driverId',
  as: 'issues',
});

// jiraissue <=> jiraissueclients <=> jiraclients
models.JiraIssue.belongsToMany(models.JiraClient, {
  through: 'jiraissueclients',
  foreignKey: 'issueId',
  as: 'clients',
});
models.JiraClient.belongsToMany(models.JiraIssue, {
  through: 'jiraissueclients',
  foreignKey: 'clientId',
  as: 'issues',
});

// jiraissue <=> jiraproductlabels <=> jiracomponent
models.JiraIssue.belongsToMany(models.JiraProductLabel, {
  through: 'jiraissueproductlabels',
  foreignKey: 'issueId',
  as: 'productLabels',
});
models.JiraProductLabel.belongsToMany(models.JiraIssue, {
  through: 'jiraissueproductlabels',
  foreignKey: 'productLabelId',
  as: 'issues',
});

// jiraissue <=> jiraissueusertypes <=> jirausertypes
models.JiraIssue.belongsToMany(models.JiraUserType, {
  through: 'jiraissueusertypes',
  foreignKey: 'issueId',
  as: 'userTypes',
});
models.JiraUserType.belongsToMany(models.JiraIssue, {
  through: 'jiraissueusertypes',
  foreignKey: 'userTypeId',
  as: 'issues',
});

// toggluser <=> togglgroupusers <=> togglgroup
models.TogglGroup.belongsToMany(models.TogglUser, {
  through: 'togglgroupusers',
  foreignKey: 'groupId',
  as: 'users',
});
models.TogglUser.belongsToMany(models.TogglGroup, {
  through: 'togglgroupusers',
  foreignKey: 'userId',
  as: 'groups',
});

// get toggl entries that have an issue key
// but aren't yet linked to an issue
const getTogglEntriesWithIssueKey = () =>
  models.TogglEntry.findAll({
    where: {
      issueKey: notNull,
      issueId: null,
    },
    attributes: ['id', 'issueKey'],
  }).then(getModels);

// get all jira issues that have an epic key
// but aren't yet linked to an epic
const getJiraIssuesWithUnlinkedEpics = () =>
  models.JiraIssue.findAll({
    where: {
      epicKey: notNull,
      // epicId: null,
    },
    attributes: ['id', 'epicKey'],
  }).then(getModels);

// get jira issues that have a parent key
// but aren't linked to a parent issue yet
const getJiraIssuesWithUnlinkedParents = () =>
  models.JiraIssue.findAll({
    where: {
      parentKey: notNull,
      // parentId: null,
    },
    attributes: ['id', 'parentKey'],
  }).then(getModels);

// link togglentries to a jiraissue
const updateTogglEntryIssue = (togglEntryIds, issueId) =>
  models.TogglEntry.update(
    {
      issueId,
    },
    {
      where: {
        id: {
          [Sequelize.Op.in]: [].concat(togglEntryIds),
        },
      },
    },
  );

const flagEntriesWithBadIssueKey = togglEntryIds =>
  models.TogglEntry.update(
    {
      error: 'BAD_ISSUE_KEY',
    },
    {
      where: {
        id: {
          [Sequelize.Op.in]: [].concat(togglEntryIds),
        },
      },
    },
  );

const updateJiraIssueEpic = (jiraIssueIds, epicId) =>
  models.JiraIssue.update(
    {
      epicId,
    },
    {
      where: {
        id: {
          [Sequelize.Op.in]: [].concat(jiraIssueIds),
        },
      },
    },
  );

const updateJiraIssueParent = (jiraIssueIds, parentId) =>
  models.JiraIssue.update(
    {
      parentId,
    },
    {
      where: {
        id: {
          [Sequelize.Op.in]: [].concat(jiraIssueIds),
        },
      },
    },
  );

const forceSyncDB = () => sequelize.sync({ force: true });

// get all Toggl Entries between 2 timestamps.
// left join to jiraissue.
const getTogglEntriesBetween = (from, to, uids = null) =>
  models.TogglEntry.findAll({
    where: {
      ...(uids
        ? {
            uid: {
              [Sequelize.Op.in]: uids,
            },
          }
        : {}),
      start: {
        [Sequelize.Op.between]: [from, to],
      },
    },
    include: [
      {
        model: models.JiraIssue,
      },
    ],
  }).then(entries =>
    entries.map(entry => ({
      ...entry.get(),
      jiraissue: entry.jiraissue ? entry.jiraissue.get() : null,
    })),
  );

const removeTogglEntriesBetween = (from, to) =>
  models.TogglEntry.destroy({
    where: {
      start: {
        [Sequelize.Op.between]: [from, to],
      },
    },
  });


/**
 * Update the properties of a Jira issue from a related issue,
 * ie, a Parent or an Epic.
 * This allows us to set flags like Is Roadmap Item or Product Label
 * on an Epic or a Parent, and bubble those values down to the related
 * issues for analysis.
 * @param  {Object} selector     Sequelize selector for JiraIssues
 * @param  {JiraIssue} relatedIssue
 */
const updateJiraIssuesFromRelatedIssue = (selector, relatedIssue) => {
  // todo - update more fields
  const epicId = relatedIssue.get('epicId');
  const updateQuery = {
    isRoadmapItem: relatedIssue.get('isRoadmapItem'),
    ...(epicId ? { epicId } : {})
  };

  return models.JiraIssue.update(updateQuery, {
    where: selector,
  });
};

// given a parsed Jira Issue from the remote API,
// create a JiraIssue and all related models.
const createJiraIssue = async (issue) => {
  await models.JiraIssueType.create(issue.issueType).catch(ignoreUniqueErrors);
  await models.JiraProject.create(issue.project).catch(ignoreUniqueErrors);

  if (issue.impact) {
    await models.JiraImpact.create(issue.impact).catch(ignoreUniqueErrors);
  }

  if (issue.supportRequestType) {
    await models.JiraSupportRequestType.create(issue.supportRequestType).catch(ignoreUniqueErrors);
  }

  const drivers = await Promise.all(
    issue.drivers.map(({ id, value }) =>
      models.JiraDriver.findOrCreate({
        where: {
          id,
        },
        defaults: {
          id,
          value,
        },
      }).then(getModel),
    ),
  );

  const components = await Promise.all(
    issue.components.map(({ id, name }) =>
      models.JiraComponent.findOrCreate({
        where: {
          id,
        },
        defaults: {
          id,
          name,
        },
      }).then(getModel),
    ),
  );

  const productLabels = await Promise.all(
    issue.productLabels.map(productLabel =>
      models.JiraProductLabel.findOrCreate({
        where: {
          value: productLabel,
        },
      }).then(getModel),
    ),
  );

  const userTypes = await Promise.all(
    issue.userTypes.map(({ id, value }) =>
      models.JiraUserType.findOrCreate({
        where: {
          id,
        },
        defaults: {
          id,
          value,
        },
      }).then(getModel),
    ),
  );

  const clients = await Promise.all(
    issue.clients.map(client =>
      models.JiraClient.findOrCreate({
        where: {
          value: client,
        },
      }).then(getModel),
    ),
  );

  log.debug('JiraIssue.upsert', issue);
  models.JiraIssue.upsert(definedFieldsOnly(issue, models.JiraIssue))
    .then(() => models.JiraIssue.findOne({
        where: {
          id: issue.id,
        },
      }))
    .then(savedIssue =>
      savedIssue
        .setComponents(components)
        .then(() => savedIssue.setDrivers(drivers))
        .then(() => savedIssue.setProductLabels(productLabels))
        .then(() => savedIssue.setClients(clients))
        .then(() => savedIssue.setUserTypes(userTypes)),
    );
};

const connect = () =>
  Promise.resolve()
    .then(() => {
      log.info('Connecting to database...');
      return sequelize
        .sync({ force: false })
        .then(() => log.info('Connected to database'));
    })
    .catch(error => {
      log.info('Error with sequelize.sync()');
      log.error(error);
      throw error;
    });

const connection = connect();

module.exports = {
  connection,
  models,
  getModels,
  notNull,
  distinct,
  getTogglEntriesWithIssueKey,
  getTogglEntriesBetween,
  removeTogglEntriesBetween,
  getJiraIssuesWithUnlinkedEpics,
  getJiraIssuesWithUnlinkedParents,
  updateTogglEntryIssue,
  flagEntriesWithBadIssueKey,
  updateJiraIssueEpic,
  updateJiraIssueParent,
  createJiraIssue,
  updateJiraIssuesFromRelatedIssue,
  forceSyncDB,
};
