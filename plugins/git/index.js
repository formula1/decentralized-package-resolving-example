'use strict';

var url = require('url');
var validUrl = require('valid-url');
var isGit = /\.git$/;

module.exports = {};

module.exports.handleToReadable = function(handle){
  if(handle.type !== 'git') return Promise.reject(new Error('cannot handle non git'));
  if(!handle.remote) throw new Error('need a remote to fetch from');
  if(!isGit(handle.remote)) throw new Error('remote doesn\'t end in .git');
  if(!handle.branch) throw new Error('need a branch to go to');
  if(!handle.hash) throw new Error('need a hash to go to');

  return Promise.resolve(`${handle.remote}#${handle.hash}@${handle.branch}`);
};

module.exports.readableToHandle = function(readable){
  if(!validUrl.isUri(readable)) throw new Error('handle is not uri');
  var gituri = url.parse(readable);
  if(!isGit.test(gituri.pathname)) throw new Error('not a git repo');
  var hash = gituri.hash;
  if(!hash) throw new Error('should specify a commit');
  hash = hash.split('@');
  var branch = hash[1];
  var commit = hash[0];
  gituri.hash = null;
  var ret = {
    type: 'git',
    remote: url.format(gituri),
    branch: branch || 'master',
    commit: commit,
  };
  return Promise.resolve(ret);
};

module.exports.validateHandle = function(handle){
  if(handle.type !== 'git') throw new Error('cannot handle non git');
  if(!handle.remote) throw new Error('need a remote to fetch from');
  if(!isGit(handle.remote)) throw new Error('remote doesn\'t end in .git');
  if(!handle.branch) throw new Error('need a branch to go to');
  if(!handle.hash) throw new Error('need a hash to go to');

  return handle;
};
