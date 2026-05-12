// Loki Multiverse Timeline Tree (Yggdrasil)
// Featuring glowing temporal threads and energy nodes

function initEntangled() {
  const container = document.querySelector('.bg-mesh');
  if (!container || typeof THREE === 'undefined') {
      if (typeof THREE === 'undefined') console.error("THREE is undefined, cannot load tree");
      return;
  }
  
  // Clear container
  container.innerHTML = '';

  let scene, camera, renderer, timelineGroup, starGroup, blackHoleGroup, lineMat, pointsMat, starMat;
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
      lineMat.opacity = isLight ? 0.08 : 0.08; // Even less visible in dark mode
      lineMat.needsUpdate = true;
    }

    if (starMat) {
      starMat.color.setHex(isLight ? 0x64748b : 0xffffff);
      starMat.opacity = isLight ? 0.2 : 0.6;
      starMat.needsUpdate = true;
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

    // Create Cosmic Starfield
    if (starGroup) {
      scene.remove(starGroup);
    }
    starGroup = new THREE.Group();
    const numStars = 1500;
    const starPos = new Float32Array(numStars * 3);
    const starCol = new Float32Array(numStars * 3);
    
    for(let i = 0; i < numStars; i++) {
        // Spread stars widely across a massive sphere
        const r = 40 + Math.random() * 80;
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        
        starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i*3+2] = r * Math.cos(phi) - 20; // push slightly back
        
        // Varying brightness: 20% bright stars, 80% fainter stars
        const brightness = Math.random() > 0.8 ? 1.0 : (0.2 + Math.random() * 0.4);
        starCol[i*3] = brightness;
        starCol[i*3+1] = brightness;
        starCol[i*3+2] = brightness;
    }
    
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeom.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    
    starMat = new THREE.PointsMaterial({
        vertexColors: true,
        size: 0.25,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
    });
    
    const stars = new THREE.Points(starGeom, starMat);
    starGroup.add(stars);
    scene.add(starGroup);

    // Create Distant Glowing Black Hole (Interstellar Gargantua Style)
    if (blackHoleGroup) {
      scene.remove(blackHoleGroup);
    }
    blackHoleGroup = new THREE.Group();
    
    // Base position
    const bhX = 20;
    const bhY = 12;
    const bhZ = -50; // Pushed further back for a majestic distant look
    blackHoleGroup.position.set(bhX, bhY, bhZ);
    blackHoleGroup.scale.set(0.35, 0.35, 0.35); // Scaled down

    // 1. The Event Horizon (Pitch Black Sphere)
    const bhGeom = new THREE.SphereGeometry(3.5, 64, 64);
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const blackHole = new THREE.Mesh(bhGeom, bhMat);
    blackHole.renderOrder = 2; // Write to depth buffer so it blocks the back of the disk
    blackHoleGroup.add(blackHole);

    // 2. The Lensing Halo (Photon Ring that wraps around)
    const haloGroup = new THREE.Group();
    
    // Intense bright inner ring
    const haloInnerGeom = new THREE.RingGeometry(3.45, 3.8, 128);
    const haloInnerMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    haloGroup.add(new THREE.Mesh(haloInnerGeom, haloInnerMat));

    // Soft purple outer glow
    const haloOuterGeom = new THREE.RingGeometry(3.5, 4.8, 128);
    const haloOuterMat = new THREE.MeshBasicMaterial({
        color: 0x7c3aed, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    haloGroup.add(new THREE.Mesh(haloOuterGeom, haloOuterMat));

    // Outer cyan falloff
    const haloCyanGeom = new THREE.RingGeometry(4.2, 5.8, 128);
    const haloCyanMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    haloGroup.add(new THREE.Mesh(haloCyanGeom, haloCyanMat));

    // Face the halo to camera
    haloGroup.rotation.y = -0.35; // Slight tilt towards center
    haloGroup.rotation.x = -0.15;
    blackHoleGroup.add(haloGroup);

    // 3. The Main Horizontal Accretion Disk
    const diskGroup = new THREE.Group();

    // Solid base glow rings
    const diskBaseGeom1 = new THREE.RingGeometry(3.6, 4.2, 128);
    const diskBaseMat1 = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    diskGroup.add(new THREE.Mesh(diskBaseGeom1, diskBaseMat1));

    const diskBaseGeom2 = new THREE.RingGeometry(3.9, 7.5, 128);
    const diskBaseMat2 = new THREE.MeshBasicMaterial({
        color: 0x7c3aed, transparent: true, opacity: 0.65, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    diskGroup.add(new THREE.Mesh(diskBaseGeom2, diskBaseMat2));

    const diskBaseGeom3 = new THREE.RingGeometry(6.5, 11.0, 128);
    const diskBaseMat3 = new THREE.MeshBasicMaterial({
        color: 0x00f0ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    diskGroup.add(new THREE.Mesh(diskBaseGeom3, diskBaseMat3));

    // Tilt the disk heavily to match the Gargantua look (almost edge-on)
    diskGroup.rotation.x = Math.PI / 2.15;
    diskGroup.rotation.y = Math.PI / 10;

    blackHoleGroup.add(diskGroup);
    scene.add(blackHoleGroup);
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

    if (starGroup) {
      // Slowly rotate the galaxy
      starGroup.rotation.y += 0.0003;
      
      // Parallax tracking for stars (slower than tree to create 3D depth)
      starGroup.rotation.y += (targetX * 0.5 - starGroup.rotation.y) * 0.02;
      starGroup.rotation.x += (targetY * 0.5 - starGroup.rotation.x) * 0.02;
    }

    if (blackHoleGroup) {
      // Swirling accretion disk and halo
      if (blackHoleGroup.children.length > 2) {
          const haloGroup = blackHoleGroup.children[1];
          const diskGroup = blackHoleGroup.children[2];
          
          // Spin the lensing halo slowly
          haloGroup.rotation.z -= 0.002;
          
          // Spin the entire flat accretion disk rapidly
          diskGroup.rotation.z -= 0.005;
          
          // Add a tiny wobble to the disk to make it look alive and chaotic
          diskGroup.rotation.x += Math.sin(time * 2.0) * 0.0005;
          diskGroup.rotation.y += Math.cos(time * 1.5) * 0.0005;
      }
      
      // Slow wandering movement across the background
      const currentX = Math.sin(time * 0.15) * 80; // Moves widely from left to right (-80 to 80)
      const currentY = 12 + Math.cos(time * 0.2) * 15; // Floats up and down gently
      
      // Distant Parallax tracking combined with massive cosmic orbit
      blackHoleGroup.position.x = currentX + (targetX * 1.5);
      blackHoleGroup.position.y = currentY + (targetY * 1.5);
    }
    
    // Keep Points Material opacity in sync with theme updates
    if (pointsMat && pointsMat.uniforms) {
       const isLight = document.documentElement.getAttribute('data-theme') === 'light';
       pointsMat.uniforms.globalOpacity.value = isLight ? 0.15 : 0.15; // Even less visible in dark mode
       pointsMat.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    }

    renderer.render(scene, camera);
  }

  init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEntangled);
} else {
    // Check periodically in case THREE loads slightly after DOMContentLoaded
    const checkThree = setInterval(() => {
        if (typeof THREE !== 'undefined' && document.querySelector('.bg-mesh')) {
            clearInterval(checkThree);
            initEntangled();
        }
    }, 100);
    // Timeout after 5 seconds to stop checking
    setTimeout(() => clearInterval(checkThree), 5000);
}
