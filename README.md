# ssb-server-discovery

This is a plugin for [scuttlebutt](http://scuttlebot.io) that makes it easier for applications to find the running `sbot`. It provides a listener at:

  http://localhost:8989/get-address

That will return the _websocket_ address for the running `sbot` as can be seen below:

```
soapdog@SurfaceFafi ~> curl "http://localhost:8989/get-address"
ws://localhost:8989~shs:gaQw6zDEADBEEFINhRg=⏎ 
```

This way, application (and in my case add-on) developers have a way to run multiple ssb apps without everyone starting their own _sbot_. I made this because when developing pure web applications or add-ons like [patchfox](https://github.com/soapdog/patchfox) we don't have access to UDP broadcasts so it becomes quite hard to find if any application started `sbot` already. If this plugin is adopted by other projects, then it might be easier to one day ship a single `sbot` server that all apps can use.

This code has been extracted from [minbay](https://github.com/evbogue/minbay/) by [ev](https://github.com/evbogue/).

# Usage

For example:

```
var createSbot = require('scuttlebot')
  .use(require('scuttlebot/plugins/master'))
  .use(require('scuttlebot/plugins/gossip'))
  .use(require('scuttlebot/plugins/replicate'))
  .use(require('ssb-friends'))
  .use(require('ssb-blobs'))
  .use(require('scuttlebot/plugins/invite'))
  .use(require('scuttlebot/plugins/local'))
  .use(require('ssb-ooo'))
  .use(require('ssb-ebt'))
  .use(require('ssb-ws'))
  .use(require('ssb-server-discovery'))
  .use(require('ssb-names'))
```

# License 
MIT