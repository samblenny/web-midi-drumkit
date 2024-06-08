/* SPDX-License-Identifier: MIT */
/* SPDX-FileCopyrightText: Copyright 2024 Sam Blenny */
"use strict";

// MIDI Input connection status span
const MIDI_IN = document.querySelector('#midi-in');

// Play button
const MUTE_BTN = document.querySelector('#unmute');

// Drum pad SVG elements
const SVG = {
    kick: document.querySelector('#kick'),
    snare: document.querySelector('#snare'),
    tom1: document.querySelector('#tom1'),
    tom2: document.querySelector('#tom2'),
    tom3: document.querySelector('#tom3'),
    hihat: document.querySelector('#hihat'),
    crash: document.querySelector('#crash'),
    ride: document.querySelector('#ride'),
};

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

// Mapping of drum tags to flac sample files
// If you want to change the samples, edit these paths.
const FLAC = {
    ride: 'samples/drum_cymbal_soft.flac',
    crash: 'samples/drum_splash_soft.flac',
    tom1: 'samples/drum_tom_hi_hard.flac',
    hiOpen: 'samples/drum_cymbal_open.flac',
    tom2: 'samples/drum_tom_mid_hard.flac',
    tom3: 'samples/drum_tom_lo_hard.flac',
    hiClosed: 'samples/drum_cymbal_closed.flac',
    snare: 'samples/drum_snare_hard.flac',
    kick: 'samples/drum_heavy_kick.flac',
};

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

// Preload .flac files for drum samples and convert them to AudioBuffers
function fetchFlacSamples() {
    for (let tag in FLAC) {
        fetch(FLAC[tag]).then((response) => {
            response.arrayBuffer().then((buf) => {
                AUDIO[tag] = buf;
            });
        });
    }
}

