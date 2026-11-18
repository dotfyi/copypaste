import { useCallback, useEffect, useRef, useState, type FormEvent, type CSSProperties } from 'react';
import { BookOpen, Cpu, Gamepad2, Globe2, Newspaper, Palette, UserRound } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

type Topic = 'general' | 'games' | 'technology' | 'books' | 'art' | 'news';
type Profile = { hex_login: string; is_admin: boolean; is_registered: boolean };
type Post = {
  id: string; post_number: number; content: string; created_at: string; author_id: string; topic: Topic;
  profile?: { hex_login: string } | null;
};
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
  const [secretKey, setSecretKey] = useState('');
  const [createdKey, setCreatedKey] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authInput, setAuthInput] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const offsetRef = useRef(0);
  const moreRef = useRef(true);

  const setNotice = (value: string, isError = false) => { setStatus(value); setError(isError); };

  const ensureIdentity = useCallback(async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const activeUser = sessionData.session?.user ?? null;
    if (!activeUser) {
      setUser(null); setProfile(null); return;
    }
    const { data, error: profileError } = await supabase.from('copypaste_profiles')
      .select('hex_login, is_admin, is_registered').eq('id', activeUser.id).maybeSingle();
    if (profileError) throw profileError;
    if (!data?.is_registered) {
      await supabase.auth.signOut();
      setUser(null); setProfile(null); return;
    }
    setUser(activeUser);
    setProfile(data as Profile);
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
      if (reset && user && profile?.is_registered) {
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
    void loadPosts(true);
  }, [user, profile, topic, loadPosts]);

  useEffect(() => {
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
  }, [topic, loadPosts]);

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
    setNotice(action === 'register' ? 'Створюємо акаунт…' : 'Перевіряємо ключ…');
    try {
      const normalizedKey = key.trim().replace(/^cp_/i, '').toLowerCase();
      const { data, error: invokeError } = await supabase.functions.invoke('copypaste-auth', {
        body: action === 'register' ? { action: 'register' } : { action: 'login', secretKey: normalizedKey }
      });
      if (invokeError || data?.error) throw new Error(data?.error || 'Не вдалося виконати команду.');
      const { error: authError } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      if (authError) throw authError;
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError || new Error('Не вдалося відкрити сесію.');
      setUser(userData.user);
      setProfile({ hex_login: data.hexLogin, is_admin: !!data.isAdmin, is_registered: true });
      setAlreadyPosted(false); setMessage(''); setAuthInput('');
      if (action === 'register') {
        setSecretKey(data.secretKey);
        setCreatedKey(data.secretKey);
        setAuthMode('login');
        setNotice('');
      } else {
        setSecretKey(''); setCreatedKey('');
        setNotice('');
        setAuthOpen(false);
      }
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Помилка авторизації.', true);
    } finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setUser(null); setProfile(null); setAlreadyPosted(false);
      setCreatedKey(''); setSecretKey(''); setAuthInput('');
      setAuthOpen(false); setAuthMode('login'); setNotice('');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Не вдалося вийти з акаунта.', true);
    } finally { setBusy(false); }
  }

  async function publishPost(event: FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if (!content || !user || !profile?.is_registered || (!profile.is_admin && alreadyPosted)) return;
    setBusy(true); setNotice('');
    try {
      const { error: insertError } = await supabase.from('copypaste_posts').insert({ content, topic });
      if (insertError) {
        if (insertError.code === '23505') { setAlreadyPosted(true); setNotice('Ти вже залишив повідомлення сьогодні.', true); return; }
        throw insertError;
      }
      setMessage('');
      if (!profile.is_admin) setAlreadyPosted(true);
      await loadPosts(true);
    } catch (cause) {
      console.error(cause); setNotice('Не вдалося опублікувати. Спробуй ще раз.', true);
    } finally { setBusy(false); }
  }

  const canPublish = !busy && !!user && !!profile?.is_registered && !!message.trim()
    && (profile.is_admin || !alreadyPosted) && message.trim().length <= 180;

  return (
    <main className="shell">
      <header>
        <button className="brand" type="button" style={{ color: topic === 'general' ? '#111' : topicColor[topic] }} aria-label="copypaste"><strong>copy</strong><span>paste</span></button>
        <nav className="nav" aria-label="Навігація">
          <button className="icon-btn" type="button" aria-label="Авторизація" title="Авторизація" aria-expanded={authOpen} onClick={() => { if (!user) setAuthMode('login'); setAuthOpen(value => !value); }}><UserRound /></button>
        </nav>
      </header>
      {authOpen && <section className="auth-page" aria-labelledby="auth-title">
        {createdKey ? <div className="auth-content">
          <h2 id="auth-title">Твій ключ для входу</h2>
          <p className="auth-description">Збережи цей ключ зараз. Це єдиний спосіб увійти у свій акаунт. Ми не зможемо відновити його, якщо ти загубиш.</p>
          <code className="secret-key">{createdKey}</code>
          <button className="auth-action" type="button" onClick={() => void navigator.clipboard.writeText(createdKey).then(() => setNotice('Ключ скопійовано.'))}>Копіювати ключ</button>
          <button className="auth-switch auth-confirm" type="button" onClick={() => { setCreatedKey(''); setSecretKey(''); setAuthOpen(false); }}>Я зберіг ключ</button>
        </div> : user && profile?.is_registered ? <div className="auth-content">
          <h2 id="auth-title">Твій профіль</h2>
          <div className="profile-login"><span className="swatch" style={{ backgroundColor: profile.hex_login }} /><strong>{profile.hex_login.toLowerCase()}</strong></div>
          {profile.is_admin && <p className="profile-role">Адміністратор</p>}
          <button className="auth-action" type="button" disabled={busy} onClick={() => void logout()}>Вийти</button>
        </div> : <div className="auth-content">
          <h2 id="auth-title">{authMode === 'register' ? 'Створити акаунт' : 'Увійти'}</h2>
          <p className="auth-description">{authMode === 'register'
            ? 'Створи акаунт, щоб публікувати повідомлення. Після створення ми покажемо твій особистий ключ для входу.'
            : 'Введи свій особистий ключ. Він є єдиним способом входу — логін вводити не потрібно.'}</p>
          {authMode === 'login' && <form className="auth-form" onSubmit={event => { event.preventDefault(); void runAuthCommand('login', authInput); }}>
            <input className="auth-input" type="password" autoComplete="off" value={authInput}
              onChange={event => setAuthInput(event.target.value)} placeholder="Твій ключ" aria-label="Твій ключ" />
            <button className="auth-action" type="submit" disabled={busy || !authInput.trim()}>Увійти</button>
          </form>}
          {authMode === 'register' && <button className="auth-action" type="button" disabled={busy} onClick={() => void runAuthCommand('register')}>Створити акаунт</button>}
          <div className="auth-switch-row">
            <span>{authMode === 'login' ? 'Ще немає акаунта?' : 'Вже маєш акаунт?'}</span>
            <button className="auth-switch" type="button" onClick={() => { setAuthMode(mode => mode === 'login' ? 'register' : 'login'); setAuthInput(''); setNotice(''); }}>
              {authMode === 'login' ? 'Зареєструватися' : 'Увійти'}
            </button>
          </div>
          {busy && <p className="auth-progress">Зачекай…</p>}
          {status && <p className={`auth-progress${error ? ' error' : ''}`}>{status}</p>}
        </div>}
      </section>}
      <form className="composer" onSubmit={publishPost} aria-label="Нове повідомлення">
        <textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={180}
          disabled={!user || !profile?.is_registered || busy || (!profile.is_admin && alreadyPosted)}
          placeholder={!user || !profile?.is_registered ? 'Щоб писати, увійди або створи акаунт.' : alreadyPosted && !profile?.is_admin ? 'Ти вже залишив повідомлення сьогодні. Побачимось завтра.' : 'Про що ти думаєш сьогодні?'}
          aria-label="Твоє повідомлення" />
        <div className="compose-row"><span className="counter">{message.length} / 180</span><button type="submit" disabled={!canPublish}>Опублікувати ↗</button></div>
        {status && !authOpen && <div className={`status${error ? ' error' : ''}`} role="status" aria-live="polite">{status}</div>}
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
    </main>
  );
}