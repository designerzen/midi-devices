"""Check generated SVG references and device-specific MIDI/layout invariants."""
import json
import re
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SVG = "{http://www.w3.org/2000/svg}"


def profile(folder, identifier):
    return json.loads((ROOT / "devices" / folder / f"{identifier}.json").read_text(encoding="utf-8"))


class DeviceDiagrams(unittest.TestCase):
    def test_launchpad_programmer_map_keeps_physical_orientation(self):
        device = profile("novation/launchpad-x", "novation-launchpad-x")
        controls = {c["id"]: c for c in device["controls"]}
        pads = [e for e in device["surface"]["elements"] if e["kind"] == "pad"]
        self.assertEqual(len(pads), 64)
        notes = [controls[p["control"]]["message"]["number"] for p in pads]
        self.assertEqual(notes[:8], list(range(81, 89)))
        self.assertEqual(notes[-8:], list(range(11, 19)))
        self.assertEqual(len(set(notes)), 64)
        self.assertTrue(all(controls[p["control"]]["message"]["channel"] == 1 for p in pads))
        cc = {c["message"]["number"] for c in controls.values() if c["message"]["type"] == "cc"}
        self.assertEqual(cc, set(range(91, 99)) | set(range(19, 90, 10)))

    def test_configurable_surfaces_do_not_inherit_other_models_mappings(self):
        for model, count in [("launchpad-mini-mk3", 64), ("circuit-tracks", 32), ("circuit-rhythm", 32)]:
            device = profile("novation/" + model, "novation-" + model)
            pads = [e for e in device["surface"]["elements"] if e["kind"] == "pad"]
            self.assertEqual(len(pads), count)
            self.assertTrue(all("control" not in p and "message" not in p for p in pads))
            self.assertEqual(device["portNames"], [])
        device = profile("arturia/keystep-37", "arturia-keystep-37")
        self.assertEqual(len([e for e in device["surface"]["elements"] if e["kind"] == "key"]), 37)
        self.assertTrue(all("cc" not in c for c in device["controls"]))

    def test_svg_documents_and_local_references(self):
        for file in (ROOT / "devices").glob("*/*/*.svg"):
            with self.subTest(file=file):
                tree = ET.parse(file)
                ids = [e.attrib["id"] for e in tree.iter() if "id" in e.attrib]
                self.assertEqual(len(ids), len(set(ids)))
                for reference in re.findall(r"url\(#([^)]+)\)", file.read_text(encoding="utf-8")):
                    self.assertIn(reference, ids)
                for element in tree.iter(SVG + "svg"):
                    if "data-symbol" in element.attrib:
                        self.assertGreater(float(element.attrib["width"]), 0)
                        self.assertGreater(float(element.attrib["height"]), 0)

    def test_new_models_have_real_surface_types_without_guessed_bindings(self):
        for folder, identifier in [("superlative/sb01", "superlative-sb01"), ("korg/arp-2600-fs", "korg-arp-2600-fs"), ("roland/v-stage-76", "roland-v-stage-76"), ("roland/v-stage-88", "roland-v-stage-88")]:
            device = profile(folder, identifier)
            surface = device["surface"]["elements"]
            self.assertGreater(len(surface), 60)
            self.assertTrue(all("control" not in item for item in surface))
            tree = ET.parse(ROOT / "devices" / folder / "interface.svg")
            by_id = {e.attrib["id"]: e for e in tree.iter() if "id" in e.attrib}
            for item in surface:
                self.assertIn(item["id"], by_id)
                self.assertEqual(item["kind"], by_id[item["id"]].attrib["data-kind"])

    def test_analog_panel_controls_do_not_gain_cc_assignments(self):
        arp = profile("korg/arp-2600-fs", "korg-arp-2600-fs")
        self.assertEqual(arp["controls"], [])
        self.assertIn("input", {item["kind"] for item in arp["surface"]["elements"]})
        self.assertIn("output", {item["kind"] for item in arp["surface"]["elements"]})
        sb = profile("superlative/sb01", "superlative-sb01")
        self.assertEqual({c["cc"] for c in sb["controls"] if "cc" in c}, {1, 21, 64})

    def test_vstage_key_ranges_and_black_keys(self):
        for count, first in [(76, 28), (88, 21)]:
            identifier = f"roland-v-stage-{count}"
            device = profile(f"roland/v-stage-{count}", identifier)
            keys = [e for e in device["surface"]["elements"] if e["kind"] == "key"]
            self.assertEqual(len(keys), count)
            self.assertEqual(sorted(e["message"]["number"] for e in keys), list(range(first, first + count)))
            tree = ET.parse(ROOT / "devices/roland" / f"v-stage-{count}" / "interface.svg")
            by_id = {e.attrib["id"]: e for e in tree.iter() if "id" in e.attrib}
            for key in keys:
                rectangle = by_id[key["id"]].find(SVG + "rect")
                self.assertEqual(rectangle.attrib["fill"], "#000" if key["dark"] else "#fff")


if __name__ == "__main__":
    unittest.main()
