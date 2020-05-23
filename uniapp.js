
import urltools from 'url'
import qs from 'querystring'

function getBridge () {
  return {} // todo
}

function getRandomKey() {
  return `${Math.random().toString(36).substring(2)}_${(new Date()).valueOf()}`
}

export class GlobalBridge {
  _bridges = {}
  _listener = {}
  regist(onResolve, onReject, predata) {
    const key = getRandomKey()
    this._bridges[key] = { payload: null, complete: false, predata: predata }
    this._listener[key] = { onResolve, onReject }
    return key
  }

  predata(key) {
    if (key in this._bridges) {
      return this._bridges[key].predata
    }

    return {}
  }

  check(key) {
    if (key in this._bridges && this._bridges[key].complete) return true
    return false
  }

  fire(key) {
    if (this._listener[key]) {
      this._listener[key].onResolve(this._bridges[key].payload)
      delete this._bridges[key]
      delete this._listener[key]
      return true
    }

    return false
  }

  remove(key) {
    if (this._listener[key]) {
      this._listener[key].onReject(new Error('[ignore]: cancel bridge'))
      delete this._bridges[key]
      delete this._listener[key]
      return true
    }

    return false
  }

  install(key, payload) {
    if (key in this._bridges) {
      this._bridges[key] = {
        payload: payload,
        complete: true
      }
      return true
    }

    return false
  }
}

function Bridge (obj) {
  const { onLoad: baseOnLoad, onShow: baseOnShow, onUnload: baseOnUnload } = obj

  function onLoad (query, ...rest) {
    // #ifdef MP-WEIXIN
    for (const [key, value] of Object.entries(query)) {
      query[decodeURIComponent(key)] = decodeURIComponent(value)
    }
    // #endif
    if (query.$BRIDGE_USER_KEY) {
      this.$PRE_BRIDGE_USER_KEY = query.$BRIDGE_USER_KEY
      this.$hasbridge = true
      Object.assign(query, getBridge().predata(this.$PRE_BRIDGE_USER_KEY))
      delete query.$BRIDGE_USER_KEY
    } else {
      this.$hasbridge = false
    }

    if (baseOnLoad) baseOnLoad.apply(this, [query, ...rest])
  }

  function onShow (...args) {
    args = args || []
    if (this.$BRIDGE_USER_KEY && getBridge().check(this.$BRIDGE_USER_KEY)) {
      args.push({ $BRIDGE_SCOPE: true, $BRIDGE_USER_KEY: this.$BRIDGE_USER_KEY })
      getBridge().fire(this.$BRIDGE_USER_KEY)
      delete this.$BRIDGE_USER_KEY
    }

    if (baseOnShow) baseOnShow.apply(this, args)
  }

  function onUnload (...args) {
    if (this.$BRIDGE_USER_KEY) getBridge().remove(this.$BRIDGE_USER_KEY)

    if (baseOnUnload) baseOnUnload.apply(this.args)
  }

  function $callpage (url, params = {}) {
    return new Promise((resolve, reject) => {
      if (this.$BRIDGE_USER_KEY) getBridge().remove(this.$BRIDGE_USER_KEY)
      const preData = {}

      Object.keys(params).forEach((key) => {
        if (params.hasOwnProperty(key) && typeof params[key] === 'object' && !!params[key]) {
          preData[key] = params[key]
          delete params[key]
        }
      })

      this.$BRIDGE_USER_KEY = getBridge().regist(resolve, reject, preData)
      const urlObj = urltools.parse(url)
      const query = qs.parse(url.query)
      Object.assign(query, params, { $BRIDGE_USER_KEY: this.$BRIDGE_USER_KEY })
      urlObj.query = query
      uni.navigateTo({ url: urltools.format(urlObj) })
    })
  }

  function $backpage (payload) {
    if (this.$PRE_BRIDGE_USER_KEY && !getBridge().check(this.$PRE_BRIDGE_USER_KEY)) {
      getBridge().install(this.$PRE_BRIDGE_USER_KEY, payload)
      delete this.$PRE_BRIDGE_USER_KEY
    }

    uni.navigateBack()
  }

  if (!obj.methods) obj.methods = {}
  obj.methods.$callpage = $callpage
  obj.methods.$backpage = $backpage

  return Object.assign({}, obj, { onLoad, onShow, onUnload })
}

export default Bridge
