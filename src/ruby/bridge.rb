require(File.expand_path('../version.rb', __FILE__))
require(File.expand_path('../promise.rb', __FILE__))
require(File.expand_path('../json_polyfill.rb', __FILE__))
require(File.expand_path('../request_handler.rb', __FILE__))
require(File.expand_path('../utils.rb', __FILE__))
# Requires SketchUp module UI

class Bridge
  # This Bridge provides an intuitive and asynchronous API for message passing between SketchUp's Ruby environment 
  # and dialogs. It supports any amount of parameters of any JSON-compatible type and it uses Promises to 
  # asynchronously access return values on success or handle failures.
  #
  # Ruby methods:
  # - `Bridge.new(dialog)`
  #   Creates a Bridge instance for a UI::WebDialog or UI::HtmlDialog.
  # - `Bridge.decorate(dialog)`
  #   Alternatively adds the Bridge methods to a UI::WebDialog or UI::HtmlDialog.
  # - `Bridge#on(callbackname) { |deferred, *arguments| }`
  #   Registers a callback on the Bridge.
  # - `Bridge#call(js_function_name, *arguments)`
  #   Invokes a JavaScript function with multiple arguments.
  # - `Bridge#get(js_function_name, *arguments).then{ |result| }`
  #   Invokes a JavaScript function and returns a promise that will be resolved 
  #   with the JavaScript function's return value.
  #
  # JavaScript functions:
  # - `Bridge.call(rbCallbackName, ...arguments)`
  #   Invokes a Ruby callback with multiple arguments.
  # - `Bridge.get(rbCallbackName, ...arguments).then(function (result) { })`
  #   Invokes a Ruby callback and returns a promise that will be resolved 
  #   with the callback's return value.
  # - `Bridge.puts(stringOrObject)`
  #   Shorthand to print a string/object to the Ruby console.
  # - `Bridge.error(errorObject)`
  #   Shorthand to print an error to the Ruby console.
  # 
  # Github project: https://github.com/Aerilius/sketchup-bridge/

  # Add the bridge to an existing UI::WebDialog/UI::HtmlDialog.
  # This can be used for convenience and will define the bridge's methods
  # on the dialog and delegate them to the bridge.
  # @param dialog [UI::WebDialog, UI::HtmlDialog]
  # @return       [UI::WebDialog, UI::HtmlDialog] The decorated dialog
  def self.decorate(dialog)
    bridge = self.new(dialog)
    dialog.instance_variable_set(:@bridge, bridge)
    class << dialog; attr_accessor :bridge; end

    [:on, :once, :off, :call, :get].each{ |method_name|
      dialog.class.define_method(
        method_name,
        Proc.new{ |*args, **kwargs, &block|
          if kwargs.empty?
            # In older Ruby versions, methods without keyword arguments receive
            # empty **kwargs as positional argument {}, which causes ArgumentError (wrong numbe rof arguments).
            @bridge.send(method_name, *args, &block)
          else
            @bridge.send(method_name, *args, **kwargs, &block)
          end
        }
      )
    }

    return dialog
  end

  # Add a callback handler. Overwrites an existing callback handler of the same name.
  # @param name            [String]             The name under which the callback can be called from the dialog.
  # @param callback        [Proc,UnboundMethod] A method or proc for the callback, if no yield block given.
  # @yield                                      A callback to be called from the dialog to execute Ruby code.
  # @yieldparam dialog     [ActionContext]      An object referencing the dialog, enhanced with methods
  #                                             {ActionContext#resolve} and {ActionContext#resolve} to return results to the dialog.
  # @yieldparam parameters [Array<Object>]      The JSON-compatible parameters passed from the dialog.
  # @return                [self]
  def on(name, &callback)
    raise(ArgumentError, 'Argument `name` must be a String.') unless name.is_a?(String)
    raise(ArgumentError, "Argument `name` can not be `#{name}`.") if RESERVED_NAMES.include?(name)
    raise(ArgumentError, 'Argument `callback` must be a Proc or UnboundMethod.') unless block_given?
    @handlers[name] = callback
    return self
  end

  # Add a callback handler to be called only once. Overwrites an existing callback handler of the same name.
  # @param name            [String]             The name under which the callback can be called from the dialog.
  # @param callback        [Proc,UnboundMethod] A method or proc for the callback, if no yield block given.
  # @yield                                      A callback to be called from the dialog to execute Ruby code.
  # @yieldparam dialog     [ActionContext]      An object referencing the dialog, enhanced with methods
  #                                             {ActionContext#resolve} and {ActionContext#resolve} to return results to the dialog.
  # @yieldparam parameters [Array<Object>]      The JSON-compatible parameters passed from the dialog.
  # @return                [self]
  def once(name, &callback)
    raise(ArgumentError, 'Argument `name` must be a String.') unless name.is_a?(String)
    raise(ArgumentError, "Argument `name` can not be `#{name}`.") if RESERVED_NAMES.include?(name)
    raise(ArgumentError, 'Argument `callback` must be a Proc or UnboundMethod.') unless block_given?
    @handlers[name] = Proc.new { |*parameters|
      @handlers.delete(name)
      callback.call(*parameters)
    }
    return self
  end

  # Remove a callback handler.
  # @param  name [String]
  # @return      [self]
  def off(name)
    raise(ArgumentError, 'Argument `name` must be a String.') unless name.is_a?(String)
    @handlers.delete(name)
    return self
  end

  # Call a JavaScript function with JSON parameters in the webdialog.
  # @param name        [String]        The name of a public JavaScript function
  # @param *parameters [Array<Object>] An array of JSON-compatible objects
  # TODO: Catch JavaScript errors!
  def call(name, *parameters)
    raise(ArgumentError, 'Argument `name` must be a valid method identifier string.') unless name.is_a?(String) && name[/^[\w.]+$/]
    @request_handler.send({
      :name => name,
      :parameters => parameters
    })
  end

  # Call a JavaScript function with JSON parameters in the webdialog and get the
  # return value in a promise.
  # @param  function_name [String]  The name of a public JavaScript function
  # @param  *parameters   [Object]  An array of JSON-compatible objects
  # @return               [Promise]
  def get(function_name, *parameters)
    raise(ArgumentError, 'Argument `function_name` must be a valid method identifier string.') unless function_name.is_a?(String) && function_name[/^[\w.]+$/]
    return Promise.new { |resolve, reject|
      handler_name = create_unique_handler_name('resolve/reject')
      once(handler_name) { |action_context, success, *parameters|
        if success
          resolve.call(*parameters)
        else
          reject.call(*parameters)
        end
      }
      @request_handler.send({
        :name => 'Bridge.requestHandler.get',
        :parameters => [handler_name, function_name, *parameters]
      })
    }
  end

  # @private
  attr_reader :dialog
  attr_reader :handlers

  private

  # The namespace for prefixing internal callback names to avoid clashes with code using this library.
  NAMESPACE = 'Bridge'
  # The module path of the corresponding JavaScript implementation.
  JSMODULE = 'Bridge'
  # Names that are used internally and not allowed to be used as callback handler names.
  RESERVED_NAMES = []
  # Callback name where JavaScript messages are received.
  CALLBACKNAME = 'Bridge.receive'

  # Create an instance of the Bridge and associate it with a dialog.
  # @param dialog [UI::HtmlDialog, UI::WebDialog]
  def initialize(dialog, request_handler=nil)
    raise(ArgumentError, 'Argument `dialog` must be a UI::HtmlDialog or UI::WebDialog.') unless defined?(UI::HtmlDialog) && dialog.is_a?(UI::HtmlDialog) || dialog.is_a?(UI::WebDialog)
    @dialog         = dialog
    @handlers       = {}

    if request_handler.nil?
      if defined?(UI::HtmlDialog) && dialog.is_a?(UI::HtmlDialog) # SketchUp 2017+
        @request_handler = RequestHandlerHtmlDialog.new(self)
      else
        @request_handler = RequestHandlerWebDialog.new(self)
      end
    else
      @request_handler = request_handler
    end
    @dialog.add_action_callback(CALLBACKNAME, &@request_handler.method(:receive))

    add_default_handlers
  end

  # Add additional optional handlers for calls from JavaScript to Ruby.
  def add_default_handlers
    # Puts (for debugging)
    @handlers["#{NAMESPACE}.puts"] = Proc.new { |dialog, *arguments|
      puts(*arguments.map { |argument| argument.inspect })
    }
    RESERVED_NAMES << "#{NAMESPACE}.puts"

    # Error channel (for debugging)
    @handlers["#{NAMESPACE}.error"] = Proc.new { |dialog, type, message, backtrace|
      Utils.log_error(type + ': ' + message, {:language => 'javascript', :backtrace => backtrace})
    }
    RESERVED_NAMES << "#{NAMESPACE}.error"
  end

  # Create a string which has not yet been registered as callback handler, to avoid collisions.
  # @param  string [String]
  # @return        [String]
  def create_unique_handler_name(string)
    begin
      int = (10000*rand).round
      handler_name = "#{NAMESPACE}.#{string}_#{int}"
    end while @handlers.include?(handler_name)
    return handler_name
  end

  # An error caused by malfunctioning of this library.
  # @private
  class BridgeInternalError < StandardError
    def initialize(exception, type=exception.class.name, backtrace=(exception.respond_to?(:backtrace) ? exception.backtrace : caller))
      super(exception)
      @type = type
      set_backtrace(backtrace)
    end
    attr_reader :type
  end

  # An error caused by the remote counter-part of a bridge instance.
  # @private
  class BridgeRemoteError < StandardError
    def initialize(exception, type=exception.class.name, backtrace=(exception.respond_to?(:backtrace) ? exception.backtrace : caller))
      super(exception)
      @type = type
      set_backtrace(backtrace)
    end
    attr_reader :type
  end

  # @private
  class BridgeRemoteInternalError < BridgeRemoteError
  end

end # class Bridge
