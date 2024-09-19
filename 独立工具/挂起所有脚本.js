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

/***/ "./src/lib/BaseCommonFunctions.js":
/*!****************************************!*\
  !*** ./src/lib/BaseCommonFunctions.js ***!
  \****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var _interopRequireDefault = __webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "./node_modules/@babel/runtime/helpers/interopRequireDefault.js");
var _typeof2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/typeof */ "./node_modules/@babel/runtime/helpers/typeof.js"));
/**
 * 通用方法集合，和项目无关，项目相关的写到 ProjectCommonFunctions.js 中
 */
importClass(android.content.Context);
importClass(android.provider.Settings);
importClass(java.io.StringWriter);
importClass(java.io.StringReader);
importClass(java.io.PrintWriter);
importClass(java.io.BufferedReader);
importClass(java.lang.StringBuilder);
importClass(android.content.pm.PackageManager);
var _global_this_ = __webpack_require__.g;
var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  _config = _require.config,
  _storage_name = _require.storage_name,
  project_name = _require.project_name;
var Timers = __webpack_require__(/*! @/lib/prototype/Timers */ "./src/lib/prototype/Timers.js");
var _runningQueueDispatcher = __webpack_require__(/*! @/lib/prototype/RunningQueueDispatcher */ "./src/lib/prototype/RunningQueueDispatcher.js");
var _FloatyInstance = __webpack_require__(/*! @/lib/prototype/FloatyUtil */ "./src/lib/prototype/FloatyUtil.js");
var automator = __webpack_require__(/*! @/lib/prototype/Automator */ "./src/lib/prototype/Automator.js");
var FileUtils = __webpack_require__(/*! @/lib/prototype/FileUtils */ "./src/lib/prototype/FileUtils.js");
var _logUtils = __webpack_require__(/*! @/lib/prototype/LogUtils */ "./src/lib/prototype/LogUtils.js");
var processShare = __webpack_require__(/*! @/lib/prototype/ProcessShare */ "./src/lib/prototype/ProcessShare.js");
var capturePermissionResolver = __webpack_require__(/*! @/lib/prototype/CapturePermissionResolver */ "./src/lib/prototype/CapturePermissionResolver.js");
var formatDate = __webpack_require__(/*! @/lib/DateUtil.js */ "./src/lib/DateUtil.js");
var _require2 = __webpack_require__(/*! @/lib/UpdateChecker.js */ "./src/lib/UpdateChecker.js"),
  updateChecker = _require2.updateChecker;
