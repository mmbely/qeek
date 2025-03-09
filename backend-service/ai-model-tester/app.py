import os
import json
import requests
from flask import Flask, render_template, request, jsonify
import firebase_admin
from firebase_admin import credentials, firestore
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Initialize Firebase
cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
db = firestore.client()

# Initialize Gemini
api_key = os.getenv('GEMINI_API_KEY')
print(f"Gemini API Key (first 10 chars): {api_key[:10] if api_key and len(api_key) > 10 else 'None or too short'}")

# Validate API key is present
if not api_key:
    print("WARNING: GEMINI_API_KEY environment variable is not set or empty")
else:
    try:
        genai.configure(api_key=api_key)
        # Test the API connection with our primary model
        model = genai.GenerativeModel("gemini-2.0-flash-lite")
        _ = model.generate_content("Hello")
        print("Gemini API key validated successfully")
    except Exception as e:
        print(f"ERROR initializing Gemini API: {str(e)}")

# GitHub API token (optional but recommended to avoid rate limits)
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')

# Available models for testing, ordered by preference
MODELS = [
    {"id": "gemini-2.0-flash-lite", "name": "Gemini 2.0 Flash Lite", "cost": "0.0001/1K chars"},
    {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash", "cost": "0.0005/1K chars"},
    {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro", "cost": "0.0025/1K chars"},
    {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash", "cost": "0.0005/1K chars"}
]

@app.route('/')
def index():
    # Get all repositories
    repositories = []
    try:
        print("Fetching repositories from Firestore...")
        repos_ref = db.collection('repositories')
        repos = repos_ref.stream()
        
        repo_count = 0
        for repo in repos:
            repo_count += 1
            repo_data = repo.to_dict()
            
            # Use repository ID as fallback if name is not available
            repo_name = repo_data.get('name') or repo.id
            
            # For GitHub repositories, the ID might be in the format "owner_repo"
            if '_' in repo.id and not repo_data.get('name'):
                # Convert "owner_repo" to "owner/repo" for better display
                repo_name = repo.id.replace('_', '/')
            
            print(f"Found repository: {repo.id} - {repo_name}")
            
            repositories.append({
                'id': repo.id,
                'name': repo_name
            })
        
        print(f"Total repositories found: {repo_count}")
        print(f"Repositories to display: {len(repositories)}")
    except Exception as e:
        print(f"Error fetching repositories: {str(e)}")
        repositories = []
    
    return render_template('index.html', repositories=repositories, models=MODELS)

@app.route('/files/<repo_id>')
def get_files(repo_id):
    # Get all files for a repository
    files = []
    files_ref = db.collection('repositories').document(repo_id).collection('files')
    all_files = files_ref.stream()
    
    for file in all_files:
        file_data = file.to_dict()
        if 'path' in file_data:
            files.append({
                'id': file.id,
                'path': file_data['path'],
                'language': file_data.get('language', 'Unknown')
            })
    
    return jsonify(files)

@app.route('/file/<repo_id>/<file_id>')
def get_file(repo_id, file_id):
    # Get file details
    file_ref = db.collection('repositories').document(repo_id).collection('files').document(file_id)
    file = file_ref.get()
    
    if file.exists:
        return jsonify(file.to_dict())
    else:
        return jsonify({"error": "File not found"}), 404

def get_github_file_content(repo_name, file_path):
    """
    Fetch file content from GitHub API
    
    Args:
        repo_name (str): Repository name in format "owner/repo"
        file_path (str): Path to the file in the repository
        
    Returns:
        str: File content
    """
    headers = {}
    if GITHUB_TOKEN:
        headers['Authorization'] = f'token {GITHUB_TOKEN}'
    
    url = f"https://api.github.com/repos/{repo_name}/contents/{file_path}"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        content_data = response.json()
        if 'content' in content_data:
            import base64
            # GitHub API returns content as base64 encoded
            content = base64.b64decode(content_data['content']).decode('utf-8')
            return content
    
    return None

@app.route('/generate-summary', methods=['POST'])
def generate_summary():
    # Check if API key is valid before proceeding
    if not api_key:
        return jsonify({"error": "Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable."}), 500
    
    data = request.json
    repo_id = data.get('repo_id')
    file_id = data.get('file_id')
    model_id = data.get('model_id', 'gemini-2.0-flash-lite')  # Default to our primary model
    
    # Get file metadata
    file_ref = db.collection('repositories').document(repo_id).collection('files').document(file_id)
    file = file_ref.get()
    
    if not file.exists:
        return jsonify({"error": "File not found"}), 404
    
    file_data = file.to_dict()
    file_path = file_data.get('path', '')
    file_language = file_data.get('language', 'Unknown')
    
    # Get repository information
    repo_ref = db.collection('repositories').document(repo_id)
    repo = repo_ref.get()
    
    if not repo.exists:
        return jsonify({"error": "Repository not found"}), 404
    
    repo_data = repo.to_dict()
    
    # Determine GitHub repository name
    github_repo_name = None
    
    # Try to get from repo data
    if 'owner' in repo_data and 'name' in repo_data:
        github_repo_name = f"{repo_data['owner']}/{repo_data['name']}"
    # Try to parse from repo_id if it's in the format "owner_repo"
    elif '_' in repo_id:
        github_repo_name = repo_id.replace('_', '/')
    # Try to get from URL
    elif 'url' in repo_data and 'github.com' in repo_data['url']:
        url_parts = repo_data['url'].split('github.com/')
        if len(url_parts) > 1:
            github_repo_name = url_parts[1].strip('/')
    
    if not github_repo_name:
        return jsonify({"error": "Could not determine GitHub repository name"}), 400
    
    # Fetch file content from GitHub
    file_content = get_github_file_content(github_repo_name, file_path)
    
    if not file_content:
        return jsonify({"error": f"Could not fetch file content from GitHub for {github_repo_name}/{file_path}"}), 400
    
    # Generate summary using selected model
    try:
        model = genai.GenerativeModel(model_id)
        
        prompt = f"""
        You are an expert code analyzer. Analyze the following code file and provide a detailed summary.
        
        File path: {file_path}
        Language: {file_language}
        
        Code:
        ```
        {file_content}
        ```
        
        Provide a JSON response with the following structure:
        {{
            "summary": "Brief summary of what the code does",
            "key_components": ["List of key components or functions"],
            "dependencies": ["External libraries or dependencies used"],
            "complexity": "Low/Medium/High",
            "potential_issues": ["Any potential issues or bugs"],
            "suggestions": ["Suggestions for improvement"]
        }}
        
        Return only the JSON object, nothing else.
        """
        
        response = model.generate_content(prompt)
        
        # Extract JSON from response
        try:
            # Try to parse the response text as JSON
            summary_json = json.loads(response.text)
        except json.JSONDecodeError:
            # If parsing fails, try to extract JSON from the text
            text = response.text
            start_idx = text.find('{')
            end_idx = text.rfind('}') + 1
            
            if start_idx >= 0 and end_idx > start_idx:
                json_str = text[start_idx:end_idx]
                try:
                    summary_json = json.loads(json_str)
                except:
                    summary_json = {"error": "Failed to parse JSON from response"}
            else:
                summary_json = {"error": "No JSON found in response", "raw_response": text}
        
        # Add model info to the response
        result = {
            "model": model_id,
            "summary": summary_json,
            "file_info": {
                "path": file_path,
                "language": file_language,
                "repo": github_repo_name
            }
        }
        
        return jsonify(result)
    
    except Exception as e:
        error_message = str(e)
        print(f"Error generating summary: {error_message}")
        if "API_KEY_INVALID" in error_message:
            return jsonify({"error": "Invalid Gemini API key. Please check your GEMINI_API_KEY environment variable."}), 401
        elif "PERMISSION_DENIED" in error_message:
            return jsonify({"error": "Permission denied. Your API key may not have access to this model."}), 403
        else:
            return jsonify({"error": f"Error generating summary: {error_message}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)