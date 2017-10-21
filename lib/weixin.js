"use strict";

const crypto = require("crypto");
const common = require("./index");
const cache = require('./cache');
const request = require('./http-request');
const q = Promise || require('q').Promise;
const fs = require('fs');
const path = require('path');
const qr = require('qr-image');
const Secret = require('./secret');
const secret = new Secret();

exports = module.exports;

/**
 * @param {Object} query	express框架req.query得到的json对象
 */
exports.validate_token = function(query) {
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
	var scyptoString = secret.Encrypt(original);
	if(signature == scyptoString) {
		return echostr;
	} else {
		return "false";
	}
};

/**
 * 处理微信发过来的消息
 * @param {Object} json
 */
exports.process_msg = function(json) {

	var reply = "";
	//发出事件
	if(json.MsgType == "event") {
		if(json.Event == "CLICK") {
			//EventKey: V1001_TODAY_MUSIC
		}
		if(json.Event == "VIEW") {
			//EventKey: http://v.qq.com/
		}
		if(json.Event == "unsubscribe") {}
		if(json.Event == "subscribe") {
			//关注
			reply = ""; //create_reply_subscribe(json.FromUserName, json.ToUserName);
		}
	} else if(json.MsgType == "text") {
		//接受消息
		reply = turnto_more_customer(json.FromUserName, json.ToUserName);
	} else if(json.MsgType == "voice") {
		//语音消息
		reply = turnto_more_customer(json.FromUserName, json.ToUserName);
	} else if(json.MsgType == "video") {
		//视频消息
		reply = turnto_more_customer(json.FromUserName, json.ToUserName);
	} else if(json.MsgType == "image") {
		//图片消息
		reply = turnto_more_customer(json.FromUserName, json.ToUserName);
	}

	return reply;
};

/**
 * 发送模板消息
 * @param {String} 推送给谁
 * @param {String} 模板消息id
 * @param {Object} data
 * @param {String} 点击模板的回调URL(可空)
 */
exports.push_notise = function(openid, templateid, data, backurl) {
	return new q(function(resolve, reject) {
		var json = {
			"touser": openid,
			"template_id": templateid,
			"topcolor": "#FF8080",
			"data": {}
		}
		if(backurl) json.url = backurl;

		for(var k in data) {
			var v = data[k];
			if(v) {
				if(typeof v == "string") {
					var r = {};
					r.value = v;
					r.color = "#000";
					json.data[k] = r;
				}
				if(typeof v == "object") {
					json.data[k] = v;
				}

			}
		}

		exports.get_access_token()
			.then(function(token) {
				return request.Post("https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=" + token, json)
			}, function(error) {
				if(error) {
					console.error(error);
					resolve(error);
				}
			})
			.then(function(msg) {
				if(msg != undefined) {
					if(msg.errcode == 0) resolve("");
					else resolve(msg.errcode);
				}
			}, function(err) {
				resolve(err);
			})
			.catch(function(error) {
				if(error) {
					console.error(error);
					resolve(error);
				}
			});
	});
}

/**
 * 发送客服消息
 * @openid: 推送给谁
 * @message: 类型为string时，推送纯文本消息，类型为@json或者@array时，推送图文消息
 *
 * @json:{title: "图文标题", description: "图文描述", link_url: "跳转链接", pic_url: "图片路径"}
 * @array: [{title: "图文标题", link_url: "跳转链接", pic_url: "图片路径"}]
 * */
