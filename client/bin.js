'use strict';

var Resolver = require('./Resolver');
var pkg = require('../package.json');
var _ = require('lodash');
var async = require('async');

var program = require('commander');
process.nextTick(program.parse.bind(program, process.argv));
program.version(pkg.version);

var path = require('path');

var DB = require('./DB');
var cachedDB = new DB(path.join(__dirname, 'cached.json'));
var trustedDB = new DB(path.join(__dirname, 'trusted.json'));

var resolver = new Resolver(cachedDB, trustedDB);

program
  .command('resolve [package_names...]')
  .description('resolves the package locations')
  .action(function(package_names){
    Promise.all(package_names.map(function(pending_package){
      return resolver.resolve(pending_package);
    })).then(function(packages){
      console.log('found:', packages.map(function(resolved_package){
        return resolved_package.location;
      })[0]);
    }).catch(function(err){
      console.error('ERROR:', err);
    });
  });

program
  .command('trust [host]')
  .description('Allow this package manager use a server to resolve the location of a package')
  .option('-p --priority <n>', 'Set the priority this server should be used', parseInt, 0)
  .action(function(host, options){
    resolver.trust(host, options.priority);
    console.log('now trusting', host);
  });

program
  .command('untrust [host]')
  .description('Allow this package manager use a server to resolve the location of a package')
  .option('-c --keep-cache', 'Will keep cached modules')
  .action(function(host, options){
    resolver.untrust(host, !!options['keep-cache']);
    console.log('no longer trusting', host);
  });

program
  .command('publish')
  .description('Publishes your repo to your trusted hosts')
  .action(function(){

  });
