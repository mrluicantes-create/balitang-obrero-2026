'use strict';
const $ = id => document.getElementById(id);
const desktopGroups = [['1'],['2','3'],['4','5'],['6','7'],['8','9'],['10-11'],['12','13'],['14','15'],['16','17'],['18','19'],['20']];
const mobileQuery = matchMedia('(max-width:700px)');
let pages = [], current = '1', zoom = 1, initialized = false, startTouch = null;
let pendingFrame;
const groups = () => mobileQuery.matches ? pages.map(p => [p.number]) : desktopGroups;
const groupIndex = () => groups().findIndex(g => g.includes(current));
const displayed = () => groups()[Math.max(0,groupIndex())];
function fitBook() {
  if (!initialized) return;
  const viewport = $('viewport');
  const ids = displayed();
  const wide = ids.length === 2 || ids[0] === '10-11';
  const ratio = wide ? 1.5 : .75;
  const padX = mobileQuery.matches ? 32 : 128;
  const padY = mobileQuery.matches ? 36 : 44;
  const width = Math.max(100,Math.min(viewport.clientWidth-padX,(viewport.clientHeight-padY)*ratio))*zoom;
  const height = width/ratio;
  $('book').style.width = `${width}px`;
  $('book').style.height = `${height}px`;
  $('canvas').style.width = `${Math.max(viewport.clientWidth,width+padX)}px`;
  $('canvas').style.height = `${Math.max(viewport.clientHeight,height+padY)}px`;
  $('zoomReset').textContent = `${Math.round(zoom*100)}%`;
  $('zoomOut').disabled = zoom <= 1;
  $('zoomIn').disabled = zoom >= 4;
}
function setZoom(value) {
  zoom = Math.max(1,Math.min(4,value));
  fitBook();
  if (zoom === 1) $('viewport').scrollTo(0,0);
}
function showPage(number, direction=0) {
  current = number === '10' || number === '11' ? '10-11' : number;
  if (!pages.some(p=>p.number===current)) current = '1';
  const ids = displayed();
  const book = $('book');
  book.className = ids.length===2 ? 'pair' : '';
  book.setAttribute('aria-busy','true');
  book.replaceChildren();
  $('loadError').hidden=true;
  const loading = ids.map(id => {
    const p=pages.find(p=>p.number===id);
    const frame=document.createElement('div');frame.className='page';frame.style.width=`${100/ids.length}%`;
    const img=new Image();img.alt=`Balitang Obrero 2026 — ${id==='10-11'?'Pages 10–11, complete center spread':'Page '+id} — ${p.title}`;img.draggable=false;
    const promise=new Promise(resolve=>{img.onload=()=>resolve(true);img.onerror=()=>resolve(false);});
    img.src=p.image;frame.append(img);book.append(frame);return promise;
  });
  Promise.all(loading).then(results=>{if(current===number || (current==='10-11'&&['10','11'].includes(number))){book.setAttribute('aria-busy','false');$('loadError').hidden=results.every(Boolean);}});
  const label=ids.join('–');
  $('sectionTitle').textContent=pages.find(p=>p.number===ids[0]).title;
  $('pageSelect').value=current;
  $('position').textContent=`${ids[0]==='10-11'?'Center spread, pages 10–11':'Page'+(ids.length>1?'s ':' ')+label} of 20`;
  const index=groupIndex(), total=groups().length;
  for (const id of ['first','prev','prevSide']) $(id).disabled=index===0;
  for (const id of ['last','next','nextSide']) $(id).disabled=index===total-1;
  $('progress').style.width=`${((index+1)/total)*100}%`;
  document.querySelectorAll('#pageGrid button').forEach(b=>b.classList.toggle('active',ids.includes(b.dataset.page)));
  history.replaceState(null,'',`#page=${current}`);
  setZoom(1);
  if(direction) { void book.offsetWidth;book.classList.add(direction>0?'turn-next':'turn-prev'); }
  // Warm only the next view, keeping the initial download small.
  (groups()[index+1]||[]).forEach(id=>{const im=new Image();im.src=pages.find(p=>p.number===id).image;});
}
function turn(delta) {if(!initialized || !$('contents').hidden)return;const next=groupIndex()+delta;if(next>=0&&next<groups().length)showPage(groups()[next][0],delta);}
function toggleContents(open) {$('contents').hidden=!open;$('contentsButton').setAttribute('aria-expanded',String(open));if(open)$('closeContents').focus();else $('contentsButton').focus();}
async function init() {
  try {
    const response=await fetch('pages.json');if(!response.ok)throw Error('Page list unavailable');pages=await response.json();
    for(const p of pages){
      const option=document.createElement('option');option.value=p.number;option.textContent=p.number==='10-11'?'Pages 10–11':`Page ${p.number}`;$('pageSelect').append(option);
      const button=document.createElement('button');button.dataset.page=p.number;button.setAttribute('aria-label',`Go to page ${p.number}, ${p.title}`);
      const img=new Image();img.src=p.thumbnail;img.alt='';img.loading='lazy';
      const label=document.createElement('span');label.textContent=p.number==='10-11'?'10–11 · CENTER SPREAD':`PAGE ${p.number}`;
      const section=document.createElement('small');section.textContent=p.title;
      button.append(img,label,section);button.onclick=()=>{toggleContents(false);showPage(p.number);};$('pageGrid').append(button);
    }
    initialized=true;
    showPage(decodeURIComponent(location.hash.match(/page=([^&]+)/)?.[1]||'1'));
  } catch(error) {$('loadError').hidden=false;$('book').setAttribute('aria-busy','false');console.error(error);}
}
$('next').onclick=$('nextSide').onclick=()=>turn(1);
$('prev').onclick=$('prevSide').onclick=()=>turn(-1);
$('first').onclick=()=>showPage('1',-1);
$('last').onclick=()=>showPage('20',1);
$('centerLink').onclick=()=>showPage('10-11');
$('pageSelect').onchange=e=>showPage(e.target.value);
$('zoomIn').onclick=()=>setZoom(zoom+.5);
$('zoomOut').onclick=()=>setZoom(zoom-.5);
$('zoomReset').onclick=()=>setZoom(1);
$('contentsButton').onclick=()=>toggleContents($('contents').hidden);
$('closeContents').onclick=()=>toggleContents(false);
$('retry').onclick=()=>initialized?showPage(current):location.reload();
if(!document.fullscreenEnabled){$('fullscreen').hidden=true;}
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('reader').requestFullscreen();}catch(error){console.error('Fullscreen unavailable',error);}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');fitBook();});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!$('contents').hidden){toggleContents(false);return;}
  if(['SELECT','INPUT','TEXTAREA'].includes(document.activeElement.tagName)||!initialized)return;
  if(e.key==='ArrowRight'){e.preventDefault();turn(1);}if(e.key==='ArrowLeft'){e.preventDefault();turn(-1);}
  if(e.key==='Home'){e.preventDefault();showPage('1');}if(e.key==='End'){e.preventDefault();showPage('20');}
});
$('viewport').addEventListener('touchstart',e=>{startTouch=e.touches.length===1&&zoom===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
$('viewport').addEventListener('touchmove',e=>{if(e.touches.length!==1)startTouch=null;},{passive:true});
$('viewport').addEventListener('touchend',e=>{if(!startTouch||zoom!==1||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-startTouch.x,dy=e.changedTouches[0].clientY-startTouch.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)turn(dx<0?1:-1);startTouch=null;},{passive:true});
mobileQuery.addEventListener('change',()=>{if(initialized)showPage(current);});
new ResizeObserver(()=>{cancelAnimationFrame(pendingFrame);pendingFrame=requestAnimationFrame(fitBook);}).observe($('viewport'));
init();
