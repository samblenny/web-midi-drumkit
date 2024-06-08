/* SPDX-License-Identifier: MIT */
/* SPDX-FileCopyrightText: Copyright 2024 Sam Blenny */
"use strict";

// MIDI Input connection status span
const MIDI_IN = document.querySelector('#midi-in');

// Play button
const MUTE_BTN = document.querySelector('#unmute');

// Drum pad SVG elements
const KICK = document.querySelector('#kick').classList;
const SNARE = document.querySelector('#snare').classList;
const TOM1 = document.querySelector('#tom1').classList;
const TOM2 = document.querySelector('#tom2').classList;
const TOM3 = document.querySelector('#tom3').classList;
const HIHAT = document.querySelector('#hihat').classList;
const CRASH = document.querySelector('#crash').classList;
const RIDE = document.querySelector('#ride').classList;

// Channel activity indicators
const CHAN_ACTIVITY = [
    document.querySelector('#ch01').classList,
    document.querySelector('#ch02').classList,
    document.querySelector('#ch03').classList,
    document.querySelector('#ch04').classList,
    document.querySelector('#ch05').classList,
    document.querySelector('#ch06').classList,
    document.querySelector('#ch07').classList,
    document.querySelector('#ch08').classList,
    document.querySelector('#ch09').classList,
    document.querySelector('#ch10').classList,
    document.querySelector('#ch11').classList,
    document.querySelector('#ch12').classList,
    document.querySelector('#ch13').classList,
    document.querySelector('#ch14').classList,
    document.querySelector('#ch15').classList,
    document.querySelector('#ch16').classList,
];
const CHAN_COUNT = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

// Drum sample AudioBufferSourceNodes for active samples
const PLAYERS = {
    kick: null,
    snare: null,
    tom1: null,
    tom2: null,
    tom3: null,
    hiClosed: null,
    hiOpen: null,
    ride: null,
    crash: null,
};

// Audio context needs to be enabled in a handler for a user interaction event,
// so for now, just use null to indicate that audio isn't ready yet. Use the
// same approach for drum hit sample buffers.
const AUDIO = {
    ctx: null, kick: null, snare: null, tom1: null, tom2: null, tom3: null,
    hiOpen: null, hiClosed: null, crash: null, ride: null,
    warningCounter: 0,
};

// Set up audio (this must be called from a user interaction event handler)
function initAudioSystem() {
    AUDIO.ctx = new (window.AudioContext || window.webkitAudioContext)();
    AUDIO.ctx.resume().then(() => {
        MUTE_BTN.classList.add('mute');
        MUTE_BTN.textContent = 'mute';
        console.log('audio playback enabled');
    });
}

// Add audio playback enable function to the play button
MUTE_BTN.addEventListener('click', function() {
    if(MUTE_BTN.classList.contains('mute')) {
        // Audio was active, so mute audio and release the old audio context
        // to be garbage collected. This makes sure that drum samples currently
        // playing will just stop rather than resuming when audio gets unmuted
        // again later.
        AUDIO.ctx.suspend().then(() => {
            MUTE_BTN.classList.remove('mute');
            MUTE_BTN.textContent = 'Unmute Sound';
            AUDIO.ctx = null;
            console.log('audio playback suspended');
        });
    } else {
        // Audio was muted, so initialize an context to enable playing audio
        initAudioSystem();
    }
});

function stopSample(tag) {
    // Stop a playing sample
    if(PLAYERS[tag]) {
        PLAYERS[tag].stop();
        PLAYERS[tag] = null;
    }
}

// Play a sound given the tag for a drum sample buffer.
function fetchAndPlay(path, tag) {
    if(AUDIO.ctx === null) {
        // Audio is muted, so we can't play sounds right now
        if(AUDIO.warningCounter < 1) {
            console.log("To play sound, you need to click the unmute button");
            AUDIO.warningCounter += 1;
        }
        return
    }
    // Audio is unmuted, so play the sample
    fetch(path).then((response) => {
        response.arrayBuffer().then((buf) => {
            AUDIO.ctx.decodeAudioData(buf, (b) => {
                const s = AUDIO.ctx.createBufferSource();
                s.buffer = b;
                s.connect(AUDIO.ctx.destination);
                s.start();
                // Retrigger if needed, then save the AudioBufferSourceNode
                stopSample(tag);
                PLAYERS[tag] = s;
            });
        });
    });
}

function setStatus(midiInputNames) {
    // Update the <span id="midi-in">...</span> with list of MIDI input names
    if(midiInputNames.length > 0) {
        MIDI_IN.textContent = midiInputNames.join(", ");
    } else {
        MIDI_IN.textContent = "[no connection]";
    }
}

