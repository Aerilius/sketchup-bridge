/**
 * This test tests the Bridge class with a mocked HtmlDialog backend.
 */
import { BridgeClass } from './bridge.js'
import HtmlDialogRequestHandler from './request-handler-htmldialog.js'
import { IdGeneratorMock, HtmlDialogRubyMock } from '../spec/bridge-mocks.js'

const htmlDialogRubyMock = new HtmlDialogRubyMock()

let idGeneratorMock = new IdGeneratorMock()

// Compose the bridge manually with a request handler that contains our mocks.
const htmlDialogRequestHandler = new HtmlDialogRequestHandler({
  sketchup: htmlDialogRubyMock.sketchup,
  messageIdGenerator: idGeneratorMock,
})
htmlDialogRubyMock.requestHandler = htmlDialogRequestHandler
const HtmlDialogBridge = new BridgeClass(htmlDialogRequestHandler)

// Run tests
htmlDialogRubyMock.expectResult(idGeneratorMock.current(), 6)
HtmlDialogBridge.get('compute_sum', 4, 2).then(
  (result) => console.log(`htmldialog bridge received result ${result}`),
  (error) => console.log(`htmldialog bridge received error ${error}`)
)
htmlDialogRubyMock.expectResult(idGeneratorMock.current(), 12)
HtmlDialogBridge.get('compute_product', 3, 4).then(
  (result) => console.log(`htmldialog bridge received result ${result}`),
  (error) => console.log(`htmldialog bridge received error ${error}`)
)
