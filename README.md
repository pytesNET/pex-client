PEX - Printer Execution Service
===============================
**P**rinter **ex**ecution JavaScript client library.

[PEX](https://github.com/pytesNET/pex) sends PDFs and text labels to local printers without opening 
a print dialog. This library provides a small, typed HTTP client for web apps, PWAs, kiosks and 
warehouse workstations.

Client **0.2.0** targets the **PEX 0.5.0** API and requires a runtime with Fetch, FormData, Blob and 
AbortController, such as modern browsers or Node.js 22+.

## Installation

```sh
npm i @pytes.net/pex-client
```

## Configuration

```ts
import { PEX } from "@pytes.net/pex-client";

const pex = new PEX({
    host: "127.0.0.1",         // Default: localhost
    port: 4422,
    protocol: "http",
    token: apiToken,           // Your workstation's PEX API token
    timeout: 45_000,           // Milliseconds; maximum 1_200_000 (20 minutes), including body reading
    exceptions: true,
});
```

Read or generate the token in **pex ui > Settings > Manage API Token**. The client sends it as 
`Authorization: Bearer …`; a supplied `token` takes precedence over a custom Authorization header. 
Optional `headers` allow other request headers.

For browser access, configure the exact frontend origin in PEX's `server.cors`, including its scheme 
and port, without a path or trailing slash. The client cannot override the server's origin policy. 
`localhost` refers to the browser's workstation.

## Usage

| Method                      | Description                                           |
| --------------------------- | ----------------------------------------------------- |
| `pex.status()`              | Service version, configuration and available printers |
| `pex.printers()`            | OS printer names and the resolved default printer     |
| `pex.print(data, options?)` | Submit a PDF or text label                            |
| `pex.job(id)`               | Read an existing job's current status                 |

### Text labels

```ts
const response = await pex.print({
    printer: "labels",        // Configured alias or exact OS printer name
    paper_format: [51, 25],   // Millimetres; named formats such as "A4" also work
    orientation: "landscape",
    quantity: 1,
    lines: ["Item 123", { text: "Shelf A1", bold: true }],
    font_name: "helvetica",
    font_size: 10,
    line_height: 12,
}, {
    idempotencyKey: "order-123-label-1",
    respondAsync: true,
});

if (response.status === "success") {
    console.log(response.result.job.id, response.result.job.state);
    const current = await pex.job(response.result.job.id);
    console.log(current);
}
```

Omit `printer` to use the server's configured default. `format` remains an alias for `paper_format`; 
their values must agree when both are provided. Fonts are `helvetica`, `times` and `courier`. Text 
is sent as multipart form data, not JSON. PEX validates dimensions, quantity and whether the text 
fits on the label.

### PDF files

```ts
// pdfFile is a File or Blob containing a PDF.
await pex.print({ file: pdfFile, printer: "labels", paper_format: "label" });

// Existing FormData is also supported.
const data = new FormData();
data.set("file", pdfFile, "label.pdf");
data.set("printer", "labels");
data.set("paper_format", "label");
await pex.print(data);
```

Send either one PDF or text lines per request. Fetch sets the multipart boundary automatically; the 
client removes any custom Content-Type header for print uploads.

### Responses and jobs

Success responses contain `status: "success"` and `result`. Print results include `message`, 
normalized `arguments`, `job` and `replayed`. The normalized `paper_format` is a numeric 
`[width, height]` pair; default-printer fields may be `null`.

Both HTTP 200 and 202 are successful responses. A 202 response means the job is still queued or 
processing. Set `respondAsync: true` to send `Prefer: respond-async`; otherwise PEX normally waits 
up to 30 seconds before returning a job snapshot.

| Job state    | Meaning                                                         |
| ------------ | --------------------------------------------------------------- |
| `queued`     | Waiting for its printer                                         |
| `processing` | Submission is in progress                                       |
| `submitted`  | Accepted by the print backend; physical output is not confirmed |
| `failed`     | Setup or validation prevented submission                        |
| `unknown`    | The result is uncertain, including after a service restart      |

Use `pex.job(id)` to check again; it never resubmits the job. Job records include Unix timestamps in 
seconds, an optional backend result and a nullable error code. For a failed or unknown job returned 
by a print request, PEX responds with HTTP 502 and includes the job in the error's `details.job`.

### Errors and retries

```ts
import { PexHTTPError, PexTimeoutError } from "@pytes.net/pex-client";

try {
    await pex.print({ lines: ["Item 123"], printer: "labels" }, {
        idempotencyKey: "order-123-label-1",
    });
} catch (error) {
    if (error instanceof PexHTTPError) {
        console.error(error.status, error.code, error.message, error.details);
    } else if (error instanceof PexTimeoutError) {
        // The server may already have accepted this job. Check before reprinting.
        console.error(error.message);
    }
}
```

HTTP errors preserve the server's message, code, details and original response body. With 
`exceptions: false`, request and payload errors return `{ status: "error", message, code, details }` 
instead; HTTP failures also include `httpStatus`. Invalid constructor options still throw.

The client never automatically retries. Use a unique `idempotencyKey` for each intended print 
operation and reuse it with identical content when retrying that operation. PEX returns the original 
job with `replayed: true`; conflicting content returns HTTP 409. The server normally retains keys 
for 24 hours. A timeout aborts the HTTP request but cannot cancel a print job already accepted by 
PEX.

## Development

```sh
npm ci
npm test
npm run typecheck
npm run build
```

Tests mock Fetch and do not contact PEX or send real print jobs. The build produces ESM, CommonJS, 
UMD and TypeScript declarations in `dist`.

## License

Published under the MIT License \
Copyright © 2024 - 2026 pytesNET <sam@pytes.net>
