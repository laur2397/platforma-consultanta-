/* ============ BOOT — pornirea aplicației (ultimul script) ============ */
"use strict";
/* ---------- boot ---------- */
function applyTheme(t){ S.theme=t; document.documentElement.setAttribute("data-theme",t); try{ localStorage.setItem("eufcc_theme",t); }catch(e){} }
window.__reboot=function(){ MATCH=null; IX=null; render(); };
(function init(){
  let saved=null; try{ saved=localStorage.getItem("eufcc_theme"); }catch(e){}
  sessLoad(); radarLoad(); try{ S.checklists=JSON.parse(localStorage.getItem("eufcc_checklists")||"{}")||{}; }catch(e){}
  applyTheme(saved||(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"));
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
  $("#stampBox").innerHTML="radar: "+esc(String((DB.apeluri||{}).extras_la||"").slice(0,10))+(function(){const a=radarAge();return a?' · <b style="color:'+radarAgeColor(a.cls)+'">acum '+a.zile+'z</b>':'';})()+"<br>v"+esc(META.versiune||"1");
  const hb=$("#btnHelp"); if(hb) hb.onclick=()=>helpOpen(false);
  hookSearch(); render();
  try{ if(!localStorage.getItem("eufcc_seen")) setTimeout(()=>helpOpen(true),600); }catch(e){}
})();
