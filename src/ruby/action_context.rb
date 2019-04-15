# Optionally requires 'json.rb'
require(File.expand_path('../json_polyfill.rb', __FILE__))

class Bridge
  # Class for message properties, combining the behavior of WebDialog and Promise.
  # SketchUp's WebDialog action callback procs receive as first argument a reference to the dialog.
  # To direct the return value of asynchronous callbacks to the corresponding JavaScript callback, we need to
  # remember the message ID. We retain SketchUp's default behavior by delegating to the webdialog, while adding
  # the functionality of a promise.
  # @!parse include UI::WebDialog
  class ActionContext < Promise::Deferred

    # @param dialog [UI::WebDialog, UI::HtmlDialog]
    # @param id     [Fixnum, Integer]
    # @private
    def initialize(dialog, request_handler, id)
      super()
      # Resolves a query from JavaScript and returns the result to it.
      on_resolve = Proc.new{ |*results|
        parameters_string = Bridge::JSON.generate(results)[1...-1]
        parameters_string = 'undefined' if parameters_string.nil? || parameters_string.empty?
        request_handler.send({
          :name => 'Bridge.requestHandler.receive',
          :parameters => [@id, {:success => true, :parameters => results}]
        })
        nil
      }
      # Rejects a query from JavaScript and and give the reason/error message.
      on_reject = Proc.new{ |*reasons|
        #raise(ArgumentError, 'Argument `reason` must be an Exception or String.') unless reason.is_a?(Exception) || reason.is_a?(String)
        reasons.map!{ |reason|
          if reason.is_a?(Exception)
            {
              :name => reason.class.name,
              :message => reason.message,
              :stack => reason.backtrace
            }
          else
            reason
          end
        }
        request_handler.send({
          :name => 'Bridge.requestHandler.receive', 
          :parameters => [@id, {:success => false, :parameters => reasons}]
        })
        nil
      }
      # Register these two handlers.
      self.promise.then(on_resolve, on_reject)
      @dialog = dialog
      @id = id
    end

    alias_method :return, :resolve

    # Make this class work as a proxy for dialog.
    # @see UI::WebDialog
    def method_missing(method_name, *parameters, &block)
      return @dialog.__send__(method_name, *parameters, &block)
    end

  end # class ActionContext

end # class Bridge
