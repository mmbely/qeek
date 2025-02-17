import os
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
FIREBASE_PROJECT_ID = os.getenv('FIREBASE_PROJECT_ID')