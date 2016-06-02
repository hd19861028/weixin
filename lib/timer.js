var CronJob = require('cron').CronJob;
var fs = require('fs');
var path = require('path');

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
	tick[4] = "*";
	tick[5] = "*";
	if (this.opts.days && this.opts.days != "*" && +this.opts.days > 0) {
		var days = +this.opts.days;
		tick[3] = '*/' + days;
	} else {
		tick[3] = "*";
	}

	if (this.opts.hours && this.opts.hours != "*" && +this.opts.hours > 0) {
		var hours = +this.opts.hours;
		tick[2] = '*/' + hours;
	} else {
		tick[2] = "*";
	}

	if (this.opts.minutes && this.opts.minutes != "*" && +this.opts.minutes > 0) {
		var minutes = +this.opts.minutes;
		tick[1] = '*/' + minutes;
	} else {
		tick[1] = "*";
	}

	if (this.opts.seconds && this.opts.seconds != "*" && +this.opts.seconds > 0) {
		var seconds = +this.opts.seconds;
		tick[0] = '*/' + seconds;
	} else {
		tick[0] = "*";
	}
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

	/* 创建计时器 */
	this.job = new CronJob(this.runOpts);
}

Task.prototype.Enable = function() {
	this.enable = true;
}

Task.prototype.Disable = function() {
	this.enable = false;
}

Task.prototype.Start = function() {
	this.enable = true;
	this.job.start();
}

exports = module.exports = Task;