import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let configLogged = false;

function readSupabaseUrl(): string {
  const v = import.meta.env.VITE_SUPABASE_URL;
  return typeof v === 'string' ? v.trim() : '';
}

function readSupabaseAnonKey(): string {
  const v = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return typeof v === 'string' ? v.trim() : '';
}

function looksLikePlaceholderUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (!u) return true;
  return (
    u.includes('your_project_ref') ||
    u.includes('example.com') ||
    u.includes('placeholder') ||
    /^https?:\/\/\.supabase\.co\/?$/i.test(u)
  );
}

function looksLikePlaceholderKey(key: string): boolean {
  const k = key.toLowerCase();
  if (!k) return true;
  return k.includes('your_publishable') || k.includes('your_anon') || k.includes('placeholder');
}

export type SupabaseBootstrapReason =
  | 'cloud_ok'
  | 'missing_url'
  | 'missing_key'
  | 'placeholder_url'
  | 'placeholder_key';

export type SupabaseBootstrapInfo = {
  /** Облачный режим: реальные URL и ключ попали в бандл при сборке. */
  useCloud: boolean;
  reason: SupabaseBootstrapReason;
  /** Человекочитаемое пояснение для UI и логов. */
  message: string;
};

function resolveBootstrap(): SupabaseBootstrapInfo {
  const url = readSupabaseUrl();
  const key = readSupabaseAnonKey();

  if (!url) {
    return {
      useCloud: false,
      reason: 'missing_url',
      message:
        'VITE_SUPABASE_URL не задан или пустой в бандле. Задайте переменную при сборке (Cloudflare Pages → Environment variables → Production/Preview) и пересоберите проект.',
    };
  }
  if (!key) {
    return {
      useCloud: false,
      reason: 'missing_key',
      message:
        'VITE_SUPABASE_ANON_KEY не задан или пустой в бандле. Задайте переменную при сборке и пересоберите проект.',
    };
  }
  if (looksLikePlaceholderUrl(url)) {
    return {
      useCloud: false,
      reason: 'placeholder_url',
      message:
        'VITE_SUPABASE_URL похож на шаблон из .env.example, а не на реальный Project URL. Замените на URL из Supabase Dashboard → Settings → API.',
    };
  }
  if (looksLikePlaceholderKey(key)) {
    return {
      useCloud: false,
      reason: 'placeholder_key',
      message:
        'VITE_SUPABASE_ANON_KEY похож на шаблон. Укажите реальный anon / publishable ключ из Supabase Dashboard → Settings → API.',
    };
  }

  return {
    useCloud: true,
    reason: 'cloud_ok',
    message: 'Supabase подключён: данные общие для всех пользователей.',
  };
}

function safeUrlHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '(некорректный URL)';
  }
}

function logBootstrapOnce(info: SupabaseBootstrapInfo): void {
  if (configLogged) return;
  configLogged = true;
  if (info.useCloud) {
    console.info('[Supabase]', info.message, { urlHost: safeUrlHost(readSupabaseUrl()) });
  } else {
    console.warn('[Supabase] Облачный режим отключён — приложение использует только локальное хранилище браузера.', info.message);
  }
}

/** true, если в бандл попали валидные (не шаблонные) URL и публичный ключ на этапе vite build. */
export function isSupabaseConfigured(): boolean {
  const info = resolveBootstrap();
  logBootstrapOnce(info);
  return info.useCloud;
}

/** Детали режима без побочных эффектов логирования (для UI). */
export function getSupabaseBootstrapInfo(): SupabaseBootstrapInfo {
  return resolveBootstrap();
}

export function getSupabase(): SupabaseClient | null {
  const info = resolveBootstrap();
  logBootstrapOnce(info);
  if (!info.useCloud) return null;
  const url = readSupabaseUrl();
  const key = readSupabaseAnonKey();
  if (!client) {
    client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return client;
}
