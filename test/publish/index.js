'use strict';

var tap = require('tap');
var async = require('async');
var rimraf = require('rimraf');

var children = [];

var semver_tests, write_tests, registry_tests;

setImmediate(function(){
  async.each([semver_tests, write_tests, registry_tests], function(test, next){
    tap.test(test.message, function(pt){
      async.applyEachSeries(test.tests, pt, function(err){
        if(err){
          pt.error(err);
          return next(err);
        }

        pt.end();
        next();
      });
    });
  }, function(err){

    if(err) return tap.error(err);
    tap.end();
  });
});

process.on('exit', function(){
  children.forEach(function(child){
    child.createdFiles.forEach(rimraf.sync.bind(rimraf));
    child.kill('SIGHUP');
  });
});

process.once('SIGTERM', function(){
  process.exit(0);
});

process.once('SIGINT', function(){
  process.exit(0);
});

semver_tests = {
  message: 'Standardized aspects of Publishing a Package',
  tests: [
    function(pt, next){
      pt.test('Client can only publish with a package.json version', function(t){

        t.end();
        next();
      });
    },

    function(pt, next){
      pt.test('Client can only publish with a valid package version', function(t){

        t.end();
        next();
      });
    },

    function(pt, next){
      pt.test('Client can only publish with a valid package name', function(t){

        t.end();
        next();
      });
    },

    function(pt, next){
      pt.test('Registry can deny client the ability to publish', function(t){

        t.end();
        next();
      });
    },

    function(pt, next){
      pt.test('Packages Dependencies must have a way to be resolved', function(t){

        t.end();
        next();
      });
    },

    function(pt, next){
      pt.test('Client can only publish once for a single version', function(t){

        t.end();
        next();
      });
    },

    function(pt, next){
      pt.test('Client can never go back in versions, only forward', function(t){

        t.end();
        next();
      });
    },
  ],
};

write_tests = {
  message: 'Client can publish through a multitude of distribution networks',
  tests: [
    function(pt, next){
      pt.test('The fetched package.json must be the same as that which the Publisher sent', function(t){

        t.end();
        next();
      });
    },

    function(pt, next){
      pt.test('The file contents for each package will result exactle the same', function(t){

        t.end();
        next();
      });
    },

    function(pt, next){
      pt.test('Duplicate handles created from a package will be exactly the same', function(t){

        t.end();
        next();
      });
    },

    function(pt, next){
      pt.test('Registries can choose to deny a publishing mechanism', function(t){

        t.end();
        next();
      });
    },
  ],
};

registry_tests = {
  message: 'Client can publish to multiple Registries',
  tests: [
    function(pt, next){
      pt.test('Distribution handles created on each Registry must be exactly the same', function(t){

        t.end();
        next();
      });
    },

    function(pt, next){
      pt.test('Registries can check for Semver conflicts between each other', function(t){

        t.end();
        next();
      });
    },

  ],
};
