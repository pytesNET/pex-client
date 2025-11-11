import type { 
    PexOptions, 
    PexPayload, 
    PexPrintersResult, 
    PexPrintResult, 
    PexResponse, 
    PexStatusResult 
} from "./types";
import { PexError, PexHTTPError, PexTimeoutError } from "./errors";

export class PEX {
    /**
     * 
     */
    private base: string;

    /**
     * 
     */
    private options: Required<PexOptions>;

    /**
     * 
     */
    private headers: Record<string, string>;

    /**
     * 
     * @param options 
     */
    constructor(options: PexOptions = {}) {
        const {
            host = "localhost",
            port = 4422,
            protocol = "http",
            timeout = 10_000,
            headers = {},
            exceptions = true,
        } = options;

        this.options = {
            host,
            port,
            protocol,
            timeout,
            headers,
            exceptions,
        };
        this.headers = {
            "Accept": "application/json",
            ...(options.headers || {}),
        };
        this.base = `${protocol}://${host}:${port}/pex`
    }

    /**
     * 
     * @returns 
     */
    async status(): Promise<PexResponse<PexStatusResult>> {
        return this.request<PexStatusResult>("/status", { method: "GET" });
    }

    /**
     * 
     * @returns 
     */
    async printers(): Promise<PexResponse<PexPrintersResult>> {
        return this.request<PexPrintersResult>("/printers", { method: "GET" });
    }

    /**
     * 
     * @param data 
     * @param opts 
     * @returns 
     */
    async print(data: FormData|PexPayload): Promise<PexResponse<PexPrintResult>> {
        let payload: FormData;

        if (data instanceof FormData) {
            payload = data;    
        } else if (typeof data == 'object') {
            payload = new FormData;
            for (const [key, val] of Object.entries(data)) {
                if (Array.isArray(val)) {
                    for (const line of val) {
                        payload.append(key, line);
                    }
                } else if (val != null) {
                    payload.set(key, String(val));
                }
            }
        } else {
            const err = new PexError("The passed data is neither a FormData nor a plain object.");
            if (this.options.exceptions) {
                throw err;
            } else {
                return err.toResponse();
            }
        }

        return this.request<PexPrintResult>(`/print`, {
            method: "POST", 
            body: payload 
        });
    }

    /**
     * 
     * @param path 
     * @param init 
     * @returns 
     */
    private async request<T>(path: string, init: RequestInit): Promise<PexResponse<T>> {
        const url = `${this.base}${path.startsWith('/') ? path : `/${path}`}`;
        const request: RequestInit = {
            ...init,
            headers: { 
                ...this.headers, 
                ...(init.headers || {}) 
            }
        };

        try {
            let timer: any;
            const timeout = new Promise<never>(
                (_, rej) => timer = setTimeout(() => rej(new PexTimeoutError), this.options.timeout)
            );
            const response = await Promise.race(
                [fetch(url, request), timeout]
            ).finally(() => clearTimeout(timer));

            const contentType = response.headers.get("Content-Type") || "";
            const isJSON = contentType.includes("application/json");
            const body = isJSON ? await response.json().catch(() => undefined) : await response.text().catch(() => undefined);

            if (!response.ok) {
                throw new PexHTTPError(`PEX ${init.method} ${path} failed`, response.status, response.statusText, body);
            } else {
                return (body as PexResponse<T>);
            }
        } catch (err) {
            if (!(err instanceof PexError)) {
                err = new PexError("PEX request failed", err);
            }
            if (this.options.exceptions) {
                throw err;
            } else {
                return (err as PexError).toResponse();
            }
        }
    }
}
