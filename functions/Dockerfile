FROM node:20

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip python3-dev build-essential

# Set working directory
WORKDIR /app

# Copy package.json and install Node.js dependencies
COPY package.json ./
RUN npm install

# Copy Python requirements and install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Install Python dependencies again to ensure they're available
RUN cd /app && pip3 install --no-cache-dir -r requirements.txt

# Verify Python packages are installed
RUN python3 -c "import sys; print(sys.path)"
RUN python3 -c "import firebase_admin; print('firebase_admin is installed')" || echo "Failed to import firebase_admin"
RUN python3 -c "import github; print('PyGithub is installed')" || echo "Failed to import github"
RUN python3 -c "import google.cloud.firestore; print('google-cloud-firestore is installed')" || echo "Failed to import google.cloud.firestore"

# Build TypeScript
RUN npm run build

# Start the function
CMD ["npm", "run", "serve"]
