require_relative './bridge.rb'

module AE

  module BridgeLibrary

    module Tutorial

      PATH = File.dirname(__FILE__) unless defined?(self::PATH)

      @settings = {
        :width => 12.5,
        :length => 15.0
      }

      def self.run
        properties = {
          :dialog_title    => 'SketchUp Bridge Tutorial',
          :resizable       => true,
          :width           => 700,
          :height          => 600,
          :left            => 200,
          :top             => 100,
        }
        if defined?(UI::HtmlDialog)
          dialog = UI::HtmlDialog.new(properties)
        else
          dialog = UI::WebDialog.new(properties)
        end
        dialog.set_file(File.join(PATH, 'tutorial.html'))

        # The bridge library is focussed on providing communication between Ruby 
        # and HtmlDialogs or WebDialogs. It does not impose a superclass, you can
        # add its functionality directly on the dialog class.
        Bridge.decorate(dialog)
        # You can also use it as a separate object:
        # @bridge = Bridge.new(dialog)
        # @bridge.on(callbackname) { |deferred| }

        # Dialog fetches data from Ruby.
        dialog.on('settings') { |deferred|
          deferred.resolve(@settings)
        }

        # Dialog calls a method to compute a result in Ruby.
        dialog.on('compute_result1') { |deferred, arg1, arg2|
          # SketchUp's native dialog callbacks do not raise errors.
          # When an error is raised, Bridge rejects the deferred promise automatically.
          # Then your dialog's JavaScript code can handle the error.
          result = compute_result1(arg1, arg2)
          deferred.resolve(result)
        }

        # Dialog calls a method to compute a result in Ruby.
        dialog.on('compute_result2') { |deferred, arg1|
          # If you want to handle the error in Ruby, you should include `begin/rescue`
          # in the callback. You can also forward custom data to the error handling JavaScript.
          begin
            result = compute_result2(arg1)
            deferred.resolve(result)
          rescue Math::DomainError => error
            $stderr.write(error.message)
            $stderr.write(error.backtrace.join($\))
            # Do any kind of error handling: 
            # provide an alternative result (e.g. 0) that allows continuing the computation,
            # or return a friendly human-readable error message,
            # or provide a link/form to report the error to the developer.
            deferred.reject('Oh! Too bad, the square root of zero exists only in imagination. Please choose a different number.')
          end
        }

        # Dialog calls a method to asynchronously compute a result in Ruby.
        dialog.on('compute_asynchronously') { |deferred|
          # You can resolve the request at any time later, even when the Ruby 
          # callback finished. You cann pass the Deferred object even to another
          # method that will resolve or reject it.
          # Simulate an asynchronous, external process:
          UI.start_timer(3, false) {
            deferred.resolve(42)
          }
          puts('Ruby callback finished')
        }

        # Dialog calls a callback, but does not need a response.
        dialog.on('select_pushpull') {
          Sketchup.send_action('selectPaintTool:')
        }

        dialog.on('ruby_to_javascript1') {
          # In some cases, you want to push updates from Ruby to the dialog 
          # (when the dialog is loaded), for example when an observer was triggered 
          # because an entity was changed or the user selected a different entity. 
          # The same functions `call` and `get` work also on the bridge/dialog 
          # instance in Ruby. Using the `Bridge.call` method instead
          # of `execute_script` ensures all arguments are properly encoded.
          entity_name = 'ComponentInstance#1'
          attributes = {'lenx' => 71.0, 'leny' => 32.5, 'lenz' => 39.5}
          dialog.call('entitySelected', entity_name, attributes)
        }

        dialog.on('ruby_to_javascript2') {
          # If you also need to get the return value of your JavaScript function,
          # you can use `Bridge.get` to call a JavaScript function and get its
          # return value back into Ruby. If the return value is a promise, its
          # value will be returned to Ruby once that the promise is resolved.
          changed_entity = 'ComponentInstance#1'
          attributes = {'lenx' => 71.0, 'leny' => 32.5, 'lenz' => 39.5}
          dialog.get('syncToServer', changed_entity, attributes).then{ |server_response|
            response_text = server_response['responseText']
            if defined?(UI::Notification)
              UI::Notification.new(EXTENSION, response_text).show
            else
              puts(response_text)
            end
            # Do something with the result or continue in the plugin.
          }.catch{ |server_response|
            status_text = server_response['statusText']
            if defined?(UI::Notification)
              UI::Notification.new(EXTENSION, status_text).show
            else
              puts(status_text)
            end
            # Handle the error.
          }
        }

        dialog.show
      end

      # @raises ZeroDivisionError
      def self.compute_result1(arg1, arg2)
        return arg1 / arg2
      end
      private_class_method :compute_result1

      # @raises DomainError
      def self.compute_result2(arg1)
        return Math.sqrt(arg1)
      end
      private_class_method :compute_result2

      unless file_loaded?(__FILE__)
        UI.menu('extensions').add_item('SketchUp Bridge Tutorial'){
          begin
            Tutorial.run
          rescue => error
            $stderr << error
          end
        }
        file_loaded(__FILE__)
      end

    end

  end

end
