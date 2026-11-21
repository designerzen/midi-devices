import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

// Manufacturer membership is independent of device coverage.
export function readManufacturers(directory) {
	return readdirSync(directory, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name))
		.map((entry) => JSON.parse(readFileSync(path.join(directory, entry.name, "manufacturer.json"), "utf8")))
		.sort((a, b) => a.id.localeCompare(b.id))
}
