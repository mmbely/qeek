export const summaryPrompt = `
  Directories: {{DIRECTORIES}}
  File Types: {{FILE_TYPES}}
  Dependencies: {{DEPENDENCIES}}
  Test Files: {{TEST_FILES}}
  Config Files: {{CONFIG_FILES}}
  Source Files: {{SOURCE_FILES}}
  Imports: {{IMPORTS}}
  Exports: {{EXPORTS}}
  API Patterns: {{API_PATTERNS}}
  Environment Variables: {{ENV_VARS}}
  Scripts: {{SCRIPTS}}
`;