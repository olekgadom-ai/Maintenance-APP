# Plan: Aplikacja Utrzymania Ruchu (CMMS, model ticketowy)

## Kontekst

Repozytorium `Maintenance-APP` jest puste (tylko README). Budujemy aplikację do obsługi awarii na zakładzie produkcyjnym, działającą na ticketach, z trzema personami:

- **Lider obszaru**: zgłasza awarię, potwierdza jej usunięcie (lub odrzuca i ticket wraca do technika).
- **Technik UR**: dostaje ticket, realizuje go, zapisuje wykonane prace.
- **Kierownik UR**: przypisuje i nadzoruje tickety; w kolejnych fazach także KPI, TPM i premie.

Ustalenia: **Next.js + Supabase**, **mobile-first PWA**, **UI PL + EN od startu**, **MVP = pełny cykl życia ticketu awarii**. KPI, TPM i premiowanie trafiają do kolejnych faz, ale model danych od początku zbiera to, czego będą potrzebowały (znaczniki czasu, maszyna, czas pracy).

> Uwaga: skille `/ponytail:ponytail` i `/design-taste-frontend` nie są dostępne w tej sesji. Kierunek wizualny opisuję niżej, w sekcji „UI / design”.

## Stack

- Next.js 16 (App Router, TypeScript, Server Actions), Tailwind CSS + komponenty w stylu shadcn/ui (cva + tailwind-merge), lucide-react
- Supabase: Postgres, Auth (e-mail/hasło; PIN lub magic link później), RLS per rola, Realtime (nowe tickety), Storage (zdjęcia awarii)
- `next-intl` (pl/en, katalogi `messages/pl.json` i `messages/en.json`)
- PWA: manifest i service worker (`@serwist/next`), instalacja na telefonie, skan QR maszyny (`@zxing/browser`)
- Zod do walidacji formularzy, Vitest do testów jednostkowych, Playwright do E2E
- Migracje SQL w repo (`supabase/migrations`), Supabase CLI do pracy lokalnej

## Model danych (MVP)

- `profiles` (id = auth.users.id, full_name, role: `area_leader | technician | manager`, area_id, locale)
- `areas` (obszary/linie produkcyjne)
- `machines` (area_id, code, name, qr_token, criticality A/B/C)
- `tickets`
  - pola: number (sekwencja, np. `UR-2026-0001`), machine_id, area_id, reported_by, assigned_to, priority (`critical|high|normal|low`), status, title, description, machine_stopped (bool)
  - znaczniki czasu: reported_at, assigned_at, started_at, resolved_at, confirmed_at, closed_at (pod przyszłe MTTR/MTBF)
- `ticket_work_logs` (ticket_id, technician_id, started_at, ended_at, description, root_cause, action_taken)
- `ticket_parts` (ticket_id, part_name/number, qty) – prosta lista bez magazynu
- `ticket_attachments` (Storage: zdjęcia przy zgłoszeniu i po naprawie)
- `ticket_events` (log audytowy: zmiana statusu, kto, kiedy, komentarz)
- `ticket_comments`

### Maszyna stanów ticketu

```
NEW → ASSIGNED → IN_PROGRESS ⇄ ON_HOLD (czeka na części)
                       ↓
                   RESOLVED → (Lider) CONFIRMED → CLOSED
                       ↑______ REJECTED (Lider odrzuca, wraca do IN_PROGRESS)
NEW/ASSIGNED → CANCELLED (Kierownik)
```

Przejścia wymuszamy w bazie: funkcja `transition_ticket(ticket_id, to_status, comment)` (security definer) sprawdza rolę i dozwolone przejście, ustawia znaczniki czasu i zapisuje `ticket_events`. Dzięki temu logika nie rozjedzie się między UI a bazą.

### RLS (skrót)

- Lider: widzi i tworzy tickety ze swojego obszaru, potwierdza lub odrzuca tylko te ze statusem RESOLVED.
- Technik: widzi tickety przypisane do niego oraz pulę NEW (może wziąć ticket sam, jeśli kierownik na to pozwoli), dopisuje work logi i części.
- Kierownik: pełny odczyt, przypisuje, zmienia priorytet, anuluje.

## Struktura aplikacji

