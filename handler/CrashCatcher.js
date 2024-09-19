/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/lib/AutoJSRemoveDexResolver.js":
/*!********************************************!*\
  !*** ./src/lib/AutoJSRemoveDexResolver.js ***!
  \********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
 * @Author: TonyJiangWJ
 * @Date: 2020-08-04 17:30:20
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-07 21:42:04
 * @Description: 
 */
var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  _config = _require.config,
  _storage_name = _require.storage_name;
/**
 * 免费版的runtime.loadDex loadJar有问题，加载前需要将mDexClassLoaders清空
 */
var _resolver = function _resolver() {
  if (_config.noneed_resolve_dex) {
    return;
  }
  console.verbose('run resolver');
  try {
    var packageName = context.getPackageName();
    if (packageName === 'org.autojs.autojs' || packageName === 'com.taobao.taodang.x') {
      console.verbose('packageName: ' + packageName);
      importClass(java.lang.Class);
      var target = org.mozilla.javascript.ContextFactory.getGlobal().getApplicationClassLoader();
      var clz = target.getClass();
      console.verbose("clz:" + clz.toString());
      var field = clz.getDeclaredField("mDexClassLoaders");
      field.setAccessible(true);
      var fieldValue = field.get(target);
      var fieldClass = fieldValue.getClass();
      if (fieldClass + '' === 'class java.util.ArrayList') {
        fieldValue.clear();
        console.warn('能不能不要再用全是BUG的免费版了呀！推荐使用我的修改版 下载连接：https://github.com/TonyJiangWJ/Auto.js/releases/download/v4.1.1/AutoJS.Modify.latest.apk');
        console.verbose("success");
      } else {
        console.verbose("fieldValue is not list");
      }
    } else {
      _config.noneed_resolve_dex = true;
      storages.create(_storage_name).put('noneed_resolve_dex', true);
    }
  } catch (e) {
    var errorInfo = e + '';
    console.error('发生异常' + errorInfo);
    toastLog('请强制关闭AutoJS并重新启动');
    exit();
  }
};
module.exports = _resolver;

/***/ }),

/***/ "./src/lib/DateUtil.js":
/*!*****************************!*\
  !*** ./src/lib/DateUtil.js ***!
  \*****************************/
/***/ ((module) => {

/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-10 19:41:12
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-25 20:36:33
 * @Description: 日期格式化工具
 */
module.exports = function (date, fmt) {
  if (typeof fmt === 'undefined') {
    fmt = "yyyy-MM-dd HH:mm:ss";
  }
  var o = {
    'M+': date.getMonth() + 1,
    // 月份
    'd+': date.getDate(),
    // 日
    'h+': date.getHours() % 12 === 0 ? 12 : date.getHours() % 12,
    // 小时
    'H+': date.getHours(),
    // 小时
    'm+': date.getMinutes(),
    // 分
    's+': date.getSeconds(),
    // 秒
    'q+': Math.floor((date.getMonth() + 3) / 3),
    // 季度
    'S': date.getMilliseconds() // 毫秒
  };
  var week = {
    '0': "\u65E5",
    '1': "\u4E00",
    '2': "\u4E8C",
    '3': "\u4E09",
    '4': "\u56DB",
    '5': "\u4E94",
    '6': "\u516D"
  };
  var execResult;
  if (/(y+)/.test(fmt)) {
    execResult = /(y+)/.exec(fmt);
    fmt = fmt.replace(execResult[1], (date.getFullYear() + '').substring(4 - execResult[1].length));
  }
  if (/(E+)/.test(fmt)) {
    execResult = /(E+)/.exec(fmt);
    fmt = fmt.replace(execResult[1], (execResult[1].length > 1 ? execResult[1].length > 2 ? "\u661F\u671F" : "\u5468" : '') + week[date.getDay() + '']);
  }
  for (var k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      execResult = new RegExp('(' + k + ')').exec(fmt);
      fmt = fmt.replace(execResult[1], execResult[1].length === 1 ? o[k] : ('00' + o[k]).substring(('' + o[k]).length));
    }
  }
  return fmt;
};

/***/ }),

/***/ "./src/lib/PrintExceptionStack.js":
/*!****************************************!*\
  !*** ./src/lib/PrintExceptionStack.js ***!
  \****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var _interopRequireDefault = __webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "./node_modules/@babel/runtime/helpers/interopRequireDefault.js");
var _typeof2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/typeof */ "./node_modules/@babel/runtime/helpers/typeof.js"));
importClass(java.io.StringWriter);
importClass(java.io.StringReader);
importClass(java.io.PrintWriter);
importClass(java.io.BufferedReader);
importClass(java.lang.StringBuilder);
module.exports = function printExceptionStack(e) {
  if (e) {
    console.error(util.format('fileName: %s line:%s typeof e:%s', e.fileName, e.lineNumber, (0, _typeof2["default"])(e)));
    var throwable = null;
    if (e.javaException) {
      throwable = e.javaException;
    } else if (e.rhinoException) {
      throwable = e.rhinoException;
    }
    if (throwable) {
      var scriptTrace = new StringBuilder(e.message == null ? '' : e.message + '\n');
      var stringWriter = new StringWriter();
      var writer = new PrintWriter(stringWriter);
      throwable.printStackTrace(writer);
      writer.close();
      var bufferedReader = new BufferedReader(new StringReader(stringWriter.toString()));
      var line;
      while ((line = bufferedReader.readLine()) != null) {
        scriptTrace.append("\n").append(line);
      }
      console.error(scriptTrace.toString());
    } else {
      var funcs = Object.getOwnPropertyNames(e);
      for (var idx in funcs) {
        var func_name = funcs[idx];
        console.verbose(func_name);
      }
    }
  }
};

/***/ }),

/***/ "./src/lib/prototype/CrashCatcher.js":
/*!*******************************************!*\
  !*** ./src/lib/prototype/CrashCatcher.js ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-27 23:08:29
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-16 20:49:42
 * @Description: AutoJS崩溃自启
 */

var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  storage_name = _require.storage_name,
  config = _require.config;
