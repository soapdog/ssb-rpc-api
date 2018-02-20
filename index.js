const events = require('events')
const eventEmitter = new events.EventEmitter()
const data = new Map()

eventEmitter.on('server-discovery-response',
  (origin, perm) => data.set(origin, perm)
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
  init: function (sbot) {
    sbot.ws.use(function (req, res, next) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      if (req.url === '/get-address') {
        if (!req.headers.origin) {
          replyWithDenial(res)
        }

        if (!data.has(req.headers.origin)) {
          console.log("######### Discovery Request #############", req.headers.origin)
          replyWithPending(res, req)
        } else {
          let perm = data.get(req.headers.origin)
          if (perm) {
            replyWithAddress(res, sbot)
          } else {
            replyWithDenial(res)
          }
        }
      } else {
        next()
      }
    })
  }
}