var storageFactory = __webpack_require__(/*! @/lib/prototype/StorageFactory */ "./src/lib/prototype/StorageFactory.js");
var RUNTIME_STORAGE = _storage_name + "_runtime";
var DISMISS_AWAIT_DIALOG = 'dismissAwaitDialog';
var TIMER_AUTO_START = "timerAutoStart";
var READY = 'ready_engine';
var DISMISSED_PACKAGE = 'dismissedPackage';
var SKIPPED_PACKAGE = 'skipedPackage';
var EXTEND_FAILED_COUNT = 'extendFailedCount';
function CommonFunctions() {
  this.keyList = [];
  storageFactory.initFactoryByKey(DISMISS_AWAIT_DIALOG, {
    dismissReason: ''
  });
  storageFactory.initFactoryByKey(TIMER_AUTO_START, {
    array: []
  });
  storageFactory.initFactoryByKey(READY, {
    engineId: -1
  });
  storageFactory.initFactoryByKey(DISMISSED_PACKAGE, {
    packageName: '',
    count: 0
  });
  storageFactory.initFactoryByKey(SKIPPED_PACKAGE, {
    packageName: '',
    count: 0
  });
  storageFactory.initFactoryByKey(EXTEND_FAILED_COUNT, {
    count: 0
  });
  // 初始化森林相关的存储数据
  this.initStorageFactory();
  // 截图锁
  var captureScreenLock = threads.lock();
  // 初始化生命周期回调 start
  var lifecycleCallbacks = [];
  var idCounter = 0;
  var lifecycleLock = threads.lock();
  _config.isRunning = true;
  var ENGINE_ID = engines.myEngine().id;
  var _this = this;

  /**
   * 通过额外线程方式监听脚本是否退出运行 需要额外创建线程池，但是能百分百保证脚本结束后自动执行回调
   * @deprecated 通过event.on('exit') 触发即可 暂时不使用该方法
   */
  this.initLifecycleDeamonByThreadPool = function () {
    importClass(java.util.concurrent.LinkedBlockingQueue);
    importClass(java.util.concurrent.ThreadPoolExecutor);
    importClass(java.util.concurrent.TimeUnit);
    importClass(java.util.concurrent.ThreadFactory);
    importClass(java.util.concurrent.Executors);
    // 注册脚本生命周期回调，创建一个单独的线程来监听当前脚本是否已经执行完毕
    var lifecycleDeamonThreadPool = new ThreadPoolExecutor(1, 1, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(10), new ThreadFactory({
      newThread: function newThread(runnable) {
        var thread = Executors.defaultThreadFactory().newThread(runnable);
        thread.setName(_config.thread_name_prefix + ENGINE_ID + '-lifecycle-deamon-' + thread.getName());
        return thread;
      }
    }));
    lifecycleDeamonThreadPool.execute(function () {
      while (_config.isRunning) {
        // 每0.5秒检测一次isRunning, 5秒太慢了
        sleep(500);
        var currentEngine = engines.all().filter(function (engine) {
          return engine.id === ENGINE_ID;
        });
        _config.isRunning = currentEngine && currentEngine.length > 0;
      }
      _logUtils.debugInfo('脚本已经中止执行，执行生命周期回调');
      try {
        // 脚本已经结束，执行callbacks
        if (lifecycleCallbacks && lifecycleCallbacks.length > 0) {
          _logUtils.debugInfo('生命周期回调总数：' + lifecycleCallbacks.length);
          lifecycleCallbacks.forEach(function (callback, index) {
            try {
              _logUtils.debugInfo(['执行生命周期回调：[{}/{}] {}', index + 1, lifecycleCallbacks.length, callback.desc]);
              callback.func();
            } catch (e) {
              _logUtils.errorInfo(callback.desc + ' 生命周期回调异常' + e);
            }
          });
        }
      } catch (e) {
        _logUtils.errorInfo('执行生命周期回调异常' + e);
      }
      // 新建线程 关闭线程池
      var thread = new Thread(new java.lang.Runnable({
        run: function run() {
          try {
            lifecycleDeamonThreadPool.shutdown();
            var flag = lifecycleDeamonThreadPool.awaitTermination(5, TimeUnit.SECONDS);
            lifecycleDeamonThreadPool.shutdownNow();
            _logUtils.debugInfo('lifecycleDeamon线程池关闭：' + flag);
          } catch (e) {
            _logUtils.errorInfo('关闭lifecycleDeamon线程池异常:' + e);
          } finally {
            lifecycleDeamonThreadPool = null;
          }
        }
      }));
      thread.setName(_config.thread_name_prefix + ENGINE_ID + "_shutdown_lifecycle_thread");
      thread.start();
    });
  };
  // 初始化生命周期回调 end

  /**
   * 通过events事件执行生命周期回调 缺点是可能触发最大监听数限制，另外可能会不小心被 events.removeAllListeners() 注销
   */
  this.initLifecycleDeamonByEvents = function () {
    _logUtils.debugInfo(['通过event.on(\'exit\')注册生命周期回调']);
    events.on('exit', function () {
      _logUtils.debugInfo('脚本已经中止执行，执行生命周期回调');
      try {
        // 脚本已经结束，执行callbacks
        if (lifecycleCallbacks && lifecycleCallbacks.length > 0) {
          _logUtils.debugInfo('生命周期回调总数：' + lifecycleCallbacks.length);
          lifecycleCallbacks.forEach(function (callback, index) {
            try {
              _logUtils.debugInfo(['执行生命周期回调：[{}/{}] {}', index + 1, lifecycleCallbacks.length, callback.desc]);
              callback.func();
            } catch (e) {
              _logUtils.errorInfo(callback.desc + ' 生命周期回调异常' + e);
            }
          });
        }
      } catch (e) {
        _logUtils.errorInfo('执行生命周期回调异常' + e);
      }
    });
  };

  // 选择其中一个即可
  if (_config._init_lifecycle_by_thread_pool) {
    _logUtils.warnInfo('基于线程监听生命周期的模式在新版AutoJS中可能不再支持，不建议使用', true);
    this.initLifecycleDeamonByThreadPool();
  } else {
    this.initLifecycleDeamonByEvents();
  }
  var _current_pacakge = currentPackage;
  currentPackage = function currentPackage() {
    var start = new Date().getTime();
    try {
      if (!runtime.getAccessibilityBridge()) {
        return _current_pacakge();
      }
      // 通过windowRoot获取根控件的包名，理论上返回一个 速度较快
      var windowRoots = runtime.getAccessibilityBridge().windowRoots();
      if (windowRoots && windowRoots.size() > 0) {
        _logUtils.debugInfo(['windowRoots size: {}', windowRoots.size()]);
        for (var i = windowRoots.size() - 1; i >= 0; i--) {
          var root = windowRoots.get(i);
          if (root !== null && root.getPackageName()) {
            return root.getPackageName();
          }
        }
      }
      // windowRoot获取失败了通过service.getWindows获取根控件的包名，按倒序从队尾开始获取 速度相对慢一点
      var service = runtime.getAccessibilityBridge().getService();
      var serviceWindows = service !== null ? service.getWindows() : null;
      if (serviceWindows && serviceWindows.size() > 0) {
        _logUtils.debugInfo(['windowRoots未能获取包名信息，尝试service window size: {}', serviceWindows.size()]);
        for (var _i = serviceWindows.size() - 1; _i >= 0; _i--) {
          var window = serviceWindows.get(_i);
          var _root = null;
          if (window && (_root = window.getRoot()) != null && _root.getPackageName()) {
            return _root.getPackageName();
          }
        }
      }
      _logUtils.debugInfo(['service.getWindows未能获取包名信息，通过currentPackage()返回数据']);
      // 以上方法无法获取的，直接按原方法获取包名
      return _current_pacakge();
    } catch (e) {
      _logUtils.errorInfo(['通过控件方式获取包名失败, 使用原始方法获取', e]);
      return _current_pacakge();
    } finally {
      _logUtils.debugInfo(['获取包名总耗时：{}ms', new Date().getTime() - start]);
    }
  };

  /**
   * 确保识别区域在图片范围内，超范围的自动压缩宽高
   * @param {array} region  识别区域范围[x, y, width, height]
   * @param {int} maxWidth 最大宽度
   * @param {int} maxHeight 最大高度
   */
  this.ensureRegionInScreen = function (region, maxWidth, maxHeight) {
    var originRegion = JSON.parse(JSON.stringify(region));
    maxWidth = maxWidth || _config.device_width;
    maxHeight = maxHeight || _config.device_height;
    var flag = 0;
    if (region[0] > maxWidth || region[0] < 0) {
      _logUtils.errorInfo(['x起始点超范围：{}', region[0]]);
      throw new java.lang.IllegalArgumentException('x起始点超范围：' + region[0]);
    }
    if (region[1] > maxHeight || region[1] < 0) {
      _logUtils.errorInfo(['y起始点超范围：{}', region[0]]);
      throw new java.lang.IllegalArgumentException('y起始点超范围：' + region[1]);
    }
    var width = region[0] + region[2];
    var height = region[1] + region[3];
    if (width > maxWidth) {
      region[2] = maxWidth - region[0];
      flag = flag | 1;
    }
    if (height > maxHeight) {
      region[3] = maxHeight - region[1];
      flag = flag | 2;
    }
    if (flag !== 0) {
      _logUtils.debugInfo(['检测识别区域是否超范围：{} maxW: {} maxH: {}', JSON.stringify(originRegion), maxWidth, maxHeight]);
      if (flag & 1 === 1) {
        _logUtils.debugInfo(['宽度超范围 修正为：{}', region[2]]);
      }
      if (flag & 2 === 2) {
        _logUtils.debugInfo(['高度超范围 修正为：{}', region[3]]);
      }
    }
  };

  /**
   * 获取状态栏的高度
   * 
   * @returns {number}
   */
  this.getStatusBarHeightCompat = function () {
    var result = 0;
    var resId = context.getResources().getIdentifier("status_bar_height", "dimen", "android");
    if (resId > 0) {
      result = context.getResources().getDimensionPixelOffset(resId);
    }
    if (result <= 0) {
      result = context.getResources().getDimensionPixelOffset(R.dimen.dimen_25dp);
    }
    return result;
  };

  /**
   * 自动设置刘海的偏移量 即状态栏高度
   * 通过代码方式获取
   */
  this.autoSetUpBangOffset = function () {
    if (_config.auto_set_bang_offset) {
      var offset = this.getStatusBarHeightCompat();
      _logUtils.debugInfo(['自动设置刘海偏移量为：{}', offset]);
      var configStorage = storages.create(_storage_name);
      // 设为负值
      _config.bang_offset = -offset;
      configStorage.put('bang_offset', _config.bang_offset);
      configStorage.put('auto_set_bang_offset', false);
    }
  };

  /**
   * 自动设置刘海的偏移量
   * @deprecated 使用代码方式获取更加便捷
   */
  this._autoSetUpBangOffset = function (doNotRestart) {
    if (_config.auto_set_bang_offset || _config.updated_temp_flag_1325) {
      if (!this.requestScreenCaptureOrRestart(doNotRestart)) {
        // 请求截图权限失败，取消设置刘海偏移量
        return;
      }
      var DETECT_COLOR = '#10FF1F';
      var window = floaty.window("\n        <frame id=\"container\" gravity=\"center\" bg=\"#10FF1F\">\n          <horizontal margin=\"10 0\" gravity=\"center\">\n            <text id=\"text\" text=\"TEXT FLOATY\" textSize=\"10sp\" />\n          </horizontal>\n        </frame>\n      ");
      window.setPosition(100, 0);
      // 等待悬浮窗初始化
      sleep(300);
      var offset = null;
      var _limit = 10;
      while (!offset && offset !== 0 && _limit-- > 0) {
        var screen = this.checkCaptureScreenPermission();
        if (screen) {
          var point = images.findColor(screen, DETECT_COLOR, {
            region: [80, 0, 100, 300],
            threshold: 1
          });
          if (point && images.detectsColor(screen, DETECT_COLOR, point.x + 20, point.y) && images.detectsColor(screen, DETECT_COLOR, point.x + 30, point.y)) {
            offset = point.y;
            ui.run(function () {
              window.text.setText('刘海偏移量为：' + offset + ' 自动关闭悬浮窗');
            });
            _logUtils.debugInfo(['自动设置刘海偏移量为：{}', offset]);
            var configStorage = storages.create(_storage_name);
            // 设为负值
            _config.bang_offset = -offset;
            configStorage.put('bang_offset', _config.bang_offset);
            configStorage.put('auto_set_bang_offset', false);
            configStorage.put('updated_temp_flag_1325', false);
            sleep(500);
            _logUtils.debugInfo('关闭悬浮窗');
            window.close();
          } else {
            sleep(100);
          }
        }
      }
      if (_limit <= 0) {
        ui.run(function () {
          window.text.setText('无法自动检测刘海高度，请确认是否开启了深色模式？');
        });
        _logUtils.warnInfo('无法自动检测刘海高度，请确认是否开启了深色模式？');
        sleep(500);
        window.close();
      }
    }
  };

  /**
   * 注册生命周期回调，在退出时执行func
   * @param {function} func 回调方法
   * @param {String} desc 过程描述
   */
  this.registerOnEngineRemoved = function (func, desc) {
    desc = desc || 'common func';
    lifecycleLock.lock();
    var callbackId = ++idCounter;
    try {
      lifecycleCallbacks.push({
        func: func,
        desc: desc,
        id: callbackId
      });
    } finally {
      lifecycleLock.unlock();
    }
    return callbackId;
  };

  /**
   * 取消生命周期回调
   * @param {number} callbackId 回调记录的id
   */
  this.unregisterLifecycleCallback = function (callbackId) {
    lifecycleLock.lock();
    try {
      if (lifecycleCallbacks && lifecycleCallbacks.length > 0) {
        var callbackIdx = lifecycleCallbacks.findIndex(function (callback) {
          return callback.id === callbackId;
        });
        if (callbackIdx > -1) {
          var removedArray = lifecycleCallbacks.splice(callbackIdx, 1);
          _logUtils.debugInfo(['移除生命周期回调，id:{} index:{} desc: {}', callbackId, callbackIdx, removedArray && removedArray.length > 0 ? removedArray[0].desc : 'unknown']);
        } else {
          _logUtils.debugInfo(['生命周期回调不存在，id:{}', callbackId]);
        }
      }
    } finally {
      lifecycleLock.unlock();
    }
  };
  this.checkPermission = function (permission) {
    return PackageManager.PERMISSION_GRANTED === context.getPackageManager().checkPermission(permission, context.getPackageName());
  };
  this.hasAdbPermission = function () {
    return this.checkPermission('android.permission.WRITE_SECURE_SETTINGS');
  };

  /**
   * 打开开发者选项界面
   */
  this.openDevelopmentSettings = function () {
    app.startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS));
  };

  /**
   * 获取无障碍服务的类名，防检测的修改了这个类名 所以需要通过反射获取
   */
  this.getAccessibilityServiceClassName = function () {
    if (this.getAutoJsPackage().startsWith("org.autojs.autojs")) {
      return "com.stardust.autojs.core.accessibility.AccessibilityService";
    } else {
      /**
       * 适配变更包名的AutoJS，针对淘宝客户端会读取并拉黑无障碍功能中已启用AutoJS相关的用户，
       * 可以创建一个乱七八糟包名的AutoJS并修改AccessibilityService的包名称，脚本中需要通过反射获取对应的类全名
       */
      try {
        importClass(org.autojs.autojs.tool.AccessibilityServiceTool);
        var clz = new AccessibilityServiceTool().getClass();
        var field = clz.getDeclaredField('sAccessibilityServiceClass');
        var typeName = field.getGenericType().getTypeName();
        var regex = /.*<(.*)>/;
        return regex.exec(typeName)[1];
      } catch (e) {
        self.printExceptionStack(e);
        return null;
      }
    }
  };

  /**
   * adb 授权命令
   * 
   * @returns 
   */
  this.getAdbGrantCmd = function () {
    return 'adb shell pm grant ' + this.getAutoJsPackage() + ' android.permission.WRITE_SECURE_SETTINGS';
  };

  /**
   * 校验是否已经拥有无障碍权限 没有自动获取 前提是获取了adb权限
   * 原作者：MrChen 原始代码来自Pro商店
   * adb授权方法：开启usb调试并使用adb工具连接手机，执行 adb shell pm grant org.autojs.autojspro android.permission.WRITE_SECURE_SETTINGS
   * 取消授权 adb shell pm revoke org.autojs.autojspro android.permission.WRITE_SECURE_SETTINGS
   * 其中免费版包名为 org.autojs.autojs
   * @param {boolean} force 是否强制启用
   */
  this.checkAccessibilityService = function (force) {
    var hasAdbPermission = this.hasAdbPermission();
    if (!!auto.rootInActiveWindow && (!force || !hasAdbPermission)) {
      // 当拥有无障碍权限时直接返回true
      return true;
    }
    // 无ADB授权时直接返回false
    if (!hasAdbPermission) {
      return false;
    }
    var packageName = this.getAutoJsPackage();
    var self = this;
    var setAccessibility = false;
    var accessibilityServiceClassName = this.getAccessibilityServiceClassName();
    if (!accessibilityServiceClassName) {
      // 无法准确获取无障碍服务名称，交由auto.waitFor()处理
      return false;
    }
    var requiredService = packageName + '/' + accessibilityServiceClassName;
    try {
      var enabledServices = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
      _logUtils.debugInfo(['当前已启用无障碍功能的服务:{}', enabledServices]);
      var service = null;
      if (enabledServices.indexOf(requiredService) < 0 || enabledServices.split(':').filter(function (v) {
        return !/^(((\w+\.)+\w+)[/]?){2}$/.test(v);
      }).length > 1) {
        service = enabledServices + ':' + requiredService;
      } else if (force) {
        // 如果强制开启
        service = enabledServices;
      }
      if (service) {
        if (_config.other_accessisibility_services) {
          service += ':' + _config.other_accessisibility_services;
        }
        // 清理service 删除无效的或者不正确的
        _logUtils.debugInfo(['准备设置无障碍权限：{}', service]);
        var services = [];
        service = service.split(':').filter(function (v) {
          return /^(((\w+\.)+\w+)[/]?){2}$/.test(v);
        }).filter(function (s) {
          if (services.indexOf(s) > -1) {
            return false;
          }
          services.push(s);
          return true;
        }).join(':');
        _logUtils.debugInfo(['过滤无效内容后的services：{}', service]);
        Settings.Secure.putString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES, service);
        Settings.Secure.putString(context.getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED, '1');
        _logUtils.infoLog('成功开启AutoJS的辅助服务', true);
        !force && this.setUpAutoStart(0.1, true);
        setAccessibility = true;
      } else {
        return true;
      }
    } catch (e) {
      _config.develop_mode && this.printExceptionStack(e);
      _logUtils.warnInfo('\n请确保已给予 WRITE_SECURE_SETTINGS 权限\n\n授权代码已复制，请使用adb工具连接手机执行(重启不失效)\n\n', true);
      var shellScript = this.getAdbGrantCmd();
      _logUtils.warnInfo('adb 脚本 已复制到剪切板：[' + shellScript + ']');
      setClip(shellScript);
      return false;
    }
    // 当通过代码设置了无障碍权限之后自动退出
    setAccessibility && exit();
  };

  /**
   * 确保无障碍服务已启用
   * 
   * @param {boolean} force 是否强制开启 仅ADB授权后有用
   * @returns 
   */
  this.ensureAccessibilityEnabled = function (force) {
    if (!this.checkAccessibilityService(force)) {
      try {
        _logUtils.debugInfo('无ADB授权，使用auto.waitFor()');
        _logUtils.warnInfo('ADB授权命令：' + this.getAdbGrantCmd());
        _logUtils.logInfo('即将跳转无障碍界面，授权完毕后会自动打开AutoJS，如果失败请手动返回，或者给与AutoJS后台弹出界面的权限', true);
        sleep(1500);
        auto.waitFor();
        // waitFor执行完毕后 重新打开AutoJS界面
        app.launch(context.getPackageName());
        // 等待十秒钟，如果app.launch失败了等手动回到autojs界面
        limit = 10;
        var currentPackageName = commonFunctions.myCurrentPackage();
        while (limit-- > 0 && currentPackageName !== context.getPackageName()) {
          debugInfo(['当前包名：{}', currentPackageName]);
          sleep(1000);
          currentPackageName = commonFunctions.myCurrentPackage();
        }
        return true;
      } catch (e) {
        _logUtils.warnInfo('auto.waitFor()不可用');
        auto();
      }
    }
    return true;
  };

  /**
   * 获取已授权的无障碍服务
   * @returns 
   */
  this.getEnabledAccessibilityServices = function () {
    if (this.hasAdbPermission()) {
      return Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) || '';
    }
    return '';
  };

  /**
   * 关闭无障碍权限，并重启脚本
   */
  this.disableAccessibilityAndRestart = function (notRestart) {
    if (!this.hasAdbPermission()) {
      _logUtils.warnInfo('未通过ADB授权，无法自动关闭无障碍权限，交由后续处理');
      return;
    }
    try {
      var accessibilityServiceClassName = this.getAccessibilityServiceClassName();
      var requiredService = this.getAutoJsPackage() + '/' + accessibilityServiceClassName;
      var enabledServices = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) || '';
      enabledServices = enabledServices.replace(requiredService, '').split(':').filter(function (v) {
        return /^(((\w+\.)+\w+)[/]?){2}$/.test(v);
      }).join(':');
      Settings.Secure.putString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES, enabledServices);
      Settings.Secure.putString(context.getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED, '1');
      _logUtils.warnInfo('关闭无障碍服务成功', true);
      if (notRestart) {
        return;
      }
      this.setUpAutoStart(0.1, true);
      exit();
    } catch (e) {
      _logUtils.warnInfo(['无法自动关闭无障碍权限，交由后续处理: {}', e]);
    }
  };
  this.captureScreen = function (errorLimit, releaseLock) {
    return this.checkCaptureScreenPermission(errorLimit, releaseLock);
  };

  /**
   * 校验截图权限，权限失效则重新启动，根据参数释放任务队列
   * @param {number} errorLimit 失败尝试次数
   * @param {boolean} releaseLock 是否在失败后释放任务队列
   */
  this.checkCaptureScreenPermission = function (errorLimit, releaseLock) {
    this.requestScreenCaptureOrRestart();
    captureScreenLock.lock();
    try {
      var screen = null;
      var start = new Date().getTime();
      if (!_config.async_waiting_capture) {
        _logUtils.debugInfo('同步获取截图');
        screen = captureScreen();
      } else {
        errorLimit = errorLimit || 2;
        // 获取截图 用于判断是否可收取
        var errorCount = 0;
        do {
          var waitResult = this.waitFor(function () {
            var max_try = 10;
            while (!screen && max_try-- > 0) {
              screen = captureScreen();
            }
          }, _config.capture_waiting_time || 500);
          if (!screen) {
            _logUtils.warnInfo(['获取截图失败 {} {} count:{}', !waitResult ? '等待截图超时' + (errorCount++ == errorLimit - 1 ? ', 建议将获取截图超时时间加长' : '') : '获取截图为NULL', errorCount < errorLimit ? '再试一次' : '', errorCount]);
            // 滑动界面，触发渲染
            _logUtils.debugInfo('获取截图失败，尝试滑动界面，触发渲染');
            automator.scrollUpAndDown();
            // 延迟
            sleep(300);
          }
        } while (!screen && errorCount < errorLimit);
        if (!screen) {
          automator.scrollUp();
          // 释放并重新获取截图权限
          var requestPermission = capturePermissionResolver.releaseAndRequestScreenCapture();
          if (requestPermission) {
            return this.checkCaptureScreenPermission(1, releaseLock);
          }
          _logUtils.errorInfo(['获取截图失败多次[{}], 可能已经没有了截图权限，且重新申请权限失败重新执行脚本', errorCount], true);
          automator.back();
          if (releaseLock) {
            _runningQueueDispatcher.removeRunningTask(true);
          } else {
            // 用于取消下一次运行的dialog
            this.getAndUpdateDismissReason('capture-screen-error');
          }
          _runningQueueDispatcher.executeTargetScript(this.getRunningScriptSource());
          _config.resetBrightness && _config.resetBrightness();
          exit();
        }
      }
      _logUtils.debugInfo(['获取截图耗时：{}ms', new Date().getTime() - start]);
      return screen;
    } finally {
      captureScreenLock.unlock();
    }
  };
  this.getAutoJsPackage = function () {
    return context.getPackageName();
  };
  this.getAndUpdateDismissReason = function (newVal) {
    var storedDismissDialogInfo = this.getTodaysRuntimeStorage(DISMISS_AWAIT_DIALOG);
    var oldVal = storedDismissDialogInfo.dismissReason;
    storedDismissDialogInfo.dismissReason = newVal;
    this.updateRuntimeStorage(DISMISS_AWAIT_DIALOG, storedDismissDialogInfo);
    return oldVal;
  };

  /**
   * 启动package
   * @param packageName 需要启动的package名称
   */
  this.launchPackage = function (packageName) {
    _logUtils.debugInfo(['准备打开package: {}', packageName]);
    var currentRunning = currentPackage();
    app.launchPackage(packageName);
    sleep(1000);
    currentRunning = currentPackage();
    var waitCount = 3;
    while (currentRunning !== packageName && waitCount-- > 0) {
      sleep(100);
      currentRunning = currentPackage();
    }
    _logUtils.debugInfo(['进入[{}] {}', packageName, packageName === currentRunning ? '成功' : '失败']);
  };
  this.clickBackOrClose = function (packageName) {
    var getCurrentPkgName = currentPackage();
    _logUtils.debugInfo(['当前包名：{} 对比包名: {}', getCurrentPkgName, packageName]);
    if (getCurrentPkgName !== packageName) {
      return false;
    }
    if (!this._widgetUtils) {
      this._widgetUtils = __webpack_require__(/*! @/lib/prototype/WidgetUtils */ "./src/lib/prototype/WidgetUtils.js");
    }
    var backOrColse = this._widgetUtils.widgetGetOne('返回|关闭', 500);
    getCurrentPkgName = currentPackage();
    _logUtils.debugInfo(['二次获取当前包名：{} 对比包名: {}', getCurrentPkgName, packageName]);
    if (getCurrentPkgName !== packageName) {
      return false;
    }
    if (backOrColse) {
      automator.clickCenter(backOrColse);
    } else {
      back();
    }
    return true;
  };
  this.minimize = function (currentPackageName) {
    currentPackageName = currentPackageName || currentPackage();
    _logUtils.debugInfo(['直接返回最小化，currentPackageName: {}', currentPackageName]);
    try {
      var maxRepeat = 10;
      while (maxRepeat-- > 0 && this.clickBackOrClose(currentPackageName)) {
        sleep(500);
      }
      var getCurrentPkgName = currentPackage();
      _logUtils.debugInfo(['最后一次获取包名：{} 对比目标包名：{}', getCurrentPkgName, currentPackageName]);
      if (getCurrentPkgName === currentPackageName) {
        back();
      }
    } catch (e) {
      _logUtils.errorInfo('尝试返回失败' + e);
      this.printExceptionStack(e);
    }
  };

  /**
   * 用于保存相似内容，${STORAGE_TAG} => { packageName: ${}, count: ${} }
   * 当传入包名相同时自增count，不同时重置count和packageName
   * 
   * @param {*} packageName 对应包名
   * @param {*} STORAGE_TAG 对应保存的键值
   */
  this.savePackageStorageInfo = function (packageName, STORAGE_TAG) {
    var currentStorage = storageFactory.getValueByKey(STORAGE_TAG, true);
    if (currentStorage.packageName === packageName) {
      currentStorage.count += 1;
    } else {
      currentStorage = {
        packageName: packageName,
        count: 1
      };
    }
    storageFactory.updateValueByKey(STORAGE_TAG, currentStorage);
  };

  /**
   * 保存点击了延迟五分钟时的包名次数信息
   * 
   * @param {*} packageName 
   */
  this.saveDismissedPackageInfo = function (packageName) {
    this.savePackageStorageInfo(packageName, DISMISSED_PACKAGE);
  };

  /**
   * 判断指定packageName是否在白名单中
   * 
   * @param {*} packageName 
   */
  this.inSkipList = function (packageName) {
    return _config.skip_running_packages && _config.skip_running_packages.map(function (v) {
      return v.packageName;
    }).indexOf(packageName) > -1;
  };

  /**
   * 检测当前packageName跳过次数是否达到三次，如果是则弹窗询问是否加入到白名单中
   */
  this.askAndPutIntoSkipList = function () {
    var currentDismissedPackage = storageFactory.getValueByKey(DISMISSED_PACKAGE, true);
    if (currentDismissedPackage.packageName && currentDismissedPackage.count >= 3 && !this.inSkipList(currentDismissedPackage.packageName)) {
      if (confirm('是否需要将当前包名添加到白名单？\n' + currentDismissedPackage.packageName)) {
        var currentSkipPackages = _config.skip_running_packages || [];
        currentSkipPackages.push({
          packageName: currentDismissedPackage.packageName,
          appName: getAppName(currentDismissedPackage.packageName)
        });
        var configStorage = storages.create(_storage_name);
        configStorage.put('skip_running_packages', currentSkipPackages);
      }
    }
  };

  /**
   * 保存白名单自动跳过的包名次数信息
   * 
   * @param {*} packageName 
   */
  this.saveSkipedPackageInfo = function (packageName) {
    this.savePackageStorageInfo(packageName, SKIPPED_PACKAGE);
  };

  /**
   * 当白名单跳过次数过多时，询问是否直接运行不在跳过，适合需要时限的任务避免跳过次数过多影响收益
   * 按音量下键可以直接运行
   */
  this.askIfStartWhenSkipedTooMuch = function () {
    var currentSkippedPackage = storageFactory.getValueByKey(SKIPPED_PACKAGE, true);
    if (currentSkippedPackage.count >= 3 && _config.warn_skipped_too_much) {
      _logUtils.warnInfo(['当前包名跳过次数过多，是否直接执行{}？音量下键执行', project_name], true);
      var continueRunning = false;
      var _self = this;
      var th = threads.start(function () {
        events.observeKey();
        events.onceKeyDown('volume_down', function (event) {
          _logUtils.warnInfo('直接执行，不再跳过', true);
          continueRunning = true;
          // 重置计数器
          _self.saveSkipedPackageInfo('');
        });
      });
      // 等待五秒
      sleep(5000);
      th.interrupt();
      return continueRunning;
    }
    return false;
  };

  /**
   * @param checkDismissReason 是否校验跳过弹窗
   * @param notCheckUpdate 跳过更新校验
   * @param taskName 任务名称
   */
  this.showDialogAndWait = function (checkDismissReason, notCheckUpdate, taskName) {
    // 显示悬浮窗之前关闭按键监听，避免操作不当导致界面卡死
    events.removeAllKeyDownListeners('volume_down');
    if (this.inLimitTimeRange()) {
      _logUtils.warnInfo('当前在限制运行时间范围，停止运行', true);
      exit();
    }
    var currentPackageName = currentPackage();
    if (checkDismissReason) {
      var dismissReason = this.getAndUpdateDismissReason('');
      if (dismissReason) {
        _logUtils.debugInfo(['不再展示延迟对话框，{}', dismissReason]);
        return;
      }
    }
    if (_config.delayStartTime <= 0) {
      _logUtils.debugInfo(['延迟启动时间[{}]小于等于0，不展示对话框', _config.delayStartTime]);
      return;
    }
    var continueRunning = true;
    var terminate = false;
    var showDialog = true;
    var lock = threads.lock();
    var complete = lock.newCondition();
    var that = this;
    lock.lock();
    threads.start(function () {
      _logUtils.debugInfo(['自动检测更新：{}', _config.auto_check_update]);
      var suffixContent = notCheckUpdate ? function () {
        return '';
      } : function () {
        var newVersion = updateChecker.hasNewVersion();
        var suffix = '';
        if (newVersion) {
          suffix = '，有新版本：' + newVersion + ' 请执行更新脚本进行更新, 本地版本为：' + updateChecker.getLocalVersion();
          _logUtils.warnInfo(['当前有新版本: {}，请运行可视化配置点击右上角菜单进行更新', newVersion], true);
        }
        return suffix;
      };
      var sleepCount = _config.delayStartTime || 5;
      var confirmDialog = dialogs.build({
        title: '即将开始' + (taskName || project_name),
        content: '将在' + sleepCount + '秒内开始' + suffixContent(),
        positive: '立即开始',
        positiveColor: '#f9a01c',
        negative: '终止',
        negativeColor: 'red',
        neutral: '延迟五分钟',
        cancelable: false
      }).on('positive', function () {
        lock.lock();
        try {
          complete.signal();
        } finally {
          lock.unlock();
        }
        showDialog = false;
        confirmDialog.dismiss();
      }).on('negative', function () {
        continueRunning = false;
        terminate = true;
        lock.lock();
        try {
          complete.signal();
        } finally {
          lock.unlock();
        }
        showDialog = false;
        confirmDialog.dismiss();
      }).on('neutral', function () {
        continueRunning = false;
        lock.lock();
        try {
          complete.signal();
        } finally {
          lock.unlock();
        }
        that.saveDismissedPackageInfo(currentPackageName);
        showDialog = false;
        confirmDialog.dismiss();
      }).show();
      _logUtils.debugInfo(['isShowing：{} isCanceled: {}', confirmDialog.isShowing(), confirmDialog.isCancelled()]);
      // 注册当脚本中断时隐藏弹出框
      var callbackId = that.registerOnEngineRemoved(function () {
        _logUtils.infoLog('生命周期结束，准备关闭弹窗');
        if (confirmDialog) {
          confirmDialog.dismiss();
          confirmDialog.removeAllListeners();
        }
      });
      while (sleepCount-- > 0 && showDialog) {
        sleep(1000);
        confirmDialog.setContent('将在' + sleepCount + '秒内开始' + suffixContent());
      }
      confirmDialog.setContent('即将开始');
      sleep(500);
      lock.lock();
      try {
        complete.signal();
      } finally {
        lock.unlock();
      }
      confirmDialog.dismiss();
      confirmDialog.removeAllListeners();
      that.unregisterLifecycleCallback(callbackId);
    });
    // 加载最新版本
    !notCheckUpdate && updateChecker.getLatestInfo();
    try {
      complete["await"]();
    } finally {
      lock.unlock();
    }
    if (terminate) {
      _logUtils.warnInfo('中止执行');
      _config.resetBrightness && _config.resetBrightness();
      this.cancelAllTimedTasks();
      _runningQueueDispatcher.removeRunningTask();
      // 不需要锁屏
      _config.notNeedRelock = true;
      exit();
    }
    if (continueRunning) {
      _logUtils.logInfo('立即开始');
      // 重置计数
      this.saveDismissedPackageInfo('');
      engines.myEngine().execArgv.executeByDispatcher && this.ensureDeviceSizeValid();
    } else {
      this.askAndPutIntoSkipList();
      _logUtils.logInfo('延迟五分钟后开始');
      _config.resetBrightness && _config.resetBrightness();
      this.setUpAutoStart(5, true);
      _runningQueueDispatcher.removeRunningTask();
      exit();
    }
  };

  /**
   * 子任务对话框
   * 
   * @param taskName 任务名称
   */
  this.showCommonDialogAndWait = function (taskName) {
    this.showDialogAndWait(true, true, taskName);
  };

  /**
   * 关闭悬浮窗并将floatyWindow置为空，在下一次显示时重新新建悬浮窗 因为close之后的无法再次显示
   */
  this.closeFloatyWindow = function () {
    _FloatyInstance.close();
  };
  this.showMiniFloaty = function (text, x, y, color) {
    _FloatyInstance.setFloatyInfo({
      x: x || _config.min_floaty_x || 150,
      y: y || _config.min_floaty_y || 20
    }, text, {
      textSize: _config.min_floaty_text_size || 8
    });
    _FloatyInstance.setFloatyTextColor(color || _config.min_floaty_color || '#00FF00');
  };

  /**
   * 显示悬浮窗 根据配置自动显示mini悬浮窗和可关闭悬浮窗，目前来说不推荐使用可关闭悬浮窗
   * @param text {String} 悬浮窗文字内容
   */
  this.showTextFloaty = function (text) {
    this.showMiniFloaty(text);
  };

  /**
   * 监听音量下键延迟执行
   **/
  this.listenDelayStart = function () {
    threads.start(function () {
      _logUtils.infoLog('即将开始，按音量下键延迟五分钟执行', true);
      sleep(2000);
      _logUtils.debugInfo('after setMaxListeners');
      events.observeKey();
      _logUtils.debugInfo('after observeKey');
      events.onceKeyDown('volume_down', function (event) {
        _config.resetBrightness && _config.resetBrightness();
        _config.auto_lock = false;
        _logUtils.warnInfo('延迟五分钟后启动脚本', true);
        _this.setUpAutoStart(5);
        _runningQueueDispatcher.removeRunningTask();
        exit();
      });
      _logUtils.debugInfo('after setOnceKeyDown');
    });
  };

  /**
   * 获取当天的缓存信息，不存在时创建一个初始值
   * @param key {String} key名称
   */
  this.getTodaysRuntimeStorage = function (key) {
    return storageFactory.getValueByKey(key);
  };

  /**
   * 获取无过期时间的缓存信息，不存在时创建一个初始值
   * @param key {String} key名称
   */
  this.getFullTimeRuntimeStorage = function (key) {
    return storageFactory.getValueByKey(key, true);
  };

  /**
   * 更新缓存数据
   * 
   * @param {string} key 
   * @param {object} value 
   * @returns 
   */
  this.updateRuntimeStorage = function (key, value) {
    return storageFactory.updateValueByKey(key, value);
  };

  /**
   * 选择性更新缓存数据
   * 
   * @param {string} key 
   * @param {function} callback 
   * @returns 
   */
  this.updateStorageInfo = function (key, callback) {
    return storageFactory.updateValueByKey(key, callback(storageFactory.getValueByKey(key, true)));
  };
  this.parseToZero = function (value) {
    return !value || isNaN(value) ? 0 : parseInt(value);
  };
  this.isEmpty = function (val) {
    return val === null || typeof val === 'undefined' || val === '';
  };
  this.isEmptyArray = function (array) {
    return array === null || typeof array === 'undefined' || array.length === 0;
  };
  this.isNotEmpty = function (val) {
    return !this.isEmpty(val) && !this.isEmptyArray(val);
  };
  this.addOpenPlacehold = function (content) {
    content = "<<<<<<<" + (content || "") + ">>>>>>>";
    _logUtils.appendLog(content);
    console.verbose(content);
  };
  this.addClosePlacehold = function (content) {
    content = ">>>>>>>" + (content || "") + "<<<<<<<";
    _logUtils.appendLog(content);
    console.verbose(content);
  };

  /**
   * @deprecated: see RunningQueueDispatcher$addRunningTask
   * 校验是否重复运行 如果重复运行则关闭当前脚本
   */
  this.checkDuplicateRunning = function () {
    var currentEngine = engines.myEngine();
    var runningEngines = engines.all();
    var runningSize = runningEngines.length;
    var currentSource = currentEngine.getSource() + '';
    _logUtils.debugInfo('当前脚本信息 id:' + currentEngine.id + ' source:' + currentSource + ' 运行中脚本数量：' + runningSize);
    if (runningSize > 1) {
      runningEngines.forEach(function (engine) {
        var compareEngine = engine;
        var compareSource = compareEngine.getSource() + '';
        _logUtils.debugInfo('对比脚本信息 id:' + compareEngine.id + ' source:' + compareSource);
        if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
          _logUtils.warnInfo('脚本正在运行中 退出当前脚本：' + currentSource, true);
          _runningQueueDispatcher.removeRunningTask(true);
          exit();
        }
      });
    }
  };

  /**
   * 关闭运行中的脚本 关闭全部同源脚本
   */
  this.killRunningScript = function (forceMain) {
    var runningEngines = engines.all();
    var runningSize = runningEngines.length;
    var mainScriptJs = this.getRunningScriptSource(forceMain);
    if (runningSize > 1) {
      runningEngines.forEach(function (engine) {
        var compareEngine = engine;
        var compareSource = compareEngine.getSource() + '';
        _logUtils.debugInfo('对比脚本信息 id:' + compareEngine.id + ' source:' + compareSource);
        if (compareSource === mainScriptJs) {
          _logUtils.warnInfo(['关闭运行中脚本：id[{}]', compareEngine.id], true);
          engine.forceStop();
        }
      });
    }
  };

  /**
   * 杀死重复运行的同源脚本
   */
  this.killDuplicateScript = function () {
    var currentEngine = engines.myEngine();
    var runningEngines = null;
    while (runningEngines === null) {
      // engines.all()有并发问题，尝试多次获取
      try {
        runningEngines = engines.all();
      } catch (e) {
        sleep(200);
      }
    }
    var runningSize = runningEngines.length;
    var currentSource = currentEngine.getSource() + '';
    _logUtils.debugInfo('当前脚本信息 id:' + currentEngine.id + ' source:' + currentSource + ' 运行中脚本数量：' + runningSize);
    if (runningSize > 1) {
      runningEngines.forEach(function (engine) {
        var compareEngine = engine;
        var compareSource = compareEngine.getSource() + '';
        _logUtils.debugInfo('对比脚本信息 id:' + compareEngine.id + ' source:' + compareSource);
        if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
          _logUtils.warnInfo(['currentId：{} 退出运行中的同源脚本id：{}', currentEngine.id, compareEngine.id]);
          // 直接关闭同源的脚本，暂时可以无视锁的存在
          engine.forceStop();
        }
      });
    }
  };

  /**
   * 设置指定时间后自动启动main脚本
   * 
   * @param {float} minutes 倒计时时间 单位分
   * @param {boolean} forceSetup 必须设置的定时任务
   */
  this.setUpAutoStart = function (minutes, forceSetup) {
    if (!forceSetup && _config.not_setup_auto_start && _config.disable_all_auto_start) {
      return;
    }
    if (minutes <= 0) {
      var newRandomMinutes = parseFloat((0.01 + Math.random()).toFixed(2));
      _logUtils.errorInfo(['倒计时时间必须大于零：{} 现在将倒计时重置为： {}', minutes, newRandomMinutes]);
      minutes = newRandomMinutes;
    }
    // 先移除所有已设置的定时任务
    this.cancelAllTimedTasks();
    // 非main.js启动时 设置当前执行的脚本的定时
    var mainScriptJs = this.getRunningScriptSource();
    var millis = new Date().getTime() + minutes * 60 * 1000;
    _logUtils.infoLog(['预订[{}]分钟后的任务，时间：{}({})', minutes, formatDate(new Date(millis)), millis]);
    // 预定一个{minutes}分钟后的任务
    var task = Timers.addDisposableTask({
      path: mainScriptJs,
      date: millis
    });
    _logUtils.debugInfo("定时任务预定成功: " + task.id);
    this.recordTimedTask(task);
  };
  this.recordTimedTask = function (task) {
    var array = storageFactory.getValueByKey(TIMER_AUTO_START, true).array;
    array.push(task);
    storageFactory.updateValueByKey(TIMER_AUTO_START, {
      array: array
    });
  };
  this.showAllAutoTimedTask = function () {
    var array = storageFactory.getValueByKey(TIMER_AUTO_START, true).array;
    if (array && array.length > 0) {
      array.forEach(function (task) {
        _logUtils.logInfo(['定时任务 mId: {} sourcePath: {} 目标执行时间: {} 剩余时间: {}秒', task.mId, task.mScriptPath, formatDate(new Date(task.mMillis), 'yyyy-MM-dd HH:mm:ss'), ((task.mMillis - new Date().getTime()) / 1000.0).toFixed(0)]);
      });
    } else {
      _logUtils.logInfo('当前没有自动设置的定时任务');
    }
  };
  this.cancelAllTimedTasks = function (forceMain) {
    var array = storageFactory.getValueByKey(TIMER_AUTO_START, true).array || [];
    if (array && array.length > 0) {
      _logUtils.debugInfo(['当前已注册的定时任务：{}', JSON.stringify(array)]);
      var allTimedTasks = (Timers.queryTimedTasks() || []).reduce(function (a, b) {
        a[b.id] = b;
        return a;
      }, {});
      var mainScriptJs = this.getRunningScriptSource(forceMain);
      _logUtils.debugInfo(['当前执行脚本: {}', mainScriptJs]);
      array = array.filter(function (task) {
        if (task.mScriptPath === mainScriptJs) {
          _logUtils.debugInfo('撤销自动任务：' + JSON.stringify(task));
          if (task.mId) {
            Timers.removeTimedTask(task.mId);
          }
          return false;
        }
        return !!allTimedTasks[task.mId];
      });
    }
    // 将task队列置为剩余的
    storageFactory.updateValueByKey(TIMER_AUTO_START, {
      array: array
    });
  };

  /**
   * 杀死当前APP 仅适用于MIUI10+ 全面屏手势操作
   */
  this.killCurrentApp = function () {
    if (_config.killAppWithGesture) {
      recents();
      sleep(1000);
      gesture(320, [240, 1000], [800, 1000]);
    }
  };
  this.waitFor = function (action, timeout) {
    var countDown = new java.util.concurrent.CountDownLatch(1);
    var actionSuccess = false;
    var actionThread = null;
    var that = this;
    try {
      var start = new Date().getTime();
      actionThread = threads.start(function () {
        try {
          action();
          actionSuccess = true;
        } catch (e) {
          if (e.javaException instanceof com.stardust.autojs.runtime.exception.ScriptInterruptedException) {
            return;
          }
          _logUtils.warnInfo('action执行异常' + e);
          that.printExceptionStack(e);
        } finally {
          countDown.countDown();
        }
        _logUtils.debugInfo(['action执行结束: {} 耗时：{}ms', actionSuccess, new Date().getTime() - start]);
      });
      var waitResult = countDown["await"](timeout, java.util.concurrent.TimeUnit.MILLISECONDS);
      _logUtils.debugForDev(['waitFor方法执行完毕，action result: {}, wait result: {} cost time: {}ms', actionSuccess, waitResult, new Date().getTime() - start]);
      if (!waitResult) {
        _logUtils.warnInfo(['等待操作超时, 操作时间: {}ms', new Date().getTime() - start]);
      }
    } catch (e) {
      this.printExceptionStack(e);
    } finally {
      if (actionThread !== null) {
        actionThread.interrupt();
      }
    }
    return actionSuccess;
  };
  this.createQueue = function (size) {
    var queue = [];
    for (var i = 0; i < size; i++) {
      queue.push(i);
    }
    return queue;
  };
  this.getQueueDistinctSize = function (queue) {
    return queue.reduce(function (a, b) {
      if (a.indexOf(b) < 0) {
        a.push(b);
      }
      return a;
    }, []).length;
  };
  this.pushQueue = function (queue, size, val) {
    if (queue.length >= size) {
      queue.shift();
    }
    queue.push(val);
  };

  /**
  * eg. params '参数名：{} 参数内容：{}', name, value
  *     result '参数名：name 参数内容：value'
  * 格式化字符串，定位符{}
  */
  this.formatString = function () {
    var originContent = [];
    for (var arg in arguments) {
      originContent.push(arguments[arg]);
    }
    if (originContent.length === 1) {
      return originContent[0];
    }
    var marker = originContent[0];
    var args = originContent.slice(1);
    var regex = /(\{\})/g;
    var matchResult = marker.match(regex);
    if (matchResult && args && matchResult.length > 0 && matchResult.length === args.length) {
      args.forEach(function (item, idx) {
        marker = marker.replace('{}', item);
      });
      return marker;
    } else {
      console.error('参数数量不匹配' + arguments);
      return arguments;
    }
  };

  /**
   * 设置当前脚本即将运行，防止被定时运行的打断
   */
  this.setReady = function (seconds) {
    var targetMillis = new Date().getTime() + (seconds + 5) * 1000;
    storageFactory.updateValueByKey(READY, {
      engineId: ENGINE_ID,
      timeout: targetMillis
    });
    _logUtils.debugInfo(['设置当前脚本即将运行，id: {}, targetMillis: {}', ENGINE_ID, targetMillis]);
  };

  /**
   * 校验是否有同脚本运行中，如果有则等待一定时间避免抢占前台
   */
  this.checkAnyReadyAndSleep = function () {
    var readyInfo = storageFactory.getValueByKey(READY, true);
    if (readyInfo.engineId > 0) {
      var readyEnginId = readyInfo.engineId;
      var leftMillis = readyInfo.timeout - new Date().getTime();
      if (leftMillis <= 0) {
        // 可能是上一次执行的ready数据，直接跳过等待
        return;
      }
      if (engines.all().find(function (engine) {
        return engine.id === readyEnginId;
      })) {
        _logUtils.warnInfo(['有脚本:[{}]即将运行, 中断执行', readyEnginId]);
        exit();
      }
    }
  };

  /**
   * 悬浮窗延迟一段时间 该方法不能滥用 部分流程涉及重新获取截图权限等 谨慎使用
   * 
   * @param {number} minutes 延迟的分钟数 支持小数
   * @param {string|null} text    显示具体原因
   * @param {boolean} removeRunningTask 是否移除运行队列
   * @param {boolean} stopByMessage 是否在接收到指定消息后停止倒计时
   * @returns 
   */
  this.commonDelay = function (minutes, text, removeRunningTask, stopByMessage) {
    _logUtils.debugInfo('倒计时' + minutes);
    // 主动移除运行中任务
    removeRunningTask && _runningQueueDispatcher.removeRunningTask();
    if (typeof text === 'undefined' || text === '') {
      text = '距离下次运行还有[';
    }
    minutes = (0, _typeof2["default"])(minutes) != null ? minutes : 0;
    if (minutes === 0) {
      return;
    }
    var startTime = new Date().getTime();
    var timestampGap = minutes * 60000;
    if (stopByMessage) {
      _logUtils.debugInfo('监听能量雨脚本执行完毕的通知', true);
      processShare.subscribe(function (str) {
        _logUtils.debugInfo(['收到消息，停止延迟: {}', str]);
        startTime = new Date().getTime() - timestampGap + 10000;
      }, timestampGap / 1000);
    } else if (minutes > 5 && _config.release_screen_capture_when_waiting) {
      // 五分钟以上的 释放截图权限 降低CPU占用率
      try {
        runtime.images.releaseScreenCapturer();
        _config._releasedScreenCapturer = true;
        _config.has_screen_capture_permission = false;
      } catch (e) {
        _logUtils.errorInfo('主动释放截图权限异常' + e);
      }
    }
    var i = 0;
    var delayLogStampPoint = -1;
    var delayLogGap = 0;
    var showSeconds = false;
    var setReady = false;
    for (;;) {
      var now = new Date().getTime();
      if (now - startTime > timestampGap) {
        break;
      }
      i = (now - startTime) / 60000;
      var left = minutes - i;
      if (!showSeconds) {
        delayLogGap = i - delayLogStampPoint;
        // 半分钟打印一次日志
        if (delayLogGap >= 0.5) {
          delayLogStampPoint = i;
          var content = this.formatString('{}{}]分', text, left.toFixed(2));
          this.showTextFloaty(content);
          _logUtils.debugInfo(content);
        }
        // 剩余一分钟时显示为秒
        if (showSeconds === false && left <= 1) {
          this.listenDelayStart();
          showSeconds = true;
        }
        sleep(500);
      } else {
        var leftSeconds = parseInt(left * 60);
        if (!setReady && leftSeconds < 10) {
          // 即将运行前十秒 设置标记 避免当前脚本被杀
          this.setReady(left * 60);
          setReady = true;
        }
        var _content = this.formatString('{}{}]秒', text, leftSeconds);
        this.showTextFloaty(_content);
        sleep(1000);
      }
    }
    // 倒计时结束 重新加入任务
    removeRunningTask && _runningQueueDispatcher.addRunningTask();
  };

  /**
   * 将当日运行时数据导出
   */
  this.exportRuntimeStorage = function () {
    var runtimeStorageInfo = {
      storageName: RUNTIME_STORAGE,
      storeList: []
    };
    var runtimeStorages = storages.create(RUNTIME_STORAGE);
    this.keyList.forEach(function (key) {
      var storageStr = runtimeStorages.get(key);
      _logUtils.debugInfo(['导出运行数据 key「{}」value 「{}」', key, storageStr]);
      runtimeStorageInfo.storeList.push({
        key: key,
        storageStr: storageStr
      });
    });
    _logUtils.infoLog('运行时数据导出成功', true);
    return JSON.stringify(runtimeStorageInfo);
  };

  /**
   * 导入并覆盖当日运行时数据
   */
  this.importRuntimeStorage = function (str) {
    var runtimeStorageInfo = JSON.parse(str);
    if (runtimeStorageInfo && runtimeStorageInfo.storageName && runtimeStorageInfo.storeList && runtimeStorageInfo.storeList.length > 0) {
      var runtimeStorages = storages.create(runtimeStorageInfo.storageName);
      runtimeStorageInfo.storeList.forEach(function (r) {
        _logUtils.debugInfo(['导入运行数据 key「{}」value 「{}」', r.key, r.storageStr]);
        runtimeStorages.put(r.key, r.storageStr);
      });
      _logUtils.infoLog('运行时数据导入成功', true);
      return true;
    }
    return false;
  };
  this.printExceptionStack = function (e) {
    if (e) {
      _logUtils.errorInfo(['fileName:{} line:{} typeof e:{}', e.fileName, e.lineNumber, (0, _typeof2["default"])(e)]);
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
        var errorStr = scriptTrace.toString();
        _logUtils.errorInfo(errorStr);
        return errorStr;
      } else {
        var funcs = Object.getOwnPropertyNames(e);
        for (var idx in funcs) {
          var func_name = funcs[idx];
          console.verbose(func_name);
        }
      }
    }
  };
  this.getDistanceAndGravity = function (time) {
    time = time || 1000;
    var disposable = threads.disposable();
    sensors.ignoresUnsupportedSensor = true;
    var count = 0;
    var start = new Date().getTime();
    var ax = 0,
      ay = 0,
      az = 0;
    //监听数据
    sensors.register('gravity', sensors.delay.fastest).on('change', function (event, gx, gy, gz) {
      count++;
      _logUtils.debugForDev(util.format("[%d]重力加速度: %d, %d, %d", count, gx, gy, gz));
      ax += Math.abs(gx);
      ay += Math.abs(gy);
      az += Math.abs(gz);
      if (new Date().getTime() - start > time) {
        _logUtils.debugInfo(util.format('总数：%d [%d, %d, %d]', count, ax, ay, az));
        disposable.setAndNotify({
          ax: ax / count,
          ay: ay / count,
          az: az / count
        });
      }
    });
    var distanceCount = 0;
    var totalDistance = 0;
    sensors.register("proximity", sensors.delay.fastest).on("change", function (event, d) {
      _logUtils.debugForDev(util.format("当前距离: %d", d));
      totalDistance += d;
      distanceCount++;
    });
    var result = disposable.blockedGet();
    var averageDistance = totalDistance / distanceCount;
    _logUtils.debugInfo(util.format('距离总数: %d, 总距离: %d', distanceCount, totalDistance));
    _logUtils.debugInfo(util.format('平均重力加速度：%d %d %d 平均距离：%d', result.ax, result.ay, result.az, averageDistance));
    sensors.unregisterAll();
    return {
      x: result.ax,
      y: result.ay,
      z: result.az,
      distance: averageDistance
    };
  };
  this.requestScreenCaptureOrRestart = function (doNotRestart) {
    if (_config.has_screen_capture_permission) {
      return true;
    }
    // 请求截图权限
    var screenPermission = false;
    var actionSuccess = _config.request_capture_permission;
    if (_config.request_capture_permission && this.ensureAccessibilityEnabled()) {
      // 存在循环依赖，待解决
      screenPermission = __webpack_require__(/*! @/lib/prototype/RequestScreenCapture */ "./src/lib/prototype/RequestScreenCapture.js")();
    } else {
      actionSuccess = this.waitFor(function () {
        screenPermission = requestScreenCapture(false);
      }, 15000);
    }
    if (!actionSuccess || !screenPermission) {
      if (doNotRestart) {
        _logUtils.errorInfo('请求截图失败，结束运行');
        return false;
      }
      _logUtils.errorInfo('请求截图失败, 设置6秒后重启');
      this.disableAccessibilityAndRestart(true);
      _runningQueueDispatcher.removeRunningTask();
      sleep(6000);
      _config.resetBrightness && _config.resetBrightness();
      _runningQueueDispatcher.executeTargetScript(this.getRunningScriptSource());
      exit();
    } else {
      _logUtils.logInfo('请求截屏权限成功');
      _config.has_screen_capture_permission = true;
    }
    return screenPermission;
  };
  this.ensureDeviceSizeValid = function () {
    // 根据截图重新获取设备分辨率
    var screen = this.checkCaptureScreenPermission(3);
    if (screen) {
      var width = screen.width;
      var height = screen.height;
      if (width > height) {
        errorInfo(['检测到截图的宽度大于高度，可能截图方法出现了问题，请尝试强制重启AutoJS，否则脚本无法正常运行! w:{} h:{}', width, height], true);
        _runningQueueDispatcher.removeRunningTask();
        _config.resetBrightness && _config.resetBrightness();
        // 设置五分钟后再次尝试，一般是因为横屏状态下导致的
        this.setUpAutoStart(5, true);
        exit();
      }
      if (width !== _config.device_width || height !== _config.device_height) {
        _config.device_height = height;
        _config.device_width = width;
        warnInfo(['设备分辨率设置不正确，宽高已修正为：[{}, {}]', width, height]);
        var configStorage = storages.create(_storage_name);
        configStorage.put('device_height', height);
        configStorage.put('device_width', width);
      }
    }
  };
  this.delayStartIfInSkipPackage = function (notLingering) {
    var currentRunningPackage = currentPackage();
    _logUtils.logInfo('当前包名：' + currentRunningPackage);
    if (this.inSkipList(currentRunningPackage)) {
      _logUtils.warnInfo('当前包名在应用白名单中，延迟5分钟执行', true);
      // 保存当前白名单跳过的次数，如果无视包名则直接传入常量
      this.saveSkipedPackageInfo(_config.warn_skipped_ignore_package ? 'SKIP_IF_WHITE_PACKAGE' : currentRunningPackage);
      if (!this.askIfStartWhenSkipedTooMuch()) {
        this.setUpAutoStart(5);
        if (notLingering || _config.not_lingering_float_window) {
          _config.forceStop = true;
          exit();
        } else {
          this.commonDelay(5, '白名单中延迟[', true);
          // 倒计时结束后重新判断 是否在白名单中
          this.delayStartIfInSkipPackage();
        }
        return true;
      } else {
        return false;
      }
    } else {
      // 用于清空统计
      this.saveSkipedPackageInfo('');
    }
    return this.delayStartIfInPayCode();
  };

  /**
   * 展示支付码时延迟执行
   */
  this.delayStartIfInPayCode = function () {
    if (!this._widgetUtils) {
      this._widgetUtils = __webpack_require__(/*! @/lib/prototype/WidgetUtils */ "./src/lib/prototype/WidgetUtils.js");
    }
    var regexContent = _config.delay_start_pay_code_content || '向商家付(钱|款)';
    var paycodeContent = this._widgetUtils.widgetGetOne(regexContent, 1000, true, true);
    // 避免在日志界面中打印了正则表达式被当成了识别文本
    if (paycodeContent && paycodeContent.content.indexOf(regexContent) < 0) {
      _logUtils.warnInfo(['当前在支付码界面，延迟5分钟后执行: {}', paycodeContent.content], true);
      this.setUpAutoStart(5);
      if (_config.not_lingering_float_window) {
        _config.forceStop = true;
        exit();
      } else {
        this.commonDelay(5, '支付码中延迟[', true);
        // 倒计时结束后重新判断 是否在白名单中
        this.delayStartIfInSkipPackage();
      }
      return true;
    } else {
      return false;
    }
  };
  this.myCurrentPackage = function () {
    return currentPackage();
  };
  this.inLimitTimeRange = function () {
    return false;
  };

  /**
   * 减少控制台日志数量，避免内存泄露，仅免费版有用
   */
  this.reduceConsoleLogs = function () {
    if (!_config.is_pro) {
      var consoleImpl = org.autojs.autojs.autojs.AutoJs.getInstance().getGlobalConsole();
      var logList = consoleImpl.getAllLogs();
      _logUtils.debugInfo(['当前日志列表长度： {}', logList.size()]);
      var maximumSize = _config.console_log_maximum_size || 1500;
      if (logList.size() > maximumSize) {
        try {
          var size = logList.size();
          var tempList = new java.util.ArrayList(logList).subList(size - maximumSize, size);
          consoleImpl.clear();
          logList.addAll(tempList);
        } catch (e) {
          // 可能存在多线程异常，没法持有锁没办法处理，直接吃掉异常。
        }
      }
    }
  };
  this.delayIfBatteryLow = function () {
    var battery = device.getBattery();
    if (!device.isCharging() && battery < _config.battery_keep_threshold) {
      _logUtils.debugInfo(['当前电量低，延迟一小时后启动，电量值：{} 启动阈值>={}', battery, _config.battery_keep_threshold]);
      this.setUpAutoStart(60);
      _config.forceStop = true;
      exit();
    }
  };

  /**
   * 将灰度化或者二值化之后的单通道的图片转换为四通道 便于多点找色或者找图，避免报错
   * 
   * @param {ImageWrapper} singleChannelImage
   * @returns ImageWrapper
   */
  this.convertImageFromSingleChannel = function (singleChannelImage) {
    // return images.cvtColor(singleChannelImage, 'GRAY2BGRA')
    var img = com.stardust.autojs.core.image.ImageWrapper.ofBitmap(singleChannelImage.getBitmap());
    if (typeof resourceMonitor === 'undefined') {
      // 避免循环引用对象
      __webpack_require__(/*! @/lib/ResourceMonitor.js */ "./src/lib/ResourceMonitor.js")(runtime, _global_this_).addImageToList(img);
    } else {
      resourceMonitor.addImageToList(img);
    }
    return img;
  };
  this.getRunningScriptSource = function (forceMain) {
    return _config._auto_start_with_main_js || forceMain ? FileUtils.getRealMainScriptPath() : engines.myEngine().getSource() + '';
  };
  this.markExtendSuccess = function () {
    this.updateRuntimeStorage(EXTEND_FAILED_COUNT, {
      count: 0
    });
  };
  this.increaseExtendFailedCount = function () {
    var failedCount = this.getTodaysRuntimeStorage(EXTEND_FAILED_COUNT).count;
    failedCount += 1;
    this.updateRuntimeStorage(EXTEND_FAILED_COUNT, {
      count: failedCount
    });
    _logUtils.debugInfo(['接口扩展失败，当前失败次数：{}', failedCount]);
    return failedCount;
  };
  this.createInterfaceOrJavaAdapter = function (clazzOrInterface, extend) {
    try {
      // 适配旧版免费版 因为JavaAdapter在原版中有bug
      return new clazzOrInterface(extend);
    } catch (e) {
      _logUtils.warnInfo(['通过接口或类直接扩展[{}]失败，尝试JavaAdapter： {}', clazzOrInterface + '', e]);
      var failedCount = this.increaseExtendFailedCount();
      if (failedCount >= 3) {
        this.forceKillAutoJS('java类加载失败多次');
      } else {
        this.setUpAutoStart(0.5);
      }
      try {
        return new JavaAdapter(clazzOrInterface, extend);
      } catch (e2) {
        _logUtils.errorInfo(['通过JavaAdapter扩展[{}]依旧失败 直接重启AutoJS：{}', clazzOrInterface + '', e2], true);
        console.error('加载失败，强制关闭AutoJS', e2);
        this.forceKillAutoJS('java类加载失败');
      }
    }
  };
  this.forceKillAutoJS = function (message) {
    // 加入任务队列 自启动后重新触发脚本
    _runningQueueDispatcher.addRunningTask();
    console.error(message);
    var limit = 3;
    while (limit > 0) {
      _logUtils.errorInfo(message + '将在' + limit-- + '秒后关闭AutoJS 请授予自启动权限', true);
      sleep(1000);
    }
    _logUtils.flushAllLogs();
    java.lang.System.exit(0);
  };
}
CommonFunctions.prototype.initStorageFactory = function () {};
module.exports = CommonFunctions;

