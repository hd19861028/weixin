var CronJob = require('cron').CronJob;
var fs = require('fs');
var path = require('path');

function _checkNumber(num) {
	if (num && num != "*" && +num > 0) {
		return '*/' + num;
	} else {
		return "*";
	}
}

/**
 * @param {Object} options
 * @param {Number} options.days	间隔多少天运行一次 
 * @param {Number} options.hours	间隔多少小时运行一次
 * @param {Number} options.minutes	间隔多少分钟运行一次
 * @param {Number} options.seconds	间隔多少秒运行一次
 * @param {Function} options.onTick	【强制】执行事件
 */
function Task(options) {
	var _self = this;
	this.opts = options;
	this.enable = true;

	/* 开始初始化tick */
	var tick = new Array(6);
	tick[0] = _checkNumber(this.opts.seconds);
	tick[1] = _checkNumber(this.opts.minutes);
	tick[2] = _checkNumber(this.opts.hours);
	tick[3] = _checkNumber(this.opts.days);
	tick[4] = "*";
	tick[5] = "*";
	this.tick = tick.join(' ');

	/* onTick不存在，则抛出异常 */
	if (typeof this.opts.onTick != 'function') {
		throw new ReferenceError('the schedule have not a tick event.')
	}

	/* 设置计时器参数 */
	this.runOpts = {
		timeZone: "Asia/Hong_Kong"
	};
	this.runOpts.cronTime = this.tick;
	this.runOpts.onTick = function() {
		if (_self.enable === true) {
			_self.opts.onTick.call();
		}
	};
}

Task.prototype.Enable = function() {
	this.enable = true;
}

Task.prototype.Disable = function() {
	this.enable = false;
}

Task.prototype.Start = function() {
	/* 创建计时器对象 */
	this.job = new CronJob(this.runOpts);
	this.enable = true;
	this.job.start();
}

Task.prototype.Stop = function() {
	this.job.stop();
	clearTimeout(this.job._timeout)
}

Task.prototype.Restart = function() {
	this.job.stop();
	this.job = new CronJob(this.runOpts);
	this.enable = true;
	this.job.start();
}

/**
 * @param {String} interval	可自由设置当前组件的执行间隔，格式符合cron style
 */
Task.prototype.SetCronTime = function(interval) {
	this.runOpts.cronTime = interval;
}

Task.prototype.CheckIsChange = function(interval, name) {
	try {
		name = this.name || '';
		if(this.runOpts.cronTime != interval) {
			clearTimeout(this.job._timeout)
			this.StartTimer(interval, name);
		}
	} catch(e) {}
}

Task.prototype.StartTimer = function(interval, name) {
	try {
		if(!this.name && name) this.name = name; 
		this.SetCronTime(interval);
		this.Start();
		WriteLog(interval + '\t\t' + name);
	} catch(e) {}
}

exports = module.exports = Task;