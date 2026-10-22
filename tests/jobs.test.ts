import { afterEach, describe, expect, it, vi } from "vitest";
import { PEX } from "../src/client";
import { job, json } from "./fixtures";

afterEach(() => vi.unstubAllGlobals());

describe("jobs", () => {
    it.each(["queued", "processing", "submitted", "failed", "unknown"])("reads the %s state without printing again", async state => {
        /** Expected endpoint result used to construct the mocked API response. */
        const result = { job: { ...job, state } };
        /** Isolated Fetch mock that records requests without contacting a printer service. */
        const fetch = vi.fn().mockResolvedValue(json({ status: "success", result }));
        vi.stubGlobal("fetch", fetch);
        expect(await new PEX({ token: "token" }).job(job.id)).toEqual({ status: "success", result });
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch.mock.calls[0]![0]).toBe("http://localhost:4422/pex/jobs/job-123");
        expect(fetch.mock.calls[0]![1].method).toBe("GET");
        expect(fetch.mock.calls[0]![1].headers.get("Authorization")).toBe("Bearer token");
    });

    it("encodes IDs as a single path component", async () => {
        /** Isolated Fetch mock that records requests without contacting a printer service. */
        const fetch = vi.fn().mockResolvedValue(json({ status: "success", result: { job } }));
        vi.stubGlobal("fetch", fetch);
        await new PEX().job("job/a?b#c");
        expect(fetch.mock.calls[0]![0]).toBe("http://localhost:4422/pex/jobs/job%2Fa%3Fb%23c");
    });

    it("rejects empty IDs without fetching", async () => {
        /** Isolated Fetch mock that records requests without contacting a printer service. */
        const fetch = vi.fn();
        vi.stubGlobal("fetch", fetch);
        expect(await new PEX({ exceptions: false }).job(" ")).toMatchObject({ status: "error", code: "client_error" });
        expect(fetch).not.toHaveBeenCalled();
    });
});
