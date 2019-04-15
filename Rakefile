require 'bundler/gem_tasks'
require 'rake/testtask'
require 'zip'
require 'pathname'
require_relative 'tools/ruby_build_tools'
require_relative 'src/ruby/version.rb'

BRIDGE_LIB_FILES = %w{
  src/ruby/version.rb
  src/ruby/promise.rb
  src/ruby/json-polyfill.rb
  src/ruby/action_context.rb
  src/ruby/requesthandler.rb
  src/ruby/bridge.rb
}

Rake::TestTask.new(:test) do |t|
  t.libs << 'test'
  t.libs << 'src'
  t.test_files = FileList['test/**/*_test.rb']
end

desc 'Builds a distributable library'
task :build_dist do
  # Compile the bridge library files into a single bundle file
  #concatenated = concatenate(read(BRIDGE_LIB_FILES))
  concatenated = bundle_dependencies('src/ruby/bridge.rb')
  namespaced = wrap_in_namespace(concatenated, [{:module => 'AuthorName'}, {:module => 'ExtensionName'}])
  write('dist/bridge.rb', namespaced)
end

desc 'Builds sample extension files'
task :build_sample_extension do
  # Compile the bridge library files into a single bundle file
  #concatenated = concatenate(read(BRIDGE_LIB_FILES))
  concatenated = bundle_dependencies('src/ruby/bridge.rb')
  namespaced = wrap_in_namespace(concatenated, [{:module => 'AuthorName'}, {:module => 'SampleExtension'}])
  write('sample/sample_extension/bridge.rb', namespaced)
end

desc 'Builds tutorial files and builds extension (.rbz)'
task :build_tutorial do
  # Compile the bridge library files into a single bundle file
  #concatenated = concatenate(read(BRIDGE_LIB_FILES))
  concatenated = bundle_dependencies('src/ruby/bridge.rb')
  namespaced = wrap_in_namespace(concatenated, [{:module => 'AE'}, {:module => 'BridgeLibrary'}, {:module => 'Tutorial'}])
  write('tutorial/ae_bridgelibrary/bridge.rb', namespaced)
  
  # Get the version
  version = Bridge::VERSION
  # Configuration
  files_to_exclude = %w{}
  
  # Create a compressed archive
  create_zip_archive("ae_bridgelibrary_#{version}.rbz", 'tutorial', include: '**/*', exclude: files_to_exclude)
end

def create_zip_archive(zip_filename, root_dir, include: [], exclude: [])
  root_dir = File.expand_path(root_dir)
  files_to_include = Dir.glob(File.expand_path(File.join(root_dir, include)))
  files_to_exclude = exclude.map{ |filename|
    filename = File.expand_path(File.join(root_dir, filename))
    (File.directory?(filename)) ? Dir.glob(filename+'/') : filename
  }.flatten
  
  File.delete(zip_filename) if File.exist?(zip_filename)
  Zip::File.open(zip_filename, Zip::File::CREATE) do |zip_file|
    files_to_include.each{ |filename|
      unless files_to_exclude.include?(filename)
        zipped_filename = Pathname.new(filename).relative_path_from(Pathname.new(root_dir))
        zip_file.add(zipped_filename, filename)
      end
    }
  end
end

task :default => :test