var lockableStorages = __webpack_require__(/*! @/lib/prototype/LockableStorage */ "./src/lib/prototype/LockableStorage.js");
var logUtils = __webpack_require__(/*! @/lib/prototype/LogUtils */ "./src/lib/prototype/LogUtils.js");
var fileUtils = __webpack_require__(/*! @/lib/prototype/FileUtils */ "./src/lib/prototype/FileUtils.js");
var timers = __webpack_require__(/*! @/lib/prototype/Timers */ "./src/lib/prototype/Timers.js");
var RUN_STATE_STORAGE = lockableStorages.create(storage_name + '_crash_catch');
function CrashCatcher() {
  this.currentSource = engines.myEngine().getSource() + '';
  this.setOnRunning = function () {
    logUtils.debugInfo('设置脚本状态为执行中');
    RUN_STATE_STORAGE.put('running', true);
    RUN_STATE_STORAGE.put('running_source', this.currentSource);
  };
  this.setDone = function () {
    logUtils.debugInfo('设置脚本状态为执行完毕');
    RUN_STATE_STORAGE.put('running', false);
  };
  this.restartIfCrash = function () {
    if (!config.auto_restart_when_crashed) {
      return;
    }
    var runningStatus = RUN_STATE_STORAGE.get('running');
    if (runningStatus === 'true' || runningStatus === true) {
      var source = RUN_STATE_STORAGE.get('running_source') || fileUtils.getRealMainScriptPath();
      logUtils.warnInfo('AutoJs可能异常崩溃且已重启，重新执行脚本:' + source);
      engines.execScriptFile(source, {
        path: source.substring(0, source.lastIndexOf('/'))
      });
    } else {
      logUtils.debugInfo('AutoJs可能异常崩溃且已重启，但脚本已正常走完流程，不重新执行');
    }
  };
  this.init = function () {
    if (!config.auto_restart_when_crashed) {
      return;
    }
    var intentTask = {
      isLocal: true,
      path: fileUtils.getCurrentWorkPath() + '/handler/CrashCatcher.js',
      action: getOnStartAction()
    };
    var existTask = timers.queryIntentTasks(intentTask);
    if (!existTask || existTask.length === 0) {
      logUtils.debugInfo('创建异常终止后的重启任务');
      threads.start(function () {
        timers.addIntentTask(intentTask);
      });
    } else {
      logUtils.debugInfo(['异常终止的重启任务已存在: {}', JSON.stringify(existTask)]);
    }
  };
  this.init();
  function getOnStartAction() {
    var is_modify = Object.prototype.toString.call(org.autojs.autojsm.timing.TimedTask).match(/Java(Class|Object)/);
    if (is_modify) {
      return "org.autojs.autojsm.action.startup";
    } else {
      return "org.autojs.autojs.action.startup";
    }
  }
}
module.exports = new CrashCatcher();

/***/ }),

/***/ "./src/lib/prototype/FileUtils.js":
/*!****************************************!*\
  !*** ./src/lib/prototype/FileUtils.js ***!
  \****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
 * @Author: TonyJiangWJ
 * @Date: 2019-08-05 14:36:13
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-07 21:17:39
 * @Description: 
 */
var printExceptionStack = __webpack_require__(/*! @/lib/PrintExceptionStack.js */ "./src/lib/PrintExceptionStack.js");
__webpack_require__(/*! @/lib/AutoJSRemoveDexResolver.js */ "./src/lib/AutoJSRemoveDexResolver.js")();
var dateFormat = __webpack_require__(/*! @/lib/DateUtil.js */ "./src/lib/DateUtil.js");
runtime.loadDex(getCurrentWorkPath() + '/dex/autojs-common.dex');
importClass(java.io.File);
importClass(java.io.RandomAccessFile);
importClass(java.util.ArrayList);
try {
  importClass(com.tony.file.FileReader);
} catch (e) {
  console.error('加载失败，强制关闭AutoJS', e);
  console.error('此异常常常发生在闪退之后，需要强制重启AutoJS');
  var limit = 3;
  while (limit > 0) {
    toastLog('java类加载失败，将在' + limit-- + '秒后关闭AutoJS 请授予自启动权限');
    sleep(1000);
  }
  java.lang.System.exit(0);
}
var FILE_READER = new FileReader(runtime);
function getRealMainScriptPath(parentDirOnly) {
  var currentPath = files.cwd();
  if (files.exists(currentPath + '/main.js')) {
    return currentPath + (parentDirOnly ? '' : '/main.js');
  }
  var paths = currentPath.split('/');
  do {
    paths = paths.slice(0, paths.length - 1);
    currentPath = paths.reduce(function (a, b) {
      return a += '/' + b;
    });
  } while (!files.exists(currentPath + '/main.js') && paths.length > 0);
  if (paths.length > 0) {
    return currentPath + (parentDirOnly ? '' : '/main.js');
  }
}

/**
 * 获取当前脚本的运行工作路径，main.js所在的文件夹
 */
function getCurrentWorkPath() {
  return getRealMainScriptPath(true);
}

/**
 * 按行读取最后N行数据
 * 
 * @param {string} fileName 文件路径 支持相对路径
 * @param {number} num 读取的行数
 * @param {number} startReadIndex 当前读取偏移量
 * @param {function} filter (line) => check(line) 过滤内容
 * @returns { result: 行数据列表, readIndex: 当前读取偏移量, total: 文件总大小, filePath: 文件路径 }
 */
var readLastLines = function readLastLines(fileName, num, startReadIndex, filter) {
  var fileLineMatcher = null;
  if (filter) {
    fileLineMatcher = new FileReader.FileFilter({
      match: function match(v) {
        return filter(v);
      }
    });
  }
  var startStamp = new Date().getTime();
  try {
    startReadIndex = startReadIndex || -1;
    num = num || 1000;
    return FILE_READER.readLastLines(new java.lang.String(fileName), new java.lang.Long(num), new java.lang.Long(startReadIndex), fileLineMatcher);
  } finally {
    console.verbose('文件读取耗时：', new Date().getTime() - startStamp, 'ms');
  }
};

/**
 * 按行读取前N行数据
 * 
 * @param {string} fileName 文件路径 支持相对路径
 * @param {number} num 读取的行数
 * @param {number} startReadIndex 当前读取偏移量
 * @param {function} filter (line) => check(line) 过滤内容
 * @returns { result: 行数据列表, readIndex: 当前读取偏移量, total: 文件总大小, filePath: 文件路径 }
 */
var readForwardLines = function readForwardLines(fileName, num, startReadIndex, filter) {
  var fileLineMatcher = null;
  if (filter) {
    fileLineMatcher = new FileReader.FileFilter({
      match: function match(v) {
        return filter(v);
      }
    });
  }
  var startStamp = new Date().getTime();
  try {
    startReadIndex = startReadIndex || 0;
    num = num || 1000;
    return FILE_READER.readForwardLines(new java.lang.String(fileName), new java.lang.Long(num), new java.lang.Long(startReadIndex), fileLineMatcher);
  } finally {
    console.verbose('文件读取耗时：', new Date().getTime() - startStamp, 'ms');
  }
};

