import RequestHandler, { IdGenerator } from './request-handler.js'

function returnMockResult(message, mockCallbacks, callback) {
  let result = mockCallbacks[message.name]
  if (typeof result.then === 'function') {
    // Promise for return value
    result.then(
      result => {
        console.log(`[${message.name}] >> ${JSON.stringify(result)}`)
        callback({success: true, parameters: [result]})
      },
      reason => {
        console.log(`[${message.name}] >> (rejected) ${JSON.stringify(reason)}`)
        callback({success: false, parameters: [reason]})
      }
    )
  } else {
    // Return value
    if (typeof callback === 'function') callback({success: true, parameters: [result]})
    console.log('>> ' + JSON.stringify(result))
  }
}

function runMockCallbackFunction(message, mockCallbacks, callback) {
  try {
    // Resolver function that returns return value.
    let result = mockCallbacks[message.name].apply(
      undefined,
      message.parameters
    )
    if (typeof callback === 'function') callback({success: true, parameters: [result]})
    console.log('>> ' + JSON.stringify(result))
  } catch (error) {
    if (typeof callback === 'function') {
      callback({success: false, parameters: [error]})
    } else {
      console.error(error)
    }
  }
}

function simulateGetWithPrompt(request, callback) {
  // Show the request as prompt.
  var question = 'Give a return value in JSON notation:',
    resultString = window.prompt(request + '\n' + question)
  if (typeof resultString === 'string') {
    var result = JSON.parse(resultString)
    // Resolve the query and return the result to it.
    if (typeof callback === 'function') callback({success: true, parameters: [result]})
  } else {
    // Otherwise reject the query.
    if (typeof callback === 'function') callback({success: false, parameters: ['rejected']})
  }
}

export default class BrowserPromptRequestHandler extends RequestHandler {
  constructor({ messageIdGenerator = new IdGenerator() } = {}) {
    super({ messageIdGenerator })
    /**
     * Enables debugging of Bridge for browsers without skp protocol.
     * Overrides the internal message handler of Bridge.
     * Bridge skp requests are redirected to the browser's console or prompts if necessary.
     */
    this.mockCallbacks = {}
  }

  mockRequests(mocks) {
    Object.assign(this.mockCallbacks, mocks)
  }

  send(message, callback) {
    let request = `skp:${message.name}(${JSON.stringify(
      message.parameters
    ).slice(1, -1)})`
    if (message.expectsCallback) {
      // Respond to the request and call the callback.
      if (message.name in this.mockCallbacks) {
        // Resolve the request automatically with mock data.
        console.log(request)
        if (typeof this.mockCallbacks[message.name] !== 'function') {
          returnMockResult(message, this.mockCallbacks, callback)
        } else {
          runMockCallbackFunction(message, this.mockCallbacks, callback)
        }
      } else {
        simulateGetWithPrompt(request, callback)
      }
    } else {
      // Just log the call.
      console.log(request)
    }
  }
}
