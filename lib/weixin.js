"use strict";

var crypto = require("crypto");
var common = require("./index");
var cache = require('autoredis').cache;
var request = require('./http-request');
var q = require("q");
var fs = require('fs');
var path = require('path');
var qr = require('qr-image');
var Secret = require('./secret');
var secret = new Secret();

exports = module.exports;

/**
 * query: req.query得到的json 对象
 */
exports.validateToken = function(query) {
	var signature = query.signature;
	var echostr = query.echostr;
	var timestamp = query['timestamp'];
	var nonce = query.nonce;
	var oriArray = new Array();
	oriArray[0] = nonce;
	oriArray[1] = timestamp;
	oriArray[2] = global.config.website.site_token;
	oriArray.sort();
	var original = oriArray.join('');
	var scyptoString = secret.ASE_Encrypt(original);
	if (signature == scyptoString) {
		return echostr;
	} else {
		return "false";
	}
};

exports.process_msg = function(json) {

	var reply = "";
	//发出事件
	if (json.MsgType == "event") {
		if (json.Event == "CLICK") {
			//EventKey: V1001_TODAY_MUSIC
		}
		if (json.Event == "VIEW") {
			//EventKey: http://v.qq.com/
		}
		if (json.Event == "unsubscribe") {}
		if (json.Event == "subscribe") {
			//关注
			reply = create_reply_subscribe(json.FromUserName, json.ToUserName);
		}
	} else if (json.MsgType == "text") {
		//接受消息
		reply = turnto_more_customer(json.FromUserName, json.ToUserName);
	} else if (json.MsgType == "voice") {
		//语音消息
		reply = turnto_more_customer(json.FromUserName, json.ToUserName);
	} else if (json.MsgType == "video") {
		//视频消息
		reply = turnto_more_customer(json.FromUserName, json.ToUserName);
	} else if (json.MsgType == "image") {
		//图片消息
		reply = turnto_more_customer(json.FromUserName, json.ToUserName);
	}

	return reply;
};

/**
 * @openid: 推送给谁
 * @data: { json对象 }
 * @type: 
 * 		1: 工作室通知 
 * 		2: 审核结果通知
 * 		3: 订单取消通知
 * 		4: 报名结果通知
 * 		5: 退款申请通知
 * 		6: 订单状态提醒 
 * @backurl: 点击模板的回调URL(可空)
 * */
exports.push_notise = function(openid, data, type, backurl) {
	var d = q.defer();
	var templateid = "";

	switch (type.toString()) {
		case "1":
			if (global.config.istest) templateid = "69eqv17r8ro5Qcc3YWbOeK8e5eSGfa9XvoRuEo2OsWw";
			else templateid = "K6ryANTgM8OdhzPK5NgrLCD50e7Hd0IA13TYJr-C_jI";
			break;
		case "2":
			if (global.config.istest) templateid = "kz3db8tmQSgR3k-TlowjEsBPEas3DxVMsQA7d-yxJdc";
			else templateid = "py75-uufRsmqvSsBo11WPZKiyB2vE032Sj5lCNxrfhI";
			break;
		case "3":
			if (global.config.istest) templateid = "OG44a-ZxsNsr2ldXHXYbWHEuqadqcg8dju2PFJzLNU4";
			else templateid = "OAwZtGCHQKcQs10_fcgAa_3fELY4jpBfu9HN5QzqcS0";
			break;
		case "4":
			if (global.config.istest) templateid = "uUNjIv7DfV3fG7XqQKe9AGw5b14TVwM5SEymI3QoOmU";
			else templateid = "4JKfkexPJAAczagBwNTzu-CLbuusTC16fsfiGQUtGgs";
			break;
		case "5":
			if (global.config.istest) templateid = "81hor5347Gh5D3Igfb2u8gGN4xx9kTPvEqAbWya89Zg";
			else templateid = "VMKjfCplHG1J2VZoPXWBiR2IES1GrkbLbXAT30t7XOw";
			break;
		case "6":
			if (global.config.istest) templateid = "3TyKPbLtr_a4GL-NA7sxDLQhabbgz5NdfQ30yTVfG6s";
			else templateid = "cLJH3tw1QEs_PhoSOOjcC0zW_NJx3Si0LprwCeC6Y9w";
			break;
	}

	var json = {
		"touser": openid,
		"template_id": templateid,
		"topcolor": "#FF0000",
		"data": {}
	}
	if (backurl) json.url = backurl;
	if (data.first) {
		json.data.first = {
			"value": data.first,
			"color": "#000"
		}
	}
	if (data.keyword1) {
		json.data.keyword1 = {
			"value": data.keyword1,
			"color": "#000"
		}
	}
	if (data.keyword2) {
		json.data.keyword2 = {
			"value": data.keyword2,
			"color": "#000"
		}
	}
	if (data.keyword3) {
		json.data.keyword3 = {
			"value": data.keyword3,
			"color": "#000"
		}
	}
	if (data.class) {
		json.data.class = {
			"value": data.class,
				"color": "#000"
		}
	}
	if (data.time) {
		json.data.time = {
			"value": data.time,
			"color": "#000"
		}
	}
	if (data.add) {
		json.data.add = {
			"value": data.add,
			"color": "#000"
		}
	}
	if (data.remark) {
		json.data.remark = {
			"value": data.remark,
			"color": "#333"
		}
	}

	exports.get_access_token()
		.then(function(token) {
			request.send("https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=" + token, json)
				.then(function(msg) {
					if (msg.errcode == 0) d.resolve("");
					else d.resolve(msg.errcode);
				}, function(err) {
					d.resolve(err);
				})
		}, function(error) {
			if (error) {
				console.error(error);
				d.resolve(error);
			}
		}).catch(function(error) {
			if (error) {
				console.error(error);
				d.resolve(error);
			}
		});

	return d.promise;
}

