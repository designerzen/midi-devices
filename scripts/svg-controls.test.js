import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { Window } from "happy-dom"
import { createSvgControls } from "../site/svg-controls.js"

const profile = JSON.parse(readFileSync(new URL("../devices/korg/volca-bass/korg-volca-bass.json", import.meta.url)))
const drawing = readFileSync(new URL("../devices/korg/volca-bass/panel.svg", import.meta.url), "utf8")
const keyboard = profile.surface.elements.find(part => part.message?.type === "note")
const knob = profile.surface.elements.find(part => part.control === "lfo-rate-knob")
const unbound = profile.surface.elements.find(part => part.kind === "button" && !part.message && !part.control)
const next = () => new Promise(resolve => setImmediate(resolve))

function environment(t) {
	const window = new Window({ url: "https://example.test/midi-devices/", settings: { disableCSSFileLoading: true, disableJavaScriptEvaluation: true } })
	const originals = new Map()
	window.testCleanups = []
	for (const [key, value] of Object.entries({ window, document: window.document, navigator: window.navigator, DOMParser: window.DOMParser, isSecureContext: true, matchMedia: () => ({ matches: true }) })) {
		originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
		Object.defineProperty(globalThis, key, { configurable: true, value })
	}
	originals.set("fetch", Object.getOwnPropertyDescriptor(globalThis, "fetch"))
	globalThis.fetch = async () => ({ ok: true, text: async () => drawing })
	t.after(async () => {
		for (const cleanup of window.testCleanups) cleanup()
		await window.happyDOM.close()
		for (const [key, descriptor] of originals) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]
	})
	return window
}

async function fixture(t, { inputOnly = false, learned = new Map() } = {}) {
	const window = environment(t)
	const output = { id: "out", state: "connected", sent: [], send(packet) { this.sent.push(packet) } }
	const ports = [{ direction: "Input", port: { id: "in" } }, ...inputOnly ? [] : [{ direction: "Output", port: output }]]
	const surface = createSvgControls({ profile, url: "https://example.test/panel.svg", ports, learned })
	window.document.body.append(surface.element)
	window.testCleanups.push(() => surface.dispose())
	await surface.ready
	const root = surface.element.querySelector(".svg-control-host").shadowRoot
	const node = part => root.querySelector(`[data-live="${part.id}"]`)
	const key = (target, type, value) => target.dispatchEvent(new window.KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }))
	const pointer = (target, type, options = {}) => {
		target.setPointerCapture ??= () => {}
		target.dispatchEvent(new window.PointerEvent(type, { button: 0, pointerId: 1, clientX: 20, clientY: 100, bubbles: true, cancelable: true, ...options }))
	}
	return { window, surface, output, root, node, key, pointer }
}

test("real SVG hit areas send MIDI by keyboard, highlight incoming notes/CCs and keep original IDs", async t => {
	const { surface, output, root, node, key } = await fixture(t)
	assert.ok(root.querySelector(`[id="korg-volca-bass-panel--surface--${keyboard.id}"]`))
	key(node(keyboard), "keydown", " "); key(node(keyboard), "keyup", " ")
	assert.deepEqual(output.sent, [[0x90, keyboard.message.number, 127], [0x80, keyboard.message.number, 0]])
	surface.receive([0x90, keyboard.message.number, 88])
	assert.equal(node(keyboard).dataset.active, "true")
	assert.equal(node(keyboard).dataset.source, "received")
	surface.receive([0x90, keyboard.message.number, 0])
	assert.equal(node(keyboard).dataset.active, "false")
	surface.receive([0xb0, 41, 96])
	assert.equal(node(knob).getAttribute("aria-valuenow"), "96")
	assert.equal(node(knob).querySelector(".live-value").textContent, "96")
	key(node(knob), "keydown", "ArrowUp")
	assert.deepEqual(output.sent.at(-1), [0xb0, 41, 97])
	assert.equal(output.sent.length, 3)
})

