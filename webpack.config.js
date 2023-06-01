import Dotenv from 'dotenv-webpack'
import path from 'path'
import {VueLoaderPlugin} from 'vue-loader'

import magic from './util/path.js'

const {__dirname} = magic(import.meta.url)

export default {
  mode: 'development',
  entry: './src/app.js',
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.vue/,
        loader: 'vue-loader',
      },
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader',
        ],
      },
    ],
  },
  plugins: [
    new Dotenv(),
    new VueLoaderPlugin(),
  ],
}
