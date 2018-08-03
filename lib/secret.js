const crypto = require("crypto");
const buf = require("buffer");

/*
 
//在线验证：http://tool.chinaz.com/tools/hash.aspx
var common = require('wx-common');
var Secret = common.secret;
var sec = new Secret();

var source = "123456";
var key = "123456";
var method = ['md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'];
console.log('\r\nsha加密')
for (var i = 0; i < method.length; i++) {
	console.log(method[i], '\t', sec.Encrypt(source, method[i]));
}
console.log('\r\nhmac加密')
for (var i = 0; i < method.length; i++) {
	console.log(method[i], '\t', sec.Encrypt(source, method[i], key));
}
 
 * */

function Secret(key, method) {
	this.key = key ? key : (global.config ? global.config.ase_key : '');
	this.method = method ? method : 'sha1';
}

Secret.prototype.Encrypt = function(str, method, key) {
	if(!method) method = this.method;
	var c = null;
	if(key){
		c = crypto.createHmac(method, key);
	}else{
		c = crypto.createHash(method);
	}
	c.update(str);
	return c.digest("hex");
}

Secret.prototype.Sign = function(str, key) {
	if(!key) key = this.key;

	return str + '.' + crypto
		.createHmac('sha256', key)
		.update(str)
		.digest('base64')
		.replace(/\=+$/, '');
}

Secret.prototype.ASE_Encrypt = function(str, key) {
	if(!key) key = this.key;
	var cipher = crypto.createCipheriv('aes-128-ecb', key, Buffer.alloc(0));
	return cipher.update(str, 'utf8', 'hex') + cipher.final('hex');
}

Secret.prototype.ASE_Decrypt = function(str, key) {
	if(!key) key = this.key;
	var cipher = crypto.createDecipheriv('aes-128-ecb', key, Buffer.alloc(0));
	return cipher.update(str, 'hex', 'utf8') + cipher.final('utf8');
}

Secret.prototype.Unsign = function(str, key) {
	if(!key) key = this.key;

	var temp = str.slice(0, str.lastIndexOf('.')),
		mac = this.Sign(temp, key);

	return mac == str ? temp : false;
}

/**
 * @param {Object} key				公钥
 * @param {Object} secretKey	私钥
 * @param {Object} ts				时间戳，单位：秒，有效期30秒
 * @return {String}	sha1(公钥+私钥+时间戳)
 */
Secret.prototype.CreateSign = function(key, secretKey, ts) {
	var str = key + secretKey + ts;
	var sign = this.Encrypt(str, 'sha1');
	return sign;
}

/**
 * @param {Object} key				公钥
 * @param {Object} secretKey	私钥
 * @param {Object} ts				时间戳，单位：秒，有效期30秒
 * @param {Object} signOrigin	待验证的签名串
 * @return {Number}
 * 		1: 		验证通过
 * 		0: 		签名不正确
 * 		-1: 	时间戳超时30秒，过期
 */
Secret.prototype.ValidSign = function(key, secretKey, ts, signOrigin) {
	var sign = this.CreateSign(key, secretKey, ts);
	var now = ~~(Date.now() / 1000);

	if(now - ts > 30) {
		return -1;
	}
	if(sign == signOrigin) {
		return 1;
	} else {
		return 0;
	}
}

exports = module.exports = Secret;