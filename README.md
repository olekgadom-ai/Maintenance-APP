# Maintenance-APP

Aplikacja do obsługi awarii maszyn na zakładzie produkcyjnym (model ticketowy). Persony: lider obszaru, technik UR, kierownik UR. Plan i roadmapa: [`docs/PLAN.md`](docs/PLAN.md).

## Stack

Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4, next-intl (pl/en), Vitest. Backend: Supabase, projekt `maintenance-app` (`flfaagqjthrvxfxzbskp`, eu-central-1).

## Praca lokalna

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000 → przekierowanie na /pl lub /en
```

| Skrypt                            | Opis                                   |
| --------------------------------- | -------------------------------------- |
| `npm run lint`                    | ESLint                                 |
| `npm run format` / `format:check` | Prettier (z sortowaniem klas Tailwind) |
| `npm run typecheck`               | Typy tras Next.js + `tsc`              |
| `npm test`                        | Testy jednostkowe (Vitest)             |
| `npm run build`                   | Build produkcyjny                      |

## Struktura

- `src/app/[locale]/` – strony; locale jest parametrem głównym (`next/root-params`)
- `src/i18n/` – routing i konfiguracja next-intl, `src/proxy.ts` – przekierowanie na język
- `messages/{pl,en}.json` – tłumaczenia (test pilnuje zgodności kluczy)
- `src/lib/tickets/status.ts` – statusy, priorytety, role i dozwolone przejścia ticketu
- `src/components/` – komponenty UI (`ui/` w stylu shadcn)

## Baza danych (Supabase)

- `supabase/migrations/` – schemat, workflow ticketów, RLS, storage. Nazwy plików odpowiadają wersjom zastosowanym w projekcie.
- `supabase/seed.sql` – dane demo (3 obszary, 10 maszyn).
- `supabase/tests/ticket_workflow.sql` – test całego cyklu i uprawnień każdej roli; działa w transakcji i robi `rollback`.
- `src/lib/supabase/database.types.ts` – typy generowane ze schematu (regenerować po każdej migracji).

Zasady dostępu w skrócie:

- Status i przypisanie zmieniają tylko funkcje `create_ticket`, `transition_ticket`, `assign_ticket`. Sprawdzają rolę i dozwolone przejście (`private.ticket_transitions`, zsynchronizowane testem z `src/lib/tickets/status.ts`) i zapisują zdarzenie w `ticket_events`.
- Widoczność: kierownik widzi wszystko, lider tylko swój obszar, technik swoje tickety i pulę nowych.
- Rola i obszar użytkownika pochodzą z `app_metadata` (ustawia je tylko administrator), nie z danych edytowalnych przez użytkownika.
- Czas pracy technika liczy się automatycznie: wejście w `in_progress` otwiera wpis w `ticket_work_logs`, wyjście go zamyka.

## Logowanie (wersja demo)

Ekran `/[locale]/login` pozwala wybrać rolę bez wpisywania hasła. Każda rola to wspólne konto w Supabase:

| Rola                   | Konto                        | Osoba            |
| ---------------------- | ---------------------------- | ---------------- |
| Lider obszaru (Montaż) | `lider@demo.example.com`     | Anna Nowak       |
| Technik UR             | `technik@demo.example.com`   | Piotr Kowalski   |
| Kierownik UR           | `kierownik@demo.example.com` | Marek Wiśniewski |

Serwer loguje się na wybrane konto hasłem z `DEMO_USER_PASSWORD` (tylko po stronie serwera, nigdy w zmiennej `NEXT_PUBLIC_`). Żeby ustawić własne hasło dla kont demo, uruchom w SQL Editorze Supabase:

```sql
update auth.users
set encrypted_password = extensions.crypt('TWOJE_HASLO', extensions.gen_salt('bf'))
where email in ('lider@demo.example.com', 'technik@demo.example.com', 'kierownik@demo.example.com');
```

i wpisz to samo hasło do `DEMO_USER_PASSWORD` w `.env.local` (lokalnie) oraz w zmiennych środowiskowych hostingu.

Ochrona tras: `src/proxy.ts` odświeża sesję Supabase i przekierowuje niezalogowanych na ekran logowania; strony dodatkowo sprawdzają użytkownika przez `src/lib/auth/session.ts`, a dane chroni RLS.
