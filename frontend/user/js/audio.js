/**
 * Web Audio API Sound Synthesizer for Ganesha Virtual Temple
 * Synthesizes realistic temple bell harmonics, conch (shankh) resonance, and Om drone.
 */

class TempleAudioEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.bgChantPlaying = false;
        this.synthDroneOsc = null;
        this.synthDroneGain = null;
        this.currentChantIndex = 0;
        
        this.chants = [
            {
                title: "Om Gam Ganapataye Namaha",
                artist: "Traditional Chant",
                shloka: "ॐ गं गणपतये नमः"
            },
            {
                title: "Vakratunda Mahakaya",
                artist: "Ganesh Stotram",
                shloka: "वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ। निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥"
            },
            {
                title: "Sukh Karta Dukh Harta (Aarati)",
                artist: "Traditional Aarati",
                shloka: "सुखकर्ता दुखहर्ता वार्ता विघनाची। नुरवी पुरवी प्रेम कृपा जयाची॥"
            },
            {
                title: "Ganesh Gayatri Mantra",
                artist: "Vedic Chants",
                shloka: "ॐ एकदन्ताय विद्महे वक्रतुण्डाय धीमहि तन्नो दन्तिः प्रचोदयात्॥"
            }
        ];

        this.audioElement = new Audio();
        this.audioElement.loop = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Synthesizes a multi-toned temple bell chime with exponential decay harmonics
     */
    playTempleBell() {
        this.init();
        if (this.isMuted) return;

        const now = this.ctx.currentTime;
        
        // Bell fundamental and harmonic frequencies (Hz)
        const freqs = [440, 880, 1230, 1740, 2400, 3100];
        const gains = [0.6, 0.4, 0.25, 0.15, 0.1, 0.05];

        const masterGain = this.ctx.createGain();
        masterGain.gain.setValueAtTime(0.5, now);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
        masterGain.connect(this.ctx.destination);

        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.998, now + 3.5);

            g.gain.setValueAtTime(gains[idx], now);
            g.gain.exponentialRampToValueAtTime(0.0001, now + (3.0 - idx * 0.3));

            osc.connect(g);
            g.connect(masterGain);

            osc.start(now);
            osc.stop(now + 3.5);
        });
    }

    /**
     * Synthesizes a deep resonant Shankh (Conch Shell) horn sound
     */
    playShankh() {
        this.init();
        if (this.isMuted) return;

        const now = this.ctx.currentTime;
        const duration = 4.0;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const masterGain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(140, now);
        osc1.frequency.linearRampToValueAtTime(220, now + 1.2);
        osc1.frequency.setValueAtTime(220, now + 2.8);
        osc1.frequency.exponentialRampToValueAtTime(130, now + duration);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(280, now);
        osc2.frequency.linearRampToValueAtTime(440, now + 1.2);
        osc2.frequency.setValueAtTime(440, now + 2.8);
        osc2.frequency.exponentialRampToValueAtTime(260, now + duration);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.linearRampToValueAtTime(1200, now + 1.2);
        filter.frequency.exponentialRampToValueAtTime(300, now + duration);
        filter.Q.setValueAtTime(5, now);

        masterGain.gain.setValueAtTime(0.001, now);
        masterGain.gain.linearRampToValueAtTime(0.7, now + 1.0);
        masterGain.gain.setValueAtTime(0.7, now + 2.8);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(masterGain);
        masterGain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }

    /**
     * Synthesizes ambient continuous Om Tanpura Drone
     */
    toggleOmDrone(enable) {
        this.init();
        const now = this.ctx.currentTime;

        if (enable) {
            if (this.synthDroneOsc) return;

            this.synthDroneGain = this.ctx.createGain();
            this.synthDroneGain.gain.setValueAtTime(0.001, now);
            this.synthDroneGain.gain.linearRampToValueAtTime(0.18, now + 2.0);

            const pitches = [136.1, 204.15, 272.2, 408.3];
            this.droneNodes = [];

            pitches.forEach((freq) => {
                const osc = this.ctx.createOscillator();
                const filter = this.ctx.createBiquadFilter();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(600, now);

                osc.connect(filter);
                filter.connect(this.synthDroneGain);
                osc.start(now);
                this.droneNodes.push(osc);
            });

            this.synthDroneGain.connect(this.ctx.destination);
            this.synthDroneOsc = true;
        } else {
            if (this.synthDroneGain) {
                this.synthDroneGain.gain.linearRampToValueAtTime(0.0001, now + 1.0);
                setTimeout(() => {
                    if (this.droneNodes) {
                        this.droneNodes.forEach(n => { try { n.stop(); } catch(e){} });
                        this.droneNodes = [];
                    }
                    this.synthDroneOsc = null;
                    this.synthDroneGain = null;
                }, 1000);
            }
        }
    }

    /**
     * Plays or pauses background chant music with speech synth fallback
     */
    toggleChant(index = null) {
        if (index !== null) {
            this.currentChantIndex = index;
        }
        
        const chant = this.chants[this.currentChantIndex];

        if (this.bgChantPlaying && index === null) {
            this.bgChantPlaying = false;
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            return false;
        }

        this.init();
        this.bgChantPlaying = true;

        this.speakChant(chant.shloka);
        return true;
    }

    speakChant(text) {
        if (!('speechSynthesis' in window) || !this.bgChantPlaying) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        utterance.pitch = 0.95;
        
        const voices = window.speechSynthesis.getVoices();
        const hiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('sa') || v.lang.includes('IN'));
        if (hiVoice) {
            utterance.voice = hiVoice;
        }

        utterance.onend = () => {
            if (this.bgChantPlaying) {
                setTimeout(() => this.speakChant(text), 1500);
            }
        };

        window.speechSynthesis.speak(utterance);
    }
}

window.templeAudio = new TempleAudioEngine();
