class Bridge


  # @private
  module Utils

    def self.log_error(error, metadata={})
      if defined?(AE::ConsolePlugin)
        AE::ConsolePlugin.error(error, metadata)
      elsif error.is_a?(Exception)
        $stderr << ("#{error.class.name}: #{error.message}" << $/)
        $stderr << (error.backtrace.join($/) << $/)
      else
        $stderr << (error << $/)
        $stderr << (metadata[:backtrace].join($/) << $/) if metadata.include?(:backtrace)
      end
    end

    def self.filter_backtrace(backtrace, exclude_file, exclude_line_range=nil)
      return backtrace.inject([]){ |lines, line|
        line_number_match = line[/(?<=:)(\d+)(?=:)/]
        if line.match(exclude_file) && (exclude_line_range.nil? || line_number_match && exclude_line_range.include?(line_number_match.to_i))
          break lines
        end
        lines << line
      }
    end

  end


end
