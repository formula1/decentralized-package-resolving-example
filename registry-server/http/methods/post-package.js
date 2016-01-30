'use strict';

/*

  As the registry
  - I download the Repository
  - grab the package.json from it
  - index the version
  - index the name
  - build a magnet uri
  - provide the torrent to distribution nodes

*/

var qs = require('qs');
var packageToSemver = require('../../../shared/transforms/semver/package-to-handle');
var handleToPackage = require('../../../shared/requests/handle-to-package');

module.exports = function(packages, distribution, req, res){
  var semver;
  var semver_token;
  var pkg;

  var repo_handle = qs.parse(req.url);
  var dist_handle;

  return handleToPackage(repo_handle).then(function(nPkg){
    pkg = nPkg;
    return packageToSemver(pkg);
  }).then(function(nSemver){
    semver = nSemver;
    semver_token = JSON.stringify(semver);
    return packages.has(semver_token).then(function(boo){
      if(boo) throw 'duplicate';
      return distribution.distribute(pkg);
    });
  }).then(function(nDist_handle){
    dist_handle = nDist_handle;
    return packages.add(semver_token, {
      semver: semver,
      repo_handle: repo_handle,
      dist_handle: dist_handle,
    });
  }).then(function(){
    res.statusCode = 200;
    res.end(JSON.stringify(dist_handle));
  }).catch(function(e){
    res.statusCode = 500;
    res.end(e.message);
  });
};
