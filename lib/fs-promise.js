'use strict';

const fs = require('fs');
const Event = require('events').EventEmitter;

exports = module.exports;

exports.node = fs;

(function() {
	var evt = new Event();
	evt.on('init', function() {
		var methods = [];
		for(var k in fs) {
			var v = fs[k];
			if(v.constructor === Function && !k.endsWith('Sync')) {
				methods.push(k);
			}
		}
		evt.emit('start', methods);
	});
	evt.on('start', function(methods) {
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
			evt.emit('start', methods);
		} else {
			evt.emit('end');
		}
	});
	evt.on('end', function() {
		evt.removeAllListeners();
	});
	evt.emit('init');
})()