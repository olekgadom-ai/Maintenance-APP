# Maintenance-APP

Aplikacja do obsługi awarii maszyn na zakładzie produkcyjnym (model ticketowy). Persony: lider obszaru, technik UR, kierownik UR. Plan i roadmapa: [`docs/PLAN.md`](docs/PLAN.md).

## Stack

Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4, next-intl (pl/en), Vitest. Backend: Supabase (od etapu 2).

## Praca lokalna

```bash
npm install
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
