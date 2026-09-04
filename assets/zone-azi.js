/* ============ ZONA AZI — buletin, KPI, grafice ============ */
"use strict";
/* ---------- Buletin ---------- */
function radarAge(){ const s=(DB.apeluri||{}).extras_la||""; if(!s) return null; const d=new Date(s); if(isNaN(d)) return null;
  const zile=Math.floor((TODAY-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/86400000);
  return {zile, cls:(zile<=2?"good":zile<=7?"warn":"crit")}; }
function radarAgeColor(cls){ return cls==="good"?"var(--good-text)":cls==="warn"?"var(--warn-text)":"var(--critical)"; }
function buletinKPI(){ const act=A.filter(a=>a.stare==="activ").length, plan=A.filter(a=>a.stare==="planificat"||a.stare==="consultare").length;
  const cl7=A.filter(a=>{const d=days(a.data_inchidere);return d!=null&&d>=0&&d<=7;}).length, cl30=A.filter(a=>{const d=days(a.data_inchidere);return d!=null&&d>=0&&d<=30;}).length;
  const reale=PR.filter(p=>!p.demo); const pipeG=(reale.length?reale:PR).reduce((s,p)=>s+(p.grant_lei||0),0); const t7=calItems(7).filter(i=>i.kind==="proiect").length; const dv=A.filter(a=>(a.incredere_extractie||1)<0.8).length;
  return {act,plan,cl7,cl30,pipeG,pipeN:(reale.length?reale:PR).length,pipeDemo:!reale.length,t7,dv}; }
/* Șablonul de pagină: h1 scurt + .sub o frază + max 2 acțiuni · un singur callout de stare · HERO (3 KPI mari + 4 mici, termene 14 zile, urgențe) · secundar în .grid2 · grafice · referință în <details>. */
function vBuletin(){ const b=(META.buletin)||{}; const K=buletinKPI(); const _ra=radarAge(); const exDate=String((DB.apeluri||{}).extras_la||"").slice(0,10);
  // titlul din META („Buletinul zilei — 2 septembrie 2026 (scanare web live 02.09)”) → h1 scurt + restul în .sub (textul complet rămâne în copyBuletin)
  const titlu=(b.titlu||"Buletinul zilei"); const t1=titlu.split(" (")[0], t2=titlu.includes(" (")?titlu.slice(titlu.indexOf(" (")+2).replace(/\)$/,""):"";
  const parts=t1.split(/\s+[—–]\s+/); const h1t=parts[0]||"Buletinul zilei"; const dt=parts.slice(1).join(" — ");
  const sub=[dt,t2,A.length+' apeluri din '+SURSE.length+' surse'].filter(Boolean).map(esc).join(' · ')+(_ra?' · <b class="az-age '+_ra.cls+'">scanat acum '+_ra.zile+' '+(_ra.zile===1?"zi":"zile")+'</b>':"");
  let h='<div class="viewtitle"><h1>'+esc(h1t)+'</h1><span class="sub">'+sub+'</span><div class="viewactions az-va"><button class="btn small primary" onclick="copyBuletin()">📋 Copiază buletinul</button>'+moreMenu([["⬇ Export .ics (termene, alertă T-7)","exportICS()"],["📡 Deschide Radarul","S.view='radar';render()"]])+'</div></div>';
  // un singur callout de stare: prospețimea datelor
  if(_ra && _ra.zile>7) h+='<div class="callout warn">⏳ <b>Date vechi de '+_ra.zile+' zile</b> (scanate '+esc(exDate)+'). Termenele apelurilor se pot schimba — cere «scanează acum» în conversație.</div>';
  else if(_ra && _ra.zile>2) h+='<div class="callout">Ultima scanare: acum '+_ra.zile+' zile ('+esc(exDate)+'). Termenele foarte apropiate merită reconfirmate la sursă.</div>';
  // KPI: 3 critice + 4 secundare (un singur nivel de KPI pe pagină)
  let tiles='<div class="tiles az-kpi3">';
  tiles+=tile(K.act,"Apeluri active","din "+A.length+" în registru","acc","radar",()=>{S.radar.stari=new Set(["activ"]);S.radar.maxDays=null;});
  tiles+=tile(K.cl7,"Se închid în ≤7 zile",K.cl7?"atenție maximă":"nimic critic",K.cl7?"crit":"","radar",()=>{S.radar.stari=new Set(["activ"]);S.radar.maxDays=7;S.radar.sort="termen";});
  tiles+=tile(K.cl30,"Se închid în ≤30 zile","fereastră de depunere","warnv","radar",()=>{S.radar.stari=new Set(["activ"]);S.radar.maxDays=30;S.radar.sort="termen";});
  tiles+='</div><div class="tiles compact">';
  tiles+=tile(K.plan,"Planificate + consultare","pregătire anticipată","","radar",()=>{S.radar.stari=new Set(["planificat","consultare"]);S.radar.maxDays=null;});
  tiles+=tile(money(K.pipeG,"lei"),"Pipeline (grant)",K.pipeN+" proiecte"+(K.pipeDemo?" · demo":""),"acc","pipeline",null);
  tiles+=tile(K.t7,"Termene proiecte ≤7 zile","obligații din calendar",K.t7>3?"warnv":"","calendar",null);
  tiles+=tile(K.dv,"De verificat la sursă","apeluri cu încredere <80%","","radar",()=>{S.radar.verificat=true;S.radar.stari=new Set();});
  tiles+='</div>';
  // HERO 2: termenele următoarelor 14 zile + urgențele semnalate la scanare
  const bold=u=>{ const e=esc(u); return e.replace(/^([^:]{3,80}):/,"<b>$1</b>:"); }; const q3=u=>esc(String(u).replace(/^[^\p{L}\p{N}]+/u,"").split(/\s+/).slice(0,3).join(" ").replace(/[«»"'“”:]/g,""));
  const li=(mk,u)=>'<li class="az-li"><span class="mk">'+mk+'</span><span class="tx">'+bold(u)+'</span><button class="btn small ghost" title="caută în radar (căutare text, nu potrivire garantată)" onclick="S.radar.q=\''+q3(u)+'\';S.radar.stari=new Set();S.radar.maxDays=null;S.view=\'radar\';render()">🔎</button></li>';
  const all14=calItems(14);
  const termene='<div class="card az-c">'+cardHead("Termenele următoarelor 14 zile",all14.length,'<button class="btn small ghost" onclick="S.view=\'calendar\';render()">Calendar →</button>')+miniCal(14)+'</div>';
  const urgN=(b.urgente||[]).length;
  const urg='<div class="card az-c">'+cardHead("Urgențe azi",urgN)+(urgN?'<ul class="list">'+(b.urgente||[]).map(u=>li("❗",u)).join("")+'</ul>':'<div class="empty">Nicio urgență semnalată la ultima scanare.</div>')+'</div>';
  // SECUNDAR: oportunități + top potriviri
  const oppN=(b.oportunitati_cheie||[]).length;
  const opp='<div class="card az-c">'+cardHead("Oportunități-cheie",oppN)+(oppN?'<ul class="list">'+(b.oportunitati_cheie||[]).map(u=>li("▸",u)).join("")+'</ul>':'<div class="empty">Nicio oportunitate semnalată la ultima scanare.</div>')+'</div>';
  const bp=bestPairs(6);
  // 3 coloane: Client · Apel (+termen dedesubt) · Verdict — restul în memo (drawer)
  const top='<div class="card az-c">'+cardHead("Cele mai bune potriviri",bp.length,'<button class="btn small ghost" onclick="S.view=\'matching\';render()">Matching →</button>')+(bp.length?'<table class="tbl stack az-top"><thead><tr><th>Client</th><th>Apel · termen</th><th>Verdict</th></tr></thead><tbody>'+bp.map(m=>'<tr tabindex="0" onkeydown="if(event.key===\'Enter\')this.click()" onclick="openMemo(\''+m.client.id+'\',\''+esc(m.apel.id_apel)+'\')"><td data-l="Client"><b>'+esc(m.client.denumire)+'</b>'+(m.client.demo?' <span class="tag-demo">DEMO</span>':'')+'</td><td data-l="Apel · termen"><span title="'+esc(m.apel.titlu)+'">'+esc(m.apel.titlu)+'</span><br><small class="az-sub">'+esc(m.apel.program)+'</small><div class="az-tm">'+cdBadge(m.apel.data_inchidere,{cont:/continuu/.test(m.apel.tip_depunere||"")})+'</div></td><td data-l="Verdict">'+vChip(m.verdict,m.scor)+'</td></tr>').join("")+'</tbody></table>':emptyState('🎯','Nicio potrivire încă','Motorul compară clienții din CRM cu apelurile din radar. Adaugă clienți ca să vezi perechile.','<button class="btn small" onclick="S.view=\'clienti\';render()">→ Clienți</button>'))+'</div>';
  // GRAFICE
  const stareCnt=[["activ","Active"],["planificat","Planificate"],["consultare","În consultare"],["inchis","Închise"],["in_evaluare","În evaluare"]].map(([k,l])=>({l,v:A.filter(a=>a.stare===k).length,k})).filter(x=>x.v>0); const CC=["var(--s1)","var(--s2)","var(--s3)","var(--s7)","var(--s4)"]; stareCnt.forEach((x,i)=>x.c=CC[i%CC.length]);
  const wk=[]; for(let i=0;i<8;i++){ const st=new Date(TODAY); st.setDate(TODAY.getDate()+i*7); const en=new Date(st); en.setDate(st.getDate()+6); wk.push({l:st.getDate()+"–"+en.getDate()+" "+en.toLocaleDateString("ro-RO",{month:"short"}).replace(".",""),v:A.filter(a=>{const d=pd(a.data_inchidere);return d&&d>=st&&d<=en;}).length}); }
  const pgc={}; A.filter(a=>a.stare==="activ").forEach(a=>{ const k=a.program||"—"; pgc[k]=(pgc[k]||0)+1; }); const pgTop=Object.keys(pgc).sort((a,b)=>pgc[b]-pgc[a]).slice(0,6).map(k=>({l:k,v:pgc[k]}));
  const charts='<div class="grid3 section"><div class="card">'+cardHead("Apeluri după stare")+chartDonut(stareCnt,{center:A.length,centerL:"apeluri"})+'<div class="evsrc az-legend">'+stareCnt.map(x=>'<a href="#" onclick="event.preventDefault();S.radar.stari=new Set([\''+x.k+'\']);S.radar.maxDays=null;S.view=\'radar\';render()">'+esc(x.l)+'</a>').join(" · ")+'</div></div><div class="card">'+cardHead("Închideri pe săptămâni","8 săpt.")+chartCols(wk)+'</div><div class="card">'+cardHead("Apeluri active pe program","top 6")+chartHBars(pgTop.map(x=>Object.assign({},x,{go:"S.radar.program='"+x.l.replace(/['"]/g,"")+"';S.radar.stari=new Set(['activ']);S.radar.maxDays=null;S.view='radar';render()"})))+'</div></div>';
  // REFERINȚĂ: sinteza și lista DE VERIFICAT — închise implicit, dar mereu prezente
  const dvN=(b.de_verificat||[]).length;
  let ref='<div class="section">';
  if(b.sinteza) ref+='<details class="acc2 az-det"><summary>Sinteza zilei <span class="evsrc">— textul complet al buletinului</span></summary><div class="inner az-syn">'+esc(b.sinteza)+'</div></details>';
  ref+='<details class="acc2 az-det"><summary>Lista [DE VERIFICAT] a zilei <span class="ct">'+dvN+'</span><span class="evsrc">— informații nereconfirmate la sursă</span></summary><div class="inner">'+(dvN?'<ul class="list">'+(b.de_verificat||[]).map(u=>'<li class="az-li"><span class="mk">□</span><span class="tx">'+esc(u)+'</span></li>').join("")+'</ul>':'<div class="empty">Nimic de verificat la ultima scanare.</div>')+'</div></details></div>';
  h+=tiles+'<div class="grid2 section">'+termene+urg+'</div><div class="grid2 section">'+opp+top+'</div>'+charts+ref;
  return h; }
/* tile()/tileGo() sunt în core.js */
/* ---------- Grafice SVG native (fără librării; culorile doar pe marcaje, textul pe tokenuri) ---------- */
function niceTicks(mx,n){ const raw=mx/(n||3), p=Math.pow(10,Math.floor(Math.log10(raw||1))); const m=raw/p; const st=(m<=1?1:m<=2?2:m<=5?5:10)*p; const out=[]; for(let t=0;t<=mx+1e-9;t+=st) out.push(Math.round(t*1e6)/1e6); return out; }
function chartDonut(items,opts){ opts=opts||{}; const tot=items.reduce((s,x)=>s+x.v,0)||1; const R=46,r=31,cx=52,cy=52; let a=-Math.PI/2; const C=["var(--s1)","var(--s2)","var(--s3)","var(--axis)"];
  const p=(ang,rr)=>[(cx+rr*Math.cos(ang)).toFixed(2),(cy+rr*Math.sin(ang)).toFixed(2)];
  const segs=items.map((x,i)=>{ if(!x.v) return ""; const f=x.v/tot; const a2=a+f*2*Math.PI; const big=f>.5?1:0; let d;
    if(f>=.999) d='M'+(cx+R)+' '+cy+' A'+R+' '+R+' 0 1 1 '+(cx-R)+' '+cy+' A'+R+' '+R+' 0 1 1 '+(cx+R)+' '+cy+' M'+(cx+r)+' '+cy+' A'+r+' '+r+' 0 1 0 '+(cx-r)+' '+cy+' A'+r+' '+r+' 0 1 0 '+(cx+r)+' '+cy;
    else { const [x1,y1]=p(a,R),[x2,y2]=p(a2,R),[x3,y3]=p(a2,r),[x4,y4]=p(a,r); d='M'+x1+' '+y1+' A'+R+' '+R+' 0 '+big+' 1 '+x2+' '+y2+' L'+x3+' '+y3+' A'+r+' '+r+' 0 '+big+' 0 '+x4+' '+y4+' Z'; }
    a=a2; return '<path class="mk" d="'+d+'" fill="'+(x.c||C[i%C.length])+'" stroke="var(--surface)" stroke-width="2" fill-rule="evenodd"><title>'+esc(x.l)+': '+x.v+'</title></path>'; }).join("");
  return '<div class="donutwrap"><svg class="viz az-donut" viewBox="0 0 104 104">'+segs+'<text x="52" y="50" text-anchor="middle" class="lab az-dc">'+(opts.center!=null?opts.center:tot)+'</text><text x="52" y="63" text-anchor="middle" class="az-dl">'+esc(opts.centerL||"total")+'</text></svg><div class="legend">'+items.map((x,i)=>'<span><i style="background:'+(x.c||C[i%C.length])+'"></i>'+esc(x.l)+' <b>'+x.v+'</b></span>').join("")+'</div></div>'; }
function chartCols(items,opts){ opts=opts||{}; const W=440,H=opts.h||160,pl=30,pb=22,pt=16; const mx=Math.max(1,...items.map(x=>x.v)); const n=items.length||1; const step=(W-pl)/n; const bw=Math.min(24,step*.6); const y=v=>pt+(H-pt-pb)*(1-v/mx);
  let s='<svg class="viz" viewBox="0 0 '+W+' '+H+'">';
  niceTicks(mx,3).forEach(t=>{ s+='<line class="gl" x1="'+pl+'" x2="'+W+'" y1="'+y(t).toFixed(1)+'" y2="'+y(t).toFixed(1)+'"/><text class="ax" x="'+(pl-6)+'" y="'+(y(t)+3.5).toFixed(1)+'" text-anchor="end">'+nf.format(t)+'</text>'; });
  s+='<line class="bl" x1="'+pl+'" x2="'+W+'" y1="'+y(0).toFixed(1)+'" y2="'+y(0).toFixed(1)+'"/>';
  const imax=items.reduce((b,x,i)=>x.v>items[b].v?i:b,0);
  items.forEach((x,i)=>{ const cx=pl+step*i+step/2, top=y(x.v), base=y(0), hgt=base-top; const c=x.c||"var(--s1)";
    if(x.v>0) s+= hgt<5? '<rect class="mk" fill="'+c+'" x="'+(cx-bw/2).toFixed(1)+'" y="'+top.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+hgt.toFixed(1)+'"><title>'+esc(x.l)+': '+x.v+'</title></rect>'
      : '<path class="mk" fill="'+c+'" d="M'+(cx-bw/2).toFixed(1)+' '+base.toFixed(1)+' V'+(top+4).toFixed(1)+' a4 4 0 0 1 4 -4 H'+(cx+bw/2-4).toFixed(1)+' a4 4 0 0 1 4 4 V'+base.toFixed(1)+' Z"><title>'+esc(x.l)+': '+x.v+'</title></path>';
    if(i===imax&&x.v>0) s+='<text class="lab" x="'+cx.toFixed(1)+'" y="'+(top-5).toFixed(1)+'" text-anchor="middle">'+x.v+'</text>';
    s+='<text class="ax" x="'+cx.toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle">'+esc(x.l)+'</text>'; });
  return s+'</svg>'; }
function chartHBars(items,opts){ opts=opts||{}; if(!items.length) return '<div class="empty">Nimic de afișat.</div>'; const mx=Math.max(1,...items.map(x=>x.v)); const fmt=opts.fmt||(v=>nf.format(v));
  return '<div class="hbars">'+items.map(x=>'<div class="hbar'+(x.go?' go':'')+'"'+(x.go?' onclick="'+x.go+'" title="filtrează în Radar"':'')+'><span class="az-ell" title="'+esc(x.l)+'">'+esc(x.l)+'</span><div class="trk"><div class="fil mk" style="width:'+Math.max(1,x.v/mx*100).toFixed(1)+'%'+(x.c?';background:'+x.c:"")+'" title="'+esc(x.l)+': '+fmt(x.v)+'"></div></div><span class="vv">'+fmt(x.v)+'</span></div>').join("")+'</div>'; }
function miniCal(hor){ const all=calItems(hor); const items=all.slice(0,10);
  if(!items.length) return '<div class="empty">Nimic scadent în următoarele '+hor+' zile.</div>';
  return '<table class="tbl stack az-mini"><tbody>'+items.map(it=>'<tr tabindex="0" onkeydown="if(event.key===\'Enter\')this.click()" onclick="'+(it.kind==="apel"?"openApel('"+esc(it.id)+"')":"openProiect('"+esc(it.id)+"')")+'"><td class="dtc">'+cdBadge(it.data,{task:it.kind==="proiect"})+'</td><td><span class="tp '+calKindCls(it)+'">'+esc(it.tip)+'</span><br><b>'+esc(it.titlu)+'</b>'+(it.sub?' <small class="az-sub">— '+esc(it.sub)+'</small>':"")+'</td></tr>').join("")+'</tbody></table>'+(all.length>10?'<div class="az-more"><button class="btn small ghost" onclick="S.view=\'calendar\';render()">+ încă '+(all.length-10)+' în Calendar →</button></div>':''); }
function copyBuletin(){ const b=META.buletin||{}; const K=buletinKPI(); let t=(b.titlu||"Buletin")+"\n\n"+(b.sinteza||"")+"\n\nCIFRE: "+K.act+" apeluri active · "+K.cl7+" se închid ≤7 zile · "+K.cl30+" ≤30 zile · "+K.plan+" planificate/consultare · "+K.t7+" termene proiecte ≤7 zile · pipeline "+money(K.pipeG,"lei")+(K.pipeDemo?" (demo)":"")+"\n\nTERMENE 14 ZILE:\n"+calItems(14).slice(0,12).map(i=>"• "+fmtDs(i.data)+" — ["+i.tip+"] "+i.titlu).join("\n")+"\n\nURGENȚE:\n"+(b.urgente||[]).map(x=>"• "+x).join("\n")+"\n\nOPORTUNITĂȚI:\n"+(b.oportunitati_cheie||[]).map(x=>"• "+x).join("\n")+"\n\nDE VERIFICAT:\n"+(b.de_verificat||[]).map(x=>"□ "+x).join("\n");
  copyTxt(t,"Buletin copiat"); }
