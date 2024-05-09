/**
 * This file simulates use cases in a SketchUp HtmlDialog.
 *
 * 1. The HtmlDialog uses JavaScript to call a Ruby function.
 * 2. The HtmlDialog uses JavaScript to request a return value from a Ruby function.
 *
 */

import './bridge-webdialog-test.js'
import './bridge-htmldialog-test.js'

import Bridge from '../js/bridge.js'


// Call with arbitrary arguments
Bridge.call('call_a_callback', 42, 81, "some string")

// Get with arbitrary arguments, logging the return value or error.
Bridge.get('get_a_value', "(some random value)").then(
  (result) => console.log(`bridge received result ${result}`),
  (error) => console.log(`bridge received error ${error}`)
)