/**
 * @openid: 推送给谁
 * @message: 类型为string时，推送纯文本消息，类型为@json或者@array时，推送图文消息
 *
 * @json:{title: "图文标题", description: "图文描述", link_url: "跳转链接", pic_url: "图片路径"}
 * @array: [{title: "图文标题", link_url: "跳转链接", pic_url: "图片路径"}]
 * */
exports.push_msg = function(openid, message, callback) {

	var push_msg = function(token) {
		var params = {};
		if (typeof message == "string") {
			params = {
				"touser": openid,
				"msgtype": "text",
				"text": {
					"content": message
				}
			};
		} else {
			params = {
				"touser": openid,
				"msgtype": "news",
				"news": {
					"articles": []
				}
			}
			if (message instanceof Array) {
				for (var i = 0; i < message.length; i++) {
					params.news.articles.push({
						"title": message[i].title,
						"url": message[i].link_url,
						"picurl": message[i].pic_url
					})
				}
			} else {
				params.news.articles.push({
					"title": message.title,
					"description": message.description,
					"url": message.link_url,
					"picurl": message.pic_url
				})
			}
		}

		request.send("https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=" + token, params)
			.then(function(msg) {
				if (msg.errcode == 0) {
					if (callback) callback(null);
				} else {
					if (callback) callback(msg);
				}
			}, function(err) {
				if (callback) callback(err);
			})
	}

	exports.get_access_token()
		.then(function(token) {
			push_msg(token);
		}, function(error) {
			if (error && callback) {
				callback(error);
				console.error(error);
			}
		}).catch(function(error) {
			if (error && callback) {
				callback(error);
				console.error(error);
			}
		});
}

exports.get_access_token = function() {
	var d = q.defer();

	cache.promise("access_token")
		.then(function(token) {
			d.resolve(token);
		}, function(err) {
			return get_access_token();
		})
		.then(function(token) {
			if (token) {
				d.resolve(token);
			}
		}, function(err) {
			if (err) {
				d.reject(err);
			}
		})
		.catch(function(error) {
			if (error) {
				d.reject(error);
			}
		});

	return d.promise;
}

exports.download_media = function(media_id, callback, istemp) {
	exports.get_access_token()
		.then(function(token) {
			var url = `http://file.api.weixin.qq.com/cgi-bin/media/get?access_token=${token}&media_id=${media_id}`;
			var rootpath = istemp ? global.config.upload_temp : global.config.upload_wxfile;
			var save_as = path.join(rootpath, media_id + ".jpg");
			var reader = request.reader(url);
			var writer = fs.createWriteStream(save_as);
			reader.pipe(writer);
			reader.on('end', function() {
				if (callback) callback(media_id);
			});
			/*
			reader.on('data', function(chunk) {
				if (writer.write(chunk) === false) {
					reader.pause();
				}
			});
			writer.on('drain', function() {
				reader.resume();
			});
			reader.on('end', function() {
				writer.end();
				if (callback) callback(media_id);
			});
			*/
		}, function(err) {
			if (err && callback) callback("");
		})
		.catch(function(error) {
			if (error && callback) callback("");
		});
}

