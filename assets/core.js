/* ============ CORE — date, utilitare, motor matching, navigare, drawer-e, paletă ============ */
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
  if(n<0) return opts.task? '<span class="cd cd-crit" title="'+fmtD(dateStr)+'">restant · '+(-n)+' zile</span>' : '<span class="cd cd-off">închis '+fmtDs(dateStr)+'</span>';
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
function regMatch(cl, ap){ const rg=ap.regiuni||[]; const nj=onrcNorm(cl.judet||""); const nr=onrcNorm(cl.regiune||(cl.judet?onrcRegOf(cl.judet):""));
  if(ap.judete_eligibile && ap.judete_eligibile.length) return !!nj && ap.judete_eligibile.some(j=>onrcNorm(j)===nj);
  if(rg.includes("Național")) return true;
  if(rg.includes("ITI")) return null; /* necunoscut fără verificare areal ITI */
  return !!nr && rg.some(r=>onrcNorm(r)===nr); }
function judLabel(j){ const k=onrcNorm(j||""); if(!k) return j||""; return BZ_JUD.find(x=>onrcNorm(x)===k)||j; }
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
const VCHIP_T={"GO":"toate criteriile HARD verificabile trec","GO-COND.":"nu pică nimic, dar rămân verificări obligatorii (minimis, CAEN la locație, cofinanțare, ghid integral)","NO-GO":"un criteriu eliminatoriu pică pe datele existente"};
function vChip(v,s){ const c=v==="NO-GO"?"cd-crit":(s>=70?"cd-good":"cd-warn"); return '<span class="cd '+c+'" title="'+esc(VCHIP_T[v]||"")+(s?" · scor comercial "+s+"/100 (nu e punctaj ETF)":"")+'">'+v+(s?" · "+s:"")+'</span>'; }

/* ---------- health & pipeline calc ---------- */
function health(p){ const t = p.next_action && p.next_action.termen? days(p.next_action.termen):null;
  const ap = apelById(p.apel_id); const az = ap&&ap.data_inchidere? days(ap.data_inchidere):null;
  const pre = ["P0","P1","P2","P3"].includes(p.faza);
  if((t!=null&&t<0) || p.faza==="P5" || (az!=null&&az>=0&&az<=7&&pre)) return "r";
  if((t!=null&&t<=5) || (az!=null&&az>=0&&az<=21&&pre)) return "y";
  return "g"; }
const PROB={P0:.1,P1:.25,P2:.4,P3:.55,P4:.65,P5:.7,P6:.9,P7:1,P8:1,P9:1};
function healthWhy(p){ const t=p.next_action&&p.next_action.termen?days(p.next_action.termen):null; const ap=apelById(p.apel_id); const az=ap&&ap.data_inchidere?days(ap.data_inchidere):null; const pre=["P0","P1","P2","P3"].includes(p.faza); const r=[];
  if(t!=null&&t<0) r.push("acțiune restantă de "+(-t)+" zile"); else if(t!=null&&t<=5) r.push("acțiune în "+t+" zile");
  if(az!=null&&az>=0&&az<=7&&pre) r.push("apelul se închide în "+az+" zile, proiect în pregătire"); else if(az!=null&&az>=0&&az<=21&&pre) r.push("apelul se închide în "+az+" zile");
  if(p.faza==="P5") r.push("clarificări în derulare (SLA 3–5 zile)"); return r.join(" · "); }
function comisionPrognozat(p){ const c=p.comision||{}; return (c.fix_lei||0)+ (c.succes_pct||0)/100*(p.grant_lei||0)*(PROB[p.faza]||0); }

