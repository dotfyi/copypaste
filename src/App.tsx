import { useCallback, useEffect, useRef, useState, type FormEvent, type CSSProperties } from 'react';
import { BookOpen, Cpu, Gamepad2, Globe2, Newspaper, Palette, Shield, MessageCircle } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

type Topic = 'general' | 'games' | 'technology' | 'books' | 'art' | 'news';
type Profile = { hex_login: string; is_admin: boolean; is_moderator: boolean; is_registered: boolean };
type Post = {
  id: string; post_number: number; content: string; created_at: string; author_id: string; topic: Topic;
  profile?: { hex_login: string; is_admin?: boolean; is_moderator?: boolean } | null;
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
    return (
    <main className="shell">
      <header>
        <button className="brand" type="button" onClick={() => setAdminOpen(false)} style={{ color: topic === 'general' ? '#111' : topicColor[topic] }} aria-label="На головну"><strong>copy</strong><span>paste</span></button>
        <nav className="nav" aria-label="Навігація">
          <span className="current-login" style={{color:(profile?.is_admin||profile?.is_moderator)?profile.hex_login:'#777'}}>{profile?.hex_login?.toLowerCase()}</span>
          {profile?.is_admin && <button className="icon-btn" type="button" aria-label="Панель адміністратора" title="Панель адміністратора" onClick={() => { setAdminOpen(v=>!v); if (!adminOpen) void loadAdminStats(); }}><Shield /></button>}
        </nav>
      </header>
      {adminOpen && profile?.is_admin ? <section className="admin-panel">
        <h2>Панель адміністратора</h2>
        <div className="admin-stats"><span><strong>{stats.posts}</strong> повідомлень</span><span><strong>{stats.users}</strong> акаунтів</span></div>
        <label>Інтервал між повідомленнями (хв)</label>
        <div className="admin-inline"><input value={adminCooldown} onChange={e=>setAdminCooldown(e.target.value)} inputMode="numeric"/><button type="button" onClick={async()=>{try{await adminAction('update_settings',{cooldownMinutes:Number(adminCooldown)});setNotice('Інтервал збережено.');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Зберегти</button></div>
        <label>Створити акаунт</label>
        <div className="admin-inline"><input value={accountLogin} onChange={e=>setAccountLogin(e.target.value)} placeholder="Логін або порожньо для HEX"/><button type="button" onClick={async()=>{try{const result=await adminAction('create_account',{login:accountLogin});setNewAccount(result);setAccountLogin('');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Створити</button></div>
        {newAccount && <div className="new-account"><strong>{newAccount.login}</strong><code>{newAccount.secretKey}</code><button type="button" onClick={()=>void navigator.clipboard.writeText(newAccount.secretKey)}>Копіювати ключ</button></div>}
        <label>Права модератора за логіном</label>
        <div className="admin-inline"><input value={moderatorLogin} onChange={e=>setModeratorLogin(e.target.value)} placeholder="HEX-логін користувача"/><button type="button" onClick={async()=>{try{await adminAction('set_role',{login:moderatorLogin,role:'moderator'});setNotice('Права модератора оновлено.');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Надати</button></div>
        <label>Додати розділ</label>
        <div className="admin-inline"><input value={topicName} onChange={e=>setTopicName(e.target.value)} placeholder="Назва розділу"/><button type="button" onClick={async()=>{try{await adminAction('create_topic',{id:topicName.toLowerCase().replace(/[^a-z0-9_-]/g,'-'),label:topicName});setTopicName('');setNotice('Розділ додано.');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Додати</button></div>
        {status && <p className={error?'status error':'status'}>{status}</p>}
      </section> : <>
        <form className="composer" onSubmit={publishPost} aria-label="Нове повідомлення">
          <textarea ref={composerRef} value={message} onChange={event => setMessage(event.target.value)} maxLength={180}
            disabled={!user || !profile || busy}
            placeholder={!user ? 'Підключаємо анонімний профіль…' : 'Поділись думкою або введи /auth ключ чи /exit'}
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
                  <div className="identity"><span className="swatch" style={{ backgroundColor: post.profile?.hex_login || '#aaa' }} /><span className="hex" style={{color:(post.profile?.is_admin||post.profile?.is_moderator)?post.profile.hex_login:'#111'}}>{post.profile?.hex_login?.toLowerCase() || '#??????'}</span></div>
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