test("pointer dragging controls CCs and cancel/blur/dispose release held notes", async t => {
	const { window, surface, output, node, pointer, key } = await fixture(t)
	pointer(node(knob), "pointerdown")
	pointer(node(knob), "pointermove", { clientY: 20 })
	pointer(node(knob), "pointerup")
	assert.deepEqual(output.sent.at(-1), [0xb0, 41, 64])
	pointer(node(keyboard), "pointerdown"); pointer(node(keyboard), "pointercancel")
	assert.deepEqual(output.sent.at(-1), [0x80, keyboard.message.number, 0])
	key(node(keyboard), "keydown", "Enter"); window.dispatchEvent(new window.Event("blur"))
	assert.deepEqual(output.sent.at(-1), [0x80, keyboard.message.number, 0])
	key(node(keyboard), "keydown", "Enter"); surface.dispose()
	assert.deepEqual(output.sent.at(-1), [0x80, keyboard.message.number, 0])
})

test("learning an unbound button uses actual hardware channel and remains scoped to the card", async t => {
	const learned = new Map()
	const { surface, output, node, key, window } = await fixture(t, { learned })
	const buttons = surface.element.querySelectorAll("button")
	buttons[0].click()
	key(node(unbound), "keydown", "Enter")
	surface.receive([0xf8]); surface.receive([0x90, 70, 0])
	assert.equal(learned.size, 0)
	surface.receive([0x95, 70, 100])
	assert.deepEqual(learned.get(unbound.id), { type: "note", number: 70, channel: 6 })
	assert.equal(node(unbound).dataset.active, "true")
	assert.deepEqual(output.sent, [])
	key(node(unbound), "keydown", " "); key(node(unbound), "keyup", " ")
	assert.deepEqual(output.sent, [[0x95, 70, 127], [0x85, 70, 0]])
	const channels = surface.element.querySelectorAll("select")
	key(node(keyboard), "keydown", " ")
	channels[1].value = "3"; channels[1].dispatchEvent(new window.Event("change"))
	assert.deepEqual(output.sent.at(-1), [0x80, keyboard.message.number, 0])
	key(node(keyboard), "keydown", " "); key(node(keyboard), "keyup", " ")
	assert.deepEqual(output.sent.at(-2), [0x92, keyboard.message.number, 127])
})

test("input-only surfaces reflect hardware without sending", async t => {
	const { surface, node, key, output } = await fixture(t, { inputOnly: true })
	key(node(keyboard), "keydown", " ")
	assert.deepEqual(output.sent, [])
	surface.receive([0x90, keyboard.message.number, 30])
	assert.equal(node(keyboard).dataset.active, "true")
	assert.equal(node(keyboard).getAttribute("aria-disabled"), "true")
})

test("a failed output reports the error and does not display a successful press", async t => {
	const { surface, node, key, output } = await fixture(t)
	output.send = () => { throw new Error("Port unavailable") }
	key(node(keyboard), "keydown", " ")
	assert.match(surface.element.querySelector(".control-status").textContent, /MIDI send failed: Port unavailable/)
	assert.notEqual(node(keyboard).dataset.active, "true")
})

test("messages arriving while the SVG loads retain final state and all-notes-off ordering", async t => {
	const window = environment(t)
	let finish
	globalThis.fetch = () => new Promise(resolve => { finish = () => resolve({ ok: true, text: async () => drawing }) })
	const surface = createSvgControls({ profile, url: "https://example.test/delayed.svg", ports: [] })
	window.testCleanups.push(() => surface.dispose())
	surface.receive([0x90, keyboard.message.number, 100])
	surface.receive([0xb0, 123, 0])
	surface.receive([0x90, keyboard.message.number, 80])
	finish(); await surface.ready
	const node = surface.element.querySelector(".svg-control-host").shadowRoot.querySelector(`[data-live="${keyboard.id}"]`)
	assert.equal(node.dataset.active, "true")
	assert.equal(node.dataset.value, "80")
})

