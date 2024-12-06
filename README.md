# SongWut

Shazam, but via Phone-In, for yeshivalite. Wut??

## Versions

#### Twilio (`twilio/`)

An API serving as a backend for Twilio webhook calls.

### Asterisk (`asterisk/`)

A custom phone system powered by Asterisk (and FreePBX if you want).  
Involves manually buying a DID from your provider of choice (we chose voip.ms), setting up a SIP trunk, and configuring the dialplan.  
We used Vultr to host the FreePBX server.

More complicated, but more control.
