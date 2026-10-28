/* Yggdrasil / the observatory. Local Three.js; no textures or network requests. */
(() => {
  'use strict';
  function initEntangled() {
    const host = document.querySelector('.bg-mesh');
    if (!host || host.dataset.cosmos) return;
    const root = document.documentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const small = innerWidth < 760;
    const dpr = Math.min(devicePixelRatio || 1, small ? 1.25 : 1.65);
    const STAR_COUNT = small ? 1080 : 3000, PARTICLE_COUNT = small ? 260 : 760;
    let seed = 58021;
    const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
    let renderer, scene, camera, tree, hole, starUniforms, treeUniforms, holeUniforms, galaxyUniforms;
    let frame = 0, time = 0, travel = 0, last = 0, lastDraw = 0, drawDelta = 0;
    let pointerX = 0, pointerY = 0, parallaxX = 0, parallaxY = 0;
    let jump = 0, jumpEnd = 0, boost = 0, boostEnd = 0;
    let viewWidth = 40, viewHeight = 28, disposed = false, scrollProgress = 0, mobile = small;
    const branches = [];
    let treeBounds = {centerX:0,centerY:0,width:25,height:22};
    const active = () => !disposed && !document.hidden && !reduced.matches && root.dataset.motion !== 'off';

    function fallback() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0; host.dataset.cosmos = 'fallback'; host.dataset.moving = 'false';
      if (host.querySelector('.cosmos-fallback')) return;
      const sky = document.createElement('div'); sky.className = 'cosmos-fallback';
      const blackHole = document.createElement('i'); blackHole.className = 'cosmos-fallback-hole'; sky.appendChild(blackHole);
      const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '-13 -12 26 25'); svg.setAttribute('class', 'cosmos-fallback-tree'); svg.setAttribute('aria-hidden', 'true');
      branches.forEach(curve => {
        const p=document.createElementNS(ns,'path');
        p.setAttribute('d',`M ${curve.a[0]} ${-curve.a[1]} C ${curve.b[0]} ${-curve.b[1]},${curve.c[0]} ${-curve.c[1]},${curve.d[0]} ${-curve.d[1]}`);
        p.setAttribute('fill','none');p.setAttribute('stroke','#a9d5ab');p.setAttribute('stroke-width',String(Math.max(.025,curve.width*.42)));
        p.setAttribute('stroke-opacity',curve.trunk?'.8':'.5');svg.appendChild(p);
      });
      sky.appendChild(svg); host.appendChild(sky);
    }
    makeBranches();
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
      starUniforms = { uTime: { value: 0 }, uTravel: { value: 0 }, uJump: { value: 0 }, uDpr: { value: dpr } };
      const stars = new THREE.Points(geometry(pos, colors, sizes, phases), new THREE.ShaderMaterial({
        uniforms: starUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute vec3 color; attribute float pointSize; attribute float phase;
          uniform float uTime,uTravel,uDpr; varying vec3 vColor; varying float vAlpha;
          void main(){vec3 p=position;p.z=-55.0+mod(p.z+uTravel,90.0);
            p.x+=sin(uTime*.045+phase)*.7;p.y+=cos(uTime*.035+phase)*.35;
            vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
            gl_PointSize=clamp(pointSize*uDpr*(32.0/-mv.z),1.8,7.0*uDpr);
            vColor=color;vAlpha=(.85+.15*sin(uTime*.7+phase))*smoothstep(3.0,9.0,-mv.z);}`,
        fragmentShader: `varying vec3 vColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float glow=exp(-d*d*32.0)+pow(1.0-d*2.0,2.0)*.35;gl_FragColor=vec4(vColor,glow*vAlpha);}`
      }));
      stars.frustumCulled = false; scene.add(stars);
      const streaks = geometry(streakPos); streaks.setAttribute('edge', new THREE.BufferAttribute(edges, 1));
      const trails = new THREE.LineSegments(streaks, new THREE.ShaderMaterial({
        uniforms: starUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute float edge;uniform float uTravel,uJump;varying float vAlpha;
          void main(){vec3 p=position;p.z=-55.0+mod(p.z+uTravel,90.0)-edge*uJump*17.0;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);vAlpha=uJump*(1.0-edge*.85);}`,
        fragmentShader: `varying float vAlpha;void main(){gl_FragColor=vec4(.85,.94,.83,vAlpha*.55);}`
      }));
      trails.frustumCulled = false; scene.add(trails);
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
      galaxyUniforms={uTime:{value:0},uAspect:{value:innerWidth/innerHeight},uMobile:{value:small?1:0}};
      const galaxies=new THREE.Mesh(g,new THREE.ShaderMaterial({
        uniforms:galaxyUniforms,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
        vertexShader:`attribute vec2 center;attribute float extent,phase;uniform float uAspect,uMobile;varying vec2 vUv;varying float vPhase;
          void main(){vUv=position.xy;vPhase=phase;vec2 c=vec2(center.x*2.0-1.0,1.0-center.y*2.0);float scale=mix(1.0,.57,uMobile);gl_Position=vec4(c+position.xy*extent*scale*vec2(1.0/uAspect,1.0),.98,1.0);}`,
        fragmentShader:`uniform float uTime;varying vec2 vUv;varying float vPhase;
          float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          void main(){float rot=vPhase+.12*sin(uTime*.045);vec2 p=mat2(cos(rot),-sin(rot),sin(rot),cos(rot))*vUv;p.y*=1.9;
            float r=length(p),a=atan(p.y,p.x);float spiral=pow(.5+.5*cos(a*2.0+log(r+.09)*5.6-uTime*.13+vPhase),7.0);
            float disk=exp(-r*3.9)*(.16+spiral*.85),core=exp(-r*r*85.0)*.82,grain=.6+.4*hash(floor(p*140.0));
            float light=(disk*grain+core)*(1.0-smoothstep(.65,1.0,length(vUv)))*(.9+.1*sin(uTime*.7+vPhase));
            vec3 dust=mix(vec3(.48,.66,.57),vec3(.85,.75,.52),.5+.5*sin(vPhase));vec3 color=mix(dust,vec3(.96,.90,.72),core);gl_FragColor=vec4(color,light*.78);}`
      }));galaxies.frustumCulled=false;galaxies.renderOrder=1;scene.add(galaxies);
    }
    function curvePoint(curve,t) {
      const u=1-t;
      return [0,1,2].map(i=>u*u*u*curve.a[i]+3*u*u*t*curve.b[i]+3*u*t*t*curve.c[i]+t*t*t*curve.d[i]);
    }
    function makeBranches() {
      const trunk={a:[0,-3.9,0],b:[-1.2,-1.6,.25],c:[1.25,.7,-.15],d:[-.15,2.65,0],width:.66,phase:.5,trunk:true};
      branches.push(trunk);
      function fork(start,angle,length,depth,width,isRoot=false) {
        const end=[start[0]+Math.cos(angle)*length,start[1]+Math.sin(angle)*length,start[2]+(random()-.5)*length*.32];
        const curve={a:start,b:[start[0]+Math.cos(angle+.2)*length*.34,start[1]+Math.sin(angle+.2)*length*.34,start[2]],
          c:[end[0]-Math.cos(angle-.2)*length*.27,end[1]-Math.sin(angle-.2)*length*.27+(isRoot?-.22:.22),end[2]],d:end,width,phase:random()*6.283,trunk:false};
        branches.push(curve);
        if(!depth)return;
        const split=.26+random()*.23;
        fork(end,angle+split,length*(.62+random()*.10),depth-1,width*.59,isRoot);
        fork(end,angle-split*.90,length*(.60+random()*.13),depth-1,width*.56,isRoot);
      }
      [[.43,164,4.45],[.62,142,4.1],[.80,119,4.0],[1,102,3.7],[1,77,3.9],[.83,55,4.15],[.60,32,4.5],[.38,12,4.25]].forEach(([t,deg,length])=>fork(curvePoint(trunk,t),deg*Math.PI/180,length,3,.32));
      [-170,-148,-126,-103,-77,-53,-31,-10].forEach((deg,i)=>fork([Math.sin(i)*.17,-3.6,0],deg*Math.PI/180,3.2+(i%3)*.35,2,.30,true));
    }
    const bendShader=`vec3 bend(vec3 p){float h=smoothstep(-3.8,9.0,p.y);p.x+=sin(uTime*.47+p.y*.23)*h*.14;p.z+=cos(uTime*.36+p.y*.19)*h*.11;return p;}`;
    function createTree() {
      tree=new THREE.Group();const positions=[],colors=[],phases=[],flows=[];
      branches.forEach(curve=>{
        const strands=curve.trunk?(small?22:38):Math.max(2,Math.round(curve.width*(small?29:43))),steps=curve.trunk?36:18;
        for(let strand=0;strand<strands;strand++){
          const phase=strand/strands*6.283+curve.phase,silver=strand%6===0,shade=.66+random()*.34;
          const color=silver?[.75*shade,.85*shade,.68*shade]:[.31*shade,.69*shade,.40*shade];let previous=null;
          for(let j=0;j<=steps;j++){
            const t=j/steps,p=curvePoint(curve,t),near=curvePoint(curve,Math.min(1,t+.01));
            const dx=near[0]-p[0],dy=near[1]-p[1],norm=Math.hypot(dx,dy)||1,turn=phase+t*(curve.trunk?9:2.5),width=curve.width*(1-t*.67);
            const ripple=Math.sin(t*12+phase)*width*.12;
            p[0]+=(-dy/norm)*Math.cos(turn)*width+ripple;p[1]+=(dx/norm)*Math.cos(turn)*width;p[2]+=Math.sin(turn)*width;
            if(previous){positions.push(...previous,...p);colors.push(...color,...color);phases.push(curve.phase,curve.phase);flows.push((j-1)/steps,t);}
            previous=p;
          }
        }
      });
      treeUniforms={uTime:{value:0},uOpacity:{value:small?.48:.84},uBoost:{value:0},uDpr:{value:dpr}};
      const g=geometry(new Float32Array(positions),new Float32Array(colors),null,new Float32Array(phases));
      g.setAttribute('flow',new THREE.BufferAttribute(new Float32Array(flows),1));
      g.computeBoundingBox();
      const bounds=g.boundingBox;
      treeBounds={centerX:(bounds.min.x+bounds.max.x)/2,centerY:(bounds.min.y+bounds.max.y)/2,width:bounds.max.x-bounds.min.x,height:bounds.max.y-bounds.min.y};
      const lines=new THREE.LineSegments(g,new THREE.ShaderMaterial({
        uniforms:treeUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
        vertexShader:`attribute vec3 color;attribute float phase,flow;uniform float uTime;varying vec3 vColor;varying float vFlow;${bendShader}
          void main(){vColor=color;vFlow=pow(.5+.5*sin(flow*8.0-uTime*2.1+phase),12.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(bend(position),1.0);}`,
        fragmentShader:`uniform float uOpacity,uBoost;varying vec3 vColor;varying float vFlow;void main(){gl_FragColor=vec4(vColor*(.8+vFlow*.9),uOpacity*(.38+vFlow*.60)+uBoost*.22);}`
      }));lines.frustumCulled=false;tree.add(lines);
      const pos=[],a=[],b=[],c=[],d=[],phase=[],speed=[],size=[];
      for(let i=0;i<PARTICLE_COUNT;i++){
        const branch=branches[Math.floor(random()*branches.length)];pos.push(0,0,0);a.push(...branch.a);b.push(...branch.b);c.push(...branch.c);d.push(...branch.d);
        phase.push(random());speed.push(.06+random()*.12);size.push(1.8+Math.pow(random(),3)*3.2);
      }
      const pg=geometry(new Float32Array(pos),null,new Float32Array(size),new Float32Array(phase));
      [['curveA',a],['curveB',b],['curveC',c],['curveD',d]].forEach(([name,values])=>pg.setAttribute(name,new THREE.BufferAttribute(new Float32Array(values),3)));
      pg.setAttribute('speed',new THREE.BufferAttribute(new Float32Array(speed),1));
      const particles=new THREE.Points(pg,new THREE.ShaderMaterial({
        uniforms:treeUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
        vertexShader:`attribute vec3 curveA,curveB,curveC,curveD;attribute float phase,speed,pointSize;uniform float uTime,uDpr,uBoost,uOpacity;varying float vAlpha;varying vec3 vColor;${bendShader}
          void main(){float t=fract(phase+uTime*speed),u=1.0-t;vec3 p=u*u*u*curveA+3.0*u*u*t*curveB+3.0*u*t*t*curveC+t*t*t*curveD;
            p.z+=sin(phase*72.0+uTime)*.10;vec4 mv=modelViewMatrix*vec4(bend(p),1.0);gl_Position=projectionMatrix*mv;gl_PointSize=pointSize*uDpr*(42.0/-mv.z)*(1.0+uBoost*.5);
            vAlpha=sin(t*3.14159)*uOpacity;vColor=mix(vec3(.47,.88,.55),vec3(.95,.98,.80),phase);}`,
        fragmentShader:`varying float vAlpha;varying vec3 vColor;void main(){float r=length(gl_PointCoord-.5)*2.0;if(r>1.0)discard;gl_FragColor=vec4(vColor,(exp(-r*r*7.0)+pow(1.0-r,3.0)*.4)*vAlpha);}`
      }));particles.frustumCulled=false;tree.add(particles);scene.add(tree);
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
      // Fit the measured crown-to-root extent, leaving room for depth and bending.
      const treeScale=mobile?viewHeight*.40/(treeBounds.height*1.10):Math.min(viewHeight*.44/(treeBounds.height*1.10),viewWidth*.43/(treeBounds.width*1.10));
      tree.position.set(viewWidth*(mobile?.46:.24)-treeBounds.centerX*treeScale,-viewHeight*.17-treeBounds.centerY*treeScale,0);tree.scale.setScalar(treeScale);
      const holeWidth=mobile?viewWidth*.63:Math.min(viewWidth*.43,viewHeight*.73);
      hole.scale.setScalar(holeWidth/32);hole.position.set(viewWidth*(mobile?.40:.26),viewHeight*.25,0);
      galaxyUniforms.uAspect.value=camera.aspect;galaxyUniforms.uMobile.value=mobile?1:0;paint(0);
    }
    function paint(dt) {
      parallaxX+=(pointerX-parallaxX)*Math.min(1,dt*2.5);parallaxY+=(pointerY-parallaxY)*Math.min(1,dt*2.5);
      jump+=((time<jumpEnd?1:0)-jump)*Math.min(1,dt*(time<jumpEnd?2.6:1.5));boost+=((time<boostEnd?1:0)-boost)*Math.min(1,dt*1.5);
      travel+=dt*(.9+jump*36);starUniforms.uTime.value=time;starUniforms.uTravel.value=travel;starUniforms.uJump.value=jump;
      treeUniforms.uTime.value=time;treeUniforms.uBoost.value=boost;treeUniforms.uOpacity.value=((mobile?.43:.84)+boost*.22)*(1-scrollProgress*.60);
      tree.rotation.y=Math.sin(time*.14)*.07+parallaxX*.045;tree.rotation.z=Math.sin(time*.19)*.008;tree.rotation.x=parallaxY*.025;
      holeUniforms.uTime.value=time;holeUniforms.uOpacity.value=(mobile?.62:.98)*(1-scrollProgress*.60);hole.rotation.z=.10+Math.sin(time*.12)*.012;
      hole.position.x=viewWidth*(mobile?.40:.26)+parallaxX*.12;hole.position.y=viewHeight*.25-parallaxY*.10;
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
      else if(!disposed){jump=0;boost=0;jumpEnd=0;boostEnd=0;paint(0);}
    }
    try {createStars();createGalaxies();createTree();createBlackHole();resize();}
    catch(_){renderer.dispose();disposed=true;fallback();return;}
    host.dataset.cosmos='webgl';host.dataset.starCount=String(STAR_COUNT);host.dataset.branchCount=String(branches.length);host.dataset.particleCount=String(PARTICLE_COUNT);host.dataset.galaxyCount='5';
    window.addEventListener('resize',resize,{passive:true});
    window.addEventListener('pointermove',event=>{if(!active()||event.pointerType==='touch')return;pointerX=event.clientX/innerWidth*2-1;pointerY=event.clientY/innerHeight*2-1;},{passive:true});
    window.addEventListener('scroll',()=>{scrollProgress=Math.min(1,scrollY/Math.max(1,innerHeight*1.8));},{passive:true});
    document.addEventListener('visibilitychange',syncMotion);document.addEventListener('portfolio:motionchange',syncMotion);reduced.addEventListener('change',syncMotion);
    new MutationObserver(syncMotion).observe(root,{attributes:true,attributeFilter:['data-motion']});
    document.addEventListener('cosmos:jump',()=>{if(active())jumpEnd=time+2.8;});
    document.addEventListener('cosmos:tree',()=>{if(active())boostEnd=time+6;});
    renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();disposed=true;fallback();});
    syncMotion();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initEntangled,{once:true});else initEntangled();
})();
