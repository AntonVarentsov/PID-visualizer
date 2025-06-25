const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

console.log(`Watching for file changes in ${dataDir}`);

async function processFilePair(pdfFilename) {
    const jsonFilename = pdfFilename.replace('.pdf', '.pdf_processed.json');
    const pdfPath = path.join(dataDir, pdfFilename);
    const jsonPath = path.join(dataDir, jsonFilename);

    try {
        // Check if both files exist
        await fs.access(pdfPath);
        await fs.access(jsonPath);

        console.log(`Found matching pair: ${pdfFilename} and ${jsonFilename}`);

        // 1. Add document to DB via API
        const docResponse = await axios.post(`${API_BASE_URL}/documents/`, {
            file_name: pdfFilename,
            pages: 1 // Placeholder, ideally we'd get this from the pdf
        });

        if (docResponse.status === 200) {
            const documentId = docResponse.data.id;
            console.log(`Added document ${pdfFilename} to DB with ID: ${documentId}`);

            // 2. Parse JSON for the document
            const jsonData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
            
            const payload = {
                ...jsonData,
                line_numbers: jsonData.line_numbers.map(ln => ({...ln, page: 1}))
            };

            await axios.post(`${API_BASE_URL}/documents/${documentId}/parse-json`, payload);

            console.log(`Successfully processed and sent data for document ID: ${documentId}`);
        }
    } catch (error) {
        if (error.code !== 'ENOENT') { // Ignore "file not found" errors during initial scan
            console.error(`Error processing file pair for ${pdfFilename}:`, error);
        }
    }
}

async function initialScan() {
    console.log('Performing initial scan of data directory...');
    try {
        const files = await fs.readdir(dataDir);
        const pdfFiles = files.filter(f => f.endsWith('.pdf'));

        for (const pdfFile of pdfFiles) {
            await processFilePair(pdfFile);
        }
        console.log('Initial scan complete.');
    } catch (error) {
        console.error('Error during initial scan:', error);
    }
}

// Ensure the data directory exists and then run the initial scan
fs.mkdir(dataDir, { recursive: true })
    .then(() => initialScan())
    .then(() => {
        // After initial scan, start watching for new files
        const watcher = chokidar.watch(path.join(dataDir, '*.pdf'), {
            persistent: true,
            ignoreInitial: true, // Don't re-process files on start
        });

        watcher.on('add', (filePath) => {
            const filename = path.basename(filePath);
            console.log(`New PDF file detected: ${filename}`);
            processFilePair(filename);
        });
    });


process.on('SIGINT', () => {
  console.log('Stopping file watcher...');
  process.exit(0);
});
