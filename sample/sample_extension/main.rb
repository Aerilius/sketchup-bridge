module AuthorName

  module SampleExtension

    PATH = File.dirname(__FILE__) unless defined?(self::PATH)
    require(File.join(PATH, 'bridge.rb'))

    class AreaComputationDialog

      def initialize
        # In the class initializer, we define persistent references (instance variables).
        @settings = {
          :width => Sketchup.read_default('AuthorName/SampleExtension', 'width', 12.5),
          :length => Sketchup.read_default('AuthorName/SampleExtension', 'length', 15)
        }
        @dialog = create_dialog
      end
      
      def open
        @dialog.show
      end

      def create_dialog
        # Instantiate a SketchUp dialog.
        # If you don't need to support older SketchUp versions,
        # it is fine to just instantiate an HtmlDialog.
        properties = {
          :dialog_title    => 'SampleExtension',
          :resizable       => true,
          :width           => 250,
          :height          => 250,
          :left            => 200,
          :top             => 200,
        }
        if defined?(UI::HtmlDialog)
          dialog = UI::HtmlDialog.new(properties)
        else
          dialog = UI::WebDialog.new(properties)
        end
        dialog.set_file(File.join(PATH, 'html', 'dialog.html'))

        # Attach the skp-bridge magic.
        Bridge.decorate(dialog)

        # Dialog fetches data from Ruby.
        dialog.on('settings') { |deferred|
          deferred.resolve(@settings)
        }

        # Dialog requests the result of a Ruby method.
        dialog.on('compute_area') { |deferred, width, length|
          result = compute_area(width, length)
          deferred.resolve(result)
        }

        return dialog
      end

      def compute_area(width, length)
        return width * length
      end

    end

    # Run once: Register a menu item that instantiates the dialog and opens it.
    unless file_loaded?(__FILE__)
      UI.menu('extensions').add_item('SampleExtension'){
        begin
          AreaComputationDialog.new.open
        rescue => error
          $stderr << error
        end
      }
      file_loaded(__FILE__)
    end

  end

end
