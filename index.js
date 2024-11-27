const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const { exec } = require('child_process');
const unzipper = require('unzipper');
const fs = require('fs');
const util = require('util');
const rimraf = require('rimraf'); // For cleaning folders

const app = express();
const uploadsFolder = path.join(__dirname, 'uploads');

// Ensure uploads folder exists
if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder);
}

// Middleware
app.use(fileUpload());
app.use(express.static('public')); // Serve static files
app.use(express.json());

// Endpoint to upload files
app.post('/upload', async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const uploadedFile = req.files.file;
  const uploadPath = path.join(uploadsFolder, uploadedFile.name);

  try {
    // Move the uploaded file
    await util.promisify(uploadedFile.mv)(uploadPath);

    // Check if the file is a ZIP or RAR and extract it
    if (uploadedFile.mimetype === 'application/zip') {
      await fs
        .createReadStream(uploadPath)
        .pipe(unzipper.Extract({ path: uploadsFolder }))
        .promise();
      fs.unlinkSync(uploadPath); // Remove the ZIP file after extraction
    }

    res.send('File uploaded successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error occurred during upload.');
  }
});

// Endpoint to execute commands
app.post('/command', (req, res) => {
  const command = req.body.command;
  if (!command) {
    return res.status(400).send('Command is required.');
  }

  // Execute the command inside the uploads folder
  exec(command, { cwd: uploadsFolder }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).send(`Error: ${error.message}`);
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return res.status(500).send(`Stderr: ${stderr}`);
    }
    res.send(stdout);
  });
});

// Cleanup endpoint (optional for testing)
app.post('/cleanup', (req, res) => {
  rimraf.sync(uploadsFolder);
  fs.mkdirSync(uploadsFolder);
  res.send('Uploads folder cleaned.');
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
