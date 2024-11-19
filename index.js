const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const express = require('express');
const twilio = require('twilio');
const morgan = require('morgan');

require('dotenv').config();

// Constants
const INPUT_DIR = './temp';

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
    if (audioFileSizeKB > 700) {
        throw new Error(`Audio file is too large. Must be less than 500KB. Current size: ${audioFileSizeKB}`);
    } else {
        console.log(`Audio file size: ${audioFileSizeKB}KB`);
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

// Setup Express server
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// Twilio Voice API
const VoiceResponse = twilio.twiml.VoiceResponse;

app.get('/test', (res) => {
    res.send('xD');
});

app.post('/voice', (res) => {
    const response = new VoiceResponse();

    response.redirect('/prompt');

    res.type('text/xml');
    res.send(response.toString());
});

app.post('/prompt', (req, res) => {
    const response = new VoiceResponse();

    const gather = response.gather({
        numDigits: 1,
        action: '/handle-gather',
        method: 'POST'
    });

    gather.say({ voice: 'man' }, "Press any key to identify what's playing nearby.");

    response.redirect({ method: 'POST' }, '/repeat-prompt?attempt=1');

    res.type('text/xml');
    res.send(response.toString());
});

app.post('/repeat-prompt', (req, res) => {
    const attempt = parseInt(req.query.attempt, 10);

    if (attempt > 2) {
        const response = new VoiceResponse();
        response.say({ voice: 'man' }, 'We did not receive any input. Goodbye!');
        response.hangup();
        res.type('text/xml');
        return res.send(response.toString());
    }

    const response = new VoiceResponse();
    const gather = response.gather({
        numDigits: 1,
        action: '/handle-gather',
        method: 'POST'
    });

    gather.say({ voice: 'man' }, "Press any key to identify what's playing nearby.");

    // Wait 5 seconds
    response.pause({ length: 5 });
    // Repeat prompt
    response.redirect({ method: 'POST' }, `/repeat-prompt?attempt=${attempt + 1}`);

    res.type('text/xml');
    res.send(response.toString());
});

app.post('/handle-gather', (req, res) => {
    const digit = req.body.Digits;
    const response = new VoiceResponse();

    if (digit) {
        // response.say('Please wait while we identify your song.');
        response.record({
            maxLength: 7,
            action: '/handle-recording',
            recordingStatusCallback: '/recording-status',
            transcribe: false,
            playBeep: true
        });
    } else {
        response.say('Invalid input. Goodbye!');
        response.hangup();
    }

    res.type('text/xml');
    res.send(response.toString());
});

app.post('/handle-recording', async (req, res) => {
    const recordingUrl = `${req.body.RecordingUrl}.wav`;

    try {
        console.log('Downloading recorded audio...');
        console.log(recordingUrl);

        // Wait for 3 seconds (sometimes recording is available right away)
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const response = await axios({
            method: 'get',
            url: recordingUrl,
            responseType: 'stream',
            auth: {
                username: process.env.TWILIO_ACCOUNT_SID,
                password: process.env.TWILIO_AUTH_TOKEN
            }
        });

        // Save unique recording to local file
        const localAudioPath = path.join(INPUT_DIR, `${req.body.From}_${Date.now()}.wav`);
        const writer = fs.createWriteStream(localAudioPath);
        response.data.pipe(writer);

        writer.on('finish', async () => {
            console.log('Audio recording downloaded.');

            try {
                const rawAudioPath = await convertAudio(localAudioPath);
                const shazamResult = await identifyAudioFile(rawAudioPath);

                if (shazamResult === null) {
                    console.log('Could not identify song.');
                    return respondWithVoice(req, res, 'Sorry, we could not identify the song. Please try again later.');
                }

                const song = shazamResult?.track?.title || 'unknown';
                const artist = shazamResult?.track?.subtitle || 'unknown';

                console.log(`Identified: "${song}" by "${artist}"`);

                const messageParts = [
                    { text: 'The song is', voice: 'man' },
                    // { text: song, voice: containsHebrew(song) ? 'Google.he-IL-Standard-D' : 'man' },
                    { text: song, voice: 'Google.he-IL-Standard-D' },
                    { text: 'by', voice: 'man' },
                    { text: artist + '.', voice: 'Google.he-IL-Standard-D' },
                    { text: '<break> <break> This detection has been achieved thanks to our platinum sponsor: <break>', voice: 'man' },
                    { text: 'ישיבת תפארת ישראל.', voice: 'Google.he-IL-Standard-D' },
                    { text: '<break> <break> <break> Goodbye! ', voice: 'man' }
                    // { text: artist, voice: containsHebrew(artist) ? 'Google.he-IL-Standard-D' : 'man' }
                ];

                // Say the identified song
                respondWithDynamicVoice(req, res, messageParts);

                // Delete raw file (and maybe also the original recording down the line)
                [rawAudioPath].forEach((file) => {
                    if (fs.existsSync(file)) {
                        fs.unlinkSync(file);
                    }
                });
            } catch (error) {
                console.error('Error processing or identifying audio:', error.message);
                respondWithVoice(req, res, 'An error occurred while identifying the song.');
            }
        });
    } catch (error) {
        console.error('Error handling recording:', error.message);
        respondWithVoice(req, res, 'Could not process your recording. Goodbye.');
    }
});

function containsHebrew(text) {
    return /[\u0590-\u05FF]/.test(text);
}

function respondWithDynamicVoice(req, res, messageParts) {
    const response = new VoiceResponse();

    messageParts.forEach((part) => {
        response.say({ voice: part.voice }, part.text);
    });

    response.hangup();
    res.type('text/xml');
    res.send(response.toString());
}

function respondWithVoice(req, res, message) {
    const response = new VoiceResponse();
    response.say({ voice: 'man' }, message);
    response.hangup();

    res.type('text/xml');
    res.send(response.toString());
}

app.post('/recording-status', (req, res) => {
    console.log('[Twilio] Recording status:', req.body.RecordingStatus);
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Shazamin!! >:)`);
    console.log(`Call me on port ${PORT} 🤙`);
});
