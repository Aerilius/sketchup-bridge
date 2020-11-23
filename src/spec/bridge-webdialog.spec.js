// Import chai.
import chai from 'chai'

// Tell chai that we'll be using the "should" style assertions.
chai.should()
const expect = chai.expect

// Import mocks.
import {
  IdGeneratorMock,
  WebDialogRubyMock,
  LocationMock,
} from './bridge-mocks.js'

// Import the Bridge class.
import { BridgeClass } from '../js/bridge.js'
import WebDialogRequestHandler from '../js/request-handler-webdialog.js'

describe('Bridge for WebDialog', () => {
  describe('#call', () => {
    let Bridge
    let webDialogRubyMock
    let idGeneratorMock

    beforeEach(() => {
      // Create Mocks
      idGeneratorMock = new IdGeneratorMock()
      webDialogRubyMock = new WebDialogRubyMock()
      let inputFieldMock = {
        value: '',
      }
      let locationMock = new LocationMock(webDialogRubyMock, inputFieldMock)
      // Compose the bridge manually with a request handler that contains our mocks.
      let webDialogRequestHandler = new WebDialogRequestHandler({
        location: locationMock,
        messageIdGenerator: idGeneratorMock,
        hiddenInputField: inputFieldMock,
      })
      webDialogRubyMock.requestHandler = webDialogRequestHandler
      // Create a new Bridge instance
      Bridge = new BridgeClass(webDialogRequestHandler)
    })

    it('requires the first parameter to be a callback name as a string', () => {
      expect(() => {
        Bridge.call(null)
      }).to.throw(TypeError)
    })

    it('accepts any amount of JSON parameters', () => {
      Bridge.call(
        'aCallbackName',
        'string',
        1,
        2.3,
        null,
        true,
        false,
        [0, 1, 2],
        { key: 'value' }
      ) // should not raise
    })

    it('returns nothing', () => {
      ;(typeof Bridge.call('aCallbackName') === 'undefined').should.be.true
    })

    it('calls the HtmlDialog Ruby backend', (done) => {
      webDialogRubyMock.expectToBeCalled(idGeneratorMock.current(), done)
      Bridge.call('aCallbackName', 1, 2)
    })
  })

  describe('#get', () => {
    let Bridge
    let webDialogRubyMock
    let idGeneratorMock

    beforeEach(() => {
      // Create Mocks
      idGeneratorMock = new IdGeneratorMock()
      webDialogRubyMock = new WebDialogRubyMock()
      let inputFieldMock = {
        value: '',
      }
      let locationMock = new LocationMock(webDialogRubyMock, inputFieldMock)
      // Compose the bridge manually with a request handler that contains our mocks.
      let webDialogRequestHandler = new WebDialogRequestHandler({
        location: locationMock,
        messageIdGenerator: idGeneratorMock,
        hiddenInputField: inputFieldMock,
      })
      webDialogRubyMock.requestHandler = webDialogRequestHandler
      // Create a new Bridge instance
      Bridge = new BridgeClass(webDialogRequestHandler)
    })

    it('requires the first parameter to be a callback name as a string', () => {
      expect(() => {
        Bridge.call(null)
      }).to.throw(TypeError)
    })

    it('accepts any amount of JSON parameters', () => {
      Bridge.get(
        'aCallbackName',
        'string',
        1,
        2.3,
        null,
        true,
        false,
        [0, 1, 2],
        { key: 'value' }
      ) // should not raise
    })

    it('returns a promise', () => {
      Bridge.get('aCallbackName').should.be.a('promise')
    })

    it('calls the HtmlDialog Ruby backend', (done) => {
      webDialogRubyMock.expectToBeCalled(idGeneratorMock.current(), done)
      Bridge.get('aCallbackName', 1, 2)
    })

    it('resolves the promise when the backend resolves', (done) => {
      let expected = 3
      webDialogRubyMock.expectResult(idGeneratorMock.current(), expected)
      Bridge.get('aCallbackName', 1, 2)
        .then(
          (result) => expect(result).to.equal(expected),
          (error) => expect.fail()
        )
        .finally(done)
    })

    it('rejects the promise when the backend rejects', (done) => {
      let expected = 'An error happened'
      webDialogRubyMock.expectError(idGeneratorMock.current(), expected)
      Bridge.get('aCallbackName', 1, 2)
        .then(
          (result) => expect.fail(),
          (error) => expect(error).to.equal(expected)
        )
        .finally(done)
    })
  })
})
