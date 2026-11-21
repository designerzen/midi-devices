import { readFileSync } from "node:fs"
import Ajv from "ajv/dist/2020.js"

export const SCHEMA_FILES = [
	"profile.schema.json", "manufacturer.schema.json", "index.schema.json",
	"manufacturers.schema.json", "midi-manufacturers.schema.json", "api.schema.json"
]

// Register relative references locally so validation never needs a network fetch.
export function createSchemaValidator() {
	const ajv = new Ajv({ allErrors: true, strict: false })
	for (const file of SCHEMA_FILES) {
		const schema = JSON.parse(readFileSync(new URL(`../devices/${file}`, import.meta.url), "utf8"))
		ajv.addSchema(schema, file)
	}
	return ajv
}
