'use strict';

var File = require('../../objects/File');
var validateSemVer = require('./validate-semver-handle');

module.exports = function(bfolder){
  return Promise.resolve(bfolder).then(function(folder){
    if(!(folder instanceof File)) folder = new File(folder);
    var file = folder.resolve('./package.json');
    return file.exists().then(function(boo){
      if(!boo) throw new Error('Missing Package.json');
      return file.getContents();
    }).then(function(contents){
      var pkg = JSON.parse(contents.toString('utf-8'));
      var ret = { name: pkg.name, version: pkg.version };
      validateSemVer(ret);
      return ret;
    });
  });
};
