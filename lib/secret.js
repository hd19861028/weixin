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

function Secret() {}

Secret.Encrypt = (str, method, key) => {
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

Secret.ASE_Encrypt = (str, key) => {
	var cipher = crypto.createCipheriv('aes-128-ecb', key, Buffer.alloc(0));
	return cipher.update(str, 'utf8', 'hex') + cipher.final('hex');
}

Secret.ASE_Decrypt = (str, key) => {
	var cipher = crypto.createDecipheriv('aes-128-ecb', key, Buffer.alloc(0));
	return cipher.update(str, 'hex', 'utf8') + cipher.final('utf8');
}

Secret.CreateToken = (publicKey, privateKey, ts) => {
	return Secret.Encrypt(`${publicKey}:${privateKey}:${ts}`, 'sha1');
}

Secret.ValidToken = (publicKey, privateKey, ts, signOrigin) => {
	var sign = Secret.CreateToken(publicKey, privateKey, ts);
	return(sign === signOrigin);
}

exports = module.exports = Secret;