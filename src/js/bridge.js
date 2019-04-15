import RequestHandler from './request-handler.js'
import WebDialogRequestHandler from './request-handler-webdialog.js'
import HtmlDialogRequestHandler from './request-handler-htmldialog.js'
import BrowserPromptRequestHandler from './request-handler-browser-prompt.js'

function isSketchUp() {
  return (
    typeof window === 'object' &&
    typeof window.navigator === 'object' &&
    /SketchUp/.test(window.navigator.userAgent)
  )
}

function isSketchUpHtmDialog() {
  return typeof window !== 'undefined' && typeof window.sketchup !== 'undefined'
}

function analyzeErrorStringAndMetadata(message, metadata = {}) {
  let type = metadata.type || 'Error'
  let trace = metadata.filename
    ? metadata.filename
    : metadata.url
    ? metadata.url
    : getWindowFileOrUrl()
  if (metadata.lineNumber) {
    trace +=
      ':' +
      metadata.lineNumber +
      (metadata.columnNumber ? metadata.columnNumber : '') +
      ': in JavaScript function'
  }
  let backtrace = [trace]
  return { type, message, backtrace }
}

function analyzeErrorObject(errorObject) {
  let type = errorObject.name
  let message = errorObject.message || errorObject.description
  let trace = errorObject.filename ? errorObject.filename : getWindowFileOrUrl()
  if (errorObject.lineNumber) {
    trace += ':' + errorObject.lineNumber + ': in JavaScript function'
  }
  let backtrace = [trace]
  if (errorObject.stack) {
    backtrace = backtrace.concat(errorObject.stack)
  }
  return { type, message, backtrace }
}

function getWindowFileOrUrl() {
  if (typeof window !== 'undefined') {
    if (window.location.protocol == 'file:') {
      return (window.location.pathname.match(/[^\/\\]+$/) || [])[0]
    } else {
      return window.location.href
    }
  } else {
    return ''
  }
}

export class BridgeClass {
  constructor(requestHandler) {
    // TODO: initialize singleton and export singleton as default
    this.requestHandler = requestHandler
  }

  /**
   * Calls a Ruby handler.
   * @param {string}     name       The name of the Ruby action_callback.
   * @param {...object}  parameters Any amount of parameters of JSON type.
   */
  call(name, ...parameters) {
    if (typeof name !== 'string') {
      throw new TypeError('Argument "name" must be a string')
    }
    let message = {
      name: name,
      parameters: parameters,
      expectsCallback: false,
    }
    // Pass it to the request handler.
    this.requestHandler.send(message)
  }

  /**
   * Sends a request to Ruby and gets the return value in a promise.
   * @param   {string}    name       The name of the Ruby action_callback.
   * @param   {...object} parameters Any amount of parameters of JSON type.
   * @returns {Promise}              A promise representing the return value of the Ruby callback.
   */
  async get(name, ...parameters) {
    if (typeof name !== 'string') {
      throw new TypeError('Argument "name" must be a string')
    }
    var message = {
      name: name,
      parameters: parameters,
      expectsCallback: true,
    }
    // Return the promise.
    return new Promise((resolve, reject) =>
      this.requestHandler.send(message, ({ success, parameters }) => {
        ;(success ? resolve : reject).apply(undefined, parameters)
      })
    )
  }

  /**
   * Logs any text to the Ruby console.
   * @param {string} text
   */
  puts(text) {
    this.call('Bridge.puts', text)
  }

  /**
   * Reports an error to the Ruby console.
   * @overload
   *   @param {string} textOrError
   *   @param {{filename: string, lineNumber: number, url: string, type: string}} metadata
   * @overload
   *   @param {Error}  textOrError
   *   @param {object} metadata
   */
  error(textOrError, metadata) {
    let type, message, backtrace
    if (typeof textOrError === 'string') {
      ;({
        type: type,
        message: message,
        backtrace: backtrace,
      } = analyzeErrorStringAndMetadata(textOrError, (metadata = {})))
    } else if (textOrError instanceof Error) {
      ;({
        type: type,
        message: message,
        backtrace: backtrace,
      } = analyzeErrorObject(textOrError))
    } else {
      throw new TypeError('Argument must be a String or Error')
    }
    this.call('Bridge.error', type, message, backtrace)
  }
}

let requestHandler
if (isSketchUp()) {
  if (isSketchUpHtmDialog()) {
    requestHandler = new HtmlDialogRequestHandler()
  } else {
    requestHandler = new WebDialogRequestHandler(window.location)
  }
} else {
  requestHandler = new BrowserPromptRequestHandler()
}
const Bridge = new BridgeClass(requestHandler)
// Ensure the export is globally available sincerequired by SketchUp Bridge Ruby backend
if (isSketchUp()) global.Bridge = Bridge
export default Bridge
