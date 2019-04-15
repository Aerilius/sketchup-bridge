# Optionally requires 'json.rb'
# Requires Sketchup
class Bridge

  # For serializing objects, we choose JSON.
  # Objects passed between bridge instances must be of JSON-compatible types:
  #     object literal, array, string, number, boolean, null
  # If available and compatible, we prefer JSON from the standard libraries, otherwise we use a fallback JSON converter.
  if !defined?(Sketchup) || Sketchup.version.to_i >= 14
    begin
      # `Sketchup::require "json"` raises no error, but displays in the load errors popup.
      # As a workaround, we use `load`.
      load 'json.rb' unless defined?(::JSON)
      # No support for option :quirks_mode ? Fallback to JSON implementation in this library.
      raise(RuntimeError) unless ::JSON::VERSION_MAJOR >= 1 && ::JSON::VERSION_MINOR >= 6

      module JSON
        def self.generate(object)
          # quirks_mode generates JSON from objects other than Hash and Array.
          return ::JSON.generate(object, {:quirks_mode => true})
        end
        def self.parse(string)
          return ::JSON.parse(string, {:quirks_mode => true})
        end
      end

    rescue LoadError, RuntimeError # LoadError when loading 'json.rb', RuntimeError when version mismatch
      
      # Fallback JSON implementation.
      module JSON

        def self.generate(object)
          # Split at every even number of unescaped quotes. This gives either strings
          # or what is between strings.
          object = self.traverse_object(object.clone){ |element| element.is_a?(Symbol) ? element.to_s : element }
          json_string = object.inspect.split(/("(?:\\"|[^"])*")/).
              map { |string|
            next string if string[0..0] == '"' # is a string in quotes
            # If it's not a string then replace : and null
            string.gsub(/=>/, ':')
            .gsub(/\bnil\b/, 'null')
          }.join('')
          return json_string
        end

        def self.parse(string)
          # Split at every even number of unescaped quotes. This gives either strings
          # or what is between strings.
          # ruby_string = json_string.split(/(\"(?:.*?[^\\])*?\")/).
          # The outer capturing braces () are important for that ruby keeps the separator patterns in the returned array.
          regexp_separate_strings = /("(?:\\"|[^"])*")/
          regexp_text = /[^\d\-.:{}\[\],\s]+/
          regexp_non_keyword = /^(true|false|null|undefined)$/
          ruby_string = string.split(regexp_separate_strings).
              map{ |s|
            # It is a string in quotes.
            if s[0..0] == '"'
              # Convert escaped unicode characters because eval won't convert them.
              # Eval would give "u00fc" instead of "ü" for "\"\\u00fc\"".
              s.gsub(/\\u([\da-fA-F]{4})/) { |m|
                [$1].pack('H*').unpack('n*').pack('U*')
              }
            else
              # Don't allow arbitrary textual expressions outside of strings.
              raise(BridgeInternalError, 'JSON string contains invalid unquoted textual expression') if s[regexp_text] && !s[regexp_text][regexp_non_keyword]
              # raise if s[/(true|false|null|undefined)/] && !s[/\w+/][//] # TODO
              # If it's not a string then replace : and null and undefined.
              s.gsub(/:/, '=>').
                  gsub(/\bnull\b/, 'nil').
                  gsub(/\bundefined\b/, 'nil')
            end
          }.join('')
          result = eval(ruby_string)
          return result
        end

        private

        # Traverses containers of a JSON-like object recursively and applies a code block
        def self.traverse_object(o, &block)
          if o.is_a?(Array)
            return o.map{ |v| self.traverse_object(v) }
          elsif o.is_a?(Hash)
            o_copy = {}
            o.each{ |k, v|
              o_copy[self.traverse_object(k)] = self.traverse_object(v)
            }
            return o_copy
          else
            return block.call(o)
          end
        end
        private_class_method :traverse_object

      end # module JSON

    end

  end

end # class Bridge