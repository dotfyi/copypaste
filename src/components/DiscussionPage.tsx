import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import * as LucideIcons from 'lucide-react';
import { ArrowLeft, ChevronDown, ChevronRight, MessageCircle, Send, Pencil, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PostSocial from './PostSocial';

type Topic = { id: string; label: string; icon: string; color: string };
type Author = { hex_login: string; is_moderator?: boolean; moderator_topics?: string[] };
type Post = { id: string; post_number: number; content: string; created_at: string; topic: string; profile: Author | null };
type CommentRow = {
  id: string; post_id: string; parent_id: string | null; author_id: string; content: string;
  created_at: string; edited_at: string | null; deleted_at: string | null;
  profile: Author | null;
};
const reactions = [
  { id: 'heart', emoji: '❤️', label: 'Подобається' },
  { id: 'like', emoji: '👍', label: 'Погоджуюсь' },
  { id: 'laugh', emoji: '😂', label: 'Смішно' },
  { id: 'idea', emoji: '💡', label: 'Цікаво' },
] as const;
type Reaction = typeof reactions[number]['id'];

function formatTime(value: string) {
  return new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
}
function InlineText({ value }: { value: string }) {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\|\|[^|]+\|\||>[^\n]+)/gm;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of value.matchAll(pattern)) {
    const token = match[0], index = match.index ?? 0;
    if (index > last) parts.push(value.slice(last, index));
    if (token.startsWith('**')) parts.push(<strong key={index}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('~~')) parts.push(<del key={index}>{token.slice(2, -2)}</del>);
    else if (token.startsWith('||')) parts.push(<span key={index} className="discussion-spoiler">{token.slice(2, -2)}</span>);
    else if (token.startsWith('*')) parts.push(<em key={index}>{token.slice(1, -1)}</em>);
    else parts.push(<span key={index} className="green-text">{token.slice(1)}</span>);
    last = index + token.length;
  }
  if (last < value.length) parts.push(value.slice(last));
  return <>{parts}</>;
}

function CommentReactions({ commentId, userId }: { commentId: string; userId: string | null }) {
  const [rows, setRows] = useState<{ user_id: string; reaction: Reaction }[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('copypaste_comment_reactions').select('user_id,reaction').eq('comment_id', commentId);
    if (!error) setRows((data ?? []) as { user_id: string; reaction: Reaction }[]);
  }, [commentId]);
  useEffect(() => { void load(); }, [load]);
  const selected = rows.find(row => row.user_id === userId)?.reaction;
  async function choose(reaction: Reaction) {
    if (!userId || busy) return;
    setBusy(true);
    try {
      if (selected === reaction) {
        const { error } = await supabase.from('copypaste_comment_reactions').delete().eq('comment_id', commentId).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('copypaste_comment_reactions').upsert(
          { comment_id: commentId, user_id: userId, reaction }, { onConflict: 'comment_id,user_id' }
        );
        if (error) throw error;
      }
      await load();
    } catch (error) { console.error('Comment reaction failed:', error); }
    finally { setBusy(false); setOpen(false); }
  }
  const selectedChoice = reactions.find(item => item.id === selected);
  return <span className="comment-reaction-control">
    <button type="button" className="discussion-inline-action" onClick={() => userId && setOpen(value => !value)} disabled={!userId} aria-label="Реакція на коментар">
      {selectedChoice ? selectedChoice.emoji : '♡'} <span>{rows.length}</span>
    </button>
    {open && <span className="comment-reaction-picker">{reactions.map(item => <button type="button" key={item.id} title={item.label} aria-label={item.label} disabled={busy} onClick={() => void choose(item.id)}>{item.emoji}</button>)}</span>}
  </span>;
}

