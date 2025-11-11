import { PexErrorResponse } from "./types";

export class PexError extends Error {
    /**
     * 
     */
    public details = {}

    /**
     * 
     * @param message 
     * @param cause 
     */
    constructor(message: string, public cause?: unknown) { 
        super(message); 
        this.name = "PexError"; 
        this.details = { cause };
    }

    /**
     * 
     * @returns 
     */
    public toResponse(): PexErrorResponse {
        return {
            status: 'error',
            message: this.message,
            details: this.details,
        }
    }
}

export class PexHTTPError extends PexError {
    /**
     * 
     * @param message 
     * @param status 
     * @param statusText 
     * @param body 
     */
    constructor(
        message: string,
        public status: number,
        public statusText: string,
        public body?: unknown
    ) { 
        super(message);
        this.name = "PexHTTPError";
        this.details = { status, statusText, body };
    }
}

export class PexTimeoutError extends PexError {
    /**
     * 
     * @param message 
     */
    constructor(message = "PEX request timed out") { 
        super(message);
        this.name = "PexTimeoutError";
    }
}
