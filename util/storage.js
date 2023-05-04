import {isNotEmpty} from './functions.js'

const set = (key, value) => window.localStorage.setItem(key, JSON.stringify(value))
const get = (key) => JSON.parse(window.localStorage.getItem(key))
const remove = (key) => window.localStorage.removeItem(key)

const isAvailable = () => {
  try {
    set('__test__', '__test__')
    remove('__test__')
    return true
  } catch (e) {
    return e instanceof DOMException && isNotEmpty(window.localStorage) && (
      // everything except Firefox
      e.code === 22 ||
      // Firefox
      e.code === 1014 ||
      // test name field too, because code might not be present
      // everything except Firefox
      e.name === 'QuotaExceededError' ||
      // Firefox
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )
  }
}

isAvailable()

export default {set, get, remove}
