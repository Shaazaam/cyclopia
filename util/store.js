import {isFunction, isNotUndefined, copy} from './functions.js'

let store = {}

const set = (key, value, callback = false) => {
  const onUpdate = isNotUndefined(store[key]) && isFunction(store[key].onUpdate)
    ? store[key].onUpdate
    : callback
  store[key] = copy({value}, {onUpdate})
  return isFunction(onUpdate) ? store[key].onUpdate(key, value) : value
}

const get = (key) => store[key].value

export default {set, get}
