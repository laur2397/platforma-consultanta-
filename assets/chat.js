/* ============ ASISTENT AI — chat BYOK Gemini ============ */
"use strict";
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
