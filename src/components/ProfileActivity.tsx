import { useMemo, useState } from 'react';

type ActivityPost = { id: string; created_at: string; topic: string };

function kyivDate(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return get('year') + '-' + get('month') + '-' + get('day');
}
function labelDate(key: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(key + 'T12:00:00Z'));
}

export default function ProfileActivity({ posts }: { posts: ActivityPost[] }) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const first = posts.length
      ? Math.min(...posts.map(post => Number(kyivDate(post.created_at).slice(0, 4))))
      : currentYear;
    return Array.from({ length: currentYear - first + 1 }, (_, index) => currentYear - index);
  }, [posts, currentYear]);
  const [year, setYear] = useState(currentYear);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const days = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      const key = kyivDate(post.created_at);
      if (Number(key.slice(0, 4)) === year) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const start = new Date(Date.UTC(year, 0, 1));
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    return Array.from({ length: 53 * 7 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      const inYear = date.getUTCFullYear() === year;
      return { key, count: inYear ? counts.get(key) ?? 0 : 0, inYear };
    });
  }, [posts, year]);

  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, index, 1));
    const offset = Math.floor((date.getUTCDate() - 1 + ((date.getUTCDay() + 6) % 7)) / 7);
    return { label: new Intl.DateTimeFormat('uk-UA', { month: 'short', timeZone: 'UTC' }).format(date), offset };
  }), [year]);
  const selectedCount = selectedDay ? days.find(day => day.key === selectedDay)?.count ?? 0 : 0;

  return <section className="profile-activity github-activity" aria-label="Графік активності">
    <div className="github-activity-top">
      <div className="github-months">{months.map((month, index) => <span key={index} style={{ gridColumn: month.offset + 1 }}>{month.label}</span>)}</div>
      <div className="github-calendar">
        <div className="github-weekdays"><span>Пн</span><span>Ср</span><span>Пт</span></div>
        <div className="github-grid">{days.map(day => {
          const level = day.count === 0 ? 0 : day.count === 1 ? 1 : day.count <= 3 ? 2 : day.count <= 6 ? 3 : 4;
          return <button key={day.key} type="button"
            className={`github-day level-${level}${day.inYear ? '' : ' outside'}${selectedDay === day.key ? ' selected' : ''}`}
            disabled={!day.inYear}
            title={day.inYear ? `${labelDate(day.key)} · ${day.count} активностей` : ''}
            aria-label={day.inYear ? `${labelDate(day.key)}: ${day.count} активностей` : undefined}
            onClick={() => setSelectedDay(current => current === day.key ? null : day.key)} />;
        })}</div>
      </div>
    </div>
    <div className="github-activity-bottom">
      <div className="github-year-control">
        <button type="button" aria-label="Попередній рік" disabled={year <= (years[years.length - 1] ?? currentYear)} onClick={() => { setYear(value => Math.max(years[years.length - 1] ?? currentYear, value - 1)); setSelectedDay(null); }}>‹</button>
        <select aria-label="Рік активності" value={year} onChange={event => { setYear(Number(event.target.value)); setSelectedDay(null); }}>
          {years.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
        <button type="button" aria-label="Наступний рік" disabled={year >= currentYear} onClick={() => { setYear(value => Math.min(currentYear, value + 1)); setSelectedDay(null); }}>›</button>
      </div>
      {selectedDay && <span className="github-selected-day">{labelDate(selectedDay)} · {selectedCount}</span>}
      <div className="github-legend"><span>Менше</span>{[0,1,2,3,4].map(level => <i key={level} className={`level-${level}`}/>)}<span>Більше</span></div>
    </div>
  </section>;
}
