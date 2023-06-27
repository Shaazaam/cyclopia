import Dotenv from 'dotenv-webpack'
import {VueLoaderPlugin} from 'vue-loader'

import common from './webpack.common.js'
import {copy} from './util/functions.js'

export default copy(common, {
  mode: 'production',
  plugins: [
    new Dotenv({
      path: './.env.prod',
    }),
    new VueLoaderPlugin(),
  ],
})
