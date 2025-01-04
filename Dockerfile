# Base Image: Use the official Debian base image
FROM debian:bullseye

# Metadata
LABEL maintainer="5E7EN"
LABEL description="SongWut Asterisk App"

# Environment Variables
ENV ASTERISK_VERSION 20.11.0

# Install prerequisites
RUN apt-get update && apt-get install -y \
    build-essential \
    wget \
    curl \
    sudo \
    sox \
    ffmpeg \
    fail2ban \
    iputils-ping \
    nano \
    libncurses5-dev \
    libssl-dev \
    libxml2-dev \
    libsqlite3-dev \
    uuid-dev \
    libjansson-dev \
    libedit-dev \
    gettext \
    sngrep \
    && rm -rf /var/lib/apt/lists/*

# Add asterisk user and group
RUN groupadd asterisk && \
    useradd -m -s /bin/bash -g asterisk asterisk

# Download, compile, and install Asterisk
RUN wget https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-${ASTERISK_VERSION}.tar.gz
RUN tar -xzf asterisk-${ASTERISK_VERSION}.tar.gz
RUN cd asterisk-${ASTERISK_VERSION} && \
    ./configure --with-jansson-bundled && \
    make && \
    make install && \
    make samples && \
    make config && \
    make install-logrotate && \
    make dist-clean && \
    cd .. && \
    rm -rf asterisk-${ASTERISK_VERSION}*

# Configure Asterisk to run as a non-root user (asterisk)
RUN sed -i 's/;runuser = asterisk/runuser = asterisk/' /etc/asterisk/asterisk.conf && \
    sed -i 's/;rungroup = asterisk/rungroup = asterisk/' /etc/asterisk/asterisk.conf

# Enable verbose logging
RUN sed -i 's/;verbose = 3/verbose = 3/' /etc/asterisk/asterisk.conf

# Copy asterisk configuration files
#! .dockerignore is being ignored. not cool docker
COPY ./etc/asterisk /etc/asterisk
COPY ./var/lib/asterisk/sounds/en/custom /var/lib/asterisk/sounds/en/custom
COPY ./var/lib/asterisk/agi-bin/songwut /var/lib/asterisk/agi-bin/songwut

# Copy fail2ban configuration files
COPY ./etc/fail2ban /etc/fail2ban

# Set permissions for detection scripts folder for next step
RUN chown -R asterisk:asterisk /var/lib/asterisk

# Install Node.js and Yarn for detection scripts
RUN su - asterisk -c "wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash" && \
    su - asterisk -c ". /home/asterisk/.nvm/nvm.sh && \
    nvm install 22.12.0 && \
    nvm use 22.12.0 && \
    npm install -g yarn && \
    cd /var/lib/asterisk/agi-bin/songwut && \
    yarn install"

# Set permissions for Asterisk
RUN chown -R asterisk:asterisk /etc/asterisk \
    /var/lib/asterisk \
    /var/log/asterisk \
    /var/spool/asterisk \
    /usr/lib/asterisk \
    /var/run/asterisk \
    /usr/sbin/asterisk

# Expose necessary ports
# Do we still need this if ports are defined in docker-compose.yml?
# EXPOSE 5060/udp 10000-20000/udp

# Copy the entrypoint script
COPY ./docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set the default user
# Skipped so that entrypoint can be run as root; this should be reconsidered in the future (עיין שם)
# USER asterisk

# Entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
# Start Asterisk
CMD ["asterisk", "-f"]
