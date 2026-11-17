import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import test from "node:test"
import { buildVersion } from "./version.js"

test("build version follows the deployment commit on Cloudflare and GitHub", () => {
	const cloudflare = "a".repeat(40)
	const github = "b".repeat(40)
	const options = { version: "1.0.0", now: new Date("2026-11-17T12:00:00Z") }
	const build = buildVersion({ ...options, env: { CF_PAGES_COMMIT_SHA: cloudflare, GITHUB_SHA: github } })
	assert.deepEqual(build, { version: "1.0.0", commit: cloudflare, shortCommit: "aaaaaaa", builtAt: "2026-11-17T12:00:00.000Z" })
	assert.equal(buildVersion({ ...options, env: { GITHUB_SHA: github } }).commit, github)
	assert.throws(() => buildVersion({ ...options, env: { CF_PAGES_COMMIT_SHA: "invalid" } }), /Invalid build commit/)
})

test("local builds use the current Git commit", () => {
	const root = new URL("../", import.meta.url)
	const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim()
	assert.equal(buildVersion({ version: "1.0.0", root, env: {} }).commit, commit)
})
