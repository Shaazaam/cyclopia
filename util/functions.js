// Comparison Functions, Equality
export const strictEquality = (a, b) => a === b
export const looseEquality = (a, b) => a == b
export const containsAll = (a, b) => b.every((item) => a.includes(item))
export const sameMembers = (a, b) => containsAll(a, b) && containsAll(b, a)
export const isEquivalent = (a, b) => {
  const x = isArray(a) ? a : Object.keys(a)
  const y = isArray(b) ? b : Object.keys(b)

  if (!strictEquality(x.length, y.length)) {
    return false
  }

  return x.every((prop) => {
    if ((isNotNull(a[prop]) && isObject(a[prop])) && (isNotNull(b[prop]) && isObject(b[prop]))) {
      return isEquivalent(a[prop], b[prop])
    }
    return strictEquality(a[prop], b[prop])
  })
}
export const isNotEquivalent = (a, b) => !isEquivalent(a, b)

// Comparison Functions, Type Checking
export const isType = (x, type) => strictEquality(typeof x, type)
export const isNumber = (x) => isType(x, 'number')
export const isNotNumber = (x) => !isNumber(x)
export const isString = (x) => isType(x, 'string')
export const isBoolean = (x) => isType(x, 'boolean')
export const isSymbol = (x) => isType(x, 'symbol')
export const isUndefined = (x) => isType(x, 'undefined')
export const isNotUndefined = (x) => !isUndefined(x)
export const isObject = (x) => isType(x, 'object')
export const isNotObject = (x) => !isObject(x)
export const isFunction = (x) => isType(x, 'function')
export const isArray = (x) => Array.isArray(x)
export const isNotArray = (x) => !isArray(x)
export const isArrayOfObjects = (x) => x.reduce((agg, cur) => agg && isObject(cur) && isNotArray(cur), true)
export const isEmpty = (x) => isNotNumber(x) && (!x || strictEquality(x.length, 0))
export const isNotEmpty = (x) => !isEmpty(x)
export const isObjectEmpty = (x) => strictEquality(Object.entries(x).length, 0)
export const isNotObjectEmpty = (x) => !isObjectEmpty(x)
export const isNull = (x) => strictEquality(x, null)
export const isNotNull = (x) => !isNull(x)
export const isNaN = (x = Number(x)) => x !== x
export const isNotNaN = (x) => !isNaN(x)

// Comparison Functions, Regexp
export const isPhoneNumber = (string) => isNotNull(string.match(/^(\d{1}[\.\-\s]|)(\(\d{3}\)|\d{3})([\.\-\s]|)\d{3}[\.\-\s]\d{4}$/g))
export const isDate = (string) => isNotNaN(Date.parse(string)) && isNotNull(string.match(/^\d{2,4}([-/])\d{2}\1\d{2,4}(\s\d{2}(:)\d{2}(\3)?([ap]m|\d{2}))?$/g))
export const isEmail = (string) => isNotNull(
  string.match(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/g)
)

// Array Functions
export const arrayDiff = (left, right) => left.filter((n) => !right.includes(n))
export const updateByIndex = (array, index, value) => {
  const ret = array.slice(0)
  ret[index] = Object.assign(ret[index], value)
  return ret
}
export const insertByIndex = (array, index, value) => [...array.slice(0, index), value, ...array.slice(index)]
export const upsertByIndex = (array, index, value) => isUndefined(array[index])
  ? insertByIndex(array, index, value)
  : updateByIndex(array, index, value)
export const removeByIndex = (array, index) => array.filter((_, i) => i != index)
export const removeByValue = (array, value) => array.filter((item) => item !== value)
export const indexArray = (array, item, comparison) => {
  const index = array.findIndex((value) => comparison(value, item)) + 1
  return array[index === array.length ? 0 : index]
}
export const chunk = (array, size) => array.reduce((agg, _, i) => {
  if (i % size === 0) {
    agg.push(array.slice(i, i + size))
  }
  return agg
}, [])
// In "experimental" status with MDN, test later
//export const group = (array, criteria) => array.group(isFunction(criteria) ? criteria : ({criteria}) => criteria)
export const groupBy = (array, criteria) => {
  return array.reduce((object, item) => {
    const key = isFunction(criteria) ? criteria(item) : item[criteria]
    if (isUndefined(object[key])) {
      object[key] = []
    }

    object[key] = object[key].concat(item)
    return object
  }, {})
}
export const mergeArrays = (arrays) => [...new Set(...arrays)]
export const sortString = (a, b) => (a.toUpperCase() > b.toUpperCase() ? 1 : a.toUpperCase() < b.toUpperCase() ? -1 : 0)
export const sortDate = (a, b) => a.diff(b)
export const sortNumber = (a, b) => a - b
export const sortStringsWithNulls = (a, b) => isNull(a) - isNull(b) || +(a > b) || -(a < b)
//this will coerce, but expects: [number|string-like-number, ...number|string-like-number]
export const sum = (array) => array.reduce((sum, item) => sum + Number(item), 0)

