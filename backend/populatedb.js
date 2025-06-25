const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { parse } = require('json2csv');
const db = require('./initialize_db'); 

const SAMPLE_FILE = './uploads/Sample major elements Correct.csv';
const OUT_DIR = './uploads';
const NUM_FILES = 6; // Number of fake files to generate
const PERTURBATION_PERCENT = 5; // Percentage variation for numeric values
const TIME_OFFSET_MINUTES = 30; // Minutes between each fake file's timestamps

// Sample types for realistic variation
const SAMPLE_TYPES = [
    'Blank', 'Standard', 'Sample', 'QC', 'Duplicate', 'Spike', 'Control'
];

// Rack positions for realistic variation
const RACK_POSITIONS = [
    'S1:1', 'S1:2', 'S1:3', 'S1:4', 'S1:5', 'S1:6', 'S1:7', 'S1:8',
    'S2:1', 'S2:2', 'S2:3', 'S2:4', 'S2:5', 'S2:6', 'S2:7', 'S2:8',
    'S3:1', 'S3:2', 'S3:3', 'S3:4', 'S3:5', 'S3:6', 'S3:7', 'S3:8'
];

/**
 * Perturb a numeric value by a random percentage
 */
function perturbValue(value, perturbationPercent = PERTURBATION_PERCENT) {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    // For values close to 0, add small random noise instead of percentage
    if (Math.abs(num) < 0.01) {
        const noise = (Math.random() - 0.5) * 0.02; // ±0.01 noise
        return parseFloat((num + noise).toFixed(2));
    }
    
    const variation = num * (Math.random() * 2 * perturbationPercent / 100 - perturbationPercent / 100);
    return parseFloat((num + variation).toFixed(2));
}

/**
 * Shift timestamp by specified minutes
 */
function shiftTime(original, offsetMinutes) {
    // Handle different date formats
    let date;
    
    if (original.includes('-') && original.includes(':')) {
        // Format: "28-04-2025 13:36"
        const [datePart, timePart] = original.split(' ');
        const [day, month, year] = datePart.split('-');
        const [hour, minute] = timePart.split(':');
        date = new Date(year, month - 1, day, hour, minute);
    } else {
        date = new Date(original);
    }
    
    if (isNaN(date.getTime())) return original;
    
    const newDate = new Date(date.getTime() + offsetMinutes * 60 * 1000);
    
    // Return in same format as original
    const day = String(newDate.getDate()).padStart(2, '0');
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const year = newDate.getFullYear();
    const hour = String(newDate.getHours()).padStart(2, '0');
    const minute = String(newDate.getMinutes()).padStart(2, '0');
    
    return `${day}-${month}-${year} ${hour}:${minute}`;
}

/**
 * Check if a value is numeric
 */
function isNumericCol(val) {
    if (typeof val !== 'string') return false;
    return /^-?\d*\.?\d+([eE][+-]?\d+)?$/.test(val.trim());
}



/**
 * Read and parse the sample CSV file
 */
function readSampleRows() {
    return new Promise((resolve, reject) => {
        const rows = [];
        
        if (!fs.existsSync(SAMPLE_FILE)) {
            reject(new Error(`Sample file not found: ${SAMPLE_FILE}`));
            return;
        }
        
        fs.createReadStream(SAMPLE_FILE)
            .pipe(csv({
                skipEmptyLines: true,
                trim: true
            }))
            .on('data', (row) => {
                // Clean both keys and values from quotes and whitespace
                const cleanedRow = {};
                for (const [key, value] of Object.entries(row)) {
                    const cleanKey = key.replace(/^"?(.*?)"?$/, '$1').trim();
                    const cleanValue = typeof value === 'string' ? 
                        value.replace(/^"?(.*?)"?$/, '$1').trim() : value;
                    cleanedRow[cleanKey] = cleanValue;
                }
                
                rows.push(cleanedRow);
            })
            .on('end', () => {
                console.log(`Read ${rows.length} rows from sample file`);
                if (rows.length > 0) {
                    console.log('Column headers:', Object.keys(rows[0]));
                }
                resolve(rows);
            })
            .on('error', reject);
    });
}

