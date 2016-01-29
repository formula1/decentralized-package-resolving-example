'use strict';

/*

Ideally there will be many ways to upload a package
- Direct with post request
- Allowing the registry to retrieve the repository
- Uploading it as a torrent and allowing it to be discovered there
- Possibly even semver with a registry or two

*/

var git = require('./git/package-to-handle');

module.exports = function(pkg){
  return git(pkg);
};
