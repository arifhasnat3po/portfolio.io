/* Green Yggdrasil branches restored from a17ff6f, with touch and theme support. */
(() => {
  'use strict';
  function initEntangled() {
    const host = document.querySelector('.bg-mesh');
    if (!host || host.dataset.cosmos) return;
    const root = document.documentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const small = innerWidth < 760;
    const dpr = Math.min(devicePixelRatio || 1, small ? 1.25 : 1.65);
    const STAR_COUNT = small ? 1080 : 3000, PARTICLE_COUNT = small ? 260 : 760, SPARK_COUNT = small ? 48 : 80, SPARK_LIFETIME = 1.05;
    let seed = 58021;
    const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
    let renderer, scene, camera, tree, hole, sparks, starUniforms, treeUniforms, holeUniforms, galaxyUniforms, sparkUniforms;
    let frame = 0, time = 0, travel = 0, last = 0, lastDraw = 0, drawDelta = 0;
    let pointerX = 0, pointerY = 0, parallaxX = 0, parallaxY = 0;
    let pointerUntil = -1, pointerStrength = 0, pulseStart = -10, lightTheme = false;
    let jump = 0, jumpEnd = 0, boost = 0, boostEnd = 0;
    let sparkStart = -10, sparkCount = 0, tap = null;
    let viewWidth = 40, viewHeight = 28, disposed = false, scrollProgress = 0, mobile = small;
    const branches = [], themedMaterials = [];
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
      const recolor=()=>svg.querySelectorAll('path').forEach(path=>path.setAttribute('stroke',root.dataset.theme==='light'?'#235c42':'#a9d5ab'));
      recolor();document.addEventListener('portfolio:themechange',recolor);
    }
    makeBranches();
    if (typeof THREE === 'undefined') { fallback(); return; }
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !small, powerPreference: 'low-power' });
      renderer.setPixelRatio(dpr); renderer.setClearColor(0x060908, 0);
      renderer.domElement.setAttribute('aria-hidden', 'true'); renderer.domElement.className = 'cosmos-canvas'; host.appendChild(renderer.domElement);
      scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, .1, 180); camera.position.z = 42;
    } catch (_) { fallback(); return; }
    const raycaster=new THREE.Raycaster(),hitPointer=new THREE.Vector2(),holeProjection=new THREE.Vector3();
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
    const bendShader=`vec3 bend(vec3 p){float h=smoothstep(-3.8,9.0,p.y);p.x+=(sin(uTime*.47+p.y*.23)*.14+uPointer.x*.60)*h;p.z+=(cos(uTime*.36+p.y*.19)*.11+uPointer.y*.40)*h;return p;}
      float energy(vec3 p){return exp(-pow((length(p.xy-vec2(0.0,-1.0))/12.0-uPulse*.85)*7.0,2.0))*max(0.0,1.0-uPulse/1.5);}`;
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
      treeUniforms={uTime:{value:0},uOpacity:{value:small?.48:.84},uBoost:{value:0},uDpr:{value:dpr},uLight:{value:0},uPointer:{value:new THREE.Vector2()},uPulse:starUniforms.uPulse};
      const g=geometry(new Float32Array(positions),new Float32Array(colors),null,new Float32Array(phases));
      g.setAttribute('flow',new THREE.BufferAttribute(new Float32Array(flows),1));
      g.computeBoundingBox();
      const bounds=g.boundingBox;
      treeBounds={centerX:(bounds.min.x+bounds.max.x)/2,centerY:(bounds.min.y+bounds.max.y)/2,width:bounds.max.x-bounds.min.x,height:bounds.max.y-bounds.min.y};
      const lines=new THREE.LineSegments(g,new THREE.ShaderMaterial({
        uniforms:treeUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
        vertexShader:`attribute vec3 color;attribute float phase,flow;uniform float uTime,uLight,uPulse;uniform vec2 uPointer;varying vec3 vColor;varying float vFlow,vPulse;${bendShader}
          void main(){vColor=mix(color,vec3(.035,.16,.075)+color*.22,uLight);vFlow=pow(.5+.5*sin(flow*8.0-uTime*2.1+phase),12.0);vPulse=energy(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(bend(position),1.0);}`,
        fragmentShader:`uniform float uOpacity,uBoost;varying vec3 vColor;varying float vFlow,vPulse;void main(){gl_FragColor=vec4(vColor*(.8+vFlow*.9),uOpacity*(.38+vFlow*.60+vPulse*.25)+uBoost*.22);}`
      }));lines.frustumCulled=false;tree.add(lines);themedMaterials.push(lines.material);
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
        vertexShader:`attribute vec3 curveA,curveB,curveC,curveD;attribute float phase,speed,pointSize;uniform float uTime,uDpr,uBoost,uOpacity,uLight,uPulse;uniform vec2 uPointer;varying float vAlpha;varying vec3 vColor;${bendShader}
          void main(){float t=fract(phase+uTime*speed),u=1.0-t;vec3 p=u*u*u*curveA+3.0*u*u*t*curveB+3.0*u*t*t*curveC+t*t*t*curveD;
            p.z+=sin(phase*72.0+uTime)*.10;float pulse=energy(p);vec4 mv=modelViewMatrix*vec4(bend(p),1.0);gl_Position=projectionMatrix*mv;gl_PointSize=pointSize*uDpr*(42.0/-mv.z)*(1.0+uBoost*.5+pulse*.6);
            vAlpha=sin(t*3.14159)*uOpacity*(1.0+pulse*.45);vColor=mix(vec3(.47,.88,.55),vec3(.95,.98,.80),phase);vColor=mix(vColor,vec3(.03,.18,.08)+vColor*.18,uLight);}`,
        fragmentShader:`varying float vAlpha;varying vec3 vColor;void main(){float r=length(gl_PointCoord-.5)*2.0;if(r>1.0)discard;gl_FragColor=vec4(vColor,(exp(-r*r*7.0)+pow(1.0-r,3.0)*.4)*vAlpha);}`
      }));particles.frustumCulled=false;tree.add(particles);themedMaterials.push(particles.material);scene.add(tree);
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
      const positions=[],velocities=[],colors=[],sizes=[];
      for(let i=0;i<SPARK_COUNT;i++){
        const angle=i/SPARK_COUNT*Math.PI*2+(random()-.5)*.25,speed=7+random()*10,rim=3.4+random()*.6;
        positions.push(Math.cos(angle)*rim,Math.sin(angle)*rim,.05);
        velocities.push(Math.cos(angle)*speed,Math.sin(angle)*speed*(.45+random()*.55),(random()-.5)*3);
        colors.push(...(i%3===0?[.28,.86,1]:[1,.63+random()*.25,.28]));sizes.push(2.5+random()*4);
      }
      sparkUniforms={uAge:{value:10},uDpr:starUniforms.uDpr,uLight:starUniforms.uLight,uOrigin:{value:new THREE.Vector3()}};
      const sparkGeometry=geometry(new Float32Array(positions),new Float32Array(colors),new Float32Array(sizes));
      sparkGeometry.setAttribute('velocity',new THREE.BufferAttribute(new Float32Array(velocities),3));
      sparks=new THREE.Points(sparkGeometry,new THREE.ShaderMaterial({
        uniforms:sparkUniforms,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
        vertexShader:`attribute vec3 color,velocity;attribute float pointSize;uniform float uAge,uDpr,uLight;uniform vec3 uOrigin;varying vec3 vColor;varying float vAlpha;
          void main(){float age=clamp(uAge,0.0,1.05),fade=max(0.0,1.0-uAge/1.05);vec3 p=uOrigin+position+velocity*(age-age*age*.24);
            p.y-=age*age*.7;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
            gl_PointSize=clamp(pointSize*uDpr*(42.0/-mv.z)*(.65+fade*.7),1.5,9.0*uDpr);
            vColor=mix(color,color*.38+vec3(.06,.03,.015),uLight);vAlpha=fade*fade*.95;}`,
        fragmentShader:`varying vec3 vColor;varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.0;if(r>1.0)discard;
          gl_FragColor=vec4(vColor,(exp(-r*r*4.5)+pow(1.0-r,3.0)*.5)*vAlpha);}`
      }));sparks.frustumCulled=false;sparks.visible=false;sparks.renderOrder=7;hole.add(sparks);themedMaterials.push(sparks.material);
    }
    function resize() {
      if(disposed)return;mobile=innerWidth<760;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
      viewHeight=2*Math.tan(46*Math.PI/360)*camera.position.z;viewWidth=viewHeight*camera.aspect;
      // Fit the complete crown and roots, leaving room for pointer bending.
      const treeScale=mobile?Math.min(viewHeight*.43/(treeBounds.height*1.22),viewWidth*.78/(treeBounds.width*1.22)):
        Math.min(viewHeight*.44/(treeBounds.height*1.10),viewWidth*.43/(treeBounds.width*1.10));
      tree.position.set(viewWidth*(mobile?.08:.24)-treeBounds.centerX*treeScale,-viewHeight*.17-treeBounds.centerY*treeScale,0);tree.scale.setScalar(treeScale);
      const holeWidth=.8*(mobile?viewWidth*.72:Math.min(viewWidth*.40,viewHeight*.65));
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
      holeUniforms.uTime.value=time;holeUniforms.uOpacity.value=(lightTheme?(mobile?.16:.24):(mobile?.62:.98))*(1-scrollProgress*.60);hole.rotation.z=.10+Math.sin(time*.12)*.012;
      hole.position.x=viewWidth*((mobile?.12:.26)+Math.sin(time*.34)*.035)+parallaxX*.12;
      hole.position.y=viewHeight*(.28+Math.sin(time*.24)*.018)-parallaxY*.10;
      sparkUniforms.uAge.value=time-sparkStart;sparks.visible=sparkUniforms.uAge.value<SPARK_LIFETIME;
      galaxyUniforms.uTime.value=time;camera.position.x=parallaxX*.22;camera.position.y=-parallaxY*.15;renderer.render(scene,camera);
      // Read-only coordinates let the visible horizon control and browser QA
      // locate the drifting center without duplicating its projection math.
      hole.getWorldPosition(holeProjection).project(camera);
      const screenX=String(Math.round((holeProjection.x+1)*innerWidth/2)),screenY=String(Math.round((1-holeProjection.y)*innerHeight/2));
      if(host.dataset.blackHoleScreenX!==screenX)host.dataset.blackHoleScreenX=screenX;
      if(host.dataset.blackHoleScreenY!==screenY)host.dataset.blackHoleScreenY=screenY;
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
      else if(!disposed){jump=0;boost=0;jumpEnd=0;boostEnd=0;pointerStrength=0;pointerUntil=-1;pulseStart=time-10;sparkStart=time-10;tap=null;paint(0);}
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
    function sparkBurst(origin) {
      if(!active())return;
      if(origin)sparkUniforms.uOrigin.value.copy(origin);else sparkUniforms.uOrigin.value.set(0,0,.05);
      sparkStart=time;host.dataset.blackHoleSparkCount=String(++sparkCount);
    }
    function hitBlackHole(x,y) {
      hitPointer.set(x/innerWidth*2-1,1-y/innerHeight*2);
      camera.updateMatrixWorld();hole.updateWorldMatrix(true,false);raycaster.setFromCamera(hitPointer,camera);
      const hit=raycaster.intersectObject(hole,false)[0];if(!hit?.uv)return;
      // Match the shader's central lens and flattened accretion disk, not the
      // transparent corners of its rectangular mesh. Rotation/scale are raycast.
      const px=(hit.uv.x-.5)*6.4,py=(hit.uv.y-.5)*3.2;
      if(Math.hypot(px,py)<.83||Math.hypot(px,(py+.035)*6.1)<2.8)sparkBurst(hole.worldToLocal(hit.point));
    }
    const isControl=target=>Boolean(target?.closest?.('a,button,input,textarea,select,summary,[role="button"],[role="link"],[contenteditable]:not([contenteditable="false"]),dialog,video,audio,iframe'));
    function beginTap(id,x,y,target,stamp) {
      tap=active()&&!isControl(target)?{id,x,y,stamp,scroll:scrollY}:null;
    }
    function moveTap(id,x,y) {
      if(tap&&tap.id===id&&Math.hypot(x-tap.x,y-tap.y)>9)tap=null;
    }
    function endTap(id,x,y,target,stamp) {
      const candidate=tap;tap=null;
      if(!candidate||candidate.id!==id||!active()||isControl(target)||stamp-candidate.stamp>650||Math.abs(scrollY-candidate.scroll)>2||Math.hypot(x-candidate.x,y-candidate.y)>9)return;
      trackPointer(x,y,true);hitBlackHole(x,y);
    }
    try {createStars();createGalaxies();createTree();createBlackHole();syncTheme();resize();}
    catch(_){renderer.dispose();disposed=true;fallback();return;}
    host.dataset.cosmos='webgl';host.dataset.starCount=String(STAR_COUNT);host.dataset.branchCount=String(branches.length);
    host.dataset.particleCount=String(PARTICLE_COUNT);host.dataset.galaxyCount='5';host.dataset.treeStyle='green-branching-tree';
    host.dataset.blackHoleSparkCount='0';host.dataset.blackHoleSparkParticles=String(SPARK_COUNT);
    window.addEventListener('resize',resize,{passive:true});
    window.addEventListener('pointermove',event=>{if(event.isPrimary!==false){trackPointer(event.clientX,event.clientY);moveTap(event.pointerId,event.clientX,event.clientY);}},{passive:true});
    window.addEventListener('pointerdown',event=>{
      if(event.isPrimary===false||event.button>0){tap=null;return;}
      trackPointer(event.clientX,event.clientY);beginTap(event.pointerId,event.clientX,event.clientY,event.target,event.timeStamp);
    },{passive:true});
    window.addEventListener('pointerup',event=>endTap(event.pointerId,event.clientX,event.clientY,event.target,event.timeStamp),{passive:true});
    window.addEventListener('pointercancel',()=>{tap=null;},{passive:true});
    // Browsers cancel pointer streams when native touch scrolling starts. Passive
    // touchmove keeps the background responsive without capturing or blocking it.
    window.addEventListener('touchmove',event=>{
      if(event.touches.length!==1){tap=null;return;}
      const touch=event.touches[0];trackPointer(touch.clientX,touch.clientY);
      if(tap&&Math.hypot(touch.clientX-tap.x,touch.clientY-tap.y)>9)tap=null;
    },{passive:true});
    if(!('PointerEvent' in window)){
      window.addEventListener('touchstart',event=>{
        if(event.touches.length!==1){tap=null;return;}
        const touch=event.touches[0];trackPointer(touch.clientX,touch.clientY);beginTap(touch.identifier,touch.clientX,touch.clientY,event.target,event.timeStamp);
      },{passive:true});
      window.addEventListener('touchend',event=>{
        const touch=Array.from(event.changedTouches).find(item=>item.identifier===tap?.id);
        if(touch)endTap(touch.identifier,touch.clientX,touch.clientY,event.target,event.timeStamp);
      },{passive:true});
      window.addEventListener('touchcancel',()=>{tap=null;},{passive:true});
    }
    window.addEventListener('scroll',()=>{tap=null;scrollProgress=Math.min(1,scrollY/Math.max(1,innerHeight*1.8));},{passive:true});
    document.addEventListener('click',event=>{if(event.target?.closest?.('[data-easter-egg="blackhole"]'))sparkBurst();});
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
