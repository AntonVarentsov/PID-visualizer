const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const dataDir = path.join(__dirname, '..', 'data');

// Configure your PostgreSQL connection
const pool = new Pool({
  user: 'your_user',
  host: 'localhost',
  database: 'your_db',
  password: 'your_password',
  port: 5432,
});

console.log(`Watching for file changes in ${dataDir}`);

// Ensure the data directory exists
if (!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir, { recursive: true });
}

fs.watch(dataDir, (eventType, filename) => {
  if (eventType === 'rename' && filename) { // 'rename' often means a new file was added
    console.log(`New file detected: ${filename}`);
    
    if (filename.endsWith('.pdf')) {
      const jsonFilename = filename.replace('.pdf', '.pdf_processed.json');
      const jsonPath = path.join(dataDir, jsonFilename);

      // Check if the corresponding JSON file exists
      fs.access(jsonPath, fs.constants.F_OK, (err) => {
        if (!err) {
          console.log(`Found matching pair: ${filename} and ${jsonFilename}`);
          // Here you would call a function to process the files and add to DB
          addDocumentToDb(filename);
        }
      });
    }
  }
});

async function addDocumentToDb(pdfFilename) {
  // In a real implementation, you would get page count from the PDF or JSON
  const pageCount = 1; // Placeholder
  
  const query = 'INSERT INTO documents(file_name, pages) VALUES($1, $2) RETURNING id';
  const values = [pdfFilename, pageCount];

  try {
    const res = await pool.query(query, values);
    console.log(`Added document ${pdfFilename} to DB with ID: ${res.rows[0].id}`);
  } catch (err) {
    console.error('Error inserting document into DB', err.stack);
  }
}

process.on('SIGINT', () => {
  pool.end(() => {
    console.log('Pool has ended');
    process.exit(0);
  });
}); 