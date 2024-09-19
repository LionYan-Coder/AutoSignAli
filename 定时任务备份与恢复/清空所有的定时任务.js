/******/ (() => { // webpackBootstrap
/*!************************************!*\
  !*** ./src/定时任务备份与恢复/清空所有的定时任务.js ***!
  \************************************/
/*
 * @Author: TonyJiangWJ
 * @Date: 2020-08-27 13:53:34
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-27 13:54:21
 * @Description: 
 */
var packageName = context.getPackageName() === 'org.autojs.autojsm' ? org.autojs.autojsm : org.autojs.autojs;
var isPro = context.getPackageName() === 'org.autojs.autojspro';
var TimedTaskManager = packageName.timing.TimedTaskManager;
if (isPro) {
  packageName = com.stardust.autojs.core;
  TimedTaskManager = packageName.timing.TimedTaskManager.Companion;
}
var timedTasks = TimedTaskManager.getInstance().getAllTasksAsList();
var intentTasks = TimedTaskManager.getInstance().getAllIntentTasksAsList();
log('exist timedTasks: ' + JSON.stringify(timedTasks));
log('exist intentTasks: ' + JSON.stringify(intentTasks));
var taskManager = TimedTaskManager.getInstance();
for (var i = 0; i < timedTasks.size(); i++) {
  var task = timedTasks.get(i);
  taskManager[isPro ? 'removeTaskSync' : 'removeTask'](task);
}
for (var _i = 0; _i < intentTasks.size(); _i++) {
  var _task = intentTasks.get(_i);
  taskManager[isPro ? 'removeTaskSync' : 'removeTask'](_task);
}
toastLog('done!');
/******/ })()
;