/***/ }),

/***/ "./src/lib/BaseWidgetUtils.js":
/*!************************************!*\
  !*** ./src/lib/BaseWidgetUtils.js ***!
  \************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-05 09:12:00
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-07 21:23:38
 * @Description: 
 */

var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  _config = _require.config;
var _require2 = __webpack_require__(/*! @/lib/prototype/LogUtils */ "./src/lib/prototype/LogUtils.js"),
  debugInfo = _require2.debugInfo,
  debugForDev = _require2.debugForDev,
  logInfo = _require2.logInfo,
  infoLog = _require2.infoLog,
  warnInfo = _require2.warnInfo,
  errorInfo = _require2.errorInfo;
var FileUtils = __webpack_require__(/*! @/lib/prototype/FileUtils */ "./src/lib/prototype/FileUtils.js");
var workpath = FileUtils.getCurrentWorkPath();
runtime.loadDex(workpath + '/dex/autojs-common.dex');
var algorithm_change_support = false;
try {
  importClass(com.tony.autojs.search.AlgorithmChanger);
  algorithm_change_support = true;
} catch (e) {
  console.error('载入dex异常 当前不支持替换算法');
}
var BaseWidgetUtils = function BaseWidgetUtils() {
  var _this = this;
  /**
   * 切换控件获取的模式，正常模式基本能获取到当前最新的数据 快速模式会直接获取已缓存的控件信息，但是控件内容并不一定是最新的，目前来说没啥用
   * @param {number} newMode 0或1 正常模式或快速模式
   */
  this.changeMode = function (newMode) {
    try {
      var clz = runtime.accessibilityBridge.getClass();
      clz = clz.getSuperclass();
      var field = clz.getDeclaredField('mMode');
      field.setAccessible(true);
      var mode = parseInt(field.get(runtime.accessibilityBridge));
      debugInfo(['current mode: {}', mode === 0 ? 'NORMAL' : 'FAST']);
      runtime.accessibilityBridge.setMode(newMode);
      mode = parseInt(field.get(runtime.accessibilityBridge));
      debugInfo(['mode after set: {}', mode === 0 ? 'NORMAL' : 'FAST']);
    } catch (e) {
      console.error('执行异常' + e);
    }
  };
  this.enableFastMode = function () {
    this.changeMode(1);
  };
  this.enableNormalMode = function () {
    this.changeMode(0);
  };

  /**
   * 替换控件搜索算法DFS,BFS,VDFS,VBFS,PDFS,PBFS,PVDFS,PVBFS
   * DFS,BFS为默认提供的深度优先和广度优先搜索算法
   * VDFS,VBFS为我修改的只搜索可见控件（控件包括父级不可见则直接跳过）深度优先和广度优先搜索算法 缺点是无法搜索不可见控件，适合一个界面中有巨量控件的时候用于加快搜索速度 实际数据抖音极速版从25s缩短到3s
   * PDFS,PBFS,PVDFS,PVBFS 是通过多线程搜索控件 大大加快搜索速度
   * 
   * @param {string} algorithm 搜索算法DFS,BFS,VDFS,VBFS,PDFS,PBFS,PVDFS,PVBFS
   * @param {UiSelector} mselector
   * @returns 
   */
  this.wrapSelector = function (algorithm, appendFilter, mselector) {
    appendFilter = appendFilter || function (matcher) {
      return matcher;
    };
    mselector = appendFilter(mselector || selector());
    if (!algorithm) {
      return mselector;
    }
    if (!algorithm_change_support) {
      warnInfo(['当前版本不支持替换搜索算法']);
      return mselector;
    }
    current = this.getCurrentAlgorithm();
    if (current == algorithm) {
      return mselector;
    }
    debugInfo(['替换搜索算法为：{} 原始算法：{}', algorithm, current]);
    return AlgorithmChanger.changeAlgorithm(mselector, algorithm);
  };

  /**
   * 获取当前搜索算法
   * 
   * @param {UiSelector} mselector 
   * @returns 
   */
  this.getCurrentAlgorithm = function (mselector) {
    if (!algorithm_change_support) {
      warnInfo(['当前版本不支持查询搜索算法']);
      return '';
    }
    mselector = mselector || selector();
    var className = AlgorithmChanger.getCurrentAlgorithm(mselector);
    return className.substring(className.lastIndexOf('.') + 1);
  };

  /**
   * 判断控件A或者控件B是否存在；超时返回0 找到A返回1 否则返回2
   * 
   * @param {string|regex} contentA 控件A的内容
   * @param {string|regex} contentB 控件B的内容
   * @param {number} timeout 超时时间
   * @param {boolean} containContent 是否传递实际内容
   * @param {function} appendFilter 附加查询条件 详见UiSelector
   * @param {object} options 额外参数
   * @return 超时返回0 找到A返回1 否则返回2
   */
  this.alternativeWidget = function (contentA, contentB, timeout, containContent, appendFilter, options) {
    options = options || {};
    timeout = timeout || _config.timeout_existing;
    var timeoutFlag = true;
    var countDown = new java.util.concurrent.CountDownLatch(1);
    var matchRegexA = new RegExp(contentA);
    var matchRegexB = new RegExp(contentB);
    var isDesc = false,
      findA = false;
    var res = null,
      target = null;
    var descThreadA = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).descMatches(matchRegexA).findOne();
      res = target.desc();
      debugInfo('find desc ' + contentA + " " + res);
      timeoutFlag = false;
      isDesc = true;
      findA = true;
      countDown.countDown();
    });
    var textThreadA = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).textMatches(matchRegexA).findOne();
      res = target.text();
      debugInfo('find text ' + contentA + "  " + res);
      timeoutFlag = false;
      findA = true;
      countDown.countDown();
    });
    var descThreadB = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).descMatches(matchRegexB).findOne();
      res = target.desc();
      debugInfo('find desc ' + contentB + " " + res);
      timeoutFlag = false;
      isDesc = true;
      countDown.countDown();
    });
    var textThreadB = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).textMatches(matchRegexB).findOne();
      res = target.text();
      debugInfo('find text ' + contentB + "  " + res);
      timeoutFlag = false;
      countDown.countDown();
    });
    var timeoutThread = threads.start(function () {
      sleep(timeout);
      countDown.countDown();
    });
    countDown["await"]();
    descThreadA.interrupt();
    textThreadA.interrupt();
    descThreadB.interrupt();
    textThreadB.interrupt();
    timeoutThread.interrupt();
    if (timeoutFlag) {
      debugInfo(['cannot find any matches {} or {}', contentA, contentB]);
    }
    // 超时返回0 找到A返回1 否则返回2
    var returnVal = timeoutFlag ? 0 : findA ? 1 : 2;
    if (containContent) {
      return {
        target: target,
        bounds: target ? target.bounds() : null,
        content: res,
        value: returnVal
      };
    } else {
      return returnVal;
    }
  };

  /**
   * 校验控件是否存在，并打印相应日志
   * @param {String} contentVal 控件文本
   * @param {String} position 日志内容 当前所在位置是否成功进入
   * @param {Number} timeoutSetting 超时时间 单位毫秒 默认为_config.timeout_existing
   */
  this.widgetWaiting = function (contentVal, position, timeoutSetting, appendFilter, options) {
    options = options || {};
    var waitingSuccess = this.widgetCheck(contentVal, timeoutSetting, false, appendFilter, options);
    position = position || contentVal;
    if (waitingSuccess) {
      debugInfo('等待控件成功：' + position);
      return true;
    } else {
      errorInfo('等待控件[' + position + ']失败, 查找内容：' + contentVal);
      return false;
    }
  };
  this.widgetChecking = function (contentVal, options) {
    options = options || {};
    return this.widgetCheck(contentVal, options.timeoutSetting, options.containType, options.appendFilter, options);
  };

  /**
   * 校验控件是否存在
   * @param {String} contentVal 控件文本
   * @param {Number} timeoutSetting 超时时间 单位毫秒 不设置则为_config.timeout_existing
   * @param {Boolean} containType 返回结果附带文本是desc还是text
   * @param {Object} options 额外参数
   * 超时返回false
   */
  this.widgetCheck = function (contentVal, timeoutSetting, containType, appendFilter, options) {
    options = options || {};
    var timeout = timeoutSetting || _config.timeout_existing;
    var timeoutFlag = true;
    var countDown = new java.util.concurrent.CountDownLatch(1);
    var matchRegex = new RegExp(contentVal);
    var isDesc = false;
    var target = null;
    var descThread = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).descMatches(matchRegex).findOne();
      var res = target.desc();
      debugInfo('find desc ' + contentVal + " " + res);
      timeoutFlag = false;
      isDesc = true;
      countDown.countDown();
    });
    var textThread = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).textMatches(matchRegex).findOne();
      var res = target.text();
      debugInfo('find text ' + contentVal + "  " + res);
      timeoutFlag = false;
      countDown.countDown();
    });
    var timeoutThread = threads.start(function () {
      sleep(timeout);
      countDown.countDown();
    });
    countDown["await"]();
    descThread.interrupt();
    textThread.interrupt();
    timeoutThread.interrupt();
    if (timeoutFlag) {
      debugInfo('cannot find any matches ' + contentVal + ' timeout:' + timeout);
    }
    if (containType) {
      return {
        timeout: timeoutFlag,
        target: target,
        bounds: target ? target.bounds() : null,
        isDesc: isDesc
      };
    }
    return !timeoutFlag;
  };

  /**
   * id检测
   * @param {string|RegExp} idRegex 
   * @param {number} timeoutSetting 
   */
  this.idCheck = function (idRegex, timeoutSetting, containType, appendFilter, options) {
    options = options || {};
    var timeout = timeoutSetting || _config.timeout_existing;
    var timeoutFlag = true;
    var countDown = new java.util.concurrent.CountDownLatch(1);
    var target = null;
    debugInfo(['查找目标id:{} timeout: {}', idRegex, timeout]);
    var idCheckThread = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).idMatches(idRegex).findOne();
      debugInfo('find id ' + idRegex);
      timeoutFlag = false;
      countDown.countDown();
    });
    var timeoutThread = threads.start(function () {
      sleep(timeout);
      countDown.countDown();
    });
    countDown["await"]();
    idCheckThread.interrupt();
    timeoutThread.interrupt();
    if (timeoutFlag) {
      warnInfo(['未能找到id:{}对应的控件', idRegex]);
    }
    if (containType) {
      return {
        timeout: timeoutFlag,
        target: target,
        bounds: target ? target.bounds() : null
      };
    }
    return !timeoutFlag;
  };

  /**
   * 校验控件是否存在，并打印相应日志
   * @param {String} idRegex 控件文本
   * @param {String} position 日志内容 当前所在位置是否成功进入
   * @param {Number} timeoutSetting 超时时间 默认为_config.timeout_existing
   */
  this.idWaiting = function (idRegex, position, timeoutSetting, appendFilter, options) {
    options = options || {};
    var waitingSuccess = this.idCheck(idRegex, timeoutSetting, false, appendFilter, options);
    position = position || idRegex;
    if (waitingSuccess) {
      debugInfo('等待控件成功：' + position);
      return true;
    } else {
      errorInfo('等待控件[' + position + ']失败， id：' + idRegex);
      return false;
    }
  };

  /**
   * 根据id获取控件信息
   * @param {String|RegExp} idRegex id
   * @param {number} timeout 超时时间
   * @return 返回找到的控件，否则null
   */
  this.widgetGetById = function (idRegex, timeout, appendFilter, options) {
    options = options || {};
    timeout = timeout || _config.timeout_findOne;
    var target = this.idCheck(idRegex, timeout, true, appendFilter, options);
    if (!target.timeout) {
      return target.target;
    } else {
      return null;
    }
  };

  /**
   * 根据内容获取一个对象
   * 
   * @param {string} contentVal 
   * @param {number} timeout 
   * @param {boolean} containType 是否带回类型
   * @param {boolean} suspendWarning 是否隐藏warning信息
   * @param {function} appendFilter 附加查询条件 详见UiSelector
   */
  this.widgetGetOne = function (contentVal, timeout, containType, suspendWarning, appendFilter, options) {
    var target = null;
    var isDesc = false;
    var waitTime = timeout || _config.timeout_existing;
    var timeoutFlag = true;
    debugInfo(['try to find one: {} timeout: {}ms', contentVal.toString(), waitTime]);
    var checkResult = this.widgetCheck(contentVal, waitTime, true, appendFilter, options);
    if (!checkResult.timeout) {
      timeoutFlag = false;
      target = checkResult.target;
      isDesc = checkResult.isDesc;
    }
    // 当需要带回类型时返回对象 传递target以及是否是desc
    if (target && containType) {
      var result = {
        target: target,
        bounds: target.bounds(),
        isDesc: isDesc,
        content: isDesc ? target.desc() : target.text()
      };
      return result;
    }
    if (timeoutFlag) {
      if (suspendWarning) {
        debugInfo('timeout for finding ' + contentVal);
      } else {
        warnInfo('timeout for finding ' + contentVal);
      }
    }
    return target;
  };

  /**
   * 根据内容获取所有对象的列表
   * 
   * @param {string} contentVal 
   * @param {number} timeout 
   * @param {boolean} containType 是否传递类型
   * @param {function} appendFilter 附加查询条件 详见UiSelector
   */
  this.widgetGetAll = function (contentVal, timeout, containType, appendFilter, options) {
    options = options || {};
    var target = null;
    var isDesc = false;
    var timeoutFlag = true;
    var waitTime = timeout || _config.timeout_existing;
    debugInfo(['try to find all: {} timeout: {}ms', contentVal.toString(), waitTime]);
    var countDown = new java.util.concurrent.CountDownLatch(1);
    var matchRegex = new RegExp(contentVal);
    var descThread = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).descMatches(matchRegex).untilFind();
      debugInfo('find all desc ' + contentVal + " length " + target.length);
      timeoutFlag = false;
      isDesc = true;
      countDown.countDown();
    });
    var textThread = threads.start(function () {
      target = _this.wrapSelector(options.algorithm, appendFilter).textMatches(matchRegex).untilFind();
      debugInfo('find all text ' + contentVal + " length " + target.length);
      timeoutFlag = false;
      countDown.countDown();
    });
    var timeoutThread = threads.start(function () {
      sleep(waitTime);
      countDown.countDown();
    });
    countDown["await"]();
    descThread.interrupt();
    textThread.interrupt();
    timeoutThread.interrupt();
    if (timeoutFlag && !target) {
      return null;
    } else if (target && containType) {
      var result = {
        target: target,
        isDesc: isDesc
      };
      return result;
    }
    return target;
  };

  /**
   * 查找一个子控件中的目标对象
   * @param {UiObject} container 父控件
   * @param {String} contentVal 控件文本
   * @param {number} timeout 超时时间
   * @param {Boolean} containType 返回结果附带文本是desc还是text
   * @param {function} appendFilter 附加查询条件 详见UiSelector
   * @param {Object} options 额外参数
   * 超时返回false
   */
  this.subWidgetGetOne = function (container, contentVal, timeout, containType, appendFilter, options) {
    options = options || {};
    timeout = timeout || _config.timeout_findOne;
    var countDown = new java.util.concurrent.CountDownLatch(1);
    var matchRegex = new RegExp(contentVal);
    var isDesc = false;
    var isText = false;
    var target = null;
    var descThread = threads.start(function () {
      var descTarget = _this.wrapSelector(options.algorithm, appendFilter).descMatches(matchRegex).findOneOf(container);
      if (descTarget) {
        debugInfo(['find desc {} {}', contentVal, descTarget.desc()]);
        isDesc = true;
        target = descTarget;
        countDown.countDown();
      }
    });
    var textThread = threads.start(function () {
      var textTarget = _this.wrapSelector(options.algorithm, appendFilter).textMatches(matchRegex).findOneOf(container);
      if (textTarget) {
        debugInfo(['find text {} {}', contentVal, textTarget.text()]);
        isText = true;
        target = textTarget;
        countDown.countDown();
      }
    });
    var isTimeout = false;
    var timeoutThread = threads.start(function () {
      sleep(timeout);
      isTimeout = true;
      countDown.countDown();
    });
    countDown["await"]();
    descThread.interrupt();
    textThread.interrupt();
    timeoutThread.interrupt();
    if (isTimeout || !isDesc && !isText) {
      debugInfo('cannot find any matches ' + contentVal);
    }
    if (target && containType) {
      return {
        isDesc: isDesc,
        target: target,
        bounds: target.bounds(),
        content: isDesc ? target.desc() : target.text()
      };
    }
    return target;
  };

  /**
   * 查找子控件中所有匹配的目标对象
   * @param {UiObject} container 父控件
   * @param {String} contentVal 控件文本
   * @param {number} timeout 超时时间
   * @param {Boolean} containType 返回结果附带文本是desc还是text
   * @param {function} appendFilter 附加查询条件 详见UiSelector
   * @param {Object} options 额外参数
   * 超时返回false
   */
  this.subWidgetGetAll = function (container, contentVal, timeout, containType, appendFilter, options) {
    var exists = this.subWidgetGetOne(container, contentVal, timeout, containType, appendFilter, options);
    if (exists) {
      var matchRegex = new RegExp(contentVal);
      var resultList = [];
      if (exists.isDesc) {
        resultList = this.wrapSelector(options.algorithm, appendFilter).descMatches(matchRegex).findOf(container);
      } else {
        resultList = this.wrapSelector(options.algorithm, appendFilter).textMatches(matchRegex).findOf(container);
      }
      if (containType) {
        return {
          target: resultList,
          isDesc: exists.isDesc
        };
      } else {
        return resultList;
      }
    } else {
      return [];
    }
  };
};
module.exports = BaseWidgetUtils;

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

