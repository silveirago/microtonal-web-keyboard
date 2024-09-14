// Create an audio context
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// Volume control and mode variables
let volume = parseFloat(document.getElementById('volume').value);
let mode = 'mono';

// Store active oscillators for chord mode
let activeOscillators = {};

// Function to calculate frequencies based on EDO (EDO + 1 keys, last key is the octave)
function calculateFrequencies(baseFreq, edo) {
    let frequencies = [];
    for (let i = 0; i <= edo; i++) {
        let freq = baseFreq * Math.pow(2, i / edo);  // Calculate frequency for each key
        frequencies.push(freq);
    }
    return frequencies;
}

// Function to update the keyboard based on EDO
function updateKeyboard() {
    killAllNotes(); // Stop all notes and reset all keys when the keyboard is updated (EDO changes)

    const keyboard = document.getElementById('keyboard');
    const edo = parseInt(document.getElementById('edo').value);  // Get the selected EDO
    const baseFreq = 261.63;  // C4 frequency

    keyboard.innerHTML = '';  // Clear the existing keyboard
    const frequencies = calculateFrequencies(baseFreq, edo);  // Generate frequencies for the EDO + 1

    frequencies.forEach((freq, index) => {
        // Create key containers with labels
        const keyContainer = document.createElement('div');
        keyContainer.className = 'key-container';

        const label = document.createElement('div');
        label.className = 'key-label';
        label.innerText = index;

        const key = document.createElement('div');
        key.className = 'key white';
        key.dataset.freq = freq;

        keyContainer.appendChild(label);
        keyContainer.appendChild(key);
        keyboard.appendChild(keyContainer);

        // Add event listener to play the note on mousedown
        key.addEventListener('mousedown', () => {
            if (mode === 'mono') {
                if (window.currentOscillator) {
                    stopNote(window.currentOscillator);
                }
                window.currentOscillator = playNote(freq);
            } else {
                if (key.classList.contains('toggled')) {
                    key.classList.remove('toggled');
                    stopNote(activeOscillators[freq]);
                    delete activeOscillators[freq];
                    normalizeVolume();
                } else {
                    key.classList.add('toggled');
                    activeOscillators[freq] = playNote(freq);
                    normalizeVolume();
                }
            }
        });

        // Stop the note when the mouse is released (mouseup)
        key.addEventListener('mouseup', () => {
            if (mode === 'mono' && window.currentOscillator) {
                stopNote(window.currentOscillator);
                window.currentOscillator = null;
            }
        });
    });
}

// Function to normalize volume based on the number of active notes
function normalizeVolume() {
    const activeCount = Object.keys(activeOscillators).length;
    const adjustedVolume = activeCount > 0 ? volume / activeCount : volume;
    
    Object.keys(activeOscillators).forEach(freq => {
        activeOscillators[freq].gainNode.gain.setValueAtTime(adjustedVolume, audioCtx.currentTime);
    });
}

// Function to play a note
function playNote(freq) {
    const oscillator = audioCtx.createOscillator();
    oscillator.frequency.value = freq;
    oscillator.type = 'sine';

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(volume / (Object.keys(activeOscillators).length + 1), audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();

    return { oscillator, gainNode };
}

// Function to stop a note
function stopNote(oscillatorData) {
    oscillatorData.gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    oscillatorData.oscillator.stop(audioCtx.currentTime + 0.5);
}

// Function to kill all active notes and reset keys to white
function killAllNotes() {
    // Stop any currently playing notes
    if (window.currentOscillator) {
        stopNote(window.currentOscillator);
        window.currentOscillator = null;
    }

    // Stop all notes in polyphonic mode
    Object.keys(activeOscillators).forEach(freq => {
        stopNote(activeOscillators[freq]);
    });
    activeOscillators = {};

    // Reset all keys to white (remove toggled class)
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('toggled');
    });
}

// Handle volume control
document.getElementById('volume').addEventListener('input', (e) => {
    volume = parseFloat(e.target.value);
    normalizeVolume();
});

// Mode toggle button
document.getElementById('mode-toggle').addEventListener('click', () => {
    killAllNotes(); // Kill all notes and reset keys when mode is changed

    if (mode === 'mono') {
        mode = 'chord';
        document.getElementById('mode-toggle').textContent = 'Switch to Monophonic Mode';
    } else {
        mode = 'mono';
        document.getElementById('mode-toggle').textContent = 'Switch to Chord Mode';
    }
});

// Update keyboard when the EDO is changed
document.getElementById('edo').addEventListener('input', updateKeyboard);

// Initialize the keyboard
updateKeyboard();