/* ---------- calendar items ---------- */
function calItems(hor){ hor=hor||120; const out=[];
  A.forEach(a=>{ const dz=days(a.data_inchidere); if(dz!=null&&dz>=0&&dz<=hor) out.push({data:a.data_inchidere,tip:"Închidere apel",titlu:a.titlu,sub:a.program,crit:dz<=7,warn:dz<=30,kind:"apel",id:a.id_apel});
    const do_=days(a.data_deschidere); if(do_!=null&&do_>0&&do_<=hor) out.push({data:a.data_deschidere,tip:"Deschidere apel",titlu:a.titlu,sub:a.program,kind:"apel",id:a.id_apel}); });
  TS.forEach(t=>{ const dz=days(t.data); if(dz!=null&&dz>=-3&&dz<=hor){ const p=PR.find(x=>x.id===t.proiect_id); out.push({data:t.data,tip:t.tip.replace(/_/g," "),titlu:t.descriere,sub:p? (clientById(p.client_id)||{}).denumire:"",crit:!!t.critic||dz<0,warn:dz<=7,kind:"proiect",id:t.proiect_id}); }});
  out.sort((a,b)=> (a.data<b.data?-1:1)); return out; }

/* ---------- navigation ---------- */
const NAV=[["buletin","🏠","Buletin"],["radar","📡","Radar apeluri"],["matching","🎯","Matching"],["pipeline","📋","Pipeline"],["calendar","📅","Calendar"],["clienti","👥","Clienți"],["prospect","🏢","Prospect ONRC"],["biblioteca","📚","Bibliotecă"],["rapoarte","📊","Rapoarte"],["conformitate","🛡️","Conformitate"],["verif","🧪","Verificare proiect"],["intel","🔎","Market Intel"],["financiar","🧮","Financiar"],["baze","🗄️","Baze de date"],["admin","⚙️","Administrare"]];
function navCounts(id){ if(id==="radar") return A.filter(a=>a.stare==="activ").length; if(id==="pipeline") return PR.length; if(id==="clienti"){ const r=CL.filter(c=>!c.demo).length; return r||null; } if(id==="calendar") return calItems(30).length; if(id==="baze") return (DB.primarii&&DB.primarii.uat?DB.primarii.uat.length:null); if(id==="prospect"){ const n=onrcTotal(); return n||null; } return null; }
/* Iconițe SVG (stroke, 24×24) — înlocuiesc emoji-urile din navigare și titluri */
const ICONS={
  buletin:'<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12l6-6"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  matching:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  pipeline:'<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="9.5" y="4" width="5" height="11" rx="1.5"/><rect x="16" y="4" width="5" height="7" rx="1.5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clienti:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5a5 5 0 0 1 6 4.5"/>',
  prospect:'<path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 10h5a1 1 0 0 1 1 1v10M3 21h18M8 8h2M8 12h2M8 16h2"/>',
  biblioteca:'<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
  rapoarte:'<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  conformitate:'<path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  verif:'<path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.8-2.5L14 9V3"/><path d="M7 15h10"/>',
  intel:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6M11 8v6"/>',
  financiar:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 12h8M8 16h5"/>',
  baze:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  admin:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  more:'<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>'
};
function ico(id){ return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[id]||ICONS.more)+'</svg>'; }
const NAV_GROUPS=[["Operațional",["buletin","radar","matching","pipeline","calendar"]],["Clienți & piață",["clienti","prospect","intel"]],["Instrumente",["verif","financiar","conformitate","rapoarte","biblioteca"]],["Sistem",["baze","admin"]]];
const TAB_MAIN=["buletin","radar","pipeline","clienti"];
function navBtn(id){ const it=NAV.find(n=>n[0]===id); if(!it) return ""; const c=navCounts(id);
  return '<li><button class="'+(S.view===id?"on":"")+'" data-v="'+id+'">'+ico(id)+it[2]+(c!=null?'<span class="ct">'+c+'</span>':"")+'</button></li>'; }