/**
 * 按行读取最后N行数据
 * 
 * @param {string} fileName 文件路径 支持相对路径
 * @param {number} num 读取的行数
 * @param {number} startReadIndex 当前读取偏移量
 * @param {function} filter (line) => check(line) 过滤内容
 * @returns { result: 行数据列表, readIndex: 当前读取偏移量, total: 文件总大小, filePath: 文件路径 }
 * @deprecated 太慢了 改用java dex
 */
var jsReadLastLines = function jsReadLastLines(fileName, num, startReadIndex, filter) {
  filter = filter || function (v) {
    return true;
  };
  var startStamp = new Date().getTime();
  num = num || 1000;
  var filePath = files.path(fileName);
  if (!files.exists(filePath)) {
    console.error('文件不存在：', filePath, fileName);
    return null;
  }
  var rf = null;
  var result = new ArrayList();
  try {
    rf = new RandomAccessFile(filePath, "r");
    var fileLength = rf.length();
    var start = rf.getFilePointer(); // 返回此文件中的当前偏移量
    var readIndex = startReadIndex || start + fileLength - 1;
    var line;
    rf.seek(readIndex); // 设置偏移量为文件末尾
    console.verbose('设置偏移量', readIndex);
    console.verbose('开始位置', start);
    var c = -1;
    var lineCount = 0;
    while (readIndex > start) {
      c = rf.read();
      // console.verbose('read c', c)
      if (c == 10 || c == 13) {
        line = rf.readLine();
        // console.verbose('读取行', line)
        if (line != null) {
          line = new java.lang.String(new java.lang.String(line).getBytes("ISO-8859-1"), "UTF-8");
          if (filter(line + '')) {
            result.add(line);
            lineCount++;
          }
        }
        readIndex--;
      }
      if (lineCount >= num) {
        break;
      }
      readIndex--;
      rf.seek(readIndex);
    }
    console.verbose('最终长度：', result.size());
    java.util.Collections.reverse(result);
    return {
      result: runtime.bridges.toArray(result),
      readIndex: readIndex,
      total: fileLength,
      filePath: filePath
    };
  } catch (e) {
    printExceptionStack(e);
    return null;
  } finally {
    console.verbose('文件读取耗时：', new Date().getTime() - startStamp, 'ms');
    try {
      if (rf != null) rf.close();
    } catch (e) {
      printExceptionStack(e);
    }
  }
};

/**
 * 列出文件夹下的所有文件
 * 
 * @param {string} path 文件路径 支持相对路径
 * @param {function} filter (file) => check(line) 过滤文件 参数为File
 * @returns { resultList: 文件列表, path: 当前路径 }
 */
var listDirs = function listDirs(path, filter) {
  filter = filter || function () {
    return true;
  };
  var filePath = files.path(path);
  if (!files.exists(filePath)) {
    return {
      path: filePath,
      resultList: [],
      error: '文件路径不存在'
    };
  }
  var dir = new File(filePath);
  if (!dir.isDirectory()) {
    dir = dir.getParentFile();
  }
  var fileArray = dir.listFiles();
  if (fileArray === null) {
    return {
      path: filePath,
      resultList: [],
      error: '文件路径无权限'
    };
  }
  var resultList = [];
  var _loop = function _loop() {
    var subFile = fileArray[i];
    if (filter(subFile)) {
      var fileName = subFile.getName() + '';
      resultList.push({
        name: fileName,
        fullPath: subFile.getAbsolutePath() + '',
        isDir: subFile.isDirectory(),
        fileSize: subFile.length(),
        lastModified: subFile.lastModified(),
        lastModifiedStr: dateFormat(new Date(subFile.lastModified())),
        type: function () {
          if (subFile.isDirectory()) {
            return 'dir';
          }
          var type = fileName.substring(fileName.lastIndexOf('.'));
          if (type && type.length > 1) {
            return type.substring(1);
          }
          return 'unknown';
        }()
      });
    }
  };
  for (var i = 0; i < fileArray.length; i++) {
    _loop();
  }
  return {
    path: dir.getAbsolutePath() + '',
    resultList: resultList.sort(function (d1, d2) {
      // 文件夹类型放在最前面 其他的对比类型和名称
      if (d1.isDir) {
        if (!d2.isDir) {
          return -1;
        }
        return d1.name > d2.name ? -1 : 1;
      }
      if (d2.isDir) {
        return 1;
      }
      return d1.type > d2.type ? 1 : d1.type === d2.type ? d1.name > d2.name ? 1 : -1 : -1;
    })
  };
};
module.exports = {
  getRealMainScriptPath: getRealMainScriptPath,
  getCurrentWorkPath: getCurrentWorkPath,
  readLastLines: readLastLines,
  readForwardLines: readForwardLines,
  jsReadLastLines: jsReadLastLines,
  listDirs: listDirs
};

/***/ }),

/***/ "./src/lib/prototype/LockableStorage.js":
/*!**********************************************!*\
  !*** ./src/lib/prototype/LockableStorage.js ***!
  \**********************************************/
/***/ ((module) => {

/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-23 23:13:31
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-25 15:01:49
 * @Description: 
 */
importClass(android.content.Context);
importClass(android.content.SharedPreferences);
var lockableStorages = {
  requireCount: 0
};
lockableStorages.create = function (name) {
  return new LockableStorage(name);
};
lockableStorages.remove = function (name) {
  return this.create(name).clear();
};
module.exports = lockableStorages;

// 支持锁的同步操作storage
function LockableStorage(name) {
  this.NAME_PREFIX = "autojs.localstorage.sync.";
  this.mSharedPreferences = context.getSharedPreferences(this.NAME_PREFIX + name, Context.MODE_PRIVATE);
  this.put = function (key, stringValue) {
    return this.mSharedPreferences.edit().putString(key, stringValue).commit();
  };
  this.get = function (key, defaultValue) {
    defaultValue = defaultValue || null;
    return this.mSharedPreferences.getString(key, defaultValue);
  };
  this.clear = function () {
    return this.mSharedPreferences.edit().clear().commit();
  };
}

/***/ }),

/***/ "./src/lib/prototype/LogUtils.js":
/*!***************************************!*\
  !*** ./src/lib/prototype/LogUtils.js ***!
  \***************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
 * @Author: TonyJiangWJ
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-07 21:41:16
 * @Description: 日志工具
 */
importClass(java.lang.Thread);
importClass(java.util.concurrent.LinkedBlockingQueue);
importClass(java.util.concurrent.ThreadPoolExecutor);
importClass(java.util.concurrent.TimeUnit);
importClass(java.util.concurrent.ThreadFactory);
importClass(java.util.concurrent.Executors);
var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  _config = _require.config,
  _storage_name = _require.storage_name;
