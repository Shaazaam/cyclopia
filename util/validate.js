import bcrypt from 'bcrypt'

import * as dal from './dal.js'
import {
  copy,
  isEmail,
  isNotArray,
  isNotNull,
  isNotEmpty,
  isNotUndefined,
  isNumber,
  isObjectEmpty,
  isString,
  snakeCasedToUpperCasedWords,
} from './functions.js'

const BELONGS_TO = 'bt'
const EMAIL = 'em'
const EQUAL_TO = 'et'
const EXISTS = 'ex'
const GREATER_THAN = 'gt'
const GREATER_THAN_EQUAL_TO = 'gte'
const LESS_THAN = 'lt'
const LESS_THAN_EQUAL_TO = 'lte'
const MAX = 'max'
const MEMBER_OF = 'mo'
const MIN = 'min'
const NOT_EXISTS = 'exn'
const NUMERIC = 'num'
const NUMERIC_WHOLE = 'wnum'
const PASSWORD = 'pw'
const REGEX = 'reg'
const REQUIRED = 'req'

const messages = ({
  bt: (field, [user_id]) => `${field} must belong to you`,
  em: (field) => `${field} must be a valid email`,
  et: (field, [param]) => `${field} must be equal to ${param}`,
  ex: (field, [table, columns]) => `${field} does not exist`,
  exn: (field, [table, columns]) => `${field} already exists`,
  gt: (field, [param]) => `${field} must be greater than ${param}`,
  gte: (field, [param]) => `${field} must be greater than or equal to ${param}`,
  lt: (field, [param]) => `${field} must be less than ${param}`,
  lte: (field, [param]) => `${field} must be less than or equal to ${param}`,
  max: (field, [param]) => messages.lte(field, [param]),
  min: (field, [param]) => messages.gte(field, [param]),
  mo: (field, params) => `${field} must be one of the following values: ${params.join(', ')}`,
  num: (field) => `${field} must be a number`,
  pw: (field) => `${field} is invalid`,
  reg: (field, [expression]) => `${field} must match an expression?`,
  req: (field) => `${field} is required`,
  wnum: (field) => `${field} must be a whole number`,
})

const formatField = (field) => ({
  'send_deck_id': 'Deck',
  'recieved_deck_id': 'Deck',
  'user_id': 'User',
})[field] || snakeCasedToUpperCasedWords(field)

const test = ({
  bt: async (value, [table, column, user_id]) => true,
  em: async (value) => isEmail(value),
  et: async (value, [param]) => (isNumber(value) && value === param) || (isString(value) && value.lenth === param),
  ex: async (values, [table, columns]) => (await dal.exists(table, isNotArray(columns) ? [columns] : columns, values)),
  exn: async (values, [table, columns]) => ! (await test.ex(values, [table, columns])),
  gt: async (value, [param]) => isNumber(value) && value > param,
  gte: async (value, [param]) => isNumber(value) && value >= param,
  lt: async (value, [param]) => isNumber(value) && value < param,
  lte: async (value, [param]) => isNumber(value) && value <= param,
  max: async (value, [param]) => (isNumber(value) && test.lte(value, [param])) || (isString(value) && test.lte(value.length, [param])),
  min: async (value, [param]) => (isNumber(value) && test.gte(value, [param])) || (isString(value) && test.gte(value.length, [param])),
  mo: async (value, params) => params.includes(value),
  num: async (value) => isNumber(value),
  pw: async ({password, hash}) => isNotUndefined(hash) && (await bcrypt.compare(password, hash)),
  reg: async (value, [expression]) => isNotNull(value.match(expression)),
  req: async (value) => isNotNull(value) && isNotEmpty(value),
  wnum: async (value) => isNumber(value) && value % 1 !== 0,
})

const setRules = (kind, params = [], callback = null, message = null) => ({kind, params, callback, message})

export const validate = async (input, fieldRules) =>
  await Object.entries(fieldRules).reduce(async (agg, [field, rules]) => {
    const results = await rules.reduce(async (agg, {kind, params, callback, message}) => {
      const valid = await (isNotNull(callback) ? callback(input, params) : (test[kind])(input[field], params))
      return (await agg).concat(valid ? [] : [message = message || (messages[kind])(formatField(field), params)])
    }, [])
    if (isNotEmpty(results)) {
      agg = copy((await agg), {[field]: results})
    }
    return agg
  }, {})
export const isValid = (results) => isObjectEmpty(results)

export const belongsTo = (user, callback, message) => setRules(BELONGS_TO, [user], callback, message)
export const email = (callback, message) => setRules(EMAIL, callback, message)
export const equalTo = (value, callback, message) => setRules(EQUAL_TO, [value], callback, message)
export const exists = (table, columns, callback, message) => setRules(EXISTS, [table, columns], callback, message)
export const greaterThan = (value, callback, message) => setRules(GREATER_THAN, [value], callback, message)
export const greaterThanEqualTo = (value, callback, message) => setRules(GREATER_THAN_EQUAL_TO, [value], callback, message)
export const lessThan = (value, callback, message) => setRules(LESS_THAN, [value], callback, message)
export const lessThanEqualTo = (value, callback, message) => setRules(LESS_THAN_EQUAL_TO, [value], callback, message)
export const max = (value, callback, message) => setRules(MAX, [value], callback, message)
export const memberOf = (array, callback, message) => setRules(MEMBER_OF, array, callback, message)
export const min = (value, callback, message) => setRules(MIN, [value], callback, message)
export const notExists = (table, columns, callback, message) => setRules(NOT_EXISTS, [table, columns], callback, message)
export const numeric = (callback, message) => setRules(NUMERIC, callback, message)
export const numericWhole = (callback, message) => setRules(NUMERIC_WHOLE, callback, message)
export const password = (callback, message) => setRules(PASSWORD, callback, message)
export const regex = (expression, callback, message) => setRules(REGEX, [expression], callback, message)
export const required = (callback, message) => setRules(REQUIRED, callback, message)
