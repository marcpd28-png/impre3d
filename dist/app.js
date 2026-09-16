const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const state={step:1,price:42.9,material:'PLA',color:'#f05a28',rotation:{x:-14,y:32},zoom:1};
const scene=$('#scene'), model=$('#model'), machine=$('.machine');

function showStep(n){
  state.step=n; $$('.panel-step').forEach(p=>p.classList.toggle('active',+p.dataset.panel===n));
  $$('.step').forEach((s,i)=>s.classList.toggle('active',i+1===Math.min(n,3)));
  if(n===2) updateQuote();
}

$('#prompt').addEventListener('input',e=>{$('#counter').textContent=`${e.target.value.length} / 240`; if(e.target.value.length>240)e.target.value=e.target.value.slice(0,240)});
$('#generateBtn').addEventListener('click',()=>{
  const btn=$('#generateBtn'), prompt=$('#prompt').value.trim();
  btn.disabled=true; btn.firstChild.textContent='GENERANDO '; $('#statusText').textContent='M1 / PREPARANDO CÁMARA'; $('#nozzleTemp').textContent='220°C'; $('#bedTemp').textContent='60°C'; $('#chamberTemp').textContent='34°C'; machine.classList.add('printing');
  if(prompt){const words=prompt.split(/\s+/); $('#orderName').textContent=words.slice(0,5).join(' '); $('#modelText').textContent=(words.find(w=>w.length>2)||'M')[0].toUpperCase()}
  setTimeout(()=>{$('#statusText').textContent='M1 / MODELO LISTO';btn.disabled=false;btn.firstChild.textContent='GENERAR MODELO ';machine.classList.remove('printing');showStep(2)},2850);
});

function applyReference(file){
  if(!file)return;
  $('#prompt').value=`Crear una pieza 3D usando ${file.name} como relieve frontal`;
  $('#counter').textContent=`${$('#prompt').value.length} / 240`;
  $('#uploadName').textContent=file.name; $('#uploadPreview').classList.add('visible'); $('#dropzone').classList.add('has-image');
  if(file.type.startsWith('image/')){
    const reader=new FileReader(); reader.onload=()=>{const url=reader.result;$('#uploadThumb').src=url;$('#imageRelief').style.backgroundImage=`url("${url}")`;model.classList.add('image-mode');$('#statusText').textContent='M1 / TEXTURA CARGADA'}; reader.readAsDataURL(file);
  } else { $('#uploadThumb').removeAttribute('src'); $('#modelText').textContent='3D'; model.classList.remove('image-mode'); }
}
$('#fileInput').addEventListener('change',e=>applyReference(e.target.files[0]));
['dragenter','dragover'].forEach(ev=>$('#dropzone').addEventListener(ev,e=>{e.preventDefault();e.currentTarget.classList.add('drag')}));
['dragleave','drop'].forEach(ev=>$('#dropzone').addEventListener(ev,e=>{e.preventDefault();e.currentTarget.classList.remove('drag');if(ev==='drop'&&e.dataTransfer.files[0])applyReference(e.dataTransfer.files[0])}));
$('#removeImage').addEventListener('click',()=>{$('#fileInput').value='';$('#uploadPreview').classList.remove('visible');$('#dropzone').classList.remove('has-image');$('#imageRelief').style.backgroundImage='';model.classList.remove('image-mode');$('#prompt').value='';$('#counter').textContent='0 / 240';$('#statusText').textContent='M1 LISTA'});

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
$$('[data-color]').forEach(b=>b.addEventListener('click',()=>{$$('[data-color]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.color=b.dataset.color;document.documentElement.style.setProperty('--orange',state.color)}));
$('#checkoutBtn').addEventListener('click',()=>showStep(3)); $$('[data-back]').forEach(b=>b.addEventListener('click',()=>showStep(+b.dataset.back)));
$('#confirmBtn').addEventListener('click',()=>{machine.classList.add('printing');$('#statusText').textContent='M1 / TRABAJO PROGRAMADO';setTimeout(()=>{machine.classList.remove('printing');showStep(4)},1400)});
$('#restartBtn').addEventListener('click',()=>{showStep(1);$('#prompt').value='';$('#counter').textContent='0 / 240';$('#statusText').textContent='M1 LISTA';$('#nozzleTemp').textContent='24°C';$('#bedTemp').textContent='23°C';$('#chamberTemp').textContent='28°C'});
$$('.step').forEach((b,i)=>b.addEventListener('click',()=>{if(i+1<=Math.min(state.step,3))showStep(i+1)}));

let drag=false,lastX=0,lastY=0;scene.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;scene.setPointerCapture(e.pointerId)});scene.addEventListener('pointermove',e=>{if(!drag)return;state.rotation.y+=(e.clientX-lastX)*.35;state.rotation.x-=(e.clientY-lastY)*.22;lastX=e.clientX;lastY=e.clientY;renderModel()});scene.addEventListener('pointerup',()=>drag=false);scene.addEventListener('wheel',e=>{e.preventDefault();state.zoom=Math.max(.7,Math.min(1.35,state.zoom-e.deltaY*.001));renderModel()},{passive:false});
function renderModel(){model.style.transform=`rotateX(${state.rotation.x}deg) rotateY(${state.rotation.y}deg) scale(${state.zoom})`}

for(let i=0;i<169;i++){const cell=document.createElement('i');if(Math.random()>.52)cell.style.background='#111';else cell.style.background='transparent';$('#qrGrid').appendChild(cell)}
$('#micBtn').addEventListener('click',()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){$('#prompt').placeholder='El dictado no está disponible en este navegador.';return}const r=new SR();r.lang='es-PE';r.onresult=e=>{$('#prompt').value=e.results[0][0].transcript;$('#prompt').dispatchEvent(new Event('input'))};r.start()});
$('#soundToggle').addEventListener('click',e=>e.currentTarget.classList.toggle('active'));
