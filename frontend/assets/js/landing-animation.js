document.addEventListener('DOMContentLoaded', () => {
    const heroSection = document.querySelector('.hero-section');
    const canvas = document.getElementById('background-animation');
    if (!canvas || !heroSection) {
        console.error('Required elements for animation not found');
        return;
    }
    const ctx = canvas.getContext('2d');

    function setCanvasSize() {
        canvas.width = heroSection.offsetWidth;
        canvas.height = heroSection.offsetHeight;
    }

    setCanvasSize();

    class Star {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = canvas.width / 2;
            this.y = canvas.height / 2;
            
            this.px = this.x;
            this.py = this.y;

            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 0.1; // Start slower for a better "emerging" effect
            
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
        }

        update() {
            this.px = this.x;
            this.py = this.y;
            this.x += this.vx;
            this.y += this.vy;
            
            // Accelerate for the warp speed effect
            this.vx *= 1.025;
            this.vy *= 1.025;

            // When a star goes off-screen, reset it to the center
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }

        draw() {
            // The opacity is based on the star's velocity, making it fade in as it accelerates
            const opacity = Math.min(Math.sqrt(this.vx * this.vx + this.vy * this.vy) / 10, 1);

            ctx.beginPath();
            ctx.moveTo(this.px, this.py);
            ctx.lineTo(this.x, this.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }

    let stars = [];
    const numStars = 400; // Increased star density for a richer effect

    function init() {
        stars = [];
        for (let i = 0; i < numStars; i++) {
            stars.push(new Star());
        }
    }

    function animate() {
        // A lower opacity fill creates motion blur trails for a faster feel
        ctx.fillStyle = 'rgba(5, 6, 10, 0.1)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (const star of stars) {
            star.update();
            star.draw();
        }

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        setCanvasSize();
        init();
    });

    init();
    animate();
});
