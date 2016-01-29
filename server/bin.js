'use strict';

var split = require('split');
var pkg = require('../package.json');

var program = require('commander');

program.version(pkg.version);

setImmediate(program.parse.bind(program, process.argv));

var RS = require('./index');
var server;

program
  .command('start')
  .description('starts the server')
  .option('-d, --directory <directory>', 'choose the directory it wants to run in')
  .option('-hp, --http_port <number>', 'choose the port the http server will listen to')
  .option('-tp, --torrent_port <number>', 'choose the port the torrent server will listen to')
  .action(function(options){
    if(!options.directory){
      throw new Error('starting the server requires a directory');
    }

    if(!options.torrent_port){
      throw new Error('starting the server requires a torrent_port');
    }

    if(!options.http_port){
      throw new Error('starting the server requires a http_port');
    }

    server = RS(options.directory, options.http_port, options.torrent_port);

    console.log(`server ${options.port ? 'started' : 'waiting'} in directory ${options.directory}`);
    process.stdin.pipe(split()).on('data', function(line){
      program.parse([void 0, void 0].concat(line.split(' ')));
    });
  });

program
  .command('exit')
  .description('exits the process')
  .action(function(){
    process.exit(1);
  });

program
  .command('stop')
  .description('stops the server')
  .action(function(){
    server.close();
  });

program
  .command('package [package_name]')
  .description('Allow a repository to be discoverable')
  .option('-r, --remove', 'removes the package as servable')
  .option('-u, --url [url]', 'The package url')
  .action(function(package_name, options){
    if(options.remove){
      server.removePackage(package_name);
      console.log('Removed package', package_name);
      return;
    }

    if(!options.url) throw new Error('need sa url');
    server.addPackage({
      name: package_name,
      location: options.url,
    });
    console.log('Added package', package_name);
  });

program
  .command('peer [peer_ip]')
  .description('Allow peers to resolve a unfound package name for this server')
  .option('-r, --remove', 'Removes the ip from peers')

//  .option('-c', '--copy-untrusted', 'If this ip does not trust a request, untrust the ip as well')
  .action(function(peer_ip, options){
    if(options.remove){
      server.removePeer(peer_ip);
      console.log('Removed peer', peer_ip);
      return;
    }

    server.addPeer(peer_ip);
    console.log('Added peer', peer_ip);
  });

program
  .command('ignore [ip]')
  .description('Prevent ips from connecting to this server')
  .option('-r, --remove', 'Removes the ip from untrusted list')

//  .option('-m', '--mute', 'Tells the ip 404 instead of 403')
  .action(function(ip, options){
    if(options.remove){
      server.removeUntrusted(ip);
      console.log('Removed untrusted', ip);
      return;
    }

    server.addUntrusted(ip);
    console.log('Added untrusted', ip);
  });
