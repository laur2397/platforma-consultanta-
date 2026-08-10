/* ============ EU FUNDS COMMAND CENTER — core ============ */
"use strict";
const DB = window.DB || {};
const A = (DB.apeluri && DB.apeluri.apeluri) || [];
const CL = (DB.clienti && DB.clienti.clienti) || [];
const PR = (DB.proiecte && DB.proiecte.proiecte) || [];
const FAZE = (DB.proiecte && DB.proiecte.faze) || {};
const TS = (DB.proiecte && DB.proiecte.termene_suplimentare) || [];
const SURSE = (DB.surse && DB.surse.surse) || [];
const REF = DB.referinte || {};
const META = DB.meta || {};
const TODAY = new Date(); TODAY.setHours(0,0,0,0);

const S = { view:"buletin", theme:null,
  radar:{ q:"", stari:new Set(), benef:new Set(), regiune:"", program:"", sort:"termen", mode:"tabel", verificat:false },
  matchClient: CL.length? CL[0].id : null, matchApel:null,
  calMode:"lista", calMonth: new Date(TODAY.getFullYear(), TODAY.getMonth(), 1),
  checklists:{}, minisim:{}, repClient: CL.length? CL[0].id : null
};

/* ---------- utils ---------- */
const $ = s=>document.querySelector(s);
const esc = s=> String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nf = new Intl.NumberFormat("ro-RO");
function money(v, cur){ if(v==null) return "—";
  let s; if(Math.abs(v)>=1e9) s=(v/1e9).toLocaleString("ro-RO",{maximumFractionDigits:2})+" mld"; else if(Math.abs(v)>=1e6) s=(v/1e6).toLocaleString("ro-RO",{maximumFractionDigits:2})+" mil"; else s=nf.format(v);
  return s+(cur? " "+cur:""); }
function pd(s){ if(!s) return null; const d=new Date(s+"T00:00:00"); return isNaN(d)?null:d; }
function fmtD(s){ const d=pd(s); if(!d) return "—"; return d.toLocaleDateString("ro-RO",{day:"2-digit",month:"2-digit",year:"numeric"}); }
function fmtDs(s){ const d=pd(s); if(!d) return "—"; return d.toLocaleDateString("ro-RO",{day:"numeric",month:"short"}); }
function days(s){ const d=pd(s); if(!d) return null; return Math.round((d-TODAY)/86400000); }
function cdBadge(dateStr, opts){ opts=opts||{};
  const n = days(dateStr);
  if(n==null) return opts.cont? '<span class="cd cd-good">continuu</span>' : '<span class="cd cd-off">— [DE VERIFICAT]</span>';
  if(n<0) return '<span class="cd cd-off">închis '+fmtDs(dateStr)+'</span>';
  const cls = n<=7? "cd-crit" : (n<=30? "cd-warn":"cd-good");
  const t = n===0? "AZI" : (n===1?"mâine":"în "+n+" zile");
  return '<span class="cd '+cls+'" title="'+fmtD(dateStr)+'">'+fmtDs(dateStr)+' · '+t+'</span>'; }
const BEN = {microintreprindere:"Micro", IMM:"IMM", intreprindere_mare:"Întrepr. mari", UAT:"UAT", ONG:"ONG", universitate:"Universități", fermier:"Fermieri", PFA:"PFA", institutie_publica:"Instituții publice", persoana_fizica:"Pers. fizice"};
function benChips(list, max){ max=max||4; if(!list||!list.length) return '<span class="chip">nespecificat</span>';
  let h=list.slice(0,max).map(b=>'<span class="chip">'+esc(BEN[b]||b)+'</span>').join("");
  if(list.length>max) h+='<span class="chip">+'+(list.length-max)+'</span>'; return h; }
function stB(st){ const L={activ:"ACTIV",planificat:"PLANIFICAT",consultare:"CONSULTARE",in_evaluare:"ÎN EVALUARE",inchis:"ÎNCHIS"}; return '<span class="badge b-'+st+'">'+(L[st]||st)+'</span>'; }
function conf(a){ return a.incredere_extractie!=null && a.incredere_extractie<0.8 ? ' <span class="flag" title="încredere extracție '+a.incredere_extractie+' — verifică sursa înainte de decizie">DE VERIFICAT</span>' : ""; }
function toast(m){ const t=$("#toast"); t.textContent=m; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2600); }
function copyTxt(txt, msg){ navigator.clipboard.writeText(txt).then(()=>toast(msg||"Copiat în clipboard")).catch(()=>toast("Nu am putut copia")); }
function grantStr(a){ if(a.grant_min&&a.grant_max) return money(a.grant_min)+"–"+money(a.grant_max,a.moneda); if(a.grant_max) return "max "+money(a.grant_max,a.moneda); if(a.buget_apel) return "buget "+money(a.buget_apel,a.moneda); return "—"; }
function apelById(id){ return A.find(x=>x.id_apel===id); }
function clientById(id){ return CL.find(x=>x.id===id); }

/* ---------- matching engine (A2 simplificat, transparent) ---------- */
function dimMatch(cl, ap){ const tb = ap.tip_beneficiar||[];
  if(cl.tip==="UAT") return tb.includes("UAT")||tb.includes("institutie_publica");
  const d = cl.dimensiune||"";
  if(d==="microintreprindere") return tb.includes("microintreprindere")||tb.includes("IMM");
  if(d==="mica"||d==="mijlocie") return tb.includes("IMM");
  if(d==="mare") return tb.includes("intreprindere_mare");
  return tb.includes("IMM"); }
function regMatch(cl, ap){ const rg=ap.regiuni||[];
  if(ap.judete_eligibile && ap.judete_eligibile.length) return ap.judete_eligibile.includes(cl.judet);
  if(rg.includes("Național")) return true;
  if(rg.includes("ITI")) return null; /* necunoscut fără verificare areal ITI */
  return rg.includes(cl.regiune); }
function evalPair(cl, ap){
  const fails=[], unk=[], plus=[];
  if(ap.stare==="in_evaluare"||ap.stare==="inchis") fails.push("Apel închis pentru depuneri noi");
  const dz = ap.data_inchidere? days(ap.data_inchidere):null;
  if(dz!=null && dz<0) fails.push("Termenul de depunere a expirat");
  if((ap.tip_beneficiar||[]).length===1 && ap.tip_beneficiar[0]==="persoana_fizica") fails.push("Doar persoane fizice");
  if(!dimMatch(cl,ap)) fails.push("Categoria de beneficiar nu se potrivește ("+(cl.tip==="UAT"?"UAT":cl.dimensiune||"privat")+" vs "+(ap.tip_beneficiar||[]).map(b=>BEN[b]||b).join("/")+")");
  let uatSub=null;
  if(cl.tip==="UAT"){ const nm=((cl.denumire||"")+" "+(cl.dimensiune||"")).toLowerCase();
    uatSub = /consiliul? judeţean|consiliul? județean/.test(nm)?"cj": nm.includes("municipi")?"municipiu": /oraș|oras/.test(nm)?"oras": nm.includes("comun")?"comuna":"uat";
    const at=((ap.titlu||"")+" "+(ap.actiune_prioritate||"")+" "+(ap.criterii_cheie||[]).join(" ")).toLowerCase();
    if(/municipi|mrj/.test(at) && (uatSub==="comuna"||uatSub==="oras") && !/orașe|orase|comune/.test(at)) fails.push("Apel dedicat municipiilor — clientul este "+uatSub);
    if(/consilii? județene|consilii? judetene/.test(at) && uatSub!=="cj") fails.push("Apel dedicat consiliilor județene"); }
  const rm = regMatch(cl,ap);
  if(rm===false) fails.push("Regiunea/județul nu e eligibil("+cl.judet+")");
  if(rm===null) unk.push("Încadrarea în areal (ITI) — de verificat în ghid");
  const df = cl.date_financiare||{};
  if(df.capitaluri_proprii_lei!=null && df.capitaluri_proprii_lei<0 && cl.tip!=="UAT") fails.push("⚠️ Capitaluri proprii negative → risc «întreprindere în dificultate» (criteriu eliminatoriu CAE)");
  if(cl.datorii_fiscale===true) unk.push("Datorii fiscale/eșalonare — certificat fiscal de verificat înainte de depunere");
  if(cl.tip!=="UAT"){ unk.push("Plafon minimis la nivel de întreprindere unică — de confirmat în RegAS"); unk.push("CAEN autorizat la locația de implementare — de verificat ONRC"); }
  unk.push("Capacitatea de cofinanțare — de probat cu documente");
  if(ap.incredere_extractie!=null && ap.incredere_extractie<0.8) unk.push("Datele apelului sunt [DE VERIFICAT] la sursă (încredere "+ap.incredere_extractie+")");
  /* scor soft */
  let sc=0;
  if(!fails.length){
    const tb=ap.tip_beneficiar||[];
    sc += (cl.tip!=="UAT" && tb.includes(cl.dimensiune))||(cl.tip==="UAT"&&tb.includes("UAT")) ? 25:18;
    sc += ap.stare==="activ"?20: ap.stare==="planificat"?14:8;
    if(dz==null) sc += ap.tip_depunere && /continuu/.test(ap.tip_depunere||"")?12:8;
    else if(dz>=14&&dz<=120) sc+=20; else if(dz>=7&&dz<14){sc+=12; plus.push("termen foarte strâns");} else if(dz<7){sc+=3; plus.push("termen critic — probabil nefezabil");} else sc+=14;
    const hay=((ap.domenii||[]).join(" ")+" "+(ap.titlu||"")+" "+(ap.criterii_cheie||[]).join(" ")).toLowerCase();
    let hits=0; (cl.interese||[]).forEach(i=>{ if(i.toLowerCase().split(/\s+/).some(w=>w.length>4&&hay.includes(w.slice(0,6)))) hits++; });
    sc += Math.min(15,hits*5); if(hits) plus.push("interes declarat: potrivire pe "+hits+" teme");
    const caen=(cl.caen_principal||"").match(/\d{4}/); if(caen && hay.includes(caen[0])){ sc+=8; plus.push("CAEN "+caen[0]+" menționat explicit în condițiile apelului"); }
    sc += (ap.incredere_extractie||0)>=0.8?10:(ap.incredere_extractie||0)>=0.6?6:2;
    if(cl.tip==="UAT" && uatSub==="comuna" && /EU Funding|F&T/i.test(ap.platforma_depunere||"") && !/twinning|înfrățir/i.test(ap.titlu||"")){ sc-=15; plus.push("program UE cu gestiune directă — competiție internațională, capacitate de evaluat"); }
    if(cl.tip==="UAT") sc+=8; else { const ca=df.cifra_afaceri_3ani_lei? Object.values(df.cifra_afaceri_3ani_lei).pop():null;
      if(ap.grant_max && ca!=null) sc += (ap.grant_max*5 <= ca*5)?10:6; else sc+=6; }
  }
  const verdict = fails.length? "NO-GO" : "GO-COND.";
  return {client:cl, apel:ap, fails, unknowns:unk, note:plus, scor: fails.length?0:Math.min(100,Math.round(sc)), verdict};
}
let MATCH=null;
function matchAll(){ if(MATCH) return MATCH; MATCH=[];
  CL.forEach(c=>A.forEach(a=>{ const r=evalPair(c,a); if(r) MATCH.push(r); })); return MATCH; }
function topForClient(cid,n){ return matchAll().filter(m=>m.client.id===cid&&!m.fails.length).sort((x,y)=>y.scor-x.scor).slice(0,n||5); }
function topForApel(aid,n){ return matchAll().filter(m=>m.apel.id_apel===aid&&!m.fails.length).sort((x,y)=>y.scor-x.scor).slice(0,n||5); }
function bestPairs(n){ return matchAll().filter(m=>!m.fails.length && m.apel.stare!=="consultare").sort((x,y)=>y.scor-x.scor).slice(0,n||8); }
function vChip(v,s){ const c=v==="NO-GO"?"cd-crit":(s>=70?"cd-good":"cd-warn"); return '<span class="cd '+c+'">'+v+(s?" · "+s:"")+'</span>'; }

/* ---------- health & pipeline calc ---------- */
function health(p){ const t = p.next_action && p.next_action.termen? days(p.next_action.termen):null;
  const ap = apelById(p.apel_id); const az = ap&&ap.data_inchidere? days(ap.data_inchidere):null;
  const pre = ["P0","P1","P2","P3"].includes(p.faza);
  if((t!=null&&t<0) || p.faza==="P5" || (az!=null&&az>=0&&az<=7&&pre)) return "r";
  if((t!=null&&t<=5) || (az!=null&&az>=0&&az<=21&&pre)) return "y";
  return "g"; }
const PROB={P0:.1,P1:.25,P2:.4,P3:.55,P4:.65,P5:.7,P6:.9,P7:1,P8:1,P9:1};
function comisionPrognozat(p){ const c=p.comision||{}; return (c.fix_lei||0)+ (c.succes_pct||0)/100*(p.grant_lei||0)*(PROB[p.faza]||0); }

/* ---------- calendar items ---------- */
function calItems(hor){ hor=hor||120; const out=[];
  A.forEach(a=>{ const dz=days(a.data_inchidere); if(dz!=null&&dz>=0&&dz<=hor) out.push({data:a.data_inchidere,tip:"Închidere apel",titlu:a.titlu,sub:a.program,crit:dz<=7,warn:dz<=30,kind:"apel",id:a.id_apel});
    const do_=days(a.data_deschidere); if(do_!=null&&do_>0&&do_<=hor) out.push({data:a.data_deschidere,tip:"Deschidere apel",titlu:a.titlu,sub:a.program,kind:"apel",id:a.id_apel}); });
  TS.forEach(t=>{ const dz=days(t.data); if(dz!=null&&dz>=-3&&dz<=hor){ const p=PR.find(x=>x.id===t.proiect_id); out.push({data:t.data,tip:t.tip.replace(/_/g," "),titlu:t.descriere,sub:p? (clientById(p.client_id)||{}).denumire:"",crit:!!t.critic||dz<0,warn:dz<=7,kind:"proiect",id:t.proiect_id}); }});
  out.sort((a,b)=> (a.data<b.data?-1:1)); return out; }

/* ---------- navigation ---------- */
const NAV=[["buletin","🏠","Buletin"],["radar","📡","Radar apeluri"],["matching","🎯","Matching"],["pipeline","📋","Pipeline"],["calendar","📅","Calendar"],["clienti","👥","Clienți"],["prospect","🏢","Prospect ONRC"],["biblioteca","📚","Bibliotecă"],["rapoarte","📊","Rapoarte"],["conformitate","🛡️","Conformitate"],["verif","🧪","Verificare proiect"],["intel","🔎","Market Intel"],["financiar","🧮","Financiar"],["baze","🗄️","Baze de date"],["admin","⚙️","Administrare"]];
function navCounts(id){ if(id==="radar") return A.filter(a=>a.stare==="activ").length; if(id==="pipeline") return PR.length; if(id==="clienti") return CL.length; if(id==="calendar") return calItems(30).length; if(id==="baze") return (DB.primarii&&DB.primarii.uat?DB.primarii.uat.length:null); if(id==="prospect"){ const n=onrcTotal(); return n||null; } return null; }
function renderNav(){ $("#nav").innerHTML = NAV.map(([id,ic,l])=>{ const c=navCounts(id);
  return '<li><button class="'+(S.view===id?"on":"")+'" data-v="'+id+'"><span class="ic">'+ic+'</span>'+l+(c!=null?'<span class="ct">'+c+'</span>':"")+'</button></li>'; }).join("");
  document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>{ S.view=b.dataset.v; render(); }); }
function render(){ renderNav(); const v=S.view; const M=$("#main"); M.scrollTop=0;
  const f={buletin:vBuletin,radar:vRadar,matching:vMatching,pipeline:vPipeline,calendar:vCalendar,clienti:vClienti,prospect:vProspect,biblioteca:vBiblioteca,rapoarte:vRapoarte,conformitate:vConformitate,verif:vVerif,intel:vIntel,financiar:vFinanciar,baze:vBaze,admin:vAdmin}[v];
  M.innerHTML = f? f() : "<div class='empty'>…</div>"; if(window["after_"+v]) window["after_"+v](); }

/* ---------- drawer ---------- */
function openDrawer(html){ $("#drawer").innerHTML=html; $("#drawer").classList.add("open"); $("#overlay").classList.add("open"); }
function closeDrawer(){ $("#drawer").classList.remove("open"); $("#overlay").classList.remove("open"); }
function drawerHead(title, sub){ return '<div class="dh2"><h2>'+title+(sub?'<br><small style="color:var(--muted);font-weight:400;font-size:12px">'+sub+'</small>':"")+'</h2><button class="btn small" onclick="closeDrawer()">✕ închide</button></div>'; }
function openApel(id){ const a=apelById(id); if(!a) return;
  const tops=topForApel(id,5);
  let h=drawerHead(esc(a.titlu), esc(a.program+" · "+(a.administrator||"")))+'<div class="db">';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+stB(a.stare)+cdBadge(a.data_inchidere,{cont:/continuu/.test(a.tip_depunere||"")})+conf(a)+(a.corrigendum?'<span class="cd cd-warn">⚠ corrigendum</span>':"")+'</div>';
  if(a.note) h+='<div class="callout'+(a.corrigendum?" warn":"")+'">'+esc(a.note)+'</div>';
  h+='<dl class="kv">';
  const row=(k,v)=>v?'<dt>'+k+'</dt><dd>'+v+'</dd>':"";
  h+=row("Beneficiari eligibili",benChips(a.tip_beneficiar,10));
  h+=row("Regiuni",(a.regiuni||[]).map(r=>'<span class="chip hl">'+esc(r)+'</span>').join("")+(a.judete_eligibile?' <span class="chip">'+a.judete_eligibile.join(", ")+'</span>':""));
  h+=row("Domenii",(a.domenii||[]).map(d=>'<span class="chip">'+esc(d)+'</span>').join(""));
  h+=row("Buget apel",a.buget_apel?money(a.buget_apel,a.moneda):null);
  h+=row("Grant",grantStr(a)!=="—"?grantStr(a):null);
  h+=row("Intensitate max",a.intensitate_max_pct?a.intensitate_max_pct+"%":null);
  h+=row("Deschidere",a.data_deschidere?fmtD(a.data_deschidere):null);
  h+=row("Închidere",a.data_inchidere?fmtD(a.data_inchidere):(a.stare==="activ"?'<span class="flag">DE VERIFICAT</span>':null));
  h+=row("Tip depunere",a.tip_depunere?esc(a.tip_depunere):null);
  h+=row("Platformă",a.platforma_depunere?esc(a.platforma_depunere):null);
  h+=row("Acțiune/prioritate",a.actiune_prioritate?esc(a.actiune_prioritate):null);
  h+=row("Încredere extracție",(a.incredere_extractie!=null)?(a.incredere_extractie*100).toFixed(0)+"%":null);
  h+=row("Extras la",fmtD(((DB.apeluri||{}).extras_la||"").slice(0,10))+" (scanare radar)");
  h+='</dl>';
  if(a.criterii_cheie&&a.criterii_cheie.length) h+='<div class="section"><h2>Condiții-cheie</h2><ul class="list">'+a.criterii_cheie.map(c=>'<li>• '+esc(c)+'</li>').join("")+'</ul></div>';
  h+='<div class="section"><h2>Linkuri oficiale</h2><ul class="list"><li>🔗 <a href="'+esc(a.url_sursa)+'" target="_blank">Anunț / pagina apelului</a></li>'+(a.url_ghid?'<li>📘 <a href="'+esc(a.url_ghid)+'" target="_blank">Ghidul solicitantului</a></li>':"")+'</ul></div>';
  h+='<div class="section"><h2>Pentru cine din portofoliu? (matching)</h2>';
  h+= tops.length? '<table class="tbl"><thead><tr><th>Client</th><th>Verdict · scor</th><th></th></tr></thead><tbody>'+tops.map(m=>'<tr onclick="openMemo(\''+m.client.id+'\',\''+esc(a.id_apel)+'\')"><td><b>'+esc(m.client.denumire)+'</b><br><small style="color:var(--muted)">'+esc(m.client.judet||"")+' · '+esc(m.client.dimensiune||m.client.tip||"")+'</small></td><td>'+vChip(m.verdict,m.scor)+'</td><td style="color:var(--accent)">memo →</td></tr>').join("")+'</tbody></table>'
    : '<div class="empty">Niciun client eligibil din portofoliul curent.</div>';
  h+='</div><div class="callout">Verdictele sunt <b>estimări AI pe date sumare</b> — decizia finală se ia doar după citirea ghidului (criteriile complete CAE/ETF) și validare umană.</div></div>';
  openDrawer(h); }
function openMemo(cid, aid){ const cl=clientById(cid), a=apelById(aid); if(!cl||!a) return;
  const m=evalPair(cl,a);
  let txt="MEMO GO/NO-GO (L3) — generat de Command Center la "+new Date().toLocaleDateString("ro-RO")+"\n";
  txt+="Client: "+cl.denumire+"  ×  Apel: "+a.titlu+" ("+a.program+")\n";
  txt+="VERDICT PRELIMINAR: "+m.verdict+(m.scor?" (scor "+m.scor+"/100)":"")+"\n\n";
  txt+="Criterii HARD verificabile din datele disponibile:\n";
  txt+="  • Categorie beneficiar: "+(m.fails.some(f=>f.includes("Categoria"))?"✗":"✓")+"\n";
  txt+="  • Regiune/județ: "+(m.fails.some(f=>f.includes("Regiunea"))?"✗":"✓")+"\n";
  txt+="  • Situație financiară (capitaluri proprii): "+(m.fails.some(f=>f.includes("Capitaluri"))?"✗ NEGATIVE":"✓ (de confirmat pe bilanț)")+"\n";
  if(m.fails.length) txt+="\nMotive NO-GO:\n"+m.fails.map(f=>"  ✗ "+f).join("\n")+"\n";
  txt+="\nDE VERIFICAT înainte de verdict final (gap analysis):\n"+m.unknowns.map(u=>"  □ "+u).join("\n")+"\n";
  txt+="\nTermen apel: "+(a.data_inchidere?fmtD(a.data_inchidere):"[DE VERIFICAT]")+" · Sursă: "+a.url_sursa+"\n";
  txt+="\nSemnat: Agent A2 (Eligibilitate & Matching) — NEVALIDAT UMAN.\nRegulă: nu se comunică clientului fără aprobarea consultantului.";
  let h=drawerHead("Memo GO/NO-GO", esc(cl.denumire)+" × "+esc(a.titlu))+'<div class="db">';
  h+='<div style="margin-bottom:10px">'+vChip(m.verdict,m.scor)+'</div>';
  h+='<div class="copybox">'+esc(txt)+'</div>';
  window._memoTxt = txt;
  h+='<div style="margin-top:10px;display:flex;gap:8px"><button class="btn primary" onclick="copyTxt(window._memoTxt,\'Memo copiat\')">📋 Copiază memo</button><button class="btn" onclick="openApel(\''+esc(aid)+'\')">← înapoi la apel</button></div>';
  h+='<div class="callout warn" style="margin-top:12px">Memo generat automat din date sumare. Înainte de a-l trimite: deschide ghidul apelului, rulează criteriile complete CAE + grila ETF și validează uman (poarta HITL).</div></div>';
  openDrawer(h); }
