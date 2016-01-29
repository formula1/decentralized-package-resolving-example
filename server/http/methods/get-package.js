'use strict';

var qs = require('qs');
var handleToDistHandle = require('../../../shared/requests/semver/handle-to-distributor-handle');

module.exports = function(packageDB, registryDB, distribution, req, res){
  req.query = qs.parse(req.url, true);

  return packageDB.get(JSON.stringify(req.query)).then(function(pkg){
    if(!pkg) throw 'not found';
    return distribution.updateHandle(pkg).then(function(nPkg){
      if(!nPkg) throw 'not found';
      return [nPkg];
    });
  }).catch(function(e){
    if(e !== 'not found') throw e;

    // only forwarding once for now
    if(req.forwarded.length > 1){
      throw 'not found';
    }

    return registryDB.get().then(function(registries){
      return handleToDistHandle(
        req.query, registries,
        { 'x-forwarded-for': req.connection.remoteAddress }
      );
    });
  }).then(function(pkgs){
    if(!pkgs.length) throw 'not found';

    res.statusCode = 200;
    res.end(JSON.stringify(pkgs));
  }).catch(function(e){
    if(e === 'not found'){
      res.statusCode = 404;
      return res.end();
    }else{
      res.statusCode = 500;
      res.end(e.message);
    }
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
