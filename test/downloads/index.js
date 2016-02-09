'use strict';

var cp = require('child_process');
var path = require('path');
var split = require('split');
var fs = require('fs');
var tap = require('tap');
var tar = require('tar-fs');
var nDD = require('node-dir-diff');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');

var __root = path.resolve(__dirname, '../../');
var File = require(path.resolve(__root, './shared/objects/File'));

var distWDir = path.resolve(__dirname, './distributor-server');
var pluginDir =  path.resolve(__dirname, '../../plugins');
var pluginWDir =  path.resolve(__dirname, './client');

var PluginLoader = require('../../shared/helpers/plugin-loader');

var distDir = path.resolve(__root, './distributor-server/bin.js');

var packagePath = path.join(__root, 'node_modules/abbrev');

if(!fs.existsSync(pluginWDir)) fs.mkdirSync(pluginWDir);

var pluginloader = new PluginLoader(pluginDir, pluginWDir);

var diff, cloneFolder, startServerProcess, stopServerProcess, itemRunner;

var isPackage = require('../../shared/semver/validate-package');

var cps = [];

// SIGTERM AND SIGINT will trigger the exit event.
process.once('SIGTERM', function(){
  process.exit(0);
});

process.once('SIGINT', function(){
  process.exit(0);
});

// And the exit event shuts down the child.
process.once('exit', function(){
  cps.forEach((c)=>{ c.kill('SIGHUP'); });
  rimraf.sync(distWDir);
  rimraf.sync(pluginWDir);
});

process.on('uncaughtException', function(e){
  console.log(e, e.stack);
  process.exit();
});

Promise.resolve().then(function(){
  return [

    { readable: path.join(distWDir, 'abbrev'), type: 'filesystem', prepare: cloneFolder, },
    { readable: 'http://localhost:3000/packages/abbrev', type: 'http', prepare: startServerProcess, cleanup: stopServerProcess, },
    { readable: 'ftp://localhost:3000/abbrev', type: 'ftp', prepare: startServerProcess, cleanup: stopServerProcess },
    { readable: 'magnet:?xt=urn:btih:05e2224e0939dd775d6ac9fcae4c1caca8517e14&dn=abbrev.tar&tr=udp%3A%2F%2Flocalhost%3A3000', type: 'torrent', prepare: startServerProcess, cleanup: stopServerProcess },

    // { readable: 'magnet:?xt=urn:btih:bce9417d938c883bedb43c2f888caba1ab11826b&dn=abbrev&tr=udp%3A%2F%2Flocalhost%3A3000', type: 'torrent', prepare: startServerProcess, cleanup: stopServerProcess },

    //{ readable: 'magnet:?xt=urn:btih:bce9417d938c883bedb43c2f888caba1ab11826b&dn=abbrev&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.io', type: 'torrent', prepare: startServerProcess, cleanup: stopServerProcess },

    // { readable: 'http://repo.com/something.git', type: 'git' },
  ].reduce(function(p, item){
    return p.then(function(){
      return itemRunner(item);
    });
  }, Promise.resolve());
}).catch(function(e){
  console.log(e);
}).then(function(){
  tap.end();
  process.exit();
});

cloneFolder = function(){
  return new Promise(function(res, rej){
    mkdirp(distWDir, function(err){
      if(err) return rej(err);
      tar.pack(path.join(__root, 'node_modules/abbrev'))
      .pipe(tar.extract(path.join(distWDir, 'abbrev')))
      .on('finish', res)
      .on('error', rej);
    });
  });
};

startServerProcess = function(item){
  var type = item.type;
  fs.writeFileSync(path.join(distWDir, 'packages.json'), '[]');
  var c = cp.spawn('node', [distDir, 'start', distWDir], { stdio: 'pipe' });
  return new Promise(function(res, rej){
    c.messages = c.stdout.pipe(split());
    var list, to;
    c.messages.on('data', list = function(line){
      if(line === 'distribution server online'){
        c.messages.removeListener('data', list);
        clearTimeout(to);
        res(c);
      }
    });

    to = setTimeout(function(){
      c.messages.removeListener('data', list);
      rej('timed out');
    }, 5000);
  }).then(function(){
    return new Promise(function(res, rej){
      var list;
      c.stderr.pipe(process.stderr);
      c.messages.on('data', list = function(line){
        if(line !== `listening for ${type} at 3000`) return rej('expected listening as line');
        c.messages.removeListener('data', list);

        c.messages.on('data', list = function(tline){
          if(tline !== 'added abbrev') return rej('expected add abrev as line');
          c.messages.removeListener('data', list);
          res(c);
        });

        c.stdin.write(`package abbrev "${packagePath}" \n`);
      });

      c.stdin.write(`serve ${type} 3000 \n`);
    });
  }).then(function(){
    cps.push(c);
    c.on('exit', function(){
      cps.splice(cps.indexOf(c), 1);
    });

    return c;
  });
};

stopServerProcess = function(item, proc){
  return new Promise(function(res){
    proc.once('close', res);

    proc.kill('SIGTERM');
  });
};

diff = function(a, b){
  var dd = new nDD.Dir_Diff([a, b], 'full');

  return new Promise(function(res, rej){
    dd.compare(function(err, result){
      if(err) return rej(err);
      res(result);
    });
  });
};

itemRunner = function(item){
  return (item.prepare ? item.prepare(item) : Promise.resolve()).then(function(prepOut){
    return new Promise(function(fRes){
      tap.test(`Testing Downloadable plugin type ${item.type}`, { bail: true }, function(t){
        return Promise.resolve().then(function(){
          return new Promise(function(res){
            return t.test('readable to handle', function(ct){
              return pluginloader.readableToHandle(item.readable).then(function(handle){
                ct.equal(handle.type, item.type, 'Readable was processed by the correct plugin');
                ct.end();
                res(handle);
              });
            });
          });
        }).then(function(handle){
          return new Promise(function(res){
            return t.test('handle to consumable', function(ct){
              return pluginloader.handleToConsumable(handle).then(function(consumable){
                ct.ok(consumable instanceof File, 'handleToConsumable always returns a file');
                ct.end();
                res(consumable);
              });
            });
          });
        }).then(function(consumable){
          return new Promise(function(res){
            return t.test('consumable to package', function(ct){
              return pluginloader.consumableToPackage(consumable).then(function(package_folder){
                ct.ok(package_folder instanceof File, 'consumableToPackage always returns a file');
                return isPackage(package_folder).then(function(boo){
                  ct.ok(boo, 'consumableToPackage always returns a package');
                  return diff(package_folder.filename, packagePath);
                }).then(function(result){
                  ct.equal(result.deviation, 0, 'The original folder is exactly the same as the packaged');
                  ct.end();
                  res();
                });
              });
            });
          });
        }).catch(function(e){
          console.log('error', e.stack);
        }).then(function(){
          return (item.cleanup ? item.cleanup(item, prepOut) : Promise.resolve()).then(function(){
            t.end();
            fRes();;
          });
        });
      });
    });
  });
};
