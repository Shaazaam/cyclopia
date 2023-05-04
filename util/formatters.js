import {isNotEmpty} from './functions.js'

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

export const booleanToServer = (boolean) => boolean ? 1 : 0
export const booleanToClient = (boolean) => boolean === 1 ? true : boolean === 0 ? false : undefined

// Query strings
export const encodeArrayAsQueryString = (key, array) => '?' + array.map((v) => encodeURIComponent(key) + '=' + encodeURIComponent(v)).join('&')
export const encodeObjectAsQueryString = (object) => '?' + new URLSearchParams(object).toString()
