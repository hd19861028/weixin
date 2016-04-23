var fs = require("fs");
var path = require("path");

exports = module.exports;

exports.Path = {
	NodeJs: path.dirname(process.execPath).toString(),
	App: __dirname.toString(),
	Combile: function(path1, path2) {
		if (path2)
			return path.join(path1, path2);
		else
			return path1;
	},
	GetDirPath: function(fullname) {
		return path.dirname(fullname);
	},
	GetFilePath: function(fullname) {
		return path.basename(fullname);
	},
	GetFilePathWithoutExtension: function(fullname) {
		return path.basename(fullname, path.extname(fullname));
	}
};

exports.Dir = {
	Exists: function(fullname, callback) {
		if (!callback) {
			callback = function(err) {
				console.error(err);
			}
		}
		fs.exists(fullname, callback);
	},
	ExistsSync: function(fullname) {
		return fs.existsSync(fullname);
	},
	Create: function(fullname, callback) {
		if (!callback) {
			callback = function(err) {
				console.error(err);
			}
		}
		fs.mkdir(fullname, 0777, callback);
	},
	CreateSync: function(fullname) {
		return fs.mkdirSync(fullname, 0777);
	},
	ExistsAndCreateSync: function(fullname) {
		var exists = exports.Dir.ExistsSync(fullname);
		var dirlist = [];
		while (!exists) {
			var filename = exports.Path.GetFilePath(fullname);
			dirlist.unshift(filename);
			fullname = exports.Path.GetDirPath(fullname);
			exists = exports.Dir.ExistsSync(fullname);
		}
		if (dirlist.length > 0) {
			for (var i = 0; i < dirlist.length; i++) {
				fullname = exports.Path.Combile(fullname, dirlist[i]);
				exports.Dir.CreateSync(fullname);
			}
		}
	},
	GetAll: function(dirname, callback, deep) {
		deep = deep >= 0 ? deep : 0;
		deep += 1;
		fs.readdir(dirname, function(err, files) {
			if (err) {
				console.log('read dir error');
			} else {
				files.forEach(function(item) {
					var tmpPath = exports.Path.Combile(dirname, item);
					fs.stat(tmpPath, function(err1, stats) {
						if (err1) {
							console.log('stat error');
						} else {
							if (stats.isDirectory()) {
								exports.Dir.GetAll(tmpPath, callback, deep);
							}
							callback(tmpPath, deep, stats.isDirectory());
						}
					})
				});
			}
		});
	},
	GetAllSync: function(dirname, callback, deep, is_dir) {
		if (is_dir != undefined)
			callback(dirname, deep, is_dir);
		if (is_dir || is_dir == undefined) {
			deep = deep >= 0 ? deep : 0;
			deep += 1;
			var files = fs.readdirSync(dirname);
			files.forEach(function(item) {
				var tmpPath = exports.Path.Combile(dirname, item);
				var stats = fs.lstatSync(tmpPath);
				exports.Dir.GetAllSync(tmpPath, callback, deep, stats.isDirectory());
			});
		}
	},
	Delete: function(dir, callback) {
		if (!callback) {
			callback = function(err) {
				console.error(err);
			}
		}
		fs.rmdir(dir, callback);
	},
	DeleteSync: function(dir) {
		fs.rmdirSync(dir);
	},
	DeleteAll: function(dirname) {
		var dirlist = [];
		exports.Dir.GetAllSync(dirname, function(filepath, deep, is_dir) {
			if (is_dir) {
				dirlist.unshift(filepath);
			} else {
				exports.File.DeleteSync(filepath);
			}
		});
		dirlist.forEach(function(item) {
			exports.Dir.DeleteSync(item);
		});
	}
};

exports.File = {
	Delete: function(filename, callback) {
		if (!callback) {
			callback = function(err) {
				console.error(err);
			}
		}
		fs.unlink(filename, callback)
	},
	DeleteSync: function(filename) {
		return fs.unlinkSync(filename)
	},

	/*
	 * 复制文件
	 * @param{ oldPath } 原路径
	 * @param{ newPath } 新路径
	 */
	copy: function(oldPath, newPath) {

		fs.rename(oldPath, newPath, function(err) {
			//if(err){
			//    throw err;
			//}
		})
	}
};