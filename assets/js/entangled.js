// Loki Multiverse Timeline Tree (Yggdrasil)
// Featuring glowing temporal threads and energy nodes

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.bg-mesh');
  if (!container || typeof THREE === 'undefined') return;
  
  // Clear container
  container.innerHTML = '';

  let scene, camera, renderer, timelineGroup, lineMat, pointsMat;
  let time = 0;

  // Mouse interaction
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;
  let windowHalfX = window.innerWidth / 2;
  let windowHalfY = window.innerHeight / 2;

  // Colors: Portfolio Brand Colors (Cyan & Purple) with a hint of Temporal Gold
  const palette = [
    new THREE.Color(0x00f0ff), // Cyan (Portfolio Primary)
    new THREE.Color(0x7c3aed), // Purple (Portfolio Secondary)
    new THREE.Color(0x3b82f6), // Deep Blue
    new THREE.Color(0xffcc00)  // Temporal Gold
  ];

  function init() {
    scene = new THREE.Scene();
    
    // Position camera so the entire vertical tree is visible
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 22);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // Transparent to support your theme
    container.appendChild(renderer.domElement);

    createLokiTimeline();
    
    updateTheme();

    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('touchstart', onDocumentTouchStart, { passive: true });
    document.addEventListener('touchmove', onDocumentTouchMove, { passive: true });
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          updateTheme();
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });

    window.addEventListener('resize', onWindowResize);

    animate();
  }
  
  function updateTheme() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    
    if (lineMat) {
      lineMat.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      lineMat.opacity = isLight ? 0.15 : 0.25;
      lineMat.needsUpdate = true;
    }
  }

  function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
  }

  function onDocumentTouchStart(event) {
    if (event.touches.length === 1) {
      mouseX = event.touches[0].pageX - windowHalfX;
      mouseY = event.touches[0].pageY - windowHalfY;
    }
  }

  function onDocumentTouchMove(event) {
    if (event.touches.length === 1) {
      mouseX = event.touches[0].pageX - windowHalfX;
      mouseY = event.touches[0].pageY - windowHalfY;
    }
  }

  function createLokiTimeline() {
    if (timelineGroup) {
      scene.remove(timelineGroup);
    }
    
    timelineGroup = new THREE.Group();

    const numThreads = 300; // Hundreds of glowing temporal threads
    const pointsPerThread = 80; // High resolution curves
    const totalPoints = numThreads * pointsPerThread;

    lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      linewidth: 1
    });

    // We also collect all vertices into a single Points system for glowing nodes along the threads
    const allPos = new Float32Array(totalPoints * 3);
    const allCol = new Float32Array(totalPoints * 3);
    const allSizes = new Float32Array(totalPoints);

    for (let i = 0; i < numThreads; i++) {
      const pos = new Float32Array(pointsPerThread * 3);
      const col = new Float32Array(pointsPerThread * 3);
      
      const isStray = Math.random() > 0.85; // Stray timelines floating wildly
      
      const baseAngle = (i / numThreads) * Math.PI * 2;
      const spreadAngle = baseAngle + (Math.random() - 0.5) * 5.0; // The branch direction
      const spreadRadius = 6.0 + Math.random() * 10.0; // How far the branches reach horizontally
      
      // Select thread color favoring Portfolio Cyan and Purple
      const colorRoll = Math.random();
      let threadColor;
      if (colorRoll < 0.45) threadColor = palette[0]; // 45% Cyan
      else if (colorRoll < 0.85) threadColor = palette[1]; // 40% Purple
      else if (colorRoll < 0.95) threadColor = palette[2]; // 10% Blue
      else threadColor = palette[3]; // 5% Gold
      
      for (let j = 0; j < pointsPerThread; j++) {
        const t = j / (pointsPerThread - 1);
        const y = -14 + t * 28; // Vertical span: -14 to 14
        const absY = Math.abs(y);
        
        let radius, angle;
        
        if (isStray) {
          // Loose branches floating outside the main loom
          radius = 3.0 + Math.random() * 3.0;
          angle = baseAngle + y * 0.15;
        } else {
          // The Main Yggdrasil Tree
          if (absY < 1.8) {
            // The Sacred Timeline Loom (tightly bound core)
            radius = 0.1 + Math.random() * 0.3;
            angle = baseAngle + y * 1.5; // Threads twist extremely fast in the center
          } else {
            // Branches exploding outwards
            const tBranch = Math.min((absY - 1.8) / 12.2, 1.0); 
            // Smooth curve outward
            const curve = tBranch * tBranch * (3 - 2 * tBranch);
            
            radius = 0.4 + curve * spreadRadius;
            // Transition from twisting trunk to wide spreading branches
            angle = (baseAngle + y * 1.5) * (1 - curve) + (spreadAngle + y * 0.2) * curve;
          }
        }
        
        // Slight noise so threads aren't perfectly smooth
        const noise = (Math.random() - 0.5) * 0.15;
        const finalRadius = radius + noise;

        const x = Math.cos(angle) * finalRadius;
        const z = Math.sin(angle) * finalRadius;

        const idx = j * 3;
        pos[idx] = x;
        pos[idx+1] = y;
        pos[idx+2] = z;
        
        col[idx] = threadColor.r;
        col[idx+1] = threadColor.g;
        col[idx+2] = threadColor.b;

        // Copy into the master points array for glowing nodes
        const masterIdx = (i * pointsPerThread + j) * 3;
        allPos[masterIdx] = x;
        allPos[masterIdx+1] = y;
        allPos[masterIdx+2] = z;
        allCol[masterIdx] = threadColor.r;
        allCol[masterIdx+1] = threadColor.g;
        allCol[masterIdx+2] = threadColor.b;
        
        // 5% of nodes are large and brightly glowing, the rest are soft specks
        allSizes[i * pointsPerThread + j] = Math.random() > 0.95 ? 0.8 : 0.15;
      }
      
      const threadGeom = new THREE.BufferGeometry();
      threadGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      threadGeom.setAttribute('color', new THREE.BufferAttribute(col, 3));
      
      const line = new THREE.Line(threadGeom, lineMat);
      timelineGroup.add(line);
    }

    // Add the glowing energy nodes exactly overlapping the threads
    pointsMat = new THREE.PointsMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });

    const pointsGeom = new THREE.BufferGeometry();
    pointsGeom.setAttribute('position', new THREE.BufferAttribute(allPos, 3));
    pointsGeom.setAttribute('color', new THREE.BufferAttribute(allCol, 3));
    pointsGeom.setAttribute('size', new THREE.BufferAttribute(allSizes, 1));
    
    // For custom size support, we use a minor shader tweak if needed, 
    // but PointsMaterial size is uniform. To support custom sizes per particle:
    const shaderMat = new THREE.ShaderMaterial({
      uniforms: {
        globalOpacity: { value: 0.9 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (30.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float globalOpacity;
        void main() {
          vec2 xy = gl_PointCoord.xy - vec2(0.5);
          float ll = length(xy);
          if (ll > 0.5) discard;
          float alpha = (0.5 - ll) * 2.0;
          gl_FragColor = vec4(vColor, alpha * globalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    pointsMat = shaderMat; // Override with the custom shader for per-particle sizing

    const points = new THREE.Points(pointsGeom, pointsMat);
    timelineGroup.add(points);

    scene.add(timelineGroup);
  }

  function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);
    time += 0.005;

    // Parallax tracking
    targetX = mouseX * 0.001;
    targetY = mouseY * 0.001;

    if (timelineGroup) {
      // Rotate the entire magnificent tree
      timelineGroup.rotation.y += 0.0015;
      
      // Interactive parallax tilt
      timelineGroup.rotation.y += (targetX - timelineGroup.rotation.y) * 0.05;
      timelineGroup.rotation.x += (targetY - timelineGroup.rotation.x) * 0.05;
      
      // A cosmic breathing pulse to the entire structure
      const scale = 1.0 + Math.sin(time) * 0.015;
      timelineGroup.scale.set(scale, 1.0, scale);
    }
    
    // Keep Points Material opacity in sync with theme updates
    if (pointsMat && pointsMat.uniforms) {
       const isLight = document.documentElement.getAttribute('data-theme') === 'light';
       pointsMat.uniforms.globalOpacity.value = isLight ? 0.25 : 0.35;
       pointsMat.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    }

    renderer.render(scene, camera);
  }

  init();
});
