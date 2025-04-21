#!/usr/bin/env python3
import sys
import re

# Hardcoded mappings for special types in EventsAndErrors.sol
EVENTS_AND_ERRORS_MAPPINGS = {
    # Events
    "BoopExecutionStarted": "event",
    "BoopSubmitted": "event",
    "CallReverted": "event",
    "ExecutionRejected": "event",
    "ExecutionReverted": "event",
    "Received": "event",
    
    # Errors
    "GasPriceTooHigh": "error",
    "InsufficientStake": "error",
    "InvalidNonce": "error",
    "ValidationReverted": "error",
    "ValidationRejected": "error",
    "PaymentValidationReverted": "error",
    "PaymentValidationRejected": "error",
    "PayoutFailed": "error",
    "UnknownDuringSimulation": "error",
    "NotFromEntryPoint": "error",
    "InvalidSignature": "error",
    "ExtensionAlreadyRegistered": "error",
    "ExtensionNotRegistered": "error",
    "InvalidExtensionValue": "error"
}

# Hardcoded mappings for special types in Types.sol
TYPES_MAPPINGS = {
    # Structs
    "Boop": "struct",
    "SubmitOutput": "struct",
    "ExecutionOutput": "struct",
    "CallInfo": "struct",
    
    # Enums
    "CallStatus": "enum",
    "Validity": "enum",
    "ExtensionType": "enum"
}

def process_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Process only comment lines
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if '//' in line or '*' in line:
            # Handle {dir/File} and {dir/File.function} patterns
            lines[i] = process_line(line)

    return '\n'.join(lines)

def process_line(line):
    # Pattern to match {dir/File} or {dir/File.function}
    pattern = r'\{([a-zA-Z0-9_]+)/([a-zA-Z0-9_]+)(\.([a-zA-Z0-9_]+))?\}'
    
    def replace_match(match):
        dir_name = match.group(1)
        file_name = match.group(2)
        func_name = match.group(4)  # This will be None if no function part
        
        # Special case for EventsAndErrors.sol
        if file_name == 'EventsAndErrors':
            if func_name:
                type_prefix = EVENTS_AND_ERRORS_MAPPINGS.get(func_name, "error")
                return f"[{func_name}](/src/boop/{dir_name}/{file_name}.sol/{type_prefix}.{func_name}.html)"
            else:
                return f"[{file_name}](/src/boop/{dir_name}/{file_name}.sol)"
        
        # Special case for Types.sol
        elif file_name == 'Types':
            if func_name:
                type_prefix = TYPES_MAPPINGS.get(func_name, "struct")
                return f"[{func_name}](/src/boop/{dir_name}/{file_name}.sol/{type_prefix}.{func_name}.html)"
            else:
                return f"[{file_name}](/src/boop/{dir_name}/{file_name}.sol)"
        
        # Normal contract/interface handling
        else:
            type_name = "interface" if file_name.startswith('I') else "contract"
            
            # Build the markdown link
            if func_name:
                return f"[{file_name}.{func_name}](/src/boop/{dir_name}/{file_name}.sol/{type_name}.{file_name}.html#{func_name.lower()})"
            else:
                return f"[{file_name}](/src/boop/{dir_name}/{file_name}.sol/{type_name}.{file_name}.html)"
    
    # Replace all occurrences in the line
    return re.sub(pattern, replace_match, line)

# Also handle simple references like {IAccount} without the directory prefix
def process_simple_references(line):
    # TODO: Implement this if needed
    return line

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    processed_content = process_file(file_path)
    print(processed_content)
