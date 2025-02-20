import google.generativeai as genai
from datetime import datetime, UTC
from typing import TypedDict, List, Optional, Dict
import asyncio

class StateInteractions(TypedDict):
    reads: List[str]
    writes: List[str]

class FunctionAnalysis(TypedDict):
    name: str
    purpose: str
    params: List[str]
    returns: str
    dependencies: List[str]
    modificationPoints: Optional[List[str]]
    stateInteractions: Optional[StateInteractions]

class ClassAnalysis(TypedDict):
    name: str
    purpose: str
    methods: List[str]
    properties: List[str]
    dependencies: List[str]

class Import(TypedDict):
    path: str
    items: List[str]
    purpose: str

class Dependencies(TypedDict):
    external: List[str]
    internal: List[str]

class SearchMetadata(TypedDict):
    primaryFeatures: List[str]
    dataTypes: List[str]
    stateManagement: List[str]
    commonModifications: List[str]
    dependencies: Dependencies

class IntegrationPoint(TypedDict):
    type: str  # 'API' | 'Service' | 'Component' | 'Store'
    name: str
    purpose: str

class CodeAnalysis(TypedDict):
    summary: str
    searchMetadata: SearchMetadata
    functions: List[FunctionAnalysis]
    classes: List[ClassAnalysis]
    imports: List[Import]
    integrationPoints: List[IntegrationPoint]

class GeminiService:
    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("Gemini API key is required")
            
        print(f"\nDebug: Initializing GeminiService")
        print(f"Debug: API key length: {len(api_key)}")
        print(f"Debug: API key first/last 4 chars: {api_key[:4]}...{api_key[-4:]}")
        
        try:
            genai.configure(api_key=api_key)
            # Test the configuration with a simple generation
            model = genai.GenerativeModel('gemini-1.5-pro')
            response = model.generate_content("Test connection")
            print("Debug: Successfully tested Gemini API connection")
        except Exception as e:
            print(f"Debug: Error configuring Gemini: {str(e)}")
            raise
            
        self.model = genai.GenerativeModel('gemini-1.5-pro')

    def create_analysis_prompt(self, file_path: str, content: str) -> str:
        """
        Creates a prompt for code analysis that matches the UI prompt structure.
        
        Args:
            file_path: Path to the file being analyzed
            content: Source code content
            
        Returns:
            Formatted prompt string for Gemini API
        """
        return f'''You are a code analysis expert. Analyze this code file and return a JSON object with this structure:

{{
  "summary": "Brief, development-focused summary",
  "searchMetadata": {{
    "primaryFeatures": ["key features and patterns"],
    "dataTypes": ["data structures and types used"],
    "stateManagement": ["state management approaches"],
    "dependencies": {{
      "external": ["external package dependencies"],
      "internal": ["internal module dependencies"]
    }}
  }},
  "imports": [
    {{
      "path": "import path",
      "items": ["imported items"],
      "purpose": "why these imports are needed"
    }}
  ],
  "functions": [
    {{
      "name": "function name",
      "purpose": "what it does",
      "params": ["parameters"],
      "returns": "return value description",
      "dependencies": ["what it depends on"],
      "stateInteractions": {{
        "reads": ["state it reads"],
        "writes": ["state it modifies"]
      }}
    }}
  ],
  "classes": [
    {{
      "name": "class name",
      "purpose": "what it does",
      "methods": ["method names"],
      "properties": ["property names"],
      "dependencies": ["what it depends on"]
    }}
  ],
  "integrationPoints": [
    {{
      "type": "API/Component/Hook/etc",
      "name": "name of integration point",
      "purpose": "how it's used"
    }}
  ]
}}

Focus on:
1. Development-relevant details
2. Integration points
3. State management
4. Dependencies and data flow
5. Common modification patterns

FILE PATH: {file_path}

CODE CONTENT:
{content}

Return only valid JSON matching the structure exactly.'''

    async def generate_file_summary(self, content: str, file_path: str) -> Dict:
        """Generate structured summary for a file using Gemini"""
        try:
            print(f"\nDebug: Generating summary for {file_path}")
            prompt = self.create_analysis_prompt(file_path, content)
            print("Debug: Created prompt")
            
            # Make the generate_content call properly awaitable
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            print("Debug: Received response from Gemini")
            
            # Parse the response as JSON
            analysis = response.text
            if isinstance(analysis, str):
                import json
                # Try to clean the response before parsing
                analysis = analysis.strip()
                if analysis.startswith('```json'):
                    analysis = analysis.split('```json')[1]
                if analysis.endswith('```'):
                    analysis = analysis.rsplit('```', 1)[0]
                analysis = analysis.strip()
                
                print("Debug: Cleaned response:")
                print(analysis)
                
                analysis = json.loads(analysis)
                print("Debug: Successfully parsed JSON response")
            
            return {
                'analysis': analysis,
                'generated_at': datetime.now(UTC).isoformat(),
                'model_version': 'gemini-1.5-pro'
            }
            
        except Exception as e:
            print(f"Debug: Error in generate_file_summary: {str(e)}")
            if 'response' in locals():
                print(f"Debug: Response type: {type(response.text)}")
                print(f"Debug: Response content:")
                print(response.text)
            return {
                'error': str(e),
                'generated_at': datetime.now(UTC).isoformat()
            }