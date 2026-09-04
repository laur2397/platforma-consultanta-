/* ============ ZONA INSTRUMENTE — baze de date, financiar, administrare ============ */
"use strict";
/* ============ MODUL BAZE DE DATE ============ */
const PRIM = (DB.primarii && DB.primarii.uat) || [];
const bznorm = s=>(s||'').toString().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[ăâîșțĂÂÎȘȚ]/g,c=>({'ă':'a','â':'a','î':'i','ș':'s','ț':'t','Ă':'A','Â':'A','Î':'I','Ș':'S','Ț':'T'}[c]||c)).toLowerCase();
PRIM.forEach(u=>u._k=bznorm(u.n+' '+u.j+' '+u.pr));

function bzState(){ if(!S.baze){ S.baze={sub:'prezentare',q:'',judet:'',tip:'',limit:200}; const o=window.__sess&&window.__sess.baze; if(o&&typeof o==="object") Object.assign(S.baze,o); } return S.baze; }

const SIC = DB.sicap || {items:[]};
const SICI = SIC.items || [];
SICI.forEach(o=>o._k=bznorm(o.n+' '+o.auth+' '+o.sup+' '+o.cpv));
function vBaze(){ const b=bzState();
  let h='<div class="viewtitle"><h1>🗄️ Baze de date</h1><span class="sub">registre publice integrate în platformă</span></div>';
  h+='<div class="subnav">'+[['prezentare','Prezentare'],['primarii','Primării ('+nf.format(PRIM.length)+')'],['proiecte','Proiecte contractate ('+nf.format(PROJ.length)+')'],['sicap','Achiziții SICAP ('+nf.format(SICI.length)+')'],['registre','Registre atestate ('+nf.format(Object.values((DB.registre||{reg:{}}).reg||{}).reduce((a,x)=>a+x.length,0))+')'],['entitati','Instituții & entități'],['verificari','Verificări & context']].map(([k,l])=>'<button class="'+(b.sub===k?'on':'')+'" onclick="bzSub(\''+k+'\')">'+l+'</button>').join('')+'</div>';
  h+='<div id="bzView">'+(b.sub==='primarii'?bzDir():b.sub==='sicap'?scDir():b.sub==='proiecte'?pjDir():b.sub==='registre'?rgDir():b.sub==='entitati'?enDir():b.sub==='verificari'?vfDir():bzDash())+'</div>';
  return h; }
function bzSub(s){ bzState().sub=s; render(); }

/* ---------- Dashboard bazei ---------- */
function bzDash(){
  const nM=PRIM.filter(u=>u.t==='municipiu').length, nO=PRIM.filter(u=>u.t==='oras').length, nC=PRIM.filter(u=>u.t==='comuna').length;
  const nP=PRIM.filter(u=>u.pr).length, nE=PRIM.filter(u=>u.e).length, nW=PRIM.filter(u=>u.w).length;
  const tot=PRIM.reduce((s,u)=>s+u.p,0);
  let h='<div class="tiles">';
  h+='<div class="tile acc"><div class="v">'+nf.format(PRIM.length)+'</div><div class="l">primării (UAT)</div><div class="d">42 județe + București</div></div>';
  h+='<div class="tile long"><div class="v">'+nM+' / '+nO+' / '+nC+'</div><div class="l">municipii / orașe / comune</div></div>';
  h+='<div class="tile acc"><div class="v">'+nf.format(tot)+'</div><div class="l">locuitori (RPL 2021)</div></div>';
  h+='<div class="tile"><div class="v">'+Math.round(100*nP/PRIM.length)+'%</div><div class="l">cu primar</div><div class="d">'+Math.round(100*nE/PRIM.length)+'% e-mail · '+Math.round(100*nW/PRIM.length)+'% website</div></div>';
  h+='</div>';
  // carduri baze
  h+='<div class="section"><h2>Registre disponibile</h2><div class="grid2">';
  h+='<div class="dbcard"><div class="ic2">🏛️</div><div style="flex:1"><h3>Primării (UAT) <span class="st activ">ACTIV</span></h3><div class="meta">Toate cele '+nf.format(PRIM.length)+' de unități administrativ-teritoriale: primar, e-mail oficial, website, populație; reședințele cu telefon și adresă.<br><b>Surse:</b> INS (RPL 2021), Wikidata (primar, P6), data.gov.ro (e-mail + SIRUTA).<br><b>Actualizat:</b> '+esc((DB.primarii||{}).generat||'')+'. <b>Contacte verificate:</b> '+((DB.primarii||{}).liveness?nf.format(DB.primarii.liveness.live)+' site-uri funcționale din '+nf.format(DB.primarii.liveness.total_site)+', '+nf.format(DB.primarii.liveness.tel_extrase)+' telefoane extrase':'—')+'.</div><div style="margin-top:9px"><button class="btn small primary" onclick="bzSub(\'primarii\')">Deschide directorul →</button></div></div></div>';
  h+='<div class="dbcard"><div class="ic2">🏢</div><div style="flex:1"><h3>Registrul firmelor (ONRC) <span class="st prep">ÎN PREGĂTIRE</span></h3><div class="meta">Registrul complet al comerțului (CUI, denumire, CAEN autorizat, județ, stare) — motorul pentru prospectare CAEN×județ și CRM.<br><b>Sursă:</b> data.gov.ro (bulk CSV, ~1,3 GB, actualizat mai 2025).<br><b>Notă:</b> se integrează ca agregate + motor de prospectare + extrase la cerere (milioanele de firme nu încap într-o pagină statică).</div></div></div>';
  h+='<div class="dbcard"><div class="ic2">📊</div><div style="flex:1"><h3>Proiecte contractate (MIPE) <span class="st activ">ACTIV</span></h3><div class="meta">'+nf.format(PROJ.length)+' de proiecte finanțate (POR, POCU, POC, POIM, POAT) — cine a luat fonduri, pe ce program, unde, cât. Motor de prospectare: clienți educați + piață albă.<br><b>Sursă:</b> data.gov.ro / MIPE (instantaneu 31 aug. 2025, actualizat iulie 2026).</div><div style="margin-top:9px"><button class="btn small primary" onclick="bzSub(\'proiecte\')">Deschide →</button></div></div></div>';
  h+='<div class="dbcard"><div class="ic2">🛒</div><div style="flex:1"><h3>Achiziții SICAP (e-licitatie.ro) <span class="st activ">TEST LIVE</span></h3><div class="meta">Motor de căutare pe domenii peste fluxul de achiziții directe deschise — autoritate, valoare, CPV, termene.<br><b>Sursă:</b> API SICAP (snapshot live, '+esc((SIC.generat||'').slice(0,10))+', '+nf.format(SICI.length)+' achiziții).<br><b>Notă:</b> snapshot reîmprospătabil zilnic. Timp real 100% în pagină = prin proxy (pasul următor). Licitațiile mari se adaugă tot acolo.</div><div style="margin-top:9px"><button class="btn small primary" onclick="bzSub(\'sicap\')">Deschide motorul →</button></div></div></div>';
  h+='<div class="dbcard"><div class="ic2">🏛</div><div style="flex:1"><h3>Instituții & entități <span class="st activ">ACTIV</span></h3><div class="meta">42 prefecturi + 41 consilii județene (contact oficial), '+nf.format((ENT.autoritati||[]).length)+' autorități contractante (cu CUI) și '+nf.format((ENT.furnizori||[]).length)+' furnizori activi.<br><b>Surse:</b> data.gov.ro + derivat din fluxul SICAP.</div><div style="margin-top:9px"><button class="btn small primary" onclick="bzSub(\'entitati\')">Deschide →</button></div></div></div>';
  h+='<div class="dbcard"><div class="ic2">✅</div><div style="flex:1"><h3>Verificări & context <span class="st activ">ACTIV</span></h3><div class="meta">Cele 3 verificări eliminatorii dinainte de GO (minimis pe întreprindere unică prin RegAS, status fiscal ANAF, întreprindere în dificultate) + cursul oficial InforEuro + rata șomajului pe județe pentru justificarea cererilor.<br><b>Surse:</b> Consiliul Concurenței, ANAF, Comisia Europeană, ANOFM.</div><div style="margin-top:9px"><button class="btn small primary" onclick="bzSub(\'verificari\')">Deschide →</button></div></div></div>';
  const nReg=Object.values((DB.registre||{reg:{}}).reg||{}).reduce((a,x)=>a+x.length,0);
  const nRegC=Object.values((DB.registre||{reg:{}}).reg||{}).reduce((a,x)=>a+x.filter(r=>r[2]||r[3]).length,0);
  h+='<div class="dbcard"><div class="ic2">📐</div><div style="flex:1"><h3>Registre profesionale atestate <span class="st activ">ACTIV</span></h3><div class="meta">'+nf.format(nReg)+' de specialiști atestați — verificatori de proiecte, experți tehnici, auditori energetici, diriginți de șantier — cu județ, domenii de atestare, serie certificat și valabilitate. '+nf.format(nRegC)+' au contact direct (e-mail sau telefon).<br><b>Surse:</b> MDLPA + I.S.C. via data.gov.ro (registre publicate 2025–2026).<br><b>La ce folosește:</b> compui echipa tehnică a proiectului în câteva minute și justifici bugetul de servicii din deviz.</div><div style="margin-top:9px"><button class="btn small primary" onclick="bzSub(\'registre\')">Deschide registrele →</button></div></div></div>';
  h+='</div></div>';
  // grafic top judete dupa populatie
  const byJ={};
  PRIM.forEach(u=>{ if(!byJ[u.j])byJ[u.j]={n:0,p:0}; byJ[u.j].n++; byJ[u.j].p+=u.p; });
  const top=Object.entries(byJ).sort((a,b)=>b[1].p-a[1].p).slice(0,12);
  const mx=Math.max(...top.map(x=>x[1].p));
  h+='<div class="section card"><h2 style="font-size:14px;margin-bottom:10px">Top 12 județe după populație</h2>'+top.map(([j,v])=>'<div class="hbar"><span>'+esc(j)+'</span><div class="trk"><div class="fil" style="width:'+Math.max(2,v.p/mx*100)+'%"></div></div><span class="vv">'+nf.format(v.p)+' · '+v.n+' UAT</span></div>').join('')+'</div>';
  return h;
}

/* ---------- Subpagina Primării (director) ---------- */
const BZ_JUD=[...new Set(PRIM.map(u=>u.j))].sort((a,b)=>a.localeCompare(b,'ro'));
function bzDir(){ const b=bzState();
  let h='<div class="filters"><input type="text" id="bzq" placeholder="caută primărie, județ sau primar…" value="'+esc(b.q)+'" oninput="bzSet(\'q\',this.value)" style="flex:1;min-width:200px">';
  h+='<select onchange="bzSet(\'judet\',this.value)"><option value="">— toate județele —</option>'+BZ_JUD.map(j=>'<option '+(b.judet===j?'selected':'')+'>'+esc(j)+'</option>').join('')+'</select>';
  h+=[['','Toate'],['municipiu','Municipii'],['oras','Orașe'],['comuna','Comune']].map(([t,l])=>'<button class="fchip '+(b.tip===t?'on':'')+'" onclick="bzSet(\'tip\',\''+t+'\')">'+l+'</button>').join('');
  h+=[['tel','☎ cu telefon'],['live','🌐 site viu'],['prob','⚠ de actualizat']].map(([k,l])=>'<button class="fchip '+(b.only===k?'on':'')+'" onclick="bzSet(\'only\',\''+(b.only===k?'':k)+'\')">'+l+'</button>').join('');
  h+='<button class="btn small" onclick="bzExport()">⬇ Export CSV</button><button class="btn small" onclick="bzCopy(\'email\')" title="copiază e-mailurile din lista filtrată">✉ copiază e-mailurile</button><button class="btn small" onclick="bzCopy(\'tel\')" title="copiază telefoanele din lista filtrată">☎ copiază telefoanele</button>'+(b.sort?'<button class="btn small ghost" onclick="bzSort(null)">↺ grupare pe județ</button>':'');
  h+='<span class="count" id="bzCount" style="margin-left:auto;color:var(--muted);font-size:12.5px"></span></div>';
  const sh=(k,l,cls)=>'<th class="sortable'+(cls?' '+cls:'')+(b.sort===k?' on':'')+'" onclick="bzSort(\''+k+'\')" title="sortează">'+l+(b.sort===k?(b.dir<0?' ▾':' ▴'):'')+'</th>';
  h+='<div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr>'+sh('n','Primărie')+sh('j','Județ')+sh('p','Populație','num')+sh('pr','Primar')+'<th>Contact</th></tr></thead><tbody id="bzBody"></tbody></table></div>';
  h+='<button class="btn" id="bzMore" style="margin:14px auto;display:block" onclick="bzState().limit+=500;bzRefresh()">Arată mai multe…</button>';
  const LV=(DB.primarii||{}).liveness;
  if(LV){ h+='<div class="callout warn" style="margin-top:12px"><b>Verificare contacte, '+esc(LV.verificat_la)+':</b> din '+nf.format(LV.total_site)+' de site-uri testate, <b>'+nf.format(LV.live)+' funcționează</b>, '+nf.format(LV.mort)+' sunt moarte (domeniu inexistent/timeout) și '+nf.format(LV.eroare)+' dau erori HTTP. Am extras <b>'+nf.format(LV.tel_extrase)+' telefoane</b> și '+nf.format(LV.email_extrase)+' e-mailuri de pe site-urile vii, înlocuind '+nf.format(LV.email_recomandat_nou)+' adrese vechi. Atenție: '+nf.format(LV.email_freemail)+' adrese din setul oficial 2017 sunt pe free-mail (yahoo/rcnet) — marcate în listă. Telefonul afișat este cel <b>oficial al primăriei</b>; numerele personale ale primarilor nu sunt date publice.</div>'; }
  h+='<div class="callout" style="margin-top:12px">Datele despre primari reflectă starea curentă din Wikidata (pot avea mici decalaje la schimbări foarte recente). Multe e-mailuri provin din setul data.gov.ro din 2017 — pentru contacte 100% la zi, validarea „viu/mort" a site-urilor rămâne pasul următor.</div>';
  setTimeout(bzRefresh,0);
  return h; }
function bzSet(k,v){ const b=bzState(); b[k]=v; b.limit=200;
  if(k==='q'){ bzRefresh(); } else { render(); } }
function bzSort(k){ const b=bzState(); if(k===null){ b.sort=null; b.dir=1; } else if(b.sort===k) b.dir=-(b.dir||1); else { b.sort=k; b.dir=(k==='p'?-1:1); } b.limit=200; render(true); }
function bzCopy(kind){ const r=bzFilter(); const vals=[...new Set(r.map(u=>kind==='email'?(u.e_rec||u.e||''):(u.tel||u.ph2||'')).filter(Boolean))]; if(!vals.length){ toast('Nimic de copiat în lista filtrată'); return; } copyTxt(vals.join(kind==='email'?'; ':'\n'), vals.length+(kind==='email'?' e-mailuri copiate':' telefoane copiate')); }
function bzFilter(){ const b=bzState(); let r=PRIM;
  if(b.judet) r=r.filter(u=>u.j===b.judet);
  if(b.tip) r=r.filter(u=>u.t===b.tip);
  if(b.only==='tel') r=r.filter(u=>u.tel||u.ph2);
  if(b.only==='live') r=r.filter(u=>u.wst==='live');
  if(b.only==='prob') r=r.filter(u=>u.wst==='mort'||u.wst==='eroare'||u.ef===1);
  if(b.q){ const q=bznorm(b.q); r=r.filter(u=>u._k.includes(q)); }
  const k=b.sort||'grup', d=b.dir||1;
  r=r.slice().sort((a,z)=>{
    if(k==='grup') return a.j.localeCompare(z.j,'ro')||(z.p-a.p);
    if(k==='p') return (a.p-z.p)*d;
    return ((a[k]||'').localeCompare(z[k]||'','ro'))*d||(z.p-a.p);
  });
  return r; }
