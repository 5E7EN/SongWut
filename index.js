const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

require('dotenv').config();

// Constants
const INPUT_DIR = './temp';
const INPUT_FILE = path.join(INPUT_DIR, 'input.m4a');

// Ensure temp dir exists, create if not
if (!fs.existsSync(INPUT_DIR)) {
    fs.mkdirSync(INPUT_DIR, { recursive: true });
}

async function convertAudio(filePath) {
    return new Promise((resolve, reject) => {
        console.log('Converting...');

        const convertedPath = filePath.replace(path.extname(filePath), '.dat');
        const ffmpeg = spawn('ffmpeg', ['-i', filePath, '-ac', '1', '-f', 's16le', '-acodec', 'pcm_s16le', '-ar', '44100', '-y', convertedPath]);

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log('Conversion complete.');
                resolve(convertedPath);
            } else {
                reject(new Error(`ffmpeg process exited with code ${code}`));
            }
        });
    });
}

async function identifyAudioFile(filePath) {
    console.log('Identifying...');

    // Check file size
    const audioFileSizeKB = Math.round(fs.statSync(filePath).size / 1024);
    if (audioFileSizeKB > 500) {
        throw new Error('Audio file is too large. Must be less than 500KB.');
    }

    // Convert audio file to base64
    const audioBase64 = fs.readFileSync(filePath, 'base64');

    // Upload to Shazam API
    try {
        const response = await axios.post('https://shazam.p.rapidapi.com/songs/v2/detect', audioBase64, {
            headers: {
                'x-rapidapi-host': 'shazam.p.rapidapi.com',
                'x-rapidapi-key': process.env.SHAZAM_API_KEY,
                'content-type': 'text/plain'
            }
        });

        const data = response.data;

        // Check if audio was identified
        if (!data?.track) {
            return null;
        }

        // Return title and artist
        return data;
    } catch (error) {
        console.error('Error uploading to Shazam API:', error.message);
        throw error;
    }
}

(async () => {
    const rawFilePath = await convertAudio(INPUT_FILE);

    try {
        const result = await identifyAudioFile(rawFilePath);

        if (result !== null) {
            console.log(`Song: "${result.track.title}" by "${result.track.subtitle}"`);
        } else {
            console.log('Could not identify song.');
            return;
        }
    } catch (error) {
        console.error('Error identifying audio:', error.message);
    }
})();
