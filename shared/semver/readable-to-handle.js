'use strict';

/*

  https://docs.npmjs.com/cli/install

  a) a folder containing a program described by a package.json file
  b) a gzipped tarball containing (a)
  c) a url that resolves to (b)
  d) a <name>@<version> that is published on the registry (see npm-registry) with (c)
  e) a <name>@<tag> that points to (d)
  f) a <name> that has a "latest" tag satisfying (e)
  g) a <git remote url> that resolves to (a)

*/

var SemVer = require('semver');

module.exports = function(token){
  token = token.split('@');
  var name = token.shift();
  var version = token.join('@');

  if(name.length === 0) throw new Error('missing a name');
  if(version.length === 0){
    return {
      name: name,
      tag: 'latest',
    };
  }

  if(!SemVer.validRange(version)){
    if(version.length === 0){
      return {
        name: name,
        tag: version,
      };
    }
  }

  return {
    name: name,
    version: version,
  };
};
