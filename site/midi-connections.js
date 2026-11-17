const normalise = (value) => String(value ?? "").trim().toLowerCase()

export function describeMidiMessage(data) {
	const [status, a = 0, b = 0] = data
	if (status === undefined) return "Empty MIDI message"
	const channel = (status & 15) + 1
	const note = (number) => `${["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"][number % 12]}${Math.floor(number / 12) - 1} (${number})`
	const messages = {
		128: `Note off · ${note(a)} · velocity ${b}`,
		144: `${b ? "Note on" : "Note off"} · ${note(a)} · velocity ${b}`,
		160: `Poly pressure · ${note(a)} · pressure ${b}`,
		176: `CC ${a} · value ${b}`,
		192: `Program change · value ${a}`,
		208: `Channel pressure · value ${a}`,
		224: `Pitch bend · value ${a | (b << 7)}`
	}
	if (status < 240 && messages[status & 240]) return `Ch ${channel} · ${messages[status & 240]}`
	return ({ 240: "SysEx", 241: "MIDI time code", 242: `Song position · ${a | (b << 7)}`, 243: `Song select · ${a}`, 246: "Tune request", 247: "End of SysEx", 248: "Clock", 250: "Start", 251: "Continue", 252: "Stop", 254: "Active sensing", 255: "System reset" })[status] ?? `MIDI status 0x${status.toString(16).toUpperCase()}`
}

// Web MIDI exposes endpoints, not physical USB identities. Pair one input and
// output per name/profile, retaining duplicate same-direction ports separately.
export function connectedMidiDevices(access, devices, assignments = new Map()) {
	const groups = []
	for (const [direction, collection] of [["Input", access.inputs], ["Output", access.outputs]]) {
		for (const port of collection.values()) {
			if (port.state !== "connected") continue
			const portKey = `${direction}:${port.id}`
			const assigned = assignments.get(portKey)
			const match = (assigned && devices.find(([id]) => id === assigned)) || devices.find(([id, { profile }]) =>
				(profile.ids ?? [id]).some((alias) => normalise(alias) === normalise(port.id))
			) || devices.find(([, { profile }]) =>
				(profile.portNames ?? []).some((alias) => normalise(alias) === normalise(port.name))
			)
			const id = match?.[0]
			const signature = JSON.stringify([id ?? null, normalise(port.manufacturer), id ? null : normalise(port.name)])
			let group = groups.find((item) => item.signature === signature && !item.ports.some((item) => item.direction === direction))
			if (!group) {
				group = { signature, id, device: match?.[1], ports: [] }
				groups.push(group)
			}
			group.ports.push({ direction, port, key: portKey })
		}
	}
	return groups
}
