var crypto = require("crypto");
var buf = require("buffer");

function Secret(key, method) {
	this.key = key ? key : global.config.ase_key;
	this.method = method ? method : 'sha1';
}

Secret.prototype.Encrypt = function(str, method) {
	if (!method) method = this.method;
	var Buffer = buf.Buffer;
	var buff = new Buffer(str);
	var bytes = buff.toString("binary");
	var c = crypto.createHash(method);
	c.update(bytes);
	return c.digest("hex");
}

Secret.prototype.Sign = function(str, key) {
	if (!key) key = this.key;

	return str + '.' + crypto
		.createHmac('sha256', key)
		.update(str)
		.digest('base64')
		.replace(/\=+$/, '');
}

Secret.prototype.ASE_Encrypt = function(str, key) {
	if (!key) key = this.key;
	var cipher = crypto.createCipher('aes-128-ecb', key);
	return cipher.update(str, 'utf8', 'hex') + cipher.final('hex');
}

Secret.prototype.ASE_Decrypt = function(str, key) {
	if (!key) key = this.key;
	var cipher = crypto.createDecipher('aes-128-ecb', key);
	return cipher.update(str, 'hex', 'utf8') + cipher.final('utf8');
}

Secret.prototype.Unsign = function(str, key) {
	if (!key) key = this.key;

	var temp = str.slice(0, str.lastIndexOf('.')),
		mac = this.Sign(temp, key);

	return mac == str ? temp : false;
}

exports = module.exports = Secret;