// Object Functions
export const intersect = (initial, compare) => {
  const [initialKeys, compareKeys] = [Object.keys(initial), Object.keys(compare)]
  const [first, next] = initialKeys.length > compareKeys.length ? [compareKeys, initial] : [initialKeys, compare]
  return first.filter((key) => key in next)
}
// "Simple" refers to non-nested properties
export const invertSimpleObject = (object) => {
  const ret = {}
  for (let property in object) {
    ret[object[property]] = property
  }
  return ret
}
export const diffSimpleEquivalentObjects = (left, right) => Object.keys(left).filter((key) => left[key] !== right[key])

//Array of Object Functions
export const findKeyByValue = (item, value) => Object.keys(item).find((key) => strictEquality(value, item[key]))
export const findIndexByKeyValue = (array, key, value) => array.findIndex((item) => strictEquality(item[key], value))
export const mergeObjectArrays = (a, b, prop) => a.filter((x) => !b.find((y) => x[prop] === y[prop])).concat(b)
export const extract = (array) => array.reduce((agg, cur) => agg.concat(Object.values(cur)), [])

const merge = (deep, object, extended) => {
  //const isArrayOfObjects = (value) => value.reduce((agg, cur) => agg && isObjectExt(cur), true)
  const isObjectExt = (value) => isObject(value) && isNotNull(value) && isNotArray(value)
  const isArrayExt = (value) => isArray(value) && isNotEmpty(value)
  const isObjectArray = (value) => isArray(value) && isArrayOfObjects(value)
  for (const property in object) {
    /*extended[property] = object[property]
    if (deep) {
      if (isObjectExt(object[property])) {
        extended[property] = extend(true, extended[property], object[property])
      }
      if (isArrayExt(object[property])) {
        extended[property] = mergeArrays([extended[property], object[property]])
      }
      if (isObjectArray(object[property])) {
        extended[property] = mergeObjectArrays(extended[property], object[property], property)
      }
    }*/
    extended[property] = deep && isObjectExt(object[property]) ? extend(true, extended[property], object[property]) : object[property]
  }
  return extended
}
export const extend = (...parameters) => {
  let extended = {}
  let deep = false
  let i = 0

  if (isBoolean(parameters[0])) {
    deep = parameters[0]
    i++
  }

  for (i; i < parameters.length; i++) {
    extended = merge(deep, parameters[i], extended)
  }

  return extended
}
export const deepExtend = (...parameters) => extend(true, ...parameters)
export const copy = (...parameters) => extend({}, ...parameters)
export const deepCopy = (...parameters) => extend(true, {}, ...parameters)

export const findObjectPropertyByArrayValue = (object, value) => {
  const found = undefined
  for (let property in object) {
    if (isArray(object[property]) && object[property].includes(value)) {
      return property
    }
  }
  return found
}
export const removeKeys = (object, keys) => Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)))

// Utilities
export const characterRange = (start, end) => [...Array(end.charCodeAt(0) - start.charCodeAt(0) + 1).keys()].map((i) => String.fromCharCode(start.charCodeAt(0) + i))
export const numericRange = (start, stop, step = 1) => Array.from({length: (stop - start) / step + 1}, (_, i) => start + (i * step))

// Basic string formatting
export const stringOrNoDataState = (string, state = 'N/A') => isNotEmpty(string) ? string : state
export const truncateString = (string, limit) => {
  const elipsis = '...'
  if (string.length > limit) {
    return string.substring(0, limit - elipsis.length) + elipsis
  }
  return string
}
export const stripSpaces = (string) => string.toLowerCase().replace(/\s{1,}/g, '')
export const toStudlyCase = (string) => string.slice(0, 1).toUpperCase() + string.slice(1)
export const toUpperCaseWords = (string) => string.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
export const toCamelCase = (string) => string.replace(/(?:^\w|[A-Z]|\b\w)/g, (match, index) =>
  index === 0 ? match.toLowerCase() : match.toUpperCase()
).replace(/\s+/g, '')
export const camelCasedToUpperCasedWords = (string) => toUpperCaseWords(string.replace(/([A-Z])/g, ' $&'))
export const snakeCasedToUpperCasedWords = (string) => toUpperCaseWords(string.replace(/\_/g, ' '))
export const kebabCasedToUpperCasedWords = (string) => toUpperCaseWords(string.replace(/\-/g, ' '))

// Strings with defined formats
export const currency = (integer, decimals = 2) => Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
}).format(integer)
export const percentage = (number) => Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'always',
}).format(number)
export const numberFormat = (number) => new Intl.NumberFormat().format(number)
export const localeDateTime = (datetime) => new Date(datetime).toLocaleString()

// Conversion functions
export const toNumber = (string) => parseInt(string, 10)

// Query strings
export const encodeArrayAsQueryString = (key, array) => '?' + array.map((v) => encodeURIComponent(key) + '=' + encodeURIComponent(v)).join('&')
export const encodeObjectAsQueryString = (object) => '?' + new URLSearchParams(object).toString()
