import { MidiSurface, surfaceBindings, decodeMessage } from "./midi-surface.js?v=__BUILD_COMMIT__"

const SVG = "http://www.w3.org/2000/svg"
const drawings = new Map()
const editable = new Set(["key", "pad", "button", "round-button", "knob", "fader", "switch", "switch3", "wheel", "joystick", "xy", "touch", "strip", "horizontal-strip", "lightpad"])
const make = (tag, text) => {
	const node = document.createElement(tag)
	if (text !== undefined) node.textContent = text
	return node
}

// Each card has its own shadow root: SVG IDs and artwork styles stay isolated.
export function createSvgControls({ profile, url, ports, sysexEnabled, learned = new Map() }) {
	const container = make("section")
	container.className = "live-controls"
	container.setAttribute("aria-label", `${profile.name} live controls`)
	const toolbar = make("div")
	toolbar.className = "control-toolbar"
	const channel = make("select")
	for (let n = 1; n <= 16; n++) {
		const option = make("option", `Channel ${n}`)
		option.value = n
		channel.append(option)
	}
	const channelLabel = make("label", "MIDI channel ")
	channelLabel.append(channel)
	const outputs = ports.filter(entry => entry.direction === "Output").map(entry => entry.port)
	const output = make("select")
	for (const port of outputs) {
		const option = make("option", port.name || port.id)
		option.value = port.id
		output.append(option)
	}
	if (!outputs.length) output.append(make("option", "No MIDI output — feedback only"))
	output.disabled = !outputs.length
	const outputLabel = make("label", "Send to ")
	outputLabel.append(output)
	const learn = make("button", "Learn mapping")
	learn.type = "button"
	learn.disabled = !ports.some(entry => entry.direction === "Input")
	learn.setAttribute("aria-pressed", "false")
	const stop = make("button", "Release notes")
	stop.type = "button"
	const hint = make("p", "Use the highlighted controls: drag knobs/sliders; press keys or pads. Tab and arrow keys also work. Hardware feedback requires a matching MIDI input and channel. Unmapped controls can be assigned with Learn mapping.")
	const status = make("p", "Loading interactive SVG…")
	status.className = "control-status"
	status.setAttribute("role", "status")
	const host = make("div")
	host.className = "svg-control-host"
	const root = host.attachShadow({ mode: "open" })
	toolbar.append(outputLabel, channelLabel, learn, stop)
	container.append(toolbar, host, hint, status)
	let disposed = false, loaded = false, learning = false, pending, bindings = [], nodes = new Map()
	const earlyMessages = new Map()
	const timers = new Map()
	const engine = new MidiSurface({ bindings, output: outputs[0], sysexEnabled,
		error: error => { status.textContent = `MIDI send failed: ${error.message}` },
		changed: (binding, value, source) => {
			const node = nodes.get(binding.id)
			if (!node) return
			node.dataset.value = value
			node.dataset.active = String(binding.button && value > binding.min)
			node.dataset.source = source
			if (binding.button) node.setAttribute("aria-pressed", String(value > binding.min))
			else node.setAttribute("aria-valuenow", value)
			const label = binding.options?.find(option => option.value === value)?.label ?? value
			node.setAttribute("aria-label", `${binding.label}: ${label}`)
			node.querySelector(".live-value").textContent = binding.button ? "" : label
			node.classList.add("activity")
			clearTimeout(timers.get(binding.id))
			timers.set(binding.id, setTimeout(() => { node.classList.remove("activity"); timers.delete(binding.id) }, 450))
			status.textContent = `${source === "received" ? "Received" : "Sent"}: ${binding.label} · ${label}`
		}
	})
	const reset = () => { engine.releaseAll(); engine.values.clear(); for (const node of nodes.values()) { node.dataset.active = "false"; node.classList.remove("activity"); node.removeAttribute("aria-valuenow"); node.setAttribute("aria-pressed", "false"); node.querySelector(".live-value").textContent = "" } }
	channel.addEventListener("change", () => { reset(); engine.channel = Number(channel.value); status.textContent = `Listening on channel ${channel.value}; explicitly mapped channels are preserved.` })
	output.addEventListener("change", () => { reset(); engine.output = outputs.find(port => port.id === output.value) })
	const learningState = enabled => {
		learning = enabled; pending = undefined
		learn.setAttribute("aria-pressed", String(enabled))
		learn.textContent = enabled ? "Cancel learning" : "Learn mapping"
		host.toggleAttribute("data-learning", enabled)
		status.textContent = enabled ? "Select an SVG control, then press or move that control on your hardware." : "MIDI learning cancelled."
	}
	learn.addEventListener("click", () => learningState(!learning))
	stop.addEventListener("click", () => { engine.releaseAll(); status.textContent = "Released notes held by this page." })
	const release = () => engine.releaseAll()
	window.addEventListener("blur", release)
	window.addEventListener("pagehide", release)
	const hidden = () => { if (document.hidden) release() }
	document.addEventListener("visibilitychange", hidden)

	const ready = (async () => {
		try {
			if (!url || !profile.surface) throw new Error("No SVG surface is defined for this profile.")
			if (!drawings.has(url)) drawings.set(url, fetch(url).then(response => {
				if (!response.ok) throw new Error("The SVG could not be loaded.")
				return response.text()
			}).catch(error => { drawings.delete(url); throw error }))
			const source = await drawings.get(url)
			if (disposed) return
			const parsed = new DOMParser().parseFromString(source, "image/svg+xml")
			if (parsed.querySelector("parsererror") || parsed.documentElement.localName !== "svg") throw new Error("Invalid SVG drawing.")
			const svg = document.importNode(parsed.documentElement, true)
			// Registry artwork is passive: never activate scripts, embedded HTML or links.
			for (const node of svg.querySelectorAll("script, foreignObject, iframe, animate, animateTransform, set, a")) node.remove()
			for (const node of [svg, ...svg.querySelectorAll("*")]) {
				for (const attribute of [...node.attributes]) if (/^on/i.test(attribute.name) || (/href$/i.test(attribute.name) && !attribute.value.startsWith("#"))) node.removeAttribute(attribute.name)
				if (node.hasAttribute("data-part")) { node.removeAttribute("role"); node.removeAttribute("tabindex"); node.removeAttribute("aria-disabled") }
			}
			svg.setAttribute("role", "group")
			const style = make("style", `
				:host { display:block; overflow:auto; border-radius:8px; background:white; color:black; }
				svg { display:block; width:100%; min-width:620px; height:auto; }
				[data-live] { cursor:pointer; touch-action:none; outline:none; }
				[data-live] .live-hit { fill:#007c80 !important; fill-opacity:.08 !important; stroke:#007c80 !important; stroke-opacity:.45 !important; stroke-width:2px !important; vector-effect:non-scaling-stroke; }
				[data-live]:hover .live-hit, [data-live]:focus-visible .live-hit { stroke-opacity:1 !important; stroke-width:3px !important; fill-opacity:.2 !important; }
				[data-live][aria-disabled=true] { cursor:default; }
				[data-live][aria-disabled=true] .live-hit { fill-opacity:0 !important; stroke-opacity:0 !important; }
				:host([data-learning]) [data-live] .live-hit { stroke:#805300 !important; stroke-opacity:.8 !important; stroke-dasharray:4 3; }
				[data-live][data-active=true] .live-hit { fill-opacity:.55 !important; stroke-opacity:1 !important; }
				[data-live].activity .live-hit { fill:#f0a000 !important; fill-opacity:.4 !important; stroke:#a65b00 !important; stroke-opacity:1 !important; }
				.live-value { font: bold 12px system-ui; fill:#004b4e; stroke:white; stroke-width:3px; paint-order:stroke; pointer-events:none; }
			`)
			root.append(style, svg)
			bindings = surfaceBindings(profile, learned).filter(binding => editable.has(binding.kind))
			engine.bindings = bindings
			const regions = new Map([...svg.querySelectorAll("[data-surface-control]")].map(node => [node.getAttribute("data-surface-control"), node]))
			for (const binding of bindings) {
				let node = regions.get(binding.id)
				if (!node) {
					node = document.createElementNS(SVG, "g")
					node.setAttribute("data-surface-control", binding.id)
					const rect = document.createElementNS(SVG, "rect")
					const box = binding.position
					for (const [key, value] of Object.entries({ x: box.x * profile.surface.width / 100, y: box.y * profile.surface.height / 100, width: box.width * profile.surface.width / 100, height: box.height * profile.surface.height / 100 })) rect.setAttribute(key, value)
					node.append(rect)
					svg.append(node)
				}
				nodes.set(binding.id, node)
				node.removeAttribute("aria-hidden")
				node.setAttribute("data-live", binding.id)
				node.setAttribute("tabindex", "0")
				const rect = node.querySelector("rect")
				rect?.classList.add("live-hit")
				const value = document.createElementNS(SVG, "text")
				value.classList.add("live-value")
				value.setAttribute("aria-hidden", "true")
				value.setAttribute("x", binding.position.x * profile.surface.width / 100 + 3)
				value.setAttribute("y", binding.position.y * profile.surface.height / 100 + 14)
				node.append(value)
				const configure = () => {
					node.setAttribute("role", binding.button ? "button" : "slider")
					node.setAttribute("aria-label", binding.label)
					node.setAttribute("aria-disabled", String(!binding.message || !engine.output || binding.readOnly))
					if (!binding.button) { node.setAttribute("aria-valuemin", binding.min); node.setAttribute("aria-valuemax", binding.max); node.setAttribute("aria-valuenow", binding.default ?? binding.min) }
				}
				configure()
				let drag
				const chooseLearn = () => {
					if (!learning) return false
					pending = binding
					status.textContent = `Learning ${binding.label}: press or move it on your hardware.`
					return true
				}
				node.addEventListener("pointerdown", event => {
					if (event.button !== 0) return
					event.preventDefault(); node.focus()
					if (chooseLearn() || !binding.message || binding.readOnly || !engine.output || drag) return
					node.setPointerCapture(event.pointerId)
					drag = { id: event.pointerId, x: event.clientX, y: event.clientY, value: engine.values.get(binding.id) ?? binding.default ?? binding.min }
					if (binding.button) engine.press(binding)
				})
				node.addEventListener("pointermove", event => {
					if (!drag || drag.id !== event.pointerId || binding.button) return
					const distance = binding.kind === "horizontal-strip" ? event.clientX - drag.x : drag.y - event.clientY
					engine.set(binding, drag.value + distance * (binding.max - binding.min) / (event.shiftKey ? 1000 : 160))
				})
				const end = event => { if (drag?.id === event.pointerId) { engine.release(binding.id); drag = undefined } }
				for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) node.addEventListener(name, end)
				node.addEventListener("keydown", event => {
					if (event.key === "Escape") { learningState(false); release(); return }
					if ([" ", "Enter"].includes(event.key)) {
						event.preventDefault()
						if (!event.repeat && !chooseLearn() && binding.button) engine.press(binding)
					} else if (!binding.button && ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "Home", "End"].includes(event.key)) {
						event.preventDefault()
						if (learning || !binding.message) return
						const current = engine.values.get(binding.id) ?? binding.default ?? binding.min
						const direction = ["ArrowUp", "ArrowRight"].includes(event.key) ? 1 : -1
						const next = binding.options ? binding.options[Math.max(0, Math.min(binding.options.length - 1, binding.options.findIndex(option => option.value === current) + direction))].value : current + direction * binding.step * (event.shiftKey ? 10 : 1)
						engine.set(binding, event.key === "Home" ? binding.min : event.key === "End" ? binding.max : next)
					}
				})
				node.addEventListener("keyup", event => { if ([" ", "Enter"].includes(event.key)) { event.preventDefault(); engine.release(binding.id) } })
				node.addEventListener("blur", () => { engine.release(binding.id); drag = undefined })
				binding.configure = configure
			}
			loaded = true
			const mapped = bindings.filter(binding => binding.message).length
			status.textContent = `${mapped} mapped SVG controls. ${engine.output ? "Ready to send MIDI." : "No output: incoming feedback and learning only."}`
			if (!mapped) status.textContent += " Use Learn mapping to assign configurable controls."
			for (const data of earlyMessages.values()) engine.receive(data)
			earlyMessages.clear()
		} catch (error) { if (!disposed) status.textContent = `Interactive controls unavailable: ${error.message}` }
	})()
	return {
		element: container, ready,
		receive(data) {
			if (disposed) return
			if (!loaded) {
				const decoded = decodeMessage(data)
				if (decoded) {
					const key = `${decoded.type}:${decoded.channel}:${decoded.number ?? ""}`
					earlyMessages.delete(key)
					earlyMessages.set(key, Array.from(data))
				}
				return
			}
			if (learning && pending) {
				const decoded = decodeMessage(data)
				if (decoded && !(decoded.type === "note" && decoded.value === 0) && !(decoded.type === "cc" && decoded.number >= 120)) {
					const { value, ...message } = decoded
					const target = pending
					learned.set(target.id, message)
					Object.assign(target, surfaceBindings(profile, learned).find(binding => binding.id === target.id))
					target.configure()
					learningState(false)
				}
			}
			engine.receive(data)
		},
		dispose() {
			disposed = true
			engine.releaseAll()
			for (const timer of timers.values()) clearTimeout(timer)
			window.removeEventListener("blur", release)
			window.removeEventListener("pagehide", release)
			document.removeEventListener("visibilitychange", hidden)
		}
	}
}
