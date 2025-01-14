
/**
 * 执行webpack文件，传入配置，实现打包
 */
const webpack = require('./lib/webpack');
const options = require('./webpack.config');

new webpack(options).run()
console.log(1)