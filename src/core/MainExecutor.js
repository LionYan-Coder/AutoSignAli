
let { config } = require('@/simpleConfig')
let { developSaving } = require('@/lib/prototype/LogUtils')

function isNotEmpty(v) {
  return !(typeof v === 'undefined' || v === null || v === '')
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function largeRadomSleep() {
  let delay = getRandomDelay(2000, 3500)
  sleep(delay)
}

function smallRadomSleep() {
  let delay = getRandomDelay(500, 1000)
  sleep(delay)
}

function writeAccountLog(text) {
  developSaving(`${text}\n`, `未成功登录账户`)
}


function verifySwipe() {
  let device_width = config.device_width
  let device_height = config.device_height
  var startX = device_width / 2;
  var startY = device_height / 2;
  var endX = device_width / 2 + getRandomDelay(-70, 70);
  var endY = getRandomDelay(235, 444);
  var midX = (startX + endX) / 2 + getRandomDelay(-50, 50);
  var midY = (startY + endY) / 2 + getRandomDelay(-50, 50);
  press(startX, startY, getRandomDelay(2000, 3500))
  gesture(getRandomDelay(1500, 3000), [startX, startY], [midX, midY], [endX, endY]);
  largeRadomSleep()
}


function verifyLongPress() {
  let device_width = config.device_width
  let device_height = config.device_height
  gesture(3000, [device_width / 2, device_height / 2], [device_width / 2, device_height / 2 + 5], [device_width / 2, device_height / 2 - 10], [device_width / 2, device_height / 2 - 15]);
  largeRadomSleep()
}

function verifyBallGesture() {
  if (!requestScreenCapture()) {
    toast("请求截图失败");
    exit();
  }

  console.log("开始脚本校验中")
  console.hide()
  smallRadomSleep()
  let device_width = config.device_width
  let device_height = config.device_height
  console.log(`屏幕分辨率：${device_width}*${device_height}`)
  var basketColor = "#f2f4f5";  // 篮筐的颜色
  var ballColor = "#ff5400";    // 篮球的颜色


  let img = captureScreen()
  var ballPoint = findColorInRegion(img, ballColor, 0, 0, device_width, device_height * 0.7)
  var basketPoint = findColorInRegion(img, basketColor, 0, device_height * 0.7, device_width, device_height * 0.3 - 20);
  if (ballPoint != null && basketPoint != null) {
    console.log(`篮球位置： ${ballPoint.x} ${ballPoint.y}`)
    console.log(`篮筐位置： ${basketPoint.x} ${basketPoint.y}`)

    // 计算滑动距离和方向
    var startX = ballPoint.x;
    var startY = ballPoint.y;
    var endX = basketPoint.x;
    var endY = basketPoint.y;

    var midX = (startX + endX) / 2 + getRandomDelay(-50, 50);
    var midY = (startY + endY) / 2 + getRandomDelay(-50, 50);
    smallRadomSleep()
    console.log("模拟手势滑动中", [startX, startY], [midX, midY], [endX, endY])
    gesture(getRandomDelay(1000, 3000), [startX, startY], [midX, midY], [endX, endY]);
    largeRadomSleep()
    console.show()
    return true
  } else {
    largeRadomSleep()
    console.show()
    return false
  }
}

function verifyPassPort(passportNumber) {
  console.verbose(`--------开始验证护照 ${passportNumber} ---------`)
  console.hide()
  let passport_len = textMatches(/验证护照号后6位|验证护照号后4位/).findOne().text()
  if (passport_len == "验证护照号后4位") {
    setText(passportNumber.slice(0, 4));
  } else {
    setText(passportNumber);
  }

  smallRadomSleep()
  console.show()
  console.info(`检测护照验证是否成功`)
  let success = textContains("错误").findOne(getRandomDelay(2000, 5000))
  return success == null
}


function passVerify() {
  try {
    let verifyType = textMatches(/请将球滑向篮球框中|请用手指按住屏幕完成验证|伸出一根手指放在屏幕上，手机振动时从屏幕下方往上划动完成验证|请摇晃手机完成验证/).findOne().text()
    console.verbose(`--------当前操作验证为 ${verifyType} ---------`)
    console.hide()
    if (verifyType == "请将球滑向篮球框中") {
      let success = verifyBallGesture()
      if (!success) {
        console.error(`手势验证失败即将切换下一个账户`)
        return false;
      }
    } else if (verifyType == "请用手指按住屏幕完成验证") {
      id("com.zoloz.hummer:id/btn_left").findOne().click()
      text("确定").findOne().click()
      text("下一步").findOne()
      click("下一步")
      passVerify()
    } else if (verifyType == '伸出一根手指放在屏幕上，手机振动时从屏幕下方往上划动完成验证') {
      verifySwipe();
    } else if (verifyType == '请摇晃手机完成验证') {
      id("com.zoloz.hummer:id/btn_left").findOne().click()
      text("确定").findOne().click()
      text("下一步").findOne()
      click("下一步")
      passVerify()
    }

  } catch (error) {
    console.error(error.toString())
    return false;
  } finally {
    console.show()
  }

  return true;

}


function checkAccountConfig() {
  let password = config.account_password
  let account_list_str = config.account_list
  if (!isNotEmpty(password)) {
    console.error("请配置主密码")
    toastLog("请配置主密码")
    exit()
  }
  if (!isNotEmpty(account_list_str)) {
    console.error("请配置账户")
    toastLog("请配置账户")
    exit()
  }
}

function login(account) {
  let ext_list = account.split(":")
  let phoneNumber = ''
  let password = config.account_password
  let passport = config.account_passport
  phoneNumber = ext_list[0]
  if (isNotEmpty(ext_list[1])) {
    password = ext_list[1]
  }
  if (isNotEmpty(ext_list[2])) {
    passport = ext_list[2]
  }

  console.verbose(`当前账户配置: ${account}, 手机号：${phoneNumber} 密码： ${password} 护照后6位：${passport}`)
  app.startActivity(app.intent({
    action: "VIEW",
    data: "alipayqr://platformapi/startapp?appId=20000027",
  }));
  console.verbose("进入切换账号页面")
  largeRadomSleep()
  let device_width = config.device_width
  let device_height = config.device_height
  var startX = device_width / 2;
  var startY = device_height - 100;
  var endx = device_width / 2;
  var endY = 200;
  swipe(startX, startY, endx, endY, 1000)
  smallRadomSleep()
  text("登录其他账号").findOne().parent().click()
  text("下一步").findOne()
  setText(0, phoneNumber)
  smallRadomSleep()
  click("下一步")
  console.warn("--------检测是否弹出服务协议---------")
  let privacy = textContains("服务协议").findOne(3000)
  if (privacy != null) {
    console.verbose("同意服务协议及隐私保护")
    text("同意").findOne().click()
    smallRadomSleep()
  }
  let stepType = textMatches(/操作验证|更多选项|提示/).findOne().text()
  console.verbose(`--------当前操作为 ${stepType} ---------`)
  if (stepType == '操作验证') {
    let success = passVerify()  // 接收 passVerify 的返回值
    if (!success) {
      return false  // 验证失败，返回 false
    }
  }

  if (stepType == "提示") {
    writeAccountLog(`${account} 原因：未知验证`)
    return false
  }

  var obj = textMatches(/短信验证码登录|指纹登录|登录/).findOne().text()
  if (obj == "短信验证码登录" || obj == "指纹登录") {
    smallRadomSleep()
    textMatches(/换个验证方式|换个方式登录|更多选项/).findOne()
    // clickCenter(text("换个方式登录").findOne(2000))
    // clickCenter(text("换个验证方式").findOne(2000))
    textContains("更多选项").findOne(2000).click()
    text("密码").findOne()
    sleep(400)
    click("密码", 0)
    smallRadomSleep()
    setText(0, password);
    smallRadomSleep()
    textContains("登录").findOne().parent().click()
  } else {
    smallRadomSleep()
    setText(0, password);
    smallRadomSleep()
    textContains("登录").findOne().parent().click()
  }

  let text1 = textMatches(/身份验证|登录其他账号|我的|首页|重新输入|版本更新/).findOne().text()
  console.verbose(`--------当前操作为 ${text1} ---------`)
  if (text1 == "身份验证") {
    let text2 = textMatches(/换一个验证方式|输入短信验证码/).findOne().text()
    console.verbose(`--------当前身份验证为 ${text2} ---------`)
    if (text2 == '换一个验证方式') {
      let success = verifyPassPort(passport)
      if (!success) {
        writeAccountLog(`${account} 原因：护照身份验证失败`)
        console.error("身份验证失败即将切换下一个账户")
        return false  // 验证失败，返回 false
      }
    } else if (text2 == "输入短信验证码") {
      writeAccountLog(`${account} 原因：需要输入短信验证码`)
      console.error("身份验证失败即将切换下一个账户")
      return false  // 验证失败，返回 false
    }

  } else if (text1 == "重新输入") {
    console.error("密码错误，即将切换下一个账户")
    writeAccountLog(`${account} 原因：密码错误`)
    click("重新输入")
    return false  // 验证失败，返回 false
  } else if (text1 == "版本更新") {
    text("稍后再说").findOne()
    click("稍后再说")
  }
  console.info("--------登录成功即将切换到下一个用户---------")
  return true  // 登录成功，返回 true
}

function mainLoop() {
  console.show()
  checkAccountConfig()

  try {
    let account_list = config.account_list.split("\n")
    for (let index = 0; index < account_list.length; index++) {
      const account = account_list[index];
      let success = login(account)
      if (!success) {
        continue  // 如果登录失败，跳过当前账户，继续下一个
      }
    }
  } catch (error) {
    console.verbose(error.toString())
    toast(error.toString())
    exit()
  }
}

function MainExecutor() {

  this.exec = function () {
    mainLoop()
  }
}
module.exports = new MainExecutor()