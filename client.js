// Browser and Node client for the static MIDI devices API.
// import { createMidiDevicesClient } from "https://designerzen.github.io/midi-devices/client.js"

export const DEFAULT_API_URL = "https://designerzen.github.io/midi-devices/api/v1/"

const normalise = (value) => String(value ?? "").trim().toLowerCase()
export const midiSlug = (value) =>
	String(value ?? "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")

export function createMidiDevicesClient({ baseUrl = DEFAULT_API_URL, fetch: fetcher = globalThis.fetch } = {}) {
	const cache = new Map()
	const get = (file) => {
		if (!cache.has(file)) {
			const request = fetcher(new URL(file, baseUrl).href).then((response) => {
				if (!response.ok) throw new Error(`${response.status} ${response.url}`)
				return response.json()
			})
			request.catch(() => cache.delete(file))
			cache.set(file, request)
		}
		return cache.get(file)
	}
	return {
		/** Summaries of every device, with links to full profiles and assets. */
		async list() {
			return (await get("index.json")).devices
		},
		/** Every full profile in one request. */
		async all() {
			return (await get("devices.json")).devices
		},
		/** One full profile, or undefined if there is no such device. */
		async device(id) {
			if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return
			try {
				return await get(`devices/${id}.json`)
			} catch {
				return undefined
			}
		},
		/** Full profile for a device ID or Web MIDI port name ("MPK mini 3"), or undefined. */
		async lookup(identifier) {
			const slug = midiSlug(identifier)
			if (!slug) return
			try {
				return await get(`midi/${slug}.json`)
			} catch {
				return undefined
			}
		},
		async manufacturers() {
			return (await get("manufacturers.json")).manufacturers
		},
		async manufacturer(id) {
			return get(`manufacturers/${id}.json`)
		},
		/** Device ID for a Web MIDI port ({ id, name }), matching IDs before port names. */
		async match(port) {
			const { byId, byName } = await get("ports.json")
			return byId[normalise(port.id)] ?? byName[normalise(port.name)]
		},
		/** Case-insensitive search over names, manufacturers, descriptions and abilities. */
		async search(text) {
			const terms = normalise(text).split(/\s+/).filter(Boolean)
			return (await this.list()).filter((device) => {
				const haystack = normalise(
					[device.id, device.name, device.manufacturer, device.description, ...(device.abilities ?? [])].join(" ")
				)
				return terms.every((term) => haystack.includes(term))
			})
		}
	}
}
