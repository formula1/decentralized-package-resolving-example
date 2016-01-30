'use strict';

var NotFoundError;

module.exports = NotFoundError = function(subject, places){
  if(!(places instanceof Array)) places = [places];
  Error.call(this, `Could not find "${subject}" in "${places.join('", "')}"`);
  Error.captureStackTrace(this, this.constructor);
};

NotFoundError.prototype = Object.create(Error.prototype);

NotFoundError.prototype.name = 'NotFoundError';
