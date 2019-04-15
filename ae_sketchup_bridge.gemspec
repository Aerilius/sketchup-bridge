# coding: utf-8
lib = File.expand_path('../src', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require_relative 'src/ruby/version.rb'

Gem::Specification.new do |spec|
  spec.name          = 'ae_sketchup_bridge'
  spec.version       = Bridge::VERSION
  spec.authors       = ['Andreas Eisenbarth']
  spec.email         = ['aerilius@gmail.com']

  spec.summary       = %q{A bidirectional communication system between JavaScript and the SketchUp Ruby environment}
  spec.description   = %q{This Bridge provides an intuitive and asynchronous API for message passing between SketchUp's Ruby environment and dialogs. It supports any amount of parameters of any JSON-compatible type and it uses Promises to asynchronously access return values on success or handle failures.}
  spec.homepage      = 'https://github.com/Aerilius/sketchup-bridge'
  spec.license       = 'MIT'

  # Prevent pushing this gem to RubyGems.org. To allow pushes either set the 'allowed_push_host'
  # to allow pushing to a single host or delete this section to allow pushing to any host.
  if spec.respond_to?(:metadata)
    spec.metadata['allowed_push_host'] = "TODO: Set to 'http://mygemserver.com'"
  else
    raise 'RubyGems 2.0 or newer is required to protect against public gem pushes.'
  end

  spec.files         = `git ls-files -z`.split("\x0").reject{ |f|
    f.match(%r{^(test|spec|features)/}) || !File.exist?(f)
  }
  spec.bindir        = 'exe'
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ['src']

  spec.add_development_dependency 'bundler', '~> 1.13'
  spec.add_development_dependency 'rake', '~> 10.0'
  spec.add_development_dependency 'minitest', '~> 5.0'
  spec.add_development_dependency 'sketchup-api-stubs', '~> 0'
  spec.add_development_dependency 'rubyzip', '>= 1.0.0'
end
