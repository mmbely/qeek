export const summaryPrompt = `
Please analyze this codebase and provide a comprehensive summary based on the following information:

Project Structure:
- Directories: {{DIRECTORIES}}
- File Types: {{FILE_TYPES}}
- Source Files: {{SOURCE_FILES}}
- Test Files: {{TEST_FILES}}
- Config Files: {{CONFIG_FILES}}

Dependencies and Integrations:
- Dependencies: {{DEPENDENCIES}}
- Imports: {{IMPORTS}}
- Exports: {{EXPORTS}}
- API Patterns: {{API_PATTERNS}}

Configuration:
- Environment Variables: {{ENV_VARS}}
- Scripts: {{SCRIPTS}}

Please provide:
1. A high-level overview of the project structure and architecture
2. Main technologies and frameworks used
3. Key features and functionality identified
4. Testing approach based on test files
5. Notable patterns and practices observed
6. Potential areas for improvement or attention

Format the response in clear sections with markdown headings.
`;