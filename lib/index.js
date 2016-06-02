var fs = require("fs");
var path = require("path");
var uuid = require('node-uuid');
var querystring = require('querystring');
var net = require('net');
var crypto = require('crypto');
var q = Promise;
var formidable = require('formidable');
var expat = require('node-expat');
var bling = require('bling-hashes');

exports = module.exports;

exports.xmlToJson = function(xml, callback) {
	var json = {};
	var root_name = "";
	var node_name = "";
	var parser = new expat.Parser('UTF-8');
	parser.on('startElement', function(name, attrs) {
		if (node_name == "" && root_name == "") root_name = name;
		node_name = name;
	})

	parser.on('endElement', function(name) {
		if (name == root_name) {
			if (callback) callback(json)
		}
	})

	parser.on('text', function(text) {
		if (text && text != '\n') {
			json[node_name] = text;
		}
	})

	parser.on('error', function(error) {
		console.error(error)
	})

	parser.write(xml);
}

exports.hash = function(str) {
	return bling.bkdr(str);
}

exports.upload_file = function(req, res, callback, save_as) {
	var fields = [];
	var files_result = [];
	var max_size_setting = (global.config.upload_max_size || 2);
	var max_size = max_size_setting * 1024 * 1024;
	var error = false;
	var userid = res.locals.userid;
	var form = new formidable.IncomingForm();
	form.uploadDir = save_as ? save_as : global.config.upload_temp;
	form.maxFieldsSize = 20 * 1024 * 1024;
	form.keepExtensions = true;
	form.hash = "md5";
	form
		.on('field', function(field, value) {
			var item = {};
			item[field] = value;
			fields.push(item);
		})
		.on('progress', function(bytesReceived, bytesExpected) {
			if (bytesExpected >= max_size) {
				var msg = "文件大小超出限制，被服务器拒绝提交！最大允许" + max_size_setting.toString() + "mb";
				this.emit('error', msg);
			}
		})
		.on('aborted', function() {

		})
		.on('fileBegin', function(name, file) {

		})
		.on('file', function(field, file) {
			if (file.size > 0) {
				var f = {
					name: field,
					file: {
						path: file.path,
						hash: file.hash,
						show_name: file.name,
						file_name: path.basename(file.path),
						size: file.size,
						type: file.type,
						lastModifiedDate: new Date(file.lastModifiedDate).getTime()
					}
				};
				files_result.push(f);
			}
		})
		.on('end', function() {})
		.on('error', function(err) {
			form._error(err);
			if (!error) {
				res.send(400, err.toString());
			}
			error = true;
		});

	form.parse(req, function(err, fields, files) {
		if (!err) {
			callback(fields, files_result);
		}
	});
}

exports.guid = function() {
	return uuid.v4();
}

exports.getIP = function(req) {
	var ips = req.headers['x-forwarded-for'];
	var ip = "";
	var index = ips.indexOf(',');
	if (index >= 0) {
		ip = ips.split(',')[0];
	} else {
		ip = ips;
	}
	return ip;
}

/**
 * 传入一个字符串，生产出一个密码和盐值的密钥对
 */
exports.makePwd = function(pwd) {
	var d = q.defer();
	pwd = !pwd ? "123456" : pwd;
	var salt = new Buffer(crypto.randomBytes(256)).toString('hex');
	crypto.pbkdf2(pwd, salt, 10000, 256, function(err, key) {
		if (err) {
			throw err;
		}
		var p = new Buffer(key).toString('hex');
		d.resolve({
			salt: salt,
			pwd: p
		})
	});
	return d.promise;
}

/**
 * @param {String} pwd  需要验证的密码
 * @param {String} pwd_db  数据库存储的密文
 * @param {String} salt 数据库存储的盐值
 */
exports.validPwd = function(pwd, pwd_db, salt) {
	var d = q.defer();

	crypto.pbkdf2(pwd, salt, 10000, 256, function(err, key) {
		if (err) {
			throw err;
		}
		var p = new Buffer(key).toString('hex');

		if (p == pwd_db) {
			d.resolve(true);
		} else {
			d.resolve(false);
		}
	});
	return d.promise;
}

exports.try_connect = function(ip, port, cb) {
	var client = net.createConnection(port, ip);
	client.on('connect', function() {
		if (cb) cb(true);
	});
	client.on('error', function(err) {
		var msg = "can't to connect the " + ip + ":" + port;
		console.error(msg)
		throw new Error(msg);
	});
}