/**
 * Insert fake data into database
 */
async function insertIntoDatabase(filename, type, rows) {
    const uploadedAt = new Date().toISOString();

    try {
        const result = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO uploaded_files (filename, path, type, uploaded_at) VALUES (?, ?, ?, ?)`,
                [filename, filename, type, uploadedAt],
                function(err) {
                    if (err) reject(err);
                    else resolve({ lastID: this.lastID });
                }
            );
        });

        const fileId = result.lastID;
        console.log(`Inserted file record with ID: ${fileId}`);

        // Insert rows into qc_data table
        for (const row of rows) {
            row['file_id'] = fileId;

            const keys = Object.keys(row);
            const escapedKeys = keys.map(key => `[${key}]`);
            const placeholders = keys.map(() => '?').join(',');
            const values = keys.map(k => row[k]);

            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO qc_data (${escapedKeys.join(',')}) VALUES (${placeholders})`,
                    values,
                    function(err) {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }

        console.log(`Inserted ${rows.length} data rows for file ${filename}`);
        return fileId;

    } catch (error) {
        console.error(`Error inserting data for ${filename}:`, error);
        throw error;
    }
}

/**
 * Generate fake CSV files based on sample data
 */
async function generateFakeFiles() {
    try {
        // Ensure output directory exists
        if (!fs.existsSync(OUT_DIR)) {
            fs.mkdirSync(OUT_DIR, { recursive: true });
        }

        // Read original sample data
        const originalRows = await readSampleRows();
        
        if (originalRows.length === 0) {
            throw new Error('No data found in sample file');
        }

        console.log(`Generating ${NUM_FILES} fake files...`);

        for (let i = 1; i <= NUM_FILES; i++) {
            const fakeRows = originalRows.map((row, rowIndex) => {
                const newRow = {};
                
                for (const [key, value] of Object.entries(row)) {
                    const lowerKey = key.toLowerCase();
                    
                    // Handle timestamp columns
                    if (lowerKey.includes('timestamp') || lowerKey.includes('date') || lowerKey.includes('time')) {
                        newRow[key] = shiftTime(value, i * TIME_OFFSET_MINUTES + rowIndex * 2);
                    }

                    // Handle numeric columns (ppm values and c/s values)
                    else if (isNumericCol(value)) {
                        newRow[key] = perturbValue(value);
                    }
                    // Keep other values as-is
                    else {
                        newRow[key] = value;
                    }
                }
                
                return newRow;
            });

            // Generate filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fakeFileName = `fake_sample_${i}_${timestamp}.csv`;
            const fakeFilePath = path.join(OUT_DIR, fakeFileName);

            // Convert to CSV
            const csvData = parse(fakeRows, {
                quote: '"',
                escape: '"',
                header: true
            });

            // Write to file
            fs.writeFileSync(fakeFilePath, csvData);

            // Insert into database (type 1 for QC data)
            await insertIntoDatabase(fakeFileName, 1, fakeRows);

            console.log(`Generated: ${fakeFileName}`);

            // Progress update
            if (i % 5 === 0) {
                console.log(`Progress: ${i}/${NUM_FILES} files generated`);
            }
        }

        console.log(`Successfully generated ${NUM_FILES} fake files in ${OUT_DIR}`);
        
    } catch (error) {
        console.error('Error generating fake files:', error);
        throw error;
    }
}

/**
 * Main execution function
 */
async function main() {
    try {
        console.log('Starting fake data generation...');
        console.log(`Sample file: ${SAMPLE_FILE}`);
        console.log(`Output directory: ${OUT_DIR}`);
        console.log(`Number of files to generate: ${NUM_FILES}`);
        console.log(`Perturbation percentage: ${PERTURBATION_PERCENT}%`);
        
        await generateFakeFiles();
        
        console.log('Fake data generation completed successfully!');
        
    } catch (error) {
        console.error('Failed to generate fake data:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    generateFakeFiles,
    perturbValue,
    shiftTime,
    isNumericCol
};