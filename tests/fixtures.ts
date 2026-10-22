import type { PexJob, PexPrintResult } from "../src/types";

/** Representative queued job shared by isolated API tests. */
export const job: PexJob = {
    id: "job-123", printer: "Warehouse printer", state: "queued",
    created_at: 1792490400, updated_at: 1792490400, result: null, error_code: null,
};

/** Representative accepted print result with normalized label settings. */
export const printResult: PexPrintResult = {
    message: "Print job accepted.",
    arguments: { printer_name: job.printer, paper_format: [51, 25], orientation: "landscape", quantity: 1 },
    job, replayed: false,
};

/**
 * Create a JSON Fetch response for tests without contacting the PEX service.
 * @param body
 * @param status
 * @returns
 */
export function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
