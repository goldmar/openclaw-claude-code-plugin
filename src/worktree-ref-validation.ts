import { execFileSync } from "node:child_process";

/** Local branch names only: never full refs, command options, or revision expressions. */
export function branchNameValidationError(value: unknown): string | undefined {
  if (typeof value !== "string" || !value || value.startsWith("-") || value.startsWith("refs/") || value === "HEAD" || value === "@" || /\s|[\x00-\x1f\x7f]/u.test(value)) {
    return "Expected a literal Git branch name (local branch only; not a full ref, option, or revision expression).";
  }
  try {
    // Prefixing the argument prevents option parsing and avoids --branch's @{-n}
    // expansion. Git owns the remaining ref grammar, including slash components.
    execFileSync("git", ["check-ref-format", `refs/heads/${value}`], {
      timeout: 5_000,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return undefined;
  } catch {
    return "Expected a valid literal Git branch name; Git ref validation failed.";
  }
}

export function assertBranchName(value: unknown): asserts value is string {
  const error = branchNameValidationError(value);
  if (error) throw new Error(error);
}
