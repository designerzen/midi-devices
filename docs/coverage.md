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

An earlier batch added **15 profiles**, bringing the catalogue to **118 devices**. Alongside the access-oriented entries above, it included **Novation Launchpad Pro MK3**, **Akai MPK mini IV** and **Akai APC mini MK2**. Each has panel, labelled interface and connection diagrams. Launchpad Pro modes, APC clip/drum/note modes, and editable MPK pads are not assigned a universal note map. MPK mini IV setup distinguishes its performance, DAW and software ports and documents the DIN output routing setting.

This is a curated expansion of widely used controller families, not a sales ranking or a claim of exhaustive popular-device coverage. Manufacturer manuals are linked in every profile. Port aliases are left empty where an exact model-specific name has not been verified; manual profile selection remains available.

## Additional manufacturers and instruments

An earlier expansion added **12 devices across six new manufacturer roots**, bringing that batch to **130 devices from 33 manufacturers**. Each root has a company descriptor, shared manufacturer logo, website and support links. Every new profile includes panel, labelled interface and connection diagrams. These schematics show selected physical controls rather than a complete or dimensionally accurate panel inventory.

| Manufacturer | Devices | Coverage and distinctions |
| --- | --- | --- |
| [Elektron](https://www.elektron.se/) | Digitakt II; Syntakt | Sampling and/or synthesis with external MIDI sequencing; trig buttons and track-dependent encoder assignments remain unbound |
| [Waldorf](https://waldorfmusic.com/) | Blofeld Desktop; Streichfett | Separate hardware module profiles; Blofeld Desktop has DIN MIDI input, with MIDI output available over USB rather than a DIN output socket |
| [Dreadbox](https://dreadbox-fx.com/) | Typhon; Nymphes | Typhon has selected CC mappings from the firmware 4.2 chart and USB routing setup; Nymphes records polyphonic synthesis and expressive MIDI setup without assumed slider assignments |
| [Polyend](https://polyend.com/) | Play+; Tracker Mini | Model-specific sequencing and MIDI setup; grid and context-sensitive screen controls remain unbound; manuals and firmware are linked through model download pages |
| [Sonicware](https://sonicware.jp/) | LIVEN XFM; LIVEN Lofi-12 | Distinct FM and sampler engines with four-track sequencers; 27-key button keyboards, DIN MIDI and sync sockets; no USB MIDI socket |
| [IK Multimedia](https://ikmultimedia.com/products/irigkeys2) | iRig Keys 2; iRig Keys 2 Mini | 37 versus 25 mini keys; only the 37-key model has wheels and a pedal input; both use 2.5 mm TRS MIDI adapters and configurable knob banks |

Exact browser port aliases have not been verified for these additions, so select profiles manually. The new surfaces carry no guessed note assignments. An empty `controls` array documents setup and physical hardware without claiming a complete MIDI map. Typhon's mapped analog voice controls are the exception: its global hardware Volume knob remains unbound because CC7 adjusts preset volume rather than that global control.

## CME keyboards and MIDI interfaces

CME adds **10 profiles**, bringing the catalogue to **140 devices from 34 manufacturers**. Each includes manufacturer artwork, setup references and panel, labelled interface and connection schematics.

| Family | Devices | Coverage and distinctions |
| --- | --- | --- |
| [Original Xkey](https://xkeyair.com/xkey-specs/) | Xkey 25; Xkey 37 | USB keyboards with polyphonic aftertouch; Xkey 37 adds DIN output and pedal inputs through Xcable |
| [Xkey Air](https://xkeyair.com/xkey-air-specs/) | Xkey Air 25; Xkey Air 37 | USB and BLE MIDI keyboards; establish OS MIDI routing before browser detection |
| [WIDI](https://www.cme-pro.com/widi-which-device-will-you-connect/) | Master; Jack; Uhost; Bud Pro | DIN, cable-adaptable TRS, USB host/client and USB dongle variants; power requirements differ by model |
| [USB MIDI](https://www.cme-pro.com/support-product/midi/) | U6MIDI Pro; H4MIDI WC | Three versus two DIN input/output pairs; H4MIDI WC adds USB hosting and optional WIDI Core expansion |

Select these profiles manually: exact browser port aliases have not been verified. Keyboard keys and configurable performance buttons remain unbound, and polyphonic aftertouch is recorded as a hardware capability without a per-key pressure map. Transport profiles have empty control maps; select the connected instrument's profile for its messages. WIDI Master requires power from an instrument MIDI OUT. WIDI Jack's USB-C socket is for power; U6MIDI Pro's USB-C is a client port. H4MIDI WC requires an optional WIDI Core module for Bluetooth. These entries do not cover every historical CME keyboard or every WIDI model.

## Yamaha keyboards and SEQTRAK

This expansion adds **13 Yamaha profiles**, bringing Yamaha to **15 devices** and the catalogue to **153 devices from 34 manufacturers**. The existing DX7 and reface CS profiles remain available.

| Family | Added models | Coverage and distinctions |
| --- | --- | --- |
| [reface](https://usa.yamaha.com/musical-instruments/keyboards/products/synthesizers/reface/) | DX; CP; YC | FM, electric piano and organ models with 37 mini keys; MIDI uses USB or the supplied mini-DIN breakout. DX/CP have sustain inputs; YC has a foot-controller input. Their surfaces do not inherit CS CC mappings. |
| [MONTAGE M](https://usa.yamaha.com/musical-instruments/keyboards/products/synthesizers/montagem/specs.html) | M6; M7; M8x | 61/76/88 keys; M6/M7 have channel aftertouch, M8x has polyphonic aftertouch. Eight control sliders and knobs, ribbon and Super Knob are illustrated. |
| [MODX+](https://data.yamaha.com/files/download/other_assets/3/1583913/VFC6440_modx_plus_owners_manual_En_B0.pdf) | MODX6+; MODX7+; MODX8+ | 61/76/88 keys; four physical control sliders select different Part banks. These profiles describe MODX+, separately from original MODX and MODX M. |
| [CK](https://usa.yamaha.com/musical-instruments/keyboards/products/stagekeyboards/ck/index.html) | CK61; CK76; CK88 | FSB action on CK61/76, GHS weighted action on CK88; nine organ drawbars, three Part levels and four-zone MIDI master setup. Bluetooth audio does not imply BLE MIDI. |
| [SEQTRAK](https://manual.yamaha.com/mi/de/seqtrak/en/SEQTRAK_user_guide_En_D0_002.html) | SEQTRAK | USB-C, BLE MIDI and the included MIDI conversion cable; 16 step keys, seven Synth keys and track-dependent sound controls. |

Every addition includes manufacturer references and three schematic diagrams. Exact browser port aliases have not been verified, so select these profiles manually. Control maps and key bindings remain empty: Performance Parts, Live Sets, scale/octave settings, MIDI channels and assignment modes affect their messages. MONTAGE M MIDI 2.0 resolution is not represented by this profile format; use a compatible MIDI 1.0 setup. Read the linked manual before choosing USB routing, Local Control and clock settings. This is selected model coverage rather than an exhaustive Yamaha catalogue.

## Expanded manufacturer and controller coverage

This batch adds **12 devices**, including **five new manufacturers**, bringing the catalogue to **165 devices from 39 manufacturers**. Each new manufacturer has a descriptor, website links and source-attributed artwork. Every new device includes panel, labelled interface and connection schematics.

| Manufacturer | Added devices | Coverage and distinctions |
| --- | --- | --- |
| [Casio](https://www.casio.com/intl/electronic-musical-instruments/product.CT-S500/) | CT-S500; CT-S1000V | 61-key USB MIDI keyboards; CT-S1000V adds vocal synthesis. Wireless MIDI requires the WU-BT10 accessory; neither keyboard has DIN MIDI sockets. |
| [Studiologic](https://www.studiologic-music.com/products/sl_keyboards/specs/) | SL73 Studio; SL88 Studio; SL88 Grand | Original SL family with aftertouch, four zones and three programmable sticks. Studio uses TP/100LR action; Grand uses TP/40WOOD. These are separate from SL MK2. |
| [OXI Instruments](https://docs.oxiinstruments.com/oxi-one-mkii-manual/overview/) | ONE MKII | 128-pad sequencer with TRS type-A MIDI, USB host/device modes, BLE MIDI and CV/gate. PIPE is a proprietary expansion connection. |
| [Torso Electronics](https://torsoelectronics.com/) | T1; S4 | Algorithmic sequencer and sculpting sampler respectively; both use TRS type-A MIDI. S4 display macros do not represent physical sliders. |
| [Faderfox](https://faderfox.de/) | EC4; UC4 | 16-encoder and mixed encoder/fader controllers with editable setups. EC4 uses TRS type B; check adapter wiring and encoder mode before connecting. |
| [Novation](https://userguides.novationmusic.com/hc/en-gb/articles/27840433609362-MIDI-on-Launch-Control-XL-3) | Launch Control XL 3 | 24 encoders, eight faders and DIN routing; Custom Modes and DAW integration use different USB interfaces. |
| [Arturia](https://www.arturia.com/products/hybrid-synths/beatstep-pro/overview) | BeatStep Pro | Two melodic sequencers, drum sequencing and Control Mode; MIDI and clock use the supplied adapters. |

These are partial hardware/setup profiles. Exact browser port aliases have not been verified, so manual profile selection is required. Controls and key/pad surfaces have no fixed MIDI bindings because setups, projects, channels and modes determine their messages. Schematics group selected controls by function and are not scaled socket-placement drawings. External analog CV, gates, sync and audio connections are inventoried separately from MIDI capability.

## Connecting older hardware

The Superlative SB01, Roland V-STAGE 76/88 and Korg ARP 2600 FS profiles incorporate individual control and connection inventories from [NYU SynthAccess tactile guides](https://github.com/IDMNYU/synthaccess/tree/main/tactileSynthGuides), cross-checked against the manufacturers' manuals. The SB01 and ARP 2600 FS entries explicitly distinguish their MIDI-equipped hardware from the original SH-101 and ARP 2600. The System-100 and Serge guides are not independent MIDI device entries. Analog panel controls are recorded as physical controls without guessed CC assignments.

Connect hardware MIDI OUT to the interface MIDI IN to receive a performance. Connect interface MIDI OUT to hardware MIDI IN to play the hardware. Select matching MIDI channels; use each manual's receive filters and sync settings where applicable. MIDI cables do not carry audio, so a synthesizer's audio outputs still need an audio connection.

DIN-connected hardware normally appears under the interface's name. These new legacy profiles therefore leave `portNames` empty rather than claiming generic interface aliases. Let the user select the profile for the port manually. App-mediated accessible devices likewise need the correct software routing before a MIDI application can receive their output.

Do not assume that an instrument has MIDI because a later reissue or aftermarket retrofit does. Original pre-MIDI hardware and retrofit-specific implementations need separate, verified profiles. Likewise, do not substitute a Boutique reissue's CC chart for its vintage counterpart.

## Official MIDI manufacturer directory

The [official MIDI Association SysEx ID table](https://midi.org/sysexidtable), retrieved on 19 November 2026, supplies **787 unique named assignments**. Importing the remaining companies adds **756 manufacturer records**. Together with existing entries, the directory has **795 manufacturers**, while detailed hardware coverage remains **165 devices from 39 manufacturers**. The official list includes historical and software companies as well as instrument makers. Registration alone does not establish present trading status, website ownership, a hardware product range or support availability.

Every named assignment is linked to a manufacturer descriptor. Repeated source rows are deduplicated; companies with several assigned IDs retain them all. The single `00` extension marker and reserved entries are recorded separately and do not create manufacturers. A few name variants that normalise to the same company slug share a descriptor and preserve both official names. Companies without a verified match to an existing brand remain separate, rather than inheriting an assumed parent company's ID.

Registry-only pages expose official names, assigned hex IDs and a source link, with no invented devices, logos or company website addresses. Existing company details and device profiles are retained. The manufacturer selector and JSON/XML API include entries with no devices. The source snapshot is in `devices/midi-manufacturers.json`; update and validation instructions are in the [contribution guide](profiles.md#official-manufacturer-ids).
