# Development

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/Aerilius/sketchup-bridge/issues.

## Preparation

Install JavaScript requirements:
```
apt install npm

npm install
```

And for Ruby requirements:
```
bundle install
```

## Tests

First, make a build `npm run build`.
Run `npm run test` to run the tests.
Or open the file `src/spec/all-specs.html` in a browser.

## Building all for release

To release a new version, update the version number in `version.rb` and in `package.json`, and then run `npm run build_all`.

Then publish the `tutorial*.rbz` in Extension Warehouse.
And publish the JavaScript library on npm, so it can be directly used as dependency:
```
npm publish
```

## Documentation

```
yardoc dist/bridge.rb --no-private
```

