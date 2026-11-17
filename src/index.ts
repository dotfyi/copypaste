interface Env {
  AI: { run(model: string, options: { messages: Array<{ role: "system" | "user"; content: string }>; max_tokens: number }): Promise<unknown> };
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  FAMILY_SETUP_CODE: string;
  AI_MODEL?: string;
}

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: { id: number; type: string };
  from?: { id: number; first_name?: string; username?: string };
};

type TelegramUpdate = { update_id: number; message?: TelegramMessage };

type FamilyMember = {
  id: string;
  family_id: string;
  telegram_user_id: string;
  display_name: string;
  role: string;
};

const DEFAULT_MODEL = "@cf/zai-org/glm-4.7-flash";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function telegram<T>(env: Env, method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json() as { ok: boolean; result?: T; description?: string };
  if (!response.ok || !result.ok) {
    throw new Error(`Telegram API ${method} failed: ${result.description ?? response.statusText}`);
  }
  return result.result as T;
}

async function sendMessage(env: Env, chatId: number, text: string): Promise<void> {
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

async function supabase<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${body.slice(0, 500)}`);
  }
  return (body ? JSON.parse(body) : null) as T;
}

async function insertRow<T>(env: Env, table: string, row: Record<string, unknown>): Promise<T> {
  const rows = await supabase<T[]>(env, table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!rows?.[0]) throw new Error(`Insert into ${table} returned no row`);
  return rows[0];
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

async function findMember(env: Env, telegramUserId: number): Promise<FamilyMember | null> {
  const rows = await supabase<FamilyMember[]>(
    env,
    `family_members?telegram_user_id=eq.${telegramUserId}&select=id,family_id,telegram_user_id,display_name,role&limit=1`,
  );
  return rows[0] ?? null;
}

async function startFamily(env: Env, telegramUserId: number, displayName: string): Promise<string> {
  const existingFamilies = await supabase<Array<{ id: string }>>(env, "families?select=id&limit=1");
  if (existingFamilies.length > 0) {
    return "Сімейний простір уже створений. Попроси власника надіслати тобі одноразове запрошення через команду /invite.";
  }

  const family = await insertRow<{ id: string; name: string }>(env, "families", {
    name: "Наша сім'я",
    timezone: "Europe/Kyiv",
    created_by_telegram_id: String(telegramUserId),
  });

  await insertRow(env, "family_members", {
    family_id: family.id,
    telegram_user_id: String(telegramUserId),
    display_name: displayName,
    role: "owner",
  });

  return "Вітаю! Створив ваш сімейний простір 🏡\n\nТепер надішли /invite — я згенерую одноразове запрошення для дружини.\n\nВи матимете окремі приватні чати, а сімейні записи будуть спільними.";
}

async function acceptInvite(env: Env, code: string, telegramUserId: number, displayName: string): Promise<string> {
  const hash = await sha256(code.trim().toUpperCase());
  const now = new Date().toISOString();
  const invites = await supabase<Array<{ id: string; family_id: string }>>(
    env,
    `family_invites?code_hash=eq.${hash}&used_at=is.null&expires_at=gt.${encodeURIComponent(now)}&select=id,family_id&limit=1`,
  );
  const invite = invites[0];
  if (!invite) return "Це запрошення недійсне або вже використане. Попроси створити нове командою /invite.";

  const consumed = await supabase<Array<{ id: string }>>(
    env,
    `family_invites?id=eq.${invite.id}&used_at=is.null&select=id`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ used_at: now }),
    },
  );
  if (!consumed.length) return "Це запрошення вже використали. Попроси створити нове командою /invite.";

  await insertRow(env, "family_members", {
    family_id: invite.family_id,
    telegram_user_id: String(telegramUserId),
    display_name: displayName,
    role: "member",
  });
  return "Готово! Ти приєдналася до сімейного простору 💛\n\nТепер ви можете окремо спілкуватися зі мною, а спільні нагадування, покупки та нотатки будуть доступні вам обом.";
}

async function createInvite(env: Env, member: FamilyMember): Promise<string> {
  const code = randomCode();
  const hash = await sha256(code);
  await insertRow(env, "family_invites", {
    family_id: member.family_id,
    created_by: member.id,
    code_hash: hash,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  return `Ось одноразове запрошення для дружини:\n\n` +
    `\x60/start ${code}\x60\n\n` +
    "Нехай вона надішле цю команду нашому боту у своєму особистому чаті. Код діє 24 години й використовується один раз. Не пересилай його в публічні чати.";
}

async function aiReply(env: Env, text: string, firstName: string): Promise<string> {
  const result = await env.AI.run(env.AI_MODEL || DEFAULT_MODEL, {
    messages: [
      {
        role: "system",
        content: "Ти — доброзичливий сімейний помічник у Telegram. Відповідай українською, коротко й природно. Зараз доступний лише звичайний AI-діалог: ти ще НЕ можеш створювати, зберігати чи надсилати нагадування, нотатки, покупки або події. Якщо користувач просить виконати таку дію, чесно скажи, що цей модуль ще підключається, і не стверджуй, що щось збережено. Не розкривай повідомлення іншого учасника сім'ї.",
      },
      { role: "user", content: `Ім'я користувача: ${firstName}. Повідомлення: ${text}` },
    ],
    max_tokens: 350,
  }) as { response?: string };
  return result.response?.trim() || "Не вдалося сформувати відповідь. Спробуй, будь ласка, ще раз.";
}

