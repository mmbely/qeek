"""
Tests for the GeminiService class which provides AI-powered code analysis.

This test suite verifies that the GeminiService can:
1. Create appropriate analysis prompts
2. Generate structured summaries for different file types
3. Handle various programming languages and frameworks
4. Process both simple and complex code files
"""

import pytest
from src.services.gemini_service import GeminiService
import os
from dotenv import load_dotenv
from pathlib import Path

@pytest.fixture
def gemini_service():
    """
    Fixture that provides a configured GeminiService instance.
    
    Requires a valid Gemini API key in .env.test file.
    Skips tests if no API key is found.
    """
    root_dir = Path(__file__).parent.parent
    env_path = root_dir / '.env.test'
    load_dotenv(env_path)
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        pytest.skip("GEMINI_API_KEY not found in .env.test")
    return GeminiService(api_key)

def test_create_analysis_prompt(gemini_service):
    """Test that analysis prompts are created correctly with file path and content."""
    file_path = "test.py"
    content = """
def hello_world():
    print("Hello, World!")
    """
    prompt = gemini_service.create_analysis_prompt(file_path, content)
    assert "FILE PATH: test.py" in prompt
    assert "CODE CONTENT:" in prompt
    assert "Hello, World!" in prompt

def test_generate_file_summary_python(gemini_service):
    """Test analysis of a simple Python file with a basic function."""
    content = """
def calculate_sum(a: int, b: int) -> int:
    '''Returns the sum of two integers'''
    return a + b
    """
    result = gemini_service.generate_file_summary(content, "math_utils.py")
    
    assert 'error' not in result
    analysis = result['analysis']
    
    # Check basic structure
    assert 'summary' in analysis
    assert 'searchMetadata' in analysis
    assert 'functions' in analysis
    
    # Check function analysis
    functions = analysis['functions']
    assert len(functions) > 0
    calc_sum = next((f for f in functions if f['name'] == 'calculate_sum'), None)
    assert calc_sum is not None
    assert 'params' in calc_sum
    assert 'returns' in calc_sum

def test_generate_file_summary_typescript(gemini_service):
    """Test analysis of a TypeScript interface and type definitions."""
    content = """
interface User {
    id: string;
    name: string;
    email: string;
}

type UserRole = 'admin' | 'user' | 'guest';

export function isAdmin(user: User, role: UserRole): boolean {
    return role === 'admin';
}
    """
    result = gemini_service.generate_file_summary(content, "types.ts")
    
    assert 'error' not in result
    analysis = result['analysis']
    
    # Debug print to see actual values
    print("\nDebug - Primary Features:", analysis['searchMetadata']['primaryFeatures'])
    print("Debug - Data Types:", analysis['searchMetadata']['dataTypes'])
    
    # Check TypeScript-specific elements - more flexible checks
    assert any(
        'typescript' in feature.lower() or 'type' in feature.lower() or 'interface' in feature.lower()
        for feature in analysis['searchMetadata']['primaryFeatures']
    )
    
    # Check for TypeScript types
    data_types = [dt.lower() for dt in analysis['searchMetadata']['dataTypes']]
    assert any('interface' in dt or 'type' in dt for dt in data_types)
    
    # Check exports
    assert any(
        func['name'] == 'isAdmin' 
        for func in analysis['functions']
    )

def test_generate_file_summary_react_component(gemini_service):
    """Test analysis of a React component with hooks and TypeScript."""
    content = """
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface Props {
    userId: string;
}

export const UserProfile: React.FC<Props> = ({ userId }) => {
    const [user, setUser] = useState(null);
    const { getUser } = useAuth();
    
    useEffect(() => {
        const loadUser = async () => {
            const userData = await getUser(userId);
            setUser(userData);
        };
        loadUser();
    }, [userId]);
    
    return (
        <div>
            {user ? (
                <h1>{user.name}</h1>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
};
    """
    result = gemini_service.generate_file_summary(content, "UserProfile.tsx")
    
    assert 'error' not in result
    analysis = result['analysis']
    
    # Debug print
    print("\nDebug - State Management:", analysis['searchMetadata']['stateManagement'])
    
    # Check React-specific elements
    assert 'react' in analysis['summary'].lower()
    assert 'component' in analysis['summary'].lower()
    
    # More flexible state management checks
    state_management = [sm.lower() for sm in analysis['searchMetadata']['stateManagement']]
    assert any('usestate' in sm for sm in state_management)
    
    # Check dependencies
    assert 'react' in analysis['searchMetadata']['dependencies']['external']
    
    # Check imports
    imports = analysis['imports']
    react_import = next((imp for imp in imports if imp['path'] == 'react'), None)
    assert react_import is not None
    assert 'useState' in react_import['items']
    assert 'useEffect' in react_import['items']

def test_generate_file_summary_javascript(gemini_service):
    """Test analysis of a JavaScript module with ES6+ features."""
    content = """
import axios from 'axios';

export class ApiClient {
    constructor(baseURL) {
        this.client = axios.create({ baseURL });
    }

    async fetchUsers() {
        const response = await this.client.get('/users');
        return response.data;
    }

    async createUser(userData) {
        const response = await this.client.post('/users', userData);
        return response.data;
    }
}

export const API_VERSION = 'v1';
    """
    result = gemini_service.generate_file_summary(content, "api-client.js")
    
    assert 'error' not in result
    analysis = result['analysis']
    
    # Debug print
    print("\nDebug - Data Types:", analysis['searchMetadata']['dataTypes'])
    print("Debug - Classes:", analysis['classes'])
    
    # Check JavaScript-specific elements
    data_types = [dt.lower() for dt in analysis['searchMetadata']['dataTypes']]
    assert any('class' in dt for dt in data_types)
    
    # Check dependencies
    assert 'axios' in analysis['searchMetadata']['dependencies']['external']
    
    # Check API client class
    api_client = next((c for c in analysis['classes'] if c['name'] == 'ApiClient'), None)
    assert api_client is not None
    assert 'fetchUsers' in api_client['methods']
    assert 'createUser' in api_client['methods']

# Add more test cases for other file types as needed