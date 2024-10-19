import os
import fnmatch

# Specify the directory of your GitHub repository
repository_dir = '.'
output_file = 'code_prompt.txt'

# List of common code file extensions, including .sql, .js, .html, .css, and .mjs
code_extensions = ['.js', '.tsx', '.ts', '.html', '.css', '.mjs', '.sql']

# Function to parse the .gitignore pyfile and return the list of patterns to ignore
def parse_gitignore(gitignore_path):
    ignore_patterns = []
    if os.path.exists(gitignore_path):
        with open(gitignore_path, 'r') as gitignore_file:
            for line in gitignore_file:
                line = line.strip()
                if line and not line.startswith('#'):
                    # Ensure directories end with a slash and normalize the pattern
                    if line.endswith('/'):
                        ignore_patterns.append(line.rstrip('/'))
                    else:
                        ignore_patterns.append(line)
    return ignore_patterns

# Check if a file or directory should be ignored based on the .gitignore patterns
def should_ignore(file_path, ignore_patterns):
    relative_path = os.path.relpath(file_path, repository_dir)

    for pattern in ignore_patterns:
        # Handle patterns without leading slashes by allowing them to match anywhere
        if pattern.startswith('/'):
            pattern = pattern[1:]

        # Match directories
        if pattern.endswith('/'):
            if relative_path.startswith(pattern):
                print(f"Ignoring directory: {relative_path}")
                return True
        # Match files and wildcards
        elif fnmatch.fnmatch(relative_path, pattern):
            print(f"Ignoring file: {relative_path}")
            return True
    return False

# Function to check if a file is a binary file
def is_binary(file_path):
    try:
        with open(file_path, 'rb') as file:
            chunk = file.read(1024)
            if b'\x00' in chunk:  # Binary files often contain NULL bytes
                return True
    except:
        return True  # Treat as binary if there is any error reading the file
    return False

# Get the ignore patterns from the .gitignore file
gitignore_file_path = os.path.join(repository_dir, '.gitignore')
ignore_patterns = parse_gitignore(gitignore_file_path)

# Open the output file in write mode
with open(output_file, 'w') as outfile:
    # Walk through all the files in the directory
    for root, dirs, files in os.walk(repository_dir):
        # Filter out directories that should be ignored
        dirs_to_remove = []
        for d in dirs:
            dir_path = os.path.join(root, d)
            if should_ignore(dir_path, ignore_patterns):
                dirs_to_remove.append(d)

        # Remove the directories that should be ignored
        for d in dirs_to_remove:
            print(f"Removing directory from traversal: {os.path.join(root, d)}")
            dirs.remove(d)

        # Check files in the current directory
        for file in files:
            file_path = os.path.join(root, file)

            # Check if the file has a code extension, is not binary, and is not ignored
            if (
                not any(file.endswith(ext) for ext in code_extensions) or
                should_ignore(file_path, ignore_patterns) or
                is_binary(file_path)
            ):
                continue

            try:
                # Write a separator indicating the file path
                outfile.write(f'\n\n--- File: {file_path} ---\n\n')

                # Append the contents of the file to the output file
                with open(file_path, 'r', encoding='utf-8') as infile:
                    outfile.write(infile.read())
            except UnicodeDecodeError:
                print(f"Skipping non-UTF-8 file: {file_path}")

print(f"All code files have been merged into {output_file}")
