import { useCallback, useEffect, useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const choices = [
  { id: 'heart', emoji: '❤️', label: 'Подобається' },
  { id: 'like', emoji: '👍', label: 'Погоджуюсь' },
  { id: 'laugh', emoji: '😂', label: 'Смішно' },
  { id: 'idea', emoji: '💡', label: 'Цікаво' },
] as const;
type Reaction = typeof choices[number]['id'];
type SocialSummary = { reactions: { user_id: string; reaction: Reaction }[]; comments: number };

export default function PostSocial({ postId, userId, onOpenDiscussion, onLogin, preloaded }: {
  postId: string;
  userId: string | null;
  onOpenDiscussion: () => void;
  onLogin: () => void;
  preloaded?: SocialSummary;
}) {
  const [rows, setRows] = useState<{ user_id: string; reaction: Reaction }[]>(preloaded?.reactions ?? []);
  const [commentCount, setCommentCount] = useState(preloaded?.comments ?? 0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [reactionResult, commentResult] = await Promise.all([
      supabase.from('copypaste_post_reactions').select('user_id,reaction').eq('post_id', postId),
      supabase.from('copypaste_comments').select('id', { count: 'exact', head: true }).eq('post_id', postId),
    ]);
    if (!reactionResult.error) setRows((reactionResult.data ?? []) as { user_id: string; reaction: Reaction }[]);
    if (!commentResult.error) setCommentCount(commentResult.count ?? 0);
  }, [postId]);

  useEffect(() => {
    if (preloaded) {
      setRows(preloaded.reactions);
      setCommentCount(preloaded.comments);
    } else void load();
  }, [preloaded, load]);

  const selected = rows.find(row => row.user_id === userId)?.reaction ?? null;
  const total = rows.length;
  async function chooseReaction(reaction: Reaction) {
    if (!userId) { setPickerOpen(false); onLogin(); return; }
    if (busy) return;
    setBusy(true);
    try {
      if (selected === reaction) {
        const { error } = await supabase.from('copypaste_post_reactions').delete().eq('post_id', postId).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('copypaste_post_reactions').upsert(
          { post_id: postId, user_id: userId, reaction },
          { onConflict: 'post_id,user_id' }
        );
        if (error) throw error;
      }
      await load();
    } catch (error) {
      console.error('Reaction update failed:', error);
    } finally {
      setBusy(false);
      setPickerOpen(false);
    }
  }

  const selectedChoice = choices.find(choice => choice.id === selected);
  return <div className="post-social">
    <div className="post-social-actions">
      <div className="reaction-control">
        <button type="button" className={'post-action reaction-trigger' + (selected ? ' is-selected' : '')}
          aria-label="Обрати реакцію" aria-expanded={pickerOpen}
          onClick={() => userId ? setPickerOpen(value => !value) : onLogin()}>
          {selectedChoice ? <span className="reaction-current">{selectedChoice.emoji}</span> : <Heart aria-hidden="true"/>}
          <span>{total}</span>
        </button>
        {pickerOpen && <div className="reaction-picker" role="group" aria-label="Оберіть реакцію">
          {choices.map(choice => <button key={choice.id} type="button"
            className={'reaction-option' + (selected === choice.id ? ' active' : '')}
            title={choice.label} aria-label={choice.label} disabled={busy}
            onClick={() => void chooseReaction(choice.id)}>{choice.emoji}</button>)}
        </div>}
      </div>
      <button type="button" className="post-action" onClick={onOpenDiscussion} aria-label="Відкрити обговорення">
        <MessageCircle aria-hidden="true"/><span>{commentCount}</span>
      </button>
    </div>
  </div>;
}
