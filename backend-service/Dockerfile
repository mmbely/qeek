FROM python:3.12-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .
COPY src ./src
COPY tests ./tests
# Copy environment file with a different name
COPY env.production ./.env

# Print environment info
RUN python -c "import sys; print(f'Python version: {sys.version}')"
RUN python -c "import os; print(f'Current directory: {os.getcwd()}')"
RUN python -c "import os; print(f'Directory contents: {os.listdir(\".\")}')"
RUN pip list

# Expose port for Cloud Run
EXPOSE 8080

# Run the web service by default, but allow override via CMD
ENTRYPOINT ["python"]
CMD ["main.py"]