/***/ "./src/lib/ProjectCommonFunctions.js":
/*!*******************************************!*\
  !*** ./src/lib/ProjectCommonFunctions.js ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * 每个项目里面新增或者修改的方法集合
 */

var storageFactory = __webpack_require__(/*! @/lib/prototype/StorageFactory */ "./src/lib/prototype/StorageFactory.js");
var BaseCommonFunction = __webpack_require__(/*! @/lib/BaseCommonFunctions.js */ "./src/lib/BaseCommonFunctions.js");

/**
 * 项目新增的方法写在此处
 */
var ProjectCommonFunction = function ProjectCommonFunction() {
  BaseCommonFunction.call(this);
  this.keyList = [];
};
ProjectCommonFunction.prototype = Object.create(BaseCommonFunction.prototype);
ProjectCommonFunction.prototype.constructor = ProjectCommonFunction;

/**
 * 初始化存储
 */
ProjectCommonFunction.prototype.initStorageFactory = function () {
  // 初始化值
  // storageFactory.initFactoryByKey($key, $defaultVal)
};
module.exports = ProjectCommonFunction;

/***/ }),

/***/ "./src/lib/ProjectWidgetUtils.js":
/*!***************************************!*\
  !*** ./src/lib/ProjectWidgetUtils.js ***!
  \***************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  _config = _require.config,
  _storage_name = _require.storage_name;
var _require2 = __webpack_require__(/*! @/lib/prototype/LogUtils */ "./src/lib/prototype/LogUtils.js"),
  debugInfo = _require2.debugInfo,
  debugForDev = _require2.debugForDev,
  logInfo = _require2.logInfo,
  infoLog = _require2.infoLog,
  warnInfo = _require2.warnInfo,
  errorInfo = _require2.errorInfo;
var _commonFunctions = __webpack_require__(/*! @/lib/prototype/CommonFunction */ "./src/lib/prototype/CommonFunction.js");
var _BaseWidgetUtils = __webpack_require__(/*! @/lib/BaseWidgetUtils.js */ "./src/lib/BaseWidgetUtils.js");
var ProjectWidgetUtils = function ProjectWidgetUtils() {
  _BaseWidgetUtils.call(this);
  // 自定义的控件操作写在此处
};
ProjectWidgetUtils.prototype = Object.create(_BaseWidgetUtils.prototype);
ProjectWidgetUtils.prototype.constructor = ProjectWidgetUtils;
module.exports = ProjectWidgetUtils;

/***/ }),

/***/ "./src/lib/ResourceMonitor.js":
/*!************************************!*\
  !*** ./src/lib/ResourceMonitor.js ***!
  \************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-11 18:28:23
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-07 21:26:29
 * @Description: 图片资源监听并自动回收
 */
importClass(java.util.concurrent.ScheduledThreadPoolExecutor);
importClass(java.util.concurrent.TimeUnit);
var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  config = _require.config;
var _require2 = __webpack_require__(/*! @/lib/prototype/LogUtils */ "./src/lib/prototype/LogUtils.js"),
  debugInfo = _require2.debugInfo,
  debugForDev = _require2.debugForDev,
  infoLog = _require2.infoLog,
  errorInfo = _require2.errorInfo;
