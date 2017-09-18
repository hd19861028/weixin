var http = require('http');
var https = require('https');
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
	hosts: [{
		host: '127.0.0.1',
		port: 8000,
		weight: 100
	}, {
		host: '127.0.0.1',
		port: 8000,
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

/**
 * @param {Object} options
 * @param {Number} options.port		当前代理服务器端口
 * @param {Number} options.forwardPort		转发到哪个端口
 * @param {Array} options.hosts	支持如下2种格式的数组
 * 		格式一：
  			['127.0.0.1', '127.0.0.1', '127.0.0.1']
 * 		格式二：
 * 			[{
				host: '127.0.0.1',
				port: 8000,
				weight: 100
			}, {
				host: '127.0.0.1',
				port: 8000,
				weight: 100
			}]
 */
exports.startAgent = function(options) {
	ops = options || {};
	ops.agent = ops.agent || {
		keepAlive: true,
		maxSockets: 102400
	}
	agent = new(ops.https === true ? https : http).Agent(ops.agent);
	ops.cluster = {};
	ops.currentIndex = 0;
	if(ops.middleware) {
		app.use(ops.middleware);
	}
	app.listen(ops.port);
}

function forward(req, res) {
	var options = {
		path: req.originalUrl,
		method: req.method,
		headers: req.headers,
		agent: agent
	};
	if(ops.https === true) {
		options.checkServerIdentity = function(host, cert) { return undefined; }
	}
	if(ops.hosts[0].constructor.name == "String") {
		options.port = ops.forwardPort;
		var hostLength = ops.hosts.length;
		if(ops.currentIndex >= hostLength) {
			ops.currentIndex -= hostLength;
		}
		options.hostname = ops.hosts[ops.currentIndex];
		ops.currentIndex += 1;
	} else {
		var cluster = ops.cluster;
		if(!cluster) {
			cluster = [];
			var total = 0;
			for(var i = 0; i < hostConfig.length; i++) {
				total += hostConfig[i].weight;
			}
			for(var i = 0; i < hostConfig.length; i++) {
				var percent = ~~((hostConfig[i].weight / total) * 10000000);
				if(i == 0) {
					cluster.push(percent)
				} else {
					cluster.push(percent + cluster[i - 1])
				}
			}
			ops.cluster = cluster;
		}
		var range = ~~(Math.random() * 10000000);
		for(var i = 0; i < cluster.length; i++) {
			if(range <= cluster[i]) {
				var item = ops.hosts[i];
				options.hostname = item.host;
				options.port = item.port;
				break;
			}
		}
	}

	var request = (ops.https === true ? https : http).request(options, function(response) {
		res.set(response.headers);
		response.pipe(res);
	});
	return request;
	/*
	require('fs').writeFile('./log.txt', result, function(err){
		console.log(err)
	})
	/**/
}

app.all('*', function(req, res) {
	res.set({
		'Access-Control-Allow-Origin': '*'
	})
	req.next();
});

app.get('*', function(req, res) {
	if(req.originalUrl == "/favicon.ico") {
		res.sendStatus(404);
	} else {
		var request = forward(req, res);
		request.end();
	}
});

app.delete('*', function(req, res) {
	var request = forward(req, res);
	request.end();
});

app.post('*', function(req, res) {
	var request = forward(req, res);

	req.on('data', function(chunk) {
		if(chunk) {
			request.write(chunk);
		}
	})
	req.on('end', function() {
		request.end();
	})

});

app.put('*', function(req, res) {
	var request = forward(req, res);

	req.on('data', function(chunk) {
		if(chunk) {
			request.write(chunk);
		}
	})
	req.on('end', function() {
		request.end();
	})
});