# EU Funds Command Center — Radar Fonduri Europene

Dashboard operațional pentru consultanță în fonduri europene: **radar de apeluri**, **matching client × apel**, **pipeline de proiecte**, **calendar de termene** și **memo-uri GO/NO-GO**.

Aplicație web statică, fără backend și fără dependențe externe — se încarcă instant, funcționează **offline** și se poate **instala ca aplicație** pe telefon, tabletă sau desktop.

> Regulă de operare: **AI pregătește, omul decide.** Verdictele și memo-urile sunt estimări pe date sumare; nimic nu pleacă spre AM sau client fără validare umană.

---

## 🌐 Versiunea live

După activarea GitHub Pages (vezi mai jos), site-ul e disponibil la:

**https://laur2397.github.io/platforma-consultanta-/**

Îl poți deschide de pe orice dispozitiv cu browser. Pe telefon/tabletă/desktop poți apăsa **„Adaugă pe ecranul principal” / „Instalează aplicația”** ca să-l ai ca aplicație de sine stătătoare, cu funcționare offline.

---

## 📁 Structura proiectului

```
.
├── index.html                  # Shell-ul aplicației (markup + meta + PWA)
├── assets/
│   ├── styles.css              # Tot stilul (temă light/dark)
│   ├── app.js                  # Logica aplicației (randare, matching, drawer, căutare)
│   └── data.js                 # STRATUL DE DATE (window.DB) — se actualizează frecvent
├── icons/                      # Iconițe PWA + favicon
├── manifest.webmanifest        # Manifest PWA (instalare pe dispozitiv)
├── sw.js                       # Service worker (funcționare offline)
└── .github/workflows/deploy.yml # Deploy automat pe GitHub Pages
```

Codul a fost separat pe responsabilități pornind de la fișierul monolitic original:
stilul, logica și **datele** sunt acum în fișiere distincte, ca datele (care se schimbă zilnic) să poată fi actualizate fără a atinge codul.

---

## ✏️ Cum actualizezi datele

Toate datele trăiesc în **`assets/data.js`**, sub forma unui singur obiect `window.DB` (apeluri, clienți, proiecte, surse etc.). Ai două variante:

1. **Din aplicație:** meniul **Administrare → Import date (JSON)** — lipești un JSON cu aceeași structură și interfața se reconstruiește în memorie. Pentru persistență, salvează rezultatul în `assets/data.js`.
2. **Direct în fișier:** editezi `assets/data.js` (structura: `window.DB = { ... };`) și faci commit. La următorul push pe `main`, site-ul live se actualizează automat.

Poți oricând **exporta** stratul curent din **Administrare → Export date (JSON)** ca backup.

---

## 🚀 Activarea GitHub Pages (o singură dată)

1. Fă merge la acest branch în `main` (prin Pull Request).
2. În repo: **Settings → Pages → Build and deployment → Source: „GitHub Actions”.**
3. Gata. La fiecare push pe `main`, workflow-ul `Deploy site pe GitHub Pages` publică automat site-ul. Îl poți rula și manual din tab-ul **Actions**.

> Workflow-ul încearcă să activeze Pages automat la prima rulare. Dacă apare o eroare de permisiuni, setează manual sursa pe „GitHub Actions” ca la pasul 2.

---

## 💻 Rulare locală

E un site static — nu are nevoie de build. Cel mai simplu, pornește un server local:

```bash
# Python 3
python3 -m http.server 8000
# apoi deschide http://localhost:8000
```

> Recomandat un server local (nu `file://`), pentru ca service worker-ul și încărcarea modulelor de date să funcționeze corect.

---

## 🔒 Confidențialitate

Aplicația rulează integral în browser. Nu trimite date către niciun server — tot ce vezi vine din `assets/data.js`. Verdictele de eligibilitate sunt orientative și trebuie validate uman înainte de orice comunicare oficială.
