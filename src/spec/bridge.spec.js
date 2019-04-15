// Import chai.
import chai from 'chai'
import spies from 'chai-spies'
import chaiAsPromised from 'chai-as-promised'
chai.use(spies)
chai.use(chaiAsPromised)

// Tell chai that we'll be using the "should" style assertions.
chai.should()
const expect = chai.expect

// Import the Bridge class.
import { BridgeClass } from '../js/bridge.js'
import HtmlDialogRequestHandler from '../js/request-handler-htmldialog.js'

describe('Bridge', () => {
  let Bridge
  let requestHandler

  beforeEach(() => {
    // Create Mocks
    requestHandler = {
      send: chai.spy(),
    }
    // Create a new Bridge instance
    Bridge = new BridgeClass(requestHandler)
  })

  describe('#call', () => {
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

    it('calls the request handler', () => {
      Bridge.call('aCallbackName', 1, 2)
      requestHandler.send.should.have.been.called.once
      requestHandler.send.should.have.been.called.with({
        name: 'aCallbackName',
        parameters: [1, 2],
        expectsCallback: false,
      })
    })
  })

  describe('#get', () => {
    it('requires the first parameter to be a callback name as a string', () => {
      /*
      // This cannot be tested because babel changes behavior of the function from
      //   throws TypeError or returns Promise
      // to
      //   returns Promise (which may be rejected with TypeError)
      expect(() => {
        Bridge.get(null)
        null
      }).to.throw(TypeError)*/
      expect(Bridge.get(null)).to.be.rejectedWith(TypeError)
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

    it('calls the request handler', () => {
      Bridge.get('aCallbackName', 1, 2)
      requestHandler.send.should.have.been.called.once
    })

    it('resolves the promise when the backend resolves', () => {
      let expected = 3
      requestHandler.send = chai.spy((message, callback) =>
        callback({ success: true, parameters: [expected] })
      )
      expect(Bridge.get('aCallbackName', 1, 2)).to.eventually.equal(expected)
    })

    it('rejects the promise when the backend rejects', () => {
      let expected = 'An error happened'
      requestHandler.send = chai.spy((message, callback) =>
        callback({ success: false, parameters: [expected] })
      )
      expect(Bridge.get('aCallbackName', 1, 2)).to.be.rejectedWith(expected)
    })
  })

  describe('#puts', () => {
    it('accepts any amount of JSON parameters', () => {
      Bridge.puts(
        'message1',
        'message2',
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
      ;(typeof Bridge.puts('message') === 'undefined').should.be.true
    })

    it('calls the request handler', () => {
      Bridge.puts('message')
      requestHandler.send.should.have.been.called.once
      requestHandler.send.should.have.been.called.with({
        name: 'Bridge.puts',
        parameters: ['message'],
        expectsCallback: false,
      })
    })
  })

  describe('#error', () => {
    it('requires the first parameter to be a callback name as a string', () => {
      expect(() => {
        Bridge.error(null)
      }).to.throw(TypeError)
    })

    it('accepts a text and metadata', () => {
      Bridge.error('An error happened', {
        type: 'SomeTypeOfError',
        filename: 'aScript.js',
        lineNumber: 1,
        columnNumber: 12,
      }) // should not raise
    })

    it('accepts an error object', () => {
      Bridge.error(new Error()) // should not raise
    })

    it('returns nothing', () => {
      ;(typeof Bridge.error(new Error()) === 'undefined').should.be.true
    })

    it('calls the request handler', () => {
      requestHandler.send = chai.spy((message, resolve, reject) => {
        message.name.should.equal('Bridge.error')
        message.parameters.should.be.a('array')
        message.parameters[0].should.equal('Error')
        message.parameters[1].should.equal('aMessage')
        message.parameters[2].should.be.an('array')
        message.parameters[2][0].should.be.an('string')
      })
      Bridge.error(new Error('aMessage'))
      requestHandler.send.should.have.been.called.once
    })
  })
})