var formatDate = __webpack_require__(/*! @/lib/DateUtil.js */ "./src/lib/DateUtil.js");
var FileUtils = __webpack_require__(/*! @/lib/prototype/FileUtils */ "./src/lib/prototype/FileUtils.js");
var MAIN_PATH = FileUtils.getRealMainScriptPath(true);
_config.isRunning = true;
// -------------初始化-------------
// 确保目录存在
files.ensureDir(MAIN_PATH + '/logs/');
files.ensureDir(MAIN_PATH + '/logs/logback/');
var LOG_TYPES = {
  VERBOSE: 'VERBOSE',
  DEBUG: 'DEBUG',
  LOG: 'LOG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEVELOP: 'DEVELOP'
};
var PATH_CONFIG = {
  'VERBOSE': MAIN_PATH + '/logs/log-verboses.log',
  'LOG': MAIN_PATH + '/logs/log.log',
  'INFO': MAIN_PATH + '/logs/info.log',
  'WARN': MAIN_PATH + '/logs/warn.log',
  'ERROR': MAIN_PATH + '/logs/error.log',
  'DEVELOP': MAIN_PATH + '/logs/develop.log'
};
var ENGINE_ID = engines.myEngine().id;
// 移除过期的日志
var logbackDirPath = MAIN_PATH + '/logs/logback';
removeOutdateBacklogFiles();
// -------------初始化结束-------------

/**
 * Logger 日志基类
 */
function Logger() {
  var _this = this;
  this.fileWriteCostCounter = 0;
  this.backupCostCounter = 0;
  this.enqueueCostCounter = 0;

  /**
   * 刷新日志缓冲区，仅异步日志用到
   * 切换读写缓冲区，将缓冲区中的日志全部写入到日志文件
   */
  this.flushAllLogs = function () {};
  /**
   * 异步日志：将日志内容写入写缓冲区
   * 同步日志：将日志内容写入日志文件中
   * @param {*} logData 日志内容对象：包含logType,dataTime,content,threadId等信息
   */
  this.enqueueLog = function (logData) {};
  this.showCostingInfo = function () {
    console.verbose(ENGINE_ID + ' 日志入队总耗时：' + _this.enqueueCostCounter + 'ms 写入文件总耗时：' + _this.fileWriteCostCounter + 'ms 备份日志文件总耗时：' + _this.backupCostCounter + 'ms');
  };
}

/**
 * 异步日志
 */
function AsyncLogger() {
  Logger.call(this);
  this.executeThreadPool = new ThreadPoolExecutor(1, 1, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(10), new ThreadFactory({
    newThread: function newThread(runnable) {
      var thread = Executors.defaultThreadFactory().newThread(runnable);
      thread.setName(_config.thread_name_prefix + ENGINE_ID + '-logging-' + thread.getName());
      return thread;
    }
  }));
  this.writingList = [];
  this.readingList = [];
  this.MAX_QUEUE_SIZE = 256;
  this.writingLock = threads.lock();
  this.queueChangeLock = threads.lock();
  this.queueChangeCondition = this.queueChangeLock.newCondition();
  var self = this;
  // 将日志写入文件
  this.executeThreadPool.execute(function () {
    var loggerRunning = true;
    var _loop = function _loop() {
      var start = new Date().getTime();
      self.queueChangeLock.lock();
      try {
        while (self.readingList.length === 0 && _config.isRunning) {
          if (_config.develop_mode) {
            console.verbose(ENGINE_ID + ' 等待日志刷新');
          }
          if (!self.queueChangeCondition["await"](5, java.util.concurrent.TimeUnit.SECONDS)) {
            var currentEngine = engines.all().filter(function (engine) {
              return engine.id === ENGINE_ID;
            });
            _config.isRunning = currentEngine && currentEngine.length > 0;
          }
        }
        if (self.readingList.length === 0) {
          // console.warn(ENGINE_ID + ' 脚本可能已终止执行')
          if (self.writingList.length !== 0) {
            // 切换缓冲区，将缓冲区内容全部写入日志
            if (_config.show_debug_log) {
              console.verbose(ENGINE_ID + ' 切换缓冲区，将缓冲区内容全部写入日志');
            }
            self.readingList = self.writingList;
            self.writingList = [];
          } else {
            loggerRunning = false;
            // 双队列为空 直接退出
            return 1; // break
          }
        }
        start = new Date().getTime();
        var writerHolder = {};
        for (var key in PATH_CONFIG) {
          writerHolder[key] = files.open(PATH_CONFIG[key], 'a');
        }
        self.readingList.forEach(function (logData) {
          var logType = logData.logType,
            content = logData.content,
            dateTime = logData.dateTime,
            threadId = logData.threadId;
          var logWriter = writerHolder[logType];
          if (logWriter) {
            logWriter.writeline(dateTime + ' ' + content);
          }
          writerHolder[LOG_TYPES.VERBOSE].writeline(dateTime + ' ' + logType + ' [E:' + ENGINE_ID + ' T:' + threadId + '] - ' + content);
        });
        for (var _key in PATH_CONFIG) {
          var writer = writerHolder[_key];
          if (writer) {
            writer.flush();
            writer.close();
          }
        }
      } catch (e) {
        console.error(ENGINE_ID + ' 写入日志异常：' + e);
      } finally {
        if (loggerRunning) {
          var cost = new Date().getTime() - start;
          self.fileWriteCostCounter += cost;
          start = new Date().getTime();
          checkFileSizeAndBackup();
          self.backupCostCounter += new Date().getTime() - start;
          console.verbose(ENGINE_ID + ' 写入日志到文件耗时：' + cost + 'ms');
        }
        // 置空
        self.readingList = [];
        self.queueChangeLock.unlock();
      }
    };
    while ( true && _config.save_log_file && (_config.isRunning || self.readingList.length !== 0 || self.writingList.length !== 0)) {
      if (_loop()) break;
    }
    console.warn(ENGINE_ID + ' 脚本执行结束，日志文件写入线程关闭');
    self.showCostingInfo();
    // 新建线程 关闭线程池
    var thread = new Thread(new java.lang.Runnable({
      run: function run() {
        try {
          self.executeThreadPool.shutdown();
          var flag = self.executeThreadPool.awaitTermination(5, java.util.concurrent.TimeUnit.SECONDS);
          if (_config.show_debug_log) {
            console.verbose(ENGINE_ID + ' 日志线程池关闭：' + flag);
          }
        } catch (e) {
          console.error(ENGINE_ID + ' 关闭日志线程池异常:' + e);
        } finally {
          self.executeThreadPool = null;
        }
      }
    }));
    thread.setName(_config.thread_name_prefix + ENGINE_ID + '_shutdown_logging_thread');
    thread.start();
  });
  this.flushAllLogs = function () {
    if (_config.save_log_file) {
      this.queueChangeLock.lock();
      try {
        this.readingList = this.writingList;
        this.writingList = [];
        this.queueChangeCondition.signal();
      } finally {
        this.queueChangeLock.unlock();
      }
    }
  };
  this.enqueueLog = function (logData) {
    if (_config.save_log_file) {
      var enqueueStart = new Date().getTime();
      // 异步方式 将日志内容入队列
      this.writingLock.lock();
      try {
        this.writingList.push(logData);
        if (this.writingList.length >= this.MAX_QUEUE_SIZE) {
          this.queueChangeLock.lock();
          try {
            this.readingList = this.writingList;
            this.writingList = [];
            this.queueChangeCondition.signal();
          } finally {
            this.queueChangeLock.unlock();
          }
        }
      } finally {
        this.enqueueCostCounter += new Date().getTime() - enqueueStart;
        this.writingLock.unlock();
      }
    }
  };
}

