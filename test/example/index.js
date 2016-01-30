'use strict';

var async = require('async');
var cp = require('child_process');
var path = require('path');
var split = require('split');
var fs = require('fs');
var tap = require('tap');

var mkdirp = require('mkdirp');
var aDir = path.resolve(__dirname, './server_a');
var bDir = path.resolve(__dirname, './server_b');
var clientDir = path.resolve(__dirname, '../../client');
var serverDir = path.resolve(__dirname, '../../registry-server');

var httpPortA = 3000;
var httpPortB = 3001;

var torPortA = 4000;
var torPortB = 4001;

// node ./server/bin.js start -d ./test/example/server_a -hp 3000 -tp 4000

// node ./client/bin.js resolve no_trusted_hosts

var aFork = cp.spawn(`node`, [`${serverDir}/bin.js`, 'start', '-d', aDir, '-h', httpPortA, '-t', torPortA], { stdio: 'pipe', detached: false });
var bFork = cp.spawn(`node`, [`${serverDir}/bin.js`, 'start', '-d', bDir, '-h', httpPortB, '-t', torPortB], { stdio: 'pipe', detached: false });
var clientCMD = `node ${clientDir}/bin.js`;
var clientCWD = path.resolve(__dirname, './client');
var clientOps = { cwd: clientCWD };

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

fs.writeFileSync(`${aDir}/packages.json`, '[]');
fs.writeFileSync(`${aDir}/registries.json`, '[]');
fs.writeFileSync(`${aDir}/untrusted.json`, '[]');
fs.writeFileSync(`${aDir}/distributors.json`, '[]');
mkdirp.sync(`${bDir}/distribution`);

fs.writeFileSync(`${bDir}/packages.json`, '[]');
fs.writeFileSync(`${bDir}/registries.json`, '[]');
fs.writeFileSync(`${bDir}/untrusted.json`, '[]');
fs.writeFileSync(`${bDir}/distributors.json`, '[]');
mkdirp.sync(`${bDir}/distribution`);

fs.writeFileSync(path.resolve(clientCWD, './registries.json'), '[]');

var fns;

