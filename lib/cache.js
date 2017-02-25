var redis = require("redis");
var q = require('q');

exports = module.exports;


function connection(callback) {

	var config = global.config.cache;

	if (config.enable) {
		var redis_client = redis.createClient(config.port, config.ip, {
			connect_timeout: config.timeout,
			retry_max_delay: 2000,
			max_attempts: 5
		});
		redis_client.on('error', function(err) {
			console.error(err);
		});
		callback(redis_client, null);
	} else {
		callback(null, null);
	}

}

function get_db_count(key) {
	return 0//key.length % global.config.cache.db_count;
}

exports.promise = function(key) {
	var d = q.defer();
	var error = new Error("cache中未找到任何值。key：" + key);
	if (global.config.cache.enable) {
		exports.exists(key, function(err, value) {
			if (err || !value) {
				d.reject(error);
			} else {
				d.resolve(value);
			}
		});
	} else {
		d.reject(error);
	}
	return d.promise;
};

exports.set = function(key, obj, timeout, callback) {
	connection(function(client, err_msg) {
		if (client) {
			obj = JSON.stringify(obj);

			client.select(get_db_count(key), function(c, c1) {
				client.set(key, obj, function(err, res) {
					if (!timeout && timeout != 0) {
						timeout = global.config.cache.expire;
					}
					client.expire(key, timeout);
					if (callback)
						callback(err, res);
					client.end();
				});
			});
		} else {
			if (err_msg)
				console.error(err_msg);
			if (callback)
				callback("redis缓存未开启！", null);
		}
	});
};

exports.get = function(key, callback, redis) {
	var __key = key;
	var cb = callback;
	var __get = function(client) {
		client.select(get_db_count(key), function() {
			client.get(__key, function(err, response) {
				if (response) {
					response = JSON.parse(response);
				}
				if (cb)
					cb(err, response);
				client.end();
			});
		});
	};

	if (redis) {
		var client = redis;
		__get(client);
	} else {
		connection(function(client, err_msg) {
			if (client) {
				__get(client);
			} else {
				callback(err_msg, null);
			}
		});
	}
};

exports.exists = function(key, callback) {
	if (!key) {
		callback('key值不能为null', undefined);
		return;
	}
	connection(function(client, err_msg) {
		if (client) {
			client.select(get_db_count(key), function() {
				client.exists(key, function(err, response) {
					if (response == 1)
						exports.get(key, callback, client);
					else {
						callback(null, undefined);
						client.end();
					}
				});
			});
		} else {
			callback(err_msg, undefined);
		}
	});
};