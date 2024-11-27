const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const unzipper = require('unzipper');

const app = express();
const terminalApp = express();

const PORT = process.env.PORT || 3000;
const TERMINAL_PORT = 4000;

// Uploads folder
const uploadsFolder = path.join(__dirname, 'uploads');

// Ensure uploads folder exists
if (!fs.existsSync(uploadsFolder)) {
    fs.mkdirSync(uploadsFolder);
}

// Middleware
app.use(express.json());
app.use(express.static(uploadsFolder));
app.use(express.urlencoded({ extended: true }));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsFolder),
    filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// API Routes
// Upload file
app.post('/upload', upload.single('file'), (req, res) => {
    res.send({ message: 'File uploaded successfully!', file: req.file });
});

// View uploads
app.get('/uploads', (req, res) => {
    fs.readdir(uploadsFolder, (err, files) => {
        if (err) return res.status(500).send('Error reading uploads folder');
        res.send(files);
    });
});

// Delete file
app.delete('/delete/:filename', (req, res) => {
    const filePath = path.join(uploadsFolder, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).send('Error deleting file');
        res.send('File deleted successfully');
    });
});

// Unzip file
app.post('/unzip/:filename', (req, res) => {
    const filePath = path.join(uploadsFolder, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
    if (!filePath.endsWith('.zip')) return res.status(400).send('Not a ZIP file');

    fs.createReadStream(filePath)
        .pipe(unzipper.Extract({ path: uploadsFolder }))
        .on('close', () => res.send('File unzipped successfully'))
        .on('error', (err) => res.status(500).send(`Error unzipping file: ${err.message}`));
});

// Terminal server for running commands
terminalApp.use(express.json());
terminalApp.post('/command', (req, res) => {
    const command = req.body.command;
    exec(command, { cwd: uploadsFolder }, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: error.message });
        if (stderr) return res.status(500).json({ stderr });
        res.json({ stdout });
    });
});

// Start servers
app.listen(PORT, () => console.log(`Main server running on http://localhost:${PORT}`));
terminalApp.listen(TERMINAL_PORT, () =>
    console.log(`Terminal server running on http://localhost:${TERMINAL_PORT}`)
);
