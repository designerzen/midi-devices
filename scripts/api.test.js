import assert from "node:assert/strict"
import { once } from "node:events"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { MIDI_DEVICE_DIRECTORY } from "../index.js"
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
			{ id: "korg-minilogue", path: "korg/minilogue" },
			{ id: "roland-tr-909", path: "roland/tr-909" }
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
	for (const id of ["korg-minilogue", "roland-tr-909"]) {
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
})
