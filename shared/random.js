'use strict';

var i = 0, fill;

module.exports = {
  randomBetween: function(a, b){
    return a + Math.floor(Math.random() * (b - a));
  },

  id: function(length){
    var id = Date.now().toString(32) + Math.random().toString(32).substring(2) + fill(++i, 10, '0');
    if(!length) return id;
    while(id.length < length) id += this.id();
    return id.substring(0, length);
  },
};

fill = function(num, amount, other){
  num = num.toString(32);
  while(num.length < amount) num = other + num;
  return num;
};
