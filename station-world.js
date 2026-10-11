import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import META from './hangar_meta.json'
import SEED_ART from './seed.json'
import { posterCanvas, openWallCanvas, textTexture } from './art.js'

export { SEED_ART }
export const GAMES = [
  { id: 'memory', name: 'Memory Match', hue: '#74d9ff', blurb: 'Pair six works from the collection' },
  { id: 'coins', name: 'Crystal Rush', hue: '#ff9b54', blurb: 'Collect the scattered energy before time runs out' },
  { id: 'memes', name: 'Meme Hunt', hue: '#c5a6ff', blurb: 'Find five hidden station plaques' },
]
export const SUIT_COLORS = ['#f28e50','#4dbbe9','#a989ef','#e5cf7a','#e56e85','#74c99c']
export const VISOR_COLORS = ['#71dfff','#efad65','#b9a9ff','#b5ead5']
const clamp = THREE.MathUtils.clamp
const rad = Math.PI / 180
const asset = (id, name) => `/app-assets/by-id/${id}/${name}`
const rand = (a, b) => a + Math.random() * (b - a)
const ease = (t) => t * t * (3 - 2 * t)

function stars(scene, count, inner = 900, outer = 1300) {
  const points = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(rand(inner, outer))
    points.set([v.x, v.y, v.z], i * 3)
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(points, 3))
  const mesh = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 1.6, sizeAttenuation: false, fog: false }))
  scene.add(mesh); return mesh
}
function makePlanet(scene, position, radius) {
  const group = new THREE.Group(); group.position.copy(position)
  group.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), new THREE.MeshBasicMaterial({ color: 0x2a4f86, fog: false })))
  group.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 1.055, 32, 24), new THREE.MeshBasicMaterial({ color: 0x5fa8ff, transparent: true, opacity: .25, side: THREE.BackSide, fog: false, blending: THREE.AdditiveBlending, depthWrite: false })))
  scene.add(group); return group
}
function panelTexture(item, source, width = 512) {
  const base = source || posterCanvas(item), canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = Math.round(width * 1.38)
  const c = canvas.getContext('2d'), h = canvas.height
  c.fillStyle = '#06131d'; c.fillRect(0, 0, width, h)
  const iw = base.naturalWidth || base.width, ih = base.naturalHeight || base.height
  const scale = Math.min((width - 34) / iw, (h - 110) / ih), w = iw * scale, hh = ih * scale
  c.drawImage(base, (width - w) / 2, 18 + (h - 110 - hh) / 2, w, hh)
  c.fillStyle = 'rgba(3,12,19,.91)'; c.fillRect(0, h - 92, width, 92)
  c.fillStyle = '#7fddff'; c.font = '600 15px monospace'; c.fillText('HACKATHON STATION   /   ART', 22, h - 63)
  c.fillStyle = '#f5fafb'; c.font = '700 25px sans-serif'; c.fillText(item.title || 'OPEN SLOT', 22, h - 26, width - 44)
  c.fillStyle = 'rgba(150,220,240,.12)'; for (let y = 0; y < h; y += 6) c.fillRect(0, y, width, 1)
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2; return t
}
function boardTexture(title, lines, accent = '#77dcff') {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 700
  const x = c.getContext('2d'); x.fillStyle = 'rgba(3,15,27,.88)'; x.fillRect(0, 0, c.width, c.height)
  x.strokeStyle = accent; x.lineWidth = 5; x.strokeRect(12, 12, 1000, 676)
  x.fillStyle = accent; x.font = '700 42px monospace'; x.fillText(title, 58, 95)
  x.font = '26px monospace'; lines.slice(0, 8).forEach((line, i) => { x.fillStyle = i === 0 ? '#fff3d2' : '#b6dce7'; x.fillText(line, 58, 158 + i * 59, 900) })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
function disposeGroup(root) {
  root?.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) for (const m of [].concat(o.material)) { m.map?.dispose(); m.dispose() } })
}
function pilotBust(pilot) {
  const group = new THREE.Group(), suit = new THREE.Color(pilot.suitColor || SUIT_COLORS[0]), visor = new THREE.Color(pilot.visorColor || VISOR_COLORS[0])
  const shell = new THREE.MeshPhysicalMaterial({ color: suit, metalness: .42, roughness: .25, clearcoat: 1, clearcoatRoughness: .1 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x102538, metalness: .65, roughness: .3 })
  const glass = new THREE.MeshPhysicalMaterial({ color: visor, metalness: .12, roughness: .08, transparent: true, opacity: .9, clearcoat: 1, emissive: visor, emissiveIntensity: .27 })
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), shell); torso.scale.set(1.15, .62, .63); torso.position.y = .22; group.add(torso)
  for (const s of [-1,1]) { const shoulder = new THREE.Mesh(new THREE.SphereGeometry(.46, 20, 12), shell); shoulder.position.set(s*.92,.32,0); shoulder.scale.set(1.15,.75,.85); group.add(shoulder) }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.28,.36,.45,18), dark); neck.position.y=.75; group.add(neck)
  const shape = pilot.helmet || 0
  let helmet
  if (shape === 0) helmet = new THREE.Mesh(new THREE.SphereGeometry(.72, 32, 24), shell)
  else if (shape === 1) helmet = new THREE.Mesh(new THREE.CylinderGeometry(.57,.72,1.15,12,1), shell)
  else helmet = new THREE.Mesh(new THREE.IcosahedronGeometry(.77,1), shell)
  helmet.position.y=1.32; helmet.scale.z=.9; group.add(helmet)
  const underplate = new THREE.Mesh(new THREE.SphereGeometry(.58,32,16),dark);underplate.position.set(0,1.38,.59);underplate.scale.set(1,.58,.32);group.add(underplate)
  const face = new THREE.Mesh(new THREE.SphereGeometry(.56, 32, 16), glass); face.position.set(0,1.4,.69); face.scale.set(1,.56,.32); group.add(face)
  const brow = new THREE.Mesh(new THREE.TorusGeometry(.56,.024,8,30,Math.PI), dark); brow.position.set(0,1.57,.84); brow.rotation.z=Math.PI; group.add(brow)
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(.12,.8,.13), dark); ridge.position.set(0,1.4,-.67); group.add(ridge)
  const decal = document.createElement('canvas'); decal.width=decal.height=128; const ctx=decal.getContext('2d')
  ctx.strokeStyle='#ffffff';ctx.fillStyle='#ffffff';ctx.lineWidth=8;ctx.translate(64,64); const mark=pilot.insignia || 0
  if(mark===0){ctx.beginPath();ctx.arc(0,0,28,0,7);ctx.stroke();ctx.fillRect(-4,-35,8,70)}
  if(mark===1){ctx.beginPath();ctx.moveTo(0,-38);ctx.lineTo(34,27);ctx.lineTo(-34,27);ctx.closePath();ctx.stroke()}
  if(mark===2){for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillRect(-6,-36,12,28)}}
  if(mark===3){ctx.strokeRect(-29,-29,58,58);ctx.rotate(Math.PI/4);ctx.strokeRect(-17,-17,34,34)}
  if(mark===4){ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*1.5);ctx.stroke();ctx.fillRect(12,-35,11,13)}
  if(mark===5){ctx.beginPath();ctx.moveTo(-32,20);ctx.lineTo(0,-30);ctx.lineTo(32,20);ctx.stroke()}
  const tex = new THREE.CanvasTexture(decal); const badge=new THREE.Mesh(new THREE.PlaneGeometry(.39,.39),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));badge.position.set(0,.35,.63);group.add(badge)
  group.userData.materials=[shell,dark,glass]; return group
}