var commonFunctions = __webpack_require__(/*! @/lib/prototype/CommonFunction */ "./src/lib/prototype/CommonFunction.js");
function isNullOrUndefined(val) {
  return val === null || typeof val === 'undefined';
}
module.exports = function (__runtime__, scope) {
  if (typeof scope.resourceMonitor === 'undefined' || scope.resourceMonitor === null) {
    var ResourceMonitor = function ResourceMonitor() {
      this.images = [];
      // 需要长时间持有的图片，不会自动动态释放
      this.longHoldImages = [];
      this.writeLock = threads.lock();
      this.init();
    };
    var doRecycleImages = function doRecycleImages(forRecycleList, desc) {
      var start = new Date().getTime();
      var count = 0;
      forRecycleList.forEach(function (imageInfo) {
        try {
          var imgBitmap = imageInfo.img.getBitmap();
          if (imgBitmap && !imgBitmap.isRecycled()) {
            imageInfo.img.recycle();
          } else {
            debugForDev('图片已回收，不再回收');
            count++;
          }
        } catch (e) {
          // console.warn('释放图片异常' + e)
          count++;
        }
      });
      debugInfo(['{}，总数：{}，耗时：{}ms {}', desc, forRecycleList.length, new Date().getTime() - start, count > 0 ? ', 其中有：' + count + '自动释放了' : '']);
      forRecycleList = null;
    };
    var _o_images = scope.images;
    debugInfo(['Is _origin_images null? {}.', isNullOrUndefined(_o_images)]);
    var availMem = device.getAvailMem();
    debugInfo(['当前可用内存：{}b {}MB', availMem, availMem / (1024 * 1024)]);
    var imgSize = config.device_width * config.device_height * 10 / 8 / 1024 / 1024 / 2;
    debugInfo(['预估单张图片大小：{}MB', imgSize]);
    availMem = availMem > imgSize * 100 * 1024 * 1024 ? imgSize * 100 * 1024 * 1024 : availMem;
    var maximumStore = availMem / (imgSize * 1024 * 1024);
    var halfStore = Math.ceil(maximumStore / 2);
    debugInfo(['支持最大图片张数：{} 一半：{}', maximumStore, halfStore]);
    var scheduledExecutor = new ScheduledThreadPoolExecutor(1);
    ResourceMonitor.prototype.releaseAll = function (undelegated) {
      if (this.images !== null) {
        debugInfo('释放图片，总数：' + (this.images.length + this.longHoldImages.length));
        this.writeLock.lock();
        try {
          this.recycleImages(this.images.splice(0), true);
          this.recycleImages(this.longHoldImages.splice(0), true);
          if (undelegated) {
            debugInfo('解除图像资源代理');
            this.images = null;
            scope.images = _o_images;
            scope.__asGlobal__(_o_images, ['captureScreen']);
            _o_images = null;
          }
        } finally {
          this.writeLock.unlock();
        }
      }
    };
    ResourceMonitor.prototype.addLongHoldImage = function (img) {
      this.writeLock.lock();
      try {
        if (this.longHoldImages === null) {
          // this is only happen when engine stoped, just recycle img
          debugInfo('检测到脚本已停止，直接回收图片');
          img.recycle();
          return;
        }
        this.longHoldImages.push({
          img: img,
          millis: new Date().getTime()
        });
        debugForDev('增加图片到长时间持有的监听列表，需要手动recycle，当前总数：' + this.longHoldImages.length);
      } finally {
        this.writeLock.unlock();
      }
    };
    ResourceMonitor.prototype.addImageToList = function (img) {
      debugForDev('准备获取图片资源锁');
      this.writeLock.lock();
      debugForDev('获取图片资源锁成功');
      try {
        if (this.images === null) {
          // this is only happen when engine stoped, just recycle img
          debugInfo('检测到脚本已停止，直接回收图片');
          img.recycle();
          return;
        }
        this.images.push({
          img: img,
          millis: new Date().getTime()
        });
        debugForDev('增加图片到监听列表，当前总数：' + this.images.length);
        // 达到一定阈值后回收
        if (this.images.length > halfStore) {
          if (this.images.length > maximumStore) {
            // 大于100张直接回收一半 基本不会触发 除非卡死循环了
            this.recycleImages(this.images.splice(0, halfStore));
          } else {
            var current = new Date().getTime();
            // 回收超过5秒钟的图片
            var forRecycle = this.images.filter(function (imageInfo) {
              return current - imageInfo.millis > 5000;
            });
            this.recycleImages(forRecycle);
            this.images.splice(0, forRecycle.length);
          }
        }
      } finally {
        this.writeLock.unlock();
      }
    };

    /**
     * 
     * @param {ImageWrapper} img 
     * @param {number} delay 
     */
    ResourceMonitor.prototype.delayRecycle = function (img, delay) {
      delay = delay || 5;
      scheduledExecutor.schedule(new java.lang.Runnable({
        run: function run() {
          debugForDev(['延迟回收图片 延迟时间：{}s', delay]);
          img && img.recycle();
        }
      }), new java.lang.Long(delay), TimeUnit.SECONDS);
    };
    ResourceMonitor.prototype.recycleImages = function (forRecycleList, sync) {
      if (forRecycleList && forRecycleList.length > 0) {
        if (sync) {
          doRecycleImages(forRecycleList, '同步释放所有图片');
        } else {
          threads.start(function () {
            // 不太安全，可能没释放完就挂了 脚本结束时最好执行一下releaseAll
            doRecycleImages(forRecycleList, '异步释放图片');
          });
        }
      }
    };
    ResourceMonitor.prototype.init = function () {
      var that = this;
      var M_Images = function M_Images() {
        _o_images.constructor.call(this);
      };
      M_Images.prototype = Object.create(_o_images.prototype);
      M_Images.prototype.constructor = M_Images;
      M_Images.prototype.captureScreen = function () {
        var start = new Date().getTime();
        debugForDev('准备获取截图');
        var img = _o_images.captureScreen();
        debugForDev(['获取截图完成，耗时{}ms', new Date().getTime() - start]);
        // captureScreen的不需要回收
        // that.addImageToList(img)
        return img;
      };

      /**
       * @param long_hold {boolean} 是否长期持有，不会被自动recycle，需要在代码中手动释放资源
       */
      M_Images.prototype.copy = function (origialImg, long_hold) {
        var newImg = _o_images.copy(origialImg);
        if (!long_hold) {
          that.addImageToList(newImg);
        } else {
          that.addLongHoldImage(newImg);
        }
        return newImg;
      };
      M_Images.prototype.read = function (path) {
        var newImg = _o_images.read(path);
        that.addImageToList(newImg);
        return newImg;
      };
      M_Images.prototype.load = function (path) {
        var newImg = _o_images.load(path);
        that.addImageToList(newImg);
        return newImg;
      };
      M_Images.prototype.clip = function (img, x, y, w, h) {
        var newImg = _o_images.clip(img, x, y, w, h);
        that.addImageToList(newImg);
        return newImg;
      };
      M_Images.prototype.interval = function (img, color, threshold) {
        var intervalImg = _o_images.interval(img, color, threshold);
        that.addImageToList(intervalImg);
        return intervalImg;
      };
      M_Images.prototype.grayscale = function (img) {
        var grayImg = _o_images.grayscale(img);
        that.addImageToList(grayImg);
        return grayImg;
      };
      M_Images.prototype.threshold = function (img, threshold, maxVal, type) {
        var nImg = _o_images.threshold(img, threshold, maxVal, type);
        that.addImageToList(nImg);
        return nImg;
      };
      M_Images.prototype.inRange = function (img, lowerBound, upperBound) {
        var nImg = _o_images.inRange(img, lowerBound, upperBound);
        that.addImageToList(nImg);
        return nImg;
      };
      M_Images.prototype.adaptiveThreshold = function (img, maxValue, adaptiveMethod, thresholdType, blockSize, C) {
        var nImg = _o_images.adaptiveThreshold(img, maxValue, adaptiveMethod, thresholdType, blockSize, C);
        that.addImageToList(nImg);
        return nImg;
      };
      M_Images.prototype.blur = function (img, size, point, type) {
        var nImg = _o_images.blur(img, size, point, type);
        that.addImageToList(nImg);
        return nImg;
      };
      M_Images.prototype.medianBlur = function (img, size) {
        var nImg = _o_images.medianBlur(img, size);
        that.addImageToList(nImg);
        return nImg;
      };
      M_Images.prototype.gaussianBlur = function (img, size, sigmaX, sigmaY, type) {
        var nImg = _o_images.gaussianBlur(img, size, sigmaX, sigmaY, type);
        that.addImageToList(nImg);
        return nImg;
      };
      M_Images.prototype.cvtColor = function (img, code, dstCn) {
        var nImg = _o_images.cvtColor(img, code, dstCn);
        that.addImageToList(nImg);
        return nImg;
      };
      M_Images.prototype.resize = function (img, size, interpolation) {
        var nImg = _o_images.resize(img, size, interpolation);
        that.addImageToList(nImg);
        return nImg;
      };
      M_Images.prototype.scale = function (img, fx, fy, interpolation) {
        var nImg = _o_images.scale(img, fx, fy, interpolation);
        that.addImageToList(nImg);
        return nImg;
      };
      M_Images.prototype.rotate = function (img, degree, x, y) {
        var nImg = _o_images.rotate(img, degree, x, y);
        that.addImageToList(nImg);
        return nImg;
      };
      M_Images.prototype.concat = function (img1, img2, direction) {
        var nImg = _o_images.concat(img1, img2, direction);
        that.addImageToList(nImg);
        return nImg;
      };
      M_Images.prototype.fromBase64 = function (base64) {
        var nImg = _o_images.fromBase64(base64);
        that.addImageToList(nImg);
        return nImg;
      };
      M_Images.prototype.fromBytes = function (bytes) {
        var nImg = _o_images.fromBytes(bytes);
        that.addImageToList(nImg);
        return nImg;
      };
      M_Images.prototype.matToImage = function (img) {
        var nImg = _o_images.matToImage(img);
        that.addImageToList(nImg);
        return nImg;
      };
      M_Images.prototype.isDelegated = function () {
        return true;
      };
      M_Images.prototype.isValidImg = function (img) {
        try {
          img.ensureNotRecycled();
          return true;
        } catch (e) {
          return false;
        }
      };
      var mImages = new M_Images();
      var newImages = {};
      var imageFuncs = Object.getOwnPropertyNames(scope.images);
      var newFuncs = Object.getOwnPropertyNames(M_Images.prototype);
      for (var idx in imageFuncs) {
        var func_name = imageFuncs[idx];
        newImages[func_name] = scope.images[func_name];
      }
      for (var _idx in newFuncs) {
        var _func_name = newFuncs[_idx];
        if (_func_name !== 'constructor' && _func_name !== 'init') {
          // console.verbose('override function: ' + func_name)
          newImages[_func_name] = mImages[_func_name];
        }
      }
      debugInfo('图片资源代理创建完毕，准备替换scope中的images');
      scope.images = newImages;
      scope.__asGlobal__(mImages, ['captureScreen']);
      debugInfo('图片资源代理替换images完毕');
    };
    var resourceMonitor = new ResourceMonitor();
    commonFunctions.registerOnEngineRemoved(function () {
      infoLog('脚本执行结束, 释放图片资源');
      resourceMonitor.releaseAll(true);
    }, 'resourceMonitor');
    scope.resourceMonitor = resourceMonitor;
  }
  return scope.resourceMonitor;
};

/***/ }),

/***/ "./src/lib/UpdateChecker.js":
/*!**********************************!*\
  !*** ./src/lib/UpdateChecker.js ***!
  \**********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var _interopRequireDefault = __webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "./node_modules/@babel/runtime/helpers/interopRequireDefault.js");
var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "./node_modules/@babel/runtime/helpers/defineProperty.js"));
var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  config = _require.config;
var fileUtils = __webpack_require__(/*! @/lib/prototype/FileUtils */ "./src/lib/prototype/FileUtils.js");
var logUtils = __webpack_require__(/*! @/lib/prototype/LogUtils */ "./src/lib/prototype/LogUtils.js");
var storageFactory = __webpack_require__(/*! @/lib/prototype/StorageFactory */ "./src/lib/prototype/StorageFactory.js");
var UPDATE_STORAGE = "update_info";
var DAILY_UPDATE_CHECK_STORAGE = "daily_update_check";
importPackage(Packages["okhttp3"]);
module.exports = function () {
  function BaseDownloader() {
    var _this = this;
    this.doDownload = function () {
      var downloadDialog = dialogs.build({
        title: '更新中...',
        content: '更新中',
        cancelable: false,
        progress: {
          max: 100,
          horizontal: true,
          showMinMax: false
        }
      });
      this.downloadDialog = downloadDialog;
      this.downloader.setListener(new DownloaderListener({
        updateGui: function updateGui(string) {
          log(string);
          downloadDialog.setContent(string);
        },
        updateError: function updateError(string) {
          console.error(string);
        },
        updateProgress: function updateProgress(progressInfo) {
          downloadDialog.setProgress(progressInfo.getProgress() * 100);
        }
      }));
      dialogs.build({
        title: '是否下载更新',
        content: _this.content,
        cancelable: false,
        neutral: '备份后更新',
        negative: '取消',
        positive: '覆盖更新',
        negativeColor: 'red',
        positiveColor: '#f9a01c'
      }).on('negative', function () {
        // exit()
      }).on('neutral', function () {
        downloadDialog.show();
        threads.start(function () {
          _this.downloadingExecutor(true);
        });
      }).on('positive', function () {
        downloadDialog.show();
        threads.start(function () {
          _this.downloadingExecutor(false);
        });
      }).show();
    };
    this.loadReleaseInfo = function () {};
    this.downloadUpdate = function () {
      this.init();
      this.loadReleaseInfo();
      this.doDownload();
    };
  }
  BaseDownloader.prototype.basePrepareDownloader = function (downloader, targetOutputDir) {
    downloader.setListener(new DownloaderListener({
      updateGui: function updateGui(string) {
        log(string);
      },
      updateError: function updateError(string) {
        console.error(string);
      },
      updateProgress: function updateProgress(progressInfo) {}
    }));
    log('下载并解压文件到目录：' + targetOutputDir);
    // 设置尝试获取总大小的次数，默认5次，github的content-length偶尔会给 偶尔不会给，主要原因是服务端用了分块传输的缘故
    downloader.setTryCount(2);
    downloader.setOutputDir(targetOutputDir);
    // 设置不需要解压覆盖的文件
    // 请勿移除'dex/autojs-tools.dex' 否则引起报错
    downloader.setUnzipSkipFiles(['.gitignore', 'dex/autojs-tools.dex', 'dex/download.dex']);
    // 设置不需要备份的文件
    downloader.setBackupIgnoreFiles([]);
    prepareDownloaderForPro(downloader);
    this.downloader = downloader;
    var _this = this;
    this.downloadingExecutor = function (backup) {
      if (backup) {
        _this.downloader.backup();
        sleep(1000);
      }
      _this.downloader.downloadZip();

      // 覆盖新的dex到lib下
      var copy_result = files.copy(targetOutputDir + '/resources/for_update/download.dex', targetOutputDir + '/dex/download.dex');
      toastLog('复制新的dex文件' + (copy_result ? '成功' : '失败'));
      log('清理过时lib文件');
      var outdate_file_path = targetOutputDir + '/resources/for_update/OutdateFiles.js';
      if (files.exists(outdate_file_path)) {
        _this.downloadDialog.setContent('清理过期文件...');
        var outdateFiles = eval('require')(outdate_file_path);
        outdateFiles && outdateFiles.length > 0 && outdateFiles.forEach(function (fileName) {
          var fullPath = targetOutputDir + '/' + fileName;
          if (files.exists(fullPath)) {
            var deleteResult = false;
            if (files.isDir(fullPath) && !files.isEmptyDir(fullPath)) {
              deleteResult = files.removeDir(fullPath);
            } else {
              deleteResult = files.remove(fullPath);
            }
            console.verbose('删除过期文件：' + fullPath + ' ' + (deleteResult ? '成功' : '失败'));
          }
        });
      }
      // 更新后刷新webview缓存
      config.overwrite('clear_webview_cache', true);
      _this.downloadDialog.setContent('更新完成');
      sleep(2000);
      _this.downloadDialog.dismiss();
    };
  };
  BaseDownloader.prototype.init = function () {
    var rootPath = fileUtils.getCurrentWorkPath();
    this.rootPath = rootPath;
    var resolver = __webpack_require__(/*! @/lib/AutoJSRemoveDexResolver.js */ "./src/lib/AutoJSRemoveDexResolver.js");
    resolver();
    var dexPath = rootPath + '/dex/download.dex';
    if (!files.exists(dexPath)) {
      var copy_result = files.copy(rootPath + '/resources/for_update/download.dex', dexPath);
      logUtils.warnInfo(['download.dex文件不存在，重新复制备份文件，执行结果：{}', copy_result ? '成功' : '失败']);
    }
    runtime.loadDex(dexPath);
    try {
      importClass(com.tony.listener.DownloaderListener);
    } catch (e) {
      var errorInfo = e + '';
      if (/importClass must be called/.test(errorInfo)) {
        toastLog('请强制关闭AutoJS并重新启动');
        exit();
      }
    }
    importClass(com.tony.listener.DownloaderListener);
    importClass(com.tony.resolver.JSONResolver);
    importClass(com.tony.downloader.GithubReleaseDownloader);
    importClass(com.tony.downloader.GiteeReleaseDownloader);
    importClass(com.tony.downloader.GithubHistoryTagDownloader);
    resolver();
    this.basePrepareDownloader(this.prepareDownloader(), this.rootPath);
  };
  function UpdateDownloader(github_latest_url, gitee_relase_url, gitee_package_prefix, gitee_package_url) {
    BaseDownloader.call(this);
    var _this = this;
    this.githubReleaseUrl = github_latest_url;
    this.giteeReleaseUrl = gitee_relase_url;
    this.giteePackagePrefix = gitee_package_prefix;
    this.giteePackageUrl = gitee_package_url;
    this.chose = 0;
    this.prepareDownloader = function () {
      var apiUrl = null;
      var downloader = null;
      if (this.giteeReleaseUrl) {
        this.chose = dialogs.singleChoice('请选择更新源', ['Github Release(推荐)', 'Gitee Release(备用)'], 0);
        if (this.chose === 0) {
          toastLog('使用Github Release 作为更新源');
          apiUrl = this.githubReleaseUrl;
          downloader = new GithubReleaseDownloader();
        } else {
          toastLog('使用Gitee Release 作为更新源');
          apiUrl = this.giteeReleaseUrl;
          // 设置包前缀，更新包所在的仓库 
          downloader = new GiteeReleaseDownloader(this.giteePackagePrefix, this.giteePackageUrl);
        }
      } else {
        apiUrl = this.githubReleaseUrl;
        downloader = new GithubReleaseDownloader();
      }
      downloader.setTargetReleasesApiUrl(apiUrl);
      return downloader;
    };
    this.loadReleaseInfo = function () {
      var loadingDialog = dialogs.build({
        cancelable: false,
        negative: '取消',
        title: '正在从' + (_this.chose == 0 ? 'Github' : 'Gitee') + '获取更新信息',
        content: '加载中，请稍等...'
      }).on('negative', function () {
        // exit()
      }).show();
      var summary = this.downloader.getUpdateSummary();
      if (summary === null) {
        loadingDialog.setContent('无法获取release版本信息，请多试几次或者切换更新源');
        sleep(1000);
        loadingDialog.dismiss();
        // exit()
      }
      summary = JSON.parse(summary);
      var localVersion = this.downloader.getLocalVersion();
      this.content = '线上版本：' + summary.tagName + '\n';
      this.content += '本地版本：' + (localVersion === null ? '无法获取本地版本信息' : localVersion) + '\n';
      this.content += '更新内容：\n' + summary.body;
      loadingDialog.dismiss();
    };
  }
  UpdateDownloader.prototype = Object.create(BaseDownloader.prototype);
  UpdateDownloader.prototype.constructor = UpdateDownloader;
  function HistoryDownloader(historyTagUrl) {
    BaseDownloader.call(this);
    this.apiUrl = historyTagUrl;
    this.prepareDownloader = function () {
      return new GithubHistoryTagDownloader(this.apiUrl);
    };
    this.loadReleaseInfo = function () {
      var loadingDialog = dialogs.build({
        cancelable: false,
        negative: '取消',
        title: '正在从Github获取更新信息',
        content: '加载中，请稍等...'
      }).on('negative', function () {
        exit();
      }).show();
      var tagInfosString = this.downloader.getTagInfoList();
      console.log(tagInfosString);
      var tagInfoList = JSON.parse(tagInfosString);
      var choseTag = null;
      if (tagInfoList) {
        var chose = dialogs.singleChoice('请选择版本', tagInfoList.map(function (tagInfo) {
          return tagInfo.name;
        }), 0);
        choseTag = tagInfoList[chose];
        console.log('选择了下载版本：' + JSON.stringify(choseTag));
        loadingDialog.dismiss();
      } else {
        loadingDialog.setContent('无法获取历史更新信息');
        sleep(2000);
        loadingDialog.dismiss();
      }
      var localVersion = this.downloader.getLocalVersion();
      this.content = '本地版本：' + (localVersion === null ? '无法获取本地版本信息' : localVersion) + '\n' + '目标版本：' + choseTag.name + '\n' + '版本降级之后，如无法正常运行，请手动解压origin.zip之后使用\n\n' + '解压地址：' + this.rootPath;
      loadingDialog.dismiss();
      this.downloader.setTargetTagInfo(JSON.stringify(choseTag));
    };
  }
  HistoryDownloader.prototype = Object.create(BaseDownloader.prototype);
  HistoryDownloader.prototype.constructor = HistoryDownloader;
  return {
    updateChecker: new UpdateChecker(config.github_latest_url),
    updateDownloader: new UpdateDownloader(config.github_latest_url, config.gitee_relase_url, config.gitee_package_prefix, config.gitee_package_url),
    historyDownloader: new HistoryDownloader(config.history_tag_url)
  };
}();

// -----
function UpdateChecker(latestUrl) {
  storageFactory.initFactoryByKey(UPDATE_STORAGE, {
    latestVersion: ''
  });
  storageFactory.initFactoryByKey(DAILY_UPDATE_CHECK_STORAGE, {
    checked: false
  });
  this.latestUrl = latestUrl;
  this.getLocalVersion = function () {
    var mainPath = fileUtils.getCurrentWorkPath();
    var versionFile = files.join(mainPath, 'version.json');
    var projectFile = files.join(mainPath, 'project.json');
    var versionName = '';
    if (files.exists(versionFile)) {
      versionName = JSON.parse(files.read(versionFile)).version;
    } else if (files.exists(projectFile)) {
      versionName = JSON.parse(files.read(projectFile)).versionName;
    }
    return versionName;
  };
  this.requestLatestInfo = function (disablePersonalToken) {
    if (this.latestUrl === '') {
      return null;
    }
    var request = new Request.Builder().url(this.latestUrl).get();
    if (config.release_access_token && !disablePersonalToken) {
      request.addHeader('authorization', 'token ' + config.release_access_token);
    }
    request = request.build();
    var response = null;
    var result = null;
    try {
      var okHttpClient = new OkHttpClient();
      response = okHttpClient.newCall(request).execute();
      if (response != null && response.body() != null) {
        var resultString = response.body().string();
        logUtils.debugInfo('请求结果：' + resultString);
        result = JSON.parse(resultString);
      }
    } catch (e) {
      logUtils.errorInfo('请求更新信息接口异常' + e);
    } finally {
      if (response !== null) {
        response.close();
      }
    }
    return result;
  };
  this.getLatestInfo = function () {
    if (!config.auto_check_update) {
      return null;
    }
    var dailyCheckStorage = storageFactory.getValueByKey(DAILY_UPDATE_CHECK_STORAGE);
    if (dailyCheckStorage.checked) {
      logUtils.debugInfo(['今日已经检测过版本更新，当前最新版本为：「{}」', dailyCheckStorage.latestVersion]);
      return dailyCheckStorage.latestVersion;
    }
    if (this.latestUrl === '') {
      return null;
    }
    var result = this.requestLatestInfo();
    if (result == null) {
      return null;
    } else if ("Bad credentials" == result.message) {
      // 可能access_token挂了，取消验证，但是可能会被限流
      result = this.requestLatestInfo(true);
    }
    if (result.tag_name) {
      storageFactory.updateValueByKey(UPDATE_STORAGE, {
        latestVersion: result.tag_name,
        updateNotes: result.body
      });
      storageFactory.updateValueByKey(DAILY_UPDATE_CHECK_STORAGE, {
        checked: true,
        latestVersion: result.tag_name
      });
      return result.tag_name;
    }
    return null;
  };
  this.hasNewVersion = function () {
    if (!config.auto_check_update) {
      return null;
    }
    var dailyCheckStorage = storageFactory.getValueByKey(DAILY_UPDATE_CHECK_STORAGE);
    if (dailyCheckStorage.checked) {
      if (this.getLocalVersion() < this.getLatestInfo()) {
        return this.getLatestInfo();
      }
    }
    return null;
  };
}

