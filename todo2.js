var proto = {};

function Foo(a, b) {
  this.a = a;
  this.b = b;
}

Foo.prototype.speak = function(a) {
 //
};

Foo.prototype = proto;
Foo.prototype.constructor = Foo;

var foo = new Foo;
