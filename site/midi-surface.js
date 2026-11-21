// MIDI logic shared by the SVG host and its tests. Incoming messages never echo.
export function surfaceBindings(profile, learned = new Map()) {
	const controls = new Map((profile.controls ?? []).map(control => [control.id, control]))
	return (profile.surface?.elements ?? []).map(part => {
		const control = controls.get(part.control ?? part.id)
		const message = learned.get(part.id) ?? part.message ?? control?.message ?? (control?.cc !== undefined ? { type: "cc", number: control.cc } : undefined)
		const messages = learned.has(part.id) || part.message ? [message] : control?.messages ?? [message]
		const max = Math.min(control?.max ?? 16383, message?.type === "pitchBend" ? 16383 : 127)
		return { ...part, message, messages: messages.filter(Boolean), min: control?.min ?? 0, max,
			step: control?.step ?? 1, default: control?.default, options: control?.options,
			readOnly: control?.widget === "meter",
			button: message?.type === "note" || ["key", "pad", "button", "round-button", "switch", "switch3"].includes(part.kind) || ["button", "toggle"].includes(control?.widget),
			momentary: message?.type === "note" || control?.momentary === true }
	})
}

export function encodeMessage(message, value, channel = 1, release = false) {
	const ch = (message.channel ?? channel) - 1
	if (!Number.isInteger(ch) || ch < 0 || ch > 15) throw new Error("Choose a MIDI channel from 1 to 16.")
	const v = Math.max(0, Math.min(message.type === "pitchBend" ? 16383 : 127, Math.round(value)))
	switch (message.type) {
		case "cc": return [0xb0 | ch, message.number, v]
		case "note": return [release ? 0x80 | ch : 0x90 | ch, message.number, release ? 0 : v]
		case "pitchBend": return [0xe0 | ch, v & 127, v >> 7]
		case "programChange": return [0xc0 | ch, v]
		case "channelPressure": return [0xd0 | ch, v]
		case "sysex": {
			const bytes = message.bytes?.map(byte => byte === "value" ? v : byte)
			if (!bytes || bytes[0] !== 240 || bytes.at(-1) !== 247 || bytes.slice(1, -1).some(byte => !Number.isInteger(byte) || byte < 0 || byte > 127)) throw new Error("Invalid SysEx template.")
			return bytes
		}
		default: throw new Error("Unsupported MIDI mapping.")
	}
}

export function decodeMessage(data) {
	const [status, a, b] = data
	if (status < 128 || status >= 240) return
	const channel = (status & 15) + 1
	switch (status & 240) {
		case 128: if (data.length >= 3) return { type: "note", channel, number: a, value: 0 }; break
		case 144: if (data.length >= 3) return { type: "note", channel, number: a, value: b }; break
		case 176: if (data.length >= 3) return { type: "cc", channel, number: a, value: b }; break
		case 192: if (data.length >= 2) return { type: "programChange", channel, value: a }; break
		case 208: if (data.length >= 2) return { type: "channelPressure", channel, value: a }; break
		case 224: if (data.length >= 3) return { type: "pitchBend", channel, value: a | b << 7 }; break
	}
}

function receivedValue(message, data, channel) {
	if (message.type === "sysex") {
		if (data.length !== message.bytes?.length || !message.bytes.every((byte, i) => byte === "value" ? data[i] < 128 : byte === data[i])) return
		return data[message.bytes.indexOf("value")] ?? 127
	}
	const decoded = decodeMessage(data)
	if (decoded?.type === message.type && decoded.channel === (message.channel ?? channel) && (message.number === undefined || decoded.number === message.number)) return decoded.value
}

export class MidiSurface {
	constructor({ bindings, output, channel = 1, sysexEnabled = false, changed = () => {}, error = () => {} }) {
		Object.assign(this, { bindings, output, channel, sysexEnabled, changed, error })
		this.values = new Map()
		this.held = new Map()
	}
	update(binding, value, source) {
		this.values.set(binding.id, value)
		this.changed(binding, value, source)
	}
	send(binding, value, release = false, target = this.output, channel = this.channel) {
		if (!target || target.state !== "connected" || binding.readOnly || !binding.messages.length) return false
		const sent = []
		try {
			const packets = binding.messages.map(message => encodeMessage(message, value, channel, release))
			if (!this.sysexEnabled && packets.some(bytes => bytes[0] === 240)) throw new Error("Enable Include SysEx and refresh connections to use this control.")
			for (const packet of packets) { target.send(packet); sent.push(packet) }
			this.update(binding, value, "sent")
			return true
		} catch (error) {
			// A multi-message mapping can fail halfway through: release any notes sent.
			for (const packet of sent) if ((packet[0] & 240) === 144 && packet[2]) {
				try { target.send([0x80 | packet[0] & 15, packet[1], 0]) } catch { /* The port may have disappeared. */ }
			}
			this.error(error); return false
		}
	}
	set(binding, value) {
		const stepped = binding.min + Math.round((value - binding.min) / binding.step) * binding.step
		const bounded = Math.max(binding.min, Math.min(binding.max, stepped))
		const selected = binding.options?.reduce((best, option) => Math.abs(option.value - bounded) < Math.abs(best.value - bounded) ? option : best)?.value ?? bounded
		return this.send(binding, selected)
	}
	press(binding) {
		if (this.held.has(binding.id)) return
		const value = binding.momentary ? binding.max : (this.values.get(binding.id) ?? binding.min) > binding.min ? binding.min : binding.max
		if (this.send(binding, value) && binding.momentary) this.held.set(binding.id, { binding, target: this.output, channel: this.channel })
	}
	release(id) {
		const held = this.held.get(id)
		if (!held) return
		this.held.delete(id)
		this.send(held.binding, held.binding.min, true, held.target, held.channel)
	}
	releaseAll() { for (const id of this.held.keys()) this.release(id) }
	receive(data) {
		const decoded = decodeMessage(data)
		// All Sound Off / All Notes Off must also clear held key feedback.
		if (decoded?.type === "cc" && [120, 123].includes(decoded.number)) {
			for (const binding of this.bindings) if (binding.message?.type === "note" && (binding.message.channel ?? this.channel) === decoded.channel) this.update(binding, 0, "received")
		}
		for (const binding of this.bindings) {
			for (const message of binding.messages) {
				const value = receivedValue(message, data, this.channel)
				if (value !== undefined) { this.update(binding, value, "received"); break }
			}
		}
	}
}
