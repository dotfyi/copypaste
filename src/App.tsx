import { useCallback, useEffect, useRef, useState, type FormEvent, type CSSProperties } from 'react';
import { BookOpen, Cpu, Gamepad2, Globe2, Newspaper, Palette, Shield, MessageCircle } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

type Topic = 'general' | 'games' | 'technology' | 'books' | 'art' | 'news';
type Profile = { hex_login: string; is_admin: boolean; is_moderator: boolean; is_registered: boolean };
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
  const [createdKey, setCreatedKey] = useState('');
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminCooldown, setAdminCooldown] = useState('1440');
  const [accountLogin, setAccountLogin] = useState('');
  const [newAccount, setNewAccount] = useState<{login:string; secretKey:string} | null>(null);
  const [moderatorLogin, setModeratorLogin] = useState('');
  const [topicName, setTopicName] = useState('');
  const [stats, setStats] = useState({posts:0, users:0});
  const sentinelRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const loadingRef = useRef(false);
  const offsetRef = useRef(0);
  const moreRef = useRef(true);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 24;
    const maxHeight = lineHeight * 5 + 12;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [message]);

  const setNotice = (value: string, isError = false) => { setStatus(value); setError(isError); };

  const ensureIdentity = useCallback(async () => {
    let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      ({ data: sessionData, error: sessionError } = await supabase.auth.getSession());
      if (sessionError) throw sessionError;
    }
    const activeUser = sessionData.session?.user ?? null;
    if (!activeUser) throw new Error('Не вдалося створити гостьову сесію.');
    let data = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const result = await supabase.from('copypaste_profiles')
        .select('hex_login, is_admin, is_moderator, is_registered').eq('id', activeUser.id).maybeSingle();
      if (result.error) throw result.error;
      data = result.data;
      if (data) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!data) throw new Error('Не вдалося створити профіль.');
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
      if (reset && user && profile) {
        const { data: mine, error: mineError } = await supabase.from('copypaste_posts')
          .select('id').eq('author_id', user.id).eq('post_day', kyivToday()).limit(1);
        if (mineError) throw mineError;
        setAlreadyPosted(false);
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

  async function runAuthCommand(key: string) {
    setBusy(true); setNotice('Входимо в акаунт…');
    try {
      const normalizedKey = key.trim().toLowerCase();
      const { data, error: invokeError } = await supabase.functions.invoke('copypaste-auth', {
        body: { action: 'login', secretKey: normalizedKey }
      });
      if (invokeError || data?.error) throw new Error(data?.error || 'Ключ не підійшов.');
      const { error: authError } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      if (authError) throw authError;
      await ensureIdentity();
      setMessage(''); setNotice('Увійшли в акаунт.');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Помилка авторизації.', true);
    } finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      const { error: guestError } = await supabase.auth.signInAnonymously();
      if (guestError) throw guestError;
      setUser(null); setProfile(null); setAlreadyPosted(false);
      await ensureIdentity();
      setAdminOpen(false); setNotice('Ти вийшов з акаунта.');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Не вдалося вийти з акаунта.', true);
    } finally { setBusy(false); }
  }

  async function adminAction(action: string, payload: Record<string, unknown> = {}) {
    if (!user) return;
    const { data, error } = await supabase.functions.invoke('copypaste-auth', { body: { action, ...payload } });
    if (error || data?.error) throw new Error(data?.error || 'Не вдалося виконати дію.');
    return data;
  }

  async function loadAdminStats() {
    const [postsResult, usersResult, settingsResult] = await Promise.all([
      supabase.from('copypaste_posts').select('id', {count:'exact',head:true}),
      supabase.from('copypaste_profiles').select('id', {count:'exact',head:true}),
      supabase.from('copypaste_settings').select('cooldown_minutes').eq('id',true).single()
    ]);
    setStats({posts:postsResult.count ?? 0, users:usersResult.count ?? 0});
    if (settingsResult.data) setAdminCooldown(String(settingsResult.data.cooldown_minutes));
  }

  async function publishPost(event: FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if (!content || !user || !profile) return;
    if (content.startsWith('/auth ')) {
      const key = content.slice(6).trim();
      if (!key) { setNotice('Після /auth додай секретний ключ.', true); return; }
      setMessage('');
      await runAuthCommand(key);
      return;
    }
    if (content === '/exit') {
      setMessage('');
      await logout();
      return;
    }
    if (content.startsWith('/')) { setNotice('Невідома команда. Доступні: /auth ключ та /exit.', true); return; }
    setBusy(true); setNotice('');
    try {
      const { error: insertError } = await supabase.from('copypaste_posts').insert({ content, topic });
      if (insertError) { if (insertError.code === '42501') throw new Error('Ще зарано публікувати. Спробуй пізніше.'); throw insertError; }
      setMessage('');
      await loadPosts(true);
    } catch (cause) {
      console.error(cause); setNotice('Не вдалося опублікувати. Спробуй ще раз.', true);
    } finally { setBusy(false); }
  }

  const canPublish = !busy && !!user && !!profile && !!message.trim() && message.trim().length <= 180;

  return (
    <main className="shell">
      <header>
        <button className="brand" type="button" onClick={() => setAdminOpen(false)} style={{ color: topic === 'general' ? '#111' : topicColor[topic] }} aria-label="На головну"><strong>copy</strong><span>paste</span></button>
        <nav className="nav" aria-label="Навігація">
          {profile?.is_admin ? <button className="icon-btn" type="button" aria-label="Панель адміністратора" title="Панель адміністратора" onClick={() => { setAdminOpen(v=>!v); if (!adminOpen) void loadAdminStats(); }}><Shield /></button> : <span className="current-login" style={{color:profile?.is_admin||profile?.is_moderator ? profile.hex_login : '#777'}}>{profile?.hex_login?.toLowerCase()}</span>}
        </nav>
      </header>
      {adminOpen && profile?.is_admin ? <section className="admin-panel">
        <h2>Панель адміністратора</h2>
        <div className="admin-stats"><span><strong>{stats.posts}</strong> повідомлень</span><span><strong>{stats.users}</strong> акаунтів</span></div>
        <label>Інтервал між повідомленнями (хв)</label><div className="admin-inline"><input value={adminCooldown} onChange={e=>setAdminCooldown(e.target.value)} inputMode="numeric"/><button onClick={async()=>{try{await adminAction('update_settings',{cooldownMinutes:Number(adminCooldown)});setNotice('Інтервал збережено.');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Зберегти</button></div>
        <label>Створити акаунт</label><div className="admin-inline"><input value={accountLogin} onChange={e=>setAccountLogin(e.target.value)} placeholder="Логін або порожньо для HEX"/><button onClick={async()=>{try{const result=await adminAction('create_account',{login:accountLogin});setNewAccount(result);setAccountLogin('');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Створити</button></div>
        {newAccount && <div className="new-account"><strong>{newAccount.login}</strong><code>{newAccount.secretKey}</code><button onClick={()=>void navigator.clipboard.writeText(newAccount.secretKey)}>Копіювати ключ</button></div>}
        <label>Надати / забрати права модератора</label><div className="admin-inline"><input value={moderatorLogin} onChange={e=>setModeratorLogin(e.target.value)} placeholder="HEX-логін користувача"/><button onClick={async()=>{try{await adminAction('set_role',{login:moderatorLogin,role:'moderator'});setNotice('Права модератора оновлено.');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Надати</button></div>
        <label>Додати розділ</label><div className="admin-inline"><input value={topicName} onChange={e=>setTopicName(e.target.value)} placeholder="Назва розділу"/><button onClick={async()=>{try{await adminAction('create_topic',{id:topicName.toLowerCase().replace(/[^a-z0-9_-]/g,'-'),label:topicName});setTopicName('');setNotice('Розділ додано.');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Додати</button></div>
      </section> : <>
      <form className="composer" onSubmit={publishPost} aria-label="Нове повідомлення">
        <textarea ref={composerRef} value={message} onChange={event => setMessage(event.target.value)} maxLength={180}
          disabled={!user || busy}
          placeholder={!user ? 'Підключаємо анонімний профіль…' : 'Поділись думкою або введи /auth ключ чи /exit'}
          aria-label="Твоє повідомлення" />
        {createdKey ? <div className="auth-content">
          <h2 id="auth-title">Твій ключ для входу</h2>
          <p className="auth-description">Збережи цей ключ зараз. Це єдиний спосіб увійти у свій акаунт. Ми не зможемо відновити його, якщо ти загубиш.</p>
          <code className="secret-key">{createdKey}</code>
          <button className="auth-action" type="button" onClick={() => void navigator.clipboard.writeText(createdKey).then(() => setNotice('Ключ скопійовано.'))}>Копіювати ключ</button>
          <button className="auth-switch auth-confirm" type="button" onClick={() => { setCreatedKey(''); setAuthOpen(false); }}>Я зберіг ключ</button>
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
      </section> : <>
      <form className="composer" onSubmit={publishPost} aria-label="Нове повідомлення">
        <textarea ref={composerRef} value={message} onChange={event => setMessage(event.target.value)} maxLength={180}
          disabled={!user || !profile?.is_registered || busy || (!profile.is_admin && alreadyPosted)}
          placeholder={!user || !profile?.is_registered ? 'Щоб писати, увійди або створи акаунт.' : alreadyPosted && !profile.is_admin ? 'Ти вже залишив повідомлення сьогодні. Побачимось завтра.' : 'Про що ти думаєш сьогодні?'}
          aria-label="Твоє повідомлення" />
        <div className="compose-row"><span className="counter">{message.length} / 180</span><button type="submit" disabled={!canPublish}>Опублікувати ↗</button></div>
        {status && <div className={`status${error ? ' error' : ''}`} role="status" aria-live="polite">{status}</div>}
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
          {posts.length === 0 && !loading ? <div className="empty-state"><MessageCircle /><p>Тут поки тихо</p><span>Залиш першу думку в цьому розділі</span></div> : posts.map(post => (
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