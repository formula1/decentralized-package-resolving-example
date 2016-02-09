'use strict';

var program = require('commander');
var split = require('split');
var shlex = require('shell-quote');

var DistributionServer = require('./index.js');

var dist_server;

process.nextTick(program.parse.bind(program, process.argv));

program
  .command('start [directory]')
  .description('Starts the distribution server')
  .action(function(directory){
    dist_server = new DistributionServer(directory || process.cwd());
    process.stdin.pipe(split()).on('data', function(line){
      program.parse([void 0, void 0].concat(shlex.parse(line)));
    });

    console.log('distribution server online');
  });

program
  .command('package <name> <file_path>')
  .description('Add a package')
  .action(function(name, pkg){
    dist_server.addPackage(name, pkg).then(function(){
      console.log('added', name);
    }).catch(function(e){
      console.error('Package ERROR', e);
    });
  });

program
  .command('serve <type> <port>')
  .description('Distribute via a certian service')
  .action(function(type, port){
    dist_server.listen(type, port).then(function(){
      console.log('listening for', type, 'at', port);
    }).catch(function(e){
      console.error('Listen ERROR', e.stack);
    });
  });
