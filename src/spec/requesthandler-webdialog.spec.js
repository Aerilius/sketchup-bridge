// Import chai.
import chai from 'chai'
import spies from 'chai-spies'
import chaiSubset from 'chai-subset'
chai.use(spies)
chai.use(chaiSubset)

// Tell chai that we'll be using the "should" style assertions.
chai.should()
const expect = chai.expect

// Import mocks.
import { IdGeneratorMock } from './bridge-mocks.js'

// Import the RequestHandler class.
import WebDialogRequestHandler from '../js/request-handler-webdialog.js'

class LocationMock {
  constructor(callback) {
    this.callback = callback
  }
  set href(url) {
    this.callback(url)
  }
}

describe('RequestHandler for WebDialog', () => {
  let messageIdGenerator
  let locationHrefSpy
  let location
  let hiddenInputField
  let requestHandler
  let CALLBACKNAME = 'Bridge.receive'

  beforeEach(() => {
    // Create Mocks
    messageIdGenerator = new IdGeneratorMock()
    locationHrefSpy = chai.spy()
    location = new LocationMock(locationHrefSpy)
    hiddenInputField = { value: '' }
    // Create a new RequestHandler instance
    requestHandler = new WebDialogRequestHandler({
      location,
      messageIdGenerator,
      hiddenInputField,
    })
    chai.spy.on(requestHandler, 'send')
  })

  describe('#send', () => {
    it('should accept an object and an optional callback function', () => {
      let message = {}
      requestHandler.send(message)
      let callback = chai.spy()
      // Test
      requestHandler.send(message, callback) // should not raise
    })

    it('should call the Ruby backend via skp URL', done => {
      let message = {}
      // Test
      requestHandler.send(message, () => {})
      setTimeout(() => {
        expect(locationHrefSpy).to.be.called.once.with('skp:Bridge.receive')
        expect(hiddenInputField.value).to.equal(JSON.stringify(message))
        done()
      }, 0)
    })
  })

  describe('#receive', () => {
    it('should accept an ID and an object', () => {
      let message = {}
      let id = messageIdGenerator.current()
      requestHandler.receive(id, message) // should not raise
    })
  })

  describe('#send and #receive', () => {
    it('should call the callback function when it receives a return message', done => {
      let message = {}
      let id = messageIdGenerator.current()
      let returnMessage = { success: true, parameters: ['arg0', 'arg1'] }
      let callback = chai.spy()
      // Test
      // Send may be asynchronous, TODO: test in webdialog spec
      requestHandler.send(message, callback)
      requestHandler.receive(id, returnMessage)
      expect(callback).to.be.called.once.with(returnMessage)
      done()
    })
  })

  describe('#get', done => {
    it("should pass the JavaScript function's return value to the backend", () => {
      // Mocks
      let javaScriptFunctionResult = {}
      let javaScriptFunction = chai.spy(() => javaScriptFunctionResult)
      let id = messageIdGenerator.current()
      let expectedReturnMessage = {
        id: id,
        name: 'aCallbackName',
        parameters: [true, javaScriptFunctionResult],
        expectsCallback: false,
      }
      global.someFunction = javaScriptFunction
      // Test
      // Get contains an asynchronous promise
      requestHandler
        .get('aCallbackName', 'someFunction', 'arg0', 'arg1')
        .finally(() => {
          expect(javaScriptFunction).to.be.called.once
          expect(requestHandler.send).to.be.called.once.with(
            expectedReturnMessage
          )
        })
      null
    })

    it('should pass any error thrown by the JavaScript function to the backend', done => {
      // Mocks
      let javaScriptFunctionError = new Error()
      let javaScriptFunction = chai.spy(() => {
        throw javaScriptFunctionError
      })
      let id = messageIdGenerator.current()
      let expectedReturnMessage = {
        id: id,
        name: 'aCallbackName',
        parameters: [
          false,
          {
            type: javaScriptFunctionError.name,
            message: javaScriptFunctionError.message,
            backtrace: javaScriptFunctionError.stack,
          },
        ],
        expectsCallback: false,
      }
      global.someFunction = javaScriptFunction
      // Test
      // Get a promise that may be asynchronous
      requestHandler
        .get('aCallbackName', 'someFunction', 'arg0', 'arg1')
        .finally(() => {
          expect(javaScriptFunction).to.be.called.once
          expect(requestHandler.send).to.be.called.once.with(
            expectedReturnMessage
          )
        })
        .finally(done)
    })

    it('should pass an error to the backend when the JavaScript function was not found', done => {
      // Mocks
      let id = messageIdGenerator.current()
      let expectedReturnMessage = {
        id: id,
        name: 'aCallbackName',
        parameters: [
          false,
          {
            type: 'TypeError',
          },
        ],
        expectsCallback: false,
      }
      // Test
      // Get a promise that may be asynchronous
      requestHandler
        .get('aCallbackName', 'someNonExistingFunction', 'arg0', 'arg1')
        .finally(() => {
          expect(requestHandler.send).to.be.called.once
          // With performs a deep equal, but due to contained error stack the result only partially equals.
          // expect(requestHandler.send).to.be.called.once.with(expectedReturnMessage)
          let requestHandlerSendCalledWithArgument =
            requestHandler.send.__spy.calls[0][0]
          expect(requestHandlerSendCalledWithArgument).that.containSubset(
            expectedReturnMessage
          )
        })
        .finally(done)
    })
  })
})
