/* ============ ZONA AZI — buletin, KPI, grafice ============ */
"use strict";
/* ---------- Buletin ---------- */
function radarAge(){ const s=(DB.apeluri||{}).extras_la||""; if(!s) return null; const d=new Date(s); if(isNaN(d)) return null;
  const zile=Math.floor((TODAY-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/86400000);
  return {zile, cls:(zile<=2?"good":zile<=7?"warn":"crit")}; }
function radarAgeColor(cls){ return cls==="good"?"var(--good)":cls==="warn"?"var(--warn-text)":"var(--critical)"; }
function buletinKPI(){ const act=A.filter(a=>a.stare==="activ").length, plan=A.filter(a=>a.stare==="planificat"||a.stare==="consultare").length;
  const cl7=A.filter(a=>{const d=days(a.data_inchidere);return d!=null&&d>=0&&d<=7;}).length, cl30=A.filter(a=>{const d=days(a.data_inchidere);return d!=null&&d>=0&&d<=30;}).length;
  const reale=PR.filter(p=>!p.demo); const pipeG=(reale.length?reale:PR).reduce((s,p)=>s+(p.grant_lei||0),0); const t7=calItems(7).length; const dv=A.filter(a=>(a.incredere_extractie||1)<0.8).length;
  return {act,plan,cl7,cl30,pipeG,pipeN:(reale.length?reale:PR).length,pipeDemo:!reale.length,t7,dv}; }
function vBuletin(){ const b=(META.buletin)||{}; const K=buletinKPI(); const _ra=radarAge(); const mob=window.innerWidth<720;
  const titlu=(b.titlu||"Buletin"); const t1=titlu.split(" (")[0], t2=titlu.includes(" (")?titlu.slice(titlu.indexOf(" (")+2).replace(/\)$/,""):"";
  let h='<div class="viewtitle"><h1>'+esc(t1)+'</h1><span class="sub">'+(t2?esc(t2)+' · ':'')+'radar: '+A.length+' apeluri din '+SURSE.length+' surse'+(_ra?' · <b style="color:'+radarAgeColor(_ra.cls)+'">scanat acum '+_ra.zile+' '+(_ra.zile===1?"zi":"zile")+'</b>':"")+'</span><div class="viewactions"><button class="btn small" onclick="copyBuletin()">📋 Copiază buletinul</button></div></div>';
  if(_ra && _ra.zile>7) h+='<div class="callout warn">⏳ <b>Date vechi de '+_ra.zile+' zile</b> (scanate '+esc(String((DB.apeluri||{}).extras_la||"").slice(0,10))+'). Termenele apelurilor se pot schimba — cere «scanează acum» în conversație.</div>';
  else if(_ra && _ra.zile>2) h+='<div class="callout">Ultima scanare: acum '+_ra.zile+' zile ('+esc(String((DB.apeluri||{}).extras_la||"").slice(0,10))+'). Termenele foarte apropiate merită reconfirmate la sursă.</div>';
  // KPI: 3 critice + 4 secundare
  let tiles='<div class="tiles">';
  tiles+=tile(K.act,"Apeluri active","din "+A.length+" în registru","acc","radar",()=>{S.radar.stari=new Set(["activ"]);S.radar.maxDays=null;});
  tiles+=tile(K.cl7,"Se închid în ≤7 zile",K.cl7?"atenție maximă":"nimic critic",K.cl7?"crit":"","radar",()=>{S.radar.stari=new Set(["activ"]);S.radar.maxDays=7;S.radar.sort="termen";});
  tiles+=tile(K.cl30,"Se închid în ≤30 zile","fereastră de depunere","warnv","radar",()=>{S.radar.stari=new Set(["activ"]);S.radar.maxDays=30;S.radar.sort="termen";});
  tiles+='</div><div class="tiles compact">';
  tiles+=tile(K.plan,"Planificate + consultare","pregătire anticipată","","radar",()=>{S.radar.stari=new Set(["planificat","consultare"]);S.radar.maxDays=null;});
  tiles+=tile(money(K.pipeG,"lei"),"Pipeline (grant)",K.pipeN+" proiecte"+(K.pipeDemo?" · demo":""),"acc","pipeline",null);
  tiles+=tile(K.t7,"Termene în 7 zile","calendar",K.t7>3?"warnv":"","calendar",null);
  tiles+=tile(K.dv,"De verificat la sursă","apeluri cu încredere <80%","","radar",()=>{S.radar.verificat=true;S.radar.stari=new Set();});
  tiles+='</div>';
  // grafice
  const stareCnt=[["activ","Active"],["planificat","Planificate"],["consultare","În consultare"],["inchis","Închise"],["in_evaluare","În evaluare"]].map(([k,l])=>({l,v:A.filter(a=>a.stare===k).length,k})).filter(x=>x.v>0); const CC=["var(--s1)","var(--s2)","var(--s3)","var(--s7)","var(--s4)"]; stareCnt.forEach((x,i)=>x.c=CC[i%CC.length]);
  const wk=[]; for(let i=0;i<8;i++){ const st=new Date(TODAY); st.setDate(TODAY.getDate()+i*7); const en=new Date(st); en.setDate(st.getDate()+6); wk.push({l:st.getDate()+"–"+en.getDate()+" "+en.toLocaleDateString("ro-RO",{month:"short"}).replace(".",""),v:A.filter(a=>{const d=pd(a.data_inchidere);return d&&d>=st&&d<=en;}).length}); }
  const pgc={}; A.filter(a=>a.stare==="activ").forEach(a=>{ const k=a.program||"—"; pgc[k]=(pgc[k]||0)+1; }); const pgTop=Object.keys(pgc).sort((a,b)=>pgc[b]-pgc[a]).slice(0,6).map(k=>({l:k,v:pgc[k]}));
  const charts='<div class="grid3 section"><div class="card"><h2>Apeluri după stare</h2>'+chartDonut(stareCnt,{center:A.length,centerL:"apeluri"})+'<div class="evsrc" style="margin-top:6px">'+stareCnt.map(x=>'<a href="#" onclick="event.preventDefault();S.radar.stari=new Set([\''+x.k+'\']);S.radar.maxDays=null;S.view=\'radar\';render()">'+esc(x.l)+'</a>').join(" · ")+'</div></div><div class="card"><h2>Închideri pe săptămâni · 8 săpt.</h2>'+chartCols(wk)+'</div><div class="card"><h2>Apeluri active pe program · top 6</h2>'+chartHBars(pgTop.map(x=>Object.assign({},x,{go:"S.radar.program='"+x.l.replace(/['"]/g,"")+"';S.radar.stari=new Set(['activ']);S.radar.maxDays=null;S.view='radar';render()"})))+'</div></div>';
  const bold=u=>{ const e=esc(u); return e.replace(/^([^:]{3,80}):/,"<b>$1</b>:"); }; const q3=u=>esc(String(u).replace(/^[^\p{L}\p{N}]+/u,"").split(/\s+/).slice(0,3).join(" ").replace(/[«»"'“”:]/g,""));
  const urg='<div class="card"><h2>🔴 Urgențe azi</h2>'+((b.urgente||[]).length?'<ul class="list">'+(b.urgente||[]).map(u=>'<li><span style="flex-shrink:0">❗</span><span style="flex:1">'+bold(u)+'</span><button class="btn small ghost" title="caută în radar" onclick="S.radar.q=\''+q3(u)+'\';S.radar.stari=new Set();S.radar.maxDays=null;S.view=\'radar\';render()">🔎</button></li>').join("")+'</ul>':'<div class="empty">Nicio urgență semnalată la ultima scanare.</div>')+'</div>';
  const opp='<div class="card"><h2>💡 Oportunități-cheie</h2>'+((b.oportunitati_cheie||[]).length?'<ul class="list">'+(b.oportunitati_cheie||[]).map(u=>'<li><span style="flex-shrink:0">▸</span><span style="flex:1">'+bold(u)+'</span><button class="btn small ghost" title="caută în radar" onclick="S.radar.q=\''+q3(u)+'\';S.radar.stari=new Set();S.radar.maxDays=null;S.view=\'radar\';render()">🔎</button></li>').join("")+'</ul>':'<div class="empty">—</div>')+'</div>';
  const termene='<div class="section card"><h2>📅 Termenele următoarelor 14 zile</h2>'+miniCal(14)+'</div>';
  const bp=bestPairs(6);
  const top='<div class="section card"><h2>🎯 Top potriviri client × apel</h2>'+(bp.length?'<table class="tbl"><thead><tr><th>Client</th><th>Apel</th><th>Termen</th><th>Verdict · scor</th></tr></thead><tbody>'+bp.map(m=>'<tr onclick="openMemo(\''+m.client.id+'\',\''+esc(m.apel.id_apel)+'\')"><td><b>'+esc(m.client.denumire)+'</b>'+(m.client.demo?' <span class="tag-demo">DEMO</span>':'')+'</td><td>'+esc(m.apel.titlu)+'<br><small style="color:var(--muted)">'+esc(m.apel.program)+'</small></td><td>'+cdBadge(m.apel.data_inchidere,{cont:/continuu/.test(m.apel.tip_depunere||"")})+'</td><td>'+vChip(m.verdict,m.scor)+'</td></tr>').join("")+'</tbody></table>':'<div class="empty">Nicio potrivire — adaugă clienți în CRM.</div>')+'</div>';
  const dvl='<div class="section card"><h2>🔍 Lista [DE VERIFICAT] a zilei</h2>'+((b.de_verificat||[]).length?'<ul class="list">'+(b.de_verificat||[]).map(u=>'<li>□ '+esc(u)+'</li>').join("")+'</ul>':'<div class="empty">—</div>')+'</div>';
  h+=tiles+(mob?termene+'<div class="grid2 section">'+urg+opp+'</div>'+charts:charts+'<div class="grid2 section">'+urg+opp+'</div>'+termene)+top+dvl;
  if(b.sinteza) h+='<div class="callout" style="margin-top:14px">'+esc(b.sinteza)+'</div>';
  return h; }
let tileActions=[];
function tile(v,l,d,cls,view,pre){ const i=tileActions.length; tileActions.push({view,pre});
  return '<div class="tile go '+(cls||"")+(String(v).length>7?" long":"")+'" tabindex="0" onkeydown="if(event.key===\'Enter\')tileGo('+i+')" onclick="tileGo('+i+')"><div class="v">'+v+'</div><div class="l">'+l+'</div><div class="d">'+d+'</div></div>'; }
function tileGo(i){ const t=tileActions[i]; if(!t) return; if(t.pre)t.pre(); S.view=t.view; render(); }
/* ---------- Grafice SVG native (fără librării; culorile doar pe marcaje, textul pe tokenuri) ---------- */
function niceTicks(mx,n){ const raw=mx/(n||3), p=Math.pow(10,Math.floor(Math.log10(raw||1))); const m=raw/p; const st=(m<=1?1:m<=2?2:m<=5?5:10)*p; const out=[]; for(let t=0;t<=mx+1e-9;t+=st) out.push(Math.round(t*1e6)/1e6); return out; }
function chartDonut(items,opts){ opts=opts||{}; const tot=items.reduce((s,x)=>s+x.v,0)||1; const R=46,r=31,cx=52,cy=52; let a=-Math.PI/2; const C=["var(--s1)","var(--s2)","var(--s3)","var(--axis)"];
  const p=(ang,rr)=>[(cx+rr*Math.cos(ang)).toFixed(2),(cy+rr*Math.sin(ang)).toFixed(2)];
  const segs=items.map((x,i)=>{ if(!x.v) return ""; const f=x.v/tot; const a2=a+f*2*Math.PI; const big=f>.5?1:0; let d;
    if(f>=.999) d='M'+(cx+R)+' '+cy+' A'+R+' '+R+' 0 1 1 '+(cx-R)+' '+cy+' A'+R+' '+R+' 0 1 1 '+(cx+R)+' '+cy+' M'+(cx+r)+' '+cy+' A'+r+' '+r+' 0 1 0 '+(cx-r)+' '+cy+' A'+r+' '+r+' 0 1 0 '+(cx+r)+' '+cy;
    else { const [x1,y1]=p(a,R),[x2,y2]=p(a2,R),[x3,y3]=p(a2,r),[x4,y4]=p(a,r); d='M'+x1+' '+y1+' A'+R+' '+R+' 0 '+big+' 1 '+x2+' '+y2+' L'+x3+' '+y3+' A'+r+' '+r+' 0 '+big+' 0 '+x4+' '+y4+' Z'; }
    a=a2; return '<path class="mk" d="'+d+'" fill="'+(x.c||C[i%C.length])+'" stroke="var(--surface)" stroke-width="2" fill-rule="evenodd"><title>'+esc(x.l)+': '+x.v+'</title></path>'; }).join("");
  return '<div class="donutwrap"><svg class="viz" viewBox="0 0 104 104" style="width:108px;height:108px;flex-shrink:0">'+segs+'<text x="52" y="50" text-anchor="middle" class="lab" style="font-size:21px">'+(opts.center!=null?opts.center:tot)+'</text><text x="52" y="63" text-anchor="middle" style="font-size:9px;fill:var(--muted)">'+esc(opts.centerL||"total")+'</text></svg><div class="legend">'+items.map((x,i)=>'<span><i style="background:'+(x.c||C[i%C.length])+'"></i>'+esc(x.l)+' <b>'+x.v+'</b></span>').join("")+'</div></div>'; }
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
  return '<div class="hbars">'+items.map(x=>'<div class="hbar'+(x.go?' go':'')+'"'+(x.go?' onclick="'+x.go+'" title="filtrează în Radar"':'')+'><span title="'+esc(x.l)+'" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(x.l)+'</span><div class="trk"><div class="fil mk" style="width:'+Math.max(1,x.v/mx*100).toFixed(1)+'%'+(x.c?';background:'+x.c:"")+'" title="'+esc(x.l)+': '+fmt(x.v)+'"></div></div><span class="vv">'+fmt(x.v)+'</span></div>').join("")+'</div>'; }
function miniCal(hor){ const all=calItems(hor); const items=all.slice(0,10);
  if(!items.length) return '<div class="empty">Nimic scadent în fereastră.</div>';
  return '<table class="tbl"><tbody>'+items.map(it=>'<tr onclick="'+(it.kind==="apel"?"openApel('"+esc(it.id)+"')":"openProiect('"+esc(it.id)+"')")+'"><td style="width:120px">'+cdBadge(it.data,{task:it.kind==="proiect"})+'</td><td><span class="tp '+calKindCls(it)+'">'+esc(it.tip)+'</span><br><b>'+esc(it.titlu)+'</b>'+(it.sub?' <small style="color:var(--muted)">— '+esc(it.sub)+'</small>':"")+'</td></tr>').join("")+'</tbody></table>'+(all.length>10?'<div style="margin-top:6px"><button class="btn small ghost" onclick="S.view=\'calendar\';render()">+ încă '+(all.length-10)+' în Calendar →</button></div>':''); }
function copyBuletin(){ const b=META.buletin||{}; const K=buletinKPI(); let t=(b.titlu||"Buletin")+"\n\n"+(b.sinteza||"")+"\n\nCIFRE: "+K.act+" apeluri active · "+K.cl7+" se închid ≤7 zile · "+K.cl30+" ≤30 zile · "+K.plan+" planificate/consultare · pipeline "+money(K.pipeG,"lei")+(K.pipeDemo?" (demo)":"")+"\n\nTERMENE 14 ZILE:\n"+calItems(14).slice(0,12).map(i=>"• "+fmtDs(i.data)+" — ["+i.tip+"] "+i.titlu).join("\n")+"\n\nURGENȚE:\n"+(b.urgente||[]).map(x=>"• "+x).join("\n")+"\n\nOPORTUNITĂȚI:\n"+(b.oportunitati_cheie||[]).map(x=>"• "+x).join("\n")+"\n\nDE VERIFICAT:\n"+(b.de_verificat||[]).map(x=>"□ "+x).join("\n");
  copyTxt(t,"Buletin copiat"); }

