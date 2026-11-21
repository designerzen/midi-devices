// Optional HTTP host for the generated API. GitHub Pages serves static files only.
import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { toXml } from "./xml.js"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist")
const validId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const xmlAssets = new Map([["/api.xsd", "application/xml"], ["/api.xsl", "application/xslt+xml"]])

export function createApiServer({ directory = root } = {}) {
	return createServer(async (request, response) => {
		let format = "json"
		response.setHeader("Access-Control-Allow-Origin", "*")
		const error = (status, message) => {
			response.writeHead(status, { "Content-Type": format === "xml" ? "application/xml; charset=utf-8" : "application/json; charset=utf-8" })
			response.end(request.method === "HEAD" ? undefined : format === "xml" ? toXml({ error: message }, { stylesheet: "/api.xsl", schema: "/api.xsd" }) : JSON.stringify({ error: message }))
		}
		try {
			const url = new URL(request.url, "http://localhost")
			let file
			let resourceRoot = path.join(directory, "api", "v1")
			const assetType = xmlAssets.get(url.pathname)
			if (assetType) {
				file = url.pathname.slice(1)
				resourceRoot = directory
				format = "xml"
			} else if (url.pathname === "/api/v1/device") {
				format = url.searchParams.get("format") ?? "json"
				if (!["json", "xml"].includes(format)) {
					format = "json"
					return error(400, "format must be json or xml")
				}
				const ids = url.searchParams.getAll("id")
				if (ids.length !== 1 || !validId.test(ids[0])) return error(400, "Provide one valid device id")
				file = `devices/${ids[0]}.${format}`
			} else {
				const match = /^\/api\/v1\/((?:(?:devices|manufacturers|midi)\/[a-z0-9]+(?:-[a-z0-9]+)*|index|devices|manufacturers|ports)\.(json|xml))$/.exec(url.pathname)
				if (!match) return error(404, "Unknown endpoint")
				file = match[1]
				format = match[2]
			}
			if (!["GET", "HEAD"].includes(request.method)) {
				response.setHeader("Allow", "GET, HEAD")
				return error(405, "Method not allowed")
			}
			const bytes = await readFile(path.join(resourceRoot, file))
			response.writeHead(200, {
				"Content-Type": assetType ? `${assetType}; charset=utf-8` : format === "xml" ? "application/xml; charset=utf-8" : "application/json; charset=utf-8",
				"Content-Length": bytes.length
			})
			response.end(request.method === "HEAD" ? undefined : bytes)
		} catch (failure) {
			if (failure.code === "ENOENT") return error(404, "Device or resource not found")
			console.error(failure)
			error(500, "Unable to read API data")
		}
	})
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const port = Number(process.env.PORT ?? 3000)
	createApiServer().listen(port, process.env.HOST ?? "127.0.0.1", () => {
		console.log(`MIDI devices API listening on port ${port}`)
	})
}
