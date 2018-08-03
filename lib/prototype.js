const path = require('path');
const fs = require('fs');
const util = require('util');
const qs = require('querystring');
const nodeExcel = require('excel-export');
const contentDisposition = require('content-disposition');

/**
 * 时间戳转换成日期类型
 * 
 * @param {Object} format	日期格式，例如: yyyy-MM-dd HH:mm:ss.fff
 */
Number.prototype.Format = function(format) {
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

/**
 * node.js环境下，将字符串转换成二进制（中文转码）
 */
String.prototype.ConvertZhcn = function() {
	return new Buffer(this.valueOf()).toString('binary');
}

/**
 * 记录日志
 */
String.prototype.WriteLog = function(iserror) {
	write(iserror == true ? true : false, this.valueOf());
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

Error.prototype.WriteLog = function() {
	var msg = [];
	msg.push("-------------Basic-------------");
	for(var k in this) {
		var v = this[k];
		if(v.constructor.name != "Function") {
			msg.push(k + '\t\t: ' + v);
		}
	}
	msg.push("-------------Stack-------------");
	msg.push(this.stack);
	write(true, msg.join('\r\n'));
}

global.GetUTC = function(dt) {
	if(dt == undefined) {
		dt = Date.now();
	}
	return dt.getTime() + new Date().getTimezoneOffset() * 60000
}

global.WriteLog = function(obj, iserror) {
	if(typeof obj == 'object') {
		obj = JSON.stringify(obj, null, 4)
	}
	if(typeof obj == 'string') {
		write(iserror == true ? true : false, obj)
	}
}

global.ReadLog = function(iserror, dateTime) {
	return read(iserror == true ? true : false, dateTime);
}

global.BodyParse = function(req, isJSON) {
	if(isJSON === undefined || isJSON === null) isJSON = true;
	return new Promise(function(resolve, reject) {
		var result = '';
		req.on('data', function(chunk) {
			result += chunk;
		});
		req.on('end', function() {
			var _obj = null;
			if(isJSON) {
				_obj = JSON;
			} else {
				_obj = qs;
			}
			resolve(_obj.parse(result))
		});
	})
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
			if(v === null) v = "";
			temp.push(v.toString().replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, ''));
			var size = 0;
			if(v) {
				size = Buffer.byteLength(v.toString()) + 1;
			}
			if(_colWidth[k] == undefined) {
				_colWidth[k] = 0;
			}
			if(_colWidth[k] < size) _colWidth[k] = size;
		}
		conf.rows.push(temp);
	})
	for(var k in _colWidth) {
		var v = _colWidth[k];
		var v1 = k.length * 2.5;
		v = v1 > v ? v1 : v
		conf.cols.push({ caption: k, type: 'string', width: v });
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

function getFilename(iserror, dt) {
	if(dt == undefined) dt = Date.now();
	if(dt.constructor.name == "Date") dt = dt.getTime();
	var date_str = "";
	if(typeof dt == "string") date_str = dt;
	else date_str = dt.Format('yyyy-MM-dd');

	var filename = iserror ? "error-" : "info-";
	filename += date_str + ".log";
	return filename;
}

function write(iserror, msg) {
	var now = Date.now();
	var content = "";
	var time_str = now.Format('yyyy-MM-dd HH:mm:ss.fff');
	content = time_str + '\r\n' + msg + '\r\n';
	if(iserror) console.error(content)
	else console.log(content)
}

function read(iserror, dateTime) {
	var filename = getFilename(iserror, dateTime);
	var log = path.join(process.cwd(), "log", filename);
	return fs.readFileSync(log, 'utf8');
}