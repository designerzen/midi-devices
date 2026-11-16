# Classic MIDI and accessible hardware coverage

The catalogue includes the following landmarks as distinct profiles, rather than treating modern reissues as interchangeable with the originals. This is a curated selection, not a claim that every famous instrument is covered. Each profile includes sources and describes the limits of its mappings.

| Device | Coverage and connection notes |
| --- | --- |
| Yamaha DX7 | Original FM keyboard; selected performance CCs and pitch bend, DIN MIDI |
| Roland D-50 | LA keyboard; virtual notes and pitch bend, DIN MIDI |
| Roland JUNO-106 | Original analog keyboard; virtual notes, DIN MIDI; panel SysEx omitted |
| Roland JX-8P | Analog keyboard; virtual notes and pitch bend, DIN MIDI |
| Roland TR-909 | Original rhythm composer; connection/setup reference; drum assignments and clock messages omitted |
| Korg M1 | Workstation; selected performance CCs and pitch bend, DIN MIDI |
| Korg microKORG (2002) | Original model; virtual notes and pitch bend, DIN MIDI |
| Korg MS2000 | Keyboard model; virtual notes and pitch bend, DIN MIDI |
| Akai MPC2000XL | Sampler/sequencer reference; loaded programs determine pad assignments |
| Sequential Circuits Prophet-600 | Original early MIDI keyboard; virtual notes; firmware-specific controllers omitted |
| Ableton Push 2 | USB controller reference; links to Ableton's published MIDI/display protocol; no fixed pad map |

The collection also includes modern devices such as the Minilogue, MicroFreak, OP-1, MPK mini MK3, Launchkey mini MK3, Circuit, and Roland Boutique models. A source-backed listing can be useful even when it only documents setup; an empty `controls` array means that no fixed control mappings are supplied.

## Accessible instruments

Accessibility needs differ between musicians. These listings describe playing methods and dependencies rather than promising suitability for every player.

| Device | Playing method | MIDI integration |
| --- | --- | --- |
| DIGIT CMPSR | Joystick | Existing profile includes documented directional CCs |
| Arcana Strum | Adaptive strumming | Existing profile includes playing/setup guidance |
| Soundbeam 5 | Movement in ultrasonic beams and switches | MIDI output; channels, scales, and assignments depend on the selected setup |
| Soundbeam 1 | Ultrasonic movement sensing | Original controller MIDI output; consult the manual for hardware revision settings |
| Soundbeam 2 | Ultrasonic movement sensing | Controller MIDI output; programmable pitch sequences and setups |
| Soundbeam 6 | Ultrasonic sensors and wireless switches | Built-in sounds; external MIDI routing is not verified in this profile |
| Desktop Soundbeam | Sensors with a computer interface | Legacy Windows software and drivers provide MIDI routing |
| Magic Flute | Breath and head tilt, hands-free | Control module can drive external MIDI sound sources; no assumed breath CC |
| Skoog 2.0 | Soft tactile cube | Companion app routes sensor input into MIDI; hardware is not a class-compliant MIDI port |
| Skwitch | Single-button phone accessory | Companion app provides musical behavior and MIDI routing |

[Soundbeam's manuals](https://www.soundbeam.co.uk/software-updates) cover multiple generations; use the Soundbeam 5 documentation for that profile. [My Breath My Music's Magic Flute guide](https://mybreathmymusic.com/en/magic-flute) explains the head-tilt/breath interface and external MIDI connection. My Breath My Music is the support/project organization used to group this listing, not a claim about the instrument's manufacturer.

The Soundbeam catalogue now covers every Soundbeam instrument family listed in the manufacturer's manual archive: **1, 2, 5, 6, and Desktop Soundbeam**. The archive does not list separate Soundbeam 3 or Soundbeam 4 products. Hardware revision numbers in early manuals should not be assumed to name separate product generations. Soundbox and Mini Soundbox are companion products, rather than additional Soundbeam controller generations.

[Desktop Soundbeam support](https://www.soundbeam.co.uk/desktop-soundbeam-manual-updates) specifies 32-bit Windows XP, Vista or Windows 7 and says software development ended in spring 2012. Its profile documents that dependency rather than promising current Windows compatibility. [Soundbeam 6 specifications](https://www.soundbeam.co.uk/soundbeam-6-product-page) describe built-in sounds, four sensor inputs, eight wireless switches and USB file transfer; the profile does not infer USB MIDI support from the presence of a USB socket. Soundbeam profiles provide setup guidance with empty control maps because note and controller assignments depend on the selected setup.

[Playable Technology's Skoog and Skwitch support](https://www.playable.tech/skoog) explains current app support and hardware discontinuation. Check companion-app and phone compatibility before relying on used hardware. Those profiles intentionally do not claim direct USB MIDI discovery.

## Connecting older hardware

Connect hardware MIDI OUT to the interface MIDI IN to receive a performance. Connect interface MIDI OUT to hardware MIDI IN to play the hardware. Select matching MIDI channels; use each manual's receive filters and sync settings where applicable. MIDI cables do not carry audio, so a synthesizer's audio outputs still need an audio connection.

DIN-connected hardware normally appears under the interface's name. These new legacy profiles therefore leave `portNames` empty rather than claiming generic interface aliases. Let the user select the profile for the port manually. App-mediated accessible devices likewise need the correct software routing before a MIDI application can receive their output.

Do not assume that an instrument has MIDI because a later reissue or aftermarket retrofit does. Original pre-MIDI hardware and retrofit-specific implementations need separate, verified profiles. Likewise, do not substitute a Boutique reissue's CC chart for its vintage counterpart.
