<!-- SPDX-License-Identifier: MIT -->
<!-- SPDX-FileCopyrightText: Copyright 2024 Sam Blenny -->
# web-midi-drumkit

A sampled MIDI drumkit synth in the form of a single-page website.

[**CAUTION: this works, but it's very beta (latency is high-ish)**]

You can try demo at:
[samblenny.github.io/web-midi-drumkit/](https://samblenny.github.io/web-midi-drumkit/)

This repository has source code for a web page that uses WebMIDI to listen on
MIDI channel 10, and then plays drum samples in response to incoming notes. The
website source files are static html and javascript. You won't need any build
tools -- just a web server that can serve static files. If you want to use this
locally, perhaps without an internet connection, take a look at the
[server](server) shell script (which depends on python3).

If all goes well, when you load the page and answer the MIDI permissions dialog
box, your MIDI input devices should be automatically detected. But, you will
need to use a WebMIDI-capable browser (Chrome).


## Accessibility

The drum pad and MIDI channel activity indicators use relatively slow CSS
transition-duration times to limit rapid flashing. But, there may still be
kind of a lot of visual activity if you play drums at certain tempos and
patterns. If the amount of flashing is too much, take a look at the
`transition: ...` rules in the `style` element of [index.html](index.html)'s
header.


## MIDI Details

The MIDI receiver expects drum notes to be sent on channel 10.

This table shows the mapping of MIDI note numbers to drum sounds.

| MIDI Note | Note Name | Drum Sound |
| --------- | --------- | ---------- |
| 51 | D#3 | Ride Cymbal |
| 49 | C#3 | Crash Cymbal |
| 48 | C3  | Tom 1 (high) |
| 46 | A#2 | Hi-hat (open) |
| 45 | A2  | Tom 2 (low) |
| 43 | G2  | Tom 3 (floor) |
| 42 | F#2 | Hi-hat (closed) |
| 38 | D2  | Snare |
| 36 | C2  | Kick |

The Drum pads and channel numbers should change brightness to indicate MIDI
activity.

You can use MIDI CC 123 (aka all-stop or panic) to stop all active notes. For
example, with an Arturia KeyStep controller, you can send all-stop by quickly
tapping the stop button three times in a row.


## Licensing of Samples and Source Code

The samples are CC0 (public domain) licensed by way of sonic-pi and
freesound\.org. For details see
[LICENSES/LICENSE_SAMPLES.md](LICENSES/LICENSE_SAMPLES.md) and
[samples/README.md](samples/README.md).

The source code is MIT licensed. See
[LICENSES/LICENSE_MIT](LICENSES/LICENSE_MIT).
