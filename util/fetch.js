import {route} from './factory.js'
import {copy, isArray, isNotNull} from './functions.js'
import store from './store.js'

const requests = {
  get: [],
  post: [],
  put: [],
  del: [],
}

const setGetRequests = (x) => requests.get = x
const setPostRequests = (x) => requests.post = x
const setPutRequests = (x) => requests.put = x
const setDeleteRequests = (x) => requests.del = x

const __fetch = (url, settings, params, callback) => {
  store.set('inputErrors', [])
  return fetch(route(url, params), copy({
    headers: {'Content-Type': 'application/json'},
  }, settings))
    .then(async (response) => {
      const {status} = response
      let json = await response.json()
      if (isArray(json)) {
        json = {data: json}
      }
      return copy({status}, json)
    })
    .then((response) => handle(response, callback))
    .then(() => {
      ({
        'GET': setGetRequests(requests.get.filter((x) => x.url !== url)),
        'POST': setPostRequests(requests.post.filter((x) => x.url !== url)),
        'PUT': setPutRequests(requests.put.filter((x) => x.url !== url)),
        'DELETE': setDeleteRequests(requests.del.filter((x) => x.url !== url)),
      })[settings.method]
    })
}

const get = (url, params, callback = () => false, isLoading = true) => {
  store.set('isLoading', isLoading)
  setGetRequests(requests.get.concat([{url, params, callback}]))
  return __fetch(url, {method: 'GET'}, params, callback)
}

const post = (url, data, callback = () => false, isSaving = true) => {
  store.set('isSaving', isSaving)
  setPostRequests(requests.post.concat([{data, url, callback}]))
  return __fetch(url, {body: JSON.stringify(data), method: 'POST'}, null, callback)
}

const put = (url, data, callback = () => false, isSaving = true) => {
  store.set('isSaving', isSaving)
  setPutRequests(requests.put.concat([{data, url, callback}]))
  return __fetch(url, {body: JSON.stringify(data), method: 'PUT'}, null, callback)
}

const del = (url, data, callback = () => false, isSaving = true) => {
  store.set('isSaving', isSaving)
  setDeleteRequests(requests.del.concat([{data, url, callback}]))
  return __fetch(url, {body: JSON.stringify(data), method: 'DELETE'}, null, callback)
}

const messages = {
  200: 'Success',
  401: 'Unathorized',
  422: 'Validation Error',
  500: 'Error',
}

const handle = (response, callback) => {
  const {status, message = messages[status], data} = response
  switch (status) {
    case 200:
      success(message)
      callback(response)
      break;
    case 401:
      fail(message)
      break;
    case 422:
      fail(message)
      store.set('inputErrors', data)
      break;
    case 500:
      fail(`Server Error: ${message}`)
      break;
    default:
      throw new Error('Unknown response code')
      break;
  }
  always()
}

const success = (message) => {
  store.set('inputErrors', [])
  if (isNotNull(message)) {
    store.set('message', {kind: 'success', message})
  }
}

const fail = (message) => {
  store.set('message', {kind: 'error', message})
}

const always = () => {
  store.set('isSaving', false)
  store.set('isLoading', false)
  setTimeout(() => store.set('message', null), 4 * 1000)
}

export default {get, post, put, del}
