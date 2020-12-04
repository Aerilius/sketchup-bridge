const path = require('path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin');
const StyleLintPlugin = require('stylelint-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

var baseConfig = {
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/env',
                {
                  'targets': {
                    'ie': '11',
                    'chrome': '52', // Chromium in Sketchup 2017
                  },
                  //'useBuiltIns': 'usage', // automatically include polyfills for used JavaScript features (e.g. Promise)
                  'useBuiltIns': 'entry', // Not 'usage' because it significantly increases size.
                  'corejs': 'core-js@3',
                  'exclude': [
                    '@babel/plugin-transform-regenerator', // This comes with Promise polyfill, but increases size. We don't need support for async/await.
                  ],
                },
              ],
            ],
            plugins: [
              '@babel/plugin-transform-runtime',
            ],
          },
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
    'core-js/stable/promise', // Include Promise polyfill
    './src/js/main.js'
  ],
  output: {
    filename: 'main.bundle.js',
    path: path.resolve(__dirname, 'build'),
  }
});

var standaloneLibraryConfig = Object.assign({}, baseConfig, {
  entry: [
    'core-js/stable/promise', // Include Promise polyfill
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
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'dist/bridge.js'),
          to: path.resolve(__dirname, 'tutorial/ae_bridgelibrary/bridge.js')
        },
        {
          from: path.resolve(__dirname, 'dist/bridge.js'),
          to: path.resolve(__dirname, 'sample/sample_extension/js')
        },
      ],
    }),
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
    config.plugins = config.plugins.concat([
      new TerserPlugin({
        terserOptions: {
          ecma: 5,
          mangle: {
            reserved: ['Sketchup']
          },
          ie8: true,
          //keep_classnames: true, // Not needed, it preserves names of public exports, e.g. Bridge.
          //keep_fnames: true, // Not needed, it preserves names of public exports, functions of Bridge.
        },
      }, {}),
    ]);
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
