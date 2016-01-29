'use strict';

/* global __tmp */

var Git = require('nodegit');
var path = require('path');
var rimraf = require('rimraf');
var File = require('../../objects/File');

module.exports = function(handle){
  var tmpFullPath = new File(__tmp).newUniqueChild();

  return Git.Clone(handle.remote, tmpFullPath.filename).then(function(repo){
    return repo.checkoutBranch(handle.branch)
    .then(function(){
      return repo.getCommit(handle.commit);
    }).then(function(commit){
      return Git.Checkout.tree(repo, commit);
    }).then(function(){
      return new Promise(function(res, rej){
        rimraf(path.resolve(tmpFullPath.filename, './.git'), function(err){
          if(err) return rej(err);
          res();
        });
      });
    });
  }).then(function(){
    return new File(tmpFullPath);
  });
};
