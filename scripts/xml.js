// A typed XML representation preserves arrays, empty values and numeric object keys.
const escapeXml = (value) => String(value).replace(/[<>&"']/g, (character) => ({
	"<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;"
})[character])

export function toXml(data) {
	const element = (name, value, key) => {
		const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value
		const attributes = ` type="${type}"${key === undefined ? "" : ` key="${escapeXml(key)}"`}`
		const content = type === "array"
			? value.map((item) => element("item", item)).join("")
			: type === "object"
				? Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) =>
					element("field", item, key)).join("")
				: type === "null" ? "" : escapeXml(value)
		return `<${name}${attributes}>${content}</${name}>`
	}
	return `<?xml version="1.0" encoding="UTF-8"?>\n${element("response", data)}\n`
}
