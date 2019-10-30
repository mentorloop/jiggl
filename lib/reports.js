// interactively modify reports by
// merging and removing items.

const inquirer = require('inquirer');

const { sortItemsByTime, calculatePercentages } = require('./util');

const DEFAULT_PAGE_SIZE = 10;

const thenClearScreen = value =>
  Promise.resolve().then(() => {
    process.stdout.write('\033c');
    return value;
  });

const printItems = items =>
  console.log(
    items.map(item => ({
      title: item.title,
      time: item.time,
      percent: item.percent,
    })),
  );

// prompt user to pick an item from a list
const pickItem = (items, message = 'Select an item') =>
  thenClearScreen()
    .then(() =>
      inquirer.prompt([
        {
          type: 'list',
          pageSize: DEFAULT_PAGE_SIZE,
          choices: [
            ...items.map((p, i) => ({
              name: `${p.title} (${p.time})`,
              value: i,
            })),
            new inquirer.Separator(),
            {
              name: 'CANCEL',
              value: -1,
            },
          ],
          name: 'target',
          message,
        },
      ]),
    )
    .then(({ target }) => target);

const removeMergeCancel = item =>
  thenClearScreen()
    .then(() =>
      inquirer.prompt([
        {
          type: 'list',
          choices: ['Remove', 'Merge', 'Cancel'],
          name: 'choice',
          message: `What do you want to do with ${item.title}`,
        },
      ]),
    )
    .then(({ choice }) => choice);

const isDone = items =>
  thenClearScreen().then(() => {
    printItems(items);
    return inquirer
      .prompt([
        {
          type: 'list',
          choices: ['Finished', 'Edit'],
          name: 'choice',
          message: 'Choose',
        },
      ])
      .then(({ choice }) => choice === 'Finished');
  });

// merge two objects together.
// keep the title from primary, sum the others.
const mergeItems = (primary, secondary) => ({
  title: primary.title,
  time: primary.time + secondary.time,
  ...(Object.hasOwnProperty.call(primary, 'percent')
    ? {
        percent: primary.percent + secondary.percent,
      }
    : {}),
});

// perform a merge in an array
const mergeArrayItems = (items, secondaryIndex, primaryIndex) => {
  if (secondaryIndex === primaryIndex) return [...items];
  const [secondary] = items.splice(secondaryIndex, 1);
  const [primary] = items.splice(primaryIndex, 1);
  console.log({
    secondary,
    primary,
  });
  return [...items, mergeItems(primary, secondary)];
};

// remove an item from an array
const removeItemFromArray = (items, index) => [
  ...items.slice(0, index),
  ...items.slice(index + 1),
];

const chooseItemForMerge = (items, primaryIndex) =>
  pickItem(items, `Merge ${items[primaryIndex].title} with...`).then(
    secondaryIndex => {
      // cancelled
      if (secondaryIndex === -1) {
        return items;
      }
      return mergeArrayItems(items, primaryIndex, secondaryIndex);
    },
  );

const editReport = report =>
  Promise.resolve(report)
    .then(calculatePercentages)
    .then(sortItemsByTime)
    .then(items => {
      return isDone(items).then(finished => {
        // finished, we're done.
        if (finished) return items;

        // otherwise pick an item
        return pickItem(items).then(index => {
          // user cancelled, start again.
          if (index === -1) {
            return editReport(items);
          }

          // do something with the item.
          return removeMergeCancel(items[index])
            .then(action => {
              switch (action) {
                case 'Cancel':
                  return editReport(items);
                case 'Remove':
                  return removeItemFromArray(items, index);
                case 'Merge':
                  return chooseItemForMerge(items, index);
                default:
                  console.log('whut?');
              }
            })
            .then(editReport); // and start again
        });
      });
    });



module.exports = {
  mergeItems,
  mergeArrayItems,
  editReport,
};
