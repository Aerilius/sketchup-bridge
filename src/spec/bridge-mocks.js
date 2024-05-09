export class IdGeneratorMock {
  constructor() {
    this.id = 0
  }

  next() {
    // Returns current value, increments variable by one.
    return this.id++
  }

  current() {
    return this.id
  }
}

// Mocks for HtmlDialog

export class HtmlDialogRubyMock {
  constructor() {
    this.called = {}
    this.results = {}
    this.errors = {}
    this.requestHandler = undefined
    this.sketchup = this.__create_sketchup_mock__()
  }

  /**
   * Returns an object that works like the window.sketchup object where any
   */
  __create_sketchup_mock__() {
    let that = this
    return new Proxy(
      {}, // target: the proxy's state, here a cache for mocked callback functions
      {
        get: function (target, prop, receiver) {
          // Return a function that – when called – forwards prop and the parameters.
          // Create this function for each prop only once and cache it in target (the proxy's state).
          return (
            target[prop] ||
            (target[prop] = function (...parameters) {
              console.log(
                `         htmldialog bridge: ${prop} ${JSON.stringify(
                  parameters
                )}`
              )
              let [message = {}] = parameters
              let id = message.id
              if (id in that.called) {
                that.called[id]()
              }
              if (id in that.errors) {
                that.requestHandler.receive(id, {success: false, parameters: [that.errors[id]]})
              } else {
                that.requestHandler.receive(id, {success: true, parameters: [that.results[id]]})
              }
            })
          )
        },
      }
    )
  }

  expectResult(id, result) {
    this.results[id] = result
  }

  expectError(id, reason) {
    this.errors[id] = reason
  }

  expectToBeCalled(id, callback) {
    this.called[id] = callback
  }
}

// Mocks for WebDialog

export class WebDialogRubyMock {
  constructor() {
    this.called = {}
    this.results = {}
    this.errors = {}
    this.requestHandler = undefined
  }

  expectResult(id, result) {
    this.results[id] = result
  }

  expectError(id, reason) {
    this.errors[id] = reason
  }

  expectToBeCalled(id, callback) {
    this.called[id] = callback
  }
}

export class LocationMock {
  constructor(rubyMock, inputFieldMock) {
    this.rubyMock = rubyMock
    this.inputFieldMock = inputFieldMock
  }
  set href(url) {
    console.log(`         webdialog bridge: ${url}`)
    let id = JSON.parse(this.inputFieldMock.value).id
    this.rubyMock.requestHandler.ack(id)
    if (id in this.rubyMock.called) {
      this.rubyMock.called[id]()
    }
    if (id in this.rubyMock.errors) {
      this.rubyMock.requestHandler.receive(id, {success: false, parameters: [this.rubyMock.errors[id]]})
    } else {
      this.rubyMock.requestHandler.receive(id, {success: true, parameters: [this.rubyMock.results[id]]})
    }
  }
}