// -- support func --
function prepareDownloaderForPro(downloader) {
  var is_pro = Object.prototype.toString.call(com.stardust.autojs.core.timing.TimedTask.Companion).match(/Java(Class|Object)/);
  if (is_pro) {
    var origin = {};
    var new_object = {};
    downloader.setJsonResolver(new JSONResolver((0, _defineProperty2["default"])((0, _defineProperty2["default"])((0, _defineProperty2["default"])((0, _defineProperty2["default"])((0, _defineProperty2["default"])({
      /**
       * 将对象转换成 JSON字符串
       *
       * @param obj
       * @return jsonString
       */
      toJSONString: function toJSONString(obj) {
        return JSON.stringify(obj);
      },
      /**
       * 根据json字符串获取 指定json key内容 并转为String
       *
       * @param jsonString
       * @param name       key
       * @return
       */
      getString: function getString(jsonString, name) {
        if (arguments.length === 2) {
          var v = JSON.parse(jsonString)[name];
          return v ? v.toString() : '';
        } else {
          var _v = origin[arguments[0]];
          return _v ? _v.toString() : '';
        }
      },
      /**
       * 可以嵌套调用 获取对象，不转为String
       *
       * @param jsonString
       * @param name
       * @return
       */
      getObject: function getObject(jsonString, name) {
        return JSON.parse(jsonString)[name];
      },
      //---------------

      /**
       * 设置原始JSONString
       *
       * @param jsonString
       * @return
       */
      setOrigin: function setOrigin(jsonString) {
        origin = JSON.parse(jsonString);
        return this;
      }
    }, "getString", function getString(name) {
      if (arguments.length === 2) {
        var jsonString = arguments[0];
        name = arguments[1];
        var v = JSON.parse(jsonString)[name];
        return v ? v.toString() : '';
      } else {
        var _v2 = origin[name];
        return _v2 ? _v2.toString() : '';
      }
    }), "getObject", function getObject(name) {
      return origin[name];
    }), "newObject", function newObject() {
      new_object = {};
      return this;
    }), "put", function put(name, value) {
      new_object[name] = value;
      return this;
    }), "toJSONString", function toJSONString() {
      return JSON.stringify(new_object);
    })));
  }
}

/***/ }),

/***/ "./src/lib/prototype/Automator.js":
/*!****************************************!*\
  !*** ./src/lib/prototype/Automator.js ***!
  \****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-25 20:37:31
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-07 21:58:57
 * @Description: 
 */
var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  _config = _require.config;
var _logUtils = __webpack_require__(/*! @/lib/prototype/LogUtils */ "./src/lib/prototype/LogUtils.js");
var FileUtils = __webpack_require__(/*! @/lib/prototype/FileUtils */ "./src/lib/prototype/FileUtils.js");
var customLockScreen = files.exists(FileUtils.getCurrentWorkPath() + '/extends/LockScreen.js') ? eval('require')(FileUtils.getCurrentWorkPath() + '/extends/LockScreen.js') : null;
var hasRootPermission = function hasRootPermission() {
  return files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su");
};
var _automator = device.sdkInt < 24 || hasRootPermission() ? new Automation_root() : new Automation();

/**
 * 获取区域内的随机数，并避免获取到边界
 * @param {*} min 最小值
 * @param {*} max 最大值
 * @returns 随机值
 */
var randomRange = function randomRange(min, max) {
  var padding = Math.floor((max - min) / 5);
  return min + padding + Math.ceil(Math.random() * (max - min - 2 * padding));
};
module.exports = {
  registerVisualHelper: function registerVisualHelper(visualHelper) {
    _automator.registerVisualHelper(visualHelper);
  },
  click: function click(x, y) {
    _logUtils.debugInfo(['点击了：{}, {}', x, y]);
    return _automator.click(x, y);
  },
  clickCenter: function clickCenter(obj) {
    return _automator.click(obj.bounds().centerX(), obj.bounds().centerY());
  },
  clickRandom: function clickRandom(obj) {
    var bounds = obj.bounds();
    var left = bounds.left,
      top = bounds.top,
      right = bounds.right,
      bottom = bounds.bottom;
    var x = randomRange(left, right);
    var y = randomRange(top, bottom);
    _logUtils.debugInfo(['random clicked: [{}, {}]', x, y]);
    if (_automator.visualHelper) {
      _automator.visualHelper.addText('↓', {
        x: x - 8,
        y: y - 2
      }, '#e440e1');
      _automator.visualHelper.addRectangle('', [x, y, 5, 5]);
    }
    return _automator.click(x, y);
  },
  clickRandomRegion: function clickRandomRegion(region) {
    if (Object.prototype.toString.call(region) === '[object Array]' && region.length > 3) {
      region = {
        left: region[0],
        top: region[1],
        width: region[2],
        height: region[3]
      };
    }
    var _region = region,
      left = _region.left,
      top = _region.top,
      width = _region.width,
      height = _region.height;
    var right = left + width,
      bottom = top + height;
    if (left < 0 || left > _config.device_width || top < 0 || top > _config.device_height || right < 0 || right > _config.device_width || bottom < 0 || bottom > _config.device_height) {
      _logUtils.errorInfo(['区域信息不在屏幕内，取消点击：{}', region]);
      return false;
    }
    var x = randomRange(left, left + width);
    var y = randomRange(top, top + height);
    _logUtils.debugInfo(['randomRegion clicked: [{}, {}]', x, y]);
    if (_automator.visualHelper) {
      _automator.visualHelper.addText('↓', {
        x: x - 8,
        y: y - 2
      }, '#e440e1');
      _automator.visualHelper.addRectangle('', [x, y, 5, 5]);
    }
    return _automator.click(x, y);
  },
  swipe: function swipe(x1, y1, x2, y2, duration) {
    return _automator.swipe(x1, y1, x2, y2, duration);
  },
  gesture: function gesture(duration, points) {
    return _automator.gesture(duration, points);
  },
  back: function back() {
    return _automator.back();
  },
  lockScreen: function lockScreen() {
    _config.notNeedRelock = true;
    return _automator.lockScreen();
  },
  scrollDown: function (_scrollDown) {
    function scrollDown() {
      return _scrollDown.apply(this, arguments);
    }
    scrollDown.toString = function () {
      return _scrollDown.toString();
    };
    return scrollDown;
  }(function () {
    if (_config.useCustomScrollDown) {
      return _automator.scrollDown();
    } else {
      return scrollDown();
    }
  }),
  /**
   * 页面向下滑动 startY > endY 手势向上
   * 
   * @param {*} startY 起始高度
   * @param {*} endY 结束高度
   * @param {*} duration 
   * @returns 
   */
  gestureDown: function gestureDown(startY, endY, duration) {
    return _automator.scrollDown(startY, endY, duration);
  },
  /**
   * 页面向上滑动 startY < endY 手势向下
   * 
   * @param {*} startY 起始高度
   * @param {*} endY 结束高度
   * @param {*} duration 
   * @returns 
   */
  gestureUp: function gestureUp(startY, endY, duration) {
    return _automator.scrollUp(startY, endY, duration);
  },
  scrollUp: function (_scrollUp) {
    function scrollUp(_x) {
      return _scrollUp.apply(this, arguments);
    }
    scrollUp.toString = function () {
      return _scrollUp.toString();
    };
    return scrollUp;
  }(function (speed) {
    if (_config.useCustomScrollDown) {
      _automator.scrollUp();
    } else {
      scrollUp();
    }
  }),
  scrollUpAndDown: function scrollUpAndDown(speed) {
    _automator.scrollUpAndDown(speed);
  },
  clickBack: function clickBack(forceBack) {
    return _automator.clickBack(forceBack);
  },
  clickClose: function clickClose() {
    return _automator.clickClose();
  }
};
function CommonAutomation() {
  this.visualHelper = null;
  this.registerVisualHelper = function (visualHelper) {
    this.visualHelper = visualHelper;
  };
  this.scrollDown = function (startY, endY, duration) {
    var deviceHeight = _config.device_height || 1900;
    var bottomHeight = _config.bottomHeight || 250;
    var points = [];
    var startX = parseInt(_config.device_width / 2) + ~~(Math.random() * 100 % 40 + 50) * (Math.random() > 0.5 ? 1 : -1);
    startY = startY || deviceHeight - bottomHeight;
    endY = endY || parseInt(deviceHeight / 5);
    if (startY < endY) {
      var tmp = endY;
      endY = startY;
      startY = tmp;
    }
    var distY = startY - endY;
    var distX = 100;
    var sum = 0,
      step = 1;
    var gaps = [];
    while (sum < distY) {
      step *= 1.2;
      sum += Math.log2(step);
      gaps.push(Math.log2(step));
    }
    var currentY = startY,
      currentX = startX;
    var gapX = distX / gaps.length;
    gaps.reverse().forEach(function (v) {
      points.push([currentX, currentY]);
      currentY -= v;
      currentX += gapX;
    });
    this.gesture(duration || points.length * 8, points);
  };
  this.scrollUp = function (startY, endY, duration) {
    var deviceHeight = _config.device_height || 1900;
    var points = [];
    var startX = parseInt(_config.device_width / 2) + ~~(Math.random() * 100 % 40 + 50) * (Math.random() > 0.5 ? 1 : -1);
    startY = startY || deviceHeight / 3;
    if (startY > endY) {
      var tmp = endY;
      endY = startY;
      startY = tmp;
    }
    var distY = endY - startY;
    var distX = 100;
    var sum = 0,
      step = 1;
    var gaps = [];
    while (sum < distY) {
      step *= 1.2;
      sum += Math.log2(step);
      gaps.push(Math.log2(step));
    }
    var currentY = startY,
      currentX = startX;
    var gapX = distX / gaps.length;
    gaps.reverse().forEach(function (v) {
      points.push([currentX, currentY]);
      currentY += v;
      currentX += gapX;
    });
    this.gesture(duration || points.length * 8, points);
  };
  this.scrollUpAndDown = function (speed) {
    var millis = parseInt(speed || _config.scrollDownSpeed || 500);
    var deviceHeight = _config.device_height || 1900;
    var bottomHeight = _config.bottomHeight || 250;
    var x = parseInt(_config.device_width / 2);
    var startPoint = deviceHeight - bottomHeight;
    // 滑动距离，二分之一屏幕
    var distance = parseInt(deviceHeight / 2);
    var endPoint = startPoint - distance;
    // 手势上划
    this.swipe(x, startPoint, x + 100, endPoint, millis);
    sleep(millis + 20);
    this.swipe(x, endPoint, x + 100, startPoint, millis);
  };
  this.clickBack = function (forceBack) {
    var hasButton = false;
    if (descEndsWith('返回').exists()) {
      descEndsWith('返回').findOne(_config.timeout_findOne).click();
      hasButton = true;
    } else if (textEndsWith('返回').exists()) {
      textEndsWith('返回').findOne(_config.timeout_findOne).click();
      hasButton = true;
    } else if (forceBack) {
      this.back();
    }
    if (hasButton) {
      sleep(200);
    }
    return hasButton;
  };
  this.clickClose = function () {
    var hasButton = false;
    if (descEndsWith('关闭').exists()) {
      descEndsWith('关闭').findOne(_config.timeout_findOne).click();
      hasButton = true;
    } else if (textEndsWith('关闭').exists()) {
      textEndsWith('关闭').findOne(_config.timeout_findOne).click();
      hasButton = true;
    }
    if (hasButton) {
      sleep(200);
    }
    return hasButton;
  };
}
function Automation_root() {
  CommonAutomation.call(this);
  this.check_root = function () {
    if (!(files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su"))) throw new Error("未获取ROOT权限");
  };
  this.click = function (x, y) {
    this.check_root();
    return shell("input tap " + x + " " + y, true).code === 0;
  };
  this.swipe = function (x1, y1, x2, y2, duration) {
    this.check_root();
    return shell("input swipe " + x1 + " " + y1 + " " + x2 + " " + y2 + " " + duration, true).code === 0;
  };
  this.gesture = function (duration, points) {
    this.check_root();
    var len = points.length,
      step = duration / len,
      start = points.shift();

    // 使用 RootAutomator 模拟手势，仅适用于安卓5.0及以上
    var ra = new RootAutomator();
    ra.touchDown(start[0], start[1]);
    sleep(step);
    points.forEach(function (el) {
      ra.touchMove(el[0], el[1]);
      sleep(step);
    });
    ra.touchUp();
    ra.exit();
    return true;
  };
  this.back = function () {
    this.check_root();
    return shell("input keyevent KEYCODE_BACK", true).code === 0;
  };
  this.lockScreen = function () {
    return shell("input keyevent 26", true).code === 0;
  };
}
function Automation() {
  CommonAutomation.call(this);
  this.click = function (x, y) {
    return click(x, y);
  };
  this.swipe = function (x1, y1, x2, y2, duration) {
    return swipe(x1, y1, x2, y2, duration);
  };
  this.gesture = function (duration, points) {
    return gesture(duration, points);
  };
  this.back = function () {
    return back();
  };

  /**
   * 首先尝试无障碍方式锁屏，失败后使用 下拉状态栏，点击锁屏按钮 的方式锁屏
   */
  this.lockScreen = function () {
    // 使用无障碍服务进行锁屏
    if (auto.service.performGlobalAction(8)) {
      return;
    }
    _logUtils.debugInfo('使用无障碍锁屏失败，尝试模拟点击方式');
    if (customLockScreen) {
      customLockScreen();
    } else {
      // MIUI 12 新控制中心
      swipe(800, 10, 800, 500, 230);
      sleep(1000);
      // 点击锁屏按钮
      click(parseInt(_config.lock_x), parseInt(_config.lock_y));
    }
  };
}

/***/ }),

/***/ "./src/lib/prototype/CapturePermissionResolver.js":
/*!********************************************************!*\
  !*** ./src/lib/prototype/CapturePermissionResolver.js ***!
  \********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var FileUtils = __webpack_require__(/*! @/lib/prototype/FileUtils */ "./src/lib/prototype/FileUtils.js");
var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  _config = _require.config;
var _require2 = __webpack_require__(/*! @/lib/prototype/LogUtils */ "./src/lib/prototype/LogUtils.js"),
  debugInfo = _require2.debugInfo,
  warnInfo = _require2.warnInfo;
var workpath = FileUtils.getCurrentWorkPath();
var ResultAdapter = __webpack_require__(/*! result_adapter */ "result_adapter");
var $resolver = __webpack_require__(/*! @/lib/AutoJSRemoveDexResolver.js */ "./src/lib/AutoJSRemoveDexResolver.js");
$resolver();
runtime.loadDex(workpath + '/dex/autojs-common.dex');
importClass(com.tony.autojs.common.ImagesResolver);
$resolver();
function ReRequestScreenCapture() {
  /**
   * 释放截图权限
   */
  this.releaseImageCapture = function () {
    _config.has_screen_capture_permission = false;
    debugInfo('准备释放截图权限');
    ImagesResolver.releaseImageCapture(runtime);
    debugInfo('释放截图权限完毕');
  };

  /**
   * 清除截图权限状态并手动申请截图权限
   * 
   * @returns 
   */
  this.requestScreenCaptureManual = function () {
    ImagesResolver.clearScreenCaptureState(runtime);
    log('准备重新获取截图权限');
    var permission = ResultAdapter.wait(ImagesResolver.requestScreenCapture(runtime));
    debugInfo('重新获取截图权限' + permission);
    return permission;
  };

  /**
   * 清除截图权限状态并自动点击授权截图权限
   * 
   * @returns 
   */
  this.requestScreenCaptureAuto = function () {
    ImagesResolver.clearScreenCaptureState(runtime);
    log('准备重新获取截图权限');
    var permission = __webpack_require__(/*! ../prototype/RequestScreenCapture */ "./src/lib/prototype/RequestScreenCapture.js")();
    debugInfo('重新获取截图权限' + permission);
    return permission;
  };

  /**
   * 重新获取截图权限
   * @returns 成功返回true
   */
  this.reRequestScreenCapture = function () {
    if (_config.request_capture_permission) {
      return this.requestScreenCaptureAuto();
    } else {
      return this.requestScreenCaptureManual();
    }
  };

  /**
   * 释放并重新请求截图权限-手动
   */
  this.releaseAndRequestScreenCaptureManual = function () {
    debugInfo('释放截图权限');
    ImagesResolver.releaseImageCapture(runtime);
    sleep(100);
    log('准备重新获取截图权限');
    var permission = ResultAdapter.wait(ImagesResolver.requestScreenCapture(runtime));
    debugInfo('重新获取截图权限' + permission);
    return permission;
  };

  /**
   * 释放截图权限并清除截图权限状态-自动
   */
  this.releaseAndRequestScreenCaptureAuto = function () {
    debugInfo('释放截图权限');
    ImagesResolver.releaseImageCapture(runtime);
    debugInfo('释放截图权限完毕');
    var permission = __webpack_require__(/*! ../prototype/RequestScreenCapture */ "./src/lib/prototype/RequestScreenCapture.js")();
    debugInfo('重新获取截图权限' + permission);
    return permission;
  };

  /**
   * 释放并重新获取截图权限
   * @returns 是否请求成功
   */
  this.releaseAndRequestScreenCapture = function () {
    _config.has_screen_capture_permission = false;
    if (_config.request_capture_permission) {
      return this.releaseAndRequestScreenCaptureAuto();
    } else {
      return this.releaseAndRequestScreenCaptureManual();
    }
  };
}
module.exports = new ReRequestScreenCapture();

/***/ }),

/***/ "./src/lib/prototype/CommonFunction.js":
/*!*********************************************!*\
  !*** ./src/lib/prototype/CommonFunction.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
 * @Author: TonyJiangWJ
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-07 21:11:27
 * @Description: 通用工具
 */
var FileUtils = __webpack_require__(/*! @/lib/prototype/FileUtils */ "./src/lib/prototype/FileUtils.js");
var CommonFunctions = __webpack_require__(/*! @/lib/BaseCommonFunctions.js */ "./src/lib/BaseCommonFunctions.js");
// 针对当前项目的公共方法封装，方便不同项目之间直接同步BaseCommonFunction不用再对比内容
var _ProjectCommonFunctions = files.exists(FileUtils.getCurrentWorkPath() + '/lib/ProjectCommonFunctions.js') ? __webpack_require__(/*! @/lib/ProjectCommonFunctions.js */ "./src/lib/ProjectCommonFunctions.js") : null;
var customizeFunctions = files.exists(FileUtils.getCurrentWorkPath() + '/extends/CommonFunction.js') ? eval('require')(FileUtils.getCurrentWorkPath() + '/extends/CommonFunction.js') : null;
var innerFunctions = _ProjectCommonFunctions === null ? new CommonFunctions() : new _ProjectCommonFunctions();
if (customizeFunctions) {
  innerFunctions = customizeFunctions(innerFunctions);
}
module.exports = innerFunctions;

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

/***/ "./src/lib/prototype/FloatyUtil.js":
/*!*****************************************!*\
  !*** ./src/lib/prototype/FloatyUtil.js ***!
  \*****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-02 19:05:01
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-07 21:17:52
 * @Description: 悬浮窗工具，单独提出来作为单例使用
 */
var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  _config = _require.config;
var _debugInfo = typeof debugInfo === 'undefined' ? function (v) {
  return console.verbose(v);
} : debugInfo;
var _errorInfo = typeof errorInfo === 'undefined' ? function (v) {
  return console.error(v);
} : errorInfo;
var FloatyUtil = function FloatyUtil() {
  this.floatyWindow = null;
  this.floatyInitStatus = false;
  this.floatyLock = null;
  this.floatyCondition = null;
  this.showLog = false;
  this.oldPosition = null;
  this.debugInfo = function (content) {
    this.showLog && _debugInfo(content);
  };
};
FloatyUtil.prototype.init = function () {
  if (this.floatyInitStatus) {
    return true;
  }
  this.floatyLock = threads.lock();
  this.floatyCondition = this.floatyLock.newCondition();
  var _this = this;
  threads.start(function () {
    // 延迟初始化，避免死机
    sleep(400);
    _this.floatyLock.lock();
    try {
      if (_this.floatyInitStatus) {
        return true;
      }
      _this.floatyWindow = floaty.rawWindow("\n        <frame gravity=\"left\">\n          <text id=\"content\" textSize=\"8dp\" textColor=\"#00ff00\" />\n        </frame>\n      ");
      ui.run(function () {
        _this.floatyWindow.setTouchable(false);
        _this.floatyWindow.setPosition(50, 50 + _config.bang_offset);
        _this.floatyWindow.content.text('悬浮窗初始化成功');
      });
      _this.floatyInitStatus = true;
    } catch (e) {
      _errorInfo('悬浮窗初始化失败' + e);
      _this.floatyWindow = null;
      _this.floatyInitStatus = false;
    } finally {
      _this.floatyCondition.signalAll();
      _this.floatyLock.unlock();
    }
  });
  this.floatyLock.lock();
  try {
    if (this.floatyInitStatus === false) {
      this.debugInfo('等待悬浮窗初始化');
      this.floatyCondition["await"]();
    }
  } finally {
    this.floatyLock.unlock();
  }
  this.debugInfo('悬浮窗初始化' + (this.floatyInitStatus ? '成功' : '失败'));
  return this.floatyInitStatus;
};
FloatyUtil.prototype.close = function () {
  if (this.floatyInitStatus) {
    this.floatyLock.lock();
    try {
      if (this.floatyWindow !== null) {
        this.floatyWindow.close();
        this.floatyWindow = null;
      }
      this.floatyInitStatus = false;
    } finally {
      this.floatyLock.unlock();
    }
  }
};
FloatyUtil.prototype.setFloatyInfo = function (position, text, option) {
  option = option || {};
  if (this.floatyWindow === null) {
    this.init();
  }
  var _this = this;
  ui.run(function () {
    _this.floatyLock.lock();
    try {
      if (position && isFinite(position.x) && isFinite(position.y)) {
        _this.floatyWindow.setPosition(parseInt(position.x), parseInt(position.y) + _config.bang_offset);
      }
      if (text) {
        _this.floatyWindow.content.text(text);
        _this.debugInfo(text);
      }
      if (option.textSize) {
        _this.floatyWindow.content.setTextSize(option.textSize);
      }
      if (typeof option.touchable !== 'undefined') {
        _this.floatyWindow.setTouchable(option.touchable);
      }
    } finally {
      _this.floatyLock.unlock();
    }
  });
};
FloatyUtil.prototype.setFloatyTextColor = function (colorStr) {
  if (this.floatyWindow === null) {
    this.init();
  }
  var _this = this;
  if (/^#[\dabcdef]{6,8}$/i.test(colorStr)) {
    var colorInt = colors.parseColor(colorStr);
    if (colorInt !== null) {
      ui.run(function () {
        _this.floatyLock.lock();
        try {
          _this.floatyWindow.content.setTextColor(colorInt);
        } finally {
          _this.floatyLock.unlock();
        }
      });
    }
  } else {
    console.error('颜色值字符串格式不正确: ' + colorStr);
  }
};
FloatyUtil.prototype.setFloatyText = function (text, option) {
  this.setFloatyInfo(null, text, option);
};
FloatyUtil.prototype.setFloatyPosition = function (x, y, option) {
  this.setFloatyInfo({
    x: x,
    y: y
  }, null, option);
};
FloatyUtil.prototype.setTextSize = function (textSize) {
  this.setFloatyInfo(null, null, {
    textSize: textSize
  });
};
FloatyUtil.prototype.setTouchable = function (touchable) {
  this.setFloatyInfo(null, null, {
    touchable: touchable
  });
};
FloatyUtil.prototype.disableLog = function () {
  this.showLog = false;
};
FloatyUtil.prototype.enableLog = function () {
  this.showLog = true;
};
FloatyUtil.prototype.createNewInstance = function () {
  var newInstance = new FloatyUtil();
  while (!newInstance.init()) {
    newInstance = new FloatyUtil();
  }
  newInstance.setFloatyPosition(-100, -100);
  return newInstance;
};
FloatyUtil.prototype.hide = function () {
  this.oldPosition = {
    x: this.floatyWindow.getX(),
    y: this.floatyWindow.getY()
  };
  this.setFloatyPosition(-100, -100);
};
FloatyUtil.prototype.restore = function () {
  if (this.oldPosition) {
    this.setFloatyPosition(this.oldPosition.x, this.oldPosition.y);
  }
};
module.exports = new FloatyUtil();

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