/**
 * 同步日志
 */
function SyncLogger() {
  Logger.call(this);
  this.storage = storages.create(_storage_name + 'run_log_file');
  this.enqueueLog = function (logData) {
    if (_config.save_log_file) {
      var enqueueStart = new Date().getTime();
      // 同步方式写入文件
      var logType = logData.logType,
        content = logData.content,
        dateTime = logData.dateTime,
        threadId = logData.threadId;
      content += '\n';
      var verboseLog = dateTime + ' ' + logType + ' [E:' + ENGINE_ID + ' T:' + threadId + '] - ' + content;
      var log = dateTime + ' ' + content;
      var start = new Date().getTime();
      if (PATH_CONFIG[logType]) {
        files.append(PATH_CONFIG[logType], log);
      }
      files.append(PATH_CONFIG[LOG_TYPES.VERBOSE], verboseLog);
      this.fileWriteCostCounter += new Date().getTime() - start;
      var target = 'checkFileSizeAndBackup';
      var clearFlag = this.storage.get(target);
      if (!clearFlag || parseInt(clearFlag) < new Date().getTime()) {
        // 十秒钟进行一次
        clearFlag = new Date().getTime() + 10000;
        this.storage.put(target, clearFlag);
        start = new Date().getTime();
        checkFileSizeAndBackup();
        this.backupCostCounter += new Date().getTime() - start;
      }
      this.enqueueCostCounter += new Date().getTime() - enqueueStart;
    }
  };
}
AsyncLogger.prototype = Object.create(Logger.prototype);
AsyncLogger.prototype.constructor = AsyncLogger;
SyncLogger.prototype = Object.create(Logger.prototype);
SyncLogger.prototype.constructor = SyncLogger;
var LOGGER = _config.async_save_log_file ? new AsyncLogger() : new SyncLogger();
if (_config.show_debug_log) {
  if (_config.async_save_log_file) {
    console.verbose(ENGINE_ID + ' 使用异步日志');
  } else {
    console.verbose(ENGINE_ID + ' 使用同步日志');
  }
}
/**
 * @param {string} content 
 * @param {function} logFunc 执行控制台日志打印的方法
 * @param {boolean} isToast 
 * @param {string} logType 日志类型
 */
var showToast = function showToast(content, logFunc, isToast, logType) {
  content = convertObjectContent(content);
  if (isToast) {
    toast(content);
  }
  var logData = {
    logType: logType,
    content: content,
    dateTime: formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss.S'),
    threadId: Thread.currentThread().getId()
  };
  if (_config.show_engine_id) {
    content = '[E:' + ENGINE_ID + ' T:' + logData.threadId + '] - ' + content;
  }
  logFunc(content);
  LOGGER.enqueueLog(logData);
};

/**
 * 移除过期的日志 默认清除三天前的
 */
function removeOutdateBacklogFiles() {
  if (files.exists(logbackDirPath)) {
    doRemoveTargetTypeLogFiles('log-verbose');
    doRemoveTargetTypeLogFiles('log');
    doRemoveTargetTypeLogFiles('info');
    doRemoveTargetTypeLogFiles('warn');
    doRemoveTargetTypeLogFiles('error');
    doRemoveTargetTypeLogFiles('develop');
  }
}
function getTargetTypeOutdateFiles(logType) {
  var saveDays = _config.log_saved_days || 3;
  var threeDayAgo = formatDate(new Date(new Date().getTime() - saveDays * 24 * 3600000), 'yyyyMMddHHmm');
  var timeRegex = /.*(\d{12})\.log/;
  return files.listDir(logbackDirPath, function (fileName) {
    if (!fileName.startsWith(logType)) {
      return false;
    }
    var checkResult = timeRegex.exec(fileName);
    if (checkResult) {
      var timestr = checkResult[1];
      return timestr < threeDayAgo;
    } else {
      return true;
    }
  });
}
function doRemoveTargetTypeLogFiles(logType) {
  var outdateLogs = getTargetTypeOutdateFiles(logType);
  // 至少保留三个
  if (outdateLogs && outdateLogs.length > 3) {
    outdateLogs.forEach(function (logFile, idx) {
      if (idx < 3) {
        return;
      }
      if (_config.show_debug_log) {
        console.verbose(ENGINE_ID + ' 日志文件过期，删除掉：' + logFile);
      }
      files.remove(logbackDirPath + '/' + logFile);
    });
  }
}
/**
 * 清除日志到备份文件夹，当不传递日志类型时清除所有日志
 * @param {string} target 日志类型
 */
function innerClearLogFile(target) {
  var path = PATH_CONFIG[target];
  if (!target) {
    // 全部清除
    for (var k in PATH_CONFIG) {
      clearTarget(PATH_CONFIG[k]);
    }
  } else if (path) {
    clearTarget(path);
  }
}

/**
 * 根据日志路径备份，并清空内容
 * @param {string} originLogPath 目标日志全路径
 */