function noteOn(note, velocity) {
    switch(note) {
    case 51:  // D#3 ride cymbal
        fetchAndPlay("samples/drum_cymbal_soft.flac", 'ride');
        RIDE.add("on");
        break;
    case 49:  // C#3 crash cymbal
        // not a real crash... /shrug
        fetchAndPlay("samples/drum_splash_soft.flac", 'crash');
        CRASH.add("on");
        break;
    case 48:  // C3 tom1 (high)
        fetchAndPlay("samples/drum_tom_hi_hard.flac", 'tom1');
        TOM1.add("on");
        break;
    case 46:  // A#2 hi-hat open
        fetchAndPlay("samples/drum_cymbal_open.flac", 'hiOpen');
        HIHAT.add("on");
        break;
    case 45:  // A2 tom2 (low)
        fetchAndPlay("samples/drum_tom_mid_hard.flac", 'tom2');
        TOM2.add("on");
        break;
    case 43:  // G2 tom3 (floor)
        fetchAndPlay("samples/drum_tom_lo_hard.flac", 'tom3');
        TOM3.add("on");
        break;
    case 42:  // F#2 hi-hat closed
        fetchAndPlay("samples/drum_cymbal_closed.flac", 'hiClosed');
        HIHAT.add("on");
        break;
    case 38:  // D2 snare
        fetchAndPlay("samples/drum_snare_hard.flac", 'snare');
        SNARE.add("on");
        break;
    case 36:  // C2 kick
        fetchAndPlay("samples/drum_heavy_kick.flac", 'kick');
        KICK.add("on");
        break;
    }
}

function noteOff(note) {
    switch(note) {
    case 51:  // D#3 ride cymbal
        RIDE.remove("on");
        break;
    case 49:  // C#3 crash cymbal
        CRASH.remove("on");
        break;
    case 48:  // C3 tom1 (high)
        TOM1.remove("on");
        break;
    case 46:  // A#2 hi-hat open
        HIHAT.remove("on");
        break;
    case 45:  // A2 tom2 (low)
        TOM2.remove("on");
        break;
    case 43:  // G2 tom3 (floor)
        TOM3.remove("on");
        break;
    case 42:  // F#2 hi-hat closed
        HIHAT.remove("on");
        break;
    case 38:  // D2 snare
        SNARE.remove("on");
        break;
    case 36:  // C2 kick
        KICK.remove("on");
        break;
    }
}

function allOffPanic() {
    // Clear drum pads
    for (const note in [51, 49, 48, 46, 45, 43, 42, 38, 36]) {
        noteOff(note);
    }
    // Clear channel activity indicators
    for (let i = 0; i < 16; i++) {
        CHAN_COUNT[i] = 0;
        CHAN_ACTIVITY[i].remove("on");
    }
}

function cc(control, data) {
    // Handle CC messages
    switch(control) {
    case 123:  // All-Off / Panic (triple-tap stop button on Arturia KeyStep)
        allOffPanic();
        break;
    }
}

function max(a, b) { return (a > b) ? a : b; }

function channelActivity(chan, on) {
    if(chan < 0 || chan > 15) {
        log.error("channel out of range", chan);
        return;
    }
    // Maintain a tally of currently active notes
    const prev = CHAN_COUNT[chan];
    let curr = max(0, prev + (on ? 1 : -1));
    CHAN_COUNT[chan] = curr;
    // Update activity indicator only when count crosses between 0 and 1
    if((prev == 0) || (curr == 0)) {
        if(curr > 0) {
            CHAN_ACTIVITY[chan].add("on");
        } else {
            CHAN_ACTIVITY[chan].remove("on");
        }
    }
}

function midiMsg(msg) {
    // Respond to an incoming MIDI message (an array of raw MIDI bytes)
    if(msg.data.length !== 3) {
        return;
    }
    const status = msg.data[0];
    const op = status & 0xf0;
    const chan = status & 0x0f;
    const data1 = msg.data[1];
    const data2 = msg.data[2];
    // Handle channel 10 note-on, note-off, and CC messages
    switch(status) {
    case 0x89:               // Note OFF | channel 10
        noteOff(data1);      // ignore velocity
        break;
    case 0x99:               // Note ON | channel 10
        if(data2 == 0) {
            noteOff(data1);  // remap on @ velocity 0 to note-off
        } else {
            noteOn(data1, data2);
        }
        break;
    case 0xb9:               // CC | channel 10
        cc(data1, data2);
        break;
    }
    // Update note-on/off activity indicators for all channels
    switch(op) {
    case 0x80:
        channelActivity(chan, false);
        break;
    case 0x90:
        channelActivity(chan, true);
        break;
    }
}

function stateChange(midiConnectionEvent) {
    // When MIDI connections change, update the list of MIDI input devices
    updateInputs(midiConnectionEvent.currentTarget);
}

function updateInputs(midiAccess) {
    // Start listening to all the MIDI inputs and make a list of their names
    const names = [];
    midiAccess.inputs.forEach((i) => {
        i.onmidimessage = midiMsg;
        names.push(i.name);
    });
    // Update the MIDI input connection status line to show MIDI input names
    setStatus(names);
}

function midiOK(midiAccess) {
    // MIDI access granted, so now prepare to set up input devices and watch
    // for MIDI device hotplug events.
    updateInputs(midiAccess);
    midiAccess.onstatechange = stateChange;
}

function midiFail(obj) {
    // MIDI access permission was denied, or perhaps some other problem
    console.error("midiFail", obj);
}

// Start the process of getting access to MIDI devices.
// This should trigger a browser permission authorization dialog box.
navigator.requestMIDIAccess().then(midiOK, midiFail);