test("manufacturer pages detect devices from the full catalogue", async t => {
	const window = environment(t)
	const html = readFileSync(new URL("../site/index.html", import.meta.url), "utf8")
	window.document.write(html.replace(/<script type="module">[\s\S]*?<\/script>/, ""))
	window.document.body.dataset.manufacturer = "korg"
	window.HTMLElement.prototype.scrollIntoView = () => {}
	const other = JSON.parse(readFileSync(new URL("../devices/arturia/keystep-37/arturia-keystep-37.json", import.meta.url)))
	const company = JSON.parse(readFileSync(new URL("../devices/korg/manufacturer.json", import.meta.url)))
	const input = Object.assign(new window.EventTarget(), { id: "opaque", type: "input", name: "MIDIIN2 (KeyStep 37)", manufacturer: "Arturia", state: "connected", connection: "closed", open: async () => {}, close: async () => {} })
	window.navigator.requestMIDIAccess = async () => ({ inputs: new Map([[input.id, input]]), outputs: new Map(), sysexEnabled: false })
	globalThis.fetch = async url => {
		const pathname = new URL(url).pathname
		const data = pathname.endsWith("/index.json") ? [{ id: profile.id, path: "korg/volca-bass" }, { id: other.id, path: "arturia/keystep-37" }]
			: pathname.endsWith("/manufacturers.json") ? [{ id: "korg", name: "Korg" }, { id: "arturia", name: "Arturia" }]
			: pathname.endsWith("/manufacturer.json") ? company : pathname.includes("keystep-37") ? other : profile
		return { ok: true, json: async () => data, text: async () => drawing }
	}
	const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/from "\.\/(midi-connections|midi-state|svg-controls)\.js\?v=__BUILD_COMMIT__"/g, (_, name) => `from "${new URL(`../site/${name}.js`, import.meta.url).href}"`)
	await import(`data:text/javascript;base64,${Buffer.from(script + "\n// manufacturer matching regression").toString("base64")}`)
	assert.equal(window.document.querySelectorAll("#catalog article").length, 1)
	assert.match(window.document.querySelector("#catalog").textContent, /volca bass/i)
	const detect = window.document.getElementById("detect-midi")
	await detect.onclick()
	assert.match(window.document.querySelector("#connected-devices h2").textContent, /KeyStep 37/)
	assert.equal(window.document.querySelector("#connected-devices .profile-picker select").options.length, 3)
	await detect.onclick()
})

