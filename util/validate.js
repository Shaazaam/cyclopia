import * as dal from './dal.js'
import {snakeCasedToUpperCasedWord} from './formatters.js'
import {
  copy,
  isEmail,
  isNotNull,
  isNotEmpty,
  isNumber,
  isObjectEmpty,
  isString,
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
})[field] || snakeCasedToUpperCasedWord(field)

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

const setRules = (kind, params = []) => ({kind, params})

export const validate = (input, fieldRules) =>
  Object.entries(fieldRules).reduce((agg, [field, rules]) => {
    const results = rules.reduce((agg, {kind, params}) =>
      agg = agg.concat((test[kind])(input[field], params) ? [] : [(messages[kind])(formatField(field), params)]), []
    )
    if (isNotEmpty(results)) {
      agg = copy(agg, {[field]: results})
    }
    return agg
  }, {})
export const isValid = (results) => isObjectEmpty(results)

export const belongsTo = (user) => setRules(BELONGS_TO, [user])
export const email = () => setRules(EMAIL)
export const equalTo = (value) => setRules(EQUAL_TO, [value])
export const exists = (table, column) => setRules(EXISTS, [table, column])
export const greaterThan = (value) => setRules(GREATER_THAN, [value])
export const greaterThanEqualTo = (value) => setRules(GREATER_THAN_EQUAL_TO, [value])
export const lessThan = (value) => setRules(LESS_THAN, [value])
export const lessThanEqualTo = (value) => setRules(LESS_THAN_EQUAL_TO, [value])
export const max = (value) => setRules(MAX, [value])
export const memberOf = (array) => setRules(MEMBER_OF, array)
export const min = (value) => setRules(MIN, [value])
export const notExists = (table, column) => setRules(NOT_EXISTS, [table, column])
export const numeric = () => setRules(NUMERIC)
export const numericWhole = () => setRules(NUMERIC_WHOLE)
export const regex = (expression) => setRules(REGEX, [expression])
export const required = () => setRules(REQUIRED)
