# Load the normal support files.
require 'sketchup.rb'
require 'extensions.rb'

# Create the extension.
ext = SketchupExtension.new('Sample Extension', File.join('sample_extension', 'main'))

# Attach some nice info.
ext.creator     = 'AuthorName'
ext.version     = '0.0.1'
ext.copyright   = '2021, AuthorName'
ext.description = 'A sample extension that uses skp-bridge to compute an area.'

# Register and load the extension on startup.
Sketchup.register_extension(ext, true)
