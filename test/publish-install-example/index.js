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

var registryInfo = {
  dir: path.resolve(__dirname, './server_b'),
};

var registry = cp.spawn('node',
  [`${path.resolve(__dirname, '../../server', 'bin.js')}`, 'start', '-d', registryInfo.dir, '-p', 8080],
  { cwd: path.resolve(__dirname, './distributor'), stdio: 'pipe', detatched: false }
);

var distributor = cp.spawn('node',
  [`${path.resolve(__dirname, '../../distributor-server/', 'bin.js')}`],
  { cwd: path.resolve(__dirname, './distributor'), stdio: 'pipe', detatched: false }
);

var gitRepo = cp.spawn('node',
  [`${path.resolve(__dirname, './repository/', 'bin.js')}`],
  { cwd: path.resolve(__dirname, './repository'), stdio: 'pipe', detatched: false }
);

var clientInfo = {
  bin: path.resolve(__dirname, '../../client/bin.js'),
  ops: {
    cwd: path.resolve(__dirname, './client'),
  },
};



var bFork = cp.spawn(`node`, [`${serverDir}/bin.js`, 'start', '-d', bDir, '-p', 3000], { stdio: 'pipe', detached: false });

var clientCMD = `node ${clientDir}/bin.js`;

aFork.on('error', function(e){
  console.error(e);
});

bFork.on('error', function(e){
  console.error(e);
});

registry.stderr.pipe(process.stderr);
distributor.stderr.pipe(process.stderr);
gitRepo.stderr.pipe(process.stderr);

/* FLow */

/*

git init
git touch ./index.js
npm init (enter, enter, enter, enter, etc)
git remote add origin http://localhost:7000
git add --all
git commit -m "A commit"
git push origin master

*/

/*

# Client
  - client publish
    - sends remote, branch, hash, package.json
# Registries
  - git clone http://localhost:7000
  - git checkout branch
  - git checkout hash
  - read package.json from git repository
  - if(git.package !== request.package) throw error
  - if(package.name in this.db){
      if(git.firstHash !== this.db[package.name].firstHash){
        throw error
      }
    }
  - create tor?
  - Create a Magnet Link
  - toStore = {magnet: magnet, repoInfo: repoInfo, package: package};
  - Store toStore and Index by package.name and index that by package.version
  - responds to client - Preparing to Distribute
  - Order Distributors to build the tor file
# Distributor
  - git clone http://localhost:7000
  - git checkout branch
  - git checkout hash
  - create tor
  - Respond to Registry the hash
# Registry
  - Checks if local magnet hash is === Distributor.hash
    - no - something went wrong
  - Checks if Distributor serves (should not until given the order)
  - after a random interval
  - Check if Distributor serves (should not until given the order)
  - Tell Distributor to serve the file
  - For Each Other Distributor (in series)
    - Tell them to download the file
*/

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