export function createStationWorld(mount, appId, callbacks={}) {
  let disposed=false, mode='intro', art=[], loadMedia=null, page=0, clock=0, last=performance.now(), flightClock=0, dockClock=0, dockCurve=null, revealClock=99, introClock=0, score=0, shield=100, boost=100, crystalHits=0, pilot={callsign:'PILOT',helmet:0,suitColor:SUIT_COLORS[0],visorColor:VISOR_COLORS[0],insignia:0}, quality='auto', level=2, scale=1, fps=60, fpsFrames=0, fpsClock=0, changeClock=0, ceremony=null, game=null, mediaVersion=0
  const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance',alpha:false})
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setPixelRatio(1);renderer.domElement.className='hg-canvas';mount.appendChild(renderer.domElement)
  const camera=new THREE.PerspectiveCamera(62,1,.1,3000);camera.rotation.order='YXZ'
  const hangarScene=new THREE.Scene();hangarScene.background=new THREE.Color(0x02030a);hangarScene.fog=new THREE.FogExp2(0x0a1220,.007)
  stars(hangarScene,4200);makePlanet(hangarScene,new THREE.Vector3(130,35,-210),60)
  const flightScene=new THREE.Scene();flightScene.background=new THREE.Color(0x02030a);flightScene.fog=new THREE.FogExp2(0x071120,.0007)
  stars(flightScene,4800);makePlanet(flightScene,new THREE.Vector3(-370,-130,-1000),135)
  flightScene.add(new THREE.AmbientLight(0xb6d8f8,1.4)); const key=new THREE.DirectionalLight(0x91c6ff,2);key.position.set(-30,80,40);flightScene.add(key)
  const pilotScene=new THREE.Scene();pilotScene.background=new THREE.Color(0x06111d);pilotScene.add(new THREE.AmbientLight(0xb5d8e9,1.2))
  const pilotLight=new THREE.DirectionalLight(0x96e1ff,3);pilotLight.position.set(-3,4,4);pilotScene.add(pilotLight)
  const pilotRim=new THREE.DirectionalLight(0xffa667,3);pilotRim.position.set(3,2,-3);pilotScene.add(pilotRim)
  let bust=pilotBust(pilot);pilotScene.add(bust)
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(hangarScene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.55,.45,.92);composer.addPass(bloom);composer.addPass(new OutputPass())
  let hangar=null, hangarShuttle=null, fighter=null, station=null, mouth=new THREE.Vector3(0,20,-785), dockingField=null, asteroidMeshes=[], crystalMesh=null, asteroidData=[], crystalData=[], hyperLines=null, dust=null, floorOverlay=null, board=null, ceremonyBoard=null, spotlights=[], sparkMesh=null, artFrames=[], featureFrames=[], pickables=[], scoreBoardTexture=null
  const cameraPos=new THREE.Vector3(0,1.7,24), walk={yaw:0,pitch:0}, input={forward:0,back:0,left:0,right:0,boost:false,joyX:0,joyY:0,lookX:0,lookY:0,flightX:0,flightY:0}
  let media=new Map(), source=new Map(), requested=new Set(), focusId=null, hoverId=null, coinMeshes=[], memeMeshes=[]
  const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2(), dummy=new THREE.Object3D()
  const mats={ cyan:new THREE.MeshBasicMaterial({color:0x76dfff,transparent:true,opacity:.84,depthWrite:false}), orange:new THREE.MeshBasicMaterial({color:0xff9c53,transparent:true,opacity:.92,depthWrite:false}) }
  const onError=(e)=>callbacks.onError?.(e)
  function sceneNow(){return mode==='hangar'?hangarScene:mode==='pilot'?pilotScene:flightScene}
  function setMode(next){const before=mode;mode=next;callbacks.onPhase?.(next);if(next==='hangar'){cameraPos.set(...META.slots.SPAWN.position);walk.yaw=0;walk.pitch=-.05;revealClock=['docking','flight','hyperspace'].includes(before)?0:99;if(revealClock===0&&fighter){if(hangarShuttle)hangarShuttle.visible=false;fighter.parent?.remove(fighter);hangarScene.add(fighter);fighter.position.set(0,8,-6.5);fighter.scale.setScalar(.7)}callbacks.onPosition?.(cameraPos.x,cameraPos.z,walk.yaw)}updateQuality()}
  function resize(){let w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);let phone=w<650;let ratio=Math.min(window.devicePixelRatio||1,phone?1.5:2);renderer.setPixelRatio(ratio*scale);renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
  const ro=new ResizeObserver(resize);ro.observe(mount);resize()
  function updateQuality(){let low=level===0;floorOverlay&&(floorOverlay.visible=!low&&mode==='hangar');dust&&(dust.visible=!low);bloom.enabled=!low;for(const mesh of asteroidMeshes)mesh.count=low?Math.floor(mesh.userData.total*.55):mesh.userData.total;if(crystalMesh)crystalMesh.count=low?25:40}
  function setQuality(q){quality=q;if(q==='low'){level=0;scale=.62}else if(q==='medium'){level=1;scale=.82}else if(q==='high'){level=2;scale=1}else{level=2;scale=1}resize();updateQuality()}
  function loadGltf(name){return new Promise((resolve,reject)=>new GLTFLoader().load(asset(appId,name),resolve,undefined,reject))}
  async function restoreBakedTexture(parser,imageIndex){
    const imageDef=parser.json.images[imageIndex],bytes=await parser.getDependency('bufferView',imageDef.bufferView)
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(new Blob([bytes],{type:imageDef.mimeType}))})
    const image=new Image();image.src=data;await image.decode()
    const texture=new THREE.Texture(image);texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=2;texture.needsUpdate=true
    return texture
  }
  function loadArt(item){if(!item||item.placeholder||requested.has(item.id)||!loadMedia)return;requested.add(item.id);loadMedia(item.id).then(url=>{if(disposed||!url)return;let image=new Image();image.onload=()=>{if(disposed)return;media.set(item.id,image);updateArtTexture(item.id);callbacks.onMedia?.(++mediaVersion)};image.src=url}).catch(()=>{})}
  function sourceFor(item){if(!item)return null;if(media.has(item.id))return media.get(item.id);if(!source.has(item.id))source.set(item.id,posterCanvas(item));return source.get(item.id)}
  function thumbFor(id){const item=art.find(x=>x.id===id);if(!item)return null;loadArt(item);const src=sourceFor(item), c=document.createElement('canvas'),iw=src.naturalWidth||src.width,ih=src.naturalHeight||src.height,sc=Math.min(1,520/Math.max(iw,ih));c.width=Math.max(1,Math.round(iw*sc));c.height=Math.max(1,Math.round(ih*sc));c.getContext('2d').drawImage(src,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.83)}
  function updateArtTexture(id){for(const frame of [...artFrames,...featureFrames]){if(frame.userData.artId!==id)continue;const item=art.find(x=>x.id===id);if(!item)continue;const tex=panelTexture(item,sourceFor(item),level===0?256:512);frame.material.map?.dispose();frame.material.map=tex;frame.material.needsUpdate=true}}
  function makeArtFrame(position,side,index,featured=false){const group=new THREE.Group();group.position.copy(position);if(!featured){group.rotation.y=side==='L'?Math.PI/2:-Math.PI/2}else{group.rotation.y=0}
    const w=featured?1.75:3.15,h=featured?2.45:4.1
    const edge=new THREE.Mesh(new THREE.BoxGeometry(w+.14,h+.14,.13),new THREE.MeshBasicMaterial({color:0x30a8dc,transparent:true,opacity:.55}));group.add(edge)
    const back=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:0x071a29,side:THREE.DoubleSide}));back.position.z=.075;group.add(back)
    const face=new THREE.Mesh(new THREE.PlaneGeometry(w-.12,h-.12),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.92,side:THREE.DoubleSide,depthWrite:false}));face.position.z=.086;face.userData={kind:'art',index};group.add(face);pickables.push(face)
    for(const x of [-1,1])for(const y of [-1,1]){const corner=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.05),mats.cyan);corner.position.set(x*(w/2-.04),y*(h/2-.04),.13);group.add(corner)}
    hangarScene.add(group);return {group,face}
  }
  function bindFrames(){const count=art.length||1;artFrames.forEach((face,i)=>{const item=art[(page*artFrames.length+i)%count];face.userData.artId=item?.id||null;if(item){updateArtTexture(item.id);loadArt(item)}else{face.material.map?.dispose();face.material.map=panelTexture({title:'OPEN WALL',palette:i,placeholder:true},openWallCanvas(i+1,'#73dbff'),256)}})
    const featured=art.filter(x=>x.winner_rank||x.ceremony).sort((a,b)=>(a.winner_rank||99)-(b.winner_rank||99));featureFrames.forEach((face,i)=>{const item=featured[i]||art[i];face.userData.artId=item?.id||null;if(item){updateArtTexture(item.id);loadArt(item)}})
  }
  function setArt(items,loader){art=items||[];loadMedia=loader||loadMedia;bindFrames()}
  function setScores(scores){const list=scores?.flight||[];const lines=list.length?list.slice(0,8).map((s,i)=>`${String(i+1).padStart(2,'0')}   ${s.name.padEnd(12)}   ${s.display}`):['NO PILOTS LOGGED','BE THE FIRST TO REACH THE STATION'];const t=boardTexture('TOP PILOTS',lines,'#78dcff');if(board){board.material.map?.dispose();board.material.map=t;board.material.needsUpdate=true}else scoreBoardTexture=t}
  function collision(x,z){if(x<META.hangar.walk_bounds.min[0]+.38||x>META.hangar.walk_bounds.max[0]-.38||z<META.hangar.walk_bounds.min[2]+.38||z>META.hangar.walk_bounds.max[2]-.38)return true;return META.obstacles.some(o=>o.max[1]>.28&&x>o.min[0]-.42&&x<o.max[0]+.42&&z>o.min[2]-.42&&z<o.max[2]+.42)}
  function pick(clientX,clientY){if(mode!=='hangar')return false;const r=renderer.domElement.getBoundingClientRect();pointer.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(pickables,false);const hit=hits.find(h=>h.distance<32);if(!hit)return false;const data=hit.object.userData;if(data.kind==='art'){focusId=data.artId;callbacks.onFocus?.(focusId);loadArt(art.find(x=>x.id===focusId))}else if(data.kind==='game')callbacks.onCabinet?.(data.id);else if(data.kind==='board')callbacks.onBoard?.();else if(data.kind==='meme')findMeme(data.id);return true}
  function hover(clientX,clientY){if(mode!=='hangar'||clientX==null){callbacks.onHover?.(false);return}const r=renderer.domElement.getBoundingClientRect();pointer.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const h=raycaster.intersectObjects(pickables,false).find(x=>x.distance<32);callbacks.onHover?.(!!h)}
  function setLook(dx,dy){if(mode==='hangar'){walk.yaw-=dx*.0032;walk.pitch=clamp(walk.pitch-dy*.0032,-1.25,1.25)}else if(mode==='flight'){input.flightX=clamp(input.flightX+dx*.004,-1,1);input.flightY=clamp(input.flightY+dy*.004,-1,1)}}
  function setFlightPointer(x,y){input.flightX=clamp(x,-1,1);input.flightY=clamp(y,-1,1)}
  function setMoving(key,on){const v=on?1:0;if(key==='w'||key==='ArrowUp')input.forward=v;if(key==='s'||key==='ArrowDown')input.back=v;if(key==='a'||key==='ArrowLeft')input.left=v;if(key==='d'||key==='ArrowRight')input.right=v;if(key===' '||key==='Space'||key==='Shift')input.boost=!!on}
  function setJoystick(x,y){input.joyX=x;input.joyY=y}
  function clearInput(){for(const k of ['forward','back','left','right','joyX','joyY'])input[k]=0;input.boost=false}
  function setPilot(next){pilot=next;pilotScene.remove(bust);disposeGroup(bust);bust=pilotBust(pilot);pilotScene.add(bust);if(fighter){fighter.traverse(o=>{if(o.isMesh&&o.material){for(const m of [].concat(o.material)){if(m.name?.includes('accent'))m.color.set(pilot.suitColor);if(m.name?.includes('engine')){m.emissive?.set(pilot.suitColor);m.emissiveIntensity=2}}}})}}
  function capturePilot(){const was=mode;mode='pilot';try{render();const src=renderer.domElement,c=document.createElement('canvas');c.width=c.height=128;const size=Math.min(src.width,src.height)*.63,centerY=mount.clientWidth<650 ? .28 : .5;c.getContext('2d').drawImage(src,(src.width-size)/2,Math.max(0,src.height*centerY-size/2),size,size,0,0,128,128);return c.toDataURL('image/png')}finally{mode=was}}
  function beginFlight(){score=0;shield=100;boost=100;crystalHits=0;flightClock=0;dockClock=0;input.flightX=input.flightY=0;if(fighter){fighter.parent?.remove(fighter);flightScene.add(fighter);fighter.scale.setScalar(1);fighter.position.set(0,20,30);fighter.visible=true}if(dockingField)dockingField.visible=false;asteroidData.forEach(a=>a.hit=false);asteroidMeshes.forEach(m=>m.visible=true);crystalData.forEach((c,i)=>{c.hit=false;dummy.position.copy(c.pos);dummy.scale.setScalar(1.4);dummy.rotation.set(0,0,0);dummy.updateMatrix();crystalMesh?.setMatrixAt(i,dummy.matrix)});if(crystalMesh){crystalMesh.visible=true;crystalMesh.instanceMatrix.needsUpdate=true}setMode('hyperspace');callbacks.onFlight?.({score,timer:20,shield,boost,speed:0,crystals:0});callbacks.onSound?.('jump')}
  function skipFlight(){setMode('hangar');callbacks.onFlightComplete?.(null);callbacks.onSound?.('landing')}
  function startGame(id){if(mode!=='hangar')return;game={id,t:0,score:0,found:new Set()};if(id==='coins'){for(const mesh of coinMeshes)mesh.visible=true}else if(id==='memes'){for(const mesh of memeMeshes)mesh.visible=true}callbacks.onGame?.({kind:id,left:id==='coins'?35:90,elapsed:0,collected:0,total:id==='coins'?coinMeshes.length:5,found:0})}
  function endGame(){for(const m of coinMeshes)m.visible=false;game=null;callbacks.onGame?.(null)}
  function findMeme(id){if(!game||game.id!=='memes'||game.found.has(id))return;game.found.add(id);callbacks.onHuntFind?.('STATION MEME '+(id+1),game.found.size);callbacks.onSound?.('crystal');if(game.found.size===5)finishGame(+(game.t.toFixed(1)))}
  function finishGame(value){if(!game)return;const id=game.id;endGame();callbacks.onGameEnd?.({game:id,score:value})}
  function startCeremony(){if(mode!=='hangar')return;ceremony={t:0,index:-1,winners:art.filter(x=>x.winner_rank||x.ceremony).sort((a,b)=>(a.winner_rank||99)-(b.winner_rank||99))};if(!ceremony.winners.length)ceremony.winners=art.slice(0,3);callbacks.onCeremony?.(true);callbacks.onSound?.('ceremony');if(ceremonyBoard)ceremonyBoard.visible=true;if(sparkMesh)sparkMesh.visible=true;for(const light of spotlights)light.visible=true}
  function endCeremony(){ceremony=null;if(ceremonyBoard)ceremonyBoard.visible=false;if(sparkMesh)sparkMesh.visible=false;for(const light of spotlights)light.visible=false;callbacks.onCeremony?.(false)}
  function focusById(id){focusId=id;loadArt(art.find(x=>x.id===id))}
  function clearFocus(){focusId=null}
  function browse(){if(art.length){focusId=art[0].id;callbacks.onFocus?.(focusId)}}
  function reaction(id){const face=[...artFrames,...featureFrames].find(f=>f.userData.artId===id);if(face){face.material.opacity=1;setTimeout(()=>{if(!disposed)face.material.opacity=.92},330)}}
  loadGltf('hangar.glb').then(async g=>{
    if(disposed)return
    const baked=await Promise.all([restoreBakedTexture(g.parser,0),restoreBakedTexture(g.parser,1)])
    g.scene.traverse(o=>{if(!o.isMesh)return;const list=[].concat(o.material)
      if(o.name==='FORCEFIELD'||list.some(m=>m.name==='forcefield')){o.material=new THREE.MeshBasicMaterial({color:0x3a8bff,transparent:true,opacity:.05,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});return}
      for(const m of list){if(m.name==='baked_hangar'||m.name==='baked_ship'){m.emissiveMap=baked[m.name==='baked_hangar'?0:1];m.emissiveIntensity=2.4;m.color.setRGB(0,0,0);m.roughness=1;m.metalness=0;m.needsUpdate=true}if(['light_w','light_b','light_o','holo'].includes(m.name))m.emissiveIntensity=1.3}
    });hangar=g.scene;hangarShuttle=hangar.getObjectByName('SHIP');hangarScene.add(hangar)
    const slots=Object.entries(META.slots).filter(([k])=>k.startsWith('ART_SLOT')).sort(([a],[b])=>a.localeCompare(b))
    slots.forEach(([name,info],i)=>{const {face}=makeArtFrame(new THREE.Vector3(...info.position),name.includes('_L_')?'L':'R',i);artFrames.push(face)})
    for(let i=0;i<3;i++){const p=META.slots['FEATURE_SLOT_'+i].position,{face,group}=makeArtFrame(new THREE.Vector3(p[0],p[1]+.45,p[2]),'',i,true);group.userData.baseY=group.position.y;featureFrames.push(face)}
    bindFrames()
    const cubeTarget=new THREE.WebGLCubeRenderTarget(128);const cubeCam=new THREE.CubeCamera(.1,120,cubeTarget);cubeCam.position.set(0,2,-3);hangarScene.add(cubeCam);try{cubeCam.update(renderer,hangarScene)}catch(e){onError(e)}hangarScene.remove(cubeCam)
    floorOverlay=new THREE.Mesh(new THREE.PlaneGeometry(38,62),new THREE.MeshStandardMaterial({color:0x527087,metalness:1,roughness:.18,envMap:cubeTarget.texture,transparent:true,opacity:.13,depthWrite:false}));floorOverlay.rotation.x=-Math.PI/2;floorOverlay.position.set(0,.018,0);floorOverlay.visible=false;hangarScene.add(floorOverlay)
    const dustPos=new Float32Array(280*3);for(let i=0;i<280;i++)dustPos.set([rand(-17,17),rand(1,18),rand(-30,30)],i*3);const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(dustPos,3));dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0x87c7ef,size:.075,transparent:true,opacity:.27,depthWrite:false}));hangarScene.add(dust)
    const terminalTex=boardTexture('ARCADE / GAMES',['MEMORY MATCH','CRYSTAL RUSH','MEME HUNT','TAP TO PLAY'],'#ffa362');const terminal=new THREE.Mesh(new THREE.PlaneGeometry(4.2,3),new THREE.MeshBasicMaterial({map:terminalTex,side:THREE.DoubleSide,transparent:true,opacity:.92}));terminal.position.set(-12,3.1,16);terminal.rotation.y=Math.PI/2;terminal.userData={kind:'game',id:'memory'};hangarScene.add(terminal);pickables.push(terminal)
    board=new THREE.Mesh(new THREE.PlaneGeometry(4.7,3.2),new THREE.MeshBasicMaterial({map:scoreBoardTexture||boardTexture('TOP PILOTS',['BE THE FIRST TO REACH THE STATION']),side:THREE.DoubleSide,transparent:true,opacity:.92}));board.position.set(12,3.5,18);board.rotation.y=-Math.PI/2;board.userData={kind:'board'};hangarScene.add(board);pickables.push(board)
    ceremonyBoard=new THREE.Mesh(new THREE.PlaneGeometry(15,8),new THREE.MeshBasicMaterial({map:boardTexture('CLOSING CEREMONY',['AGENTIC AI · 2026','THE WINNERS']),transparent:true,opacity:.86,depthWrite:false,side:THREE.DoubleSide}));ceremonyBoard.position.set(0,10,-28);ceremonyBoard.visible=false;hangarScene.add(ceremonyBoard)
    const sparkPositions=new Float32Array(180*3);for(let i=0;i<180;i++)sparkPositions.set([rand(-9,9),rand(5,17),rand(-30,-22)],i*3);const sparkGeometry=new THREE.BufferGeometry();sparkGeometry.setAttribute('position',new THREE.BufferAttribute(sparkPositions,3).setUsage(THREE.DynamicDrawUsage));sparkMesh=new THREE.Points(sparkGeometry,new THREE.PointsMaterial({color:0xffb56a,size:.13,transparent:true,opacity:.86,blending:THREE.AdditiveBlending,depthWrite:false}));sparkMesh.visible=false;hangarScene.add(sparkMesh)
    for(let i=0;i<3;i++){const cone=new THREE.Mesh(new THREE.ConeGeometry(3.5,17,16,1,true),new THREE.MeshBasicMaterial({color:i===1?0xffb268:0x74baf1,transparent:true,opacity:.065,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));cone.position.set((i-1)*7,11,-15);cone.rotation.z=(i-1)*.25;cone.visible=false;hangarScene.add(cone);spotlights.push(cone)}
    for(let i=0;i<5;i++){const tex=textTexture(['SHIP IT','404','LGTM','NO BUGS','AGAIN?'][i],{width:256,height:96,size:34,color:'#93e4ff',bg:'#091c29',accent:'#53bde7'});const plaque=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.46),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));plaque.position.set(i%2?13.7:-13.7,2.15,19-i*10);plaque.rotation.y=i%2?-Math.PI/2:Math.PI/2;plaque.userData={kind:'meme',id:i};hangarScene.add(plaque);pickables.push(plaque);memeMeshes.push(plaque)}
    const coinMat=new THREE.MeshBasicMaterial({color:0xffb466});for(let i=0;i<10;i++){const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.28,0),coinMat);mesh.position.set(-7+(i%5)*3.5,1.35,18-Math.floor(i/5)*25);mesh.visible=false;hangarScene.add(mesh);coinMeshes.push(mesh)}
    updateQuality();callbacks.onLoaded?.('hangar')
  }).catch(onError)
  loadGltf('flight.glb').then(g=>{
    if(disposed)return
    const root=g.scene;fighter=root.getObjectByName('FIGHTER');station=root.getObjectByName('STATION');const mouthNode=root.getObjectByName('STATION_MOUTH');if(mouthNode)mouth.copy(mouthNode.position)
    if(fighter){fighter.traverse(o=>{if(o.isMesh){o.material=[].concat(o.material).map(m=>m.clone());if(o.material.length===1)o.material=o.material[0]}});root.remove(fighter);flightScene.add(fighter);fighter.position.set(0,20,30)}
    if(station){root.remove(station);flightScene.add(station);station.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material)){if(m.emissive)m.emissiveIntensity=Math.max(m.emissiveIntensity||0,1.4)}})}
    dockingField=new THREE.Group();dockingField.position.copy(mouth);const fieldMat=new THREE.MeshBasicMaterial({color:0x61cfff,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});const disk=new THREE.Mesh(new THREE.CircleGeometry(22,64),fieldMat);dockingField.add(disk);for(const [radius,width,opacity] of [[23,.8,.95],[16,.28,.5],[9,.18,.33]]){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,width,8,72),new THREE.MeshBasicMaterial({color:0x79ddff,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false}));ring.position.z=.2;dockingField.add(ring)}dockingField.visible=false;flightScene.add(dockingField)
    setPilot(pilot)
    const rocks=[0,1,2,3].map(i=>root.getObjectByName('ASTEROID_'+i)).filter(Boolean)
    for(let variant=0;variant<rocks.length;variant++){const rock=rocks[variant];let mesh=rock.isMesh?rock:null;rock.traverse?.(o=>{if(o.isMesh&&!mesh)mesh=o});if(!mesh)continue
      const geo=mesh.geometry.clone();geo.computeBoundingBox();const center=new THREE.Vector3();geo.boundingBox.getCenter(center);geo.translate(-center.x,-center.y,-center.z)
      const im=new THREE.InstancedMesh(geo,mesh.material,75);im.instanceMatrix.setUsage(THREE.StaticDrawUsage);im.userData.total=75;im.frustumCulled=false
      for(let j=0;j<75;j++){const lane=Math.random()<.13?rand(-16,16):(Math.random()<.5?-1:1)*rand(17,55);const pos=new THREE.Vector3(lane,rand(4,43),rand(-660,-55));const radius=rand(1.2,3.2);dummy.position.copy(pos);dummy.rotation.set(rand(0,6),rand(0,6),rand(0,6));dummy.scale.setScalar(radius);dummy.updateMatrix();im.setMatrixAt(j,dummy.matrix);asteroidData.push({pos,radius:radius*1.35,variant,instanceIndex:j,hit:false})}
      flightScene.add(im);asteroidMeshes.push(im)
    }
    const crystalGeo=new THREE.OctahedronGeometry(1.05,0),crystalMat=new THREE.MeshBasicMaterial({color:0x82e6ff});crystalMesh=new THREE.InstancedMesh(crystalGeo,crystalMat,40);crystalMesh.frustumCulled=false
    for(let i=0;i<40;i++){const pos=i%8===0?new THREE.Vector3(0,20,-75-i*13.2):new THREE.Vector3(rand(-28,28),rand(12,33),-75-i*13.2);dummy.position.copy(pos);dummy.scale.setScalar(1.4);dummy.updateMatrix();crystalMesh.setMatrixAt(i,dummy.matrix);crystalData.push({pos,hit:false})}flightScene.add(crystalMesh)
    const streakPos=new Float32Array(330*6);const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(streakPos,3).setUsage(THREE.DynamicDrawUsage));hyperLines=new THREE.LineSegments(geom,new THREE.LineBasicMaterial({color:0xbdeaff,transparent:true,opacity:.86,blending:THREE.AdditiveBlending,depthWrite:false}));flightScene.add(hyperLines);hyperLines.visible=false
    updateQuality();callbacks.onLoaded?.('flight')
  }).catch(onError)

  function updateHyper(t){if(!hyperLines)return;const a=hyperLines.geometry.attributes.position;for(let i=0;i<330;i++){const angle=i*2.399963,r=rand(3,100),x=Math.cos(angle)*r,y=Math.sin(angle)*r+20,z=-rand(20,650);a.setXYZ(i*2,x,y,z);a.setXYZ(i*2+1,x,y,z+rand(25,115))}a.needsUpdate=true}
  function render(){const scene=sceneNow();composer.passes[0].scene=scene;composer.passes[0].camera=camera;if(level>0&&mode==='hangar'){composer.render()}else renderer.render(scene,camera)}
  function loop(now){if(disposed)return;requestAnimationFrame(loop);const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;clock+=dt
    if(mode==='intro'){introClock+=dt;const t=introClock;camera.position.set(300+Math.sin(t*.2)*65,95+Math.sin(t*.18)*23,-395-t*3);camera.lookAt(0,40,-960);if(station)station.rotation.z=Math.sin(t*.08)*.025}
    else if(mode==='pilot'){const phone=mount.clientWidth<650;bust.scale.setScalar(phone ? .62 : 1);camera.position.set(0,1.15,5.1);camera.lookAt(0,phone ? -.95 : 1.05,0);bust.rotation.y=.16+Math.sin(clock*.55)*.16}
    else if(mode==='briefing'){camera.position.set(120,50,-540);camera.lookAt(0,40,-960)}
    else if(mode==='hyperspace'){flightClock+=dt;hyperLines&&(hyperLines.visible=true);updateHyper(flightClock);camera.position.set(0,24,47);camera.lookAt(0,20,-150);if(fighter)fighter.visible=false;if(flightClock>2.5){hyperLines&&(hyperLines.visible=false);if(fighter)fighter.visible=true;flightClock=0;setMode('flight');callbacks.onSound?.('engine')}}
    else if(mode==='flight'){flightClock+=dt;const boosting=input.boost&&boost>0, speed=boosting?38:29;boost=clamp(boost+(boosting?-42:19)*dt,0,100)
      if(fighter){const tx=clamp(input.flightX+(input.right-input.left)*.5,-1,1)*27,ty=clamp(-input.flightY+(input.forward-input.back)*.5,-1,1)*13+20;fighter.position.x=THREE.MathUtils.damp(fighter.position.x,tx,2.3,dt);fighter.position.y=THREE.MathUtils.damp(fighter.position.y,ty,2.3,dt);fighter.position.z-=speed*dt;fighter.rotation.z=THREE.MathUtils.damp(fighter.rotation.z,-input.flightX*.28,3,dt);fighter.rotation.x=THREE.MathUtils.damp(fighter.rotation.x,input.flightY*.12,3,dt)
        camera.position.lerp(new THREE.Vector3(fighter.position.x*.8,fighter.position.y+5,fighter.position.z+20),1-Math.exp(-4*dt));camera.lookAt(fighter.position.x,fighter.position.y+1,fighter.position.z-36)
        for(const a of asteroidData){if(a.instanceIndex>=asteroidMeshes[a.variant]?.count)continue;if(!a.hit&&a.pos.distanceTo(fighter.position)<a.radius+2.2){a.hit=true;shield=Math.max(0,shield-20);score=Math.max(0,score-45);callbacks.onSound?.('impact');callbacks.onToast?.('SHIELD HIT · -45');break}}
        for(let i=0;i<Math.min(crystalData.length,crystalMesh?.count||0);i++){const c=crystalData[i];if(!c.hit&&c.pos.distanceTo(fighter.position)<3.6){c.hit=true;crystalHits++;score+=100;dummy.position.copy(c.pos);dummy.scale.setScalar(.001);dummy.updateMatrix();crystalMesh.setMatrixAt(i,dummy.matrix);crystalMesh.instanceMatrix.needsUpdate=true;callbacks.onSound?.('crystal');callbacks.onCrystal?.(100);callbacks.onToast?.('+100 · ENERGY CRYSTAL');break}}
      }
      if(Math.floor(flightClock*10)!==Math.floor((flightClock-dt)*10))callbacks.onFlight?.({score,timer:Math.max(0,20-flightClock),shield,boost,speed,crystals:crystalHits})
      if(flightClock>=20){dockClock=0;const start=fighter?.position.clone()||new THREE.Vector3(0,20,-540);dockCurve=new THREE.CatmullRomCurve3([start,new THREE.Vector3(12,27,-635),new THREE.Vector3(-7,22,-710),new THREE.Vector3(mouth.x,mouth.y,mouth.z-8)]);asteroidMeshes.forEach(m=>m.visible=false);if(crystalMesh)crystalMesh.visible=false;if(dockingField)dockingField.visible=true;setMode('docking');callbacks.onSound?.('docking')}
    }
    else if(mode==='docking'){dockClock+=dt;const t=clamp(dockClock/6,0,1),e=ease(t);if(fighter){fighter.position.copy(dockCurve.getPoint(e));fighter.rotation.z*=.96;camera.position.lerp(new THREE.Vector3(fighter.position.x*.7,fighter.position.y+5,fighter.position.z+19),1-Math.exp(-3*dt));camera.lookAt(mouth.x,mouth.y,mouth.z-60)}if(dockingField){dockingField.rotation.z+=dt*.15;dockingField.children[0].material.opacity=.12+t*.24}callbacks.onDocking?.(t);if(t>=1){setMode('hangar');callbacks.onFlightComplete?.({score,shield,crystals:crystalHits});callbacks.onSound?.('landing')}}
    else if(mode==='hangar'){
      const forward=input.forward-input.back-input.joyY,right=input.right-input.left+input.joyX,mag=Math.hypot(forward,right);if(mag>.01){const speed=mag>1?3.5/mag:3.5,dx=(-Math.sin(walk.yaw)*forward+Math.cos(walk.yaw)*right)*dt*speed,dz=(-Math.cos(walk.yaw)*forward-Math.sin(walk.yaw)*right)*dt*speed;if(!collision(cameraPos.x+dx,cameraPos.z))cameraPos.x+=dx;if(!collision(cameraPos.x,cameraPos.z+dz))cameraPos.z+=dz;callbacks.onPosition?.(cameraPos.x,cameraPos.z,walk.yaw)}
      if(revealClock<2.5){revealClock+=dt;const t=ease(clamp(revealClock/2.5,0,1));camera.position.set(THREE.MathUtils.lerp(-9,cameraPos.x,t),THREE.MathUtils.lerp(2.2,1.7,t),THREE.MathUtils.lerp(27,cameraPos.z,t));camera.lookAt(THREE.MathUtils.lerp(4,0,t),THREE.MathUtils.lerp(8.5,1.65,t),THREE.MathUtils.lerp(-32,-15,t));if(fighter?.parent===hangarScene){fighter.position.y=THREE.MathUtils.lerp(8,1.15,t);if(t>=1){fighter.visible=false;if(hangarShuttle)hangarShuttle.visible=true}}}
      else{camera.position.set(cameraPos.x,1.7+Math.sin(clock*1.7)*.014,cameraPos.z);camera.rotation.set(walk.pitch,walk.yaw,0,'YXZ')}
      for(let i=0;i<featureFrames.length;i++){const frame=featureFrames[i];if(frame?.parent){frame.parent.position.y=frame.parent.userData.baseY+Math.sin(clock*1.3+i)*.17;frame.parent.rotation.y=Math.sin(clock*.33+i)*.12}}
      for(const c of coinMeshes){if(c.visible){c.rotation.y+=dt*2;c.position.y=1.35+Math.sin(clock*2+c.position.x)*.13}}
      if(game){game.t+=dt;if(game.id==='coins'){for(const mesh of coinMeshes){if(mesh.visible&&mesh.position.distanceTo(camera.position)<1.5){mesh.visible=false;game.score++;callbacks.onSound?.('crystal');callbacks.onCoin?.();callbacks.onToast?.('+1 CRYSTAL')}}if(game.score>=coinMeshes.length)finishGame(game.score);else if(game.t>=35)finishGame(game.score)}else if(game.t>=90)finishGame(+(game.t.toFixed(1)));if(game&&Math.floor(game.t*5)!==Math.floor((game.t-dt)*5))callbacks.onGame?.({kind:game.id,left:Math.max(0,(game.id==='coins'?35:90)-game.t),elapsed:game.t,collected:game.score,total:coinMeshes.length,found:game.found.size})}
      if(ceremony){ceremony.t+=dt;if(ceremony.t<3&&ceremonyBoard){const dx=ceremonyBoard.position.x-cameraPos.x,dz=ceremonyBoard.position.z-cameraPos.z,ty=Math.atan2(-dx,-dz),tp=Math.atan2(ceremonyBoard.position.y-1.7,Math.hypot(dx,dz)),k=1-Math.exp(-2.6*dt);let dy=ty-walk.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));walk.yaw+=dy*k;walk.pitch+=(tp-walk.pitch)*k}for(let i=0;i<spotlights.length;i++)spotlights[i].rotation.z=Math.sin(clock*1.3+i)*.23;if(sparkMesh){const a=sparkMesh.geometry.attributes.position;for(let i=0;i<a.count;i++){const next=a.getY(i)-dt*(.7+(i%7)*.13);a.setY(i,next<4?17:next)}a.needsUpdate=true}if(ceremony.t>2+ceremony.index*4+4&&ceremony.index<ceremony.winners.length-1){ceremony.index++;const item=ceremony.winners[ceremony.index];ceremonyBoard.material.map?.dispose();ceremonyBoard.material.map=boardTexture('WINNER '+String(ceremony.index+1).padStart(2,'0'),[item.title.toUpperCase(),item.author.toUpperCase(),'AGENTIC AI · 2026'],'#ffb66b');ceremonyBoard.material.needsUpdate=true;callbacks.onCeremonyStage?.({kind:'winner',label:item.title,index:ceremony.index,total:ceremony.winners.length});callbacks.onSound?.('winner')}}
      if(artFrames.length&&art.length>artFrames.length&&Math.floor(clock/20)!==Math.floor((clock-dt)/20)){page=(page+1)%Math.ceil(art.length/artFrames.length);bindFrames()}
    }
    render();fpsFrames++;fpsClock+=dt;changeClock+=dt;if(fpsClock>=1){fps=Math.round(fpsFrames/fpsClock);fpsFrames=0;fpsClock=0;callbacks.onFps?.(fps,{level,scale,dyn:Math.round(scale*100),calls:renderer.info.render.calls,tris:renderer.info.render.triangles});renderer.info.reset()}
    if(quality==='auto'&&changeClock>5){changeClock=0;if(fps<31){if(scale>.65){scale=Math.max(.62,scale-.1);resize()}else if(level>0){level--;updateQuality()}}else if(fps>52){if(level<2){level++;updateQuality()}else if(scale<1){scale=Math.min(1,scale+.07);resize()}}}
  }
  requestAnimationFrame(loop)
  return {canvas:renderer.domElement,setMode,get mode(){return mode},setPilot,capturePilot,beginFlight,skipFlight,setArt,thumbFor,setScores,setQuality,setMoving,setLook,setFlightPointer,setJoystick,clearInput,pick,hover,browse,focusById,clearFocus,reaction,startGame,endGame,startCeremony,endCeremony,
    dispose(){disposed=true;ro.disconnect();composer.dispose();renderer.dispose();renderer.domElement.remove();disposeGroup(hangarScene);disposeGroup(flightScene);disposeGroup(pilotScene)}}
}
