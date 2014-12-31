'use strict';
var _ = require('lodash');
var slice = Array.prototype.slice;
var chalk = require('chalk');
var warn = chalk.black.bgYellow;
var parser = require('acorn').parse;
var fs = require('fs');
var path = require('path');
var parse = require('./parse');

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
  function isDefine(node) {
    var c = node.callee;
    return c
        && node.type === 'CallExpression'
        && c.type === 'Identifier'
        && c.name === 'define'
    ;
  }
  function traverseAST(node, cb) {
    if (Array.isArray(node)) {
      node.forEach(function (x) {
        if(x != null) {
          x.parent = node;
          traverseAST(x, cb);
        }
      });
    }
    else if (node && typeof node === 'object') {
      cb(node);

      Object.keys(node).forEach(function (key) {
        if (key === 'parent' || !node[key]) return;
        node[key].parent = node;
        traverseAST(node[key], cb);
      });
    }
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

        var ast = parser(fs.readFileSync(require.resolve(fileName), {encoding: 'utf-8'}), {tolerant: true});

        traverseAST(ast, function (node) {
          if (isDefine(node)) {

            if (node.arguments.length) {
              if (
              (node.arguments[0].type === 'Literal' && node.arguments[1].type === 'ArrayExpression' && node.arguments[2].type === 'FunctionExpression') ||
              (node.arguments[0].type === 'ArrayExpression' && node.arguments[1].type === 'FunctionExpression')) {
                isAMD = true;
              }
            }
          }

        });

      });
      
      if (!isAMD) {
        shim[filterName(name, 'js', 'min')] = {deps: _.keys(dep.dependencies)};
      }
    });
  }

  return shim;
};
