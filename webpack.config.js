import path from 'path'
import { fileURLToPath } from 'url'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  entry: './src/js/main.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/html/index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/css', to: 'css' },
        { from: 'src/img', to: 'img' }
      ]
    })
  ],
  resolve: {
    extensions: ['.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/js/core'),
      '@services': path.resolve(__dirname, 'src/js/services'),
      '@utils': path.resolve(__dirname, 'src/js/utils'),
      '@ui': path.resolve(__dirname, 'src/js/ui')
    }
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 9000
  }
}