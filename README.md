<h1 align='center'>
  SongWut
</h1>

<p align='center'>
  Shazam, but via Phone-In, for yeshivalite. Wut??
  <br />
  More information: https://songwut.pages.dev
</p>

## Versions

### Twilio (`twilio/`)

An API serving as a backend for Twilio webhook calls.

### Asterisk (`asterisk/`)

A custom phone system powered by Asterisk and Docker. See there for step-by-step deployment instructions.  
Involves manually buying a DID from your provider of choice (we chose bulk.vs).

## Flowchart

When a call comes in, the user is routed as follows, as per the dailplan:

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
