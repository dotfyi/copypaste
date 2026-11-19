import type { CSSProperties } from 'react';

type DiaryTopic = { id: string; label: string; color: string };
type DiaryPost = { id: string; created_at: string; topic: string };

type DiaryEntryData = {
  key: string;
  date: Date;
  posts: DiaryPost[];
  topics: { topic: DiaryTopic; count: number }[];
  firstPost: DiaryPost;
  lastPost: DiaryPost;
};

type DiaryWeekData = { key: string; label: string; entries: DiaryEntryData[] };

const KYIV_TIME_ZONE = 'Europe/Kyiv';
const DAY_MS = 24 * 60 * 60 * 1000;
const weekDate = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', timeZone: KYIV_TIME_ZONE });
const weekday = new Intl.DateTimeFormat('uk-UA', { weekday: 'short', timeZone: KYIV_TIME_ZONE });
const clock = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: KYIV_TIME_ZONE });

function kyivDateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KYIV_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '00';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function getLast28Days(): string[] {
  const [year, month, day] = kyivDateKey(new Date()).split('-').map(Number);
  const today = Date.UTC(year, month - 1, day);
  return Array.from({ length: 28 }, (_, index) => kyivDateKey(new Date(today - (27 - index) * DAY_MS)));
}

function buildDiaryEntries(posts: DiaryPost[], topics: DiaryTopic[]): DiaryEntryData[] {
  const postsByDay = new Map<string, DiaryPost[]>();

  for (const post of posts) {
    const key = kyivDateKey(new Date(post.created_at));
    const dayPosts = postsByDay.get(key) ?? [];
    dayPosts.push(post);
    postsByDay.set(key, dayPosts);
  }

  return getLast28Days()
    .map(key => {
      const dayPosts = (postsByDay.get(key) ?? [])
        .slice()
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      const [year, month, day] = key.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day, 12));
      const counts = new Map<string, number>();

      for (const post of dayPosts) counts.set(post.topic, (counts.get(post.topic) ?? 0) + 1);

      const topicRows = [...counts.entries()]
        .map(([id, count]) => ({ topic: topics.find(topic => topic.id === id), count }))
        .filter((item): item is { topic: DiaryTopic; count: number } => Boolean(item.topic));

      return {
        key, date, posts: dayPosts, topics: topicRows,
        firstPost: dayPosts[0], lastPost: dayPosts[dayPosts.length - 1],
      };
    })
    .filter((entry): entry is DiaryEntryData => entry.posts.length > 0)
    .reverse();
}

function groupEntriesByWeek(entries: DiaryEntryData[]): DiaryWeekData[] {
  const weeks: DiaryWeekData[] = [];

  for (const entry of entries) {
    const monday = new Date(entry.date);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    const key = kyivDateKey(monday);
    let week = weeks.find(item => item.key === key);

    if (!week) {
      const sunday = new Date(monday);
      sunday.setUTCDate(sunday.getUTCDate() + 6);
      const sameMonth = monday.getUTCMonth() === sunday.getUTCMonth();
      const label = sameMonth
        ? `${monday.getUTCDate()}–${weekDate.format(sunday)}`
        : `${weekDate.format(monday)} — ${weekDate.format(sunday)}`;
      week = { key, label, entries: [] };
      weeks.push(week);
    }

    week.entries.push(entry);
  }

  return weeks;
}

function pluralizePosts(count: number): string {
  if (count === 1) return 'допис';
  if (count >= 2 && count <= 4) return 'дописи';
  return 'дописів';
}

function TopicMark({ topic, count, compact = false }: { topic: DiaryTopic; count?: number; compact?: boolean }) {
  return (
    <span className={compact ? 'diary-topic-mark compact' : 'diary-topic-mark'}>
      <i style={{ '--topic-accent': topic.color } as CSSProperties} />
      {topic.label}
      {count !== undefined && <small>{compact ? `×${count}` : count}</small>}
    </span>
  );
}

function DiarySummary({ total, activeDays }: { total: number; activeDays: number }) {
  const activeLabel = activeDays === 1 ? 'день присутності' : activeDays > 1 && activeDays < 5 ? 'дні присутності' : 'днів присутності';

  return (
    <div className="diary-intro">
      <div className="diary-total"><strong>{total}</strong><span>дописів за цей період</span></div>
      <div className="diary-active"><strong>{activeDays}</strong><span>{activeLabel}</span></div>
    </div>
  );
}

function DiaryTopicSummary({ topics }: { topics: (DiaryTopic & { count: number })[] }) {
  if (!topics.length) return null;

  return (
    <div className="diary-topics" aria-label="Теми дописів">
      {topics.map(topic => <TopicMark key={topic.id} topic={topic} count={topic.count} />)}
    </div>
  );
}

function DiaryEntry({ entry }: { entry: DiaryEntryData }) {
  const timeRange = clock.format(new Date(entry.firstPost.created_at)) +
    (entry.lastPost.id !== entry.firstPost.id ? ` — ${clock.format(new Date(entry.lastPost.created_at))}` : '');

  return (
    <article className="diary-entry">
      <div className="diary-date">
        <strong>{entry.date.getUTCDate().toString().padStart(2, '0')}</strong>
        <span>{weekday.format(entry.date).replace('.', '')}</span>
      </div>
      <div className="diary-entry-content">
        <div className="diary-entry-heading">
          <span>{entry.posts.length} {pluralizePosts(entry.posts.length)}</span>
        </div>
        <div className="diary-entry-detail">
          <span>{timeRange}</span>
          <div className="diary-entry-topics">
            {entry.topics.map(({ topic, count }) => <TopicMark key={topic.id} topic={topic} count={count > 1 ? count : undefined} compact />)}
          </div>
        </div>
      </div>
    </article>
  );
}

function DiaryWeek({ week }: { week: DiaryWeekData }) {
  return (
    <section className="diary-week">
      <div className="diary-week-heading"><span>{week.label}</span><i /></div>
      <div className="diary-entries">
        {week.entries.map(entry => <DiaryEntry key={entry.key} entry={entry} />)}
      </div>
    </section>
  );
}

export default function DiaryTimeline({ posts, topics }: { posts: DiaryPost[]; topics: DiaryTopic[] }) {
  const entries = buildDiaryEntries(posts, topics);
  const weeks = groupEntriesByWeek(entries);
  const total = entries.reduce((sum, entry) => sum + entry.posts.length, 0);
  const topicTotals = topics
    .map(topic => ({
      ...topic,
      count: entries.reduce((sum, entry) => sum + entry.posts.filter(post => post.topic === topic.id).length, 0),
    }))
    .filter(topic => topic.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <section className="profile-living profile-diary" aria-label="Щоденник присутності за останні 28 днів">
      <div className="diary-topline"><span>ЩОДЕННИК ПРИСУТНОСТІ</span><span>ОСТАННІ 28 ДНІВ</span></div>
      <DiarySummary total={total} activeDays={entries.length} />
      <DiaryTopicSummary topics={topicTotals} />
      {weeks.length > 0
        ? <div className="diary-weeks">{weeks.map(week => <DiaryWeek key={week.key} week={week} />)}</div>
        : <div className="diary-empty"><span>—</span><p>Ці сторінки поки порожні.</p><small>Коли з'являться дописи, тут залишиться хронологія твоєї присутності.</small></div>}
    </section>
  );
}
