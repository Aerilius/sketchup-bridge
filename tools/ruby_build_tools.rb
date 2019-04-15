def read(filepaths)
  return filepaths.map{ |filepath|
    File.open(filepath, 'r'){ |f|
      f.read()
    }
  }
end

def write(filepath, string)
  File.open(filepath, 'w'){ |f|
    f.write(string)
  }
end

def bundle_dependencies(filepath, lf: $/, spacing: 2, already_required: [])
  # Avoid duplicate includes.
  if already_required.include?(File.realpath(filepath))
    return ''
  else
    already_required << File.realpath(filepath)
  end
  
  dirpath = File.dirname(filepath)
  string = File.open(filepath, 'r'){ |f|
    f.read()
  }
  result = ''
  string.lines.each{ |line|
    # Check for requires.
    requirepath = if line[/require_relative(?:\(\s*|\s+)['"]([^'"]+)["']\)?/]
      File.join(dirpath, $1)
    elsif line[/require\(File.expand_path\(['"]\.\.\/([^'"]+)["'], __FILE__\)\)/]
      File.join(dirpath, $1)
    elsif line[/require(?:\(\s*|\s+)['"]([^'"]+)["']\)?/]
      File.absolute_path($1)
    end
    # If other script required, skip line and include requirement.
    if requirepath && File.file?(requirepath)
      result << bundle_dependencies(requirepath, lf: lf, spacing: spacing, already_required: already_required)
      result << lf * spacing
    else
      # Otherwise keep line unchanged.
      result << line
    end
  }
  return result
end

def concatenate(strings, lf: $/, spacing: 2)
  return strings.join(lf * (1 + spacing))
end

def _namespace_to_type_and_name(namespace_object)
  type = 'module'
  case namespace_object
  when String
    name = namespace_object
  when Hash
    if namespace_object[:class]
      type = 'class'
      name = namespace_object[:class]
    elsif namespace_object[:module]
      type = 'module'
      name = namespace_object[:module]
    else
      raise ArgumentError
    end
  else
    raise ArgumentError
  end
  return type, name
end

def wrap_in_namespace(string,
                      namespaces,
                      lf: $/, 
                      indentation_chars: '  ',
                      spacing: 1)
  result = ''
  current_indentation_level = 0
  current_indentation = ''
  namespaces.each{ |namespace|
    type, name = _namespace_to_type_and_name(namespace)
    result << "#{current_indentation}#{type} #{name}#{lf}"
    result << lf * spacing
    current_indentation_level += 1
    current_indentation = indentation_chars * current_indentation_level
  }
  string.lines.each{ |line|
    if !line.strip.empty?
      result << current_indentation << line
    else
      result << line
    end
  }
  result << lf
  namespaces.each{ |namespace|
    current_indentation_level -= 1
    current_indentation = indentation_chars * current_indentation_level
    result << lf * spacing
    result << "#{current_indentation}end#{lf}"
  }
  return result
end