var clearTarget = function clearTarget(originLogPath) {
  var nameRegex = /.*\/([-\w]+)\.log$/;
  if (nameRegex.test(originLogPath)) {
    fileName = nameRegex.exec(originLogPath)[1];
    if (files.exists(originLogPath)) {
      var timestampLastHour = new Date().getTime();
      var backLogPath = MAIN_PATH + '/logs/logback/' + fileName + '.' + formatDate(new Date(timestampLastHour), 'yyyyMMddHHmm') + '.log';
      console.info(ENGINE_ID + ' 备份日志文件[' + backLogPath + ']' + (files.move(originLogPath, backLogPath) ? '成功' : '失败'));
    } else {
      console.info(ENGINE_ID + ' ' + originLogPath + '不存在，不执行备份');
    }
    try {
      files.write(originLogPath, fileName + ' logs for [' + formatDate(new Date()) + ']\n');
    } catch (e) {
      console.error(ENGINE_ID + ' 初始化写入日志文件失败' + e);
    }
  } else {
    console.error(ENGINE_ID + ' 解析文件名失败：' + originLogPath);
  }
};

/**
 * 校验文件大小并执行备份
 */
function checkFileSizeAndBackup() {
  var start = new Date();
  var hadBackup = false;
  for (var key in PATH_CONFIG) {
    if (key === LOG_TYPES.DEVELOP) {
      // 开发用的develop日志不做备份
      continue;
    }
    var filePath = PATH_CONFIG[key];
    var length = new java.io.File(filePath).length();
    if (files.exists(filePath) && length > 1024 * (_config.back_size || 100)) {
      hadBackup = true;
      if (_config.show_debug_log) {
        console.verbose(ENGINE_ID + ' ' + key + '文件大小：' + length + ' 大于' + (_config.back_size || 100) + 'kb，执行备份');
      }
      innerClearLogFile(key);
    }
  }
  if (hadBackup && _config.show_debug_log) {
    console.verbose(ENGINE_ID + ' 备份文件耗时：' + (new Date().getTime() - start) + 'ms');
  }
}

/**
 * 格式化输入参数 eg. `['args: {} {} {}', 'arg1', 'arg2', 'arg3']` => `'args: arg1 arg2 arg3'`
 * @param {array} originContent 输入参数
 */
function convertObjectContent(originContent) {
  if (typeof originContent === 'string') {
    return originContent;
  } else if (Array.isArray(originContent)) {
    var marker = originContent[0];
    var args = originContent.slice(1);
    if (Array.isArray(args) && args.length > 0) {
      args = args.map(function (r) {
        if (typeof r === 'function') {
          return r();
        } else {
          return r;
        }
      });
    }
    var regex = /(\{\})/g;
    var matchResult = marker.match(regex);
    if (matchResult && args && matchResult.length > 0 && matchResult.length === args.length) {
      args.forEach(function (item, idx) {
        marker = marker.replace('{}', item);
      });
      return marker;
    } else if (matchResult === null) {
      return marker;
    }
  }
  console.error(ENGINE_ID + ' 参数不匹配[' + JSON.stringify(originContent) + ']');
  return originContent;
}
module.exports = {
  debugInfo: function debugInfo(content, isToast) {
    isToast = isToast && _config.show_debug_log;
    if (_config.show_debug_log || _config.save_log_file) {
      showToast(content, _config.show_debug_log ? function (c) {
        return console.verbose(c);
      } : function () {}, isToast, LOG_TYPES.DEBUG);
    }
  },
  debugForDev: function debugForDev(content, isToast, fileOnly) {
    if (_config.develop_mode) {
      if (Array.isArray(content) && content.length > 0) {
        content = content.map(function (r) {
          if (typeof r === 'function') {
            return r();
          } else {
            return r;
          }
        });
      }
      showToast(content, function (c) {
        if (!fileOnly) {
          console.verbose(c);
        }
      }, isToast, LOG_TYPES.DEVELOP);
    }
  },
  logInfo: function logInfo(content, isToast) {
    showToast(content, function (c) {
      return console.log(c);
    }, isToast, LOG_TYPES.LOG);
  },
  infoLog: function infoLog(content, isToast) {
    showToast(content, function (c) {
      return console.info(c);
    }, isToast, LOG_TYPES.INFO);
  },
  warnInfo: function warnInfo(content, isToast) {
    showToast(content, function (c) {
      return console.warn(c);
    }, isToast, LOG_TYPES.WARN);
  },
  errorInfo: function errorInfo(content, isToast) {
    showToast(content, function (c) {
      return console.error(c);
    }, isToast, LOG_TYPES.ERROR);
  },
  appendLog: function appendLog(content) {
    showToast(content, function () {}, false, LOG_TYPES.DEBUG);
  },
  developSaving: function developSaving(content, fileName) {
    if (_config.develop_saving_mode) {
      content = convertObjectContent(content);
      content = formatDate(new Date()) + ' ' + content;
      console.verbose(content);
      files.append(MAIN_PATH + '/logs/' + fileName + '.log', content);
    }
  },
  clearLogFile: innerClearLogFile,
  removeOldLogFiles: removeOutdateBacklogFiles,
  flushAllLogs: function flushAllLogs() {
    LOGGER.flushAllLogs();
  },
  showCostingInfo: function showCostingInfo() {
    LOGGER.showCostingInfo();
  }
};

/***/ }),

/***/ "./src/lib/prototype/Timers.js":
/*!*************************************!*\
  !*** ./src/lib/prototype/Timers.js ***!
  \*************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var _interopRequireDefault = __webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "./node_modules/@babel/runtime/helpers/interopRequireDefault.js");
var _typeof2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/typeof */ "./node_modules/@babel/runtime/helpers/typeof.js"));
/*
 * @Author: SilvMonFr.00 https://github.com/SuperMonster003
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-06 19:08:21
 * @Description: 定时任务桥接，由大佬SilvMonFr.00提供
 */
