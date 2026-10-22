import { afterEach, describe, expect, it, vi } from "vitest";
import { PEX } from "../src/client";
import { PexError } from "../src/errors";
import type { PexPayload } from "../src/types";
import { json, printResult } from "./fixtures";

afterEach(() => vi.unstubAllGlobals());

/**
 * Install a successful print-response mock and return its request spy.
 * @param status
 * @returns
 */
function setup(status = 200) {
    /** Isolated Fetch mock that records requests without contacting a printer service. */
    const fetch = vi.fn().mockResolvedValue(json({ status: "success", result: printResult }, status));
    vi.stubGlobal("fetch", fetch);
    return fetch;
}

describe("print", () => {
    it("preserves text and definitions, including numeric and JSON-looking strings", async () => {
        /** Isolated Fetch mock that records requests without contacting a printer service. */
        const fetch = setup();
        /** Text and style fixtures covering literal and JSON-looking label content. */
        const lines = ["123", "true", "null", '{"text":"literal"}', "", { text: "Label", bold: true }];
        await new PEX().print({ lines, printer: "labels", paper_format: [51, 25], quantity: 2 });
        /** Captured endpoint URL and Fetch options used to inspect the outgoing request. */
        const [url, init] = fetch.mock.calls[0]!;
        expect(url).toBe("http://localhost:4422/pex/print");
        expect(init.method).toBe("POST");
        expect(init.body.getAll("lines").map((entry: string) => JSON.parse(entry))).toEqual(lines);
        expect(init.body.get("paper_format")).toBe("[51,25]");
        expect(init.body.get("quantity")).toBe("2");
        expect(init.headers.has("Content-Type")).toBe(false);
    });

    it("sends real PDF bytes through the object payload", async () => {
        /** Isolated Fetch mock that records requests without contacting a printer service. */
        const fetch = setup();
        /** Small PDF-like File fixture used to verify binary multipart uploads. */
        const file = new File(["%PDF-1.7\nTest"], "label.pdf", { type: "application/pdf" });
        await new PEX().print({ file, paper_format: "A4" });
        /** Multipart file field inspected for its original name, type and bytes. */
        const uploaded = fetch.mock.calls[0]![1].body.get("file") as File;
        expect(uploaded.name).toBe("label.pdf");
        expect(uploaded.type).toBe("application/pdf");
        expect(await uploaded.text()).toBe(await file.text());
    });

    it("also accepts PDF Blobs", async () => {
        /** Isolated Fetch mock that records requests without contacting a printer service. */
        const fetch = setup();
        await new PEX().print({ file: new Blob(["%PDF-test"], { type: "application/pdf" }) });
        expect(await fetch.mock.calls[0]![1].body.get("file").text()).toBe("%PDF-test");
    });

    it("passes caller FormData through without a conflicting content type", async () => {
        /** Isolated Fetch mock that records requests without contacting a printer service. */
        const fetch = setup();
        /** Caller-owned multipart form passed through to the print endpoint. */
        const data = new FormData();
        data.set("lines", "Example");
        data.set("format", "label");
        await new PEX({ headers: { "Content-Type": "application/json" } }).print(data);
        expect(fetch.mock.calls[0]![1].body).toBe(data);
        expect(fetch.mock.calls[0]![1].headers.has("Content-Type")).toBe(false);
    });

    it("supports legacy format and explicit async/idempotency options", async () => {
        /** Isolated Fetch mock that records requests without contacting a printer service. */
        const fetch = setup(202);
        /** Client response inspected for the expected success or error information. */
        const response = await new PEX().print({ lines: ["Label"], format: [51, 25] }, { idempotencyKey: "order-123-label-1", respondAsync: true });
        expect(response).toEqual({ status: "success", result: printResult });
        /** Captured or pending request inspected by this test. */
        const request = fetch.mock.calls[0]![1];
        expect(request.headers.get("Idempotency-Key")).toBe("order-123-label-1");
        expect(request.headers.get("Prefer")).toBe("respond-async");
        expect(request.body.get("format")).toBe("[51,25]");
    });

    it("returns submitted and replayed results unchanged", async () => {
        /** Expected endpoint result used to construct the mocked API response. */
        const result = { ...printResult, replayed: true, job: { ...printResult.job, state: "submitted" } };
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ status: "success", result })));
        expect(await new PEX().print({ lines: ["Label"] })).toEqual({ status: "success", result });
    });

    it.each(["", "has spaces", "ä", "x".repeat(129), "line\nbreak"])("rejects invalid idempotency keys before sending: %j", async key => {
        /** Isolated Fetch mock that records requests without contacting a printer service. */
        const fetch = setup();
        await expect(new PEX().print({ lines: ["Label"] }, { idempotencyKey: key })).rejects.toBeInstanceOf(PexError);
        expect(fetch).not.toHaveBeenCalled();
    });

    it.each([null, "text", new Date(), { file: "not-a-file" }, { lines: "not-an-array" }])("returns local payload errors with exceptions disabled: %j", async data => {
        /** Isolated Fetch mock that records requests without contacting a printer service. */
        const fetch = setup();
        /** Client response inspected for the expected success or error information. */
        const response = await new PEX({ exceptions: false }).print(data as unknown as PexPayload);
        expect(response.status).toBe("error");
        expect(fetch).not.toHaveBeenCalled();
    });
});
