# AI Model Tester

A Flask-based application for testing and comparing different Gemini AI models for code analysis in Qeek. This tool helps evaluate the quality and cost-effectiveness of various Gemini models for generating code summaries and analysis.

## Features

- Test multiple Gemini models:
  - Gemini 1.5 Flash
  - Gemini 1.5 Pro
  - Gemini 2.0 Flash
  - Gemini 2.0 Flash Lite
- Real-time code analysis
- Firebase integration for repository access
- Interactive UI for file selection and model comparison
- Support for multiple programming languages
- Cost-effective model evaluation

## Setup

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables in `.env`:
```bash
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_APPLICATION_CREDENTIALS=path_to_firebase_credentials.json
GITHUB_TOKEN=your_github_token  # Optional but recommended
```

## Usage

1. Start the Flask server:
```bash
python app.py
```

2. Access the web interface at `http://localhost:5001`

3. Select a repository, file, and model to generate analysis

## Key Components

- `app.py`: Main Flask application with API endpoints and Gemini integration
- `templates/index.html`: Interactive web interface
- `requirements.txt`: Python dependencies
- `.env`: Environment configuration (not tracked in git)

## API Endpoints

- `/`: Main interface
- `/files/<repo_id>`: Get repository files
- `/file/<repo_id>/<file_id>`: Get specific file details
- `/generate-summary`: Generate code analysis using selected model

## Development Notes

- Uses Firebase Admin SDK for repository data
- Integrates with GitHub API for file content
- Supports real-time model comparison
- Follows Qeek's development standards and dark mode implementation

## Testing Results

Based on extensive testing, Gemini 2.0 Flash Lite provides the best balance of:
- Analysis quality
- Cost efficiency (25x cheaper than 1.5 Pro)
- Project-specific understanding
- Technical accuracy

## Future Improvements

- Add support for batch analysis
- Implement analysis result caching
- Add performance metrics tracking
- Support for more code analysis features
- Export comparison results
