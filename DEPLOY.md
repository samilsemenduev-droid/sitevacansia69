# Деплой: GitHub + Cloudflare Pages + Supabase

## Обязательные настройки (чеклист)

| Где | Что |
|-----|-----|
| Supabase | Проект создан, выполнен `supabase-schema.sql`, в API скопированы URL и anon key |
| Cloudflare Pages | Репозиторий подключён, **Build command** `npm run build`, **Output** `dist` |
| Cloudflare Pages | Переменные **VITE_SUPABASE_URL** и **VITE_SUPABASE_ANON_KEY** (минимум для **Production**; для превью-веток — дублировать в **Preview**) |
| GitHub | В репозитории **нет** файлов `.env` с ключами (в проекте игнорируются через `.gitignore`) |

---

## 1. Supabase: создать проект

1. [supabase.com](https://supabase.com) → **Sign in** → **New project**.
2. Выберите организацию, **имя**, **пароль БД**, **регион** → **Create new project**.
3. Дождитесь статуса **Healthy**.

---

## 2. Выполнить SQL

1. В проекте Supabase: слева **SQL Editor** → **New query**.
2. Вставьте содержимое файла **`supabase-schema.sql`** из репозитория → **Run** (или Ctrl+Enter).
3. Убедитесь, что нет красных ошибок (предупреждение про publication, если таблица уже добавлена — допустимо).

---

## 3. URL и публичный ключ клиента

1. В [Supabase Dashboard](https://supabase.com/dashboard) → **Project Settings** → **API** (или вкладка **Data API** / **API Keys** в новом UI).
2. **Project URL** → **`VITE_SUPABASE_URL`** (вида `https://xxxx.supabase.co`).
3. Публичный ключ для браузера → **`VITE_SUPABASE_ANON_KEY`**:
   - новый формат **Publishable** (`sb_publishable_...`), или
   - legacy **anon** / **public** JWT (`eyJ...`).

Секретные ключи (**`sb_secret_...`**, **service_role**) в Vite/Cloudflare **не** задаются: они не должны попадать в бандл. Подробнее: [Understanding API keys](https://supabase.com/docs/guides/api/api-keys).

---

## 4. Cloudflare Pages: подключить GitHub

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Выберите **GitHub**, разрешите доступ, выберите **репозиторий** с этим проектом.
3. Настройки сборки:
   - **Framework preset**: None (или Vite — не критично, если команды заданы вручную).
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (корень репозитория, если проект в корне).

### Ошибка «Failed: error occurred while fetching repository»

Cloudflare не может прочитать репозиторий у GitHub — почти всегда это **доступ GitHub App**, а не локальная сборка.

1. На GitHub: **Settings** → **Applications** → **Installed GitHub Apps** → найдите **Cloudflare Pages** → **Configure**.
2. В блоке **Repository access** выберите **All repositories** (или явно отметьте нужный репозиторий) → **Save**.
3. В [Cloudflare Dashboard](https://dash.cloudflare.com) откройте проект Pages → при необходимости **Reconnect** к GitHub и заново выберите репозиторий.

Если не помогло: в том же списке приложений GitHub — **Uninstall** для Cloudflare Pages, затем в Cloudflare снова **Connect to Git** и пройдите установку приложения с доступом ко **всем** или к **конкретному** репо.

**Новый репозиторий (если старый «залип» в интеграции):** на GitHub создайте пустой репозиторий (например `site-deploy-fix`), локально:

```bash
git remote remove origin
git remote add origin https://github.com/<USER>/<NEW_REPO>.git
git branch -M main
git push -u origin main
```

После этого в Pages подключите **новый** репозиторий.

### Прямая загрузка (без Git)

1. Заполните **`.env.local`**: `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` (иначе в архиве будет только локальный режим без Supabase).
2. В корне проекта: `npm run build:cf-upload` → появится **`cloudflare-pages-upload.zip`**.
3. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Upload assets** → укажите имя проекта → загрузите **zip** (или папку **`dist`** целиком).

Переменные Cloudflare для **Direct Upload не подставляются в бандл** — их нужно «запечь» в сборку через `.env.local` **до** `npm run build`.

---

## 5. Переменные окружения в Cloudflare

1. Откройте проект Pages → **Settings** → **Environment variables**.
2. Добавьте для **Production** (и при необходимости **Preview**):

   | Name | Value |
   |------|--------|
   | `VITE_SUPABASE_URL` | Project URL из Supabase |
   | `VITE_SUPABASE_ANON_KEY` | anon public key из Supabase |

3. Сохраните. **Пересоберите деплой**: **Deployments** → **⋯** у последнего деплоя → **Retry deployment** (или новый push в ветку production).

Важно: Vite подставляет `import.meta.env.VITE_*` **на этапе сборки**. Без этих переменных в CF билд соберётся, но приложение уйдёт в **локальный режим** (без общей БД). В интерфейсе при этом показывается **жёлтый баннер «Локальный режим»** — если он есть на проде, переменные не попали в сборку (добавьте их в Pages и сделайте **Retry deployment**).

---

## 6. Запуск деплоя

- Пуш в ветку, привязанную к **Production** (обычно `main` / `master`), автоматически запускает сборку.
- Либо вручную: **Deployments** → **Create deployment**.

---

## 7. Проверка после публикации

1. Откройте URL вида `https://<project>.pages.dev`.
2. Войдите (ник + код доступа приложения).
3. **Общая таблица**: второе окно / инкогнито — те же строки, что и у первого клиента.
4. **Запись**: добавьте строку в одном браузере — во втором строка появляется **без перезагрузки** (realtime).
5. **Редактирование / удаление** — то же: изменения видны у другого пользователя.
6. В Supabase: **Table Editor** → таблица **`contacts`** — строки совпадают с UI.

Если данные не общие: проверьте env в CF, **Retry deployment** после добавления переменных и консоль браузера (ошибки сети к `*.supabase.co`).

---

## Локальная разработка

Скопируйте `.env.example` → `.env.local`, подставьте URL и anon key, затем `npm install` и `npm run dev`.
