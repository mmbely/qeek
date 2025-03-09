import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key
api_key = os.getenv('GEMINI_API_KEY')
print(f"API Key (first 10 chars): {api_key[:10] if api_key else 'None'}")

# Configure Gemini
genai.configure(api_key=api_key)

# Test with a specific model
try:
    # Try with gemini-2.0-flash-lite which is our production model
    model_name = "gemini-2.0-flash-lite"
    print(f"Testing with model: {model_name}")
    
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("Hello, world!")
    print("API Key is valid. Response:")
    print(response.text)
except Exception as e:
    print(f"Error testing API key with {model_name}: {str(e)}")