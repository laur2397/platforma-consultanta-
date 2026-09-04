# Brief de design — EU Funds Command Center v3

Scop: platforma trebuie să pară **organizată, calmă și evidentă** pentru un consultant de fonduri europene care o deschide de 10 ori pe zi, pe laptop și pe telefon. Regula de aur: **fiecare pagină răspunde la o singură întrebare, în primele 2 secunde**, iar restul stă ordonat dedesubt.

## 1. Arhitectura (deja implementată în `core.js`)

5 zone în sidebar / tab-bar mobil, fiecare cu tab-uri în pagină (`.zonetabs`). Vederile existente rămân toate:

| Zonă | Tab-uri (view id) | Întrebarea zonei |
|---|---|---|
| **Azi** | buletin | Ce am de făcut azi? |
| **Apeluri** | radar · calendar · matching · biblioteca | Ce finanțări există și pentru cine? |
| **Clienți** | clienti · prospect · intel | Cu cine lucrez și pe cine caut? |
| **Proiecte** | pipeline · verif · rapoarte · conformitate | Unde sunt dosarele și ce riscuri au? |
| **Instrumente** | financiar · baze · admin | Calcule, registre, setări |

## 2. Șablonul de pagină (obligatoriu)

```
[zonetabs — le pune core.js automat]
.viewtitle  → h1 scurt (2–3 cuvinte) + .sub o frază (ce e pagina) + .viewactions: MAX 2 butoane; restul în meniul „⋯” (helper: moreMenu([...]))
[opțional] un singur .callout de stare (date vechi, demo, fără clienți) — niciodată două
HERO        → lucrul cel mai important al paginii, vizibil fără scroll: lista/tabelul principal SAU 3 KPI + acțiunea principală
SECUNDAR    → carduri în .grid2 (nu .grid3 cu text), fiecare cu cardHead(titlu, count, acțiune)
REFERINȚĂ   → texte explicative, legi, praguri, „cum se citește” → <details class="acc2"> închise implicit
```

Reguli:
- **Un singur nivel de KPI** pe pagină (`.tiles`), maximum 4 (Azi poate avea 3 mari + 4 mici).
- **Textul explicativ nu stă în cale.** Orice paragraf peste 2 rânduri intră într-un `<details class="acc2"><summary>De ce contează</summary>` sau într-un `title`. Excepție: o singură propoziție `.sub` sub titlu.
- **Fără emoji în titluri de carduri** (h2). Emoji e permis doar ca marker în liste (❗ ▸ □) sau în butoane secundare. Titlurile de vedere (h1) primesc automat iconița SVG.
- **Fără `style="font-size:14px"` inline pe h2** — `.card>h2` are deja stilul (12px uppercase muted). Folosește `cardHead()`.
- **Acțiunea principală e albastră (.btn.primary) și e una singură** pe ecran. Restul: `.btn` sau `.btn.ghost`.
- **Tabelele**: max 6 coloane pe desktop; ce depășește merge în drawer. Numerele aliniate dreapta (`class="num"`). Rândurile clicabile au `tabindex="0"`.
- **Stări goale**: `emptyState(icon, titlu, text, acțiuniHtml)` — niciodată un card gol sau „—”.
- **Filtre**: un singur rând `.filters`; filtrele secundare într-un `<details class="acc2">Mai multe filtre</details>`.
- **Mobil (<900px)**: conținutul principal primul; tabele în carduri (`.tbl.stack` cu `data-l`) sau derulare orizontală în `.tw`; butoanele `.viewactions` pe un rând (max 2 + ⋯).
- **Dark mode**: doar tokenuri (`var(--…)`), niciun hex nou.
- **Onestitate**: nimic inventat; „[DE VERIFICAT]”/„demo” rămân vizibile; nu ascunde stări „neverificat”.

## 2b. Glosar de termeni (un singur nume pentru fiecare lucru)

| Concept | Termenul folosit în UI | Nu folosi |
|---|---|---|
| data limită a unui apel | **Termen** | Închidere (ca antet de coloană), Deadline |
| următorul pas pe un proiect | **Următoarea acțiune** | Next action |
| cel mai bun apel pentru un client / client pentru un apel | **Cel mai potrivit apel** / **Cel mai potrivit client** | Top match, Top apel |
| suma nerambursabilă | **Grant** (în tabele) · „sprijin nerambursabil” doar în text legal | Finanțare nerambursabilă (ca etichetă) |
| export | **⬇ Export CSV** / **⬇ Export JSON** / **⬇ Export .ics** | Salvează fișa, Exportă, CSV matrice |
| numere | `nf.format()` (3.181), curs valutar cu virgulă (5,2418) | 3181, 5.2418 |
| date | `fmtD()` → 02.09.2026 | 2026-09-02 |
| navigație de nivel 2 | doar `.zonetabs` (subliniere); nivelurile 3+ sunt pastile/segment (`.ap-seg`, `.fchip`) | al doilea rând subliniat |

