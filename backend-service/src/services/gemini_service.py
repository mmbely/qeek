import google.generativeai as genai
from datetime import datetime, UTC
import json
import logging
import os
from typing import Dict, Any, TypedDict, List, Optional
import asyncio

logger = logging.getLogger(__name__)

# Configuration for Gemini API
GEMINI_CONFIG = {
    'MODEL': 'gemini-2.0-flash-lite',  # Most cost-effective model ($0.0001/1K chars)
    'TEMPERATURE': 0.3,  # Lower temperature for more focused responses
    'TOP_K': 40,        # Limit token selection for consistency
    'TOP_P': 0.8,       # Maintain good balance of creativity and accuracy
    'MAX_RETRIES': 3,   # Maximum number of retries for API calls
    'RETRY_DELAY': 1    # Delay between retries in seconds
}

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
    """Service for interacting with Google's Gemini API for code analysis"""
    
    def __init__(self, api_key: str):
        """Initialize the Gemini service with API key"""
        if not api_key:
            raise ValueError("Gemini API key is required")
            
        logger.info("Initializing GeminiService with %s (cost: $0.0001/1K chars)", GEMINI_CONFIG['MODEL'])
        logger.debug("API key length: %d", len(api_key))
        
        try:
            genai.configure(api_key=api_key)
            # Test the configuration with a simple generation
            model = genai.GenerativeModel(GEMINI_CONFIG['MODEL'])
            response = model.generate_content("Test connection")
            logger.info("Successfully tested Gemini API connection")
        except Exception as e:
            logger.error("Error configuring Gemini: %s", str(e))
            raise
            
        self.model = genai.GenerativeModel(
            GEMINI_CONFIG['MODEL'],
            generation_config={
                'temperature': GEMINI_CONFIG['TEMPERATURE'],
                'top_k': GEMINI_CONFIG['TOP_K'],
                'top_p': GEMINI_CONFIG['TOP_P'],
            }
        )

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
        for attempt in range(GEMINI_CONFIG['MAX_RETRIES']):
            try:
                logger.info("Generating summary for %s (attempt %d)", file_path, attempt + 1)
                prompt = self.create_analysis_prompt(file_path, content)
                
                # Make the generate_content call properly awaitable
                response = await asyncio.to_thread(
                    self.model.generate_content,
                    prompt,
                    generation_config={
                        'temperature': GEMINI_CONFIG['TEMPERATURE'],
                        'top_k': GEMINI_CONFIG['TOP_K'],
                        'top_p': GEMINI_CONFIG['TOP_P'],
                    }
                )
                logger.debug("Received response from Gemini")
                
                # Parse the response as JSON
                analysis = response.text
                if isinstance(analysis, str):
                    # Try to clean the response before parsing
                    analysis = analysis.strip()
                    if analysis.startswith('```json'):
                        analysis = analysis.split('```json')[1]
                    if analysis.endswith('```'):
                        analysis = analysis.rsplit('```', 1)[0]
                    analysis = analysis.strip()
                    
                    try:
                        analysis = json.loads(analysis)
                        logger.debug("Successfully parsed JSON response")
                        return {
                            'analysis': analysis,
                            'generated_at': datetime.now(UTC).isoformat(),
                            'model_version': GEMINI_CONFIG['MODEL'],
                            'cost_per_1k_chars': 0.0001
                        }
                    except json.JSONDecodeError as e:
                        logger.warning("JSON parsing error: %s", str(e))
                        if attempt < GEMINI_CONFIG['MAX_RETRIES'] - 1:
                            await asyncio.sleep(GEMINI_CONFIG['RETRY_DELAY'])
                            continue
                        raise
            
            except Exception as e:
                logger.error("Error in generate_file_summary (attempt %d): %s", attempt + 1, str(e))
                if attempt < GEMINI_CONFIG['MAX_RETRIES'] - 1:
                    await asyncio.sleep(GEMINI_CONFIG['RETRY_DELAY'])
                    continue
                if 'response' in locals():
                    logger.error("Response content: %s", response.text)
                return {
                    'error': str(e),
                    'generated_at': datetime.now(UTC).isoformat(),
                    'model_version': GEMINI_CONFIG['MODEL'],
                    'cost_per_1k_chars': 0.0001
                }
