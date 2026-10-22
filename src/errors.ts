import type { PexErrorResponse } from "./types";

/**
 * Recognize an API error envelope without trusting arbitrary JSON.
 * @param body
 * @returns
 */
export function isPexErrorResponse(body: unknown): body is PexErrorResponse {
    return typeof body === "object" && body !== null
        && "status" in body && body.status === "error"
        && "message" in body && typeof body.message === "string";
}

export class PexError extends Error {
    /** 
     * Additional failure context exposed in non-throwing responses. 
     */
    public details: unknown;

    /** 
     * Machine-readable client or server error identifier. 
     */
    public code: string;

    /**
     * Create a client failure while preserving an optional underlying cause.
     * @param message
     * @param cause
     */
    constructor(message: string, public cause?: unknown) {
        super(message);
        this.name = "PexError";
        this.code = "client_error";
        this.details = cause === undefined ? { } : { cause };
    }

    /**
     * Convert this error into the standard non-throwing response envelope.
     * @returns
     */
    public toResponse(): PexErrorResponse {
        return { status: "error", message: this.message, code: this.code, details: this.details };
    }
}

export class PexHTTPError extends PexError {
    /**
     * Extract server error information while retaining HTTP metadata and the raw body.
     * @param message
     * @param status
     * @param statusText
     * @param body
     */
    constructor(
        message: string,
        public status: number,
        public statusText: string,
        public body?: unknown,
    ) {
        super(isPexErrorResponse(body) ? body.message : message);
        this.name = "PexHTTPError";
        this.code = isPexErrorResponse(body) && typeof body.code === "string" ? body.code : `http_${status}`;
        this.details = isPexErrorResponse(body) ? body.details ?? {} : { status, statusText, body };
    }

    /**
     * Include the HTTP status in the non-throwing error response.
     * @returns
     */
    public override toResponse(): PexErrorResponse {
        return { ...super.toResponse(), httpStatus: this.status };
    }
}

export class PexTimeoutError extends PexError {
    /**
     * Identify a deadline failure without implying cancellation of the print job.
     * @param message
     */
    constructor(message = "PEX request timed out; the print job may still have been accepted.") {
        super(message);
        this.name = "PexTimeoutError";
        this.code = "request_timeout";
    }
}
