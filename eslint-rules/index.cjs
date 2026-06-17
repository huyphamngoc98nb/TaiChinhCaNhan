'use strict';

/**
 * Local ESLint plugin for TaiChinhCaNhan.
 * Registered in .eslintrc.cjs as plugin "local".
 *
 * Rules:
 *   local/no-hardcoded-labels  — ban hardcoded Vietnamese/UI text in JSX;
 *                                 all labels must go through t() from useLanguage()
 */
const noHardcodedLabels = require('./no-hardcoded-labels.cjs');

module.exports = {
  rules: {
    'no-hardcoded-labels': noHardcodedLabels,
  },
};
