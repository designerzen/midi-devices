// Generates the static JSON API served from GitHub Pages under api/v1/.
import { readFileSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

export const API_VERSION = "v1"

const normalise = (value) => String(value).trim().toLowerCase()

export async function buildApi({ entries, devicesDirectory, outDirectory, siteUrl, version }) {
	const site = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`
	const api = `${site}api/${API_VERSION}/`
	const out = path.join(outDirectory, "api", API_VERSION)
	await mkdir(path.join(out, "devices"), { recursive: true })
	await mkdir(path.join(out, "manufacturers"), { recursive: true })
	const write = (file, data) => writeFile(path.join(out, file), JSON.stringify(data, null, "\t") + "\n")
	const meta = { apiVersion: API_VERSION, dataVersion: version, generated: new Date().toISOString() }

	const devices = entries.map(({ id, path: folder }) => {
		const { $schema, ...profile } = JSON.parse(
			readFileSync(path.join(devicesDirectory, folder, `${id}.json`), "utf8")
		)
		const base = `${site}${folder}/`
		return {
			...profile,
			manufacturerId: folder.split("/")[0],
			links: {
				self: `${api}devices/${id}.json`,
				profile: `${base}${id}.json`,
				base,
				icon: `${base}${profile.icon ?? "icon.svg"}`,
				panel: `${base}${profile.surface?.src ?? "panel.svg"}`,
				manufacturer: `${api}manufacturers/${folder.split("/")[0]}.json`,
				catalogue: `${site}#device-${id}`
			}
		}
	})
	const summary = (device) => ({
		id: device.id,
		name: device.name,
		manufacturer: device.manufacturer,
		manufacturerId: device.manufacturerId,
		description: device.description,
		abilities: device.abilities,
		ids: device.ids,
		portNames: device.portNames,
		links: device.links
	})

	const manufacturers = new Map()
	for (const device of devices) {
		const entry = manufacturers.get(device.manufacturerId) ?? {
			id: device.manufacturerId,
			name: device.manufacturer,
			url: device.manufacturerUrl,
			devices: [],
			links: { self: `${api}manufacturers/${device.manufacturerId}.json` }
		}
		entry.devices.push(device)
		manufacturers.set(device.manufacturerId, entry)
	}

	// Matches the exact, case-insensitive rules of matchMidiDeviceProfile: IDs first, then port names.
	const ports = { byId: {}, byName: {} }
	for (const device of devices) {
		for (const value of device.ids ?? [device.id]) ports.byId[normalise(value)] ??= device.id
		for (const value of device.portNames ?? []) ports.byName[normalise(value)] ??= device.id
	}

	for (const device of devices) await write(`devices/${device.id}.json`, device)
	for (const manufacturer of manufacturers.values()) {
		await write(`manufacturers/${manufacturer.id}.json`, {
			...manufacturer,
			devices: manufacturer.devices.map(summary)
		})
	}
	await write("devices.json", { ...meta, count: devices.length, devices })
	await write("manufacturers.json", {
		...meta,
		count: manufacturers.size,
		manufacturers: [...manufacturers.values()].map(({ devices, ...manufacturer }) => ({
			...manufacturer,
			count: devices.length,
			deviceIds: devices.map((device) => device.id)
		}))
	})
	await write("ports.json", { ...meta, ...ports })
	await write("index.json", {
		...meta,
		count: devices.length,
		links: {
			self: `${api}index.json`,
			devices: `${api}devices.json`,
			device: `${api}devices/{id}.json`,
			manufacturers: `${api}manufacturers.json`,
			manufacturer: `${api}manufacturers/{id}.json`,
			ports: `${api}ports.json`,
			schema: `${site}profile.schema.json`,
			client: `${site}client.js`
		},
		devices: devices.map(summary)
	})
	return { devices: devices.length, manufacturers: manufacturers.size }
}
