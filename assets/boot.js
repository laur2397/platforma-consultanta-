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
    '<li>🔄 <b>Scanare la cerere:</b> cere în conversația cu Claude «actualizare» — agenții re-verifică apelurile pe surse web, adaugă apelurile noi și republică platforma.</li>'+
    '<li>⏸ <b>Fără scanare automată:</b> actualizarea zilnică programată e oprită — datele se reîmprospătează doar când ceri (ultima: '+esc(fmtD(String((DB.apeluri||{}).extras_la||"").slice(0,10)))+').</li>'+
    '<li>📎 <b>Date proprii:</b> trimite fișierul Excel/CSV cu clienții sau proiectele în conversație — le import în CRM/pipeline.</li>'+
    '<li>⬆ <b>Manual:</b> Administrare → Import date (JSON).</li></ul>'+
    '<div class="callout warn">Sursele gov.ro centrale sunt blocate din datacenter — scanarea folosește OI-uri regionale + comunicate oficiale + presă (marcate [DE VERIFICAT] unde e cazul). Pentru acces direct: browserul tău (Claude in Chrome) sau VPS românesc (Faza 3).</div></div>'); };
  $("#overlay").onclick=closeDrawer;
  $("#firmName").textContent=(META.firma||{}).nume||"";
  $("#stampBox").innerHTML="radar: "+esc(fmtD(String((DB.apeluri||{}).extras_la||"").slice(0,10)))+(function(){const a=radarAge();return a?' · <b style="color:'+radarAgeColor(a.cls)+'">'+(a.zile===0?'azi':'acum '+a.zile+'z')+'</b>':'';})()+"<br>v"+esc(META.versiune||"1");
  const hb=$("#btnHelp"); if(hb) hb.onclick=()=>helpOpen(false);
  /* pe telefon căsuța e îngustă: placeholder scurt (textul lung se tăia la „Caută apel”) */
  (function(){ const gs=$("#globalSearch"); if(!gs) return; const full=gs.placeholder; const fit=()=>{ gs.placeholder = window.innerWidth<900 ? "Caută…" : full; }; fit(); window.addEventListener("resize",fit); })();
  hookSearch(); render();
  try{ if(!localStorage.getItem("eufcc_seen")) setTimeout(()=>helpOpen(true),600); }catch(e){}
})();