function openClient(cid){ const c=clientById(cid); if(!c) return;
  const df=c.date_financiare||{}; const tops=topForClient(cid,5); const prj=PR.filter(p=>p.client_id===cid);
  let h=drawerHead(esc(c.denumire)+(c.demo?' <span class="tag-demo">DEMO</span>':""), esc((c.forma_juridica||"")+" · "+(c.judet||"")+" · "+(c.regiune||"")))+'<div class="db">';
  const flags=[];
  if(df.capitaluri_proprii_lei!=null&&df.capitaluri_proprii_lei<0) flags.push('<div class="callout crit"><b>Capitaluri proprii negative ('+nf.format(df.capitaluri_proprii_lei)+' lei)</b> — risc «întreprindere în dificultate»: criteriu eliminatoriu la CAE. Nu se depune nimic nou până la remediere.</div>');
  if(c.datorii_fiscale) flags.push('<div class="callout warn">Datorii fiscale / eșalonare — '+esc(c.nota_datorii||"certificat fiscal de verificat")+'</div>');
  h+=flags.join("");
  h+='<dl class="kv">';
  const row=(k,v)=>v?'<dt>'+k+'</dt><dd>'+v+'</dd>':"";
  h+=row("CUI",esc(c.cui||"—")+(c.demo?" (fictiv)":""));
  h+=row("CAEN principal",esc(c.caen_principal||"—"));
  h+=row("Dimensiune",esc(c.dimensiune||c.tip||"—"));
  h+=row("Angajați",c.angajati!=null?String(c.angajati):null);
  if(df.cifra_afaceri_3ani_lei){ const y=Object.keys(df.cifra_afaceri_3ani_lei);
    h+=row("Cifra de afaceri",y.map(k=>k+": "+money(df.cifra_afaceri_3ani_lei[k],"lei")).join(" · "));
    h+=row("Profit exploatare",Object.keys(df.profit_exploatare_3ani_lei||{}).map(k=>k+": "+money(df.profit_exploatare_3ani_lei[k],"lei")).join(" · ")); }
  if(df.nota) h+=row("Date financiare",esc(df.nota));
  h+=row("Capitaluri proprii",df.capitaluri_proprii_lei!=null?money(df.capitaluri_proprii_lei,"lei"):null);
  h+=row("Întreprinderi legate",(c.intreprinderi_legate&&c.intreprinderi_legate.length)?esc(c.intreprinderi_legate.join("; ")):null);
  h+=row("Capacitate cofinanțare",esc(c.capacitate_cofinantare||""));
  h+=row("Contact",c.contact?esc((c.contact.nume||"")+" · "+(c.contact.email||"")):null);
  h+='</dl>';
  if(c.tip!=="UAT"){ const used=(c.ajutoare_minimis||[]).reduce((s,x)=>s+(x.suma_eur||0),0); const plaf=c.plafon_minimis_eur!=null?c.plafon_minimis_eur:(300000-used);
    h+='<div class="section"><h2>Plafon de minimis (întreprindere unică)</h2>';
    h+='<div class="minibar"><span style="width:'+Math.min(100,used/3000)+'%;background:var(--s2)"></span></div>';
    h+='<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px"><span>utilizat: <b>'+money(used,"EUR")+'</b></span><span>disponibil: <b style="color:var(--good-text)">'+money(plaf,"EUR")+'</b> / 300.000</span></div>';
    if(c.nota_minimis) h+='<div class="callout warn" style="margin-top:8px">'+esc(c.nota_minimis)+'</div>';
    if(c.ajutoare_minimis&&c.ajutoare_minimis.length) h+='<table class="tbl" style="margin-top:6px"><thead><tr><th>An</th><th>Schemă</th><th class="num">EUR</th></tr></thead><tbody>'+c.ajutoare_minimis.map(x=>'<tr><td>'+x.an+'</td><td>'+esc(x.schema)+'</td><td class="num">'+nf.format(x.suma_eur)+'</td></tr>').join("")+'</tbody></table>';
    h+='</div>'; }
  if(prj.length) h+='<div class="section"><h2>Proiecte</h2>'+prj.map(p=>'<div class="kcard" onclick="openProiect(\''+p.id+'\')"><div class="t">'+esc(p.titlu)+' <span class="hdot '+health(p)+'"></span></div><div class="m">'+esc(p.faza)+' · '+esc(FAZE[p.faza]||"")+' · grant '+money(p.grant_lei,"lei")+'</div></div>').join("")+'</div>';
  h+='<div class="section"><h2>Top apeluri potrivite</h2>';
  h+= tops.length? '<table class="tbl"><thead><tr><th>Apel</th><th>Termen</th><th>Verdict · scor</th></tr></thead><tbody>'+tops.map(m=>'<tr onclick="openMemo(\''+cid+'\',\''+esc(m.apel.id_apel)+'\')"><td><b>'+esc(m.apel.titlu)+'</b><br><small style="color:var(--muted)">'+esc(m.apel.program)+'</small></td><td>'+cdBadge(m.apel.data_inchidere,{cont:/continuu/.test(m.apel.tip_depunere||"")})+'</td><td>'+vChip(m.verdict,m.scor)+'</td></tr>').join("")+'</tbody></table>' : '<div class="empty">Nimic potrivit acum'+(df.capitaluri_proprii_lei<0?" — blocat de capitalurile negative":"")+'.</div>';
  h+='</div>'+(c.note?'<div class="callout">'+esc(c.note)+'</div>':"")+'</div>';
  openDrawer(h); }
function openProiect(pid){ const p=PR.find(x=>x.id===pid); if(!p) return;
  const c=clientById(p.client_id); const a=apelById(p.apel_id)||{titlu:(p.apel_istoric||{}).titlu||p.apel_id, program:(p.apel_istoric||{}).program||"apel istoric"};
  let h=drawerHead(esc(p.titlu)+(p.demo?' <span class="tag-demo">DEMO</span>':""), esc((c?c.denumire:"")+" × "+(a.titlu||"")))+'<div class="db">';
  h+='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="badge b-planificat">'+p.faza+" · "+esc(FAZE[p.faza]||"")+'</span><span class="hdot '+health(p)+'"></span>'+(p.cod_smis?'<span class="chip">SMIS '+esc(p.cod_smis)+'</span>':"")+'</div>';
  h+='<dl class="kv">';
  h+='<dt>Valoare totală</dt><dd>'+money(p.valoare_totala_lei,"lei")+'</dd>';
  h+='<dt>Grant</dt><dd>'+money(p.grant_lei,"lei")+' · cofinanțare '+money(p.cofinantare_lei,"lei")+'</dd>';
  h+='<dt>Consultant</dt><dd>'+esc(p.consultant||"—")+'</dd>';
  h+='<dt>Comision prognozat</dt><dd>'+money(Math.round(comisionPrognozat(p)),"lei")+' <small style="color:var(--muted)">(fix + succes% × grant × prob. fază '+((PROB[p.faza]||0)*100)+'%)</small></dd>';
  if(p.next_action) h+='<dt>Next action</dt><dd><b>'+esc(p.next_action.descriere)+'</b><br>'+cdBadge(p.next_action.termen)+'</dd>';
  h+='</dl>';
  if(apelById(p.apel_id)) h+='<button class="btn" onclick="openApel(\''+esc(p.apel_id)+'\')">📡 Vezi apelul</button> ';
  if(c) h+='<button class="btn" onclick="openClient(\''+c.id+'\')">👥 Vezi clientul</button>';
  if(p.istoric&&p.istoric.length) h+='<div class="section"><h2>Istoric</h2><ul class="list">'+p.istoric.map(e=>'<li><span style="color:var(--muted);min-width:80px">'+fmtDs(e.data)+'</span> '+esc(e.eveniment)+'</li>').join("")+'</ul></div>';
  if(p.note) h+='<div class="callout">'+esc(p.note)+'</div>';
  h+='</div>'; openDrawer(h); }

/* ---------- Buletin ---------- */
function vBuletin(){ const b=(META.buletin)||{}; const act=A.filter(a=>a.stare==="activ").length, plan=A.filter(a=>a.stare==="planificat"||a.stare==="consultare").length;
  const cl7=A.filter(a=>{const d=days(a.data_inchidere);return d!=null&&d>=0&&d<=7;}).length;
  const cl30=A.filter(a=>{const d=days(a.data_inchidere);return d!=null&&d>=0&&d<=30;}).length;
  const pipeG=PR.reduce((s,p)=>s+(p.grant_lei||0),0); const t7=calItems(7).length;
  const dv=A.filter(a=>(a.incredere_extractie||1)<0.8).length;
  let h='<div class="viewtitle"><h1>'+esc(b.titlu||"Buletin")+'</h1><span class="sub">radar: '+A.length+' apeluri din 30+ surse</span><div class="viewactions"><button class="btn small" onclick="copyBuletin()">📋 Copiază buletinul</button></div></div>';
  h+='<div class="tiles">';
  h+=tile(act,"Apeluri active","din "+A.length+" în registru","acc","radar",()=>{S.radar.stari=new Set(["activ"]);});
  h+=tile(cl7,"Se închid ≤7 zile","atenție maximă",cl7?"crit":"","radar",()=>{S.radar.stari=new Set(["activ"]);S.radar.sort="termen";});
  h+=tile(cl30,"Se închid ≤30 zile","fereastră de depunere","warnv","radar",()=>{S.radar.stari=new Set(["activ"]);S.radar.sort="termen";});
  h+=tile(plan,"Planificate + consultare","pregătire anticipată","","radar",()=>{S.radar.stari=new Set(["planificat","consultare"]);});
  h+=tile(money(pipeG,"lei"),"Pipeline (grant)",PR.length+" proiecte","acc","pipeline",null);
  h+=tile(t7,"Termene în 7 zile","calendar",t7>3?"warnv":"","calendar",null);
  h+=tile(dv,"[DE VERIFICAT]","câmpuri de confirmat la sursă","","admin",null);
  h+='</div>';
  h+='<div class="grid2 section"><div class="card"><h2 style="margin-bottom:8px;font-size:14px">🔴 Urgențe azi</h2><ul class="list">'+(b.urgente||[]).map(u=>'<li>❗ '+esc(u)+'</li>').join("")+'</ul></div>';
  h+='<div class="card"><h2 style="margin-bottom:8px;font-size:14px">💡 Oportunități-cheie</h2><ul class="list">'+(b.oportunitati_cheie||[]).map(u=>'<li>▸ '+esc(u)+'</li>').join("")+'</ul></div></div>';
  h+='<div class="section card"><h2 style="margin-bottom:8px;font-size:14px">📅 Termenele următoarelor 14 zile</h2>'+miniCal(14)+'</div>';
  const bp=bestPairs(6);
  h+='<div class="section card"><h2 style="margin-bottom:8px;font-size:14px">🎯 Top potriviri client × apel</h2><table class="tbl"><thead><tr><th>Client</th><th>Apel</th><th>Termen</th><th>Verdict · scor</th></tr></thead><tbody>'+bp.map(m=>'<tr onclick="openMemo(\''+m.client.id+'\',\''+esc(m.apel.id_apel)+'\')"><td><b>'+esc(m.client.denumire)+'</b></td><td>'+esc(m.apel.titlu)+'<br><small style="color:var(--muted)">'+esc(m.apel.program)+'</small></td><td>'+cdBadge(m.apel.data_inchidere,{cont:true})+'</td><td>'+vChip(m.verdict,m.scor)+'</td></tr>').join("")+'</tbody></table></div>';
  h+='<div class="section card"><h2 style="margin-bottom:8px;font-size:14px">🔍 Lista [DE VERIFICAT] a zilei</h2><ul class="list">'+(b.de_verificat||[]).map(u=>'<li>□ '+esc(u)+'</li>').join("")+'</ul></div>';
  if(b.sinteza) h+='<div class="callout" style="margin-top:14px">'+esc(b.sinteza)+'</div>';
  return h; }
let tileActions=[];
function tile(v,l,d,cls,view,pre){ const i=tileActions.length; tileActions.push({view,pre});
  return '<div class="tile '+(cls||"")+'" onclick="tileGo('+i+')"><div class="v">'+v+'</div><div class="l">'+l+'</div><div class="d">'+d+'</div></div>'; }
function tileGo(i){ const t=tileActions[i]; if(!t) return; if(t.pre)t.pre(); S.view=t.view; render(); }
function miniCal(hor){ const items=calItems(hor).slice(0,10);
  if(!items.length) return '<div class="empty">Nimic scadent în fereastră.</div>';
  return '<table class="tbl"><tbody>'+items.map(it=>'<tr onclick="'+(it.kind==="apel"?"openApel('"+esc(it.id)+"')":"openProiect('"+esc(it.id)+"')")+'"><td style="width:105px">'+cdBadge(it.data)+'</td><td><span class="tp">'+esc(it.tip)+'</span><br><b>'+esc(it.titlu)+'</b>'+(it.sub?' <small style="color:var(--muted)">— '+esc(it.sub)+'</small>':"")+'</td></tr>').join("")+'</tbody></table>'; }
function copyBuletin(){ const b=META.buletin||{}; let t=(b.titlu||"Buletin")+"\n\n"+(b.sinteza||"")+"\n\nURGENȚE:\n"+(b.urgente||[]).map(x=>"• "+x).join("\n")+"\n\nOPORTUNITĂȚI:\n"+(b.oportunitati_cheie||[]).map(x=>"• "+x).join("\n")+"\n\nDE VERIFICAT:\n"+(b.de_verificat||[]).map(x=>"□ "+x).join("\n");
  copyTxt(t,"Buletin copiat"); }

/* ---------- Radar ---------- */
const REGIUNI=["Național","Nord-Est","Nord-Vest","Centru","Sud-Est","Sud-Muntenia","Sud-Vest Oltenia","Vest","București-Ilfov","ITI"];
function radarFiltered(){ const f=S.radar; let list=A.slice();
  if(f.q){ const q=f.q.toLowerCase(); list=list.filter(a=>((a.titlu||"")+" "+(a.program||"")+" "+(a.domenii||[]).join(" ")+" "+(a.administrator||"")).toLowerCase().includes(q)); }
  if(f.stari.size) list=list.filter(a=>f.stari.has(a.stare));
  if(f.benef.size) list=list.filter(a=>(a.tip_beneficiar||[]).some(b=>f.benef.has(b)));
  if(f.regiune) list=list.filter(a=>(a.regiuni||[]).includes(f.regiune)||(f.regiune!=="Național"&&(a.regiuni||[]).includes("Național")));
  if(f.program) list=list.filter(a=>a.program===f.program);
  if(f.verificat) list=list.filter(a=>(a.incredere_extractie||1)<0.8);
  const key={termen:a=>{const d=days(a.data_inchidere);return d==null?9999:(d<0?9998:d);}, scor:a=>-(topForApel(a.id_apel,1)[0]||{scor:0}).scor, program:a=>a.program, incredere:a=>-(a.incredere_extractie||0)};
  list.sort((x,y)=>{const k=key[f.sort]||key.termen; const a1=k(x),b1=k(y); return a1<b1?-1:a1>b1?1:0;});
  return list; }
function vRadar(){ const f=S.radar; const list=radarFiltered();
  const programs=[...new Set(A.map(a=>a.program))].sort();
  let h='<div class="viewtitle"><h1>📡 Radar apeluri</h1><span class="sub">'+list.length+' / '+A.length+' apeluri · extras la '+fmtD((DB.apeluri||{}).extras_la?String(DB.apeluri.extras_la).slice(0,10):null)+'</span><div class="viewactions"><button class="btn small '+(f.mode==="tabel"?"primary":"")+'" onclick="S.radar.mode=\'tabel\';render()">tabel</button><button class="btn small '+(f.mode==="carduri"?"primary":"")+'" onclick="S.radar.mode=\'carduri\';render()">carduri</button></div></div>';
  h+='<div class="presets">'+[
    ["Toate",()=>{S.radar={...S.radar,stari:new Set(),benef:new Set(),regiune:"",program:"",verificat:false}}],
    ["🏛 UAT & public",()=>{S.radar.benef=new Set(["UAT","institutie_publica"]);S.radar.stari=new Set()}],
    ["🏢 Micro & IMM",()=>{S.radar.benef=new Set(["microintreprindere","IMM"]);S.radar.stari=new Set()}],
    ["⏰ Închid ≤30 zile",()=>{S.radar.stari=new Set(["activ"]);S.radar.sort="termen"}],
    ["🔜 Planificate",()=>{S.radar.benef=new Set();S.radar.stari=new Set(["planificat","consultare"])}],
    ["🚩 De verificat",()=>{S.radar.verificat=true}]
  ].map((p,i)=>'<button class="fchip" onclick="radarPreset('+i+')">'+p[0]+'</button>').join("")+'</div>';
  window._presets=[["",()=>{S.radar={...S.radar,stari:new Set(),benef:new Set(),regiune:"",program:"",verificat:false}}],["",()=>{S.radar.benef=new Set(["UAT","institutie_publica"]);S.radar.stari=new Set()}],["",()=>{S.radar.benef=new Set(["microintreprindere","IMM"]);S.radar.stari=new Set()}],["",()=>{S.radar.stari=new Set(["activ"]);S.radar.sort="termen"}],["",()=>{S.radar.benef=new Set();S.radar.stari=new Set(["planificat","consultare"])}],["",()=>{S.radar.verificat=true}]];
  h+='<div class="filters"><input type="text" placeholder="caută în radar…" value="'+esc(f.q)+'" oninput="S.radar.q=this.value;refreshRadar()">';
  h+='<select onchange="S.radar.regiune=this.value;refreshRadar()"><option value="">— regiune —</option>'+REGIUNI.map(r=>'<option '+(f.regiune===r?"selected":"")+'>'+r+'</option>').join("")+'</select>';
  h+='<select onchange="S.radar.program=this.value;refreshRadar()"><option value="">— program —</option>'+programs.map(p=>'<option '+(f.program===p?"selected":"")+'>'+esc(p)+'</option>').join("")+'</select>';
  h+=["activ","planificat","consultare"].map(st=>'<button class="fchip '+(f.stari.has(st)?"on":"")+'" onclick="tgSet(S.radar.stari,\''+st+'\');refreshRadar()">'+st+'</button>').join("");
  h+=["UAT","IMM","microintreprindere","ONG","fermier","intreprindere_mare"].map(b=>'<button class="fchip '+(f.benef.has(b)?"on":"")+'" onclick="tgSet(S.radar.benef,\''+b+'\');refreshRadar()">'+(BEN[b]||b)+'</button>').join("");
  h+='<select onchange="S.radar.sort=this.value;refreshRadar()"><option value="termen" '+(f.sort==="termen"?"selected":"")+'>sortare: termen</option><option value="scor" '+(f.sort==="scor"?"selected":"")+'>sortare: scor portofoliu</option><option value="program" '+(f.sort==="program"?"selected":"")+'>sortare: program</option><option value="incredere" '+(f.sort==="incredere"?"selected":"")+'>sortare: încredere</option></select></div>';
  h+='<div id="radarList">'+radarListHtml(list)+'</div>';
  return h; }
function radarPreset(i){ (window._presets[i][1])(); render(); }
function tgSet(set,v){ set.has(v)?set.delete(v):set.add(v); }
function refreshRadar(){ $("#radarList").innerHTML=radarListHtml(radarFiltered()); const vt=document.querySelector(".viewtitle .sub"); if(vt) vt.textContent=radarFiltered().length+" / "+A.length+" apeluri"; }
function radarListHtml(list){ if(!list.length) return '<div class="empty">Niciun apel pe filtrele curente.</div>';
  if(S.radar.mode==="carduri"){ return '<div class="grid3">'+list.map(a=>{const top=topForApel(a.id_apel,1)[0];
    return '<div class="card" style="cursor:pointer" onclick="openApel(\''+esc(a.id_apel)+'\')"><div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start"><b style="font-size:13.5px">'+esc(a.titlu)+'</b>'+stB(a.stare)+'</div><div style="color:var(--muted);font-size:12px;margin:3px 0 7px">'+esc(a.program)+'</div><div>'+benChips(a.tip_beneficiar,3)+'</div><div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:12px;color:var(--ink2)">'+grantStr(a)+'</span>'+cdBadge(a.data_inchidere,{cont:/continuu/.test(a.tip_depunere||"")})+'</div>'+(top?'<div style="margin-top:7px;font-size:12px">🎯 '+esc(top.client.denumire)+' '+vChip(top.verdict,top.scor)+'</div>':"")+(conf(a)?'<div style="margin-top:5px">'+conf(a)+'</div>':"")+'</div>';}).join("")+'</div>'; }
  return '<div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Apel</th><th>Beneficiari</th><th>Regiuni</th><th>Grant / buget</th><th>Închidere</th><th>Stare</th><th>Top match</th></tr></thead><tbody>'+
  list.map(a=>{const top=topForApel(a.id_apel,1)[0];
    return '<tr onclick="openApel(\''+esc(a.id_apel)+'\')"><td style="max-width:330px"><b>'+esc(a.titlu)+'</b>'+(a.corrigendum?' <span class="cd cd-warn">corr.</span>':"")+conf(a)+'<br><small style="color:var(--muted)">'+esc(a.program)+'</small></td><td>'+benChips(a.tip_beneficiar,2)+'</td><td style="font-size:12px">'+esc((a.judete_eligibile&&a.judete_eligibile.length)?a.judete_eligibile.join(", "):(a.regiuni||[]).join(", "))+'</td><td class="num" style="font-size:12px">'+grantStr(a)+'</td><td>'+cdBadge(a.data_inchidere,{cont:/continuu/.test(a.tip_depunere||"")})+'</td><td>'+stB(a.stare)+'</td><td style="font-size:12px">'+(top?esc(top.client.denumire.split(" ").slice(0,2).join(" "))+" · <b>"+top.scor+"</b>":"—")+'</td></tr>';}).join("")+'</tbody></table></div>'; }

