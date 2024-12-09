# Asterisk

Configured on a FreePBX server.

## Setup

### Shazam API

-   Get a free Shazam API key by subscribing to the BASIC tier on this RapidAPI project: https://rapidapi.com/apidojo/api/shazam
    -   Keep it handy for the upcoming steps

### SIP Provider

-   Get a DID from [voip.ms](https://voip.ms) or your preferred SIP provider
    -   Configure it as a softphone

### Infrastructure

-   Deploy a Debian cloud server for FreePBX -
    -   Minimum RAM: 2GB
-   Install FreePBX -
    -   Log into the system as `root`
    -   Execute install script -
        ```bash
        wget https://github.com/FreePBX/sng_freepbx_debian_install/raw/master/sng_freepbx_debian_install.sh -O /tmp/sng_freepbx_debian_install.sh
        bash /tmp/sng_freepbx_debian_install.sh
        ```
-   In your firewall, allow the following inbound ports:
    -   HTTP 80 (restrict to your IP, for FreePBX management)
    -   UDP 5060 (SIP, open to all)
    -   UDP 10000-20000 (RTP, open to all, or restrict to IP of POP)

### FreePBX Configuration

-   Open the FreePBX web interface in a browser - `http://<server-ip>`
-   Follow the setup wizard
-   Go to Connectivity -> Trunks -> Add Trunk -> Add SIP (chan_pjsip) Trunk
    -   Trunk Name: voipms
    -   Outbound CallerID: \<voipms DID\>
    -   Maximum Channels: 2 (prevent abuse, even though we won't be using outbound)
    -   -> pjsip Settings:
        ```
        Username: <voipms subaccount username[sipusername_subaccountusername]>
        Secret: <voipms subaccount password>
        SIP Server: <voipms DID server>
        Context: custom-songwut-handler
        ```
    -   Submit
-   Create all system recordings found in [here](./var/lib/asterisk/sounds/en/custom) via the FreePBX GUI (Admin -> System Recordings) - retaining the names as they are (without `.wav` - https://i.5e7en.me/byEaqzxTKKlM.png)
-   Click on Apply Config on the top right corner

### Asterisk Configuration - via SSH

-   Copy the [songwut script folder](./var/lib/asterisk/agi-bin/songwut) to `/var/lib/asterisk/agi-bin/songwut`, set the permissions, and make the detection script executable
    ```bash
    # Set owner as asterisk
    chown -R asterisk:asterisk /var/lib/asterisk/agi-bin/songwut/*
    # Make the script executable
    chmod +x /var/lib/asterisk/agi-bin/songwut/detectAndNotify.js
    ```
-   Create a .env file in the songwut folder using the [.env.example](./var/lib/asterisk/agi-bin/songwut/.env.example) template and populate it.
    -   Once created, change its owner to `asterisk` (!)
    ```bash
    chown asterisk:asterisk /var/lib/asterisk/agi-bin/songwut/.env
    ```
-   Install nodejs via NVM (v16.20.2 works fine)
    -   Then install yarn - `npm install -g yarn`
-   Install dependencies in the songwut folder - `yarn install`
-   Copy the contents of [/etc/asterisk/extensions_custom.conf](./etc/asterisk/extensions_custom.conf) to `/etc/asterisk/extensions_custom.conf` (delete the existing contents, if any)
-   Reload the dialplan - `asterisk -rx "dialplan reload"`

### Testing

-   Test the setup by calling the DID

## Helpful Commands

-   `sudo su` (required for most Asterisk management stuff)
-   `nano /etc/asterisk/extensions_custom.conf`
-   `asterisk -rx "dialplan reload"`
-   `tail -f /var/log/asterisk/full`
-   `tail -f /var/lib/asterisk/agi-bin/songwut/logs/full.log`
-   Made changes on voip.ms and lost connection? Re-register -
    -   Asterisk CLI: `asterisk -r`
    -   `pjsip send register voipms`
