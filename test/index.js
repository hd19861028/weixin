var expect = require('chai').expect;
var assert = require('assert');
var co = require('co');

describe('测试文件：index.js', function() {
	var common = require('../lib/index.js');
	var _json = { xml: { appid: '123' } };
	var _xml = `<xml><appid>123</appid></xml>`;
	var _pwd = "123456";

	it('xmlToJson', function() {
		common.xmlToJson(_xml, (json, err) => {
			assert.ifError(err);
		})
	});

	it('jsonToXml', function() {
		try {
			common.jsonToXml(_json);
			assert.ok(true);
		} catch(e) {
			assert.ifError(e);
		}
	});

	it('hash', function() {
		var hash = common.hash(JSON.stringify(_json));
		expect(hash).to.be.equal('883297290');
	});

	it('makePwd', function() {
		co(function*() {
			try {
				var r = yield common.makePwd(_pwd);
				assert.ok(true);
			} catch(e) {
				assert.ifError(e);
			}
		})
	});

	it('validPwd', function() {
		co(function*() {
			try {
				var r = yield common.makePwd(_pwd);
				r = yield common.validPwd(_pwd, r.pwd, r.salt);
				expect(r).to.be.equal(true);
			} catch(e) {
				assert.ifError(e);
			}
		})
	});
});

describe('测试文件：secret.js', function() {
	var sec = require('../lib/secret.js');
	var source = "123456";
	var key = "123456";
	var aes_key = "1234567890123456";
	var ts = ~~(Date.now() / 1000);

	it('md5', function() {
		var pwd = sec.Encrypt(source, 'md5');
		expect(pwd).to.be.equal('e10adc3949ba59abbe56e057f20f883e');
	});

	it('sha1', function() {
		var pwd = sec.Encrypt(source, 'sha1');
		expect(pwd).to.be.equal('7c4a8d09ca3762af61e59520943dc26494f8941b');
	});

	it('sha256', function() {
		var pwd = sec.Encrypt(source, 'sha256');
		expect(pwd).to.be.equal('8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92');
	});

	it('sha512', function() {
		var pwd = sec.Encrypt(source, 'sha512');
		expect(pwd).to.be.equal('ba3253876aed6bc22d4a6ff53d8406c6ad864195ed144ab5c87621b6c233b548baeae6956df346ec8c17f5ea10f35ee3cbc514797ed7ddd3145464e2a0bab413');
	});

	it('hmac md5', function() {
		var pwd = sec.Encrypt(source, 'md5', key);
		expect(pwd).to.be.equal('30ce71a73bdd908c3955a90e8f7429ef');
	});

	it('hmac sha1', function() {
		var pwd = sec.Encrypt(source, 'sha1', key);
		expect(pwd).to.be.equal('74b55b6ab2b8e438ac810435e369e3047b3951d0');
	});

	it('hmac sha256', function() {
		var pwd = sec.Encrypt(source, 'sha256', key);
		expect(pwd).to.be.equal('b8ad08a3a547e35829b821b75370301dd8c4b06bdd7771f9b541a75914068718');
	});

	it('hmac sha512', function() {
		var pwd = sec.Encrypt(source, 'sha512', key);
		expect(pwd).to.be.equal('4899f48b7873797086fc392ed8074b34306f79145cf0f9d1757e806da2d43f3876b3c762f38015f2d3593a595ae607a6e0aa103a2a5fe502cf95051c9cd62ee1');
	});

	it('CreateToken', function() {
		var pwd = sec.CreateToken(source, key, ts);
		assert.ok(true);
	});

	it('ValidToken', function() {
		var pwd = sec.CreateToken(source, key, ts);
		var r = sec.ValidToken(source, key, ts, pwd);
		expect(r).to.be.equal(true);
	});

	it('Sign', function() {
		var pwd = sec.Sign(source, key);
		assert.ok(true);
	});

	it('Unsign', function() {
		var pwd = sec.Sign(source, key);
		var r = sec.Unsign(pwd, key);
		expect(r).to.be.equal(source);
	});

	it('ASE_Encrypt', function() {
		var target = sec.ASE_Encrypt(source, aes_key);
		expect(target).to.be.equal('c97554911e393c5cf451fa5b0c1f3f7b');
	});

	it('ASE_Decrypt', function() {
		var target = sec.ASE_Encrypt(source, aes_key);
		var _source = sec.ASE_Decrypt(target, aes_key);
		expect(_source).to.be.equal(source);
	});
});
