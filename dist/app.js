const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const state={step:1,price:42.9,material:'PLA',color:'#f05a28',rotation:{x:-14,y:32},zoom:1,pendingImage:null,imageName:null,mode:'relief'};
const scene=$('#scene'), model=$('#model'), machine=$('.machine');

function showStep(n){
  state.step=n; $$('.panel-step').forEach(p=>p.classList.toggle('active',+p.dataset.panel===n));
  $$('.step').forEach((s,i)=>s.classList.toggle('active',i+1===Math.min(n,3)));
  if(n===2) updateQuote();
}

$('#prompt').addEventListener('input',e=>{$('#counter').textContent=`${e.target.value.length} / 240`; if(e.target.value.length>240)e.target.value=e.target.value.slice(0,240)});
$('#generateBtn').addEventListener('click',()=>{
  const btn=$('#generateBtn'), prompt=$('#prompt').value.trim();
  if(!prompt && !state.pendingImage){$('#prompt').focus();$('#prompt').placeholder='Describe una pieza o sube una imagen primero';return}
  if(state.mode==='figure'){alert('La figura 360° necesita conectar un motor externo de reconstrucción 3D. Elige Relieve, Litofanía o Placa para generar ahora.');return}
  btn.disabled=true; btn.firstChild.textContent='GENERANDO '; $('#statusText').textContent='M1 / PREPARANDO CÁMARA'; $('#nozzleTemp').textContent='220°C'; $('#bedTemp').textContent='60°C'; $('#chamberTemp').textContent='34°C'; machine.classList.add('printing');
  if(prompt){const words=prompt.split(/\s+/); $('#orderName').textContent=words.slice(0,5).join(' '); $('#modelText').textContent=(words.find(w=>w.length>2)||'M')[0].toUpperCase()}
  setTimeout(()=>{
    if(state.pendingImage){
      $('#imageRelief').style.backgroundImage=`url("${state.pendingImage}")`; model.classList.add('image-mode');
      window.dispatchEvent(new CustomEvent('impre3d-generate-relief',{detail:{url:state.pendingImage,color:state.color,mode:state.mode}}));
      state.rotation={x:-5,y:18};state.zoom=1.22;renderModel();
      $('#orderName').textContent=(state.imageName||'Modelo desde imagen').replace(/\.[^.]+$/,'');
      $('#viabilityTitle').textContent='Vista 3D generada';$('#viabilityDetail').textContent='Pendiente de convertir a malla imprimible';
      $('#statusText').textContent='M1 / MODELO 3D GENERADO';
    } else { model.classList.remove('image-mode');$('#viabilityTitle').textContent='Listo para imprimir';$('#viabilityDetail').textContent='Paredes y proporciones verificadas';$('#statusText').textContent='M1 / MODELO LISTO'; }
    btn.disabled=false;btn.firstChild.textContent='GENERAR MODELO ';machine.classList.remove('printing');showStep(2)
  },2850);
});

