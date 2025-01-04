#!/bin/bash

set -e

# Ensure required environment variables are set
: "${SIP_SERVER_HOST:?Environment variable SIP_SERVER_HOST is required}"
: "${SIP_SERVER_PORT:?Environment variable SIP_SERVER_PORT is required}"
: "${SIP_USERNAME:?Environment variable SIP_USERNAME is required}"
: "${SIP_PASSWORD:?Environment variable SIP_PASSWORD is required}"
: "${SERVER_IP:?Environment variable SERVER_IP is required}"
: "${YOUR_IP:?Environment variable YOUR_IP is required}"
: "${SERVER_NETWORK_SUBNET:?Environment variable SERVER_NETWORK_SUBNET is required}"

# Replace placeholders in Asterisk configuration files
#* Files are owned by `asterisk` user
if ls /etc/asterisk/*.template >/dev/null 2>&1; then
    for file in /etc/asterisk/*.template; do
        target="${file%.template}"

        envsubst \
            '${SIP_SERVER_HOST} ${SIP_SERVER_PORT} ${SIP_USERNAME} ${SIP_PASSWORD} ${SERVER_IP} ${SERVER_NETWORK_SUBNET}' \
            < "$file" > "$target"

        # Remove the template file
        rm "$file"

        echo "[Env Injection] Processed $file > $target"
    done
fi

# Replace placeholders in fail2ban configuration files
# TODO: This is the only thing that requires root, consider changing this.
if ls /etc/fail2ban/*.template >/dev/null 2>&1; then
    for file in /etc/fail2ban/*.template; do
        target="${file%.template}"

        envsubst '${SERVER_IP} ${YOUR_IP}' < "$file" > "$target"

        # Remove the template file
        rm "$file"

        echo "[Env Injection] Processed $file > $target"
    done
fi

# Start fail2ban
fail2ban-client -x start

# Change user to asterisk for further commands
#* Docker exec will still run as root: https://stackoverflow.com/questions/47410217/how-can-i-run-entrypoint-as-root-user#comment90862104_47410394
su - asterisk

# Execute the provided command or start Asterisk
exec "$@"
