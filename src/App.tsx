import { useCallback, useEffect, useRef, useState, type FormEvent, type CSSProperties } from 'react';
import { BookOpen, CircleHelp, Cpu, Gamepad2, Globe2, Newspaper, Palette, UserRound } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

type Topic = 'general' | 'games' | 'technology' | 'books' | 'art' | 'news';
type Profile = { hex_login: string; is_admin: boolean };
type Post = {
  id: string; post_number: number; content: string; created_at: string; author_id: string; topic: Topic;
  profile?: { hex_login: string } | null;
};
type InfoPage = 'rules' | 'faq' | null;
const PAGE_SIZE = 30;
const TOPICS: { id: Topic; label: string; Icon: typeof Globe2 }[] = [
  { id: 'general', label: 'Загальне', Icon: Globe2 },
  { id: 'games', label: 'Ігри', Icon: Gamepad2 },
  { id: 'technology', label: 'Технології', Icon: Cpu },
  { id: 'books', label: 'Книги', Icon: BookOpen },
  { id: 'art', label: 'Мистецтво', Icon: Palette },
  { id: 'news', label: 'Новини', Icon: Newspaper }
];
const topicColor: Record<Topic, string> = {
  general: '#aaa0cf', games: '#d99a94', technology: '#83b5c7', books: '#c5a77d', art: '#8eae88', news: '#c99b82'
};

function kyivToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Kyiv'
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return get('year') + '-' + get('month') + '-' + get('day');
}
function kyivInfo(value: string, postNumber: number) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/Kyiv'
  }).format(date);
  const weekday = new Intl.DateTimeFormat('uk-UA', {
    weekday: 'short', timeZone: 'Europe/Kyiv'
  }).format(date);
  const time = new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23', timeZone: 'Europe/Kyiv'
  }).format(date);
  return `${day} ${weekday.charAt(0).toLocaleUpperCase('uk-UA')}${weekday.slice(1)} ${time} №${postNumber}`;
}
function Spoiler({ children }: { children: string }) {
  const [revealed, setRevealed] = useState(false);
  const spoilerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !spoilerRef.current?.contains(event.target)) setRevealed(false);
    };
    document.addEventListener('click', closeOnOutsideClick);
    return () => document.removeEventListener('click', closeOnOutsideClick);
  }, []);
  return <button ref={spoilerRef} type="button" className={`spoiler${revealed ? ' revealed' : ''}`} onClick={() => setRevealed(true)}>{children}</button>;
}
function FormattedText({ value }: { value: string }) {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\|\|[^|]+\|\||>[^\n]+)/gm;
  const nodes = [];
  let last = 0;
  for (const match of value.matchAll(pattern)) {
    const token = match[0], index = match.index ?? 0;
    if (index > last) nodes.push(value.slice(last, index));
    if (token.startsWith('**')) nodes.push(<strong key={index}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('~~')) nodes.push(<del key={index}>{token.slice(2, -2)}</del>);
    else if (token.startsWith('||')) nodes.push(<Spoiler key={index}>{token.slice(2, -2)}</Spoiler>);
    else if (token.startsWith('*')) nodes.push(<em key={index}>{token.slice(1, -1)}</em>);
    else nodes.push(<span className="green-text" key={index}>{token.slice(1)}</span>);
    last = index + token.length;
  }
  if (last < value.length) nodes.push(value.slice(last));
  return <>{nodes}</>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [topic, setTopic] = useState<Topic>('general');
  const [message, setMessage] = useState('');
  const [alreadyPosted, setAlreadyPosted] = useState(false);
  const [status, setStatus] = useState('Підключаємося…');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [infoPage, setInfoPage] = useState<InfoPage>(null);
  const [secretKey, setSecretKey] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const offsetRef = useRef(0);
  const moreRef = useRef(true);

  const setNotice = (value: string, isError = false) => { setStatus(value); setError(isError); };

  const ensureIdentity = useCallback(async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    let activeUser = sessionData.session?.user ?? null;
    if (!activeUser) {
      const { data, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) throw signInError;
      activeUser = data.user;
    }
    if (!activeUser) throw new Error('Не вдалося створити сесію.');
    setUser(activeUser);
    let found: Profile | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const { data } = await supabase.from('copypaste_profiles')
        .select('hex_login, is_admin').eq('id', activeUser.id).maybeSingle();
      if (data) { found = data as Profile; break; }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!found) throw new Error('Не вдалося створити твій HEX-логін. Онови сторінку.');
    setProfile(found);
  }, []);

  const loadPosts = useCallback(async (reset = false) => {
    if (loadingRef.current) return;
    const start = reset ? 0 : offsetRef.current;
    if (!reset && !moreRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const { data, error: queryError, count } = await supabase.from('copypaste_posts')
        .select('id, post_number, content, created_at, author_id, topic, profile:copypaste_profiles!copypaste_posts_author_id_fkey(hex_login)', { count: 'exact' })
        .eq('topic', topic).order('created_at', { ascending: false })
        .range(start, start + PAGE_SIZE - 1);
      if (queryError) throw queryError;
      const rows = (data ?? []) as unknown as Post[];
      setPosts(current => reset ? rows : [...current, ...rows]);
      const nextOffset = start + rows.length;
      const nextHasMore = rows.length === PAGE_SIZE && nextOffset < (count ?? 0);
      offsetRef.current = nextOffset;
      moreRef.current = nextHasMore;
      setHasMore(nextHasMore);
      if (reset && user) {
        const { data: mine, error: mineError } = await supabase.from('copypaste_posts')
          .select('id').eq('author_id', user.id).eq('post_day', kyivToday()).limit(1);
        if (mineError) throw mineError;
        setAlreadyPosted(!profile?.is_admin && (mine ?? []).length > 0);
      }
    } catch (cause) {
      console.error(cause);
      setNotice('Не вдалося завантажити стрічку. Спробуй ще раз.', true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [topic, user, profile]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        await ensureIdentity();
        if (alive) setNotice('');
      } catch (cause) {
        console.error(cause);
        if (alive) setNotice('Не вдалося підключитися. Перевір налаштування анонімного входу в Supabase.', true);
      }
    })();
    return () => { alive = false; };
  }, [ensureIdentity]);

  useEffect(() => {
    if (user && profile) void loadPosts(true);
  }, [user, profile, topic, loadPosts]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('copypaste-live-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'copypaste_posts' }, payload => {
        const inserted = payload.new as { topic?: Topic };
        if (inserted.topic === topic) void loadPosts(true);
      })
      .subscribe(state => {
        if (state === 'SUBSCRIBED') setNotice('');
        // Realtime reconnects automatically; keep transient disconnects out of the UI.
      });
    return () => { void supabase.removeChannel(channel); };
  }, [user, topic, loadPosts]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && moreRef.current && !loadingRef.current) void loadPosts(false);
    }, { rootMargin: '500px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadPosts]);

  function updateTopic(next: Topic) {
    if (next === topic) return;
    offsetRef.current = 0; moreRef.current = true;
    setHasMore(false); setPosts([]); setTopic(next);
  }

  async function runAuthCommand(action: 'register' | 'login', key = '') {
    setBusy(true);
    setNotice(action === 'register' ? 'Створюємо постійний акаунт…' : 'Перевіряємо секретний ключ…');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('copypaste-auth', {
        body: action === 'register' ? { action: 'register' } : { action: 'login', secretKey: key }
      });
      if (invokeError || data?.error) throw new Error(data?.error || 'Не вдалося виконати команду.');
      const { error: authError } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      if (authError) throw authError;
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError || new Error('Не вдалося відкрити сесію.');
      setUser(userData.user);
      setProfile({ hex_login: data.hexLogin, is_admin: !!data.isAdmin });
      setAlreadyPosted(false); setMessage('');
      if (action === 'register') {
        setSecretKey(data.secretKey);
        setNotice(`Логін: ${data.hexLogin} · Секретний ключ: ${data.secretKey} — збережи його, він показується лише один раз.`);
      } else { setSecretKey(''); setNotice('Ти увійшов як ' + data.hexLogin + '.'); }
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Помилка авторизації.', true);
    } finally { setBusy(false); }
  }

  async function publishPost(event: FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if (/^\/registration$/i.test(content)) { await runAuthCommand('register'); return; }
    if (/^\/registration/i.test(content)) { setNotice('Команда: /registration (доступна лише один раз).', true); return; }
    const authMatch = content.match(/^\/auth\s+(cp_[a-f0-9]{64})$/i);
    if (/^\/auth/i.test(content)) {
      if (!authMatch) { setNotice('Формат: /auth cp_… (встав повний секретний ключ).', true); return; }
      await runAuthCommand('login', authMatch[1]); return;
    }
    if (!content || !user || (!profile?.is_admin && alreadyPosted)) return;
    setBusy(true); setNotice('');
    try {
      const { error: insertError } = await supabase.from('copypaste_posts').insert({ content, topic });
      if (insertError) {
        if (insertError.code === '23505') { setAlreadyPosted(true); setNotice('Ти вже залишив повідомлення сьогодні.', true); return; }
        throw insertError;
      }
      setMessage('');
      if (!profile?.is_admin) setAlreadyPosted(true);
      await loadPosts(true);
    } catch (cause) {
      console.error(cause); setNotice('Не вдалося опублікувати. Спробуй ще раз.', true);
    } finally { setBusy(false); }
  }

  const command = /^\/(registration|auth)(?:\s+\S+)?$/i.test(message.trim());
  const canPublish = !busy && (command || (!!user && !!message.trim() && (profile?.is_admin || !alreadyPosted) && message.trim().length <= 180));

  return (
    <main className="shell">
      <header>
        <button className="brand" type="button" style={{ color: topic === 'general' ? '#111' : topicColor[topic] }} onClick={() => setInfoPage(null)} aria-label="copypaste"><strong>copy</strong><span>paste</span></button>
        <nav className="nav" aria-label="Навігація">
          <button className="icon-btn" type="button" disabled aria-label="Авторизація" title="Авторизація"><UserRound /></button>
          <button className={`icon-btn${infoPage === 'rules' ? ' active' : ''}`} type="button" onClick={() => setInfoPage(infoPage === 'rules' ? null : 'rules')} aria-label="Правила" title="Правила"><BookOpen /></button>
          <button className={`icon-btn${infoPage === 'faq' ? ' active' : ''}`} type="button" onClick={() => setInfoPage(infoPage === 'faq' ? null : 'faq')} aria-label="FAQ" title="FAQ"><CircleHelp /></button>
        </nav>
      </header>
      {infoPage ? <section className="page-panel">
        {infoPage === 'rules' ? <>
          <h2>Правила</h2><h3>Будь людиною</h3><p>Поважай інших. Без образ, погроз, мови ненависті та переслідування.</p>
          <h3>Пиши по суті</h3><p>Одна думка — одне повідомлення. До 180 символів. Не публікуй приватні дані.</p>
          <h3>Форматування</h3><p>Використовуй виділення, але не зловживай ним. Спойлери позначай окремо.</p>
          <h3>Модерація</h3><p>Шкідливий або незаконний контент може бути видалений.</p>
        </> : <>
          <h2>FAQ</h2><h3>Скільки можна публікувати?</h3><p>Звичайний акаунт — одне повідомлення на день.</p>
          <h3>Як відформатувати текст?</h3><p>**жирний**, *курсив*, ~~закреслений~~, &gt;зелений текст, ||спойлер||.</p>
          <h3>Як працюють теми?</h3><p>Обери тему над стрічкою. Нові повідомлення потраплять саме до неї.</p>
          <h3>Чи можна повернутися до акаунта?</h3><p>Так, за допомогою секретного ключа авторизації.</p>
        </>}
      </section> : <>
        <form className="composer" onSubmit={publishPost} aria-label="Нове повідомлення">
          <textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={180}
            placeholder={alreadyPosted && !profile?.is_admin ? 'Ти вже залишив повідомлення сьогодні. Побачимось завтра.' : 'Про що ти думаєш сьогодні?'}
            aria-label="Твоє повідомлення" />
          <div className="compose-row"><span className="counter">{message.length} / 180</span><button type="submit" disabled={!canPublish}>{command ? 'Виконати ↗' : 'Опублікувати ↗'}</button></div>
          {status && <div className={`status${error ? ' error' : ''}`} role="status" aria-live="polite">
            {status}{secretKey && <button className="copy-key" type="button" onClick={() => void navigator.clipboard.writeText(secretKey).then(() => setNotice('Секретний ключ скопійовано.'))}>Копіювати ключ</button>}
          </div>}
        </form>
        <section aria-label="Усі повідомлення">
          <div className="topics">
            {TOPICS.map(({ id, label, Icon }) => <button key={id} type="button"
              className={`topic-btn${topic === id ? ' active' : ''}`}
              style={{ '--topic-color': topicColor[id] } as CSSProperties} onClick={() => updateTopic(id)}>
              <Icon /> {label}
            </button>)}
          </div>
          <div id="feed" aria-live="polite">
            {posts.length === 0 && !loading ? <div className="empty">Тут поки тихо. Залиш першу думку.</div> : posts.map(post => (
              <article className="post" key={post.id}>
                <div className="meta">
                  <div className="identity"><span className="swatch" style={{ backgroundColor: post.profile?.hex_login || '#aaa' }} /><span className="hex">{post.profile?.hex_login?.toLowerCase() || '#??????'}</span></div>
                  <time dateTime={post.created_at}>{kyivInfo(post.created_at, post.post_number)}</time>
                </div>
                <p className="message"><FormattedText value={post.content} /></p>
              </article>
            ))}
            {loading && posts.length === 0 && <div className="empty">Завантажуємо потік…</div>}
          </div>
          <div ref={sentinelRef} id="sentinel" />
          {hasMore && posts.length > 0 && <button className="load-more" type="button" disabled={loading} onClick={() => void loadPosts(false)}>{loading ? 'Завантажуємо…' : 'Завантажити ще'}</button>}
        </section>
      </>}
    </main>
  );
}