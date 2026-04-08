# Деплой на Cloudflare Pages

Дашборд: **[https://dash.cloudflare.com](https://dash.cloudflare.com)**  
Тип проекта: **Pages** (статический Vite → папка **`dist`**). **Workers** и **wrangler** для этого фронта не нужны.

---

## Быстрые значения для формы сборки (скопировать в Pages)

| Поле в Cloudflare Pages | Значение |
|-------------------------|----------|
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (пусто или `/`, если репозиторий = корень проекта) |
| **Environment** → Node | **20** (рекомендуется; в репозитории есть `.nvmrc` с `20`) |

---

## Переменные окружения (плейсхолдеры заменить на свои из Supabase)

В **[dash.cloudflare.com](https://dash.cloudflare.com)** → **Workers & Pages** → ваш проект **Pages** → **Settings** → **Environment variables**:

| Имя переменной | Что вставить |
|----------------|--------------|
| `VITE_SUPABASE_URL` | **Project URL** из Supabase (например `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Публичный **anon** или **Publishable** ключ из Supabase API |

Задайте для **Production** и при необходимости для **Preview** (отдельные деплои веток).

После первого добавления или смены переменных обязательно **пересоберите деплой** (**Retry deployment** или новый push) — иначе Vite не вшьёт значения в бандл, останется баннер «локальный режим».

Шаблон для локальной разработки: скопируйте **`.env.example`** → **`.env.local`** и подставьте реальные значения вместо `YOUR_*`.

---

## Пошагово: новый сайт в Cloudflare

1. Откройте **[https://dash.cloudflare.com](https://dash.cloudflare.com)** и войдите в аккаунт.
2. Слева **Workers & Pages** → **Create** → вкладка **Pages** → **Connect to Git** (или **Upload assets** для ручной загрузки `dist`).
3. Подключите GitHub/GitLab и выберите репозиторий с этим проектом.
4. Укажите **Build command**: `npm run build`, **Build output directory**: `dist`.
5. Добавьте переменные **`VITE_SUPABASE_URL`** и **`VITE_SUPABASE_ANON_KEY`** (см. таблицу выше).
6. Нажмите **Save and Deploy** / дождитесь первого деплоя.

---

## Supabase (до или сразу после первого деплоя)

1. [supabase.com](https://supabase.com) — проект → **SQL Editor**.
2. Выполните скрипт **`supabase-setup.sql`** из репозитория.
3. **Settings → API** — скопируйте URL и ключ в переменные Cloudflare и пересоберите Pages.

---

## Локальная проверка

```bash
npm install
npm run build
```

Появится каталог **`dist`**. Файл **`public/_redirects`** попадёт в `dist` и поможет Pages корректно отдавать SPA.

## Прямая загрузка (без Git)

Переменные из дашборда при **Upload assets** в бандл **не** подставляются. Перед `npm run build` задайте **`.env.local`**, затем загрузите **содержимое** папки `dist`. Для автоматических env удобнее **Connect to Git**.

## Безопасность

В клиенте только публичные `VITE_*`. Доступ к строкам таблицы — через **RLS** в Supabase (**`supabase-setup.sql`**). Ключ **service_role** в Pages не добавляйте.
