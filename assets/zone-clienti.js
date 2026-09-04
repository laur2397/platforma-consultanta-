/* ============ ZONA CLIENȚI — CRM, prospect ONRC, market intel ============ */
"use strict";
/* ---------- Clienți ---------- */
function vClienti(){ const cc=crmCounts(); const F=S.crm||(S.crm={q:"",tip:"",sort:"nume"}); const hd=!!window.CRM.hideDemo;
  const menu=[["⬇ Export CSV (Excel)","crmExportCSV()"],["⬇ Backup JSON","crmExport()"],["⬇ Șablon CSV","crmTemplate()"]]; if(cc.demo||hd) menu.push([hd?"👁 Arată clienții demo":"🙈 Ascunde clienții demo","crmToggleDemo()"]);
  let h='<div class="cl-page"><div class="viewtitle"><h1>CRM clienți</h1><span class="sub">Portofoliul tău — '+cc.reali+' clienți reali'+(cc.demo?' · '+cc.demo+' demo':'')+' · datele rămân pe acest dispozitiv.</span><div class="viewactions">'
    +'<button class="btn small primary" onclick="crmNewForm()">+ Client nou</button><button class="btn small" onclick="crmImportOpen()">⬆ Import</button>'+moreMenu(menu)+'</div></div>';
  if(!CL.length) return h+emptyState('👥','Niciun client încă','Adaugă primul client sau importă portofoliul din Excel/CSV. Datele rămân doar pe acest dispozitiv.','<button class="btn" onclick="crmImportOpen()">⬆ Import CSV/JSON</button><button class="btn" onclick="crmTemplate()">⬇ Șablon CSV</button>'+(hd?'<button class="btn ghost" onclick="crmToggleDemo()">👁 arată clienții demo</button>':''))+'</div>';
  if(!cc.reali && !hd) h+='<div class="callout">Vezi date <b>DEMO</b> (clienți fictivi) până adaugi primii clienți reali — «+ Client nou» sau «⬆ Import».</div>';
  else if(cc.demo && !hd) h+='<div class="callout warn">'+cc.reali+' clienți reali + '+cc.demo+' DEMO fictivi — ascunde demo din meniul ⋯ ca să lucrezi doar pe ai tăi.</div>';
  const withRisk=c=>{ const df=c.date_financiare||{}; return (df.capitaluri_proprii_lei!=null&&df.capitaluri_proprii_lei<0)||c.datorii_fiscale; };
  let list=CL.filter(c=>{ if(F.tip==="UAT"&&c.tip!=="UAT") return false; if(F.tip==="privat"&&c.tip==="UAT") return false; if(F.tip==="proiecte"&&!PR.some(p=>p.client_id===c.id)) return false; if(F.tip==="risc"&&!withRisk(c)) return false;
    if(F.q){ const q=onrcNorm(F.q); if(!onrcNorm((c.denumire||"")+" "+(c.cui||"")+" "+(c.judet||"")+" "+(c.caen_principal||"")).includes(q)) return false; } return true; });
  const scoreOf=c=>{ const t=topForClient(c.id,1)[0]; return t?t.scor:-1; };
  list.sort((x,y)=> F.sort==="judet"?(x.judet||"").localeCompare(y.judet||"","ro"): F.sort==="minimis"?((y.plafon_minimis_eur==null?-1:y.plafon_minimis_eur)-(x.plafon_minimis_eur==null?-1:x.plafon_minimis_eur)): F.sort==="scor"?(scoreOf(y)-scoreOf(x)): (x.denumire||"").localeCompare(y.denumire||"","ro"));
  h+='<div class="filters cl-filters"><input type="search" placeholder="caută denumire, CUI, județ, CAEN…" value="'+esc(F.q)+'" oninput="S.crm.q=this.value;render(true)"><div class="cl-chips">'+[["","Toți"],["privat","Privați"],["UAT","UAT"],["proiecte","Cu proiecte"],["risc","Cu risc"]].map(([k,l])=>'<button class="fchip'+(F.tip===k?" on":"")+'" onclick="S.crm.tip=\''+k+'\';render(true)">'+l+'</button>').join("")+'</div><select onchange="S.crm.sort=this.value;render(true)">'+[["nume","sortare: nume"],["judet","sortare: județ"],["minimis","sortare: minimis disponibil"],["scor","sortare: scor top apel"]].map(([k,l])=>'<option value="'+k+'"'+(F.sort===k?" selected":"")+'>'+l+'</option>').join("")+'</select><span class="cl-count">'+list.length+' din '+CL.length+'</span></div>';
  if(!list.length) return h+emptyState('🔍','Niciun client pentru filtrele curente','Schimbă căutarea sau filtrul.','<button class="btn" onclick="S.crm.q=\'\';S.crm.tip=\'\';render(true)">↺ Resetează filtrele</button>')+'</div>';
  /* Carduri uniforme: nume → meta → semnale → minimis → top apel → picior (aceeași ordine, aceeași înălțime) */
  h+='<div class="cl-grid">'+list.map(c=>{ const df=c.date_financiare||{}; const neg=df.capitaluri_proprii_lei!=null&&df.capitaluri_proprii_lei<0;
    const top=topForClient(c.id,1)[0]; const nP=PR.filter(p=>p.client_id===c.id).length; const t=top?top.apel.titlu:"";
    const used=(c.ajutoare_minimis||[]).reduce((s,x)=>s+(x.suma_eur||0),0); const plaf=c.plafon_minimis_eur!=null?c.plafon_minimis_eur:(c.tip!=="UAT"&&(c.ajutoare_minimis||[]).length?300000-used:null);
    const meta=[c.dimensiune||c.tip||"",c.judet||"",c.regiune||(c.judet?onrcRegOf(c.judet):"")].filter(Boolean).join(" · ");
    let stat=""; if(neg) stat+='<span class="cd cd-crit">capitaluri negative</span>'; if(c.datorii_fiscale) stat+='<span class="cd cd-warn">datorii fiscale</span>';
    if(!stat) stat=(c.tip==="UAT"||df.capitaluri_proprii_lei!=null)?'<span class="cd cd-off">fără semnale de risc în date</span>':'<span class="cd cd-off">date financiare necompletate</span>';
    let mini; if(c.tip==="UAT") mini='<span class="cl-muted">minimis: nu se urmărește pentru UAT</span>';
    else if(plaf!=null) mini='minimis disponibil <b>'+money(plaf,"EUR")+'</b><div class="minibar"><span style="width:'+Math.min(100,(300000-plaf)/3000)+'%;background:'+(plaf<=0?'var(--critical)':plaf<60000?'var(--warn)':'var(--accent)')+'"></span></div>';
    else mini='<span class="cl-muted">minimis: necunoscut — de verificat în RegAS</span>';
    return '<div class="card click cl-card" tabindex="0" onkeydown="if(event.key===\'Enter\')this.click()" onclick="openClient(\''+c.id+'\')">'
      +'<div class="cl-hd"><span class="cl-name">'+esc(c.denumire)+'</span>'+(c.demo?'<span class="tag-demo">DEMO</span>':'<button class="btn small ghost cl-edit" title="Editează" onclick="event.stopPropagation();crmNewForm(\''+c.id+'\')">✎</button>')+'</div>'
      +'<div class="cl-meta" title="'+esc(meta)+'">'+esc(meta)+'</div>'
      +'<div class="cl-row">'+stat+'</div>'
      +'<div class="cl-min">'+mini+'</div>'
      +'<div class="cl-row"><span class="cl-k">Top apel</span>'+(top?vChip(top.verdict,top.scor)+'<span class="cl-prog" title="'+esc(top.apel.program||"")+'">'+esc(top.apel.program||"")+'</span>':'<span class="cl-muted">fără potriviri active</span>')+'</div>'
      +'<div class="cl-t" title="'+esc(t)+'">'+(top?esc(t):'')+'</div>'
      +'<div class="cl-ft">'+(nP?'<span class="chip hl">'+nP+' proiect'+(nP>1?'e':'')+'</span>':'<span class="chip">fără proiecte</span>')+(c.telefon?'<a class="chip" href="tel:'+esc(c.telefon)+'" onclick="event.stopPropagation()">☎ '+esc(c.telefon)+'</a>':'')+(c.email?'<a class="chip" href="mailto:'+esc(c.email)+'" onclick="event.stopPropagation()" title="'+esc(c.email)+'">✉ e-mail</a>':'')+'</div></div>'; }).join("")+'</div>';
  return h+'</div>'; }
