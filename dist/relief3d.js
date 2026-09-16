import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const host=document.getElementById('webglViewport');
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(390,300);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;host.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(32,390/300,.1,100);camera.position.set(0,1.2,7.2);
scene.add(new THREE.HemisphereLight(0xdff5ff,0x15100e,2.2));
const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,4,5);key.castShadow=true;scene.add(key);
const rim=new THREE.DirectionalLight(0xff5a28,5);rim.position.set(4,1,-3);scene.add(rim);
let group=null,frontMaterial=null,drag=false,last={x:0,y:0},targetRot={x:-.12,y:.32};

function build(url){
 const img=new Image();img.onload=()=>{
  if(group){scene.remove(group);group.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}
  const size=160,cv=document.createElement('canvas');cv.width=cv.height=size;const ctx=cv.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);const scale=Math.min(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
  const pixels=ctx.getImageData(0,0,size,size).data,depth=new Uint8Array(size*size);
  for(let i=0;i<depth.length;i++){const r=pixels[i*4],g=pixels[i*4+1],b=pixels[i*4+2],a=pixels[i*4+3];const lum=(r*.299+g*.587+b*.114);depth[i]=a<20?0:Math.max(8,255-lum)}
  const displacement=new THREE.DataTexture(depth,size,size,THREE.RedFormat);displacement.needsUpdate=true;displacement.flipY=true;
  const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  group=new THREE.Group();
  const aspect=Math.max(.65,Math.min(1.6,img.width/img.height)),pw=3.3*aspect,ph=3.3;
  const backing=new THREE.Mesh(new THREE.BoxGeometry(pw,ph,.24,1,1,1),new THREE.MeshStandardMaterial({color:0x25282a,metalness:.25,roughness:.38}));backing.position.z=-.13;backing.castShadow=true;group.add(backing);
  const geo=new THREE.PlaneGeometry(pw*.96,ph*.96,159,159);
  frontMaterial=new THREE.MeshStandardMaterial({map:texture,displacementMap:displacement,displacementScale:.42,displacementBias:.02,roughness:.6,metalness:.03,side:THREE.DoubleSide});
  const relief=new THREE.Mesh(geo,frontMaterial);relief.position.z=.05;relief.castShadow=true;group.add(relief);
  const edge=new THREE.LineSegments(new THREE.EdgesGeometry(backing.geometry),new THREE.LineBasicMaterial({color:0xff7140,transparent:true,opacity:.7}));edge.position.copy(backing.position);group.add(edge);
  group.rotation.set(targetRot.x,targetRot.y,0);scene.add(group);host.classList.add('active');
 };img.src=url;
}

host.addEventListener('pointerdown',e=>{drag=true;last={x:e.clientX,y:e.clientY};host.setPointerCapture(e.pointerId)});
host.addEventListener('pointermove',e=>{if(!drag||!group)return;targetRot.y+=(e.clientX-last.x)*.009;targetRot.x+=(e.clientY-last.y)*.007;targetRot.x=Math.max(-1.15,Math.min(1.15,targetRot.x));last={x:e.clientX,y:e.clientY}});
host.addEventListener('pointerup',()=>drag=false);host.addEventListener('pointercancel',()=>drag=false);
host.addEventListener('wheel',e=>{e.preventDefault();camera.position.z=Math.max(4.6,Math.min(10,camera.position.z+e.deltaY*.006))},{passive:false});
window.addEventListener('impre3d-generate-relief',e=>build(e.detail.url));
window.addEventListener('impre3d-relief-color',e=>{if(frontMaterial){frontMaterial.emissive=new THREE.Color(e.detail.color);frontMaterial.emissiveIntensity=.05}});
function animate(){requestAnimationFrame(animate);if(group){group.rotation.x+=(targetRot.x-group.rotation.x)*.12;group.rotation.y+=(targetRot.y-group.rotation.y)*.12}renderer.render(scene,camera)}animate();
new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}}).observe(host);
