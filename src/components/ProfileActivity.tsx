import type { CSSProperties } from 'react';

type ActivityPost = { id: string; created_at: string; topic: string };
type ActivityTopic = { id: string; label: string; color: string };
const TZ = 'Europe/Kyiv';
const hourFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: TZ });
const dateFormat = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
const weekdayFormat = new Intl.DateTimeFormat('uk-UA', { weekday: 'long', timeZone: TZ });

function parts(date: Date) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
}
function dayKey(value: string) {
  const p = parts(new Date(value));
  const get = (type: string) => p.find(x => x.type === type)?.value ?? '00';
  return get('year')+'-'+get('month')+'-'+get('day');
}
function plural(value:number, one:string, few:string, many:string) {
  const n=value%100; if(n>=11&&n<=14)return many;
  switch(value%10){case 1:return one;case 2:case 3:case 4:return few;default:return many;}
}
function ProfileActivity({posts,topics}:{posts:ActivityPost[];topics:ActivityTopic[]}) {
  const days = new Map<string, ActivityPost[]>();
  const hours = [0,0,0,0];
  const weekdays = Array.from({length:7},()=>0);
  const topicCounts = new Map<string,number>();
  for(const post of posts){
    const date=new Date(post.created_at), key=dayKey(post.created_at);
    days.set(key,[...(days.get(key)??[]),post]);
    const hour=Number(hourFormat.format(date));
    hours[hour<6?3:hour<12?0:hour<18?1:2]++;
    const weekday=Number(new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:TZ}).formatToParts(date).find(p=>p.type==='weekday')?.value==='Sun'?0:0);
    const dayIndex=Number(new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:TZ}).formatToParts(date).find(p=>p.type==='weekday')?.value ? new Date(date.toLocaleString('en-US',{timeZone:TZ})).getDay() : 0);
    weekdays[dayIndex]=(weekdays[dayIndex]??0)+1;
    topicCounts.set(post.topic,(topicCounts.get(post.topic)??0)+1);
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
  const timeLabels=['Ранок','День','Вечір','Ніч'];
  const timeValues=[hours[0],hours[1],hours[2],hours[3]];
  const maxTime=Math.max(1,...timeValues);
  const weekdayLabels=['Нд','Пн','Вт','Ср','Чт','Пт','Сб'];
  const maxWeekday=Math.max(1,...weekdays);
  const first=posts.length?posts.reduce((a,b)=>Date.parse(a.created_at)<Date.parse(b.created_at)?a:b):null;
  const last=posts.length?posts.reduce((a,b)=>Date.parse(a.created_at)>Date.parse(b.created_at)?a:b):null;
  const avg=activeDays.length?posts.length/activeDays.length:0;
  const topTopic=leadingTopic?topics.find(t=>t.id===leadingTopic[0]):null;

  return <section className="profile-activity" aria-label="Портрет активності">
    <div className="activity-kicker"><span>ПОРТРЕТ АКТИВНОСТІ</span><span>ЗА ВЕСЬ ЧАС</span></div>
    <div className="activity-overview">
      <div className="activity-primary"><strong>{posts.length.toLocaleString('uk-UA')}</strong><span>{plural(posts.length,'допис','дописи','дописів')} загалом</span></div>
      <div className="activity-overview-side">
        <div><strong>{activeDays.length.toLocaleString('uk-UA')}</strong><span>активних {plural(activeDays.length,'день','дні','днів')}</span></div>
        <div><strong>{avg.toLocaleString('uk-UA',{maximumFractionDigits:1})}</strong><span>дописів за активний день</span></div>
      </div>
    </div>
    <div className="activity-section">
      <div className="activity-section-head"><span>01 / ЧАС ДОБИ</span><small>Коли найчастіше з'являється</small></div>
      <div className="activity-bars">{timeValues.map((value,index)=><div className="activity-bar-row" key={timeLabels[index]}><span>{timeLabels[index]}</span><div className="activity-bar-track"><i style={{width:`${value/maxTime*100}%`}}/></div><strong>{posts.length?Math.round(value/posts.length*100):0}%</strong></div>)}</div>
    </div>
    <div className="activity-section">
      <div className="activity-section-head"><span>02 / ДНІ ТИЖНЯ</span><small>Розподіл публікацій</small></div>
      <div className="activity-weekdays">{weekdayLabels.map((label,index)=><div key={label}><strong>{posts.length?Math.round(weekdays[index]/posts.length*100):0}%</strong><i className="activity-weekday-track"><b style={{height:`${weekdays[index]/maxWeekday*100}%`}}/></i><span>{label}</span></div>)}</div>
    </div>
    <div className="activity-section">
      <div className="activity-section-head"><span>03 / ТЕМАТИЧНИЙ ФОКУС</span><small>Найчастіший напрям</small></div>
      {topTopic?<><div className="activity-topic-lead"><i style={{'--activity-topic':topTopic.color} as CSSProperties}/><strong>{topTopic.label}</strong><span>{leadingTopic?.[1].toLocaleString('uk-UA')} {plural(leadingTopic?.[1]??0,'допис','дописи','дописів')} · {Math.round((leadingTopic?.[1]??0)/Math.max(1,posts.length)*100)}%</span></div><div className="activity-topic-list">{[...topicCounts.entries()].sort((a,b)=>b[1]-a[1]).map(([id,count])=>{const topic=topics.find(t=>t.id===id);return topic?<div key={id}><span>{topic.label}</span><i><b style={{width:`${count/Math.max(1,posts.length)*100}%`,'--activity-topic':topic.color} as CSSProperties}/></i><small>{count}</small></div>:null;})}</div></>:<p className="activity-empty">Ще немає достатньо даних.</p>}
    </div>
    <div className="activity-section activity-records">
      <div className="activity-section-head"><span>04 / ФАКТИ</span><small>Особисті показники</small></div>
      <div className="activity-facts">
        <div><span>Найактивніший день</span><strong>{busiest?dateFormat.format(new Date(busiest[0]+'T12:00:00Z')):'—'}</strong><small>{busiest?busiest[1].length+' '+plural(busiest[1].length,'допис','дописи','дописів'):'Немає даних'}</small></div>
        <div><span>Найдовша серія</span><strong>{longest} {plural(longest,'день','дні','днів')}</strong><small>поспіль з активністю</small></div>
        <div><span>Перша поява</span><strong>{first?dateFormat.format(new Date(first.created_at)):'—'}</strong><small>{first?weekdayFormat.format(new Date(first.created_at)):''}</small></div>
        <div><span>Остання поява</span><strong>{last?dateFormat.format(new Date(last.created_at)):'—'}</strong><small>{last?weekdayFormat.format(new Date(last.created_at)):''}</small></div>
      </div>
    </div>
    {!posts.length&&<div className="activity-empty">Коли з'являться перші дописи, тут сформується портрет активності.</div>}
  </section>;
}
export default ProfileActivity;
