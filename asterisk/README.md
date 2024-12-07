# Asterisk

Configured on a FreePBX server.

## Setup

-   Install nodejs via NVM (v16.20.2 works fine)
    -   Then install yarn - `npm install -g yarn`
-   Install dependencies - `yarn install`

More coming soon...

## Helpful Commands

-   `sudo su` (required for most Asterisk management stuff)
-   `nano /etc/asterisk/extensions_custom.conf`
-   `asterisk -rx "dialplan reload"`
-   `tail -f /var/log/asterisk/full`
