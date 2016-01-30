'use strict';

var pkg = require('../package.json');
var program = require('commander');
process.nextTick(program.parse.bind(program, process.argv));
program.version(pkg.version);

var Client = require('./index');

var client = new Client(process.cwd());

program
  .command('resolve <package_names>')
  .description('resolves the package locations')
  .action(function(package_name){

    client.resolve(package_name).then(function(resolved_package){
      console.log('found:', resolved_package.distribution.handle);
    }).catch(function(err){
      console.error('RESOLVE:', err);
    });
  });

program
  .command('installs <package_names>')
  .description('installs the package')
  .action(function(package_name){
    client.install(package_name).then(function(resolved_package){
      console.log('found:', resolved_package.location);
    }).catch(function(err){
      console.error('INSTALL:', err);
    });
  });

program
  .command('trust [host]')
  .description('Allow this package manager use a server to resolve the location of a package')
  .option('-p --priority <n>', 'Set the priority this server should be used', parseInt, 0)
  .action(function(host, options){
    client.trust(host, options.priority).then(function(){
      console.log('now trusting', host);
    }).catch(function(e){
      console.error('TRUST:', e);
    });
  });

program
  .command('untrust [host]')
  .description('Allow this package manager use a server to resolve the location of a package')
  .action(function(host){
    client.untrust(host).then(function(){
      console.log('no longer trusting', host);
    }).catch(function(e){
      console.log('UNTRUST:', e);
    });
  });

program
  .command('publish')
  .description('Publishes your repo to your trusted hosts')
  .action(function(){
    client.publish().then(function(){
      console.log('you have been published');
    }).catch(function(e){
      console.error('PUBLISH:', e);
    });
  });
