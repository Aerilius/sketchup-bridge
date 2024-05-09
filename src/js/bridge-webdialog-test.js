/**
 * This test tests the Bridge class with a mocked WebDialog backend.
 */
import { BridgeClass } from './bridge.js'
import WebDialogRequestHandler from './request-handler-webdialog.js'
import {
  IdGeneratorMock,
  WebDialogRubyMock,
  LocationMock,
} from '../spec/bridge-mocks.js'

// Initialize mocks

let idGeneratorMock = new IdGeneratorMock()
const webDialogRubyMock = new WebDialogRubyMock()
let inputFieldMock = {
  value: '',
}
const locationMock = new LocationMock(webDialogRubyMock, inputFieldMock)

// Compose the bridge manually with a request handler that contains our mocks.
const webDialogRequestHandler = new WebDialogRequestHandler({
  location: locationMock,
  messageIdGenerator: idGeneratorMock,
  hiddenInputField: inputFieldMock,
})
webDialogRubyMock.requestHandler = webDialogRequestHandler
const WebDialogBridge = new BridgeClass(webDialogRequestHandler)

// Run tests
webDialogRubyMock.expectResult(idGeneratorMock.current(), 6)
WebDialogBridge.get('compute_sum', 4, 2).then(
  (result) => console.log(`webdialog bridge received result ${result}`),
  (error) => console.log(`webdialog bridge received error ${error}`)
)
webDialogRubyMock.expectResult(idGeneratorMock.current(), 12)
WebDialogBridge.get('compute_product', 3, 4).then(
  (result) => console.log(`webdialog bridge received result ${result}`),
  (error) => console.log(`webdialog bridge received error ${error}`)
)
