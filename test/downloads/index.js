'use strict';

var Client = require('../../client');

var cp = require('child_process');
var path = require('path');
var split = require('split');
var fs = require('fs');
var tap = require('tap');
var tar = require('tar-fs');

var mkdirp = require('mkdirp');
var __root = path.resolve(__dirname, '../../');
var distWDir = path.resolve(__dirname, './distribution-server');
var clientWDir = path.resolve(__dirname, './client');

var distDir = path.resolve(__root, './distribution-server/bin.js');

var packagePath = path.join(__root, 'node_modules/abbrev');

var client = new Client(clientWDir);

var createChild = function(type){
  var c = cp.spawn(distDir, ['start'], { cwd: __dirname, stdio: 'pipe' });
  c.stdin.write(`package "${packagePath}" `)
};

var isPackage = require('../../shared/semver/validate-package');

new Promise(function(res, rej){
  mkdirp(distWDir, function(err){
    if(err) return rej(err);
    tar.pack(path.join(__root, 'node_modules/abbrev'))
    .pipe(fs.createWriteStream(path.join(distWDir, 'abbrev.tar')))
    .on('finish', res)
    .on('error', rej);
  });
}).then(function(){
  var pluginloader = client.pluginloader;
  return Promise.all([
    { readable: 'http://url.com', type: 'http', needServer: true, },
    { readable: 'magnet://etc12345643134', type: 'torrent', needServer: true, },
    { readable: '/file/server', type: 'filesystem', needServer: false, },

    // { readable: 'http://repo.com/something.git', type: 'git' },
    // { readable: 'ftp://server.com', type: 'ftp' },
  ].map(function(item){

    return new Promise(function(res, rej){
      tap.test(`Downloading type ${item.type}`, function(t){
        pluginloader.readableToHandle(item.readable).then(function(handle){
          t.equal(handle.type, item.type, 'Readable was processed by the correct plugin');
          return pluginloader.handleToConsumable(handle);
        }).then(function(file){
          t.ok(file instanceof File, 'handleToConsumable always returns a file');
          return pluginloader.consumableToPackage(file);
        }).then(function(package_folder){
          t.ok(package_folder instanceof File, 'consumableToPackage always returns a file');
          return isPackage(package_folder).then(function(boo){
            t.ok(boo, 'consumableToPackage always returns a package');
            return diff(package_folder, orig_folder);
          });
        }).then(function(diffs){
          t.notOk(diffs.length, 'There should be no differences between the downloaded directory and the expected');
          t.end();
          res();
        }).catch(function(e){
          t.error(e);
          res();
        });
      });
    });
  }));
}).then(function(){
  tap.end();
}).catch(function(e){
  tap.error(e);
});
