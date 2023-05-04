import {isNull} from './functions.js'

const getTagContentByName = (name) => {
  const tag = document.querySelector(`meta[name="${name}"]`)
  return isNull(tag) ? tag : tag.getAttribute('content')
}

export const xCSRFToken = () => getTagContentByName('csrf-token')
