'use strict';

var async = require('async');
var cp = require('child_process');
var path = require('path');
var split = require('split');
var fs = require('fs');
var tap = require('tap');

var aDir = path.resolve(__dirname, './server_a');
var bDir = path.resolve(__dirname, './server_b');
var clientDir = path.resolve(__dirname, '../client');
var serverDir = path.resolve(__dirname, '../server');

var aFork = cp.spawn(`node`, [`${serverDir}/bin.js`, 'start', '-d', aDir, '-p', 8080], { stdio: 'pipe', detached: false });
var bFork = cp.spawn(`node`, [`${serverDir}/bin.js`, 'start', '-d', bDir, '-p', 3000], { stdio: 'pipe', detached: false });
var clientCMD = `node ${clientDir}/bin.js`;

aFork.on('error', function(e){
  console.error(e);
});

bFork.on('error', function(e){
  console.error(e);
});

aFork.stderr.pipe(process.stderr);
bFork.stderr.pipe(process.stderr);

// SIGTERM AND SIGINT will trigger the exit event.
process.once('SIGTERM', function(){
  process.exit(0);
});

process.once('SIGINT', function(){
  process.exit(0);
});

// And the exit event shuts down the child.
process.once('exit', function(){
  aFork.kill('SIGHUP');
  bFork.kill('SIGHUP');
});

process.on('uncaughtException', function(e){
  console.log(e, e.stack);
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

tap.test('Example of resolving a module with different Registries', { bail: true }, function(t){
  setImmediate(function(){
    async.applyEachSeries(fns, t, function(err){
      if(err) return t.bailout(err.message);
      t.end();
      process.exit();
    });
  });
});

fns = [
  function(t, next){
    t.test('Servers Start without error', function(st){
      var fin = 0;
      aLines.once('data', function(line){
        st.equal(line, `server started in directory ${aDir}`, 'Should recieve starting comment from server A');
        if(!fin) return fin = true;
        st.end();
        return next();
      });

      bLines.once('data', function(line){
        st.equal(line, `server started in directory ${bDir}`, 'Should recieve starting comment from server B');
        if(!fin) return fin = true;
        st.end();
        return next();
      });
    });
  },

  function(t, next){
    t.test('No hosts should emit an Error', function(st){
      cp.exec(`${clientCMD} resolve no_trusted_hosts`, function(err, stdout, stderr){
        st.equal(stdout.toString(), '', 'stdout isn\'t written to when there is an error');
        st.ok(stderr, 'The cli wrote to the stderr');
        st.equal(stderr, 'ERROR: no hosts available\n', 'The Message is predictable');
        st.end();
        next();
      });
    });
  },

  function(t, next){
    t.test('Have hosts available but missing package', function(st){
      cp.exec(`${clientCMD} trust http://localhost:8080`, function(err, stdout, stderr){
        st.equal(stderr.toString(), '', 'stderr isn\'t written to when successful');
        st.equal(stdout.toString(), 'now trusting http://localhost:8080\n', 'Trusting works');

        cp.exec(`${clientCMD} resolve a_missing_package`, function(rErr, rStdout, rStderr){
          st.equal(rStdout.toString(), '', 'stdout isn\'t written to when there is an error');
          st.equal(rStderr.toString(), 'ERROR: not found\n', 'Not found written to stderr');
          st.end();
          next();
        });
      });
    });
  },

  function(t, next){
    t.test('After Adding Missing Package, Resolving is Possible', function(st){
      cp.exec(`${clientCMD} resolve an_added_package`, function(err, stdout, stderr){
        st.equal(stdout.toString(), '', 'stdout isn\'t written to when there is an error');
        st.equal(stderr.toString(), 'ERROR: not found\n', 'ensure the package is still missing');
        aLines.once('data', function(line){
          st.equal(line, 'Added package an_added_package', 'A Registry confirmed the package has been added');
          cp.exec(`${clientCMD} resolve an_added_package`, function(rErr, rStdout, rStderr){
            st.equal(rStderr.toString(), '', 'stderr isn\'t written to when successful');
            st.equal(rStdout.toString(), 'found: http://npmjs.com\n', 'Package has been found');
            st.end();
            next();
          });
        });

        aFork.stdin.write('package an_added_package -u http://npmjs.com\n');
      });
    });
  },

  function(t, next){
    t.test('Registries that are not trusted will not be contacted', function(st){
      bLines.once('data', function(line){
        st.equal(line, 'Added package second_package', 'The second registry confirmed to have a package added');
        cp.exec(`${clientCMD} resolve second_package`, function(err, stdout, stderr){
          st.equal(stdout.toString(), '', 'stdout isn\'t written to when there is an error');
          st.equal(stderr.toString(), 'ERROR: not found\n', 'Despite the package existsing, it cannot be found');
          st.end();
          next();
        });
      });

      bFork.stdin.write('package second_package -u http://nodejs.org\n');
    });
  },

  function(t, next){
    t.test('After the Second host has been trusted, the packages are findable', function(st){
      cp.exec(`${clientCMD} trust http://localhost:3000`, function(err, stdout, stderr){
        st.equal(stderr.toString(), '', 'stderr isn\'t written to when successful');
        st.equal(stdout.toString(), 'now trusting http://localhost:3000\n', 'Now trusting the other host');
        cp.exec(`${clientCMD} resolve second_package`, function(rErr, rStdout, rStderr){
          st.equal(rStderr.toString(), '', 'stderr isn\'t written to when successful');
          st.equal(rStdout.toString(), 'found: http://nodejs.org\n', 'The package can now be resolved');
          st.end();
          next();
        });
      });
    });
  },

  function(t, next){
    t.test('first hosts packages are no longer available when no longer trusted', function(st){
      cp.exec(`${clientCMD} untrust http://localhost:8080`, function(err, stdout, stderr){
        st.equal(stderr.toString(), '', 'stderr isn\'t written to when successful');
        st.equal(stdout.toString(), 'no longer trusting http://localhost:8080\n', 'cli confirms we are no longer trusting one our our registries');
        cp.exec(`${clientCMD} resolve an_added_package`, function(rSrr, rStdout, rStderr){
          st.equal(rStdout.toString(), '', 'stdout isn\'t written to when there is an error');
          st.equal(rStderr.toString(), 'ERROR: not found\n', 'searching for a package that belongs to that registry turns up as not found');
          st.end();
          next();
        });
      });
    });
  },

  function(t, next){
    t.test('But these packages may still be discovered convieniently by connecting peers', function(st){
      bLines.once('data', function(line){
        st.equal(line, 'Added peer http://localhost:8080', 'Registries can add eachother as peers');
        cp.exec(`${clientCMD} resolve an_added_package`, function(err, stdout, stderr){
          st.equal(stderr.toString(), '', 'stderr isn\'t written to when successful');
          st.equal(stdout.toString(), 'found: http://npmjs.com\n', 'This allows a package to be resolved even if its held by a peer');
          st.end();
          next();
        });
      });

      bFork.stdin.write('peer http://localhost:8080\n');
    });
  },

];
