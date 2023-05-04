import {copy} from './functions.js'

export const Serializers = {
  serialize: (object, mapping) => copy(object, mapping.serialize(object)),
  deserialize: (object, mapping) => copy(object, mapping.deserialize(object)),
}
