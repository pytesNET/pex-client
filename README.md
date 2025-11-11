PEX - Printer Execution Service
===============================
**P**rinter **ex**ecution JavaScript client library.

[PEX](https://github.com/pytesNET/pex) is a lightweight Python-based printer service and server. 
It allows direct print jobs to local printers without triggering the usual print dialog. This is 
especially useful for web apps, PWAs, or kiosk systems where seamless printing is mandatory.

This JavaScript library provides a minimal, typed client for the PEX HTTP API.

## Installation

```sh
npm i @pytes.net/pex.js
```

## Usage

```js
import { PEX } from "@pytes.net/pex.js";

const pex = new PEX({
    host: "localhost",
    port: 4422,
    protocol: "http",
    timeout: 5000
});

await pex.status();
await pex.printers();

// Pass a FormData object
const data = new FormData;
data.set("file", new File([blobData], "document.pdf")));
data.set("printer", "Canon TS8300 series");
data.set("format", "A4");
data.set("orientation", "P");
data.set("quantity", 1);
await pex.print(data);

// Pass a payload object
await pex.print({ 
    lines: ["foo", "bar"],
    printer: "Zebra ZD411 Label Printer",
    font_name: "Arial",
    font_size: 12,
    line_height: 14,
});
```

| Method            | Description                                        |
| ----------------- | -------------------------------------------------- |
| `pex.status()`    | Returns service and printer configuration details  |
| `pex.printers()`  | Lists all available printers                       |
| `pex.print(data)` | Sends a print job (`FormData` or `Payload` object) |

## License
Published under the MIT License \
Copyright © 2024 - 2026 pytesNET <sam@pytes.net>
