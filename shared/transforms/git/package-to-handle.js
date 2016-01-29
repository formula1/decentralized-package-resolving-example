'use strict';

var Git = require('nodegit');
var fs = require('fs');

module.exports = function(folder){
  var ret = {};
  return new Promise(function(res, rej){
    var gitfolder = folder.resolve('./.git');
    fs.exists(gitfolder.filename, function(boo){
      if(!boo) return rej(new Error(`git folder does not exist in ${folder.filename}`));
      res(gitfolder);
    });
  }).then(function(gitfolder){
    return Git.Repository.open(gitfolder.filename);
  }).then(function(repo){
    return Promise.all([
      repo.getCurrentBranch(),
      repo.getHeadCommit(),
      repo.getRemotes(),
    ]).then(function(ari){
      ret.branch = ari[0];
      ret.commit = ari[1];
      var remotes = ari[2];
      if(remotes.length === 0) throw new Error('This repository is not available remotely');
      if(remotes.length === 1){
        return repo.getRemote(remotes[0], function(){
          console.log(arguments);
        });
      }

      var possible = ['publish', 'origin'].filter(function(name){
        return remotes.indexOf(name) !== -1;
      });

      if(possible.length === 0) throw new Error('not sure which remote to choose from');

      return repo.getRemote(possible[1]);
    });
  }).then(function(remote){
    ret.remote = remote.url();
    ret.type  = 'git';
    return ret;
  });
};