test("the page toggles continuous MIDI detection, handles hotplug and isolates identical devices", async t => {
	const window = environment(t)
	const html = readFileSync(new URL("../site/index.html", import.meta.url), "utf8")
	window.document.write(html.replace(/<script type="module">[\s\S]*?<\/script>/, ""))
	window.HTMLElement.prototype.scrollIntoView = () => {}
	const access = { inputs: new Map(), outputs: new Map(), sysexEnabled: false }
	const port = (id, type) => {
		const value = new window.EventTarget()
		Object.assign(value, { id, type, name: "volca bass", manufacturer: "Korg", state: "connected", connection: "closed", sent: [] })
		value.open = async () => { value.connection = "open"; queueMicrotask(() => access.onstatechange?.({ port: value })) }
		value.close = async () => { value.connection = "closed"; value.closes = (value.closes ?? 0) + 1; queueMicrotask(() => access.onstatechange?.({ port: value })) }
		value.send = packet => { value.sent.push(packet); if (value.connection !== "open") void value.open() }
		return value
	}
	const inputs = [port("in-1", "input"), port("in-2", "input")]
	const outputs = [port("out-1", "output"), port("out-2", "output")]
	let requests = 0
	window.navigator.requestMIDIAccess = async () => { requests++; return access }
	globalThis.fetch = async url => {
		const pathname = new URL(url).pathname
		const data = pathname.endsWith("/index.json") ? [{ id: profile.id, path: "korg/volca-bass" }] : pathname.endsWith("/manufacturers.json") ? [{ id: "korg", name: "Korg" }] : profile
		return { ok: true, json: async () => data, text: async () => drawing }
	}
	const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/from "\.\/(midi-connections|midi-state|svg-controls)\.js\?v=__BUILD_COMMIT__"/g, (_, name) => `from "${new URL(`../site/${name}.js`, import.meta.url).href}"`)
	await import(`data:text/javascript;base64,${Buffer.from(script).toString("base64")}`)
	assert.equal(window.document.querySelectorAll("#catalog article").length, 1)
	const detect = window.document.getElementById("detect-midi")
	assert.equal(detect.getAttribute("aria-pressed"), "false")
	await detect.onclick()
	assert.equal(detect.getAttribute("aria-pressed"), "true")
	assert.equal(window.document.getElementById("connected-empty").hidden, false)
	assert.match(window.document.getElementById("midi-status").textContent, /Detection is on/)
	// Devices connected after activation are detected without pressing the button again.
	for (const value of inputs) access.inputs.set(value.id, value)
	for (const value of outputs) access.outputs.set(value.id, value)
	access.onstatechange({ port: inputs[0] })
	for (let attempt = 0; attempt < 30 && !window.document.querySelector(".svg-control-host")?.shadowRoot.querySelector("[data-live]"); attempt++) await next()
	const cards = [...window.document.querySelectorAll("#connected-devices article")]
	assert.equal(cards.length, 2)
	const nodes = cards.map(card => card.querySelector(".svg-control-host").shadowRoot.querySelector(`[data-live="${keyboard.id}"]`))
	const emit = (input, data) => { const event = new window.Event("midimessage"); event.data = data; input.dispatchEvent(event) }
	emit(inputs[0], [0x90, keyboard.message.number, 90])
	assert.equal(nodes[0].dataset.active, "true"); assert.notEqual(nodes[1].dataset.active, "true")
	await new Promise(resolve => setTimeout(resolve, 80))
	const stateView = window.document.getElementById("midi-state")
	assert.equal(stateView.hidden, false)
	assert.match(stateView.textContent, /Channel 1/)
	assert.equal(window.document.getElementById("events-table").hidden, true)
	const view = window.document.getElementById("monitor-view")
	view.value = "log"; view.dispatchEvent(new window.Event("change"))
	assert.equal(stateView.hidden, true)
	assert.equal(window.document.getElementById("events-table").hidden, false)
	assert.deepEqual(outputs.map(value => value.sent), [[], []])
	nodes[0].dispatchEvent(new window.KeyboardEvent("keydown", { key: " " }))
	await next()
	assert.equal(window.document.querySelector("#connected-devices article"), cards[0])
	assert.deepEqual(outputs[0].sent, [[0x90, keyboard.message.number, 127]])
	assert.deepEqual(outputs[1].sent, [])
	inputs[0].state = "disconnected"; access.onstatechange({ port: inputs[0] })
	assert.deepEqual(outputs[0].sent.at(-1), [0x80, keyboard.message.number, 0])
	assert.equal(requests, 1)
	await detect.onclick()
	assert.equal(detect.getAttribute("aria-pressed"), "false")
	assert.equal(access.onstatechange, null)
	assert.equal(window.document.getElementById("connected-section").hidden, true)
	assert.equal(window.document.getElementById("midi-monitor").hidden, true)
	assert.equal(window.document.querySelectorAll(".is-connected").length, 0)
	assert.ok([...inputs, ...outputs].every(value => value.closes === 1))
	assert.equal(window.document.getElementById("include-sysex").disabled, false)
	const status = window.document.getElementById("event-status").textContent
	emit(inputs[1], [0x90, keyboard.message.number, 100])
	const later = port("in-later", "input")
	access.inputs.set(later.id, later)
	access.onstatechange?.({ port: later })
	await new Promise(resolve => setTimeout(resolve, 80))
	assert.equal(window.document.getElementById("event-status").textContent, status)
	assert.equal(window.document.querySelectorAll("#connected-devices article").length, 0)
	await detect.onclick()
	assert.equal(requests, 2)
	assert.equal(detect.getAttribute("aria-pressed"), "true")
	assert.equal(later.connection, "open")
	assert.equal(window.document.getElementById("include-sysex").disabled, true)
	assert.equal(window.document.getElementById("events-table").hidden, true)
	assert.equal(window.document.getElementById("monitor-empty").hidden, false)
	await detect.onclick()
	window.navigator.requestMIDIAccess = async () => { throw new Error("Permission denied") }
	await detect.onclick()
	assert.equal(detect.getAttribute("aria-pressed"), "false")
	assert.equal(detect.disabled, false)
	assert.match(window.document.getElementById("midi-status").textContent, /MIDI access was blocked/)
})
