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
    def test_nord_variants_preserve_keybeds_and_midi_connections(self):
        expected = {"stage-4-88": 88, "stage-4-73": 73, "stage-4-compact": 73,
                    "electro-7-61": 61, "electro-7-73": 73, "electro-7-hp": 73,
                    "piano-6-73": 73, "piano-6-88": 88, "grand-2": 88,
                    "organ-3": 122, "wave-2": 61, "lead-a1": 49, "drum-3p": 0}
        for model, count in expected.items():
            device = profile(f"clavia-digital-instruments/{model}", f"nord-{model}")
            with self.subTest(model=model):
                elements = device["surface"]["elements"]
                self.assertEqual(sum(e["kind"] == "key" for e in elements), count)
                self.assertEqual(device["portNames"], [])
                self.assertTrue(all("control" not in e and "message" not in e for e in elements))
                self.assertEqual(any(p["connector"] == "USB-B" for p in device["connections"]), model != "drum-3p")
                for direction in ["input", "output"]:
                    self.assertTrue(any(p["connector"] == "5-pin DIN MIDI" and p["direction"] == direction for p in device["connections"]))
                wheels = sum(e["kind"] == "wheel" for e in elements)
                self.assertEqual(wheels, int(model in {"stage-4-88", "stage-4-73", "stage-4-compact", "electro-7-73", "electro-7-hp", "wave-2", "lead-a1"}))
        organ = profile("clavia-digital-instruments/organ-3", "nord-organ-3")
        keys = [e for e in organ["surface"]["elements"] if e["kind"] == "key"]
        self.assertEqual(sum(e["id"].startswith("upper-") for e in keys), 61)
        self.assertEqual(sum(e["id"].startswith("lower-") for e in keys), 61)
        self.assertEqual(len({e["id"] for e in keys}), 122)
        self.assertEqual(next(c["cc"] for c in organ["controls"] if c["id"] == "swell"), 4)
        drum = profile("clavia-digital-instruments/drum-3p", "nord-drum-3p")
        self.assertEqual(sum(e["kind"] == "pad" for e in drum["surface"]["elements"]), 6)
        self.assertEqual(drum["controls"], [])

    def test_teenage_engineering_transport_and_mapping_boundaries(self):
        root = ROOT / "devices/teenage-engineering"
        devices = {p.parent.name: json.loads(p.read_text(encoding="utf-8")) for p in root.glob("*/*.json")}
        self.assertEqual(len(devices), 28)
        for model, device in devices.items():
            if model == "op-1":
                continue
            self.assertEqual(device["portNames"], [], model)
            self.assertTrue(all("message" not in e and "control" not in e for e in device["surface"]["elements"]), model)
        for model in ["pom-16", "pom-170"]:
            device = devices[model]
            midi = [p for p in device["connections"] if "MIDI" in p["label"]]
            self.assertEqual(len(midi), 1)
            self.assertEqual(midi[0]["direction"], "output")
            self.assertIn("Type A", midi[0]["connector"])
            self.assertFalse(any("USB" in p["connector"] for p in device["connections"]))
        for model in ["line-module", "oplab-module"]:
            self.assertIn("Requires an OP-Z", devices[model]["notice"])
            self.assertFalse(any("USB" in p["connector"] for p in devices[model]["connections"]))
        for model, device in devices.items():
            if model.startswith("choir-"):
                self.assertEqual(device["controls"], [])
                self.assertTrue(any(p["connector"] == "Bluetooth LE MIDI" for p in device["connections"]))
                self.assertEqual(next(p for p in device["connections"] if "USB" in p["connector"])["label"], "Charging")
        self.assertEqual(devices["cm-15"]["controls"], [])
        levels = devices["ep-35"]["controls"]
        self.assertEqual([c["message"]["channel"] for c in levels], list(range(1, 7)))
        self.assertTrue(all(c["message"]["number"] == 7 for c in levels))
        for model in ["op-1-field", "op-xy"]:
            self.assertEqual(sum(e["kind"] == "key" for e in devices[model]["surface"]["elements"]), 24)

    def test_irig_variants_keep_model_specific_wheels_and_pedal(self):
        for model, count in [("irig-keys-2", 37), ("irig-keys-2-mini", 25)]:
            device = profile(f"ik-multimedia/{model}", f"ik-multimedia-{model}")
            surface = device["surface"]["elements"]
            self.assertEqual(sum(e["kind"] == "key" for e in surface), count)
            self.assertEqual(sum(e["kind"] == "wheel" for e in surface), 2 if count == 37 else 0)
            self.assertEqual(any(p["label"] == "External pedal" for p in device["connections"]), count == 37)
            self.assertTrue(all("message" not in e and "control" not in e for e in surface))
            self.assertTrue(all("2.5 mm" in p["connector"] for p in device["connections"] if p["label"].startswith("MIDI")))

    def test_new_synth_connections_do_not_inherit_unavailable_ports(self):
        for model in ["liven-xfm", "liven-lofi-12"]:
            device = profile(f"sonicware/{model}", f"sonicware-{model}")
            self.assertFalse(any("USB" in p["label"] for p in device["connections"]))
            self.assertEqual(sum(e["kind"] == "key" for e in device["surface"]["elements"]), 27)
            self.assertEqual(device["portNames"], [])
        blofeld = profile("waldorf/blofeld-desktop", "waldorf-blofeld-desktop")
        self.assertFalse(any(p["label"] == "MIDI OUT" for p in blofeld["connections"]))

    def test_typhon_documented_ccs_do_not_bind_global_volume_to_preset_volume(self):
        device = profile("dreadbox/typhon", "dreadbox-typhon")
        controls = {c["id"]: c for c in device["controls"]}
        self.assertEqual(controls["cutoff"]["cc"], 74)
        self.assertEqual(controls["resonance"]["cc"], 71)
        self.assertEqual(controls["wave"]["cc"], 70)
        volume = next(e for e in device["surface"]["elements"] if e["id"] == "analog-voice-volume")
        self.assertNotIn("control", volume)
        self.assertTrue(any(p["label"] == "USB MIDI / power" and p["direction"] == "bidirectional" for p in device["connections"]))

    def test_launchkey_mk4_model_sizes_and_fader_inventory(self):
        for count in [25, 37, 49, 61]:
            device = profile(f"novation/launchkey-{count}-mk4", f"novation-launchkey-{count}-mk4")
            surface = device["surface"]["elements"]
            self.assertEqual(sum(e["kind"] == "key" for e in surface), count)
            self.assertEqual(sum(e["kind"] == "pad" for e in surface), 16)
            self.assertEqual(sum(e["kind"] == "fader" for e in surface), 9 if count >= 49 else 0)
            self.assertTrue(all("control" not in e for e in surface if e["kind"] != "key"))

    def test_alternative_controllers_preserve_configurable_assignments(self):
        for model, kind, count in [("softstep-2", "pad", 10), ("12-step", "pad", 13), ("quneo", "pad", 16), ("qunexus", "key", 25)]:
            device = profile(f"keith-mcmillen/{model}", f"keith-mcmillen-{model}")
            surface = device["surface"]["elements"]
            self.assertEqual(sum(e["kind"] == kind for e in surface), count)
            self.assertTrue(all("message" not in e and "control" not in e for e in surface))
            self.assertEqual(device["controls"], [])
        for model in ["softstep-2", "12-step"]:
            device = profile(f"keith-mcmillen/{model}", f"keith-mcmillen-{model}")
            self.assertIn("MIDI Expander", device["notice"])
            self.assertFalse(any("DIN" in p["connector"] for p in device["connections"]))

    def test_kontrol_mk3_accessibility_dependencies_and_key_ranges(self):
        for count, first in [(49, 36), (61, 36), (88, 21)]:
            device = profile(f"native-instruments/kontrol-s{count}-mk3", f"native-instruments-kontrol-s{count}-mk3")
            keys = [e for e in device["surface"]["elements"] if e["kind"] == "key"]
            self.assertEqual(sorted(e["message"]["number"] for e in keys), list(range(first, first + count)))
            self.assertIn("NI Accessibility Helper", device["notice"])
            self.assertTrue(any("accessibility-helper" in d["url"] for d in device["documentation"]))
            self.assertEqual(device["controls"][0]["cc"], 11)
            self.assertTrue(any(e.get("control") == "expression" for e in device["surface"]["elements"]))

    def test_catalogue_surfaces_are_drawn_and_match_their_svg(self):
        for path in (ROOT / "devices").glob("*/*/*.json"):
            device = json.loads(path.read_text(encoding="utf-8"))
            with self.subTest(device=device["id"]):
                surface = device["surface"]
                self.assertTrue(surface["elements"], "Device still has an empty placeholder surface")
                tree = ET.parse(path.parent / surface["src"])
                by_id = {e.attrib["id"]: e for e in tree.iter() if "id" in e.attrib}
                for item in surface["elements"]:
                    if tree.getroot().get("data-diagram-style") == "wireframe":
                        identifier = f'{device["id"]}-panel--surface--{item["id"]}'
                        self.assertIn(identifier, by_id)
                        self.assertEqual(item["id"], by_id[identifier].attrib["data-surface-control"])
                    else:
                        self.assertIn(item["id"], by_id)
                        self.assertEqual(item["kind"], by_id[item["id"]].attrib["data-kind"])
                for filename in ["panel.svg", "interface.svg"]:
                    self.assertNotIn("Conceptual schematic; see profile setup notes", (path.parent / filename).read_text())

    def test_previously_empty_pad_surfaces_do_not_gain_guessed_midi_maps(self):
        for folder, identifier, count in [("ableton/push-2", "ableton-push-2", 64), ("akai/mpc2000xl", "akai-mpc2000xl", 16)]:
            device = profile(folder, identifier)
            pads = [e for e in device["surface"]["elements"] if e["kind"] == "pad"]
            self.assertEqual(len(pads), count)
            self.assertTrue(all("control" not in e and "message" not in e for e in device["surface"]["elements"]))
        mpc = profile("akai/mpc2000xl", "akai-mpc2000xl")
        pads = [e for e in mpc["surface"]["elements"] if e["kind"] == "pad"]
        self.assertEqual([e["label"] for e in pads[:4]], [f"PADS: Pad {i}" for i in range(13, 17)])

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
            self.assertEqual(device["portNames"], ["LPMiniMK3 MIDI In", "LPMiniMK3 MIDI Out"] if model == "launchpad-mini-mk3" else [])
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
