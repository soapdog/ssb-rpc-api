# ssb-rpc-api

This is a plugin for [scuttlebutt](http://scuttlebot.io) that provides an HTTP API to `sbot`. 

## Access Control
The idea behind this plugin is that only authorized apps can connect to `sbot`. Each app is identified by its _HTTP Origin Header_ and a file at `.ssb/allowed_apps.json` contains entries for all the apps that tried contacting `sbot` through this plugin. Example:

```
{
  "apps": [
          {
                  "origin": "http://localhost:3000",
                  "permission": "granted"
          },
          {
                  "origin": "http://localhost:8000",
                  "permission": "denied"
          },
          {
                  "origin": "http://localhost:8001",
                  "permission": "retry"
          }
  ]
}
```

There are three states that an app can be in this file &mdash; granted, denied, retry &mdash; with the later meaning that the application is allowed to retry contacting `sbot` later. This is the default state that an app entries into the file.

## Service Discovery
Web Clients don't have access to UDP Broadcasts, so they can't find the running `sbot`. The listener below can help with that:

  http://localhost:8989/get-address

That will trigger an custom event on the application that is running the _sbot_ with type `server-discovery-request`, the application is should emit its own `server-discovery-response` granting, deniying or delaying access, for example, below is a piece of code that only grants access to requests that are comming from a Firefox Add-on:

```
eventEmitter.on('server-discovery-request', (origin) => {
  if (origin.startsWith("moz-extension://")) {
    eventEmitter.emit('server-discovery-response', origin, "granted")
  } else {
    eventEmitter.emit('server-discovery-response', origin, "denied")
  }
})
```
If that code is running on your application, and you make AJAX requests from an add-on, you may see the following responses:

```
soapdog@SurfaceFafi ~> curl --header "Origin: moz-extension://aaaa" "http://localhost:8989/get-address"
{"status":"pending","retry":1500,"handled":true}⏎                                                                                  soapdog@SurfaceFafi ~> curl --header "Origin: moz-extension://aaaa" "http://localhost:8989/get-address"
{"status":"granted","server":"ws://localhost:8989~shs:gaQSAIhRg="}
```

This way, application (and in my case add-on) developers have a way to run multiple ssb apps without everyone starting their own _sbot_. I made this because when developing pure web applications or add-ons like [patchfox](https://github.com/soapdog/patchfox) we don't have access to UDP broadcasts so it becomes quite hard to find if any application started `sbot` already. If this plugin is adopted by other projects, then it might be easier to one day ship a single `sbot` server that all apps can use.

The app is using a file called `allowed_apps.json` in `.ssb` to persist application access list data. Editing the content of this file will alter the response of this API. For each app there are two fields: `origin` and `permission`, the later can be `granted`, `retry`, `denied`.

This code has been extracted and modified from [minbay](https://github.com/evbogue/minbay/) by [ev](https://github.com/evbogue/).

### Spec of responses
That URL responds with JSON.

#### Pending request

This is returned while the sbot is awaiting permission from the user to reply with the address.

```
{
  "status": "pending",
  "retry": 1500
}
```

#### Permission granted

This returns the _websocket address with the public key in it. It will only return that after the user has granted perms.

```
{
  "status": "granted",
  "server": "ws://blablabla"
}
```

#### Permission denied

If the user declines sharing the address and key, then:

```
{
  "status": "denied"
}
```

## RPC API
The plugin exposes a series of APIs from `sbot` as URLs. If an app tries to use any of the URLs below and is not marked as `granted` in `allowed_apps.json`, the plugin will reply with status code 403 and:

```
{"status":"denied","msg":"only accepts requests from authorized apps"}
```

### whoami
**URL:** http://localhost:8989/api/whoami

**Example response:**
```
{"id":"@NoTARealUserKey0372085=.ed25519"}
```

### Usage

For example:

```
var rpc = require('ssb-rpc-api')
var eventEmitter = serverDiscovery.eventEmitter

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
  .use(rpc)
  .use(require('ssb-names'))
```

# Other useful APIs
The plugin also exports:

* `getApps()`: which returns an array of app permissions.
* `saveAppRecord(origin, permission)`: which records the permission for a given origin in the JSON file.
* `isAppAllowed(origin)`: returns the permission for a given origin. 

# License 
MIT