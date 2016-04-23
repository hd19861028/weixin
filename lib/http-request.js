var qs = require('querystring');
var request = require('request');
var fs = require('fs');
var q = require('q');
var common = require('./index');
var http = require('http');
var url = require('url');
exports = module.exports;

function getOptions(requrl, params) {
	var parsedUrl = url.parse(requrl, true);
	var options = {
		host: null,
		port: -1,
		path: null
	};
	options.host = parsedUrl.hostname;
	options.port = parsedUrl.port;
	options.path = parsedUrl.pathname;

	if (params) {
		options.method = 'post';
		options.headers = {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': params.length
		}
	} else {
		options.method = 'get';
	}
	if (parsedUrl.search) options.path += "?" + parsedUrl.search;

	return options;
}

/**
 * @param {String} requrl
 * @param {Object} data
 */
exports._post = function(requrl, data) {
	var d = q.defer();
	if (data) {
		if (data.constructor.name == "String") {
			data = JSON.parse(data);
		}
	} else data = {};
	var params = qs.stringify(data);

	var options = getOptions(requrl, params);

	var req = http.request(options, function(res) {
		res.setEncoding('utf8');
		res.on('data', function(chunk) {
			d.resolve(chunk);
		});
		res.on('error', function(err) {
			d.reject(err);
		});
	});

	if (params) {
		req.write(params);
	}

	req.on('error', function(err) {
		d.reject(err);
	});
	req.end();
	return d.promise;
}

/**
 * @param {String} requrl
 */
exports._get = function(requrl) {
	var d = q.defer();
	var options = getOptions(requrl);

	var req = http.request(options, function(res) {
		res.setEncoding('utf8');
		res.on('data', function(chunk) {
			d.resolve(chunk);
		});
		res.on('error', function(err) {
			d.reject(err);
		});
	});

	req.on('error', function(err) {
		d.reject(err);
	});
	req.end();
	return d.promise;
}

function _download(requrl, saveurl) {
	var d = q.defer();
	var options = getOptions(requrl);
	var req = http.request(options, function(res) {
		var writer = fs.createWriteStream(saveurl)
		res.pipe(writer)
		res.on('error', function(){
			d.resolve(false);
		})
		res.on('end', function() {
			d.resolve(true);
		});
	});
	req.on('error', function(err) {
		d.resolve(false);
	});
	req.end();
	return d.promise;
}

var process_callback = function(msg, returntype, cb) {
	switch (returntype) {
		case 'json':
			msg = JSON.parse(msg);
			cb(msg);
			break;
		case 'xml':
			common.xml_to_json(msg, function(json) {
				cb(json);
			})
			break;
		default:
			cb(msg);
			break;
	}
};

/**
 * @url  请求地址
 * @param   (可空)请求参数，必须是json对象
 * @returntype   (可空)返回值类型，有3个选择，json，string(默认)，xml
 * @posttype   (可空)参数提交的类型，默认为a=1&b=2的形式，如果需以json形式传递，请手动传入参数json
 */
exports.post = function(url, param, returntype, posttype) {
	var d = q.defer();

	var p = null;
	if (param) {
		try {
			if (typeof param == "string") p = param;
			else {
				switch (posttype) {
					case 'json':
						p = JSON.stringify(param);
						break;
					default:
						p = qs.stringify(param);
						break;
				}
			}
		} catch (e) {
			p = "";
		}
	}
	request.post({
		url: url,
		form: p
	}, function(err, response, body) {
		if (err) d.reject(err);
		else {
			process_callback(response.body, returntype, function(result) {
				d.resolve(result);
			})
		}
	});

	return d.promise;
}

/**
 * @url  请求地址，地址请不要带？后面的参数部分
 * @param   (可空)请求参数，必须是json对象或者string
 * @returntype   (可空)返回值类型，有3个选择，json，string(默认)，xml
 */
exports.get = function(url, param, returntype) {
	var d = q.defer();

	if (param) {
		if (typeof param == "string") url = url + '?' + param;
		else url = url + '?' + qs.stringify(param);
	}
	request(url, function(err, response, body) {
		if (err) d.reject(err);
		else {
			process_callback(response.body, returntype, function(result) {
				d.resolve(result);
			})
		}
	})

	return d.promise;
}

exports.reader = function(url) {
	return request(url);
}

exports.send = function(url, param) {
	var d = q.defer();
	var callback = function(err, response, body) {
		if (err) d.reject(err);
		else {
			var msg = response.body;
			if (typeof msg == "string") {
				try {
					if (msg.indexOf('<') < 0)
						msg = JSON.parse(msg);
				} catch (e) {
					msg = response.body;
				}
			}
			d.resolve(msg);
		}
	};
	if (param != undefined) {
		var p = "";
		try {
			if (typeof param != "string") p = JSON.stringify(param);
		} catch (e) {
			p = "";
		}
		request.post({
			url: url,
			form: p || param
		}, callback);
	} else {
		request(url, callback)
	}
	return d.promise;
}