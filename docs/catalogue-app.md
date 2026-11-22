# Catalogue app

The [catalogue page](https://designerzen.github.io/midi-devices/) lets you browse every profile without hardware. With a device plugged in, it can also identify the device, let you play it from its panel diagram and show its MIDI live. It runs in browsers that support Web MIDI, such as Chrome and Edge. Everything happens in the browser, and nothing is sent to a server.

## Browsing

Search by model or manufacturer, or filter by manufacturer. Each device card shows the panel diagram, abilities, setup notes, documentation links, and links to the profile's JSON, API URL and SVG assets. Each manufacturer has its own page at its folder URL, such as [`roland/`](https://designerzen.github.io/midi-devices/roland/), with company details above its products. Manufacturers that only appear in the official SysEx registry have a page too, showing their IDs and no devices.

## Detecting devices

Click **Detect connected devices** and allow MIDI access. The page shows one card for each device the browser can see, including devices with no profile.

- Recognised devices show their profile. If the guess is wrong, choose another from the card's **Device profile** list. This choice lasts until you reload the page.
- Inputs and outputs are paired by profile, name and manufacturer. Web MIDI does not expose USB hardware IDs, so pairing can't be exact.
- Cards update automatically when you plug in or unplug a device.
- To receive SysEx, tick **Include SysEx** under the detection options, then refresh connections. The browser asks for an additional permission.

## Playing a device from its panel

A recognised device's panel diagram becomes a live control surface. Teal areas are mapped controls.

| To | Do this |
| --- | --- |
| Play a key or pad | Click or tap it, or focus it and press Space or Enter |
| Turn a knob or move a slider | Drag vertically. Hold Shift for fine control, or use the arrow keys, Home and End |
| Change the MIDI channel | Pick the channel the hardware listens on. Controls with their own channel keep it |
| Silence everything | Click **Release notes** |

Incoming notes stay highlighted until their note-off. Incoming CCs and other mapped messages flash amber and update the displayed value. Nothing received is sent back to the device. Each card listens only to its paired input and sends only to its selected output. Controller-only devices show feedback, and output-only devices can only be played.

The page releases any notes it is holding when you cancel a press, switch away, change channel or profile, or the card disappears.

### Learning a mapping

For a configurable or unmapped control, click **Learn mapping**, select the control on the diagram, then press or move it on the hardware. The page records the note, CC, pitch bend, program change or channel pressure message it receives, including its channel. Learned mappings survive refreshing connections and are cleared when you reload the page.

A mapping in a profile does not prove that a physical control sends MIDI. Receive-only instruments, such as stock Korg volcas, cannot report panel movements. Read the profile's setup notes. The page does not query the device's current parameter values.

## Monitoring MIDI

The **Live MIDI messages** panel shows everything the connected inputs send. Choose how to see it with **View**:

- **Channel state** is the default, modelled on [ShowMIDI](https://github.com/gbevin/ShowMIDI). Instead of a list, it shows the current state of every input and channel. Notes appear with velocity and aftertouch bars, and released notes are dimmed. Each CC shows its latest value, alongside program change, channel pressure and pitch bend. Incoming clock shows as a tempo and transport state.
- **Message log** lists the latest 200 messages, newest first, with UTC time, input, decoded message and raw hex bytes.
- **Both** shows the channel state above the log.

**Values** shows numbers as decimal, percent or hex. In decimal, programs are numbered 1 to 128 and pitch bend is centred on 0. **Hide inactive after** removes values that have not changed for 2, 5 or 15 seconds, or never. Held notes always stay. The page remembers these settings in your browser.

## Unknown devices

A card for a device with no profile offers two ways to get one added:

- **Email device details** opens a draft containing everything Web MIDI reports about the ports. Add the model name and send it.
- **Create a device profile with an agent** gives you a prompt to paste into an AI agent. The agent asks for missing details, writes a schema-valid profile with its assets, and emails it, or prepares a draft if it can't send mail.
