import { afterEach, describe, expect, it, vi } from "vitest";
import { PEX } from "../src/client";
import { json } from "./fixtures";

afterEach(() => vi.unstubAllGlobals());

describe("status", () => {
    it("sends bearer authentication and preserves nullable defaults", async () => {
        /** Expected endpoint result used to construct the mocked API response. */
        const result = { name: "PEX", version: "0.5.0", config: { formats: {}, printers: {}, printer_default: null }, printers: [] };
        /** Isolated Fetch mock that records requests without contacting a printer service. */
        const fetch = vi.fn().mockResolvedValue(json({ status: "success", result }));
        vi.stubGlobal("fetch", fetch);
        /** Client response inspected for the expected success or error information. */
        const response = await new PEX({ token: "test-token" }).status();
        expect(response).toEqual({ status: "success", result });
        /** Captured endpoint URL and Fetch options used to inspect the outgoing request. */
        const [url, request] = fetch.mock.calls[0]!;
        expect(url).toBe("http://localhost:4422/pex/status");
        expect(request.method).toBe("GET");
        expect(request.headers.get("Authorization")).toBe("Bearer test-token");
    });

    it("merges headers without case-sensitive duplicates; token takes precedence", async () => {
        /** Isolated Fetch mock that records requests without contacting a printer service. */
        const fetch = vi.fn().mockResolvedValue(json({ status: "success", result: {} }));
        vi.stubGlobal("fetch", fetch);
        await new PEX({ host: "127.0.0.1", port: 4444, protocol: "https", token: "new-token", headers: { authorization: "Bearer old-token", accept: "application/json", "X-Custom": "test" } }).status();
        /** Captured endpoint URL and Fetch options used to inspect the outgoing request. */
        const [url, request] = fetch.mock.calls[0]!;
        expect(url).toBe("https://127.0.0.1:4444/pex/status");
        expect(request.headers.get("authorization")).toBe("Bearer new-token");
        expect(request.headers.get("X-Custom")).toBe("test");
    });
});
