// Live per-port, per-channel MIDI state in the style of ShowMIDI (github.com/gbevin/ShowMIDI):
// rather than a log, keep the latest value of every note, controller and channel message.
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

export const noteName = (number) => `${NOTE_NAMES[number % 12]}${Math.floor(number / 12) - 1}`

export function formatValue(value, format = "decimal", max = 127) {
	if (format === "percent") return `${Math.round(value / max * 100)}%`
	if (format === "hex") return value.toString(16).toUpperCase().padStart(max > 127 ? 4 : 2, "0")
	return String(value)
}

const channelState = () => ({ notes: new Map(), controllers: new Map(), program: undefined, pitchBend: undefined, pressure: undefined, time: 0 })

export class MidiState {
	constructor() { this.ports = new Map() }
	port(id, name) {
		let port = this.ports.get(id)
		if (!port) this.ports.set(id, port = { id, name, channels: new Map(), clock: { ticks: [], bpm: undefined, running: undefined, time: 0 }, time: 0 })
		port.name = name ?? port.name
		return port
	}
	channel(port, number) {
		let channel = port.channels.get(number)
		if (!channel) port.channels.set(number, channel = channelState())
		return channel
	}
	// Returns false for messages that do not change the state, such as SysEx or active sensing.
	receive(id, name, data, time = performance.now()) {
		const [status, a, b] = data
		const port = this.port(id, name)
		if (status === 0xf8 || status === 0xfa || status === 0xfb || status === 0xfc) {
			const clock = port.clock
			if (status === 0xf8) {
				clock.ticks.push(time)
				if (clock.ticks.length > 25) clock.ticks.shift()
				// 24 ticks per quarter note, averaged over the last beat.
				if (clock.ticks.length > 1) clock.bpm = 60000 / ((clock.ticks.at(-1) - clock.ticks[0]) / (clock.ticks.length - 1) * 24)
			} else {
				clock.running = status !== 0xfc
				if (status === 0xfa) clock.ticks = []
			}
			clock.time = port.time = time
			return true
		}
		if (status < 0x80 || status >= 0xf0) return false
		const channel = this.channel(port, (status & 15) + 1)
		switch (status & 0xf0) {
			case 0x80: case 0x90: {
				if (data.length < 3) return false
				const on = (status & 0xf0) === 0x90 && b > 0
				const note = channel.notes.get(a) ?? { number: a }
				Object.assign(note, on ? { on: true, velocity: b, pressure: undefined } : { on: false, release: b }, { time })
				channel.notes.set(a, note)
				break
			}
			case 0xa0: {
				if (data.length < 3) return false
				const note = channel.notes.get(a) ?? { number: a, on: false, velocity: 0 }
				Object.assign(note, { pressure: b, time })
				channel.notes.set(a, note)
				break
			}
			case 0xb0:
				if (data.length < 3) return false
				// All Sound Off / All Notes Off release every note on the channel.
				if (a === 120 || a === 123) for (const note of channel.notes.values()) Object.assign(note, { on: false, time })
				channel.controllers.set(a, { number: a, value: b, time })
				break
			case 0xc0: if (data.length < 2) return false; channel.program = { value: a, time }; break
			case 0xd0: if (data.length < 2) return false; channel.pressure = { value: a, time }; break
			case 0xe0: if (data.length < 3) return false; channel.pitchBend = { value: a | b << 7, time }; break
		}
		channel.time = port.time = time
		return true
	}
	// Forget anything older than `hold` ms, except notes still held down. A hold of 0 keeps everything.
	expire(now, hold) {
		if (!hold) return
		const stale = (item) => item && now - item.time > hold
		for (const [id, port] of this.ports) {
			for (const [number, channel] of port.channels) {
				for (const [key, note] of channel.notes) if (!note.on && stale(note)) channel.notes.delete(key)
				for (const [key, controller] of channel.controllers) if (stale(controller)) channel.controllers.delete(key)
				for (const key of ["program", "pitchBend", "pressure"]) if (stale(channel[key])) channel[key] = undefined
				if (!channel.notes.size && !channel.controllers.size && !channel.program && !channel.pitchBend && !channel.pressure) port.channels.delete(number)
			}
			if (stale(port.clock)) port.clock = { ticks: [], bpm: undefined, running: undefined, time: 0 }
			if (!port.channels.size && !port.clock.time) this.ports.delete(id)
		}
	}
	clear() { this.ports.clear() }
}
