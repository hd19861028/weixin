var crypto = require("crypto");

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

function Secret() {}

Secret.Encrypt = (str, method="sha1", key="65d460d57ddfd8865d17e652b6d530cc") => {
	var c = null;
	if(key) {
		c = crypto.createHmac(method, key);
	} else {
		c = crypto.createHash(method);
	}
	c.update(str);
	return c.digest("hex");
}

Secret.Sign = (str, key) => (str + '.' + Secret.Encrypt(str, 'sha256', key))

Secret.Unsign = (str, key) => {
	var temp = str.slice(0, str.lastIndexOf('.'));
	var mac = Secret.Sign(temp, key);
	return mac == str ? temp : false;
}

var aes_config = (method) => {
	let iv = null;
	let length = 0;
	switch(method) {
		case "aes-128-ecb":
			length = 16;
			iv = Buffer.alloc(0)
			break;
		case "aes-128-cbc":
			length = 16;
			iv = Buffer.alloc(16)
			break;
		case "aes-192-ecb":
			length = 24;
			iv = Buffer.alloc(0)
			break;
		case "aes-192-cbc":
			length = 24;
			iv = Buffer.alloc(16)
			break;
		case "aes-256-ecb":
			length = 32;
			iv = Buffer.alloc(0)
			break;
		case "aes-256-cbc":
			length = 32;
			iv = Buffer.alloc(16)
			break;
	}

	return { iv, length }
}

Secret.ASE_Encrypt = ({ str, pri, method = "aes-128-ecb", result = "hex" }) => {
	let cfg = aes_config(method);
	if(pri.length !== cfg.length) {
		throw new Error(`${method}, 秘钥长度必须是${cfg.length}位`)
	}
	var cipher = crypto.createCipheriv(method, pri, cfg.iv);
	return cipher.update(str, 'utf8', result) + cipher.final(result);
}

Secret.ASE_Decrypt = ({ str, pri, method = "aes-128-ecb", result = "hex" }) => {
	let cfg = aes_config(method);
	if(pri.length !== cfg.length) {
		throw new Error(`${method}, 秘钥长度必须是${cfg.length}位`)
	}
	var cipher = crypto.createDecipheriv(method, pri, cfg.iv);
	return cipher.update(str, result, 'utf8') + cipher.final('utf8');
}

Secret.CreateToken = (publicKey, privateKey, ts) => {
	return Secret.Encrypt(`${publicKey}:${privateKey}:${ts}`, 'sha1');
}

Secret.ValidToken = (publicKey, privateKey, ts, signOrigin) => {
	var sign = Secret.CreateToken(publicKey, privateKey, ts);
	return(sign === signOrigin);
}

exports = module.exports = Secret;
