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

# Print available models
print("Available models:")
for model in genai.list_models():
    print(f"- {model.name}")

# Test a simple prompt with the first available text model
try:
    # Find a text generation model
    text_models = [m for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
    
    if text_models:
        model_name = text_models[0].name.split('/')[-1]  # Extract just the model name
        print(f"\nUsing model: {model_name}")
        
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hello, world!")
        print("API Key is valid. Response:")
        print(response.text)
    else:
        print("No text generation models found")
except Exception as e:
    print(f"Error testing API key: {str(e)}")