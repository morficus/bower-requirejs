'use strict';
var _ = require('lodash');
var slice = Array.prototype.slice;
var chalk = require('chalk');
var warn = chalk.black.bgYellow;

/**
 * Build requirejs shim object from bower dependencies object.
 */
module.exports = function (dependencies, opts, exclude) {
  var shim = {};
  // Stolen from ./parse.js
  // @TODO: put commonly used functions in one file
  function filterName() {
    var oldName = arguments[0];
    var newName = _.difference(oldName.split('.'), slice.call(arguments, 1));

    // Re-attach any leftover pieces
    // ex: handlebars.runtime.js becomes handlebars.runtime
    if (newName.length > 1) {
      newName = newName.join('.');
    } else {
      newName = newName[0];
    }

    if (newName !== oldName) {
      console.log(warn('WARN'), 'Renaming ' + oldName + ' to ' + newName + '\n');
    }

    return newName;
  }
  _.forOwn(dependencies, function (dep, name) {
    if ((opts['shim-all'] || (opts.shim && _.contains(opts.shim, name))) &&
      // Check if the module has a dependency
      !_.isEmpty(dep.dependencies) && !_.contains(exclude, name)) {
        shim[filterName(name, 'js', 'min')] = {deps: _.keys(dep.dependencies)};
      }
  });

  return shim;
};