// Set up audio (this must be called from a user interaction event handler)
function initAudioSystem() {
    AUDIO.ctx = new (window.AudioContext || window.webkitAudioContext)();
    AUDIO.ctx.resume().then(() => {
        MUTE_BTN.classList.add('mute');
        MUTE_BTN.textContent = 'mute';
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
function triggerFlac(tag) {
    if(!AUDIO.ctx) {
        // Audio is muted, so we can't play sounds right now
        if(AUDIO.warningCounter < 1) {
            console.log("To play sound, you need to click the unmute button");
            AUDIO.warningCounter += 1;
        }
        return
    }
    // Audio is unmuted, so play the sample. Note that decodeAudioData() will
    // take ownership of ("detach") its ArrayBuffer argument, preventing it
    // from being reused. So, to avoid the latency of having to fetch the .flac
    // file again, copy the buffer first with slice(), then decode the copy.
    // See https://github.com/WebAudio/web-audio-api/issues/1175
    if(AUDIO[tag]) {
        const buf = (AUDIO[tag]).slice();
        AUDIO.ctx.decodeAudioData(buf, (b) => {
            const s = AUDIO.ctx.createBufferSource();
            s.buffer = b;
            s.connect(AUDIO.ctx.destination);
            s.start();
            // Retrigger if needed, then save the AudioBufferSourceNode
            stopSample(tag);
            PLAYERS[tag] = s;
        });
    } else {
        // This might happen on slow network connections
        console.log('hmm... unexpectedly, sample data is not loaded for', tag);
    }
}

// Update the <span id="midi-in">...</span> with list of MIDI input names
function setStatus(midiInputNames) {
    if(midiInputNames.length > 0) {
        MIDI_IN.textContent = midiInputNames.join(", ");
    } else {
        MIDI_IN.textContent = "[no connection]";
    }
}

// Add event handlers to trigger drums by clicking on SVG drum pad paths
function configureMouseEvents() {
    const noteMap = {
        kick: 36,
        snare: 38,
        tom1: 48,
        tom2: 45,
        tom3: 43,
        hihat: 42, // closed hi-hat
        crash: 49,
        ride: 51,
    }
    // Add mouse event to note-trigger event translators
    for (const tag in noteMap) {
        const note = noteMap[tag];
        SVG[tag].onmouseenter = (e) => {  // drag into path with left-button
            if(e.buttons == 1) {
                noteOn(note);
                e.preventDefault();
            }
        };
        SVG[tag].onmouseleave = (e) => {  // drag out of path with left-button
            if(e.buttons == 1) {
                noteOff(note);
                e.preventDefault();
            }
        };
        SVG[tag].onmousedown = (e) => {   // click while inside path
            noteOn(note);
            e.preventDefault();
        };
        SVG[tag].onmouseup = (e) => {     // release button while inside path
            noteOff(note);
            e.preventDefault();
        };
    }
}

// Handle MIDI note-on message
function noteOn(note) {
    switch(note) {
    case 51:  // D#3 ride cymbal
        triggerFlac('ride');
        SVG.ride.classList.add("on");
        break;
    case 49:  // C#3 crash cymbal
        // not a real crash... /shrug
        triggerFlac('crash');
        SVG.crash.classList.add("on");
        break;
    case 48:  // C3 tom1 (high)
        triggerFlac('tom1');
        SVG.tom1.classList.add("on");
        break;
    case 46:  // A#2 hi-hat open
        triggerFlac('hiOpen');
        SVG.hihat.classList.add("on");
        break;
    case 45:  // A2 tom2 (low)
        triggerFlac('tom2');
        SVG.tom2.classList.add("on");
        break;
    case 43:  // G2 tom3 (floor)
        triggerFlac('tom3');
        SVG.tom3.classList.add("on");
        break;
    case 42:  // F#2 hi-hat closed
        triggerFlac('hiClosed');
        SVG.hihat.classList.add("on");
        break;
    case 38:  // D2 snare
        triggerFlac('snare');
        SVG.snare.classList.add("on");
        break;
    case 36:  // C2 kick
        triggerFlac('kick');
        SVG.kick.classList.add("on");
        break;
    }
}

// Handle MIDI note-off message
function noteOff(note) {
    switch(note) {
    case 51:  // D#3 ride cymbal
        SVG.ride.classList.remove("on");
        break;
    case 49:  // C#3 crash cymbal
        SVG.crash.classList.remove("on");
        break;
    case 48:  // C3 tom1 (high)
        SVG.tom1.classList.remove("on");
        break;
    case 46:  // A#2 hi-hat open
        SVG.hihat.classList.remove("on");
        break;
    case 45:  // A2 tom2 (low)
        SVG.tom2.classList.remove("on");
        break;
    case 43:  // G2 tom3 (floor)
        SVG.tom3.classList.remove("on");
        break;
    case 42:  // F#2 hi-hat closed
        SVG.hihat.classList.remove("on");
        break;
    case 38:  // D2 snare
        SVG.snare.classList.remove("on");
        break;
    case 36:  // C2 kick
        SVG.kick.classList.remove("on");
        break;
    }
}

// Handle MIDI CC 123 all-off / panic message
function allOffPanic() {
    // Stop sounds
    for (const tag in PLAYERS) {
        stopSample(tag)
    }
    // Clear drum pads
    for (const tag in SVG) {
        SVG[tag].classList.remove('on');
    }
    // Clear channel activity indicators
    for (let i = 0; i < 16; i++) {
        CHAN_COUNT[i] = 0;
        CHAN_ACTIVITY[i].remove("on");
    }
}

// Handle MIDI CC messages
function cc(control, data) {
    switch(control) {
    case 123:  // All-Off / Panic (triple-tap stop button on Arturia KeyStep)
        allOffPanic();
        break;
    }
}

function max(a, b) { return (a > b) ? a : b; }

// Update MIDI channel activity UI indicators
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

// Respond to an incoming MIDI message (an array of raw MIDI bytes)
function midiMsg(msg) {
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
            noteOn(data1);   // ignore velocity (data2)
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

// When MIDI connections change, update the list of MIDI input devices
function stateChange(midiConnectionEvent) {
    updateInputs(midiConnectionEvent.currentTarget);
}

// Start listening to all the MIDI inputs and make a list of their names
function updateInputs(midiAccess) {
    const names = [];
    midiAccess.inputs.forEach((i) => {
        i.onmidimessage = midiMsg;
        names.push(i.name);
    });
    // Update the MIDI input connection status line to show MIDI input names
    setStatus(names);
}

// MIDI access granted, so now prepare to set up input devices and watch
// for MIDI device hotplug events.
function midiOK(midiAccess) {
    updateInputs(midiAccess);
    midiAccess.onstatechange = stateChange;
}

// MIDI access permission was denied, or perhaps some other problem
function midiFail(obj) {
    console.error("midiFail", obj);
}

// Start the process of getting access to MIDI devices.
// This should trigger a browser permission authorization dialog box.
navigator.requestMIDIAccess().then(midiOK, midiFail);

// Load FLAC sample files
fetchFlacSamples();

// Attach mouse event handlers
configureMouseEvents();
