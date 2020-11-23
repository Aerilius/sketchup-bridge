export function cleanUpScripts() {
  // Document body may not be loaded yet.
  if (typeof document !== 'undefined' && document.body) {
    let scriptElements = document.body.getElementsByTagName('script')
    for (var i = 0; i < scriptElements.length; i++) {
      scriptElements[i].parentElement.removeChild(scriptElements[i])
    }
  }
}

export class IdGenerator {
  constructor() {
    this.id = 0
  }

  next() {
    // Returns current value, increments variable by one.
    return this.id++
  }
}

function extendError(error, id, handlerName, handler) {
  error.message =
    'Bridge.RequestHandler.receive: Error when executing handler `' +
    handlerName +
    '` (' +
    id +
    '): ' +
    error.message
  if (!error.stack) error.stack = handler.toString()
}

function resolveObjectPath(objectPathString) {
  return objectPathString.split('.').reduce((agg, val) => agg[val], global)
}

function errorToJSON(errorObject) {
  return {
    type: errorObject.name,
    message: errorObject.message,
    backtrace: errorObject.stack,
  }
}

export default class RequestHandler {
  constructor({ messageIdGenerator = new IdGenerator() } = {}) {
    /**
     * A unique identifier for each message. It is used to match return values from Ruby to JavaScript callbacks.
     * @type {number}
     * @private
     * @private
     */
    this.messageIdGenerator = messageIdGenerator

    /**
     * The set of callback handlers waiting to be called from Ruby.
     * @type {object.<number,function>}
     * @private
     */
    this.handlers = {}
  }

  /**
   * The remote end-point calls a JavaScript callback handler.
   * @param  {number} id       The ID of the JavaScript-to-Ruby message.
   * @param  {object} message  An arbitrary object containing the message.
   * @private                  (only for use by corresponding Remote)
   */
  // TODO: Ruby side should pass stack/backtrace or at least caller of Bridge.get or action_context.resolve/reject; source location.
  receive(id, response) {
    // If there is a callback handler, execute it.
    if (this.handlers[id]) {
      let handler = this.handlers[id]
      try {
        if (typeof handler === 'function') {
          handler.call(undefined, response)
        }
      } catch (error) {
        extendError(error, id, handler.name, handler)
        // Log the error.
        //Bridge.error(error) // TODO: remove dependency to Bridge
      }
      delete this.handlers[id]
    } else {
      console.warn(
        `RequestHandler does not know a callback for received response with id=${id}: ${response}`
      )
    }
    cleanUpScripts()
  }

  get(callbackHandlerName, functionName, ...parameters) {
    try {
      let fn = resolveObjectPath(functionName)
      // For easier testing, return the promise (because it is asynchronous).
      // The returned promise is not supposed to be used anywhere else.
      return new Promise(function (resolve, reject) {
        // Call the requested JavaScript function.
        // It may either immediately return a result or a Promise.
        // TODO: If send is asynchronous as well, we need to wrap it into a promise and pass resolve/reject as callback
        resolve(fn.apply(undefined, parameters))
      }).then(
        (result) => {
          return new Promise((resolve, reject) => {
            this.send(
              {
                name: callbackHandlerName,
                parameters: [true, result],
                expectsCallback: false,
              },
              resolve
            )
          })
        },
        (error) => {
          if (error instanceof Error) {
            error = errorToJSON(error)
          }
          this.send({
            name: callbackHandlerName,
            parameters: [false, error],
            expectsCallback: false,
          })
        }
      )
    } catch (error) {
      if (error instanceof Error) {
        error = errorToJSON(error)
      }
      // Reject the promise on the other end-point.
      return new Promise((resolve, reject) => {
        this.send(
          {
            name: callbackHandlerName,
            parameters: [false, error],
            expectsCallback: false,
          },
          resolve
        )
      })
      // Log the error.
      //Bridge.error(error) // TODO: remove dependency to Bridge
    }
  }

  send(message, callback) {
    throw Error('Unimplemented function')
  }
}
