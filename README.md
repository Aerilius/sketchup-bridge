# SketchUp Bridge: A bidirectional communication system between WebDialogs and the Ruby environment

[![GitHub](http://img.shields.io/badge/github-aerilius/sketchup--bridge-blue.svg)](http://github.com/aerilius/skp-bridge)
[![License](http://img.shields.io/badge/license-MIT-yellowgreen.svg)](#license)

## Summary

This Bridge provides an intuitive and reliable communication in both directions with any amount of parameters of any JSON-compatible type and a way to access the returned value. It avoids errors that occur with SketchUp's webdialog mechanism. It is based on Promises which allow easy asynchronous and delayed callbacks for both success and failure.

The callback mechanism provided by SketchUp with a custom protocol handler `skp:` has several deficiencies:

 * Inproper Unicode support; looses properly escaped calls containing '; drops repeated properly escaped backslashes.
 * [Maximum URL length](https://support.microsoft.com/en-us/kb/208427) in the Windows version of SketchUp is 2083.
 * Asynchronous on OSX (it does not wait for SketchUp to receive a precendent call which can get lost).
 * Supports only one string parameter that must be escaped. Manual splitting and conversion into non-string types is a common source of errors.

(as documented here: https://github.com/thomthom/sketchup-webdialogs-the-lost-manual)

## Why not use the `UI::WebDialog` skp: protocol directly?

…Or why you _should_ use a library like [this](http://github.com/aerilius/skp-bridge) or [SKUI](https://github.com/thomthom/SKUI) or any other that provides a comparable solution: By using the `skp:` protocol you risk to jump through the same problems that many developers before you have struggled with. The getting started examples guide new developers using `window.location = "skp:" + "some_callback@" + …` all over in the code base. Once your project grows bigger, this becomes not only hard to read, but also hard to maintain (edit in many places) and error-prone (string splitting/parsing). As soon as you need to convert parameters or pass many parameters, you are about to re-discover problems for which you have already found here a complete and reusable solution.

## Why does `UI::HtmlDialog` (SketchUp 2017+) not solve the problems?

It solves most problems but it has two drawbacks. Firstly, callbacks are now completely asynchronous, but the HtmlDialog API has not been built for asynchronicity (for example in `sketchup.callbackname({onCompleted: function})` the `onCompleted` JavaScript callback is called without the Ruby return values). This makes it hard to pass data from a Ruby callback back into the same JavaScript function. Secondly, `dialog.get_element_value` without replacement. Thirdly, `execute_script`
still gives pitfalls for encoding problems. Still, many users use SketchUp versions &lt; 2017 and do not benefit the improvements. With this library you can use the same code and support both WebDialogs and HtmlDialogs.

## Features

**1. Any amount of parameters**: You can just pass parameters to the Bridge and rest assured to receive them on the JavaScript or Ruby side without worrying about turning them to string or splitting the string again.

**2. Preserves type of parameters**: Any basic, JSON-compatible types are mapped between Ruby and JavaScript.  
     Ruby Hashes `{:key => "value"}` become JavaScript Object literals `{"key": "value"}`  
     Ruby Arrays `[1, 2, 3, "string", true]` become JavaScript arrays `[1, 2, 3, "string", true]`  
     Ruby `nil` becomes `null`…

**3. Provides bidirectional callbacks**: Once your JavaScript code has invoked a callback on the Ruby side, it can again invoke a callback on the JavaScript side. Similarly from the Ruby side, you can request the result of a JavaScript function and get the result returned into a Ruby callback.

**4. Asynchronous callbacks**: Bridge is built with asynchronism in mind. If you do external processing or call a web service or do any other delayed operation like a user interacting with a Tool, you may nevertheless want to return the result.

**5. Complete error and exception handling**: Where ever an exception occurs, it will not anymore go unnoticed and just do nothing. You can properly handle success and failures, like giving users feedback about invalid input. Or you can redirect all errors from both JavaScript and Ruby to the Ruby Console.

**6. Backwards compatibility**: Using the same code base, you can support both `UI::WebDialog` and `UI::HtmlDialog`.

## Usage

This library is stand-alone and focusses on doing WebDialog communication right. It does not aim to "fix" or "patch" other shortcomings of webdialogs or modify webdialog behavior (sizing etc.).

### Embedding into your extension

1. Copy the files `dist/bridge.rb` and `dist/bridge.js` into the folder of your new extension. You can organise them in whatever folder structure you are using.
2. Open the file `bridge.rb` in a text editor, scroll to the top and replace the namespace `AuthorName` and `ExtensionName` by your own namespace.
3. In your html file, add a script tag that loads the file `bridge.js` (considering your own folder structure) like:  
   `<script src="bridge.js"></script>`

### 

To create a new bridge, you initialize it with the dialog to which it should be linked:

    @dialog = UI::WebDialog.new("My Dialog")
    @bridge = Bridge.new(dialog)
    
For convenience, you can call the bridge's methods directly on the webdialog if you do instead:

    Bridge.decorate(@dialog)
    @dialog.on("fromJS") { … }
    
There are Ruby methods to register and unregister callbacks on the webdialog:
 
    @bridge.on("callbackName") { |dlg, parameter1, parameter2, *more_parameters|
      # …
      dlg.resolve(result)
    }
    
    @bridge.off("callbackName")
    
    @bridge.once("uniqueCallback") { … }
    
With `Bridge.call` you can invoke such a callback from JavaScript on the Ruby side (or vice versa). Optionally the last parameter can be again a **callback** function that receives the result from Ruby that passed with `message.resolve`.

    Bridge.call('callbackName', 42, 81);
    
    Bridge.call('callbackName', 42, 81, function(result) { alert(result); });

Similarly, Ruby `bridge.call` calls a (public static) JavaScript function.

    bridge.call("callbackName", 42, 81)
    
    bridge.call("callbackName", 42, 81) { |result| puts result }
    
If the focus is more about getting data, you may prefer the **promise** style.
In JavaScript:

    var promise = Bridge.get('callbackName', 42, 81);
    promise.then(function(result) { alert(result); });
    
And in Ruby:

    promise = bridge.get("prompt", "Give more input")
    promise.then{ |input| puts(input * 5) }

## Architecture

The two main goals of the library are separated by two layers, one for the intuitive API and one for the workarounds for SketchUp-specific problems. Outward-facing is the API layer "Bridge" that cares about the nice features like multiple parameters, object serialization and Promises. The internal socket-like "Connection" cares about basic message passing between SketchUp's Ruby and JavaScript environments without loosing or corrupting data. 

In fact, we can easily replace it by different implementations while maintaining the Bridge API. 

## More Examples

### Simple call

On the Ruby side:

    @bridge = Bridge.new(webdialog)
    @bridge.on("add_image") { |deferred, image_path, point, width, height|
      @entities.add_image(image_path, point, width.to_l, height.to_l)
    }

On the JavaScript side:

    Bridge.call('add_image', 'http://www.photos.com/image/9895.jpg', [10, 10, 0], '2.5m', '1.8m');

The `Bridge.call` can also accept a primitive callback function as last parameter.

### Delayed callback:

    @bridge.on("slow_callback") { |deferred|
      UI.start_timer(5, false){
        deferred.resolve "done!"
      }
    }

<del>
### Log output to the Ruby Console
    
    Bridge.puts('Swiss "grüezi" is pronounced [ˈɡryə̯tsiː] and means "您好！" in Chinese.');

### Log an error to the Ruby Console

    try {
      document.makeMeAnError();
    } catch (error) {
      Bridge.error(error);
    }

</del>

### Usage with promises

Much nicer are promises, which allow chaining of operations that depend on the result of previous operations. Promises also provide code paths for successful method invocations (return value) and to report and handle failures.

On the JavaScript side:

    Bridge.get('writeImageAndEncodeBase64')
    .then(uploadImageToWeb)
    .then(function(shareURL){
        alert('The image was shared successfully at '+shareURL);
    }).catch(function(reason){
        alert('Oh snap! Something went wrong: '+reason);
    })

On the Ruby side:

    @bridge.on('writeImageAndEncodeBase64') { |deferred|
      filepath = File.join(get_temporary_path(), 'image.jpg')
      @model.active_view.write_image(filepath, 600, 400)
      data = encodeBase64(filepath)
      deferred.resolve(data)
    }

### More

On the Ruby side:
    
    @bridge.on("do_calculation") { |deferred, length, width|
      if validate(length) && validate(width)
        result = calculate(length)
        deferred.resolve(result)
      else
        deferred.reject("The input is not valid.")
      end
    }

On the JavaScript side:
    
    var promise = Bridge.get('do_calculation', length, width)
    promise.then(function(result){
      $('#resultField').text(result);
    }, function(failureReason){
      $('#inputField1').addClass('invalid');
      $('#inputField2').addClass('invalid');
      alert(failureReason);
    });
