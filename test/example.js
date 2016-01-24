'use strict';

var async = require('async');
var cp = require('child_process');
var path = require('path');
var split = require('split');
var expect = require('expect');
var fs = require('fs');

var aDir = path.resolve(__dirname, './server_a');
var bDir = path.resolve(__dirname, './server_b');
var clientDir = path.resolve(__dirname, '../client');
var serverDir = path.resolve(__dirname, '../server');

var aFork = cp.spawn(`node`, [`${serverDir}/bin.js`, 'start', '-d', aDir, '-p', 8080], { stdio: 'pipe', detached: false });
var bFork = cp.spawn(`node`, [`${serverDir}/bin.js`, 'start', '-d', bDir, '-p', 3000], { stdio: 'pipe', detached: false });

var clientCMD = `node ${clientDir}/bin.js`;

aFork.on('error', function(e){
  throw e;
});

bFork.on('error', function(e){
  throw e;
});

process.on('uncaughtException', function(e){

  console.log(e, e.stack);
  aFork.kill('SIGHUP');
  bFork.kill('SIGHUP');
  process.exit();
});

var aLines = aFork.stdout.pipe(split());//.on('data', console.log.bind(console));
var bLines = bFork.stdout.pipe(split());

fs.writeFileSync(`${aDir}/packages.json`, '{}');
fs.writeFileSync(`${aDir}/trusted.json`, '[]');
fs.writeFileSync(`${aDir}/untrusted.json`, '[]');
fs.writeFileSync(`${bDir}/packages.json`, '{}');
fs.writeFileSync(`${bDir}/trusted.json`, '[]');
fs.writeFileSync(`${bDir}/untrusted.json`, '[]');

fs.writeFileSync(`${clientDir}/cached.json`, '{}');
fs.writeFileSync(`${clientDir}/trusted.json`, '[]');

var fns;

setImmediate(function(){
  async.series(fns, function(){
    console.log('alldone');
    aFork.kill('SIGHUP');
    bFork.kill('SIGHUP');
    process.exit();
  });
});

fns = [
  function(next){
    console.log('starting servers');
    var fin = 0;
    aLines.once('data', function(line){
      expect(line).toEqual(`server started in directory ${aDir}`);
      if(fin) return next();
      fin = true;
    });

    bLines.once('data', function(line){
      expect(line).toEqual(`server started in directory ${bDir}`);
      if(fin) return next();
      fin = true;
    });
  },

  function(next){
    console.log('no hosts');
    cp.exec(`${clientCMD} resolve no_trusted_hosts`, function(err, stdout, stderr){
      expect(stderr.toString()).toEqual('ERROR: no hosts available\n');
      next();
    });
  },

  function(next){
    console.log('have host but missing package')
    cp.exec(`${clientCMD} trust http://localhost:8080`, function(err, stdout, stderr){
      expect(stdout.toString()).toEqual('now trusting http://localhost:8080\n');
      cp.exec(`${clientCMD} resolve a_missing_package`, function(err, stdout, stderr){
        expect(stderr.toString()).toEqual('ERROR: not found\n');
        next();
      });
    });
  },

  function(next){
    console.log('missing package gets added');
    cp.exec(`${clientCMD} resolve an_added_package`, function(err, stdout, stderr){
      expect(stderr.toString()).toEqual('ERROR: not found\n');
      aLines.once('data', function(line){
        expect(line).toEqual('Added package an_added_package');
        cp.exec(`${clientCMD} resolve an_added_package`, function(err, stdout, stderr){
          expect(stdout.toString()).toEqual('found: http://npmjs.com\n');
          next();
        });
      });

      aFork.stdin.write('package an_added_package -u http://npmjs.com\n');
    });
  },

  function(next){
    console.log('Second hosts packages can not be requested');
    bLines.once('data', function(line){
      expect(line).toEqual('Added package second_package');
      cp.exec(`${clientCMD} resolve second_package`, function(err, stdout, stderr){
        expect(stderr.toString()).toEqual('ERROR: not found\n');
        next();
      });
    });

    bFork.stdin.write('package second_package -u http://nodejs.org\n');
  },

  function(next){
    console.log('after the second host is trusted, the package is available');
    cp.exec(`${clientCMD} trust http://localhost:3000`, function(err, stdout, stderr){
      expect(stdout.toString()).toEqual('now trusting http://localhost:3000\n');
      cp.exec(`${clientCMD} resolve second_package`, function(err, stdout, stderr){
        expect(stdout.toString()).toEqual('found: http://nodejs.org\n');
        next();
      });
    });
  },

  function(next){
    console.log('first hosts packages are no longer available when no longer trusted');
    cp.exec(`${clientCMD} untrust http://localhost:8080`, function(err, stdout, stderr){
      expect(stdout.toString()).toEqual('no longer trusting http://localhost:8080\n');
      cp.exec(`${clientCMD} resolve an_added_package`, function(err, stdout, stderr){
        expect(stderr.toString()).toEqual('ERROR: not found\n');
        next();
      });
    });
  },

  function(next){
    console.log('But these packages may still be discovered convieniently by connecting peers');
    bLines.once('data', function(line){
      expect(line).toEqual('Added peer http://localhost:8080');
      cp.exec(`${clientCMD} resolve an_added_package`, function(err, stdout, stderr){
        expect(stdout.toString()).toEqual('found: http://npmjs.com\n');
        next();
      });
    });

    bFork.stdin.write('peer http://localhost:8080\n');
  },

];
