# SketchUp Bridge: A bidirectional communication system between JavaScript and the Ruby environment

[![GitHub](http://img.shields.io/badge/github-aerilius/sketchup--bridge-blue.svg)](http://github.com/aerilius/sketchup-bridge)
[![License](http://img.shields.io/badge/license-MIT-yellowgreen.svg)](#license)

## Summary

The SketchUp Bridge provides an intuitive and asynchronous API for message passing between
SketchUp's Ruby environment and dialogs. It supports any amount of parameters of any JSON-compatible
type and it uses Promises to asynchronously access return values on success or handle failures.

> **Table of contents**
> 
> * [API Overview](#overview)
> * [Background](#background)
> * [FAQ](#faq)
> * [Usage](#usage)
> * [References](#references)

## API Overview <a id="overview"></a>

Ruby methods:

- `Bridge.new(dialog)`  
  Creates a Bridge instance for a UI::WebDialog or UI::HtmlDialog.

- `Bridge.decorate(dialog)`  
  Alternatively adds the Bridge methods to a UI::WebDialog or UI::HtmlDialog.

- `Bridge#on(callbackname) { |deferred, *arguments| }`  
  Registers a callback on the Bridge.

- `Bridge#call(js_function_name, *arguments)`  
  Invokes a JavaScript function with multiple arguments.

- `Bridge#get(js_function_name, *arguments).then{ |result| }`  
  Invokes a JavaScript function and returns a promise that will be resolved with the JavaScript
  function's return value.

JavaScript functions:

- `Bridge.call(rbCallbackName, ...arguments)`  
  Invokes a Ruby callback with multiple arguments.

- `Bridge.get(rbCallbackName, ...arguments).then(function (result) { })`  
  Invokes a Ruby callback and returns a promise that will be resolved 
  with the callback's return value.

- `Bridge.puts(stringOrObject)`  
  Shorthand to print a string/object to the Ruby console.

- `Bridge.error(errorObject)`  
  Shorthand to print an error to the Ruby console.

## Background <a id="background"></a>

SketchUp has two classes for creating UI dialogs:

- The deprecated `UI::WebDialog` using the operating system's browser engine.
  JavaScript functions can be called with [`dialog.execute_script(string)`](http://ruby.sketchup.com/UI/WebDialog.html#execute_script-instance_method) and Ruby callbacks
  are triggered with [`window.location = 'skp:' + callbackname + '@' + parameter_string`](http://ruby.sketchup.com/UI/WebDialog.html#add_action_callback-instance_method)
  which has limitations with maximal URL length, Unicode encoding/character loss and requires the
  developer to manually perform (de)serialization and parameter splitting.

- The new `UI::HtmlDialog` using an embedded Chromium browser with modern JavaScript.
  JavaScript functions can be called with [`dialog.execute_script(string)`](http://ruby.sketchup.com/UI/HtmlDialog.html#execute_script-instance_method) and
  Ruby callbacks are triggered with [`sketchup.callbackname(...parameters)`](http://ruby.sketchup.com/UI/HtmlDialog.html#add_action_callback-instance_method),
  which now allows any amount of JSON-compatible parameters.

WebDialogs had several problems that are deeply covered in the [Lost Manual](https://github.com/thomthom/sketchup-webdialogs-the-lost-manual).
With HtmlDialog, developers still face two major difficulties that cause people to spend over and
over again development time to build their own solutions instead of just building extensions:

- There is not yet a direct **foreign function invocation** from Ruby to JavaScript (analog to
  JavaScript to Ruby: `sketchup.callbackname()`). While developers can use `execute_script`,
  they have to take care every single time about **encoding parameters** properly into a valid
  JavaScript string.

- **Continuous control flow** is still broken into pieces because of asynchronicity. While it is
  possible to invoke a function and pass data from either side, it is not easy to communicate back
  and forth in a continuous manner (like synchronous code): `JavaScript→Ruby→JavaScript→…`  
  `sketchup.callbackname(...parameters, { 'onCompleted': function () {} })` allows to invoke a
  JavaScript function after the Ruby callback completed, but it neither transfers the Ruby return
  value nor does it give feedback about success/failure.

## FAQ <a id="faq"></a>

### Why not use the `UI::WebDialog` skp: protocol directly?

…Or why you _should_ use a library like [this](http://github.com/aerilius/sketchup-bridge) or [SKUI](https://github.com/thomthom/SKUI) or any other that provides a
comparable solution: By using the `skp:` protocol you risk to jump through the same problems that
many developers before you have struggled with. The official getting started examples guide new
developers using `window.location = "skp:" + "some_callback@" + …` all over in the code base
instead of abstracting it in a function. Once your project grows bigger, this becomes not only hard
to read, but also hard to maintain (edit in many places) and error-prone (string splitting/parsing).
As soon as you need to convert parameters or pass many parameters, you are about to re-discover
problems for which you have already found a complete and reusable solution here.

### Why does `UI::HtmlDialog` (SketchUp 2017+) not solve all the problems?

It solves most problems but it still has some drawbacks. Firstly, callbacks are now completely
asynchronous, but the HtmlDialog API has not been designed for asynchronicity (for example in
`sketchup.callbackname({onCompleted: function})` the `onCompleted` JavaScript callback is called
without the Ruby return values). This makes it hard to pass data from a Ruby callback back into
the same JavaScript function. Secondly, `dialog.get_element_value` has been removed without
replacement. Thirdly, `execute_script` still causes pitfalls to many developers due to encoding
problems. Moreover many users use SketchUp versions &lt; 2017 and do not benefit from the
improvements.

### Why Promises?

[Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) help us to deal with asynchronous programming. 

- Compared to the callback function pattern (callback at the end within the parameters list like
  `onCompleted`), callbacks are attached onto the returned promise object, which avoids clashes in
  the parameters list.

- Promises provide two feedback channels for success and failure. So the developer can decide
  whether to handle errors (or some errors) on the Ruby side or JavaScript side.

- Promises work with modern JavaScript [`async` and `await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await).

### Features

1. **Any amount of parameters** (compared to WebDialog):
   You can just pass parameters to the Bridge and rest assured to receive them on the JavaScript
   or Ruby side without worrying about turning them to string or splitting the string again.

2. **Preserves type of parameters** (compared to WebDialog):
   Any basic, JSON-compatible types are mapped between Ruby and JavaScript.  
   Ruby Hashes `{:key => "value"}` become JavaScript Object literals `{"key": "value"}`  
   Ruby Arrays `[1, 2, 3, "string", true]` become JavaScript arrays `[1, 2, 3, "string", true]`  
   Ruby `nil` becomes `null`…

3. **Provides bidirectional callbacks**:
   Once your JavaScript code has invoked a callback on the Ruby side, it can again invoke a callback
   on the JavaScript side. Similarly from the Ruby side, you can request the result of a JavaScript
   function and get the result returned into a Ruby callback.

4. **Asynchronous callbacks**:
   Bridge is built with asynchronicity in mind. If you do external processing or call a web service
   or do any other delayed operation like having the user interact with a Tool, you may nevertheless
   want to return the result when it is available.

5. **Complete error and exception handling**:
   Whereever an exception occurs, it will not anymore go unnoticed and just do nothing. You can
   properly handle success and failures, like giving users feedback about invalid input. Or you can
   redirect all errors from both JavaScript and Ruby to the Ruby Console.

6. **Backwards compatibility**:
   Using the same code base, you can support both `UI::WebDialog` and `UI::HtmlDialog`.

## Usage <a id="usage"></a>

This library is stand-alone and focusses on Ruby↔JavaScript communication. It does not impose a 
Dialog subclass or aim to "fix" or "patch" other issues or modify dialog behavior (sizing etc.).

### Embedding into your extension

1. Copy the files `dist/bridge.rb` and `dist/bridge.js` into the folder of your new extension.
   You can organise them in whatever folder structure you are using.
2. Open the file `bridge.rb` in a text editor, scroll to the top and replace the namespace
   `AuthorName` and `ExtensionName` by your own namespace.
3. In your html file, add a script tag that loads the file `bridge.js` (considering your own folder
   structure) like: `<script src="bridge.js"></script>`

If you use `npm`, you can also just add the package [`sketchup-bridge`](https://www.npmjs.com/package/sketchup-bridge) to your dependencies
and build it into your extension's JavaScript bundle.

### Usage Example

On the Ruby side:

```ruby
  Bridge.decorate(dialog)
  dialog.on('compute_area') { |deferred, width, length|
    if validate(width) && validate(length)
      result = compute_area(width, length)
      deferred.resolve(result)
    else
      deferred.reject('The input is not valid.')
    end
  }
```

On the JavaScript side:

```javascript
  Bridge.get('compute_area', width, length)
  .then(function (result) {
    $('#areaOutput').text(result);
  }, function (error) {
    $('#inputWidth').addClass('invalid');
    $('#inputLength').addClass('invalid');
    alert(error);
  });
```

## References <a id="references"></a>

- [Introductory forum topic for discussion](https://forums.sketchup.com/t/webdialog-htmldialog-tutorial-using-sketchup-bridge/86713)
- [Github project](https://github.com/Aerilius/sketchup-bridge/)
- [Tutorial installable as SketchUp extension](https://extensions.sketchup.com/en/content/sketchup-bridge-tutorial)
- [Minimal sample extension template](https://github.com/Aerilius/sketchup-bridge/tree/master/sample/)
