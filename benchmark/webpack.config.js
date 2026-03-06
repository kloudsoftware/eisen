const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    entry: './src/main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.js',
    },
    resolve: {
        extensions: ['.js', '.mjs'],
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()],
    },
};
