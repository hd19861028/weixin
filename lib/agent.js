var http = require('http');
var express = require('express');
var app = express();
var ops = {};
var agent = null;

exports = module.exports;

/*
 * 
var agent = require('wx-common').agent;

第一种用法：

agent.startAgent({
	port: 8888,
	forwardPort: 8000,
	hosts: [{
		host: '127.0.0.1',
		weight: 100
	}, {
		host: '127.0.0.1',
		weight: 100
	}]
})

第二种用法：

agent.startAgent({
	port: 8888,
	forwardPort: 8000,
	hosts: ['127.0.0.1', '127.0.0.1', '127.0.0.1']
})

* */

exports.startAgent = function(options) {
	ops = options || {};
	ops.agent = ops.agent || {
		keepAlive: true,
		maxSockets: 102400
	}
	agent = new http.Agent(ops.agent);
	ops.cluster = {};
	ops.currentIndex = 0;
	app.listen(ops.port);
}

function getOptions(req) {
	var options = {
		port: ops.forwardPort,
		path: req.originalUrl,
		method: req.method,
		headers: req.headers,
		agent: agent
	};
	if (ops.hosts[0].constructor.name == "String") {
		var hostLength = ops.hosts.length;
		if (ops.currentIndex >= hostLength) {
			ops.currentIndex -= hostLength;
		}
		options.hostname = ops.hosts[ops.currentIndex];
		ops.currentIndex += 1;
	} else {
		var cluster = ops.cluster;
		if (!cluster) {
			cluster = [];
			var total = 0;
			for (var i = 0; i < hostConfig.length; i++) {
				total += hostConfig[i].weight;
			}
			for (var i = 0; i < hostConfig.length; i++) {
				var percent = ~~((hostConfig[i].weight / total) * 10000000);
				if (i == 0) {
					cluster.push(percent)
				} else {
					cluster.push(percent + cluster[i - 1])
				}
			}
			ops.cluster = cluster;
		}
		var range = ~~(Math.random() * 10000000);
		for (var i = 0; i < cluster.length; i++) {
			if (range <= cluster[i]) {
				var item = ops.hosts[i];
				options.hostname = item.host;
				break;
			}
		}
	}

	return options;
}

app.get('*', function(req, res) {
	if (req.originalUrl == "/favicon.ico") {
		res.sendStatus(404);
	} else {
		var options = getOptions(req)
		var request = http.request(options, function(response) {
			response.pipe(res)
		});
		request.end();
	}
});

app.post('*', function(req, res) {
	var result = "";
	req.on('data', function(chunk) {
		result += chunk;
	})
	req.on('end', function() {
		var options = getOptions(req)
		var request = http.request(options, function(response) {
			response.pipe(res)
		});
		request.write(result);
		request.end();
	})
});