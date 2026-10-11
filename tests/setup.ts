import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Each test file gets its own throwaway data directory.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "cardscout-test-"));
process.env.SESSION_SECRET = "test-secret-test-secret-test-secret";
delete process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_AUTH_TOKEN;
delete process.env.IDENTIFY_MODE;
