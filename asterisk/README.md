# Asterisk

Configured on a FreePBX server.

## Setup

### Shazam API

-   Get a free Shazam API key by subscribing to the BASIC tier on this RapidAPI project: https://rapidapi.com/apidojo/api/shazam
    -   Keep it handy for the upcoming steps

### SIP Provider

-   [voip.ms] Purchase a DID: [voip.ms](https://voip.ms)
    -   Configure it as a softphone
-   [bulkvs] Purchase a DID: [bulkvs.com](https://bulkvs.com)
    -   Configure IP-based auth settings: https://www.bulkvs.com/faqs/voice-inboundip.php
-   Or any other perferred SIP provider...

### FreePBX Deployment

#### Infrastructure

-   Deploy a Debian cloud server for FreePBX -
    -   Minimum RAM: 2GB
    -   Ensure you have a static IP if using IP-based SIP auth (see bulkvs above)
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

#### FreePBX Configuration - via web GUI

-   Open the FreePBX web interface in a browser - `http://<server-ip>`
-   Follow the setup wizard
-   [voip.ms] Go to Connectivity -> Trunks -> Add Trunk -> Add SIP (chan_pjsip) Trunk
    -   Trunk Name: voipms
    -   Outbound CallerID: \<voipms DID\>
    -   Maximum Channels: 0 (prevent abuse, even though we won't be using outbound)
    -   -> pjsip Settings:
        ```
        Username: <voipms subaccount username[sipusername_subaccountusername]>
        Secret: <voipms subaccount password>
        SIP Server: <voipms DID server>
        Context: custom-songwut-handler
        ```
    -   Submit
-   [bulkvs] Go to Connectivity -> Trunks -> Add Trunk -> Add SIP (chan_pjsip) Trunk
    -   Trunk Name: bulkvs
    -   Outbound CallerID: \<bulkvs DID\>
    -   Maximum Channels: 0 (prevent abuse, even though we won't be using outbound)
    -   -> pjsip Settings:
        ```
        Authentication: None
        Registration: None
        SIP Server: sip.bulkvs.com
        SIP Server Port: 5060
        Context: custom-songwut-handler
        ```
    -   Submit
-   Create all system recordings found in [here](./var/lib/asterisk/sounds/en/custom) via the FreePBX GUI (Admin -> System Recordings) - retaining the names as they are (without `.wav` - https://i.5e7en.me/byEaqzxTKKlM.png)
-   Click on Apply Config on the top right corner

#### Asterisk Configuration - via SSH

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

### Standalone Asterisk Deployment

#### Infrastructure

-   Deploy a Debian cloud server for Asterisk -
    -   Minimum RAM: 512MB
    -   Ensure you have a static IP if using IP-based SIP auth
-   In your firewall, allow the following inbound ports:
    -   HTTP 80 (restrict to your IP, for FreePBX management)
    -   UDP 5060 (SIP, open to all)
    -   UDP 10000-20000 (RTP, open to all, or restrict to IP of POP)

Full instructions coming soon...

#### Asterisk Configuration - via SSH

-   Download, compile, and install Asterisk 20 - [Official Guide](https://docs.asterisk.org/Getting-Started/Installing-Asterisk/Installing-Asterisk-From-Source/What-to-Download/) -
    -   Copy the files in `/etc/asterisk` to the server
        Replace these placeholders found among the config files (mostly in `pjsip.*.conf`):
        -   `<bulkvs-trunk-username[sipusername_trunkname]>` - your SIP username/trunk name in bulkvs (e.g. `123456_trunkname`)
        -   `<username-in-pjsip.auth>` - same value as above
        -   `<bulkvs-trunk-password>` - your SIP password in bulkvs (as created in the "Manage Trunk Group - SIP Registration" dialog)
        -   `<server-ip>` - your server's public IP address
        -   `<server-network-subnet>` - your server's network address (e.g. `1.2.3.0/24`) (I might've named this variable wrong, I'm not a networking guy)
    -   Enable verbose logging in `/etc/asterisk/asterisk.conf`
        -   Uncomment the line `;verbose = 0` and set to `verbose = 3`
        -   This ensures we can see call logs in `/var/log/asterisk/full`. Disable this if storage is a concern.
    -   Follow [instructions below](#security-running-asterisk-as-a-non-root-user) to run Asterisk as a non-root user
    -   Restart asterisk core & reload dialplan
        -   `asterisk -rx "core restart now"`
        -   `asterisk -rx "dialplan reload"`
        -   `asterisk -rx 'logger reload'`
        -   `asterisk -rvvvvv`
        -   `systemctl restart asterisk`
-   Install fail2ban (still in process of setting up and configuring) -
    -   `apt install fail2ban`
    -   Copy files in `/etc/fail2ban` to the server
        In `jail.local`:
        -   Replace `<your-email>` with your email address (for intrusion alerts)
        -   Replace `<server-ip>` with your server's public IP address
        -   Replace `<your-ip>` with your public IP address (for whitelisting)
-   Setup node.js and copy detection scripts -

    -   Install nodejs via NVM (v16.20.2 works fine)
        -   Download NVM - `wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash`
        -   Enable NVM -
            ```bash
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
            [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
            ```
        -   Install node - `nvm install 16.20.2`
        -   Install yarn - `npm install -g yarn`
    -   Copy `detectAndNotify.js`, `package.json`, and `yarn.lock` from the [songwut script folder](./var/lib/asterisk/agi-bin/songwut) to `/var/lib/asterisk/agi-bin/songwut`, and then make the detection script executable -
        ```bash
        # Make the script executable
        chmod +x /var/lib/asterisk/agi-bin/songwut/detectAndNotify.js
        ```
    -   Create a `.env` file in the songwut folder using the [.env.example](./var/lib/asterisk/agi-bin/songwut/.env.example) template and populate it.
    -   Install project dependencies - `yarn install`
    -   Set owner of script files to asterisk user -
        ```bash
        # Set owner as asterisk
        chown -R asterisk:asterisk /var/lib/asterisk/agi-bin/songwut
        ```

-   Upload IVR recordings -
    -   Copy files in `/var/lib/asterisk/sounds/en/custom` to the server (create `custom` folder if not exists)
        -   If creating the `custom` folder as root, make sure to set the owner to `asterisk`:
        ```bash
        chown -R asterisk:asterisk /var/lib/asterisk/sounds/en/custom
        ```
        -   You might need to temporarily change the owner to your SSH user to upload the files via SFTP, then change it back to `asterisk` after the upload is complete using the command above.
-   Copy the contents of [/etc/asterisk/extensions.conf](./etc/asterisk/extensions.conf) to `/etc/asterisk/extensions.conf` (delete the existing contents, if any)
-   Reload the dialplan - `asterisk -rx "dialplan reload"`

We use SIP-based auth, not IP like above - even for bulkvs.  
Follow their registration instructions for [SIP Registration](https://i.5e7en.me/pwu0aHqX9qnr.png) and set the credentials as required in `/etc/asterisk/pjsip.auth.conf`.  
The configs are already mostly pre-filled with SIP server info for bulkvs - only excluding auth-related details.

We use fail2ban, even though **SSH should be setup as whitelist only by source IP**, and also because it can help with attacks against asterisk. Check out the [jail](./etc/fail2ban/jail.local) config for our implementation.

#### Security: Running Asterisk as a Non-Root User

-   Create a new user and group for Asterisk
    ```bash
    groupadd asterisk
    useradd -r -m -g asterisk asterisk
    ```
-   Change the ownership of the Asterisk files to the new user and group
    ```bash
    chown -R asterisk:asterisk \
    /etc/asterisk \
    /var/lib/asterisk \
    /var/log/asterisk \
    /var/spool/asterisk \
    /usr/lib/asterisk \
    /var/run/asterisk \
    /usr/sbin/asterisk
    ```
-   Set asterisk to run as the new user in `/etc/asterisk/asterisk.conf`
    -   Uncomment these lines (`;runuser` and `;rungroup`) and set them:
    ```bash
    runuser = asterisk
    rungroup = asterisk
    ```
-   Restart Asterisk - `systemctl restart asterisk`

### Testing

-   Test the setup by calling your number!

## Helpful Commands

-   `sudo su` (required for most Asterisk management stuff)
-   `nano /etc/asterisk/extensions_custom.conf`
-   `asterisk -rx "dialplan reload"`
-   `tail -f /var/log/asterisk/full`
-   `tail -f /var/lib/asterisk/agi-bin/songwut/logs/full.log`
-   Made changes on voip.ms and lost connection? Re-register -
    -   Asterisk CLI: `asterisk -r`
    -   `pjsip send register voipms`
-   Standalone Asterisk:
-   `asterisk -rx "core restart now"`
-   `asterisk -rvvvvv`
-   `service asterisk status`
