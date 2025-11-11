import { describe, it, expect, vi } from "vitest";
import { PEX } from "../src/client";

describe("PEX", () => {
    it("GET /status", async () => {
        const pex = new PEX();
        const response = await pex.status();
        expect(response.status).toBe("success");
    });
});
