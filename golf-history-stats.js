/* Golf Voice Scorecard AI - Omat tilastot, testiversio 1.
   Ei muuta nykyisen tuloskortin tallennuslogiikkaa. */
(function () {
  'use strict';
  const KEY = 'golfTuloslaskuriHistory';
  const $ = id => document.getElementById(id);
  const read = () => { try { const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]; } catch {return [];} };
  const clean = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const personal = r => Array.isArray(r.names) ? r.names.findIndex(n=>/^pete$/i.test(String(n).trim())) : -1;
  const total = (r,i) => Number(r.totals?.[i+1]);
  const eligible = r => {const i=personal(r);const n=total(r,i);return i>=0 && Number.isFinite(n) && n>0 && (r.roundHoleCount===undefined || Number(r.roundHoleCount)===18);};
  function refresh() {
    const all=read().filter(eligible), sel=$('statsYear');if(!sel)return;
    const years=[...new Set(all.map(r=>String(r.date||r.savedAt||'').slice(0,4)).filter(y=>/^\d{4}$/.test(y)))].sort().reverse();
    const previous=sel.value;sel.innerHTML='<option value="all">Kaikki vuodet</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join('');
    sel.value=years.includes(previous)||previous==='all'?previous:'all';
    const rows=all.filter(r=>sel.value==='all'||String(r.date||r.savedAt).startsWith(sel.value));
    const nums=rows.map(r=>total(r,personal(r))), avg=nums.length?(nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(1).replace('.',','):'–';
    const cards=[['Kierroksia',rows.length],['Lyöntikeskiarvo',avg],['Paras tulos',nums.length?Math.min(...nums):'–'],['Kultakortti',rows.filter(r=>r.goldCard==='Kyllä').length],['Tasoitus',rows.filter(r=>r.roundType==='Tasoitus').length],['Harkka',rows.filter(r=>r.roundType==='Harkka').length]];
    $('statsSummary').innerHTML=cards.map(([k,v])=>`<div><span>${k}</span><strong>${v}</strong></div>`).join('');
    const by={};rows.forEach(r=>{const k=r.course||'Tuntematon kenttä';(by[k]??=[]).push(total(r,personal(r)));});
    $('statsCourses').innerHTML=Object.entries(by).sort((a,b)=>b[1].length-a[1].length).map(([k,v])=>`<div class="stats-course-row"><strong>${clean(k)}</strong> · ${v.length} kierrosta · ka. ${(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1).replace('.',',')} · paras ${Math.min(...v)}</div>`).join('')||'<p>Ei kierroksia valitulta vuodelta.</p>';
  }
  function toggle() { const el = $('statsCard'); if (!el) return; const show = getComputedStyle(el).display === 'none'; el.hidden = !show; el.style.display = show ? 'block' : 'none'; if (show) refresh(); }
  function add(e) {
    e.preventDefault();const f=e.currentTarget, d=new FormData(f), date=String(d.get('date')||''), course=String(d.get('course')||'').trim(), strokes=Number(d.get('strokes'));
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!course||!Number.isInteger(strokes)||strokes<18||strokes>200)return;
    const history=read();const duplicates=history.filter(r=>r.date===date&&String(r.course||'').trim().toLowerCase()===course.toLowerCase()&&eligible(r)&&total(r,personal(r))===strokes);
    if(duplicates.length&&!confirm('Samalta päivältä, kentältä ja lyöntimäärältä löytyy jo kierros. Tallennetaanko silti?'))return;
    const id='manual-'+(crypto.randomUUID?.()||Date.now());
    history.unshift({id,source:'manual',savedAt:new Date().toISOString(),date,course,roundHoleCount:18,playerCount:1,names:['Pete'],totals:{1:strokes},scores:{1:[]},stablefordPoints:{1:[]},gameFormat:'Lyöntipeli',goldCard:String(d.get('gold')),roundType:String(d.get('type')),notes:'Lisätty käsin; reikäkohtaisia tuloksia ei ole.'});
    try {localStorage.setItem(KEY,JSON.stringify(history));}catch(err){$('statsMessage').textContent='Tallennus epäonnistui: '+err.message;return;}
    $('statsMessage').textContent='Kierros tallennettu kierroshistoriaan.';f.reset();refresh();
    // Nykyisen kierroshistorian näyttö päivitetään avaamalla se seuraavan kerran.
  }
  function init(){const form=$('statsManualForm');if(!form)return;form.elements.date.value=new Date().toLocaleDateString('en-CA');form.addEventListener('submit',add);$('statsYear').addEventListener('change',refresh);}
  window.GolfStats={toggle,refresh};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
