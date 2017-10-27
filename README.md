# wx-common

wx-common是一个node.js模块，提供微信项目开发的公共库

* [安装](#install)
* [添加全局配置](#config)
* [微信开发](#weixin)
* [加密模块](#secret)
* [Http Request模块](#request)
* [Common模块](#common)
* [原型扩展](#prototype)
* [Timer计时器模块](#timer)
* [fs的Promise实现](#fs)
* [仿Nginx代理转发(支持负载均衡配置)](#agent)

<h3 name="install">安装</h3>

```javascript
npm install wx-common
```

<h3 name="config">添加全局配置</h3>

> 必须将下面的配置设置到global.config全局对象中

```javascript
{
	/** 服务器根目录，可以在启动时动态设置 **/
	"root": "/data/web/",
	/** 默认的文件上传保存路径，可以在启动时动态设置 **/
	"upload_temp": "/data/upload/",
	/** 上传文件最大尺寸，可以在启动时动态设置 **/
	"upload_max_size": 100,
	/** AES加密密钥 **/
	"ase_key": "ahkdaksdnalksjd",
	/** 微信公众好有关的配置 **/
	"website": {
		/** 微信服务器接口域名 **/
		"domain": "xxxxxxxx.com",
		/** 微信公众号groupid **/
		"groupid": "gh_ahsudjikasndk",
		/** AppID(应用ID) **/
		"appid": "ahkdaksdnalksjd.a",
		/** AppSecret(应用密钥) **/
		"secret": "ahkdaksdnalksjd",
		/** Token(令牌) **/
		"site_token": "ahkdaksdnalksjd",
		/** jsapi方法名 **/
		"jsApiList": [],
		/** openid过期时间 **/
		"openid_expire": 31536000000
	},
	/** redis缓存配置 **/
	"cache": {
		"ip": "127.0.0.1",
		"port": 6379,
		"timeout": 3000,
		"expire": 300,
		"db_count": 16,
		"enable": true
	}
}
```

<h3 name="weixin">微信开发</h3>

功能概要

* [启动开发者模式](#wx1)
* [发送模板消息](#wx2)
* [发送客服消息](#wx3)
* [回复消息](#wx4)
* [获取Access Token](#wx5)
* [获取jsapi ticket](#wx6)
* [下载媒体对象](#wx7)
* [生成二维码](#wx8)

> 引入模块

```javascript
var wx = require('wx-common').weixin;
```

<a name="wx1"></a>
> 启动开发者模式

```javascript
//启动服务器配置时，第一次验证所用
//query是Express的req.query，无需修饰，直接传入
var result = wx.validateToken(query);
if(result === "false"){
	//失败
} else {
	//接入成功
}
```

<a name="wx2"></a>
> 发送模板消息

```javascript
wx.push_notise(openid, '模板消息id', data, '点击模板的回调URL(可空)');
//data属性，与模板消息的内容字段是对应关系。
//假设模板消息有字段title, keyword1, keyword2, desc，那么data可以如下设置
//所有字段的值，都支持String和Object两种格式
//注意：只能设置字体颜色，不能设置字体大小
var data = {
	"title": "测试标题",
	"keyword1": "测试内容1",
	"keyword2": "测试内容2",
	"desc": {
		"value": "这是模板消息底部描述信息",
		"color": "#cccccc"
	}
}
```

<a name="wx3"></a>
> 发送客服消息

```javascript
wx.push_msg(openid, message, callback);
//message: 
//	类型为string：推送纯文本消息
//	类型为json或者array时，推送图文消息
//	    json示例: {title: "图文标题", description: "图文描述", link_url: "跳转链接", pic_url: "图片路径"}
//	    array示例: [{title: "图文标题", link_url: "跳转链接", pic_url: "图片路径"}]
```

<a name="wx4"></a>
> 回复消息

```javascript
//Event == "CLICK时，服务台向微信用户回复的消息
//回复文本消息
wx.reply_news(openid, '谢谢关注', 'text');
//回复图文消息
wx.reply_news(openid, msgs, 'news');
//	msgs对象示例: 
//	    [{ title: "图文标题", link: "跳转链接", pic: "图片路径", description: "图文描述" }]
```

<a name="wx5"></a>
> 获取Access Token

```javascript
//返回Promise
wx.get_access_token()
```

<a name="wx6"></a>
> 获取jsapi ticket

```javascript
//返回Promise
//pagename: 使用jaapi的页面名
//此外，global.config.website.jsApiList对象中要设置需要使用的方法名
wx.get_jsapi_ticket(pagename)
```

<a name="wx7"></a>
> 下载媒体对象，比如图片，小视频，语音等等

```javascript
wx.download_media(media_id, callback, saveAs);
//callback(error, data)
```

<a name="wx8"></a>
> 生成带场景值的二维码

```javascript
//scene：数据类型必须是string或者Int32
//expire：过期时间(秒)，最大不得超过2592000，也就是30天，默认值259200，如果设置-1，将生成永久二维码
wx.create_qr(scene, expire); //返回promise
```

<a name="wx8"></a>
> 生成二维码

```javascript
wx.create_qr_image(web_url, callback);
//callback(save_as)
```

<h3 name="secret">加密模块</h3>

> Md5, Sha, HmacMd5, HmacSha用法示例

```javascript
//在线验证：http://tool.chinaz.com/tools/hash.aspx
var common = require('wx-common');
var sec = common.secret;

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
```

> AES加密解密用法示例

```javascript
var common = require('wx-common');
var sec = common.secret;

var source = "123456";
var aes_key = "1234567890123456";

var target = sec.ASE_Encrypt(source, aes_key);
console.log(target) //c97554911e393c5cf451fa5b0c1f3f7b
var _source = sec.ASE_Decrypt(target, aes_key);
console.log(_source == source) //true

//验证地址：http://tool.chacuo.net/cryptaes
//参数配置如下
//加密模式：ECB，填充：pkcs5padding，数据块：128位，偏移量：空，输出：hex，字符集：utf8
```

> 公私钥验证

```javascript
var common = require('wx-common');
var sec = common.secret;

var publicKey = "123456";
var privateKey = "123456";
var ts = ~~(Date.now() / 1000);

var token = sec.CreateToken(publicKey, privateKey, ts);
var r = sec.ValidToken(publicKey, privateKey, ts, token);
console.log(r); //true
```

<h3 name="request">Http Request模块</h3>

> 参数描述

```javascript
//请求路径
var url = "http://example.com/";
//发送数据，若是Object类型，内部会先JSON.stringify转换成String，然后再发送
var data = { a: 1, b: 2 };
var header = { 'Content-Type': 'application/json' };
//是否不处理响应流，直接输出。如果设置成true，将直接返回ResponseStream，而不是返回字符串
var isStream = false;
//文件的保存路径
var saveAsUrl = "E:/project/";
//启动多线程下载前，必须钱通过FileLength获取到文件的总长度
var maxLength = null;
//分多少段下载，一般设置成cpu的数量
var cpus = 4; //require('os').cpus().length
```

> 获取结果

```javascript
//引入模块
var request = require('wx-common').request;

//所有方法都返回Promise对象，请通过method.then获取结果
//如果isStream=false
request.Get(url, header, isStream)
	.then(function(result){
		//result (Object || String)
		//如果是json对象，将返回object，否则返回string
	})
//如果isStream=true
request.Get(url, header, isStream)
	.then(function(res) {
		res.setEncoding('utf8');
		var result = '';
		res.on('data', function(chunk) {
			result += chunk;
		});
		res.on('end', function() {
			
		});
		res.on('error', function(err) {
			
		});
	})
```

> 常用的Get, Post, Put, Delete

```javascript
request.Post(url, JSON.stringify(data), header, isStream);
request.Put(url, JSON.stringify(data), header, isStream);
request.Get(url, header, isStream);
request.Delete(url, header, isStream);
```

> 文件下载

```javascript
request.Download(url, saveAsUrl);
```

> 获取远程文件长度

```javascript
request.FileLength(url);
```

> 多线程下载（Debug中）

```javascript
request.DownloadParallel(url, saveAsUrl, maxLength, cpus);
```

<h3 name="common">Common模块</h3>

> 引入模块

```javascript
var common = require('wx-common').common;
```

> XML与JSON互转

```javascript
//xml转json
common.xmlToJson('xmlString', function(json) {

})

//json转xml
var xmlResult = common.jsonToXml(json)
```

> 获取字符串hash值

```javascript
var hash = common.hash('原字符串')
```

> 处理表单上传的文件

```javascript
//req: 		express的req
//res: 		express的res
//callback:	2个参数，分别是fields, files，2个对象都是数组
//save_as:	文件保存的目录(文件夹路径)
common.upload_file(req, res, callback, save_as)

//此外，使用此方法，还必须在global对象上设置2个属性
global.config.upload_temp		//表示文件保存的默认路径
global.config.upload_max_size	//表示最多允许上传多大的文件，int类型，单位m
```

> 获取guid

```javascript
var guid = common.guid()
```

> 获取shortid

```javascript
var shortid = common.shortid();
//可以自定义长度，默认长度9
shortid = common.shortid(12);
```

> 密码和盐值

```javascript
//根据指定的密码产生随机盐值
//返回promise，内容{ salt: '盐值', pwd: '原密码' }
common.makePwd(pwd)

//验证密码
//返回promise，内容true|false
common.validPwd(
	pwd, //用户输入的密码 
	pwd_db, //数据库存储的密码 
	salt //数据库存储的密码对应的盐值
)
```

> 删除文件夹下过期文件

```javascript
//需要清理的目录，不递归目录，只删除当前目录下的文件
var dir = '/data/logs/test-project/';
//指定一个天数，设置成5，意思是删除5天前的所有文件
//此功能一般用于清理过去日志文件
var expireDays = 5;

common.DeleteExpireFiles(dir, expireDays)
	.then(function(deletedFiles){
		//被删除的文件列表：
		console.log(deletedFiles);		
	})

```

<h3 name="prototype">原型扩展</h3>

> 引入模块

```javascript
require('wx-common').prototype;

//使用须知：
//	1. 若要使用WriteLog方法， 在项目初始化时需要设置global.config.root = __dirname，或者指定自己喜欢的目录
//	2. 在global.config.root指定的目录下，必须有一个“log”文件夹
```

> Number类型扩展

```javascript
//时间戳转换成指定的日期字符串
Date.now().Format('yyyy-MM-dd HH:mm:ss.fff');
```

> String类型扩展

```javascript
//判断当前字符串是否包含Emoji字符
str.HasEmoji()
//将当前字符串写入log文件中
//isError: true|false， 是不是错误消息。如果true，将会记录到error.log中，否则记录到info
str.WriteLog(isError);
```

> global对象扩展

```javascript
//获取当前日期的utc时间戳
//dt: Date对象，为空则指定当前时间
global.GetUTC(dt);
//记录日志
global.WriteLog(Object|String, isError);
//Express框架，从post或put请求的req中获取请求参数
//req:		express框架req对象
//isJSON:	如果传入的参数是json字符串，请传入true，如果是a=1&b=2&c=3的形式，请传入false
global.BodyParse(req, isJSON);
//对象深拷贝
global.CloneObject(object);
//下载Excel2007
var filename = "测试文件test.xlsx";
var data = [
	{ '得主': '王重阳', '手机': '18911112222', '奖品': '测试奖品', '中奖时间': '2017-05-26 09:39:59'},
	{ '得主': '小李飞刀', '手机': '18911112222', '奖品': '测试奖品', '中奖时间': '2017-05-26 09:39:59' }
]
/*
 * data设置成下面这个样子，可以导出多个sheet
 * data = [
 * 	[......],
 * 	[......]
 * ]
 *
 */
global.DownloadExcel(res, filename, data);
```

> Array类型扩展

```javascript
//数组复制
var a = [1, 2, 3, 4, 5];
var b = a.Clone();
```

> Error类型扩展

```javascript
//记录日志
var err = new Error('测试错误');
err.WriteLog();
```

<h3 name="timer">Timer计时器模块</h3>

> 引入模块

```javascript
var Timer = require('wx-common').timer;
var timer = new Timer(options);
timer.Start();
```

> options参数列表

```javascript
var options = {
	days: null, //间隔天数
	hours: null, //间隔小时数
	minutes: null, //间隔分钟数
	seconds: 10, //间隔秒数
	onTick: function(){}
}

//上面的参数含义是间隔10秒运行一次
//如果上面这些时间段，无法满足你的要求，那么可以调用下面的方法指定一个时间运行
timer.SetCronTime('*/10 * * * * *');
//6个参数的含义如下：
//秒: 0-59
//分钟: 0-59
//小时: 0-23
//每月的第几天: 1-31
//每年的第几月: 0-11
//每周的第几天: 0-6

```

> Timer实例方法

```javascript
//启动
timer.Enable();
//禁用
timer.Disable();
//开始并启动，不要重复调用
timer.Start();
//停止并清除计时器
timer.Stop();
//停止清除计时器并重新开始
timer.Restart();
//自定义设置执行间隔
timer.SetCronTime(interval);
//检查当前计时器执行时间是否发生变更，如果有，就重启。
//name只是用来打印计时器的名字，可选参数
timer.CheckIsChange(interval, name);
//设置自定义执行间隔，并立刻启动
//name只是用来打印计时器的名字，可选参数
timer.StartTimer(interval, name)
```

<h3 name="fs">fs的Promise实现</h3>

> 引入模块

```javascript
var fs = require('fs');
var fsPromise = require('wx-common').fs;
```

> 异步用法举例

```javascript
//创建文件夹
fs.mkdir(path, function(err){});
//使用fs-promise方式如下
fsPromise.mkdir(path).then(function(){}, function(err){});

//注意，只实现了异步方法，并未实现类似mkdirSync的同步方法。
```

> 使用node原生fs库

```javascript
//创建文件夹
fsPromise.node.mkdir(path, function(err){});
```

<h3 name="agent">仿Nginx代理转发</h3>

> 引入模块

```javascript
var agent = require('wx-common').agent;
```

> 基本用法

```javascript
agent.startAgent({
        port: 8888, //代理服务器端口
        forwardPort: 9999, //转发到目标端口
        middleware: function(req, res, next){
        	//支持express中间件语法
        	console.log(req.headers)
        	next();
        },
        hosts: ['127.0.0.1'] //目标服务器host地址
})
```

> 负载均衡权值设置

```javascript
agent.startAgent({
	port: 8888,
	hosts: [{
		host: '127.0.0.1',
		port: 9999,
		weight: 100 //含义与nginx一致，表示负载均衡的权值
	}, {
		host: '127.0.0.1',
		port: 9999,
		weight: 100
	}]
})
```

> 转发HTTPS

```javascript
agent.startAgent({
        port: 8888, 
        forwardPort: 443, 
        https: true, //默认不开启，只有该属性为true，才开启
        hosts: ['127.0.0.1'] 
})
```

