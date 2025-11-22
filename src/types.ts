/**
 * Available constructor options
 */
export interface PexOptions {
    host?: string;
    port?: number;
    protocol?: "http" | "https";
    timeout?: number;
    headers?: Record<string, string>;
    exceptions?: boolean;
}


/**
 * Common PEX typings
 */
export interface PexPrinters {
    [alias: string]: string;
}

export interface PexPageFormats {
    [key: string]: [number, number, string?]
}

export interface PexLineDefinition {
    text: string;
    font?: string;
    size?: number;
    height?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
}

export type PexLines = (string|PexLineDefinition)[]


/**
 * PEX Payloads (used for /pex/print)
 */
export interface PexBasePayload {
    printer?: string | 'default';
    format?: string;
    orientation?: 'portrait' | 'P' | 'landscape' | 'L';
    quantity?: number;
}

export interface PexFilePayload extends PexBasePayload {
    file: File;
}

export interface PexLinesPayload extends PexBasePayload {
    lines: PexLines;
    font_name?: string;
    font_size?: number;
    line_height?: number;
}

export type PexPayload = PexFilePayload | PexLinesPayload;


/**
 * PEX General Response structures (received from pex/*)
 */
export interface PexSuccessResponse<T = Record<string, unknown>> {
    status: 'success';
    result: T;
}

export interface PexErrorResponse<D = unknown> {
    status: 'error';
    message: string;
    details?: D;
}

export type PexResponse<T = Record<string, unknown>, D = unknown> = PexSuccessResponse<T> | PexErrorResponse<D>;


/**
 * PEX Response arguments
 */
export interface PexPrintFileArguments {
    filepath: string;
    printer_name?: string;
    paper_format?: string;
    orientation?: string;
    quantity?: number;    
}

export interface PexPrintLinesArguments {
    lines: PexLineDefinition[];
    printer_name: string;
    paper_format: string;
    orientation: string;
    quantity: number;
    font_name: string;
    font_size: number;
    line_height: number;
}

export type PexPrintArguments = PexPrintFileArguments | PexPrintLinesArguments;


/**
 * PEX Responses
 */
export interface PexStatusResult {
    name: string;
    version: string;
    config: {
        formats: PexPageFormats;
        printers: PexPrinters;
        printer_default: string;
    },
    printers: string[]
}

export interface PexPrintersResult {
    printers: string[]
    printer_default: string;
}

export interface PexPrintResult {
    message: string;
    arguments: Record<string, PexPrintArguments>;
}
