import { useCallback, useEffect, useRef, useState, type FormEvent, type CSSProperties } from 'react';
import { AlarmClock, Anchor, Archive, Award, Baby, BadgeCheck, Banknote, Bell, Binary, Blocks, Bot, Box, Briefcase, Building2, Calendar, Car, Castle, Check, ChessKnight, Cloud, Crown, Database, Dog, DoorOpen, Feather, Flag, Flower, Footprints, Gift, GraduationCap, Handshake, Headphones, Key, Leaf, Lock, Mail, Mic, Moon, Mountain, Plane, Puzzle, QrCode, Radio, Rainbow, Scissors, Server, ShieldCheck, Ship, ShoppingCart, Snowflake, Swords, Ticket, Trees, Tv, Umbrella, Waves, Wifi, Wind, ZodiacAries, ZodiacAquarius, ZodiacCancer, ZodiacCapricorn, ZodiacGemini, ZodiacLeo, ZodiacLibra, ZodiacPisces, ZodiacSagittarius, ZodiacScorpio, ZodiacTaurus, ZodiacVirgo, Activity, Aperture, Atom, AudioLines, Bike, Bird, Book, BookOpen, Bookmark, BriefcaseBusiness, Camera, Cat, ChartNoAxesCombined, CircleHelp, Code, Coffee, Compass, Cpu, Dice5, Dumbbell, Earth, Film, Flame, FlaskConical, Flower2, Gamepad2, Gem, Ghost, Globe2, Hammer, Heart, House, Lightbulb, Map as MapIcon, MessageCircle, Music, Palette, PawPrint, Rocket, School, Search, Shield, ShoppingBag, Smile, Sparkles, Star, Sun, Terminal, Trophy, Users, Video, Wallet, WandSparkles, Wrench, Zap, Newspaper, Trash2, Info, UserRound, LogOut, Copy } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

type Topic = { id: string; label: string; icon: string; color: string };
type Profile = { hex_login: string; is_admin: boolean; is_moderator: boolean; is_registered: boolean };
type Post = {
  id: string; post_number: number; content: string; created_at: string; author_id: string; topic: string;
  profile?: { hex_login: string; is_admin?: boolean; is_moderator?: boolean; moderator_topics?: string[] } | null;
};
const PAGE_SIZE = 30;
const DEFAULT_TOPICS: Topic[] = [
  {id:'general',label:'Загальне',icon:'Globe2',color:'#aaa0cf'},
  {id:'games',label:'Ігри',icon:'Gamepad2',color:'#d99a94'},
  {id:'technology',label:'Технології',icon:'Cpu',color:'#83b5c7'},
  {id:'books',label:'Книги',icon:'BookOpen',color:'#c5a77d'},
  {id:'art',label:'Мистецтво',icon:'Palette',color:'#8eae88'},
  {id:'news',label:'Новини',icon:'Newspaper',color:'#c99b82'}
];
const ICONS: Record<string, typeof Globe2> = {AlarmClock:AlarmClock,Anchor:Anchor,Archive:Archive,Award:Award,Baby:Baby,BadgeCheck:BadgeCheck,Banknote:Banknote,Bell:Bell,Binary:Binary,Blocks:Blocks,Bot:Bot,Box:Box,Briefcase:Briefcase,Building2:Building2,Calendar:Calendar,Car:Car,Castle:Castle,Check:Check,ChessKnight:ChessKnight,Cloud:Cloud,Crown:Crown,Database:Database,Dog:Dog,DoorOpen:DoorOpen,Feather:Feather,Flag:Flag,Flower:Flower,Footprints:Footprints,Gift:Gift,GraduationCap:GraduationCap,Handshake:Handshake,Headphones:Headphones,Key:Key,Leaf:Leaf,Lock:Lock,Mail:Mail,Mic:Mic,Moon:Moon,Mountain:Mountain,Plane:Plane,Puzzle:Puzzle,QrCode:QrCode,Radio:Radio,Rainbow:Rainbow,Scissors:Scissors,Server:Server,ShieldCheck:ShieldCheck,Ship:Ship,ShoppingCart:ShoppingCart,Snowflake:Snowflake,Swords:Swords,Ticket:Ticket,Trees:Trees,Tv:Tv,Umbrella:Umbrella,Waves:Waves,Wifi:Wifi,Wind:Wind,ZodiacAries:ZodiacAries,ZodiacAquarius:ZodiacAquarius,ZodiacCancer:ZodiacCancer,ZodiacCapricorn:ZodiacCapricorn,ZodiacGemini:ZodiacGemini,ZodiacLeo:ZodiacLeo,ZodiacLibra:ZodiacLibra,ZodiacPisces:ZodiacPisces,ZodiacSagittarius:ZodiacSagittarius,ZodiacScorpio:ZodiacScorpio,ZodiacTaurus:ZodiacTaurus,ZodiacVirgo:ZodiacVirgo,Activity,Aperture,Atom,AudioLines,Bike,Bird,Book,BookOpen,Bookmark,BriefcaseBusiness,Camera,Cat,ChartNoAxesCombined,CircleHelp,Code,Coffee,Compass,Cpu,Dice5,Dumbbell,Earth,Film,Flame,FlaskConical,Flower2,Gamepad2,Gem,Ghost,Globe2,Hammer,Heart,House,Lightbulb,Map:MapIcon,MessageCircle,Music,Palette,PawPrint,Rocket,School,Search,Shield,ShoppingBag,Smile,Sparkles,Star,Sun,Terminal,Trophy,Users,Video,Wallet,WandSparkles,Wrench,Zap,Newspaper};
const ICON_OPTIONS = Object.keys(ICONS).sort();
function kyivInfo(value: string, postNumber: number) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'2-digit',timeZone:'Europe/Kyiv'}).format(date);
  const weekday = new Intl.DateTimeFormat('uk-UA',{weekday:'short',timeZone:'Europe/Kyiv'}).format(date);
  const time = new Intl.DateTimeFormat('uk-UA',{hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZone:'Europe/Kyiv'}).format(date);
  return `${day} ${weekday.charAt(0).toLocaleUpperCase('uk-UA')}${weekday.slice(1)} ${time} №${postNumber}`;
}

