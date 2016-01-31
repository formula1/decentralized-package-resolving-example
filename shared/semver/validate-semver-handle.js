'use strict';

var SemVer = require('semver');

module.exports = function(semver_handle){
  if(!semver_handle.name) throw new Error(`Missing a name`);
  if(!semver_handle.version){
    if(!semver_handle.tag) throw new Error('If no range is specified, a tag is required');
    return true;
  }

  if(!SemVer.validRange(semver_handle.version)) throw new Error(`Invalid version range`);
  return true;
};
