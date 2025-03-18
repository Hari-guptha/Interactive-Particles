    const canvas = document.querySelector('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
        alert('WebGL not supported');
        throw new Error('WebGL not supported');
    }

    const PARTICLE_DIM = 5;
    const particles = [];
    let particleData = [];

    // Vertex shader program
    const vsSource = `
        attribute vec2 a_position;
        attribute vec4 a_color;
        varying vec4 v_color;
        uniform vec2 u_resolution;
        
        void main() {
            vec2 zeroToOne = a_position / u_resolution;
            vec2 zeroToTwo = zeroToOne * 2.0;
            vec2 clipSpace = zeroToTwo - 1.0;
            gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
            gl_PointSize = ${PARTICLE_DIM}.0;
            v_color = a_color;
        }
    `;

    // Fragment shader program
    const fsSource = `
        precision mediump float;
        varying vec4 v_color;
        
        void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float r = length(coord) * 2.0;
            float alpha = 1.0 - smoothstep(0.8, 1.0, r);
            gl_FragColor = v_color * alpha;
        }
    `;

    // Create and compile shaders
    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    // Initialize WebGL program
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        throw new Error('Unable to initialize shader program');
    }

    // Get attribute locations
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    const colorAttributeLocation = gl.getAttribLocation(program, 'a_color');
    const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');

    // Create buffers
    const positionBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();

    const image = new Image();
    image.src = 'mbg.png';

    image.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        // Create temporary canvas to read image data
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        
        const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        
        tempCtx.drawImage(image, x, y, scaledWidth, scaledHeight);
        const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height).data;
        
        const numRows = Math.round(canvas.height / PARTICLE_DIM);
        const numCols = Math.round(canvas.width / PARTICLE_DIM);

        for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
                const index = (row * PARTICLE_DIM * canvas.width + col * PARTICLE_DIM) * 4;
                const x = Math.floor(col * PARTICLE_DIM + PARTICLE_DIM / 2);
                const y = Math.floor(row * PARTICLE_DIM + PARTICLE_DIM / 2);
                
                particles.push({
                    x: x,
                    y: y,
                    originalX: x,
                    originalY: y,
                    r: imageData[index] / 255,
                    g: imageData[index + 1] / 255,
                    b: imageData[index + 2] / 255,
                    a: imageData[index + 3] / 255
                });
            }
        }
        
        drawParticles();
    };

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
        
        particleData = [];
        
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
            
            particleData.push(
                particle.x, particle.y,
                particle.r, particle.g, particle.b, particle.a
            );
        });
    }

    function drawParticles() {
        updateParticles();
        
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.useProgram(program);
        
        // Update position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = new Float32Array(particleData.filter((_, i) => i % 6 < 2));
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        
        // Update color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        const colors = new Float32Array(particleData.filter((_, i) => i % 6 >= 2));
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
        
        // Set attributes and uniforms
        gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.enableVertexAttribArray(colorAttributeLocation);
        gl.vertexAttribPointer(colorAttributeLocation, 4, gl.FLOAT, false, 0, 0);
        
        // Enable blending for transparent particles
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Draw the particles
        gl.drawArrays(gl.POINTS, 0, particles.length);
        
        requestAnimationFrame(drawParticles);
    }

