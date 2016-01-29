'use strict';

var fs = require('fs');
var path = require('path');
var SemVer = require('semver');

var __root = path.resolve(__dirname, '../../');
var __transforms = path.resolve(__root, './shared/transforms');
var File = require(path.resolve(__root, './shared/objects/File'));

var async = require('async');
var tap = require('tap');

var tests;

tap.test('Testing common transformations', function(t){
  async.applyEachSeries(tests, t, function(err){
    t.error(err);
    t.end();
  });
});

tests = [
  function(pt, next){
    pt.test('Testing package to semver transform', function(t){
      var transform = require(`${__transforms}/standard/package-to-semver`);
      transform(new File(path.join(__dirname, './examples/package')))
      .then(function(semver_handle){
        t.equal(typeof semver_handle, 'object', 'Semver handle is an object');
        t.ok(semver_handle.version, 'Semver handle has a version');
        t.ok(SemVer.valid(semver_handle.version), 'Semver handle\'s version is valid');
        t.ok(semver_handle.name, 'Semver handle has a name');
        return semver_handle;
      }).then(function(semver_handle){
        var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './examples/package')));
        t.equal(pkg.version, semver_handle.version, 'Semver version should equal that of the package.json');
        t.equal(pkg.name, semver_handle.name, 'Semver name should equal that of the package.json');
        t.end();
        next();
      }).catch(t.error.bind(t));
    });
  },

  function(pt, next){
    pt.test('Testing readable name to semver transform', function(t){
      var transform = require(`${__transforms}/standard/readable-name-to-semver`);
      t.throws(transform.bind(void 0, '@0.0.0'), 'With no name, an error will be thrown');
      var semver_handle = transform('a_package@0.0.0');
      t.equal(typeof semver_handle, 'object', 'Semver handle is an object');
      t.ok(semver_handle.version, 'Semver handle has a version');
      t.ok(SemVer.validRange(semver_handle.version), 'Semver handle\'s version is valid');
      t.ok(semver_handle.name, 'Semver handle has a name');
      t.equal(semver_handle.name, 'a_package', 'Semver handle\'s name is correct');
      t.equal(semver_handle.version, '0.0.0', 'Semver handle\'s version is correct');
      t.end();
      next();
    });
  },

  function(pt, next){
    pt.test('Testing readable name to semver transform', function(t){
      var transform = require(`${__transforms}/standard/readable-name-to-semver`);
      t.throws(transform.bind(void 0, '@0.0.0'), 'With no name, an error will be thrown');
      var semver_handle = transform('a_package@0.0.0');
      t.equal(typeof semver_handle, 'object', 'Semver handle is an object');
      t.ok(semver_handle.version, 'Semver handle has a version');
      t.ok(SemVer.validRange(semver_handle.version), 'Semver handle\'s version is valid');
      t.ok(semver_handle.name, 'Semver handle has a name');
      t.equal(semver_handle.name, 'a_package', 'Semver handle\'s name is correct');
      t.equal(semver_handle.version, '0.0.0', 'Semver handle\'s version is correct');
      t.end();
      next();
    });
  },

];
