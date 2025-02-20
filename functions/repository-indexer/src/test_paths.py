from pathlib import Path
import os

# Print current working directory
print("Current working directory:", os.getcwd())

# Print path to this file
script_path = Path(__file__).resolve()
print("Script path:", script_path)

# Print path to root .env
root_dir = script_path.parent.parent.parent.parent
root_env_path = root_dir / '.env'
print("Root .env path:", root_env_path)
print("Root .env exists:", root_env_path.exists())

# Print path to firebase credentials in root directory
firebase_creds_path = root_dir / 'firebase-credentials.json'
print("Firebase credentials path:", firebase_creds_path)
print("Firebase credentials exist:", firebase_creds_path.exists())