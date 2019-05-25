class Bridge


  module Utils


    def self.log_error(error, metadata={})
      if defined?(AE::ConsolePlugin)
        AE::ConsolePlugin.error(error, metadata)
      elsif error.is_a?(Exception)
        $stderr << "#{error.class.name}: #{error.message}" << $/
        $stderr << error.backtrace.join($/) << $/
      else
        $stderr << error << $/
        $stderr << metadata[:backtrace].join($/) << $/ if metadata.include?(:backtrace)
      end
    end


  end


end