function renderNav(){ $("#nav").innerHTML=NAV_GROUPS.map(([g,ids])=>'<li class="grp">'+g+'</li>'+ids.map(navBtn).join("")).join("");
  document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>{ S.view=b.dataset.v; render(); });
  // bara de tab-uri pe mobil (4 secțiuni principale + „Mai mult”)
  const tb=$("#tabbar"); if(tb){ const inMain=TAB_MAIN.includes(S.view);
    tb.innerHTML=TAB_MAIN.map(id=>{ const it=NAV.find(n=>n[0]===id); return '<button class="'+(S.view===id?"on":"")+'" data-v="'+id+'">'+ico(id)+it[2].split(" ")[0]+'</button>'; }).join("")+'<button class="'+(inMain?"":"on")+'" data-v="__more">'+ico("more")+'Mai mult</button>';
    tb.querySelectorAll("button").forEach(b=>b.onclick=()=>{ if(b.dataset.v==="__more") sheetOpen(); else { S.view=b.dataset.v; render(); } }); } }
function sheetOpen(){ $("#sheetGrid").innerHTML=NAV.map(([id,ic,l])=>'<button class="'+(S.view===id?"on":"")+'" onclick="S.view=\''+id+'\';sheetClose();render()">'+ico(id)+l+'</button>').join(""); $("#moreSheet").classList.add("open"); }
function sheetClose(){ const s=$("#moreSheet"); if(s) s.classList.remove("open"); }
function wrapTables(root){ (root||document).querySelectorAll("table.tbl").forEach(t=>{ if(!t.parentElement.classList.contains("tw")){ const w=document.createElement("div"); w.className="tw"; t.parentNode.insertBefore(w,t); w.appendChild(t); } }); }
function sessSave(){ try{ sessionStorage.setItem("eufcc_sess",JSON.stringify({view:S.view,intelJud:S.intelJud||"",intelSort:S.intelSort||"",intelDir:S.intelDir||0,fin:S.fin?{sub:S.fin.sub}:null,baze:S.baze||null,calMode:S.calMode,matchClient:S.matchClient,repClient:S.repClient})); }catch(e){} }
function sessLoad(){ try{ const o=JSON.parse(sessionStorage.getItem("eufcc_sess")||"null"); if(!o) return; window.__sess=o; if(o.view&&NAV.some(n=>n[0]===o.view)) S.view=o.view; if(o.intelJud) S.intelJud=o.intelJud; if(o.intelSort) S.intelSort=o.intelSort; if(o.intelDir) S.intelDir=o.intelDir; if(o.calMode) S.calMode=o.calMode; if(o.matchClient) S.matchClient=o.matchClient; if(o.repClient) S.repClient=o.repClient; }catch(e){} }
function render(keep){ renderNav(); const v=S.view; const M=$("#main"); const _st=M.scrollTop; tileActions.length=0; if(v==="radar") radarSave();
  // pe ecrane înguste radarul se deschide în modul „carduri” până când utilizatorul alege altfel
  if(v==="radar"&&!S.radar._touched) S.radar.mode = window.innerWidth<720 ? "carduri" : "tabel";
  const f={buletin:vBuletin,radar:vRadar,matching:vMatching,pipeline:vPipeline,calendar:vCalendar,clienti:vClienti,prospect:vProspect,biblioteca:vBiblioteca,rapoarte:vRapoarte,conformitate:vConformitate,verif:function(){ return typeof vVerif==="function"?vVerif():"<div class='empty'>Modulul de verificare nu s-a încărcat.</div>"; },intel:vIntel,financiar:vFinanciar,baze:vBaze,admin:vAdmin}[v];
  M.innerHTML = f? f() : "<div class='empty'>…</div>";
  // titlu: emoji → iconiță SVG a secțiunii
  const h1=M.querySelector(".viewtitle h1"); if(h1&&!h1.querySelector(".vi")) h1.innerHTML='<span class="vi">'+ico(v)+'</span>'+esc(h1.textContent.replace(/^[^\p{L}\p{N}\[]+/u,"").trim());
  wrapTables(M); M.scrollTop=keep?_st:0; sessSave();
  if(window["after_"+v]) window["after_"+v](); }

/* ---------- drawer ---------- */
function openDrawer(html){ const d=$("#drawer"); const was=d.classList.contains("open"); if(!was) window._drawerFocus=document.activeElement; d.innerHTML=html; d.classList.add("open"); $("#overlay").classList.add("open"); if(!was){ try{ history.pushState({drawer:1},""); }catch(e){} } const f=d.querySelector(".db .btn, .db a, .db input, .db select"); if(f) setTimeout(()=>f.focus({preventScroll:true}),60); }
function closeDrawer(){ const d=$("#drawer"); const was=d.classList.contains("open"); d.classList.remove("open"); $("#overlay").classList.remove("open"); if(was&&history.state&&history.state.drawer){ window._popSkip=true; history.back(); } if(window._drawerFocus&&window._drawerFocus.focus){ try{ window._drawerFocus.focus({preventScroll:true}); }catch(e){} } window._drawerFocus=null; }
window.addEventListener("popstate",()=>{ if(window._popSkip){ window._popSkip=false; return; } const d=$("#drawer"); if(d&&d.classList.contains("open")){ d.classList.remove("open"); $("#overlay").classList.remove("open"); } });
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
  h+=row("Grant",(a.grant_min!=null||a.grant_max!=null)?grantStr(a):null);
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
  h+='<div class="section"><h2>Linkuri oficiale</h2><ul class="list"><li>🔗 <a href="'+esc(a.url_sursa)+'" target="_blank">Anunț / pagina apelului</a></li>'+(a.url_ghid?'<li>📘 <a href="'+esc(a.url_ghid)+'" target="_blank">Ghidul solicitantului</a></li>':"")+'</ul><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button class="btn small" onclick="genL1(\''+esc(a.id_apel)+'\')">📋 Fișă L1</button><button class="btn small" onclick="S.view=\'verif\';render();evChooseApel(\''+esc(a.id_apel)+'\')">🧪 Verifică un proiect pe acest apel</button><button class="btn small" onclick="crmProjForm(null,null,\''+esc(a.id_apel)+'\')">➕ Proiect în pipeline</button></div></div>';
  h+='<div class="section"><h2>Pentru cine din portofoliu? (matching)</h2>';
  h+= tops.length? '<table class="tbl"><thead><tr><th>Client</th><th>Verdict · scor</th><th></th></tr></thead><tbody>'+tops.map(m=>'<tr onclick="openMemo(\''+m.client.id+'\',\''+esc(a.id_apel)+'\')"><td><b>'+esc(m.client.denumire)+'</b><br><small style="color:var(--muted)">'+esc(m.client.judet||"")+' · '+esc(m.client.dimensiune||m.client.tip||"")+'</small></td><td>'+vChip(m.verdict,m.scor)+'</td><td style="white-space:nowrap"><span style="color:var(--accent)">memo →</span> <button class="btn small ghost" title="proiect nou în pipeline pentru acest client × apel" onclick="event.stopPropagation();crmProjForm(null,\''+m.client.id+'\',\''+esc(a.id_apel)+'\')">➕</button></td></tr>').join("")+'</tbody></table>'
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
  let h=drawerHead(esc(c.denumire)+(c.demo?' <span class="tag-demo">DEMO</span>':""), esc([c.forma_juridica,c.localitate,c.judet,c.regiune||(c.judet?onrcRegOf(c.judet):"")].filter(Boolean).join(" · ")))+'<div class="db">';
  if(!c.demo) h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn small primary" onclick="crmProjForm(null,\''+esc(c.id)+'\')">➕ Proiect nou</button><button class="btn small" onclick="S.view=\'verif\';render();evChooseClient(\''+esc(c.id)+'\')">🧪 Verifică un proiect</button><button class="btn small" onclick="crmNewForm(\''+esc(c.id)+'\')">✎ Editează</button><button class="btn small ghost" style="margin-left:auto;color:var(--critical)" onclick="crmDeleteClient(\''+esc(c.id)+'\')">🗑 Șterge</button></div>';
  const flags=[];
  if(df.capitaluri_proprii_lei!=null&&df.capitaluri_proprii_lei<0) flags.push('<div class="callout crit"><b>Capitaluri proprii negative ('+nf.format(df.capitaluri_proprii_lei)+' lei)</b> — risc «întreprindere în dificultate»: criteriu eliminatoriu la CAE. Nu se depune nimic nou până la remediere.</div>');
  if(c.datorii_fiscale) flags.push('<div class="callout warn">Datorii fiscale / eșalonare — '+esc(c.nota_datorii||"certificat fiscal de verificat")+'</div>');
  h+=flags.join("");
  h+='<dl class="kv">';
  const row=(k,v)=>v?'<dt>'+k+'</dt><dd>'+v+'</dd>':"";
  h+=row("CUI",esc(c.cui||"—")+(c.demo?" (fictiv)":""));
  h+=row("CAEN principal",esc(c.caen_principal||"—"));
  h+=row("Dimensiune",esc(c.dimensiune||c.tip||"—"));
  h+=row("Angajați",c.angajati!=null?String(c.angajati):(df.nr_angajati!=null?String(df.nr_angajati):null));
  h+=row("Interese",(c.interese||[]).length?c.interese.map(x=>'<span class="chip hl">'+esc(x)+'</span>').join(""):null);
  if(df.cifra_afaceri_3ani_lei){ const y=Object.keys(df.cifra_afaceri_3ani_lei);
    h+=row("Cifra de afaceri",y.map(k=>k+": "+money(df.cifra_afaceri_3ani_lei[k],"lei")).join(" · "));
    h+=row("Profit exploatare",Object.keys(df.profit_exploatare_3ani_lei||{}).map(k=>k+": "+money(df.profit_exploatare_3ani_lei[k],"lei")).join(" · ")); }
  if(df.nota) h+=row("Date financiare",esc(df.nota));
  h+=row("Capitaluri proprii",df.capitaluri_proprii_lei!=null?money(df.capitaluri_proprii_lei,"lei"):null);
  h+=row("Întreprinderi legate",(c.intreprinderi_legate&&c.intreprinderi_legate.length)?esc(c.intreprinderi_legate.join("; ")):null);
  h+=row("Capacitate cofinanțare",esc(c.capacitate_cofinantare||""));
  h+=row("Contact",c.contact?esc((c.contact.nume||"")+" · "+(c.contact.email||"")):((c.email||c.telefon)?[c.email?'<a href="mailto:'+esc(c.email)+'">'+esc(c.email)+'</a>':'',c.telefon?'<a href="tel:'+esc(c.telefon)+'">'+esc(c.telefon)+'</a>':''].filter(Boolean).join(' · '):null));
  h+=row("Sursă",c.sursa&&c.sursa!=="user"?esc(c.sursa):null);
  h+='</dl>';
  if(c.tip!=="UAT"){ const used=(c.ajutoare_minimis||[]).reduce((s,x)=>s+(x.suma_eur||0),0); const plaf=c.plafon_minimis_eur!=null?c.plafon_minimis_eur:(300000-used);
    h+='<div class="section"><h2>Plafon de minimis (întreprindere unică)</h2>';
    h+='<div class="minibar"><span style="width:'+Math.min(100,used/3000)+'%;background:'+(used>=300000?'var(--critical)':used>=240000?'var(--warn)':'var(--accent)')+'"></span></div>';
    h+='<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px"><span>utilizat: <b>'+money(used,"EUR")+'</b></span><span>disponibil: <b style="color:var(--good-text)">'+money(plaf,"EUR")+'</b> / 300.000</span></div>';
    if(c.nota_minimis) h+='<div class="callout warn" style="margin-top:8px">'+esc(c.nota_minimis)+'</div>';
    if(c.ajutoare_minimis&&c.ajutoare_minimis.length) h+='<table class="tbl" style="margin-top:6px"><thead><tr><th>An</th><th>Schemă</th><th class="num">EUR</th></tr></thead><tbody>'+c.ajutoare_minimis.map(x=>'<tr><td>'+x.an+'</td><td>'+esc(x.schema)+'</td><td class="num">'+nf.format(x.suma_eur)+'</td></tr>').join("")+'</tbody></table>';
    h+='</div>'; }
  if(prj.length) h+='<div class="section"><h2>Proiecte</h2>'+prj.map(p=>'<div class="kcard" onclick="openProiect(\''+p.id+'\')"><div class="t">'+esc(p.titlu)+' <span class="hdot '+health(p)+'"></span></div><div class="m">'+esc(p.faza)+' · '+esc(FAZE[p.faza]||"")+' · grant '+money(p.grant_lei,"lei")+'</div></div>').join("")+'</div>';
  h+='<div class="section"><h2>Top apeluri potrivite</h2>';
  h+= tops.length? '<table class="tbl"><thead><tr><th>Apel</th><th>Termen</th><th>Verdict · scor</th></tr></thead><tbody>'+tops.map(m=>'<tr onclick="openMemo(\''+cid+'\',\''+esc(m.apel.id_apel)+'\')"><td><b>'+esc(m.apel.titlu)+'</b><br><small style="color:var(--muted)">'+esc(m.apel.program)+'</small></td><td>'+cdBadge(m.apel.data_inchidere,{cont:/continuu/.test(m.apel.tip_depunere||"")})+'</td><td>'+vChip(m.verdict,m.scor)+'</td></tr>').join("")+'</tbody></table>' : '<div class="empty">Nimic potrivit acum'+(df.capitaluri_proprii_lei<0?" — blocat de capitalurile negative":"")+'.</div>';
  h+='</div>'+((c.note||c.nota)?'<div class="callout">'+esc(c.note||c.nota)+'</div>':"")+'</div>';
  openDrawer(h); }
function openProiect(pid){ const p=PR.find(x=>x.id===pid); if(!p) return;
  const c=clientById(p.client_id); const a=apelById(p.apel_id)||{titlu:(p.apel_istoric||{}).titlu||p.apel_id, program:(p.apel_istoric||{}).program||"apel istoric"};
  let h=drawerHead(esc(p.titlu)+(p.demo?' <span class="tag-demo">DEMO</span>':""), esc((c?c.denumire:"")+" × "+(a.titlu||"")))+'<div class="db">';
  h+='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="badge b-planificat">'+p.faza+" · "+esc(FAZE[p.faza]||"")+'</span><span class="hdot '+health(p)+'"></span>'+(p.cod_smis?'<span class="chip">SMIS '+esc(p.cod_smis)+'</span>':"")+'</div>';
  h+='<dl class="kv">';
  h+='<dt>Valoare totală</dt><dd>'+money(p.valoare_totala_lei,"lei")+'</dd>';
  h+='<dt>Grant</dt><dd>'+money(p.grant_lei,"lei")+' · cofinanțare '+money(p.cofinantare_lei,"lei")+'</dd>';
  h+='<dt>Consultant</dt><dd>'+esc(p.consultant||"—")+'</dd>';
  h+='<dt>Comision prognozat</dt><dd>'+money(Math.round(comisionPrognozat(p)),"lei")+' <small style="color:var(--muted)">(fix + succes% × grant × prob. fază '+Math.round((PROB[p.faza]||0)*100)+'%)</small></dd>';
  if(p.next_action) h+='<dt>Next action</dt><dd><b>'+esc(p.next_action.descriere)+'</b><br>'+cdBadge(p.next_action.termen,{task:true})+'</dd>';
  const hw=healthWhy(p); if(hw) h+='<dt>Sănătate</dt><dd><span class="hdot '+health(p)+'"></span> '+esc(hw)+'</dd>';
  h+='</dl>';
  const tsp=TS.filter(t=>t.proiect_id===p.id).sort((a,b)=>(a.data||"").localeCompare(b.data||"")); if(tsp.length) h+='<div class="section"><h2>Termene & obligații ('+tsp.length+')</h2><ul class="list">'+tsp.map(t=>'<li><span style="flex:1"><span class="tp">'+esc((t.tip||"").replace(/_/g," "))+'</span><br>'+esc(t.descriere||"")+'</span>'+cdBadge(t.data,{task:true})+'</li>').join("")+'</ul></div>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">';
  if(!p.demo) h+='<button class="btn primary" onclick="evStartFor(\''+esc(p.id)+'\')">🧪 Verifică proiectul</button>';
  if(apelById(p.apel_id)) h+='<button class="btn" onclick="openApel(\''+esc(p.apel_id)+'\')">📡 Apelul</button>';
  if(c) h+='<button class="btn" onclick="openClient(\''+c.id+'\')">👥 Clientul</button>';
  if(!p.demo) h+='<button class="btn" onclick="crmProjForm(\''+esc(p.id)+'\')">✎ Editează</button><button class="btn ghost" style="margin-left:auto;color:var(--critical)" onclick="crmDeleteProject(\''+esc(p.id)+'\')">🗑 Șterge</button>';
  h+='</div>';
  if(p.evaluari&&p.evaluari.length) h+='<div class="section"><h2>Verificări pre-depunere</h2><ul class="list">'+p.evaluari.map(e=>'<li><span style="color:var(--muted);min-width:80px">'+fmtDs(String(e.data).slice(0,10))+'</span><span class="evst '+(e.vclass==="go"?"ok":e.vclass==="no"?"no":"nv")+'">'+esc(e.verdict.split(" — ")[0])+'</span> <small style="color:var(--muted)">'+e.blocante+' blocante · '+e.remediat+' de remediat · '+e.nv+' neverificate'+(e.punctaj?' · punctaj '+esc(e.punctaj):'')+'</small></li>').join("")+'</ul></div>';
  if(p.istoric&&p.istoric.length) h+='<div class="section"><h2>Istoric</h2><ul class="list">'+p.istoric.map(e=>'<li><span style="color:var(--muted);min-width:80px">'+fmtDs(e.data)+'</span> '+esc(e.eveniment)+'</li>').join("")+'</ul></div>';
  if(p.note) h+='<div class="callout">'+esc(p.note)+'</div>';
  h+='</div>'; openDrawer(h); }


/* ---------- global search ---------- */
/* Paleta de comenzi (Ctrl+K): caută apeluri/clienți/proiecte, sare la secțiuni, rulează acțiuni. Navigare cu ↑↓ Enter. */
const CMD_ACTIONS=[
  {id:"client_nou",l:"Client nou",s:"adaugă un client în CRM",run:()=>{ S.view="clienti"; render(); crmNewForm(); }},
  {id:"proiect_nou",l:"Proiect nou",s:"adaugă un proiect în pipeline",run:()=>{ S.view="pipeline"; render(); crmProjForm(); }},
  {id:"verifica",l:"Verifică un proiect",s:"evaluator pre-depunere",run:()=>{ S.view="verif"; render(); }},
  {id:"ics",l:"Export calendar .ics",s:"termenele în Google/Outlook",run:()=>exportICS()},
  {id:"tema",l:"Comută tema (dark / light)",s:"aspect",run:()=>applyTheme(S.theme==="dark"?"light":"dark")},
  {id:"import",l:"Import clienți (CSV / JSON)",s:"CRM",run:()=>{ S.view="clienti"; render(); crmImportOpen(); }},
  {id:"actualizare",l:"Cum actualizez datele",s:"scanare radar",run:()=>$("#btnRescan").click()}];
function buildIndex(){ const ix=[];
  NAV.forEach(([id,ic,l])=>ix.push({k:"secțiune",id,l,s:"deschide secțiunea"}));
  CMD_ACTIONS.forEach(a=>ix.push({k:"acțiune",id:a.id,l:a.l,s:a.s}));
  A.forEach(a=>ix.push({k:"apel",id:a.id_apel,l:a.titlu,s:(a.program||"")+(a.data_inchidere?" · "+fmtDs(a.data_inchidere):"")}));
  CL.forEach(c=>ix.push({k:"client",id:c.id,l:c.denumire,s:(c.judet||"")+" · "+(c.dimensiune||c.tip||"")}));
  PR.forEach(p=>ix.push({k:"proiect",id:p.id,l:p.titlu,s:p.faza+" · "+(FAZE[p.faza]||"")}));
  return ix; }
let IX=null;
function doSearch(q){ IX=IX||buildIndex(); q=q.toLowerCase().trim(); if(!q) return IX.filter(x=>x.k==="secțiune"||x.k==="acțiune").slice(0,12);
  const toks=q.split(/\s+/); const score=x=>{ const t=(x.l+" "+x.s).toLowerCase(); if(!toks.every(tk=>t.includes(tk))) return -1; let s=0; if(x.l.toLowerCase().startsWith(q)) s+=3; if(x.k==="secțiune"||x.k==="acțiune") s+=1; return s; };
  return IX.map(x=>({x,s:score(x)})).filter(o=>o.s>=0).sort((a,b)=>b.s-a.s).slice(0,12).map(o=>o.x); }
function cmdRun(k,id){ if(k==="apel") openApel(id); else if(k==="client") openClient(id); else if(k==="proiect") openProiect(id); else if(k==="secțiune"){ S.view=id; render(); } else if(k==="acțiune"){ const a=CMD_ACTIONS.find(x=>x.id===id); if(a) a.run(); } }
function hookSearch(){ const inp=$("#globalSearch"), box=$("#searchHits"); let cur=-1;
  const paint=()=>{ box.querySelectorAll(".hit").forEach((el,i)=>el.classList.toggle("sel",i===cur)); };
  const show=()=>{ const hits=doSearch(inp.value); cur=hits.length?0:-1;
    box.innerHTML=(inp.value.trim()?'':'<div class="hint">Scrie pentru a căuta apeluri, clienți, proiecte — sau alege o secțiune / acțiune:</div>')+hits.map(h=>'<div class="hit" data-k="'+h.k+'" data-id="'+esc(h.id)+'"><span class="k">'+h.k+'</span><b>'+esc(h.l)+'</b><small>'+esc(h.s)+'</small></div>').join("")||'<div class="hit" style="cursor:default">Niciun rezultat pentru «'+esc(inp.value)+'»</div>';
    box.classList.add("open"); paint();
    box.querySelectorAll(".hit[data-k]").forEach(el=>el.onclick=()=>{ box.classList.remove("open"); inp.value=""; inp.blur(); cmdRun(el.dataset.k,el.dataset.id); }); };
  inp.addEventListener("input",show); inp.addEventListener("focus",show);
  inp.addEventListener("keydown",e=>{ const hits=box.querySelectorAll(".hit[data-k]"); if(e.key==="ArrowDown"){ e.preventDefault(); cur=Math.min(hits.length-1,cur+1); paint(); } else if(e.key==="ArrowUp"){ e.preventDefault(); cur=Math.max(0,cur-1); paint(); } else if(e.key==="Enter"){ if(hits[cur]){ e.preventDefault(); hits[cur].click(); } } else if(e.key==="Escape"){ box.classList.remove("open"); inp.blur(); } });
  document.addEventListener("click",e=>{ if(!e.target.closest(".searchwrap")) box.classList.remove("open"); });
  document.addEventListener("keydown",e=>{ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){ e.preventDefault(); inp.focus(); inp.select(); } if(e.key==="Escape"&&document.activeElement!==inp){ closeDrawer(); sheetClose(); box.classList.remove("open"); } }); }
/* Stare goală reutilizabilă: iconiță + titlu + explicație + acțiune */
function emptyState(icon,title,text,actionHtml){ return '<div class="emptybig">'+(icon?'<div class="ei">'+icon+'</div>':"")+'<div class="et">'+title+'</div>'+(text?'<div class="ex">'+text+'</div>':"")+(actionHtml?'<div class="ea">'+actionHtml+'</div>':"")+'</div>'; }