exports.push_msg = function(openid, message, callback) {

	var push_msg = function(token) {
		var params = {};
		if(typeof message == "string") {
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
			if(message instanceof Array) {
				for(var i = 0; i < message.length; i++) {
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

		request.Post("https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=" + token, params)
			.then(function(msg) {
				if(msg.errcode == 0) {
					if(callback) callback(null);
				} else {
					if(callback) callback(msg);
				}
			}, function(err) {
				if(callback) callback(err);
			})
	}

	exports.get_access_token()
		.then(function(token) {
			push_msg(token);
		}, function(error) {
			if(error && callback) {
				callback(error);
				console.error(error);
			}
		}).catch(function(error) {
			if(error && callback) {
				callback(error);
				console.error(error);
			}
		});
}

/**
 * 回复消息
 * @param {String} openid
 * @param {String|Array} msgs
 * @param {String} msgtype	text,news，默认为news，即图文消息
 */
exports.reply_news = function(openid, msgs, msgtype) {
	msgtype = msgtype || 'news';
	var groupid = global.config.website.groupid;
	var time = ~~(Date.now() / 1000);
	var list = "";
	if(msgtype == "news") {
		var length = msgs.length;
		list = `<ArticleCount>${length}</ArticleCount><Articles>`;

		for(var i = 0; i < msgs.length; i++) {
			var item = msgs[i];
			list += `<item><Title><![CDATA[${item.title}]]></Title><PicUrl><![CDATA[${item.pic}]]></PicUrl><Description><![CDATA[${item.description}]]></Description><Url><![CDATA[${item.link}]]></Url></item>`;
		}
		list += "</Articles>"
	}
	if(msgtype == "text") {
		list = `<Content><![CDATA[${msgs}]]></Content>`
	}

	var reply =
		`<xml>
			<ToUserName><![CDATA[${openid}]]></ToUserName>
			<FromUserName><![CDATA[${groupid}]]></FromUserName>
			<CreateTime>${time}</CreateTime>
			<MsgType><![CDATA[${msgtype}]]></MsgType>
			${list}
		</xml>`;

	return reply;
}

exports.get_access_token = function() {
	return new q(function(resolve, reject) {
		cache.promise("access_token")
			.then(function(token) {
				resolve(token);
			}, function(err) {
				return get_access_token();
			})
			.then(function(token) {
				if(token) {
					resolve(token);
				}
			}, function(err) {
				if(err) {
					reject(err);
				}
			})
			.catch(function(error) {
				if(error) {
					reject(error);
				}
			});
	});
}

exports.download_media = function(media_id, callback, saveAs) {
	exports.get_access_token()
		.then(function(token) {
			var url = `https://file.api.weixin.qq.com/cgi-bin/media/get?access_token=${token}&media_id=${media_id}`;
			var rootpath = saveAs ? saveAs : global.config.upload_temp;
			var save_as = path.join(rootpath, media_id);
			request.Download(url, save_as).then(function(r) {
				if(r === true) {
					callback(null, media_id);
				} else {
					callback(r, null);
				}
			});
		}, function(err) {
			if(err && callback) callback(err, null);
		})
		.catch(function(error) {
			if(error && callback) callback(error, null);
		});
}

exports.get_jsapi_ticket = function(pagename) {
	return new q(function(resolve, reject) {
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
				data.signature = secret.Encrypt(signature);
				resolve(data);
			}, function(err) {
				reject(err);
			})
			.catch(function(error) {
				if(error) {
					reject(error);
				}
			});
	});
}

exports.close_order = function(order_number, cb) {
	var appid = global.config.website.appid;
	var mch_id = global.config.weixinpay.business_number;
	var nonce_str = common.guid().replace(/-/g, "");
	var key = global.config.weixinpay.secret_key;
	var stringA = `appid=${appid}&mch_id=${mch_id}&nonce_str=${nonce_str}&out_trade_no=${order_number}&key=${key}`;
	var sign = secret.Encrypt(stringA, 'md5').toUpperCase();

	var xml = `<xml><appid>${appid}</appid><mch_id>${mch_id}</mch_id><nonce_str>${nonce_str}</nonce_str><out_trade_no>${order_number}</out_trade_no><sign>${sign}</sign></xml>`;

	request.Post("https://api.mch.weixin.qq.com/pay/closeorder ", xml)
		.then(function(msg) {
			common.xml_to_json(msg, function(json) {
				if(json && json.return_code == 'SUCCESS' && json.result_code == 'SUCCESS') {
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
	return new q(function(resolve, reject) {
		var domain = global.config.website.domain;
		var appbase = "";
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
		var sign = secret.Encrypt(stringA, 'md5').toUpperCase();

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

		request.Post("https://api.mch.weixin.qq.com/pay/unifiedorder", xml)
			.then(function(msg) {
				common.xml_to_json(msg, function(json) {
					resolve(json);
				})
			}, function(err) {
				reject(err);
			})
	});
}

/**
 * 创建带场景值的二维码
 * @param {String|Number} scene	字符串guid或者number值	
 * @param {Number} expire		过期事件(单位：秒)，设置-1为永久二维码，默认值：3天，最大不得超过30天
 */
exports.create_qr = function(scene, expire) {
	return new q(function(resolve, reject) {
		exports.get_access_token()
			.then(function(token) {
				var url = `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${token}`;
				var param = { "action_info": { "scene": {} } };
				var isTemp = true;
				if(expire === -1) {
					isTemp = false;
				} else {
					param.expire_seconds = expire > 0 && expire < 2592000 ? expire : 259200;
				}
				if(typeof scene === "string") {
					if(isTemp) param.action_name = "QR_STR_SCENE";
					else param.action_name = "QR_LIMIT_STR_SCENE";
					param.action_info.scene.scene_str = scene;
				}
				if(typeof scene === "number") {
					if(isTemp) param.action_name = "QR_SCENE";
					else param.action_name = "QR_LIMIT_SCENE";
					param.action_info.scene.scene_id = scene;
				}
				return request.Post(url, param)
			}, function(err) {
				reject(err);
			})
			.then(function(r) {
				if(r) {
					resolve(r);
				}
			}, function(err) {
				reject(err);
			});
	});
}


/**
 * @param {String} code_url	需要创建二维码的url
 * @return	图片文件名。默认存储在{global.config.upload_temp}路径
 */
exports.create_qr_image = function(code_url) {
	return new q(function(resolve, reject) {
		var img = qr.image(code_url);
		var save_as = common.guid() + ".png";
		var writer = fs.createWriteStream(path.join(global.config.upload_temp, save_as));
		img.pipe(writer);
		img.on('end', function() {
			resolve(save_as);
		});
	})
}

var get_jsapi_ticket = function() {
	return new q(function(resolve, reject) {
		cache.promise("jsapi_ticket")
			.then(function(ticket) {
				resolve(ticket);
			}, function(err) {
				return exports.get_access_token()
			})
			.then(function(token) {
				if(token) {
					var url = "https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=" + token + "&type=jsapi";
					request.Get(url).then(function(msg) {
						if(msg && msg.ticket) {
							if(global.config.cache.enable) {
								cache.set("jsapi_ticket", msg.ticket, 7100);
							}
							resolve(msg.ticket);
						} else {
							reject(msg);
						}
					}, function(err) {
						reject(err);
					})
				}
			}, function(err) {
				if(err) {
					reject(err);
				}
			})
			.catch(function(error) {
				if(error) {
					reject(error);
				}
			});
	});
}

var get_access_token = function() {
	return new q(function(resolve, reject) {
		var url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + global.config.website.appid + "&secret=" + global.config.website.secret;
		request.Get(url).then(function(msg) {
			if(msg && msg.access_token) {
				if(global.config.cache.enable) {
					cache.set("access_token", msg.access_token, 7100);
				}
				resolve(msg.access_token);
			} else {
				reject(new Error("请求获取access token出现异常！"));
			}
		}, function(err) {
			reject(err);
		})
	});
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