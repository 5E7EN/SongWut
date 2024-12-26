# SongWut

Shazam, but via Phone-In, for yeshivalite. Wut??
More information: https://songwut.pages.dev

## Versions

### Twilio (`twilio/`)

An API serving as a backend for Twilio webhook calls.

### Asterisk (`asterisk/`)

A custom phone system powered by Asterisk (and FreePBX if you want).  
Involves manually buying a DID from your provider of choice (we chose voip.ms), setting up a SIP trunk, and configuring the dialplan.  
We used Vultr to host the Asterisk/FreePBX server.

More complicated, but more control.

## Mermaid Flowchart

For A2P 10DLC applications, the Asterisk dailplan flowchart is as follows:

```mermaid
graph TD
    A[User Calls System] --> B{Key Press Detected?}
    B -- Yes --> C[Record Audio]
    B -- No --> Z[Hang Up]
    C --> D[Process Recording]
    D --> E{Song Identified?}
    E -- Yes --> F[Notify User]
    E -- No --> G[Notify User]

    subgraph via Voice Prompt
    F
    G
    end

    F --> H[Send Text Message With Result]
    H --> K[Hang Up]
    G --> K
```

## Credits

-   Special thanks to YumiR for his vast knowledge and assistance. It wouldn't have happened without him.