/***/ "./src/lib/prototype/ProcessShare.js":
/*!*******************************************!*\
  !*** ./src/lib/prototype/ProcessShare.js ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  _storage_name = _require.storage_name;
var FileUtils = __webpack_require__(/*! @/lib/prototype/FileUtils */ "./src/lib/prototype/FileUtils.js");
var _require2 = __webpack_require__(/*! @/lib/prototype/LogUtils */ "./src/lib/prototype/LogUtils.js"),
  debugInfo = _require2.debugInfo,
  warnInfo = _require2.warnInfo;
var workpath = FileUtils.getCurrentWorkPath();
var cachePath = context.getCacheDir() + '/' + _storage_name;
var $resolver = __webpack_require__(/*! @/lib/AutoJSRemoveDexResolver.js */ "./src/lib/AutoJSRemoveDexResolver.js");
$resolver();
runtime.loadDex(workpath + '/dex/autojs-common.dex');
importClass(com.tony.autojs.common.ProcessMappedShare);
$resolver();
/**
 * 进程间通讯工具 实现脚本建通信功能
 */
function ProcessShare() {
  // 缓冲区大小
  this.bufferSize = 1024;
  // 是否循环订阅消息
  this.isLoop = false;
  // 监听文件的间隔时间 默认1000ms
  this.interval = 1000;
  this.setBufferSize = function (size) {
    this.bufferSize = size;
    return this;
  };
  this.loop = function () {
    this.isLoop = true;
    return this;
  };
  this.setInterval = function (interval) {
    this.interval = interval || 1000;
    return this;
  };

  /**
   * 订阅文件消息 收到消息后回调
   * 
   * @param {function} resolve 读取消息后的回调
   * @param {number} timeout  订阅超时时间，超时后自动停止线程 默认60秒 循环订阅模式下无效
   * @param {string} filePath 消息文件路径 默认为当前AutoJS缓存文件夹下的.share 可以传递绝对路径 但是请自行确保路径可用
   */
  this.subscribe = function (resolve, timeout, filePath) {
    timeout = timeout || 60;
    filePath = getRealFilePath(filePath);
    debugInfo(['订阅文件消息：{}', filePath]);
    var subscriber = ProcessMappedShare.newSubscriber(filePath, this.bufferSize, runtime).setLoop(this.isLoop).setInterval(this.interval).timeout(timeout);
    subscriber.subscribe(new ProcessMappedShare.Callback({
      call: function call(str) {
        debugInfo(['从文件:{} 中 读取消息:{}', filePath, str]);
        resolve(str);
      }
    }));
    return subscriber;
  };

  /**
   * 发送文件消息
   * 
   * @param {string} message  消息内容 默认不能超过1024字节
   * @param {string} filePath 消息文件路径 默认为当前AutoJS缓存文件夹下的.share 可以传递绝对路径 但是请自行确保路径可用
   */
  this.postInfo = function (message, filePath) {
    filePath = getRealFilePath(filePath);
    debugInfo(['向文件:{}中写入消息:{}', filePath, message]);
    ProcessMappedShare.newProvider(filePath, this.bufferSize, runtime).postInfo(message);
  };
}

/**
 * 获取消息文件路径 默认为当前AutoJS缓存文件夹下的.share 可以传递绝对路径 但是请自行确保路径可用
 * @param {string} filePath 
 * @returns 实际路径
 */
function getRealFilePath(filePath) {
  filePath = filePath || '.share';
  if (!filePath.startsWith('/')) {
    filePath = cachePath + '/' + filePath;
  }
  return filePath;
}
module.exports = new ProcessShare();

/***/ }),

/***/ "./src/lib/prototype/RequestScreenCapture.js":
/*!***************************************************!*\
  !*** ./src/lib/prototype/RequestScreenCapture.js ***!
  \***************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
 * @Author: TonyJiangWJ
 * @Date: 2020-12-30 20:16:48
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-07 21:19:26
 * @Description: 
 */
var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  config = _require.config;
var widgetUtils = __webpack_require__(/*! @/lib/prototype/WidgetUtils */ "./src/lib/prototype/WidgetUtils.js");
var logUtils = __webpack_require__(/*! @/lib/prototype/LogUtils */ "./src/lib/prototype/LogUtils.js");
var automator = __webpack_require__(/*! @/lib/prototype/Automator */ "./src/lib/prototype/Automator.js");
module.exports = function (landscape) {
  var countDown = new java.util.concurrent.CountDownLatch(1);
  var requestSuccess = false;
  var confirmWaitingThread = threads.start(function () {
    sleep(500);
    if (requestSuccess) {
      return;
    }
    var confirmWidget = widgetUtils.widgetGetOne(config.capture_permission_button || 'START NOW|立即开始|允许');
    if (confirmWidget) {
      sleep(200);
      var remember = widgetUtils.widgetGetById("android:id/checkbox", 200);
      if (!remember) {
        remember = widgetUtils.widgetGetById("com.android.systemui:id/remember", 200);
      }
      if (remember) {
        logUtils.debugInfo('找到了记住按钮，点击记住');
        automator.clickCenter(remember);
        sleep(200);
      } else {
        logUtils.warnInfo('未找到记住按钮');
      }
      logUtils.debugInfo('点击允许截图权限');
      // 二次获取，理论上不会取不到
      confirmWidget = widgetUtils.widgetGetOne(config.capture_permission_button || 'START NOW|立即开始|允许', 200) || confirmWidget;
      automator.clickCenter(confirmWidget);
    } else {
      logUtils.warnInfo(['未找到允许截图按钮，查找内容为：{}', config.capture_permission_button || 'START NOW|立即开始|允许'], true);
      countDown.countDown();
    }
  });
  var requestThread = threads.start(function () {
    requestSuccess = requestScreenCapture(landscape);
    countDown.countDown();
  });
  var waitResult = countDown["await"](15, java.util.concurrent.TimeUnit.SECONDS);
  if (!waitResult) {
    logUtils.warnInfo('请求截屏权限超时');
  }
  logUtils.debugInfo('请求截屏权限结束：' + requestSuccess);
  confirmWaitingThread.interrupt();
  requestThread.interrupt();
  return requestSuccess;
};

/***/ }),

/***/ "./src/lib/prototype/RunningQueueDispatcher.js":
/*!*****************************************************!*\
  !*** ./src/lib/prototype/RunningQueueDispatcher.js ***!
  \*****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var STORAGE_KEY = "autojs_dispatch_queue_storage";
var RUNNING_KEY = "qunningTask";
var WAITING_QUEUE_KEY = "waitingQueue";
var WRITE_LOCK_KEY = "writeLock";
var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  storage_name = _require.storage_name;
var lockableStorages = __webpack_require__(/*! @/lib/prototype/LockableStorage */ "./src/lib/prototype/LockableStorage.js");
var Timers = __webpack_require__(/*! @/lib/prototype/Timers */ "./src/lib/prototype/Timers.js");
var _logUtils = __webpack_require__(/*! @/lib/prototype/LogUtils */ "./src/lib/prototype/LogUtils.js");
var crashCatcher = __webpack_require__(/*! @/lib/prototype/CrashCatcher */ "./src/lib/prototype/CrashCatcher.js");
function RunningQueueDispatcher() {
  this.lockStorage = null;
  this.currentEngineId = engines.myEngine().id;
  this.currentEngineSource = engines.myEngine().getSource() + '';
  this.checkDuplicateRunning = function (runningEngineId) {
    var _this = this;
    var runningEngines = this.tryGetRunningEngines();
    if (runningEngines === null) {
      // 获取运行中脚本引擎失败
      _logUtils.errorInfo('校验重复运行异常，直接退出');
      exit();
    }
    var runningSize = runningEngines.length;
    var currentSource = this.currentEngineSource;
    var currentEngineId = this.currentEngineId;
    _logUtils.debugInfo('Dispatcher:当前脚本信息 id:' + currentEngineId + ' source:' + currentSource + ' 运行中脚本数量：' + runningSize);
    if (runningSize > 1) {
      runningEngines.forEach(function (engine) {
        var compareEngine = engine;
        var compareSource = compareEngine.getSource() + '';
        _logUtils.debugInfo('Dispatcher:对比脚本信息 id:' + compareEngine.id + ' source:' + compareSource);
        if (runningEngineId === compareEngine.id && currentEngineId !== compareEngine.id && compareSource === currentSource) {
          _logUtils.warnInfo(['Dispatcher:脚本正在运行中 退出当前脚本：{} - {}', currentEngineId, currentSource], true);
          _this.removeRunningTask(true, true);
          exit();
        }
      });
    }
  };

  /**
   * 设置自动启动
   * 
   * @param {string} source 脚本path路径
   * @param {number} seconds 延迟时间 秒
   */
  this.setUpAutoStart = function (source, seconds) {
    var waitTime = seconds || 5;
    _logUtils.debugInfo("定时[" + waitTime + "]秒后启动脚本: " + source);
    var task = Timers.addDisposableTask({
      path: source,
      date: new Date().getTime() + waitTime * 1000
    });
    _logUtils.debugInfo("定时任务预定成功: " + task.id);
  };

  /**
   * 立即启动目标脚本
   * 
   * @param {string} source 脚本path路径
   */
  this.executeTargetScript = function (source) {
    _logUtils.logInfo(['启动目标脚本：{}', source]);
    ui.run(function () {
      engines.execScriptFile(source, {
        path: source.substring(0, source.lastIndexOf('/')),
        arguments: {
          executeByDispatcher: true
        }
      });
    });
    sleep(1000);
  };
  this.getCurrentTaskInfo = function () {
    return {
      source: this.currentEngineSource,
      engineId: this.currentEngineId,
      storageKey: storage_name
    };
  };
  this.clearAll = function () {
    lockableStorages.remove(STORAGE_KEY);
    _logUtils.logInfo('清除数据成功');
  };
  this.showDispatchStatus = function () {
    var runningTaskStr = this.getStorage().get(RUNNING_KEY);
    var waitingQueueStr = this.getStorage().get(WAITING_QUEUE_KEY);
    var lockKeyStr = this.getStorage().get(WRITE_LOCK_KEY);
    if (runningTaskStr) {
      var runningTask = JSON.parse(runningTaskStr);
      var timeout = new Date().getTime() - parseInt(runningTask.timeout);
      _logUtils.logInfo('当前运行中的任务：' + runningTaskStr + (timeout > 0 ? ' 已超时' + (timeout / 1000.0).toFixed(2) + '秒' : ' 超时剩余时间' + (-timeout / 1000.0).toFixed(0) + '秒'));
    } else {
      _logUtils.logInfo('当前无运行中的任务');
    }
    if (waitingQueueStr && waitingQueueStr !== '[]') {
      _logUtils.logInfo('当前等待中的队列：' + waitingQueueStr);
    } else {
      _logUtils.logInfo('当前无等待中的队列');
    }
    if (lockKeyStr) {
      var key = JSON.parse(lockKeyStr);
      _logUtils.logInfo('当前存在的锁：' + lockKeyStr + " 超时时间剩余：" + ((parseInt(key.timeout) - new Date().getTime()) / 1000.0).toFixed(2) + '秒');
    } else {
      _logUtils.logInfo('当前无存在的锁');
    }
  };
  this.getStorage = function () {
    if (this.lockStorage === null) {
      this.lockStorage = lockableStorages.create(STORAGE_KEY);
    }
    return this.lockStorage;
  };
  this.clearLock = function () {
    var taskInfo = this.getCurrentTaskInfo();
    var storedLockStr = this.getStorage().get(WRITE_LOCK_KEY);
    if (storedLockStr) {
      var storedLock = JSON.parse(storedLockStr);
      if (storedLock.source === taskInfo.source) {
        _logUtils.debugInfo('移除任务锁：' + JSON.stringify(taskInfo));
        this.getStorage().put(WRITE_LOCK_KEY, '');
      }
    }
  };

  /**
   * 尝试获取锁
   * @param {number} tryTime 尝试次数，默认一次
   */
  this.lock = function (tryTime) {
    tryTime = tryTime || 1;
    var lockSuccess = this.storageLock();
    while (--tryTime > 0 && !lockSuccess) {
      sleep(200);
      lockSuccess = this.storageLock();
    }
    return lockSuccess;
  };
  this.putLockInfo = function (taskInfo) {
    return this.getStorage().put(WRITE_LOCK_KEY, JSON.stringify({
      source: taskInfo.source,
      engineId: taskInfo.engineId,
      count: 1,
      timeout: new Date().getTime() + 30000
    }));
  };
  this.storageLock = function () {
    var taskInfo = this.getCurrentTaskInfo();
    var storedLockStr = this.getStorage().get(WRITE_LOCK_KEY);
    if (storedLockStr) {
      var storedLock = JSON.parse(storedLockStr);
      if (storedLock.source === taskInfo.source) {
        if (storedLock.engineId === taskInfo.engineId) {
          storedLock.count = parseInt(storedLock.count) + 1;
          // 锁超时时间30秒
          storedLock.timeout = new Date().getTime() + 30000;
          return this.getStorage().put(WRITE_LOCK_KEY, JSON.stringify(storedLock));
        } else {
          // 校验加锁引擎是否挂了
          var runningEngines = this.tryGetRunningEngines();
          // null 说明获取运行中engines失败，作为操作异常，加锁失败
          if (runningEngines === null || runningEngines.find(function (engine) {
            return engine.id === storedLock.engineId;
          })) {
            return false;
          } else {
            _logUtils.warnInfo('加锁脚本引擎 engineId「' + storedLock.engineId + '」已停止，直接覆盖：' + JSON.stringify(storedLock));
            return this.putLockInfo(taskInfo);
          }
        }
      } else {
        if (parseInt(storedLock.timeout) < new Date().getTime()) {
          _logUtils.warnInfo('已有锁已超时，直接覆盖：' + JSON.stringify(storedLock));
          return this.putLockInfo(taskInfo);
        }
        return false;
      }
    } else {
      return this.putLockInfo(taskInfo);
    }
  };
  this.unlock = function () {
    var taskInfo = this.getCurrentTaskInfo();
    var storedLockStr = this.getStorage().get(WRITE_LOCK_KEY);
    if (storedLockStr) {
      var storedLock = JSON.parse(storedLockStr);
      if (storedLock.source === taskInfo.source && storedLock.engineId === taskInfo.engineId) {
        if (parseInt(storedLock.count) > 1) {
          storedLock.count = parseInt(storedLock.count) - 1;
          return this.getStorage().put(WRITE_LOCK_KEY, JSON.stringify(storedLock));
        } else {
          return this.getStorage().put(WRITE_LOCK_KEY, '');
        }
      } else {
        return false;
      }
    } else {
      return false;
    }
  };
  this.getRunningStatus = function () {
    var storedRunningTask = this.getStorage().get(RUNNING_KEY);
    if (storedRunningTask) {
      var runningTask = JSON.parse(storedRunningTask);
      var currentTimestamp = new Date().getTime();
      if (currentTimestamp > runningTask.timeout) {
        _logUtils.debugInfo('运行中任务已超时：' + storedRunningTask + ' 超时时间：' + ((currentTimestamp - runningTask.timeout) / 1000).toFixed(0) + '秒');
        // 直接移除已超时运行中的任务
        this.getStorage().put(RUNNING_KEY, '');
        return null;
      } else {
        _logUtils.debugInfo('获取运行中任务信息：' + storedRunningTask + ' 超时剩余时间：' + ((runningTask.timeout - currentTimestamp) / 1000).toFixed(0) + '秒');
        return runningTask;
      }
    } else {
      return null;
    }
  };
  this.getWaitingStatus = function () {
    var _this2 = this;
    // 任务队列去重
    this.distinctAwaitTasks();
    var waitingArrayStr = this.getStorage().get(WAITING_QUEUE_KEY);
    var waitingArray = [];
    if (waitingArrayStr) {
      waitingArray = JSON.parse(waitingArrayStr) || [];
    }
    // 过滤自身
    waitingArray = waitingArray.filter(function (task) {
      return task.source !== _this2.currentEngineSource;
    });
    if (waitingArray && waitingArray.length > 0) {
      return waitingArray[0];
    }
    return null;
  };

  /**
   * 从等待队列队首移除任务，当外层已包裹lock 可忽略返回值 否则后续操作需要判断是否为null
   */
  this.popWaitingTask = function () {
    var waitingArrayStr = this.getStorage().get(WAITING_QUEUE_KEY);
    var waitingArray = null;
    if (waitingArrayStr) {
      waitingArray = JSON.parse(waitingArrayStr);
    }
    if (waitingArray && waitingArray.length > 0) {
      var waitingTask = waitingArray.splice(0, 1);
      if (this.lock()) {
        this.getStorage().put(WAITING_QUEUE_KEY, JSON.stringify(waitingArray));
        this.unlock();
        return waitingTask;
      }
    }
    return null;
  };

  /**
   * @param {boolean} checkOwner 判断当前运行中的任务信息是否是当前脚本引擎施加的
   * @param {boolean} notRemoveCrashFlag 重复执行的任务不移除运行中标记
   * @param {function} callbackOnSuccess 移除成功后执行
   */
  this.removeRunningTask = function (checkOwner, notRemoveCrashFlag, callbackOnSuccess) {
    callbackOnSuccess = callbackOnSuccess || function () {};
    var taskInfo = this.getCurrentTaskInfo();
    var runningTask = this.getRunningStatus();
    if (runningTask !== null) {
      // engineId判断所有权
      if (runningTask.source === taskInfo.source && (!checkOwner || runningTask.engineId === taskInfo.engineId)) {
        _logUtils.debugInfo('准备移除运行中任务');
        if (this.lock(3)) {
          this.getStorage().put(RUNNING_KEY, '');
          callbackOnSuccess();
          var waitingTask = this.getWaitingStatus();
          if (waitingTask !== null && this.lock()) {
            _logUtils.debugInfo('有任务在等待，执行它');
            this.popWaitingTask();
            _logUtils.debugInfo('执行等待队列首个任务：' + JSON.stringify(waitingTask));

            // 将队列中任务放入执行中
            this.doAddRunningTask(waitingTask);
            sleep(1000);
            this.unlock();
            // 将队列中的任务执行掉
            this.executeTargetScript(waitingTask.source);
          } else {
            _logUtils.debugInfo('无任务等待中');
          }
          this.unlock();
        }
      } else {
        _logUtils.warnInfo('运行中任务：' + JSON.stringify(runningTask) + '和当前任务：' + JSON.stringify(taskInfo) + '不同，不可移除');
      }
    } else {
      _logUtils.warnInfo('无任务在运行中，不可移除');
      callbackOnSuccess();
    }
    // 重复执行的任务 不移除运行中的标记
    if (!notRemoveCrashFlag) {
      crashCatcher.setDone();
    }
    // 清空当前任务施加的锁
    this.clearLock();
  };
  this.doAddRunningTask = function (taskInfo) {
    // 默认超时时间15分钟
    taskInfo.timeout = new Date().getTime() + 15 * 60 * 1000;
    this.getStorage().put(RUNNING_KEY, JSON.stringify(taskInfo));
    if (taskInfo.source === this.getCurrentTaskInfo().source) {
      // 当前脚本正常开始执行后 标记为运行中
      crashCatcher.setOnRunning();
    } else if (taskInfo.storageKey) {
      // 对目标脚本设置crashCatcher的running状态，避免崩溃自启动后无法自动执行
      _logUtils.debugInfo(['设置目标任务状态为执行中 storageKey: {}', taskInfo.storageKey]);
      var crashStateStorage = lockableStorages.create(taskInfo.storageKey + '_crash_catch');
      crashStateStorage.put('running', true);
      crashStateStorage.put('running_source', taskInfo.source);
    }
    // 杀死运行中但是未加入队列的任务
  };
  this.addRunningTask = function () {
    var taskInfo = this.getCurrentTaskInfo();
    var runningTask = this.getRunningStatus();
    if (runningTask !== null) {
      _logUtils.debugInfo('当前有任务正在运行：' + JSON.stringify(runningTask));
      if (runningTask.source === taskInfo.source) {
        _logUtils.debugInfo('运行中脚本任务和当前任务相同，继续判断同源脚本是否正在运行');
        // 如果判断当前运行中和存储任务状态是同一个则不去校验是否重复运行
        if (runningTask.engineId !== taskInfo.engineId) {
          // 避免重复运行，如果挂了则继续
          this.checkDuplicateRunning(runningTask.engineId);
          var oldRunningEngineId = runningTask.engineId;
          if (this.lock(3)) {
            runningTask = this.getRunningStatus();
            if (runningTask == null || oldRunningEngineId === runningTask.engineId) {
              // 更新运行中任务信息
              this.doAddRunningTask(taskInfo);
              this.unlock();
            } else {
              _logUtils.debugInfo(['重新获取的运行中engineId: {} 和旧的engineId: {} 不同 重新尝试加入运行', runningTask.engineId, oldRunningEngineId]);
              this.unlock();
              this.addRunningTask();
            }
          } else {
            _logUtils.warnInfo('更新运行中任务信息失败');
          }
        }
        _logUtils.debugInfo('运行状态校验成功，执行后续功能');
        return;
      } else {
        var runningEngines = this.tryGetRunningEngines();
        if (runningEngines === null || runningEngines.find(function (v) {
          return v.id === runningTask.engineId || runningTask.source === v.getSource() + '';
        })) {
          _logUtils.debugInfo('运行中任务执行正常');
        } else {
          if (this.lock(3)) {
            _logUtils.warnInfo('运行中任务已经异常关闭，直接删除运行中标记');
            // 清空运行中数据
            this.getStorage().put(RUNNING_KEY, '');
            this.unlock();
            // 然后重新加入运行中任务
            return this.addRunningTask();
          } else {
            _logUtils.warnInfo('运行中任务已经异常关闭，删除运行中标记失败');
          }
        }
        _logUtils.debugInfo('将当前task放入等待队列：' + JSON.stringify(taskInfo));
        this.addAwaitTask(taskInfo);
        exit();
      }
    } else {
      var waitingTask = this.getWaitingStatus();
      if (waitingTask !== null) {
        _logUtils.debugInfo('等待队列中已有任务待运行：' + JSON.stringify(waitingTask));
        if (waitingTask.source === taskInfo.source) {
          _logUtils.debugInfo('等待中任务和当前任务相同，可直接执行，将任务信息放入running');
          if (this.lock(3)) {
            this.doAddRunningTask(taskInfo);
            this.popWaitingTask();
            this.unlock();
          } else {
            _logUtils.errorInfo('获取锁失败，无法继续执行任务：' + JSON.stringify(taskInfo));
            _logUtils.warnInfo('尝试将任务加入等待队列中');
            if (this.lock(3)) {
              this.addAwaitTask(taskInfo);
              this.unlock();
            } else {
              if (!this.isTaskInQueue(taskInfo)) {
                _logUtils.warnInfo('尝试将任务加入等待队列失败，定时十秒后启动');
                this.setUpAutoStart(taskInfo.source, 10);
              }
            }
            exit();
          }
        } else {
          _logUtils.debugInfo('等待中任务和当前任务不同，将任务信息放入等待队列：' + JSON.stringify(taskInfo));
          if (this.lock(3)) {
            this.addAwaitTask(taskInfo);
            this.popWaitingTask();
            _logUtils.debugInfo('执行等待队列首个任务：' + JSON.stringify(waitingTask));
            // 将队列中任务放入执行中
            this.doAddRunningTask(waitingTask);
            this.unlock();
            // 将队列中的任务执行掉
            this.executeTargetScript(waitingTask.source);
            exit();
          } else {
            if (!this.isTaskInQueue(taskInfo)) {
              _logUtils.errorInfo('获取锁失败，无法执行等待中任务，当前任务也未成功入队列，设定10秒后启动：' + JSON.stringify(taskInfo));
              this.setUpAutoStart(taskInfo.source, 10);
            }
            exit();
          }
        }
      } else {
        if (this.lock()) {
          _logUtils.debugInfo('当前无任务等待，直接执行：' + JSON.stringify(taskInfo));
          this.doAddRunningTask(taskInfo);
          this.unlock();
        } else {
          _logUtils.errorInfo('获取锁失败，无法继续执行任务：' + JSON.stringify(taskInfo));
          this.setUpAutoStart(taskInfo.source, 10);
          exit();
        }
      }
    }
  };
  this.tryAddRunningTask = function () {
    var taskInfo = this.getCurrentTaskInfo();
    var runningTask = this.getRunningStatus();
    if (runningTask !== null) {
      _logUtils.debugInfo('当前有任务正在运行：' + JSON.stringify(runningTask));
      if (runningTask.source === taskInfo.source) {
        _logUtils.debugInfo('运行中脚本任务和当前任务相同，继续判断同源脚本是否正在运行');
        // 如果判断当前运行中和存储任务状态是同一个则不去校验是否重复运行
        if (runningTask.engineId !== taskInfo.engineId) {
          // 避免重复运行，如果挂了则继续
          this.checkDuplicateRunning(runningTask.engineId);
          var oldRunningEngineId = runningTask.engineId;
          if (this.lock(3)) {
            runningTask = this.getRunningStatus();
            if (runningTask == null || oldRunningEngineId === runningTask.engineId) {
              // 更新运行中任务信息
              this.doAddRunningTask(taskInfo);
              this.unlock();
            } else {
              _logUtils.debugInfo(['重新获取的运行中engineId: {} 和旧的engineId: {} 不同 重新尝试加入运行', runningTask.engineId, oldRunningEngineId]);
              this.unlock();
              return this.tryAddRunningTask();
            }
          } else {
            _logUtils.warnInfo('更新运行中任务信息失败');
          }
        }
        _logUtils.debugInfo('运行状态校验成功，执行后续功能');
        return true;
      } else {
        var runningEngines = this.tryGetRunningEngines();
        if (runningEngines === null || runningEngines.find(function (v) {
          return v.id === runningTask.engineId || runningTask.source === v.getSource() + '';
        })) {
          _logUtils.debugInfo('运行中任务执行正常');
        } else {
          if (this.lock(3)) {
            _logUtils.warnInfo('运行中任务已经异常关闭，直接删除运行中标记');
            // 清空运行中数据
            this.getStorage().put(RUNNING_KEY, '');
            this.unlock();
            // 然后重新加入运行中任务
            return this.tryAddRunningTask();
          } else {
            _logUtils.warnInfo('运行中任务已经异常关闭，删除运行中标记失败');
          }
        }
        return false;
      }
    } else {
      if (this.lock()) {
        _logUtils.debugInfo('当前无任务等待，直接执行：' + JSON.stringify(taskInfo));
        this.doAddRunningTask(taskInfo);
        this.unlock();
        return true;
      } else {
        _logUtils.errorInfo('获取锁失败，无法继续执行任务：' + JSON.stringify(taskInfo));
        return false;
      }
    }
  };
  this.addAwaitTask = function (taskInfo) {
    if (this.isTaskInQueue(taskInfo)) {
      _logUtils.debugInfo(['任务：{} 已经在队列中，不再加入任务队列', JSON.stringify(taskInfo)]);
      return;
    }
    var storedArrayStr = this.getStorage().get(WAITING_QUEUE_KEY);
    var storedArray = null;
    if (storedArrayStr) {
      storedArray = JSON.parse(storedArrayStr);
    } else {
      storedArray = [];
    }
    storedArray.push(taskInfo);
    if (this.lock(3)) {
      this.getStorage().put(WAITING_QUEUE_KEY, JSON.stringify(storedArray));
      this.distinctAwaitTasks();
      this.unlock();
    } else {
      _logUtils.errorInfo('添加等待任务队列失败，获取写锁失败，任务信息：' + JSON.stringify(taskInfo));
      this.setUpAutoStart(taskInfo.source, 10);
    }
  };
  this.distinctAwaitTasks = function () {
    if (this.lock()) {
      var storedArrayStr = this.getStorage().get(WAITING_QUEUE_KEY);
      var storedArray = null;
      if (storedArrayStr) {
        storedArray = JSON.parse(storedArrayStr);
      } else {
        storedArray = [];
      }
      if (storedArray && storedArray.length > 0) {
        _logUtils.debugInfo('去重复前的任务队列：' + storedArrayStr);
        var distinctArray = [];
        storedArray.forEach(function (task) {
          if (distinctArray.map(function (r) {
            return r.source;
          }).indexOf(task.source) < 0) {
            distinctArray.push(task);
          }
        });
        var distinctArrayStr = JSON.stringify(distinctArray);
        _logUtils.debugInfo('去重复后的任务队列：' + distinctArrayStr);
        this.getStorage().put(WAITING_QUEUE_KEY, distinctArrayStr);
      } else {
        _logUtils.debugInfo('队列小于等于1 不需要去重:' + storedArrayStr);
      }
      this.unlock();
    }
  };

  /**
   * 判断任务是否已经加入到了等待队列
   */
  this.isTaskInQueue = function (taskInfo) {
    this.distinctAwaitTasks();
    var storedArrayStr = this.getStorage().get(WAITING_QUEUE_KEY);
    var storedArray = null;
    if (storedArrayStr) {
      storedArray = JSON.parse(storedArrayStr);
    } else {
      storedArray = [];
    }
    taskInfo = taskInfo || this.getCurrentTaskInfo();
    if (storedArray.length > 0 && storedArray.find(function (task) {
      return task.source === taskInfo.source;
    })) {
      return true;
    } else {
      return false;
    }
  };

  /**
   * 尝试获取运行中的脚本引擎
   * 每200~300毫秒获取一次
   */
  this.tryGetRunningEngines = function (tryCount) {
    var runningEngines = null;
    tryCount = tryCount || 5;
    while (runningEngines === null && tryCount-- > 0) {
      // engines.all()有并发问题，尝试多次获取
      try {
        runningEngines = engines.all();
      } catch (e) {
        // 延迟随机时间200~300毫秒
        sleep(200 + parseInt(Math.random() * 100 % 100));
      }
    }
    if (runningEngines === null) {
      _logUtils.warnInfo('获取运行中脚本引擎失败');
    }
    return runningEngines;
  };

  /**
   * 对运行中任务进行续期
   * 
   * @param {number} time 分钟 默认15
   */
  this.renewalRunningTask = function (time, keepRunning) {
    time = time || 15;
    var taskInfo = this.getCurrentTaskInfo();
    var runningTask = this.getRunningStatus();
    if (runningTask) {
      // 运行中任务不是自己，无法续期，直接退出当前脚本
      // 可能存在的情况是续期操作太晚，导致其他脚本已经进入运行状态，必须让出执行权
      if (runningTask.source !== taskInfo.source || runningTask.engineId !== taskInfo.engineId) {
        _logUtils.debugInfo(['当前运行中任务和当前任务不同，无法续期 运行中任务：{} {}', runningTask.engineId, runningTask.source]);
        _logUtils.debugInfo(['当前任务：{} {}', taskInfo.engineId, taskInfo.source]);
        if (keepRunning) {
          _logUtils.debugInfo(['保持运行，直到获取任务锁']);
        } else {
          _logUtils.debugInfo(['将当前任务加入等待队列']);
          this.addAwaitTask(taskInfo);
          exit();
        }
      }
    }
    // 没有运行中的任务或者运行中的任务是自身，直接续期
    taskInfo.timeout = new Date().getTime() + time * 60000;
    if (this.lock()) {
      this.getStorage().put(RUNNING_KEY, JSON.stringify(taskInfo));
      this.unlock();
    }
  };
}
module.exports = new RunningQueueDispatcher();

