'use strict';

var fs = require('fs');
var Event = require('events').EventEmitter;

var methods = [];
for(var k in fs) {
	var v = fs[k];
	if(v.constructor === Function) {
		if(!k.endsWith('Sync')) {
			methods.push(k);
		} 
	}
}

exports = module.exports;

exports.fs = fs;

var evt = new Event();
evt.on('start', function() {
	if(methods.length > 0) {
		var m = methods.shift();
		exports[m] = function() {
			var args = [];
			for(var i = 0; i < arguments.length; i++) {
				if(arguments[i].constructor !== Function) {
					args.push(arguments[i]);
				}
			}
			return new Promise(function(resolve, reject) {
				args.push(function(err, data) {
					if(err) {
						reject(err);
					} else {
						resolve(data);
					}
				});
				fs[m].apply(fs, args);
			})
		}
		evt.emit('start');
	} else {
		evt.emit('end');
	}
});
evt.on('end', function() {
	evt.removeAllListeners();
});
evt.emit('start');