exports.get_jsapi_ticket = function(pagename) {
	var d = q.defer();

	get_jsapi_ticket()
		.then(function(ticket) {
			var url = pagename;
			var data = {
				appId: global.config.website.appid,
				timestamp: parseInt(Date.now() / 1000),
				nonceStr: common.guid(),
				signature: "",
				jsApiList: global.config.website.jsApiList
			}
			var signature = `jsapi_ticket=${ticket}&noncestr=${data.nonceStr}&timestamp=${data.timestamp}&url=${url}`;
			data.signature = secret.ASE_Encrypt(signature);
			d.resolve(data);
		}, function(err) {
			d.reject(err);
		})
		.catch(function(error) {
			if (error) {
				d.reject(error);
			}
		});

	return d.promise;
}

exports.close_order = function(order_number, cb) {
	var appid = global.config.website.appid;
	var mch_id = global.config.weixinpay.business_number;
	var nonce_str = common.guid().replace(/-/g, "");
	var key = global.config.weixinpay.secret_key;
	var stringA = `appid=${appid}&mch_id=${mch_id}&nonce_str=${nonce_str}&out_trade_no=${order_number}&key=${key}`;
	var sign = secret.ASE_Encrypt(stringA, 'md5').toUpperCase();

	var xml = `<xml><appid>${appid}</appid><mch_id>${mch_id}</mch_id><nonce_str>${nonce_str}</nonce_str><out_trade_no>${order_number}</out_trade_no><sign>${sign}</sign></xml>`;

	request.send("https://api.mch.weixin.qq.com/pay/closeorder ", xml)
		.then(function(msg) {
			common.xml_to_json(msg, function(json) {
				if (json && json.return_code == 'SUCCESS' && json.result_code == 'SUCCESS') {
					cb(true);
				} else {
					cb(false);
				}
			})
		}, function(err) {
			cb(false);
		})
}

exports.pay_unifiedorder = function(order_number, business_description, price, openid, ip) {
	var d = q.defer();
	var domain = global.config.website.domain;
	var appbase = global.config.istest ? "test" : "";
	var appid = global.config.website.appid;
	var body = business_description;
	var device_info = "WEB";
	var mch_id = global.config.weixinpay.business_number;
	var nonce_str = common.guid().replace(/-/g, "");
	var notify_url = `http://${domain}/weixin${appbase}/pay/notice/`;
	var oid = openid ? "&openid=" + openid : "";
	var oid_xml = openid ? "<openid>" + openid + "</openid>" : "";
	var out_trade_no = order_number || Date.now();
	var spbill_create_ip = ip;
	var total_fee = price;
	var trade_type = openid ? "JSAPI" : "NATIVE";
	var key = global.config.weixinpay.secret_key;

	var stringA = `appid=${appid}&body=${body}&device_info=${device_info}&mch_id=${mch_id}&nonce_str=${nonce_str}&notify_url=${notify_url}${oid}&out_trade_no=${out_trade_no}&spbill_create_ip=${spbill_create_ip}&total_fee=${price}&trade_type=${trade_type}&key=${key}`;
	var sign = secret.ASE_Encrypt(stringA, 'md5').toUpperCase();

	var xml = `<xml>
<appid>${appid}</appid>
<body>${body}</body>
<device_info>${device_info}</device_info>
<mch_id>${mch_id}</mch_id>
<nonce_str>${nonce_str}</nonce_str>
<notify_url>${notify_url}</notify_url>
${oid_xml}
<out_trade_no>${out_trade_no}</out_trade_no>
<spbill_create_ip>${spbill_create_ip}</spbill_create_ip>
<total_fee>${price}</total_fee>
<trade_type>${trade_type}</trade_type>
<sign>${sign}</sign>
</xml>`

	request.send("https://api.mch.weixin.qq.com/pay/unifiedorder", xml)
		.then(function(msg) {
			common.xml_to_json(msg, function(json) {
				d.resolve(json);
			})
		}, function(err) {
			d.reject(err);
		})

	return d.promise;
}

