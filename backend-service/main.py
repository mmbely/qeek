from flask import Flask, jsonify, request
import os
import sys
import traceback
import logging
import platform
import unittest
from dotenv import load_dotenv
from flask_cors import CORS  # Import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add src directory to Python path
src_path = os.path.join(os.path.dirname(__file__), 'src')
if src_path not in sys.path:
    sys.path.append(src_path)

# Try to load .env file, but don't fail if it doesn't exist
try:
    load_dotenv(verbose=True)
    print("Loaded environment variables from .env file")
except Exception as e:
    print(f"Warning: Could not load .env file: {e}")
    print("Using environment variables from the system")

# Try importing modules from src
try:
    from test_env import run_tests
    from services.github_service import GitHubService
    from services.firestore_service import FirestoreService
    from services.gemini_service import GeminiService
    import_success = True
    logger.info("Successfully imported modules from src")
except Exception as e:
    import_success = False
    logger.error(f"Error importing modules from src: {e}")
    logger.error(traceback.format_exc())

# Initialize Flask app
app = Flask(__name__)
# Enable CORS for all routes
CORS(app, origins=["http://localhost:3000", "https://qap-ai.web.app", "https://qap-ai.firebaseapp.com"])

@app.route('/', methods=['GET'])
def hello_world():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "Backend service is running",
        "python_version": sys.version,
        "current_directory": os.getcwd(),
        "directory_contents": os.listdir(".")
    })

@app.route('/repositories/sync', methods=['POST'])
def sync_repository():
    """Repository sync endpoint"""
    try:
        # Get request data
        request_json = request.get_json(silent=True)
        
        if not request_json:
            logger.error("No JSON data provided")
            return jsonify({"error": "No JSON data provided"}), 400
        
        repository_name = request_json.get('repositoryName')
        account_id = request_json.get('accountId')
        
        if not repository_name or not account_id:
            logger.error("Repository name and account ID are required")
            return jsonify({"error": "Repository name and account ID are required"}), 400
        
        logger.info(f"Processing repository sync request for {repository_name} (account: {account_id})")
        
        # Here we would implement the actual repository sync logic
        # For now, return a simple success response
        return jsonify({
            "success": True, 
            "result": {
                "status": "success",
                "message": "Repository sync initiated",
                "repository": repository_name,
                "account_id": account_id
            }
        })
    
    except Exception as e:
        logger.exception(f"Error processing repository: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/test-env', methods=['GET'])
def test_environment():
    """Environment test endpoint"""
    try:
        # Run environment tests
        if import_success:
            test_results = run_tests()
        else:
            test_results = {
                "python_version": sys.version,
                "platform": platform.platform(),
                "current_directory": os.getcwd(),
                "environment_variables": {
                    "PYTHONPATH": os.environ.get('PYTHONPATH', 'Not set'),
                    "PORT": os.environ.get('PORT', 'Not set'),
                    "GOOGLE_CLOUD_PROJECT": os.environ.get('GOOGLE_CLOUD_PROJECT', 'Not set')
                },
                "directory_contents": {
                    "current": os.listdir('.'),
                    "app_root": os.listdir('/app') if os.path.exists('/app') else []
                },
                "module_imports": {}
            }
            
            # Test importing key modules
            modules_to_test = [
                'flask',
                'requests',
                'firebase_admin',
                'google.cloud.firestore',
                'google.cloud.storage',
                'google.generativeai'
            ]
            
            for module in modules_to_test:
                try:
                    __import__(module)
                    test_results["module_imports"][module] = "success"
                except ImportError as e:
                    test_results["module_imports"][module] = f"error: {str(e)}"
        
        return jsonify({
            "success": True,
            "test_results": test_results
        })
    
    except Exception as e:
        logger.exception(f"Error running environment tests: {e}")
        return jsonify({
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route('/run-tests', methods=['GET'])
def run_unit_tests():
    """Run unit tests endpoint"""
    try:
        # Discover and run tests
        tests_path = os.path.join(os.path.dirname(__file__), 'tests')
        test_loader = unittest.TestLoader()
        test_suite = test_loader.discover(tests_path)
        
        # Use a custom test result class to capture results
        class JSONTestResult(unittest.TestResult):
            def __init__(self):
                super().__init__()
                self.test_results = []
            
            def addSuccess(self, test):
                super().addSuccess(test)
                self.test_results.append({
                    'test': test.id(),
                    'result': 'success'
                })
            
            def addError(self, test, err):
                super().addError(test, err)
                self.test_results.append({
                    'test': test.id(),
                    'result': 'error',
                    'error': str(err[1]),
                    'traceback': traceback.format_tb(err[2])
                })
            
            def addFailure(self, test, err):
                super().addFailure(test, err)
                self.test_results.append({
                    'test': test.id(),
                    'result': 'failure',
                    'error': str(err[1]),
                    'traceback': traceback.format_tb(err[2])
                })
        
        result = JSONTestResult()
        test_suite.run(result)
        
        # Return test results
        return jsonify({
            'success': len(result.errors) == 0 and len(result.failures) == 0,
            'tests_run': result.testsRun,
            'errors': len(result.errors),
            'failures': len(result.failures),
            'results': result.test_results
        })
    
    except Exception as e:
        logger.exception(f"Error running unit tests: {e}")
        return jsonify({
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Starting server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)