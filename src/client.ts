import type {
    PexJobResponse, PexOptions, PexPayload, PexPrintersResult, PexPrintErrorDetails,
    PexPrintOptions, PexPrintResult, PexResponse, PexStatusResult,
} from "./types";
import { isPexErrorResponse, PexError, PexHTTPError, PexTimeoutError } from "./errors";

export class PEX {
    /** 
     * Base URL shared by all PEX API endpoints. 
     */
    private readonly base: string;

    /** 
     * Request deadline in milliseconds, including response-body reading. 
     */
    private readonly timeout: number;

    /** 
     * Whether request failures throw instead of returning error responses. 
     */
    private readonly exceptions: boolean;

    /** 
     * Default request headers, including configured bearer authentication. 
     */
    private readonly headers: Headers;

    /**
     * Resolve connection settings, validate the deadline and prepare default headers.
     * @param options
     */
    constructor(options: PexOptions = {}) {
        const { 
            host = "localhost", 
            port = 4422, 
            protocol = "http", 
            timeout = 45_000, 
            token, 
            headers = {}, 
            exceptions = true 
        } = options;
        if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 20 * 60 * 1000) {
            throw new PexError("timeout must be a positive number of milliseconds, at most 1200000 (20 minutes).");
        }
        this.timeout = timeout;
        this.exceptions = exceptions;
        this.headers = new Headers({ Accept: "application/json" });
        new Headers(headers).forEach((value, key) => this.headers.set(key, value));
        if (token) {
            this.headers.set("Authorization", `Bearer ${token}`);
        }
        this.base = `${protocol}://${host}:${port}/pex`;
    }

    /**
     * Read service identity, configured printers and available paper formats.
     * @returns
     */
    public async status(): Promise<PexResponse<PexStatusResult>> {
        return this.request("/status", { method: "GET" });
    }

    /**
     * List operating-system printers and the resolved default printer.
     * @returns
     */
    public async printers(): Promise<PexResponse<PexPrintersResult>> {
        return this.request("/printers", { method: "GET" });
    }

    /**
     * Read an existing job snapshot without submitting another print job.
     * @param id
     * @returns
     */
    public async job(id: string): Promise<PexResponse<PexJobResponse>> {
        if (typeof id !== "string" || !id.trim()) {
            return this.failure(new PexError("A non-empty job ID is required."));
        }
        return this.request(`/jobs/${encodeURIComponent(id)}`, { method: "GET" });
    }

    /**
     * Serialize a PDF or label and submit it once with optional job-handling headers.
     * @param data
     * @param options
     * @returns
     */
    public async print(data: FormData | PexPayload, options: PexPrintOptions = {}): Promise<PexResponse<PexPrintResult, PexPrintErrorDetails>> {
        let payload: FormData;
        const headers = new Headers();
        try {
            if (options.idempotencyKey !== undefined) {
                if (!/^[\x21-\x7e]{1,128}$/.test(options.idempotencyKey)) {
                    throw new PexError("Idempotency-Key must contain 1 to 128 printable ASCII characters without spaces.");
                }
                headers.set("Idempotency-Key", options.idempotencyKey);
            }
            if (options.respondAsync) headers.set("Prefer", "respond-async");
            if (data instanceof FormData) {
                payload = data;
            } else {
                if (data === null || typeof data !== "object" || ![Object.prototype, null].includes(Object.getPrototypeOf(data))) {
                    throw new PexError("The passed data is neither a FormData nor a plain object.");
                }
                payload = new FormData();
                /** Serialize each payload field name and its supplied value. */
                for (const [key, value] of Object.entries(data)) {
                    if (value === undefined || value === null) continue;
                    if (key === "file") {
                        if (!(value instanceof Blob)) throw new PexError("file must be a PDF File or Blob.");
                        payload.set(key, value);
                    } else if (key === "lines") {
                        if (!Array.isArray(value)) throw new PexError("lines must be an array of strings or line definitions.");

                        /** Encode each label line as JSON so numeric and JSON-looking text stays literal. */
                        for (const line of value) payload.append(key, JSON.stringify(line));
                    } else if (Array.isArray(value)) {
                        payload.set(key, JSON.stringify(value));
                    } else {
                        payload.set(key, String(value));
                    }
                }
            }
        } catch (error) {
            return this.failure(error);
        }
        return this.request<PexPrintResult, PexPrintErrorDetails>("/print", { method: "POST", body: payload, headers });
    }

    /**
     * Normalize an error and throw or return it according to the client settings.
     * @param error
     * @returns
     */
    private failure<T, D = unknown>(error: unknown): PexResponse<T, D> {
        const failure = error instanceof PexError ? error : new PexError("PEX request failed", error);
        if (this.exceptions) {
            throw failure;
        } else {
            return failure.toResponse() as PexResponse<T, D>;
        }
    }

    /**
     * Send an authenticated request under one deadline and validate its response envelope.
     * @param path
     * @param init
     * @returns
     */
    private async request<T, D = unknown>(path: string, init: RequestInit): Promise<PexResponse<T, D>> {
        const controller = new AbortController();
        const headers = new Headers(this.headers);
        
        new Headers(init.headers).forEach((value, key) => headers.set(key, value));
        if (init.body instanceof FormData) {
            headers.delete("Content-Type");
        }

        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            const operation = async (): Promise<PexResponse<T, D>> => {
                const response = await fetch(`${this.base}${path}`, { ...init, headers, signal: controller.signal });
                const text = await response.text();
                let body: unknown = text;
                try { 
                    body = JSON.parse(text); 
                } catch { }
                if (!response.ok) {
                    throw new PexHTTPError(`PEX ${init.method} ${path} failed`, response.status, response.statusText, body);
                }
                if (typeof body !== "object" || body === null || !("status" in body) || !(body.status === "success" && "result" in body || isPexErrorResponse(body))) {
                    throw new PexError("PEX returned an invalid API response.");
                }
                return body as PexResponse<T, D>;
            };
            const deadline = new Promise<never>((_, reject) => {
                timer = setTimeout(() => {
                    reject(new PexTimeoutError());
                    controller.abort();
                }, this.timeout);
            });
            return await Promise.race([operation(), deadline]);
        } catch (error) {
            return this.failure(error);
        } finally {
            if (timer !== undefined) clearTimeout(timer);
        }
    }
}
