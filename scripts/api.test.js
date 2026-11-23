import assert from "node:assert/strict"
import { once } from "node:events"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { MIDI_DEVICE_DIRECTORY } from "../index.js"
import { createMidiDevicesClient } from "../client.js"
import { buildApi } from "./api.js"
import { createApiServer } from "./server.js"
import { toXml } from "./xml.js"

test("XML preserves special characters, types, arrays and arbitrary field names", () => {
	assert.equal(toXml({ 'a&"': ["<&>'\"", 0, false, null, {}, []] }),
		'<?xml version="1.0" encoding="UTF-8"?>\n<response type="object"><field type="array" key="a&amp;&quot;"><item type="string">&lt;&amp;&gt;&apos;&quot;</item><item type="number">0</item><item type="boolean">false</item><item type="null"></item><item type="object"></item><item type="array"></item></field></response>\n')
})

test("built data and query endpoint return only the requested device in either format", async (t) => {
	const directory = await mkdtemp(path.join(os.tmpdir(), "midi-api-"))
	t.after(() => rm(directory, { recursive: true, force: true }))
	await buildApi({
		entries: [
			{ id: "arcana-strum", path: "arcana/strum" },
			{ id: "arturia-keystep-37", path: "arturia/keystep-37" },
			{ id: "novation-launchpad-mini-mk3", path: "novation/launchpad-mini-mk3" },
			{ id: "novation-launchpad-x", path: "novation/launchpad-x" },
			{ id: "novation-circuit-tracks", path: "novation/circuit-tracks" },
			{ id: "novation-circuit-rhythm", path: "novation/circuit-rhythm" },
			{ id: "korg-minilogue", path: "korg/minilogue" },
			{ id: "roland-tr-909", path: "roland/tr-909" },
			{ id: "superlative-sb01", path: "superlative/sb01" },
			{ id: "korg-arp-2600-fs", path: "korg/arp-2600-fs" },
			{ id: "roland-v-stage-76", path: "roland/v-stage-76" },
			{ id: "roland-v-stage-88", path: "roland/v-stage-88" }
		],
		devicesDirectory: MIDI_DEVICE_DIRECTORY,
		outDirectory: directory,
		siteUrl: "https://example.test/catalogue/",
		version: "test"
	})
	const server = createApiServer({ directory })
	server.listen(0, "127.0.0.1")
	await once(server, "listening")
	t.after(() => new Promise((resolve) => server.close(resolve)))
	const base = `http://127.0.0.1:${server.address().port}/api/v1/`
	const client = createMidiDevicesClient({ baseUrl: base })
	for (const name of ["ArcanaStrum", "Arcana Strum", " arcanastrum "]) {
		assert.equal(await client.match({ id: "opaque-browser-port-id", name }), "arcana-strum")
		assert.equal((await client.lookup(name)).id, "arcana-strum")
	}
	assert.equal(await client.match({ name: "ArcanaStrum Virtual" }), undefined)
	for (const name of ["LPX MIDI In", "LPX MIDI Out"]) {
		assert.equal(await client.match({ id: "opaque-browser-port-id", name }), "novation-launchpad-x")
	}
	for (const id of ["arturia-keystep-37", "novation-launchpad-mini-mk3", "novation-launchpad-x", "novation-circuit-tracks", "novation-circuit-rhythm"]) {
		assert.equal((await client.lookup(id)).id, id)
		assert.equal((await client.device(id)).id, id)
	}
	assert.equal(await client.match({ name: "LPX DAW In" }), undefined)
	assert.equal(await client.match({ id: "opaque", name: "MIDIIN2 (2- KeyStep 37)" }), "arturia-keystep-37")
	assert.equal(await client.match({ name: "constructor" }), undefined)
	assert.equal(await client.match({ name: "KeyStep 37 mk2" }), undefined)
	assert.equal((await client.lookup("MIDIIN2 (KeyStep 37)")).id, "arturia-keystep-37")
	for (const id of ["korg-minilogue", "roland-tr-909", "superlative-sb01", "korg-arp-2600-fs", "roland-v-stage-76", "roland-v-stage-88"]) {
		for (const format of ["json", "xml"]) {
			const response = await fetch(`${base}device?id=${id}&format=${format}`)
			assert.equal(response.status, 200)
			assert.match(response.headers.get("content-type"), new RegExp(`application/${format}`))
			const bytes = await response.text()
			assert.equal(bytes, await readFile(path.join(directory, "api/v1/devices", `${id}.${format}`), "utf8"))
			assert.equal(bytes, await (await fetch(`${base}devices/${id}.${format}`)).text())
			if (format === "json") {
				const profile = JSON.parse(bytes)
				assert.equal(profile.id, id)
				assert.equal(profile.devices, undefined)
				assert.equal(profile.links.xml, `https://example.test/catalogue/api/v1/devices/${id}.xml`)
			}
		}
	}
	assert.equal((await (await fetch(`${base}device?id=korg-minilogue`)).json()).id, "korg-minilogue")
	for (const query of ["", "?id=", "?id=../ports", "?id=korg-minilogue&id=roland-tr-909", "?id=korg-minilogue&format=yaml"]) {
		assert.equal((await fetch(`${base}device${query}`)).status, 400)
	}
	const missing = await fetch(`${base}device?id=unknown-device&format=xml`)
	assert.equal(missing.status, 404)
	assert.match(await missing.text(), /<field type="string" key="error">/)
	assert.equal((await fetch(`${base}device?id=korg-minilogue`, { method: "POST" })).status, 405)
	const head = await fetch(`${base}device?id=korg-minilogue&format=xml`, { method: "HEAD" })
	assert.equal(head.status, 200)
	assert.equal(await head.text(), "")
	for (const resource of ["index", "devices", "manufacturers", "manufacturers/korg", "midi/korg-minilogue", "ports"]) {
		assert.equal((await fetch(`${base}${resource}.xml`)).status, 200)
	}
	const index = await (await fetch(`${base}index.json`)).json()
	assert.equal(index.links.xmlSchema, "https://example.test/catalogue/api.xsd")
	assert.equal(index.links.xmlStylesheet, "https://example.test/catalogue/api.xsl")
	const xml = await (await fetch(`${base}devices/korg-minilogue.xml`)).text()
	assert.match(xml, /<\?xml-stylesheet type="text\/xsl" href="https:\/\/example.test\/catalogue\/api.xsl"\?>/)
	assert.match(xml, /xsi:noNamespaceSchemaLocation="https:\/\/example.test\/catalogue\/api.xsd"/)
	const origin = new URL(base).origin
	for (const [file, mime] of [["api.xsd", "application/xml"], ["api.xsl", "application/xslt+xml"]]) {
		const response = await fetch(`${origin}/${file}`)
		assert.equal(response.status, 200)
		assert.equal(response.headers.get("content-type"), `${mime}; charset=utf-8`)
		assert.equal(await response.text(), await readFile(path.join(MIDI_DEVICE_DIRECTORY, file), "utf8"))
		assert.equal(await (await fetch(`${origin}/${file}`, { method: "HEAD" })).text(), "")
		assert.equal((await fetch(`${origin}/${file}`, { method: "POST" })).status, 405)
	}
	const korg = await client.manufacturer("korg")
	const descriptor = JSON.parse(await readFile(path.join(MIDI_DEVICE_DIRECTORY, "korg/manufacturer.json"), "utf8"))
	assert.equal(korg.description, descriptor.description)
	assert.equal(korg.url, descriptor.url)
	assert.deepEqual(korg.resources, descriptor.links)
	assert.deepEqual(korg.logoSource, descriptor.logoSource)
	assert.equal(korg.links.logo, "https://example.test/catalogue/korg/logo.svg")
	assert.equal(korg.links.profile, "https://example.test/catalogue/korg/manufacturer.json")
	assert.equal(korg.links.catalogue, "https://example.test/catalogue/korg/")
	assert.equal(korg.links.xml, "https://example.test/catalogue/api/v1/manufacturers/korg.xml")
	assert.deepEqual(korg.devices.map(({ id }) => id), ["korg-minilogue", "korg-arp-2600-fs"])
	const manufacturers = await client.manufacturers()
	const korgSummary = manufacturers.find(({ id }) => id === "korg")
	assert.equal(korgSummary.description, korg.description)
	assert.equal(korgSummary.links.logo, korg.links.logo)
	assert.equal(korgSummary.count, 2)
	assert.deepEqual(korgSummary.deviceIds, korg.devices.map(({ id }) => id))
	// The company website comes from its descriptor rather than a device's product-specific URL.
	const buchlaDirectory = await mkdtemp(path.join(os.tmpdir(), "midi-manufacturer-"))
	t.after(() => rm(buchlaDirectory, { recursive: true, force: true }))
	const registry = JSON.parse(await readFile(path.join(MIDI_DEVICE_DIRECTORY, "index.json"), "utf8"))
	await buildApi({ entries: registry.filter(({ path: folder }) => folder.startsWith("buchla/")), devicesDirectory: MIDI_DEVICE_DIRECTORY, outDirectory: buchlaDirectory, siteUrl: "https://example.test/", version: "test" })
	assert.equal(JSON.parse(await readFile(path.join(buchlaDirectory, "api/v1/manufacturers/buchla.json"), "utf8")).url, "https://buchla.com/")
	assert.equal(index.count, 12)
	assert.equal(index.links.accessibility, undefined)
	assert.equal((await fetch(`${base}accessibility/tactile-synth-guides.json`)).status, 404)
})