export default function DiscussionPage({ postId, userId, topics, onBack, onLogin }: {
  postId: string; userId: string | null; topics: Topic[]; onBack: () => void; onLogin: () => void;
}) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const loadPost = useCallback(async () => {
    const { data, error: queryError } = await supabase.from('copypaste_posts')
      .select('id,post_number,content,created_at,topic,author_id,profile:copypaste_profiles!copypaste_posts_author_id_fkey(hex_login,is_moderator)')
      .eq('id', postId).maybeSingle();
    if (queryError) throw queryError;
    if (!data) { setPost(null); return; }
    const author = (data as any).profile as Author | null;
    if (author?.is_moderator) {
      const { data: scopes } = await supabase.from('copypaste_moderator_topics').select('topic_id').eq('user_id', (data as any).author_id);
      setPost({ ...(data as any), profile: { ...author, moderator_topics: (scopes ?? []).map((row: any) => row.topic_id) } });
    } else setPost(data as unknown as Post);
  }, [postId]);

  const loadComments = useCallback(async () => {
    const { data, error: queryError } = await supabase.from('copypaste_comments')
      .select('id,post_id,parent_id,author_id,content,created_at,edited_at,deleted_at,profile:copypaste_profiles!copypaste_comments_author_id_fkey(hex_login,is_moderator)')
      .eq('post_id', postId).order('created_at', { ascending: false });
    if (queryError) throw queryError;
    const rows = (data ?? []) as unknown as CommentRow[];
    const authorIds = [...new Set(rows.filter(row => row.profile?.is_moderator).map(row => row.author_id))];
    let scopes: { user_id: string; topic_id: string }[] = [];
    if (authorIds.length) {
      const { data: found } = await supabase.from('copypaste_moderator_topics').select('user_id,topic_id').in('user_id', authorIds);
      scopes = found ?? [];
    }
    const byUser = new Map<string, string[]>();
    for (const scope of scopes) byUser.set(scope.user_id, [...(byUser.get(scope.user_id) ?? []), scope.topic_id]);
    setComments(rows.map(row => ({ ...row, profile: row.profile ? { ...row.profile, moderator_topics: byUser.get(row.author_id) ?? [] } : null })));
  }, [postId]);

  const refresh = useCallback(async () => {
    try { await Promise.all([loadPost(), loadComments()]); }
    catch (cause) { console.error(cause); setError('Не вдалося завантажити обговорення.'); }
    finally { setLoading(false); }
  }, [loadPost, loadComments]);

  useEffect(() => { setLoading(true); void refresh(); }, [refresh]);
  useEffect(() => {
    const channel = supabase.channel('discussion-' + postId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'copypaste_comments', filter: 'post_id=eq.' + postId }, () => void loadComments())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [postId, loadComments]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, CommentRow[]>();
    for (const row of comments) if (row.parent_id) map.set(row.parent_id, [...(map.get(row.parent_id) ?? []), row]);
    return map;
  }, [comments]);
  const roots = useMemo(() => comments.filter(row => !row.parent_id), [comments]);
  const topic = post ? topics.find(item => item.id === post.topic) : undefined;
  const TopicIcon = topic ? ((LucideIcons as any)[topic.icon] ?? MessageCircle) : MessageCircle;

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!userId) { onLogin(); return; }
    const content = draft.trim();
    if (!content || busy) return;
    setBusy(true); setError('');
    try {
      const { error: insertError } = await supabase.from('copypaste_comments').insert({
        post_id: postId, parent_id: replyTo?.id ?? null, content,
      });
      if (insertError) throw insertError;
      setDraft(''); setReplyTo(null); await loadComments();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не вдалося додати коментар.'); }
    finally { setBusy(false); }
  }
  async function saveEdit(id: string) {
    const content = editDraft.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      const { error: updateError } = await supabase.from('copypaste_comments').update({ content }).eq('id', id);
      if (updateError) throw updateError;
      setEditing(null); setEditDraft(''); await loadComments();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не вдалося зберегти зміни.'); }
    finally { setBusy(false); }
  }
  async function removeComment(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const { error: updateError } = await supabase.from('copypaste_comments').update({ content: 'Коментар видалено', deleted_at: new Date().toISOString() }).eq('id', id);
      if (updateError) throw updateError;
      await loadComments();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не вдалося видалити коментар.'); }
    finally { setBusy(false); }
  }
  function reply(comment: CommentRow) {
    if (!userId) { onLogin(); return; }
    setReplyTo(comment);
    setDraft('');
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }

  function renderComment(comment: CommentRow): ReactNode {
    const children = childrenByParent.get(comment.id) ?? [];
    const isExpanded = expanded.has(comment.id);
    const collapsed = children.length > 2 && !isExpanded;
    const isDeleted = !!comment.deleted_at;
    const author = comment.profile?.hex_login ?? '#??????';
    const isModerator = !!comment.profile?.is_moderator && !!comment.profile.moderator_topics?.includes(post?.topic ?? '');
    const CommentTopicIcon = isModerator && topic ? ((LucideIcons as any)[topic.icon] ?? MessageCircle) : null;
    return <article className="discussion-comment" key={comment.id}>
      <div className="discussion-comment-head">
        <strong>{author.toLowerCase()}</strong>
        {CommentTopicIcon && <CommentTopicIcon className="moderator-topic-icon" aria-label="Модератор розділу"/>}
        <time>{formatTime(comment.created_at)}</time>
        {comment.edited_at && !isDeleted && <span className="discussion-edited">змінено</span>}
      </div>
      {editing === comment.id && !isDeleted ? <div className="discussion-edit">
        <textarea value={editDraft} onChange={event => setEditDraft(event.target.value)} maxLength={1000}/>
        <div><button type="button" onClick={() => void saveEdit(comment.id)} disabled={busy || !editDraft.trim()}>Зберегти</button><button type="button" onClick={() => setEditing(null)}>Скасувати</button></div>
      </div> : <p className={isDeleted ? 'discussion-deleted' : 'discussion-comment-text'}>{isDeleted ? 'Коментар видалено' : <InlineText value={comment.content}/>}</p>}
      {!isDeleted && <div className="discussion-comment-actions">
        <CommentReactions commentId={comment.id} userId={userId}/>
        {userId && <button type="button" className="discussion-inline-action" onClick={() => reply(comment)}>Відповісти</button>}
        {userId === comment.author_id && !editing && <>
          <button type="button" className="discussion-inline-action" aria-label="Редагувати коментар" onClick={() => { setEditing(comment.id); setEditDraft(comment.content); }}><Pencil/></button>
          <button type="button" className="discussion-inline-action" aria-label="Видалити коментар" onClick={() => void removeComment(comment.id)}><Trash2/></button>
        </>}
        {children.length > 0 && <button type="button" className="discussion-inline-action discussion-collapse" onClick={() => setExpanded(current => { const next = new Set(current); next.has(comment.id) ? next.delete(comment.id) : next.add(comment.id); return next; })}>
          {collapsed ? <><ChevronRight/>Показати {children.length} {children.length === 1 ? 'відповідь' : 'відповіді'}</> : <><ChevronDown/>Згорнути</>}
        </button>}
      </div>}
      {children.length > 0 && !collapsed && <div className="discussion-children">{children.map(child => renderComment(child))}</div>}
    </article>;
  }

  if (loading) return <section className="discussion-page compact-discussion"><button className="discussion-back" onClick={onBack}><ArrowLeft/> Усі теми</button><p className="discussion-loading">Завантажуємо обговорення…</p></section>;
  if (!post) return <section className="discussion-page compact-discussion"><button className="discussion-back" onClick={onBack}><ArrowLeft/> Усі теми</button><p className="discussion-loading">Тему не знайдено.</p></section>;

  return <section className="discussion-page compact-discussion">
    <button className="discussion-back" type="button" onClick={onBack}><ArrowLeft/> Усі теми</button>
    <div className="forum-breadcrumb">{topic?.label ?? post.topic} <span>/</span> ТЕМА №{post.post_number}</div>
    <article className="forum-thread-head">
      <div className="forum-thread-meta">
        <div className="forum-thread-author">
          <span className="forum-author-dot" style={{ backgroundColor: post.profile?.hex_login ?? '#aaa' }}/>
          <strong>{post.profile?.hex_login?.toLowerCase() ?? '#??????'}</strong>
          {post.profile?.is_moderator && post.profile.moderator_topics?.includes(post.topic) && <TopicIcon className="moderator-topic-icon" aria-label="Модератор розділу"/>}
        </div>
        <time>№ {post.post_number} · {formatTime(post.created_at)}</time>
      </div>
      <div className="forum-thread-content"><InlineText value={post.content}/></div>
      <PostSocial postId={post.id} userId={userId} onOpenDiscussion={() => document.querySelector('.forum-replies-toolbar')?.scrollIntoView({ behavior: 'smooth' })} onLogin={onLogin}/>
    </article>
    <div className="forum-replies-toolbar">
      <div><h2>Відповіді</h2><span>{comments.length} повідомлень</span></div>
      <span className="forum-sort-label">НАЙНОВІШІ ↓</span>
    </div>
    {error && <p className="discussion-error" role="status">{error}</p>}
    <div className="discussion-list forum-replies-list">
      {roots.length ? roots.map(comment => renderComment(comment)) : <p className="discussion-empty">Поки немає відповідей. Почни обговорення.</p>}
    </div>
    {userId ? <form className="discussion-composer forum-reply-composer" onSubmit={submitComment}>
      {replyTo && <div className="discussion-replying"><span>Відповідь для {replyTo.profile?.hex_login ?? '#??????'}</span><button type="button" aria-label="Скасувати відповідь" onClick={() => setReplyTo(null)}><X/></button></div>}
      <textarea ref={composerRef} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Написати відповідь…" maxLength={1000} rows={1}/>
      <button type="submit" disabled={busy || !draft.trim()} aria-label="Надіслати відповідь"><Send/></button>
    </form> : <div className="discussion-guest forum-reply-guest"><span>Увійди, щоб відповідати в обговоренні.</span><button type="button" onClick={onLogin}>Увійти</button></div>}
  </section>;
}
