const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const image = new Image();
image.src = 'mbg.png';

const PARTICLE_DIM = 5;
const particles = [];

image.onload = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    const x = (canvas.width - scaledWidth) / 2;
    const y = (canvas.height - scaledHeight) / 2;
    
    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const numRows = Math.round(canvas.height / PARTICLE_DIM);
    const numCols = Math.round(canvas.width / PARTICLE_DIM);

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            const index = (row * PARTICLE_DIM * canvas.width + col * PARTICLE_DIM) * 4;
            
            const red = imageData[index];
            const green = imageData[index + 1];
            const blue = imageData[index + 2];
            const alpha = imageData[index + 3];

            particles.push({
                x: Math.floor(col * PARTICLE_DIM + PARTICLE_DIM / 2),
                y: Math.floor(row * PARTICLE_DIM + PARTICLE_DIM / 2), 
                originalX: Math.floor(col * PARTICLE_DIM + PARTICLE_DIM / 2),
                originalY: Math.floor(row * PARTICLE_DIM + PARTICLE_DIM / 2),
                color: `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`
            });
            
        }
    }
    drawParticles();
    
}

function drawParticles() {
    updateParticles();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, PARTICLE_DIM / 2, 0, Math.PI * 2);
        ctx.fill();
    });
    requestAnimationFrame(drawParticles);
}



let mouseX = 0;
let mouseY = 0;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    mouseX = (e.clientX - rect.left) * dpr;
    mouseY = (e.clientY - rect.top) * dpr;
});

canvas.addEventListener('mouseleave', () => {
    mouseX = Infinity;
    mouseY = Infinity;
});



function updateParticles() {
    const repel_radius = 100;
    const repel_speed = 10;
    const return_speed = 0.1;
    particles.forEach(particle => {
        const dist_x = mouseX - particle.x;
        const dist_y = mouseY - particle.y;
        const distance = Math.sqrt(dist_x ** 2 + dist_y ** 2);
        if (distance < repel_radius) {
            const angle = Math.atan2(dist_y, dist_x);
            const repel_force = (repel_radius - distance) / repel_radius;
            const move_x = Math.cos(angle) * repel_force * repel_speed;
            const move_y = Math.sin(angle) * repel_force * repel_speed;
            particle.x -= move_x;
            particle.y -= move_y;
        }
        if (particle.x !== particle.originalX || particle.y !== particle.originalY) {
            const distanceFromOriginX = particle.originalX - particle.x;
            const distanceFromOriginY = particle.originalY - particle.y;
            const distanceFromOrigin = Math.sqrt(
                distanceFromOriginX ** 2 + distanceFromOriginY ** 2
            );
            const angle = Math.atan2(distanceFromOriginY, distanceFromOriginX);
            const moveX = Math.cos(angle) * distanceFromOrigin * return_speed;
            const moveY = Math.sin(angle) * distanceFromOrigin * return_speed;
            particle.x += moveX;
            particle.y += moveY;
        }
    });
}

