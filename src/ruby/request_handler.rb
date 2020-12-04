require(File.expand_path('../json_polyfill.rb', __FILE__))
require(File.expand_path('../action_context.rb', __FILE__))
require(File.expand_path('../utils.rb', __FILE__))

class Bridge

  # @private
  class RequestHandler # interface

    def send(message)
      raise NotImplementedError
    end

    def receive(action_context, request)
      raise NotImplementedError
    end

  end

  # @private
  class DialogRequestHandler < RequestHandler # abstract class

    def initialize(bridge=nil)
      super()
      @bridge = bridge
    end

    def send(message)
      name = message[:name]
      parameters_string = Bridge::JSON.generate(message[:parameters])[1...-1]
      @bridge.dialog.execute_script("#{name}(#{parameters_string})")
    end

    private

    def handle_request(action_context, request)
      unless request.is_a?(Hash) &&
          (defined?(Integer) ? request['id'].is_a?(Integer) : request['id'].is_a?(Fixnum)) &&
          request['name'].is_a?(String) &&
          request['parameters'].is_a?(Array)
        raise(BridgeInternalError, "Bridge received invalid data: \n#{value}")
      end
      id         = request['id']
      name       = request['name']
      parameters = request['parameters'] || []

      # Here we pass a wrapper around the dialog which preserves the message ID to
      # identify the corresponding JavaScript callback.
      # This allows to run asynchronous code (external application etc.) and return
      # later the result to the JavaScript callback even if the dialog has continued
      # sending/receiving messages.
      if request['expectsCallback']
        response = ActionContext.new(@bridge.dialog, self, id)
        begin
          # Get the callback.
          unless @bridge.handlers.include?(name)
            raise(BridgeRemoteError.new("No registered callback `#{name}` for #{@bridge.dialog} found."))
          end
          handler = @bridge.handlers[name]
          handler.call(response, *parameters)
        rescue Exception => error
          # Reject the promise.
          response.reject(error)
          # Re-raise for logging.
          raise(error)
        end
      else
        # Get the callback.
        unless @bridge.handlers.include?(name)
          raise(BridgeRemoteError.new("No registered callback `#{name}` for #{@bridge.dialog} found."))
        end
        handler = @bridge.handlers[name]
        begin
          handler.call(@bridge.dialog, *parameters)
        rescue NoMethodError => e
          if e.message[/undefined method `resolve' for #<UI::(?:Web|Html)Dialog/]
            raise(NoMethodError.new(
              e.message +
              "\nThe Ruby callback only receives a promise that can be resolved/rejected " +
              "if it is called from JavaScript with Bridge.get('#{name}', …)"
            ))
          else
            raise(e)
          end
      end
    end

  end

  # @private
  class RequestHandlerHtmlDialog < DialogRequestHandler

    # Receives the raw messages from the HtmlDialog (Bridge.call) and chooses the corresponding callbacks.
    # @private Not for public use.
    # @param   action_context [UI::ActionContext]
    # @param   request        [Object]
    # @private
    def receive(action_context, request)
      handle_request(action_context, request)
    rescue Exception => error
      Utils.log_error(error)
    end

  end

  # @private
  class RequestHandlerWebDialog < DialogRequestHandler

    # Receives the raw messages from the WebDialog (Bridge.call) and chooses the corresponding callbacks.
    # @private Not for public use.
    # @param   dialog           [UI::WebDialog]
    # @param   parameter_string [String]
    def receive(dialog, parameter_string)
      # Get message data from the hidden input element.
      value   = @bridge.dialog.get_element_value("#{NAMESPACE}.requestField") # returns empty string if element not found
      request = Bridge::JSON.parse(value)
      handle_request(dialog, request)
    rescue Exception => error
      Utils.log_error(error)
    ensure
      # Acknowledge that the message has been received and enable the bridge to send
      # the next message if available.
      @bridge.call('Bridge.requestHandler.ack')
    end

  end

end # class Bridge
