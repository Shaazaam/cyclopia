import * as dal from './dal.js'
import {
  copy,
  isEmail,
  isNotNull,
  isNotEmpty,
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
const REGEX = 'reg'
const REQUIRED = 'req'

const messages = ({
  bt: (field, [user_id]) => `${field} must belong to you`,
  em: (field) => `${field} must be a valid email`,
  et: (field, [param]) => `${field} must be equal to ${param}`,
  ex: (field, [table, columns]) => `${field} must be an existing record`,
  exn: (field, [table, columns]) => `${field} must be a unique record`,
  gt: (field, [param]) => `${field} must be greater than ${param}`,
  gte: (field, [param]) => `${field} must be greater than or equal to ${param}`,
  lt: (field, [param]) => `${field} must be less than ${param}`,
  lte: (field, [param]) => `${field} must be less than or equal to ${param}`,
  max: (field, [param]) => messages.lte(field, [param]),
  min: (field, [param]) => messages.gte(field, [param]),
  mo: (field, params) => `${field} must be one of the following values: ${params.join(', ')}`,
  num: (field) => `${field} must be a number`,
  wnum: (field) => `${field} must be a whole number`,
  reg: (field, [expression]) => `${field} must match an expression?`,
  req: (field) => `${field} is required`,
})

const formatField = (field) => ({
  'send_deck_id': 'Deck',
  'recieved_deck_id': 'Deck',
  'user_id': 'User',
})[field] || snakeCasedToUpperCasedWords(field)

const test = ({
  bt: (value, [table, column, user_id]) => true,
  em: (value) => isEmail(value),
  et: (value, [param]) => (isNumber(value) && value === param) || (isString(value) && value.lenth === param),
  ex: (values, [table, columns]) => dal.exists(table, columns, values),
  exn: (values, [table, columns]) => ! test.ex(values, [table, columns]),
  gt: (value, [param]) => isNumber(value) && value > param,
  gte: (value, [param]) => isNumber(value) && value >= param,
  lt: (value, [param]) => isNumber(value) && value < param,
  lte: (value, [param]) => isNumber(value) && value <= param,
  max: (value, [param]) => (isNumber(value) && test.lte(value, [param])) || (isString(value) && test.lte(value.length, [param])),
  min: (value, [param]) => (isNumber(value) && test.gte(value, [param])) || (isString(value) && test.gte(value.length, [param])),
  mo: (value, params) => params.includes(value),
  num: (value) => isNumber(value),
  wnum: (value) => isNumber(value) && value % 1 !== 0,
  reg: (value, [expression]) => isNotNull(value.match(expression)),
  req: (value) => isNotNull(value) && isNotEmpty(value),
})

const setRules = (kind, params = [], callback, message) => ({kind, params, callback, message})

export const validate = (input, fieldRules) =>
  Object.entries(fieldRules).reduce((agg, [field, rules]) => {
    const results = rules.reduce((agg, {kind, params, callback, message}) => {
      const valid = isNotNull(callback) ? callback(input, params) : (test[kind])(input[field], params)
      return agg = agg.concat(valid ? [] : [message || (messages[kind])(formatField(field), params)])
    }, [])
    if (isNotEmpty(results)) {
      agg = copy(agg, {[field]: results})
    }
    return agg
  }, {})
export const isValid = (results) => isObjectEmpty(results)

export const belongsTo = (user, callback = null, message = null) => setRules(BELONGS_TO, [user], callback, message)
export const email = (callback = null, message = null) => setRules(EMAIL, callback, message)
export const equalTo = (value, callback = null, message = null) => setRules(EQUAL_TO, [value], callback, message)
export const exists = (table, column, callback = null, message = null) => setRules(EXISTS, [table, column], callback, message)
export const greaterThan = (value, callback = null, message = null) => setRules(GREATER_THAN, [value], callback, message)
export const greaterThanEqualTo = (value, callback = null, message = null) => setRules(GREATER_THAN_EQUAL_TO, [value], callback, message)
export const lessThan = (value, callback = null, message = null) => setRules(LESS_THAN, [value], callback, message)
export const lessThanEqualTo = (value, callback = null, message = null) => setRules(LESS_THAN_EQUAL_TO, [value], callback, message)
export const max = (value, callback = null, message = null) => setRules(MAX, [value], callback, message)
export const memberOf = (array, callback = null, message = null) => setRules(MEMBER_OF, array, callback, message)
export const min = (value, callback = null, message = null) => setRules(MIN, [value], callback, message)
export const notExists = (table, column, callback = null, message = null) => setRules(NOT_EXISTS, [table, column], callback, message)
export const numeric = (callback = null, message = null) => setRules(NUMERIC, callback, message)
export const numericWhole = (callback = null, message = null) => setRules(NUMERIC_WHOLE, callback, message)
export const regex = (expression, callback = null, message = null) => setRules(REGEX, [expression], callback, message)
export const required = (callback = null, message = null) => setRules(REQUIRED, callback, message)
