const exec = require('child_process').exec;
const net = require('net');
const EventEmitter = require('events').EventEmitter;

function run(cmd) {
	return new Promise((resolve, reject) => {
		exec(cmd, (err, stdout, stderr) => {
			if(err) {
				reject(err);
			} else {
				resolve(stdout)
			}
		});
	})
}

function telnet(host, port) {
	return new Promise((resolve, reject) => {
		var client = net.createConnection(port, host);
		client.on('connect', function() {
			resolve(true)
		});
		client.on('error', function(err) {
			reject(err);
		});
	})
}

function watch(host, port, cmd) {
	console.log(`开始监听“${host}:${port}”`);
	var evt = new EventEmitter();
	evt.on('listen', function() {
		telnet(host, port)
			.then(function() {
				let timer = setTimeout(function() {
					clearTimeout(timer);
					evt.emit('listen');
				}, 1000)
			}, function() {
				evt.emit('command');
			})
	});
	evt.on('command', function() {
		run(cmd)
			.then(function() {
				console.log(`${new Date().toLocaleString()}	监听“${host}:${port}”进程不存在, 执行“${cmd}”重启成功`)
				evt.emit('listen');
			}, function(e) {
				evt.emit('error', e);
			})
	});
	evt.on('error', function(err) {
		console.log(`${new Date().toLocaleString()}	监听被迫中断，执行“${cmd}”命令时遇到错误`)
		console.log(err.stack);
	});
	evt.emit('listen');
};

//watch("localhost", 80, `sudo nginx`);
exports = module.exports = {
	watch: watch
}