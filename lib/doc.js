// tools for building a string

const underline = (str, char = '=') => str.replace(/./g, char);

function Doc() {
  this.text = '';
}

Doc.prototype.title = function(str, char = '=') {
  this.log(str);
  this.log(underline(str), char)
}

Doc.prototype.log = function(str = '') {
  this.text = this.text.concat(str + '\n');
}

Doc.prototype.linebreak = function(num = 1) {
  while(num--)
    this.log('');
}

Doc.prototype.get = function() {
  return this.text;
}

module.exports = Doc;
