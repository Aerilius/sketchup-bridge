# Interactive test

The complete intergration between the JavaScript library and Ruby library can only be tested in
SketchUp. This folder contains tests that mock the SketchUp side by a different request handler
that can run in a normal webbrowser.

Open any of the HTML files in a web browser and open the developer tools.

Call and get requests from JavaScript to Ruby are logged.

Get requests will cause a prompt where you "play" the Ruby function in a SketchUp plugin
and provide a return value.
