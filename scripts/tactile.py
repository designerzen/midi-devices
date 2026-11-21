"""Original monochrome geometry using the NYU SynthAccess tactile vocabulary.

Symbol meanings: tactileSynthGuides/guides/TactileSynthsStyleGuide.pdf, pp. 5-7.
No PDF artwork, braille text or manufacturer drawings are embedded.
"""
from html import escape

SOURCE = "https://github.com/IDMNYU/synthaccess/tree/ee1ef12cec3a3fb6be59a7861f7df8848be2dafe/tactileSynthGuides"

DEFS = '''<defs>
<pattern id="tactile-stripes" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fff"/><path d="M0 3H6" stroke="#000" stroke-width="2"/></pattern>
<pattern id="tactile-dots" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#fff"/><circle cx="2" cy="2" r="1.5" fill="#000"/><circle cx="6" cy="6" r="1.5" fill="#000"/></pattern>
</defs>'''


def symbol(kind, x, y, width, height):
    """Fit a symbol into a cell; aspect ratios and the control identity are preserved."""
    shapes = {
        "knob": '<circle cx="20" cy="20" r="18" fill="url(#tactile-stripes)"/><circle cx="20" cy="20" r="11" fill="#fff"/>',
        "round-button": '<circle cx="20" cy="20" r="17" fill="url(#tactile-dots)"/>',
        "button": '<rect x="3" y="3" width="34" height="34" fill="#fff"/><path d="M3 3L10 10M37 3L30 10M3 37L10 30M37 37L30 30"/><rect x="10" y="10" width="20" height="20" fill="#000"/>',
        "input": '<polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="#fff"/>',
        "output": '<polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="url(#tactile-stripes)"/>',
        "bidirectional": '<rect x="3" y="3" width="34" height="34" fill="url(#tactile-dots)"/>',
        "power": '<circle cx="20" cy="20" r="18" fill="#fff"/><circle cx="20" cy="20" r="14" fill="#fff"/><path d="M6 20A14 14 0 0 1 34 20Z" fill="#000"/>',
        "switch": '<rect x="12" y="2" width="16" height="36" fill="#fff"/><path d="M12 20H28"/>',
        "switch3": '<rect x="12" y="2" width="16" height="36" fill="#fff"/><path d="M12 14H28M12 26H28"/>',
        "wave-sine": '<path d="M2 20C8 -3 12 -3 20 20S32 43 38 20"/>',
        "wave-triangle": '<path d="M2 35L11 5L29 35L38 5"/>',
        "wave-saw": '<path d="M2 35L19 5V35L36 5V35"/>',
        "wave-square": '<path d="M2 35V5H20V35H38V5"/>',
        "wave-pulse": '<path d="M2 35V5H11V35H29V5H38"/>',
        "wave-adsr": '<path d="M2 35L10 5L20 20H30L38 35"/>',
    }
    if kind not in shapes and kind not in ["fader", "horizontal-fader"]:
        return None
    if kind in ["fader", "horizontal-fader"]:
        if kind == "fader":
            w = min(8, width * .16); h = max(4, height - 4)
        else:
            w = max(4, width - 4); h = min(8, height * .16)
        return f'<rect data-symbol="{kind}" x="{x+(width-w)/2:.3f}" y="{y+(height-h)/2:.3f}" width="{w:.3f}" height="{h:.3f}" rx="{min(w,h)/2:.3f}" fill="#fff" stroke="#000" stroke-width="2"/>'
    size = max(4, min(width - 4, height - 4, 48))
    return f'<svg data-symbol="{escape(kind)}" x="{x+(width-size)/2:.3f}" y="{y+(height-size)/2:.3f}" width="{size:.3f}" height="{size:.3f}" viewBox="0 0 40 40"><g fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round">{shapes[kind]}</g></svg>'
