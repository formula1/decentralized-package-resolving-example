'use strict';

var qs = require('qs');
var handleToDistHandle = require('../../../shared/semver/handle-to-distributor-handle');
var SemVer = require('semver');

var NotFoundError = require('../../../shared/errors/NotFound');

module.exports = function(packageDB, registryDB, distribution, req, res, next){
  req.query = qs.parse(req.url.split('?').slice(1).join('?'));

  var semver;

  return Promise.resolve(req.query).then(function(nSemver){
    semver = nSemver;
    if(semver.version && SemVer.validRange(semver.version)){
      return packageDB.get(JSON.stringify(semver));
    }else{
      return packageDB.get().then(function(list){
        if(list.length === 0) return false;
        var filteredList = list.filter(function(item){ return item.semver.name === semver.name; });

        // at some point tags need to be implemented But that is not within the scope of this project
        return filteredList[0];
      });
    }
  }).then(function(pkg){
    if(!pkg) throw new NotFoundError(req.query.name, 'packages database');
    return distribution.updateHandle(pkg).then(function(nPkg){
      return [nPkg];
    });
  }).catch(function(e){
    if(!(e instanceof NotFoundError) && e.message !== 'No Distributors Available') throw e;

    // only forwarding once for now
    if(req.forwarded.length > 1){
      throw new NotFoundError(semver.name);
    }

    return registryDB.get().then(function(registries){
      return handleToDistHandle(
        req.query, registries,
        { 'x-forwarded-for': req.connection.remoteAddress }
      );
    });
  }).then(function(pkgs){
    if(!pkgs.length) throw new NotFoundError(semver.name, 'peers');

    res.statusCode = 200;
    res.end(JSON.stringify(pkgs));
  }).catch(function(e){
    if(e instanceof NotFoundError) return next();
    next(e);
  });
};
/*
{
  semver: pkg.semver,
  repository: pkg.repository,
  distribution: {
    distributors: this.distributors,
    handle: pkg.distribution.handle,
    transform: pkg.distribution.transform,
  },
},
*/
