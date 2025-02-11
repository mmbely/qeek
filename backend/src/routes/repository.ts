import express from 'express';
import { spawn } from 'child_process';
import path from 'path';

const router = express.Router();

router.post('/sync', async (req, res) => {
  try {
    const { repositoryName, userId } = req.body;
    console.log('Received sync request:', { repositoryName, userId });

    // Get absolute path to Python script
    const scriptPath = path.resolve(__dirname, '../../../repository-indexer/src/main.py');
    const venvPython = path.resolve(__dirname, '../../../repository-indexer/venv/bin/python3');

    console.log(`Starting sync for repository: ${repositoryName}`);
    
    // Use spawn instead of exec to get real-time output
    const pythonProcess = spawn(venvPython, [
      scriptPath,
      repositoryName,
      userId
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

  } catch (error) {
    console.error('Route error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