/* ============ MODUL BAZE DE DATE ============ */
const PRIM = (DB.primarii && DB.primarii.uat) || [];
const bznorm = s=>(s||'').toString().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[ăâîșțĂÂÎȘȚ]/g,c=>({'ă':'a','â':'a','î':'i','ș':'s','ț':'t','Ă':'A','Â':'A','Î':'I','Ș':'S','Ț':'T'}[c]||c)).toLowerCase();
PRIM.forEach(u=>u._k=bznorm(u.n+' '+u.j+' '+u.pr));

function bzState(){ if(!S.baze) S.baze={sub:'prezentare',q:'',judet:'',tip:'',limit:200}; return S.baze; }

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
  h+='<div class="tile"><div class="v">'+nM+' / '+nO+' / '+nC+'</div><div class="l">municipii / orașe / comune</div></div>';
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
  h+='<button class="btn small" onclick="bzExport()">⬇ Export CSV</button>';
  h+='<span class="count" id="bzCount" style="margin-left:auto;color:var(--muted);font-size:12.5px"></span></div>';
  h+='<div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th onclick="bzSort(\'n\')" style="cursor:pointer">Primărie</th><th onclick="bzSort(\'j\')" style="cursor:pointer">Județ</th><th class="num" onclick="bzSort(\'p\')" style="cursor:pointer">Populație</th><th onclick="bzSort(\'pr\')" style="cursor:pointer">Primar</th><th>Contact</th></tr></thead><tbody id="bzBody"></tbody></table></div>';
  h+='<button class="btn" id="bzMore" style="margin:14px auto;display:block" onclick="bzState().limit+=500;bzRefresh()">Arată mai multe…</button>';
  const LV=(DB.primarii||{}).liveness;
  if(LV){ h+='<div class="callout warn" style="margin-top:12px"><b>Verificare contacte, '+esc(LV.verificat_la)+':</b> din '+nf.format(LV.total_site)+' de site-uri testate, <b>'+nf.format(LV.live)+' funcționează</b>, '+nf.format(LV.mort)+' sunt moarte (domeniu inexistent/timeout) și '+nf.format(LV.eroare)+' dau erori HTTP. Am extras <b>'+nf.format(LV.tel_extrase)+' telefoane</b> și '+nf.format(LV.email_extrase)+' e-mailuri de pe site-urile vii, înlocuind '+nf.format(LV.email_recomandat_nou)+' adrese vechi. Atenție: '+nf.format(LV.email_freemail)+' adrese din setul oficial 2017 sunt pe free-mail (yahoo/rcnet) — marcate în listă. Telefonul afișat este cel <b>oficial al primăriei</b>; numerele personale ale primarilor nu sunt date publice.</div>'; }
  h+='<div class="callout" style="margin-top:12px">Datele despre primari reflectă starea curentă din Wikidata (pot avea mici decalaje la schimbări foarte recente). Multe e-mailuri provin din setul data.gov.ro din 2017 — pentru contacte 100% la zi, validarea „viu/mort" a site-urilor rămâne pasul următor.</div>';
  setTimeout(bzRefresh,0);
  return h; }
function bzSet(k,v){ const b=bzState(); b[k]=v; b.limit=200;
  if(k==='q'){ bzRefresh(); } else { render(); } }
function bzSort(k){ const b=bzState(); if(b.sort===k) b.dir=-(b.dir||1); else { b.sort=k; b.dir=(k==='p'?-1:1); } b.limit=200; bzRefresh(); }
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
    html+='<tr><td style="max-width:340px"><b>'+esc(o.n||'(fără titlu)')+'</b><br><span class="tpb comuna" style="background:var(--accent)">'+esc(o.dom)+'</span> <small style="color:var(--muted)">'+esc(o.cpv.slice(0,46))+'</small></td>'+
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
    html+='<tr><td style="max-width:360px"><b>'+esc(p.ben)+'</b>'+(p.tit?'<br><small style="color:var(--muted)">'+esc(p.tit)+'</small>':'')+(p.smis?' <small style="color:var(--muted)">· SMIS '+esc(p.smis)+'</small>':'')+'</td>'+
      '<td><span class="chip hl">'+esc(p.pg)+'</span></td>'+
      '<td style="font-size:12px">'+(esc(p.jud)||'<span style="color:var(--muted)">—</span>')+'</td>'+
      '<td><span class="tpb" style="background:'+(CATC[p.cat]||'var(--muted)')+'">'+esc(p.cat)+'</span></td>'+
      '<td class="num">'+(p.v?nf.format(p.v)+' lei':'—')+'</td>'+
      '<td>'+(p.smis?'<a href="https://mysmis2021.gov.ro" target="_blank" rel="noopener" style="font-size:11px;color:var(--muted)" title="cod SMIS '+esc(p.smis)+'">SMIS</a>':'')+'</td></tr>';
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
const RG_AN = 2026;

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
  if(k==='tip'){ s.q=''; s.jud=''; s.dom=''; }
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

function finState(){ if(!S.fin) S.fin={
  sub:'bilant', ani:['N-2','N-1','N'],
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
}; return S.fin; }

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
  h+='<div id="finView">'+({bilant:fBilant,pp:fPP,indicatori:fInd,imm:fIMM,buget:fBuget,deviz:fDeviz,cashflow:fCash,mapari:fMapari}[f.sub]||fBilant)()+'</div>';
  return h; }
function finSub(s){ finState().sub=s; render(); }
function finSet(grp,key,idx,val){ const f=finState(); const v=fnum(val);
  if(idx===null){ f[grp][key]=v; } else { f[grp][key][idx]=v; }
  finLive(); }
function finLive(){ const f=finState();
  const el=document.getElementById('finView'); if(!el) return;
  el.innerHTML=({bilant:fBilant,pp:fPP,indicatori:fInd,imm:fIMM,buget:fBuget,deviz:fDeviz,cashflow:fCash,mapari:fMapari}[f.sub]||fBilant)();
}
function inp(grp,key,idx,val,ph){ return '<input type="number" step="any" value="'+(val||'')+'" placeholder="'+(ph||'0')+'" oninput="finSet(\''+grp+'\',\''+key+'\','+(idx===null?'null':idx)+',this.value)" style="width:100%;padding:5px 7px;border:1px solid var(--grid);border-radius:6px;background:var(--page);color:var(--ink);font-size:12.5px;text-align:right;font-variant-numeric:tabular-nums">'; }
function vrd(ok,txt){ return '<span class="cd '+(ok?'cd-good':'cd-crit')+'">'+(ok?'✅ ':'❌ ')+txt+'</span>'; }

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
    ['<b>Diferență (trebuie 0)</b>',i=>{const c=calcBil(i);return (Math.abs(c.dif)<1?'<span class="cd cd-good">✅ echilibrat</span>':'<span class="cd cd-crit">❌ '+fmtL(c.dif)+'</span>');}],
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
  let h='<div class="callout" style="margin-bottom:12px">Indicatorii pe care <b>grilele ETF îi punctează</b> cel mai frecvent, calculați din bilanț și contul de profit și pierdere. Pragurile afișate sunt cele uzuale — <b>verifică întotdeauna grila apelului</b>, care poate folosi alte formule sau alte praguri.</div>';
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
    '<li>'+(p2.rezExpl>0?'✅':'❌')+' Rezultat din exploatare pozitiv în anul N: <b>'+fmtL(p2.rezExpl)+'</b></li>'+
    '<li>'+(calcBil(2).capProprii>0?'✅':'❌')+' Capitaluri proprii pozitive: <b>'+fmtL(calcBil(2).capProprii)+'</b></li>'+
    '<li>'+(f.p.angajati[2]>0?'✅':'⚠️')+' Număr mediu de angajați declarat: <b>'+(f.p.angajati[2]||'—')+'</b></li>'+
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
    h+='<tr><td><input type="text" value="'+esc(L.den||'')+'" oninput="immSet('+i+',\'den\',this.value)" style="width:100%;padding:5px 7px;border:1px solid var(--grid);border-radius:6px;background:var(--page);color:var(--ink);font-size:12.5px"></td>'+
      '<td><select onchange="immSet('+i+',\'tip\',this.value)" style="padding:5px;border:1px solid var(--grid);border-radius:6px;background:var(--page);color:var(--ink);font-size:12px"><option value="legata" '+(L.tip==='legata'?'selected':'')+'>legată (100%)</option><option value="partenera" '+(L.tip==='partenera'?'selected':'')+'>parteneră (pro-rata)</option></select></td>'+
      '<td style="width:90px"><input type="number" value="'+(L.pct||'')+'" oninput="immSet('+i+',\'pct\',this.value)" style="width:100%;padding:5px;border:1px solid var(--grid);border-radius:6px;background:var(--page);color:var(--ink);font-size:12.5px;text-align:right"></td>'+
      '<td style="width:100px"><input type="number" value="'+(L.ang||'')+'" oninput="immSet('+i+',\'ang\',this.value)" style="width:100%;padding:5px;border:1px solid var(--grid);border-radius:6px;background:var(--page);color:var(--ink);font-size:12.5px;text-align:right"></td>'+
      '<td style="width:130px"><input type="number" value="'+(L.ca||'')+'" oninput="immSet('+i+',\'ca\',this.value)" style="width:100%;padding:5px;border:1px solid var(--grid);border-radius:6px;background:var(--page);color:var(--ink);font-size:12.5px;text-align:right"></td>'+
      '<td style="width:130px"><input type="number" value="'+(L.activ||'')+'" oninput="immSet('+i+',\'activ\',this.value)" style="width:100%;padding:5px;border:1px solid var(--grid);border-radius:6px;background:var(--page);color:var(--ink);font-size:12.5px;text-align:right"></td>'+
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
    h+='<tr><td style="min-width:180px"><input type="text" value="'+esc(r.d||'')+'" oninput="bugSet('+r.i+',\'d\',this.value)" style="width:100%;padding:5px 7px;border:1px solid var(--grid);border-radius:6px;background:var(--page);color:var(--ink);font-size:12.5px"></td>'+
      '<td style="width:120px"><input type="number" value="'+(r.bRaw||'')+'" oninput="bugSet('+r.i+',\'b\',this.value)" style="width:100%;padding:5px;border:1px solid var(--grid);border-radius:6px;background:var(--page);color:var(--ink);font-size:12.5px;text-align:right"></td>'+
      '<td style="width:70px"><input type="number" value="'+r.tvaPct+'" oninput="bugSet('+r.i+',\'tva\',this.value)" style="width:100%;padding:5px;border:1px solid var(--grid);border-radius:6px;background:var(--page);color:var(--ink);font-size:12.5px;text-align:right"></td>'+
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
  h+='<li>'+(Math.abs((S1.totE+S1.totN)-S1.tot)<1?'✅':'❌')+' Total eligibil + total neeligibil = TOTAL general</li>';
  h+='<li>'+(rows.every(r=>Math.abs(r.total-(r.baza+r.tvaVal))<1)?'✅':'❌')+' Pe fiecare poziție: total = bază + TVA</li>';
  h+='<li>'+(depMin?'❌':'✅')+' Grantul ('+fmtX(grantEur)+' EUR) '+(depMin?'<b>DEPĂȘEȘTE</b>':'se încadrează în')+' plafonul de minimis disponibil ('+fmtX(fnum(cfg.minimisDisp))+' EUR)</li>';
  h+='<li>'+(cfg.tvaDeductibil?'ℹ️ Firma este plătitoare de TVA → TVA-ul este deductibil, deci <b>neeligibil</b>':'ℹ️ Firma NU este plătitoare de TVA → TVA-ul nedeductibil este <b>eligibil</b> (HG 873/2022 art. 9)')+'</li>';
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
  h+='<li>'+(pctNeprev<=10.01?'✅':'⚠️')+' Diverse și neprevăzute (5.3): <b>'+fmtP(pctNeprev)+'</b> din capitolele 1+2+3+4 — limita uzuală este <b>10%</b> (verifică ghidul apelului; la intervenții pe construcții existente poate fi mai mare)</li>';
  h+='<li>'+(g('c37')>0?'ℹ️':'⚠️')+' Consultanța se trece la <b>3.7</b> ('+fmtL(g('c37'))+'), proiectarea la <b>3.5</b> ('+fmtL(g('c35'))+'), dotările la <b>4.5</b> ('+fmtL(g('c45'))+')</li>';
  h+='<li>'+(CM>0?'✅':'ℹ️')+' Valoarea C+M determină <b>cota ISC</b> (0,5% + 0,1%) și cota Casei Sociale a Constructorilor — se trec la 5.2</li>';
  h+='<li>ℹ️ Bugetul proiectului trebuie să fie <b>corelat 1:1</b> cu devizul general și cu planul de achiziții — necorelarea este un motiv frecvent de clarificări la ETF</li>';
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

/* ============ views 2: matching, pipeline, calendar, CRM, bibliotecă, rapoarte, conformitate, intel, admin ============ */

/* ---------- Matching ---------- */
function vMatching(){ const cid=S.matchClient||((CL[0]||{}).id);
  let h='<div class="viewtitle"><h1>🎯 Matching & prioritizare</h1><span class="sub">motor în 2 trepte: criterii HARD (eliminatorii) + scor SOFT 0-100 · estimativ, nevalidat uman</span></div>';
  h+='<div class="grid2">';
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">Per client → top apeluri</h2><select style="width:100%;padding:7px;border:1px solid var(--grid);border-radius:8px;background:var(--page);color:var(--ink)" onchange="S.matchClient=this.value;render()">'+CL.map(c=>'<option value="'+c.id+'" '+(c.id===cid?"selected":"")+'>'+esc(c.denumire)+'</option>').join("")+'</select><div style="margin-top:10px" id="mcList">'+matchClientHtml(cid)+'</div></div>';
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">Per apel → top clienți</h2><select style="width:100%;padding:7px;border:1px solid var(--grid);border-radius:8px;background:var(--page);color:var(--ink)" onchange="S.matchApel=this.value;render()"><option value="">— alege apelul —</option>'+A.filter(a=>a.stare!=="in_evaluare").map(a=>'<option value="'+esc(a.id_apel)+'" '+(a.id_apel===S.matchApel?"selected":"")+'>'+esc(a.titlu.slice(0,70))+' ('+esc(a.program)+')</option>').join("")+'</select><div style="margin-top:10px">'+(S.matchApel?matchApelHtml(S.matchApel):'<div class="empty">Alege un apel pentru top clienți.</div>')+'</div></div>';
  h+='</div>';
  h+='<div class="callout" style="margin-top:14px"><b>Cum se citește:</b> NO-GO = un criteriu eliminatoriu pică pe datele existente. GO-COND. = nu pică nimic, dar rămân verificări obligatorii (minimis pe întreprindere unică, CAEN la locație, cofinanțare, ghid integral). Scorul ordonează prioritatea comercială — nu e punctaj ETF.</div>';
  return h; }
function matchClientHtml(cid){ const c=clientById(cid); if(!c) return "";
  const all=matchAll().filter(m=>m.client.id===cid).sort((x,y)=>y.scor-x.scor);
  const ok=all.filter(m=>!m.fails.length).slice(0,10);
  const bad=all.filter(m=>m.fails.length&&!m.fails.some(f=>/închis|expirat|persoane fizice/i.test(f))).slice(0,4);
  let h= ok.length? '<table class="tbl"><thead><tr><th>Apel</th><th>Termen</th><th>Verdict</th></tr></thead><tbody>'+ok.map(m=>'<tr onclick="openMemo(\''+cid+'\',\''+esc(m.apel.id_apel)+'\')"><td><b>'+esc(m.apel.titlu)+'</b><br><small style="color:var(--muted)">'+esc(m.apel.program)+'</small></td><td>'+cdBadge(m.apel.data_inchidere,{cont:/continuu/.test(m.apel.tip_depunere||"")})+'</td><td>'+vChip(m.verdict,m.scor)+'</td></tr>').join("")+'</tbody></table>' : '<div class="empty">Niciun apel eligibil pe datele curente.</div>';
  if(bad.length) h+='<details class="acc2" style="margin-top:10px"><summary>NO-GO relevante (gap analysis) — '+bad.length+'</summary><div class="inner">'+bad.map(m=>'<div style="margin-bottom:8px"><b>'+esc(m.apel.titlu)+'</b><br><small style="color:var(--critical)">'+m.fails.map(esc).join(" · ")+'</small></div>').join("")+'</div></details>';
  return h; }
function matchApelHtml(aid){ const tops=matchAll().filter(m=>m.apel.id_apel===aid).sort((x,y)=>y.scor-x.scor).slice(0,10);
  if(!tops.length) return '<div class="empty">—</div>';
  return '<table class="tbl"><thead><tr><th>Client</th><th>Verdict</th><th>Motiv principal</th></tr></thead><tbody>'+tops.map(m=>'<tr onclick="openMemo(\''+m.client.id+'\',\''+esc(aid)+'\')"><td><b>'+esc(m.client.denumire)+'</b><br><small style="color:var(--muted)">'+esc(m.client.judet||"")+'</small></td><td>'+vChip(m.verdict,m.scor)+'</td><td style="font-size:12px;color:var(--ink2)">'+esc(m.fails[0]||m.note[0]||"—")+'</td></tr>').join("")+'</tbody></table>'; }

/* ---------- Pipeline ---------- */
function vPipeline(){ const cols=Object.keys(FAZE);
  let h='<div class="viewtitle"><h1>📋 Pipeline proiecte</h1><span class="sub">'+PR.length+' proiecte · P0→P9</span></div>';
  const totG=PR.reduce((s,p)=>s+(p.grant_lei||0),0), totC=PR.reduce((s,p)=>s+comisionPrognozat(p),0);
  h+='<div class="tiles" style="margin-bottom:6px">';
  h+=tile(money(totG,"lei"),"Grant total în pipeline","toate fazele","acc","pipeline",null);
  h+=tile(money(Math.round(totC),"lei"),"Comisioane prognozate","ponderate cu probabilitatea fazei","","pipeline",null);
  h+=tile(PR.filter(p=>health(p)==="r").length,"Proiecte în roșu","termen depășit / apel aproape închis",PR.filter(p=>health(p)==="r").length?"crit":"","pipeline",null);
  h+='</div>';
  h+='<div class="kanban">'+cols.map(f=>{ const ps=PR.filter(p=>p.faza===f);
    return '<div class="kcol"><h3>'+f+' · '+esc(FAZE[f])+'<span>'+(ps.length||"")+'</span></h3>'+ps.map(p=>{const c=clientById(p.client_id);
      return '<div class="kcard" onclick="openProiect(\''+p.id+'\')"><div class="t"><span>'+esc(p.titlu)+'</span><span class="hdot '+health(p)+'"></span></div><div class="m">'+esc(c?c.denumire:"")+'</div><div class="m">grant <b>'+money(p.grant_lei,"lei")+'</b> · '+esc(p.consultant||"")+'</div>'+(p.next_action?'<div class="na">▸ '+esc(p.next_action.descriere.slice(0,80))+(p.next_action.descriere.length>80?"…":"")+'<br>'+cdBadge(p.next_action.termen)+'</div>':"")+'</div>';}).join("")+'</div>';}).join("")+'</div>';
  const mx=Math.max(...Object.keys(FAZE).map(f=>PR.filter(p=>p.faza===f).reduce((s,p)=>s+(p.grant_lei||0),0)),1);
  h+='<div class="card section"><h2 style="font-size:14px;margin-bottom:10px">Valoare grant pe fază</h2>'+Object.keys(FAZE).map(f=>{const v=PR.filter(p=>p.faza===f).reduce((s,p)=>s+(p.grant_lei||0),0); if(!v) return "";
    return '<div class="hbar"><span>'+f+' · '+esc(FAZE[f])+'</span><div class="trk"><div class="fil" style="width:'+Math.max(2,v/mx*100)+'%"></div></div><span class="vv">'+money(v,"lei")+'</span></div>';}).join("")+'<div style="font-size:11px;color:var(--muted);margin-top:6px">Reguli sănătate: 🔴 termen depășit sau apel se închide ≤7 zile în faza de pregătire · 🟡 next action ≤3 zile · SLA clarificări (P5): prioritate absolută, 3-5 zile.</div></div>';
  return h; }

/* ---------- Calendar ---------- */
function vCalendar(){ let h='<div class="viewtitle"><h1>📅 Calendar & termene</h1><span class="sub">închideri de apeluri + obligații proiecte (60 zile)</span><div class="viewactions"><button class="btn small '+(S.calMode==="lista"?"primary":"")+'" onclick="S.calMode=\'lista\';render()">listă</button><button class="btn small '+(S.calMode==="luna"?"primary":"")+'" onclick="S.calMode=\'luna\';render()">lună</button><button class="btn small" onclick="exportICS()">⬇ Export .ics (Google Calendar)</button></div></div>';
  h+= S.calMode==="lista"? calList() : calMonth();
  h+='<div class="callout" style="margin-top:12px">Praguri de alertă: T-30 / T-14 / T-7 / T-2 / T-0. Termenele de <b>clarificări</b> (3-5 zile lucrătoare) au întotdeauna prioritate absolută — nu apar aici decât dacă sunt înregistrate pe proiect.</div>';
  return h; }
function calList(){ const items=calItems(60); if(!items.length) return '<div class="empty">Nimic în 60 de zile.</div>';
  const wk={}; items.forEach(it=>{ const d=pd(it.data); const monday=new Date(d); monday.setDate(d.getDate()-((d.getDay()+6)%7)); const k=monday.toISOString().slice(0,10); (wk[k]=wk[k]||[]).push(it); });
  return Object.keys(wk).sort().map(k=>{ const m=pd(k); const end=new Date(m); end.setDate(m.getDate()+6);
    return '<div class="calweek"><h3>Săptămâna '+m.toLocaleDateString("ro-RO",{day:"numeric",month:"short"})+' – '+end.toLocaleDateString("ro-RO",{day:"numeric",month:"short"})+'</h3>'+wk[k].map(it=>'<div class="calit" style="cursor:pointer" onclick="'+(it.kind==="apel"?"openApel('"+esc(it.id)+"')":"openProiect('"+esc(it.id)+"')")+'"><span class="dt">'+fmtDs(it.data)+'</span><div style="flex:1"><span class="tp">'+esc(it.tip)+'</span><br><b>'+esc(it.titlu)+'</b>'+(it.sub?' <small style="color:var(--muted)">— '+esc(it.sub)+'</small>':"")+'</div>'+cdBadge(it.data)+'</div>').join("")+'</div>';}).join(""); }
