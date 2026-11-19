import type { CSSProperties } from 'react';

type ActivityPost = { id: string; created_at: string; topic: string };
type ActivityTopic = { id: string; label: string; color: string };
const TZ = 'Europe/Kyiv';
const hourFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: TZ });
const dateFormat = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
const monthFormat = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric', timeZone: TZ });
const weekdayFormat = new Intl.DateTimeFormat('uk-UA', { weekday: 'long', timeZone: TZ });
const shortMonthFormat = new Intl.DateTimeFormat('uk-UA', { month: 'short', timeZone: TZ });
function dayKey(value: string) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const get = (type: string) => p.find(x => x.type === type)?.value ?? '00';
  return get('year')+'-'+get('month')+'-'+get('day');
}
function dateFromKey(key: string) { const [y,m,d]=key.split('-').map(Number); return new Date(Date.UTC(y,m-1,d,12)); }
function plural(value:number, one:string, few:string, many:string) {
  const n=value%100; if(n>=11&&n<=14)return many;
  switch(value%10){case 1:return one;case 2:case 3:case 4:return few;default:return many;}
}
function ProfileActivity({posts,topics}:{posts:ActivityPost[];topics:ActivityTopic[]}) {
  const days = new Map<string, ActivityPost[]>();
  const hours = [0,0,0,0];
  const weekdays = Array.from({length:7},()=>0);
  const topicCounts = new Map<string,number>();
  const months = new Map<string,number>();
  for(const post of posts){
    const date=new Date(post.created_at), key=dayKey(post.created_at);
    days.set(key,[...(days.get(key)??[]),post]);
    const hour=Number(hourFormat.format(date));
    hours[hour<6?3:hour<12?0:hour<18?1:2]++;
    const weekdayName=new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:TZ}).format(date);
    const dayIndex=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(weekdayName);
    weekdays[dayIndex]=(weekdays[dayIndex]??0)+1;
    topicCounts.set(post.topic,(topicCounts.get(post.topic)??0)+1);
    const monthKey=dayKey(post.created_at).slice(0,7);
    months.set(monthKey,(months.get(monthKey)??0)+1);
  }
  const activeDays=[...days.keys()].sort();
  let longest=0,streak=0,previous:number|null=null;
  for(const key of activeDays){
    const [y,m,d]=key.split('-').map(Number), current=Date.UTC(y,m-1,d);
    streak=previous!==null&&current-previous===86400000?streak+1:1;
    longest=Math.max(longest,streak); previous=current;
  }
  const busiest=[...days.entries()].sort((a,b)=>b[1].length-a[1].length)[0];
  const leadingTopic=[...topicCounts.entries()].sort((a,b)=>b[1]-a[1])[0];
  const first=posts.length?posts.reduce((a,b)=>Date.parse(a.created_at)<Date.parse(b.created_at)?a:b):null;
  const last=posts.length?posts.reduce((a,b)=>Date.parse(a.created_at)>Date.parse(b.created_at)?a:b):null;
  const topTopic=leadingTopic?topics.find(t=>t.id===leadingTopic[0]):null;
  const maxTopic=Math.max(1,...topics.map(t=>topicCounts.get(t.id)??0));
  const maxMonth=Math.max(1,...months.values());
  const busiestMonth=[...months.entries()].sort((a,b)=>b[1]-a[1])[0];
  const topHourIndex=hours.indexOf(Math.max(...hours));
  const topTimeLabel=posts.length?['ранком','удень','увечері','вночі'][topHourIndex]:'—';
  const calendarEnd=new Date();
  const calendarStart=new Date(calendarEnd); calendarStart.setDate(calendarStart.getDate()-181);
  const calendarCells=Array.from({length:182},(_,i)=>{const d=new Date(calendarStart);d.setDate(d.getDate()+i);const key=dayKey(d.toISOString());return {key,count:days.get(key)?.length??0};});
  const monthlyBars=Array.from({length:12},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-(11-i));const key=dayKey(d.toISOString()).slice(0,7);return {key,label:shortMonthFormat.format(d),count:months.get(key)??0};});
  const milestones=[
    ...(first?[{date:new Date(first.created_at),title:'Перша поява',detail:'Перший допис на Copypaste'}]:[]),
    ...(busiestMonth?[{date:dateFromKey(busiestMonth[0]+'-01'),title:'Найактивніший період',detail:monthFormat.format(dateFromKey(busiestMonth[0]+'-01'))+' · '+busiestMonth[1]+' дописів'}]:[]),
    ...(last&&(!first||last.id!==first.id)?[{date:new Date(last.created_at),title:'Останній допис',detail:dateFormat.format(new Date(last.created_at))}]:[])
  ].sort((a,b)=>a.date.getTime()-b.date.getTime());
  const postGoal=Math.min(100,posts.length),streakGoal=Math.min(7,longest);
  return <section className="profile-activity" aria-label="Профіль та активність">
    <div className="profile-cover">
      <div className="profile-cover-art" aria-hidden="true"><i/><i/><i/></div>
      <div className="profile-cover-bottom"><span className="profile-cover-avatar" aria-hidden="true">✳</span><div><span className="profile-cover-label">COPypaste / ОСОБИСТИЙ ПРОФІЛЬ</span><strong>Історія твоєї активності</strong></div></div>
    </div>
    <div className="activity-overview">
      <div className="activity-primary"><strong>{posts.length.toLocaleString('uk-UA')}</strong><span>{plural(posts.length,'допис','дописи','дописів')} загалом</span></div>
      <div className="activity-overview-stat"><strong>{activeDays.length}</strong><span>активних днів</span></div>
      <div className="activity-overview-stat"><strong>{topTopic?.label??'—'}</strong><span>провідна тема</span></div>
      <div className="activity-achievements">
        <div className="activity-achievements-head"><span>ТВОЇ ДОСЯГНЕННЯ</span><span>{(postGoal===100?1:0)+(streakGoal===7?1:0)} / 2</span></div>
        <div className="activity-goal"><div><strong>✦</strong><span>100 дописів</span><small>{postGoal} / 100</small></div><i><b style={{width:postGoal+'%'}}/></i></div>
        <div className="activity-goal"><div><strong>↗</strong><span>7 днів поспіль</span><small>{streakGoal} / 7</small></div><i><b style={{width:(streakGoal/7*100)+'%'}}/></i></div>
      </div>
    </div>
    <div className="activity-two-col">
      <section className="activity-card activity-topics-card">
        <div className="activity-card-head"><span>Тематичний фокус</span><small>{topTopic?topTopic.label:'Усі теми'}</small></div>
        {topTopic&&leadingTopic&&<div className="activity-topic-highlight"><strong>{topTopic.label}</strong><span>{Math.round(leadingTopic[1]/Math.max(1,posts.length)*100)}% дописів</span></div>}
        <div className="activity-topic-list">{topics.map(topic=>{const count=topicCounts.get(topic.id)??0;return <div key={topic.id} className={count===0?'is-empty':''}><span><i style={{'--activity-topic':topic.color} as CSSProperties}/>{topic.label}</span><small>{posts.length?Math.round(count/posts.length*100):0}%</small><b><i style={{width:(count/maxTopic*100)+'%','--activity-topic':topic.color} as CSSProperties}/></b></div>;})}</div>
        <div className="activity-generated-art" aria-hidden="true"><i/><i/><i/></div>
      </section>
      <section className="activity-card activity-calendar-card">
        <div className="activity-card-head"><span>Ритм активності</span><small>Останні 6 місяців</small></div>
        <div className="activity-calendar">{calendarCells.map(cell=><i key={cell.key} title={cell.key+': '+cell.count} className={'level-'+(cell.count===0?0:cell.count===1?1:cell.count<=3?2:cell.count<=6?3:4)}/>)}</div>
        <div className="activity-calendar-legend"><span>Менше</span><i/><i/><i/><i/><span>Більше</span></div>
      </section>
    </div>
    <div className="activity-two-col">
      <section className="activity-card activity-history-card">
        <div className="activity-card-head"><span>Історія профілю</span><small>Ключові моменти</small></div>
        {milestones.length?<div className="activity-timeline">{milestones.map((item,index)=><div key={item.title} className={index===milestones.length-1?'is-latest':''}><i/><div><time>{dateFormat.format(item.date)}</time><strong>{item.title}</strong><span>{item.detail}</span></div></div>)}</div>:<p className="activity-card-empty">Твоя історія почнеться з першого допису.</p>}
      </section>
      <section className="activity-card activity-facts-card">
        <div className="activity-card-head"><span>Ключові факти</span><small>Твої рекорди</small></div>
        <div className="activity-facts">
          <div><span>Найактивніший день</span><strong>{busiest?weekdayFormat.format(dateFromKey(busiest[0])):'—'}</strong></div>
          <div><span>Найактивніший час</span><strong>{topTimeLabel}</strong></div>
          <div><span>Найдовша серія</span><strong>{longest} {plural(longest,'день','дні','днів')}</strong></div>
          <div><span>Рекорд за день</span><strong>{busiest?.[1].length??0} {plural(busiest?.[1].length??0,'допис','дописи','дописів')}</strong></div>
        </div>
      </section>
    </div>
    <section className="activity-card activity-year-card">
      <div className="activity-card-head"><span>Загальна активність</span><small>Останні 12 місяців</small></div>
      <div className="activity-month-bars">{monthlyBars.map(item=><div key={item.key}><i><b style={{height:(item.count/maxMonth*100)+'%'}}/></i><span>{item.label}</span></div>)}</div>
    </section>
    <div className="activity-signoff"><span>Твій профіль — це історія інтересів, ідей і активності.</span><i aria-hidden="true">✳</i></div>
  </section>;
}
export default ProfileActivity;
