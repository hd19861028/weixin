'use strict';

const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const url = require('url');


function parseUrl(requrl) {
	var parsedUrl = url.parse(requrl, true);
	if (parsedUrl.protocol === "https:") {
		parsedUrl.https = true;
	} else {
		parsedUrl.https = false;
	}
	return parsedUrl;
}

function getOptions(_url, params, method, headers) {
	var options = {
		host: null,
		port: -1,
		path: null
	};
	options.host = _url.hostname;
	options.port = _url.port;
	options.path = _url.pathname;
	options.method = method;
	options.timeout = 200000;

	if (params) {
		options.headers = {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(params)
		}
	}

	if (headers) {
		options.headers = options.headers || {};
		for (var key in headers) {
			options.headers[key] = headers[key];
		}
	}

	_url.search && (options.path += _url.search)
	_url.https && (options.checkServerIdentity = function (host, cert) { return undefined; })

	return options;
}

function _send(requrl, data, method, headers, is_res, retry) {
	return new Promise(function (resolve, reject) {
		var params = '';
		if (data) {
			if (data.constructor.name == "String") {
				params = data;
			}
			if (data.constructor.name == "Object") {
				params = JSON.stringify(data);
			}
		}

		var _url = parseUrl(requrl);
		var options = getOptions(_url, params, method, headers);
		var _http = null;
		if (_url.https) {
			_http = https;
		} else {
			_http = http;
		}
		var timeoutEventId;

		var req = _http.request(options, function (res) {
			if (is_res == true) {
				if (timeoutEventId) clearTimeout(timeoutEventId);
				resolve({ req, res });
			} else {
				res.setEncoding('utf8');
				var result = '';
				res.on('data', function (chunk) {
					result += chunk;
				});
				res.on('end', function () {
					if (timeoutEventId) clearTimeout(timeoutEventId);
					try {
						result = JSON.parse(result);
					} catch (e) { }
					resolve(result);
				});
				res.on('error', function (err) {
					reject(err);
				});
			}
		});

		if (options.timeout) {
			timeoutEventId = setTimeout(function () {
				req.emit('error', 10001);
			}, options.timeout)
		}

		if (params) {
			req.write(params);
		}

		req.on('error', function (err) {
			if (timeoutEventId) clearTimeout(timeoutEventId);
			if (err == 10001) {
				req.abort();
				err = new Error('连接超时');
				err.code = 10001;
				reject(err);
			} else {
				reject(err);
			}
		});
		req.end();
	});
}

function Post(requrl, data, headers, is_res) {
	return _send(requrl, data, 'post', headers, is_res)
}

function Put(requrl, data, headers, is_res) {
	return _send(requrl, data, 'put', headers, is_res)
}

function Get(requrl, headers, is_res) {
	return _send(requrl, null, 'get', headers, is_res)
}

function Delete(requrl, headers, is_res) {
	return _send(requrl, null, 'delete', headers, is_res)
}

function Download(requrl, saveurl) {
	return new Promise(function (resolve, reject) {
		var _url = parseUrl(requrl);
		var options = getOptions(_url, null, 'get');
		var _http = null;
		if (_url.https) {
			_http = https;
		} else {
			_http = http;
		}
		var req = _http.request(options, function (res) {
			var writer = fs.createWriteStream(saveurl, { flags: 'w+' });
			writer.on('error', function (err) {
				writer.end();
				reject(err);
			})
			var receive = 0;
			var max = +res.headers['content-length'];
			res.pipe(writer)
			res.on('error', function (err) {
				resolve(err);
			})
			res.on('data', function (chunk) {
				receive += chunk.length;
				var percent = (receive / max) * 100
				// notify(percent.toFixed(2));
			})
			res.on('end', function () {
				resolve(true);
			});
		});
		req.on('error', function (err) {
			resolve(err);
		});
		req.end();
	});
}

