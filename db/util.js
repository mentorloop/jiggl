const _ = require('lodash');

// ignore Unique Constraint errors.
// usage: .catch(igoreUniqueErrors)
const ignoreUniqueErrors = (error) => {
  if (error.name !== 'SequelizeUniqueConstraintError') {
    throw error;
  }
}

// return an array of the fields defined on a model
const getModelFields = (model) => Object.keys(model.tableAttributes);

// return an object that only contains fields that
// are specified on a model.
const definedFieldsOnly = (obj, model) => ({
  ..._.pick(obj, getModelFields(model)),
});

// return the model from a findOrCreate() call
const getModel = ([model]) => model;

module.exports = {
  ignoreUniqueErrors,
  getModelFields,
  definedFieldsOnly,
  getModel,
};
