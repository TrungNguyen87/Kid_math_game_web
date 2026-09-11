import { spawnSync } from "node:child_process";

const commands = [
  ["python3", ["tools/check_precache.py"]],
  ["python", ["tools/check_precache.py"]],
  ["py", ["-3", "tools/check_precache.py"]],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: "inherit" });

  if (result.error && result.error.code === "ENOENT") {
    continue;
  }

  process.exit(result.status ?? 1);
}

console.error("Unable to find Python to run tools/check_precache.py.");
process.exit(1);
