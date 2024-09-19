/******/ (() => { // webpackBootstrap
/*!************************************!*\
  !*** ./src/定时任务备份与恢复/备份所有的定时任务.js ***!
  \************************************/
/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-18 13:28:10
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-27 13:31:59
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
log('timedTasks: ' + JSON.stringify(timedTasks));
log('intentTasks: ' + JSON.stringify(intentTasks));
var tasks = {
  timedTasks: timedTasks,
  intentTasks: intentTasks
};
files.write(files.cwd() + "/tasks.json", JSON.stringify(tasks));
toast('done!');
/******/ })()
;