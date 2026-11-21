"""XSD 1.1 contract and serializer round-trip regression tests."""
import json
import subprocess
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

import xmlschema
from xml_validation import parse_xml

ROOT = Path(__file__).resolve().parents[1]


def serialize(data, options=None):
    code = "import {toXml} from './scripts/xml.js'; process.stdout.write(toXml(JSON.parse(process.argv[1]), JSON.parse(process.argv[2])))"
    return subprocess.check_output(["node", "--input-type=module", "-e", code, json.dumps(data), json.dumps(options or {})], cwd=ROOT)


class XmlContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schema = xmlschema.XMLSchema11(ROOT / "devices/api.xsd", defuse="always", allow="local")

    def test_round_trip_every_type_and_attribute_whitespace(self):
        data = {'key\t\n\r<&"': [True, False, None, 0, -2.5, 1e-7, {}, []], 'text': '\r\n\t<&>" emoji: \U0001f3b9', 'empty': ''}
        xml = serialize(data)
        self.schema.validate(xml, use_location_hints=False)
        self.assertEqual(parse_xml(xml), data)

    def test_schema_and_stylesheet_metadata_preserve_values(self):
        options = {'schema': 'https://example.test/catalogue/api.xsd', 'stylesheet': 'https://example.test/catalogue/api.xsl?a=1&b="test"'}
        xml = serialize({'error': 'Unknown device'}, options)
        self.schema.validate(xml, use_location_hints=False)
        self.assertIn(b'<?xml-stylesheet type="text/xsl"', xml)
        self.assertIn(b'&amp;b=&quot;test&quot;', xml)
        self.assertEqual(ET.fromstring(xml).get('{http://www.w3.org/2001/XMLSchema-instance}noNamespaceSchemaLocation'), options['schema'])

    def test_xsd_rejects_incorrect_types_keys_and_container_shapes(self):
        invalid = [
            '<response/>', '<response type="unknown"/>', '<item type="string"/>',
            '<response type="boolean">1</response>', '<response type="number">NaN</response>',
            '<response type="number">01</response>', '<response type="null">value</response>',
            '<response type="object">text</response>',
            '<response type="object"><item type="null"/></response>',
            '<response type="array"><field key="x" type="null"/></response>',
            '<response type="object"><field type="string"/></response>',
            '<response type="object"><field key="x" type="null"/><field key="x" type="null"/></response>',
            '<response type="string"><item type="null"/></response>',
            '<response type="array"><item key="bad" type="null"/></response>',
        ]
        for xml in invalid:
            with self.subTest(xml=xml):
                self.assertFalse(self.schema.is_valid(xml, use_location_hints=False))
                with self.assertRaises(ValueError):
                    parse_xml(xml)

    def test_stylesheet_is_standalone_and_escapes_data(self):
        tree = ET.parse(ROOT / 'devices/api.xsl')
        ns = {'xsl': 'http://www.w3.org/1999/XSL/Transform'}
        self.assertEqual(tree.getroot().get('version'), '1.0')
        self.assertEqual(tree.find('xsl:output', ns).get('method'), 'html')
        self.assertFalse(tree.findall('xsl:import', ns) + tree.findall('xsl:include', ns))
        self.assertFalse(tree.findall('.//script'))
        self.assertFalse(any(node.get('disable-output-escaping') == 'yes' for node in tree.iter()))


if __name__ == '__main__':
    unittest.main()