tap.test('Example of resolving a module with different Registries', { bail: true }, function(t){
  setImmediate(function(){
    async.applyEachSeries(fns, t, function(err){
      fs.unlinkSync(`${aDir}/packages.json`, '[]');
      fs.unlinkSync(`${aDir}/registries.json`, '[]');
      fs.unlinkSync(`${aDir}/untrusted.json`, '[]');
      fs.unlinkSync(`${aDir}/distributors.json`, '[]');

      fs.unlinkSync(`${bDir}/packages.json`, '[]');
      fs.unlinkSync(`${bDir}/registries.json`, '[]');
      fs.unlinkSync(`${bDir}/untrusted.json`, '[]');
      fs.unlinkSync(`${bDir}/distributors.json`, '[]');

      fs.unlinkSync(path.resolve(clientCWD, './registries.json'), '[]');

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
        st.equal(line, `server waiting in directory ${aDir}`, 'Should recieve starting comment from server A');
        if(!fin) return fin = true;
        st.end();
        return next();
      });

      bLines.once('data', function(line){
        st.equal(line, `server waiting in directory ${bDir}`, 'Should recieve starting comment from server B');
        if(!fin) return fin = true;
        st.end();
        return next();
      });
    });
  },

  function(t, next){
    t.test('No hosts should emit an Error', function(st){
      cp.exec(`${clientCMD} resolve no_trusted_hosts`, clientOps, function(err, stdout, stderr){
        st.equal(stdout.toString(), '', 'stdout isn\'t written to when there is an error');
        st.ok(stderr, 'The cli wrote to the stderr');
        st.equal(stderr, 'RESOLVE: no hosts available\n', 'The Message is predictable');
        st.end();
        next();
      });
    });
  },

  function(t, next){
    t.test('Have hosts available but missing package', function(st){
      cp.exec(`${clientCMD} trust http://localhost:${httpPortA}`, clientOps, function(err, stdout, stderr){
        st.equal(stderr.toString(), '', 'stderr isn\'t written to when successful');
        st.equal(stdout.toString(), `now trusting http://localhost:${httpPortA}\n`, 'Trusting works');

        // ${clientCMD} resolve a_missing_package
        cp.exec(`${clientCMD} resolve a_missing_package`, clientOps, function(rErr, rStdout, rStderr){
          st.equal(rStdout.toString(), '', 'stdout isn\'t written to when there is an error');
          st.equal(rStderr.toString(), 'RESOLVE: [NotFoundError]\n', 'Not found written to stderr');
          st.end();
          next();
        });
      });
    });
  },

  function(t, next){
    t.test('After Adding Missing Package, Resolving is Possible', function(st){
      cp.exec(`${clientCMD} resolve an_added_package`, clientOps, function(err, stdout, stderr){
        st.equal(stdout.toString(), '', 'stdout isn\'t written to when there is an error');
        st.equal(stderr.toString(), 'RESOLVE: [NotFoundError]\n', 'ensure the package is still missing');
        aLines.once('data', function(line){
          st.equal(line, 'Added package an_added_package', 'A Registry confirmed the package has been added');
          cp.exec(`${clientCMD} resolve an_added_package`, clientOps, function(rErr, rStdout, rStderr){
            st.equal(rStderr.toString(), '', 'stderr isn\'t written to when successful');
            st.equal(rStdout.toString(), 'found: http://npmjs.com\n', 'Package has been found');
            st.end();
            next();
          });
        });

        aFork.stdin.write('package an_added_package 0.0.0 -h http://npmjs.com\n');
      });
    });
  },

  function(t, next){
    t.test('Registries that are not trusted will not be contacted', function(st){
      bLines.once('data', function(line){
        st.equal(line, 'Added package second_package', 'The second registry confirmed to have a package added');
        cp.exec(`${clientCMD} resolve second_package`, clientOps, function(err, stdout, stderr){
          st.equal(stdout.toString(), '', 'stdout isn\'t written to when there is an error');
          st.equal(stderr.toString(), 'RESOLVE: [NotFoundError]\n', 'Despite the package existsing, it cannot be found');
          st.end();
          next();
        });
      });

      bFork.stdin.write('package second_package 0.0.1 -h http://nodejs.org\n');
    });
  },

  function(t, next){
    t.test('After the Second host has been trusted, the packages are findable', function(st){
      cp.exec(`${clientCMD} trust http://localhost:${httpPortB}`, clientOps, function(err, stdout, stderr){
        st.equal(stderr.toString(), '', 'stderr isn\'t written to when successful');
        st.equal(stdout.toString(), `now trusting http://localhost:${httpPortB}\n`, 'Now trusting the other host');
        cp.exec(`${clientCMD} resolve second_package`, clientOps, function(rErr, rStdout, rStderr){
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
      cp.exec(`${clientCMD} untrust http://localhost:${httpPortA}`, clientOps, function(err, stdout, stderr){
        st.equal(stderr.toString(), '', 'stderr isn\'t written to when successful');
        st.equal(stdout.toString(), `no longer trusting http://localhost:${httpPortA}\n`, 'cli confirms we are no longer trusting one our our registries');
        cp.exec(`${clientCMD} resolve an_added_package`, clientOps, function(rSrr, rStdout, rStderr){
          st.equal(rStdout.toString(), '', 'stdout isn\'t written to when there is an error');
          st.equal(rStderr.toString(), 'RESOLVE: [NotFoundError]\n', 'searching for a package that belongs to that registry turns up as not found');
          st.end();
          next();
        });
      });
    });
  },

  function(t, next){
    t.test('But these packages may still be discovered convieniently by connecting peers', function(st){
      bLines.once('data', function(line){
        st.equal(line, `Added peer http://localhost:${httpPortA}`, 'Registries can add eachother as peers');
        cp.exec(`${clientCMD} resolve an_added_package`, clientOps, function(err, stdout, stderr){
          st.equal(stderr.toString(), '', 'stderr isn\'t written to when successful');
          st.equal(stdout.toString(), 'found: http://npmjs.com\n', 'This allows a package to be resolved even if its held by a peer');
          st.end();
          next();
        });
      });

      bFork.stdin.write(`peer http://localhost:${httpPortA}\n`);
    });
  },

];