importPackage(org.joda.time);
var waitForAction = _waitForAction;
module.exports = function (_runtime_, scope) {
  var is_pro = Object.prototype.toString.call(com.stardust.autojs.core.timing.TimedTask.Companion).match(/Java(Class|Object)/);
  var is_modify = Object.prototype.toString.call(org.autojs.autojsm.timing.TimedTask).match(/Java(Class|Object)/);
  var timing = is_pro ? com.stardust.autojs.core.timing : is_modify ? org.autojs.autojsm.timing : org.autojs.autojs.timing;
  var timers = Object.create(_runtime_.timers);
  var TimedTask = is_pro ? timing.TimedTask.Companion : timing.TimedTask;
  var IntentTask = timing.IntentTask;
  var TimedTaskManager = is_pro ? timing.TimedTaskManager.Companion.getInstance() : timing.TimedTaskManager.getInstance();
  var bridges = runtime.bridges.bridges;
  var days_ident = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', '一', '二', '三', '四', '五', '六', '日', 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 7].map(function (value) {
    return value.toString();
  });
  scope.__asGlobal__(timers, ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate']);
  scope.loop = function () {
    console.warn("loop() has been deprecated and has no effect. Remove it from your code.");
  };
  timers.addDailyTask = function (task) {
    var localTime = parseDateTime("LocalTime", task.time);
    var timedTask = TimedTask.dailyTask(localTime, files.path(task.path), parseConfig(task));
    addTask(timedTask);
    return timedTask;
  };
  timers.addWeeklyTask = function (task) {
    var localTime = parseDateTime("LocalTime", task.time);
    var timeFlag = 0;
    for (var i = 0; i < task.daysOfWeek.length; i++) {
      var dayString = task.daysOfWeek[i].toString();
      var dayIndex = days_ident.indexOf(dayString.toLowerCase()) % 7;
      if (!~dayIndex) throw new Error('unknown day: ' + dayString);
      timeFlag |= TimedTask.getDayOfWeekTimeFlag(dayIndex + 1);
    }
    var timedTask = TimedTask.weeklyTask(localTime, new java.lang.Long(timeFlag), files.path(task.path), parseConfig(task));
    addTask(timedTask);
    return timedTask;
  };
  timers.addDisposableTask = function (task) {
    var localDateTime = parseDateTime("LocalDateTime", task.date);
    var timedTask = TimedTask.disposableTask(localDateTime, files.path(task.path), parseConfig(task));
    addTask(timedTask);
    return timedTask;
  };
  timers.addIntentTask = function (task) {
    var intentTask = new IntentTask();
    intentTask.setLocal(task.isLocal);
    intentTask.setScriptPath(files.path(task.path));
    task.action && intentTask.setAction(task.action);
    addTask(intentTask);
    return intentTask;
  };
  timers.getTimedTask = function (id) {
    return TimedTaskManager.getTimedTask(id);
  };
  timers.getIntentTask = function (id) {
    return TimedTaskManager.getIntentTask(id);
  };
  timers.removeIntentTask = function (id) {
    if (!id && isNaN(+id)) return;
    var task = timers.getIntentTask(id);
    return task && removeTask(task);
  };
  timers.removeTimedTask = function (id) {
    if (!id && isNaN(+id)) return;
    var task = timers.getTimedTask(id);
    return task && removeTask(task);
  };
  timers.queryTimedTasks = function (options, callback) {
    options = options || {};
    var sql = '';
    var args = [];
    function sqlAppend(str) {
      if (sql.length === 0) {
        sql += str;
      } else {
        sql += ' AND ' + str;
      }
      return true;
    }
    var path = options.path;
    path && sqlAppend('script_path = ?') && args.push(path);
    return is_pro ? bridges.toArray(TimedTaskManager.queryTimedTasks(sql || null, args)) : function () {
      var list = TimedTaskManager.getAllTasksAsList().toArray();
      if (options.path) list = list.filter(function (task) {
        return task.getScriptPath() === path;
      });
      return list;
    }();
  };
  timers.queryIntentTasks = function (options, callback) {
    var allIntentTasks = TimedTaskManager.getAllIntentTasksAsList();
    return bridges.toArray(allIntentTasks).filter(function (intentTask) {
      return (options.action ? intentTask.getAction() === options.action : true) && (options.path ? intentTask.getScriptPath() === options.path : true);
    });
  };
  return timers;

  // tool function(s) //

  function parseConfig(c) {
    var config = new com.stardust.autojs.execution.ExecutionConfig();
    config.delay = c.delay || 0;
    config.interval = c.interval || 0;
    config.loopTimes = c.loopTimes === undefined ? 1 : c.loopTimes;
    return config;
  }
  function parseDateTime(clazz, dateTime) {
    clazz = is_pro ? clazz : org.joda.time[clazz];
    if (typeof dateTime == 'string') {
      return is_pro ? TimedTask.parseDateTime(clazz, dateTime) : clazz.parse(dateTime);
    } else if ((0, _typeof2["default"])(dateTime) == 'object' && dateTime.constructor === Date) {
      return is_pro ? TimedTask.parseDateTime(clazz, dateTime.getTime()) : new clazz(dateTime.getTime());
    } else if (typeof dateTime == 'number' && isFinite(dateTime)) {
      return is_pro ? TimedTask.parseDateTime(clazz, dateTime) : new clazz(dateTime);
    } else {
      throw new Error("cannot parse date time: " + dateTime);
    }
  }
  function addTask(task) {
    TimedTaskManager[is_pro ? "addTaskSync" : "addTask"](task);
    waitForAction(function () {
      return task.id !== 0;
    }, 500, 80);
  }
  function removeTask(task) {
    var id = task.id;
    TimedTaskManager[is_pro ? "removeTaskSync" : "removeTask"](task);
    return waitForAction(function () {
      return !timers.getTimedTask(id);
    }, 500, 80);
  }
}(runtime, __webpack_require__.g);

// monster function(s) //

function _waitForAction(f, timeout_or_times, interval) {
  var _timeout = timeout_or_times || 10000;
  var _interval = interval || 200;
  var _times = _timeout < 100 ? _timeout : ~~(_timeout / _interval) + 1;
  var _messageAction = typeof messageAction === "undefined" ? messageActionRaw : messageAction;
  while (!_checkF(f) && _times--) sleep(_interval);
  return _times >= 0;

  // tool function(s) //

  function _checkF(f) {
    var _classof = function _classof(o) {
      return Object.prototype.toString.call(o).slice(8, -1);
    };
    if (_classof(f) === "JavaObject") return _checkF(function () {
      return f.exists();
    });
    if (_classof(f) === "Array") {
      var _arr = f;
      var _logic_flag = "all";
      if (typeof _arr[_arr.length - 1] === "string") _logic_flag = _arr.pop();
      if (_logic_flag.match(/^(or|one)$/)) _logic_flag = "one";
      for (var i = 0, len = _arr.length; i < len; i += 1) {
        if (!(0, _typeof2["default"])(_arr[i]).match(/function|object/)) _messageAction("数组参数中含不合法元素", 8, 1, 0, 1);
        if (_logic_flag === "all" && !_checkF(_arr[i])) return false;
        if (_logic_flag === "one" && _checkF(_arr[i])) return true;
      }
      return _logic_flag === "all";
    } else if (typeof f === "function") return f();else _messageAction("\"waitForAction\"传入f参数不合法\n\n" + f.toString() + "\n", 8, 1, 1, 1);
  }

  // raw function(s) //

  function messageActionRaw(msg, msg_level, toast_flag) {
    var _msg = msg || " ";
    if (msg_level && msg_level.toString().match(/^t(itle)?$/)) {
      return messageAction("[ " + msg + " ]", 1, toast_flag);
    }
    var _msg_level = typeof +msg_level === "number" ? +msg_level : -1;
    toast_flag && toast(_msg);
    _msg_level === 1 && log(_msg) || _msg_level === 2 && console.info(_msg) || _msg_level === 3 && console.warn(_msg) || _msg_level >= 4 && console.error(_msg);
    _msg_level >= 8 && exit();
    return !(_msg_level in {
      3: 1,
      4: 1
    });
  }
}

