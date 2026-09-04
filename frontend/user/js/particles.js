/**
 * Particle Renderer Engine for Vinayaka Mandap
 * Handles HTML5 Canvas animations for marigold petals, divine sparkles, and diya embers.
 */

class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.sparkles = [];
        this.isRunning = false;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width || window.innerWidth;
        this.canvas.height = rect.height || 500;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
    }

    /**
     * Spawns a burst of falling Marigold and Hibiscus flower petals
     */
    triggerFlowerShower(count = 40) {
        const colors = [
            '#FF8C00', '#FFA500', '#FFD700', '#FF4500', '#D2691E', '#E65100', '#C62828'
        ];

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: -20 - Math.random() * 50,
                size: Math.random() * 12 + 8,
                color: colors[Math.floor(Math.random() * colors.length)],
                speedY: Math.random() * 2 + 1.2,
                speedX: (Math.random() - 0.5) * 1.5,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.08,
                type: Math.random() > 0.3 ? 'marigold' : 'hibiscus',
                opacity: 1
            });
        }
    }

    /**
     * Spawns divine golden sparkles around Ganesha
     */
    triggerSparkles(x, y, count = 25) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            this.sparkles.push({
                x: x || this.canvas.width / 2,
                y: y || this.canvas.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 5 + 2,
                color: Math.random() > 0.5 ? '#FFF8DC' : '#FFD700',
                life: 1.0,
                decay: Math.random() * 0.03 + 0.015
            });
        }
    }

    animate() {
        if (!this.isRunning) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw flower petals
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.y += p.speedY;
            p.x += Math.sin(p.y * 0.02) * p.speedX;
            p.rotation += p.rotationSpeed;

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.globalAlpha = p.opacity;

            if (p.type === 'marigold') {
                // Marigold petal cluster
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#FFD700';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size * 0.3, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                // Hibiscus petal shape
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -p.size);
                this.ctx.quadraticCurveTo(p.size, -p.size/2, p.size*0.7, p.size);
                this.ctx.quadraticCurveTo(0, p.size*0.5, -p.size*0.7, p.size);
                this.ctx.quadraticCurveTo(-p.size, -p.size/2, 0, -p.size);
                this.ctx.fill();
            }

            this.ctx.restore();

            // Remove out of bounds petals
            if (p.y > this.canvas.height + 20) {
                this.particles.splice(i, 1);
            }
        }

        // Update and draw divine sparkles
        for (let i = this.sparkles.length - 1; i >= 0; i--) {
            const s = this.sparkles[i];
            s.x += s.vx;
            s.y += s.vy;
            s.life -= s.decay;

            if (s.life <= 0) {
                this.sparkles.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.globalAlpha = s.life;
            this.ctx.fillStyle = s.color;
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            this.ctx.fill();

            // Four-pointed star glow
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(s.x - s.size * 2, s.y);
            this.ctx.lineTo(s.x + s.size * 2, s.y);
            this.ctx.moveTo(s.x, s.y - s.size * 2);
            this.ctx.lineTo(s.x, s.y + s.size * 2);
            this.ctx.stroke();

            this.ctx.restore();
        }

        // Ambient gentle ambient particle spawn
        if (Math.random() < 0.1 && this.particles.length < 50) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: -10,
                size: Math.random() * 8 + 5,
                color: '#FFA500',
                speedY: Math.random() * 1.5 + 0.8,
                speedX: (Math.random() - 0.5) * 1,
                rotation: Math.random() * Math.PI,
                rotationSpeed: 0.02,
                type: 'marigold',
                opacity: 0.8
            });
        }

        requestAnimationFrame(() => this.animate());
    }
}

window.ParticleSystem = ParticleSystem;
