#!/usr/bin/env node

'use strict'

var crypto = require("crypto");

const Encrypt = ({ str, method, pri = "", result = "hex" }) => {
	var c = null;
	if(pri) {
		c = crypto.createHmac(method, pri);
	} else {
		c = crypto.createHash(method);
	}
	c.update(str);
	return c.digest(result);
}

const aes_config = (method) => {
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

const ASE_Encrypt = ({ str, pri, method = "aes-128-ecb", result = "hex" }) => {
	let cfg = aes_config(method);
	if(pri.length !== cfg.length) {
		throw new Error(`${method}, 秘钥长度必须是${cfg.length}位`)
	}
	var cipher = crypto.createCipheriv(method, pri, cfg.iv);
	return cipher.update(str, 'utf8', result) + cipher.final(result);
}

const ASE_Decrypt = ({ str, pri, method = "aes-128-ecb", result = "hex" }) => {
	let cfg = aes_config(method);
	if(pri.length !== cfg.length) {
		throw new Error(`${method}, 秘钥长度必须是${cfg.length}位`)
	}
	var cipher = crypto.createDecipheriv(method, pri, cfg.iv);
	return cipher.update(str, result, 'utf8') + cipher.final('utf8');
}

var args = process.argv.slice(2);
var argMapping = {}
args.forEach((arg) => {
	let key = "";
	let value = "";
	if(arg.indexOf('=') > 0) {
		let _t = arg.split('=')
		key = _t[0]
		value = _t[1]
	} else {
		key = arg
	}
	argMapping[key] = value;
});

let method = "";
let pri = "";
let str = "";
let aes_method = "";
let aes_de = false;
let result = "hex";

for(var k in argMapping) {
	var v = argMapping[k];
	switch(k) {
		case "-h":
			var help = {
				"-m": "\t\t加密方式: md5,sha1,sha256,sha512",
				"-pri": "\t\t加密秘钥, -mac开启时, 此参数必须",
				"-str": "\t\t需要签名的字符串",
				"-aes-method": "\t对称加密方式, 例如: aes-128-ecb",
				"-d": "\t\t如果-aes-method参数存在，-d表示解密",
				"-result": "\t\t返回值类型, hex或者base64, 默认hex"
			}
			var r = "";
			for(var h in help) {
				r += `${h}${help[h]}\r\n`
			}
			var eg = {
				"hmac sha1加密": `\tsecret \\
	    -str=hujindi:1514861090328 \\
	    -result=hex \\
	    -pri=c561244e-d660-11e7-aaf8-d8a25e935567 \\
	    -m=sha1`,
				"aes对称加密": `\tsecret \\
	    -str=Test_AES_String \\
	    -result=hex \\
	    -pri=2fe4a27ee9eb11e7 \\
	    -aes-method=aes-128-ecb`,
				"aes对称解密": `\tsecret \\
	    -str=c8e8757bc9eba97898c5205443207b73 \\
	    -result=hex \\
	    -pri=2fe4a27ee9eb11e7 \\
	    -aes-method=aes-128-ecb \\
	    -d`
			}
			r += `
------------
举例
------------
`
			for(var h in eg) {
				r += `${h}\r\n${eg[h]}\r\n`
			}

			console.log(r);
			process.exit(true);
			break;
		case "-m":
			method = v;
			break;
		case "-d":
			aes_de = true;
			break;
		case "-pri":
			pri = v;
			break;
		case "-str":
			str = v;
			break;
		case "-aes-method":
			aes_method = v;
			break;
		case "-result":
			result = v;
			break;
	}
};

if(!str) {
	throw new Error("str参数必不可少")
}

if(!aes_method && !method) {
	throw new Error("必须选择一个加密方式")
}

if(aes_method && !pri) {
	throw new Error("对称加密时，参数pri(秘钥)是必须的")
}

console.time("Encrypt")
if(method) {
	console.log(Encrypt({ str, pri, method, result }))
}

if(aes_method) {
	if(!aes_de)
		console.log(ASE_Encrypt({ str, pri, method: aes_method, result }))
	else
		console.log(ASE_Decrypt({ str, pri, method: aes_method, result }))
}
console.timeEnd("Encrypt")