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
							temp.type = `DataTypes..TEXT('tiny')`;
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
				jsonTxt = JSON.stringify(columnMapping, null, 4)
				let index = jsonTxt.indexOf('"DataTypes');
				while (index >= 0) {
					let endIndex = jsonTxt.indexOf('"', index + 1);
					jsonTxt = jsonTxt.substr(0, endIndex) + jsonTxt.substr(endIndex + 1);
					index = jsonTxt.indexOf('"DataTypes', endIndex);
				}
				jsonTxt = jsonTxt.replace(/"DataTypes/g, 'DataTypes');
			});
			let template = `module.exports = function(sequelize, DataTypes) {
  return sequelize.define('${modelName}', ${jsonTxt}, {
    tableName: '${table}'
  });
};
`
			await write(table, template);
		}

		let indexTemplate = `
"use strict"

const fs = require("fs")
const path = require("path")

const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const operatorsAliases = {
	$eq: Op.eq,
	$ne: Op.ne,
	$gte: Op.gte,
	$gt: Op.gt,
	$lte: Op.lte,
	$lt: Op.lt,
	$not: Op.not,
	$in: Op.in,
	$notIn: Op.notIn,
	$is: Op.is,
	$like: Op.like,
	$notLike: Op.notLike,
	$iLike: Op.iLike,
	$notILike: Op.notILike,
	$regexp: Op.regexp,
	$notRegexp: Op.notRegexp,
	$iRegexp: Op.iRegexp,
	$notIRegexp: Op.notIRegexp,
	$between: Op.between,
	$notBetween: Op.notBetween,
	$overlap: Op.overlap,
	$contains: Op.contains,
	$contained: Op.contained,
	$adjacent: Op.adjacent,
	$strictLeft: Op.strictLeft,
	$strictRight: Op.strictRight,
	$noExtendRight: Op.noExtendRight,
	$noExtendLeft: Op.noExtendLeft,
	$and: Op.and,
	$or: Op.or,
	$any: Op.any,
	$all: Op.all,
	$values: Op.values,
	$col: Op.col
};
const sequelize = new Sequelize(process.env.MYSQL_DB, process.env.MYSQL_USER, process.env.MYSQL_PWD, {
	host: process.env.MYSQL_HOST,
	port: process.env.MYSQL_PORT,
	dialect: 'mysql',
	define: {
		timestamps: false,
	},
	dialectOptions: {
		multipleStatements: true
	},
	pool: {
		max: 10,
		min: 1,
		idle: 10000
	},
	operatorsAliases
})

const Redis = require('ioredis')
const redis = new Redis({
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT,
	password: process.env.REDIS_AUTH,
	db: process.env.REDIS_DB,
})

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
db.redis = redis

module.exports = db`
		await write('index', indexTemplate);
		process.exit()

	} catch (err) {
		console.log(err);
	}
})();