function crmExportCSV(){ const cols=["denumire","cui","tip","dimensiune","judet","regiune","forma_juridica","caen_principal","email","telefon","localitate","plafon_minimis_eur","datorii_fiscale","interese","sursa"];
  const rows=CL.filter(c=>!c.demo).map(c=>cols.map(k=>{ let v=c[k]; if(k==="interese") v=(c.interese||[]).join("; "); if(k==="datorii_fiscale") v=c.datorii_fiscale?"DA":"NU"; return v==null?"":String(v); }));
  if(!rows.length){ toast("Niciun client real de exportat"); return; }
  const csv=[cols].concat(rows).map(r=>r.map(x=>/[";\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x).join(";")).join("\n"); dl("clienti.csv","\ufeff"+csv,"text/csv;charset=utf-8"); toast("CSV exportat ("+rows.length+" clienți)"); }


/* ---------- Market Intel ---------- */
/* Market Intel — încrucișare DETERMINISTĂ a datelor reale din platformă:
   proiecte contractate (istoric absorbție), primării, GBER, apeluri active, SICAP. */
let _INTEL=null;
function gberIntensity(jud){ const g=REF.gber_harta_2022_2027||{}; const sp=(g.special||{})[jud];
  let base=null; if((g["60_pct"]||[]).includes(jud))base=60; else if((g["50_pct"]||[]).includes(jud))base=50; else if((g["40_pct"]||[]).includes(jud))base=40; else if((g["30_pct"]||[]).includes(jud))base=30;
  if(sp){ const m=String(sp).match(/(\d+)/); if(m) base=+m[1]; }
  if(base==null) return null; return {mari:base, imm:Math.min(base+20,70)}; }
function intelStats(){ if(_INTEL) return _INTEL;
  const mipe=((DB.proiecte_mipe||{}).items)||[]; const uat=((DB.primarii||{}).uat)||[]; const sic=((DB.sicap||{}).items)||[];
  const byJud={}, ben={}, sup={};
  mipe.forEach(i=>{ const j=i.jud||"—"; const b=(byJud[j]=byJud[j]||{n:0,val:0}); b.n++; b.val+=(i.v||0);
    const k=i.ben||"—"; const e=(ben[k]=ben[k]||{n:0,val:0,pg:new Set(),jud:new Set()}); e.n++; e.val+=(i.v||0); if(i.pg)e.pg.add(i.pg); if(i.jud)e.jud.add(i.jud); });
  const uatJud={}; uat.forEach(u=>{ const j=u.j||"—"; uatJud[j]=(uatJud[j]||0)+1; });
  sic.forEach(i=>{ const k=i.sup||"—"; if(!k||k==="—")return; const e=(sup[k]=sup[k]||{n:0,val:0,dom:new Set()}); e.n++; e.val+=(i.val||0); if(i.dom)e.dom.add(i.dom); });
  const judList=Object.keys(byJud).filter(j=>j&&j!=="—").sort((a,b)=>byJud[b].val-byJud[a].val);
  const warm=Object.keys(ben).map(k=>({nume:k,n:ben[k].n,val:ben[k].val,pg:[...ben[k].pg],jud:[...ben[k].jud]})).filter(x=>x.n>=2&&x.nume!=="—").sort((a,b)=>b.n-a.n||b.val-a.val);
  const supl=Object.keys(sup).map(k=>({nume:k,n:sup[k].n,val:sup[k].val,dom:[...sup[k].dom]})).sort((a,b)=>b.n-a.n||b.val-a.val);
  _INTEL={byJud,uatJud,judList,warm,supl,totMipe:mipe.length}; return _INTEL; }
function intelApeluriJud(jud){ const reg=onrcRegOf(jud); return A.filter(a=>{ if(a.stare!=="activ")return false; const rs=a.regiuni||[];
  if(rs.includes("Național")||!rs.length) return true; if(reg&&rs.includes(reg)) return true;
  if((a.judete_eligibile||[]).some(x=>onrcNorm(x)===onrcNorm(jud))) return true; return false; }); }
function intelApCounts(st){ if(st._ap) return st._ap; const nat=A.filter(a=>a.stare==="activ"&&(!(a.regiuni||[]).length||(a.regiuni||[]).includes("Național"))).length; const m={}; st.judList.forEach(j=>m[j]=intelApeluriJud(j).length); st._ap={m,nat}; return st._ap; }
function intelSort(k){ if(S.intelSort===k) S.intelDir=-(S.intelDir||1); else { S.intelSort=k; S.intelDir=(k==="jud"?1:-1); } render(true); }
function intelToBaze(q,sub){ bzState().sub=sub||'proiecte'; if(sub==='entitati'){ enState().q=q; } else { pjState().q=q; pjState().jud=''; pjState().prog=''; } S.view='baze'; render(); }
function intelToCrm(el){ const nume=el.dataset.nume, jud=el.dataset.jud||'', pg=el.dataset.pg||''; if(CL.some(c=>onrcNorm(c.denumire)===onrcNorm(nume))){ toast('Există deja în CRM'); return; } crmAddClient(crmMakeClient({denumire:nume,judet:jud,regiune:jud?onrcRegOf(jud):'',tip:'privat',interese:pg,sursa:'Market Intel'})); toast('Adăugat ca prospect: '+nume); }
function intelCsv(kind){ const st=intelStats(); const ap=intelApCounts(st); let head,rows,name;
  if(kind==='jud'){ head=['Judet','Firme_contractate','Valoare_lei','GBER_IMM_pct','GBER_mari_pct','Apeluri_active','Apeluri_regionale','Primarii']; rows=st.judList.map(j=>{const g=gberIntensity(j);return [j,st.byJud[j].n,Math.round(st.byJud[j].val),g?g.imm:'',g?g.mari:'',ap.m[j],Math.max(0,ap.m[j]-ap.nat),st.uatJud[j]||0];}); name='Harta_pietei_judete.csv'; }
  else { head=['Beneficiar','Nr_proiecte','Valoare_lei','Programe','Judete']; rows=st.warm.slice(0,500).map(w=>[w.nume,w.n,Math.round(w.val),w.pg.join(' / '),w.jud.join(' / ')]); name='Leaduri_calde_MIPE.csv'; }
  const csv=[head].concat(rows).map(r=>r.map(c=>{const x=(c==null?'':String(c));return /[",\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x;}).join(',')).join('\n'); dl(name,'\ufeff'+csv,'text/csv;charset=utf-8'); toast('Export generat'); }
function vIntel(){ const st=intelStats(); const ap=intelApCounts(st);
  if(!S.intelJud){ const c=CL.find(x=>!x.demo&&x.judet)||CL.find(x=>x.judet); if(c&&st.byJud[c.judet]) S.intelJud=c.judet; }
  const sel=S.intelJud||"", sort=S.intelSort||"val", dir=S.intelDir||-1;
  const cliJud=[...new Set(CL.map(c=>c.judet).filter(j=>j&&st.byJud[j]))];
  const totUat=(DB.primarii||{}).total||Object.values(st.uatJud).reduce((a,b)=>a+b,0);
  const rowKey='tabindex="0" onkeydown="if(event.key===\'Enter\')this.click()"';
  let h='<div class="cl-page"><div class="viewtitle"><h1>Market Intel</h1><span class="sub">Încrucișare deterministă pe date reale — '+nf.format(st.totMipe)+' proiecte contractate · '+nf.format(totUat)+' UAT · SICAP.</span><div class="viewactions"><button class="btn small" onclick="intelCsv(\'jud\')">⬇ CSV județe</button><button class="btn small" onclick="intelCsv(\'warm\')">⬇ CSV leaduri</button></div></div>';
  /* HERO — radiografia județului (implicit județul primului client) */
  const selHtml='<select onchange="S.intelJud=this.value;render(true)"><option value="">— alege un județ —</option>'+st.judList.slice().sort((a,b)=>a.localeCompare(b,"ro")).map(j=>'<option '+(j===sel?"selected":"")+'>'+esc(j)+'</option>').join("")+'</select>'+(sel?'<button class="btn small ghost" onclick="S.intelJud=\'\';render(true)" title="renunță la selecție">✕</button>':"");
  h+='<div class="card cl-radio">'+cardHead('Radiografie județ'+(sel?' · '+esc(sel):''),null,selHtml);
  if(cliJud.length) h+='<div class="cl-judchips"><span class="evsrc">județele clienților:</span>'+cliJud.map(j=>'<button class="fchip'+(j===sel?' on':'')+'" onclick="S.intelJud=\''+esc(j)+'\';render(true)">'+esc(j)+'</button>').join('')+'</div>';
  if(sel){ const b=st.byJud[sel]||{n:0,val:0}; const gb=gberIntensity(sel); const aps=intelApeluriJud(sel); const uatn=st.uatJud[sel]||0; const reg=onrcRegOf(sel);
    const warmJ=st.warm.filter(w=>w.jud.includes(sel)).slice(0,6); const regionale=aps.filter(a=>!(a.regiuni||[]).includes("Național")&&(a.regiuni||[]).length);
    h+='<div class="tiles compact">'
      +'<div class="tile" title="firme cu proiecte contractate — istoric absorbție 2014–2020"><div class="v">'+nf.format(b.n)+'</div><div class="l">firme contractate</div><div class="d">'+money(b.val,"lei")+' cumulat · 2014–2020</div></div>'
      +'<div class="tile" title="intensitatea maximă a ajutorului regional (GBER), micro/mici"><div class="v">'+(gb?gb.imm+"%":"—")+'</div><div class="l">GBER max micro/mici</div><div class="d">'+(gb?'mari '+gb.mari+'%':'nu apare în harta 2022–2027')+'</div></div>'
      +tile(aps.length,"apeluri deschise",regionale.length+' regionale + '+(aps.length-regionale.length)+' naționale',"acc","radar",()=>{ S.radar.regiune=reg; S.radar.stari=new Set(["activ"]); S.radar.q=""; })
      +'<div class="tile"><div class="v">'+nf.format(uatn)+'</div><div class="l">primării</div><div class="d">prospecți publici</div></div></div>';
    const showAps=regionale.length?regionale:aps;
    h+='<div class="grid2 cl-radio2"><div><div class="cl-h3">Apeluri active '+(regionale.length?'dedicate regiunii '+esc(reg):'care acoperă '+esc(sel))+'</div>'
      +(showAps.length?'<ul class="list">'+showAps.slice(0,6).map(a=>'<li style="cursor:pointer" '+rowKey+' onclick="openApel(\''+esc(a.id_apel)+'\')"><span class="cl-lt">'+esc(a.titlu)+'</span><span class="chip">'+esc(a.program||"")+'</span>'+(a.data_inchidere?cdBadge(a.data_inchidere):'')+'</li>').join("")+'</ul><button class="btn small ghost" onclick="S.radar.regiune=\''+esc(reg)+'\';S.radar.stari=new Set([\'activ\']);S.radar.q=\'\';S.view=\'radar\';render()">Toate cele '+aps.length+' apeluri în Radar →</button>':'<div class="empty">Niciun apel activ nu acoperă județul acum.</div>')+'</div>';
    h+='<div><div class="cl-h3">Beneficiari recurenți din '+esc(sel)+' <span class="cl-h3s">leaduri calde</span></div>'
      +(warmJ.length?'<ul class="list">'+warmJ.map(w=>'<li><span style="flex:1;cursor:pointer" title="vezi toate proiectele" onclick="intelToBaze(\''+esc(w.nume).replace(/'/g,"\\'")+'\')"><b>'+esc(w.nume)+'</b><br><small class="cl-muted">'+w.n+' proiecte · '+money(w.val,"lei")+' · '+esc(w.pg.join(", "))+'</small></span><button class="btn small ghost" onclick="intelToCrm(this)" data-nume="'+esc(w.nume)+'" data-jud="'+esc(sel)+'" data-pg="'+esc(w.pg.join(" / "))+'">→ CRM</button></li>').join("")+'</ul>':'<div class="empty">Niciun beneficiar cu ≥2 proiecte contractate în acest județ.</div>')+'</div></div>';
  } else h+=emptyState('🗺','Alege un județ','Radiografia arată istoricul de absorbție, intensitatea GBER, apelurile deschise și primăriile din județ.');
  h+='</div>';
  /* Harta pieței (toate județele) — tabel sortabil, 6 coloane */
  const hdr=(k,l,cls)=>'<th class="sortable'+(cls?' '+cls:'')+(sort===k?' on':'')+'" onclick="intelSort(\''+k+'\')" title="sortează">'+l+(sort===k?(dir<0?" ▾":" ▴"):"")+'</th>';
  const val=j=>{ if(sort==="jud") return 0; if(sort==="uat") return st.uatJud[j]||0; if(sort==="n") return st.byJud[j].n; if(sort==="apeluri") return ap.m[j]; if(sort==="gber"){ const g=gberIntensity(j); return g?g.imm:0; } return st.byJud[j].val; };
  const rows=st.judList.slice().sort((a,b)=> sort==="jud" ? a.localeCompare(b,"ro")*dir : (val(a)-val(b))*(-dir));
  h+='<div class="card cl-tblcard section" id="intelTbl">'+cardHead('Harta pieței pe județ',st.judList.length,'<span class="evsrc hide-m">istoric absorbție + oportunitate curentă · click pe județ → radiografie</span>')+'<table class="tbl"><thead><tr>'+hdr("jud","Județ")+hdr("n","Firme contractate","num")+hdr("val","Valoare contractată","num")+hdr("gber","GBER IMM / mari","num")+hdr("apeluri","Apeluri active","num")+hdr("uat","Primării","num")+'</tr></thead><tbody>'+
    rows.map(j=>{ const b=st.byJud[j]; const gb=gberIntensity(j); const na=ap.m[j]; const nr=Math.max(0,na-ap.nat); return '<tr class="'+(j===sel?"on":"")+'" '+rowKey+' onclick="S.intelJud=\''+esc(j)+'\';render()"><td><b class="lnk">'+esc(j)+'</b></td><td class="num">'+nf.format(b.n)+'</td><td class="num">'+money(b.val,"lei")+'</td><td class="num">'+(gb?gb.imm+"% / "+gb.mari+"%":"—")+'</td><td class="num">'+(na?'<span class="cd '+(nr?"cd-good":"cd-off")+'" title="'+nr+' regionale + '+ap.nat+' naționale">'+na+'</span>':'<span class="cd cd-off">0</span>')+'</td><td class="num">'+nf.format(st.uatJud[j]||0)+'</td></tr>'; }).join("")+'</tbody></table></div>';
  /* Leaduri calde naționale + prospecți SICAP — două coloane */
  h+='<div class="grid2 section"><div class="card">'+cardHead('Beneficiari recurenți',nf.format(st.warm.length),'<span class="evsrc">≥2 proiecte contractate · top 25</span>')+'<div class="cl-scroll"><table class="tbl"><thead><tr><th>Firmă</th><th class="num">Proiecte</th><th class="num">Valoare</th><th>Județe</th><th></th></tr></thead><tbody>'+
    st.warm.slice(0,25).map(w=>'<tr '+rowKey+' title="vezi toate proiectele" onclick="intelToBaze(\''+esc(w.nume).replace(/'/g,"\\'")+'\')"><td><b class="lnk">'+esc(w.nume)+'</b><br><small class="cl-muted">'+esc(w.pg.join(", "))+'</small></td><td class="num"><b>'+w.n+'</b></td><td class="num">'+money(w.val,"lei")+'</td><td class="cl-small">'+esc(w.jud.slice(0,3).join(", "))+(w.jud.length>3?"…":"")+'</td><td><button class="btn small ghost" onclick="event.stopPropagation();intelToCrm(this)" data-nume="'+esc(w.nume)+'" data-jud="'+esc(w.jud[0]||"")+'" data-pg="'+esc(w.pg.join(" / "))+'">→ CRM</button></td></tr>').join("")+'</tbody></table></div></div>';
  h+='<div class="card">'+cardHead('Prospecți SICAP',nf.format(st.supl.length),'<span class="evsrc">furnizori câștigători · top 25</span>')+'<div class="cl-scroll"><table class="tbl"><thead><tr><th>Furnizor</th><th class="num">Contracte</th><th class="num">Valoare</th><th>Domenii</th></tr></thead><tbody>'+
    st.supl.slice(0,25).map(x=>'<tr '+rowKey+' title="vezi în Instituții & entități" onclick="intelToBaze(\''+esc(x.nume).replace(/'/g,"\\'")+'\',\'entitati\')"><td><b class="lnk">'+esc(x.nume)+'</b></td><td class="num"><b>'+x.n+'</b></td><td class="num">'+money(x.val,"lei")+'</td><td class="cl-small">'+esc(x.dom.slice(0,2).join(", "))+'</td></tr>').join("")+'</tbody></table></div></div></div>';
  /* Referință: grafice top 10 + surse */
  const top10=st.judList.slice(0,10); const byAp=st.judList.map(j=>({l:j,v:Math.max(0,ap.m[j]-ap.nat)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v).slice(0,10);
  h+='<details class="acc2 section"><summary><b>Grafice · top 10 județe</b><span class="cl-sum">valoare contractată (istoric) · apeluri regionale/județene deschise (+ '+ap.nat+' naționale valabile peste tot)</span></summary><div class="inner"><div class="grid2"><div><div class="cl-h3">Valoare contractată (istoric)</div>'+chartHBars(top10.map(j=>({l:j,v:st.byJud[j].val})),{fmt:v=>money(v,"lei")})+'</div><div><div class="cl-h3">Apeluri regionale/județene deschise</div>'+(byAp.length?chartHBars(byAp):'<div class="empty">Toate apelurile active sunt naționale.</div>')+'</div></div></div></details>';
  h+='<details class="acc2"><summary><b>Surse și cum se citește</b><span class="cl-sum">data.gov.ro · Kohesio · RegAS · ANAF — „firme contractate” = istoric absorbție 2014–2020</span></summary><div class="inner"><ul class="list">'+
  '<li>▸ <b>data.gov.ro «Proiecte contractate»</b> — refresh istoric absorbție. <a href="https://data.europa.eu/data/datasets?catalog=data-gov-ro&query=proiecte%20contractate" target="_blank">data.europa.eu ↗</a></li>'+
  '<li>▸ <b>Kohesio</b> — operațiuni coeziune pe localitate. <a href="https://kohesio.ec.europa.eu/ro/" target="_blank">kohesio ↗</a></li>'+
  '<li>▸ <b>RegAS</b> — verificare minimis pe firmă. <a href="https://regas.consiliulconcurentei.ro/transparenta/" target="_blank">regas ↗</a> · <b>ANAF API</b> — status TVA/inactivitate.</li></ul>'+
  '<div class="evsrc" style="margin-top:8px">„Firme contractate” = istoric absorbție (proiecte MIPE 2014–2020), semnal de piață educată; apelurile „active” includ cele '+ap.nat+' naționale. Firmele cu istoric de absorbție cunosc procesul → cost de conversie mic — verifică minimis (RegAS) și status TVA (ANAF) înainte de contact. Pentru refresh: cere în Claude «rulează W10 market intelligence» — se descarcă seturile noi și se reinjectează în platformă.</div></div></details>';
  return h+'</div>'; }


/* ============================================================
   Prospect ONRC — bază de firme locală (Registrul Comerțului).
   IMPORTANT: datele (inclusiv date personale) se încarcă și rămân
   DOAR în browserul utilizatorului. Nu se trimit nicăieri, nu se
   salvează în cod / pe GitHub. La închiderea tabului dispar.
   ============================================================ */
window.ONRC = window.ONRC || { c:{} };
const ONRC_FIELDS={den:0,cui:1,cod:2,data:3,forma:4,loc:5,adr:6,stare:7,web:8,caen:9,rep:10,coduri:11,euid:12,postal:13,tel:18,fax:19,caenAnaf:21,fiscal:22};
const ONRC_STLBL={0:["onrc-0","necunoscut"],1:["onrc-1","ACTIV"],2:["onrc-2","RISC"],3:["onrc-3","INACTIV"]};
const ONRC_CAENVER={"0":"rev1","1":"rev1.1","2":"rev2","3":"rev3"};
const ONRC_REG={
  "bacau":"Nord-Est","botosani":"Nord-Est","iasi":"Nord-Est","neamt":"Nord-Est","suceava":"Nord-Est","vaslui":"Nord-Est",
  "braila":"Sud-Est","buzau":"Sud-Est","constanta":"Sud-Est","galati":"Sud-Est","tulcea":"Sud-Est","vrancea":"Sud-Est",
  "arges":"Sud-Muntenia","calarasi":"Sud-Muntenia","dambovita":"Sud-Muntenia","giurgiu":"Sud-Muntenia","ialomita":"Sud-Muntenia","prahova":"Sud-Muntenia","teleorman":"Sud-Muntenia",
  "dolj":"Sud-Vest Oltenia","gorj":"Sud-Vest Oltenia","mehedinti":"Sud-Vest Oltenia","olt":"Sud-Vest Oltenia","valcea":"Sud-Vest Oltenia",
  "arad":"Vest","caras-severin":"Vest","hunedoara":"Vest","timis":"Vest",
  "bihor":"Nord-Vest","bistrita-nasaud":"Nord-Vest","cluj":"Nord-Vest","maramures":"Nord-Vest","satu mare":"Nord-Vest","salaj":"Nord-Vest",
  "alba":"Centru","brasov":"Centru","covasna":"Centru","harghita":"Centru","mures":"Centru","sibiu":"Centru",
  "bucuresti":"București-Ilfov","ilfov":"București-Ilfov"
};
function onrcNorm(s){ return String(s||"").toLowerCase().replace(/ș|ş/g,"s").replace(/ț|ţ/g,"t").replace(/ă|â/g,"a").replace(/î/g,"i"); }
function onrcRegOf(j){ return ONRC_REG[onrcNorm(j)]||""; }
function onrcTotal(){ const O=window.ONRC; return (O&&O.c)?Object.values(O.c).reduce((s,d)=>s+((d.f&&d.f.length)||0),0):0; }

/* Persistență locală (IndexedDB) — datele rămân pe DISPOZITIVUL utilizatorului,
   nu pleacă nicăieri. Se pot șterge oricând din interfață. */
const ONRC_IDB_NAME="eufcc_onrc", ONRC_IDB_STORE="counties";
function onrcIDB(){ return new Promise((res,rej)=>{ try{ const r=indexedDB.open(ONRC_IDB_NAME,1);
  r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains(ONRC_IDB_STORE)) r.result.createObjectStore(ONRC_IDB_STORE); };
  r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error||new Error("IndexedDB indisponibil")); }catch(e){ rej(e); } }); }
async function onrcPersist(county,data){ try{ const db=await onrcIDB(); return await new Promise((res)=>{ const tx=db.transaction(ONRC_IDB_STORE,"readwrite"); tx.objectStore(ONRC_IDB_STORE).put(data,county); tx.oncomplete=()=>res(true); tx.onerror=()=>res(false); tx.onabort=()=>res(false); }); }catch(e){ return false; } }
async function onrcRestore(){ try{ const db=await onrcIDB();
  const keys=await new Promise((res)=>{ const tx=db.transaction(ONRC_IDB_STORE,"readonly"); const rq=tx.objectStore(ONRC_IDB_STORE).getAllKeys(); rq.onsuccess=()=>res(rq.result||[]); rq.onerror=()=>res([]); });
  for(const k of keys){ const v=await new Promise((res)=>{ const tx=db.transaction(ONRC_IDB_STORE,"readonly"); const rq=tx.objectStore(ONRC_IDB_STORE).get(k); rq.onsuccess=()=>res(rq.result); rq.onerror=()=>res(null); }); if(v&&v.f) window.ONRC.c[k]=v; }
  return keys.length; }catch(e){ return 0; } }
async function onrcClearLocal(){ if(!confirm("Ștergi datele ONRC salvate local pe acest dispozitiv?")) return;
  try{ const db=await onrcIDB(); await new Promise((res)=>{ const tx=db.transaction(ONRC_IDB_STORE,"readwrite"); tx.objectStore(ONRC_IDB_STORE).clear(); tx.oncomplete=()=>res(); tx.onerror=()=>res(); }); }catch(e){}
  window.ONRC.c={}; toast("Date locale șterse"); render(); }

async function onrcGunzip(buf){
  if(typeof DecompressionStream==="undefined") throw new Error("Browserul nu suportă decompresie gzip. Folosește Chrome, Edge sau Firefox recent.");
  for(let i=0;i<4;i++){ const u8=new Uint8Array(buf,0,2);
    if(u8[0]===0x1f && u8[1]===0x8b){ const st=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip")); buf=await new Response(st).arrayBuffer(); }
    else break; }
  return new TextDecoder("utf-8").decode(buf);
}
async function onrcLoadFiles(fileList){
  const status=document.getElementById("onrcLoadStatus"); const files=Array.from(fileList||[]);
  if(!files.length) return;
  for(const f of files){
    if(status) status.innerHTML='⏳ Procesez <b>'+esc(f.name)+'</b> ('+(f.size/1e6).toFixed(1)+' MB)…';
    try{
      const ab=await f.arrayBuffer();
      const txt=await onrcGunzip(ab);
      const d=JSON.parse(txt);
      if(!d||!d.f||!d.j){ if(status) status.innerHTML='⚠️ '+esc(f.name)+': structură necunoscută (aștept {j, f, ...}).'; continue; }
      ONRC.c[d.j]=d;
      if(status) status.innerHTML='✅ <b>'+esc(d.j)+'</b>: '+d.f.length.toLocaleString("ro-RO")+' firme încărcate.';
      onrcPersist(d.j,d).then((ok)=>{ if(status) status.innerHTML='✅ <b>'+esc(d.j)+'</b>: '+d.f.length.toLocaleString("ro-RO")+' firme '+(ok?'(salvate local pe dispozitiv).':'(în memorie — spațiul local e plin, se pierd la închiderea tabului).'); });
    }catch(e){ if(status) status.innerHTML='❌ '+esc(f.name)+': '+esc(e.message); }
  }
  render();
}
function onrcCaenList(F){ const out=[]; (F[ONRC_FIELDS.caen]||[]).forEach(p=>{ if(Array.isArray(p)) out.push(String(p[0])); }); return out; }
function onrcSearch(flt){ const CAP=300; const rows=[]; let total=0;
  const counties=flt.county?[flt.county]:Object.keys(ONRC.c);
  const q=onrcNorm(flt.q), caen=(flt.caen||"").trim(), locq=onrcNorm(flt.loc), forma=flt.forma||"";
  for(const cty of counties){ const d=ONRC.c[cty]; if(!d) continue; const loc=d.loc||[];
    for(let i=0;i<d.f.length;i++){ const F=d.f[i]; const st=F[ONRC_FIELDS.stare]||0;
      if(flt.stare==="activ" && st!==1) continue;
      if(flt.stare==="risc" && st!==2) continue;
      if(flt.stare==="inactiv" && st!==3) continue;
      if(flt.stare==="activrisc" && !(st===1||st===2)) continue;
      if(forma && F[ONRC_FIELDS.forma]!==forma) continue;
      if(flt.telOnly && !F[ONRC_FIELDS.tel]) continue;
      if(q){ const hay=onrcNorm(F[ONRC_FIELDS.den])+" "+String(F[ONRC_FIELDS.cui]||""); if(!hay.includes(q)) continue; }
      if(caen){ if(/^\d+$/.test(caen)){ if(!onrcCaenList(F).some(c=>c.indexOf(caen)===0)) continue; } else { const cq=onrcNorm(caen); if(!onrcCaenList(F).some(c=>onrcNorm((d.caen_den&&d.caen_den[c])||"").includes(cq))) continue; } }
      if(locq){ const ln=onrcNorm(loc[F[ONRC_FIELDS.loc]]||""); if(!ln.includes(locq)) continue; }
      total++; if(rows.length<CAP) rows.push({cty,i}); }
  }
  return {rows,total,capped:total>CAP,cap:CAP};
}
function onrcStats(){ const per={}; let g={n:0,a:0,r:0,in:0};
  for(const [cty,d] of Object.entries(ONRC.c)){ const s={n:d.f.length,a:0,r:0,in:0};
    for(const F of d.f){ const st=F[ONRC_FIELDS.stare]||0; if(st===1)s.a++; else if(st===2)s.r++; else if(st===3)s.in++; }
    per[cty]=s; g.n+=s.n; g.a+=s.a; g.r+=s.r; g.in+=s.in; }
  return {per,g};
}
function vProspect(){
  const loaded=Object.keys(ONRC.c); const has=loaded.length>0;
  const F=S.onrc=Object.assign({q:"",county:"",stare:"activ",caen:"",loc:"",forma:"",telOnly:false},S.onrc||{});
  let h='<div class="cl-page"><div class="viewtitle"><h1>Prospect ONRC</h1><span class="sub">Baza locală de firme din Registrul Comerțului — se prelucrează doar în acest browser.</span>'
    +(has?'<div class="viewactions"><label class="btn small primary" for="onrcFiles">⬆ Încarcă județ</label>'+moreMenu([["🗑 Șterge datele locale ONRC","onrcClearLocal()"]])+'</div>':'')+'</div>';
  h+='<div class="callout good" title="Fișierele ONRC se încarcă și se prelucrează doar în acest browser — nu se trimit spre niciun server, nu ajung în cod sau pe GitHub. Se salvează local, în IndexedDB, și le poți șterge oricând din meniul ⋯.">🔒 <b>Datele rămân la tine</b> — fișierele ONRC (inclusiv datele personale ale reprezentanților) se prelucrează doar în acest browser și se salvează local, pe dispozitiv; nu ajung pe niciun server.</div>';
  const dz='ondragover="event.preventDefault();this.classList.add(\'over\')" ondragleave="this.classList.remove(\'over\')" ondrop="event.preventDefault();this.classList.remove(\'over\');onrcLoadFiles(event.dataTransfer.files)"';
  const inp='<input type="file" id="onrcFiles" multiple accept=".gz,.json,application/gzip,application/json" hidden>';
  if(!has){ h+='<div class="card section dropzone" id="onrcDrop" '+dz+'><div class="cl-drop"><label class="btn primary" for="onrcFiles">⬆ Alege fișiere județene (.json.gz)</label>'+inp+'<span class="evsrc">sau trage fișierele aici · unul sau mai multe județe · pe telefon câte unul pe rând</span></div><div id="onrcLoadStatus" class="onrcmeta"></div></div>';
    h+=emptyState('🏢','Niciun județ încărcat încă','1 · Încarcă fișierul județean → 2 · Filtrează după CAEN, localitate, stare → 3 · Adaugă firmele ca prospecți în CRM sau exportă lista de apeluri telefonice.'); return h+'</div>'; }
  /* zona de încărcare compactă când există date (rămâne țintă pentru drag & drop) */
  const stx=onrcStats(); const per=stx.per;
  h+='<div class="cl-onrcload dropzone" id="onrcDrop" '+dz+'>'+inp+'<span class="evsrc">Județe salvate local:</span>'+loaded.map(c=>'<span class="chip hl" title="'+per[c].a.toLocaleString("ro-RO")+' active · '+per[c].r+' risc · '+per[c].in+' inactive">'+esc(c)+' · '+per[c].n.toLocaleString("ro-RO")+'</span>').join("")+'<span class="evsrc">· trage aici alt fișier .json.gz</span><span id="onrcLoadStatus" class="onrcmeta"></span></div>';
  const setSt=st=>()=>{ (S.onrc=S.onrc||{}).stare=st; };
  h+='<div class="tiles">'
    +tile(stx.g.n.toLocaleString("ro-RO"),"Firme încărcate",loaded.length+' județ'+(loaded.length>1?'e':''),"","prospect",setSt("toate"))
    +tile(stx.g.a.toLocaleString("ro-RO"),"Active","universul de prospectare","acc","prospect",setSt("activ"))
    +tile(stx.g.r.toLocaleString("ro-RO"),"Risc","întrerupere / suspendare / sediu expirat","warnv","prospect",setSt("risc"))
    +tile(stx.g.in.toLocaleString("ro-RO"),"Inactive","radiate → în dificultate","crit","prospect",setSt("inactiv"))
    +'</div>';
  const moreOpen=!!(F.loc||F.forma||F.telOnly);
  h+='<div class="filters cl-pfilters">'
    +'<input type="search" id="onrcQ" placeholder="Denumire sau CUI…" value="'+esc(F.q)+'">'
    +'<select id="onrcCounty"><option value="">Toate județele</option>'+loaded.map(c=>'<option value="'+esc(c)+'"'+(F.county===c?" selected":"")+'>'+esc(c)+'</option>').join("")+'</select>'
    +'<select id="onrcStare">'+[["activ","Doar active"],["activrisc","Active + risc"],["risc","Doar risc"],["inactiv","Doar inactive"],["toate","Toate stările"]].map(([k,l])=>'<option value="'+k+'"'+(F.stare===k?" selected":"")+'>'+l+'</option>').join("")+'</select>'
    +'<input type="text" id="onrcCaen" placeholder="CAEN (ex. 6201 sau «mobilă»)" value="'+esc(F.caen)+'">'
    +'<button class="btn small" id="onrcGo">Caută</button>'
    +'<details class="acc2 cl-more"'+(moreOpen?' open':'')+'><summary>Mai multe filtre'+(moreOpen?' · active':'')+'</summary><div class="inner">'
    +'<input type="text" id="onrcLoc" placeholder="Localitate…" value="'+esc(F.loc)+'">'
    +'<select id="onrcForma"><option value="">Orice formă</option>'+["SRL","PFA","PF","II","SA","IF","SNC","SCS"].map(f=>'<option value="'+f+'"'+(F.forma===f?" selected":"")+'>'+f+'</option>').join("")+'</select>'
    +'<label class="cl-chk"><input type="checkbox" id="onrcTel"'+(F.telOnly?" checked":"")+'> doar cu telefon</label>'
    +'</div></details></div>';
  h+='<div id="onrcResults"></div>';
  return h+'</div>';
}
window.after_prospect=function(){
  const fi=document.getElementById("onrcFiles"); if(fi) fi.onchange=e=>onrcLoadFiles(e.target.files);
  const go=document.getElementById("onrcGo"); if(go) go.onclick=onrcRenderResults;
  ["onrcQ","onrcCaen","onrcLoc"].forEach(id=>{ const el=document.getElementById(id); if(el){ el.addEventListener("keydown",e=>{ if(e.key==="Enter") onrcRenderResults(); }); el.addEventListener("input",()=>{ clearTimeout(window._onrcT); window._onrcT=setTimeout(onrcRenderResults,300); }); } });
  ["onrcCounty","onrcStare","onrcForma","onrcTel"].forEach(id=>{ const el=document.getElementById(id); if(el) el.onchange=onrcRenderResults; });
  if(Object.keys(ONRC.c).length) onrcRenderResults();
};
function onrcRenderResults(){
  const box=document.getElementById("onrcResults"); if(!box) return;
  const val=id=>{ const el=document.getElementById(id); return el?el.value:""; };
  const telEl=document.getElementById("onrcTel");
  const flt={ q:val("onrcQ"), county:val("onrcCounty"), stare:val("onrcStare")||"activ", caen:val("onrcCaen"), loc:val("onrcLoc"), forma:val("onrcForma"), telOnly:telEl?telEl.checked:false };
  S.onrc=Object.assign(S.onrc||{},flt); window._onrcLast=flt;
  const res=onrcSearch(flt);
  if(!res.total){ box.innerHTML=emptyState('🔍','Niciun rezultat pentru filtrele curente','Lărgește căutarea: altă stare, alt CAEN sau fără filtrul de localitate.'); return; }
  const inCrm=new Set(CL.map(c=>String(c.cui||"").replace(/\D/g,"")).filter(Boolean));
  /* 6 coloane; administratorii (date personale) rămân doar în fișa din drawer */
  let h='<div class="card cl-tblcard">'+cardHead('Rezultate',res.total.toLocaleString("ro-RO")+(res.capped?' · primele '+res.cap:''),'<span class="evsrc hide-m">click pe un rând → fișă completă</span><button class="btn small" onclick="onrcExportCSV()" title="lista filtrată (fără date personale ale reprezentanților)">⬇ CSV</button>');
  h+='<table class="tbl"><thead><tr><th>Denumire</th><th class="num">CUI</th><th>Localitate</th><th>Stare</th><th>CAEN principal</th><th>Telefon</th></tr></thead><tbody>';
  h+=res.rows.map(r=>{ const d=ONRC.c[r.cty]; const F=d.f[r.i]; const st=ONRC_STLBL[F[ONRC_FIELDS.stare]||0];
    const cp=(F[ONRC_FIELDS.caen]||[])[0]; const cpc=cp?String(cp[0]):""; const cpd=cpc?(d.caen_den&&d.caen_den[cpc]||""):"";
    const web=F[ONRC_FIELDS.web]; const weburl=web?(/^https?:/.test(web)?web:"http://"+web):"";
    const weblink=web?' <a href="'+esc(weburl)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="'+esc(web)+'">🌐</a>':"";
    const tel=F[ONRC_FIELDS.tel]; const telcell=tel?'<a href="tel:'+esc(tel)+'" onclick="event.stopPropagation()">'+esc(tel)+'</a>':'<span class="cl-muted">—</span>';
    const crm=inCrm.has(String(F[ONRC_FIELDS.cui]||"").replace(/\D/g,""))?' <span class="chip hl" title="există în CRM">în CRM</span>':"";
    return '<tr tabindex="0" onkeydown="if(event.key===\'Enter\')this.click()" onclick="openFirm(\''+esc(r.cty)+'\','+r.i+')"><td><b>'+esc(F[ONRC_FIELDS.den])+'</b>'+weblink+crm+'<br><small class="cl-muted">'+esc(F[ONRC_FIELDS.forma]||"")+(loaded1(r.cty))+'</small></td><td class="num">'+esc(F[ONRC_FIELDS.cui])+'</td><td>'+esc((d.loc||[])[F[ONRC_FIELDS.loc]]||"—")+'</td><td><span class="onrcbadge '+st[0]+'">'+st[1]+'</span></td><td class="cl-small">'+esc(cpc)+' '+esc(cpd.slice(0,34))+'</td><td class="cl-small">'+telcell+'</td></tr>';
  }).join("");
  h+='</tbody></table></div>';
  box.innerHTML=h;
  function loaded1(cty){ return Object.keys(ONRC.c).length>1?' · '+esc(cty):""; }
}
function openFirm(cty,i){ const d=ONRC.c[cty]; if(!d) return; const F=d.f[i]; if(!F) return;
  const st=F[ONRC_FIELDS.stare]||0; const stl=ONRC_STLBL[st];
  let h=drawerHead(esc(F[ONRC_FIELDS.den]), esc((F[ONRC_FIELDS.forma]||"")+" · CUI "+F[ONRC_FIELDS.cui]+" · "+cty))+'<div class="db">';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px"><span class="onrcbadge '+stl[0]+'">'+stl[1]+'</span>'
    +(F[ONRC_FIELDS.web]?'<a href="'+esc(/^https?:/.test(F[ONRC_FIELDS.web])?F[ONRC_FIELDS.web]:"http://"+F[ONRC_FIELDS.web])+'" target="_blank" rel="noopener">🌐 site</a>':"")+'</div>';
  const inC=CL.some(c=>String(c.cui||"").replace(/\D/g,"")===String(F[ONRC_FIELDS.cui]||"").replace(/\D/g,""));
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">'+(st!==3?(inC?'<span class="cd cd-good">✓ în CRM</span> <button class="btn small" onclick="closeDrawer();openClient(\'onrc_\'+'+JSON.stringify(String(F[ONRC_FIELDS.cui]||""))+')">👥 deschide clientul</button>':'<button class="btn small primary" onclick="onrcAddProspect(\''+esc(cty)+'\','+i+')">➕ Adaugă ca prospect (CRM)</button>'):'')+(F[ONRC_FIELDS.tel]?'<button class="btn small" onclick="copyTxt(\''+esc(F[ONRC_FIELDS.tel])+'\',\'Telefon copiat\')">📋 copiază telefonul</button>':'')+'</div>';
  if(st===3) h+='<div class="callout crit"><b>Firmă inactivă/radiată</b> — probabil «întreprindere în dificultate» (art. 2 pct. 18, Reg. 651/2014): <b>neeligibilă</b> la finanțare. Verifică starea reală înainte de orice abordare.</div>';
  else if(st===2) h+='<div class="callout warn">Stare de <b>risc</b> (întrerupere temporară / suspendare / sediu expirat) — de clarificat înainte de depunere.</div>';
  const row=(k,v)=>v?'<dt>'+k+'</dt><dd>'+v+'</dd>':"";
  const webUrl=F[ONRC_FIELDS.web]?(/^https?:/.test(F[ONRC_FIELDS.web])?F[ONRC_FIELDS.web]:"http://"+F[ONRC_FIELDS.web]):"";
  h+='<div class="section"><h2>📞 Contact</h2><dl class="kv">';
  h+=row("Adresă",esc(F[ONRC_FIELDS.adr]));
  h+=row("Localitate",esc((d.loc||[])[F[ONRC_FIELDS.loc]]||""));
  h+=row("Cod poștal",esc(F[ONRC_FIELDS.postal]));
  h+=row("Țară",esc(F[14]||""));
  h+='<dt>Website</dt><dd>'+(F[ONRC_FIELDS.web]?'<a href="'+esc(webUrl)+'" target="_blank" rel="noopener">'+esc(F[ONRC_FIELDS.web])+'</a>':'<span style="color:var(--muted)">—</span>')+'</dd>';
  const tel=F[ONRC_FIELDS.tel], fax=F[ONRC_FIELDS.fax];
  h+='<dt>Telefon</dt><dd>'+(tel?'<a href="tel:'+esc(tel)+'">'+esc(tel)+'</a> <small style="color:var(--muted)">(ANAF)</small>':'<span style="color:var(--muted)">— (necunoscut la ANAF)</span>')+'</dd>';
  if(fax) h+='<dt>Fax</dt><dd>'+esc(fax)+'</dd>';
  h+='<dt>E‑mail</dt><dd><span style="color:var(--muted)">nu e publicat de ONRC/ANAF</span></dd>';
  h+='</dl></div>';
  h+='<div class="section"><h2>Identificare</h2><dl class="kv">';
  h+=row("Cod înmatriculare",esc(F[ONRC_FIELDS.cod]));
  h+=row("Data înmatriculării",esc(F[ONRC_FIELDS.data]));
  h+=row("EUID",esc(F[ONRC_FIELDS.euid]));
  h+=row("Țara firmei-mamă",esc(F[15]||""));
  const caenA=F[ONRC_FIELDS.caenAnaf];
  h+=row("CAEN principal (ANAF)",caenA?esc(String(caenA))+' '+esc((d.caen_den&&d.caen_den[String(caenA)])||""):"");
  h+=row("Stare fiscală (ANAF)",esc(F[ONRC_FIELDS.fiscal]||""));
  h+='</dl></div>';
  const caens=(F[ONRC_FIELDS.caen]||[]);
  if(caens.length){ h+='<div class="section"><h2>CAEN autorizate ('+caens.length+')</h2><ul class="list">'
    +caens.slice(0,40).map(p=>{ const c=String(p[0]); const den=d.caen_den&&d.caen_den[c]||""; const ver=ONRC_CAENVER[String(p[1])]||p[1];
      return '<li><b>'+esc(c)+'</b> '+esc(den)+' <span class="chip">CAEN '+esc(ver)+'</span></li>'; }).join("")+'</ul></div>'; }
  const repFmt=r=>{ const nm=esc(r[0]||""); const cal=r[1]?' — '+esc(r[1]):"";
    const bd=r[2]?esc(String(r[2]).split(" ")[0]):""; const bloc=[r[3],r[4],r[5]].filter(Boolean).join(", ");
    const dom=[r[6],r[7],r[8]].filter(Boolean).join(", ");
    const sub=[]; if(bd||bloc) sub.push("n. "+bd+(bloc?" · "+esc(bloc):"")); if(dom) sub.push("domiciliu: "+esc(dom));
    return '<li><b>'+nm+'</b>'+cal+(sub.length?'<br><small style="color:var(--muted)">'+sub.join(" · ")+'</small>':"")+'</li>'; };
  const reps=(F[ONRC_FIELDS.rep]||[]);
  if(reps.length){ const pii=!!S.onrcPII; h+='<div class="section"><div class="evsech"><h2>Administratori / reprezentanți legali ('+reps.length+')</h2><button class="btn small ghost" onclick="S.onrcPII=!S.onrcPII;openFirm(\''+esc(cty)+'\','+i+')">'+(pii?'🙈 ascunde detaliile personale':'👁 arată detaliile personale (uz intern)')+'</button></div><div class="callout">Date personale ONRC — utile pentru testul de «întreprindere unică» la minimis (firme legate prin control comun). A se folosi doar intern; nu părăsesc acest dispozitiv.</div><ul class="list">'
    +reps.map(r=>pii?repFmt(r):'<li><b>'+esc(r[0]||"")+'</b>'+(r[1]?' — '+esc(r[1]):"")+'</li>').join("")+'</ul></div>'; }
  const ifr=(F[16]||[]);
  if(ifr.length){ h+='<div class="section"><h2>Reprezentanți întreprindere familială ('+ifr.length+')</h2><ul class="list">'
    +ifr.map(r=>{ const bd=r[1]?esc(String(r[1]).split(" ")[0]):""; const bloc=[r[2],r[3],r[4]].filter(Boolean).join(", ");
      return '<li><b>'+esc(r[0]||"")+'</b>'+(r[5]?' — '+esc(r[5]):"")+((bd||bloc)?'<br><small style="color:var(--muted)">n. '+bd+(bloc?" · "+esc(bloc):"")+'</small>':"")+'</li>'; }).join("")+'</ul></div>'; }
  const suc=(F[17]||[]);
  if(suc.length){ h+='<div class="section"><h2>Sucursale în alte state UE ('+suc.length+')</h2><ul class="list">'
    +suc.map(s=>'<li>'+esc([s[1],s[0],s[4],s[3]].filter(Boolean).join(" · "))+'</li>').join("")+'</ul></div>'; }
  const raw=(F[11]||[]); const stnames=raw.map(c=>(d.stari&&d.stari[String(c)])||String(c)).filter(Boolean);
  if(stnames.length){ h+='<div class="section"><h2>Stări ONRC (coduri brute)</h2><div>'+stnames.map(s=>'<span class="chip">'+esc(s)+'</span>').join("")+'</div></div>'; }
  const reg=onrcRegOf(cty);
  h+='<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">';
  if(reg) h+='<button class="btn" onclick="onrcToRadar(\''+esc(reg)+'\')">📡 Apeluri active în '+esc(reg)+'</button>';
  if(st!==3) h+='<button class="btn primary" onclick="onrcAddProspect(\''+esc(cty)+'\','+i+')">➕ Adaugă ca prospect (CRM)</button>';
  h+='</div>';
  h+='<div class="callout" style="margin-top:12px">Datele ONRC sunt un instantaneu (data fișierului: '+esc(d.snapshot||d.data||d.generat||"necunoscută — vezi numele fișierului")+'). Eligibilitatea reală depinde de dimensiune (cifră afaceri/angajați — neincluse aici), situația financiară și ghidul apelului. AI pregătește; omul decide.</div></div>';
  openDrawer(h);
}
function onrcExportCSV(){ const flt=window._onrcLast||S.onrc; if(!flt){ toast("Rulează o căutare întâi"); return; } const res=onrcSearch(Object.assign({},flt)); if(!res.total){ toast("Nimic de exportat"); return; }
  const head=["Denumire","CUI","Forma","Judet","Localitate","Stare","CAEN_principal","CAEN_denumire","Telefon","Website"]; const rows=res.rows.map(r=>{ const d=ONRC.c[r.cty]; const F=d.f[r.i]; const cp=(F[ONRC_FIELDS.caen]||[])[0]; const cpc=cp?String(cp[0]):""; return [F[ONRC_FIELDS.den],F[ONRC_FIELDS.cui],F[ONRC_FIELDS.forma]||"",judLabel(r.cty),(d.loc||[])[F[ONRC_FIELDS.loc]]||"",ONRC_STLBL[F[ONRC_FIELDS.stare]||0][1],cpc,cpc?(d.caen_den&&d.caen_den[cpc]||""):"",F[ONRC_FIELDS.tel]||"",F[ONRC_FIELDS.web]||""]; });
  const csv=[head].concat(rows).map(r=>r.map(c=>{const x=(c==null?'':String(c));return /[";\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x;}).join(';')).join('\n'); dl('Prospecti_ONRC'+(flt.county?'_'+flt.county:'')+'.csv','\ufeff'+csv,'text/csv;charset=utf-8'); toast('Export generat — '+rows.length+' firme (fără date personale)'+(res.capped?' · primele '+res.cap:'')); }
function onrcToRadar(reg){ closeDrawer(); S.radar.regiune=reg; S.radar.stari=new Set(["activ"]); S.view="radar"; render(); }
function onrcAddProspect(cty,i){ const d=ONRC.c[cty]; if(!d) return; const F=d.f[i]; if(!F) return; const id="onrc_"+F[ONRC_FIELDS.cui];
  if(CL.some(c=>c.id===id)){ toast("Deja în CRM"); return; }
  const cp=(F[ONRC_FIELDS.caen]||[])[0];
  crmAddClient({ id, denumire:F[ONRC_FIELDS.den], tip:"privat", dimensiune:"", forma_juridica:F[ONRC_FIELDS.forma]||"",
    judet:judLabel(cty), regiune:onrcRegOf(cty), localitate:(d.loc||[])[F[ONRC_FIELDS.loc]]||"", cui:String(F[ONRC_FIELDS.cui]||""),
    telefon:F[ONRC_FIELDS.tel]||"", caen_principal:cp?String(cp[0]):"", interese:[], date_financiare:{}, sursa:"ONRC", nota:"Prospect importat din ONRC — de completat dimensiune și date financiare." });
  toast("Adăugat ca prospect: "+F[ONRC_FIELDS.den]);
}

/* La pornire: restaurează datele ONRC salvate local pe dispozitiv (dacă există). */
(async function onrcBoot(){
  try{
    if(!window.ONRC) window.ONRC={c:{}};
    const n=await onrcRestore();
    if(n && onrcTotal()>0){
      if(typeof renderNav==="function") renderNav();
      if(typeof S==="object" && S.view==="prospect" && typeof render==="function") render();
    }
  }catch(e){}
})();

/* ============================================================
   CRM REAL — clienții & proiectele tale (Faza 1).
   Datele reale se salvează LOCAL (localStorage), pe dispozitiv —
   nu în cod, nu pe GitHub. Se pot ascunde clienții demo.
   ============================================================ */
const CRM_LS="eufcc_crm";
const CRM_DEMO_C = (typeof CL!=="undefined"&&Array.isArray(CL))?CL.slice():[];   // snapshot demo la parse
const CRM_DEMO_P = (typeof PR!=="undefined"&&Array.isArray(PR))?PR.slice():[];
window.CRM = window.CRM || { clients:[], projects:[], hideDemo:false };
function crmSave(){ try{ localStorage.setItem(CRM_LS, JSON.stringify({clients:window.CRM.clients,projects:window.CRM.projects,hideDemo:window.CRM.hideDemo})); }catch(e){ toast("Nu am putut salva local (spațiu plin?)"); } }
function crmLoadStore(){ try{ const s=localStorage.getItem(CRM_LS); if(s){ const o=JSON.parse(s); window.CRM.clients=o.clients||[]; window.CRM.projects=o.projects||[]; window.CRM.hideDemo=!!o.hideDemo; } }catch(e){} }
function crmApply(){ /* reconstruiește CL/PR din: demo (dacă nu-s ascunse) + clienții tăi */
  if(typeof CL==="undefined") return;
  CL.length=0; if(!window.CRM.hideDemo) CRM_DEMO_C.forEach(c=>CL.push(c)); window.CRM.clients.forEach(c=>{ if(!CL.find(x=>x.id===c.id)) CL.push(c); });
  PR.length=0; if(!window.CRM.hideDemo) CRM_DEMO_P.forEach(p=>PR.push(p)); window.CRM.projects.forEach(p=>{ if(!PR.find(x=>x.id===p.id)) PR.push(p); });
  MATCH=null; if(typeof IX!=="undefined") IX=null;
}
function crmCounts(){ const reali=CL.filter(c=>!c.demo).length; const demo=CL.filter(c=>c.demo).length; return {reali,demo}; }

/* ---- construire client din câmpuri simple ---- */
function crmMakeClient(f){
  const cui=String(f.cui||"").trim();
  const id=f.id || ("cl_"+(cui||("u"+(window.CRM.clients.length+1)+"_"+Date.now())));
  const num=v=>{ if(v==null||v==="")return null; const n=parseFloat(String(v).replace(/[^0-9.,\-]/g,"").replace(/\.(?=\d{3}(\D|$))/g,"").replace(",",".")); return isNaN(n)?null:n; };
  const df={};
  const cap=num(f.capitaluri_proprii_lei); if(cap!=null) df.capitaluri_proprii_lei=cap;
  const ca=num(f.cifra_afaceri_lei); if(ca!=null) df.cifra_afaceri_3ani_lei={ultim:ca};
  const na=num(f.nr_angajati); if(na!=null) df.nr_angajati=na;
  const minU=num(f.minimis_utilizat_eur);
  const truthy=v=>/^(da|yes|true|1|x)$/i.test(String(v||"").trim());
  const interese=String(f.interese||"").split(/[;|]/).map(x=>x.trim()).filter(Boolean);
  const c={ id, denumire:String(f.denumire||"(fără nume)").trim(), cui,
    tip:(f.tip||"privat").trim()||"privat", dimensiune:(f.dimensiune||"").trim(),
    judet:(f.judet||"").trim(), regiune:(f.regiune||"").trim(),
    forma_juridica:(f.forma_juridica||"").trim(), caen_principal:String(f.caen_principal||"").trim(),
    interese, email:(f.email||"").trim(), telefon:(f.telefon||"").trim(),
    datorii_fiscale:truthy(f.datorii_fiscale), date_financiare:df, sursa:f.sursa||"user" };
  if(minU!=null){ c.plafon_minimis_eur=Math.max(0,300000-minU);
    if(minU>0) c.ajutoare_minimis=[{an:"cumulat",schema:"minimis utilizat (introdus manual)",suma_eur:minU}]; }
  return c;
}
function crmAddClient(c){ if(!c.id) c.id="cl_u"+(window.CRM.clients.length+1)+"_"+Date.now();
  const ix=window.CRM.clients.findIndex(x=>x.id===c.id); if(ix>=0) window.CRM.clients[ix]=c; else window.CRM.clients.push(c);
  crmSave(); crmApply(); }
function crmDeleteClient(id){ if(!confirm("Ștergi acest client din CRM-ul tău local?")) return;
  window.CRM.clients=window.CRM.clients.filter(x=>x.id!==id); crmSave(); crmApply();
  if(typeof closeDrawer==="function") closeDrawer(); render(); }
function crmToggleDemo(){ window.CRM.hideDemo=!window.CRM.hideDemo; crmSave(); crmApply(); render(); }

/* ---- CSV ---- */
function crmParseCSV(text){
  const first=(text.split(/\r?\n/)[0]||""); const delim=(first.split(";").length>first.split(",").length)?";":",";
  const rows=[]; let row=[], cur="", q=false;
  for(let i=0;i<text.length;i++){ const ch=text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=ch; }
    else { if(ch==='"') q=true; else if(ch===delim){ row.push(cur); cur=""; } else if(ch==='\n'){ row.push(cur); rows.push(row); row=[]; cur=""; } else if(ch==='\r'){} else cur+=ch; } }
  if(cur!==""||row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r=>r.some(c=>String(c).trim()!==""));
}
const CRM_COLS=["denumire","cui","tip","dimensiune","judet","regiune","forma_juridica","caen_principal","capitaluri_proprii_lei","cifra_afaceri_lei","nr_angajati","datorii_fiscale","minimis_utilizat_eur","interese","email","telefon"];
function crmImportText(text){
  text=(text||"").trim(); if(!text){ toast("Nimic de importat"); return; }
  let n=0;
  if(text[0]==="{"||text[0]==="["){ // JSON
    try{ const obj=JSON.parse(text);
      const cls = Array.isArray(obj)?obj : (obj.clienti&&obj.clienti.clienti)||obj.clienti||obj.clients||[];
      const prs = (obj.proiecte&&obj.proiecte.proiecte)||obj.proiecte||obj.projects||[];
      (cls||[]).forEach(c=>{ const cc=c.date_financiare?Object.assign({sursa:"user"},c):crmMakeClient(c); if(!cc.id) cc.id="cl_u"+(window.CRM.clients.length+1)+"_"+Date.now(); const ix=window.CRM.clients.findIndex(x=>x.id===cc.id); if(ix>=0)window.CRM.clients[ix]=cc; else window.CRM.clients.push(cc); n++; });
      (prs||[]).forEach(p=>{ if(!p.id) p.id="pr_u"+(window.CRM.projects.length+1)+"_"+Date.now(); p.sursa="user"; const ix=window.CRM.projects.findIndex(x=>x.id===p.id); if(ix>=0)window.CRM.projects[ix]=p; else window.CRM.projects.push(p); });
    }catch(e){ toast("JSON invalid: "+e.message); return; }
  } else { // CSV
    const rows=crmParseCSV(text); if(rows.length<2){ toast("CSV fără date (aștept antet + rânduri)"); return; }
    const hdr=rows[0].map(x=>String(x).trim().toLowerCase().replace(/\s+/g,"_"));
    for(let r=1;r<rows.length;r++){ const f={}; hdr.forEach((h,i)=>{ if(CRM_COLS.includes(h)) f[h]=rows[r][i]; }); if(!f.denumire&&!f.cui) continue; const c=crmMakeClient(f); const ix=window.CRM.clients.findIndex(x=>x.id===c.id); if(ix>=0)window.CRM.clients[ix]=c; else window.CRM.clients.push(c); n++; }
  }
  crmSave(); crmApply(); toast(n+" client(i) importați"); if(typeof closeDrawer==="function")closeDrawer(); render();
}
function crmTemplate(){ const sample=CRM_COLS.join(",")+"\n"+
  "SC Exemplu SRL,RO12345678,privat,microintreprindere,Cluj,Nord-Vest,SRL,6201,150000,640000,4,nu,80000,digitalizare;energie,contact@exemplu.ro,0740000000";
  dl("sablon-clienti.csv", sample, "text/csv"); toast("Șablon descărcat"); }
function crmExport(){ dl("clientii-mei.json", JSON.stringify({clienti:window.CRM.clients,proiecte:window.CRM.projects},null,2),"application/json"); toast("Export generat"); }

/* ---- UI: drawer import ---- */
function crmImportOpen(){ let h=drawerHead("Import clienți","CSV sau JSON · rămâne local pe dispozitiv")+'<div class="db">';
  h+='<div class="callout">Încarcă un <b>CSV</b> (din Excel: Salvează ca → CSV) sau un <b>JSON</b>. Datele se salvează doar în acest browser. Descarcă întâi <a href="javascript:void(0)" onclick="crmTemplate()">șablonul CSV</a> ca să vezi coloanele.</div>';
  h+='<label style="font-size:12px;color:var(--ink2)">Fișier (.csv / .json)</label><input type="file" id="crmFile" accept=".csv,.json,.txt" style="margin:6px 0 12px">';
  h+='<label style="font-size:12px;color:var(--ink2)">…sau lipește direct (CSV/JSON)</label><textarea class="jsonio" id="crmPaste" placeholder="denumire,cui,tip,dimensiune,judet,…"></textarea>';
  h+='<div style="margin-top:10px;display:flex;gap:8px"><button class="btn primary" onclick="crmImportText(document.getElementById(\'crmPaste\').value)">⬆ Aplică importul</button><button class="btn" onclick="crmTemplate()">⬇ Șablon CSV</button></div></div>';
  openDrawer(h);
  const fi=document.getElementById("crmFile"); if(fi) fi.onchange=e=>{ const f=e.target.files[0]; if(!f)return; const rd=new FileReader(); rd.onload=()=>crmImportText(String(rd.result||"")); rd.readAsText(f); };
}
/* ---- UI: formular client nou / editare ---- */
function crmNewForm(id){ const ex=id?CL.find(c=>c.id===id):null; const df=(ex&&ex.date_financiare)||{};
  const v=(k,d)=>esc(ex?(ex[k]!=null?ex[k]:""):(d||""));
  const opt=(sel,list)=>list.map(x=>'<option'+(sel===x?" selected":"")+'>'+x+'</option>').join("");
  let h=drawerHead(id?"Editează client":"Client nou","se salvează local pe dispozitiv")+'<div class="db"><div class="evform">';
  h+='<label>Denumire *</label><input id="cf_denumire" value="'+v("denumire")+'">';
  h+='<div class="r2"><div><label>CUI</label><input id="cf_cui" value="'+v("cui")+'"></div><div><label>Tip</label><select id="cf_tip"><option value=""></option>'+opt(ex?ex.tip:"privat",["privat","UAT","ONG","PFA"])+'</select></div></div>';
  h+='<div class="r2"><div><label>Dimensiune</label><select id="cf_dimensiune"><option value=""></option>'+opt(ex?ex.dimensiune:"",["microintreprindere","mica","mijlocie","mare"])+'</select></div><div><label>Formă juridică</label><input id="cf_forma_juridica" value="'+v("forma_juridica")+'"></div></div>';
  h+='<div class="r2"><div><label>Județ</label><input id="cf_judet" value="'+v("judet")+'"></div><div><label>Regiune</label><input id="cf_regiune" value="'+v("regiune")+'"></div></div>';
  h+='<div class="r2"><div><label>CAEN principal</label><input id="cf_caen_principal" value="'+v("caen_principal")+'"></div><div><label>Nr. angajați</label><input id="cf_nr_angajati" type="number" value="'+esc(df.nr_angajati!=null?df.nr_angajati:"")+'"></div></div>';
  h+='<div class="r2"><div><label>Capitaluri proprii (lei)</label><input id="cf_capitaluri_proprii_lei" type="number" value="'+esc(df.capitaluri_proprii_lei!=null?df.capitaluri_proprii_lei:"")+'"></div><div><label>Cifră afaceri (lei)</label><input id="cf_cifra_afaceri_lei" type="number" value="'+esc(df.cifra_afaceri_3ani_lei?Object.values(df.cifra_afaceri_3ani_lei).pop():"")+'"></div></div>';
  h+='<div class="r2"><div><label>Minimis utilizat (€)</label><input id="cf_minimis_utilizat_eur" type="number" value="'+esc(ex&&ex.ajutoare_minimis?ex.ajutoare_minimis.reduce((s,x)=>s+(x.suma_eur||0),0):"")+'"></div><div><label style="margin-top:20px"><input type="checkbox" id="cf_datorii_fiscale" '+(ex&&ex.datorii_fiscale?"checked":"")+'> are datorii fiscale</label></div></div>';
  h+='<label>Interese (separate prin ; )</label><input id="cf_interese" value="'+esc((ex&&ex.interese||[]).join("; "))+'">';
  h+='<div class="r2"><div><label>Email</label><input id="cf_email" value="'+v("email")+'"></div><div><label>Telefon</label><input id="cf_telefon" value="'+v("telefon")+'"></div></div>';
  h+='<div style="margin-top:12px;display:flex;gap:8px"><button class="btn primary" onclick="crmSaveForm('+(id?"'"+id+"'":"null")+')">💾 Salvează</button>'+(id?'<button class="btn" style="color:var(--critical)" onclick="crmDeleteClient(\''+id+'\')">🗑 Șterge</button>':"")+'</div></div></div>';
  openDrawer(h);
}
function crmSaveForm(id){ const g=k=>{ const el=document.getElementById("cf_"+k); return el?(el.type==="checkbox"?el.checked:el.value):""; };
  const f={id:id||undefined}; ["denumire","cui","tip","dimensiune","forma_juridica","judet","regiune","caen_principal","nr_angajati","capitaluri_proprii_lei","cifra_afaceri_lei","minimis_utilizat_eur","interese","email","telefon"].forEach(k=>f[k]=g(k)); f.datorii_fiscale=g("datorii_fiscale");
  if(!String(f.denumire||"").trim()){ toast("Completează denumirea"); return; }
  crmAddClient(crmMakeClient(f)); toast(id?"Client actualizat":"Client adăugat"); closeDrawer(); render();
}

/* boot: încarcă CRM-ul local și aplică */
(function(){ try{ crmLoadStore(); crmApply(); if((window.CRM.clients.length||window.CRM.hideDemo) && typeof render==="function"){ if(typeof renderNav==="function")renderNav(); if(typeof S==="object"&&S.view) render(); } }catch(e){} })();

/* ===== CRM proiecte (Faza 1+) — add/edit/delete + mutare pe faze ===== */
function crmProjNum(v){ if(v==null||v==="")return null; let s=String(v).replace(/[^0-9.,\-]/g,""); if(s.indexOf(",")>=0&&s.indexOf(".")>=0)s=s.replace(/\./g,"").replace(",","."); else if(s.indexOf(",")>=0)s=s.replace(",","."); const n=parseFloat(s); return isNaN(n)?null:n; }
function crmMakeProject(f){
  const id=f.id||("pr_u"+(window.CRM.projects.length+1)+"_"+Date.now());
  const p={ id, titlu:String(f.titlu||"(proiect fără nume)").trim(), client_id:(f.client_id||"").trim(), apel_id:(f.apel_id||"").trim(),
    faza:(f.faza||"P0").trim()||"P0", valoare_totala_lei:crmProjNum(f.valoare_totala_lei), grant_lei:crmProjNum(f.grant_lei),
    cofinantare_lei:crmProjNum(f.cofinantare_lei), comision:{ fix_lei:crmProjNum(f.comision_fix_lei)||0, succes_pct:crmProjNum(f.comision_succes_pct)||0 },
    consultant:(f.consultant||"").trim(), cod_smis:(f.cod_smis||"").trim(), sursa:"user" };
  if(f.next_action_descriere && String(f.next_action_descriere).trim()) p.next_action={ descriere:String(f.next_action_descriere).trim(), termen:(f.next_action_termen||"")||null };
  if(p.cofinantare_lei==null && p.valoare_totala_lei!=null && p.grant_lei!=null) p.cofinantare_lei=p.valoare_totala_lei-p.grant_lei;
  return p;
}
function crmAddProject(p){ if(!p.id) p.id="pr_u"+(window.CRM.projects.length+1)+"_"+Date.now(); const ix=window.CRM.projects.findIndex(x=>x.id===p.id); if(ix>=0)window.CRM.projects[ix]=p; else window.CRM.projects.push(p); crmSave(); crmApply(); }
function crmDeleteProject(id){ if(!confirm("Ștergi acest proiect din pipeline-ul tău local?")) return; window.CRM.projects=window.CRM.projects.filter(x=>x.id!==id); crmSave(); crmApply(); if(typeof closeDrawer==="function")closeDrawer(); render(); }
function crmSetFaza(id,faza){ const p=window.CRM.projects.find(x=>x.id===id); if(!p) return; if(p.faza!==faza){ p.istoric=p.istoric||[]; p.istoric.push({data:evTodayIsoSafe(),eveniment:"Mutat "+(p.faza||"?")+" → "+faza+" ("+(FAZE[faza]||"")+")"}); } const kb=document.querySelector(".kanban"); window._kanScroll=kb?kb.scrollLeft:0; p.faza=faza; crmSave(); crmApply(); render(); }
function crmProjCounts(){ return {reali:PR.filter(p=>!p.demo).length, demo:PR.filter(p=>p.demo).length}; }
function crmProjForm(id,presetClient,presetApel){ const ex=id?PR.find(p=>p.id===id):null; const na=(ex&&ex.next_action)||{}; const com=(ex&&ex.comision)||{};
  const v=k=>esc(ex&&ex[k]!=null?ex[k]:"");
  const selC=ex?ex.client_id:(presetClient||"");
  const clientOpts='<option value="">— alege client —</option>'+CL.map(c=>'<option value="'+esc(c.id)+'"'+(selC===c.id?" selected":"")+'>'+esc(c.denumire)+'</option>').join("");
  const selA=ex?ex.apel_id:(presetApel||""); const apA=selA?apelById(selA):null;
  const apelOpts='<option value="">— fără apel —</option>'+A.filter(a=>a.stare!=="inchis"||a.id_apel===selA).map(a=>'<option value="'+esc(a.id_apel)+'"'+(selA===a.id_apel?" selected":"")+'>'+esc((a.titlu||"apel").slice(0,60))+' · '+esc(a.program||"")+'</option>').join("");
  const fazaOpts=Object.keys(FAZE).map(f=>'<option value="'+f+'"'+((ex?ex.faza:"P0")===f?" selected":"")+'>'+f+' · '+esc(FAZE[f])+'</option>').join("");
  let h=drawerHead(id?"Editează proiect":"Proiect nou","se salvează local pe dispozitiv")+'<div class="db"><div class="evform">';
  h+='<label>Titlu proiect *</label><input id="pf_titlu" value="'+(ex?v("titlu"):esc(apA&&presetClient&&clientById(presetClient)?((apA.titlu||"").slice(0,40)+" — "+clientById(presetClient).denumire):""))+'">';
  h+='<div class="r2"><div><label>Client</label><select id="pf_client_id">'+clientOpts+'</select></div><div><label>Fază</label><select id="pf_faza">'+fazaOpts+'</select></div></div>';
  h+='<label>Apel</label><select id="pf_apel_id">'+apelOpts+'</select>';
  h+='<div class="r2"><div><label>Valoare totală (lei)</label><input id="pf_valoare_totala_lei" type="number" value="'+v("valoare_totala_lei")+'"></div><div><label>Grant (lei)</label><input id="pf_grant_lei" type="number" value="'+v("grant_lei")+'"></div></div>';
  h+='<div class="r2"><div><label>Comision fix (lei)</label><input id="pf_comision_fix_lei" type="number" value="'+esc(com.fix_lei!=null?com.fix_lei:"")+'"></div><div><label>Comision succes (%)</label><input id="pf_comision_succes_pct" type="number" value="'+esc(com.succes_pct!=null?com.succes_pct:"")+'"></div></div>';
  h+='<label>Consultant responsabil</label><input id="pf_consultant" value="'+v("consultant")+'">';
  h+='<div class="r2"><div><label>Următoarea acțiune</label><input id="pf_next_action_descriere" value="'+esc(na.descriere||"")+'"></div><div><label>Termen</label><input id="pf_next_action_termen" type="date" value="'+esc(na.termen||"")+'"></div></div>';
  h+='<div style="margin-top:12px;display:flex;gap:8px"><button class="btn primary" onclick="crmSaveProj('+(id?"'"+id+"'":"null")+')">💾 Salvează</button>'+(id?'<button class="btn" style="color:var(--critical)" onclick="crmDeleteProject(\''+id+'\')">🗑 Șterge</button>':"")+'</div></div></div>';
  openDrawer(h);
}
function crmSaveProj(id){ const g=k=>{ const el=document.getElementById("pf_"+k); return el?el.value:""; };
  const f={id:id||undefined}; ["titlu","client_id","apel_id","faza","valoare_totala_lei","grant_lei","comision_fix_lei","comision_succes_pct","consultant","next_action_descriere","next_action_termen"].forEach(k=>f[k]=g(k));
  if(!String(f.titlu||"").trim()){ toast("Completează titlul proiectului"); return; }
  crmAddProject(crmMakeProject(f)); toast(id?"Proiect actualizat":"Proiect adăugat"); closeDrawer(); render();
}
