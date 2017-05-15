# wx-common

wx-common是一个npm模块，用于微信开发的公用方法

<h3>安装</h3>

> 必须先安装visual studio 2013、python 2.7和git

```javascript
npm install wx-common
```

<h3>Secret模块</h3>

> Md5, Sha, HmacMd5, HmacSha用法示例

```javascript
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
```

> AES加密解密用法示例

```javascript
var common = require('wx-common');
var Secret = common.secret;
var sec = new Secret();

var source = "123456";
var aes_key = "abcdef";
var aes_key_md5 = sec.Encrypt(aes_key, 'md5');//e80b5017098950fc58aad83c8c14978e

var target = sec.ASE_Encrypt(source, aes_key);
console.log(target) //cc4a1d030b288cfeb62cfa586ac9e395
var _source = sec.ASE_Decrypt(target, aes_key);
console.log(_source == source) //true

// 这种加密方式，与网上绝大多数的在线加密结果都不一样。
// 若用其他语言对其进行解密，必须先将{aes_key}进行md5加密
```

<h3>Http Request模块</h3>

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
request.Download(url, saveAsUrl);
request.FileLength(url);
//试用中
request.DownloadParallel(url, saveAsUrl, maxLength, cpus);
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

<h3>Common模块</h3>

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
//req: 			express的req
//res: 			express的res
//callback:	2个参数，分别是fields, files，2个对象都是数组
//save_as:	文件保存的目录(文件夹路径)
common.upload_file(req, res, callback, save_as)

//此外，使用此方法，还必须在global对象上设置2个属性
global.config.upload_temp		//表示文件保存的默认路径
global.config.upload_max_size//表示最多允许上传多大的文件，int类型，单位m
```

> 获取guid

```javascript
var guid = common.guid()
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