```
src/app/[locale]/
  (auth)/login
  (app)/layout.tsx            – shell: dolna nawigacja (mobile) / sidebar (desktop), widok zależny od roli
  (app)/tickets/              – lista z filtrami (status, obszar, priorytet)
  (app)/tickets/new           – zgłoszenie (skan QR → maszyna, zdjęcie, „maszyna stoi?”)
  (app)/tickets/[id]          – szczegóły, oś czasu zdarzeń, akcje zależne od roli i statusu
  (app)/tickets/[id]/work     – formularz technika: start/stop pracy, opis, przyczyna, części, zdjęcia
  (app)/board                 – kierownik: kanban/kolejka do przypisania, realtime
  (app)/admin/machines|areas|users – proste CRUD dla kierownika (+ druk etykiet QR)
src/lib/supabase/ (server/client/middleware), src/lib/tickets/ (akcje, schematy zod, mapa statusów)
src/components/ (TicketCard, StatusBadge, PriorityBadge, Timeline, QrScanner, PhotoPicker)
messages/pl.json, messages/en.json
supabase/migrations/*.sql, supabase/seed.sql (demo: 2 obszary, ~10 maszyn, 3 użytkownicy na rolę)
```

## UI / design

- Mobile-first z myślą o hali: duże cele dotyku (min. 48px), wysoki kontrast, czytelne w rękawicach i przy słabym świetle, wsparcie trybu ciemnego.
- Kolor zarezerwowany dla stanu i priorytetu (critical = czerwony, maszyna stoi = wyraźny baner). Reszta interfejsu neutralna, bez dekoracji.
- Lider: jeden ekran z dużym przyciskiem „Zgłoś awarię” i listą „do potwierdzenia”.
- Technik: „Moje zlecenia” posortowane wg priorytetu, akcje Start/Pauza/Zakończ zawsze w zasięgu kciuka.
- Kierownik: tablica statusów + kolejka nieprzypisanych, gęstszy układ na desktopie.

## Kolejność realizacji (MVP)

1. **Szkielet**: Next.js, Tailwind/shadcn, next-intl (pl/en, przełącznik), ESLint i Prettier, Vitest, CI w GitHub Actions (lint, typecheck, test).
2. **Supabase**: migracje schematu, enumy, `transition_ticket`, RLS, bucket Storage, seed; generowanie typów TS.
3. **Auth i role**: logowanie, middleware, `profiles`, shell nawigacji zależny od roli.
4. **Zgłaszanie (Lider)**: formularz, skan QR i wybór maszyny, zdjęcia.
5. **Kolejka i przypisanie (Kierownik)**: board, realtime, przypisanie technika, priorytet.
6. **Realizacja (Technik)**: przyjęcie ticketu, start/pauza, work log, części, rozwiązanie.
7. **Potwierdzenie (Lider)**: zatwierdzenie lub odrzucenie z komentarzem, zamknięcie.
8. **Admin**: obszary, maszyny (z etykietami QR), użytkownicy.
9. **PWA**: manifest, ikony, offline shell, powiadomienia in-app (realtime); web push w fazie 2.
10. **Testy E2E** pełnego scenariusza i dopracowanie UI.

## Roadmapa po MVP

- **Faza 2 – KPI**: MTTR, MTBF, dostępność, liczba awarii i czas postoju per maszyna/obszar/technik, Pareto przyczyn. Widoki SQL i dashboard (Recharts). Web push.
- **Faza 3 – TPM / prewencja**: plany przeglądów (interwał czasowy lub licznikowy), checklisty, automatyczne generowanie ticketów prewencyjnych (pg_cron), zadania autonomiczne dla operatorów, kalendarz.
- **Faza 4 – Zespół i premiowanie**: grafik zmian, umiejętności technika, konfigurowalne reguły premii oparte na KPI, eksport do CSV/XLSX.
- Dalej: magazyn części, offline-first z kolejką synchronizacji, dodatkowe języki (np. UA).

## Weryfikacja

- `npm run lint && npm run typecheck && npm test`: testy jednostkowe mapy przejść statusów i schematów zod.
- Testy SQL (pgTAP lub skrypty) dla `transition_ticket` i RLS: każda rola próbuje niedozwolonych przejść i odczytu cudzych danych.
- Playwright E2E: Lider zgłasza → Kierownik przypisuje → Technik loguje pracę i rozwiązuje → Lider odrzuca → Technik poprawia → Lider potwierdza → ticket CLOSED, oś czasu kompletna; uruchomienie w PL i EN oraz w viewporcie mobilnym.
- Ręczny test na Chromium z emulacją telefonu: instalacja PWA, skan QR, upload zdjęcia.

## Otwarte decyzje (do rozstrzygnięcia na etapie 2)

- Nowy projekt Supabase przez MCP czy na razie tylko lokalnie (Supabase CLI)? Domyślnie: lokalnie i migracje w repo, projekt w chmurze przed pierwszym deployem.
- Hosting: domyślnie Vercel.
