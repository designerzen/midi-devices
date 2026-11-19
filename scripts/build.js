// Regenerates devices/index.json and assembles the static site (registry, API and demo) in dist/.
import { readFileSync } from "node:fs"
import { cp, mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { MIDI_DEVICE_DIRECTORY, createMidiDeviceStore } from "../index.js"
import { buildApi } from "./api.js"
import { buildVersion } from "./version.js"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const dist = path.join(root, "dist")
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))
const build = buildVersion({ version: pkg.version, root })
const siteUrl = process.env.SITE_URL || pkg.homepage
const entries = await createMidiDeviceStore(() => [MIDI_DEVICE_DIRECTORY]).entries()
const index = JSON.stringify(entries, null, "\t") + "\n"

await writeFile(path.join(MIDI_DEVICE_DIRECTORY, "index.json"), index)
await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
await cp(MIDI_DEVICE_DIRECTORY, dist, { recursive: true })
await cp(path.join(root, "site"), dist, { recursive: true })
const page = readFileSync(path.join(dist, "index.html"), "utf8")
const builtPage = page
	.replaceAll("__BUILD_COMMIT__", build.commit)
	.replaceAll("__BUILD_SHORT_COMMIT__", build.shortCommit)
	.replaceAll("__BUILD_VERSION__", build.version)
	.replaceAll("__BUILD_TIME__", build.builtAt)
await writeFile(path.join(dist, "index.html"), builtPage)
for (const id of new Set(entries.map((entry) => entry.path.split("/")[0]))) {
	const descriptor = JSON.parse(readFileSync(path.join(MIDI_DEVICE_DIRECTORY, id, "manufacturer.json"), "utf8"))
	const escape = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
	await writeFile(path.join(dist, id, "index.html"), builtPage
		.replace('<head>', '<head>\n\t\t<base href="../" />')
		.replace('<body>', `<body data-manufacturer="${id}">`)
		.replace('<title>MIDI device discovery</title>', `<title>${escape(descriptor.name)} MIDI devices</title>`)
		.replace('content="Open MIDI hardware profiles: panel diagrams, icons, MIDI control mappings and setup guides, free for any application to use."', `content="${escape(descriptor.description)}"`))
}
await writeFile(path.join(dist, "version.json"), JSON.stringify(build, null, "\t") + "\n")
await cp(path.join(root, "client.js"), path.join(dist, "client.js"))
await writeFile(path.join(dist, ".nojekyll"), "")
const api = await buildApi({
	entries,
	devicesDirectory: MIDI_DEVICE_DIRECTORY,
	outDirectory: dist,
	siteUrl,
	version: `${pkg.version}+${build.shortCommit}`
})
console.log(
	`Built ${api.devices} devices, ${api.manufacturers} manufacturers and ${api.aliases} MIDI identifiers into dist/ for ${siteUrl}`
)
