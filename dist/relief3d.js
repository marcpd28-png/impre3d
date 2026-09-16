import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';

const host=document.getElementById('webglViewport');
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(390,300);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;host.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(32,390/300,.1,100);camera.position.set(0,1.2,7.2);
scene.add(new THREE.HemisphereLight(0xdff5ff,0x15100e,2.2));
const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,4,5);key.castShadow=true;scene.add(key);
const rim=new THREE.DirectionalLight(0xff5a28,5);rim.position.set(4,1,-3);scene.add(rim);
let group=null,frontMaterial=null,drag=false,last={x:0,y:0},targetRot={x:-.12,y:.32};

function disposeGroup(){if(!group)return;scene.remove(group);group.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose()});group=null}
function normalizeModel(object,ext='3d'){
 disposeGroup();group=new THREE.Group();group.add(object);const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());object.position.sub(center);const max=Math.max(size.x,size.y,size.z)||1;object.scale.setScalar(3.5/max);object.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(!o.material)o.material=new THREE.MeshStandardMaterial({color:0xf05a28,roughness:.55})}});targetRot={x:-.16,y:.42};group.rotation.set(targetRot.x,targetRot.y,0);scene.add(group);host.classList.add('active');camera.position.z=7.2;
 let meshes=0,triangles=0;object.traverse(o=>{if(o.isMesh&&o.geometry){meshes++;const g=o.geometry;triangles+=g.index?g.index.count/3:(g.attributes.position?.count||0)/3}});window.dispatchEvent(new CustomEvent('impre3d-model-loaded',{detail:{ext,meshes,triangles:Math.round(triangles)}}));
}
function loadExternal({file,ext}){
 const done=o=>normalizeModel(o.scene||o,ext),fail=e=>{console.error(e);window.dispatchEvent(new CustomEvent('impre3d-model-error',{detail:{message:`El ${ext.toUpperCase()} está incompleto, dañado o usa recursos externos faltantes.`}}))};
 const reader=new FileReader();reader.onprogress=e=>{const percent=e.lengthComputable?Math.min(88,Math.round(e.loaded/e.total*88)):40;window.dispatchEvent(new CustomEvent('impre3d-model-progress',{detail:{percent,loaded:(e.loaded/1048576).toFixed(1)}}))};
 reader.onerror=fail;reader.onload=()=>{window.dispatchEvent(new CustomEvent('impre3d-model-progress',{detail:{percent:92,loaded:(file.size/1048576).toFixed(1)}}));try{const data=reader.result;if(ext==='glb'||ext==='gltf')new GLTFLoader().parse(data,'',done,fail);else if(ext==='fbx')done(new FBXLoader().parse(data,''));else if(ext==='obj')done(new OBJLoader().parse(data));else if(ext==='stl')done(new THREE.Mesh(new STLLoader().parse(data),new THREE.MeshStandardMaterial({color:0xf05a28,roughness:.5,metalness:.05})));else if(ext==='3mf')done(new ThreeMFLoader().parse(data))}catch(error){fail(error)}};
 if(ext==='obj'||ext==='gltf')reader.readAsText(file);else reader.readAsArrayBuffer(file);
}

function build(url,mode='relief'){
 const img=new Image();img.onload=()=>{
  disposeGroup();
  const size=160,cv=document.createElement('canvas');cv.width=cv.height=size;const ctx=cv.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);const scale=Math.min(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
  const pixels=ctx.getImageData(0,0,size,size).data,depth=new Uint8Array(size*size);
  for(let i=0;i<depth.length;i++){const r=pixels[i*4],g=pixels[i*4+1],b=pixels[i*4+2],a=pixels[i*4+3];const lum=(r*.299+g*.587+b*.114);depth[i]=a<20?0:(mode==='lithophane'?Math.max(12,255-lum):mode==='plaque'?38:Math.max(8,255-lum))}
  const displacement=new THREE.DataTexture(depth,size,size,THREE.RedFormat);displacement.needsUpdate=true;displacement.flipY=true;
  const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  group=new THREE.Group();
  const aspect=Math.max(.65,Math.min(1.6,img.width/img.height)),pw=3.3*aspect,ph=3.3;
  const backing=new THREE.Mesh(new THREE.BoxGeometry(pw,ph,.24,1,1,1),new THREE.MeshStandardMaterial({color:0x25282a,metalness:.25,roughness:.38}));backing.position.z=-.13;backing.castShadow=true;group.add(backing);
  const geo=new THREE.PlaneGeometry(pw*.96,ph*.96,159,159);
  frontMaterial=new THREE.MeshStandardMaterial({map:mode==='lithophane'?null:texture,color:mode==='lithophane'?0xfff2d5:0xffffff,transparent:mode==='lithophane',opacity:mode==='lithophane'?.86:1,displacementMap:displacement,displacementScale:mode==='plaque'?.08:.42,displacementBias:.02,roughness:.6,metalness:.03,side:THREE.DoubleSide});
  const relief=new THREE.Mesh(geo,frontMaterial);relief.position.z=.05;relief.castShadow=true;group.add(relief);
  const edge=new THREE.LineSegments(new THREE.EdgesGeometry(backing.geometry),new THREE.LineBasicMaterial({color:0xff7140,transparent:true,opacity:.7}));edge.position.copy(backing.position);group.add(edge);
  group.rotation.set(targetRot.x,targetRot.y,0);scene.add(group);host.classList.add('active');
 };img.src=url;
}

host.addEventListener('pointerdown',e=>{drag=true;last={x:e.clientX,y:e.clientY};host.setPointerCapture(e.pointerId)});
host.addEventListener('pointermove',e=>{if(!drag||!group)return;targetRot.y+=(e.clientX-last.x)*.009;targetRot.x+=(e.clientY-last.y)*.007;targetRot.x=Math.max(-1.15,Math.min(1.15,targetRot.x));last={x:e.clientX,y:e.clientY}});
host.addEventListener('pointerup',()=>drag=false);host.addEventListener('pointercancel',()=>drag=false);
host.addEventListener('wheel',e=>{e.preventDefault();camera.position.z=Math.max(4.6,Math.min(10,camera.position.z+e.deltaY*.006))},{passive:false});
window.addEventListener('impre3d-generate-relief',e=>build(e.detail.url,e.detail.mode));
window.addEventListener('impre3d-load-model',e=>loadExternal(e.detail));
window.addEventListener('impre3d-clear-model',()=>{disposeGroup();host.classList.remove('active')});
window.addEventListener('impre3d-relief-color',e=>{if(frontMaterial){frontMaterial.emissive=new THREE.Color(e.detail.color);frontMaterial.emissiveIntensity=.05}});
function animate(){requestAnimationFrame(animate);if(group){group.rotation.x+=(targetRot.x-group.rotation.x)*.12;group.rotation.y+=(targetRot.y-group.rotation.y)*.12}renderer.render(scene,camera)}animate();
new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}}).observe(host);
