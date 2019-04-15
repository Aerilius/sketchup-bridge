import RequestHandler, { IdGenerator } from './request-handler.js'

// Workaround issue: Failure to register new callbacks in Chromium, thus overwriting the existing, unused "LoginSuccess".
const CALLBACKNAME = 'LoginSuccess' // 'Bridge.receive'

export default class HtmlDialogRequestHandler extends RequestHandler {
  constructor({
    sketchup = window.sketchup,
    messageIdGenerator = new IdGenerator(),
  } = {}) {
    super({ messageIdGenerator })
    this.sketchup = sketchup
  }

  /**
   * Sends a message.
   * @param {Message} message
   * @param {function=undefined} callback (optional)
   */
  send(message, callback) {
    // We assign an ID to this message so we can identify a callback (if there is one).
    let id = (message.id = this.messageIdGenerator.next())
    this.handlers[id] = callback
    this.sketchup[CALLBACKNAME](message)
  }
}
