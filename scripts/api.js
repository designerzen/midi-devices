// Generates the static JSON and XML API served under api/v1/.
import { readFileSync } from "node:fs"
import { cp, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { toXml } from "./xml.js"
import { readManufacturers } from "./manufacturers.js"
import { createSchemaValidator } from "./schemas.js"

const validateResponse = createSchemaValidator().getSchema("api.schema.json")

export const API_VERSION = "v1"

const normalise = (value) => String(value).trim().toLowerCase()
// Same rule harmoneasy uses to turn Web MIDI port IDs and names into profile IDs.
export const midiSlug = (value) =>
	String(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")

export async function buildApi({ entries, devicesDirectory, outDirectory, siteUrl, version }) {
	const site = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`
	const api = `${site}api/${API_VERSION}/`
	const out = path.join(outDirectory, "api", API_VERSION)
	await mkdir(path.join(out, "devices"), { recursive: true })
	await mkdir(path.join(out, "manufacturers"), { recursive: true })
	await mkdir(path.join(out, "midi"), { recursive: true })
	for (const asset of ["api.xsd", "api.xsl"]) {
		await cp(new URL(`../devices/${asset}`, import.meta.url), path.join(outDirectory, asset))
	}
	const write = async (file, data) => {
		if (!validateResponse(data)) {
			throw new Error(`Invalid API response ${file}: ${JSON.stringify(validateResponse.errors)}`)
		}
		await writeFile(path.join(out, file), JSON.stringify(data, null, "\t") + "\n")
		await writeFile(path.join(out, file.replace(/\.json$/, ".xml")), toXml(data, { stylesheet: `${site}api.xsl`, schema: `${site}api.xsd` }))
	}
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
				xml: `${api}devices/${id}.xml`,
				profile: `${base}${id}.json`,
				base,
				icon: `${base}${profile.icon ?? "icon.svg"}`,
				panel: `${base}${profile.diagrams?.panel ?? "panel.svg"}`,
				...(profile.diagrams?.connections ? { connections: `${base}${profile.diagrams.connections}` } : {}),
				...(profile.diagrams?.interface ? { interface: `${base}${profile.diagrams.interface}` } : {}),
				...(profile.diagrams?.logo ? { logo: `${base}${profile.diagrams.logo}` } : {}),
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

	const manufacturers = new Map(readManufacturers(devicesDirectory).map(({ $schema, links: resources, ...descriptor }) => {
		const base = `${site}${descriptor.id}/`
		return [descriptor.id, {
			...descriptor,
			resources,
			devices: [],
			links: {
				self: `${api}manufacturers/${descriptor.id}.json`,
				xml: `${api}manufacturers/${descriptor.id}.xml`,
				base,
				profile: `${base}manufacturer.json`,
				...(descriptor.logo ? { logo: `${base}${descriptor.logo}` } : {}),
				catalogue: base
			}
		}]
	}))
	for (const device of devices) {
		const manufacturer = manufacturers.get(device.manufacturerId)
		if (!manufacturer) throw new Error(`Missing manufacturer: ${device.manufacturerId}`)
		manufacturer.devices.push(device)
	}

	// Matches the exact, case-insensitive rules of matchMidiDeviceProfile: IDs first, then port names.
	const ports = { byId: Object.create(null), byName: Object.create(null) }
	for (const device of devices) {
		for (const value of new Set([device.id, ...(device.ids ?? [])])) ports.byId[normalise(value)] ??= device.id
		for (const value of device.portNames ?? []) ports.byName[normalise(value)] ??= device.id
	}

	// Every device ID and port name gets a URL of its own, so a known MIDI identifier is one request.
	const aliases = new Map()
	for (const device of devices) {
		for (const value of [device.id, ...(device.ids ?? []), ...(device.portNames ?? [])]) {
			const slug = midiSlug(value)
			if (!slug) continue
			const owner = aliases.get(slug)
			if (owner && owner !== device.id) {
				throw new Error(`MIDI identifier "${value}" (${slug}) is claimed by ${owner} and ${device.id}`)
			}
			aliases.set(slug, device.id)
		}
	}
	const byId = new Map(devices.map((device) => [device.id, device]))
	for (const [slug, id] of aliases) await write(`midi/${slug}.json`, byId.get(id))
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
	await write("ports.json", { ...meta, ...ports, bySlug: Object.fromEntries([...aliases].sort()) })
	await write("index.json", {
		...meta,
		count: devices.length,
		links: {
			self: `${api}index.json`,
			devices: `${api}devices.json`,
			device: `${api}devices/{id}.json`,
			manufacturers: `${api}manufacturers.json`,
			midiManufacturers: `${site}midi-manufacturers.json`,
			manufacturer: `${api}manufacturers/{id}.json`,
			midi: `${api}midi/{slug}.json`,
			ports: `${api}ports.json`,
			schema: `${site}profile.schema.json`,
			apiSchema: `${site}api.schema.json`,
			xmlSchema: `${site}api.xsd`,
			xmlStylesheet: `${site}api.xsl`,
			manufacturerSchema: `${site}manufacturer.schema.json`,
			deviceIndexSchema: `${site}index.schema.json`,
			manufacturerIndexSchema: `${site}manufacturers.schema.json`,
			midiManufacturersSchema: `${site}midi-manufacturers.schema.json`,
			client: `${site}client.js`
		},
		devices: devices.map(summary)
	})
	return { devices: devices.length, manufacturers: manufacturers.size, aliases: aliases.size }
}
