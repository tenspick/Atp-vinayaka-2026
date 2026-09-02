/**
 * Main Application Controller for Vinayaka Chavithi Virtual Temple
 * Controls user interactions, ritual states, modal windows, greeting card generator,
 * and virtual Visarjan simulation.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Particle System
    const particles = new ParticleSystem('mandapCanvas');
    particles.start();

    // State Variables
    let isDiyaLit = false;
    let isAaratiActive = false;
    let flowersCount = 0;
    let isDroneActive = false;

    // Element References
    const ganeshaImg = document.getElementById('ganeshaImg');
    const diyaFlames = document.querySelectorAll('.diya-flame');
    const tilakMark = document.getElementById('tilakMark');
    const flowerLayer = document.getElementById('flowerLayer');
    const aaratiThali = document.getElementById('aaratiThali');
    const bells = document.querySelectorAll('.temple-bell');

    // Modals
    const prasadamModal = document.getElementById('prasadamModal');
    const blessingModal = document.getElementById('blessingModal');
    const greetingModal = document.getElementById('greetingModal');
    const ecoModal = document.getElementById('ecoModal');
    const studioModal = document.getElementById('studioModal');

    // 2. Setup Ritual Button Actions
    
    // Action 1: Light Diya
    document.getElementById('btnLightDiya').addEventListener('click', () => {
        isDiyaLit = !isDiyaLit;
        diyaFlames.forEach(flame => {
            if (isDiyaLit) {
                flame.classList.add('lit');
            } else {
                flame.classList.remove('lit');
            }
        });
        
        if (isDiyaLit) {
            particles.triggerSparkles(window.innerWidth / 2, 300, 20);
            showToast("🪔 Diyas lit! Warm festive light fills the Mandap.");
        } else {
            showToast("Diyas extinguished.");
        }
    });

    // Action 2: Offer Flowers
    document.getElementById('btnOfferFlowers').addEventListener('click', () => {
        particles.triggerFlowerShower(45);
        flowersCount += 3;
        
        // Add physical flowers on altar base
        if (flowersCount <= 18) {
            const flowerSpan = document.createElement('span');
            flowerSpan.className = 'offered-flower';
            flowerSpan.textContent = ['🌺', '🌼', '🌾'][Math.floor(Math.random() * 3)];
            flowerLayer.appendChild(flowerSpan);
        }

        showToast("🌺 Marigold petals & sacred Durva grass offered to Ganesha!");
    });

    // Action 3: Ring Temple Bell
    document.getElementById('btnRingBell').addEventListener('click', () => {
        ringBells();
    });

    bells.forEach(bell => {
        bell.addEventListener('click', () => ringBells());
    });

    function ringBells() {
        bells.forEach(b => {
            b.classList.remove('ringing');
            void b.offsetWidth; // Trigger reflow
            b.classList.add('ringing');
        });
        window.templeAudio.playTempleBell();
        particles.triggerSparkles(window.innerWidth / 2, 100, 15);
        showToast("🔔 Divine temple bell chime resonates!");
    }

    // Action 4: Sound Shankh (Conch)
    document.getElementById('btnSoundShankh').addEventListener('click', () => {
        window.templeAudio.playShankh();
        particles.triggerSparkles(window.innerWidth / 2, 250, 30);
        showToast("🐚 Sacred Shankh sound fills the air with auspicious energy!");
    });

    // Action 5: Perform Aarati
    document.getElementById('btnPerformAarati').addEventListener('click', () => {
        isAaratiActive = !isAaratiActive;
        if (isAaratiActive) {
            aaratiThali.classList.add('active');
            window.templeAudio.toggleChant(2); // Play Aarati chant
            particles.triggerSparkles(window.innerWidth / 2, 300, 40);
            showToast("🪔 Aarati active! Rotating camphor flame thali around Lord Ganesha.");
        } else {
            aaratiThali.classList.remove('active');
            showToast("Aarati completed.");
        }
    });

    // Action 6: Apply Tilak / Kumkum
    document.getElementById('btnApplyTilak').addEventListener('click', () => {
        tilakMark.style.display = 'block';
        particles.triggerSparkles(window.innerWidth / 2, 180, 15);
        showToast("🔴 Sacred Red Kumkum Tilak applied on Lord Ganesha's forehead!");
    });

    // Action 7: Offer Prasadam Modal
    document.getElementById('btnOfferPrasadam').addEventListener('click', () => {
        openModal(prasadamModal);
    });

    document.querySelectorAll('.prasadam-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const name = item.getAttribute('data-name');
            closeModal(prasadamModal);
            particles.triggerFlowerShower(25);
            particles.triggerSparkles(window.innerWidth / 2, 350, 25);
            showToast(`🥟 Offered fresh ${name} to Lord Ganesha with devotion!`);
        });
    });

    // 3. Audio Deck Controls
    const btnPlayAudio = document.getElementById('btnPlayAudio');
    const chantSelect = document.getElementById('chantSelect');
    const btnOmDrone = document.getElementById('btnOmDrone');
    const chantDisc = document.getElementById('chantDisc');

    btnPlayAudio.addEventListener('click', () => {
        const isPlaying = window.templeAudio.toggleChant(parseInt(chantSelect.value));
        if (isPlaying) {
            btnPlayAudio.innerHTML = '⏸';
            chantDisc.classList.add('playing');
            showToast("🎵 Playing Vedic Devotional Chant...");
        } else {
            btnPlayAudio.innerHTML = '▶';
            chantDisc.classList.remove('playing');
            showToast("Audio paused.");
        }
    });

    chantSelect.addEventListener('change', () => {
        window.templeAudio.toggleChant(parseInt(chantSelect.value));
        btnPlayAudio.innerHTML = '⏸';
        chantDisc.classList.add('playing');
    });

    btnOmDrone.addEventListener('click', () => {
        isDroneActive = !isDroneActive;
        window.templeAudio.toggleOmDrone(isDroneActive);
        btnOmDrone.classList.toggle('active', isDroneActive);
        showToast(isDroneActive ? "🕉 Om Tanpura Drone Soundscape ON" : "Om Drone OFF");
    });

    // 4. Header Top Buttons (Blessings, Mandap Studio, Eco Visarjan, Greeting Card)

    // Divine Blessing Card Generator
    const blessingsList = [
        {
            shloka: "वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ। निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥",
            meaning: "O Lord with curved trunk & massive body, radiant like a million suns, remove all obstacles from my endeavors forever.",
            blessing: "May Lord Ganesha remove every obstacle from your path and bestow upon you supreme wisdom, clarity, and success in all your righteous goals!"
        },
        {
            shloka: "ॐ एकदन्ताय विद्महे वक्रतुण्डाय धीमहि तन्नो दन्तिः प्रचोदयात्॥",
            meaning: "We meditate on the single-tusked Lord, we pray to the curved-trunk Ganesha. May that elephant-headed Lord inspire our minds.",
            blessing: "May the Divine Lord illuminate your mind with wisdom, peace, purity, and creative energy. Have a blessed and joyful celebration!"
        },
        {
            shloka: "विघ्नेश्वराय वरदाय सुरप्रियाय लम्बोदराय सकलाय जगद्विताय। नंगाननाय श्रुतियज्ञविभूषिताय गौरीसुताय गणनाथ नमोनमस्ते॥",
            meaning: "Salutations to Vighneshwara, the bestower of boons, beloved of gods, the protector of the universe, son of Goddess Gauri.",
            blessing: "May abundance, health, good fortune, and family harmony flourish in your home. Lord Ganesha fills your life with divine joy!"
        }
    ];

    document.getElementById('btnSeekBlessing').addEventListener('click', () => {
        const randomB = blessingsList[Math.floor(Math.random() * blessingsList.length)];
        document.getElementById('blessingShloka').textContent = randomB.shloka;
        document.getElementById('blessingMeaning').textContent = randomB.meaning;
        document.getElementById('blessingMessage').textContent = randomB.blessing;
        openModal(blessingModal);
        particles.triggerSparkles(window.innerWidth / 2, 250, 40);
    });

    // Mandap Studio Customization Modal
    document.getElementById('btnMandapStudio').addEventListener('click', () => {
        openModal(studioModal);
    });

    document.querySelectorAll('.idol-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idolSrc = btn.getAttribute('data-src');
            ganeshaImg.src = idolSrc;
            closeModal(studioModal);
            particles.triggerSparkles(window.innerWidth / 2, 250, 30);
            showToast("✨ Mandap Idol Updated!");
        });
    });

    // Eco Visarjan Guide & Virtual Immersion
    document.getElementById('btnEcoGuide').addEventListener('click', () => {
        openModal(ecoModal);
    });

    document.getElementById('btnStartVisarjan').addEventListener('click', () => {
        closeModal(ecoModal);
        particles.triggerFlowerShower(60);
        window.templeAudio.playShankh();
        
        showToast("🌊 Ganpati Bappa Morya! Pudhchya Varshi Lavkar Ya! (Virtual Eco Visarjan Performed with Flowers & Gratitude)");
    });

    // Custom Greeting Card Generator
    document.getElementById('btnGreetingCard').addEventListener('click', () => {
        openModal(greetingModal);
    });

    const senderInput = document.getElementById('senderNameInput');
    const customWishInput = document.getElementById('customWishInput');
    const previewSender = document.getElementById('previewSenderName');
    const previewWish = document.getElementById('previewWishText');

    senderInput.addEventListener('input', () => {
        previewSender.textContent = senderInput.value.trim() || 'Your Name';
    });

    customWishInput.addEventListener('input', () => {
        previewWish.textContent = customWishInput.value.trim() || 'Wishing you and your family a blessed Vinayaka Chavithi filled with joy, wisdom, and prosperity!';
    });

    document.getElementById('btnCopyGreeting').addEventListener('click', () => {
        const wishText = `✨ Happy Vinayaka Chavithi! ✨\n\n"${previewWish.textContent}"\n\n- Warm wishes from ${previewSender.textContent}\n\nCelebrated at Virtual Ganesha Mandap 🪔`;
        navigator.clipboard.writeText(wishText);
        showToast("📋 Festival Greeting text copied to clipboard!");
    });

    // Modal Helper Functions
    function openModal(modal) {
        if (modal) modal.classList.add('active');
    }
    function closeModal(modal) {
        if (modal) modal.classList.remove('active');
    }

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            closeModal(modal);
        });
    });

    // Toast Notification Banner
    function showToast(message) {
        let toast = document.getElementById('appToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'appToast';
            toast.style.cssText = `
                position: fixed;
                bottom: 25px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #FFD700, #FF8C00);
                color: #200;
                font-weight: 700;
                padding: 12px 24px;
                border-radius: 30px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.6), 0 0 15px #FFD700;
                z-index: 1000;
                font-size: 0.95rem;
                transition: opacity 0.4s ease, transform 0.4s ease;
                opacity: 0;
                pointer-events: none;
                text-align: center;
            `;
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(-10px)';

        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 3500);
    }
});
