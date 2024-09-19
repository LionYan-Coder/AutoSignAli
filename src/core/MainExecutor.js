
let FloatyInstance = require('@/lib/prototype/FloatyUtil')
let { config } = require('@/simpleConfig')

function mainLoop () {
}

function MainExecutor() {

  this.exec = function () {
    mainLoop()
  }
}
module.exports = new MainExecutor()