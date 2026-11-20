import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { mainBuildVersion } from "./version.js"

if (process.env.GITHUB_REF !== "refs/heads/main" || !["push", "workflow_dispatch"].includes(process.env.GITHUB_EVENT_NAME)) {
	throw new Error("Automatic version bump is only supported for main-branch push or manual workflow builds")
}

const root = fileURLToPath(new URL("../", import.meta.url))
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
const version = mainBuildVersion(pkg.version, process.env.GITHUB_RUN_NUMBER)
// Use the npm CLI that launched this script, on Windows as well as Linux.
execFileSync(process.execPath, [process.env.npm_execpath, "version", version, "--no-git-tag-version"], {
	cwd: root,
	stdio: "inherit"
})