function calMonth(){ const m=S.calMonth; const y=m.getFullYear(), mo=m.getMonth();
  const first=new Date(y,mo,1); const startIdx=(first.getDay()+6)%7; const dim=new Date(y,mo+1,0).getDate();
  const items=calItems(200); const byDate={}; items.forEach(it=>{(byDate[it.data]=byDate[it.data]||[]).push(it);});
  let h='<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><button class="btn small" onclick="S.calMonth=new Date('+y+','+(mo-1)+',1);render()">←</button><b style="min-width:150px;text-align:center">'+m.toLocaleDateString("ro-RO",{month:"long",year:"numeric"})+'</b><button class="btn small" onclick="S.calMonth=new Date('+y+','+(mo+1)+',1);render()">→</button></div>';
  h+='<div class="mgrid">'+["Lu","Ma","Mi","Jo","Vi","Sâ","Du"].map(d=>'<div class="dh">'+d+'</div>').join("");
  for(let i=0;i<startIdx;i++) h+='<div class="mcell dim"></div>';
  for(let d=1;d<=dim;d++){ const ds=y+"-"+String(mo+1).padStart(2,"0")+"-"+String(d).padStart(2,"0"); const its=byDate[ds]||[]; const isT=pd(ds).getTime()===TODAY.getTime();
    h+='<div class="mcell'+(isT?" today":"")+'"><span class="dn">'+d+'</span>'+its.slice(0,3).map(it=>'<span class="ev'+(it.crit?" crit":it.warn?" warn":"")+'" title="'+esc(it.tip+": "+it.titlu)+'" onclick="'+(it.kind==="apel"?"openApel('"+esc(it.id)+"')":"openProiect('"+esc(it.id)+"')")+'">'+esc(it.titlu.slice(0,22))+'</span>').join("")+(its.length>3?'<span style="color:var(--muted)">+'+(its.length-3)+'</span>':"")+'</div>'; }
  h+='</div>'; return h; }
function exportICS(){ const items=calItems(200);
  let ics="BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//CommandCenter//FonduriUE//RO\r\nCALSCALE:GREGORIAN\r\n";
  items.forEach((it,i)=>{ const d=(it.data||"").replace(/-/g,""); if(!d) return;
    ics+="BEGIN:VEVENT\r\nUID:cc-"+i+"-"+d+"@commandcenter\r\nDTSTART;VALUE=DATE:"+d+"\r\nSUMMARY:"+icsEsc("["+it.tip+"] "+it.titlu)+"\r\nDESCRIPTION:"+icsEsc((it.sub||"")+" — generat de EU Funds Command Center")+"\r\nEND:VEVENT\r\n"; });
  ics+="END:VCALENDAR\r\n";
  dl("command-center-termene.ics", ics, "text/calendar"); toast("Fișier .ics generat"); }