function Spoiler({children}:{children:string}) {
  const [revealed,setRevealed]=useState(false);
  const ref=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const close=(event:MouseEvent)=>{if(!(event.target instanceof Element&&event.target.closest('.spoiler')))setRevealed(false);};document.addEventListener('click',close);return()=>document.removeEventListener('click',close);},[]);
  return <button ref={ref} type="button" className={`spoiler${revealed?' revealed':''}`} onClick={()=>setRevealed(true)}>{children}</button>;
}
function FormattedText({value}:{value:string}) {
  const pattern=/(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\|\|[^|]+\|\||>[^\n]+)/gm;
  const nodes=[];let last=0;
  for(const match of value.matchAll(pattern)){const token=match[0],index=match.index??0;if(index>last)nodes.push(value.slice(last,index));
    if(token.startsWith('**'))nodes.push(<strong key={index}>{token.slice(2,-2)}</strong>);
    else if(token.startsWith('~~'))nodes.push(<del key={index}>{token.slice(2,-2)}</del>);
    else if(token.startsWith('||'))nodes.push(<Spoiler key={index}>{token.slice(2,-2)}</Spoiler>);
    else if(token.startsWith('*'))nodes.push(<em key={index}>{token.slice(1,-1)}</em>);
    else nodes.push(<span className="green-text" key={index}>{token.slice(1)}</span>);
    last=index+token.length;
  }
  if(last<value.length)nodes.push(value.slice(last));return <>{nodes}</>;
}

