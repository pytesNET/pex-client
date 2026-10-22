import { afterEach, describe, expect, it, vi } from "vitest";
import { PEX } from "../src/client";
import { PexError, PexHTTPError, PexTimeoutError } from "../src/errors";
import { job, json } from "./fixtures";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("errors", () => {
    it.each([
        [401, "unauthorized"], [403, "origin_denied"], [404, "job_not_found"],
        [409, "idempotency_conflict"], [413, "upload_too_large"], [502, "submission_uncertain"], [503, "queue_full"],
    ])("preserves HTTP %i errors and never retries", async (status, code) => {
        /** Mock server error envelope including its affected job snapshot. */
        const body = { status: "error", message: "Server explanation", code, details: { job: { ...job, state: "unknown" } } };
        /** Isolated Fetch mock that records requests without contacting a printer service. */
        const fetch = vi.fn().mockImplementation(() => Promise.resolve(json(body, status as number)));
        vi.stubGlobal("fetch", fetch);
        /** Client instance exercised against the isolated Fetch mock. */
        const pex = new PEX();
        /** Captured request failure inspected for preserved API error information. */
        const error = await pex.print({ lines: ["Label"] }).catch(error => error);
        expect(error).toBeInstanceOf(PexHTTPError);
        expect(error).toMatchObject({ message: body.message, status, code, details: body.details, body });
        expect(fetch).toHaveBeenCalledTimes(1);
        /** Client response inspected for the expected success or error information. */
        const response = await new PEX({ exceptions: false }).print({ lines: ["Label"] });
        expect(response).toEqual({ ...body, httpStatus: status });
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("preserves non-JSON HTTP error bodies", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })));
        await expect(new PEX().status()).rejects.toMatchObject({ status: 503, code: "http_503", body: "Unavailable" });
    });

    it.each(["not JSON", "null", '{}', '{"status":"success"}'])("rejects malformed success responses: %s", async body => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
        await expect(new PEX().status()).rejects.toBeInstanceOf(PexError);
    });

    it("returns network failures when exceptions are disabled", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
        expect(await new PEX({ exceptions: false }).status()).toMatchObject({ status: "error", code: "client_error" });
    });
});

describe("deadlines", () => {
    it("aborts a pending print without retrying", async () => {
        vi.useFakeTimers();
        /** Request abort signal inspected after the simulated deadline. */
        let signal: AbortSignal;
        /** Isolated Fetch mock that records requests without contacting a printer service. */
        const fetch = vi.fn((_url, init) => {
            signal = init.signal;
            return new Promise<Response>(() => {});
        });
        vi.stubGlobal("fetch", fetch);
        /** Captured or pending request inspected by this test. */
        const request = new PEX({ timeout: 100 }).print({ lines: ["Label"] });
        /** Rejection assertion registered before advancing the fake request timer. */
        const assertion = expect(request).rejects.toBeInstanceOf(PexTimeoutError);
        await vi.advanceTimersByTimeAsync(100);
        await assertion;
        expect(signal!.aborted).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });

    it("also times out during response-body reading", async () => {
        vi.useFakeTimers();
        /** Request abort signal inspected after the simulated deadline. */
        let signal: AbortSignal;
        vi.stubGlobal("fetch", vi.fn((_url, init) => {
            signal = init.signal;
            return Promise.resolve({ ok: true, text: () => new Promise<string>(() => {}) });
        }));
        /** Expected endpoint result used to construct the mocked API response. */
        const result = new PEX({ timeout: 100, exceptions: false }).status();
        await vi.advanceTimersByTimeAsync(100);
        expect(await result).toMatchObject({ status: "error", code: "request_timeout" });
        expect(signal!.aborted).toBe(true);
    });

    it("waits beyond the old ten-second limit by default and clears its timer", async () => {
        vi.useFakeTimers();
        vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => {
            setTimeout(() => resolve(json({ status: "success", result: {} })), 31_000);
        })));
        /** Client response inspected for the expected success or error information. */
        const response = new PEX().status();
        await vi.advanceTimersByTimeAsync(31_000);
        expect(await response).toEqual({ status: "success", result: {} });
        expect(vi.getTimerCount()).toBe(0);
    });

    it.each([1, 1_200_000])("accepts timeout at the supported boundary: %s ms", timeout => {
        expect(() => new PEX({ timeout })).not.toThrow();
    });

    it.each([0, -1, NaN, Infinity, 1_200_001, 2_147_483_648])("rejects unusable timeout %s", timeout => {
        expect(() => new PEX({ timeout })).toThrow(PexError);
    });
});
