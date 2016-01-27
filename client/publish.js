'use strict';

var async = require('async');

var request = require('request');
var qs = require('qs');

var Git = require('nodegit');
var magnetUri = require('magnet-uri');
var registryHelpers = require('./registry-helpers');

var remotes = ['publish', 'origin'];

var getRepoInfo, publishToTrustedRegistries, validateHashes;

module.exports = function(trustedDB){
  var badRegistryFn = registryHelpers.badRegistry.bind(registryHelpers);
  getRepoInfo().then(function(repoInfo){
    return publishToTrustedRegistries(trustedDB, repoInfo, badRegistryFn);
  }).then(function(magnets){
    return validateHashes(magnets, badRegistryFn);
  }).catch(function(e){
    if(e.message !== 'Registries are hashes are not the same') throw e;
    return registryHelpers.notSynced('hashes', e.hashes);
  }).then(function(magnetLink){
    return magnetLink;
  });
};

getRepoInfo = function(){
  var repoInfo = {};
  return Git.Repository.open(process.cwd()).then(function(repo){
    return repo.getCurrentBranch().then(function(reference){
      repoInfo.branch = reference.name();
      return repo.getHeadCommit();
    }).then(function(commit){
      repoInfo.commit = commit.sha();
      return new Promise(function(res, rej){
        async.some(remotes,
          repo.getRemote.bind(repo),
          function(err, remote){
            if(err) return rej(err);
            res(remote);
          }
        );
      });
    }).then(function(remote){
      repoInfo.remote = remote.url();
      return repoInfo;
    });
  });
};

publishToTrustedRegistries = function(trustedDB, repoInfo, badRegistryFn){
  return trustedDB.get().then(function(trusted){
    return new Promise(function(res, rej){
      var query = qs.stringify({
        repoInfo: repoInfo,
        registries: trusted.map(function(registry){
          return registry.location;
        }),
      });

      async.map(trusted, function(registry, next){
        request.get(`${registry.location}/publish?${query}`, function(err, response, body){
          if(err){
            return badRegistryFn(registry, err, next);
          }

          if(response.statusCode !== '200'){
            return badRegistryFn(registry, new Error(`response returned ${response.statusCode}`), next);
          }

          body = body.toString('utf-8');
          body.registry = registry;
          return next(void 0, body);

        });
      },

      function(err, magnetUris){
        if(err.length) return rej(err);
        res(magnetUris);
      });
    });
  });
};

validateHashes = function(magnets){
  var uniqueHashes = {};
  return new Promise(function(res, rej){
    async.each(magnets, function(magnet, next){
      var registry = magnet.registry;
      delete magnet.registry;
      try{
        magnet = magnetUri.decode(magnet);
      }catch(decodeErr){
        return next(decodeErr);
      }

      magnet.registry = registry;

      if(!(magnet.infoHash in uniqueHashes)){
        uniqueHashes[magnet.infoHash] = [magnet];
      }else{
        uniqueHashes[magnet.infoHash].push(magnet);
      }

      next();
    },

    function(err){
      if(err) return rej(err);
      if(Object.keys(uniqueHashes).length > 1){
        return registryHelpers.notSynced('hashes', uniqueHashes, function(syncErr){
          if(syncErr) return rej(syncErr);
          res(magnets[0]);
        });
      }

      res(magnets[0]);
    });
  });
};

validateHashes = function(magnets, badRegistryFn){
  var uniqueHashes = {};
  return new Promise(function(res, rej){
    async.each(magnets, function(magnet, next){
      var registry = magnet.registry;
      delete magnet.registry;
      try{
        magnet = magnetUri.decode(magnet);
      }catch(decodeErr){
        return badRegistryFn(registry, new Error('magnet-uri not formatted correctly'), next);
      }

      magnet.registry = registry;

      if(!(magnet.infoHash in uniqueHashes)){
        uniqueHashes[magnet.infoHash] = [magnet];
      }else{
        uniqueHashes[magnet.infoHash].push(magnet);
      }

      next();
    },

    function(err){
      if(err) return rej(err);
      if(Object.keys(uniqueHashes).length > 1){
        var syncErr = new Error('Registries are hashes are not the same');
        syncErr.hashes = uniqueHashes;
        return rej(syncErr);
      }

      res(magnets[0]);
    });
  });
};
