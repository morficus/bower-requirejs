'use strict';
var _ = require('lodash');
var slice = Array.prototype.slice;
var chalk = require('chalk');
var warn = chalk.black.bgYellow;
var fs = require('fs');
var path = require('path');
var parse = require('./parse');
var moduleType = require('js-module-formats');

/**
 * Build requirejs shim object from bower dependencies object.
 */
module.exports = function (dependencies, opts, exclude) {
  var shim = {};
  // Stolen from ./parse.js
  // @TODO: maybe put commonly used functions in one file
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
  if (opts['simple-shim']) {
    _.forOwn(dependencies, function (dep, name) {
      if ((opts['shim-all'] || (opts.shim && _.contains(opts.shim, name))) &&
        // Check if the module has a dependency
        !_.isEmpty(dep.dependencies) && !_.contains(exclude, name)) {
          shim[filterName(name, 'js', 'min')] = {deps: _.keys(dep.dependencies)};
        }
    });
  }
  else {

    if (!opts['shim-all']) {
      return shim;
    }
    _.forOwn(dependencies, function (dep, name) {

      var isAMD = false;
      _.forOwn(parse(dep, name, opts.baseUrl || '').paths, function (fileName) {

        fileName = path.join(opts.baseUrl, fileName);
        isAMD = moduleType.detect(fs.readFileSync(require.resolve(fileName)));
      });

      if (!isAMD) {
        shim[filterName(name, 'js', 'min')] = {deps: _.keys(dep.dependencies)};
      }
    });
  }

  return shim;
};
