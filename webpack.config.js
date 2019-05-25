const path = require('path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin');
const StyleLintPlugin = require('stylelint-webpack-plugin');

var baseConfig = {
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          query: {
            presets: ['es2015']
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  devServer: {
    historyApiFallback: {
      index: 'tutorial/ae_bridgelibrary/tutorial.html'
    },
    noInfo: true
  },
  performance: {
    hints: false
  },
  devtool: 'source-map',
  plugins: []
}

var testConfig = Object.assign({}, baseConfig, {
  entry: [
    'babel-polyfill',
    './spec/bridge-htmldialog.spec.js',
    './spec/bridge-webdialog.spec.js',
    './src/spec/bridge.spec.js',
    './src/spec/requesthandler-htmldialog.spec.js',
    './src/spec/requesthandler-webdialog.spec.js'
  ],
  output: {
    filename: 'spec.bundle.js',
    path: path.resolve(__dirname, 'build'),
  }
});

var compiledIntoAppConfig = Object.assign({}, baseConfig, {
  entry: [
    'babel-polyfill',
    './src/js/main.js'
  ],
  output: {
    filename: 'main.bundle.js',
    path: path.resolve(__dirname, 'build'),
  }
});

var standaloneLibraryConfig = Object.assign({}, baseConfig, {
  entry: [
    'babel-polyfill',
    './src/js/bridge.js'
  ],
  output: {
    filename: 'bridge.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'Bridge',
    libraryExport: 'default',
    libraryTarget: 'umd',
  },
  plugins: [
    new CopyPlugin([
      {
        from: path.resolve(__dirname, 'dist/bridge.js'),
        to: path.resolve(__dirname, 'tutorial/ae_bridgelibrary/bridge.js')
      },
      {
        from: path.resolve(__dirname, 'dist/bridge.js'),
        to: path.resolve(__dirname, 'sample/sample_extension/js')
      }
    ]),
  ]
});

if (process.env.NODE_ENV === 'production') {
  module.exports = [
    compiledIntoAppConfig,
    standaloneLibraryConfig
  ].map((config) => {
    config.mode = 'production'
    config.optimization = Object.assign({}, config.optimization, {
      minimize: true,
      moduleIds: 'named',
      chunkIds: 'named'
    });
    return config;
  });
} else {
  standaloneLibraryConfig.optimization = {
    minimize: false,
    moduleIds: 'named',
    chunkIds: 'named'
  }
  testConfig.optimization = {
    minimize: false,
    moduleIds: 'named',
    chunkIds: 'named'
  }
  standaloneLibraryConfig.devtool = 'source-map' // For debugging
  module.exports = [
    compiledIntoAppConfig,
    standaloneLibraryConfig,
    testConfig
  ];
}
