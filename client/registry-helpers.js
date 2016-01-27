'use strict';

module.exports = {};

module.exports.badRegistry = function(registry, error, next){
  // at some point we can make this interactive or make it ignore all errors
  // can also auto remove registries based on 'publishing rights' or 'reading rights' etc
  console.error(registry.location, error.message);
  next(error);
};

module.exports.notSynced = function(type, hashObj){
  console.error(type, hashObj);
  return Promise.resolve(hashObj[Object.keys(hashObj)[0]]);
};
