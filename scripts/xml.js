// A typed XML representation preserves arrays, empty values and numeric object keys.
const escapeXml = (value) => String(value).replace(/[<>&"'\r]/g, (character) => ({
	"<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;", "\r": "&#13;"
})[character])
const escapeAttribute = (value) => escapeXml(value).replace(/[\t\n]/g, (character) => character === "\t" ? "&#9;" : "&#10;")

export function toXml(data, { stylesheet, schema } = {}) {
	const element = (name, value, key) => {
		const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value
		const attributes = ` type="${type}"${key === undefined ? "" : ` key="${escapeAttribute(key)}"`}` +
			(name === "response" && schema ? ` xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="${escapeAttribute(schema)}"` : "")
		const content = type === "array"
			? value.map((item) => element("item", item)).join("")
			: type === "object"
				? Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) =>
					element("field", item, key)).join("")
				: type === "null" ? "" : escapeXml(value)
		return `<${name}${attributes}>${content}</${name}>`
	}
	const style = stylesheet ? `<?xml-stylesheet type="text/xsl" href="${escapeAttribute(stylesheet)}"?>\n` : ""
	return `<?xml version="1.0" encoding="UTF-8"?>\n${style}${element("response", data)}\n`
}
