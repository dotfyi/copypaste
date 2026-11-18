# copypaste

Одна думка. Один день. Спільний потік коротких повідомлень.

## Як це працює
- Відвідувач отримує анонімний Supabase Auth акаунт.
- Сервер автоматично призначає постійний HEX-псевдонім.
- Один акаунт може опублікувати одне повідомлення до 280 символів на день за київським часом.
- Усі повідомлення доступні в одній стрічці, нові — зверху.
- Немає імен, профілів, лайків, коментарів чи категорій.

## Технології
- Статичний сайт на Cloudflare Workers Static Assets.
- Supabase Auth (anonymous) та Postgres з RLS.
- У браузері використовується лише publishable key. Service role key не потрібен.

## Розгортання
GitHub Actions розгортає статичний сайт у Cloudflare Worker після push у `main`.
Потрібні GitHub Actions secrets: `CLOUDFLARE_API_TOKEN` та `CLOUDFLARE_ACCOUNT_ID`.

## Supabase
Застосувати SQL із `supabase/migrations/202611180001_copypaste.sql`.
У Supabase Auth потрібно дозволити Anonymous Sign-Ins.