function icsEsc(s){ return String(s).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n"); }
function dl(name, content, mime){ const b=new Blob([content],{type:mime||"text/plain;charset=utf-8"}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(u),4000); }

/* ---------- Clienți ---------- */
function vClienti(){ let h='<div class="viewtitle"><h1>👥 CRM clienți</h1><span class="sub">'+CL.length+' clienți'+((DB.clienti||{}).nota?" · date DEMO":"")+'</span><div class="viewactions"><button class="btn small" onclick="toast(\'Trimite-mi în conversație fișierul Excel/CSV cu clienții și îl import aici.\')">➕ Import listă reală</button></div></div>';
  if((DB.clienti||{}).nota) h+='<div class="callout warn">'+esc(DB.clienti.nota)+'</div>';
  h+='<div class="grid3">'+CL.map(c=>{ const df=c.date_financiare||{}; const neg=df.capitaluri_proprii_lei!=null&&df.capitaluri_proprii_lei<0;
    const tops=topForClient(c.id,1)[0];
    return '<div class="card" style="cursor:pointer" onclick="openClient(\''+c.id+'\')"><div style="display:flex;justify-content:space-between;gap:8px"><b>'+esc(c.denumire)+'</b>'+(c.demo?'<span class="tag-demo">DEMO</span>':"")+'</div><div style="color:var(--muted);font-size:12px;margin:2px 0 8px">'+esc((c.dimensiune||c.tip||"")+" · "+(c.judet||"")+" ("+(c.regiune||"")+")")+'</div>'+
    (neg?'<div style="margin-bottom:6px"><span class="cd cd-crit">⚠ capitaluri negative</span></div>':"")+(c.datorii_fiscale?'<div style="margin-bottom:6px"><span class="cd cd-warn">datorii fiscale</span></div>':"")+
    (c.tip!=="UAT"&&c.plafon_minimis_eur!=null?'<div style="font-size:12px;color:var(--ink2)">minimis disponibil: <b>'+money(c.plafon_minimis_eur,"EUR")+'</b></div>':"")+
    (tops?'<div style="font-size:12px;margin-top:6px">🎯 '+esc(tops.apel.titlu.slice(0,48))+'… <b>'+tops.scor+'</b></div>':'<div style="font-size:12px;margin-top:6px;color:var(--muted)">fără potriviri active</div>')+
    '<div style="margin-top:8px">'+(PR.filter(p=>p.client_id===c.id).length?'<span class="chip hl">'+PR.filter(p=>p.client_id===c.id).length+' proiect(e)</span>':'<span class="chip">prospect pipeline</span>')+'</div></div>';}).join("")+'</div>';
  return h; }

/* ---------- Bibliotecă ---------- */
const SABLOANE={
 "L1 — Fișă apel":"FIȘĂ APEL (L1)\nProgram/Administrator: …\nTitlu + cod: …\nStatus + termene (deschidere/închidere, tip depunere): …\nBeneficiari eligibili: …\nRegiuni/județe: …\nBuget apel / grant min-max / intensitate: …\nTip ajutor (minimis/GBER): …\nCheltuieli eligibile (sumar): …\nCondiții-cheie de eligibilitate (top 5-8): …\nCriterii de punctaj decisive (din grilă): …\nDocumente necesare la depunere: …\nDurabilitate: …\nPlatformă depunere: …\nLinkuri (anunț, ghid + versiune): …\nPentru cine din portofoliu: …\nExtras la: …",
 "L2 — Alertă":"[SEVERITATE] Tip eveniment\nCe s-a întâmplat (1 frază): …\nCine e afectat (clienți/proiecte): …\nAcțiune cerută + termen: …\nLink sursă: …",
 "L3 — Memo GO/NO-GO":"MEMO GO/NO-GO\nClient × Apel: …\nVerdict: GO / GO-CONDIȚIONAT / NO-GO\nCriterii HARD: tabel criteriu → îndeplinit? → proba/sursa\nMinimis: plafon grup disponibil: …\nPunctaj ETF estimat (interval pesimist-realist) vs prag: …\nGap-uri + remedii + termene: …\nValoare pentru firmă (grant, comision estimat): …\nRecomandare + următorii pași: …\nSemnat: A2, data · Validat: [om]",
 "L4 — Raport săptămânal":"RAPORT SĂPTĂMÂNAL INTERN\nNoutăți radar (apeluri noi/corrigende/închideri apropiate): …\nPipeline: mișcări pe faze + valoare: …\nTermenele săptămânii (proiect, termen, responsabil): …\nRiscuri deschise (top 5, cu corecție potențială): …\nÎncărcare echipă: …\nDecizii cerute de la management: …",
 "L5 — Raport client":"RAPORT CLIENT (limbaj simplu)\nUnde suntem (fază + ce înseamnă): …\nCe am făcut luna aceasta: …\nCifre (contractat / depus la decont / încasat): …\nCe urmează + când: …\nCE AVEM NEVOIE DE LA DVS. (listă cu termene): …\nContact: …",
 "L6 — Raport constatări (A9)":"RAPORT DE CONSTATĂRI — audit intern\nObiect auditat / versiune / data: …\nVerdict general: SE POATE DEPUNE: DA/NU\nPer constatare: [BLOCANT/MAJOR/MINOR] · descriere + proba (document, pagină) · norma încălcată (act, articol) · consecința potențială (respingere / corecție X% ≈ Y lei) · recomandare + responsabil + termen",
 "L7 — Checklist cerere de rambursare":"CHECKLIST CR\nPer categorie de cheltuieli × documente cerute × prezent/lipsă/observații\nSemnături necesare: diriginte, RTE, contabil, auditor (unde e cerut)\nVerificări finale: sume CR = documente = evidența analitică · publicitate probată foto · dosare achiziții atașate"
};
function vBiblioteca(){ const ghid=A.filter(a=>a.url_ghid);
  let h='<div class="viewtitle"><h1>📚 Bibliotecă ghiduri & șabloane</h1><span class="sub">ghiduri per apel · versiuni & corrigende · șabloane L1–L7</span></div>';
  h+='<div class="section"><h2>Corrigende detectate</h2>';
  const corr=A.filter(a=>a.corrigendum);
  h+= corr.length? corr.map(a=>'<div class="calit" style="cursor:pointer" onclick="openApel(\''+esc(a.id_apel)+'\')"><span class="dt">24.07</span><div style="flex:1"><span class="tp">corrigendum</span><br><b>'+esc(a.titlu)+'</b><br><small style="color:var(--ink2)">'+esc(a.note||"")+'</small></div><span class="cd cd-warn">⚠</span></div>').join("") : '<div class="empty">Niciun corrigendum activ.</div>';
  h+='</div>';
  h+='<div class="section"><h2>Ghiduri disponibile (din radar)</h2><div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Apel</th><th>Ghid</th><th>Stare</th></tr></thead><tbody>'+ghid.map(a=>'<tr><td><b>'+esc(a.titlu)+'</b><br><small style="color:var(--muted)">'+esc(a.program)+'</small></td><td><a href="'+esc(a.url_ghid)+'" target="_blank">deschide ghidul ↗</a></td><td>'+stB(a.stare)+'</td></tr>').join("")+'</tbody></table></div><div class="callout" style="margin-top:8px">Pentru apelurile pe care lucrează firma: descarcă PDF-ul ghidului, atașează-l în conversația Claude și cere „Q&A pe ghid" — răspunsurile vor cita pagina/secțiunea, niciodată din memorie.</div></div>';
  h+='<div class="section"><h2>Șabloane L1–L7 (formate obligatorii)</h2>'+Object.keys(SABLOANE).map(k=>'<details class="acc2"><summary>'+esc(k)+'</summary><div class="inner"><div class="copybox">'+esc(SABLOANE[k])+'</div><button class="btn small" style="margin-top:8px" onclick="copyTxt(SABLOANE[\''+k.replace(/'/g,"\\'")+'\'],\'Șablon copiat\')">📋 copiază</button></div></details>').join("")+'</div>';
  return h; }

/* ---------- Rapoarte ---------- */
function vRapoarte(){ const rc=S.repClient;
  let h='<div class="viewtitle"><h1>📊 Centru de rapoarte</h1><span class="sub">generate din datele la zi — de validat uman înainte de trimitere</span></div>';
  h+='<div class="grid2"><div class="card"><h2 style="font-size:14px;margin-bottom:8px">Raport săptămânal intern (L4)</h2><div class="copybox" id="repL4">'+esc(raportL4())+'</div><button class="btn small primary" style="margin-top:8px" onclick="copyTxt(raportL4(),\'Raport L4 copiat\')">📋 copiază</button></div>';
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">Raport per client (L5)</h2><select style="width:100%;padding:7px;border:1px solid var(--grid);border-radius:8px;background:var(--page);color:var(--ink)" onchange="S.repClient=this.value;render()">'+CL.map(c=>'<option value="'+c.id+'" '+(c.id===rc?"selected":"")+'>'+esc(c.denumire)+'</option>').join("")+'</select><div class="copybox" style="margin-top:8px">'+esc(raportL5(rc))+'</div><button class="btn small primary" style="margin-top:8px" onclick="copyTxt(raportL5(S.repClient),\'Raport client copiat\')">📋 copiază</button></div></div>';
  h+='<div class="section card"><h2 style="font-size:14px;margin-bottom:10px">KPI de operare (K2) — luna curentă</h2><table class="tbl"><thead><tr><th>Indicator</th><th>Valoare</th><th>Țintă</th></tr></thead><tbody>'+
  [["Timp detectare apel nou → alertă","prima scanare: aceeași zi","aceeași zi lucrătoare"],
   ["Surse monitorizate funcționale",SURSE.filter(s=>s.stare==="ok").length+" / "+SURSE.length+" (multe gov.ro blocate din datacenter)","100% acoperite (direct sau prin proxy)"],
   ["Corrigende detectate întâi de radar","1 / 1 (PTJ parcuri industriale)","100%"],
   ["Clarificări răspunse în termen","— (nicio clarificare activă)","100%"],
   ["CR autorizate fără tăieri","1 / 1 (CR2 PRJ-007, demo)",">95% din valoare"],
   ["Corecții financiare suferite","0 lei","0 lei"],
   ["Termene ratate","0","0"],
   ["Valoare pipeline (grant)",money(PR.reduce((s,p)=>s+(p.grant_lei||0),0),"lei"),"↑"]].map(r=>'<tr><td>'+r[0]+'</td><td><b>'+r[1]+'</b></td><td style="color:var(--muted)">'+r[2]+'</td></tr>').join("")+'</tbody></table></div>';
  return h; }
function raportL4(){ const d=new Date().toLocaleDateString("ro-RO"); const cl7=A.filter(a=>{const x=days(a.data_inchidere);return x!=null&&x>=0&&x<=7;});
  const items=calItems(7);
  let t="RAPORT SĂPTĂMÂNAL INTERN — "+d+"\n\n1) NOUTĂȚI RADAR\n• Registru: "+A.length+" apeluri ("+A.filter(a=>a.stare==="activ").length+" active, "+A.filter(a=>a.stare==="planificat").length+" planificate, "+A.filter(a=>a.stare==="consultare").length+" în consultare)\n• Corrigende: PTJ Parcuri industriale — termen prelungit la 28.09.2026 (Ordin MIPE 1204/2026)\n• Închideri ≤7 zile: "+(cl7.map(a=>a.titlu+" ("+fmtDs(a.data_inchidere)+")").join("; ")||"—")+"\n\n2) PIPELINE\n";
  Object.keys(FAZE).forEach(f=>{ const ps=PR.filter(p=>p.faza===f); if(ps.length) t+="• "+f+" "+FAZE[f]+": "+ps.length+" proiect(e), grant "+money(ps.reduce((s,p)=>s+(p.grant_lei||0),0),"lei")+"\n"; });
  t+="\n3) TERMENELE SĂPTĂMÂNII\n"+(items.map(i=>"• "+fmtDs(i.data)+" — ["+i.tip+"] "+i.titlu).join("\n")||"—");
  t+="\n\n4) RISCURI DESCHISE (top)\n"+RISCURI.slice(0,5).map(r=>"• ["+r.sev+"] "+r.risc+" → expunere: "+r.expunere).join("\n");
  t+="\n\n5) DECIZII CERUTE\n• GO/NO-GO Panificație Siret × Schema energie AFIR (până 4.08)\n• Aprobarea listei de clienți pentru pregătirea PR NE micro Apel 2\n\nGenerat automat de Command Center — de validat înainte de difuzare.";
  return t; }
function raportL5(cid){ const c=clientById(cid); if(!c) return "";
  const ps=PR.filter(p=>p.client_id===cid);
  let t="RAPORT DE STADIU — "+c.denumire+" — "+new Date().toLocaleDateString("ro-RO")+"\n\n";
  if(!ps.length){ t+="Nu există proiecte active. Oportunități identificate:\n"+topForClient(cid,3).map(m=>"• "+m.apel.titlu+" ("+m.apel.program+") — termen "+(m.apel.data_inchidere?fmtD(m.apel.data_inchidere):"nelansat încă")).join("\n"); }
  ps.forEach(p=>{ t+="▶ "+p.titlu+"\nUnde suntem: faza "+p.faza+" — "+FAZE[p.faza]+".\nGrant: "+money(p.grant_lei,"lei")+" (contribuția dvs.: "+money(p.cofinantare_lei,"lei")+").\nCe urmează: "+(p.next_action?p.next_action.descriere+" — până la "+fmtD(p.next_action.termen):"—")+".\n\n"; });
  t+="CE AVEM NEVOIE DE LA DVS.:\n"+(ps.some(p=>p.next_action)? ps.filter(p=>p.next_action).map(p=>"• ["+fmtDs(p.next_action.termen)+"] "+p.next_action.descriere).join("\n") : "• nimic momentan")+"\n\nCu stimă,\n[Consultant] — draft generat automat, DE VALIDAT înainte de trimitere.";
  return t; }

/* ---------- Conformitate ---------- */
const RISCURI=[
 {proiect:"PRJ-004",sev:"MAJOR",cat:"achiziții",risc:"Licitația de lucrări pentru parcul industrial — criterii restrictive sau modificări substanțiale de contract",expunere:"corecție 25% ≈ 16,1 mil lei",masura:"expert achiziții + verificare ANAP înainte de publicare; fără mărci fără «sau echivalent»",resp:"Consultant 3"},
 {proiect:"PRJ-002",sev:"MAJOR",cat:"termene",risc:"Fereastră de depunere foarte scurtă (închidere 14.08) — risc dosar incomplet",expunere:"pierderea finanțării (nedepunere)",masura:"decizie GO/NO-GO 4.08; listă documente cu responsabili pe zile",resp:"Consultant 2"},
 {proiect:"PRJ-007",sev:"MINOR",cat:"publicitate",risc:"Autocolante lipsă pe echipamentele achiziționate",expunere:"corecție până la 3% ≈ 35.400 lei",masura:"foto-audit la vizita din 4.09 + comandă autocolante 150×150mm",resp:"Consultant 3"},
 {proiect:"PRJ-005",sev:"MAJOR",cat:"termene",risc:"Clarificare CAE cu termen 3-5 zile în perioada concediilor",expunere:"respingere administrativă",masura:"monitorizare zilnică MySMIS + backup consultant desemnat",resp:"Consultant 2"},
 {proiect:"PRJ-003",sev:"MINOR",cat:"eligibilitate",risc:"Plafon minimis pe întreprinderea unică (2 firme legate) insuficient verificat",expunere:"respingere la CAE / recuperare ajutor",masura:"interogare RegAS + declarații pe propria răspundere pe TOT grupul",resp:"Consultant 1"}];
function vConformitate(){ const r=REF;
  let h='<div class="viewtitle"><h1>🛡️ Conformitate & audit</h1><span class="sub">referențial D5 · valori la 30.07.2026 · elementele ⏳ se reverifică periodic</span></div>';
  h+='<div class="section"><h2>Registru de riscuri (proiecte active)</h2><div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Proiect</th><th>Sev.</th><th>Risc</th><th>Expunere potențială</th><th>Măsură</th></tr></thead><tbody>'+RISCURI.map(x=>'<tr onclick="openProiect(\''+x.proiect+'\')"><td>'+x.proiect+'</td><td><span class="cd '+(x.sev==="MAJOR"?"cd-crit":"cd-warn")+'">'+x.sev+'</span></td><td>'+esc(x.risc)+'</td><td><b>'+esc(x.expunere)+'</b></td><td style="font-size:12px">'+esc(x.masura)+'</td></tr>').join("")+'</tbody></table></div></div>';
  h+='<div class="grid2 section"><div class="card"><h2 style="font-size:14px;margin-bottom:8px">Simulator minimis (întreprindere unică)</h2><select id="msClient" style="width:100%;padding:7px;border:1px solid var(--grid);border-radius:8px;background:var(--page);color:var(--ink)" onchange="msRender()">'+CL.filter(c=>c.tip!=="UAT").map(c=>'<option value="'+c.id+'">'+esc(c.denumire)+'</option>').join("")+'</select><div id="msBox" style="margin-top:10px"></div><div class="callout warn" style="margin-top:8px">Plafon 300.000 EUR / orice 3 ani (glisant) / <b>întreprindere unică</b> — tot grupul legat. Verificarea finală: RegAS + declarații. Interzis: minimis pentru vehicule de transport marfă.</div></div>';
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">Intensități GBER pe județ (harta 2022-2027)</h2><select id="gberJud" style="width:100%;padding:7px;border:1px solid var(--grid);border-radius:8px;background:var(--page);color:var(--ink)" onchange="gberRender()"><option value="">— alege județul —</option>'+gberAllJud().map(j=>'<option>'+j+'</option>').join("")+'</select><div id="gberBox" style="margin-top:10px" class="empty">Alege județul pentru intensitatea maximă.</div><div style="font-size:11.5px;color:var(--muted);margin-top:8px">Bonus IMM: +20pp micro/mici, +10pp mijlocii (≤50 mil EUR) · +10pp în teritorii de tranziție justă · Efect stimulativ: depunere ÎNAINTE de începerea lucrărilor.</div></div></div>';
  h+='<div class="section"><h2>Scala corecțiilor financiare (OUG 66/2011 + HG 519/2014)</h2><div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Abatere</th><th>Corecție</th><th>Normă</th></tr></thead><tbody>'+(r.corectii_oug66||[]).map(c=>'<tr><td>'+esc(c.abatere)+'</td><td><b style="color:var(--critical)">'+esc(c.corectie)+'</b></td><td style="color:var(--muted);font-size:12px">'+esc(c.norma)+'</td></tr>').join("")+'</tbody></table></div></div>';
  const pa=(r.praguri_achizitii_2026||{});
  h+='<div class="grid2 section"><div class="card"><h2 style="font-size:14px;margin-bottom:8px">Praguri achiziții 2026 ⏳</h2><ul class="list">'+
   '<li>Publici — achiziție directă: <b>'+nf.format((pa.publici||{}).achizitie_directa_produse_servicii_lei||0)+' lei</b> (produse/servicii) · <b>'+nf.format((pa.publici||{}).achizitie_directa_lucrari_lei||0)+' lei</b> (lucrări)</li>'+
   '<li>Licitație JOUE lucrări: <b>'+nf.format((pa.publici||{}).licitatie_JOUE_lucrari_lei||0)+' lei</b>; produse/servicii: '+nf.format((pa.publici||{}).licitatie_JOUE_produse_servicii_centrale_lei||0)+' / '+nf.format((pa.publici||{}).licitatie_JOUE_produse_servicii_locale_lei||0)+' lei</li>'+
   '<li>Între praguri: '+esc((pa.publici||{}).intre_praguri||"")+'</li>'+
   '<li><b>Privați (Ordin 1284/2016):</b> '+((pa.privati_ordin_1284_2016||{}).pasi||[]).map(esc).join(" → ")+'</li>'+
   '<li style="color:var(--critical)">Sancțiuni: '+esc((pa.privati_ordin_1284_2016||{}).sanctiuni||"")+'</li></ul></div>';
  const ff=r.fluxuri_financiare_oug133||{};
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">Fluxuri financiare (OUG 133/2021)</h2><ul class="list"><li><b>Prefinanțare:</b> '+esc(ff.prefinantare||"")+'</li><li><b>Cerere de plată:</b> '+esc(ff.cerere_plata||"")+'</li><li><b>Cerere de rambursare:</b> '+esc(ff.cerere_rambursare||"")+'</li><li><b>TVA:</b> '+esc(ff.tva||"")+'</li></ul></div></div>';
  h+='<div class="grid2 section"><div class="card"><h2 style="font-size:14px;margin-bottom:8px">Checklist pre-depunere (simulare CAE)</h2>'+ckList("cae",r.checklist_pre_depunere_cae||[])+'</div>';
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">Checklist cerere de rambursare</h2>'+Object.entries(r.checklist_cerere_rambursare||{}).map(([k,items])=>'<b style="font-size:12px;text-transform:uppercase;color:var(--muted)">'+esc(k)+'</b>'+ckList("cr_"+k,items)).join("")+'</div></div>';
  h+='<div class="grid2 section"><div class="card"><h2 style="font-size:14px;margin-bottom:8px">Durabilitate & arhivare</h2><ul class="list"><li><b>Durabilitate:</b> '+esc((r.durabilitate||{}).regula||"")+'<br><small style="color:var(--critical)">'+esc((r.durabilitate||{}).riscuri||"")+'</small></li><li><b>Arhivare:</b> '+esc((r.arhivare||{}).regula||"")+'</li><li><b>Publicitate:</b> '+((r.publicitate_2021_2027||{}).obligatorii||[]).map(esc).join(" · ")+' — sancțiune: '+esc((r.publicitate_2021_2027||{}).sanctiune||"")+'</li></ul></div>';
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">Conflict de interese (art. 14-15 OUG 66/2011)</h2><div class="callout crit">Corecție <b>100% + posibilă sesizare penală</b>. Înainte de ORICE atribuire: încrucișează asociații/administratorii clientului (+ rude/afini) cu ofertanții. Suprapunere → STOP + escaladare la om.</div><div style="font-size:12.5px;color:var(--ink2)">Verificare automată: se activează când CRM-ul conține și datele furnizorilor/ofertanților (import dosare achiziții). Până atunci: verificare manuală pe ONRC + declarații.</div></div></div>';
  h+='<div class="callout" style="margin-top:12px">'+esc((r.pnrr_inchidere||{})["⏳"]||"")+'</div>';
  return h; }
function ckList(key,items){ const st=S.checklists[key]=S.checklists[key]||{};
  return '<ul class="list">'+items.map((it,i)=>'<li style="cursor:pointer" onclick="ckTg(\''+key+'\','+i+')"><span>'+(st[i]?"✅":"⬜")+'</span> <span style="'+(st[i]?"color:var(--muted);text-decoration:line-through":"")+'">'+esc(it)+'</span></li>').join("")+'</ul>'; }
function ckTg(key,i){ const st=S.checklists[key]=S.checklists[key]||{}; st[i]=!st[i]; render(); }
function gberAllJud(){ const g=REF.gber_harta_2022_2027||{}; return [].concat(g["60_pct"]||[],g["50_pct"]||[],g["40_pct"]||[],g["30_pct"]||[],["Ilfov","București"]).sort(); }
function gberRender(){ const j=$("#gberJud").value; const g=REF.gber_harta_2022_2027||{}; const box=$("#gberBox"); if(!j){box.innerHTML="";return;}
  let base=null; if((g["60_pct"]||[]).includes(j))base=60; else if((g["50_pct"]||[]).includes(j))base=50; else if((g["40_pct"]||[]).includes(j))base=40; else if((g["30_pct"]||[]).includes(j))base=30;
  let sp=(g.special||{})[j];
  const ptj=["Gorj","Hunedoara","Dolj","Galați","Prahova","Mureș"].includes(j);
  box.innerHTML='<div class="tiles" style="grid-template-columns:repeat(3,1fr)">'+
   '<div class="tile"><div class="v">'+(sp?esc(sp):base+"%")+'</div><div class="l">întreprinderi mari</div></div>'+
   (base?'<div class="tile acc"><div class="v">'+Math.min(75,base+10)+'%</div><div class="l">mijlocii (+10pp)</div></div><div class="tile acc"><div class="v">'+Math.min(75,base+20)+'%</div><div class="l">micro & mici (+20pp)</div></div>':"")+'</div>'+
   (ptj?'<div class="callout warn" style="margin-top:8px">Județ de <b>tranziție justă</b>: potențial +10pp în teritoriile PTJ desemnate + apeluri PTJ dedicate.</div>':"");
}
function msRender(){ const sel=$("#msClient"); if(!sel) return; const c=clientById(sel.value); if(!c) return;
  const used=(c.ajutoare_minimis||[]).reduce((s,x)=>s+(x.suma_eur||0),0);
  const extra=S.minisim[c.id]||0; const rem=300000-used-extra;
  $("#msBox").innerHTML='<div class="minibar" style="height:14px"><span style="width:'+Math.min(100,(used)/3000)+'%;background:var(--s2)"></span><span style="left:'+Math.min(100,used/3000)+'%;width:'+Math.min(100-used/3000,extra/3000)+'%;background:var(--s4)"></span></div>'+
  '<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:5px"><span>utilizat: <b>'+money(used,"EUR")+'</b></span><span>simulat: <b>'+money(extra,"EUR")+'</b></span><span>rămas: <b style="color:'+(rem<0?"var(--critical)":"var(--good-text)")+'">'+money(rem,"EUR")+'</b></span></div>'+
  '<div style="margin-top:8px;display:flex;gap:8px;align-items:center"><input type="number" id="msVal" placeholder="grant nou simulat (EUR)" style="flex:1;padding:6px;border:1px solid var(--grid);border-radius:7px;background:var(--page);color:var(--ink)" value="'+(extra||"")+'"><button class="btn small" onclick="S.minisim[\''+c.id+'\']=parseFloat($(\'#msVal\').value)||0;msRender()">simulează</button></div>'+
  ((c.intreprinderi_legate||[]).length?'<div class="callout warn" style="margin-top:8px">Întreprinderi legate: '+esc(c.intreprinderi_legate.join("; "))+' — plafonul se calculează pe TOT grupul.</div>':"")+
  (rem<0?'<div class="callout crit" style="margin-top:8px">DEPĂȘIRE PLAFON cu '+money(-rem,"EUR")+' — grantul simulat nu încape în minimis. Caută schemă GBER sau reduce valoarea.</div>':"");
}
function after_conformitate(){ msRender(); }

/* ---------- Market Intel ---------- */
function vIntel(){ let h='<div class="viewtitle"><h1>🔎 Market intelligence</h1><span class="sub">prospectare pe date deschise — flux lunar W10</span></div>';
  h+='<div class="grid2"><div class="card"><h2 style="font-size:14px;margin-bottom:8px">Surse de prospectare</h2><ul class="list">'+
  '<li>📊 <b>data.gov.ro «Proiecte contractate»</b> (MIPE, XLSX) — cine a contractat, pe ce program → firme «educate» = prospecți calzi. <a href="https://data.europa.eu/data/datasets?catalog=data-gov-ro&query=proiecte%20contractate" target="_blank">oglinda data.europa.eu ↗</a></li>'+
  '<li>🗺 <b>Kohesio</b> — operațiunile de coeziune pe județ/localitate. <a href="https://kohesio.ec.europa.eu/ro/" target="_blank">kohesio.ec.europa.eu ↗</a></li>'+
  '<li>🏛 <b>RegAS</b> — ajutoarele primite de o firmă (verificare minimis). <a href="https://regas.consiliulconcurentei.ro/transparenta/" target="_blank">regas ↗</a></li>'+
  '<li>🧾 <b>ANAF API</b> — status TVA/inactivitate pentru îmbogățirea CRM.</li></ul>'+
  '<div class="callout" style="margin-top:8px">Activare: cere în Claude «rulează W10 market intelligence» — descarcă seturile, încrucișează cu CAEN/județele țintă și scoate liste de prospecți.</div></div>';
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">Piste imediate (din radarul de azi)</h2><ul class="list">'+
  '<li>🎯 <b>Județele PTJ</b> (Gorj, Hunedoara, Dolj, Galați, Prahova, Mureș): val de apeluri + STEP pentru IMM în nov. 2026 — cartografiază UAT-urile fără proiecte PTJ depuse («piață albă») și micii producători industriali.</li>'+
  '<li>🌱 <b>SEE/Norvegiene</b>: ~110 mil EUR dezvoltare locală (FRDS) — pregătește oferte pentru UAT-urile mici înainte de lansare.</li>'+
  '<li>⚡ <b>Schema energie AFIR</b> + FM: firmele agroalimentare cu consum mare de energie = prospecți dubli (AFIR acum, FM stocare în sept).</li>'+
  '<li>🏭 <b>PR NE micro Apel 2</b> (20,4 mil EUR, lansare așteptată): microîntreprinderile urbane din NE cu CA în creștere — campanie de contact în august.</li></ul></div></div>';
  return h; }

/* ---------- Administrare ---------- */
function vAdmin(){ const stMap={ok:["cd-good","OK"],acoperit:["cd-good","ACOPERIT ↔"],partial:["cd-warn","PARȚIAL"],problema:["cd-crit","PROBLEMĂ"],blocat_ip:["cd-crit","BLOCAT IP"],indisponibil_metoda:["cd-warn","POST-only"],nu_se_acceseaza:["cd-off","NU SE ACCESEAZĂ"],neverificat_azi:["cd-off","NEVERIFICAT"]};
  let h='<div class="viewtitle"><h1>⚙️ Administrare</h1><span class="sub">surse · date · actualizare</span></div>';
  h+='<div class="callout good"><b>Cum se actualizează dashboard-ul:</b> cere în conversația Claude «<b>scanare radar</b>» (sau așteaptă scanarea zilnică programată) → datele noi se injectează și artefactul se republică. Poți importa/exporta manual stratul de date mai jos.</div>';
  if((DB.surse||{}).nota) h+='<div class="callout warn">'+esc(DB.surse.nota)+'</div>';
  /* acoperire efectivă: OK direct + acoperite prin oglindă care funcționează */
  const cov=SURSE.reduce((a,s)=>{ if(s.stare==="ok")a.ok++; else if(s.stare==="acoperit")a.cov++; else if(s.stare==="partial")a.part++; else a.gap++; return a; },{ok:0,cov:0,part:0,gap:0});
  const efectiv=cov.ok+cov.cov; const pct=Math.round(efectiv/SURSE.length*100);
  h+='<div class="tiles">'
    +tile(cov.ok,"OK direct","surse accesibile în sesiune","acc","admin",null)
    +tile(cov.cov,"Acoperite ↔","primar blocat, date via oglindă OK","acc","admin",null)
    +tile(efectiv+"/"+SURSE.length,"Acoperire efectivă",pct+"% din surse","",  "admin",null)
    +tile(cov.part,"Parțiale","semnal limitat — de verificat","warnv","admin",null)
    +tile(cov.gap,"Blocate / goluri","doar via browser propriu / VPS RO",cov.gap?"crit":"","admin",null)
    +'</div>';
  h+='<div class="section"><h2>Registrul surselor monitorizate ('+SURSE.length+')</h2><div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Sursă</th><th>Mecanism</th><th>Stare</th><th>Observații</th></tr></thead><tbody>'+SURSE.map(s=>{const m=stMap[s.stare]||["cd-off",s.stare];
   const ap=s.acoperit_prin?'<br><span style="color:var(--good-text)">↳ acoperit prin: '+esc(s.acoperit_prin)+'</span>':"";
   return '<tr><td><b>'+esc(s.nume)+'</b><br><a href="'+esc(s.url)+'" target="_blank" style="font-size:11px">'+esc(s.url.slice(0,58))+'…</a></td><td style="font-size:12px">'+esc(s.mecanism)+'</td><td><span class="cd '+m[0]+'">'+m[1]+'</span></td><td style="font-size:12px;color:var(--ink2)">'+esc(s.observatii||"")+ap+'</td></tr>';}).join("")+'</tbody></table></div></div>';
  h+='<div class="grid2 section"><div class="card"><h2 style="font-size:14px;margin-bottom:8px">Export date (JSON)</h2><p style="font-size:12.5px;color:var(--ink2);margin-bottom:8px">Descarcă stratul de date complet (apeluri, clienți, proiecte, surse) — backup sau editare externă.</p><button class="btn primary" onclick="dl(\'command-center-data.json\',JSON.stringify(DB,null,2),\'application/json\');toast(\'Export generat\')">⬇ Exportă datele</button></div>';
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">Import date (JSON)</h2><p style="font-size:12.5px;color:var(--ink2);margin-bottom:8px">Lipește un JSON cu aceeași structură (sau doar {"apeluri":{...}}) și aplică — interfața se reconstruiește pe noile date (în memorie; pentru persistență, cere republicarea artefactului în Claude).</p><textarea class="jsonio" id="ioTxt" placeholder=\'{"apeluri":{"apeluri":[...]}}\'></textarea><div style="margin-top:8px"><button class="btn primary" onclick="ioImport()">⬆ Aplică importul</button></div></div></div>';
  h+='<div class="section card"><h2 style="font-size:14px;margin-bottom:8px">Jurnal & praguri</h2><dl class="kv"><dt>Versiune dashboard</dt><dd>'+esc(META.versiune||"1.0")+'</dd><dt>Generat la</dt><dd>'+esc(META.generat_la||"")+'</dd><dt>Radar extras la</dt><dd>'+esc((DB.apeluri||{}).extras_la||"")+'</dd><dt>Praguri countdown</dt><dd>&gt;30 zile verde · 8-30 portocaliu · ≤7 roșu</dd><dt>Alerte T</dt><dd>T-30 / T-14 / T-7 / T-2 / T-0</dd><dt>Prag intern depunere</dt><dd>'+esc((META.praguri_alerte||{}).prag_depunere_intern||"")+'</dd><dt>Segmente configurate</dt><dd>'+((META.firma||{}).segmente||[]).map(s=>'<span class="chip hl">'+esc(s)+'</span>').join("")+' · '+esc((META.firma||{}).acoperire||"")+'</dd></dl></div>';
  h+='<div class="callout" style="margin-top:12px">Reguli de operare: adevărul are URL · datele au timestamp · HITL obligatoriu la depuneri/trimiteri · separarea puterilor (A9 auditează separat) · nu se ocolesc protecțiile anti-bot (MySMIS).</div>';
  return h; }
function ioImport(){ try{ const t=$("#ioTxt").value.trim(); if(!t){toast("Nimic de importat");return;}
  const obj=JSON.parse(t); Object.keys(obj).forEach(k=>{ DB[k]=obj[k]; }); MATCH=null;
  location.hash="#imported"; toast("Date aplicate — reconstruiesc interfața"); setTimeout(()=>{ window.__reboot(); },300);
 }catch(e){ toast("JSON invalid: "+e.message); } }

/* ---------- global search ---------- */
function buildIndex(){ const ix=[];
  A.forEach(a=>ix.push({k:"apel",id:a.id_apel,l:a.titlu,s:a.program}));
  CL.forEach(c=>ix.push({k:"client",id:c.id,l:c.denumire,s:(c.judet||"")+" · "+(c.dimensiune||c.tip||"")}));
  PR.forEach(p=>ix.push({k:"proiect",id:p.id,l:p.titlu,s:p.faza}));
  return ix; }
let IX=null;
function doSearch(q){ IX=IX||buildIndex(); q=q.toLowerCase();
  return IX.filter(x=>(x.l+" "+x.s).toLowerCase().includes(q)).slice(0,10); }
function hookSearch(){ const inp=$("#globalSearch"), box=$("#searchHits");
  inp.addEventListener("input",()=>{ const q=inp.value.trim(); if(q.length<2){box.classList.remove("open");return;}
    const hits=doSearch(q); box.innerHTML=hits.map(h=>'<div class="hit" data-k="'+h.k+'" data-id="'+esc(h.id)+'"><span class="k">'+h.k+'</span> · <b>'+esc(h.l)+'</b> <small style="color:var(--muted)">'+esc(h.s)+'</small></div>').join("")||'<div class="hit">niciun rezultat</div>';
    box.classList.add("open");
    box.querySelectorAll(".hit").forEach(el=>el.onclick=()=>{ const k=el.dataset.k,id=el.dataset.id; box.classList.remove("open"); inp.value="";
      if(k==="apel")openApel(id); else if(k==="client")openClient(id); else if(k==="proiect")openProiect(id); }); });
  document.addEventListener("click",e=>{ if(!e.target.closest(".searchwrap")) box.classList.remove("open"); });
  document.addEventListener("keydown",e=>{ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){ e.preventDefault(); inp.focus(); } if(e.key==="Escape"){ closeDrawer(); box.classList.remove("open"); } }); }

/* ---------- boot ---------- */
function applyTheme(t){ S.theme=t; document.documentElement.setAttribute("data-theme",t); }
window.__reboot=function(){ MATCH=null; IX=null; render(); };
(function init(){
  applyTheme(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
  $("#btnTheme").onclick=()=>applyTheme(S.theme==="dark"?"light":"dark");
  $("#btnPrint").onclick=()=>window.print();
  $("#btnRescan").onclick=()=>{ openDrawer(drawerHead("Actualizarea datelor","radar & pipeline")+'<div class="db"><ul class="list">'+
    '<li>🔄 <b>Scanare la cerere:</b> scrie în conversația Claude «scanare radar» — agenții re-verifică sursele și republică dashboard-ul cu date noi.</li>'+
    '<li>🌅 <b>Scanare zilnică programată:</b> rulează automat în dimineața zilelor lucrătoare; primești buletinul + notificare, iar artefactul se actualizează.</li>'+
    '<li>📎 <b>Date proprii:</b> trimite fișierul Excel/CSV cu clienții sau proiectele în conversație — le import în CRM/pipeline.</li>'+
    '<li>⬆ <b>Manual:</b> Administrare → Import date (JSON).</li></ul>'+
    '<div class="callout warn">Sursele gov.ro centrale sunt blocate din datacenter — scanarea folosește OI-uri regionale + comunicate oficiale + presă (marcate [DE VERIFICAT] unde e cazul). Pentru acces direct: browserul tău (Claude in Chrome) sau VPS românesc (Faza 3).</div></div>'); };
  $("#overlay").onclick=closeDrawer;
  $("#firmName").textContent=(META.firma||{}).nume||"";
  $("#stampBox").innerHTML="radar: "+esc(String((DB.apeluri||{}).extras_la||"").slice(0,10))+"<br>v"+esc(META.versiune||"1");
  hookSearch(); render();
})();


/* ============================================================
   Asistent AI — chat BYOK (Google Gemini), integrat cu toate
   datele platformei. Cheia stă DOAR în localStorage (browserul
   utilizatorului), niciodată în cod sau pe server.
   ============================================================ */
(function(){
  "use strict";
  const LS_KEY="eufcc_gemini_key", LS_MODEL="eufcc_gemini_model";
  const lsGet=(k,d)=>{ try{ return localStorage.getItem(k)||d; }catch(e){ return d; } };
  const lsSet=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
  const lsDel=k=>{ try{ localStorage.removeItem(k); }catch(e){} };
  const getKey=()=>lsGet(LS_KEY,"");
  const getModel=()=>lsGet(LS_MODEL,"gemini-2.0-flash");

  const msgs=[];            // {role:'user'|'assistant'|'sys', text}
  let open=false, busy=false, setup=false;

  const QUICK=[
    "Ce se închide azi sau în următoarele 7 zile?",
    "Care sunt termenele mele interne de proiect săptămâna asta?",
    "Ce apeluri se potrivesc pentru microîntreprinderi în Nord-Vest?",
    "Rezumă-mi buletinul zilei în 3 puncte."
  ];

  function fmtMsg(t){ return esc(t)
    .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
    .replace(/^\s*[-•]\s+/gm,'• ')
    .replace(/\n/g,'<br>'); }

  /* ---- Context: toate datele platformei, compact + la zi ---- */
  function buildContext(){
    const today = (function(){ const d=TODAY; const p=n=>String(n).padStart(2,"0");
      return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()); })();
    let c = "PLATFORMĂ: EU Funds Command Center — radar de fonduri europene pentru o firmă de consultanță din România.\n";
    c += "DATA CURENTĂ: "+today+" (calculează «azi / mâine / zile rămase» față de ea).\n";
    c += "Radar extras la: "+((DB.apeluri||{}).extras_la||"—")+" · versiune date: "+(META.versiune||"—")+".\n\n";

    const b=META.buletin||{};
    c += "=== BULETIN ("+(b.data||"—")+") ===\n"+(b.titlu||"")+"\n"+(b.sinteza||"")+"\n";
    if((b.urgente||[]).length) c+="Urgențe:\n"+b.urgente.map(x=>" - "+x).join("\n")+"\n";
    if((b.oportunitati_cheie||[]).length) c+="Oportunități-cheie:\n"+b.oportunitati_cheie.map(x=>" - "+x).join("\n")+"\n";
    if((b.de_verificat||[]).length) c+="De verificat:\n"+b.de_verificat.map(x=>" - "+x).join("\n")+"\n";
    c+="\n";

    c+="=== APELURI ("+A.length+") ===\n";
    c+="Format: id | titlu | program | stare | deschidere | închidere(zile rămase) | beneficiari | grant | regiuni | domenii\n";
    A.forEach(a=>{ const dz=days(a.data_inchidere);
      c+=(a.id_apel||"")+" | "+(a.titlu||"")+" | "+(a.program||"")+" | "+(a.stare||"")+" | "
        +(a.data_deschidere||"—")+" | "+(a.data_inchidere||"—")+(dz!=null?(" ("+dz+"z)"):"")+" | "
        +(((a.tip_beneficiar||[]).map(x=>BEN[x]||x)).join(",")||"—")+" | "+grantStr(a)+" | "
        +((a.regiuni||[]).join(",")||"—")+" | "+((a.domenii||[]).join(",")||"—")+"\n"; });
    c+="\n";

    c+="=== CLIENȚI ("+CL.length+") ===\n";
    CL.forEach(cl=>{ const df=cl.date_financiare||{};
      c+=" - "+cl.id+" | "+cl.denumire+" | "+(cl.tip||"")+"/"+(cl.dimensiune||"")+" | "+(cl.judet||"")+"/"+(cl.regiune||"")
        +" | CAEN "+(cl.caen_principal||"—")+" | interese: "+((cl.interese||[]).join(", ")||"—")
        +(df.capitaluri_proprii_lei!=null?(" | capitaluri proprii "+nf.format(df.capitaluri_proprii_lei)+" lei"):"")
        +(cl.datorii_fiscale?" | datorii fiscale: DA":"")+(cl.demo?" | (DEMO)":"")+"\n"; });
    c+="\n";

    c+="=== PROIECTE PIPELINE ("+PR.length+") ===\n";
    PR.forEach(p=>{ const cl=clientById(p.client_id)||{}; const na=p.next_action||{};
      c+=" - "+p.id+" | "+(p.titlu||"")+" | client: "+(cl.denumire||p.client_id||"—")+" | fază "+(p.faza||"")
        +" | apel: "+(p.apel_id||"—")+" | grant "+(p.grant_lei!=null?nf.format(p.grant_lei)+" lei":"—")
        +" | next: "+(na.descriere||"—")+(na.termen?(" (termen "+na.termen+")"):"")+"\n"; });
    if((TS||[]).length){ c+="Termene suplimentare proiecte:\n";
      TS.forEach(t=>{ const p=PR.find(x=>x.id===t.proiect_id)||{};
        c+="  - "+(t.data||"")+" | "+(t.tip||"")+" | "+(t.descriere||"")+" | "+(p.titlu||t.proiect_id||"")+(t.critic?" | CRITIC":"")+"\n"; }); }
    c+="\n";

    const cov=SURSE.reduce((a,s)=>{a[s.stare]=(a[s.stare]||0)+1;return a;},{});
    c+="=== SURSE MONITORIZATE ("+SURSE.length+") ===\n"+JSON.stringify(cov)+"\n";
    return c;
  }

  const SYS_RULES =
    "Ești asistentul intern al platformei EU Funds Command Center, pentru o firmă de consultanță în fonduri europene din România. "+
    "Răspunzi ÎN ROMÂNĂ, concis și practic (liste scurte când ajută). "+
    "Folosești EXCLUSIV datele platformei de mai jos — nu inventa apeluri, termene, sume, clienți sau surse. "+
    "Dacă informația nu există în date, spune clar: «nu am această informație în date». "+
    "Calculează zilele rămase raportat la DATA CURENTĂ. Când te referi la un apel/client/proiect, folosește denumirea lui exactă. "+
    "Datele marcate [DE VERIFICAT] sau cu încredere redusă se semnalează ca atare. "+
    "Pentru orice GO/NO-GO, eligibilitate sau depunere: reamintește pe scurt că e estimare pe date sumare și decizia finală se ia după citirea ghidului și validare umană (HITL).";

  async function callGemini(history){
    const key=getKey(), model=getModel();
    if(!key) throw new Error("Nicio cheie configurată.");
    const url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(key);
    const body={
      systemInstruction:{ parts:[{ text: SYS_RULES+"\n\n=== DATE PLATFORMĂ ===\n"+buildContext() }] },
      contents: history.filter(m=>m.role!=="sys").map(m=>({ role: m.role==="assistant"?"model":"user", parts:[{ text:m.text }] })),
      generationConfig:{ temperature:0.3, maxOutputTokens:1400 }
    };
    let res;
    try{ res=await fetch(url,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) }); }
    catch(e){ throw new Error("Rețea/CORS: "+e.message+" — verifică conexiunea și cheia."); }
    if(!res.ok){ let d=""; try{ const j=await res.json(); d=(j.error&&j.error.message)||JSON.stringify(j); }catch(e){ d=await res.text().catch(()=>""); }
      if(res.status===400&&/API key not valid/i.test(d)) throw new Error("Cheie invalidă (400). Verifică cheia Gemini în setări.");
      if(res.status===403) throw new Error("Acces refuzat (403). Cheia nu are drepturi pe API-ul Gemini sau modelul ales.");
      if(res.status===404) throw new Error("Model inexistent (404): «"+model+"». Schimbă modelul în setări (ex. gemini-2.0-flash).");
      if(res.status===429) throw new Error("Prea multe cereri / cotă depășită (429). Reîncearcă mai târziu.");
      throw new Error("Gemini "+res.status+": "+String(d).slice(0,240)); }
    const data=await res.json();
    const cand=(data.candidates||[])[0];
    if(!cand) throw new Error("Răspuns gol de la Gemini (posibil filtrare de siguranță).");
    const txt=((cand.content&&cand.content.parts)||[]).map(p=>p.text||"").join("").trim();
    return txt||"(răspuns gol)";
  }

  /* ---------- UI ---------- */
  function panel(){ return document.getElementById("chatPanel"); }
  function scrollBody(){ const bd=document.getElementById("chatBody"); if(bd) bd.scrollTop=bd.scrollHeight; }

  function renderBody(){
    if(setup || !getKey()) return renderSetup();
    if(!msgs.length){
      return '<div class="cmsg sys">👋 Întreabă-mă orice despre platformă — apeluri, clienți, proiecte, termene, surse. Datele la zi îți sunt deja în context.</div>'
        +'<div class="chatquick">'+QUICK.map((q,i)=>'<button data-q="'+i+'">'+esc(q)+'</button>').join("")+'</div>';
    }
    let h=msgs.map(m=>{
      if(m.role==="sys") return '<div class="cmsg sys">'+fmtMsg(m.text)+'</div>';
      return '<div class="cmsg '+(m.role==="user"?"u":"a")+'">'+fmtMsg(m.text)+'</div>';
    }).join("");
    if(busy) h+='<div class="chattyping">Asistentul scrie…</div>';
    return h;
  }

  function renderSetup(){
    const hasKey=!!getKey();
    return '<div class="chatsetup">'
      +'<h3>Conectează Gemini (cheia ta)</h3>'
      +'<div class="np">🔒 <b>Confidențialitate:</b> cheia se salvează <b>doar în acest browser</b> (localStorage). Nu ajunge în cod, pe GitHub sau la noi. Întrebările + datele platformei se trimit către Google (Gemini) ca să genereze răspunsul.</div>'
      +'<label>Cheie API Google Gemini</label>'
      +'<input id="chatKey" type="password" placeholder="'+(hasKey?"•••••••••• (salvată)":"Lipește cheia aici")+'" autocomplete="off">'
      +'<label>Model</label>'
      +'<input id="chatModel" type="text" value="'+esc(getModel())+'" autocomplete="off">'
      +'<div class="np">Ia o cheie gratuită din <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>. Modele uzuale: <code>gemini-2.0-flash</code>, <code>gemini-2.5-flash</code>, <code>gemini-1.5-flash</code>.</div>'
      +'<div style="display:flex;gap:8px;margin-top:6px">'
      +'<button class="btn primary" id="chatSave">Salvează</button>'
      +(hasKey?'<button class="btn" id="chatForget">Șterge cheia</button>':'')
      +'</div></div>';
  }

  function render(){
    const p=panel(); if(!p) return;
    const keyed=!!getKey();
    p.querySelector("#chatBody").innerHTML=renderBody();
    const foot=p.querySelector("#chatFoot");
    foot.style.display=(setup||!keyed)?"none":"block";
    wire();
    scrollBody();
  }

  function wire(){
    const p=panel(); if(!p) return;
    // quick prompts
    p.querySelectorAll(".chatquick button").forEach(b=>b.onclick=()=>send(QUICK[+b.dataset.q]));
    // setup
    const save=p.querySelector("#chatSave");
    if(save) save.onclick=()=>{
      const k=(p.querySelector("#chatKey").value||"").trim();
      const m=(p.querySelector("#chatModel").value||"").trim()||"gemini-2.0-flash";
      if(k) lsSet(LS_KEY,k); lsSet(LS_MODEL,m);
      if(!getKey()){ toast("Adaugă o cheie ca să pornești"); return; }
      setup=false; toast("Gemini conectat"); render();
    };
    const forget=p.querySelector("#chatForget");
    if(forget) forget.onclick=()=>{ lsDel(LS_KEY); msgs.length=0; toast("Cheie ștearsă"); render(); };
  }

  async function send(text){
    text=(text||"").trim(); if(!text||busy) return;
    if(!getKey()){ setup=true; render(); return; }
    msgs.push({role:"user",text}); busy=true; render();
    const ta=document.getElementById("chatInput"); if(ta) ta.value="";
    try{
      const reply=await callGemini(msgs);
      msgs.push({role:"assistant",text:reply});
    }catch(e){
      msgs.push({role:"sys",text:"⚠️ "+e.message});
    }
    busy=false; render();
  }

  function setOpen(v){ open=v; const p=panel(); if(p) p.classList.toggle("open",open);
    if(open){ render(); const ta=document.getElementById("chatInput"); if(ta) setTimeout(()=>ta.focus(),50); } }

  function initDOM(){
    if(document.getElementById("chatFab")) return;
    const fab=document.createElement("button");
    fab.id="chatFab"; fab.className="chatfab"; fab.title="Asistent AI (întreabă despre platformă)";
    fab.textContent="💬";
    fab.onclick=()=>setOpen(!open);

    const p=document.createElement("div");
    p.id="chatPanel"; p.className="chatpanel";
    p.innerHTML=
      '<div class="chathead"><div class="ct">🤖 Asistent AI <small>date platformă · Gemini</small></div>'
      +'<div class="sp">'
      +'<button class="btn small ghost" id="chatGear" title="Setări cheie/model">⚙</button>'
      +'<button class="btn small ghost" id="chatClear" title="Șterge conversația">🗑</button>'
      +'<button class="btn small ghost" id="chatClose" title="Închide">✕</button>'
      +'</div></div>'
      +'<div class="chatbody" id="chatBody"></div>'
      +'<div class="chatfoot" id="chatFoot"><div class="chatinrow">'
      +'<textarea id="chatInput" rows="1" placeholder="Întreabă despre apeluri, clienți, termene…"></textarea>'
      +'<button class="chatsend" id="chatSendBtn">➤</button>'
      +'</div></div>';

    document.body.appendChild(fab);
    document.body.appendChild(p);

    p.querySelector("#chatClose").onclick=()=>setOpen(false);
    p.querySelector("#chatGear").onclick=()=>{ setup=!setup; render(); };
    p.querySelector("#chatClear").onclick=()=>{ msgs.length=0; render(); };
    const sendBtn=p.querySelector("#chatSendBtn");
    const ta=p.querySelector("#chatInput");
    sendBtn.onclick=()=>send(ta.value);
    ta.addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(ta.value); } });
    ta.addEventListener("input",()=>{ ta.style.height="auto"; ta.style.height=Math.min(120,ta.scrollHeight)+"px"; });

    render();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initDOM);
  else initDOM();
})();

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
const ONRC_REG={"cluj":"Nord-Vest","iasi":"Nord-Est","iaşi":"Nord-Est","ilfov":"București-Ilfov"};
function onrcNorm(s){ return String(s||"").toLowerCase().replace(/ș|ş/g,"s").replace(/ț|ţ/g,"t").replace(/ă|â/g,"a").replace(/î/g,"i"); }
function onrcRegOf(j){ return ONRC_REG[onrcNorm(j)]||""; }
function onrcTotal(){ const O=window.ONRC; return (O&&O.c)?Object.values(O.c).reduce((s,d)=>s+((d.f&&d.f.length)||0),0):0; }

