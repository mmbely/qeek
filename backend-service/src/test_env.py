#!/usr/bin/env python3
import sys
import os
import platform
import logging

logger = logging.getLogger(__name__)

def run_tests():
    """Run environment tests and return results"""
    logger.info("Running environment tests")
    
    results = {
        "python_version": sys.version,
        "platform": platform.platform(),
        "current_directory": os.getcwd(),
        "script_location": __file__,
        "environment_variables": {
            "PYTHONPATH": os.environ.get('PYTHONPATH', 'Not set'),
            "PORT": os.environ.get('PORT', 'Not set'),
            "GOOGLE_CLOUD_PROJECT": os.environ.get('GOOGLE_CLOUD_PROJECT', 'Not set')
        },
        "directory_contents": {
            "current": os.listdir('.'),
            "app_root": os.listdir('/app') if os.path.exists('/app') else [],
            "src": os.listdir(os.path.dirname(__file__))
        },
        "module_imports": {}
    }
    
    # Test importing key modules
    modules_to_test = [
        'flask',
        'requests',
        'firebase_admin',
        'github',
        'google.cloud.firestore',
        'google.cloud.storage',
        'google.generativeai',
        'tqdm',
        'dotenv'
    ]
    
    for module in modules_to_test:
        try:
            __import__(module)
            results["module_imports"][module] = "success"
        except ImportError as e:
            results["module_imports"][module] = f"error: {str(e)}"
    
    return results

if __name__ == "__main__":
    print("=== Python Environment Test ===")
    print(f"Python version: {sys.version}")
    print(f"Platform: {platform.platform()}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Script location: {__file__}")
    print(f"PYTHONPATH: {os.environ.get('PYTHONPATH', 'Not set')}")

    # List directory contents
    print("\n=== Directory Contents ===")
    try:
        print(f"Current directory contents: {os.listdir('.')}")
        parent_dir = os.path.dirname(os.path.dirname(__file__))
        print(f"Parent directory contents: {os.listdir(parent_dir)}")
    except Exception as e:
        print(f"Error listing directory: {e}")

    # Test importing key modules
    print("\n=== Module Import Tests ===")
    modules_to_test = [
        'firebase_admin',
        'github',
        'google.cloud.firestore',
        'google.cloud.storage',
        'google.generativeai',
        'requests',
        'tqdm',
        'dotenv'
    ]

    for module in modules_to_test:
        try:
            __import__(module)
            print(f"✅ Successfully imported {module}")
        except ImportError as e:
            print(f"❌ Failed to import {module}: {e}")

    # Check sys.path
    print("\n=== Python Path ===")
    for i, path in enumerate(sys.path):
        print(f"{i}: {path}")

    # Check environment variables
    print("\n=== Environment Variables ===")
    for key, value in sorted(os.environ.items()):
        if key.startswith('PYTHON') or 'GOOGLE' in key or 'FIREBASE' in key:
            print(f"{key}: {value}")

    print("\n=== Test Complete ===")