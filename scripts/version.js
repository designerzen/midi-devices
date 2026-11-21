import { execFileSync } from "node:child_process"

export function mainBuildVersion(version, runNumber) {
	const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version)
	if (!match) throw new Error("Automatic version bump requires a stable major.minor.patch package version")
	if (!/^[1-9]\d*$/.test(runNumber ?? "")) throw new Error("Automatic version bump requires GITHUB_RUN_NUMBER")
	return `${match[1]}.${match[2]}.${BigInt(match[3]) + BigInt(runNumber)}`
}

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