function Head(requrl, headers) {
	return new Promise(function (resolve, reject) {
		var _url = parseUrl(requrl);
		var options = getOptions(_url, null, 'head', headers);
		var _http = null;
		if (_url.https) {
			_http = https;
		} else {
			_http = http;
		}
		var req = _http.request(options, function (res) {
			resolve(res.headers);
			req.abort();
		});
		req.on('error', function (err) {
			reject(err);
		});
		req.end();
	});
}

async function DownloadParallel({ requrl, saveurl, cpus, headers = {}, seconds = 10 }) {
	let resHeaders = await Head(requrl, headers);
	var maxLength = +resHeaders['content-length'];

	return new Promise(function (resolve, reject) {
		var startTime = Date.now();
		cpus = cpus > 0 ? cpus : os.cpus().length;
		var unit = Math.ceil(maxLength / cpus);
		var ranges = [];
		for (var i = 0; i < cpus; i++) {
			var min, max;
			if (i == 0) {
				min = i * unit;
				max = (i + 1) * unit;
			} else if (i > 0 && i < cpus - 1) {
				min = ranges[i - 1].max + 1;
				max = min + unit;
			} else {
				min = ranges[i - 1].max + 1;
				max = maxLength - 1;
			}
			ranges.push({
				min: min,
				max: max
			});
		}

		var result = new Array(cpus);
		var blockLen = new Array(cpus);
		var startTime = Date.now();
		var completeCount = 0;
		var receive = 0;
		var abort = false;
		var EventEmitter = require('events').EventEmitter;
		var evt = new EventEmitter();

		for (let i = 0; i < ranges.length; i++) {
			let item = ranges[i];
			let h = { Range: ` bytes=${item.min}-${item.max}` }
			Object.assign(h, headers);
			(async () => {
				let resp = await _send(requrl, null, 'get', h, true)
				let { req, res } = resp

				evt.on(`stop_download${i}`, function () { req.abort(); })

				let bufs = [];
				let total = 0;
				res
					.on('data', function (chunk) {
						receive += chunk.length;
						total += chunk.length;
						blockLen[i] = total;
						bufs.push(chunk);
						var percent = (receive / maxLength) * 100
						// notify(percent.toFixed(2));
					})
					.on('end', function () {
						let buffers = Buffer.concat(bufs, total);
						result[i] = buffers;
						completeCount += 1;
					})
					.on('error', function (err) {
						console.log(err)
						abort = true;
					});
				req.on('error', function (err) {
					console.log(err)
					abort = true;
				});
			})()
		}

		var formatResult = function (rec) {
			var time = ((Date.now() - startTime) / 1000);
			var rate = rec / time / 1024
			if (rate > 1024) {
				rate /= 1024
				rate = rate.toFixed(2) + 'mb/s';
			} else {
				rate = rate.toFixed(2) + 'kb/s';
			}
			return {
				maxLength,
				blockLen,
				cpus,
				receive: rec,
				time: time.toFixed(2) + 's',
				rate,
			}
		}

		var timer = setInterval(async function () {
			if (startTime + seconds * 1000 < Date.now()) {
				for (let i = 0; i < ranges.length; i++) {
					evt.emit(`stop_download${i}`)
					resolve(formatResult(receive));
					clearInterval(timer);
					return;
				}
			}
			if (abort == true) {
				var r = formatResult(receive)
				r.error = true;
				resolve(r);
				clearInterval(timer);
				return;
			}
			if (completeCount == cpus) {
				var resultBuff = Buffer.concat(result, maxLength);
				clearInterval(timer);
				await fs.promises.writeFile(saveurl, resultBuff, { flag: 'w+', encoding: 'binary' });
				resolve(formatResult(maxLength));
			}
		}, 10)
	});
}

module.exports = {
	Get,
	Post,
	Put,
	Delete,
	Download,
	DownloadParallel,
	Head,
	FileLength: Head,
}