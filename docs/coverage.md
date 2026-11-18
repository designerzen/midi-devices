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

The catalogue also covers mainstream hardware with documented accessibility support and controllers offering alternative playing methods. These are separate considerations: a pressure sensor or foot pedal does not by itself make a device suitable for every disabled musician.

| Added device | Access method and coverage |
| --- | --- |
| Native Instruments Kontrol S49 / S61 / S88 MK3 | Spoken feedback through NI Accessibility Helper and supported NI software; fixed velocity and configurable pedals; separate profiles preserve each key range |
| Native Instruments Maschine MK3 | NI Accessibility Helper with compatible Maschine software; 16 pads and a touch strip; generic MIDI mode uses an editable Controller Editor template |
| Keith McMillen SoftStep 2 | Ten foot pads with pressure and X/Y sensing, configurable sensitivity and navigation; USB MIDI, optional KMI MIDI Expander for DIN |
| Keith McMillen 12 Step (original) | Thirteen chromatic foot keys, pressure and tilt, configurable notes/chords; USB MIDI, optional KMI MIDI Expander for DIN |
| Keith McMillen QuNeo | Sixteen pressure/X-Y pads plus touch sliders and rotary sensors; preset-dependent messages; discontinued hardware |
| Keith McMillen QuNexus (original) | Twenty-five sensor keys with pressure/tilt and configurable sensitivity; original model documentation, distinct from RED and Galaxy |
| Novation Launchkey 25 / 37 / 49 / 61 MK4 | Scale/chord tools and a latching Shift modifier; 16 pads and eight encoders, with nine faders on 49/61 only |

[NI's Accessibility Helper guide](https://www.native-instruments.com/pages/ni-accessibility-helper) describes supported hardware, software and spoken feedback. [Activation instructions](https://support.native-instruments.com/support/solutions/articles/69000879677-komplete-kontrol-how-to-activate-the-komplete-kontrol-accessibility-features) require compatible firmware, Hardware Connection Service and the Helper application. A generic browser MIDI connection does not provide these speech features. The profiles record these dependencies and do not label the keyboards as standalone talking instruments.

[KMI's manuals and editors](https://keithmcmillen.com/downloads/) cover sensitivity and preset editing. The original SoftStep 2 and 12 Step profiles do not inherit the newer SoftStep3 / 12 Step2 TRS MIDI or CV sockets. Their physical controls remain unbound because the loaded preset determines notes, chords and controller numbers. Foot operation and touch sensing should be assessed with the musician's positioning, movement and assistance needs.

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

## Additional mainstream controller coverage

The latest batch adds **15 profiles**, bringing the catalogue to **118 devices**. Alongside the access-oriented entries above, it includes **Novation Launchpad Pro MK3**, **Akai MPK mini IV** and **Akai APC mini MK2**. Each has panel, labelled interface and connection diagrams. Launchpad Pro modes, APC clip/drum/note modes, and editable MPK pads are not assigned a universal note map. MPK mini IV setup distinguishes its performance, DAW and software ports and documents the DIN output routing setting.

This is a curated expansion of widely used controller families, not a sales ranking or a claim of exhaustive popular-device coverage. Manufacturer manuals are linked in every profile. Port aliases are left empty where an exact model-specific name has not been verified; manual profile selection remains available.

## Connecting older hardware

The Superlative SB01, Roland V-STAGE 76/88 and Korg ARP 2600 FS profiles incorporate individual control and connection inventories from [NYU SynthAccess tactile guides](https://github.com/IDMNYU/synthaccess/tree/main/tactileSynthGuides), cross-checked against the manufacturers' manuals. The SB01 and ARP 2600 FS entries explicitly distinguish their MIDI-equipped hardware from the original SH-101 and ARP 2600. The System-100 and Serge guides are not independent MIDI device entries. Analog panel controls are recorded as physical controls without guessed CC assignments.

Connect hardware MIDI OUT to the interface MIDI IN to receive a performance. Connect interface MIDI OUT to hardware MIDI IN to play the hardware. Select matching MIDI channels; use each manual's receive filters and sync settings where applicable. MIDI cables do not carry audio, so a synthesizer's audio outputs still need an audio connection.

DIN-connected hardware normally appears under the interface's name. These new legacy profiles therefore leave `portNames` empty rather than claiming generic interface aliases. Let the user select the profile for the port manually. App-mediated accessible devices likewise need the correct software routing before a MIDI application can receive their output.

Do not assume that an instrument has MIDI because a later reissue or aftermarket retrofit does. Original pre-MIDI hardware and retrofit-specific implementations need separate, verified profiles. Likewise, do not substitute a Boutique reissue's CC chart for its vintage counterpart.
