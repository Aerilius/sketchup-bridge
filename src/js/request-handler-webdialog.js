import RequestHandler, {
  IdGenerator,
  cleanUpScripts,
} from './request-handler.js'

/**
 * The url which responds to requests.
 * @constant {string}
 */
const URL_RECEIVE = 'skp:Bridge.receive'

const INPUT_FIELD_ID = 'Bridge.requestField'

function createMessageField(id) {
  let messageField = document.createElement('input')
  messageField.setAttribute('type', 'hidden')
  messageField.setAttribute('style', 'display: none')
  messageField.setAttribute('id', 'Bridge.' + id)
  document.documentElement.appendChild(messageField)
  return messageField
}

/**
 * Serializes an object.
 * For serializing/unserializing objects, we currently use JSON.
 * @param   {object} object  The object to serialize into a string.
 * @returns {string}
 */
function serialize(object) {
  return JSON.stringify(object)
}

export default class WebDialogRequestHandler extends RequestHandler {
  constructor({
    location = window.location,
    messageIdGenerator = new IdGenerator(),
    hiddenInputField = createMessageField(INPUT_FIELD_ID), // TODO: need to defer, to ensure DOM is loaded?
  } = {}) {
    super({ messageIdGenerator })
    this.location = location
    /**
     * A hidden input field for message data.
     * Since skp: urls have a limited length and don't support arbitrary characters, we store the complete message
     * data in a hidden input field and retrieve it from SketchUp with `UI::WebDialog#get_element_value`.
     */
    this.hiddenInputField = hiddenInputField
    /**
     * The queue of messages waiting to be sent.
     * SketchUp/macOS/Safari skips skp urls if they happen in a too short time interval.
     * We pass all skp urls through a queue that makes sure that a new message is only
     * sent after the SketchUp side has received the previous message and acknowledged it with `Bridge.__ack__()`.
     * @type {Array<Message>}
     * @private
     */
    this.queue = []
    /**
     * Whether the queue is running and fetches on its own new messages from the queue.
     * @type {boolean}
     * @private
     */
    this.running = false
  }

  /**
   * Remote tells the bridge that the most recently sent message has been received.
   * Enables the bridge to send the next message if available.
   * @param {number} [id]  The ID of the message to be acknowledged.
   * @private              (only for use by corresponding Remote)
   */
  ack(id) {
    this.running = false // Ready to send new messages.
    cleanUpScripts()
    if (this.queue.length > 0) {
      this.deQueue()
    }
  }

  /**
   * Puts a new message into the queue.
   * If is not running, start it.
   * @param {Message}          message
   * @param {function(object)} callback A function to call with response from server / SketchUp.
   * @private
   */
  enQueue(message, callback) {
    // We assign an id to this message so we can identify a callback (if there is one).
    var id = (message.id = this.messageIdGenerator.next())
    this.handlers[id] = callback
    this.queue.push(message)
    // If the queue is not running, start it.
    // If the message queue contains messages, then it is already running.
    if (!this.running) {
      this.deQueue()
    }
  }

  /**
   * Fetches the next message from the queue and sends it.
   * If the queue is empty, set the queue not running / idle.
   * @private
   */
  deQueue() {
    var message = this.queue.shift()
    if (!message) {
      this.running = false
      return
    }
    // Lock the status variable before sending the message.
    // (because window.location is synchronous in IE and finishes
    // before this function finishes.)
    this.running = true
    this.submit(message)
  }

  /**
   * Sends a message.
   * @param {Message} message
   */
  submit(message) {
    this.hiddenInputField.value = serialize(message)
    // Give enough time to refresh the DOM, so that SketchUp will be able to
    // access the latest values of messageField.
    setTimeout(() => (this.location.href = URL_RECEIVE), 0)
  }

  send(message, callback) {
    this.enQueue(message, callback)
  }
}
