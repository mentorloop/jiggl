// tools for building a string

const { clearScreen } = require('./util');

function Doc() {
  this.text = '';
}

Doc.prototype.log = function(str) {
  this.text = this.text.concat(str + '\n');
}

Doc.prototype.linebreak = function(num = 1) {
  while(num--)
    this.log('');
}

Doc.prototype.get = function() {
  return this.text;
}


Doc.prototype.print = function() {
  clearScreen();
  console.log(this.text);
}


module.exports = Doc;