function applyReference(file){
  if(!file)return;
  $('#prompt').value=`Crear una pieza 3D usando ${file.name} como relieve frontal`;
  $('#counter').textContent=`${$('#prompt').value.length} / 240`;
  $('#uploadName').textContent=file.name; $('#uploadPreview').classList.add('visible'); $('#dropzone').classList.add('has-image');
  if(file.type.startsWith('image/')){
    const reader=new FileReader(); reader.onload=()=>{const url=reader.result;state.pendingImage=url;state.imageName=file.name;$('#uploadThumb').src=url;model.classList.remove('image-mode');$('#statusText').textContent='M1 / IMAGEN LISTA PARA GENERAR'}; reader.readAsDataURL(file);
  } else { $('#uploadThumb').removeAttribute('src'); $('#modelText').textContent='3D'; model.classList.remove('image-mode'); }
}
$('#fileInput').addEventListener('change',e=>applyReference(e.target.files[0]));
['dragenter','dragover'].forEach(ev=>$('#dropzone').addEventListener(ev,e=>{e.preventDefault();e.currentTarget.classList.add('drag')}));
['dragleave','drop'].forEach(ev=>$('#dropzone').addEventListener(ev,e=>{e.preventDefault();e.currentTarget.classList.remove('drag');if(ev==='drop'&&e.dataTransfer.files[0])applyReference(e.dataTransfer.files[0])}));
$('#removeImage').addEventListener('click',()=>{$('#fileInput').value='';state.pendingImage=null;state.imageName=null;$('#uploadPreview').classList.remove('visible');$('#dropzone').classList.remove('has-image');$('#imageRelief').style.backgroundImage='';model.classList.remove('image-mode');$('#prompt').value='';$('#counter').textContent='0 / 240';$('#statusText').textContent='M1 LISTA'});
const modeInfo={relief:['Relieve 3D local','La imagen se convierte en una malla de profundidad dentro del navegador.'],lithophane:['Litofanía iluminada','Los tonos claros y oscuros controlan el espesor para revelar la imagen con luz.'],plaque:['Placa personalizada','La imagen se monta sobre una base sólida con espesor imprimible.'],figure:['Figura completa 360°','Necesita un motor IA externo para inferir espalda, laterales y geometría faltante.']};
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{$$('[data-mode]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.mode=b.dataset.mode;const m=modeInfo[state.mode];$('#pipelineNote').innerHTML=`<i>${state.mode==='figure'?'API':'✓'}</i><span><b>${m[0]}</b><small>${m[1]}</small></span>`;$('#generateBtn').classList.toggle('needs-api',state.mode==='figure')}));

function updateQuote(){
  const w=+$('#width').value||120,h=+$('#height').value||80,d=+$('#depth').value||45, finish=+$('#finish').value;
  const mult={PLA:1,PETG:1.18,Resina:1.55}[state.material]; state.price=Math.max(22,(18+(w*h*d/100000)*10)*mult*(.85+finish*.18));
  const price=`S/ ${state.price.toFixed(2)}`; $('#price').textContent=$('#orderPrice').textContent=$('#payAmount').textContent=price;
  $('#time').textContent=`${Math.max(1,Math.round(state.price/14))} h ${Math.round((state.price%14)*4)} min`;
  $('#widthLabel').textContent=`${w} mm`;$('#heightLabel').textContent=`${h} mm`;$('#orderSpec').textContent=`${state.material} · ${w} × ${h} × ${d} mm`;
  const sx=Math.min(1.4,Math.max(.65,w/120)),sy=Math.min(1.35,Math.max(.65,h/80));model.style.scale=`${sx} ${sy} 1`;
}
$$('.dimensions input').forEach(i=>i.addEventListener('input',updateQuote)); $('#finish').addEventListener('input',updateQuote);
$$('[data-material]').forEach(b=>b.addEventListener('click',()=>{$$('[data-material]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.material=b.dataset.material;updateQuote()}));
$$('[data-color]').forEach(b=>b.addEventListener('click',()=>{$$('[data-color]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.color=b.dataset.color;document.documentElement.style.setProperty('--orange',state.color);window.dispatchEvent(new CustomEvent('impre3d-relief-color',{detail:{color:state.color}}))}));
$('#checkoutBtn').addEventListener('click',()=>showStep(3)); $$('[data-back]').forEach(b=>b.addEventListener('click',()=>showStep(+b.dataset.back)));
$('#confirmBtn').addEventListener('click',()=>{machine.classList.add('printing');$('#statusText').textContent='M1 / TRABAJO PROGRAMADO';setTimeout(()=>{machine.classList.remove('printing');showStep(4)},1400)});
$('#restartBtn').addEventListener('click',()=>{showStep(1);$('#prompt').value='';$('#counter').textContent='0 / 240';$('#statusText').textContent='M1 LISTA';$('#nozzleTemp').textContent='24°C';$('#bedTemp').textContent='23°C';$('#chamberTemp').textContent='28°C'});
$$('.step').forEach((b,i)=>b.addEventListener('click',()=>{if(i+1<=Math.min(state.step,3))showStep(i+1)}));

let drag=false,lastX=0,lastY=0;scene.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;scene.setPointerCapture(e.pointerId)});scene.addEventListener('pointermove',e=>{if(!drag)return;state.rotation.y+=(e.clientX-lastX)*.35;state.rotation.x-=(e.clientY-lastY)*.22;lastX=e.clientX;lastY=e.clientY;renderModel()});scene.addEventListener('pointerup',()=>drag=false);scene.addEventListener('wheel',e=>{e.preventDefault();state.zoom=Math.max(.7,Math.min(1.35,state.zoom-e.deltaY*.001));renderModel()},{passive:false});
function renderModel(){model.style.transform=`rotateX(${state.rotation.x}deg) rotateY(${state.rotation.y}deg) scale(${state.zoom})`}

for(let i=0;i<169;i++){const cell=document.createElement('i');if(Math.random()>.52)cell.style.background='#111';else cell.style.background='transparent';$('#qrGrid').appendChild(cell)}
$('#micBtn').addEventListener('click',()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){$('#prompt').placeholder='El dictado no está disponible en este navegador.';return}const r=new SR();r.lang='es-PE';r.onresult=e=>{$('#prompt').value=e.results[0][0].transcript;$('#prompt').dispatchEvent(new Event('input'))};r.start()});
$('#soundToggle').addEventListener('click',e=>e.currentTarget.classList.toggle('active'));
