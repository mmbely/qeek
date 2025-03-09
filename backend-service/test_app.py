from flask import Flask, jsonify
import os
import sys

app = Flask(__name__)

@app.route('/', methods=['GET'])
def hello_world():
    return jsonify({
        "status": "healthy",
        "message": "Hello, World!",
        "python_version": sys.version,
        "current_directory": os.getcwd(),
        "directory_contents": os.listdir(".")
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
