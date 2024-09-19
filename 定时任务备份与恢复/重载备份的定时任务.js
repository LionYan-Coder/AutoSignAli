/******/ (() => { // webpackBootstrap
/*!************************************!*\
  !*** ./src/定时任务备份与恢复/重载备份的定时任务.js ***!
  \************************************/
/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-18 13:28:10
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-27 13:52:52
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
var removeExists = true;
if (removeExists) {
  for (var i = 0; i < timedTasks.size(); i++) {
    var task = timedTasks.get(i);
    taskManager[isPro ? 'removeTaskSync' : 'removeTask'](task);
  }
  for (var _i = 0; _i < intentTasks.size(); _i++) {
    var _task = intentTasks.get(_i);
    taskManager[isPro ? 'removeTaskSync' : 'removeTask'](_task);
  }
}
var allTasks = JSON.parse(files.read(files.cwd() + "/tasks.json"));
for (var _i2 = 0; _i2 < allTasks.timedTasks.length; _i2++) {
  var _task2 = allTasks.timedTasks[_i2];
  taskManager[isPro ? 'addTaskSync' : 'addTask'](convertTimeTask(_task2));
}
for (var _i3 = 0; _i3 < allTasks.intentTasks.length; _i3++) {
  var _task3 = allTasks.intentTasks[_i3];
  taskManager[isPro ? 'addTaskSync' : 'addTask'](convertIntentTask(_task3));
}
toast('done!');

//
function convertTimeTask(task) {
  var timedTask = new packageName.timing.TimedTask();
  if (task.scriptPath) {
    timedTask.setTimeFlag(task.timeFlag);
    timedTask.setDelay(task.delay);
    timedTask.setInterval(task.interval);
    timedTask.setLoopTimes(task.loopTimes);
    timedTask.setMillis(task.millis);
    timedTask.setScriptPath(task.scriptPath);
    timedTask.setScheduled(false);
  } else {
    timedTask.setTimeFlag(task.mTimeFlag);
    timedTask.setDelay(task.mDelay);
    timedTask.setInterval(task.mInterval);
    timedTask.setLoopTimes(task.mLoopTimes);
    timedTask.setMillis(task.mMillis);
    timedTask.setScriptPath(task.mScriptPath);
    timedTask.setScheduled(false);
  }
  return timedTask;
}
function convertIntentTask(task) {
  var intentTask = new packageName.timing.IntentTask();
  intentTask.setScriptPath(task.mScriptPath);
  intentTask.setAction(task.mAction);
  intentTask.setCategory(task.mCategory);
  intentTask.setDataType(task.mDataType);
  intentTask.setLocal(task.mLocal);
  return intentTask;
}
/******/ })()
;