/***/ }),

/***/ "./src/lib/prototype/StorageFactory.js":
/*!*********************************************!*\
  !*** ./src/lib/prototype/StorageFactory.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**********
 * 
 * 封装了storages的操作，所有数据保存在 config.js中定义的storage_name + '_runtime' 下，可以通过后续的功能直接导出这些缓存数据
 * 简化了创建和更新的过程，同时可以实现缓存的自动过期，仅当天有效
 * 0.外部使用时通过require('@/lib/prototype/StorageFactory')获取当前脚本全局的storageFactory
 * 1.初始化 storageFactory.initFactoryByKey(${KEY}, ${defaultValue}) 指定key和默认值 初始化时已存在数据不会被覆盖
 * 2.获取数据 通过key来获取 storageFactory.getValueByKey(${KEY}[,true]) 通过指定key获取缓存数据，默认缓存数据仅当天有效，失效后返回默认值；第二个参数可选，代表不需要将缓存数据过期
 * 3.更新数据 storageFactory.updateValueByKey(${KEY}, ${VALUE}) 更新新的值到KEY对应的缓存中
 * 
 * 注意事项：该方法不是线程安全的 尽量不要在多线程中获取和更新值
 **********/

var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  _storage_name = _require.storage_name;
var _logUtils = __webpack_require__(/*! @/lib/prototype/LogUtils */ "./src/lib/prototype/LogUtils.js");
var formatDate = __webpack_require__(/*! @/lib/DateUtil.js */ "./src/lib/DateUtil.js");
var RUNTIME_STORAGE = _storage_name + "_runtime";

/**
 * 内部实际保存的Storage对象
 * 
 * @param {string} key 
 */
function BaseStorageFactory(key) {
  this.key = key || 'EMPTY_DEFAULT_KEY';
  this.defaultValue = {};
  this.runtimeStorage = storages.create(RUNTIME_STORAGE);

  /**
   * 更新数据
   * @param {object} value 
   */
  this.updateStorageValue = function (value) {
    var today = formatDate(new Date(), 'yyyy-MM-dd');
    this.runtimeStorage.put(this.key, JSON.stringify({
      date: today,
      value: value
    }));
  };

  /**
   * 获取缓存中当天的数据，和时间相关，当天不存在则创建默认值
   */
  this.getTodaysRuntimeStorage = function () {
    var today = formatDate(new Date(), 'yyyy-MM-dd');
    var existStoreObjStr = this.runtimeStorage.get(this.key);
    if (existStoreObjStr) {
      try {
        var existStoreObj = JSON.parse(existStoreObjStr);
        if (existStoreObj.date === today) {
          // 兼容旧数据
          if (typeof existStoreObj.value === 'undefined') {
            var value = {};
            Object.assign(value, existStoreObj);
            existStoreObj.value = value;
          }
          return existStoreObj.value;
        }
      } catch (e) {
        _logUtils.errorInfo(["解析JSON数据失败, key:{} value:{} error:{}", this.key, existStoreObjStr, e]);
      }
    }
    return this.createDefaultStorage(today);
  };

  /**
   * 获取缓存中的数据，和时间无关，不存在则创建默认值
   */
  this.getRuntimeStorage = function () {
    var existStoreObjStr = this.runtimeStorage.get(this.key);
    if (existStoreObjStr) {
      try {
        var existStoreObj = JSON.parse(existStoreObjStr);
        // 兼容旧数据
        if (typeof existStoreObj.value === 'undefined') {
          var value = {};
          Object.assign(value, existStoreObj);
          existStoreObj.value = value;
        }
        return existStoreObj.value;
      } catch (e) {
        _logUtils.errorInfo(["解析JSON数据失败, key:{} value:{} error:{}", this.key, existStoreObjStr, e]);
      }
    }
    return this.createDefaultStorage(formatDate(new Date(), 'yyyy-MM-dd'));
  };

  /**
   * 创建默认数据
   * 
   * @param {string} date 日期
   */
  this.createDefaultStorage = function (date) {
    var initStore = this.getDefaultStorageValue(date);
    this.runtimeStorage.put(this.key, JSON.stringify(initStore));
    return initStore.value;
  };

  /**
   * 获取初始值
   *
   * @param {string} date 指定日期
   */
  this.getDefaultStorageValue = function (date) {
    return {
      date: date,
      value: this.defaultValue
    };
  };

  /**
   * 
   * @param {*} defaultValue 
   */
  this.setDefault = function (defaultValue) {
    if (typeof defaultValue !== 'undefined') {
      this.defaultValue = defaultValue;
    }
    return this;
  };
}

/**
 * 对外使用的StorageFactory 通过KEY获取缓存的storage数据
 */
var StorageFactory = function StorageFactory() {
  /**
   * 当前已经持久化的storage信息
   */
  this.persistedStorageFactory = {};

  /**
   * 初始化一个存储对象
   * 
   * @param {string} key 缓存键
   * @param {object} defaultValue 初始值
   */
  this.initFactoryByKey = function (key, defaultValue) {
    this.persistedStorageFactory[key] = new BaseStorageFactory(key).setDefault(defaultValue);
    _logUtils.debugForDev(['key:{} 当前值：{}', key, JSON.stringify(this.persistedStorageFactory[key].getRuntimeStorage())]);
  };

  /**
   * 通过缓存键获取缓存对象，不存在时会自动初始化 此时默认值为{}
   * 
   * @param {string} key 
   * @returns 
   */
  this.getFactoryByKey = function (key) {
    var factory = this.persistedStorageFactory[key];
    if (!factory) {
      factory = new BaseStorageFactory(key);
      this.persistedStorageFactory[key] = factory;
    }
    return factory;
  };

  /**
   * 根据key获取对应的值
   * 
   * @param {string} key 
   * @param {boolean} fullTime 是否和时间无关的数据，如果不传或者false获取当天的数据
   */
  this.getValueByKey = function (key, fullTime) {
    if (fullTime) {
      return this.getFactoryByKey(key).getRuntimeStorage();
    } else {
      return this.getFactoryByKey(key).getTodaysRuntimeStorage();
    }
  };

  /**
   * 更新数据
   * 
   * @param {string} key 
   * @param {object} value 
   */
  this.updateValueByKey = function (key, value) {
    return this.getFactoryByKey(key).updateStorageValue(value);
  };
};
module.exports = new StorageFactory();

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

/***/ "./src/lib/prototype/WidgetUtils.js":
/*!******************************************!*\
  !*** ./src/lib/prototype/WidgetUtils.js ***!
  \******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-05 09:12:00
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-07 21:22:08
 * @Description: 
 */
// 针对当前项目的公共方法封装，方便不同项目之间直接同步BaseCommonFunction不用再对比内容
var _ProjectWidgetUtils = __webpack_require__(/*! @/lib/ProjectWidgetUtils.js */ "./src/lib/ProjectWidgetUtils.js");
module.exports = new _ProjectWidgetUtils();

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

/***/ "result_adapter":
/*!********************************************!*\
  !*** external "require('result_adapter')" ***!
  \********************************************/
/***/ ((module) => {

"use strict";
module.exports = require('result_adapter');

/***/ }),

/***/ "./node_modules/@babel/runtime/helpers/defineProperty.js":
/*!***************************************************************!*\
  !*** ./node_modules/@babel/runtime/helpers/defineProperty.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var toPropertyKey = __webpack_require__(/*! ./toPropertyKey.js */ "./node_modules/@babel/runtime/helpers/toPropertyKey.js");
function _defineProperty(e, r, t) {
  return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[r] = t, e;
}
module.exports = _defineProperty, module.exports.__esModule = true, module.exports["default"] = module.exports;

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

/***/ "./node_modules/@babel/runtime/helpers/toPrimitive.js":
/*!************************************************************!*\
  !*** ./node_modules/@babel/runtime/helpers/toPrimitive.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var _typeof = (__webpack_require__(/*! ./typeof.js */ "./node_modules/@babel/runtime/helpers/typeof.js")["default"]);
function toPrimitive(t, r) {
  if ("object" != _typeof(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != _typeof(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
module.exports = toPrimitive, module.exports.__esModule = true, module.exports["default"] = module.exports;

/***/ }),

/***/ "./node_modules/@babel/runtime/helpers/toPropertyKey.js":
/*!**************************************************************!*\
  !*** ./node_modules/@babel/runtime/helpers/toPropertyKey.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var _typeof = (__webpack_require__(/*! ./typeof.js */ "./node_modules/@babel/runtime/helpers/typeof.js")["default"]);
var toPrimitive = __webpack_require__(/*! ./toPrimitive.js */ "./node_modules/@babel/runtime/helpers/toPrimitive.js");
function toPropertyKey(t) {
  var i = toPrimitive(t, "string");
  return "symbol" == _typeof(i) ? i : i + "";
}
module.exports = toPropertyKey, module.exports.__esModule = true, module.exports["default"] = module.exports;

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
/*!****************************!*\
  !*** ./src/独立工具/挂起所有脚本.js ***!
  \****************************/
importClass(java.io.StringWriter);
importClass(java.io.StringReader);
importClass(java.io.PrintWriter);
importClass(java.io.BufferedReader);
importClass(java.lang.StringBuilder);
importClass(android.view.View);
var currentEngine = engines.myEngine();
var runningEngines = engines.all();
var runningSize = runningEngines.length;
var currentSource = currentEngine.getSource() + '';
if (runningSize > 1) {
  runningEngines.forEach(function (compareEngine) {
    var compareSource = compareEngine.getSource() + '';
    if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
      // 强制关闭同名的脚本
      compareEngine.forceStop();
    }
  });
}
var _require = __webpack_require__(/*! @/simpleConfig.js */ "./src/simpleConfig.js"),
  config = _require.config,
  _storage_name = _require.storage_name;
config.save_log_file = false;
config.async_save_log_file = false;
var commonFunction = __webpack_require__(/*! @/lib/prototype/CommonFunction */ "./src/lib/prototype/CommonFunction.js");
var runningQueueDispatcher = __webpack_require__(/*! @/lib/prototype/RunningQueueDispatcher */ "./src/lib/prototype/RunningQueueDispatcher.js");
runningQueueDispatcher.addRunningTask();
var stop = false;
commonFunction.registerOnEngineRemoved(function () {
  runningQueueDispatcher.removeRunningTask();
  stop = true;
});
var floatyWindow = floaty.rawWindow("\n  <horizontal>\n    <text id=\"text\" fontFamily=\"sans-serif-medium\" typeface=\"normal\" text=\"\u5F53\u524D\u4EFB\u52A1: 0\" textSize=\"12dp\"></text>\n  </horizontal>\n");
setInterval(function () {
  runningQueueDispatcher.showDispatchStatus();
  runningQueueDispatcher.renewalRunningTask();
  var waitingQueueStr = runningQueueDispatcher.getStorage().get("waitingQueue");
  if (waitingQueueStr) {
    var waitingQueue = JSON.parse(waitingQueueStr);
    if (waitingQueue && waitingQueue.length > 0) {
      ui.run(function () {
        floatyWindow.text.setText('当前等待中任务：' + waitingQueue.length);
      });
    } else {
      ui.run(function () {
        floatyWindow.text.setText('当前等待中任务：0');
      });
    }
  }
}, 30000);
ui.run(function () {
  floatyWindow.text.setText('当前等待中任务：0');
});
/******/ })()
;