exports.create_qr_image = function(code_url, callback) {
	var img = qr.image(code_url);
	var save_as = common.guid() + ".png";
	var writer = fs.createWriteStream(path.join(global.config.upload_temp, save_as));
	img.pipe(writer);
	img.on('end', function() {
		if (callback) callback(save_as);
	});
}

var get_jsapi_ticket = function() {
	var d = q.defer();

	cache.promise("jsapi_ticket")
		.then(function(ticket) {
			d.resolve(ticket);
		}, function(err) {
			return exports.get_access_token()
		})
		.then(function(token) {
			if (token) {
				var url = "https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=" + token + "&type=jsapi";
				request.send(url, {})
					.then(function(msg) {
						if (msg && msg.ticket) {
							if (global.config.cache.enable) {
								cache.set("jsapi_ticket", msg.ticket, 7100);
							}
							d.resolve(msg.ticket);
						} else {
							d.reject(msg);
						}
					}, function(err) {
						d.reject(err);
					})
			}
		}, function(err) {
			if (err) {
				d.reject(err);
			}
		})
		.catch(function(error) {
			if (error) {
				d.reject(error);
			}
		});

	return d.promise;
}

var get_access_token = function() {
	var d = q.defer();
	var url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + global.config.website.appid + "&secret=" + global.config.website.secret;
	request.send(url, {})
		.then(function(msg) {
			if (msg && msg.access_token) {
				if (global.config.cache.enable) {
					cache.set("access_token", msg.access_token, 7100);
				}
				d.resolve(msg.access_token);
			} else {
				d.reject(new Error("请求获取access token出现异常！"));
			}
		}, function(err) {
			d.reject(err);
		})
	return d.promise;
}

function create_reply_subscribe(to, from) {
	var url = "http://www.zhbosdoctor.com/wx/";
	if (global.config.istest) url = "http://www.zhbosdoctor.cn/wxtest/";

	var reply = "<xml>\
<ToUserName><![CDATA[" + to + "]]></ToUserName>\
<FromUserName><![CDATA[" + from + "]]></FromUserName>\
<CreateTime>" + Date.now() + "</CreateTime>\
<MsgType><![CDATA[news]]></MsgType>\
<ArticleCount>3</ArticleCount>\
<Articles>\
<item>\
<Title><![CDATA[欢迎关注“蜂飛医技”\n——蓝海之略临床医疗技术服务平台]]></Title>\
<PicUrl><![CDATA[http://www.zhbosdoctor.com/data_upload/resource/home/weixin0_360_20151217_1.jpg]]></PicUrl> \
<Url><![CDATA[http://mp.weixin.qq.com/s?__biz=MzA3OTUxMTQ0OQ==&mid=400417915&idx=1&sn=fab14849c4eac47e68fc265cf22192a5#rd]]></Url>\
</item>\
<item>\
<Title><![CDATA[服务介绍]]></Title>\
<PicUrl><![CDATA[http://www.zhbosdoctor.com/data_upload/resource/home/weixin1_20151217.jpg]]></PicUrl> \
<Url><![CDATA[" + url + "static-service-intro.html]]></Url>\
</item>\
<item>\
<Title><![CDATA[需求发布]]></Title>\
<PicUrl><![CDATA[http://www.zhbosdoctor.com/data_upload/resource/home/weixin2_20151217.jpg]]></PicUrl> \
<Url><![CDATA[" + url + "release-shoushu.html?service=shoushu]]></Url>\
</item>\
</Articles>\
</xml>";
	return reply;
}

function turnto_more_customer(to, from) {
	var now = Date.now();
	var reply = `<xml>
<ToUserName><![CDATA[${to}]]></ToUserName>
<FromUserName><![CDATA[${from}]]></FromUserName>
<CreateTime>${now}</CreateTime>
<MsgType><![CDATA[transfer_customer_service]]></MsgType>
</xml>`;
	return reply;
}

function create_reply_msg(to, from, content) {
	var reply = "<xml>\
<ToUserName><![CDATA[" + to + "]]></ToUserName>\
<FromUserName><![CDATA[" + from + "]]></FromUserName>\
<CreateTime>" + Date.now() + "</CreateTime>\
<MsgType><![CDATA[text]]></MsgType>\
<Content><![CDATA[" + content + "]]></Content>\
</xml>";
	return reply;
}