"""Import named assignments from the MIDI Association's official SysEx ID table.

Run with --html <saved-page> for a reproducible offline import, or omit it to fetch
the current official page. Reserved values and the extension marker are excluded.
Existing company artwork, descriptions and websites are preserved.
"""
import argparse
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unicodedata
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://midi.org/sysexidtable"
# Explicit identities only. The source's assigned company names remain in the snapshot.
ALIASES = {
    "Sequential Circuits": "sequential",
    "Moog Music": "moog",
    "Waldorf Electronics GmbH": "waldorf",
    "Roland Corporation": "roland",
    "Korg Inc.": "korg",
    "Yamaha Corporation": "yamaha",
    "Casio Computer Co. Ltd": "casio",
    "Akai Electric Co. Ltd.": "akai",
    "Alesis Studio Electronics": "alesis",
    "M-Audio (Midiman)": "m-audio",
    "Nektar Technology Inc": "nektar",
    "Arcana Instruments LTD.": "arcana",
    "Digit Music": "digit-music",
    "Dreadbox P.C.": "dreadbox",
    "Sonicware Co., Ltd.": "sonicware",
    "Buchla USA": "buchla",
    "Native Instruments": "native-instruments",
    "Focusrite/Novation": "novation",
    "IK Multimedia": "ik-multimedia",
    "ROLI Ltd": "roli",
    "Expressive E": "expressive-e",
    "Oxi Electronic Instruments SL": "oxi-instruments",
    "Behringer GmbH": "behringer",
    "Teenage Engineering": "teenage-engineering",
    "Central Music Co. (CME)": "cme",
    "Elektron ESI AB": "elektron",
}


class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.row = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None:
            self.row.append(re.sub(r"\s+", " ", "".join(self.cell)).strip())
            self.cell = None
        elif tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def slug(value):
    ascii_name = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")


def write(file, data):
    file.write_text(json.dumps(data, indent="\t", ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--html", type=Path, help="Saved official table HTML instead of a network request")
    options = args.parse_args()
    if options.html:
        html = options.html.read_text(encoding="utf-8")
    else:
        with urlopen(Request(SOURCE, headers={"User-Agent": "midi-devices registry importer"}), timeout=60) as response:
            html = response.read().decode("utf-8")
    parser = TableParser()
    parser.feed(html)
    assignments = {}
    excluded = {}
    for row in parser.rows:
        if len(row) < 2 or not re.fullmatch(r"(?:[0-7][0-9A-F]H\s*){1,3}", row[0]):
            continue
        identifier = " ".join(re.findall(r"([0-7][0-9A-F])H", row[0]))
        name = row[1]
        if not name or name.lower() == "reserved" or name.startswith("["):
            excluded[identifier] = name
            continue
        if len(identifier.split()) not in (1, 3) or (len(identifier.split()) == 3 and not identifier.startswith("00 ")):
            raise ValueError(f"Invalid assigned ID: {identifier}")
        if identifier in assignments and assignments[identifier] != name:
            raise ValueError(f"Conflicting names for {identifier}")
        assignments[identifier] = name
    if len(assignments) < 600:
        raise ValueError("Official table appears incomplete; no files were written")

    directory = ROOT / "devices"
    existing = {p.parent.name: json.loads(p.read_text(encoding="utf-8")) for p in directory.glob("*/manufacturer.json")}
    by_name = {slug(d["name"]): key for key, d in existing.items() if slug(d["name"])}
    companies = {}
    records = []
    for identifier, name in sorted(assignments.items()):
        name_slug = slug(name)
        # Do not invent transliterations for names written entirely in another script.
        # Also avoid Windows reserved path components, keeping the import portable.
        if not name_slug or re.fullmatch(r"(?:con|prn|aux|nul|com[1-9]|lpt[1-9])", name_slug):
            name_slug = "midi-manufacturer-" + identifier.lower().replace(" ", "-")
        company_id = ALIASES.get(name) or by_name.get(name_slug) or name_slug
        if company_id in existing and company_id not in ALIASES.values() and slug(existing[company_id]["name"]) != slug(name):
            company_id += "-" + identifier.lower().replace(" ", "-")
        companies.setdefault(company_id, {"names": set(), "ids": []})
        companies[company_id]["names"].add(name)
        companies[company_id]["ids"].append(identifier)
        records.append({"hex": identifier, "name": name, "manufacturerId": company_id})
    for company_id, data in companies.items():
        folder = directory / company_id
        folder.mkdir(exist_ok=True)
        names = sorted(data["names"])
        descriptor = existing.get(company_id) or {
            "$schema": "../manufacturer.schema.json", "schemaVersion": 1,
            "id": company_id, "name": names[0], "registryOnly": True,
            "description": "Named manufacturer in the MIDI Association SysEx ID registry. Device profiles have not yet been added.",
            "links": [{"label": "Official MIDI manufacturer ID registry", "url": SOURCE}],
        }
        descriptor.update(midiManufacturerIds=data["ids"], midiRegistryNames=names, midiIdSource=SOURCE)
        write(folder / "manufacturer.json", descriptor)
    # Re-importing an unchanged saved page preserves the retrieval timestamp.
    snapshot_file = directory / "midi-manufacturers.json"
    old = json.loads(snapshot_file.read_text(encoding="utf-8")) if snapshot_file.exists() else {}
    retrieved = old.get("retrievedAt") if options.html and old.get("assignments") == records else None
    write(snapshot_file, {
        "source": SOURCE, "retrievedAt": retrieved or datetime.now(timezone.utc).isoformat(),
        "count": len(records), "assignments": records,
        "excluded": [{"hex": key, "reason": value} for key, value in sorted(excluded.items())],
    })
    print(f"Imported {len(records)} assigned IDs for {len(companies)} manufacturers ({len(companies.keys() - existing.keys())} new)")


if __name__ == "__main__":
    main()
