import { spawn } from "node:child_process";

export type ClaudeOptions = {
  timeoutMs?: number;
  jsonOutput?: boolean;
};

export function runClaude(prompt: string, opts: ClaudeOptions = {}): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const args = ["-p", prompt];
  if (opts.jsonOutput) args.push("--output-format", "json");

  return new Promise((resolve, reject) => {
    const child = spawn("claude", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`claude timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err.code === "ENOENT") {
        reject(new Error("claude CLI not found on PATH"));
        return;
      }
      reject(err);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(new Error(`claude exited with code ${code}: ${stderr.trim()}`));
    });
  });
}
