export interface PexOptions {
    /** Hostname or IP address of the printer workstation; defaults to localhost. */
    host?: string;
    /** PEX HTTP port; defaults to 4422. */
    port?: number;
    /** Connection scheme; defaults to HTTP. */
    protocol?: "http" | "https";
    /** Request deadline in milliseconds; positive and at most 20 minutes. Defaults to 45 seconds. */
    timeout?: number;
    /** API token sent as bearer authentication, overriding a custom Authorization header. */
    token?: string;
    /** Additional default headers merged without case-sensitive duplicates. */
    headers?: Record<string, string>;
    /** Throw request errors when true; defaults to true. */
    exceptions?: boolean;
}

export interface PexPrintOptions {
    /** Unique operation key; reuse only when retrying identical print content. */
    idempotencyKey?: string;
    /** Request an immediate job snapshot instead of waiting for submission. */
    respondAsync?: boolean;
}

export interface PexPrinters {
    /** Resolve each configured alias to its operating-system printer name. */
    [alias: string]: string;
}

export interface PexPageFormats {
    /** Resolve each named format to dimensions and an optional description. */
    [key: string]: [number, number, string?];
}

export type PexPaperFormat = string | [number, number];
export type PexFont = "helvetica" | "times" | "courier";

export interface PexLineDefinition {
    /** Literal text to print on this line. */
    text: string;
    /** Optional font-family override for this line. */
    font?: PexFont;
    /** Optional font size in points for this line. */
    size?: number;
    /** Optional line height in points for this line. */
    height?: number;
    /** Render this line in bold. */
    bold?: boolean;
    /** Render this line in italics. */
    italic?: boolean;
    /** Underline this line. */
    underline?: boolean;
    /** Draw a strike through this line. */
    strikethrough?: boolean;
}

export type PexLines = (string | PexLineDefinition)[];

export interface PexBasePayload {
    /** Printer alias or exact OS name; omit to use the configured default. */
    printer?: string;
    /** Named paper size or millimetre dimensions for the job. */
    paper_format?: PexPaperFormat;
    /** Legacy paper_format alias; both values must agree when supplied together. */
    format?: PexPaperFormat;
    /** Portrait or landscape orientation, including the supported short forms. */
    orientation?: "portrait" | "P" | "landscape" | "L";
    /** Number of copies, subject to the server copy limit. */
    quantity?: number;
}

export interface PexFilePayload extends PexBasePayload {
    /** PDF bytes supplied as a File or Blob. */
    file: File | Blob;
    /** Exclude text lines when a PDF file is supplied. */
    lines?: never;
}

export interface PexLinesPayload extends PexBasePayload {
    /** Ordered plain-text lines and optional per-line styling. */
    lines: PexLines;
    /** Exclude PDF files when text lines are supplied. */
    file?: never;
    /** Default font family for the label. */
    font_name?: PexFont;
    /** Default font size in points. */
    font_size?: number;
    /** Default line height in points. */
    line_height?: number;
}

export type PexPayload = PexFilePayload | PexLinesPayload;

export interface PexSuccessResponse<T = Record<string, unknown>> {
    /** Discriminator identifying a successful response. */
    status: "success";
    /** Typed result returned by the requested endpoint. */
    result: T;
}

export interface PexErrorResponse<D = unknown> {
    /** Discriminator identifying a failed response. */
    status: "error";
    /** Human-readable explanation of the failure. */
    message: string;
    /** Machine-readable server or client error code. */
    code?: string;
    /** Additional typed context supplied for the failure. */
    details?: D;
    /** HTTP status included for HTTP failures when exceptions are disabled. */
    httpStatus?: number;
}

export type PexResponse<T = Record<string, unknown>, D = unknown> = PexSuccessResponse<T> | PexErrorResponse<D>;

export interface PexPrintArguments {
    /** Resolved operating-system printer name. */
    printer_name: string;
    /** Resolved paper width and height in millimetres. */
    paper_format: [number, number];
    /** Normalized portrait or landscape orientation. */
    orientation: "portrait" | "landscape";
    /** Validated number of requested copies. */
    quantity: number;
}

export type PexPrintFileArguments = PexPrintArguments;
export type PexPrintLinesArguments = PexPrintArguments;
export type PexJobState = "queued" | "processing" | "submitted" | "failed" | "unknown";

export interface PexJobResult {
    /** Print backend that accepted the submission. */
    backend?: "cups" | "sumatra";
    /** Backend-reported spooler job IDs, when available. */
    spooler_ids?: string[];
    /** Explanation supplied when print setup failed. */
    message?: string;
}

export interface PexJob {
    /** Service-assigned ID used to query this job. */
    id: string;
    /** Resolved operating-system printer name for this job. */
    printer: string;
    /** Current submission state; submitted does not confirm physical output. */
    state: PexJobState;
    /** Job creation time as Unix seconds. */
    created_at: number;
    /** Last job-state update time as Unix seconds. */
    updated_at: number;
    /** Backend outcome or setup explanation, if available. */
    result: PexJobResult | null;
    /** Machine-readable job failure code, or null when absent. */
    error_code: string | null;
}

export interface PexJobResponse {
    /** Current snapshot of the requested print job. */
    job: PexJob;
}

export interface PexPrintErrorDetails {
    /** Affected job snapshot when the service could identify it. */
    job?: PexJob;
}

export interface PexStatusResult {
    /** Service application name. */
    name: string;
    /** Running PEX server version. */
    version: string;
    /** Configured formats, aliases and default printer. */
    config: {
        /** Configured paper names and their millimetre dimensions. */
        formats: PexPageFormats;
        /** Configured printer aliases mapped to OS names. */
        printers: PexPrinters;
        /** Configured default alias or printer name, or null when unset. */
        printer_default: string | null;
    };
    /** Operating-system printer names discovered by the service. */
    printers: string[];
}

export interface PexPrintersResult {
    /** Operating-system printer names discovered by PEX. */
    printers: string[];
    /** Resolved default OS printer name, or null when unset. */
    printer_default: string | null;
}

export interface PexPrintResult {
    /** Human-readable summary of print acceptance or submission. */
    message: string;
    /** Normalized settings used to submit the print job. */
    arguments: PexPrintArguments;
    /** Job snapshot returned after the submission request. */
    job: PexJob;
    /** Whether an idempotency key returned an existing job instead of creating one. */
    replayed: boolean;
}