export default function App() {
  const [user,setUser]=useState<User|null>(null);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [posts,setPosts]=useState<Post[]>([]);
  const [topics,setTopics]=useState<Topic[]>(DEFAULT_TOPICS);
  const [topic,setTopic]=useState('general');
  const [message,setMessage]=useState('');
  const [status,setStatus]=useState('');
  const [error,setError]=useState(false);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const [hasMore,setHasMore]=useState(false);
  const [adminOpen,setAdminOpen]=useState(false);
  const [accountLogin,setAccountLogin]=useState('');
  const [loginAvailability,setLoginAvailability]=useState<'idle'|'checking'|'free'|'taken'|'invalid'>('idle');
  const [newAccount,setNewAccount]=useState<{login:string;secretKey:string}|null>(null);
  const [moderatorLogin,setModeratorLogin]=useState('');
  const [topicName,setTopicName]=useState('');
  const [topicIcon,setTopicIcon]=useState('MessageCircle');
  const [topicColor,setTopicColor]=useState('#aaa0cf');
  const [infoOpen,setInfoOpen]=useState(false);
  const [infoTab,setInfoTab]=useState<'faq'|'rules'>('faq');
  const [profileOpen,setProfileOpen]=useState(false);
  const [authStep,setAuthStep]=useState<'idle'|'registration'|'key-ready'>('idle');
  const [registration,setRegistration]=useState<{secretKey:string;access_token:string;refresh_token:string;hexLogin:string}|null>(null);
  const [moderatorTopic,setModeratorTopic]=useState('general');
  const [moderatorTopics,setModeratorTopics]=useState<string[]>([]);
  const [stats,setStats]=useState({posts:0,users:0});
  const sentinelRef=useRef<HTMLDivElement>(null);
  const composerRef=useRef<HTMLTextAreaElement>(null);
  const loadingRef=useRef(false);
  const offsetRef=useRef(0);
  const moreRef=useRef(true);

  const setNotice=(value:string,isError=false)=>{setStatus(value);setError(isError);};

  const ensureIdentity=useCallback(async()=>{
    const {data,error}=await supabase.auth.getSession();
    if(error)throw error;
    const activeUser=data.session?.user??null;
    if(!activeUser){setUser(null);setProfile(null);return;}
    const {data:found,error:profileError}=await supabase.from('copypaste_profiles').select('hex_login,is_admin,is_moderator,is_registered').eq('id',activeUser.id).maybeSingle();
    if(profileError)throw profileError;
    if(!found||!found.is_registered){setUser(null);setProfile(null);await supabase.auth.signOut();return;}
    setUser(activeUser);setProfile(found as Profile);
    const {data:scopes}=await supabase.from('copypaste_moderator_topics').select('topic_id').eq('user_id',activeUser.id);
    setModeratorTopics((scopes??[]).map((row:any)=>row.topic_id));
  },[]);

  const loadTopics=useCallback(async()=>{
    const {data,error}=await supabase.from('copypaste_topics').select('id,label,icon,color').order('sort_order');
    if(!error&&data?.length){setTopics(data as Topic[]);}
  },[]);

  const loadPosts=useCallback(async(reset=false)=>{
    if(loadingRef.current)return;
    const start=reset?0:offsetRef.current;
    if(!reset&&!moreRef.current)return;
    loadingRef.current=true;setLoading(true);
    try{
      const {data,error,count}=await supabase.from('copypaste_posts')
        .select('id,post_number,content,created_at,author_id,topic,profile:copypaste_profiles!copypaste_posts_author_id_fkey(hex_login,is_admin,is_moderator)',{count:'exact'})
        .eq('topic',topic).order('created_at',{ascending:false}).range(start,start+PAGE_SIZE-1);
      if(error)throw error;
      let rows=(data??[]) as unknown as Post[];
      const authorIds=[...new Set(rows.map(row=>row.author_id))];
      if(authorIds.length){
        const {data:scopes}=await supabase.from('copypaste_moderator_topics').select('user_id,topic_id').in('user_id',authorIds);
        const byUser=new Map<string,string[]>();
        for(const scope of scopes??[])byUser.set(scope.user_id,[...(byUser.get(scope.user_id)??[]),scope.topic_id]);
        rows=rows.map(row=>({...row,profile:row.profile?{...row.profile,moderator_topics:byUser.get(row.author_id)??[]}:row.profile}));
      }
      setPosts(current=>reset?rows:[...current,...rows]);
      offsetRef.current=start+rows.length;
      moreRef.current=rows.length===PAGE_SIZE&&offsetRef.current<(count??0);
      setHasMore(moreRef.current);
    }catch(cause){console.error(cause);setNotice('Не вдалося завантажити стрічку. Спробуй ще раз.',true);}
    finally{loadingRef.current=false;setLoading(false);}
  },[topic]);

  useEffect(()=>{void (async()=>{try{await ensureIdentity();setNotice('');}catch(e){console.error(e);setNotice('Не вдалося перевірити авторизацію. Онови сторінку та спробуй ще раз.',true);}})();void loadTopics();},[ensureIdentity,loadTopics]);
  useEffect(()=>{void loadPosts(true);},[user,topic,loadPosts]);
  useEffect(()=>{
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(!session){setUser(null);setProfile(null);}
    });
    return()=>listener.subscription.unsubscribe();
  },[]);


  useEffect(()=>{
    const channel=supabase.channel('copypaste-live-feed').on('postgres_changes',{event:'INSERT',schema:'public',table:'copypaste_posts'},payload=>{
      if((payload.new as {topic?:string}).topic===topic)void loadPosts(true);
    }).subscribe();
    return()=>{void supabase.removeChannel(channel);};
  },[topic,loadPosts]);
  useEffect(()=>{
    const target=sentinelRef.current;if(!target)return;
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&moreRef.current&&!loadingRef.current)void loadPosts(false);},{rootMargin:'500px'});
    observer.observe(target);return()=>observer.disconnect();
  },[loadPosts]);
  useEffect(()=>{
    const login=accountLogin.trim().replace(/^#/, '');
    if(!login){setLoginAvailability('idle');return;}
    if(!/^[a-fA-F0-9]{6}$/.test(login)){setLoginAvailability('invalid');return;}
    setLoginAvailability('checking');
    const timer=window.setTimeout(async()=>{
      const {data,error}=await supabase.from('copypaste_profiles').select('id').eq('hex_login','#'+login.toUpperCase()).maybeSingle();
      setLoginAvailability(error?'idle':data?'taken':'free');
    },250);
    return()=>window.clearTimeout(timer);
  },[accountLogin]);

  useEffect(()=>{
    const el=composerRef.current;if(!el)return;
    const line=Number.parseFloat(getComputedStyle(el).lineHeight)||24;
    const max=line*5;
    el.style.height=`${line}px`;
    const next=Math.max(line,Math.min(el.scrollHeight,max));
    el.style.height=`${next}px`;
    el.style.overflowY=el.scrollHeight>max?'auto':'hidden';
  },[message]);

  function updateTopic(next:string){if(next===topic)return;offsetRef.current=0;moreRef.current=true;setHasMore(false);setPosts([]);setTopic(next);}

  async function runAuthCommand(key:string){
    setBusy(true);setNotice('Перевіряємо ключ…');
    try{
      const {data,error}=await supabase.functions.invoke('copypaste-auth',{body:{action:'login',secretKey:key.trim().toLowerCase()}});
      if(error||data?.error)throw new Error(data?.error||'Ключ не підійшов.');
      const {error:sessionError}=await supabase.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});
      if(sessionError)throw sessionError;
      await ensureIdentity();setNotice('Увійшли в акаунт.');
    }catch(e){setNotice(e instanceof Error?e.message:'Помилка авторизації.',true);}
    finally{setBusy(false);}
  }
  async function logout(){
    setBusy(true);
    try{await supabase.auth.signOut();setUser(null);setProfile(null);setModeratorTopics([]);setProfileOpen(false);setAdminOpen(false);setNotice('Ти вийшов з акаунта.');}
    catch(e){setNotice(e instanceof Error?e.message:'Не вдалося вийти.',true);}
    finally{setBusy(false);}
  }

  async function beginRegistration(){
    setBusy(true);setNotice('Створюємо акаунт…');
    try{
      const {data,error}=await supabase.functions.invoke('copypaste-auth',{body:{action:'register'}});
      if(error||data?.error)throw new Error(data?.error||'Не вдалося створити акаунт.');
      setRegistration({secretKey:data.secretKey,access_token:data.access_token,refresh_token:data.refresh_token,hexLogin:data.hexLogin});
      setAuthStep('key-ready');setNotice('');
    }catch(e){setNotice(e instanceof Error?e.message:'Помилка реєстрації.',true);}
    finally{setBusy(false);}
  }
  async function continueRegistration(){
    if(!registration)return;
    setBusy(true);
    try{
      const {error}=await supabase.auth.setSession({access_token:registration.access_token,refresh_token:registration.refresh_token});
      if(error)throw error;
      await ensureIdentity();setAuthStep('idle');setRegistration(null);setNotice('Акаунт створено. Ти увійшов.');setMessage('');
    }catch(e){setNotice(e instanceof Error?e.message:'Не вдалося увійти.',true);}
    finally{setBusy(false);}
  }

  async function adminAction(action:string,payload:Record<string,unknown>={}){
    if(action==='create_account'){
      const {data,error}=await supabase.functions.invoke('copypaste-auth',{body:{action,...payload}});
      if(error||data?.error)throw new Error(data?.error||'Створення акаунтів тимчасово недоступне.');
      return data;
    }
    const {data,error}=await supabase.rpc('copypaste_admin_action',{p_action:action,p_args:payload});
    if(error)throw error;
    return data;
  }
  async function loadAdminStats(){
    const [p,u]=await Promise.all([
      supabase.from('copypaste_posts').select('id',{count:'exact',head:true}),
      supabase.from('copypaste_profiles').select('id',{count:'exact',head:true})
    ]);
    setStats({posts:p.count??0,users:u.count??0});
  }

  async function publishPost(event:FormEvent){
    event.preventDefault();const content=message.trim();if(!content)return;
    if(content==='/registration'&&!user){setMessage('');setAuthStep('registration');setNotice('');return;}
    if(content.startsWith('/auth ')&&!user){const key=content.slice(6).trim();if(!key){setNotice('Додай секретний ключ після /auth.',true);return;}setMessage('');await runAuthCommand(key);return;}
    if(!user||!profile){setNotice('Спочатку введи /registration або /auth із секретним ключем.',true);return;}
    if(content==='/exit'&&profile.is_registered){setMessage('');await logout();return;}
    if(content==='/auth'||content.startsWith('/auth ')){
      const key=content.slice(5).trim();if(!key){setNotice('Після /auth додай секретний ключ.',true);return;}
      setMessage('');await runAuthCommand(key);return;
    }

    setBusy(true);setNotice('');
    try{
      const {error}=await supabase.from('copypaste_posts').insert({content,topic});
      if(error)throw error;
      setMessage('');await loadPosts(true);
    }catch(e){console.error(e);setNotice(e instanceof Error?e.message:'Не вдалося опублікувати.',true);}
    finally{setBusy(false);}
  }

  const canPublish=!!user&&!!profile?.is_registered&&!busy&&!!message.trim();

  return <main className="shell">
    <header>
      <button className="brand" type="button" onClick={()=>setAdminOpen(false)} style={{color:topic==='general'?'#111':topics.find(t=>t.id===topic)?.color??'#111'}} aria-label="На головну"><strong>copy</strong><span>paste</span></button>
      <nav className="nav" aria-label="Навігація">
        <button className={`icon-btn${infoOpen?' active':''}`} type="button" aria-label="Інформація" title="Інформація" onClick={()=>{setInfoOpen(v=>!v);setProfileOpen(false);setAdminOpen(false);}}><Info/></button>
        {user&&profile?.is_registered&&<button className={`icon-btn${profileOpen?' active':''}`} type="button" aria-label="Профіль" title="Профіль" onClick={()=>{setProfileOpen(v=>!v);setInfoOpen(false);setAdminOpen(false);}}><UserRound/></button>}
        {profile?.is_admin&&<button className="icon-btn" type="button" aria-label="Панель адміністратора" title="Панель адміністратора" onClick={()=>{setAdminOpen(v=>!v);setInfoOpen(false);setProfileOpen(false);if(!adminOpen)void loadAdminStats();}}><Shield/></button>}
      </nav>
    </header>
    {infoOpen?<section className="info-panel">
      <div className="info-tabs"><button className={infoTab==='faq'?'selected':''} onClick={()=>setInfoTab('faq')}>FAQ</button><button className={infoTab==='rules'?'selected':''} onClick={()=>setInfoTab('rules')}>Правила</button><button className="info-close" onClick={()=>setInfoOpen(false)} aria-label="Закрити">×</button></div>
      {infoTab==='faq'?<div className="info-content">
        <h2>Часті запитання</h2>
        <h3>Як зареєструватися?</h3><p>У полі введення напиши <code>/registration</code> та натисни Enter. Створи акаунт, скопіюй секретний ключ і натисни «Продовжити» — вхід відбудеться автоматично.</p>
        <h3>Як авторизуватися?</h3><p>Введи <code>/auth твій_секретний_ключ</code>. Наприклад: <code>/auth 8f2a…</code>. Секретний ключ — єдиний спосіб відновити доступ. Збережи його в надійному місці.</p>
        <h3>Як вийти?</h3><p>Відкрий профіль і натисни «Вийти» або введи <code>/exit</code>.</p>
        <h3>Що таке HEX-логін?</h3><p>Це твій унікальний кольоровий ідентифікатор, наприклад <code>#6AC73C</code>. Він не містить персональних даних.</p>
        <h3>Чи можна писати без реєстрації?</h3><p>Ні. Читати стрічку можуть усі, але публікувати повідомлення — лише авторизовані користувачі. Часових лімітів на публікації немає.</p>
        <h3>Яке форматування підтримується?</h3><p><code>**жирний**</code>, <code>*курсив*</code>, <code>~~закреслений~~</code>, <code>||спойлер||</code> та <code>&gt;зелений текст</code>.</p>
        <h3>Як працюють розділи?</h3><p>Кожен розділ має окрему стрічку та додаткові правила. Перемикайся між ними над повідомленнями.</p>
      </div>:<div className="info-content">
        <h2>Правила спільноти</h2><h3>Загальні правила</h3>
        <ol><li>Поважай інших учасників. Заборонені погрози, цькування та переслідування.</li><li>Не публікуй персональні дані інших людей без їхньої згоди.</li><li>Не використовуй сайт для спаму, шахрайства, реклами чи навмисного засмічення стрічки.</li><li>Не публікуй незаконний, шкідливий або відверто образливий контент.</li><li>Дотримуйся тематики обраного розділу.</li><li>Не видавай себе за інших користувачів або адміністрацію та не обходь блокування.</li><li>Модератори можуть видаляти повідомлення, що порушують правила їхнього розділу.</li></ol>
        <h3>Правила окремих розділів</h3>
        {topics.map(t=><div className="topic-rule" key={t.id}><strong>{t.label}</strong><p>{t.id==='games'?'Обговорюй ігри, проходження та ігрові новини. Позначай сюжетні спойлери.':t.id==='technology'?'Технології, програмування та цифрові продукти. Не публікуй шкідливі посилання й шахрайські схеми.':t.id==='books'?'Книги, автори та літературні обговорення. Позначай сюжетні спойлери.':t.id==='art'?'Творчість, мистецтво та власні роботи. Поважай авторство.':t.id==='news'?'Актуальні події та новини. Перевіряй факти й додавай контекст.':'Дотримуйся тематики розділу, спілкуйся ввічливо та не засмічуй стрічку.'}</p></div>)}
      </div>}
    </section>:infoOpen?null:null}
    {profileOpen&&profile?<section className="profile-panel">
      <div className="profile-top"><span className="profile-color" style={{background:profile.hex_login}}/><div><strong>{profile.hex_login}{profile.is_admin&&<ZodiacAries className="admin-zodiac-icon" aria-label="Адміністратор"/>}</strong><span>{profile.is_admin?'Адміністратор':profile.is_moderator?'Модератор':'Учасник'}</span></div></div>
      <div className="profile-detail"><span>Статус</span><strong>Авторизований акаунт</strong></div>
      <div className="profile-detail"><span>Мої розділи</span><strong>{profile.is_admin?'Усі розділи':moderatorTopics.length?moderatorTopics.map(id=>topics.find(t=>t.id===id)?.label??id).join(', '):'Усі відкриті розділи'}</strong></div>
      {user?.email?.startsWith('passkey-')&&<p className="profile-warning">Цей акаунт раніше використовував Passkey. Секретний ключ для входу ще не налаштований — не виходь з акаунта, доки не додамо ключ.</p>}
      <button className="profile-logout" type="button" disabled={busy} onClick={()=>void logout()}><LogOut/> Вийти з акаунта</button>
    </section>:null}
    {adminOpen&&profile?.is_admin?<section className="admin-panel">
      <div className="admin-heading"><div><span className="admin-eyebrow">CONTROL ROOM</span><h2>Керування copypaste</h2></div><button className="admin-close" type="button" onClick={()=>setAdminOpen(false)}>Закрити ×</button></div>
      <div className="admin-stats"><div><strong>{stats.posts}</strong><span>повідомлень</span></div><div><strong>{stats.users}</strong><span>профілів</span></div><div><strong>{topics.length}</strong><span>розділів</span></div></div>
      <div className="admin-grid">
        <section className="admin-card"><div className="admin-card-title"><span>01</span><h3>Публікації</h3></div><p>Часових обмежень на публікації немає. Писати можуть усі авторизовані користувачі.</p></section>
        <section className="admin-card"><div className="admin-card-title"><span>02</span><h3>Новий акаунт</h3></div><p>Введи 6 HEX-символів без #. Якщо залишити порожнім — створимо випадковий HEX-логін.</p><div className="admin-inline"><div className="hex-login-field"><span>#</span><input value={accountLogin} maxLength={6} onChange={e=>setAccountLogin(e.target.value.replace(/[^a-fA-F0-9]/g,'').slice(0,6).toUpperCase())} placeholder="A1B2C3"/></div><button type="button" disabled={loginAvailability==='checking'||loginAvailability==='taken'||loginAvailability==='invalid'} onClick={async()=>{try{const result=await adminAction('create_account',{login:accountLogin.trim()});setNewAccount({...result,login:typeof result.login==='string'?(result.login.startsWith('#')?result.login:'#'+result.login.toUpperCase()):result.login});setAccountLogin('');setLoginAvailability('idle');setNotice('Акаунт створено. Збережи секретний ключ.');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Створити</button></div><div className={`availability ${loginAvailability}`}>{loginAvailability==='checking'?'Перевіряємо доступність…':loginAvailability==='free'?'✓ Логін вільний':loginAvailability==='taken'?'✕ Логін уже зайнятий':loginAvailability==='invalid'?'Потрібно рівно 6 HEX-символів (0–9, A–F)':'Автоматичний HEX-логін буде згенеровано'}</div>{newAccount&&<div className="new-account"><strong>{newAccount.login}</strong><code>{newAccount.secretKey}</code><button type="button" onClick={()=>void navigator.clipboard.writeText(`Логін: ${newAccount.login}\\nКлюч: ${newAccount.secretKey}`)}>Скопіювати логін і ключ</button></div>}</section>
        <section className="admin-card"><div className="admin-card-title"><span>03</span><h3>Модератори</h3></div><p>Надай права користувачу з уже створеним акаунтом.</p><div className="admin-inline"><input value={moderatorLogin} onChange={e=>setModeratorLogin('#'+e.target.value.replace(/[^a-fA-F0-9]/g,'').slice(0,6).toUpperCase())} placeholder="#A1B2C3"/><select value={moderatorTopic} onChange={e=>setModeratorTopic(e.target.value)}>{topics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select><button type="button" onClick={async()=>{try{await adminAction('set_role',{login:moderatorLogin,role:'moderator',topicId:moderatorTopic});setModeratorLogin('');setNotice('Модератора призначено для розділу.');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Надати</button></div></section>
        <section className="admin-card"><div className="admin-card-title"><span>04</span><h3>Розділи</h3></div><p>Створи нову тему для загальної стрічки.</p><div className="admin-inline"><input value={topicName} onChange={e=>setTopicName(e.target.value)} placeholder="Назва розділу"/><button type="button" disabled={!topicName.trim()} onClick={async()=>{try{await adminAction('create_topic',{id:topicName.toLowerCase().replace(/[^a-z0-9_-]/g,'-'),label:topicName,icon:topicIcon,color:topicColor});setTopicName('');setTopicIcon('MessageCircle');setTopicColor('#aaa0cf');await loadTopics();setNotice('Розділ додано.');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Додати</button></div><div className="topic-options"><label>Lucide icon<select value={topicIcon} onChange={e=>setTopicIcon(e.target.value)}>{ICON_OPTIONS.map(name=><option key={name} value={name}>{name}</option>)}</select></label><label>Колір<input type="color" value={topicColor} onChange={e=>setTopicColor(e.target.value)}/></label><span className="topic-preview" style={{color:topicColor}}>{(()=>{const Preview=ICONS[topicIcon]??MessageCircle;return <Preview/>})()}<b>{topicName||'Новий розділ'}</b></span></div></section>
      </div>
      {status&&<p className={error?'status error':'status'}>{status}</p>}
    </section>:<>
      {!user?<div className="auth-composer">
        {authStep==='idle'?<form className="composer" onSubmit={publishPost}><textarea ref={composerRef} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Авторизуйся, щоб почати спілкування" aria-label="Команда авторизації"/><div className="compose-row"><span className="auth-hint">/registration · /auth ключ</span><button type="submit" disabled={busy||!message.trim()}>Продовжити ↗</button></div></form>:authStep==='registration'?<div className="auth-inline-panel"><h3>Створення акаунта</h3><p>Отримай свій HEX-логін і секретний ключ для наступних входів.</p><button className="auth-action" type="button" disabled={busy} onClick={()=>void beginRegistration()}>{busy?'Створюємо…':'Створити акаунт'}</button><button className="auth-switch" type="button" onClick={()=>setAuthStep('idle')}>Назад</button></div>:<div className="auth-inline-panel"><h3>Твій акаунт готовий</h3><p>Логін: <strong>{registration?.hexLogin}</strong></p><div className="secret-key">{registration?.secretKey}</div><button className="auth-action" type="button" onClick={()=>void navigator.clipboard.writeText(registration?.secretKey??'')}><Copy/> Скопіювати секретний ключ</button><p className="auth-warning">Збережи ключ — його неможливо відновити.</p><button className="auth-action" type="button" disabled={busy} onClick={()=>void continueRegistration()}>Продовжити</button></div>}
        {status&&<div className={`status${error?' error':''}`}>{status}</div>}
      </div>:<form className="composer" onSubmit={publishPost} aria-label="Нове повідомлення">
        <textarea ref={composerRef} value={message} onChange={e=>setMessage(e.target.value)} disabled={busy} placeholder="Поділись думкою…" aria-label="Твоє повідомлення"/>
        <div className="compose-row"><span className="counter"/><button type="submit" disabled={!canPublish}>Опублікувати ↗</button></div>
        {status&&<div className={`status${error?' error':''}`} role="status" aria-live="polite">{status}</div>}
      </form>}
      <section aria-label="Усі повідомлення">
        <div className="topics">{topics.map(item=>{const Icon=ICONS[item.icon]??MessageCircle;return <button key={item.id} type="button" className={`topic-btn${topic===item.id?' active':''}`} style={{'--topic-color':item.color} as CSSProperties} onClick={()=>updateTopic(item.id)}><Icon/>{item.label}</button>;})}</div>
        <div id="feed" aria-live="polite">
          {posts.length===0&&!loading?<div className="empty-state"><MessageCircle/><p>Тут поки тихо</p><span>Залиш першу думку в цьому розділі</span></div>:posts.map(post=><article className="post" key={post.id}>
            <div className="meta"><div className="identity"><span className="swatch" style={{backgroundColor:post.profile?.hex_login??'#aaa'}}/><span className="hex" style={{color:'#111'}}>{post.profile?.hex_login?.toLowerCase()??'#??????'}</span>{post.profile?.is_admin&&<ZodiacAries className="admin-zodiac-icon" aria-label="Адміністратор"/>}{post.profile?.is_moderator&&post.profile.moderator_topics?.includes(post.topic)&&(()=>{const TopicIcon=ICONS[topics.find(t=>t.id===post.topic)?.icon??'']??MessageCircle;return <TopicIcon className="moderator-topic-icon" style={{color:topics.find(t=>t.id===post.topic)?.color??'#777'}} aria-label="Модератор розділу"/>})()}</div><time dateTime={post.created_at}>{kyivInfo(post.created_at,post.post_number)}</time>
              {(profile?.is_admin||(profile?.is_moderator&&moderatorTopics.includes(post.topic)))&&<button className="moderate-delete" type="button" aria-label="Видалити повідомлення" onClick={async()=>{try{await adminAction('delete_post',{postId:post.id});await loadPosts(true);}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}><Trash2/></button>}
            </div><p className="message"><FormattedText value={post.content}/></p>
          </article>)}
          {loading&&posts.length===0&&<div className="empty">Завантажуємо потік…</div>}
        </div>
        <div ref={sentinelRef} id="sentinel"/>
        {hasMore&&posts.length>0&&<button className="load-more" type="button" disabled={loading} onClick={()=>void loadPosts(false)}>{loading?'Завантажуємо…':'Завантажити ще'}</button>}
      </section>
    </>}
  </main>;
}