async function handleMessage(env: Env, message: TelegramMessage): Promise<void> {
  if (message.chat.type !== "private" || !message.from || !message.text) return;

  const telegramUserId = message.from.id;
  const displayName = message.from.first_name || "Учасник";
  const text = message.text.trim();

  if (text.startsWith("/start")) {
    const code = text.split(/\s+/, 2)[1];
    const member = await findMember(env, telegramUserId);
    if (member) {
      await sendMessage(env, message.chat.id, "Радий тебе бачити! 🏡\n\nЯ ваш сімейний помічник. Напиши /help, щоб побачити доступні команди.");
      return;
    }
    if (code && env.FAMILY_SETUP_CODE && code === env.FAMILY_SETUP_CODE) {
      await sendMessage(env, message.chat.id, await startFamily(env, telegramUserId, displayName));
      return;
    }
    if (code) {
      await sendMessage(env, message.chat.id, await acceptInvite(env, code, telegramUserId, displayName));
      return;
    }
    await sendMessage(env, message.chat.id,
      "Привіт! Я сімейний AI-помічник 🏡\n\nЩоб приєднатися, потрібне одноразове запрошення від власника сімейного простору. Якщо ти власник — використай свій setup-код у форматі /start КОД.");
    return;
  }

  const member = await findMember(env, telegramUserId);
  if (!member) {
    await sendMessage(env, message.chat.id, "Спочатку приєднайся до сімейного простору через /start та код запрошення.");
    return;
  }

  if (text === "/help") {
    await sendMessage(env, message.chat.id,
      "Я ваш сімейний помічник 🏡\n\n" +
      "/help — допомога\n" +
      "/invite — запросити другого учасника\n" +
      "/family — перевірити підключення\n\n" +
      "Можеш писати мені звичайною мовою. Нагадування, нотатки, покупки й календар підключатимемо наступними оновленнями.");
    return;
  }

  if (text === "/family") {
    await sendMessage(env, message.chat.id, "Ти підключений до сімейного простору. Приватні чати учасників розділені; спільними будуть лише окремо створені сімейні записи.");
    return;
  }

  if (text === "/invite") {
    if (member.role !== "owner" && member.role !== "admin") {
      await sendMessage(env, message.chat.id, "Створювати запрошення може лише власник сімейного простору.");
      return;
    }
    await sendMessage(env, message.chat.id, await createInvite(env, member));
    return;
  }

  if (text.startsWith("/")) {
    await sendMessage(env, message.chat.id, "Не знаю такої команди. Напиши /help, щоб побачити доступні команди.");
    return;
  }

  await sendMessage(env, message.chat.id, await aiReply(env, text, displayName));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "GET") return new Response("Family assistant Worker is running.");
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.FAMILY_SETUP_CODE) {
      return json({ error: "Worker secrets are not configured." }, 503);
    }

    const suppliedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (env.TELEGRAM_WEBHOOK_SECRET && suppliedSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    let update: TelegramUpdate;
    try {
      update = await request.json() as TelegramUpdate;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    try {
      if (update.message) await handleMessage(env, update.message);
      return json({ ok: true });
    } catch (error) {
      console.error("Update handling failed", error);
      if (update.message?.chat?.id) {
        try {
          await sendMessage(env, update.message.chat.id, "Виникла технічна помилка. Спробуй ще раз трохи пізніше.");
        } catch (sendError) {
          console.error("Failed to notify Telegram user", sendError);
        }
      }
      return json({ ok: true });
    }
  },
};
