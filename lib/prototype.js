const path = require('path');
const fs = require('fs');
const util = require('util');
const nodeExcel = require('excel-export');
const contentDisposition = require('content-disposition');

/**
 * 时间戳转换成日期类型
 * 
 * @param {Object} format	日期格式，例如: yyyy-MM-dd HH:mm:ss.fff
 */
Date.prototype.Format = function(format) {
	var current = 0;
	if(this.toString().length <= 10) current = this * 1000;
	else current = this;
	var date = new Date(current);
	var formatstr = format;
	if(format != null && format != "") {
		if(formatstr.indexOf("yyyy") >= 0) {
			formatstr = formatstr.replace("yyyy", date.getFullYear());
		}
		if(formatstr.indexOf("MM") >= 0) {
			var month = date.getMonth() + 1;
			if(month < 10) {
				month = "0" + month;
			}
			formatstr = formatstr.replace("MM", month);
		}
		if(formatstr.indexOf("dd") >= 0) {
			var day = date.getDate();
			if(day < 10) {
				day = "0" + day;
			}
			formatstr = formatstr.replace("dd", day);
		}
		var hours = date.getHours();
		if(formatstr.indexOf("HH") >= 0) {
			if(month < 10) {
				month = "0" + month;
			}
			formatstr = formatstr.replace("HH", hours);
		}
		if(formatstr.indexOf("hh") >= 0) {
			if(hours > 12) {
				hours = hours - 12;
			}
			if(hours < 10) {
				hours = "0" + hours;
			}
			formatstr = formatstr.replace("hh", hours);
		}
		if(formatstr.indexOf("mm") >= 0) {
			var minute = date.getMinutes();
			if(minute < 10) {
				minute = "0" + minute;
			}
			formatstr = formatstr.replace("mm", minute);
		}
		if(formatstr.indexOf("ss") >= 0) {
			var second = date.getSeconds();
			if(second < 10) {
				second = "0" + second;
			}
			formatstr = formatstr.replace("ss", second);
		}
		if(formatstr.indexOf("fff") >= 0) {
			var microsecond = date.getMilliseconds();
			var ms = "";
			if(microsecond < 10) {
				ms = "00" + microsecond;
			} else if(microsecond >= 10 && microsecond < 100) {
				ms = "0" + microsecond;
			} else {
				ms = microsecond.toString();
			}
			formatstr = formatstr.replace("fff", ms);
		}
	}
	return formatstr;
}

Number.prototype.Format = function(format) {
	return new Date(this).Format(format);
}

/**
 * node.js环境下，将字符串转换成二进制（中文转码）
 */
String.prototype.ConvertZhcn = function() {
	return new Buffer(this.valueOf()).toString('binary');
}

String.prototype.HasEmoji = function() {
	var msg = this.valueOf();
	var buf = new Buffer(msg);
	var sumSize = 0;
	for(var i = 0; i < msg.length; i++) {
		sumSize += new Buffer(msg[i]).length
	}
	return buf.length != sumSize;
}

global.GetUTC = function(dt) {
	if(dt == undefined) {
		dt = Date.now();
	}
	return dt.getTime() + new Date().getTimezoneOffset() * 60000
}

function printObj(err) {
	let msg = [];
	for(var k in err) {
		var v = err[k];
		if(v.constructor.name == "Object" || v.constructor.name == "Array")
			v = JSON.stringify(v);
		if(v.constructor.name != "Function") {
			msg.push(k + ' '.repeat(20 - k.length) + ': ' + v);
		}
	}
	return msg;
}

function generatorMessage(err) {
	if(err === null || err === undefined) {
		return ""
	}
	var msg = [];
	var time = new Date().Format('yyyy-MM-dd HH:mm:ss.fff');
	if(err.constructor.name.endsWith('Error')) {
		msg.push("-------------Basic-------------");
		msg.push('Date' + ' '.repeat(16) + ': ' + time);
		msg.push(...printObj(err));
		msg.push("-------------Stack-------------");
		msg.push(err.stack);
		console.error(msg.join('\r\n'));
		return "";
	} else if(err.constructor.name == "String") {
		msg.push(time);
		msg.push(err);
	} else {
		msg.push(time);
		msg.push(...printObj(err));
	}
	return msg.join('\r\n');
}

global.WriteError = function(err) {
	var msg = generatorMessage(err);
	if(process.env.SERVICE_LOG == "1") {
		msg && (console.error(msg));
	}
}

global.WriteLog = function(obj) {
	if(process.env.SERVICE_LOG == "1") {
		var msg = generatorMessage(obj);
		msg && (console.log(msg));
	}
}

var clone = function(obj) {
	if(obj === null || obj === undefined) return null;
	if(obj.constructor.name === "Array") {
		var newObj = [];
		for(var i = 0; i < obj.length; i++) {
			newObj.push(clone(obj[i]))
		}
		return newObj;
	}
	if(obj.constructor.name === "Object") {
		return Object.assign({}, obj)
	}
}
global.CloneObject = clone;

var _createSheet = function(data, index) {
	var conf = {};
	index = index || 1;
	conf.name = 'sheet' + index;
	conf.cols = [];
	conf.rows = [];
	var _colWidth = {};
	data.forEach(function(row) {
		var temp = [];
		for(var k in row) {
			var v = row[k];
			if(_colWidth[k] == undefined) {
				_colWidth[k] = { v: 0, number: 0, string: 0 }
			}
			if(v === null) v = "";
			temp.push(v.toString().replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, ''));
			var size = 0;
			if(v) {
				size = Buffer.byteLength(v.toString()) + 1;
			}
			if(v && (v.length <= 10 || v.length === undefined) && !isNaN(v)) {
				_colWidth[k].number += 1;
			} else {
				_colWidth[k].string += 1;
			}
			if(_colWidth[k].v < size) _colWidth[k].v = size;
		}
		conf.rows.push(temp);
	})
	for(var k in _colWidth) {
		var v = _colWidth[k].v;
		var t = _colWidth[k].number >= _colWidth[k].string ? 'number' : 'string';
		var v1 = k.length * 2.5;
		v = v1 > v ? v1 : v
		conf.cols.push({ caption: k, type: t, width: v });
	}
	return conf;
}

global.DownloadExcel = function(res, filename, data) {
	if(data === null || data === undefined || data.constructor.name !== "Array" || data.length == 0) {
		throw new Error('data is required!');
	}
	var result = null;
	if(data[0].constructor.name === "Array") {
		var confs = [];
		for(var i = 0; i < data.length; i++) {
			var conf = _createSheet(data[i], i + 1)
			confs.push(conf);
		}
		result = nodeExcel.execute(confs);
	} else {
		var conf = _createSheet(data, 1)
		result = nodeExcel.execute(conf);
	}

	res.set({
		'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'Content-Disposition': contentDisposition(filename)
	});
	res.end(result, 'binary');
}

global.Lock = {
	Open: (id) => {
		return new Promise((resolve, reject) => {
			let file = path.join(process.cwd(), (id || '') + '.lock');
			let start = setInterval(() => {
				fs.open(file, 'wx', function(err, fd) {
					if(!err) {
						clearInterval(start);
						resolve({ fd, file });
					}
				})
			});
		})
	},
	Close: (lock) => {
		return new Promise((resolve, reject) => {
			fs.close(lock.fd, function() {
				fs.unlink(lock.file, function(err) {
					resolve(true)
				})
			})
		})
	}
}

/**
 * 数组克隆
 */
Array.prototype.Clone = function() {
	var result = new Array();
	if(this) {
		for(var i = 0; i < this.length; i++) {
			result.push(this[i])
		}
	}
	return result;
}