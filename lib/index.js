const fs = require("fs");
const path = require("path");
const uuid = require('node-uuid');
const querystring = require('querystring');
const net = require('net');
const crypto = require('crypto');
const q = Promise || require('q').Promise;
const xml2js = require('xml2js');
const Event = require('events').EventEmitter;

const ORIGINAL = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-';

exports = module.exports;

exports.loadJsonFile = function(file) {
	var cfg = fs.readFileSync(file, 'utf8');
	cfg = cfg.replace(/\/\*\*[\s\S]*?\*\*\//g, '');
	return JSON.parse(cfg);
}

/**
 * @param {String} xml	xml字符串
 * @param {Object} callback	转换成功的回调
 */
exports.xmlToJson = function(xml, callback) {
	var parser = xml2js.parseString;
	parser(xml, {
		explicitArray: false
	}, function(err, result) {
		if(err) callback(null, err);
		else callback(result);
	});
}

/**
 * @param {Object} json	json对象
 */
exports.jsonToXml = function(json) {
	var builder = new xml2js.Builder();
	return builder.buildObject(json);
}

exports.hash = function(input) {
	if(input) {
		var hash = 5381;

		for(var i = input.length - 1; i > -1; i--) {
			hash += (hash << 5) + input.charCodeAt(i);
		}
		var value = hash & 0x7FFFFFFF;

		return value.toString();
	} else {
		return '';
	}
}

exports.guid = function() {
	return uuid.v4();
}

exports.shortid = function(bit) {
	bit = bit || 9;
	var r = "";
	var len = ORIGINAL.length;
	while(r.length < bit) {
		var index = Math.floor(Math.random() * len);
		r += ORIGINAL[index];
	}
	return r;
}

exports.getIP = function(req) {
	var ips = req.headers['x-forwarded-for'];
	var ip = "";
	var index = ips.indexOf(',');
	if(index >= 0) {
		ip = ips.split(',')[0];
	} else {
		ip = ips;
	}
	return ip;
}

var pbkdf2 = function(pwd, salt, callback) {
	crypto.pbkdf2(pwd, salt, 10000, 256, 'sha1', callback);
}

/**
 * 传入一个字符串，生产出一个密码和盐值的密钥对
 */
exports.makePwd = function(pwd) {
	return new q(function(resolve, reject) {
		pwd = !pwd ? "123456" : pwd;
		var salt = new Buffer(crypto.randomBytes(256)).toString('hex');
		pbkdf2(pwd, salt, function(err, key) {
			if(err) {
				throw err;
			}
			var p = new Buffer(key).toString('hex');
			resolve({
				salt: salt,
				pwd: p
			})
		});
	});
}

/**
 * @param {String} pwd  需要验证的密码
 * @param {String} pwd_db  数据库存储的密文
 * @param {String} salt 数据库存储的盐值
 */
exports.validPwd = function(pwd, pwd_db, salt) {
	return new q(function(resolve, reject) {
		pbkdf2(pwd, salt, function(err, key) {
			if(err) {
				throw err;
			}
			var p = new Buffer(key).toString('hex');

			if(p == pwd_db) {
				resolve(true);
			} else {
				resolve(false);
			}
		});
	});
}

exports.TryConnect = function(ip, port) {
	return new Promise((resolve, reject) => {
		var client = net.createConnection(port, host);
		client.on('connect', function() {
			client.end();
			resolve(true);
		});
		client.on('error', reject);
	})
}

exports.DeleteExpireFiles = function(dir, days) {
	return new q(function(resolve, reject) {
		try {
			fs.readdir(dir, function(err, files) {
				if(err) reject(err);
				else {
					var evt = new Event();
					var deleted = [];
					var now = Date.now();
					var compare = now - (days * 86400000);
					evt.on('step', function() {
						if(files && files.length > 0) {
							var fileName = files.shift();
							var filePath = path.join(dir, fileName);
							fs.stat(filePath, function(err, stat) {
								var ct = stat.mtime.getTime();
								if(stat.isDirectory() == false && ct < compare) {
									deleted.push(filePath);
									fs.unlink(filePath);
								}
								evt.emit('step');
							});
						} else {
							evt.emit('end');
						}
					});
					evt.on('end', function() {
						resolve(deleted);
					});
					evt.emit('step');
				}
			});

		} catch(e) {
			reject(e);
		}
	});
}