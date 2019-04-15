# Load the normal support files.
require 'sketchup.rb'
require 'extensions.rb'
require File.join('ae_bridgelibrary', 'bridge.rb')

module AE

  module BridgeLibrary

    module Tutorial

      # Create the extension.
      ext = SketchupExtension.new('Bridge Library', File.join('ae_bridgelibrary', 'tutorial.rb'))

      # Attach some nice info.
      ext.creator     = 'Aerilius'
      ext.version     = AE::BridgeLibrary::Tutorial::Bridge::VERSION
      ext.copyright   = '2015-2019, Andreas Eisenbarth'
      ext.description = 'A tutorial for the Bridge library that makes HtmlDialogs easy.'

      # Register and load the extension on startup.
      Sketchup.register_extension(ext, true)
      EXTENSION = ext
    end

  end

end
