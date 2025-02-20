import express from 'express';
import { spawn } from 'child_process';
import path from 'path';

const router = express.Router();

router.post('/sync', async (req, res) => {
  const { repositoryName, userId, accountId } = req.body;

  if (!repositoryName || !userId || !accountId) {
    return res.status(400).json({ 
      error: 'Missing required parameters: repositoryName, userId, or accountId' 
    });
  }

  console.log('Received sync request:', { repositoryName, userId, accountId });

  // Get absolute path to Python script
  const scriptPath = path.resolve(__dirname, '../../../repository-indexer/src/main.py');
  const venvPython = path.resolve(__dirname, '../../../repository-indexer/venv/bin/python3');

  console.log(`Starting sync for repository: ${repositoryName}`);
  
  // Use spawn instead of exec to get real-time output
  const pythonProcess = spawn(venvPython, [
    scriptPath,
    repositoryName,
    userId,
    accountId
  ]);

  // Handle real-time output
  pythonProcess.stdout.on('data', (data) => {
    console.log('Python output:', data.toString());
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error('Python error:', data.toString());
  });

  // Handle process completion
  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });

  // Send immediate response
  return res.status(200).json({ 
    message: 'Sync started successfully',
    status: 'syncing'
  });
});

export default router;
