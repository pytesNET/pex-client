import { afterEach, expect, it, vi } from "vitest";
import { PEX } from "../src/client";
import { json } from "./fixtures";

afterEach(() => vi.unstubAllGlobals());

it("lists printers without requiring a configured default", async () => {
    /** Expected endpoint result used to construct the mocked API response. */
    const result = { printers: ["Warehouse printer"], printer_default: null };
    /** Isolated Fetch mock that records requests without contacting a printer service. */
    const fetch = vi.fn().mockResolvedValue(json({ status: "success", result }));
    vi.stubGlobal("fetch", fetch);
    expect(await new PEX().printers()).toEqual({ status: "success", result });
    expect(fetch.mock.calls[0]![0]).toBe("http://localhost:4422/pex/printers");
});
