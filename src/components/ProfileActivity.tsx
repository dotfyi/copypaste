import type { CSSProperties } from 'react';

type ActivityPost = { id: string; created_at: string; topic: string };
type ActivityTopic = { id: string; label: string; color: string };
const TZ = 'Europe/Kyiv';
const dateFormat = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
const monthFormat = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric', timeZone: TZ });
const shortMonthFormat = new Intl.DateTimeFormat('uk-UA', { month: 'short', timeZone: TZ });
const hourFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: TZ });
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
  const topicCounts = new Map<string,number>();
  const months = new Map<string,number>();
  const hours = [0,0,0,0];
  for(const post of posts){
    const key=dayKey(post.created_at);
    days.set(key,[...(days.get(key)??[]),post]);
    topicCounts.set(post.topic,(topicCounts.get(post.topic)??0)+1);
    const monthKey=key.slice(0,7);
    months.set(monthKey,(months.get(monthKey)??0)+1);
    const hour=Number(hourFormat.format(new Date(post.created_at)));
    hours[hour<6?3:hour<12?0:hour<18?1:2]++;
  }
  const activeDays=[...days.keys()].sort();
  let longest=0,streak=0,previous:number|null=null;
  for(const key of activeDays){
    const [y,m,d]=key.split('-').map(Number), current=Date.UTC(y,m-1,d);
    streak=previous!==null&&current-previous===86400000?streak+1:1;
    longest=Math.max(longest,streak); previous=current;
  }
  const leadingTopic=[...topicCounts.entries()].sort((a,b)=>b[1]-a[1])[0];
  const topTopic=leadingTopic?topics.find(t=>t.id===leadingTopic[0]):null;
  const maxTopic=Math.max(1,...topics.map(t=>topicCounts.get(t.id)??0));
  const first=posts.length?posts.reduce((a,b)=>Date.parse(a.created_at)<Date.parse(b.created_at)?a:b):null;
  const last=posts.length?posts.reduce((a,b)=>Date.parse(a.created_at)>Date.parse(b.created_at)?a:b):null;
  const busiest=[...days.entries()].sort((a,b)=>b[1].length-a[1].length)[0];
  const busiestMonth=[...months.entries()].sort((a,b)=>b[1]-a[1])[0];
  const topHour=hours.indexOf(Math.max(...hours));
  const timeLabels=['ранком','удень','увечері','вночі'];
  const calendarEnd=new Date();
  const calendarStart=new Date(calendarEnd); calendarStart.setDate(calendarStart.getDate()-181);
  const calendarCells=Array.from({length:182},(_,i)=>{const d=new Date(calendarStart);d.setDate(d.getDate()+i);const key=dayKey(d.toISOString());return {key,count:days.get(key)?.length??0};});
  const monthlyBars=Array.from({length:12},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-(11-i));const key=dayKey(d.toISOString()).slice(0,7);return {key,label:shortMonthFormat.format(d),count:months.get(key)??0};});
  const maxMonth=Math.max(1,...monthlyBars.map(x=>x.count));
  const achievements=[
    {title:'Перший крок',detail:'Опубліковано перше повідомлення',done:posts.length>=1,progress:Math.min(posts.length,1),goal:1},
    {title:'Власний голос',detail:'10 повідомлень у спільноті',done:posts.length>=10,progress:Math.min(posts.length,10),goal:10},
    {title:'Постійний учасник',detail:'50 повідомлень',done:posts.length>=50,progress:Math.min(posts.length,50),goal:50},
    {title:'Сто думок',detail:'100 повідомлень',done:posts.length>=100,progress:Math.min(posts.length,100),goal:100},
    {title:'Ритм',detail:'7 активних днів поспіль',done:longest>=7,progress:Math.min(longest,7),goal:7},
    {title:'Мандрівник тем',detail:'Публікації у 3 різних темах',done:topicCounts.size>=3,progress:Math.min(topicCounts.size,3),goal:3},
    {title:'Широкий інтерес',detail:'Публікації у 5 різних темах',done:topicCounts.size>=5,progress:Math.min(topicCounts.size,5),goal:5},
    {title:'Регулярність',detail:'10 різних активних днів',done:activeDays.length>=10,progress:Math.min(activeDays.length,10),goal:10}
  ];
  const unlocked=achievements.filter(x=>x.done).length;
  const milestones=[
    ...(first?[{date:new Date(first.created_at),title:'Перше повідомлення',detail:'Початок історії профілю'}]:[]),
    ...(busiestMonth?[{date:dateFromKey(busiestMonth[0]+'-01'),title:'Найактивніший місяць',detail:monthFormat.format(dateFromKey(busiestMonth[0]+'-01'))+' · '+busiestMonth[1]+' повідомлень'}]:[]),
    ...(last&&(!first||last.id!==first.id)?[{date:new Date(last.created_at),title:'Остання активність',detail:dateFormat.format(new Date(last.created_at))}]:[])
  ].sort((a,b)=>a.date.getTime()-b.date.getTime());
  return <section className="profile-activity profile-activity-clean" aria-label="Активність профілю">
    <section className="pa-section pa-achievements">
      <header className="pa-heading"><div><span>01 / ДОСЯГНЕННЯ</span><h2>Твої відзнаки</h2></div><strong>{unlocked}<small> / {achievements.length}</small></strong></header>
      <div className="pa-achievement-grid">{achievements.map((item,index)=><article className={item.done?'is-earned':''} key={item.title}><div className="pa-achievement-mark">{item.done?'✓':String(index+1).padStart(2,'0')}</div><div className="pa-achievement-copy"><strong>{item.title}</strong><span>{item.detail}</span>{!item.done&&<i><b style={{width:(item.progress/item.goal*100)+'%'}}/></i>}</div></article>)}</div>
    </section>
    <section className="pa-section">
      <header className="pa-heading"><div><span>02 / ІНТЕРЕСИ</span><h2>Тематичний фокус</h2></div><small>{posts.length} повідомлень</small></header>
      <div className="pa-topic-layout"><div className="pa-topic-lead"><strong>{topTopic?.label??'Поки без теми'}</strong><span>{leadingTopic?Math.round(leadingTopic[1]/Math.max(1,posts.length)*100)+'% усіх повідомлень':'Перші повідомлення покажуть твої інтереси'}</span></div><div className="pa-topic-list">{topics.map(topic=>{const count=topicCounts.get(topic.id)??0;return <div key={topic.id} className={count===0?'is-empty':''}><span>{topic.label}</span><small>{count}</small><i><b style={{width:(count/maxTopic*100)+'%','--pa-topic':topic.color} as CSSProperties}/></i></div>;})}</div></div>
    </section>
    <section className="pa-section">
      <header className="pa-heading"><div><span>03 / РИТМ</span><h2>Ритм активності</h2></div><small>Останні 6 місяців</small></header>
      <div className="pa-calendar">{calendarCells.map(cell=><i key={cell.key} title={cell.key+': '+cell.count} className={'level-'+(cell.count===0?0:cell.count===1?1:cell.count<=3?2:cell.count<=6?3:4)}/>)}</div>
      <div className="pa-legend"><span>Менше</span><i/><i/><i/><i/><span>Більше</span></div>
      <div className="pa-rhythm-summary"><div><strong>{activeDays.length}</strong><span>активних днів</span></div><div><strong>{longest}</strong><span>днів — найдовша серія</span></div><div><strong>{posts.length?timeLabels[topHour]:'—'}</strong><span>найчастіший час</span></div><div><strong>{busiest?.[1].length??0}</strong><span>повідомлень за день-рекорд</span></div></div>
    </section>
    <section className="pa-section">
      <header className="pa-heading"><div><span>04 / ХРОНОЛОГІЯ</span><h2>Історія профілю</h2></div><small>Ключові моменти</small></header>
      {milestones.length?<div className="pa-timeline">{milestones.map((item,index)=><article className={index===milestones.length-1?'is-latest':''} key={item.title}><i/><div><time>{dateFormat.format(item.date)}</time><strong>{item.title}</strong><span>{item.detail}</span></div></article>)}</div>:<p className="pa-empty">Тут з’явиться історія твоїх перших кроків і важливих моментів.</p>}
    </section>
    <section className="pa-section">
      <header className="pa-heading"><div><span>05 / ПІДСУМОК</span><h2>Загальна активність</h2></div><small>Останні 12 місяців</small></header>
      <div className="pa-total"><strong>{posts.length.toLocaleString('uk-UA')}</strong><span>{plural(posts.length,'повідомлення','повідомлення','повідомлень')} за весь час</span>{busiestMonth&&<small>Найактивніший місяць — {monthFormat.format(dateFromKey(busiestMonth[0]+'-01'))}</small>}</div>
      <div className="pa-month-bars">{monthlyBars.map(item=><div key={item.key}><span>{item.count||''}</span><i><b style={{height:(item.count/maxMonth*100)+'%'}}/></i><small>{item.label}</small></div>)}</div>
    </section>
  </section>;
}
export default ProfileActivity;
