/* ============ ZONA PROIECTE — pipeline, rapoarte, conformitate ============ */
"use strict";
/* ---------- Pipeline ---------- */
function vPipeline(){ const cols=Object.keys(FAZE); const _pc=crmProjCounts(); const F=S.pipe||(S.pipe={q:"",consultant:"",client:"",red:false}); const hd=!!window.CRM.hideDemo;
  const menu=[["⬇ Export CSV","pipeCsv()"]]; if(_pc.demo||hd) menu.push([hd?"👁 Arată proiectele demo":"🙈 Ascunde proiectele demo","crmToggleDemo()"]);
  let h='<div class="pj-page"><div class="viewtitle"><h1>Pipeline</h1><span class="sub" title="Trage cardul în altă coloană (sau alege faza din card) ca să schimbi faza.">'+_pc.reali+' proiecte reale'+(_pc.demo?' · '+_pc.demo+' demo':'')+' · fazele P0→P9, de la idee la implementare.</span><div class="viewactions"><button class="btn small primary" onclick="crmProjForm()">+ Proiect nou</button><button class="btn small" onclick="crmImportOpen()">⬆ Import</button>'+moreMenu(menu)+'</div></div>';
  if(!PR.length) return h+emptyState('📋','Niciun proiect în pipeline','Adaugă primul proiect sau alege un apel din Radar și apasă „➕ Proiect în pipeline”.','<button class="btn" onclick="S.view=\'radar\';render()">📡 Radar</button>'+(hd?'<button class="btn ghost" onclick="crmToggleDemo()">👁 arată demo</button>':''))+'</div>';
  const totG=PR.reduce((s,p)=>s+(p.grant_lei||0),0), totC=PR.reduce((s,p)=>s+comisionPrognozat(p),0); const nRed=PR.filter(p=>health(p)==="r").length;
  h+='<div class="tiles k3 pj-kpi">';
  h+=tile(money(totG,"lei"),"Grant total în pipeline","toate fazele","acc","pipeline",()=>{S.pipe.red=false;});
  h+=tile(money(Math.round(totC),"lei"),"Comisioane prognozate","ponderate cu probabilitatea fazei","","pipeline",()=>{S.pipe.red=false;});
  h+=tile(nRed,"Proiecte în roșu","termen depășit / apel aproape închis — click pentru filtru",nRed?"crit":"","pipeline",()=>{S.pipe.red=!S.pipe.red;});
  h+='</div>';
  const cons=[...new Set(PR.map(p=>p.consultant).filter(Boolean))].sort(); const clis=[...new Set(PR.map(p=>p.client_id).filter(Boolean))].map(id=>clientById(id)).filter(Boolean);
  const vis=PR.filter(p=>(!F.q||onrcNorm((p.titlu||"")+" "+((clientById(p.client_id)||{}).denumire||"")).includes(onrcNorm(F.q)))&&(!F.consultant||p.consultant===F.consultant)&&(!F.client||p.client_id===F.client)&&(!F.red||health(p)==="r"));
  h+='<div class="filters pj-filters"><input type="search" placeholder="caută proiect, client…" value="'+esc(F.q)+'" oninput="S.pipe.q=this.value;render(true)"><select onchange="S.pipe.consultant=this.value;render(true)"><option value="">— consultant —</option>'+cons.map(x=>'<option '+(F.consultant===x?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select><select onchange="S.pipe.client=this.value;render(true)"><option value="">— client —</option>'+clis.map(c=>'<option value="'+esc(c.id)+'" '+(F.client===c.id?"selected":"")+'>'+esc(c.denumire)+'</option>').join("")+'</select>'+(F.red?'<button class="fchip on" onclick="S.pipe.red=false;render(true)">🔴 doar în roșu ✕</button>':'')+'<span class="pj-count">'+vis.length+' din '+PR.length+'</span></div>';
  /* HERO — kanban (navigația pe coloane deasupra, utilă mai ales pe telefon) */
  h+='<div class="kanmini">'+cols.map(f=>{ const n=vis.filter(p=>p.faza===f).length; return '<button class="'+(n?'':'dim')+'" onclick="kanGo(\''+f+'\')" title="'+esc(FAZE[f])+'">'+f+(n?' <b>'+n+'</b>':'')+'</button>'; }).join("")+'</div>';
  h+='<div class="kanban" id="kanban">'+cols.map(f=>{ const ps=vis.filter(p=>p.faza===f);
    return '<div class="kcol'+(ps.length?'':' empty')+'" data-faza="'+f+'" ondragover="event.preventDefault();this.classList.add(\'over\')" ondragleave="this.classList.remove(\'over\')" ondrop="this.classList.remove(\'over\');kanDrop(event,\''+f+'\')"><h3><span class="pj-kt" title="'+esc(FAZE[f])+'">'+f+' · '+esc(FAZE[f])+'</span><span>'+(ps.length||"")+'</span></h3>'+ps.map(p=>{const c=clientById(p.client_id); const hw=healthWhy(p); const hc=health(p);
      return '<div class="kcard'+(p.demo?'':' real')+'" tabindex="0" onkeydown="if(event.key===\'Enter\')this.click()" '+(p.demo?'':'draggable="true" ondragstart="kanDrag(event,\''+p.id+'\')"')+' onclick="openProiect(\''+p.id+'\')"><div class="t"><span>'+esc(p.titlu)+(p.demo?' <span class="tag-demo">DEMO</span>':'')+'</span><span class="hdot '+hc+'" title="'+esc(hw||"în grafic")+'"></span></div><div class="m">'+esc(c?c.denumire:"")+'</div><div class="m">grant <b>'+money(p.grant_lei,"lei")+'</b>'+(p.consultant?' · '+esc(p.consultant):'')+'</div>'+(hw&&hc!=="g"?'<div class="m" style="color:'+(hc==="r"?'var(--critical)':'var(--warn-text)')+';margin-top:3px">'+esc(hw)+'</div>':'')+(p.next_action?'<div class="na" title="'+esc(p.next_action.descriere)+'">▸ '+esc(p.next_action.descriere.slice(0,80))+(p.next_action.descriere.length>80?"…":"")+'<br>'+cdBadge(p.next_action.termen,{task:true})+'</div>':"")+(!p.demo?'<div class="na" style="display:flex;gap:5px;align-items:center" onclick="event.stopPropagation()"><select class="kfaza" onchange="crmSetFaza(\''+p.id+'\',this.value)">'+Object.keys(FAZE).map(ff=>'<option value="'+ff+'"'+(p.faza===ff?" selected":"")+'>'+ff+' · '+esc(FAZE[ff].slice(0,16))+'</option>').join("")+'</select><button class="btn small ghost" title="editează" onclick="crmProjForm(\''+p.id+'\')">✎</button></div>':"")+'</div>';}).join("")+'</div>';}).join("")+'</div>';
  const fazeVal=cols.map(f=>({l:f+" · "+FAZE[f],v:vis.filter(p=>p.faza===f).reduce((s,p)=>s+(p.grant_lei||0),0)})).filter(x=>x.v>0);
  const comVal=cols.map(f=>({l:f+" · "+FAZE[f],v:Math.round(vis.filter(p=>p.faza===f).reduce((s,p)=>s+comisionPrognozat(p),0))})).filter(x=>x.v>0);
  h+='<div class="grid2 section"><div class="card">'+cardHead('Valoare grant pe fază',null,'<span class="evsrc">'+vis.length+' proiecte filtrate</span>')+chartHBars(fazeVal,{fmt:v=>money(v,"lei")})+'</div><div class="card">'+cardHead('Comisioane prognozate pe fază',null,'<span class="evsrc">fix + succes% × grant × prob. fază</span>')+chartHBars(comVal.map(x=>Object.assign({},x,{c:"var(--s3)"})),{fmt:v=>money(v,"lei")})+'</div></div>';
  h+='<details class="acc2 section"><summary><b>Cum se citește sănătatea proiectelor</b><span class="pj-sum">🔴 restant sau apel ≤7 zile · 🟡 acțiune ≤5 zile sau apel ≤21 zile · 🟢 în grafic</span></summary><div class="inner"><ul class="list"><li><span class="hdot r"></span> acțiune restantă, apelul se închide în ≤7 zile cu proiectul încă în pregătire (P0–P3), sau clarificări în derulare (P5)</li><li><span class="hdot y"></span> acțiune în ≤5 zile sau apelul se închide în ≤21 zile în faza de pregătire</li><li><span class="hdot g"></span> în grafic</li><li>▸ Trage cardul în altă coloană (sau alege faza din card) ca să schimbi faza; mutarea se notează în istoricul proiectului.</li><li>▸ Comisionul prognozat = fix + succes% × grant × probabilitatea fazei ('+Object.keys(PROB).map(k=>k+' '+Math.round(PROB[k]*100)+'%').join(' · ')+').</li></ul></div></details>';
  return h+'</div>'; }
function kanDrag(ev,id){ ev.dataTransfer.setData("text/plain",id); ev.dataTransfer.effectAllowed="move"; }
function kanDrop(ev,faza){ ev.preventDefault(); const id=ev.dataTransfer.getData("text/plain"); if(!id) return; crmSetFaza(id,faza); }
function kanGo(f){ const col=document.querySelector('.kcol[data-faza="'+f+'"]'); if(col) col.scrollIntoView({behavior:"smooth",inline:"start",block:"nearest"}); }
window.after_pipeline=function(){ const kb=document.getElementById("kanban"); if(kb&&window._kanScroll){ kb.scrollLeft=window._kanScroll; window._kanScroll=0; } };
function pipeCsv(){ const head=["Titlu","Client","Apel","Faza","Faza_denumire","Valoare_totala_lei","Grant_lei","Cofinantare_lei","Consultant","Next_action","Termen","Sanatate","Comision_prognozat_lei","Demo"]; const rows=PR.map(p=>{ const c=clientById(p.client_id); const a=apelById(p.apel_id); return [p.titlu,c?c.denumire:"",a?a.titlu:(p.apel_id||""),p.faza,FAZE[p.faza]||"",p.valoare_totala_lei,p.grant_lei,p.cofinantare_lei,p.consultant||"",(p.next_action||{}).descriere||"",(p.next_action||{}).termen||"",health(p),Math.round(comisionPrognozat(p)),p.demo?"DA":""]; });
  const csv=[head].concat(rows).map(row=>row.map(c=>{const x=(c==null?'':String(c));return /[";\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x;}).join(';')).join('\n'); dl('Pipeline_proiecte.csv','\ufeff'+csv,'text/csv;charset=utf-8'); toast('Export generat'); }


/* ---------- Rapoarte ---------- */
function vRapoarte(){ if(!clientById(S.repClient)) S.repClient=CL[0]?CL[0].id:null; const rc=S.repClient;
  const l4=raportL4(); window._repL4=l4; const l5=rc?raportL5(rc):""; window._repL5=l5; const rcl=rc?clientById(rc):null;
  const mail=(subj,body,to)=>'mailto:'+(to||'')+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);
  const exp='<button class="btn small ghost" title="extinde / restrânge textul raportului" onclick="this.closest(\'.card\').querySelector(\'.copybox\').classList.toggle(\'full\')">⤢ extinde</button>';
  let h='<div class="pj-page"><div class="viewtitle"><h1>Rapoarte</h1><span class="sub">Generate din datele la zi ('+new Date().toLocaleDateString("ro-RO")+') — de validat uman înainte de trimitere.</span></div>';
  /* HERO — două carduri egale, acțiunile sus; o singură acțiune primară per card (copiază), restul ghost.
     L4 / L5 = codurile șabloanelor din Bibliotecă („L4 — Raport săptămânal” intern · „L5 — Raport client”, în limbaj simplu). */
  const L4T="L4 = raportul săptămânal intern (șablonul L4 din Bibliotecă): noutăți radar, pipeline, termene, riscuri, decizii cerute";
  const L5T="L5 = raportul de stadiu pentru client (șablonul L5 din Bibliotecă), în limbaj simplu: unde suntem, ce am făcut, ce urmează, ce avem nevoie de la client";
  h+='<div class="grid2 pj-rep"><div class="card">'+cardHead('Raport săptămânal','<span title="'+esc(L4T)+'">L4</span>','<button class="btn small primary" onclick="copyTxt(window._repL4,\'Raport L4 copiat\')">📋 Copiază raportul</button><button class="btn small ghost" onclick="dl(\'Raport_L4_\'+evTodayIsoSafe()+\'.txt\',window._repL4)">⬇ .txt</button><a class="btn small ghost" href="'+mail("Raport săptămânal intern — "+new Date().toLocaleDateString("ro-RO"),l4)+'">✉ e-mail</a>'+exp)+'<div class="pj-repsub">Intern, pentru echipă — noutăți radar, pipeline, termenele săptămânii, riscuri deschise, decizii cerute.</div><div class="copybox" id="repL4">'+esc(l4)+'</div></div>';
  const hasMail=!!(rcl&&(rcl.email||(rcl.contact||{}).email));
  h+='<div class="card">'+cardHead('Raport per client','<span title="'+esc(L5T)+'">L5</span>',CL.length?'<button class="btn small" onclick="copyTxt(window._repL5,\'Raport client copiat\')">📋 Copiază raportul</button><button class="btn small ghost" onclick="dl(\'Raport_client_\'+evTodayIsoSafe()+\'.txt\',window._repL5)">⬇ .txt</button><a class="btn small ghost" href="'+mail("Stadiu proiecte — "+(rcl?rcl.denumire:""),l5,hasMail?(rcl.email||(rcl.contact||{}).email||""):"")+'" title="'+(hasMail?'către adresa clientului din CRM':'fără adresă de e-mail în CRM — completezi destinatarul tu')+'">✉ e-mail</a>'+exp:'')
    +'<div class="pj-repsub">Pentru client, în limbaj simplu — unde suntem, ce am făcut, ce urmează, ce avem nevoie de la el.</div>'
    +(CL.length?'<select class="pj-sel" onchange="S.repClient=this.value;render(true)">'+CL.map(c=>'<option value="'+c.id+'" '+(c.id===rc?"selected":"")+'>'+esc(c.denumire)+(c.demo?' · DEMO':'')+'</option>').join("")+'</select>'+(rcl&&rcl.demo?'<div class="callout warn">Client <b>demo</b> — textul e marcat [DEMO] și nu trebuie trimis nimănui.</div>':'')+'<div class="copybox">'+esc(l5)+'</div>':emptyState('👥','Niciun client în CRM','Rapoartele per client se generează din proiectele clienților tăi.','<button class="btn" onclick="S.view=\'clienti\';render()">→ Clienți</button>'))+'</div></div>';
  /* KPI dedesubt */
  const ratate=PR.filter(p=>!p.demo&&p.next_action&&p.next_action.termen&&days(p.next_action.termen)<0).length; const reale=PR.filter(p=>!p.demo);
  const kpi=[["Prospețimea radarului",(()=>{const a=radarAge();return a?'<span class="cd '+(a.cls==="good"?"cd-good":a.cls==="warn"?"cd-warn":"cd-crit")+'">scanat acum '+a.zile+' zile</span>':"—";})(),"≤ 2 zile"],
   ["Surse monitorizate funcționale",(()=>{const ok=SURSE.filter(s=>s.stare==="ok"||s.stare==="acoperit").length;return '<span class="cd '+(ok===SURSE.length?"cd-good":"cd-warn")+'">'+ok+" / "+SURSE.length+'</span>';})(),"100% acoperite (direct sau prin oglindă)"],
   ["Corrigende urmărite de radar",A.filter(a=>a.corrigendum).length+" active"+(A.filter(a=>a.corrigendum).length?" (ex: "+esc((A.find(a=>a.corrigendum)||{}).titlu||"")+")":""),"100% detectate"],
   ["Clarificări în derulare (proiecte reale)",reale.filter(p=>p.faza==="P5").length,"răspuns în termen (3–10 zile)"],
   ["Proiecte reale în implementare/rambursare",reale.filter(p=>["P7","P8","P9"].includes(p.faza)).length,">95% fără tăieri"],
   ["Termene interne ratate (acțiuni restante)",ratate?'<span class="cd cd-crit">'+ratate+'</span>':(reale.length?'<span class="cd cd-good">0</span>':'<span class="pj-muted">— (fără proiecte reale)</span>'),"0"],
   ["Corecții financiare suferite",'<span class="pj-muted" title="nu se urmărește automat — se completează manual din deciziile AM">— de completat manual</span>',"0 lei"],
   ["Valoare pipeline real (grant)",reale.length?money(reale.reduce((s,p)=>s+(p.grant_lei||0),0),"lei"):'<span class="pj-muted">— (doar demo)</span>',"↑"]];
  h+='<div class="card section pj-tblcard">'+cardHead('KPI de operare',null,'<span class="evsrc">calculat din datele reale (proiectele demo nu intră)</span>')+'<table class="tbl stack pj-static"><thead><tr><th>Indicator</th><th>Valoare</th><th>Țintă</th></tr></thead><tbody>'+kpi.map(r=>'<tr><td data-l="Indicator">'+r[0]+'</td><td data-l="Valoare">'+r[1]+'</td><td data-l="Țintă" class="pj-muted">'+r[2]+'</td></tr>').join("")+'</tbody></table></div>';
  return h+'</div>'; }
function raportL4(){ const d=new Date().toLocaleDateString("ro-RO"); const cl7=A.filter(a=>{const x=days(a.data_inchidere);return x!=null&&x>=0&&x<=7;});
  const items=calItems(7);
  const cor=A.filter(a=>a.corrigendum);
  let t="RAPORT SĂPTĂMÂNAL INTERN — "+d+"\n\n1) NOUTĂȚI RADAR\n• Registru: "+A.length+" apeluri ("+A.filter(a=>a.stare==="activ").length+" active, "+A.filter(a=>a.stare==="planificat").length+" planificate, "+A.filter(a=>a.stare==="consultare").length+" în consultare)\n• Corrigende active: "+(cor.length?cor.map(a=>a.titlu).join("; "):"niciuna")+"\n• Închideri ≤7 zile: "+(cl7.map(a=>a.titlu+" ("+fmtDs(a.data_inchidere)+")").join("; ")||"—")+"\n\n2) PIPELINE\n";
  const hasReal=PR.some(p=>!p.demo); const PRx=hasReal?PR.filter(p=>!p.demo):PR; if(!hasReal) t+="[pipeline DEMO — nu există proiecte reale]\n";
  Object.keys(FAZE).forEach(f=>{ const ps=PRx.filter(p=>p.faza===f); if(ps.length) t+="• "+f+" "+FAZE[f]+": "+ps.length+(ps.length===1?" proiect":" proiecte")+", grant "+money(ps.reduce((s,p)=>s+(p.grant_lei||0),0),"lei")+"\n"; });
  t+="\n3) TERMENELE SĂPTĂMÂNII\n"+(items.map(i=>"• "+fmtDs(i.data)+" — ["+i.tip+"] "+i.titlu+(i.sub?" — "+i.sub:"")).join("\n")||"—");
  const rr=riskRegister(); t+="\n\n4) RISCURI DESCHISE (top)"+(rr.isDemo?" [demo — adaugă proiecte reale pentru riscuri proprii]":"")+"\n"+(rr.rows.length?rr.rows.slice(0,5).map(r=>"• ["+r.sev+"] "+r.risc+" → expunere: "+r.expunere).join("\n"):"• niciun risc detectat automat");
  // Decizii GO/NO-GO derivate: proiecte reale în P0/P1 cu apel care se închide în ≤30 zile
  const dec=PR.filter(p=>!p.demo&&["P0","P1"].includes(p.faza)).map(p=>{ const ap=apelById(p.apel_id); const az=ap&&ap.data_inchidere?days(ap.data_inchidere):null; return {p,ap,az}; }).filter(x=>x.az==null||x.az<=30).sort((a,b)=>((a.az==null?999:a.az)-(b.az==null?999:b.az)));
  t+="\n\n5) DECIZII CERUTE\n"+(dec.length?dec.map(x=>"• GO/NO-GO "+x.p.titlu+(x.ap?" × "+x.ap.titlu:"")+(x.ap&&x.ap.data_inchidere?" (până "+fmtDs(x.ap.data_inchidere)+")":"")).join("\n"):"• (niciun GO/NO-GO în așteptare pe proiecte reale)");
  t+="\n\nGenerat automat de Command Center — de validat înainte de difuzare.";
  return t; }
function raportL5(cid){ const c=clientById(cid); if(!c) return "";
  const ps=PR.filter(p=>p.client_id===cid);
  let t=(c.demo?"[DEMO — client fictiv, nu se trimite]\n":"")+"RAPORT DE STADIU — "+c.denumire+" — "+new Date().toLocaleDateString("ro-RO")+"\n\n";
  if(!ps.length){ t+="Nu există proiecte active. Oportunități identificate:\n"+topForClient(cid,3).map(m=>"• "+m.apel.titlu+" ("+m.apel.program+") — termen "+(m.apel.data_inchidere?fmtD(m.apel.data_inchidere):"nelansat încă")).join("\n"); }
  const d30=new Date(TODAY); d30.setDate(d30.getDate()-30);
  ps.forEach(p=>{ const rec=(p.istoric||[]).filter(e=>pd(e.data)&&pd(e.data)>=d30).map(e=>"  · "+fmtDs(e.data)+" "+e.eveniment); const ev=(p.evaluari||[])[0];
    t+="▶ "+p.titlu+"\nUnde suntem: faza "+p.faza+" — "+FAZE[p.faza]+".\nCe am făcut în ultimele 30 zile: "+(rec.length?"\n"+rec.join("\n"):"… [de completat]")+"\nGrant: "+money(p.grant_lei,"lei")+" (contribuția dvs.: "+money(p.cofinantare_lei,"lei")+")."+(ev?"\nVerificare pre-depunere ("+String(ev.data).slice(0,10)+"): "+ev.verdict:"")+"\nCe urmează: "+(p.next_action?p.next_action.descriere+" — până la "+fmtD(p.next_action.termen):"—")+".\n\n"; });
  t+="CE AVEM NEVOIE DE LA DVS.:\n"+(ps.some(p=>p.next_action)? ps.filter(p=>p.next_action).map(p=>"• ["+fmtDs(p.next_action.termen)+"] "+p.next_action.descriere).join("\n") : "• nimic momentan")+"\n\nCu stimă,\n[Consultant] — draft generat automat, DE VALIDAT înainte de trimitere.";
  return t; }


/* ---------- Conformitate ---------- */
const RISCURI=[
 {proiect:"PRJ-004",sev:"MAJOR",cat:"achiziții",risc:"Licitația de lucrări pentru parcul industrial — criterii restrictive sau modificări substanțiale de contract",expunere:"corecție 25% ≈ 16,1 mil lei",masura:"expert achiziții + verificare ANAP înainte de publicare; fără mărci fără «sau echivalent»",resp:"Consultant 3"},
 {proiect:"PRJ-002",sev:"MAJOR",cat:"termene",risc:"Fereastră de depunere foarte scurtă (închidere 14.08) — risc dosar incomplet",expunere:"pierderea finanțării (nedepunere)",masura:"decizie GO/NO-GO 4.08; listă documente cu responsabili pe zile",resp:"Consultant 2"},
 {proiect:"PRJ-007",sev:"MINOR",cat:"publicitate",risc:"Autocolante lipsă pe echipamentele achiziționate",expunere:"corecție până la 3% ≈ 35.400 lei",masura:"foto-audit la vizita din 4.09 + comandă autocolante 150×150mm",resp:"Consultant 3"},
 {proiect:"PRJ-005",sev:"MAJOR",cat:"termene",risc:"Clarificare CAE cu termen 3-5 zile în perioada concediilor",expunere:"respingere administrativă",masura:"monitorizare zilnică MySMIS + backup consultant desemnat",resp:"Consultant 2"},
 {proiect:"PRJ-003",sev:"MINOR",cat:"eligibilitate",risc:"Plafon minimis pe întreprinderea unică (2 firme legate) insuficient verificat",expunere:"respingere la CAE / recuperare ajutor",masura:"interogare RegAS + declarații pe propria răspundere pe TOT grupul",resp:"Consultant 1"}];
/* Registru de riscuri — derivat DETERMINIST din proiectele tale reale.
   Cade pe setul demo doar cât timp nu ai niciun proiect real în pipeline. */
function riskRegister(){
  const reali=PR.filter(p=>!p.demo);
  if(!reali.length) return {rows:RISCURI.map(r=>Object.assign({demo:true},r)), isDemo:true};
  const rows=[];
  reali.forEach(p=>{ const resp=p.consultant||"—";
    const ap=apelById(p.apel_id); const az=ap&&ap.data_inchidere?days(ap.data_inchidere):null;
    const pre=["P0","P1","P2","P3"].includes(p.faza);
    if(pre&&az!=null&&az>=0&&az<=14) rows.push({proiect:p.id,sev:"MAJOR",cat:"termene",risc:"Apelul „"+(ap.titlu||p.apel_id)+"” se închide în "+az+" zile, iar proiectul e încă în „"+(FAZE[p.faza]||p.faza)+"”",expunere:"nedepunere / pierderea finanțării",masura:"decizie GO/NO-GO acum + listă documente cu responsabili pe zile",resp});
    else if(pre&&az!=null&&az>14&&az<=30) rows.push({proiect:p.id,sev:"MINOR",cat:"termene",risc:"Apelul „"+(ap.titlu||p.apel_id)+"” se închide în "+az+" zile — grăbește pregătirea dosarului",expunere:"risc dosar incomplet",masura:"plan pe zile + verificare checklist pre-depunere",resp});
    if(p.next_action&&p.next_action.termen){ const t=days(p.next_action.termen);
      if(t!=null&&t<0) rows.push({proiect:p.id,sev:"MAJOR",cat:"termene",risc:"Acțiune restantă: "+(p.next_action.descriere||"—")+" (termen depășit din "+fmtD(p.next_action.termen)+")",expunere:"întârziere / respingere administrativă",masura:"execută imediat sau reprogramează cu clientul",resp});
      else if(t!=null&&t>=0&&t<=5) rows.push({proiect:p.id,sev:"MINOR",cat:"termene",risc:"Termen apropiat: "+(p.next_action.descriere||"—")+" (până "+fmtD(p.next_action.termen)+")",expunere:"întârziere dacă alunecă",masura:"confirmă azi disponibilitatea documentelor",resp}); }
    if(p.faza==="P5") rows.push({proiect:p.id,sev:"MAJOR",cat:"termene",risc:"Clarificări CAE/ETF în derulare — termen tipic de răspuns 3–5 zile",expunere:"respingere administrativă la nerăspuns",masura:"monitorizare zilnică MySMIS + backup consultant desemnat",resp});
    const c=clientById(p.client_id); if(c){ const mu=(c.ajutoare_minimis||[]).reduce((a,x)=>a+(x.suma_eur||0),0);
      if(mu>250000) rows.push({proiect:p.id,sev:"MAJOR",cat:"eligibilitate",risc:"Plafon minimis aproape epuizat pentru "+(c.denumire||c.id)+" ("+nf.format(mu)+" din 300.000 EUR)",expunere:"respingere la CAE / recuperare ajutor",masura:"interogare RegAS + verificare întreprindere unică pe tot grupul",resp});
      const cp=(c.date_financiare||{}).capitaluri_proprii_lei; if(pre&&cp!=null&&cp<0) rows.push({proiect:p.id,sev:"MAJOR",cat:"eligibilitate",risc:"Capitaluri proprii negative la "+(c.denumire||c.id)+" ("+nf.format(cp)+" lei) — „întreprindere în dificultate”",expunere:"criteriu eliminatoriu la CAE",masura:"majorare de capital / conversie creanțe înainte de depunere",resp});
      if(pre&&c.datorii_fiscale) rows.push({proiect:p.id,sev:"MINOR",cat:"eligibilitate",risc:"Datorii fiscale / eșalonare la "+(c.denumire||c.id),expunere:"certificat fiscal neconform la depunere",masura:"achitare sau eșalonare + certificate de atestare fiscală curate",resp}); }
    TS.filter(t=>t.proiect_id===p.id&&t.data&&days(t.data)<0&&["P7","P8","P9"].includes(p.faza)).slice(0,2).forEach(t=>rows.push({proiect:p.id,sev:"MAJOR",cat:"implementare",risc:"Obligație restantă: "+(t.descriere||t.tip)+" ("+fmtD(t.data)+")",expunere:"corecție / suspendare plăți",masura:"execută și notifică AM/OI",resp})); });
  const ord={MAJOR:0,MINOR:1}; rows.sort((a,b)=>((ord[a.sev]||9)-(ord[b.sev]||9)));
  return {rows, isDemo:false};
}
function vConformitate(){ const r=REF; const RF=S.riskFilter||""; const _rr=riskRegister(); const rows=_rr.rows.filter(x=>!RF||x.sev===RF); const nMaj=_rr.rows.filter(x=>x.sev==="MAJOR").length;
  let h='<div class="pj-page"><div class="viewtitle"><h1>Conformitate</h1><span class="sub" title="Registrul de riscuri se calculează automat din termene, apeluri și datele clienților; referința legală (corecții, praguri, fluxuri, durabilitate) e mai jos, pliată.">Riscurile dosarelor active și referința legală, într-un loc.</span></div>';
  if(_rr.isDemo) h+='<div class="callout warn">Riscuri <b>demo</b> — registrul se generează automat din proiectele tale reale imediat ce adaugi proiecte în Pipeline.</div>';
  /* HERO — registrul de riscuri */
  const chips=[["","Toate ("+_rr.rows.length+")"]].concat(nMaj?[["MAJOR","Major ("+nMaj+")"]]:[]).concat((_rr.rows.length-nMaj)?[["MINOR","Minor ("+(_rr.rows.length-nMaj)+")"]]:[]).map(([k,l])=>'<button class="fchip'+(RF===k?" on":"")+'" onclick="S.riskFilter=\''+k+'\';render(true)">'+l+'</button>').join("");
  h+='<div class="card pj-tblcard">'+cardHead('Registru de riscuri',_rr.rows.length,chips);
  if(!rows.length) h+=_rr.rows.length?emptyState('🔍','Niciun risc pentru filtrul curent','','<button class="btn" onclick="S.riskFilter=\'\';render(true)">↺ toate riscurile</button>'):emptyState('🛡','Niciun risc detectat automat','Pe proiectele reale nu există acum termene depășite, apeluri aproape închise, plafoane minimis epuizate sau obligații restante. Continuă monitorizarea.');
  else h+='<table class="tbl stack"><thead><tr><th>Proiect</th><th>Sev.</th><th>Risc</th><th>Expunere potențială</th><th>Măsură</th></tr></thead><tbody>'+rows.map(x=>{ const real=PR.some(p=>p.id===x.proiect); return '<tr'+(real?' tabindex="0" onkeydown="if(event.key===\'Enter\')this.click()" onclick="openProiect(\''+esc(x.proiect)+'\')"':' class="pj-static-row" title="risc demo — fără proiect real"')+'><td data-l="Proiect">'+esc(x.proiect)+(x.demo?' <span class="tag-demo">DEMO</span>':'')+'</td><td data-l="Sev."><span class="cd '+(x.sev==="MAJOR"?"cd-crit":"cd-warn")+'">'+esc(x.sev)+'</span></td><td data-l="Risc">'+esc(x.risc)+'</td><td data-l="Expunere"><b>'+esc(x.expunere)+'</b></td><td data-l="Măsură" class="pj-small">'+esc(x.masura)+'</td></tr>'; }).join("")+'</tbody></table>';
  h+='</div>';
  /* SECUNDAR — simulator minimis + GBER */
  const priv=CL.filter(c=>c.tip!=="UAT"); if(!S.msClient||!priv.some(c=>c.id===S.msClient)) S.msClient=priv[0]?priv[0].id:"";
  h+='<div class="grid2 section"><div class="card" id="msCard">'+cardHead('Simulator minimis',null,'<span class="evsrc">întreprindere unică · 300.000 EUR / 3 ani</span>')+(priv.length?'<select id="msClient" class="pj-sel" onchange="S.msClient=this.value;msRender()">'+priv.map(c=>'<option value="'+c.id+'"'+(c.id===S.msClient?" selected":"")+'>'+esc(c.denumire)+(c.demo?' · DEMO':'')+'</option>').join("")+'</select><div id="msBox" style="margin-top:10px"></div>':emptyState('👥','Niciun client privat','Adaugă un client privat în CRM pentru simulare.','<button class="btn" onclick="S.view=\'clienti\';render()">→ Clienți</button>'))
    +'<details class="acc2 pj-ref"><summary>Regula plafonului</summary><div class="inner">Plafon 300.000 EUR / orice 3 ani (glisant) / <b>întreprindere unică</b> — tot grupul legat. Verificarea finală: RegAS + declarații. Interzis: minimis pentru vehicule de transport marfă.</div></details></div>';
  h+='<div class="card">'+cardHead('Intensități GBER pe județ',null,'<span class="evsrc">harta ajutoarelor regionale 2022–2027</span>')+'<select id="gberJud" class="pj-sel" onchange="S.gberJud=this.value;gberRender()"><option value="">— alege județul —</option>'+gberAllJud().map(j=>'<option'+(j===S.gberJud?" selected":"")+'>'+j+'</option>').join("")+'</select><div id="gberBox" style="margin-top:10px" class="empty">Alege județul pentru intensitatea maximă.</div>'
    +'<details class="acc2 pj-ref"><summary>Bonusuri IMM și condiții</summary><div class="inner">Bonus IMM: +20pp micro/mici, +10pp mijlocii (≤50 mil EUR) · +10pp în teritorii de tranziție justă · Efect stimulativ: depunere ÎNAINTE de începerea lucrărilor. Plafonul efectiv îl stabilește ghidul apelului.</div></details></div></div>';
  /* SECUNDAR — checklist-uri (interactive, progres salvat local) */
  const ckp=(key,items)=>{ const st=S.checklists[key]||{}; const d=items.filter((_,i)=>st[i]).length; return '<span class="cd '+(d===items.length&&items.length?"cd-good":"cd-off")+'">'+d+' / '+items.length+'</span>'; };
  const cae=r.checklist_pre_depunere_cae||[]; const crG=Object.entries(r.checklist_cerere_rambursare||{});
  const crTot=crG.reduce((s,[k,it])=>s+it.length,0), crDone=crG.reduce((s,[k,it])=>{ const st=S.checklists["cr_"+k]||{}; return s+it.filter((_,i)=>st[i]).length; },0);
  h+='<div class="grid2 section pj-top"><div class="card">'+cardHead('Checklist pre-depunere',null,ckp("cae",cae)+'<button class="btn small ghost" title="resetează bifele" onclick="S.checklists.cae={};ckTg(\'cae\',-1)">↺</button>')+'<div class="evsrc pj-cksub">simulare CAE — bifezi ce ai pregătit; progresul rămâne pe dispozitiv</div>'+ckList("cae",cae)+'</div>';
  h+='<div class="card">'+cardHead('Checklist cerere de rambursare',null,'<span class="cd '+(crTot&&crDone===crTot?"cd-good":"cd-off")+'">'+crDone+' / '+crTot+'</span>')+crG.map(([k,items])=>'<div class="pj-h3">'+esc(k)+'</div>'+ckList("cr_"+k,items)).join("")+'</div></div>';
  /* REFERINȚĂ — tabelele legale, închise, cu rând-rezumat */
  /* flag = marcaj „DE VERIFICAT” (elementele ⏳ din REF se reverifică periodic) — ca span .flag, nu emoji în titlu */
  const ref=(t,sum,inner,flag)=>'<details class="acc2 pj-refacc"><summary><b>'+t+(flag?' <span class="flag" title="valoare care se reverifică periodic la sursă">DE VERIFICAT</span>':'')+'</b><span class="pj-sum">'+sum+'</span></summary><div class="inner">'+inner+'</div></details>';
  h+='<div class="section"><h2>Referențial legal</h2>';
  const cor=r.corectii_oug66||[];
  h+=ref('Scala corecțiilor financiare','OUG 66/2011 + HG 519/2014 · '+cor.length+' abateri tipizate','<table class="tbl pj-static"><thead><tr><th>Abatere</th><th>Corecție</th><th>Normă</th></tr></thead><tbody>'+cor.map(c=>'<tr><td>'+esc(c.abatere)+'</td><td><b style="color:var(--critical)">'+esc(c.corectie)+'</b></td><td class="pj-muted pj-small">'+esc(c.norma)+'</td></tr>').join("")+'</tbody></table>');
  const pa=(r.praguri_achizitii_2026||{}); const pp=pa.publici||{}; const pv=pa.privati_ordin_1284_2016||{};
  h+=ref('Praguri achiziții 2026','achiziție directă: '+nf.format(pp.achizitie_directa_produse_servicii_lei||0)+' lei produse/servicii · '+nf.format(pp.achizitie_directa_lucrari_lei||0)+' lei lucrări · privați: Ordin 1284/2016','<ul class="list">'+
   '<li>Publici — achiziție directă: <b>'+nf.format(pp.achizitie_directa_produse_servicii_lei||0)+' lei</b> (produse/servicii) · <b>'+nf.format(pp.achizitie_directa_lucrari_lei||0)+' lei</b> (lucrări)</li>'+
   '<li>Licitație JOUE lucrări: <b>'+nf.format(pp.licitatie_JOUE_lucrari_lei||0)+' lei</b>; produse/servicii: '+nf.format(pp.licitatie_JOUE_produse_servicii_centrale_lei||0)+' / '+nf.format(pp.licitatie_JOUE_produse_servicii_locale_lei||0)+' lei</li>'+
   '<li>Între praguri: '+esc(pp.intre_praguri||"")+'</li>'+
   '<li><b>Privați (Ordin 1284/2016):</b> '+(pv.pasi||[]).map(esc).join(" → ")+'</li>'+
   '<li style="color:var(--critical)">Sancțiuni: '+esc(pv.sanctiuni||"")+'</li></ul>',true);
  const ff=r.fluxuri_financiare_oug133||{};
  h+=ref('Fluxuri financiare','OUG 133/2021 · prefinanțare · cerere de plată · cerere de rambursare · TVA','<ul class="list"><li><b>Prefinanțare:</b> '+esc(ff.prefinantare||"")+'</li><li><b>Cerere de plată:</b> '+esc(ff.cerere_plata||"")+'</li><li><b>Cerere de rambursare:</b> '+esc(ff.cerere_rambursare||"")+'</li><li><b>TVA:</b> '+esc(ff.tva||"")+'</li></ul>');
  const du=r.durabilitate||{}, ar=r.arhivare||{}, pb=r.publicitate_2021_2027||{};
  h+=ref('Durabilitate, arhivare & publicitate',esc(du.regula||"")+(pb.sanctiune?' · publicitate: sancțiune '+esc(pb.sanctiune):''),'<ul class="list"><li><b>Durabilitate:</b> '+esc(du.regula||"")+'<br><small style="color:var(--critical)">'+esc(du.riscuri||"")+'</small></li><li><b>Arhivare:</b> '+esc(ar.regula||"")+'</li><li><b>Publicitate:</b> '+(pb.obligatorii||[]).map(esc).join(" · ")+' — sancțiune: '+esc(pb.sanctiune||"")+'</li></ul>');
  h+=ref('Conflict de interese','art. 14-15 OUG 66/2011 · corecție 100% + posibilă sesizare penală · verificare manuală ONRC + declarații','<div class="callout crit">Corecție <b>100% + posibilă sesizare penală</b>. Înainte de ORICE atribuire: încrucișează asociații/administratorii clientului (+ rude/afini) cu ofertanții. Suprapunere → STOP + escaladare la om.</div><div style="font-size:12.5px;color:var(--ink2)">Verificare automată: se activează când CRM-ul conține și datele furnizorilor/ofertanților (import dosare achiziții). Până atunci: verificare manuală pe ONRC + declarații.</div>');
  const pn=(r.pnrr_inchidere||{})["⏳"]||""; if(pn) h+=ref('PNRR — închidere',esc(pn),'<div style="font-size:13px;line-height:1.55">'+esc(pn)+'</div>',true);
  if(r.nota) h+='<div class="evsrc" style="margin-top:6px">'+esc(r.nota)+'</div>';
  h+='</div>';
  return h+'</div>'; }
/* Checklist = același idiom de bifă ca în Verificare (.evdoc: checkbox real + text pe același rând, aliniate la stânga), o coloană */
function ckList(key,items){ const st=S.checklists[key]=S.checklists[key]||{};
  return '<div class="evdocs pj-ck">'+items.map((it,i)=>'<label class="evdoc'+(st[i]?" on":"")+'"><input type="checkbox" '+(st[i]?"checked":"")+' onchange="ckTg(\''+key+'\','+i+')"><span'+(st[i]?' class="pj-done"':'')+'>'+esc(it)+'</span></label>').join("")+'</div>'; }
function ckTg(key,i){ const st=S.checklists[key]=S.checklists[key]||{}; if(i>=0) st[i]=!st[i]; try{ localStorage.setItem("eufcc_checklists",JSON.stringify(S.checklists)); }catch(e){} render(true); }
function gberAllJud(){ const g=REF.gber_harta_2022_2027||{}; return [].concat(g["60_pct"]||[],g["50_pct"]||[],g["40_pct"]||[],g["30_pct"]||[],["Ilfov","București"]).sort(); }
function gberRender(){ const sel=$("#gberJud"); const j=(sel&&sel.value)||S.gberJud||""; const g=REF.gber_harta_2022_2027||{}; const box=$("#gberBox"); if(!box) return; box.classList.toggle("empty",!j); if(!j){ box.innerHTML="Alege județul pentru intensitatea maximă."; return; }
  const gb=gberIntensity(j); const sp=(g.special||{})[j];
  const ptj=[...new Set(A.filter(a=>/PTJ|tranziție justă/i.test((a.program||"")+" "+(a.titlu||""))).flatMap(a=>a.judete_eligibile||[]))].some(x=>onrcNorm(x)===onrcNorm(j));
  const aps=intelApeluriJud(j).filter(a=>/ajutor de stat|GBER|regional|schem/i.test((a.note||"")+" "+(a.tip_ajutor||"")));
  box.innerHTML='<div class="tiles" style="grid-template-columns:repeat(3,1fr)">'+
   '<div class="tile"><div class="v">'+(sp?esc(sp):(gb?gb.mari+"%":"—"))+'</div><div class="l">întreprinderi mari</div></div>'+
   (gb?'<div class="tile acc"><div class="v">'+Math.min(gb.mari+10,70)+'%</div><div class="l">mijlocii (+10pp)</div></div><div class="tile acc"><div class="v">'+gb.imm+'%</div><div class="l">micro & mici (+20pp)</div></div>':"")+'</div>'+
   '<div class="evsrc" style="margin-top:6px">Sursă: harta ajutoarelor regionale RO 2022–2027 (REF) · bonus IMM conform GBER art. 14; aceleași valori le folosește și evaluatorul.</div>'+
   (ptj?'<div class="callout warn" style="margin-top:8px">Județ de <b>tranziție justă</b> (conform apelurilor PTJ din radar): potențial +10pp în teritoriile desemnate + apeluri PTJ dedicate.</div>':"")+
   (aps.length?'<div style="margin-top:8px"><button class="btn small" onclick="S.radar.regiune=\''+esc(onrcRegOf(j))+'\';S.radar.stari=new Set([\'activ\']);S.radar.q=\'ajutor\';S.view=\'radar\';render()">📡 '+aps.length+' apeluri cu ajutor de stat/GBER în regiune</button></div>':"");
}
function msRender(){ const sel=$("#msClient"); if(!sel) return; const c=clientById(sel.value||S.msClient); if(!c) return;
  const used=(c.ajutoare_minimis||[]).reduce((s,x)=>s+(x.suma_eur||0),0);
  const extra=S.minisim[c.id]||0; const rem=300000-used-extra; const yMin=TODAY.getFullYear()-2;
  const old=(c.ajutoare_minimis||[]).filter(x=>/^\d{4}$/.test(String(x.an))&&+x.an<yMin);
  $("#msBox").innerHTML='<div class="minibar" style="height:14px"><span style="width:'+Math.min(100,(used)/3000)+'%;background:var(--accent)"></span><span style="left:'+Math.min(100,used/3000)+'%;width:'+Math.min(100-used/3000,extra/3000)+'%;background:'+(rem<0?'var(--critical)':'var(--s3)')+'"></span></div>'+
  (old.length?'<div class="evsrc" style="margin-top:4px">⏳ '+old.length+' ajutor(e) din '+old.map(x=>x.an).join(", ")+' ies din fereastra de 3 ani — verifică data acordării exactă în RegAS (aici sunt însumate conservator).</div>':'')+
  '<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:5px"><span>utilizat: <b>'+money(used,"EUR")+'</b></span><span>simulat: <b>'+money(extra,"EUR")+'</b></span><span>rămas: <b style="color:'+(rem<0?"var(--critical)":"var(--good-text)")+'">'+money(rem,"EUR")+'</b></span></div>'+
  '<div style="margin-top:8px;display:flex;gap:8px;align-items:center"><input type="number" id="msVal" placeholder="grant nou simulat (EUR)" style="flex:1" value="'+(extra||"")+'" oninput="S.minisim[\''+c.id+'\']=parseFloat(this.value)||0;clearTimeout(window._msT);window._msT=setTimeout(msRender,350)" onkeydown="if(event.key===\'Enter\'){S.minisim[\''+c.id+'\']=parseFloat(this.value)||0;msRender()}"><button class="btn small" onclick="S.minisim[\''+c.id+'\']=parseFloat($(\'#msVal\').value)||0;msRender()">simulează</button></div>'+
  ((c.intreprinderi_legate||[]).length?'<div class="callout warn" style="margin-top:8px">Întreprinderi legate: '+esc(c.intreprinderi_legate.join("; "))+' — plafonul se calculează pe TOT grupul.</div>':"")+
  (rem<0?'<div class="callout crit" style="margin-top:8px">DEPĂȘIRE PLAFON cu '+money(-rem,"EUR")+' — grantul simulat nu încape în minimis. Caută schemă GBER sau reduce valoarea.</div>':"");
}
function after_conformitate(){ msRender(); if(S.gberJud) gberRender(); }

