
/*

  As the registry
  - I download the Repository
  - grab the package.json from it
  - index the version
  - index the name
  - build a magnet uri
  - provide the torrent to distribution nodes

*/

'use strict';

var qs = require('qs');

var fromGitRepoGetPackageJSON;

module.exports = function(swarm, semVerDB, query){
  query = qs.parse(query);
  fromGitRepoGetPackageJSON(query.repoInfo).then(function(packagejson){

  });

};

fromGitRepoGetPackageJSON = function(){};
