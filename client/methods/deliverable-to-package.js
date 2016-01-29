'use strict';

var path = require('path');
var File = require('../../shared/objects/File');

var transforms = path.resolve(__dirname, '../../shared/transforms/custom');

var returnIfPackage;

module.exports = function(deliverable, destination){
  var ext = deliverable.extname;
  if(ext === '') return returnIfPackage(deliverable);
  ext = ext.substring(1);
  if(ext === '') return Promise.reject(new Error('Cannot transform a hidden file'));
  var __transforms = new File(transforms);
  __transforms.getChildren().then(function(children){
    var i = children.indexOf(ext);
    if(i === -1){
      throw new Error('Cannot parse this file type');
    }

    return __transforms.resolve(children[i]).resolve('deliverable-to-package.js');
  }).then(function(transform){
    return transform.exists().then(function(boo){
      if(!boo) throw new Error(`Cannot transform .${ext} into a Package`);
      return require(transform.filename)(deliverable, destination);
    });
  });
};

returnIfPackage = function(file){
  return file.resolve('package.json').exists().then(function(boo){
    if(!boo) throw new Error('This is a folder that is not a package');
    return file;
  });
};
