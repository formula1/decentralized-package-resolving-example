'use strict';

var program = require('commander');
var split = require('split');
var shlex = require('shell-quote');

require('./index')().then(function(ret){
  var registries = ret.dbs.registries;

  program
  .command('trust [registry]')
  .description('Allow this package manager use a server to resolve the location of a package')
  .action(function(registry){
    registries.add(registry).then(function(){
      console.log('now trusting', registry);
    }).catch(function(e){
      console.error(e);
    });
  });

  program
  .command('untrust [host]')
  .description('Allow this package manager use a server to resolve the location of a package')
  .option('-k --keep-torrents', 'Will keep cached torrents')
  .action(function(registry){
    registry.remove(registry).then(function(){
      console.log('no longer trusting', registry);
    }).catch(function(e){
      console.error(e);
    });
  });

  process.stdin.pipe(split()).on('data', function(line){
    program.parse([void 0, void 0].concat(shlex(line)));
  });

  console.log('distribution server online');
});
