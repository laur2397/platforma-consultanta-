# EU Funds Command Center — Stadiu & Foaie de parcurs

*Radiografie generată din audit automat (3 agenți), 15 august 2026.*
Live: https://laur2397.github.io/platforma-consultanta-/ · Versiune date 1.5 · Radar extras 01.08.2026

---

## 1. Datele din platformă

Stratul public/de referință e real și substanțial; clienții tăi sunt încă demo.

| Dataset | Nr. | Stare |
|---|---|---|
| Apeluri de finanțare | 93 | real · verificat cu surse |
| Primării (toate județele) | 3.181 | real · liveness, telefoane, email |
| Proiecte contractate MIPE | 16.937 | real |
| Achiziții SICAP | 2.000 | real · eșantion |
| Surse monitorizate | 33 | real |
| Clienți în CRM | 8 | **demo · fictiv** |
| Proiecte în pipeline | 8 | **demo** |
| ONRC (registrul firmelor) | — | **local · îl încarci tu** |

Snapshot-ul apelurilor e din 1 august 2026 — ~2 săptămâni vechime, fără refresh automat.

## 2. Cele 15 secțiuni — stare reală (12/15 funcționale)

| Secțiune | Stare | Note |
|---|---|---|
| 🏠 Buletin | funcțional | KPI recalculate zilnic; text editorial din date |
| 📡 Radar apeluri | funcțional | registru filtrabil, drawer detalii + linkuri |
| 🎯 Matching | funcțional | motor bidirecțional, scor 0–100, GO/NO-GO |
| 📋 Pipeline | funcțional | kanban P0–P9 (pe proiecte demo) |
| 📅 Calendar | funcțional | listă + grilă lunară, export .ics |
| 👥 Clienți | parțial | CRM bogat, dar 8 clienți demo; import nefuncțional |
| 🏢 Prospect ONRC | funcțional | bază locală de firme (telefon, administrator, CAEN) |
| 📚 Bibliotecă | parțial | corrigenda + linkuri; șabloane hardcodate |
| 📊 Rapoarte | parțial | L4/L5 din date reale; unele KPI hardcodate |
| 🛡️ Conformitate | funcțional | minimis, GBER pe județ, praguri; riscuri demo |
| 🧪 Verificare proiect | funcțional · v2 | reguli pre-încărcate din radar + 15 reguli universale cu sursă legală, dosar ghidat cu semafor live, plan de acțiune, salvare la proiect, PDF |
| 🔎 Market Intel | funcțional | harta pieței pe județ, leaduri calde, prospecți SICAP — din date reale |
| 🧮 Financiar | funcțional | 8 tab-uri: bilanț, P&P, ETF, buget, deviz HG907 |
| 🗄️ Baze de date | funcțional | 7 registre publice + export CSV |
| ⚙️ Administrare | funcțional | surse, export/import JSON, jurnal |

**Design v2 (sept. 2026):** sistem vizual nou — Inter, sidebar navy cu iconițe SVG, KPI cu accent de stare, grafice SVG native (donut / coloane / bare) cu paletă validată CVD, dark mode selectat, tab-bar mobil + foaie „Mai mult”, tabele derulabile pe telefon (bug: meniul nu apărea deloc sub 900px — reparat).

Extra (nu în meniu): asistent AI Gemini (cheia ta), scanare web live, PWA offline, service worker. În auditul de azi: **8 bug-uri reparate** (inclusiv o eroare care marca greșit o microîntreprindere eligibilă drept „neconform").

## 3. Ce lipsește pentru „platformă completă"

1. **Clienții & proiectele tale** — acum demo; nevoie de import real (CSV/Excel).
2. **Baza ONRC completă** — se încarcă local; harta de regiuni știe doar Cluj/Iași/Ilfov.
3. **Date mereu la zi** — snapshot ~2 săptămâni, fără scanare programată.
4. **Evaluator din ghid (PDF)** — rulebook manual; învățare automată din ghid ar accelera mult.
5. **Conținut de finisat** — Market Intel, linii hardcodate în Rapoarte/Conformitate, șabloane fixe.

## 4. Foaia de parcurs

- **Faza 0 — Fundația (GATA):** platformă live, PWA offline, 12/15 secțiuni funcționale, evaluator wizard, ONRC local, chat Gemini, scanare web live, audit + 8 corecții.
- **Faza 1 — CRM real (urmează):** import clienți & proiecte (CSV/Excel/JSON), înlocuirea datelor demo, persistență locală, ONRC→CRM real.
- **Faza 2 — Date proaspete:** scanare programată zilnică (Routine) + indicator de prospețime + ONRC pe toate județele.
- **Faza 3 — Evaluator complet:** draft rulebook din text ghid cu AI + validare umană; module de domeniu; legare evaluator↔radar↔client; export PDF.
- **Faza 4 — Backend opțional:** serviciu Python pentru PDF/OCR, găzduire privată, scanare automată din IP RO.
- **Faza 5 — Finisaje:** Market Intel, curățare conținut hardcodat, bibliotecă reală, roluri/notificări.

## 5. Ce facem imediat (prioritizare)

1. **Import CRM real (Faza 1)** — cel mai mare impact; fără clienții tăi reali, restul lucrează în gol.
2. **Scanare programată zilnică (Faza 2)** — ca platforma chiar „să se actualizeze singură".
3. **Draft rulebook din ghid cu AI (Faza 3)** — face evaluatorul de zeci de ori mai rapid.
