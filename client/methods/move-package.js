'use strict';

var path = require('path');
var fs = require('fs');
var File = require('../../shared/objects/File');
var packageToSemVer = require('../../shared/transforms/semver/package-to-handle');

module.exports = function(pkg_folder, destination_parent){
  var destination;
  return packageToSemVer(pkg_folder).then(function(semver){
    destination = path.join(destination_parent, semver.name);
    return destination_parent.createIfNotExists(true);
  }).then(function(){
    return new Promise(function(res, rej){
      fs.rename(pkg_folder.filename, destination, function(err){
        if(err) return rej(err);
        res(new File(destination));
      });
    });
  });
};
