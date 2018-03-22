const events = require('events')
const fs = require('fs')
const path = require('path')
const config = require('ssb-config/inject')(process.env.ssb_appname)
const eventEmitter = new events.EventEmitter()

const allowedAppsFile = path.join(config.path, 'allowed_apps.json')

const createConfigFile = () => {
  if (!fs.existsSync(allowedAppsFile)) {
    let templateObj = {
      apps: []
    }

    fs.writeFileSync(allowedAppsFile, JSON.stringify(templateObj))
  }
}

const getApps = () => {
  createConfigFile()
  let data = JSON.parse(fs.readFileSync(allowedAppsFile))
  return data.apps
}


const isAppAllowed = (origin) => {
  createConfigFile()
  let data = JSON.parse(fs.readFileSync(allowedAppsFile))

  const finder = item => {
    if (typeof item.origin == "undefined") {
      return false
    }
    return origin == item.origin
  }

  let app = data.apps.find(finder)

  if (typeof app == "undefined") {
    saveAppRecord(origin, "retry")
    return "retry"
  }

  return app.permission
}


const saveAppRecord = (origin, permission) => {
  createConfigFile()
  let data = JSON.parse(fs.readFileSync(allowedAppsFile))

  const finder = item => {
    if (typeof item.origin == "undefined") {
      return false
    }
    return origin == item.origin
  }

  let appIndex = data.apps.findIndex(finder)

  if (appIndex == -1) {
    data.apps.push({ origin, permission })
  } else {
    data.apps[appIndex] = { origin, permission }
  }

  fs.writeFileSync(allowedAppsFile, JSON.stringify(data))
}


eventEmitter.on('server-discovery-response',
  (origin, perm) => saveAppRecord(origin, perm)
)

function replyWithPending(res, req) {
  let handled = eventEmitter.emit('server-discovery-request', req.headers.origin)
  res.end(JSON.stringify({
    status: "pending",
    retry: 1500,
    handled
  }))
}

function replyWithAddress(res, sbot) {
  res.end(JSON.stringify({
    status: "granted",
    server: sbot.ws.getAddress()
  }))
}

function replyWithDenial(res) {
  res.end(JSON.stringify({
    status: "denied"
  }))
}

module.exports = {
  name: 'server-discovery',
  version: '1.0.0',
  eventEmitter: eventEmitter,
  getApps,
  saveAppRecord,
  isAppAllowed,
  init: function (sbot) {
    sbot.ws.use(function (req, res, next) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      if (req.url === '/get-address') {
        if (!req.headers.origin) {
          replyWithDenial(res)
        }
        console.log("######### Discovery Request #############", req.headers.origin)

        switch (isAppAllowed(req.headers.origin)) {
          case "retry":
            replyWithPending(res, req)
            break
          case "granted":
            replyWithAddress(res, sbot)
            break
          case "denied":
            replyWithDenial(res)
            break
        }
      } else {
        next()
      }
    })
  }
}

