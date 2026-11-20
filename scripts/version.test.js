import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import test from "node:test"
import { buildVersion, mainBuildVersion } from "./version.js"

test("main builds advance the patch version for each workflow run", () => {
	assert.equal(mainBuildVersion("1.0.1", "42"), "1.0.43")
	assert.equal(mainBuildVersion("1.0.1", "43"), "1.0.44")
	assert.equal(mainBuildVersion("2.3.0", "42"), "2.3.42")
	assert.equal(mainBuildVersion("1.0.1", "42"), mainBuildVersion("1.0.1", "42"))
	for (const run of [undefined, "", "0", "-1", "1.5", "invalid"]) {
		assert.throws(() => mainBuildVersion("1.0.1", run), /GITHUB_RUN_NUMBER/)
	}
	assert.throws(() => mainBuildVersion("1.0.1-beta.1", "42"), /stable major.minor.patch/)
})

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
