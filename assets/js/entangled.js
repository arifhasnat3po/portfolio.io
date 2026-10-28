/* Original temporal loom, restored from b8d539f and batched for the observatory. */
(() => {
  'use strict';
  function initEntangled() {
    const host = document.querySelector('.bg-mesh');
    if (!host || host.dataset.cosmos) return;
    const root = document.documentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const small = innerWidth < 760;
    const dpr = Math.min(devicePixelRatio || 1, small ? 1.25 : 1.65);
    const STAR_COUNT = small ? 1080 : 3000, THREAD_COUNT = 300, POINTS_PER_THREAD = 80;
    let seed = 58021;
    const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
    let renderer, scene, camera, tree, hole, starUniforms, treeUniforms, holeUniforms, galaxyUniforms;
    let frame = 0, time = 0, travel = 0, last = 0, lastDraw = 0, drawDelta = 0;
    let pointerX = 0, pointerY = 0, parallaxX = 0, parallaxY = 0;
    let pointerUntil = -1, pointerStrength = 0, pulseStart = -10, lightTheme = false;
    let jump = 0, jumpEnd = 0, boost = 0, boostEnd = 0;
    let viewWidth = 40, viewHeight = 28, disposed = false, scrollProgress = 0, mobile = small;
    const threads = [], themedMaterials = [];
    const palette = [[0,240/255,1],[124/255,58/255,237/255],[59/255,130/255,246/255],[1,204/255,0]];
    const paletteHex = ['#00f0ff','#7c3aed','#3b82f6','#ffcc00'];
    const lightPalette = ['#006e7a','#592696','#27549d','#8d6200'];
    let treeBounds = {centerX:0,centerY:0,width:32,height:28};
    const active = () => !disposed && !document.hidden && !reduced.matches && root.dataset.motion !== 'off';

    function fallback() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0; host.dataset.cosmos = 'fallback'; host.dataset.moving = 'false';
      if (host.querySelector('.cosmos-fallback')) return;
      const sky = document.createElement('div'); sky.className = 'cosmos-fallback';
      const blackHole = document.createElement('i'); blackHole.className = 'cosmos-fallback-hole'; sky.appendChild(blackHole);
      const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '-18 -15 36 30'); svg.setAttribute('class', 'cosmos-fallback-tree'); svg.setAttribute('aria-hidden', 'true');
      threads.filter((_,index)=>index%5===0).forEach(thread => {
        const p=document.createElementNS(ns,'polyline');
        p.setAttribute('points',thread.points.map(point=>`${point[0]},${-point[1]}`).join(' '));
        p.setAttribute('fill','none');p.dataset.color=String(thread.colorIndex);p.setAttribute('stroke-width','.045');
        p.setAttribute('stroke-opacity','.65');svg.appendChild(p);
      });
      sky.appendChild(svg); host.appendChild(sky);
      const recolor=()=>svg.querySelectorAll('polyline').forEach(p=>p.setAttribute('stroke',(root.dataset.theme==='light'?lightPalette:paletteHex)[Number(p.dataset.color)]));
      recolor();document.addEventListener('portfolio:themechange',recolor);
    }
    makeTimeline();
    if (typeof THREE === 'undefined') { fallback(); return; }
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !small, powerPreference: 'low-power' });
      renderer.setPixelRatio(dpr); renderer.setClearColor(0x060908, 0);
      renderer.domElement.setAttribute('aria-hidden', 'true'); renderer.domElement.className = 'cosmos-canvas'; host.appendChild(renderer.domElement);
      scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, .1, 180); camera.position.z = 42;
    } catch (_) { fallback(); return; }
    const geometry = (positions, colors, sizes, phases) => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      if (colors) g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      if (sizes) g.setAttribute('pointSize', new THREE.BufferAttribute(sizes, 1));
      if (phases) g.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
      return g;
    };
    function createStars() {
      const pos = new Float32Array(STAR_COUNT * 3), colors = new Float32Array(STAR_COUNT * 3), sizes = new Float32Array(STAR_COUNT), phases = new Float32Array(STAR_COUNT);
      const streakPos = new Float32Array(STAR_COUNT * 6), edges = new Float32Array(STAR_COUNT * 2);
      for (let i = 0; i < STAR_COUNT; i++) {
        const p = i * 3, s = i * 6;
        pos[p] = (random() - .5) * 118; pos[p + 1] = (random() - .5) * 86; pos[p + 2] = random() * 90;
        const silver = .55 + random() * .45;
        colors[p] = silver; colors[p + 1] = silver * .98; colors[p + 2] = silver * .89;
        sizes[i] = 1.8 + Math.pow(random(), 6) * 5.8; phases[i] = random() * Math.PI * 2;
        for (let j = 0; j < 3; j++) streakPos[s + j] = streakPos[s + j + 3] = pos[p + j];
        edges[i * 2 + 1] = 1;
      }
      starUniforms = {
        uTime:{value:0},uTravel:{value:0},uJump:{value:0},uDpr:{value:dpr},uLight:{value:0},
        uAspect:{value:innerWidth/innerHeight},uPointer:{value:new THREE.Vector2()},uStrength:{value:0},
        uPulse:{value:10},uPulseCenter:{value:new THREE.Vector2()}
      };
      const stars = new THREE.Points(geometry(pos, colors, sizes, phases), new THREE.ShaderMaterial({
        uniforms: starUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute vec3 color; attribute float pointSize; attribute float phase;
          uniform float uTime,uTravel,uDpr,uLight,uAspect,uStrength,uPulse;uniform vec2 uPointer,uPulseCenter;varying vec3 vColor;varying float vAlpha;
          void main(){vec3 p=position;p.z=-55.0+mod(p.z+uTravel,90.0);
            p.x+=sin(uTime*.045+phase)*.7;p.y+=cos(uTime*.035+phase)*.35;
            vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
            vec2 aspect=vec2(uAspect,1.0),ndc=gl_Position.xy/gl_Position.w,delta=(ndc-uPointer)*aspect;
            float distance=length(delta),near=1.0-smoothstep(.0,.32,distance);
            vec2 away=delta/(distance+.0001);ndc+=away/aspect*near*uStrength*.12;
            float ring=exp(-pow((length((ndc-uPulseCenter)*aspect)-(.025+uPulse*.42))*34.0,2.0))*max(0.0,1.0-uPulse/1.5);
            gl_Position.xy=ndc*gl_Position.w;
            gl_PointSize=clamp(pointSize*uDpr*(32.0/-mv.z)*(1.0+near*uStrength*.7+ring*1.4),1.8,10.0*uDpr);
            vColor=mix(color,vec3(.10,.19,.23)*(.65+color.r*.35),uLight);
            vAlpha=(.85+.15*sin(uTime*.7+phase))*(1.0+ring*.8)*smoothstep(3.0,9.0,-mv.z);}`,
        fragmentShader: `varying vec3 vColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float glow=exp(-d*d*32.0)+pow(1.0-d*2.0,2.0)*.35;gl_FragColor=vec4(vColor,glow*vAlpha);}`
      }));
      stars.frustumCulled = false; scene.add(stars);themedMaterials.push(stars.material);
      const streaks = geometry(streakPos); streaks.setAttribute('edge', new THREE.BufferAttribute(edges, 1));
      const trails = new THREE.LineSegments(streaks, new THREE.ShaderMaterial({
        uniforms: starUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute float edge;uniform float uTravel,uJump;varying float vAlpha;
          void main(){vec3 p=position;p.z=-55.0+mod(p.z+uTravel,90.0)-edge*uJump*17.0;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);vAlpha=uJump*(1.0-edge*.85);}`,
        fragmentShader: `uniform float uLight;varying float vAlpha;void main(){gl_FragColor=vec4(mix(vec3(.85,.94,.83),vec3(.10,.19,.23),uLight),vAlpha*.55);}`
      }));
      trails.frustumCulled = false; scene.add(trails);themedMaterials.push(trails.material);
      // A brief constellation makes taps apparent even between distant stars.
      // Its geometry is shared and static; only the pulse uniforms change.
      const nodes=[[-.12,-.06],[-.045,.09],[.04,.025],[.14,.11],[.19,-.045],[.055,-.12]],links=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,2],[5,0]],linePositions=[];
      links.forEach(link=>link.forEach(index=>linePositions.push(...nodes[index],0)));
      const constellation=new THREE.LineSegments(geometry(new Float32Array(linePositions)),new THREE.ShaderMaterial({
        uniforms:starUniforms,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
        vertexShader:`uniform float uAspect,uPulse;uniform vec2 uPulseCenter;void main(){float size=1.0+min(uPulse,1.5)*.22;
          gl_Position=vec4(uPulseCenter+position.xy*vec2(1.0/uAspect,1.0)*size,0.0,1.0);}`,
        fragmentShader:`uniform float uLight,uPulse;void main(){float fade=max(0.0,1.0-uPulse/1.5);
          gl_FragColor=vec4(mix(vec3(.32,.86,1.0),vec3(.06,.28,.40),uLight),fade*.7);}`
      }));constellation.frustumCulled=false;constellation.renderOrder=6;scene.add(constellation);themedMaterials.push(constellation.material);
    }
    function createGalaxies() {
      const positions=[],centers=[],sizes=[],phases=[];
      [[.63,.10,.14,.2],[.93,.44,.12,1.9],[.13,.79,.12,3.3],[.36,.12,.085,4.2],[.58,.92,.16,5.4]].forEach(([x,y,size,phase])=>{
        [[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]].forEach(([px,py])=>{positions.push(px,py,0);centers.push(x,y);sizes.push(size);phases.push(phase);});
      });
      const g=geometry(new Float32Array(positions));
      g.setAttribute('center',new THREE.BufferAttribute(new Float32Array(centers),2));
      g.setAttribute('extent',new THREE.BufferAttribute(new Float32Array(sizes),1));
      g.setAttribute('phase',new THREE.BufferAttribute(new Float32Array(phases),1));
      galaxyUniforms={uTime:{value:0},uAspect:{value:innerWidth/innerHeight},uMobile:{value:small?1:0},uLight:{value:0}};
      const galaxies=new THREE.Mesh(g,new THREE.ShaderMaterial({
        uniforms:galaxyUniforms,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
        vertexShader:`attribute vec2 center;attribute float extent,phase;uniform float uAspect,uMobile;varying vec2 vUv;varying float vPhase;
          void main(){vUv=position.xy;vPhase=phase;vec2 c=vec2(center.x*2.0-1.0,1.0-center.y*2.0);float scale=mix(1.0,.57,uMobile);gl_Position=vec4(c+position.xy*extent*scale*vec2(1.0/uAspect,1.0),.98,1.0);}`,
        fragmentShader:`uniform float uTime,uLight;varying vec2 vUv;varying float vPhase;
          float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          void main(){float rot=vPhase+.12*sin(uTime*.045);vec2 p=mat2(cos(rot),-sin(rot),sin(rot),cos(rot))*vUv;p.y*=1.9;
            float r=length(p),a=atan(p.y,p.x);float spiral=pow(.5+.5*cos(a*2.0+log(r+.09)*5.6-uTime*.13+vPhase),7.0);
            float disk=exp(-r*3.9)*(.16+spiral*.85),core=exp(-r*r*85.0)*.82,grain=.6+.4*hash(floor(p*140.0));
            float light=(disk*grain+core)*(1.0-smoothstep(.65,1.0,length(vUv)))*(.9+.1*sin(uTime*.7+vPhase));
            vec3 dust=mix(vec3(.48,.66,.57),vec3(.85,.75,.52),.5+.5*sin(vPhase));vec3 color=mix(dust,vec3(.96,.90,.72),core);
            color=mix(color,color*.26+vec3(.04,.07,.09),uLight);gl_FragColor=vec4(color,light*.78);}`
      }));galaxies.frustumCulled=false;galaxies.renderOrder=1;scene.add(galaxies);themedMaterials.push(galaxies.material);
    }
    function makeTimeline() {
      // The original 300 × 80 loom algorithm, including its stray threads and palette.
      // A stable random seed keeps the same silhouette after every reload.
      for(let i=0;i<THREAD_COUNT;i++) {
        const isStray=random()>.85,baseAngle=i/THREAD_COUNT*Math.PI*2;
        const spreadAngle=baseAngle+(random()-.5)*5,spreadRadius=6+random()*10;
        const roll=random(),colorIndex=roll<.45?0:roll<.85?1:roll<.95?2:3;
        const points=[],sizes=[];
        for(let j=0;j<POINTS_PER_THREAD;j++) {
          const y=-14+j/(POINTS_PER_THREAD-1)*28,absY=Math.abs(y);
          let radius,angle;
          if(isStray) {radius=3+random()*3;angle=baseAngle+y*.15;}
          else if(absY<1.8) {radius=.1+random()*.3;angle=baseAngle+y*1.5;}
          else {
            const t=Math.min((absY-1.8)/12.2,1),curve=t*t*(3-2*t);
            radius=.4+curve*spreadRadius;
            angle=(baseAngle+y*1.5)*(1-curve)+(spreadAngle+y*.2)*curve;
          }
          radius+=(random()-.5)*.15;
          points.push([Math.cos(angle)*radius,y,Math.sin(angle)*radius]);
          sizes.push(random()>.95?.8:.15);
        }
        threads.push({points,sizes,colorIndex});
      }
    }
    const bendShader=`vec3 bend(vec3 p){float crown=pow(abs(p.y)/14.0,1.25);
      p.x+=(uPointer.x*.85+sin(uTime*.38+p.y*.21)*.08)*crown;
      p.z+=uPointer.y*crown*.55;return p;}`;
    function createTree() {
      tree=new THREE.Group();
      const positions=[],colors=[],phases=[],flows=[],points=[],pointColors=[],pointSizes=[],pointPhases=[],pointFlows=[];
      threads.forEach((thread,index)=>{
        const color=palette[thread.colorIndex],phase=index/THREAD_COUNT*Math.PI*2;
        thread.points.forEach((point,j)=>{
          const flow=j/(POINTS_PER_THREAD-1);
          points.push(...point);pointColors.push(...color);pointSizes.push(thread.sizes[j]);pointPhases.push(phase);pointFlows.push(flow);
          if(j) {
            positions.push(...thread.points[j-1],...point);colors.push(...color,...color);
            phases.push(phase,phase);flows.push((j-1)/(POINTS_PER_THREAD-1),flow);
          }
        });
      });
      treeUniforms={uTime:{value:0},uOpacity:{value:.78},uBoost:{value:0},uDpr:{value:dpr},uLight:{value:0},uPointer:{value:new THREE.Vector2()},uPulse:starUniforms.uPulse};
      const g=geometry(new Float32Array(positions),new Float32Array(colors),null,new Float32Array(phases));
      g.setAttribute('flow',new THREE.BufferAttribute(new Float32Array(flows),1));g.computeBoundingBox();
      const bounds=g.boundingBox;
      treeBounds={centerX:(bounds.min.x+bounds.max.x)/2,centerY:(bounds.min.y+bounds.max.y)/2,width:bounds.max.x-bounds.min.x,height:bounds.max.y-bounds.min.y};
      const lines=new THREE.LineSegments(g,new THREE.ShaderMaterial({
        uniforms:treeUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
        vertexShader:`attribute vec3 color;attribute float phase,flow;uniform float uTime,uLight,uPulse;uniform vec2 uPointer;varying vec3 vColor;varying float vFlow,vPulse;${bendShader}
          void main(){vColor=mix(color,color*.32+vec3(.015,.025,.045),uLight);vFlow=pow(.5+.5*sin(flow*12.0-uTime*1.8+phase),14.0);
            vPulse=exp(-pow((abs(position.y)/14.0-uPulse*.85)*7.0,2.0))*max(0.0,1.0-uPulse/1.5);
            gl_Position=projectionMatrix*modelViewMatrix*vec4(bend(position),1.0);}`,
        fragmentShader:`uniform float uOpacity,uBoost;varying vec3 vColor;varying float vFlow,vPulse;
          void main(){gl_FragColor=vec4(vColor*(1.0+vFlow*.25),uOpacity*(.12+vFlow*.11+vPulse*.36)+uBoost*.065);}`
      }));lines.frustumCulled=false;tree.add(lines);themedMaterials.push(lines.material);
      const pg=geometry(new Float32Array(points),new Float32Array(pointColors),new Float32Array(pointSizes),new Float32Array(pointPhases));
      pg.setAttribute('flow',new THREE.BufferAttribute(new Float32Array(pointFlows),1));
      const energy=new THREE.Points(pg,new THREE.ShaderMaterial({
        uniforms:treeUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
        vertexShader:`attribute vec3 color;attribute float pointSize,phase,flow;uniform float uTime,uDpr,uBoost,uOpacity,uLight,uPulse;uniform vec2 uPointer;varying float vAlpha;varying vec3 vColor;${bendShader}
          void main(){float wave=pow(.5+.5*sin(flow*12.0-uTime*1.8+phase),14.0);
            float pulse=exp(-pow((abs(position.y)/14.0-uPulse*.85)*7.0,2.0))*max(0.0,1.0-uPulse/1.5);
            vec4 mv=modelViewMatrix*vec4(bend(position),1.0);gl_Position=projectionMatrix*mv;
            gl_PointSize=clamp(pointSize*uDpr*(126.0/-mv.z)*(1.0+wave*.5+pulse+uBoost*.3),.7,7.0*uDpr);
            vAlpha=(.15+wave*.18+pulse*.55+uBoost*.12)*uOpacity;vColor=mix(color,color*.32+vec3(.015,.025,.045),uLight);}`,
        fragmentShader:`varying float vAlpha;varying vec3 vColor;void main(){float r=length(gl_PointCoord-.5)*2.0;if(r>1.0)discard;gl_FragColor=vec4(vColor,(1.0-r)*vAlpha);}`
      }));energy.frustumCulled=false;tree.add(energy);themedMaterials.push(energy.material);scene.add(tree);
    }
    function createBlackHole() {
      holeUniforms={uTime:{value:0},uOpacity:{value:1}};
      hole=new THREE.Mesh(new THREE.PlaneGeometry(32,16),new THREE.ShaderMaterial({
        uniforms:holeUniforms,transparent:true,depthWrite:false,depthTest:false,
        vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader:`precision highp float;varying vec2 vUv;uniform float uTime,uOpacity;
          float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0)),f.x),f.y);}
          void main(){vec2 p=(vUv-.5)*vec2(6.4,3.2);float r=length(p),angle=atan(p.y,p.x);float shadow=1.0-smoothstep(.625,.65,r);
            float ring=exp(-abs(r-.668)*105.0),ringGlow=exp(-abs(r-.68)*25.0);
            vec2 diskP=vec2(p.x,(p.y+.035)*6.1);float diskR=length(diskP),diskAngle=atan(diskP.y,diskP.x);
            float winding=diskAngle-uTime*(.72+1.1/(diskR+.6));float grain=noise(vec2(diskR*20.0,winding*4.0));
            float bands=.50+.24*sin(diskR*93.0+grain*5.0)+.26*sin(diskR*151.0+winding*9.0);
            float disk=exp(-max(0.0,diskR-.72)*1.72)*smoothstep(.64,.83,diskR)*(1.0-smoothstep(2.6,3.0,diskR));
            disk*=bands*(.58+.42*sin(winding*3.0+diskR*4.0))*(.72+.28*smoothstep(-1.5,1.5,-p.x));
            float rearMask=smoothstep(.64,.69,r);disk*=rearMask;
            float upper=smoothstep(-.05,.32,p.y),lensR=length(vec2(p.x,p.y*.94));float lens=exp(-abs(lensR-.715)*28.0)*upper;
            float lensTexture=.68+.20*sin(angle*34.0-uTime*2.4)+.12*sin(angle*73.0+uTime*1.3);lens*=lensTexture*(.72+.28*cos(angle-.7));
            float frontY=p.y+.055,frontWidth=.022+.021*exp(-p.x*p.x*1.5);float front=exp(-pow(frontY/frontWidth,2.0))*(1.0-smoothstep(1.5,2.8,abs(p.x)));
            front*=.78+.22*sin(p.x*44.0-uTime*4.3+noise(vec2(p.x*13.0,uTime*.2))*3.0);
            float dust=exp(-abs(diskR-1.6)*8.0)*pow(.5+.5*sin(diskAngle*17.0-uTime*3.4+diskR*7.0),18.0)*rearMask*.20;
            float haze=exp(-abs(lensR-.74)*6.5)*.07+exp(-abs(p.y)*13.0)*exp(-p.x*p.x*.4)*.04;
            float light=disk*1.65+lens*.90+ring*.43+ringGlow*.10+haze+dust;
            vec3 amber=mix(vec3(.51,.21,.055),vec3(1.0,.73,.35),clamp(light*1.8,0.0,1.0));vec3 color=amber*light+vec3(1.0,.92,.72)*(ring*.22+lens*.24);
            color=mix(color,vec3(.006,.008,.007),shadow);color+=vec3(1.0,.85,.58)*front*1.25;float alpha=clamp(light*1.5+shadow,0.0,1.0);alpha=max(alpha,front);
            float edge=1.0-smoothstep(2.85,3.15,abs(p.x));gl_FragColor=vec4(color,alpha*uOpacity*edge);}`
      }));hole.renderOrder=5;scene.add(hole);
    }
    function resize() {
      if(disposed)return;mobile=innerWidth<760;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
      viewHeight=2*Math.tan(46*Math.PI/360)*camera.position.z;viewWidth=viewHeight*camera.aspect;
      // Fit the whole three-dimensional loom, with space for its parallax tilt.
      const treeScale=mobile?Math.min(viewHeight*.43/(treeBounds.height*1.22),viewWidth*.78/(treeBounds.width*1.22)):
        Math.min(viewHeight*.50/(treeBounds.height*1.22),viewWidth*.44/(treeBounds.width*1.22));
      tree.position.set(viewWidth*(mobile?.08:.24)-treeBounds.centerX*treeScale,-viewHeight*.17-treeBounds.centerY*treeScale,0);tree.scale.setScalar(treeScale);
      const holeWidth=mobile?viewWidth*.72:Math.min(viewWidth*.40,viewHeight*.65);
      hole.scale.setScalar(holeWidth/32);hole.position.set(viewWidth*(mobile?.12:.26),viewHeight*.28,0);
      starUniforms.uAspect.value=camera.aspect;galaxyUniforms.uAspect.value=camera.aspect;galaxyUniforms.uMobile.value=mobile?1:0;paint(0);
    }
    function paint(dt) {
      parallaxX+=(pointerX-parallaxX)*Math.min(1,dt*5);parallaxY+=(pointerY-parallaxY)*Math.min(1,dt*5);
      pointerStrength+=((time<pointerUntil?1:0)-pointerStrength)*Math.min(1,dt*7);
      jump+=((time<jumpEnd?1:0)-jump)*Math.min(1,dt*(time<jumpEnd?2.6:1.5));boost+=((time<boostEnd?1:0)-boost)*Math.min(1,dt*1.5);
      travel+=dt*(.9+jump*36);starUniforms.uTime.value=time;starUniforms.uTravel.value=travel;starUniforms.uJump.value=jump;
      starUniforms.uPointer.value.set(pointerX,-pointerY);starUniforms.uStrength.value=pointerStrength;starUniforms.uPulse.value=time-pulseStart;
      treeUniforms.uTime.value=time;treeUniforms.uBoost.value=boost;treeUniforms.uPointer.value.set(parallaxX,parallaxY);
      treeUniforms.uOpacity.value=((lightTheme?.95:mobile?.75:.84)+boost*.18)*(1-scrollProgress*.30);
      tree.rotation.y=Math.sin(time*.14)*.025+parallaxX*.38;tree.rotation.z=Math.sin(time*.19)*.008;tree.rotation.x=parallaxY*.21;
      holeUniforms.uTime.value=time;holeUniforms.uOpacity.value=(mobile?.62:.98)*(1-scrollProgress*.60);hole.rotation.z=.10+Math.sin(time*.12)*.012;
      hole.position.x=viewWidth*(mobile?.12:.26)+parallaxX*.12;hole.position.y=viewHeight*.28-parallaxY*.10;
      galaxyUniforms.uTime.value=time;camera.position.x=parallaxX*.22;camera.position.y=-parallaxY*.15;renderer.render(scene,camera);
    }
    function loop(now) {
      frame=0;if(!active())return;
      const dt=Math.min(.05,last?(now-last)/1000:.016);last=now;time+=dt;drawDelta+=dt;
      if(!mobile||now-lastDraw>30){paint(drawDelta);drawDelta=0;lastDraw=now;}
      frame=requestAnimationFrame(loop);
    }
    function syncMotion() {
      if(frame)cancelAnimationFrame(frame);frame=0;last=0;drawDelta=0;host.dataset.moving=String(active());
      if(active())frame=requestAnimationFrame(loop);
      else if(!disposed){jump=0;boost=0;jumpEnd=0;boostEnd=0;pointerStrength=0;pointerUntil=-1;pulseStart=time-10;paint(0);}
    }
    function syncTheme() {
      if(disposed)return;
      lightTheme=root.dataset.theme==='light';
      starUniforms.uLight.value=treeUniforms.uLight.value=galaxyUniforms.uLight.value=lightTheme?1:0;
      const blending=lightTheme?THREE.NormalBlending:THREE.AdditiveBlending;
      themedMaterials.forEach(material=>{if(material.blending!==blending){material.blending=blending;material.needsUpdate=true;}});
      if(!active())paint(0);
    }
    function pulse(x,y) {
      pulseStart=time;starUniforms.uPulseCenter.value.set(x,y);boostEnd=Math.max(boostEnd,time+1.8);
    }
    function trackPointer(x,y,tap=false) {
      if(!active())return;
      pointerX=Math.max(-1,Math.min(1,x/innerWidth*2-1));pointerY=Math.max(-1,Math.min(1,y/innerHeight*2-1));
      pointerUntil=time+.9;
      if(tap)pulse(pointerX,-pointerY);
    }
    try {createStars();createGalaxies();createTree();createBlackHole();syncTheme();resize();}
    catch(_){renderer.dispose();disposed=true;fallback();return;}
    host.dataset.cosmos='webgl';host.dataset.starCount=String(STAR_COUNT);host.dataset.threadCount=String(THREAD_COUNT);host.dataset.branchCount=String(THREAD_COUNT);
    host.dataset.particleCount=String(THREAD_COUNT*POINTS_PER_THREAD);host.dataset.galaxyCount='5';host.dataset.treeStyle='original-temporal-loom';
    window.addEventListener('resize',resize,{passive:true});
    window.addEventListener('pointermove',event=>{if(event.isPrimary!==false)trackPointer(event.clientX,event.clientY);},{passive:true});
    window.addEventListener('pointerdown',event=>{if(event.isPrimary!==false)trackPointer(event.clientX,event.clientY,true);},{passive:true});
    // Browsers cancel pointer streams when native touch scrolling starts. Passive
    // touchmove keeps the background responsive without capturing or blocking it.
    window.addEventListener('touchmove',event=>{if(event.touches.length===1)trackPointer(event.touches[0].clientX,event.touches[0].clientY);},{passive:true});
    if(!('PointerEvent' in window))window.addEventListener('touchstart',event=>{if(event.touches.length===1)trackPointer(event.touches[0].clientX,event.touches[0].clientY,true);},{passive:true});
    window.addEventListener('scroll',()=>{scrollProgress=Math.min(1,scrollY/Math.max(1,innerHeight*1.8));},{passive:true});
    document.addEventListener('visibilitychange',syncMotion);document.addEventListener('portfolio:motionchange',syncMotion);document.addEventListener('portfolio:themechange',syncTheme);
    if(reduced.addEventListener)reduced.addEventListener('change',syncMotion);else reduced.addListener(syncMotion);
    new MutationObserver(mutations=>{
      if(mutations.some(m=>m.attributeName==='data-theme'))syncTheme();
      if(mutations.some(m=>m.attributeName==='data-motion'))syncMotion();
    }).observe(root,{attributes:true,attributeFilter:['data-motion','data-theme']});
    document.addEventListener('cosmos:jump',()=>{if(active())jumpEnd=time+2.8;});
    document.addEventListener('cosmos:tree',()=>{if(active()){pulse(mobile?.16:.48,-.34);boostEnd=time+6;}});
    renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();disposed=true;fallback();});
    syncMotion();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initEntangled,{once:true});else initEntangled();
})();