Regulă de aur: **fiecare acțiune apare o singură dată pe ecran** (fie în `.viewactions`/⋯, fie în card — nu în ambele) și un singur `.btn.primary` vizibil, inclusiv topbar-ul.

## 3. Vocabularul de componente (există în `styles.css`)

`.card` · `.card>h2` (etichetă secțiune) · `cardHead(t,count,actionsHtml)` · `.tiles/.tile` (+`.acc/.crit/.warnv/.long`, `.tiles.compact`) · `.badge b-*` (stări apel) · `.cd cd-good/warn/crit/off` (pastile de status) · `.chip/.chip.hl` · `.fchip/.fchip.on` (filtre) · `.filters` · `.callout/.warn/.crit/.good` · `.list` · `details.acc2` · `.tbl` (+`.stack`, `.tw` wrapper automat) · `.kv` (definiții) · `.minibar` · `.evsrc` (text mic muted) · `emptyState()` · `chartDonut/chartCols/chartHBars` · `drawerHead()/openDrawer()` · `toast()` · `moreMenu()`.

Nu inventa componente paralele. Dacă lipsește ceva, adaugă CSS **doar în fișierul tău** `assets/zone-<x>.css` cu prefixul zonei (ex. `.pj-…`).

## 4. Ce face fiecare pagină „bine” (ținta)

- **Azi**: 3 KPI mari (active · ≤7 zile · ≤30 zile) + 4 mici; apoi „Termenele următoarelor 14 zile” și „Urgențe”; graficele sub; sinteza și lista DE VERIFICAT în `details`.
- **Radar**: lista e eroul; scenariile + filtrele într-un singur bloc compact; drawer-ul cu tot ce nu încape.
- **Calendar**: restanțe → săptămâna aceasta → următoarele; filtrele pe un rând.
- **Matching**: două coloane egale, selectoarele sus, tabelele fără text în plus; explicația GO/GO-COND./NO-GO într-un `details`.
- **Bibliotecă**: generatorul L1 sus (e acțiunea), ghiduri, corrigende, șabloane — fiecare secțiune cu ancoră.
- **CRM clienți**: filtre + grilă de carduri uniforme (aceeași înălțime, aceeași ordine a informației); fișa în drawer cu acțiuni sus.
- **Prospect ONRC**: zona de încărcare compactă când există date; rezultatele eroul; datele personale ascunse implicit.
- **Market Intel**: radiografia județului sus (implicit județul primului client), harta pieței, apoi leaduri/SICAP în două coloane; sursele în `details`.
- **Pipeline**: kanban-ul e eroul (imediat sub 3 KPI + filtre); graficele sub.
- **Verificare proiect**: pașii 1-2-3 și semaforul; fără text de introducere lung (o propoziție).
- **Rapoarte**: două carduri egale (L4 · L5) cu acțiunile SUS, KPI dedesubt.
- **Conformitate**: registrul de riscuri eroul; simulator minimis + GBER în `.grid2`; toate tabelele de referință (corecții, praguri, fluxuri, durabilitate, conflict de interese) în `details.acc2` închise, cu un rând-rezumat vizibil.
- **Financiar**: sub-tab-urile sunt eroul; callout-ul regulator din fiecare tab devine `details`; un singur rând de unelte.
- **Baze de date**: „Prezentare” devine o grilă compactă de 7 carduri (icon + nume + număr + o propoziție + buton), nu 7 paragrafe.
- **Administrare**: KPI surse → registrul cu filtre → backup/export/import → prospețime; legendele în `details`.

## 5. Proceduri

- Testezi cu Playwright: `node <scratchpad>/audit/run_views.js` (rulează toate vederile, 0 erori) și capturi desktop/mobil pentru paginile tale.
- Nu modifici alte fișiere decât ale tale (JS + CSS de zonă). `core.js`, `styles.css`, `index.html`, `evaluator.js` sunt ale coordonatorului — dacă ai nevoie de o schimbare acolo, o descrii în raport.
- Toate funcțiile rămân globale; handler-ele inline `onclick` continuă să funcționeze; `render(true)` păstrează scroll-ul.
- Nu ștergi funcționalități. Poți muta, grupa, ascunde în `details`, dar nu elimina.
