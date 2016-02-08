'use strict';

var path = require('path');
var tar = require('tar-fs');
var File = require('../../shared/objects/File');
var Readable = require('stream').Readable;

module.exports = {};

module.exports.canHandleFile = function(file){
  return Promise.resolve(path.extname(file.filename) === '.tar');
};

module.exports.consumableToPackage = function(tarball, directory){
  return new Promise(function(res, rej){
    var tarballStream;
    if(tarball instanceof Readable){
      tarballStream = tarball;
    }else if(tarball instanceof File){
      tarballStream = tarball.getReadStream();
    }else if(typeof tarball === 'string'){
      tarballStream = new File(tarball).getReadStream();
    }

    tarballStream.pipe(tar.extract(directory))
    .on('finish', function(){
      res(new File(directory));
    }).on('error', rej);
  });
};
