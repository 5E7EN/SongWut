<h1 align='center'>
  SongWut Detection Scripts
</h1>

<p align='center'>
  A Node Driven Song Discovery Service
</p>

<p align='center'>
  <a href="#"><img alt="Node.js Icon" src="https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" /></a>
  &nbsp;
  <a href="#"><img alt="Shazam Icon" src="https://img.shields.io/badge/Shazam-0088FF?style=for-the-badge&logo=Shazam&logoColor=white" /></a>
</p>

## About

This project contains the scripts necessary for song detection, as called by the Asterisk dailplan.  
Powered by RapidAPI/Shazam.

## Prerequisites

-   [RapidAPI](https://rapidapi.com) account
-   Shazam API key by subscribing to the BASIC tier on this RapidAPI project: https://rapidapi.com/apidojo/api/shazam
-   Node.js 22.12.0

## Installation

-   Install dependencies - `yarn install`
-   Copy `.env.example` to `.env` and populate with your API key

## Usage

Run the script with the following command:

```bash
node detectAndNotify.js <path-to-audio-file> <caller-id-number> [caller-id-name]
```

-   `<path-to-audio-file>` - Path to audio file. Most formats are supported. Shouldn't be more than 7 seconds long.
-   `<caller-id-number>` - The caller ID number of the caller. A text will be sent to this number upon detection.
-   `[caller-id-name]` - Optional. The caller ID name of the caller. Surround with quotes if it contains spaces (as we do in the dailplan).

By default, the script will not log anything too useful to the console (other than indicating success or failure) and will send a text message upon successful detection.

## Debugging

To enable verbose logging, set the `DEBUG__LOG_TO_CONSOLE` variable to `true` in `detectAndNotify.js`. This will also disable the text message sending.