/***/ }),

/***/ "./src/simpleConfig.js":
/*!*****************************!*\
  !*** ./src/simpleConfig.js ***!
  \*****************************/
/***/ ((module) => {

/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-09 20:42:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-16 21:27:43
 * @Description: 
 */
var is_pro = !!Object.prototype.toString.call(com.stardust.autojs.core.timing.TimedTask.Companion).match(/Java(Class|Object)/);
var default_config = {
  password: '',
  account_password: "722537000a",
  account_list: [],
  timeout_unlock: 1000,
  timeout_findOne: 1000,
  timeout_existing: 8000,
  // 异步等待截图，当截图超时后重新获取截图 默认开启
  async_waiting_capture: true,
  capture_waiting_time: 500,
  show_debug_log: true,
  show_engine_id: false,
  develop_mode: false,
  develop_saving_mode: false,
  enable_visual_helper: false,
  check_device_posture: false,
  check_distance: false,
  posture_threshold_z: 6,
  // 电量保护，低于该值延迟60分钟执行脚本
  battery_keep_threshold: 20,
  auto_lock: false,
  lock_x: 150,
  lock_y: 970,
  // 是否根据当前锁屏状态来设置屏幕亮度，当锁屏状态下启动时 设置为最低亮度，结束后设置成自动亮度
  auto_set_brightness: false,
  // 锁屏启动关闭提示框
  dismiss_dialog_if_locked: true,
  request_capture_permission: true,
  capture_permission_button: 'START NOW|立即开始|允许',
  // 是否保存日志文件，如果设置为保存，则日志文件会按时间分片备份在logback/文件夹下
  save_log_file: true,
  async_save_log_file: true,
  back_size: '100',
  // 控制台最大日志长度，仅免费版有用
  console_log_maximum_size: 1500,
  // 通话状态监听
  enable_call_state_control: false,
  // 单脚本模式 是否只运行一个脚本 不会同时使用其他的 开启单脚本模式 会取消任务队列的功能。
  // 比如同时使用蚂蚁庄园 则保持默认 false 否则设置为true 无视其他运行中的脚本
  single_script: false,
  auto_restart_when_crashed: false,
  // 是否使用模拟的滑动，如果滑动有问题开启这个 当前默认关闭 经常有人手机上有虚拟按键 然后又不看文档注释的
  useCustomScrollDown: true,
  // 排行榜列表下滑速度 200毫秒 不要太低否则滑动不生效 仅仅针对useCustomScrollDown=true的情况
  scrollDownSpeed: 200,
  bottomHeight: 200,
  // 当以下包正在前台运行时，延迟执行
  skip_running_packages: [],
  warn_skipped_ignore_package: false,
  warn_skipped_too_much: false,
  auto_check_update: false,
  github_url: '',
  // github release url 用于检测更新状态
  github_latest_url: '',
  // 延迟启动时延 5秒 悬浮窗中进行的倒计时时间
  delayStartTime: 5,
  device_width: device.width,
  device_height: device.height,
  // 是否是AutoJS Pro  需要屏蔽部分功能，暂时无法实现：生命周期监听等 包括通话监听
  is_pro: is_pro,
  auto_set_bang_offset: true,
  bang_offset: 0,
  thread_name_prefix: 'autoscript_',
  // 标记是否清除webview缓存
  clear_webview_cache: false
};
// 不同项目需要设置不同的storageName，不然会导致配置信息混乱
var CONFIG_STORAGE_NAME = 'AutoSignAliPay';
var PROJECT_NAME = '支付宝批量登录脚本';
var config = {};
var storageConfig = storages.create(CONFIG_STORAGE_NAME);
Object.keys(default_config).forEach(function (key) {
  var storedVal = storageConfig.get(key);
  if (typeof storedVal !== 'undefined') {
    config[key] = storedVal;
  } else {
    config[key] = default_config[key];
  }
});

// 覆写配置信息
config.overwrite = function (key, value) {
  var storage_name = CONFIG_STORAGE_NAME;
  var config_key = key;
  if (key.indexOf('.') > -1) {
    var keyPair = key.split('.');
    storage_name = CONFIG_STORAGE_NAME + '_' + keyPair[0];
    key = keyPair[1];
    config_key = keyPair[0] + '_config';
    if (!config.hasOwnProperty(config_key) || !config[config_key].hasOwnProperty(key)) {
      return;
    }
    config[config_key][key] = value;
  } else {
    if (!config.hasOwnProperty(config_key)) {
      return;
    }
    config[config_key] = value;
  }
  console.verbose('覆写配置', storage_name, key);
  storages.create(storage_name).put(key, value);
};
module.exports = {
  config: config,
  default_config: default_config,
  storage_name: CONFIG_STORAGE_NAME,
  project_name: PROJECT_NAME
};

/***/ }),

/***/ "./node_modules/@babel/runtime/helpers/interopRequireDefault.js":
/*!**********************************************************************!*\
  !*** ./node_modules/@babel/runtime/helpers/interopRequireDefault.js ***!
  \**********************************************************************/
/***/ ((module) => {

function _interopRequireDefault(e) {
  return e && e.__esModule ? e : {
    "default": e
  };
}
module.exports = _interopRequireDefault, module.exports.__esModule = true, module.exports["default"] = module.exports;

/***/ }),

/***/ "./node_modules/@babel/runtime/helpers/typeof.js":
/*!*******************************************************!*\
  !*** ./node_modules/@babel/runtime/helpers/typeof.js ***!
  \*******************************************************/
/***/ ((module) => {

function _typeof(o) {
  "@babel/helpers - typeof";

  return module.exports = _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {
    return typeof o;
  } : function (o) {
    return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
  }, module.exports.__esModule = true, module.exports["default"] = module.exports, _typeof(o);
}
module.exports = _typeof, module.exports.__esModule = true, module.exports["default"] = module.exports;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/************************************************************************/
/*!*************************************!*\
  !*** ./src/handler/CrashCatcher.js ***!
  \*************************************/
var crashCatcher = __webpack_require__(/*! @/lib/prototype/CrashCatcher */ "./src/lib/prototype/CrashCatcher.js");
crashCatcher.restartIfCrash();
/******/ })()
;