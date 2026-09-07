import { execFileSync } from "node:child_process";

/** Local branch names only: reject standard full-ref namespaces, options, and revisions. */
export function branchNameValidationError(value: unknown): string | undefined {
  if (typeof value !== "string" || !value || value.startsWith("-") || /^refs\/(?:heads|remotes|tags)\//u.test(value) || value === "HEAD" || value === "@" || /\s|[\x00-\x1f\x7f]/u.test(value)) {
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

/** Fully qualify a validated local branch anywhere Git performs revision lookup. */
export function localBranchRef(value: unknown): string {
  assertBranchName(value);
  return `refs/heads/${value}`;
}

/** Read-only ancestry checks may compare a local branch with a computed remote-tracking ref. */
export function assertBranchOrRemoteTrackingRef(value: unknown): asserts value is string {
  if (typeof value === "string" && value.startsWith("refs/remotes/")) {
    try {
      execFileSync("git", ["check-ref-format", value], {
        timeout: 5_000,
        stdio: ["ignore", "ignore", "ignore"],
      });
      return;
    } catch {
      throw new Error("Expected a valid literal Git branch or remote-tracking ref.");
    }
  }
  assertBranchName(value);
}

/** Qualify local branches while preserving validated, internally computed remote refs. */
export function branchOrRemoteTrackingRef(value: unknown): string {
  assertBranchOrRemoteTrackingRef(value);
  return value.startsWith("refs/remotes/") ? value : localBranchRef(value);
}
