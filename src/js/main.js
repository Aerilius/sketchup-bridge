import './bridge-webdialog-test.js'
import './bridge-htmldialog-test.js'

import Bridge from './bridge.js'

Bridge.call('call_a_callback', 42, 81)

Bridge.get('get_a_value', 171).then(
  result => console.log(`bridge received result ${result}`),
  error => console.log(`bridge received error ${error}`)
)
