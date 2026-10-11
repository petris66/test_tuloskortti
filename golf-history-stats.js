/* Golf Voice Scorecard AI - Omat tilastot, testiversio 1.
   Ei muuta nykyisen tuloskortin tallennuslogiikkaa. */
(function () {
  'use strict';
  const KEY = 'golfTuloslaskuriHistory';
  const $ = id => document.getElementById(id);
  const read = () => { try { const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]; } catch {return [];} };
  const clean = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const personal = r => Array.isArray(r.names) ? r.names.findIndex(n=>/^pete$/i.test(String(n).trim())) : -1;
  const total = (r,i) => {const x=r.totals?.[i+1];return x===null||x===undefined||x===''?NaN:Number(x);};
  const normalize = r => {
    if (!r || !String(r.id||'').startsWith('excel-20261011-')) return r;
    if (r.id==='excel-20261011-2025-42' && String(r.date).startsWith('3025-')) return {...r,date:'2025'+r.date.slice(4),notes:(r.notes||'')+' | Korjattu näyttövuosi 3025 → 2025'};
    if (r.id==='excel-20261011-2025-37') return {...r,roundHoleCount:9,notes:(r.notes||'')+' | 9 reikää: Excelissä Ysi'};
    if (r.id==='excel-20261011-2023-60') return {...r,statsExcludeStrokes:true,notes:(r.notes||'')+' | Tarkistettava: 50 lyöntiä, reikämäärä epävarma'};
    return r;
  };
  const eligible = r => personal(r)>=0;
  const valid = r => {if(r.statsExcludeStrokes)return false;const n=total(r,personal(r));return Number.isFinite(n)&&n>0;};
  const holes = r => Number(r.roundHoleCount)===9?9:18;
  const average = nums => nums.length?(nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(1).replace('.',','):'–';
  function repairKnownDates() {
    const fixes = new Map([['excel-20261011-2025-47','2025-10-07'],['excel-20261011-2026-76','2026-08-27']]);
    const history=read();let changed=false;
    const next=history.map(r=>{const date=r&&fixes.get(r.id);if(date&&r.date!==date){changed=true;return {...r,date,notes:(r.notes||'')+' | Päivämäärä korjattu käyttäjän vahvistuksen mukaan'};}return r;});
    if(changed){try{localStorage.setItem(KEY,JSON.stringify(next));}catch(e){/* Näyttö jatkaa korjauksilla niin pitkälle kuin mahdollista. */}}
  }
  function refresh() {
    repairKnownDates();
    const all=read().map(normalize).filter(eligible), sel=$('statsYear');if(!sel)return;
    const yearOf=r=>String(r.date||r.excelYear||r.savedAt||'').slice(0,4);
    const years=[...new Set(all.map(yearOf).filter(y=>/^20\d{2}$/.test(y)))].sort().reverse();
    const previous=sel.value;sel.innerHTML='<option value="all">Kaikki vuodet</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join('');
    sel.value=years.includes(previous)||previous==='all'?previous:'all';
    const rows=all.filter(r=>sel.value==='all'||yearOf(r)===sel.value);
    const full=rows.filter(r=>holes(r)===18&&valid(r));
    const half=rows.filter(r=>holes(r)===9&&valid(r));
    const nums=full.map(r=>total(r,personal(r)));
    const cards=[['Kierrosmerkintöjä',rows.length],['18 reiän kierroksia',rows.filter(r=>holes(r)===18).length],['18 r. lyöntikeskiarvo',average(nums)],['18 r. paras tulos',nums.length?Math.min(...nums):'–'],['9 reiän kierroksia',rows.filter(r=>holes(r)===9).length],['9 r. lyöntikeskiarvo',average(half.map(r=>total(r,personal(r))))],['Ilman lyöntitulosta',rows.filter(r=>!valid(r)).length],['Kultakortti',rows.filter(r=>r.goldCard==='Kyllä').length],['Tasoitus',rows.filter(r=>r.roundType==='Tasoitus').length],['Harkka',rows.filter(r=>r.roundType==='Harkka').length]];
    $('statsSummary').innerHTML=cards.map(([k,v])=>`<div><span>${k}</span><strong>${v}</strong></div>`).join('');
    const by={};rows.forEach(r=>{const k=r.course||'Tuntematon kenttä';(by[k]??=[]).push(r);});
    $('statsCourses').innerHTML=Object.entries(by).sort((a,b)=>b[1].length-a[1].length).map(([k,v])=>{const n=v.filter(r=>holes(r)===18&&valid(r)).map(r=>total(r,personal(r)));const h=v.filter(r=>holes(r)===9&&valid(r)).map(r=>total(r,personal(r)));return `<div class="stats-course-row"><strong>${clean(k)}</strong> · ${v.length} merkintää · 18 r. ka. ${average(n)} · paras ${n.length?Math.min(...n):'–'}${h.length?' · 9 r. ka. '+average(h):''}</div>`;}).join('')||'<p>Ei kierroksia valitulta vuodelta.</p>';
    renderExtras(all,rows,sel.value);
  }

  function renderExtras(all,rows,year) {
    const card=$('statsCard');if(!card)return;
    let container=$('statsExtra');
    if(!container){container=document.createElement('div');container.id='statsExtra';const courses=$('statsCourses');courses?.insertAdjacentElement('afterend',container);}
    const yOf=r=>String(r.date||r.excelYear||r.savedAt||'').slice(0,4);
    const monthly={},undated={};
    for(const r of all){
      const y=yOf(r),d=String(r.date||'');
      if(!/^20\d{2}$/.test(y))continue;
      if(!/^20\d{2}-\d{2}-\d{2}$/.test(d)){undated[y]=(undated[y]||0)+1;continue;}
      const dateYear=d.slice(0,4),m=Number(d.slice(5,7));
      if(m<1||m>12){undated[y]=(undated[y]||0)+1;continue;}
      (monthly[dateYear]??=Array(12).fill(0))[m-1]++;
    }
    const ys=[...new Set([...Object.keys(monthly),...Object.keys(undated)])].sort();
    ys.forEach(y=>{monthly[y]??=Array(12).fill(0);});
    const months=['Tammi','Helmi','Maalis','Huhti','Touko','Kesä','Heinä','Elo','Syys','Loka','Marras','Joulu'];
    const header='<th>Kuukausi</th>'+ys.map(y=>'<th>'+y+'</th>').join('');
    const lines=months.map((m,i)=>'<tr><th>'+m+'</th>'+ys.map(y=>'<td>'+monthly[y][i]+'</td>').join('')+'</tr>').join('');
    const missing='<tr><th>Päivämäärä puuttuu</th>'+ys.map(y=>'<td>'+((undated[y]||0))+'</td>').join('')+'</tr>';
    const totals='<tr><th>Yhteensä</th>'+ys.map(y=>'<th>'+(monthly[y].reduce((a,b)=>a+b,0)+(undated[y]||0))+'</th>').join('')+'</tr>';
    const sorted=[...rows].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    const lines2=sorted.map(r=>{const i=personal(r),n=total(r,i),score=Number.isFinite(n)&&n>0?n:'–';return '<tr><td>'+clean(r.date||'–')+'</td><td>'+clean(r.course||'–')+'</td><td>'+score+(r.statsExcludeStrokes?' *':'')+'</td><td>'+holes(r)+'</td><td>'+clean(r.goldCard||'–')+'</td><td>'+clean(r.roundType||'–')+'</td><td title="'+clean(r.notes||'')+'">'+clean(r.notes||'–')+'</td></tr>';}).join('');
    container.innerHTML='<h3>Kuukausivertailu 2022–2026</h3><div style="overflow-x:auto"><table class="stats-detail-table"><thead><tr>'+header+'</tr></thead><tbody>'+lines+totals+'</tbody></table></div><h3>Kierrosluettelo ('+sorted.length+')</h3><p class="muted">* Epävarma lyöntitulos: ei mukana keskiarvossa ennen tarkistusta.</p><div style="overflow-x:auto;max-height:520px;overflow-y:auto"><table class="stats-detail-table"><thead><tr><th>Päivämäärä</th><th>Kenttä</th><th>Lyönnit</th><th>Reikiä</th><th>Kultakortti</th><th>Tyyppi</th><th>Huomautukset</th></tr></thead><tbody>'+lines2+'</tbody></table></div>';
    if(!$('statsExtraStyle')){const st=document.createElement('style');st.id='statsExtraStyle';st.textContent='.stats-detail-table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0 20px}.stats-detail-table th,.stats-detail-table td{border-bottom:1px solid #c5d4c5;padding:7px 10px;text-align:left;white-space:nowrap}.stats-detail-table thead th{position:sticky;top:0;background:#edf3ea}.stats-detail-table tbody tr:hover{background:#eef5e9}';document.head.append(st);}
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
