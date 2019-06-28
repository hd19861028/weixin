#!/usr/bin/env node

'use strict'

var http = require('./http-request');
var fs = require('fs')
var path = require('path')
var url = require('url')

var args = process.argv.slice(2);

var requrl
var saveurl
var cpus
var seconds
var headers = {}

var originTrim = String.prototype.trim;
String.prototype.trim = function () {
	let args = Array.prototype.slice.call(arguments);
	let str = originTrim.call(this.valueOf())
	if (args.length == 0) return str

	args.forEach(s => {
		if (str.startsWith(s)) {
			str = str.substr(s.length)
		}
		if (str.endsWith(s)) {
			str = str.substr(0, str.length - s.length)
		}
	})
	return str;
}

args.forEach((arg) => {
	let key = "";
	let value = "";
	if (arg.indexOf('=') > 0) {
		let _t = arg.split('=')
		key = _t[0]
		value = _t[1]
	} else {
		key = arg
	}
	if (key == "--help") {
		console.log(`
--------------------
参数说明
--------------------

-o		输出文件名
-u		下载文件路径
-h		请求头，可多次传入
-c		启动多少个线程，可不传，默认为cpu核数
-s		秒数。超过这个秒数则强行终止，默认为120秒

--------------------
示例
--------------------

dl -o=./test.file -u=http://dl.example.com/test.file -h='content-type:application/json'`);
		process.exit(true);
	}
	if (key == "-o") {
		saveurl = path.resolve(process.cwd(), value);
	}
	if (key == "-c") {
		cpus = parseInt(value)
	}
	if (key == "-u") {
		requrl = value;
	}
	if (key == "-s") {
		seconds = parseInt(value);
	}
	if (key == "-h") {
		var head = value.trim('"', "'").split(':');
		headers[head[0]] = head[1]
	}
});

if (saveurl == undefined) {
	var basename = path.parse(requrl).base;
	saveurl = path.resolve(process.cwd(), basename)
}

if (seconds == undefined) {
	seconds = 120;
}

; (async () => {
	console.time('download')
	var result = await http.DownloadParallel({
		requrl,
		saveurl,
		cpus,
		seconds,
		headers,
		log: true,
	});
	// var result = await http.Download(requrl, saveas, maxlen);
	console.timeEnd('download')
	console.log(result)
	if(result.receive == result.maxLength){
		console.log(`文件保存到： ${saveurl}`)
	}
})();


