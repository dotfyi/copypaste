import { useMemo, useState } from 'react';

type ActivityPost = { id: string; created_at: string; topic: string };

const kyivParts = (value: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return { year: Number(get('year')), key: get('year') + '-' + get('month') + '-' + get('day') };
};
const hourKyiv = (value: string) => Number(new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Kyiv', hour: '2-digit', hourCycle: 'h23',
}).format(new Date(value)));
const weekdayKyiv = (value: string) => {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Kyiv', weekday: 'short' }).format(new Date(value));
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(day);
};
const dateLabel = (key: string) => new Intl.DateTimeFormat('uk-UA', {
  timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date(key + 'T12:00:00Z'));

export default function ProfileActivity({ posts }: { posts: ActivityPost[] }) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    if (!posts.length) return [currentYear];
    const first = Math.min(...posts.map(post => kyivParts(post.created_at).year));
    return Array.from({ length: currentYear - first + 1 }, (_, index) => first + index).reverse();
  }, [posts, currentYear]);
  const [year, setYear] = useState(currentYear);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const stats = useMemo(() => {
    const days = new Map<string, number>();
    const hours = Array(24).fill(0) as number[];
    const weekdays = Array(7).fill(0) as number[];
    for (const post of posts) {
      const { key } = kyivParts(post.created_at);
      days.set(key, (days.get(key) ?? 0) + 1);
      hours[hourKyiv(post.created_at)] += 1;
      weekdays[weekdayKyiv(post.created_at)] += 1;
    }
    const active = [...days.keys()].sort();
    let longest = 0, streak = 0, previous = '';
    for (const key of active) {
      const current = new Date(key + 'T12:00:00Z');
      const prior = previous ? new Date(previous + 'T12:00:00Z') : null;
      const consecutive = !!prior && current.getTime() - prior.getTime() === 86400000;
      streak = consecutive ? streak + 1 : 1;
      longest = Math.max(longest, streak);
      previous = key;
    }
    const maxHour = Math.max(0, ...hours);
    const maxWeekday = Math.max(0, ...weekdays);
    return {
      days, hours, weekdays, activeDays: active.length, longest,
      peakHour: maxHour ? hours.indexOf(maxHour) : -1,
      peakWeekday: maxWeekday ? weekdays.indexOf(maxWeekday) : -1,
      average: active.length ? posts.length / active.length : 0,
      first: active[0] ?? null, last: active[active.length - 1] ?? null,
    };
  }, [posts]);

  const calendar = useMemo(() => {
    const jan1 = new Date(Date.UTC(year, 0, 1));
    const mondayOffset = (jan1.getUTCDay() + 6) % 7;
    const start = new Date(Date.UTC(year, 0, 1 - mondayOffset));
    return Array.from({ length: 371 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      const inYear = date.getUTCFullYear() === year;
      return { key, count: inYear ? stats.days.get(key) ?? 0 : 0, inYear };
    });
  }, [year, stats.days]);

  const months = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat('uk-UA', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, index, 1)))
  );
  const hourMax = Math.max(1, ...stats.hours);
  const weekdayMax = Math.max(1, ...stats.weekdays);
  const selectedCount = selectedDay ? stats.days.get(selectedDay) ?? 0 : 0;
  const minYear = years[years.length - 1] ?? currentYear;

  return <section className="profile-activity profile-rhythm" aria-label="Ритм активності профілю">
    <div className="rhythm-intro">
      <span className="rhythm-eyebrow">ІСТОРІЯ ПРИСУТНОСТІ</span>
      <div className="rhythm-total"><strong>{posts.length.toLocaleString('uk-UA')}</strong><span>повідомлень за весь час</span></div>
      <p>{stats.first ? 'Від ' + dateLabel(stats.first) + ' до ' + dateLabel(stats.last!) : 'Тут починатиметься твоя історія в Copypaste.'}</p>
    </div>

    <section className="rhythm-section">
      <div className="rhythm-section-head">
        <div><span>01 / КАЛЕНДАР</span><h2>Ритм по днях</h2></div>
        <div className="rhythm-year-control">
          <button type="button" aria-label="Попередній рік" disabled={year <= minYear} onClick={() => { setYear(value => Math.max(minYear, value - 1)); setSelectedDay(null); }}>‹</button>
          <select aria-label="Рік активності" value={year} onChange={event => { setYear(Number(event.target.value)); setSelectedDay(null); }}>
            {years.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" aria-label="Наступний рік" disabled={year >= currentYear} onClick={() => { setYear(value => Math.min(currentYear, value + 1)); setSelectedDay(null); }}>›</button>
        </div>
      </div>
      <div className="rhythm-month-labels">{months.map((month, index) => <span key={index}>{month}</span>)}</div>
      <div className="rhythm-calendar" role="group" aria-label={'Активність за ' + year}>
        {calendar.map(cell => <button key={cell.key} type="button"
          className={'rhythm-day level-' + (cell.count === 0 ? 0 : cell.count === 1 ? 1 : cell.count <= 3 ? 2 : cell.count <= 6 ? 3 : 4) + (!cell.inYear ? ' out-year' : '') + (selectedDay === cell.key ? ' selected' : '')}
          title={cell.inYear ? dateLabel(cell.key) + ' · ' + cell.count + ' повідомлень' : ''}
          disabled={!cell.inYear}
          aria-label={cell.inYear ? dateLabel(cell.key) + ': ' + cell.count + ' повідомлень' : undefined}
          onClick={() => setSelectedDay(cell.key === selectedDay ? null : cell.key)} />)}
      </div>
      <div className="rhythm-calendar-foot">
        <span>Менше</span><i className="level-0"/><i className="level-1"/><i className="level-2"/><i className="level-3"/><i className="level-4"/><span>Більше</span>
      </div>
      {selectedDay && <div className="rhythm-day-detail"><strong>{dateLabel(selectedDay)}</strong><span>{selectedCount} {selectedCount === 1 ? 'повідомлення' : 'повідомлень'}</span></div>}
    </section>

    <section className="rhythm-section">
      <div className="rhythm-section-head"><div><span>02 / ЧАС</span><h2>Коли ти тут</h2></div><small>За місцевим часом Києва</small></div>
      <div className="rhythm-hour-chart">{stats.hours.map((count, index) => <div key={index} title={index.toString().padStart(2, '0') + ':00 · ' + count} className="rhythm-hour-column"><i style={{ height: (count / hourMax * 100) + '%' }}/><span>{index % 3 === 0 ? String(index).padStart(2, '0') : ''}</span></div>)}</div>
      <div className="rhythm-section-head rhythm-week-head"><div><span>03 / ТИЖДЕНЬ</span><h2>Дні активності</h2></div></div>
      <div className="rhythm-week-chart">{['Пн','Вт','Ср','Чт','Пт','Сб','Нд'].map((label, index) => <div key={label}><i style={{ height: (stats.weekdays[(index + 1) % 7] / weekdayMax * 100) + '%' }}/><span>{label}</span><small>{stats.weekdays[(index + 1) % 7]}</small></div>)}</div>
    </section>

    <section className="rhythm-section">
      <div className="rhythm-section-head"><div><span>04 / ПОКАЗНИКИ</span><h2>Твій ритм</h2></div></div>
      <div className="rhythm-stat-grid">
        <div><strong>{stats.activeDays.toLocaleString('uk-UA')}</strong><span>активних днів</span></div>
        <div><strong>{stats.longest}</strong><span>днів — найдовша серія</span></div>
        <div><strong>{stats.average.toFixed(1).replace('.', ',')}</strong><span>повідомлень за активний день</span></div>
        <div><strong>{stats.peakHour >= 0 ? String(stats.peakHour).padStart(2, '0') + ':00' : '—'}</strong><span>найактивніша година</span></div>
        <div><strong>{stats.peakWeekday >= 0 ? ['Нд','Пн','Вт','Ср','Чт','Пт','Сб'][stats.peakWeekday] : '—'}</strong><span>найактивніший день тижня</span></div>
        <div><strong>{stats.last ? dateLabel(stats.last) : '—'}</strong><span>останній день активності</span></div>
      </div>
    </section>
  </section>;
}
