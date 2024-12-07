const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const winston = require('winston');

require('dotenv').config({ path: path.join(__dirname, '.env') });

// Change this to 'true' to enable logging to console, but don't forget to change it back
// before invoking via Asterisk - because Asterisk determines success based on the first stdout line.
const DEBUG__LOG_TO_CONSOLE = false;

// Constants/args
const LOG_LEVEL = 'debug'; // Winston log level
const SHAZAM_RESPONSES_DIR = path.join(__dirname, 'responses'); // Directory for json responses from Shazam API
const LOGS_DIR = path.join(__dirname, 'logs'); // Directory for log files
const audioClipPath = process.argv[2]; // Path to the recorded file passed from Asterisk
const callerNumber = process.argv[3]; // Caller ID passed from Asterisk
const audioClipFilename = path.basename(audioClipPath, path.extname(audioClipPath)); // Filename without path or extension

// Create winston logger
const logger = winston.createLogger({
    level: LOG_LEVEL,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(
            ({ timestamp, message, level }) =>
                `${timestamp} - ${level.toUpperCase().padEnd(7)} ` +
                `[${audioClipFilename}] ${message}`
        )
    ),
    // Log to files (`combined.log` and `<audioClipFilename>.log` in `./logs`)
    // Or, if debug mode is set, log to console only
    transports: !DEBUG__LOG_TO_CONSOLE
        ? [
              new winston.transports.File({
                  filename: path.join(LOGS_DIR, `${audioClipFilename}.log`)
              }),
              new winston.transports.File({ filename: LOGS_DIR + '/full.log' })
          ]
        : [new winston.transports.Console()]
});

// Indicate beginning of log
logger.info('---');

// Ensure clip path and caller number were provided
if (!audioClipPath || !callerNumber) {
    logger.error('Missing required CLI parameters');

    if (!DEBUG__LOG_TO_CONSOLE) {
        process.stdout.write('missing_parameters');
    }

    return;
} else {
    logger.debug(`Processing audio file: ${audioClipPath}`);
    logger.debug(`Caller number: ${callerNumber}`);
}

// Ensure responses dir exist, create if not
if (!fs.existsSync(SHAZAM_RESPONSES_DIR)) {
    logger.debug(`Creating directory for Shazam API response files: ${SHAZAM_RESPONSES_DIR}`);
    fs.mkdirSync(SHAZAM_RESPONSES_DIR, { recursive: true });
}

// Ensure logs dir exist, create if not
if (!fs.existsSync(LOGS_DIR)) {
    logger.debug(`Creating directory for invocation logs: ${LOGS_DIR}`);
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

async function convertAudio(filePath) {
    return new Promise((resolve, reject) => {
        logger.info('Converting to raw audio file...');

        const convertedPath = filePath.replace(path.extname(filePath), '.dat');
        const ffmpeg = spawn('ffmpeg', [
            '-i',
            filePath,
            '-ac',
            '1',
            '-f',
            's16le',
            '-acodec',
            'pcm_s16le',
            '-ar',
            '44100',
            '-y',
            convertedPath
        ]);

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                logger.debug('Conversion complete.');
                resolve(convertedPath);
            } else {
                reject(new Error(`ffmpeg process exited with code ${code}`));
            }
        });
    });
}

async function identifyAudioFile(filePath) {
    logger.info('Uploading to Shazam API...');

    // Ensure audio file is less than 700KB (Shazaam API limit more or less)
    const audioFileSizeKB = Math.round(fs.statSync(filePath).size / 1024);
    if (audioFileSizeKB > 700) {
        throw new Error(
            `Audio file is too large. Must be less than 700KB. Current size: ${audioFileSizeKB}`
        );
    } else {
        logger.debug(`Audio file size: ${audioFileSizeKB}KB`);
    }

    // Convert audio file to base64
    const audioBase64 = fs.readFileSync(filePath, 'base64');

    // Upload to Shazam API
    try {
        const response = await axios.post(
            'https://shazam.p.rapidapi.com/songs/v2/detect',
            audioBase64,
            {
                headers: {
                    'x-rapidapi-host': 'shazam.p.rapidapi.com',
                    'x-rapidapi-key': process.env.SHAZAM_API_KEY,
                    'content-type': 'text/plain'
                }
            }
        );

        const data = response.data;

        // Check if audio was identified
        if (!data?.track) {
            return null;
        }

        // Return title and artist
        return data;
    } catch (error) {
        logger.error(`Error uploading to Shazam API: ${error.message}`);
        throw error;
    }
}

(async () => {
    // Ensure audio file exists
    if (!fs.existsSync(audioClipPath)) {
        logger.error(`Audio file does not exist: ${audioClipPath}`);
        process.stdout.write('error_audio_file_not_found');
        process.exit(1);
    }

    try {
        let isIdentified = null;
        const rawAudioPath = await convertAudio(audioClipPath);
        const shazamResult = await identifyAudioFile(rawAudioPath);

        if (shazamResult === null) {
            isIdentified = false;
            logger.info('Audio could not be identified by Shazam');

            if (!DEBUG__LOG_TO_CONSOLE) {
                // Indicate no detect (as expected by Asterisk)
                process.stdout.write('no_detect');
            }
        } else {
            const song = shazamResult?.track?.title || 'unknown';
            const artist = shazamResult?.track?.subtitle || 'unknown';

            isIdentified = true;
            logger.info(`Song identified as: "${song}" by "${artist}"`);

            if (!DEBUG__LOG_TO_CONSOLE) {
                // Indicate success (as expected by Asterisk)
                process.stdout.write('success');
            }

            // TODO: Send text message with song and artist to callerNumber
        }

        // Delete raw audio file
        if (fs.existsSync(rawAudioPath)) {
            fs.unlinkSync(rawAudioPath);
        }

        // Save Shazam API response to a unique JSON file
        const jsonFilePath = path.join(
            SHAZAM_RESPONSES_DIR,
            (isIdentified ? '^' : '') + audioClipFilename + '.json'
        );
        fs.writeFileSync(jsonFilePath, JSON.stringify(shazamResult, null, 2), 'utf-8');
        logger.debug(`Shazam API response saved to ${jsonFilePath}`);
    } catch (error) {
        logger.error(`Error processing or identifying audio: ${error.message}`);

        if (!DEBUG__LOG_TO_CONSOLE) {
            process.stdout.write(`error_processing_or_identifying:${error.message}`);
        }
    }
})();