/* Persistență locală (IndexedDB) — datele rămân pe DISPOZITIVUL utilizatorului,
   nu pleacă nicăieri. Se pot șterge oricând din interfață. */
const ONRC_IDB_NAME="eufcc_onrc", ONRC_IDB_STORE="counties";
function onrcIDB(){ return new Promise((res,rej)=>{ try{ const r=indexedDB.open(ONRC_IDB_NAME,1);
  r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains(ONRC_IDB_STORE)) r.result.createObjectStore(ONRC_IDB_STORE); };
  r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error||new Error("IndexedDB indisponibil")); }catch(e){ rej(e); } }); }
async function onrcPersist(county,data){ try{ const db=await onrcIDB(); await new Promise((res)=>{ const tx=db.transaction(ONRC_IDB_STORE,"readwrite"); tx.objectStore(ONRC_IDB_STORE).put(data,county); tx.oncomplete=()=>res(true); tx.onerror=()=>res(false); tx.onabort=()=>res(false); }); }catch(e){} }
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
      onrcPersist(d.j,d).then(()=>{ if(status) status.innerHTML='✅ <b>'+esc(d.j)+'</b>: '+d.f.length.toLocaleString("ro-RO")+' firme (salvate local pe dispozitiv).'; });
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
      if(caen){ if(!onrcCaenList(F).some(c=>c.indexOf(caen)===0)) continue; }
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
  const loaded=Object.keys(ONRC.c);
  let h='<div class="viewtitle"><h1>🏢 Prospect ONRC</h1><span class="sub">bază locală de firme · Registrul Comerțului</span></div>';
  h+='<div class="callout warn">🔒 <b>Datele rămân la tine.</b> Fișierele ONRC (inclusiv datele personale ale reprezentanților) se încarcă și se prelucrează <b>doar în acest browser</b> — nu se trimit spre niciun server, nu ajung în cod sau pe GitHub. Se salvează local pe acest dispozitiv (le poți șterge oricând cu butonul de mai jos).</div>';
  h+='<div class="card section"><h2 style="font-size:14px;margin-bottom:8px">1) Încarcă fișierele județene (.json.gz)</h2>'
    +'<p style="font-size:12.5px;color:var(--ink2);margin-bottom:8px">Alege unul sau mai multe fișiere (CLUJ / IASI / ILFOV). Recomandat pe desktop — fișierele au zeci de MB; pe telefon încarcă un singur județ pe rând.</p>'
    +'<input type="file" id="onrcFiles" multiple>'
    +'<div id="onrcLoadStatus" class="onrcmeta"></div></div>';
  if(!loaded.length){ h+='<div class="empty">Niciun județ încărcat încă.</div>'; return h; }
  const stx=onrcStats();
  h+='<div class="tiles">'
    +tile(stx.g.n.toLocaleString("ro-RO"),"Firme încărcate",loaded.join(" · "),"","prospect",null)
    +tile(stx.g.a.toLocaleString("ro-RO"),"Active","universul de prospectare","acc","prospect",null)
    +tile(stx.g.r.toLocaleString("ro-RO"),"Risc","întrerupere/suspendare/sediu","warnv","prospect",null)
    +tile(stx.g.in.toLocaleString("ro-RO"),"Inactive","radiate → în dificultate","crit","prospect",null)
    +'</div>';
  h+='<div class="onrcmeta">Județe salvate local: <b>'+esc(loaded.join(", "))+'</b> · <a href="javascript:void(0)" onclick="onrcClearLocal()" style="color:var(--critical)">🗑 șterge datele locale</a></div>';
  h+='<div class="onrcbar">'
    +'<input type="text" id="onrcQ" placeholder="Denumire sau CUI…">'
    +'<select id="onrcCounty"><option value="">Toate județele</option>'+loaded.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("")+'</select>'
    +'<select id="onrcStare"><option value="activ">Doar active</option><option value="activrisc">Active + risc</option><option value="risc">Doar risc</option><option value="inactiv">Doar inactive</option><option value="toate">Toate stările</option></select>'
    +'<input type="text" id="onrcCaen" placeholder="CAEN (ex. 6201)" style="max-width:130px">'
    +'<input type="text" id="onrcLoc" placeholder="Localitate…" style="max-width:150px">'
    +'<select id="onrcForma"><option value="">Orice formă</option>'+["SRL","PFA","PF","II","SA","IF","SNC","SCS"].map(f=>'<option value="'+f+'">'+f+'</option>').join("")+'</select>'
    +'<label style="font-size:12.5px;color:var(--ink2);display:inline-flex;align-items:center;gap:5px"><input type="checkbox" id="onrcTel"> doar cu telefon</label>'
    +'<button class="btn small primary" id="onrcGo">Caută</button>'
    +'</div>';
  h+='<div id="onrcResults"></div>';
  return h;
}
window.after_prospect=function(){
  const fi=document.getElementById("onrcFiles"); if(fi) fi.onchange=e=>onrcLoadFiles(e.target.files);
  const go=document.getElementById("onrcGo"); if(go) go.onclick=onrcRenderResults;
  ["onrcQ","onrcCaen","onrcLoc"].forEach(id=>{ const el=document.getElementById(id); if(el) el.addEventListener("keydown",e=>{ if(e.key==="Enter") onrcRenderResults(); }); });
  ["onrcCounty","onrcStare","onrcForma","onrcTel"].forEach(id=>{ const el=document.getElementById(id); if(el) el.onchange=onrcRenderResults; });
  if(Object.keys(ONRC.c).length) onrcRenderResults();
};
function onrcRenderResults(){
  const box=document.getElementById("onrcResults"); if(!box) return;
  const val=id=>{ const el=document.getElementById(id); return el?el.value:""; };
  const telEl=document.getElementById("onrcTel");
  const flt={ q:val("onrcQ"), county:val("onrcCounty"), stare:val("onrcStare")||"activ", caen:val("onrcCaen"), loc:val("onrcLoc"), forma:val("onrcForma"), telOnly:telEl?telEl.checked:false };
  const res=onrcSearch(flt);
  if(!res.total){ box.innerHTML='<div class="empty">Niciun rezultat pentru filtrele curente.</div>'; return; }
  let h='<div class="onrcmeta">'+res.total.toLocaleString("ro-RO")+' firme găsite'+(res.capped?' — afișez primele '+res.cap:'')+'. Click pe un rând pentru fișă completă.</div>';
  h+='<div class="card" style="padding:4px 10px"><table class="tbl"><thead><tr><th>Denumire</th><th>CUI</th><th>Formă</th><th>Localitate</th><th>Stare</th><th>CAEN principal</th><th>Administrator</th><th>Telefon</th></tr></thead><tbody>';
  h+=res.rows.map(r=>{ const d=ONRC.c[r.cty]; const F=d.f[r.i]; const st=ONRC_STLBL[F[ONRC_FIELDS.stare]||0];
    const cp=(F[ONRC_FIELDS.caen]||[])[0]; const cpc=cp?String(cp[0]):""; const cpd=cpc?(d.caen_den&&d.caen_den[cpc]||""):"";
    const adm=(F[ONRC_FIELDS.rep]||[])[0]; const admn=adm?(esc(adm[0])+(adm[1]?' <small style="color:var(--muted)">'+esc(adm[1])+'</small>':"")):"—";
    const web=F[ONRC_FIELDS.web]; const weburl=web?(/^https?:/.test(web)?web:"http://"+web):"";
    const weblink=web?' <a href="'+esc(weburl)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="'+esc(web)+'">🌐</a>':"";
    const tel=F[ONRC_FIELDS.tel]; const telcell=tel?'<a href="tel:'+esc(tel)+'" onclick="event.stopPropagation()">'+esc(tel)+'</a>':'<span style="color:var(--muted)">—</span>';
    return '<tr onclick="openFirm(\''+esc(r.cty)+'\','+r.i+')"><td><b>'+esc(F[ONRC_FIELDS.den])+'</b>'+weblink+'</td><td class="num">'+esc(F[ONRC_FIELDS.cui])+'</td><td>'+esc(F[ONRC_FIELDS.forma]||"—")+'</td><td>'+esc((d.loc||[])[F[ONRC_FIELDS.loc]]||"—")+'</td><td><span class="onrcbadge '+st[0]+'">'+st[1]+'</span></td><td style="font-size:12px">'+esc(cpc)+' '+esc(cpd.slice(0,34))+'</td><td style="font-size:12px">'+admn+'</td><td style="font-size:12px">'+telcell+'</td></tr>';
  }).join("");
  h+='</tbody></table></div>';
  box.innerHTML=h;
}
function openFirm(cty,i){ const d=ONRC.c[cty]; if(!d) return; const F=d.f[i]; if(!F) return;
  const st=F[ONRC_FIELDS.stare]||0; const stl=ONRC_STLBL[st];
  let h=drawerHead(esc(F[ONRC_FIELDS.den]), esc((F[ONRC_FIELDS.forma]||"")+" · CUI "+F[ONRC_FIELDS.cui]+" · "+cty))+'<div class="db">';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px"><span class="onrcbadge '+stl[0]+'">'+stl[1]+'</span>'
    +(F[ONRC_FIELDS.web]?'<a href="'+esc(/^https?:/.test(F[ONRC_FIELDS.web])?F[ONRC_FIELDS.web]:"http://"+F[ONRC_FIELDS.web])+'" target="_blank" rel="noopener">🌐 site</a>':"")+'</div>';
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
  if(reps.length){ h+='<div class="section"><h2>Administratori / reprezentanți legali ('+reps.length+')</h2><div class="callout">Date personale ONRC — utile pentru testul de «întreprindere unică» la minimis (firme legate prin control comun). A se folosi doar intern.</div><ul class="list">'
    +reps.map(repFmt).join("")+'</ul></div>'; }
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
  h+='<div class="callout" style="margin-top:12px">Datele ONRC sunt un instantaneu (08.07.2026). Eligibilitatea reală depinde de dimensiune (cifră afaceri/angajați — neincluse aici), situația financiară și ghidul apelului. AI pregătește; omul decide.</div></div>';
  openDrawer(h);
}
function onrcToRadar(reg){ closeDrawer(); S.radar.regiune=reg; S.radar.stari=new Set(["activ"]); S.view="radar"; render(); }
function onrcAddProspect(cty,i){ const d=ONRC.c[cty]; const F=d.f[i]; const id="onrc_"+F[ONRC_FIELDS.cui];
  if(CL.some(c=>c.id===id)){ toast("Deja în CRM"); return; }
  const cp=(F[ONRC_FIELDS.caen]||[])[0];
  CL.push({ id, denumire:F[ONRC_FIELDS.den], tip:"privat", dimensiune:"", forma_juridica:F[ONRC_FIELDS.forma]||"",
    judet:cty, regiune:onrcRegOf(cty), localitate:(d.loc||[])[F[ONRC_FIELDS.loc]]||"", cui:String(F[ONRC_FIELDS.cui]||""),
    caen_principal:cp?String(cp[0]):"", interese:[], date_financiare:{}, sursa:"ONRC", nota:"Prospect importat din ONRC — de completat dimensiune și date financiare." });
  MATCH=null; toast("Adăugat ca prospect: "+F[ONRC_FIELDS.den]);
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
   VERIFICARE PROIECT — evaluator universal, agnostic de măsură.
   Motor determinist (client-side): confruntă dosarul cu un
   "rulebook" învățat din ghid. Trei stări per regulă, cu sursă.
   Ghidul e sursa de adevăr; codul nu presupune tipul proiectului.
   Documentele rămân în browser.
   ============================================================ */
window.EVAL = window.EVAL || { rb:{} };
const EV_LS="eufcc_rulebooks";
function evLoad(){ try{ const s=localStorage.getItem(EV_LS); if(s) window.EVAL.rb=JSON.parse(s)||{}; }catch(e){} }
function evSave(){ try{ localStorage.setItem(EV_LS, JSON.stringify(window.EVAL.rb)); }catch(e){} }
function evList(){ return Object.values(window.EVAL.rb); }
function evId(){ return "rb_"+Math.abs((JSON.stringify(window.EVAL.rb).length*7+evList().length*13+ (A?A.length:0))%99999)+"_"+evList().length; }

/* ---- comparatoare deterministe ---- */
function evCmp(op, a, b){
  const na=parseFloat(a), nb=parseFloat(b); const bothNum=!isNaN(na)&&!isNaN(nb);
  switch(op){
    case "ge": return bothNum? na>=nb : null;
    case "le": return bothNum? na<=nb : null;
    case "gt": return bothNum? na>nb : null;
    case "lt": return bothNum? na<nb : null;
    case "eq": return bothNum? na===nb : String(a).trim().toLowerCase()===String(b).trim().toLowerCase();
    case "ne": return bothNum? na!==nb : String(a).trim().toLowerCase()!==String(b).trim().toLowerCase();
    case "in": { const list=String(b).split(/[,;/]/).map(x=>x.trim().toLowerCase()).filter(Boolean); return list.includes(String(a).trim().toLowerCase()); }
    case "nin": { const list=String(b).split(/[,;/]/).map(x=>x.trim().toLowerCase()).filter(Boolean); return !list.includes(String(a).trim().toLowerCase()); }
  }
  return null;
}
const EV_OPLBL={ge:"≥",le:"≤",gt:">",lt:"<",eq:"=",ne:"≠",in:"∈ (în lista)",nin:"∉ (nu în lista)"};
const EV_FACTFIELDS=[["dimensiune","Dimensiune (micro/mica/mijlocie/mare)"],["tip","Tip solicitant (privat/UAT/ONG…)"],["regiune","Regiune"],["judet","Județ"],["vechime_ani","Vechime (ani)"],["caen","CAEN"],["capitaluri_proprii_lei","Capitaluri proprii (lei)"],["nr_angajati","Nr. angajați"],["cifra_afaceri_lei","Cifră de afaceri (lei)"]];

/* ---- seed: schiță de rulebook din apelul din radar (needs human validation) ---- */
function evSeedFromApel(apelId){
  const a=apelById(apelId)||{};
  const src="Apel din radar (schiță auto) — DE VALIDAT cu ghidul";
  const elig=[];
  if((a.tip_beneficiar||[]).length) elig.push({camp:"dimensiune",op:"in",val:(a.tip_beneficiar||[]).map(b=>BEN[b]||b).join(", "),sursa:"tip_beneficiar din radar",confirmat:false});
  if((a.regiuni||[]).length && !(a.regiuni||[]).includes("Național")) elig.push({camp:"regiune",op:"in",val:(a.regiuni||[]).join(", "),sursa:"regiuni din radar",confirmat:false});
  const rb={
    id:evId(), apel_id:apelId, titlu:a.titlu||"Apel", program:a.program||"", versiune:1, activ:false,
    eligibilitate:elig,
    financiar:{ sprijin_min:a.grant_min||null, sprijin_max:a.grant_max||null, intensitate_max_pct:a.intensitate_max_pct||null, cofinantare_min_pct:(a.intensitate_max_pct?100-a.intensitate_max_pct:null), tip_ajutor:/minimis/i.test(a.tip_ajutor||"")?"minimis":"", moneda:a.moneda||"EUR", plafoane:[], neeligibile:[], confirmat:false },
    documente:[], grila:{ prag_minim:null, criterii:(a.criterii_cheie||[]).slice(0,6).map(c=>({nume:c,punctaj_max:null,tip:"subiectiv",eliminatoriu:false,sursa:"criterii_cheie din radar",confirmat:false})) },
    eliminatorii:[], termene:{ depunere:a.data_inchidere||"" }, legislatie:[]
  };
  return rb;
}

/* ============ MOTORUL DE EVALUARE (determinist) ============ */
function evNum(v){ const n=parseFloat(String(v==null?"":v).toString().replace(/[^0-9.\-]/g,"")); return isNaN(n)?null:n; }
function evEvaluate(rb, f){
  const checks=[]; // {strat, titlu, status:'CONFORM'|'NECONFORM'|'NV', gasit, cerut, dif, sursa, fix, blocant}
  const add=(o)=>checks.push(Object.assign({status:"NV",blocant:false},o));
  const sol=f.solicitant||{}, fin=f.financiar||{};

  /* ---- A. Eligibilitate (din ghid) ---- */
  (rb.eligibilitate||[]).forEach(c=>{
    if(!c.confirmat){ add({strat:"Eligibilitate",titlu:c.camp,status:"NV",cerut:EV_OPLBL[c.op]+" "+c.val,sursa:c.sursa,fix:"Parametru neconfirmat din ghid — validează-l în rulebook."}); return; }
    const val=sol[c.camp];
    if(val==null||val===""){ add({strat:"Eligibilitate",titlu:c.camp,status:"NV",cerut:EV_OPLBL[c.op]+" "+c.val,sursa:c.sursa,fix:"Completează «"+c.camp+"» în dosar."}); return; }
    const r=evCmp(c.op,val,c.val);
    if(r===null){ add({strat:"Eligibilitate",titlu:c.camp,status:"NV",gasit:val,cerut:EV_OPLBL[c.op]+" "+c.val,sursa:c.sursa}); return; }
    add({strat:"Eligibilitate",titlu:c.camp,status:r?"CONFORM":"NECONFORM",gasit:val,cerut:EV_OPLBL[c.op]+" "+c.val,sursa:c.sursa,blocant:!r,fix:r?"":"Solicitantul nu îndeplinește condiția de eligibilitate."});
  });

  /* ---- A. Financiar & plafoane (din ghid) ---- */
  const fi=rb.financiar||{}; const val=evNum(fin.valoare_proiect), spr=evNum(fin.sprijin_solicitat);
  if(fi.confirmat){
    if(fi.sprijin_max!=null){ if(spr==null) add({strat:"Financiar",titlu:"Sprijin ≤ plafon",status:"NV",cerut:"≤ "+fi.sprijin_max+" "+(fi.moneda||""),sursa:"financiar (ghid)",fix:"Completează sprijinul solicitat."});
      else add({strat:"Financiar",titlu:"Sprijin ≤ plafon max",status:spr<=fi.sprijin_max?"CONFORM":"NECONFORM",gasit:spr,cerut:"≤ "+fi.sprijin_max,dif:spr>fi.sprijin_max?(spr-fi.sprijin_max):0,sursa:"financiar (ghid)",blocant:spr>fi.sprijin_max,fix:spr>fi.sprijin_max?("Reduci sprijinul cu "+nf.format(spr-fi.sprijin_max)+" "+(fi.moneda||"")+" sau proiectul e neeligibil."):""}); }
    if(fi.sprijin_min!=null && spr!=null) add({strat:"Financiar",titlu:"Sprijin ≥ minim",status:spr>=fi.sprijin_min?"CONFORM":"NECONFORM",gasit:spr,cerut:"≥ "+fi.sprijin_min,sursa:"financiar (ghid)",blocant:spr<fi.sprijin_min,fix:spr<fi.sprijin_min?"Sprijinul e sub minimul apelului.":""});
    if(fi.intensitate_max_pct!=null){ if(val&&spr){ const it=Math.round(spr/val*1000)/10; add({strat:"Financiar",titlu:"Intensitate ≤ max",status:it<=fi.intensitate_max_pct?"CONFORM":"NECONFORM",gasit:it+"%",cerut:"≤ "+fi.intensitate_max_pct+"%",sursa:"financiar (ghid)",blocant:it>fi.intensitate_max_pct,fix:it>fi.intensitate_max_pct?"Crește cofinanțarea: intensitatea depășește plafonul.":""}); }
      else add({strat:"Financiar",titlu:"Intensitate ≤ max",status:"NV",cerut:"≤ "+fi.intensitate_max_pct+"%",sursa:"financiar (ghid)",fix:"Completează valoarea proiectului și sprijinul."}); }
    (fi.plafoane||[]).filter(p=>p.confirmat!==false).forEach(p=>{ const ch=(fin.cheltuieli||[]).find(x=>String(x.categorie).trim().toLowerCase()===String(p.categorie).trim().toLowerCase());
      if(!ch){ add({strat:"Financiar",titlu:"Plafon "+p.categorie,status:"NV",cerut:(p.tip==="pct"?"≤ "+p.val+"%":"≤ "+p.val),sursa:p.sursa||"plafon (ghid)",fix:"Nu găsesc cheltuiala «"+p.categorie+"» în buget."}); return; }
      const suma=evNum(ch.suma); let ok,gasit,cerut;
      if(p.tip==="pct"){ const pct=val?Math.round(suma/val*1000)/10:null; ok=pct!=null&&pct<=p.val; gasit=(pct==null?"?":pct+"%"); cerut="≤ "+p.val+"%"; }
      else { ok=suma<=p.val; gasit=suma; cerut="≤ "+p.val; }
      add({strat:"Financiar",titlu:"Plafon "+p.categorie,status:ok?"CONFORM":"NECONFORM",gasit:gasit,cerut:cerut,sursa:p.sursa||"plafon (ghid)",blocant:!ok,fix:ok?"":"Categoria «"+p.categorie+"» depășește plafonul din ghid."}); });
    (fi.neeligibile||[]).forEach(nl=>{ const ch=(fin.cheltuieli||[]).find(x=>String(x.categorie).trim().toLowerCase()===String(nl.categorie||nl).trim().toLowerCase()); if(ch&&evNum(ch.suma)>0) add({strat:"Financiar",titlu:"Cheltuială neeligibilă",status:"NECONFORM",gasit:nl.categorie||nl,cerut:"absentă",sursa:nl.sursa||"neeligibile (ghid)",blocant:true,fix:"Elimină din buget cheltuiala neeligibilă «"+(nl.categorie||nl)+"»."}); });
  } else add({strat:"Financiar",titlu:"Reguli financiare",status:"NV",sursa:"financiar (ghid)",fix:"Confirmă parametrii financiari în rulebook."});

  /* ---- B. Concordanțe (universale) ---- */
  const cc=f.concordanta||{};
  const pair=(k,label)=>{ const a=cc[k+"_cerere"], b=cc[k+"_buget"]; if((a==null||a==="")&&(b==null||b==="")) return; if(a==null||a===""||b==null||b===""){ add({strat:"Concordanță",titlu:label,status:"NV",sursa:"concordanță documente",fix:"Completează «"+label+"» din ambele documente."}); return;} const ok=String(a).trim().toLowerCase()===String(b).trim().toLowerCase(); add({strat:"Concordanță",titlu:label,status:ok?"CONFORM":"NECONFORM",gasit:a+" vs "+b,cerut:"identic",sursa:"cerere vs buget/anexe",blocant:false,fix:ok?"":"Clarificare probabilă: «"+label+"» diferă între documente."}); };
  pair("cui","CUI solicitant");
  pair("denumire","Denumire solicitant");
  (cc.indicatori||[]).forEach(ind=>{ const vs=[ind.cerere,ind.buget,ind.anexa].filter(x=>x!=null&&x!==""); if(vs.length<2){ return; } const allEq=vs.every(x=>String(x).trim()===String(vs[0]).trim()); add({strat:"Concordanță",titlu:"Indicator: "+ind.nume,status:allEq?"CONFORM":"NECONFORM",gasit:vs.join(" / "),cerut:"identic peste documente",sursa:"triplă concordanță (dacă apelul o cere)",fix:allEq?"":"Aliniază indicatorul «"+ind.nume+"» în cerere/buget/anexe."}); });
  if(val!=null&&spr!=null){ const cof=evNum(fin.cofinantare); const suma=spr+(cof!=null?cof:(val-spr)); const ok=Math.abs(suma-val)<=1; add({strat:"Concordanță",titlu:"Sprijin + cofinanțare = valoare",status:ok?"CONFORM":"NECONFORM",gasit:nf.format(spr)+" + "+nf.format(cof!=null?cof:(val-spr))+" = "+nf.format(suma),cerut:nf.format(val),sursa:"aritmetică buget",fix:ok?"":"Sumele nu se compun corect cu valoarea proiectului."}); }

  /* ---- C. Documente (din ghid) ---- */
  const prez=new Set((f.documente_prezente||[]).map(x=>String(x).trim().toLowerCase()));
  (rb.documente||[]).filter(d=>d.confirmat!==false).forEach(d=>{ const has=prez.has(String(d.nume).trim().toLowerCase()); add({strat:"Documente",titlu:d.nume,status:has?"CONFORM":"NECONFORM",gasit:has?"prezent":"lipsă",cerut:"obligatoriu"+(d.forma?" ("+d.forma+")":""),sursa:d.sursa||"listă documente (ghid)",blocant:!has,fix:has?"":"Adaugă documentul «"+d.nume+"» în dosar."}); });

  /* ---- D. Grila (simulare) ---- */
  let gmin=0, gmax=0; const gcrit=[];
  (rb.grila&&rb.grila.criterii||[]).forEach(cr=>{ const pmax=evNum(cr.punctaj_max)||0; gmax+=pmax; let got=0, tip=cr.tip;
    if(cr.tip==="obiectiv" && cr.confirmat!==false && cr.camp && cr.op){ const v=sol[cr.camp]!=null?sol[cr.camp]:fin[cr.camp]; if(v!=null&&v!==""){ const r=evCmp(cr.op,v,cr.val); if(r) got=pmax; } }
    gmin+=got; gcrit.push({nume:cr.nume,pmax,got,tip:cr.tip,elim:cr.eliminatoriu}); });
  const prag=evNum(rb.grila&&rb.grila.prag_minim);
  if(prag!=null && gmin<prag) add({strat:"Grilă",titlu:"Prag de calificare",status:"NECONFORM",gasit:"min garantat "+gmin,cerut:"≥ "+prag,sursa:"grilă (ghid)",blocant:false,fix:"Sub prag pe punctajul garantat — trebuie câștigate puncte pe criteriile de apreciere."});

  /* ---- Strat transversal (doar dacă rulebook-ul îl invocă) ---- */
  const leg=new Set(rb.legislatie||[]);
  if(leg.has("dificultate")){ const cp=evNum(sol.capitaluri_proprii_lei); if(sol.tip!=="UAT"){ if(cp==null) add({strat:"Legislație",titlu:"Întreprindere în dificultate",status:"NV",sursa:"art. 2 pct. 18 Reg. 651/2014",fix:"Completează capitalurile proprii din bilanț."}); else add({strat:"Legislație",titlu:"Întreprindere în dificultate",status:cp>=0?"CONFORM":"NECONFORM",gasit:nf.format(cp)+" lei",cerut:"capitaluri proprii ≥ 0",sursa:"art. 2 pct. 18 Reg. 651/2014 (expiră 31.12.2026)",blocant:cp<0,fix:cp<0?"Capitaluri proprii negative → criteriu eliminatoriu; remediere înainte de depunere.":""}); } }
  if(leg.has("minimis")){ const mu=evNum(sol.minimis_utilizat_eur); const sprE=(fi.moneda==="EUR")?spr:null; if(mu==null||sprE==null) add({strat:"Legislație",titlu:"Plafon minimis 300.000 €",status:"NV",sursa:"Reg. UE 2023/2831",fix:"Completează minimisul utilizat (€) și asigură sprijinul în €."}); else add({strat:"Legislație",titlu:"Plafon minimis 300.000 €/3 ani",status:(mu+sprE)<=300000?"CONFORM":"NECONFORM",gasit:nf.format(mu+sprE)+" €",cerut:"≤ 300.000 €",sursa:"Reg. UE 2023/2831 (întreprindere unică)",blocant:(mu+sprE)>300000,fix:(mu+sprE)>300000?"Depășește plafonul de minimis pe întreprindere unică.":""}); }
  if(leg.has("imm")){ if(!sol.dimensiune) add({strat:"Legislație",titlu:"Încadrare IMM",status:"NV",sursa:"Reg. 651/2014 Anexa I",fix:"Completează dimensiunea (din situații financiare)."}); }

  /* ---- Sinteză / verdict ---- */
  const blocante=checks.filter(c=>c.blocant && c.status==="NECONFORM");
  const clarificari=checks.filter(c=>c.strat==="Concordanță" && c.status==="NECONFORM");
  const avert=checks.filter(c=>!c.blocant && c.status==="NECONFORM" && c.strat!=="Concordanță");
  const nv=checks.filter(c=>c.status==="NV");
  let verdict, vclass;
  if(blocante.length){ verdict="NU se poate depune — "+blocante.length+" blocant(e) de rezolvat"; vclass="no"; }
  else if(clarificari.length||avert.length){ verdict="Se poate depune CU RISCURI — "+(clarificari.length+avert.length)+" de clarificat/remediat"; vclass="warn"; }
  else if(nv.length){ verdict="Se poate depune cu rezerve — "+nv.length+" verificări incomplete (vezi «nu s-a putut verifica»)"; vclass="warn"; }
  else verdict="Se poate depune — nicio neconformitate deterministă găsită"; vclass=vclass||"go";
  return { verdict, vclass, checks, blocante, clarificari, avert, nv, grila:{min:gmin,max:gmax,prag,criterii:gcrit} };
}

/* ===== Verificare proiect — UI ===== */
window.evUI = window.evUI || { curId:null, dosar:{ solicitant:{}, financiar:{ cheltuieli:[] }, documente_prezente:[], concordanta:{ indicatori:[] } }, report:null };
function evGetRb(){ return window.EVAL.rb[window.evUI.curId]||null; }
function evSet(path,val){ const p=path.split("."); let o=window.evUI; for(let i=0;i<p.length-1;i++){ if(o[p[i]]==null) o[p[i]]={}; o=o[p[i]]; } o[p[p.length-1]]=val; }
function evSetRb(path,val){ const rb=evGetRb(); if(!rb) return; const p=path.split("."); let o=rb; for(let i=0;i<p.length-1;i++){ if(o[p[i]]==null) o[p[i]]={}; o=o[p[i]]; } const last=p[p.length-1]; o[last]=(val===""?null:(isNaN(val)||typeof val!=="string"?val:(/^-?\d+(\.\d+)?$/.test(val)?parseFloat(val):val))); evSave(); }
function evNewFromApel(){ const sel=document.getElementById("evApelSel"); if(!sel||!sel.value) return; const rb=evSeedFromApel(sel.value); window.EVAL.rb[rb.id]=rb; window.evUI.curId=rb.id; window.evUI.step=1; evSave(); toast("Schiță de rulebook creată — validează parametrii"); render(); }
function evPick(id){ window.evUI.curId=id; window.evUI.step=1; render(); }
function evDelRb(){ const rb=evGetRb(); if(!rb) return; if(!confirm("Ștergi rulebook-ul «"+rb.titlu+"»?")) return; delete window.EVAL.rb[window.evUI.curId]; window.evUI.curId=null; evSave(); render(); }
function evActivate(){ const rb=evGetRb(); if(!rb) return; rb.activ=true; evSave(); toast("Rulebook activat"); render(); }
function evAddElig(){ const rb=evGetRb(); rb.eligibilitate=rb.eligibilitate||[]; rb.eligibilitate.push({camp:"dimensiune",op:"in",val:"",sursa:"",confirmat:false}); evSave(); render(); }
function evDelElig(i){ evGetRb().eligibilitate.splice(i,1); evSave(); render(); }
function evAddDoc(){ const rb=evGetRb(); rb.documente=rb.documente||[]; rb.documente.push({nume:"",forma:"",confirmat:true,sursa:""}); evSave(); render(); }
function evDelDoc(i){ evGetRb().documente.splice(i,1); evSave(); render(); }
function evAddPlaf(){ const rb=evGetRb(); rb.financiar.plafoane=rb.financiar.plafoane||[]; rb.financiar.plafoane.push({categorie:"",tip:"pct",val:null,sursa:"",confirmat:true}); evSave(); render(); }
function evDelPlaf(i){ evGetRb().financiar.plafoane.splice(i,1); evSave(); render(); }
function evAddCrit(){ const rb=evGetRb(); rb.grila=rb.grila||{criterii:[]}; rb.grila.criterii.push({nume:"",punctaj_max:null,tip:"subiectiv",eliminatoriu:false,confirmat:true}); evSave(); render(); }
function evDelCrit(i){ evGetRb().grila.criterii.splice(i,1); evSave(); render(); }
function evLeg(k,on){ const rb=evGetRb(); rb.legislatie=rb.legislatie||[]; const s=new Set(rb.legislatie); on?s.add(k):s.delete(k); rb.legislatie=[...s]; evSave(); }
function evAddChelt(){ window.evUI.dosar.financiar.cheltuieli.push({categorie:"",suma:null}); render(); }
function evDelChelt(i){ window.evUI.dosar.financiar.cheltuieli.splice(i,1); render(); }
function evAddInd(){ window.evUI.dosar.concordanta.indicatori.push({nume:"",cerere:"",buget:""}); render(); }
function evDelInd(i){ window.evUI.dosar.concordanta.indicatori.splice(i,1); render(); }

function evStep(n){ window.evUI.step=Math.max(0,Math.min(3,n|0)); render(); const m=document.getElementById("main"); if(m) m.scrollTop=0; }
function evNoRb(){ return '<div class="empty">Încă nu ai un rulebook. Mergi la pasul «Alege apelul» și alege un apel din radar sau apasă «Continuă» ca să creezi unul gol.</div>'; }
function evStepBar(step){ const steps=["Alege apelul","Rulebook","Dosar","Raport"]; return '<div class="evsub" style="margin:4px 0 14px">'+steps.map((s,i)=>'<button class="fchip'+(i===step?" on":"")+'" onclick="evStep('+i+')">'+(i+1)+'. '+s+'</button>').join("")+'</div>'; }
function evNavBtns(step){ let h='<div style="display:flex;gap:8px;margin-top:16px;align-items:center;flex-wrap:wrap">'; if(step>0) h+='<button class="btn" onclick="evStep('+(step-1)+')">← Înapoi</button>'; if(step<3) h+='<button class="btn primary" onclick="evNext('+step+')">Continuă →</button>'; else h+='<button class="btn primary" onclick="evRun()">↻ Reevaluează</button>'; h+='<span class="evsrc">poți trece mai departe și fără să completezi tot</span></div>'; return h; }
function evNext(step){
  if(step===0 && !evGetRb()){ const sel=document.getElementById("evApelSel"); if(sel&&sel.value){ const rb=evSeedFromApel(sel.value); window.EVAL.rb[rb.id]=rb; window.evUI.curId=rb.id; evSave(); } else { const rb=evSeedFromApel(""); rb.titlu="Rulebook nou (manual)"; window.EVAL.rb[rb.id]=rb; window.evUI.curId=rb.id; evSave(); } }
  window.evUI.step=Math.min(3,(step|0)+1); render();
  if(window.evUI.step===3) setTimeout(evRun,60);
}
function evEditorCard(rb){ var h="";
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:4px">📘 Rulebook — '+esc(rb.titlu)+' '+(rb.activ?'<span class="evst ok">ACTIV</span>':'<span class="evbadge-un">DE VALIDAT</span>')+'</h2>';
  h+='<div class="evsrc" style="margin-bottom:8px">Editează regulile din ghid. Bifează «confirmat» pentru fiecare regulă validată la sursă.</div>';
  h+='<div class="evform">';
  const fi=rb.financiar||{};
  h+='<div class="evmini"><b style="font-size:12.5px">💶 Financiar</b>'
    +'<label><input type="checkbox" '+(fi.confirmat?"checked":"")+' onchange="evSetRb(\'financiar.confirmat\',this.checked)"> confirmat din ghid</label>'
    +'<div class="r2"><div><label>Sprijin min</label><input type="number" value="'+(fi.sprijin_min??"")+'" onchange="evSetRb(\'financiar.sprijin_min\',this.value)"></div><div><label>Sprijin max</label><input type="number" value="'+(fi.sprijin_max??"")+'" onchange="evSetRb(\'financiar.sprijin_max\',this.value)"></div></div>'
    +'<div class="r2"><div><label>Intensitate max %</label><input type="number" value="'+(fi.intensitate_max_pct??"")+'" onchange="evSetRb(\'financiar.intensitate_max_pct\',this.value)"></div><div><label>Monedă</label><input type="text" value="'+esc(fi.moneda||"EUR")+'" onchange="evSetRb(\'financiar.moneda\',this.value)"></div></div>'
    +'<label>Tip ajutor</label><select onchange="evSetRb(\'financiar.tip_ajutor\',this.value)"><option value=""'+(!fi.tip_ajutor?" selected":"")+'>—</option><option value="minimis"'+(fi.tip_ajutor==="minimis"?" selected":"")+'>de minimis</option><option value="stat"'+(fi.tip_ajutor==="stat"?" selected":"")+'>ajutor de stat</option><option value="fara"'+(fi.tip_ajutor==="fara"?" selected":"")+'>fără ajutor de stat</option></select>';
  h+='<div style="margin-top:6px"><b style="font-size:12px">Plafoane pe cheltuieli</b> <span class="chip" style="cursor:pointer" onclick="evAddPlaf()">+ adaugă</span>';
  (fi.plafoane||[]).forEach((p,i)=>{ h+='<div class="r2" style="margin-top:4px;grid-template-columns:1fr 70px 70px auto"><input type="text" placeholder="categorie" value="'+esc(p.categorie||"")+'" onchange="evGetRb().financiar.plafoane['+i+'].categorie=this.value;evSave()"><select onchange="evGetRb().financiar.plafoane['+i+'].tip=this.value;evSave()"><option value="pct"'+(p.tip==="pct"?" selected":"")+'>%</option><option value="suma"'+(p.tip==="suma"?" selected":"")+'>sumă</option></select><input type="number" placeholder="val" value="'+(p.val??"")+'" onchange="evGetRb().financiar.plafoane['+i+'].val=parseFloat(this.value)||null;evSave()"><span class="evchipdel" onclick="evDelPlaf('+i+')">✕</span></div>'; });
  h+='</div></div>';
  /* eligibilitate */
  h+='<div class="evmini"><b style="font-size:12.5px">👤 Eligibilitate solicitant</b> <span class="chip" style="cursor:pointer" onclick="evAddElig()">+ condiție</span>';
  (rb.eligibilitate||[]).forEach((c,i)=>{ h+='<div style="margin-top:5px;border-top:1px dashed var(--grid);padding-top:5px"><div class="r2" style="grid-template-columns:1fr 90px auto"><select onchange="evGetRb().eligibilitate['+i+'].camp=this.value;evSave()">'+EV_FACTFIELDS.map(([k,l])=>'<option value="'+k+'"'+(c.camp===k?" selected":"")+'>'+esc(l)+'</option>').join("")+'</select><select onchange="evGetRb().eligibilitate['+i+'].op=this.value;evSave()">'+Object.keys(EV_OPLBL).map(o=>'<option value="'+o+'"'+(c.op===o?" selected":"")+'>'+EV_OPLBL[o]+'</option>').join("")+'</select><span class="evchipdel" onclick="evDelElig('+i+')">✕</span></div><input type="text" placeholder="valoare (ex: micro, IMM / 3 / Nord-Vest)" value="'+esc(c.val||"")+'" onchange="evGetRb().eligibilitate['+i+'].val=this.value;evSave()" style="margin-top:4px"><label style="margin-top:2px"><input type="checkbox" '+(c.confirmat?"checked":"")+' onchange="evGetRb().eligibilitate['+i+'].confirmat=this.checked;evSave()"> confirmat din ghid <span class="evsrc">'+esc(c.sursa||"")+'</span></label></div>'; });
  h+='</div>';
  /* documente */
  h+='<div class="evmini"><b style="font-size:12.5px">📎 Documente cerute</b> <span class="chip" style="cursor:pointer" onclick="evAddDoc()">+ document</span>';
  (rb.documente||[]).forEach((d,i)=>{ h+='<div class="r2" style="margin-top:4px;grid-template-columns:1fr 110px auto"><input type="text" placeholder="denumire document" value="'+esc(d.nume||"")+'" onchange="evGetRb().documente['+i+'].nume=this.value;evSave()"><input type="text" placeholder="formă (opț.)" value="'+esc(d.forma||"")+'" onchange="evGetRb().documente['+i+'].forma=this.value;evSave()"><span class="evchipdel" onclick="evDelDoc('+i+')">✕</span></div>'; });
  h+='</div>';
  /* grila */
  const gr=rb.grila||{criterii:[]};
  h+='<div class="evmini"><b style="font-size:12.5px">📊 Grilă</b> — prag minim <input type="number" style="width:70px;display:inline-block" value="'+(gr.prag_minim??"")+'" onchange="evSetRb(\'grila.prag_minim\',this.value)"> <span class="chip" style="cursor:pointer" onclick="evAddCrit()">+ criteriu</span>';
  (gr.criterii||[]).forEach((c,i)=>{ h+='<div style="margin-top:5px;border-top:1px dashed var(--grid);padding-top:5px"><div class="r2" style="grid-template-columns:1fr 60px 90px auto"><input type="text" placeholder="criteriu" value="'+esc(c.nume||"")+'" onchange="evGetRb().grila.criterii['+i+'].nume=this.value;evSave()"><input type="number" placeholder="pmax" value="'+(c.punctaj_max??"")+'" onchange="evGetRb().grila.criterii['+i+'].punctaj_max=parseFloat(this.value)||null;evSave()"><select onchange="evGetRb().grila.criterii['+i+'].tip=this.value;evSave();render()"><option value="subiectiv"'+(c.tip==="subiectiv"?" selected":"")+'>apreciere</option><option value="obiectiv"'+(c.tip==="obiectiv"?" selected":"")+'>obiectiv</option></select><span class="evchipdel" onclick="evDelCrit('+i+')">✕</span></div>'+(c.tip==="obiectiv"?'<div class="r2" style="grid-template-columns:1fr 70px 1fr;margin-top:4px"><select onchange="evGetRb().grila.criterii['+i+'].camp=this.value;evSave()"><option value="">câmp…</option>'+EV_FACTFIELDS.map(([k,l])=>'<option value="'+k+'"'+(c.camp===k?" selected":"")+'>'+esc(k)+'</option>').join("")+'</select><select onchange="evGetRb().grila.criterii['+i+'].op=this.value;evSave()">'+Object.keys(EV_OPLBL).map(o=>'<option value="'+o+'"'+(c.op===o?" selected":"")+'>'+EV_OPLBL[o]+'</option>').join("")+'</select><input type="text" placeholder="valoare" value="'+esc(c.val||"")+'" onchange="evGetRb().grila.criterii['+i+'].val=this.value;evSave()"></div>':"")+'</div>'; });
  h+='</div>';
  /* legislatie */
  h+='<div class="evmini"><b style="font-size:12.5px">⚖️ Legislație transversală</b> <span class="evsrc">(se aplică doar dacă apelul o invocă)</span><div style="margin-top:4px">';
  [["minimis","de minimis (300.000 €)"],["imm","încadrare IMM"],["dificultate","întreprindere în dificultate"],["regional","ajutor regional pe județ"],["dnsh","DNSH"],["achizitii","achiziții / conflict interese"]].forEach(([k,l])=>{ const on=(rb.legislatie||[]).includes(k); h+='<label style="display:inline-flex;gap:5px;margin-right:12px;font-size:12px"><input type="checkbox" '+(on?"checked":"")+' onchange="evLeg(\''+k+'\',this.checked)"> '+esc(l)+'</label>'; });
  h+='</div></div>';
  h+='<button class="btn primary" onclick="evActivate()" style="margin-top:6px">✅ Activează rulebook-ul</button>';
  h+='</div></div>';
 return h; }
function evDosarCard(rb){ var h="";
  const D=window.evUI.dosar; const s=D.solicitant, fn=D.financiar;
  h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">📂 Dosarul proiectului</h2><div class="evform">';
  h+='<div class="evmini"><b style="font-size:12.5px">Solicitant</b>'
    +'<div class="r2"><div><label>Dimensiune</label><select onchange="evSet(\'dosar.solicitant.dimensiune\',this.value)"><option value="">—</option>'+["microintreprindere","mica","mijlocie","mare"].map(x=>'<option'+(s.dimensiune===x?" selected":"")+'>'+x+'</option>').join("")+'</select></div><div><label>Tip</label><select onchange="evSet(\'dosar.solicitant.tip\',this.value)"><option value="">—</option>'+["privat","UAT","ONG"].map(x=>'<option'+(s.tip===x?" selected":"")+'>'+x+'</option>').join("")+'</select></div></div>'
    +'<div class="r2"><div><label>Regiune</label><input type="text" value="'+esc(s.regiune||"")+'" onchange="evSet(\'dosar.solicitant.regiune\',this.value)"></div><div><label>Județ</label><input type="text" value="'+esc(s.judet||"")+'" onchange="evSet(\'dosar.solicitant.judet\',this.value)"></div></div>'
    +'<div class="r2"><div><label>Vechime (ani)</label><input type="number" value="'+(s.vechime_ani??"")+'" onchange="evSet(\'dosar.solicitant.vechime_ani\',this.value)"></div><div><label>CAEN</label><input type="text" value="'+esc(s.caen||"")+'" onchange="evSet(\'dosar.solicitant.caen\',this.value)"></div></div>'
    +'<div class="r2"><div><label>Capitaluri proprii (lei)</label><input type="number" value="'+(s.capitaluri_proprii_lei??"")+'" onchange="evSet(\'dosar.solicitant.capitaluri_proprii_lei\',this.value)"></div><div><label>Minimis utilizat (€)</label><input type="number" value="'+(s.minimis_utilizat_eur??"")+'" onchange="evSet(\'dosar.solicitant.minimis_utilizat_eur\',this.value)"></div></div></div>';
  h+='<div class="evmini"><b style="font-size:12.5px">Financiar</b>'
    +'<div class="r2"><div><label>Valoare proiect</label><input type="number" value="'+(fn.valoare_proiect??"")+'" onchange="evSet(\'dosar.financiar.valoare_proiect\',this.value)"></div><div><label>Sprijin solicitat</label><input type="number" value="'+(fn.sprijin_solicitat??"")+'" onchange="evSet(\'dosar.financiar.sprijin_solicitat\',this.value)"></div></div>'
    +'<label>Cofinanțare (opț.)</label><input type="number" value="'+(fn.cofinantare??"")+'" onchange="evSet(\'dosar.financiar.cofinantare\',this.value)">'
    +'<div style="margin-top:5px"><b style="font-size:12px">Cheltuieli pe categorii</b> <span class="chip" style="cursor:pointer" onclick="evAddChelt()">+</span>';
  (fn.cheltuieli||[]).forEach((c,i)=>{ h+='<div class="r2" style="grid-template-columns:1fr 110px auto;margin-top:4px"><input type="text" placeholder="categorie" value="'+esc(c.categorie||"")+'" onchange="window.evUI.dosar.financiar.cheltuieli['+i+'].categorie=this.value"><input type="number" placeholder="sumă" value="'+(c.suma??"")+'" onchange="window.evUI.dosar.financiar.cheltuieli['+i+'].suma=parseFloat(this.value)||null"><span class="evchipdel" onclick="evDelChelt('+i+')">✕</span></div>'; });
  h+='</div></div>';
  /* documente prezente */
  h+='<div class="evmini"><b style="font-size:12.5px">Documente prezente în dosar</b>';
  if((rb.documente||[]).length){ h+='<div style="margin-top:4px">'+rb.documente.map(d=>{ const on=(D.documente_prezente||[]).includes(d.nume); return '<label style="display:block;font-size:12.5px"><input type="checkbox" '+(on?"checked":"")+' onchange="var a=window.evUI.dosar.documente_prezente;if(this.checked){if(a.indexOf(\''+esc(d.nume).replace(/'/g,"\\'")+'\')<0)a.push(\''+esc(d.nume).replace(/'/g,"\\'")+'\')}else{var k=a.indexOf(\''+esc(d.nume).replace(/'/g,"\\'")+'\');if(k>=0)a.splice(k,1)}"> '+esc(d.nume)+'</label>'; }).join("")+'</div>'; }
  else h+='<div class="evsrc">Adaugă documente în rulebook ca să le poți bifa aici.</div>';
  h+='</div>';
  /* concordanta */
  const cc=D.concordanta;
  h+='<div class="evmini"><b style="font-size:12.5px">Concordanță documente</b>'
    +'<div class="r2"><div><label>CUI (cerere)</label><input type="text" value="'+esc(cc.cui_cerere||"")+'" onchange="evSet(\'dosar.concordanta.cui_cerere\',this.value)"></div><div><label>CUI (buget)</label><input type="text" value="'+esc(cc.cui_buget||"")+'" onchange="evSet(\'dosar.concordanta.cui_buget\',this.value)"></div></div>'
    +'<div class="r2"><div><label>Denumire (cerere)</label><input type="text" value="'+esc(cc.denumire_cerere||"")+'" onchange="evSet(\'dosar.concordanta.denumire_cerere\',this.value)"></div><div><label>Denumire (buget)</label><input type="text" value="'+esc(cc.denumire_buget||"")+'" onchange="evSet(\'dosar.concordanta.denumire_buget\',this.value)"></div></div>'
    +'<div style="margin-top:5px"><b style="font-size:12px">Indicatori (concordanță)</b> <span class="chip" style="cursor:pointer" onclick="evAddInd()">+</span>';
  (cc.indicatori||[]).forEach((ind,i)=>{ h+='<div class="r2" style="grid-template-columns:1fr 90px 90px auto;margin-top:4px"><input type="text" placeholder="indicator" value="'+esc(ind.nume||"")+'" onchange="window.evUI.dosar.concordanta.indicatori['+i+'].nume=this.value"><input type="text" placeholder="cerere" value="'+esc(ind.cerere||"")+'" onchange="window.evUI.dosar.concordanta.indicatori['+i+'].cerere=this.value"><input type="text" placeholder="buget" value="'+esc(ind.buget||"")+'" onchange="window.evUI.dosar.concordanta.indicatori['+i+'].buget=this.value"><span class="evchipdel" onclick="evDelInd('+i+')">✕</span></div>'; });
  h+='</div></div>';
  h+='<button class="btn primary" onclick="evNext(2)">▶ Evaluează dosarul</button>';
  if(!rb.activ) h+=' <span class="evsrc">rulebook neactivat — regulile neconfirmate vor da «nu se poate verifica»</span>';
  h+='</div></div>';
 return h; }
function vVerif(){
  evLoad();
  const step=window.evUI.step||0;
  const rb=evGetRb();
  let h='<div class="viewtitle"><h1>🧪 Verificare proiect</h1><span class="sub">evaluator ghidat · pas cu pas</span></div>';
  h+=evStepBar(step);
  if(step===0){
    h+='<div class="callout">Motor determinist, rulat <b>în browserul tău</b> — documentele nu pleacă nicăieri. Ghidul e sursa de adevăr. Fiecare regulă are 3 rezultate: <b>CONFORM · NECONFORM · NU SE POATE VERIFICA</b>, cu sursă. <b>AI pregătește; omul decide.</b></div>';
    h+='<div class="card"><h2 style="font-size:14px;margin-bottom:8px">Pentru ce apel verifici? <span class="evsrc">(opțional — poți continua și fără)</span></h2>';
    h+='<div class="onrcbar"><select id="evApelSel"><option value="">— alege un apel din radar —</option>'+A.filter(a=>a.stare==="activ"||a.stare==="planificat").map(a=>'<option value="'+esc(a.id_apel)+'"'+(rb&&rb.apel_id===a.id_apel?" selected":"")+'>'+esc(a.titlu.slice(0,60))+' ['+esc(a.program)+']</option>').join("")+'</select><button class="btn small primary" onclick="evNewFromApel()">+ Creează rulebook din apel</button></div>';
    const rbs=evList();
    if(rbs.length){ h+='<div style="margin-top:12px"><b style="font-size:12.5px">Rulebook-uri salvate:</b><div class="evsub" style="margin-top:6px">'+rbs.map(r=>'<button class="fchip'+(r.id===window.evUI.curId?" on":"")+'" onclick="evPick(\''+r.id+'\')">'+(r.activ?"✅ ":"📝 ")+esc((r.titlu||"apel").slice(0,32))+'</button>').join("")+'</div>'+(rb?'<div style="margin-top:6px"><button class="btn small ghost" onclick="evDelRb()">🗑 șterge rulebook-ul selectat</button></div>':"")+'</div>'; }
    else h+='<div class="evsrc" style="margin-top:10px">Niciun rulebook încă — alege un apel sau apasă «Continuă» ca să creezi unul gol.</div>';
    h+='</div>';
  } else if(step===1){ h+= rb? evEditorCard(rb) : evNoRb(); }
  else if(step===2){ h+= rb? evDosarCard(rb) : evNoRb(); }
  else { h+= rb? '<div id="evReport"></div>' : evNoRb(); }
  h+=evNavBtns(step);
  return h;
}
function evRun(){ const rb=evGetRb(); if(!rb) return; const rep=evEvaluate(rb, window.evUI.dosar); const box=document.getElementById("evReport"); if(box) box.innerHTML=evReportHtml(rep); box&&box.scrollIntoView({behavior:"smooth",block:"start"}); }
function evReportHtml(rep){
  const stEl=c=>'<span class="evst '+(c.status==="CONFORM"?"ok":c.status==="NECONFORM"?"no":"nv")+'">'+c.status+'</span>';
  const rowEl=c=>'<div class="evrow"><div><b>'+esc(c.titlu)+'</b> <span class="evsrc">['+esc(c.strat)+']</span>'+((c.gasit!=null||c.cerut!=null)?'<div class="evsrc">găsit: '+esc(String(c.gasit==null?"—":c.gasit))+' · cerut: '+esc(String(c.cerut==null?"—":c.cerut))+'</div>':"")+(c.sursa?'<div class="evsrc">↳ sursă: '+esc(c.sursa)+'</div>':"")+(c.fix?'<div class="evfix">→ '+esc(c.fix)+'</div>':"")+'</div>'+stEl(c)+'</div>';
  let h='<div class="card"><h2 style="font-size:15px;margin-bottom:8px">📋 Raport de verificare</h2>';
  h+='<div class="evverdict '+rep.vclass+'">'+esc(rep.verdict)+'</div>';
  if(rep.blocante.length){ h+='<div class="section"><h2 style="color:var(--critical)">🚫 Blocante ('+rep.blocante.length+')</h2>'+rep.blocante.map(rowEl).join("")+'</div>'; }
  if(rep.clarificari.length){ h+='<div class="section"><h2>❓ Clarificări probabile ('+rep.clarificari.length+')</h2>'+rep.clarificari.map(rowEl).join("")+'</div>'; }
  if(rep.avert.length){ h+='<div class="section"><h2>⚠️ Avertismente ('+rep.avert.length+')</h2>'+rep.avert.map(rowEl).join("")+'</div>'; }
  /* grila */
  const g=rep.grila; const pct=g.max?Math.round(g.min/g.max*100):0;
  h+='<div class="section"><h2>📊 Simulare punctaj</h2><div class="evsrc">Minim garantat (obiectiv): <b>'+g.min+'</b> · Maxim posibil: <b>'+g.max+'</b>'+(g.prag!=null?' · Prag: <b>'+g.prag+'</b>':"")+'</div><div class="evmeter"><span style="width:'+pct+'%;background:'+(g.prag!=null&&g.min<g.prag?"var(--critical)":"var(--good)")+'"></span></div>'
    +(g.criterii.length?'<ul class="list">'+g.criterii.map(c=>'<li>'+esc(c.nume)+' — <b>'+c.got+'</b>/'+(c.pmax||"?")+(c.tip==="subiectiv"?' <span class="evsrc">(apreciere — de argumentat)</span>':"")+'</li>').join("")+'</ul>':"")+'</div>';
  if(rep.nv.length){ h+='<div class="section"><h2>🔍 Nu s-a putut verifica ('+rep.nv.length+')</h2><div class="evsrc" style="margin-bottom:6px">Obligatoriu afișat — nu se ascunde.</div>'+rep.nv.map(rowEl).join("")+'</div>'; }
  h+='<div class="section"><button class="btn small" onclick="evExport()">⬇ Export raport (JSON)</button> <button class="btn small" onclick="window.print()">🖨 Printează</button></div>';
  h+='<div class="callout" style="margin-top:10px">Verdictul e determinist, pe regulile validate din ghid. Criteriile de apreciere NU se punctează automat. Decizia finală și depunerea rămân la consultant (HITL).</div></div>';
  return h;
}
function evExport(){ const rb=evGetRb(); const rep=evEvaluate(rb, window.evUI.dosar); dl("raport-verificare.json", JSON.stringify({apel:rb.titlu, verdict:rep.verdict, checks:rep.checks, grila:rep.grila},null,2), "application/json"); toast("Raport exportat"); }