function bzContact(u){ let h='<div class="ct2">';
  const em=u.e_rec||u.e||'';
  if(em){ const flag=(u.ef&&u.e_rec&&u.e_rec!==u.e)?' <span class="resb" title="înlocuit — cel din 2017 era pe free-mail/domeniu vechi">actualizat</span>':(u.ef===1?' <span class="flag" title="adresă pe free-mail (yahoo/gmail) din setul 2017 — poate fi inactivă">free-mail</span>':'');
    h+='<a href="mailto:'+esc(em)+'">✉ '+esc(em)+'</a>'+flag; }
  const tel=u.tel||u.ph2||'';
  if(tel) h+='<span>☎ '+esc(tel)+(u.ph2&&!u.tel?' <small style="color:var(--muted)">(de pe site)</small>':'')+'</span>';
  if(u.w){ const st=u.wst||'';
    const ic= st==='live'?'<span class="hdot g" title="site funcțional (verificat 31.07.2026)"></span>':(st==='mort'?'<span class="hdot r" title="site inaccesibil — domeniu inexistent sau timeout"></span>':(st==='eroare'?'<span class="hdot y" title="site cu eroare HTTP"></span>':''));
    h+='<a href="'+esc(u.w)+'" target="_blank" rel="noopener" style="'+(st==='mort'?'text-decoration:line-through;color:var(--muted)':'')+'">'+ic+' 🌐 '+esc(u.w.replace(/^https?:\/\//,'').replace(/\/$/,''))+'</a>'; }
  if(u.adr) h+='<span style="color:var(--muted)">'+esc(u.adr)+'</span>';
  if(!em&&!tel&&!u.w) h+='<a style="font-size:11.5px;color:var(--muted)" href="https://www.google.com/search?q='+encodeURIComponent('primaria '+u.n+' '+u.j)+'" target="_blank" rel="noopener">🔎 caută contactul</a>';
  return h+'</div>'; }
function bzRefresh(){ const b=bzState(); const r=bzFilter(); const body=document.getElementById('bzBody'); if(!body) return;
  const grp = (b.sort||'grup')==='grup' && !b.q;
  const show=r.slice(0,b.limit); let html='',last=null;
  const TP={municipiu:'MUN',oras:'ORAȘ',comuna:'COM'};
  for(const u of show){
    if(grp && u.j!==last){ const cj=r.filter(x=>x.j===u.j); html+='<tr class="jgrp"><td colspan="5">'+esc(u.j)+' — '+cj.length+' UAT · '+nf.format(cj.reduce((s,x)=>s+x.p,0))+' loc.</td></tr>'; last=u.j; }
    html+='<tr><td><span class="tpb '+u.t+'">'+TP[u.t]+'</span>'+esc(u.n)+(u.r?'<span class="resb">reședință</span>':'')+'</td><td>'+esc(u.j)+'</td><td class="num">'+nf.format(u.p)+'</td><td>'+(u.pr?esc(u.pr):'<span style="color:var(--muted)">—</span>')+'</td><td>'+bzContact(u)+'</td></tr>';
  }
  body.innerHTML=html;
  const cnt=document.getElementById('bzCount'); if(cnt) cnt.textContent=nf.format(r.length)+' din '+nf.format(PRIM.length);
  const more=document.getElementById('bzMore'); if(more){ more.style.display=r.length>b.limit?'block':'none'; more.textContent='Arată mai multe ('+nf.format(r.length-b.limit)+' rămase)'; }
}
function bzExport(){ const r=bzFilter(); const b=bzState();
  const head=['Judet','UAT','Tip','Populatie_2021','Primar','Email_recomandat','Email_2017','Telefon','Website','Status_website','SIRUTA'];
  const rows=r.map(u=>[u.j,u.n,u.t,u.p,u.pr,(u.e_rec||u.e||''),u.e,(u.tel||u.ph2||''),u.w,u.wst||'',u.s]);
  const csv=[head].concat(rows).map(row=>row.map(c=>{const s=(c==null?'':String(c));return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\n');
  dl('Primarii'+(b.judet?'_'+bznorm(b.judet):'')+'.csv','﻿'+csv,'text/csv;charset=utf-8'); toast('Export generat'); }

/* ---------- Subpagina Achiziții SICAP (motor de căutare live) ---------- */
function scState(){ const b=bzState(); if(!b.sic) b.sic={dom:'',q:'',minval:'',sort:'pub',dir:-1,limit:80}; return b.sic; }
const SIC_DOMS=(SIC.domenii||[]).slice();
function scDir(){ const s=scState();
  const totVal=SICI.reduce((a,o)=>a+(o.val||0),0);
  const dmin=SICI.reduce((a,o)=>o.pub&&o.pub<a?o.pub:a,'9999'), dmax=SICI.reduce((a,o)=>o.pub>a?o.pub:a,'');
  let h='<div class="callout" style="margin-bottom:12px"><b>Snapshot live</b> din API-ul SICAP (e-licitatie.ro), tras la '+esc((SIC.generat||'').replace('T',' ').replace('Z',' UTC'))+' — '+nf.format(SICI.length)+' achiziții directe deschise, interval '+esc(dmin)+' … '+esc(dmax)+'. Se reîmprospătează prin comanda „actualizează achiziții" sau prin task-ul zilnic. Pentru interogare live la fiecare căutare (timp real 100%) urmează varianta cu proxy.</div>';
  h+='<div class="tiles">';
  h+='<div class="tile acc"><div class="v">'+nf.format(SICI.length)+'</div><div class="l">achiziții în flux</div></div>';
  h+='<div class="tile acc"><div class="v">'+money(totVal,"RON")+'</div><div class="l">valoare estimată totală</div></div>';
  h+='<div class="tile"><div class="v">'+(SIC.domenii||[]).length+'</div><div class="l">domenii (CPV)</div></div>';
  h+='<div class="tile"><div class="v" id="scShown">—</div><div class="l">rezultate filtrate</div></div>';
  h+='</div>';
  h+='<div class="filters"><input type="text" id="scq" placeholder="caută denumire, autoritate, furnizor, cod CPV…" value="'+esc(s.q)+'" oninput="scSet(\'q\',this.value)" style="flex:1;min-width:220px">';
  h+='<select onchange="scSet(\'dom\',this.value)"><option value="">— toate domeniile —</option>'+SIC_DOMS.map(d=>'<option '+(s.dom===d.d?'selected':'')+' value="'+esc(d.d)+'">'+esc(d.d)+' ('+d.n+')</option>').join('')+'</select>';
  h+='<select onchange="scSet(\'minval\',this.value)"><option value="">orice valoare</option>'+[['1000','≥ 1.000 lei'],['10000','≥ 10.000 lei'],['50000','≥ 50.000 lei'],['100000','≥ 100.000 lei']].map(v=>'<option value="'+v[0]+'" '+(s.minval===v[0]?'selected':'')+'>'+v[1]+'</option>').join('')+'</select>';
  h+='<select onchange="scSet(\'sort\',this.value)"><option value="pub" '+(s.sort==='pub'?'selected':'')+'>sortare: dată</option><option value="val" '+(s.sort==='val'?'selected':'')+'>sortare: valoare</option></select>';
  h+='<button class="btn small" onclick="scExport()">⬇ Export CSV</button>';
  h+='<span class="count" id="scCount" style="margin-left:auto;color:var(--muted);font-size:12.5px"></span></div>';
  h+='<div class="presets" id="scChips">'+[''].concat(SIC_DOMS.slice(0,8).map(d=>d.d)).map(d=>'<button class="fchip '+(s.dom===d?'on':'')+'" onclick="scSet(\'dom\',\''+d.replace(/'/g,"\\'")+'\')">'+(d||'Toate')+'</button>').join('')+'</div>';
  h+='<div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Achiziție</th><th>Autoritate contractantă</th><th class="num">Valoare est.</th><th>Publicat</th><th>Stare</th><th></th></tr></thead><tbody id="scBody"></tbody></table></div>';
  h+='<button class="btn" id="scMore" style="margin:14px auto;display:block" onclick="scState().limit+=200;scRefresh()">Arată mai multe…</button>';
  h+='<div class="callout" style="margin-top:12px">Datele provin din API-ul public SICAP (neoficial) — sunt informații publice de achiziții. Fiecare rând duce la anunțul oficial de pe e-licitatie.ro. Pentru un produs real, fluxul se cache-uiește defensiv (API-ul se poate schimba fără preaviz).</div>';
  setTimeout(scRefresh,0);
  return h; }
function scSet(k,v){ const s=scState(); s[k]=v; s.limit=80; if(k==='q'||k==='minval'){ scRefresh(); } else { render(); } }
function scFilter(){ const s=scState(); let r=SICI;
  if(s.dom) r=r.filter(o=>o.dom===s.dom);
  if(s.minval) r=r.filter(o=>(o.val||0)>=parseFloat(s.minval));
  if(s.q){ const q=bznorm(s.q); r=r.filter(o=>o._k.includes(q)); }
  const k=s.sort||'pub', d=s.dir||-1;
  r=r.slice().sort((a,z)=> k==='val' ? ((a.val||0)-(z.val||0))*d : (a.pub<z.pub?1:a.pub>z.pub?-1:0));
  return r; }
function scRefresh(){ const s=scState(); const r=scFilter(); const body=document.getElementById('scBody'); if(!body) return;
  const show=r.slice(0,s.limit); let html='';
  for(const o of show){
    html+='<tr><td style="max-width:340px"><b>'+esc(o.n||'(fără titlu)')+'</b><br><span class="tpb comuna" style="background:var(--accent)">'+esc(o.dom)+'</span> <small style="color:var(--muted)">'+esc((o.cpv||'').slice(0,46))+'</small></td>'+
      '<td style="font-size:12px">'+esc(o.auth)+(o.sup?'<br><small style="color:var(--muted)">furnizor: '+esc(o.sup)+'</small>':'')+'</td>'+
      '<td class="num">'+(o.val?nf.format(Math.round(o.val))+' lei':'—')+'</td>'+
      '<td>'+esc(o.pub)+(o.dl?'<br><small style="color:var(--muted)">termen '+esc(o.dl)+'</small>':'')+'</td>'+
      '<td><span class="cd '+(/ofert/i.test(o.stare)?'cd-good':'cd-off')+'">'+esc(o.stare||'—')+'</span></td>'+
      '<td><a href="https://e-licitatie.ro/pub/direct-acquisitions/view/'+o.id+'" target="_blank" rel="noopener" style="font-size:12px">SICAP ↗</a></td></tr>';
  }
  body.innerHTML=html;
  const c=document.getElementById('scCount'); if(c) c.textContent=nf.format(r.length)+' din '+nf.format(SICI.length);
  const sh=document.getElementById('scShown'); if(sh) sh.textContent=nf.format(r.length);
  const m=document.getElementById('scMore'); if(m){ m.style.display=r.length>s.limit?'block':'none'; m.textContent='Arată mai multe ('+nf.format(r.length-s.limit)+' rămase)'; }
}
function scExport(){ const r=scFilter();
  const head=['Denumire','CPV','Domeniu','Valoare_RON','Autoritate','Furnizor','Publicat','Termen','Stare','ID_SICAP'];
  const rows=r.map(o=>[o.n,o.cpv,o.dom,o.val,o.auth,o.sup,o.pub,o.dl,o.stare,o.id]);
  const csv=[head].concat(rows).map(row=>row.map(c=>{const x=(c==null?'':String(c));return /[",\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x;}).join(',')).join('\n');
  dl('SICAP_achizitii'+(scState().dom?'_'+bznorm(scState().dom):'')+'.csv','﻿'+csv,'text/csv;charset=utf-8'); toast('Export generat'); }

/* ---------- Subpagina Proiecte contractate (MIPE) ---------- */
const PROJ = (DB.proiecte_mipe && DB.proiecte_mipe.items) || [];
PROJ.forEach(p=>p._k=bznorm(p.ben+' '+p.tit+' '+p.smis+' '+p.jud));
const PJ_JUD=[...new Set(PROJ.map(p=>p.jud).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ro'));
function pjState(){ const b=bzState(); if(!b.pj) b.pj={q:'',prog:'',jud:'',cat:'',sort:'v',limit:60}; return b.pj; }
function pjDir(){ const s=pjState();
  const totVal=PROJ.reduce((a,p)=>a+(p.v||0),0);
  let h='<div class="callout" style="margin-bottom:12px"><b>Cine a luat fonduri</b> în perioada 2014–2020 (instantaneu oficial MIPE, 31 aug. 2025): '+nf.format(PROJ.length)+' proiecte contractate, '+money(totVal,"lei")+'. Folosește-l pentru prospectare — <b>clienți educați</b> (au mai accesat) și <b>piață albă</b> (județe/domenii sub-reprezentate). Caută un beneficiar ca să vezi tot ce a contractat.</div>';
  h+='<div class="tiles">';
  h+='<div class="tile acc"><div class="v">'+nf.format(PROJ.length)+'</div><div class="l">proiecte contractate</div></div>';
  h+='<div class="tile acc"><div class="v">'+money(totVal,"lei")+'</div><div class="l">valoare cumulată</div></div>';
  h+='<div class="tile"><div class="v">'+new Set(PROJ.map(p=>p.ben)).size.toLocaleString("ro-RO")+'</div><div class="l">beneficiari unici</div></div>';
  h+='<div class="tile"><div class="v" id="pjShown">—</div><div class="l">rezultate filtrate</div></div>';
  h+='</div>';
  h+='<div class="filters"><input type="text" id="pjq" placeholder="caută beneficiar, titlu, cod SMIS, județ…" value="'+esc(s.q)+'" oninput="pjSet(\'q\',this.value)" style="flex:1;min-width:220px">';
  h+='<select onchange="pjSet(\'prog\',this.value)"><option value="">— toate programele —</option>'+['POR','POCU','POC','POIM','POAT'].map(p=>'<option '+(s.prog===p?'selected':'')+'>'+p+'</option>').join('')+'</select>';
  h+='<select onchange="pjSet(\'jud\',this.value)"><option value="">— toate județele —</option>'+PJ_JUD.map(j=>'<option '+(s.jud===j?'selected':'')+'>'+esc(j)+'</option>').join('')+'</select>';
  h+='<select onchange="pjSet(\'cat\',this.value)"><option value="">— tip beneficiar —</option>'+['Privat','Public/UAT','ONG','Educație','Sănătate','Altul'].map(c=>'<option '+(s.cat===c?'selected':'')+'>'+c+'</option>').join('')+'</select>';
  h+='<select onchange="pjSet(\'sort\',this.value)"><option value="v" '+(s.sort==='v'?'selected':'')+'>sortare: valoare</option><option value="ben" '+(s.sort==='ben'?'selected':'')+'>sortare: beneficiar</option></select>';
  h+='<button class="btn small" onclick="pjExport()">⬇ Export CSV</button>';
  h+='<span class="count" id="pjCount" style="margin-left:auto;color:var(--muted);font-size:12.5px"></span></div>';
  h+='<div class="grid2" style="margin-bottom:12px"><div class="card"><h2 style="font-size:13px;margin-bottom:8px">Top 8 județe (nr. proiecte)</h2><div id="pjJudChart"></div></div><div class="card"><h2 style="font-size:13px;margin-bottom:8px">Pe program</h2><div id="pjProgChart"></div></div></div>';
  h+='<div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Beneficiar / proiect</th><th>Program</th><th>Județ</th><th>Tip</th><th class="num">Valoare</th><th></th></tr></thead><tbody id="pjBody"></tbody></table></div>';
  h+='<button class="btn" id="pjMore" style="margin:14px auto;display:block" onclick="pjState().limit+=200;pjRefresh()">Arată mai multe…</button>';
  h+='<div class="callout" style="margin-top:12px">Sursă oficială: data.gov.ro / MIPE (2014–2020, instantaneu 31.08.2025). Județul e completat pentru ~76% din proiecte (unele fișiere nu-l conțin la nivel de rând). Pentru perioada 2021–2027, apelurile se urmăresc în Radar; lista de contractări 2021–2027 nu e încă publicată consolidat.</div>';
  setTimeout(pjRefresh,0);
  return h; }
function pjSet(k,v){ const s=pjState(); s[k]=v; s.limit=60; if(k==='q'){ pjRefresh(); } else { render(); } }
function pjFilter(){ const s=pjState(); let r=PROJ;
  if(s.prog) r=r.filter(p=>p.pg===s.prog);
  if(s.jud) r=r.filter(p=>p.jud===s.jud);
  if(s.cat) r=r.filter(p=>p.cat===s.cat);
  if(s.q){ const q=bznorm(s.q); r=r.filter(p=>p._k.includes(q)); }
  r=r.slice().sort((a,z)=> s.sort==='ben' ? a.ben.localeCompare(z.ben,'ro') : (z.v||0)-(a.v||0));
  return r; }
const CATC={'Privat':'var(--s2)','Public/UAT':'var(--s1)','ONG':'var(--s7)','Educație':'var(--s4)','Sănătate':'var(--s3)','Altul':'var(--muted)'};
function pjRefresh(){ const s=pjState(); const r=pjFilter(); const body=document.getElementById('pjBody'); if(!body) return;
  const show=r.slice(0,s.limit); let html='';
  for(const p of show){
    html+='<tr><td style="max-width:360px"><b class="lnk" title="toate proiectele acestui beneficiar" onclick="pjBen(this)">'+esc(p.ben)+'</b>'+(p.tit?'<br><small style="color:var(--muted)">'+esc(p.tit)+'</small>':'')+(p.smis?' <small style="color:var(--muted)">· SMIS '+esc(p.smis)+'</small>':'')+'</td>'+
      '<td><span class="chip hl">'+esc(p.pg)+'</span></td>'+
      '<td style="font-size:12px">'+(esc(p.jud)||'<span style="color:var(--muted)">—</span>')+'</td>'+
      '<td><span class="tpb" style="background:'+(CATC[p.cat]||'var(--muted)')+'">'+esc(p.cat)+'</span></td>'+
      '<td class="num">'+(p.v?nf.format(p.v)+' lei':'—')+'</td>'+
      '<td style="white-space:nowrap">'+(p.cat==='Privat'?'<button class="btn small ghost" title="adaugă ca prospect în CRM" onclick="pjToCrm(this)" data-ben="'+esc(p.ben)+'" data-jud="'+esc(p.jud||'')+'" data-pg="'+esc(p.pg||'')+'">→ CRM</button>':'')+(p.smis?' <a href="https://mysmis2021.gov.ro" target="_blank" rel="noopener" style="font-size:11px;color:var(--muted)" title="cod SMIS '+esc(p.smis)+'">SMIS</a>':'')+'</td></tr>';
  }
  body.innerHTML=html;
  const c=document.getElementById('pjCount'); if(c) c.textContent=nf.format(r.length)+' din '+nf.format(PROJ.length);
  const sh=document.getElementById('pjShown'); if(sh) sh.textContent=nf.format(r.length);
  const m=document.getElementById('pjMore'); if(m){ m.style.display=r.length>s.limit?'block':'none'; m.textContent='Arată mai multe ('+nf.format(r.length-s.limit)+' rămase)'; }
  // charts (pe setul filtrat)
  const jc={}, pc={};
  r.forEach(p=>{ if(p.jud) jc[p.jud]=(jc[p.jud]||0)+1; pc[p.pg]=(pc[p.pg]||0)+1; });
  const jt=Object.entries(jc).sort((a,b)=>b[1]-a[1]).slice(0,8); const jmax=Math.max(1,...jt.map(x=>x[1]));
  const je=document.getElementById('pjJudChart'); if(je) je.innerHTML=jt.map(([j,n])=>'<div class="hbar"><span style="font-size:12px">'+esc(j)+'</span><div class="trk"><div class="fil" style="width:'+Math.max(2,n/jmax*100)+'%"></div></div><span class="vv">'+n+'</span></div>').join('')||'<div class="empty">—</div>';
  const pt=Object.entries(pc).sort((a,b)=>b[1]-a[1]); const pmax=Math.max(1,...pt.map(x=>x[1]));
  const pe=document.getElementById('pjProgChart'); if(pe) pe.innerHTML=pt.map(([j,n])=>'<div class="hbar"><span style="font-size:12px">'+esc(j)+'</span><div class="trk"><div class="fil" style="width:'+Math.max(2,n/pmax*100)+'%;background:var(--s3)"></div></div><span class="vv">'+n+'</span></div>').join('');
}
function pjBen(el){ const q=el.textContent; pjState().q=q; const i=document.getElementById('pjq'); if(i) i.value=q; pjRefresh(); }
function pjToCrm(el){ const ben=el.dataset.ben, jud=el.dataset.jud, pg=el.dataset.pg; if(CL.some(c=>onrcNorm(c.denumire)===onrcNorm(ben))){ toast('Există deja în CRM'); return; }
  crmAddClient(crmMakeClient({denumire:ben, judet:jud, regiune:jud?onrcRegOf(jud):'', tip:'privat', interese:pg, sursa:'MIPE'})); toast('Adăugat ca prospect: '+ben); }
function pjExport(){ const r=pjFilter();
  const head=['Beneficiar','Titlu','Program','Judet','Tip','SMIS','Valoare_lei'];
  const rows=r.map(p=>[p.ben,p.tit,p.pg,p.jud,p.cat,p.smis,p.v]);
  const csv=[head].concat(rows).map(row=>row.map(c=>{const x=(c==null?'':String(c));return /[",\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x;}).join(',')).join('\n');
  dl('Proiecte_contractate'+(pjState().jud?'_'+bznorm(pjState().jud):'')+(pjState().prog?'_'+pjState().prog:'')+'.csv','﻿'+csv,'text/csv;charset=utf-8'); toast('Export generat'); }

/* ---------- Subpagina Instituții & entități ---------- */
const INST=(DB.institutii&&DB.institutii.items)||[];
const ENT=DB.sicap_entitati||{autoritati:[],furnizori:[]};
const ENTALL=[].concat(
  INST.map(i=>({tip:i.tip,nume:i.nume,jud:i.judet,email:i.email,cui:'',n:0,v:0,dom:[]})),
  (ENT.autoritati||[]).map(a=>({tip:'Autoritate contractantă',nume:a.nume,jud:'',email:'',cui:a.cui,n:a.n,v:a.v,dom:a.dom||[]})),
  (ENT.furnizori||[]).map(f=>({tip:'Furnizor',nume:f.nume,jud:'',email:'',cui:f.cui,n:f.n,v:f.v,dom:f.dom||[]}))
);
ENTALL.forEach(e=>e._k=bznorm(e.nume+' '+e.jud+' '+e.cui));
function enState(){ const b=bzState(); if(!b.en) b.en={q:'',tip:'',limit:80}; return b.en; }
function enDir(){ const s=enState();
  const nA=(ENT.autoritati||[]).length, nF=(ENT.furnizori||[]).length;
  let h='<div class="callout" style="margin-bottom:12px"><b>Instituții și entități</b>: prefecturi și consilii județene (contact oficial), plus autoritățile contractante și furnizorii activi derivați din fluxul SICAP. Autoritățile au <b>CUI</b> — util la verificarea conflictului de interese și la prospectare.</div>';
  h+='<div class="tiles">';
  h+='<div class="tile acc"><div class="v">'+INST.filter(i=>i.tip==='Prefectură').length+' / '+INST.filter(i=>i.tip==='Consiliu Județean').length+'</div><div class="l">prefecturi / consilii jud.</div></div>';
  h+='<div class="tile acc"><div class="v">'+nf.format(nA)+'</div><div class="l">autorități contractante</div><div class="d">'+nf.format((ENT.autoritati||[]).filter(a=>a.cui).length)+' cu CUI</div></div>';
  h+='<div class="tile"><div class="v">'+nf.format(nF)+'</div><div class="l">furnizori activi</div></div>';
  h+='<div class="tile"><div class="v" id="enShown">—</div><div class="l">rezultate filtrate</div></div>';
  h+='</div>';
  h+='<div class="filters"><input type="text" id="enq" placeholder="caută instituție, autoritate, furnizor, CUI…" value="'+esc(s.q)+'" oninput="enSet(\'q\',this.value)" style="flex:1;min-width:220px">';
  h+=[['','Toate'],['Prefectură','Prefecturi'],['Consiliu Județean','Consilii jud.'],['Autoritate contractantă','Autorități'],['Furnizor','Furnizori']].map(([t,l])=>'<button class="fchip '+(s.tip===t?'on':'')+'" onclick="enSet(\'tip\',\''+t+'\')">'+l+'</button>').join('');
  h+='<button class="btn small" onclick="enExport()">⬇ Export CSV</button>';
  h+='<span class="count" id="enCount" style="margin-left:auto;color:var(--muted);font-size:12.5px"></span></div>';
  h+='<div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Denumire</th><th>Tip</th><th>CUI / Județ</th><th>Contact</th><th class="num">Activitate</th></tr></thead><tbody id="enBody"></tbody></table></div>';
  h+='<button class="btn" id="enMore" style="margin:14px auto;display:block" onclick="enState().limit+=200;enRefresh()">Arată mai multe…</button>';
  setTimeout(enRefresh,0);
  return h; }
function enSet(k,v){ const s=enState(); s[k]=v; s.limit=80; if(k==='q'){enRefresh();} else {render();} }
function enFilter(){ const s=enState(); let r=ENTALL;
  if(s.tip) r=r.filter(e=>e.tip===s.tip);
  if(s.q){ const q=bznorm(s.q); r=r.filter(e=>e._k.includes(q)); }
  return r.slice().sort((a,z)=>(z.v||0)-(a.v||0)||a.nume.localeCompare(z.nume,'ro')); }
const TIPC={'Prefectură':'var(--s7)','Consiliu Județean':'var(--s1)','Autoritate contractantă':'var(--s3)','Furnizor':'var(--s2)'};
function enRefresh(){ const s=enState(); const r=enFilter(); const b=document.getElementById('enBody'); if(!b) return;
  b.innerHTML=r.slice(0,s.limit).map(e=>'<tr><td><b>'+esc(e.nume)+'</b>'+(e.dom&&e.dom.length?'<br><small style="color:var(--muted)">'+esc(e.dom.join(' · '))+'</small>':'')+'</td>'+
    '<td><span class="tpb" style="background:'+(TIPC[e.tip]||'var(--muted)')+'">'+esc(e.tip)+'</span></td>'+
    '<td style="font-size:12px">'+(e.cui?'CUI '+esc(e.cui):esc(e.jud||'—'))+'</td>'+
    '<td style="font-size:12px">'+(e.email?'<a href="mailto:'+esc(e.email)+'">✉ '+esc(e.email)+'</a>':'<span style="color:var(--muted)">—</span>')+'</td>'+
    '<td class="num">'+(e.n?e.n+' achiz. · '+nf.format(e.v)+' lei':'—')+'</td></tr>').join('');
  const c=document.getElementById('enCount'); if(c) c.textContent=nf.format(r.length)+' din '+nf.format(ENTALL.length);
  const sh=document.getElementById('enShown'); if(sh) sh.textContent=nf.format(r.length);
  const m=document.getElementById('enMore'); if(m){ m.style.display=r.length>s.limit?'block':'none'; m.textContent='Arată mai multe ('+nf.format(r.length-s.limit)+')'; }
}
function enExport(){ const r=enFilter();
  const csv=[['Denumire','Tip','CUI','Judet','Email','Nr_achizitii','Valoare_lei','Domenii']].concat(r.map(e=>[e.nume,e.tip,e.cui,e.jud,e.email,e.n,e.v,(e.dom||[]).join(' / ')]))
    .map(row=>row.map(c=>{const x=(c==null?'':String(c));return /[",\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x;}).join(',')).join('\n');
  dl('Institutii_entitati.csv','﻿'+csv,'text/csv;charset=utf-8'); toast('Export generat'); }

/* ---------- Subpagina Verificări & context ---------- */
const VF=DB.verificari||{};
const SOM=(VF.somaj&&VF.somaj.items)||[];
const CURS=VF.curs||{};
function vfDir(){
  let h='<div class="callout" style="margin-bottom:12px"><b>Verificările obligatorii înainte de GO</b> — cele trei de mai jos sunt criterii <b>eliminatorii</b> la CAE. Regula din sistem: nu se dă GO fără plafonul de minimis verificat pe <b>întreprinderea unică</b> (grupul întreg, nu firma singură).</div>';
  h+='<div class="tiles">';
  h+='<div class="tile acc"><div class="v">'+(CURS.ron?String(CURS.ron).replace('.',','):'—')+'</div><div class="l">1 EUR = RON (InforEuro'+(CURS.luna?', '+esc(CURS.luna):'')+')</div><div class="d">curs oficial CE pentru bugete'+(CURS.urmator?' · '+esc(CURS.urmator.luna)+': '+String(CURS.urmator.ron).replace('.',','):'')+'</div></div>';
  h+='<div class="tile"><div class="v">300.000</div><div class="l">plafon minimis (EUR / 3 ani)</div><div class="d">pe întreprindere unică</div></div>';
  h+='<div class="tile crit"><div class="v">3</div><div class="l">verificări eliminatorii</div><div class="d">minimis · fiscal · dificultate</div></div>';
  h+='<div class="tile"><div class="v">'+(SOM.length?SOM.length:'—')+'</div><div class="l">județe cu date de șomaj</div><div class="d">pentru justificarea proiectelor</div></div>';
  h+='</div>';
  h+='<div class="section"><h2>Verificări obligatorii</h2><div class="grid2">';
  (VF.verificari||[]).forEach(v=>{
    h+='<div class="dbcard"><div class="ic2">'+(v.critic?'⚠️':'💱')+'</div><div style="flex:1"><h3>'+esc(v.nume)+' '+(v.critic?'<span class="st prep">ELIMINATORIU</span>':'')+'</h3><div class="meta">'+esc(v.nota)+'<br><b>Sursă:</b> '+esc(v.sursa)+'</div>';
    if(v.tip==='cautare_cui'){
      h+='<div style="margin-top:9px;display:flex;gap:6px;flex-wrap:wrap"><input type="text" id="vfCui" placeholder="CUI client" style="padding:6px 9px;border:1px solid var(--grid);border-radius:7px;background:var(--page);color:var(--ink);width:130px"><button class="btn small primary" onclick="vfRegas()">Verifică în RegAS ↗</button></div>';
    } else if(v.tip==='api_anaf'){
      h+='<div style="margin-top:9px"><a class="btn small" href="https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva" target="_blank" rel="noopener">API ANAF ↗</a> <span style="font-size:11.5px;color:var(--muted)">verificat funcțional · rulează în scanarea zilnică</span></div>';
    } else if(v.url){ h+='<div style="margin-top:9px"><a class="btn small" href="'+esc(v.url)+'" target="_blank" rel="noopener">Deschide sursa ↗</a></div>'; }
    h+='</div></div>';
  });
  h+='</div></div>';
  if(SOM.length){
    const mx=Math.max(...SOM.map(s=>s.rata));
    h+='<div class="section card"><h2 style="font-size:14px;margin-bottom:4px">Rata șomajului pe județe</h2><div style="font-size:11.5px;color:var(--muted);margin-bottom:10px">'+esc((VF.somaj||{}).sursa||'')+' — folosește-o în secțiunile de justificare, grup țintă și relevanță ale cererilor de finanțare.</div>';
    h+='<div class="grid2"><div>'+SOM.slice(0,21).map(s=>'<div class="hbar"><span style="font-size:12px">'+esc(s.judet)+'</span><div class="trk"><div class="fil" style="width:'+Math.max(2,s.rata/mx*100)+'%;background:'+(s.rata>=6?'var(--critical)':s.rata>=4?'var(--warn)':'var(--s1)')+'"></div></div><span class="vv">'+String(s.rata).replace('.',',')+'%</span></div>').join('')+'</div>';
    h+='<div>'+SOM.slice(21).map(s=>'<div class="hbar"><span style="font-size:12px">'+esc(s.judet)+'</span><div class="trk"><div class="fil" style="width:'+Math.max(2,s.rata/mx*100)+'%;background:'+(s.rata>=6?'var(--critical)':s.rata>=4?'var(--warn)':'var(--s1)')+'"></div></div><span class="vv">'+String(s.rata).replace('.',',')+'%</span></div>').join('')+'</div></div>';
    h+='<div style="margin-top:8px"><button class="btn small" onclick="vfExport()">⬇ Export CSV șomaj</button></div></div>';
  }
  return h; }
function vfRegas(){ const el=document.getElementById('vfCui'); const cui=(el&&el.value||'').replace(/\D/g,'');
  window.open('https://regas.consiliulconcurentei.ro/transparenta/','_blank','noopener');
  if(cui){ navigator.clipboard.writeText(cui).then(()=>toast('CUI '+cui+' copiat — lipește-l în câmpul CUI din RegAS')).catch(()=>toast('Deschis RegAS — caută după CUI '+cui)); }
  else toast('Deschis RegAS — caută după CUI-ul clientului'); }
function vfExport(){ const csv=[['Judet','Someri','Rata_somaj_pct']].concat(SOM.map(s=>[s.judet,s.someri,s.rata]))
  .map(r=>r.join(',')).join('\n'); dl('Somaj_judete.csv','﻿'+csv,'text/csv;charset=utf-8'); toast('Export generat'); }

/* ---------- Subpagina Registre profesionale atestate ---------- */
const REG = DB.registre || {reg:{},dom:[],jud:[],stat:{},surse:[],legenda:[]};
const RG_DOM = REG.dom||[], RG_JUD = REG.jud||[], RG_LEG = Object.fromEntries((REG.legenda||[]).map(x=>[x[0],x[1]]));
const RG_TIP = [['ver','Verificatori de proiecte','📐'],['exp','Experți tehnici','🔬'],['aud','Auditori energetici','⚡'],['dir','Diriginți de șantier','👷']];
/* record pozițional: [0]=nume [1]=idx județ [2]=email [3]=telefon [4]=[idx domenii] [5]=an valabilitate [6]=[serii] [7]=grad(doar aud) */
const RG_ALL = {};
RG_TIP.forEach(([t])=>{ const a=(REG.reg||{})[t]||[];
  a.forEach(r=>{ r._t=t; r._j=RG_JUD[r[1]]||''; r._d=(r[4]||[]).map(i=>RG_DOM[i]).filter(Boolean);
    r._g=(t==='aud'?(r[8]||''):''); r._m=r[7]||'';
    r._k=bznorm(r[0]+' '+r._j+' '+r._d.join(' ')+' '+(r[6]||[]).join(' ')+' '+(r[2]||'')); });
  RG_ALL[t]=a; });
const RG_AN = TODAY.getFullYear();

function rgState(){ const b=bzState(); if(!b.rg) b.rg={tip:'ver',q:'',jud:'',dom:'',doarContact:false,doarValabil:false,sort:'n',limit:60}; return b.rg; }

function rgDir(){ const s=rgState(), st=(REG.stat||{})[s.tip]||{}, cur=RG_TIP.find(x=>x[0]===s.tip)||RG_TIP[0];
  const tot=RG_TIP.reduce((a,[t])=>a+(RG_ALL[t]||[]).length,0);
  let h='<div class="callout" style="margin-bottom:12px"><b>Cine îți semnează documentația.</b> '+nf.format(tot)+' de specialiști atestați oficial, cu e-mail, telefon, județ și domenii de atestare. Pentru orice proiect de investiții cu construcții ai nevoie de <b>verificator de proiect</b> (Legea 10/1995 — verificarea DTAC/PT e obligatorie, altfel documentația e neconformă), de <b>diriginte de șantier</b> autorizat ISC la execuție, de <b>auditor energetic</b> pentru orice componentă de eficiență energetică (PNRR / POR renovare) și de <b>expert tehnic</b> pentru expertize la clădiri existente. Caută după județ + domeniu și ai echipa tehnică într-un minut, cu contact direct.</div>';
  h+='<div class="subnav" style="margin-bottom:12px">'+RG_TIP.map(([t,l,ic])=>'<button class="'+(s.tip===t?'on':'')+'" onclick="rgSet(\'tip\',\''+t+'\')">'+ic+' '+l+' ('+nf.format((RG_ALL[t]||[]).length)+')</button>').join('')+'</div>';
  h+='<div class="tiles">';
  h+='<div class="tile acc"><div class="v">'+nf.format(st.n||0)+'</div><div class="l">persoane atestate</div><div class="d">autoritate: '+esc(st.aut||'')+'</div></div>';
  h+='<div class="tile"><div class="v">'+nf.format(st.email||0)+' / '+nf.format(st.tel||0)+'</div><div class="l">cu e-mail / telefon</div><div class="d">'+Math.round(100*(st.email||0)/Math.max(1,st.n))+'% contactabili prin e-mail</div></div>';
  h+= s.tip==='dir'
    ? '<div class="tile"><div class="v">'+nf.format(st.jud||0)+'</div><div class="l">județe acoperite</div><div class="d">autorizații ISC (fără dată de expirare în registru)</div></div>'
    : '<div class="tile acc"><div class="v">'+nf.format(st.valabil||0)+'</div><div class="l">cu drept de practică valabil</div><div class="d">expiră ≥ '+RG_AN+' · '+Math.round(100*(st.valabil||0)/Math.max(1,st.n))+'% din registru</div></div>';
  h+='<div class="tile"><div class="v" id="rgShown">—</div><div class="l">rezultate filtrate</div>'+((st.mentiuni||0)?'<div class="d">⚠ '+st.mentiuni+' cu mențiuni (suspendări/sancțiuni/anulări) — marcate în listă</div>':'')+'</div>';
  h+='</div>';
  // filtre
  const doms=[...new Set((RG_ALL[s.tip]||[]).flatMap(r=>r._d))].sort((a,b)=>a.localeCompare(b,'ro'));
  h+='<div class="filters"><input type="text" id="rgq" placeholder="caută nume, domeniu, serie certificat, e-mail…" value="'+esc(s.q)+'" oninput="rgSet(\'q\',this.value)" style="flex:1;min-width:230px">';
  h+='<select onchange="rgSet(\'jud\',this.value)"><option value="">— toate județele —</option>'+RG_JUD.map(j=>'<option '+(s.jud===j?'selected':'')+'>'+esc(j)+'</option>').join('')+'</select>';
  h+='<select onchange="rgSet(\'dom\',this.value)"><option value="">— toate domeniile ('+doms.length+') —</option>'+doms.map(d=>'<option value="'+esc(d)+'" '+(s.dom===d?'selected':'')+'>'+esc(d.length>52?d.slice(0,52)+'…':d)+'</option>').join('')+'</select>';
  h+='<button class="btn small '+(s.doarContact?'primary':'')+'" onclick="rgSet(\'doarContact\','+(!s.doarContact)+')">'+(s.doarContact?'✓ ':'')+'doar cu contact</button>';
  if(s.tip!=='dir') h+='<button class="btn small '+(s.doarValabil?'primary':'')+'" onclick="rgSet(\'doarValabil\','+(!s.doarValabil)+')">'+(s.doarValabil?'✓ ':'')+'doar valabile</button>';
  h+='<select onchange="rgSet(\'sort\',this.value)"><option value="n" '+(s.sort==='n'?'selected':'')+'>sortare: nume</option><option value="j" '+(s.sort==='j'?'selected':'')+'>sortare: județ</option><option value="v" '+(s.sort==='v'?'selected':'')+'>sortare: valabilitate</option></select>';
  h+='<button class="btn small" onclick="rgExport()">⬇ Export CSV</button>';
  h+='<span class="count" id="rgCount" style="margin-left:auto;color:var(--muted);font-size:12.5px"></span></div>';
  h+='<div class="grid2" style="margin-bottom:12px"><div class="card"><h2 style="font-size:13px;margin-bottom:8px">Top 10 județe — '+esc(cur[1].toLowerCase())+'</h2><div id="rgJudChart"></div></div><div class="card"><h2 style="font-size:13px;margin-bottom:8px">Top domenii de atestare</h2><div id="rgDomChart"></div></div></div>';
  h+='<div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Nume</th><th>Județ</th><th>Domenii de atestare</th><th>Contact</th><th>'+(s.tip==='dir'?'Nr. autorizație':'Certificat / valabil')+'</th></tr></thead><tbody id="rgBody"></tbody></table></div>';
  h+='<button class="btn" id="rgMore" style="margin:14px auto;display:block" onclick="rgState().limit+=200;rgRefresh()">Arată mai multe…</button>';
  // legenda coduri
  h+='<div class="section card" style="margin-top:14px"><h2 style="font-size:13px;margin-bottom:8px">Legenda codurilor de atestare (cerințe esențiale, Legea 10/1995)</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:5px 16px;font-size:12px;color:var(--ink2)">'+
    (REG.legenda||[]).map(([c,d])=>'<div><b style="color:var(--accent-deep)">'+esc(c)+'</b> — '+esc(d)+'</div>').join('')+'</div></div>';
  h+='<div class="callout" style="margin-top:12px"><b>Surse oficiale:</b> '+(REG.surse||[]).map(x=>esc(x.t)+' ('+nf.format(x.n)+' înregistrări)').join(' · ')+'. Fișiere XLSX publicate de MDLPA și I.S.C. pe data.gov.ro, prelucrate la '+esc(REG.actualizat||'')+'. O persoană poate avea mai multe certificate — aici sunt consolidate pe persoană + județ. <span class="flag">DE VERIFICAT</span> Înainte de a contracta, confirmă valabilitatea dreptului de practică pe site-ul autorității emitente: aici e reflectată data din registrul publicat, nu o interogare în timp real.</div>';
  setTimeout(rgRefresh,0);
  return h; }

function rgSet(k,v){ const s=rgState(); s[k]=v; s.limit=60;
  if(k==='tip'){ s.q=''; s.dom=''; }
  if(k==='q'){ rgRefresh(); } else { render(); } }

function rgFilter(){ const s=rgState(); let r=RG_ALL[s.tip]||[];
  if(s.jud) r=r.filter(x=>x._j===s.jud);
  if(s.dom) r=r.filter(x=>x._d.includes(s.dom));
  if(s.doarContact) r=r.filter(x=>x[2]||x[3]);
  if(s.doarValabil) r=r.filter(x=>(x[5]||0)>=RG_AN);
  if(s.q){ const q=bznorm(s.q); r=r.filter(x=>x._k.includes(q)); }
  r=r.slice().sort((a,z)=> s.sort==='j' ? (a._j.localeCompare(z._j,'ro')||a[0].localeCompare(z[0],'ro'))
    : s.sort==='v' ? ((z[5]||0)-(a[5]||0)||a[0].localeCompare(z[0],'ro'))
    : a[0].localeCompare(z[0],'ro'));
  return r; }

function rgRefresh(){ const s=rgState(), r=rgFilter(), body=document.getElementById('rgBody'); if(!body) return;
  const show=r.slice(0,s.limit); let html='';
  for(const x of show){
    const val=x[5]||0, valOk=val>=RG_AN;
    const dch=x._d.slice(0,6).map(d=>'<span class="chip'+(RG_LEG[d]?' hl':'')+'"'+(RG_LEG[d]?' title="'+esc(RG_LEG[d])+'"':'')+'>'+esc(d.length>34?d.slice(0,34)+'…':d)+'</span>').join('')+(x._d.length>6?'<span class="chip">+'+(x._d.length-6)+'</span>':'');
    let ct='<div class="ct2">';
    if(x[2]) ct+='<a href="mailto:'+esc(x[2])+'" style="font-size:12px">'+esc(x[2])+'</a>';
    if(x[3]) ct+=x[3].split('|').map(t=>'<a href="tel:'+esc(t)+'" style="font-size:12px;color:var(--ink2)">📞 '+esc(t)+'</a>').join('');
    if(!x[2]&&!x[3]) ct+='<span style="color:var(--muted);font-size:12px">—</span>';
    ct+='</div>';
    const cert=(x[6]||[]).map(c=>esc(c)).join('<br>')||'—';
    html+='<tr><td><b>'+esc(x[0])+'</b>'+(x._g?' <span class="resb">gradul '+esc(x._g)+'</span>':'')+
      (x._m?'<br><span class="flag" title="'+esc(x._m)+'">⚠ '+esc(x._m.length>52?x._m.slice(0,52)+'…':x._m)+'</span>':'')+'</td>'+
      '<td style="font-size:12px">'+(esc(x._j)||'<span style="color:var(--muted)">—</span>')+'</td>'+
      '<td style="max-width:330px">'+(dch||'<span style="color:var(--muted)">—</span>')+'</td>'+
      '<td style="min-width:180px">'+ct+'</td>'+
      '<td style="font-size:11.5px;white-space:nowrap">'+cert+
        (s.tip!=='dir'&&val?'<br><span class="hdot '+(valOk?'g':'r')+'" title="'+(valOk?'valabil':'expirat')+'"></span> <span style="color:'+(valOk?'var(--good-text)':'var(--muted)')+'">'+val+'</span>':'')+'</td></tr>';
  }
  body.innerHTML=html||'<tr><td colspan="5" class="empty">Niciun rezultat pentru filtrele curente.</td></tr>';
  const c=document.getElementById('rgCount'); if(c) c.textContent=nf.format(r.length)+' din '+nf.format((RG_ALL[s.tip]||[]).length);
  const sh=document.getElementById('rgShown'); if(sh) sh.textContent=nf.format(r.length);
  const m=document.getElementById('rgMore'); if(m){ m.style.display=r.length>s.limit?'block':'none'; m.textContent='Arată mai multe ('+nf.format(r.length-s.limit)+' rămase)'; }
  const jc={},dc={};
  r.forEach(x=>{ if(x._j) jc[x._j]=(jc[x._j]||0)+1; x._d.forEach(d=>dc[d]=(dc[d]||0)+1); });
  const jt=Object.entries(jc).sort((a,b)=>b[1]-a[1]).slice(0,10), jmax=Math.max(1,...jt.map(x=>x[1]));
  const je=document.getElementById('rgJudChart'); if(je) je.innerHTML=jt.map(([j,n])=>'<div class="hbar"><span style="font-size:12px">'+esc(j)+'</span><div class="trk"><div class="fil" style="width:'+Math.max(2,n/jmax*100)+'%"></div></div><span class="vv">'+n+'</span></div>').join('')||'<div class="empty">—</div>';
  const dt=Object.entries(dc).sort((a,b)=>b[1]-a[1]).slice(0,10), dmax=Math.max(1,...dt.map(x=>x[1]));
  const de=document.getElementById('rgDomChart'); if(de) de.innerHTML=dt.map(([d,n])=>'<div class="hbar"><span style="font-size:12px" title="'+esc(RG_LEG[d]||d)+'">'+esc(d.length>26?d.slice(0,26)+'…':d)+'</span><div class="trk"><div class="fil" style="width:'+Math.max(2,n/dmax*100)+'%;background:var(--s3)"></div></div><span class="vv">'+n+'</span></div>').join('')||'<div class="empty">—</div>';
}
function rgExport(){ const s=rgState(), r=rgFilter(), tl=(RG_TIP.find(x=>x[0]===s.tip)||[])[1]||'';
  const head=['Registru','Nume','Judet','Email','Telefon','Domenii','Certificate','Valabil_pana','Mentiuni_suspendari'];
  const rows=r.map(x=>[tl,x[0],x._j,x[2],(x[3]||'').replace(/\|/g,' / '),x._d.join('; '),(x[6]||[]).join('; '),x[5]||'',x._m]);
  const csv=[head].concat(rows).map(row=>row.map(c=>{const v=(c==null?'':String(c));return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',')).join('\n');
  dl('Registru_'+bznorm(tl).replace(/\s+/g,'_')+(s.jud?'_'+bznorm(s.jud):'')+'.csv','﻿'+csv,'text/csv;charset=utf-8'); toast('Export generat — '+nf.format(r.length)+' persoane'); }


/* ============ MODUL FINANCIAR & CONTABILITATE ============ */
/* Reguli: macheta financiară Anexa 5 MySMIS2021, OMFP 1802/2014, HG 907/2016,
   Reg. UE 651/2014 (Anexa I – IMM, art. 2 pct.18 – întreprindere în dificultate),
   HG 873/2022 art. 9 (TVA nedeductibilă = eligibilă), OUG 133/2021 (fluxuri financiare). */

function finSave(){ try{ localStorage.setItem("eufcc_fin",JSON.stringify(S.fin)); }catch(e){} }
function finState(){ if(!S.fin){ let sv=null; try{ sv=JSON.parse(localStorage.getItem("eufcc_fin")||"null"); }catch(e){} S.fin=Object.assign(finDefaults(),sv||{}); const o=window.__sess&&window.__sess.fin; if(o&&o.sub) S.fin.sub=o.sub; }
  const f=S.fin; const y=f.anN||(TODAY.getFullYear()-1); f.anN=y; f.ani=[String(y-2),String(y-1),String(y)]; return f; }
function finDefaults(){ return {
  sub:'bilant', anN:TODAY.getFullYear()-1, ani:['N-2','N-1','N'],
  b:{ /* bilanț: [N-2,N-1,N] */
    terenuri:[0,0,0], constructii:[0,0,0], echip:[0,0,0], imobCurs:[0,0,0], imobNecorp:[0,0,0], imobFin:[0,0,0], amortiz:[0,0,0],
    stocuri:[0,0,0], creante:[0,0,0], casa:[0,0,0], cheltAvans:[0,0,0],
    datCurente:[0,0,0], datTermenLung:[0,0,0], provizioane:[0,0,0], venitAvans:[0,0,0],
    capVarsat:[0,0,0], capNevarsat:[0,0,0], rezerve:[0,0,0], reportatProfit:[0,0,0], reportatPierdere:[0,0,0], exProfit:[0,0,0], exPierdere:[0,0,0]
  },
  p:{ /* cont profit și pierdere */
    ca:[0,0,0], altVenitExpl:[0,0,0],
    matPrime:[0,0,0], altMateriale:[0,0,0], marfuri:[0,0,0], personal:[0,0,0], asigSociale:[0,0,0], amortizare:[0,0,0], altCheltExpl:[0,0,0],
    venitFin:[0,0,0], cheltFin:[0,0,0], impozitProfit:[0,0,0], impozitMicro:[0,0,0], angajati:[0,0,0]
  },
  imm:{ ang:0, ca:0, activ:0, legate:[], curs:5.2418, tip:'autonoma' },
  buget:[ {d:'Utilaje și echipamente',b:100000,tva:21,el:true},{d:'Servicii de consultanță',b:20000,tva:21,el:true} ],
  bugCfg:{ intensitate:70, tvaDeductibil:false, minimisDisp:300000 },
  deviz:{ c11:0,c12:0,c13:0,c14:0,c2:0,c31:0,c32:0,c33:0,c34:0,c35:0,c36:0,c37:0,c38:0,c41:0,c42:0,c43:0,c44:0,c45:0,c46:0,c511:0,c512:0,c52:0,c53:0,c54:0,c6:0 },
  cf:{ valElig:1000000, intensitate:70, prefPct:30, ajutorStat:false, durata:12, transe:3 }
}; }

const fmtL=v=>(v==null||isNaN(v))?'—':nf.format(Math.round(v))+' lei';
const fmtP=v=>(v==null||isNaN(v)||!isFinite(v))?'—':(Math.round(v*100)/100).toLocaleString('ro-RO')+'%';
const fmtX=v=>(v==null||isNaN(v)||!isFinite(v))?'—':(Math.round(v*100)/100).toLocaleString('ro-RO');
function fnum(x){ const v=parseFloat(String(x).replace(/\s/g,'').replace(',','.')); return isNaN(v)?0:v; }

/* ---------- calcule bilanț ---------- */
function calcBil(i){ const b=finState().b;
  const imobBrut=b.terenuri[i]+b.constructii[i]+b.echip[i]+b.imobCurs[i]+b.imobNecorp[i]+b.imobFin[i];
  const imobNet=imobBrut-b.amortiz[i];
  const circ=b.stocuri[i]+b.creante[i]+b.casa[i];
  const totalActiv=imobNet+circ+b.cheltAvans[i];
  const capProprii=b.capVarsat[i]+b.rezerve[i]+b.reportatProfit[i]-b.reportatPierdere[i]+b.exProfit[i]-b.exPierdere[i];
  const datorii=b.datCurente[i]+b.datTermenLung[i];
  const totalPasiv=capProprii+datorii+b.provizioane[i]+b.venitAvans[i];
  return {imobBrut,imobNet,circ,totalActiv,capProprii,datorii,totalPasiv,dif:totalActiv-totalPasiv,
    capSocial:b.capVarsat[i]+b.capNevarsat[i]};
}
function calcPP(i){ const p=finState().p;
  const venExpl=p.ca[i]+p.altVenitExpl[i];
  const chExpl=p.matPrime[i]+p.altMateriale[i]+p.marfuri[i]+p.personal[i]+p.asigSociale[i]+p.amortizare[i]+p.altCheltExpl[i];
  const rezExpl=venExpl-chExpl;
  const rezFin=p.venitFin[i]-p.cheltFin[i];
  const rezBrut=rezExpl+rezFin;
  const impozit=p.impozitProfit[i]+p.impozitMicro[i];
  const rezNet=rezBrut-impozit;
  const ebitda=rezExpl+p.amortizare[i];
  return {venExpl,chExpl,rezExpl,rezFin,rezBrut,impozit,rezNet,ebitda};
}

/* ---------- view principal ---------- */
function vFinanciar(){ const f=finState();
  const T=[['bilant','Bilanț (F10)'],['pp','Cont P&P (F20)'],['indicatori','Indicatori ETF'],['imm','Încadrare IMM'],
           ['buget','Buget proiect'],['deviz','Deviz general'],['cashflow','Cash-flow'],['mapari','Mapări conturi']];
  let h='<div class="viewtitle"><h1>🧮 Financiar & contabilitate</h1><span class="sub">macheta Anexa 5 · indicatori de grilă · deviz HG 907/2016 · fluxuri OUG 133/2021</span></div>';
  h+='<div class="subnav">'+T.map(([k,l])=>'<button class="'+(f.sub===k?'on':'')+'" onclick="finSub(\''+k+'\')">'+l+'</button>').join('')+'</div>';
  h+='<div class="fintools"><label>Anul N <input type="number" value="'+f.anN+'" style="width:84px" onchange="finState().anN=parseInt(this.value)||'+f.anN+';finSave();render(true)"></label><span class="evsrc">coloanele: '+f.ani.join(' · ')+'</span><span style="flex:1"></span><button class="btn small" onclick="finExportJSON()" title="salvează toată fișa (bilanț, P&P, IMM, buget, deviz, cash-flow)">⬇ Salvează fișa (JSON)</button><button class="btn small" onclick="finImportJSON()">⬆ Încarcă fișă</button><button class="btn small ghost" onclick="finReset()">↺ golește</button><span class="evsrc">se salvează automat pe acest dispozitiv</span></div>';
  h+='<div id="finView">'+({bilant:fBilant,pp:fPP,indicatori:fInd,imm:fIMM,buget:fBuget,deviz:fDeviz,cashflow:fCash,mapari:fMapari}[f.sub]||fBilant)()+'</div>';
  return h; }
function finSub(s){ finState().sub=s; render(true); }
function finExportJSON(){ dl('Financiar_'+finState().anN+'.json',JSON.stringify(finState(),null,2),'application/json'); toast('Fișă exportată'); }
function finImportJSON(){ const i=document.createElement('input'); i.type='file'; i.accept='.json,application/json'; i.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const o=JSON.parse(r.result); if(!o||!o.b||!o.p) throw new Error('nu e o fișă Financiar'); S.fin=Object.assign(finDefaults(),o); finSave(); render(true); toast('Fișă încărcată'); }catch(err){ toast('Fișier invalid: '+err.message); } }; r.readAsText(f); }; i.click(); }
function finReset(){ if(!confirm('Golești toată fișa financiară de pe acest dispozitiv?')) return; S.fin=null; try{ localStorage.removeItem('eufcc_fin'); }catch(e){} render(true); }
function finKey(ev,el){ if(ev.key!=='Enter') return; ev.preventDefault(); const all=[...document.querySelectorAll('#finView input[data-fk]')]; const i=all.indexOf(el); const suf=(el.dataset.fk||'').split('.').pop(); for(let j=i+1;j<all.length;j++){ if((all[j].dataset.fk||'').split('.').pop()===suf){ all[j].focus(); all[j].select&&all[j].select(); return; } } }
function finSet(grp,key,idx,val){ const f=finState(); const v=fnum(val);
  if(idx===null){ f[grp][key]=v; } else { f[grp][key][idx]=v; }
  finLive(); }
function finLive(){ const f=finState(); finSave();
  const el=document.getElementById('finView'); if(!el) return;
  const act=document.activeElement; const fk=(act&&act.dataset&&act.dataset.fk)||null; let pos=null; try{ pos=(act&&typeof act.selectionStart==='number')?act.selectionStart:null; }catch(e){}
  el.innerHTML=({bilant:fBilant,pp:fPP,indicatori:fInd,imm:fIMM,buget:fBuget,deviz:fDeviz,cashflow:fCash,mapari:fMapari}[f.sub]||fBilant)(); wrapTables(el);
  if(fk){ const n=el.querySelector('[data-fk="'+fk+'"]'); if(n){ n.focus(); try{ if(pos!=null) n.setSelectionRange(pos,pos); }catch(e){} } }
}
function inp(grp,key,idx,val,ph){ return '<input type="number" step="any" class="finin" data-fk="'+grp+'.'+key+'.'+(idx===null?'x':idx)+'" value="'+(val||'')+'" placeholder="'+(ph||'—')+'" oninput="finSet(\''+grp+'\',\''+key+'\','+(idx===null?'null':idx)+',this.value)" onkeydown="finKey(event,this)">'; }
function vrd(ok,txt){ return '<span class="cd '+(ok?'cd-good':'cd-crit')+'">'+txt+'</span>'; }
function fpill(k){ return {ok:'<span class="cd cd-good">OK</span>',no:'<span class="cd cd-crit">NU</span>',warn:'<span class="cd cd-warn">ATENȚIE</span>',info:'<span class="cd cd-off">INFO</span>'}[k]||''; }

/* ---------- 1. BILANȚ ---------- */
function fBilant(){ const f=finState(), b=f.b;
  const R=[['Terenuri (ct.211)','terenuri','r.9'],['Construcții (ct.212)','constructii','r.10'],
    ['Instalații, utilaje, mobilier','echip','r.11-18'],['Imobilizări în curs (ct.231)','imobCurs','r.19'],
    ['Imobilizări necorporale','imobNecorp','r.1-8'],['Imobilizări financiare','imobFin','r.20-21'],
    ['— Amortizări cumulate (ct.28)','amortiz','r.22']];
  const C=[['Stocuri / mărfuri (ct.371)','stocuri','r.33'],['Creanțe clienți (ct.411)','creante','r.36'],
    ['Casa și conturi la bănci (ct.5311+5121)','casa','r.38'],['Cheltuieli în avans','cheltAvans','r.44']];
  const P=[['Datorii curente — furnizori (ct.401+404) + alte','datCurente','r.47-51'],
    ['Datorii pe termen lung (>1 an)','datTermenLung','r.60'],['Provizioane','provizioane','r.70'],['Venituri în avans','venitAvans','r.75']];
  const K=[['Capital subscris vărsat (ct.1012)','capVarsat','r.79'],['Capital subscris nevărsat (ct.1011)','capNevarsat','r.80'],
    ['Rezerve (ct.106)','rezerve','r.88'],['Rezultat reportat — profit (ct.117 C)','reportatProfit','r.93'],
    ['Rezultat reportat — pierdere (ct.117 D)','reportatPierdere','r.94'],
    ['Rezultatul exercițiului — profit (ct.121 C)','exProfit','r.96'],['Rezultatul exercițiului — pierdere (ct.121 D)','exPierdere','r.97']];
  const sec=(titlu,rows,grp)=>'<tr class="jgrp"><td colspan="5">'+titlu+'</td></tr>'+rows.map(([l,k,r])=>
    '<tr><td style="font-size:12.5px">'+l+'</td><td style="color:var(--muted);font-size:11px">'+r+'</td>'+
    [0,1,2].map(i=>'<td style="width:120px">'+inp(grp,k,i,f[grp][k][i])+'</td>').join('')+'</tr>').join('');
  let h='<div class="callout" style="margin-bottom:12px">Introdu valorile din <b>formularul F10</b> (bilanț prescurtat) pentru cei 3 ani. Verificarea <b>Activ = Pasiv</b> rulează instant, iar capitalurile proprii negative sunt semnalate — sunt criteriu <b>eliminatoriu</b> („întreprindere în dificultate", art. 2 pct. 18 Reg. 651/2014).</div>';
  h+='<div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Element</th><th>Rând</th>'+f.ani.map(a=>'<th class="num">'+a+'</th>').join('')+'</tr></thead><tbody>';
  h+=sec('A. Active imobilizate',R,'b');
  h+=sec('B. Active circulante',C,'b');
  h+=sec('D. Datorii, provizioane, venituri în avans',P,'b');
  h+=sec('J. Capitaluri proprii',K,'b');
  h+='</tbody></table></div>';
  h+='<div class="section"><h2>Verificări automate</h2><div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Indicator</th>'+f.ani.map(a=>'<th class="num">'+a+'</th>').join('')+'</tr></thead><tbody>';
  const rows=[['Total ACTIV',i=>fmtL(calcBil(i).totalActiv)],['Total PASIV',i=>fmtL(calcBil(i).totalPasiv)],
    ['<b>Diferență (trebuie 0)</b>',i=>{const c=calcBil(i);return (Math.abs(c.dif)<1?'<span class="cd cd-good">✅ echilibrat</span>':'<span class="cd cd-crit">'+fmtL(c.dif)+'</span>');}],
    ['Capitaluri proprii',i=>{const c=calcBil(i);return '<b style="color:'+(c.capProprii<0?'var(--critical)':'var(--ink)')+'">'+fmtL(c.capProprii)+'</b>';}],
    ['Active imobilizate nete',i=>fmtL(calcBil(i).imobNet)],['Active circulante',i=>fmtL(calcBil(i).circ)],['Datorii totale',i=>fmtL(calcBil(i).datorii)]];
  rows.forEach(([l,fn])=>{ h+='<tr><td>'+l+'</td>'+[0,1,2].map(i=>'<td class="num">'+fn(i)+'</td>').join('')+'</tr>'; });
  h+='</tbody></table></div>';
  // alerta dificultate
  const c2=calcBil(2);
  if(c2.capProprii<0) h+='<div class="callout crit" style="margin-top:10px"><b>⚠️ Capitaluri proprii negative în anul N ('+fmtL(c2.capProprii)+')</b> — risc major de „întreprindere în dificultate". Este criteriu <b>eliminatoriu la CAE</b>. Remedii uzuale înainte de depunere: majorare de capital social, conversia creanțelor asociatului în capital, aport nou.</div>';
  else if(c2.capSocial>0 && c2.capProprii < c2.capSocial/2) h+='<div class="callout warn" style="margin-top:10px"><b>⚠️ Atenție:</b> capitalurile proprii ('+fmtL(c2.capProprii)+') sunt sub jumătate din capitalul social subscris ('+fmtL(c2.capSocial)+') — testul de „întreprindere în dificultate" pentru societăți cu răspundere limitată cu vechime peste 3 ani. Verifică art. 2 pct. 18 din Reg. (UE) 651/2014.</div>';
  h+='</div>';
  return h; }

/* ---------- 2. CONT P&P ---------- */
function fPP(){ const f=finState();
  const V=[['Cifra de afaceri netă (ct.707−709)','ca','r.9-10'],['Alte venituri din exploatare (ct.7583 etc.)','altVenitExpl','r.17']];
  const C=[['Cheltuieli materii prime și materiale (ct.601)','matPrime','r.21'],['Alte cheltuieli materiale (ct.602)','altMateriale','r.22'],
    ['Cheltuieli privind mărfurile (ct.607)','marfuri','r.24'],['Cheltuieli cu personalul — salarii (ct.641+642)','personal','r.27'],
    ['Cheltuieli cu asigurările sociale (ct.645)','asigSociale','r.28'],['Cheltuieli cu amortizarea (ct.6811)','amortizare','r.29'],
    ['Alte cheltuieli de exploatare','altCheltExpl','r.31']];
  const FN=[['Venituri financiare (ct.766 + alte)','venitFin','r.38-40'],['Cheltuieli financiare (ct.666 + alte)','cheltFin','r.44']];
  const IM=[['Impozit pe profit (ct.691)','impozitProfit','r.62'],['<b>Impozit microîntreprindere (ct.698)</b>','impozitMicro','r.66'],['Număr mediu de angajați','angajati','—']];
  const sec=(t,rows)=>'<tr class="jgrp"><td colspan="5">'+t+'</td></tr>'+rows.map(([l,k,r])=>
    '<tr><td style="font-size:12.5px">'+l+'</td><td style="color:var(--muted);font-size:11px">'+r+'</td>'+
    [0,1,2].map(i=>'<td style="width:120px">'+inp('p',k,i,f.p[k][i])+'</td>').join('')+'</tr>').join('');
  let h='<div class="callout crit" style="margin-bottom:12px"><b>Capcana #1 a machetei:</b> impozitul de microîntreprindere (ct.698) se trece la <b>rândul 66 „Alte impozite"</b>, NU la rândul 62 „Impozit pe profit" (care rămâne 0 la micro). Clasificarea greșită <b>invalidează macheta</b>. Verifică cu D100/D101.</div>';
  h+='<div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Element</th><th>Rând</th>'+f.ani.map(a=>'<th class="num">'+a+'</th>').join('')+'</tr></thead><tbody>';
  h+=sec('Venituri din exploatare',V)+sec('Cheltuieli de exploatare',C)+sec('Rezultat financiar',FN)+sec('Impozite',IM);
  h+='</tbody></table></div>';
  h+='<div class="section"><h2>Rezultate calculate</h2><div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Indicator</th>'+f.ani.map(a=>'<th class="num">'+a+'</th>').join('')+'</tr></thead><tbody>';
  const rows=[['Venituri din exploatare',i=>fmtL(calcPP(i).venExpl)],['Cheltuieli de exploatare',i=>fmtL(calcPP(i).chExpl)],
    ['<b>Rezultatul din exploatare</b>',i=>{const c=calcPP(i);return '<b style="color:'+(c.rezExpl<0?'var(--critical)':'var(--good-text)')+'">'+fmtL(c.rezExpl)+'</b>';}],
    ['Rezultatul financiar',i=>fmtL(calcPP(i).rezFin)],['Rezultatul brut',i=>fmtL(calcPP(i).rezBrut)],
    ['Impozite totale',i=>fmtL(calcPP(i).impozit)],['<b>Rezultatul net</b>',i=>'<b>'+fmtL(calcPP(i).rezNet)+'</b>'],
    ['EBITDA (rez. expl. + amortizare)',i=>fmtL(calcPP(i).ebitda)]];
  rows.forEach(([l,fn])=>{ h+='<tr><td>'+l+'</td>'+[0,1,2].map(i=>'<td class="num">'+fn(i)+'</td>').join('')+'</tr>'; });
  h+='</tbody></table></div>';
  // coerenta cu bilantul
  h+='<div class="section"><h2>Coerență cu bilanțul</h2><div class="card"><table class="tbl"><thead><tr><th>Verificare</th>'+f.ani.map(a=>'<th class="num">'+a+'</th>').join('')+'</tr></thead><tbody><tr><td>Rezultat net (P&P) = rezultatul exercițiului din bilanț</td>'+
    [0,1,2].map(i=>{ const net=calcPP(i).rezNet; const bil=f.b.exProfit[i]-f.b.exPierdere[i];
      const ok=Math.abs(net-bil)<1; return '<td class="num">'+(net===0&&bil===0?'<span style="color:var(--muted)">—</span>':vrd(ok,ok?'coerent':'dif. '+fmtL(net-bil)))+'</td>'; }).join('')+'</tr></tbody></table>';
  h+='<div style="font-size:12px;color:var(--ink2);margin-top:8px">Dacă apare diferență, cel mai frecvent motiv este repartizarea profitului sau o eroare de semn la pierdere (ct.121 D se introduce ca valoare pozitivă).</div></div></div>';
  const micro=f.p.impozitMicro[2]>0, prof=f.p.impozitProfit[2]>0;
  if(micro&&prof) h+='<div class="callout warn" style="margin-top:10px">Ai completat <b>ambele</b> tipuri de impozit în anul N. O firmă este fie microîntreprindere (ct.698), fie plătitoare de impozit pe profit (ct.691) — verifică declarațiile.</div>';
  return h; }

/* ---------- 3. INDICATORI ---------- */
function fInd(){ const f=finState();
  const idx=[0,1,2];
  function ind(i){ const b=calcBil(i), p=calcPP(i);
    const dc=f.b.datCurente[i];
    return {
      solv: b.totalPasiv? b.capProprii/b.totalPasiv*100 : NaN,
      lich: dc? b.circ/dc : NaN,
      roe: b.capProprii>0? p.rezNet/b.capProprii*100 : NaN,
      rca: f.p.ca[i]? p.rezNet/f.p.ca[i]*100 : NaN,
      indat: b.totalActiv? b.datorii/b.totalActiv*100 : NaN,
      prod: f.p.angajati[i]? f.p.ca[i]/f.p.angajati[i] : NaN,
      ebitda: p.ebitda, rexp:p.rezExpl, ca:f.p.ca[i]
    }; }
  const I=idx.map(ind);
  const crestere=(a,b)=> (a&&b)? (b-a)/Math.abs(a)*100 : NaN;
  const PRAG=[
    ['Solvabilitate patrimonială','solv','Capital propriu / Total pasiv × 100','≥ 30%',v=>v>=30,'%'],
    ['Lichiditate curentă','lich','Active circulante / Datorii curente','≥ 1,00',v=>v>=1,'x'],
    ['Rentabilitatea capitalului propriu (ROE)','roe','Profit net / Capital propriu × 100','> 0%',v=>v>0,'%'],
    ['Rentabilitatea cifrei de afaceri','rca','Profit net / CA × 100','> 0%',v=>v>0,'%'],
    ['Grad de îndatorare','indat','Datorii totale / Total activ × 100','≤ 75%',v=>v<=75,'%'],
  ];
  let h=''; if(!f.p.ca.some(x=>x)&&!f.b.casa.some(x=>x)&&!f.b.capVarsat.some(x=>x)) h+=emptyState('🧮','Indicatorii se calculează din Bilanț și P&P','Completează întâi anul N (măcar cifra de afaceri, capitalurile proprii și datoriile curente) — tabelul de mai jos se umple automat.','<button class="btn small primary" onclick="finSub(\'bilant\')">→ Bilanț</button><button class="btn small" onclick="finSub(\'pp\')">→ Cont P&P</button>');
  h+='<div class="callout" style="margin-bottom:12px">Indicatorii pe care <b>grilele ETF îi punctează</b> cel mai frecvent, calculați din bilanț și contul de profit și pierdere. Pragurile afișate sunt cele uzuale — <b>verifică întotdeauna grila apelului</b>, care poate folosi alte formule sau alte praguri.</div>';
  h+='<div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Indicator</th><th>Formulă</th><th class="num">Prag uzual</th>'+f.ani.map(a=>'<th class="num">'+a+'</th>').join('')+'</tr></thead><tbody>';
  PRAG.forEach(([l,k,form,prag,test,u])=>{
    h+='<tr><td><b>'+l+'</b></td><td style="font-size:11.5px;color:var(--muted)">'+form+'</td><td class="num" style="font-size:12px">'+prag+'</td>'+
      idx.map(i=>{ const v=I[i][k]; const val=(u==='%')?fmtP(v):fmtX(v);
        if(isNaN(v)||!isFinite(v)) return '<td class="num" style="color:var(--muted)">—</td>';
        return '<td class="num"><span class="cd '+(test(v)?'cd-good':'cd-crit')+'">'+val+'</span></td>'; }).join('')+'</tr>';
  });
  h+='<tr class="jgrp"><td colspan="6">Mărime și dinamică</td></tr>';
  const extra=[['Cifra de afaceri','ca',fmtL],['Rezultatul din exploatare','rexp',fmtL],['EBITDA','ebitda',fmtL],['Productivitatea muncii (CA/angajat)','prod',fmtL]];
  extra.forEach(([l,k,fn])=>{ h+='<tr><td>'+l+'</td><td colspan="2" style="font-size:11.5px;color:var(--muted)">'+(k==='prod'?'CA / număr mediu de angajați':'')+'</td>'+idx.map(i=>'<td class="num">'+(isNaN(I[i][k])?'—':fn(I[i][k]))+'</td>').join('')+'</tr>'; });
  h+='</tbody></table></div>';
  // crestere
  const cCA=crestere(I[1].ca,I[2].ca), cRE=crestere(I[1].rexp,I[2].rexp);
  h+='<div class="grid2 section">';
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">Dinamica N-1 → N</h2><table class="tbl"><tbody>'+
    '<tr><td>Creșterea cifrei de afaceri</td><td class="num">'+(isNaN(cCA)?'—':'<span class="cd '+(cCA>0?'cd-good':'cd-crit')+'">'+fmtP(cCA)+'</span>')+'</td></tr>'+
    '<tr><td>Creșterea profitului din exploatare</td><td class="num">'+(isNaN(cRE)?'—':'<span class="cd '+(cRE>0?'cd-good':'cd-crit')+'">'+fmtP(cRE)+'</span>')+'</td></tr>'+
    '</tbody></table><div style="font-size:12px;color:var(--ink2);margin-top:8px">Multe grile punctează creșterea profitului din exploatare pe ultimii 2-3 ani. Un rezultat din exploatare <b>pozitiv în anul N</b> este adesea criteriu eliminatoriu la CAE.</div></div>';
  const p2=calcPP(2);
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">Semnale pentru CAE</h2><ul class="list">'+
    '<li>'+(p2.rezExpl>0?fpill("ok"):fpill("no"))+' Rezultat din exploatare pozitiv în anul N: <b>'+fmtL(p2.rezExpl)+'</b></li>'+
    '<li>'+(calcBil(2).capProprii>0?fpill("ok"):fpill("no"))+' Capitaluri proprii pozitive: <b>'+fmtL(calcBil(2).capProprii)+'</b></li>'+
    '<li>'+(f.p.angajati[2]>0?fpill("ok"):fpill("warn"))+' Număr mediu de angajați declarat: <b>'+(f.p.angajati[2]||'—')+'</b></li>'+
    '</ul><div style="font-size:12px;color:var(--muted);margin-top:6px">Verificările de mai sus nu înlocuiesc grila CAE a apelului — sunt semnalele cele mai frecvente.</div></div>';
  h+='</div>';
  return h; }

/* ---------- 4. ÎNCADRARE IMM ---------- */
function fIMM(){ const f=finState(), m=f.imm;
  // consolidare
  let ang=m.ang, ca=m.ca, act=m.activ;
  (m.legate||[]).forEach(L=>{ const q=(L.tip==='legata')?1:(fnum(L.pct)/100);
    ang+=fnum(L.ang)*q; ca+=fnum(L.ca)*q; act+=fnum(L.activ)*q; });
  const caEur=m.curs? ca/m.curs : 0, actEur=m.curs? act/m.curs : 0;
  let cat='Întreprindere mare', bonus=0;
  if(ang<10 && (caEur<=2e6 || actEur<=2e6)) { cat='Microîntreprindere'; bonus=20; }
  else if(ang<50 && (caEur<=10e6 || actEur<=10e6)) { cat='Întreprindere mică'; bonus=20; }
  else if(ang<250 && (caEur<=50e6 || actEur<=43e6)) { cat='Întreprindere mijlocie'; bonus=10; }
  const immEmpty=!(ang||ca||act); if(immEmpty){ cat='— introdu datele anului N'; bonus=0; }
  let h='<div class="callout" style="margin-bottom:12px">Încadrarea se face conform <b>Anexei I la Reg. (UE) 651/2014</b> (și Legea 346/2004): pragurile de <b>angajați</b> ȘI (cifră de afaceri <b>SAU</b> active totale). Datele întreprinderilor <b>legate</b> se cumulează 100%, iar ale celor <b>partenere</b> proporțional cu procentul deținut. Încadrarea se schimbă doar dacă pragul e depășit <b>doi ani consecutivi</b>.</div>';
  h+='<div class="grid2"><div class="card"><h2 style="font-size:14px;margin-bottom:10px">Datele întreprinderii solicitante (anul N)</h2><table class="tbl"><tbody>';
  h+='<tr><td>Număr mediu de angajați (AME)</td><td style="width:150px">'+inp('imm','ang',null,m.ang)+'</td></tr>';
  h+='<tr><td>Cifra de afaceri anuală (lei)</td><td>'+inp('imm','ca',null,m.ca)+'</td></tr>';
  h+='<tr><td>Active totale (lei)</td><td>'+inp('imm','activ',null,m.activ)+'</td></tr>';
  h+='<tr><td>Curs EUR (InforEuro)</td><td>'+inp('imm','curs',null,m.curs)+'</td></tr>';
  h+='</tbody></table><button class="btn small" style="margin-top:9px" onclick="finFromBilant()">↙ Preia din bilanț/P&P (anul N)</button></div>';
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:10px">Rezultatul încadrării</h2>';
  h+='<div class="tile '+(cat==='Întreprindere mare'?'':'acc')+'" style="box-shadow:none;border:0;padding:0"><div class="v" style="font-size:22px">'+cat+'</div><div class="l">categorie calculată (date consolidate)</div></div>';
  h+='<table class="tbl" style="margin-top:10px"><tbody>'+
    '<tr><td>Angajați consolidat</td><td class="num"><b>'+fmtX(ang)+'</b></td></tr>'+
    '<tr><td>Cifra de afaceri consolidată</td><td class="num">'+fmtL(ca)+'<br><small style="color:var(--muted)">'+fmtX(caEur/1e6)+' mil EUR</small></td></tr>'+
    '<tr><td>Active totale consolidate</td><td class="num">'+fmtL(act)+'<br><small style="color:var(--muted)">'+fmtX(actEur/1e6)+' mil EUR</small></td></tr>'+
    '<tr><td>Bonus intensitate GBER</td><td class="num"><b style="color:var(--good-text)">+'+bonus+' pp</b></td></tr>'+
    '</tbody></table>';
  h+='<div style="font-size:12px;color:var(--ink2);margin-top:8px">Bonusul IMM se adaugă la intensitatea de bază din harta ajutoarelor regionale (proiecte ≤ 50 mil EUR): <b>+20 pp</b> micro și mici, <b>+10 pp</b> mijlocii.</div></div></div>';
  // intreprinderi legate
  h+='<div class="section"><h2>Întreprinderi legate și partenere</h2><div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Denumire</th><th>Relație</th><th class="num">% deținut</th><th class="num">Angajați</th><th class="num">CA (lei)</th><th class="num">Active (lei)</th><th></th></tr></thead><tbody id="immRows">';
  (m.legate||[]).forEach((L,i)=>{
    h+='<tr><td><input type="text" value="'+esc(L.den||'')+'" oninput="immSet('+i+',\'den\',this.value)" data-fk="imm.den.'+i+'" style="width:100%;padding:5px 7px;border:1px solid var(--grid);border-radius:6px;background:var(--surface2);color:var(--ink);font-size:12.5px"></td>'+
      '<td><select onchange="immSet('+i+',\'tip\',this.value)" style="padding:5px;border:1px solid var(--grid);border-radius:6px;background:var(--surface2);color:var(--ink);font-size:12px"><option value="legata" '+(L.tip==='legata'?'selected':'')+'>legată (100%)</option><option value="partenera" '+(L.tip==='partenera'?'selected':'')+'>parteneră (pro-rata)</option></select></td>'+
      '<td style="width:90px"><input type="number" value="'+(L.pct||'')+'" oninput="immSet('+i+',\'pct\',this.value)" data-fk="imm.pct.'+i+'" style="width:100%;padding:5px;border:1px solid var(--grid);border-radius:6px;background:var(--surface2);color:var(--ink);font-size:12.5px;text-align:right"></td>'+
      '<td style="width:100px"><input type="number" value="'+(L.ang||'')+'" oninput="immSet('+i+',\'ang\',this.value)" data-fk="imm.ang.'+i+'" style="width:100%;padding:5px;border:1px solid var(--grid);border-radius:6px;background:var(--surface2);color:var(--ink);font-size:12.5px;text-align:right"></td>'+
      '<td style="width:130px"><input type="number" value="'+(L.ca||'')+'" oninput="immSet('+i+',\'ca\',this.value)" data-fk="imm.ca.'+i+'" style="width:100%;padding:5px;border:1px solid var(--grid);border-radius:6px;background:var(--surface2);color:var(--ink);font-size:12.5px;text-align:right"></td>'+
      '<td style="width:130px"><input type="number" value="'+(L.activ||'')+'" oninput="immSet('+i+',\'activ\',this.value)" data-fk="imm.activ.'+i+'" style="width:100%;padding:5px;border:1px solid var(--grid);border-radius:6px;background:var(--surface2);color:var(--ink);font-size:12.5px;text-align:right"></td>'+
      '<td><button class="btn small" onclick="immDel('+i+')">✕</button></td></tr>';
  });
  h+='</tbody></table></div><button class="btn small" style="margin-top:9px" onclick="immAdd()">+ Adaugă întreprindere</button>';
  h+='<div class="callout warn" style="margin-top:10px"><b>Regula critică pentru minimis:</b> plafonul de 300.000 EUR se aplică la nivel de <b>întreprindere unică</b> — tot grupul legat prin control, nu firma singură. Aceeași logică de consolidare se folosește și la încadrarea IMM.</div></div>';
  return h; }
function immAdd(){ const m=finState().imm; (m.legate=m.legate||[]).push({den:'',tip:'legata',pct:100,ang:0,ca:0,activ:0}); finLive(); }
function immDel(i){ finState().imm.legate.splice(i,1); finLive(); }
function immSet(i,k,v){ const L=finState().imm.legate[i]; L[k]=(k==='den'||k==='tip')?v:fnum(v); finLive(); }
function finFromBilant(){ const f=finState(); f.imm.ang=f.p.angajati[2]||0; f.imm.ca=f.p.ca[2]||0; f.imm.activ=calcBil(2).totalActiv||0; finLive(); toast('Preluat din anul N'); }

/* ---------- 5. BUGET PROIECT (Anexa 5) ---------- */
function fBuget(){ const f=finState(), cfg=f.bugCfg;
  const rows=f.buget.map((r,i)=>{ const baza=fnum(r.b), tvaP=(r.tva==null?21:fnum(r.tva));
    const tvaVal=Math.round(baza*tvaP)/100, total=baza+tvaVal;
    // TVA nedeductibilă = eligibilă (HG 873/2022 art.9). Dacă firma e plătitoare de TVA (deductibil), TVA-ul e neeligibil.
    const tvaElig = r.el && !cfg.tvaDeductibil;
    return {d:r.d, el:r.el, bRaw:r.b, tvaPct:tvaP, i, baza, tvaVal, total,
      bE:r.el?baza:0, tE:tvaElig?tvaVal:0, totE:(r.el?baza:0)+(tvaElig?tvaVal:0),
      bN:r.el?0:baza, tN:tvaElig?0:tvaVal, totN:(r.el?0:baza)+(tvaElig?0:tvaVal)};
  });
  const S1=rows.reduce((a,r)=>({bE:a.bE+r.bE,tE:a.tE+r.tE,totE:a.totE+r.totE,bN:a.bN+r.bN,tN:a.tN+r.tN,totN:a.totN+r.totN,tot:a.tot+r.total}),
    {bE:0,tE:0,totE:0,bN:0,tN:0,totN:0,tot:0});
  const inten=fnum(cfg.intensitate)/100;
  const grant=S1.totE*inten, cofin=S1.totE-grant+S1.totN;
  const curs=finState().imm.curs||5.2418, grantEur=grant/curs;
  const depMin=grantEur>fnum(cfg.minimisDisp);
  let h='<div class="callout" style="margin-bottom:12px">Structura de coloane este cea din <b>macheta Anexa 5, sheet „4-Bugetul Proiectului"</b>: Bază eligibil · TVA eligibil · Total eligibil · Bază neeligibil · TVA neeligibil · Total neeligibil · TOTAL. Regula de aur: <b>total = bază + TVA</b> pe fiecare poziție.</div>';
  h+='<div class="filters"><label style="font-size:12.5px">Intensitate finanțare (%) '+inp('bugCfg','intensitate',null,cfg.intensitate)+'</label>';
  h+='<label style="font-size:12.5px;display:flex;align-items:center;gap:6px"><input type="checkbox" '+(cfg.tvaDeductibil?'checked':'')+' onchange="finState().bugCfg.tvaDeductibil=this.checked;finLive()"> firma e plătitoare de TVA (TVA deductibil → neeligibil)</label>';
  h+='<label style="font-size:12.5px">Plafon minimis disponibil (EUR) '+inp('bugCfg','minimisDisp',null,cfg.minimisDisp)+'</label>';
  h+='<button class="btn small" onclick="bugAdd()">+ Poziție</button><button class="btn small" onclick="bugExport()">⬇ Export CSV</button></div>';
  h+='<div class="card" style="padding:4px 10px;overflow-x:auto"><table class="tbl"><thead><tr><th>Poziție</th><th class="num">Bază (lei)</th><th class="num">TVA %</th><th class="num">Elig.</th><th class="num">Bază elig.</th><th class="num">TVA elig.</th><th class="num">Total elig.</th><th class="num">Total neelig.</th><th class="num">TOTAL</th><th></th></tr></thead><tbody>';
  rows.forEach(r=>{
    h+='<tr><td style="min-width:180px"><input type="text" value="'+esc(r.d||'')+'" oninput="bugSet('+r.i+',\'d\',this.value)" data-fk="bug.d.'+r.i+'" style="width:100%;padding:5px 7px;border:1px solid var(--grid);border-radius:6px;background:var(--surface2);color:var(--ink);font-size:12.5px"></td>'+
      '<td style="width:120px"><input type="number" value="'+(r.bRaw||'')+'" oninput="bugSet('+r.i+',\'b\',this.value)" data-fk="bug.b.'+r.i+'" style="width:100%;padding:5px;border:1px solid var(--grid);border-radius:6px;background:var(--surface2);color:var(--ink);font-size:12.5px;text-align:right"></td>'+
      '<td style="width:70px"><input type="number" value="'+r.tvaPct+'" oninput="bugSet('+r.i+',\'tva\',this.value)" data-fk="bug.tva.'+r.i+'" style="width:100%;padding:5px;border:1px solid var(--grid);border-radius:6px;background:var(--surface2);color:var(--ink);font-size:12.5px;text-align:right"></td>'+
      '<td class="num"><input type="checkbox" '+(r.el?'checked':'')+' onchange="bugSet('+r.i+',\'el\',this.checked)"></td>'+
      '<td class="num">'+fmtL(r.bE)+'</td><td class="num">'+fmtL(r.tE)+'</td><td class="num"><b>'+fmtL(r.totE)+'</b></td>'+
      '<td class="num">'+fmtL(r.totN)+'</td><td class="num"><b>'+fmtL(r.total)+'</b></td>'+
      '<td><button class="btn small" onclick="bugDel('+r.i+')">✕</button></td></tr>';
  });
  h+='<tr class="jgrp"><td>TOTAL GENERAL</td><td class="num">'+fmtL(S1.bE+S1.bN)+'</td><td></td><td></td><td class="num">'+fmtL(S1.bE)+'</td><td class="num">'+fmtL(S1.tE)+'</td><td class="num">'+fmtL(S1.totE)+'</td><td class="num">'+fmtL(S1.totN)+'</td><td class="num">'+fmtL(S1.tot)+'</td><td></td></tr>';
  h+='</tbody></table></div>';
  h+='<div class="tiles" style="margin-top:14px">';
  h+='<div class="tile acc"><div class="v">'+fmtL(S1.totE)+'</div><div class="l">valoare eligibilă</div></div>';
  h+='<div class="tile acc"><div class="v">'+fmtL(grant)+'</div><div class="l">grant ('+fmtX(inten*100)+'%)</div><div class="d">'+fmtX(grantEur)+' EUR</div></div>';
  h+='<div class="tile"><div class="v">'+fmtL(cofin)+'</div><div class="l">contribuția beneficiarului</div><div class="d">cofinanțare + neeligibile</div></div>';
  h+='<div class="tile"><div class="v">'+fmtL(S1.tot)+'</div><div class="l">valoare totală proiect</div></div>';
  h+='</div>';
  // verificari
  h+='<div class="section"><h2>Verificări</h2><div class="card"><ul class="list">';
  h+='<li>'+(Math.abs((S1.totE+S1.totN)-S1.tot)<1?fpill("ok"):fpill("no"))+' Total eligibil + total neeligibil = TOTAL general</li>';
  h+='<li>'+(rows.every(r=>Math.abs(r.total-(r.baza+r.tvaVal))<1)?fpill("ok"):fpill("no"))+' Pe fiecare poziție: total = bază + TVA</li>';
  h+='<li>'+(depMin?fpill("no"):fpill("ok"))+' Grantul ('+fmtX(grantEur)+' EUR) '+(depMin?'<b>DEPĂȘEȘTE</b>':'se încadrează în')+' plafonul de minimis disponibil ('+fmtX(fnum(cfg.minimisDisp))+' EUR)</li>';
  h+='<li>'+(cfg.tvaDeductibil?fpill("info")+' Firma este plătitoare de TVA → TVA-ul este deductibil, deci <b>neeligibil</b>':fpill("info")+' Firma NU este plătitoare de TVA → TVA-ul nedeductibil este <b>eligibil</b> (HG 873/2022 art. 9)')+'</li>';
  h+='</ul>';
  if(depMin) h+='<div class="callout crit" style="margin-top:8px">Grantul depășește plafonul de minimis rămas. Variante: reduci valoarea proiectului, cauți o schemă GBER (ajutor regional) în loc de minimis, sau aștepți ieșirea din fereastra glisantă de 3 ani a ajutoarelor vechi.</div>';
  h+='</div></div>';
  h+='<div class="callout warn" style="margin-top:12px">La <b>PNRR</b> TVA-ul este neeligibil din grant (se suportă de la bugetul de stat) — bifează „plătitoare de TVA" doar pentru regimul fiscal real al firmei, iar pentru PNRR tratează TVA-ul separat.</div>';
  return h; }
function bugAdd(){ finState().buget.push({d:'',b:0,tva:21,el:true}); finLive(); }
function bugDel(i){ finState().buget.splice(i,1); finLive(); }
function bugSet(i,k,v){ const r=finState().buget[i]; r[k]=(k==='d')?v:((k==='el')?v:fnum(v)); finLive(); }
function bugExport(){ const f=finState();
  const rows=f.buget.map(r=>{const b=fnum(r.b),t=Math.round(b*fnum(r.tva))/100;return [r.d,b,fnum(r.tva),r.el?'DA':'NU',r.el?b:0,(r.el&&!f.bugCfg.tvaDeductibil)?t:0,b+t];});
  const csv=[['Pozitie','Baza','TVA_pct','Eligibil','Baza_eligibil','TVA_eligibil','Total']].concat(rows)
    .map(r=>r.map(c=>{const s=String(c);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\n');
  dl('Buget_proiect.csv','﻿'+csv,'text/csv;charset=utf-8'); toast('Export generat'); }

/* ---------- 6. DEVIZ GENERAL HG 907/2016 ---------- */
function fDeviz(){ const f=finState(), d=f.deviz;
  const CAP=[
    ['CAPITOLUL 1 — Cheltuieli pentru obținerea și amenajarea terenului',null],
    ['1.1 Obținerea terenului','c11'],['1.2 Amenajarea terenului','c12'],
    ['1.3 Amenajări pentru protecția mediului','c13'],['1.4 Cheltuieli pentru relocarea/protecția utilităților','c14'],
    ['CAPITOLUL 2 — Cheltuieli pentru asigurarea utilităților',null],['2. Asigurarea utilităților necesare obiectivului','c2'],
    ['CAPITOLUL 3 — Cheltuieli pentru proiectare și asistență tehnică',null],
    ['3.1 Studii','c31'],['3.2 Documentații-suport și taxe pentru avize','c32'],['3.3 Expertizare tehnică','c33'],
    ['3.4 Certificarea performanței energetice și auditul energetic','c34'],['3.5 Proiectare','c35'],
    ['3.6 Organizarea procedurilor de achiziție','c36'],['3.7 Consultanță','c37'],['3.8 Asistență tehnică și dirigenție de șantier','c38'],
    ['CAPITOLUL 4 — Cheltuieli pentru investiția de bază',null],
    ['4.1 Construcții și instalații','c41'],['4.2 Montaj utilaje și echipamente','c42'],
    ['4.3 Utilaje și echipamente cu montaj','c43'],['4.4 Utilaje fără montaj și echipamente de transport','c44'],
    ['4.5 Dotări','c45'],['4.6 Active necorporale','c46'],
    ['CAPITOLUL 5 — Alte cheltuieli',null],
    ['5.1.1 Organizare de șantier — lucrări de construcții','c511'],['5.1.2 Organizare de șantier — cheltuieli conexe','c512'],
    ['5.2 Comisioane, cote, taxe (ISC, CSC)','c52'],['5.3 Diverse și neprevăzute','c53'],['5.4 Informare și publicitate','c54'],
    ['CAPITOLUL 6 — Cheltuieli pentru probe tehnologice și teste',null],['6. Probe tehnologice, teste și predare la beneficiar','c6']
  ];
  const g=k=>fnum(d[k]);
  const cap1=g('c11')+g('c12')+g('c13')+g('c14'), cap2=g('c2');
  const cap3=g('c31')+g('c32')+g('c33')+g('c34')+g('c35')+g('c36')+g('c37')+g('c38');
  const cap4=g('c41')+g('c42')+g('c43')+g('c44')+g('c45')+g('c46');
  const cap5=g('c511')+g('c512')+g('c52')+g('c53')+g('c54'), cap6=g('c6');
  const total=cap1+cap2+cap3+cap4+cap5+cap6;
  const CM=g('c12')+g('c13')+g('c14')+g('c2')+g('c41')+g('c42')+g('c511');
  const bazaNeprev=cap1+cap2+cap3+cap4;
  const pctNeprev=bazaNeprev? g('c53')/bazaNeprev*100 : 0;
  let h='<div class="callout" style="margin-bottom:12px">Structura din <b>Anexa 7 la HG 907/2016</b>. Formula esențială pe care o verifică AM-ul: <b>C+M = 1.2 + 1.3 + 1.4 + 2 + 4.1 + 4.2 + 5.1.1</b> — valoarea lucrărilor de construcții-montaj, care determină cota ISC și multe praguri.</div>';
  h+='<div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Capitol / subcapitol</th><th class="num" style="width:170px">Valoare fără TVA (lei)</th></tr></thead><tbody>';
  CAP.forEach(([l,k])=>{ if(k===null){ h+='<tr class="jgrp"><td colspan="2">'+l+'</td></tr>'; }
    else { h+='<tr><td style="font-size:12.5px">'+l+'</td><td>'+inp('deviz',k,null,d[k])+'</td></tr>'; } });
  h+='</tbody></table></div>';
  h+='<div class="tiles" style="margin-top:14px">';
  h+='<div class="tile acc"><div class="v">'+fmtL(total)+'</div><div class="l">TOTAL GENERAL (fără TVA)</div></div>';
  h+='<div class="tile acc"><div class="v">'+fmtL(CM)+'</div><div class="l">din care C+M</div><div class="d">1.2+1.3+1.4+2+4.1+4.2+5.1.1</div></div>';
  h+='<div class="tile"><div class="v">'+fmtL(total*0.21)+'</div><div class="l">TVA 21% estimat</div></div>';
  h+='<div class="tile"><div class="v">'+fmtL(total*1.21)+'</div><div class="l">TOTAL cu TVA</div></div>';
  h+='</div>';
  h+='<div class="section"><div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Capitol</th><th class="num">Valoare</th><th class="num">% din total</th></tr></thead><tbody>';
  [['Cap. 1 — Teren',cap1],['Cap. 2 — Utilități',cap2],['Cap. 3 — Proiectare și asistență',cap3],
   ['Cap. 4 — Investiția de bază',cap4],['Cap. 5 — Alte cheltuieli',cap5],['Cap. 6 — Probe și teste',cap6]].forEach(([l,v])=>{
    h+='<tr><td>'+l+'</td><td class="num">'+fmtL(v)+'</td><td class="num">'+(total?fmtP(v/total*100):'—')+'</td></tr>'; });
  h+='</tbody></table></div></div>';
  h+='<div class="section"><h2>Verificări de structură</h2><div class="card"><ul class="list">';
  h+='<li>'+(pctNeprev<=10.01?fpill("ok"):fpill("warn"))+' Diverse și neprevăzute (5.3): <b>'+fmtP(pctNeprev)+'</b> din capitolele 1+2+3+4 — limita uzuală este <b>10%</b> (verifică ghidul apelului; la intervenții pe construcții existente poate fi mai mare)</li>';
  h+='<li>'+(g('c37')>0?fpill("info"):fpill("warn"))+' Consultanța se trece la <b>3.7</b> ('+fmtL(g('c37'))+'), proiectarea la <b>3.5</b> ('+fmtL(g('c35'))+'), dotările la <b>4.5</b> ('+fmtL(g('c45'))+')</li>';
  h+='<li>'+(CM>0?fpill("ok"):fpill("info"))+' Valoarea C+M determină <b>cota ISC</b> (0,5% + 0,1%) și cota Casei Sociale a Constructorilor — se trec la 5.2</li>';
  h+='<li>'+fpill("info")+' Bugetul proiectului trebuie să fie <b>corelat 1:1</b> cu devizul general și cu planul de achiziții — necorelarea este un motiv frecvent de clarificări la ETF</li>';
  h+='</ul></div></div>';
  return h; }

/* ---------- 7. CASH-FLOW ---------- */
function fCash(){ const f=finState(), c=f.cf;
  const vE=fnum(c.valElig), inten=fnum(c.intensitate)/100, grant=vE*inten;
  const maxPref = c.ajutorStat ? grant*0.40 : vE*0.30;
  const prefSol = Math.min(vE*fnum(c.prefPct)/100, maxPref);
  const justif = prefSol*0.5;
  const cofin = vE-grant;
  let h='<div class="callout" style="margin-bottom:12px">Fluxurile financiare conform <b>OUG 133/2021</b>. Cel mai frecvent motiv de blocaj în implementare este <b>decalajul dintre plata furnizorilor și rambursare</b> — de aceea mecanismul cererii de plată este esențial pentru proiectele cu facturi mari.</div>';
  h+='<div class="grid2"><div class="card"><h2 style="font-size:14px;margin-bottom:10px">Parametrii proiectului</h2><table class="tbl"><tbody>';
  h+='<tr><td>Valoare eligibilă (lei)</td><td style="width:150px">'+inp('cf','valElig',null,c.valElig)+'</td></tr>';
  h+='<tr><td>Intensitate finanțare (%)</td><td>'+inp('cf','intensitate',null,c.intensitate)+'</td></tr>';
  h+='<tr><td>Prefinanțare solicitată (% din eligibil)</td><td>'+inp('cf','prefPct',null,c.prefPct)+'</td></tr>';
  h+='<tr><td>Durata implementării (luni)</td><td>'+inp('cf','durata',null,c.durata)+'</td></tr>';
  h+='<tr><td>Proiect cu ajutor de stat / minimis</td><td class="num"><input type="checkbox" '+(c.ajutorStat?'checked':'')+' onchange="finState().cf.ajutorStat=this.checked;finLive()"></td></tr>';
  h+='</tbody></table></div>';
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:10px">Rezultate</h2><table class="tbl"><tbody>';
  h+='<tr><td>Grant (finanțare nerambursabilă)</td><td class="num"><b>'+fmtL(grant)+'</b></td></tr>';
  h+='<tr><td>Cofinanțarea beneficiarului</td><td class="num"><b>'+fmtL(cofin)+'</b></td></tr>';
  h+='<tr><td>Prefinanțare maximă legală</td><td class="num">'+fmtL(maxPref)+'<br><small style="color:var(--muted)">'+(c.ajutorStat?'40% din ajutor, cu instrument de garantare':'30% din valoarea eligibilă')+'</small></td></tr>';
  h+='<tr><td>Prefinanțare rezultată</td><td class="num"><b style="color:var(--accent)">'+fmtL(prefSol)+'</b></td></tr>';
  h+='<tr><td>De justificat în 90 de zile (min. 50%)</td><td class="num"><b>'+fmtL(justif)+'</b></td></tr>';
  h+='</tbody></table></div></div>';
  if(c.ajutorStat) h+='<div class="callout warn" style="margin-top:12px">La ajutor de stat/minimis, prefinanțarea de până la <b>40% din ajutor</b> se acordă doar cu <b>instrument de garantare</b> (scrisoare bancară, IFN sau poliță de asigurare) — costul garanției trebuie prins în bugetul de cash-flow, iar obținerea ei durează.</div>';
  h+='<div class="section"><h2>Calendarul obligațiilor financiare</h2><div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Moment</th><th>Termen legal</th><th>Risc dacă se ratează</th></tr></thead><tbody>';
  [['Justificarea prefinanțării','minimum 50% din tranșă, prin cereri de rambursare, în <b>90 de zile calendaristice</b>','Recuperarea prefinanțării neutilizate'],
   ['Cerere de plată — plata furnizorilor','<b>5 zile lucrătoare</b> de la încasarea sumelor de la AM','Neeligibilitatea cheltuielii + posibilă reziliere'],
   ['Cerere de rambursare aferentă cererii de plată','<b>10 zile lucrătoare</b> de la plata furnizorilor','Blocarea următoarelor cereri'],
   ['Autorizarea cererii de rambursare de către AM','max. <b>20 de zile lucrătoare</b> (se întrerupe la clarificări)','—'],
   ['Plata efectivă către beneficiar','3 zile lucrătoare de la disponibilitatea fondurilor','—'],
   ['Răspuns la clarificări','de regulă <b>3-10 zile lucrătoare</b>','Respingere sau evaluare pe documentele existente']
  ].forEach(([m,t,r])=>{ h+='<tr><td><b>'+m+'</b></td><td style="font-size:12.5px">'+t+'</td><td style="font-size:12px;color:var(--ink2)">'+r+'</td></tr>'; });
  h+='</tbody></table></div></div>';
  h+='<div class="callout" style="margin-top:12px"><b>Recomandarea de consultant:</b> pentru facturile mari, folosește <b>cererea de plată</b> — AM-ul virează banii direct, iar tu plătești furnizorul în 5 zile lucrătoare. Fără acest mecanism, beneficiarul trebuie să avanseze din surse proprii și să aștepte rambursarea, ceea ce blochează cel mai des proiectele microîntreprinderilor.</div>';
  return h; }

/* ---------- 8. MAPĂRI CONTURI ---------- */
function fMapari(){
  const F10=[['9','ct.211','Terenuri'],['10','ct.212','Construcții'],['19','ct.231','Imobilizări corporale în curs de execuție'],
    ['22','ct.28','Ajustări de valoare / amortizări cumulate'],['33','ct.371','Mărfuri'],['36','ct.411 + 4111','Creanțe comerciale — clienți'],
    ['38','ct.5311 + 5121','Casa și conturi la bănci'],['47','ct.401 + 404','Furnizori'],['51','ct.462 + alte','Alte datorii'],
    ['79','ct.1012','Capital subscris vărsat'],['80','ct.1011','Capital subscris nevărsat'],['88','ct.106','Rezerve'],
    ['93','ct.117 sold creditor','Rezultat reportat — profit'],['94','ct.117 sold debitor','Rezultat reportat — pierdere'],
    ['96','ct.121 sold creditor','Rezultatul exercițiului — profit'],['97','ct.121 sold debitor','Rezultatul exercițiului — pierdere']];
  const F20=[['9','ct.707','Venituri din vânzarea mărfurilor'],['10','ct.709','Reduceri comerciale acordate (se deduce)'],
    ['17','—','Alte venituri din exploatare (aici intră ct.7583 — vânzări de active)'],['21','ct.601','Cheltuieli cu materii prime și materiale'],
    ['22','ct.602','Alte cheltuieli materiale'],['24','ct.607','Cheltuieli privind mărfurile'],['27','ct.641 + 642','Cheltuieli cu personalul — salarii'],
    ['28','ct.645','Cheltuieli cu asigurările și protecția socială'],['29','ct.6811','Cheltuieli cu amortizarea'],['31','—','Alte cheltuieli de exploatare'],
    ['38','ct.766','Venituri din dobânzi'],['40','—','Alte venituri financiare'],['44','ct.666 + alte','Alte cheltuieli financiare'],
    ['62','ct.691','Impozit pe profit — <b>rămâne 0 la microîntreprinderi</b>'],['66','ct.698','<b>Impozit microîntreprindere — AICI, nu la 62</b>']];
  let h='<div class="callout crit" style="margin-bottom:12px">Mapările oficiale între conturile contabile și rândurile machetei financiare (Anexa 5). <b>Cea mai costisitoare greșeală</b>: impozitul de microîntreprindere trecut la rândul 62 în loc de 66 — invalidează macheta.</div>';
  h+='<div class="grid2">';
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">F10 — Bilanț prescurtat</h2><table class="tbl"><thead><tr><th class="num">Rând</th><th>Cont</th><th>Descriere</th></tr></thead><tbody>'+
    F10.map(([r,c,dd])=>'<tr><td class="num"><b>'+r+'</b></td><td style="font-family:ui-monospace,monospace;font-size:12px">'+c+'</td><td style="font-size:12.5px">'+dd+'</td></tr>').join('')+'</tbody></table></div>';
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">F20 — Cont de profit și pierdere</h2><table class="tbl"><thead><tr><th class="num">Rând</th><th>Cont</th><th>Descriere</th></tr></thead><tbody>'+
    F20.map(([r,c,dd])=>'<tr'+(r==='66'||r==='62'?' style="background:rgba(208,59,59,.06)"':'')+'><td class="num"><b>'+r+'</b></td><td style="font-family:ui-monospace,monospace;font-size:12px">'+c+'</td><td style="font-size:12.5px">'+dd+'</td></tr>').join('')+'</tbody></table></div>';
  h+='</div>';
  h+='<div class="section"><h2>Reguli de consultant (capcanele frecvente)</h2><div class="card"><ul class="list">';
  [['Micro vs. impozit pe profit','Verifică întotdeauna dacă firma este microîntreprindere (ct.698) sau plătitoare de impozit pe profit (ct.691). Confirmă cu D100/D101.'],
   ['Capital nevărsat','ct.1011 merge la rândul <b>80</b>, nu 79. Verifică dacă există capital subscris dar nevărsat.'],
   ['Rezerve','Rezervele legale (ct.1061) merg la rândul 88; rezervele statutare (ct.1063) pot fi raportate separat.'],
   ['Vânzări de active','ct.7583 apare la „Alte venituri din exploatare" (rând 17), <b>NU</b> în cifra de afaceri.'],
   ['Declarație de inactivitate','Dacă firma a depus DI pentru un an, lasă coloanele goale sau zero și notează explicit — <b>nu inventa cifre</b>; finanțatorul verifică.'],
   ['Oferte combinate','La un kit cu mai multe produse, verifică dacă suma sub-componentelor egalează exact totalul ofertei.'],
   ['TVA în buget','TVA nedeductibilă este <b>eligibilă</b> (HG 873/2022 art. 9). Stabilește regimul de TVA al clientului înainte de a construi bugetul.']
  ].forEach(([t,d])=>{ h+='<li><b>'+t+':</b> '+d+'</li>'; });
  h+='</ul></div></div>';
  h+='<div class="callout" style="margin-top:12px">Pentru completarea automată a machetei din PDF-uri (bilanțuri + oferte furnizori), cere în conversație: <b>„completează macheta financiară"</b> — se folosesc scripturile din skill-ul <code>mysmis-macheta</code> (extragere din PDF → clasificare oferte → populare Excel → verificare).</div>';
  return h; }


/* ---------- Administrare ---------- */
const ADM_ST={ok:["cd-good","OK"],acoperit:["cd-good","ACOPERIT ↔"],partial:["cd-warn","PARȚIAL"],problema:["cd-crit","PROBLEMĂ"],blocat_ip:["cd-crit","BLOCAT IP"],indisponibil_metoda:["cd-warn","POST-only"],nu_se_acceseaza:["cd-off","NU SE ACCESEAZĂ"],neverificat_azi:["cd-off","NEVERIFICAT"]};
function admGrp(st){ return st==="ok"?"ok":st==="acoperit"?"acoperit":st==="partial"?"partial":"blocat"; }
function admFresh(label,iso,note){ if(!iso) return ''; const d=new Date(String(iso).slice(0,10)); if(isNaN(d)) return ''; const zile=Math.floor((TODAY-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/86400000); const cls=zile<=2?"cd-good":zile<=30?"cd-warn":"cd-off"; return '<dt>'+label+'</dt><dd>'+esc(String(iso).slice(0,10))+' <span class="cd '+cls+'">'+(zile===0?"azi":zile+" zile")+'</span>'+(note?' <span class="evsrc">'+esc(note)+'</span>':'')+'</dd>'; }
function admStorage(){ try{ let n=0; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); n+=(k.length+(localStorage.getItem(k)||"").length)*2; } return n; }catch(e){ return 0; } }
function vAdmin(){ const F=S.adminFilter||"", Q=(S.adminQ||"").toLowerCase();
  let h='<div class="viewtitle"><h1>⚙️ Administrare</h1><span class="sub">surse · date · backup local</span></div>';
  const cov=SURSE.reduce((a,s)=>{ a[admGrp(s.stare)]++; return a; },{ok:0,acoperit:0,partial:0,blocat:0});
  const efectiv=cov.ok+cov.acoperit; const pct=Math.round(efectiv/Math.max(1,SURSE.length)*100);
  h+='<div class="tiles">'
    +tile(efectiv+"/"+SURSE.length,"Acoperire efectivă",pct+"% din surse","acc","admin",()=>{S.adminFilter="";})
    +tile(cov.ok,"OK direct","accesibile din sesiune","","admin",()=>{S.adminFilter="ok";})
    +tile(cov.acoperit,"Acoperite ↔","primar blocat, oglindă OK","","admin",()=>{S.adminFilter="acoperit";})
    +tile(cov.partial,"Parțiale","semnal limitat",cov.partial?"warnv":"","admin",()=>{S.adminFilter="partial";})
    +tile(cov.blocat,"Blocate / goluri","doar browser propriu / VPS RO",cov.blocat?"crit":"","admin",()=>{S.adminFilter="blocat";})
    +'</div>';
  h+='<div class="callout good" style="margin-top:12px"><b>Cum se actualizează:</b> cere în conversația Claude «<b>scanare radar</b>» <button class="btn small" onclick="copyTxt(\'scanare radar\',\'Comanda copiată — lipește-o în conversația Claude\')">📋 copiază comanda</button> · datele noi ajung în <code>data.js</code> și platforma se reîncarcă singură. Ultima scanare: <b>'+esc(String((DB.apeluri||{}).extras_la||"").slice(0,10))+'</b>.</div>';
  // registrul surselor
  const list=SURSE.filter(s=>(!F||admGrp(s.stare)===F)&&(!Q||((s.nume||"")+" "+(s.url||"")+" "+(s.observatii||"")+" "+(s.mecanism||"")).toLowerCase().includes(Q)));
  h+='<div class="section"><h2>Registrul surselor monitorizate ('+list.length+' / '+SURSE.length+')</h2>';
  h+='<div class="filters"><input type="text" placeholder="caută sursă, URL, observație…" value="'+esc(S.adminQ||"")+'" oninput="S.adminQ=this.value;admRefresh()" style="flex:1;min-width:200px">'+[["","Toate"],["ok","OK"],["acoperit","Acoperite"],["partial","Parțiale"],["blocat","Blocate"]].map(([k,l])=>'<button class="fchip'+(F===k?" on":"")+'" onclick="S.adminFilter=\''+k+'\';render(true)">'+l+'</button>').join("")+'</div>';
  h+='<details class="acc2"><summary>Cum se citește registrul</summary><div class="inner">'+(((DB.surse||{}).nota)?'<p style="font-size:12.5px;color:var(--ink2);margin-bottom:8px">'+esc(DB.surse.nota)+'</p>':'')+'<div class="admleg"><span><span class="cd cd-good">OK</span> accesibilă direct</span><span><span class="cd cd-good">ACOPERIT ↔</span> sursa primară e blocată, dar datele vin dintr-o oglindă funcțională</span><span><span class="cd cd-warn">PARȚIAL</span> semnal limitat — de verificat manual</span><span><span class="cd cd-crit">BLOCAT</span> accesibilă doar din browserul tău / IP RO</span></div></div></details>';
  h+='<div id="admList">'+admListHtml(list)+'</div></div>';
  // export / import / backup
  const kb=Math.round(admStorage()/1024); const pctS=Math.min(100,Math.round(kb/5120*100));
  h+='<div class="grid2 section"><div class="card"><h2>Backup local (datele tale)</h2><p style="font-size:12.5px;color:var(--ink2);margin-bottom:8px">Clienți & proiecte, regulile evaluatorului, fișa financiară, checklist-urile și setările — tot ce ai introdus tu, într-un singur fișier. <b>Nu</b> include cheia API.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" onclick="admBackup()">⬇ Backup local</button><button class="btn" onclick="admRestore()">⬆ Restaurare din backup</button></div><div class="evsrc" style="margin-top:10px">Spațiu folosit pe dispozitiv: <b>'+nf.format(kb)+' KB</b> din ~5 MB<div class="minibar" style="margin-top:4px"><span style="width:'+pctS+'%;background:'+(pctS>80?'var(--critical)':'var(--accent)')+'"></span></div></div></div>';
  h+='<div class="card"><h2>Stratul public de date (JSON)</h2><p style="font-size:12.5px;color:var(--ink2);margin-bottom:8px">Apeluri, surse, referințe, registre — exportă pentru backup/editare externă sau încarcă o versiune nouă (în memorie, până la reload).</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="dl(\'command-center-data.json\',JSON.stringify(DB,null,2),\'application/json\');toast(\'Export generat\')">⬇ Exportă datele</button><button class="btn" onclick="ioFile()">⬆ Încarcă fișier JSON</button></div><details class="acc2" style="margin-top:10px"><summary>Lipește JSON manual</summary><div class="inner"><textarea class="jsonio" id="ioTxt" placeholder=\'{"apeluri":{"apeluri":[...]}}\'></textarea><div style="margin-top:8px;display:flex;gap:8px"><button class="btn small" onclick="ioPreview()">🔍 Verifică JSON</button><button class="btn small" onclick="ioImport()">⬆ Aplică importul</button></div><div id="ioPrev" class="evsrc" style="margin-top:6px"></div></div></details></div></div>';
  // jurnal & prospețime
  h+='<div class="section card"><h2>Prospețimea datelor & praguri</h2><dl class="kv">'+admFresh("Radar apeluri",(DB.apeluri||{}).extras_la,"versiune "+(META.versiune||"1"))+admFresh("Primării",(DB.primarii||{}).generat)+admFresh("Achiziții SICAP",(DB.sicap||{}).generat)+admFresh("Proiecte MIPE",(DB.proiecte_mipe||{}).generat)+admFresh("Registre atestate",(DB.registre||{}).actualizat)+admFresh("Verificări / curs",(DB.verificari||{}).generat)+'<dt>Praguri countdown</dt><dd>&gt;30 zile verde · 8-30 portocaliu · ≤7 roșu</dd><dt>Alerte T</dt><dd>T-30 / T-14 / T-7 / T-2 / T-0</dd><dt>Prag intern depunere</dt><dd>'+esc((META.praguri_alerte||{}).prag_depunere_intern||"")+'</dd><dt>Segmente configurate</dt><dd>'+((META.firma||{}).segmente||[]).map(s=>'<span class="chip hl">'+esc(s)+'</span>').join("")+' · '+esc((META.firma||{}).acoperire||"")+'</dd></dl></div>';
  h+='<div class="callout" style="margin-top:12px">Reguli de operare: adevărul are URL · datele au timestamp · HITL obligatoriu la depuneri/trimiteri · separarea puterilor (A9 auditează separat) · nu se ocolesc protecțiile anti-bot (MySMIS).</div>';
  return h; }
function admListHtml(list){ if(!list.length) return '<div class="empty">Nicio sursă pentru filtrul curent.</div>';
  return '<div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Sursă</th><th>Mecanism</th><th>Stare</th><th>Observații</th></tr></thead><tbody>'+list.map(s=>{ const m=ADM_ST[s.stare]||["cd-off",s.stare]; const host=(()=>{ try{ return new URL(s.url).hostname.replace(/^www\./,""); }catch(e){ return s.url||""; } })(); const nA=A.filter(a=>(a.url_sursa||"").includes(host)).length;
   const ap=s.acoperit_prin?'<br><span style="color:var(--good-text)">↳ acoperit prin: '+esc(s.acoperit_prin)+'</span>':"";
   return '<tr><td><b>'+esc(s.nume)+'</b><br><a href="'+esc(s.url)+'" target="_blank" title="'+esc(s.url)+'" style="font-size:11px">'+esc(host)+' ↗</a>'+(nA?' <button class="btn small ghost" style="font-size:11px;padding:1px 6px" title="apeluri din această sursă" onclick="S.radar.q=\''+esc(host)+'\';S.radar.stari=new Set();S.view=\'radar\';render()">'+nA+' apeluri</button>':'')+'</td><td style="font-size:12px">'+esc(s.mecanism)+'</td><td><span class="cd '+m[0]+'">'+m[1]+'</span></td><td style="font-size:12px;color:var(--ink2)">'+esc(s.observatii||"")+ap+'</td></tr>';}).join("")+'</tbody></table></div>'; }
function admRefresh(){ const F=S.adminFilter||"", Q=(S.adminQ||"").toLowerCase(); const list=SURSE.filter(s=>(!F||admGrp(s.stare)===F)&&(!Q||((s.nume||"")+" "+(s.url||"")+" "+(s.observatii||"")+" "+(s.mecanism||"")).toLowerCase().includes(Q))); const el=document.getElementById("admList"); if(el){ el.innerHTML=admListHtml(list); wrapTables(el); } }
const ADM_KEYS=["eufcc_crm","eufcc_rulebooks","eufcc_fin","eufcc_checklists","eufcc_evui","eufcc_theme"];
function admBackup(){ const o={_tip:"eufcc-backup",_data:new Date().toISOString(),_versiune:META.versiune||""}; ADM_KEYS.forEach(k=>{ try{ const v=localStorage.getItem(k); if(v!=null) o[k]=v; }catch(e){} }); dl("eufcc-backup-"+evTodayIsoSafe()+".json",JSON.stringify(o,null,1),"application/json"); toast("Backup generat"); }
function evTodayIsoSafe(){ const d=TODAY; return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function admRestore(){ const i=document.createElement("input"); i.type="file"; i.accept=".json,application/json"; i.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const o=JSON.parse(r.result); if(o._tip!=="eufcc-backup") throw new Error("nu e un backup EU Funds CC"); const keys=ADM_KEYS.filter(k=>o[k]!=null); if(!confirm("Restaurez "+keys.length+" seturi ("+keys.map(k=>k.replace("eufcc_","")).join(", ")+") din "+String(o._data||"").slice(0,10)+"? Datele locale actuale vor fi înlocuite.")) return; keys.forEach(k=>localStorage.setItem(k,o[k])); crmLoadStore(); crmApply(); S.fin=null; try{ S.checklists=JSON.parse(localStorage.getItem("eufcc_checklists")||"{}"); }catch(e){} if(typeof evLoad==="function") evLoad(); render(); toast("Backup restaurat"); }catch(err){ toast("Fișier invalid: "+err.message); } }; r.readAsText(f); }; i.click(); }
function ioFile(){ const i=document.createElement("input"); i.type="file"; i.accept=".json,application/json"; i.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ const ta=$("#ioTxt"); if(ta){ ta.value=r.result; ta.closest("details").open=true; } ioPreview(); }; r.readAsText(f); }; i.click(); }
function ioParse(){ const t=($("#ioTxt")||{}).value||""; if(!t.trim()) throw new Error("nimic de importat"); const obj=JSON.parse(t); const out=[]; if(obj.apeluri){ if(!Array.isArray(obj.apeluri.apeluri)) throw new Error("«apeluri» trebuie să fie {\"apeluri\":{\"apeluri\":[...]}}"); out.push(["apeluri",A.length,obj.apeluri.apeluri.length]); } if(obj.clienti&&Array.isArray(obj.clienti.clienti)) out.push(["clienți",CL.length,obj.clienti.clienti.length]); if(obj.proiecte&&Array.isArray(obj.proiecte.proiecte)) out.push(["proiecte",PR.length,obj.proiecte.proiecte.length]); if(obj.surse&&Array.isArray(obj.surse.surse)) out.push(["surse",SURSE.length,obj.surse.surse.length]); return {obj,out}; }
function ioPreview(){ const el=$("#ioPrev"); try{ const {out}=ioParse(); el.innerHTML=out.length?('Va înlocui: '+out.map(o=>'<b>'+o[0]+'</b> '+o[1]+' → '+o[2]).join(' · ')):'<span style="color:var(--critical)">JSON valid, dar fără chei recunoscute (apeluri / clienti / proiecte / surse).</span>'; }catch(e){ if(el) el.innerHTML='<span style="color:var(--critical)">'+esc(e.message)+'</span>'; } }
function ioImport(){ try{ const {obj,out}=ioParse(); if(!out.length){ toast("Nicio cheie recunoscută"); return; } if(!confirm("Aplici importul? "+out.map(o=>o[0]+": "+o[1]+" → "+o[2]).join(", ")+" (în memorie, până la reload)")) return;
  if(obj.apeluri){ A.length=0; obj.apeluri.apeluri.forEach(x=>A.push(x)); Object.assign(DB.apeluri,obj.apeluri); } if(obj.clienti&&obj.clienti.clienti){ CL.length=0; obj.clienti.clienti.forEach(x=>CL.push(x)); } if(obj.proiecte&&obj.proiecte.proiecte){ PR.length=0; obj.proiecte.proiecte.forEach(x=>PR.push(x)); } if(obj.surse&&obj.surse.surse){ SURSE.length=0; obj.surse.surse.forEach(x=>SURSE.push(x)); } if(obj.meta) Object.assign(META,obj.meta);
  MATCH=null; IX=null; _INTEL=null; toast("Date aplicate"); render(); }catch(e){ toast("JSON invalid: "+e.message); } }

