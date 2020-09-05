const mysql = require('mysql');
const fs = require('fs');
const path = require('path');

var createConnection = (opts) => {
	var connection = mysql.createConnection(opts);
	return connection;
}

var excuteSql = function (connection, sql) {
	return new Promise(function (resolve, reject) {
		connection.query(sql, function (err, rows) {
			if (err) reject(err)
			else resolve(rows);
		})
	});
}

var write = async function (table, content) {
	let dir = path.join(__dirname, 'models');
	let file = path.join(dir, table + '.js');
	try {
		await fs.promises.mkdir(dir)
	} catch (e) { }
	await fs.promises.writeFile(file, content, 'utf8')
};

(async () => {
	try {
		var args = {
			host: "192.168.1.110",
			port: 3306,
			user: "root",
			password: "123456",
			database: "rk_v5"
		}
		let db = createConnection(args);
		let sql = `select table_name from information_schema.tables where table_schema='${args.database}' and (table_type='base table' or table_type='view')`;
		let tables = await excuteSql(db, sql);

		while (tables.length > 0) {
			let item = tables.shift();
			let table = item.table_name;
			let modelName = "";

			table.split('_').forEach((item) => {
				for (var i = 0; i < item.length; i++) {
					if (i == 0) modelName += item[i].toUpperCase();
					else modelName += item[i]
				}
			})

			/*
			 查询外键约束语句
			`select 
	table_name,
	column_name,
	referenced_table_name,
	referenced_column_name 
from INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
where CONSTRAINT_SCHEMA='${args.db}' 
AND REFERENCED_TABLE_SCHEMA is not null`
*/

			let colSql = `show columns from ${table}`;
			let colums = await excuteSql(db, colSql);
			let columnMapping = {};
			let jsonTxt;
			var splitChat = '    '

			colums.forEach((col) => {
				let temp = {};
				let type = col.Type;
				if (col.Null == "NO") {
					temp.allowNull = false;
				} else {
					temp.allowNull = true;
				}
				if (col.Default) {
					temp.defaultValue = col.Default + '';
				}
				if (col.Extra == "auto_increment") {
					temp.autoIncrement = true;
				}
				if (col.Key == "PRI" || col.Field == "id") {
					temp.primaryKey = true;
				}
				if (col.Key == "UNI") {
					temp.unique = true;
				}
				if (type.indexOf('float') >= 0 || type.indexOf('double') >= 0 || type.indexOf('decimal') >= 0) {
					temp.type = `DataTypes.${type.toUpperCase()}`;
				} else if (type.indexOf('(') >= 0) {
					type = type.substr(0, type.length - 1);
					let types = type.split('(');
					switch (types[0]) {
						case "tinyint":
						case "smallint":
						case "mediumint":
						case "int":
						case "bigint":
						case "bit":
							temp.type = `DataTypes.INTEGER(${types[1]})`;
							break;
						case "char":
						case "varchar":
							temp.type = `DataTypes.STRING(${types[1]})`;
							break;
					}
				}
				if (temp.type === undefined) {
					switch (type) {
						case "text":
							temp.type = `DataTypes.TEXT`;
							break;
						case "tinytext":
							temp.type = `DataTypes.TEXT('tiny')`;
							break;
						case "date":
						case "time":
						case "datetime":
						case "timestamp":
							temp.type = `DataTypes.DATE`;
							if (temp.defaultValue) {
								temp.defaultValue = "DataTypes.NOW";
							}
							break;
					}
				}

				columnMapping[col.Field] = temp;
				var jsonTxtStrArray = []
				for (let tk in columnMapping) {
					let tv = JSON.stringify(columnMapping[tk]);
					tv = tv
						.replace(/\"/g, '')
						.replace(/\{/g, '{ ')
						.replace(/\}/g, ' }')
						.replace(/\,/g, ', ')
						.replace(/\:/g, ': ')
					jsonTxtStrArray.push(`${splitChat.repeat(2)}${tk}: ${tv},`)
				}
				jsonTxt = `{\n${jsonTxtStrArray.join('\n')}\n${splitChat}}`
				let index = jsonTxt.indexOf('"DataTypes');
				while (index >= 0) {
					let endIndex = jsonTxt.indexOf('"', index + 1);
					jsonTxt = jsonTxt.substr(0, endIndex) + jsonTxt.substr(endIndex + 1);
					index = jsonTxt.indexOf('"DataTypes', endIndex);
				}
				jsonTxt = jsonTxt.replace(/"DataTypes/g, 'DataTypes');
			});
			let template = `module.exports = function (sequelize, DataTypes) {
${splitChat.repeat(1)}return sequelize.define('${modelName}', ${jsonTxt}, {
${splitChat.repeat(2)}tableName: '${table}'
${splitChat.repeat(1)}});
};
`
			await write(table, template);
		}

		let indexTemplate = `
"use strict"

const fs = require("fs")
const path = require("path")

const Sequelize = require("sequelize");
const sequelize = new Sequelize(process.env.MYSQL_DB, process.env.MYSQL_USER, process.env.MYSQL_PWD, {
	host: process.env.MYSQL_HOST,
	port: process.env.MYSQL_PORT,
	dialect: 'mysql',
	define: {
		timestamps: false,
	},
	dialectOptions: {
		multipleStatements: true,
		charset: 'utf8mb4'
	},
	timezone: '+08:00',
	// isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED,
	pool: {
		maxConnections: 50,
		minConnections: 1,
		maxIdleTime: 2000
	},
	logging: function () {
		if (process.env.MYSQL_LOG === "1") {
			console.log.apply(this, arguments);
		}
	},
	retry: {
		max: 99
	},
	benchmark: true,
})

/*
var isolationLevel = {
	READ_UNCOMMITTED: 'READ UNCOMMITTED',
	READ_COMMITTED: 'READ COMMITTED',
	REPEATABLE_READ: 'REPEATABLE READ',
	SERIALIZABLE: 'SERIALIZABLE'
}
*/

var db = {}

fs
	.readdirSync(__dirname)
	.filter(function(file) {
		return(file.indexOf(".") !== 0) && (file !== "index.js")
	})
	.forEach(function(file) {
		let model = sequelize.import(path.join(__dirname, file))
		db[model.name] = model
	})

db.sequelize = sequelize
db.Sequelize = Sequelize

const Redis = require('ioredis')
db.redis = new Redis({
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT,
	password: process.env.REDIS_AUTH,
	db: process.env.REDIS_DB,
})

db.redis
	.on('error', (err) => {
		console.log("RedisError")
	})
	.on('connect', (err) => {
		console.log("RedisConnect")
		db.REDIS_ENABLED = true;
	})
	.on('reconnecting', (err) => {
		console.log("RedisReconnecting")
		db.REDIS_ENABLED = false;
	})

db.RedisCatchException = function () {
	var RedisCommand = ["append", "asking", "auth", "bgrewriteaof", "bgsave", "bitcount", "bitfield", "bitop", "bitpos", "blpop", "brpop", "brpoplpush", "client", "cluster", "command", "config", "dbsize", "debug", "decr", "decrby", "del", "discard", "dump", "echo", "eval", "evalsha", "exec", "exists", "expire", "expireat", "flushall", "flushdb", "geoadd", "geodist", "geohash", "geopos", "georadius", "georadius_ro", "georadiusbymember", "georadiusbymember_ro", "get", "getbit", "getrange", "getset", "hdel", "hexists", "hget", "hgetall", "hincrby", "hincrbyfloat", "hkeys", "hlen", "hmget", "hmset", "host:", "hscan", "hset", "hsetnx", "hstrlen", "hvals", "incr", "incrby", "incrbyfloat", "info", "keys", "lastsave", "latency", "lindex", "linsert", "llen", "lpop", "lpush", "lpushx", "lrange", "lrem", "lset", "ltrim", "memory", "mget", "migrate", "module", "monitor", "move", "mset", "msetnx", "multi", "object", "persist", "pexpire", "pexpireat", "pfadd", "pfcount", "pfdebug", "pfmerge", "pfselftest", "ping", "post", "psetex", "psubscribe", "psync", "pttl", "publish", "pubsub", "punsubscribe", "quit", "randomkey", "readonly", "readwrite", "rename", "renamenx", "replconf", "restore", "restore-asking", "role", "rpop", "rpoplpush", "rpush", "rpushx", "sadd", "save", "scan", "scard", "script", "sdiff", "sdiffstore", "select", "set", "setbit", "setex", "setnx", "setrange", "shutdown", "sinter", "sinterstore", "sismember", "slaveof", "slowlog", "smembers", "smove", "sort", "spop", "srandmember", "srem", "sscan", "strlen", "subscribe", "substr", "sunion", "sunionstore", "swapdb", "sync", "time", "touch", "ttl", "type", "unlink", "unsubscribe", "unwatch", "wait", "watch", "zadd", "zcard", "zcount", "zincrby", "zinterstore", "zlexcount", "zrange", "zrangebylex", "zrangebyscore", "zrank", "zrem", "zremrangebylex", "zremrangebyrank", "zremrangebyscore", "zrevrange", "zrevrangebylex", "zrevrangebyscore", "zrevrank", "zscan", "zscore", "zunionstore"]
	RedisCommand.forEach((cmd) => {
		var originCmd = db.redis[cmd];
		db.redis[cmd] = function () {
			try {
				//throw new Error("测试异常")
				if (db.REDIS_ENABLED !== true) {
					return Number.MIN_VALUE;
				}

				var v = originCmd.apply(db.redis, arguments)
				if (v.catch) {
					return v.catch(function (err) {
						return Number.MIN_VALUE;
					})
				} else {
					return v;
				}

			} catch (e) {
				return Number.MIN_VALUE;
			}
		}
	})
}

module.exports = db`
		await write('index', indexTemplate);
		process.exit()

	} catch (err) {
		console.log(err);
	}
})();