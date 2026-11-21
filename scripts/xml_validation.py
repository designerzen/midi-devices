"""Check typed XML and compare every generated response with its JSON counterpart."""
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

NUMBER = re.compile(r"-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+\-]?[0-9]+)?")
SCHEMA_LOCATION = "{http://www.w3.org/2001/XMLSchema-instance}noNamespaceSchemaLocation"


def decode(element):
    kind = element.get("type")
    allowed = {"type", "key"} if element.tag == "field" else {"type"}
    if element.tag == "response":
        allowed.add(SCHEMA_LOCATION)
    if set(element.attrib) - allowed or (element.tag == "field" and "key" not in element.attrib):
        raise ValueError("Invalid attributes or missing field key")
    text = element.text or ""
    if kind in ("object", "array"):
        child_tag = "field" if kind == "object" else "item"
        if text.strip() or any(child.tag != child_tag or (child.tail or "").strip() for child in element):
            raise ValueError("Invalid container content")
        if kind == "array":
            return [decode(child) for child in element]
        result = {}
        for child in element:
            key = child.get("key")
            if key in result:
                raise ValueError("Duplicate object key")
            result[key] = decode(child)
        return result
    if len(element):
        raise ValueError("Primitive value has child elements")
    if kind == "string":
        return text
    if kind == "null" and not text:
        return None
    if kind == "boolean" and text in ("true", "false"):
        return text == "true"
    if kind == "number" and NUMBER.fullmatch(text):
        return float(text) if any(char in text for char in ".eE") else int(text)
    raise ValueError(f"Invalid {kind} value")


def parse_xml(source):
    root = ET.fromstring(source)
    if root.tag != "response":
        raise ValueError("Expected response root")
    return decode(root)


def validate_directory(directory):
    files = sorted(Path(directory).rglob("*.xml"))
    if not files:
        raise ValueError(f"No generated XML found in {directory}")
    for file in files:
        actual = parse_xml(file.read_bytes())
        expected = json.loads(file.with_suffix(".json").read_text(encoding="utf-8"))
        # Compare serialized JSON to distinguish booleans from numeric 0/1.
        if json.dumps(actual, sort_keys=True) != json.dumps(expected, sort_keys=True):
            raise ValueError(f"XML/JSON mismatch: {file}")
    return len(files)


if __name__ == "__main__":
    print(f"Validated {validate_directory(sys.argv[1])} XML responses and JSON round trips")
