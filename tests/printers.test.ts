import { describe, it, expect, vi } from "vitest";
import { PEX } from "../src/client";

describe("PEX", () => {
    it("GET /printers", async () => {
        const pex = new PEX();
        const response = await pex.printers();
        expect(response.status).toBe("success");
    });
});
