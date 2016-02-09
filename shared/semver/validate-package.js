'use strict';

var SemVer = require('semver');

module.exports = function(pkg){
  var pkgjsonFile;
  return pkg.isDirectory().then(function(boo){
    if(!boo) throw new Error('This is not a folder');
    pkgjsonFile = pkg.resolve('package.json');
    return pkgjsonFile.exists();
  }).then(function(boo){
    if(!boo) throw new Error('This is a folder that is not a package');
    return pkgjsonFile.getContents();
  }).then(function(contents){
    var pkgjson = JSON.parse(contents.toString('utf-8'));
    if(!pkgjson.name) throw new Error('Package needs a name');
    if(!pkgjson.version) throw new Error('Package needs a version');
    if(!SemVer.valid(pkgjson.version)) throw new Error('Package version is invalid');
    return true;
  }).catch(function(){
    return false;
  });
};
