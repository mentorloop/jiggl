const ignoreUniqueErrors = (error) => {
  if (error.name !== 'SequelizeUniqueConstraintError') {
    throw error;
  }
}

module.exports = {
  ignoreUniqueErrors,
};
