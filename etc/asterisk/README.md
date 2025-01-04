# Asterisk Config Files - PJSIP

Herein lies the config files for asterisk, for both FreePBX and standalone Asterisk-based deployments.

## Extensions File

-   Use `extensions_custom.conf` for FreePBX configurations.
    -   And that's all you'll need from this folder.
-   Use `extensions.conf` for standard Asterisk configurations.
    -   Plus all other config files found in this folder (except `extensions_custom.conf`) to configure Asterisk properly.

#### ~~They (should) maintain the same file contents since they essentially serve the same purpose.~~ (Not anymore) - FreePBX version (`extensions_custom.conf`) will be removed in the future in favor of the standard Asterisk version (`extensions.conf`).
