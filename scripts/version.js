import { execFileSync } from "node:child_process"

export function buildVersion({ version, root, env = process.env, now = new Date() }) {
	let commit = env.CF_PAGES_COMMIT_SHA || env.GITHUB_SHA
	if (!commit) {
		try {
			commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim()
		} catch {
			throw new Error("Cannot determine build commit: build from a Git checkout or set CF_PAGES_COMMIT_SHA or GITHUB_SHA")
		}
	}
	if (!/^[a-f0-9]{40,64}$/i.test(commit)) throw new Error("Invalid build commit SHA")
	return { version, commit, shortCommit: commit.slice(0, 7), builtAt: now.toISOString() }
}
