import { useCallback, useEffect, useRef, useState, type FormEvent, type CSSProperties } from 'react';
import * as LucideIcons from 'lucide-react';
import { AlarmClock, Anchor, Archive, Award, Baby, BadgeCheck, Banknote, Bell, Binary, Blocks, Bot, Box, Briefcase, Building2, Calendar, Car, Castle, Check, ChessKnight, Cloud, Crown, Database, Dog, DoorOpen, Feather, Flag, Flower, Footprints, Gift, GraduationCap, Handshake, Headphones, Key, Leaf, Lock, Mail, Mic, Moon, Mountain, Plane, Puzzle, QrCode, Radio, Rainbow, Scissors, Server, ShieldCheck, Ship, ShoppingCart, Snowflake, Swords, Ticket, Trees, Tv, Umbrella, Waves, Wifi, Wind, Activity, Aperture, Atom, AudioLines, Bike, Bird, Book, BookOpen, Bookmark, BriefcaseBusiness, Camera, Cat, ChartNoAxesCombined, CircleHelp, Code, Coffee, Compass, Cpu, Dice5, Dumbbell, Earth, Film, Flame, FlaskConical, Flower2, Gamepad2, Gem, Ghost, Globe2, Hammer, Heart, House, Lightbulb, Map as MapIcon, MessageCircle, Music, Palette, PawPrint, Rocket, School, Search, Shield, ShoppingBag, Smile, Sparkles, Star, Sun, Terminal, Trophy, Users, Video, Wallet, WandSparkles, Wrench, Zap, Newspaper, Trash2, Info, UserRound, Copy } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

type Topic = { id: string; label: string; icon: string; color: string };
type Profile = { hex_login: string; is_admin: boolean; is_moderator: boolean; is_registered: boolean; is_suspended?: boolean };
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
const ICONS: Record<string, typeof Globe2> = {AlarmClock:AlarmClock,Anchor:Anchor,Archive:Archive,Award:Award,Baby:Baby,BadgeCheck:BadgeCheck,Banknote:Banknote,Bell:Bell,Binary:Binary,Blocks:Blocks,Bot:Bot,Box:Box,Briefcase:Briefcase,Building2:Building2,Calendar:Calendar,Car:Car,Castle:Castle,Check:Check,ChessKnight:ChessKnight,Cloud:Cloud,Crown:Crown,Database:Database,Dog:Dog,DoorOpen:DoorOpen,Feather:Feather,Flag:Flag,Flower:Flower,Footprints:Footprints,Gift:Gift,GraduationCap:GraduationCap,Handshake:Handshake,Headphones:Headphones,Key:Key,Leaf:Leaf,Lock:Lock,Mail:Mail,Mic:Mic,Moon:Moon,Mountain:Mountain,Plane:Plane,Puzzle:Puzzle,QrCode:QrCode,Radio:Radio,Rainbow:Rainbow,Scissors:Scissors,Server:Server,ShieldCheck:ShieldCheck,Ship:Ship,ShoppingCart:ShoppingCart,Snowflake:Snowflake,Swords:Swords,Ticket:Ticket,Trees:Trees,Tv:Tv,Umbrella:Umbrella,Waves:Waves,Wifi:Wifi,Wind:Wind,Activity,Aperture,Atom,AudioLines,Bike,Bird,Book,BookOpen,Bookmark,BriefcaseBusiness,Camera,Cat,ChartNoAxesCombined,CircleHelp,Code,Coffee,Compass,Cpu,Dice5,Dumbbell,Earth,Film,Flame,FlaskConical,Flower2,Gamepad2,Gem,Ghost,Globe2,Hammer,Heart,House,Lightbulb,Map:MapIcon,MessageCircle,Music,Palette,PawPrint,Rocket,School,Search,Shield,ShoppingBag,Smile,Sparkles,Star,Sun,Terminal,Trophy,Users,Video,Wallet,WandSparkles,Wrench,Zap,Newspaper};
function slugifyTopic(value:string){const map:Record<string,string>={'а':'a','б':'b','в':'v','г':'h','ґ':'g','д':'d','е':'e','є':'ye','ж':'zh','з':'z','и':'y','і':'i','ї':'yi','й':'i','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ь':'','ю':'yu','я':'ya'};return value.toLowerCase().split('').map(ch=>map[ch]??ch).join('').replace(/[^a-z0-9_-]+/g,'-').replace(/-+/g,'-').replace(/^[-_]+|[-_]+$/g,'');}

function kyivInfo(value: string, postNumber: number) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'2-digit',timeZone:'Europe/Kyiv'}).format(date);
  const weekday = new Intl.DateTimeFormat('uk-UA',{weekday:'short',timeZone:'Europe/Kyiv'}).format(date);
  const time = new Intl.DateTimeFormat('uk-UA',{hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZone:'Europe/Kyiv'}).format(date);
  return `${day} ${weekday.charAt(0).toLocaleUpperCase('uk-UA')}${weekday.slice(1)} ${time} №${postNumber}`;
}

function Spoiler({children,canReveal}:{children:string;canReveal:boolean}) {
  const [revealed,setRevealed]=useState(false);
  useEffect(()=>{const close=(event:MouseEvent)=>{if(!(event.target instanceof Element&&event.target.closest('.spoiler-wrap')))setRevealed(false);};document.addEventListener('click',close);return()=>document.removeEventListener('click',close);},[]);
  return <span className="spoiler-wrap"><button type="button" className={`spoiler${revealed?' revealed':''}${canReveal?'':' locked'}`} onClick={()=>{if(canReveal)setRevealed(value=>!value);}} aria-label={canReveal?'Відкрити спойлер':'Прихований текст'}>{children}</button></span>;
}
function FormattedText({value,canRevealSpoilers}:{value:string;canRevealSpoilers:boolean}) {
  const pattern=/(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\|\|[^|]+\|\||>[^\n]+)/gm;
  const nodes=[];let last=0;
  for(const match of value.matchAll(pattern)){const token=match[0],index=match.index??0;if(index>last)nodes.push(value.slice(last,index));
    if(token.startsWith('**'))nodes.push(<strong key={index}>{token.slice(2,-2)}</strong>);
    else if(token.startsWith('~~'))nodes.push(<del key={index}>{token.slice(2,-2)}</del>);
    else if(token.startsWith('||'))nodes.push(<Spoiler key={index} canReveal={canRevealSpoilers}>{token.slice(2,-2)}</Spoiler>);
    else if(token.startsWith('*'))nodes.push(<em key={index}>{token.slice(1,-1)}</em>);
    else nodes.push(<span className="green-text" key={index}>{token.slice(1)}</span>);
    last=index+token.length;
  }
  if(last<value.length)nodes.push(value.slice(last));return <>{nodes}</>;
}

function ProfilePulse({posts,topics}:{posts:Post[];topics:Topic[]}) {
  const dateFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'});
  const todayParts=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Kyiv',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date());
  const part=(type:string)=>Number(todayParts.find(item=>item.type===type)?.value??0);
  const todayUtc=Date.UTC(part('year'),part('month')-1,part('day'));
  const days=Array.from({length:28},(_,index)=>new Date(todayUtc-(27-index)*86400000).toISOString().slice(0,10));
  const dayRows=new Map<string,Post[]>();
  for(const post of posts){const key=dateFormatter.format(new Date(post.created_at));dayRows.set(key,[...(dayRows.get(key)??[]),post]);}
  const topicCounts=topics.map(item=>({...item,count:posts.filter(post=>post.topic===item.id).length})).filter(item=>item.count>0).sort((a,b)=>b.count-a.count);
  const maxDay=Math.max(1,...days.map(day=>(dayRows.get(day)??[]).length));
  const latest=posts[0];
  return <section className="profile-living" aria-label="Активність учасника">
    <div className="profile-living-heading"><div><span className="profile-section-label">ЖИВИЙ СЛІД</span><h2>Ритм присутності</h2></div><span className="profile-living-period">28 ДНІВ</span></div>
    <div className="profile-activity-grid" role="img" aria-label="Активність за останні 28 днів">
      {days.map((day,index)=>{const rows=dayRows.get(day)??[];const level=rows.length?Math.max(1,Math.ceil(rows.length/maxDay*4)):0;const dominant=topics.find(item=>item.id===rows[0]?.topic);return <span key={day} className={`profile-activity-cell level-${level}`} style={{'--activity-color':dominant?.color??'#dedede','--activity-opacity':rows.length?String(.28+level*.18):'.42'} as CSSProperties} title={day+`: `+rows.length+` ${rows.length===1?'допис':rows.length>1&&rows.length<5?'дописи':'дописів'}`} aria-hidden="true"/>;})}
    </div>
    <div className="profile-activity-axis"><span>28 днів тому</span><span>сьогодні</span></div>
    <div className="profile-topic-signal">
      <span className="profile-section-label">ТЕМИ У СЛІДІ</span>
      {topicCounts.length?<><div className="profile-topic-spectrum" aria-label="Розподіл активності за темами">{topicCounts.map(item=><i key={item.id} style={{width:`${item.count/posts.length*100}%`,'--topic-accent':item.color} as CSSProperties} title={item.label}/>)}</div><div className="profile-topic-legend">{topicCounts.map(item=><span key={item.id}><i style={{'--topic-accent':item.color} as CSSProperties}/>{item.label}</span>)}</div></>:<p className="profile-living-empty">Поки жодного сигналу. Можна почати з будь-якої теми.</p>}
    </div>
    <div className="profile-presence"><span className="profile-section-label">ОСТАННІЙ СИГНАЛ</span><strong>{latest?kyivInfo(latest.created_at,latest.post_number):'Очікує на перший імпульс'}</strong></div>
  </section>;
}

export default function App() {
  const [route,setRoute]=useState(window.location.pathname);
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
  const [accountLogin,setAccountLogin]=useState('');
  const [loginAvailability,setLoginAvailability]=useState<'idle'|'checking'|'free'|'taken'|'invalid'>('idle');
  const [newAccount,setNewAccount]=useState<{login:string;secretKey:string}|null>(null);
  const [moderatorLogin,setModeratorLogin]=useState('');
  const [topicName,setTopicName]=useState('');
  const [topicPath,setTopicPath]=useState('');
  const [topicIcon,setTopicIcon]=useState('MessageCircle');
  const [topicColor,setTopicColor]=useState('#aaa0cf');
  const [infoOpen,setInfoOpen]=useState(false);
  const [infoTab,setInfoTab]=useState<'faq'|'rules'>('faq');
  const [profileOpen,setProfileOpen]=useState(false);
  const [publicProfile,setPublicProfile]=useState<(Profile&{id:string})|null>(null);
  const [publicProfilePosts,setPublicProfilePosts]=useState<Post[]>([]);
  const [ownProfilePosts,setOwnProfilePosts]=useState<Post[]>([]);
  const [publicProfileLoading,setPublicProfileLoading]=useState(false);
  const [authStep,setAuthStep]=useState<'idle'|'login'|'registration'|'key-ready'>(window.location.pathname==='/auth'?'login':'idle');
  const [loginKey,setLoginKey]=useState('');
  const [rulesAccepted,setRulesAccepted]=useState(false);
  const [registration,setRegistration]=useState<{secretKey:string;access_token:string;refresh_token:string;hexLogin:string}|null>(null);
  const [selectedModeratorTopics,setSelectedModeratorTopics]=useState<string[]>(['general']);
  const [adminUsers,setAdminUsers]=useState<{id:string;hex_login:string;is_admin:boolean;is_moderator:boolean;is_suspended:boolean}[]>([]);
  const [cooldownMinutes,setCooldownMinutes]=useState('0');
  const [selectedRestrictionUser,setSelectedRestrictionUser]=useState('');
  const [auditRows,setAuditRows]=useState<any[]>([]);
  const [restrictedTopics,setRestrictedTopics]=useState<string[]>([]);
  const [restrictionMap,setRestrictionMap]=useState<Record<string,string[]>>({});
  const [statsTopic,setStatsTopic]=useState('');
  const [statsUser,setStatsUser]=useState<string|null>(null);
  const [statsRows,setStatsRows]=useState<any[]>([]);
  const [statsMode,setStatsMode]=useState<'topics'|'posts'|'users'>('topics');
  const [adminSearch,setAdminSearch]=useState('');
  const [statsSearch,setStatsSearch]=useState('');
  const [moderatorTopics,setModeratorTopics]=useState<string[]>([]);
  const [stats,setStats]=useState({posts:0,users:0});
  const sentinelRef=useRef<HTMLDivElement>(null);
  const composerRef=useRef<HTMLTextAreaElement>(null);
  const loadingRef=useRef(false);
  const offsetRef=useRef(0);
  const moreRef=useRef(true);

  const setNotice=(value:string,isError=false)=>{setStatus(value);setError(isError);};
  const navigate=(path:string)=>{const normalized=path==='/-------'?'/animals':path;if(window.location.pathname!==normalized)window.history.pushState({},'',normalized);setRoute(normalized);setStatus('');setError(false);};
  useEffect(()=>{const onPop=()=>{setRoute(window.location.pathname);setStatus('');setError(false);};window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);},[]);
  useEffect(()=>{if(route==='/-------'){navigate('/animals');return;}const path=route==='/'?'general':route.slice(1);if((route==='/'||topics.some(t=>t.id===path))&&path!==topic){setPosts([]);offsetRef.current=0;moreRef.current=true;setHasMore(false);loadingRef.current=false;setTopic(path);}},[route,topics,topic]);
  useEffect(()=>{if(route==='/auth'&&!user)setAuthStep(step=>step==='registration'||step==='key-ready'?step:'login');},[route,user]);
  useEffect(()=>{if(route==='/admin'&&profile?.is_admin)void loadAdminStats();},[route,profile?.is_admin]);

  const ensureIdentity=useCallback(async()=>{
    const {data,error}=await supabase.auth.getSession();
    if(error)throw error;
    const activeUser=data.session?.user??null;
    if(!activeUser){setUser(null);setProfile(null);return;}
    const {data:found,error:profileError}=await supabase.from('copypaste_profiles').select('hex_login,is_admin,is_moderator,is_registered,is_suspended').eq('id',activeUser.id).maybeSingle();
    if(profileError)throw profileError;
    if(!found||!found.is_registered){setUser(null);setProfile(null);await supabase.auth.signOut();return;}
    setUser(activeUser);setProfile(found as Profile);
    const {data:scopes}=await supabase.from('copypaste_moderator_topics').select('topic_id').eq('user_id',activeUser.id);
    setModeratorTopics((scopes??[]).map((row:any)=>row.topic_id));
  },[]);

  const loadTopics=useCallback(async()=>{
    const {data,error}=await supabase.from('copypaste_topics').select('id,label,icon,color').order('sort_order');
    if(!error&&data?.length){setTopics(data as Topic[]);const path=window.location.pathname.slice(1);if(path&&data.some((t:any)=>t.id===path))setTopic(path);}
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
  useEffect(()=>{const routeTopic=route==='/'?'general':route.slice(1);const feedRoute=route==='/'||topics.some(t=>t.id===routeTopic);if(feedRoute&&routeTopic===topic)void loadPosts(true);},[user,topic,loadPosts,route,topics]);
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
    const style=getComputedStyle(el);
    const line=Number.parseFloat(style.lineHeight)||24;
    const verticalPadding=(Number.parseFloat(style.paddingTop)||0)+(Number.parseFloat(style.paddingBottom)||0);
    const minHeight=line+verticalPadding;
    const maxHeight=line*5+verticalPadding;
    el.style.height=`${minHeight}px`;
    const contentHeight=el.scrollHeight;
    const next=Math.max(minHeight,Math.min(contentHeight,maxHeight));
    el.style.height=`${next}px`;
    el.style.overflowY=contentHeight>maxHeight?'auto':'hidden';
  },[message]);

  const isPublicProfileRoute=/^\/[0-9a-fA-F]{6}$/.test(route);
  useEffect(()=>{
    if(!isPublicProfileRoute){setPublicProfile(null);setPublicProfilePosts([]);return;}
    let cancelled=false;
    setPublicProfileLoading(true);
    const login='#'+route.slice(1).toUpperCase();
    void (async()=>{
      try{
        const {data:person,error:personError}=await supabase.from('copypaste_profiles').select('id,hex_login,is_admin,is_moderator,is_registered,is_suspended').eq('hex_login',login).eq('is_registered',true).maybeSingle();
        if(personError)throw personError;
        if(!person){if(!cancelled){setPublicProfile(null);setPublicProfilePosts([]);}return;}
        const {data:rows,error:postsError}=await supabase.from('copypaste_posts').select('id,post_number,created_at,author_id,topic').eq('author_id',person.id).order('created_at',{ascending:false}).limit(50);
        if(postsError)throw postsError;
        if(!cancelled){setPublicProfile(person as Profile&{id:string});setPublicProfilePosts((rows??[]) as unknown as Post[]);}
      }catch(cause){console.error('Public profile load failed:',cause);if(!cancelled){setPublicProfile(null);setPublicProfilePosts([]);}}
      finally{if(!cancelled)setPublicProfileLoading(false);}
    })();
    return()=>{cancelled=true;};
  },[route,isPublicProfileRoute]);
  useEffect(()=>{
    if(!user?.id||!(route==='/profile'||route==='/auth')){setOwnProfilePosts([]);return;}
    let cancelled=false;
    void (async()=>{
      try{
        const {data:rows,error:postsError}=await supabase.from('copypaste_posts').select('id,post_number,created_at,author_id,topic').eq('author_id',user.id).order('created_at',{ascending:false}).limit(50);
        if(postsError)throw postsError;
        if(!cancelled)setOwnProfilePosts((rows??[]) as unknown as Post[]);
      }catch(cause){console.error('Own profile posts load failed:',cause);if(!cancelled)setOwnProfilePosts([]);}
    })();
    return()=>{cancelled=true;};
  },[route,user?.id]);
  const isFeedRoute=route==='/'||topics.some(t=>route==='/'+t.id);
  function updateTopic(next:string){if(next===topic&&route===(next==='general'?'/':`/${next}`))return;offsetRef.current=0;moreRef.current=true;setHasMore(false);setPosts([]);setTopic(next);navigate(next==='general'?'/':`/${next}`);}

  async function runAuthCommand(key:string){
    setBusy(true);setNotice('');
    try{
      const {data,error}=await supabase.functions.invoke('copypaste-auth',{body:{action:'login',secretKey:key.trim().toLowerCase()}});
      if(error||data?.error)throw new Error(data?.error||'Ключ не підійшов.');
      const {error:sessionError}=await supabase.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});
      if(sessionError)throw sessionError;
      await ensureIdentity();setProfileOpen(false);setAuthStep('idle');setLoginKey('');setNotice('');navigate('/');
    }catch(e){setNotice(e instanceof Error?e.message:'Помилка авторизації.',true);}
    finally{setBusy(false);}
  }
  async function logout(){
    setBusy(true);
    try{await supabase.auth.signOut();setUser(null);setProfile(null);setModeratorTopics([]);setProfileOpen(false);setNotice('');}
    catch(e){setNotice(e instanceof Error?e.message:'Не вдалося вийти.',true);}
    finally{setBusy(false);}
  }

  async function beginRegistration(){
    setBusy(true);setNotice('');
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
      await ensureIdentity();setAuthStep('idle');setRegistration(null);setProfileOpen(false);setLoginKey('');setRulesAccepted(false);setNotice('');setMessage('');navigate('/');
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
    const [p,u,settings,people,restrictions]=await Promise.all([
      supabase.from('copypaste_posts').select('id',{count:'exact',head:true}),
      supabase.from('copypaste_profiles').select('id',{count:'exact',head:true}),
      supabase.from('copypaste_settings').select('cooldown_minutes').eq('id',true).maybeSingle(),
      supabase.from('copypaste_profiles').select('id,hex_login,is_admin,is_moderator,is_suspended').eq('is_registered',true).order('hex_login'),
      supabase.from('copypaste_post_restrictions').select('user_id,topic_id')
    ]);
    setStats({posts:p.count??0,users:u.count??0});
    setCooldownMinutes(String(settings.data?.cooldown_minutes??0));
    const peopleRows=(people.data??[]) as any[];
    setAdminUsers(peopleRows);
    const byId=new Map(peopleRows.map(person=>[person.id,person.hex_login]));
    const map:Record<string,string[]>={};
    for(const row of restrictions.data??[]){const login=byId.get(row.user_id);if(login)map[login]=[...(map[login]??[]),row.topic_id];}
    setRestrictionMap(map);
    const {data:audit}=await supabase.from('copypaste_admin_audit').select('id,action,details,created_at,target:copypaste_profiles!copypaste_admin_audit_target_user_id_fkey(hex_login)').order('created_at',{ascending:false}).limit(20);
    setAuditRows(audit??[]);
  }
  async function loadStatsRows(mode:'posts'|'users',selectedTopic=statsTopic,selectedUser=statsUser){
    setStatsMode(mode);setStatsTopic(selectedTopic);setStatsUser(selectedUser);
    const allRows:any[]=[];
    for(let start=0;;start+=1000){
      let q=supabase.from('copypaste_posts').select('id,post_number,content,created_at,author_id,topic').order('created_at',{ascending:false}).range(start,start+999);
      if(selectedTopic)q=q.eq('topic',selectedTopic);
      if(selectedUser)q=q.eq('author_id',selectedUser);
      const {data,error}=await q;
      if(error){setNotice(error.message,true);return;}
      allRows.push(...(data??[]));
      if((data??[]).length<1000)break;
    }
    const ids=[...new Set(allRows.map((x:any)=>x.author_id))];
    const {data:people}=ids.length?await supabase.from('copypaste_profiles').select('id,hex_login').in('id',ids):{data:[] as any[]};
    const names=new Map((people??[]).map((p:any)=>[p.id,p.hex_login]));
    setStatsRows(allRows.map((x:any)=>({...x,hex_login:names.get(x.author_id)??'невідомо'})));
  }

  async function publishPost(event:FormEvent){
    event.preventDefault();const content=message.trim();if(!content)return;
    if(!user||!profile){setNotice('Авторизуйся через профіль, щоб публікувати.',true);return;}

    setBusy(true);setNotice('');
    try{
      const {error}=await supabase.from('copypaste_posts').insert({content,topic});
      if(error)throw error;
      setMessage('');await loadPosts(true);
    }catch(e){console.error('Publish failed:',e);const detail=e&&typeof e==='object'&&'message' in e&&typeof (e as {message?:unknown}).message==='string'?(e as {message:string}).message:e instanceof Error?e.message:'Невідома помилка сервера';setNotice(`Не вдалося опублікувати: ${detail}`,true);}
    finally{setBusy(false);}
  }

  const canPublish=!!user&&!!profile?.is_registered&&!profile?.is_suspended&&!busy&&!!message.trim()&&message.length<=180;

  return <main className="shell">
    <header>
      <button className="brand" type="button" onClick={()=>{updateTopic('general');setInfoOpen(false);setProfileOpen(false);}} style={{color:isFeedRoute&&topic!=='general'?topics.find(t=>t.id===topic)?.color??'#111':'#111'}} aria-label="На головну"><strong>copy</strong><span>paste</span></button>
      <nav className="nav" aria-label="Навігація">
        <button className={`icon-btn${infoOpen?' active':''}`} type="button" aria-label="Інформація" title="Інформація" onClick={()=>{navigate("/info");setInfoOpen(true);setProfileOpen(false);}}><Info/></button>
        <button className={`icon-btn${profileOpen?' active':''}`} type="button" aria-label="Профіль" title="Профіль" onClick={()=>{navigate(user?"/profile":"/auth");setProfileOpen(true);setInfoOpen(false);setAuthStep(user?"idle":"login");}}><UserRound/></button>
        {profile?.is_admin&&<button className="icon-btn" type="button" aria-label="Панель адміністратора" title="Панель адміністратора" onClick={()=>{setInfoOpen(false);setProfileOpen(false);navigate('/admin');void loadAdminStats();}}><ShieldCheck/></button>}
      </nav>
    </header>
    {route==='/info'?<section className="info-panel">
      <div className="info-tabs"><button className={infoTab==='faq'?'selected':''} onClick={()=>setInfoTab('faq')}>FAQ</button><button className={infoTab==='rules'?'selected':''} onClick={()=>setInfoTab('rules')}>Правила</button></div>
      {infoTab==='faq'?<div className="info-content">
        <h2>Часті запитання</h2>
        <h3>Як створити акаунт і не втратити доступ?</h3><p>Відкрий профіль і вибери реєстрацію. Після створення система покаже HEX-логін і секретний ключ. Збережи ключ у менеджері паролів або іншому безпечному місці: він є єдиним способом входу, а відновити його за логіном неможливо. Не передавай ключ іншим людям.</p>
        <h3>Як вийти?</h3><p>Відкрий профіль і натисни «Вийти з акаунта».</p>
        <h3>Що таке HEX-логін?</h3><p>Це унікальний ідентифікатор із символом # і шести цифр або літер A–F, наприклад <code>#6AC73C</code>. Він відображається біля твоїх повідомлень замість імені. Колір логіна використовується лише як візуальна ознака.</p>
        <h3>Чи можна писати без реєстрації?</h3><p>Ні. Читати стрічку можуть усі, але публікувати повідомлення — лише авторизовані користувачі. Часових лімітів на публікації немає.</p>
        <h3>Як форматувати повідомлення?</h3><p>Використовуй <code>**жирний**</code> для акценту, <code>*курсив*</code> для інтонації, <code>~~закреслений~~</code> для виправлень, <code>&gt;текст</code> для зеленого виділення. Обгорни фрагмент у <code>||подвійні вертикальні риски||</code>, щоб приховати спойлер. Гості бачать прихований фрагмент, але для відкриття мають увійти в акаунт.</p>
        <h3>Як працюють розділи?</h3><p>Кожен розділ має власну стрічку, тему й правила. Перемикання не видаляє повідомлення й не змінює їхню нумерацію: номер публікації є глобальним для всього сайту. Логотип повертає до загальної стрічки.</p><h3>Чому я не можу опублікувати повідомлення?</h3><p>Публікувати можуть лише авторизовані учасники. Адміністрація може тимчасово обмежити публікації в окремому розділі або призупинити їх для акаунта. Такі обмеження не закривають читання стрічки.</p><h3>Як повідомити про проблему?</h3><p>Збережи HEX-логін, приблизний час і назву розділу, де виникла помилка. Не надсилай нікому свій секретний ключ.</p>
      </div>:<div className="info-content">
        <h2>Правила спільноти</h2><h3>Загальні правила</h3>
        <ol><li>Поважай інших учасників. Заборонені погрози, цькування та переслідування.</li><li>Не публікуй персональні дані інших людей без їхньої згоди.</li><li>Не використовуй сайт для спаму, шахрайства, реклами чи навмисного засмічення стрічки.</li><li>Не публікуй незаконний, шкідливий або відверто образливий контент.</li><li>Дотримуйся тематики обраного розділу.</li><li>Не видавай себе за інших користувачів або адміністрацію та не обходь блокування.</li><li>Модератори можуть видаляти повідомлення, що порушують правила їхнього розділу. Адміністрація може тимчасово обмежити публікації в розділі або призупинити публікації з акаунта.</li><li>Позначай сюжетні та інші важливі спойлери форматуванням <code>||спойлер||</code>. Не розкривай чужі персональні дані навіть у прихованому тексті.</li><li>Публікуй змістовні повідомлення в доречному розділі. Уникай повторів, флуду та повідомлень, що не додають нічого до розмови.</li></ol>
        <h3>Правила окремих розділів</h3>
        {topics.map(t=><div className="topic-rule" key={t.id}><strong>{t.label}</strong><p>{t.id==='games'?'Обговорюй ігри, проходження та ігрові новини. Позначай сюжетні спойлери.':t.id==='technology'?'Технології, програмування та цифрові продукти. Не публікуй шкідливі посилання й шахрайські схеми.':t.id==='books'?'Книги, автори та літературні обговорення. Позначай сюжетні спойлери.':t.id==='art'?'Творчість, мистецтво та власні роботи. Поважай авторство.':t.id==='news'?'Актуальні події та новини. Перевіряй факти й додавай контекст.':t.id==='animals'?'Домашні улюбленці, дика природа, догляд за тваринами та цікаві спостереження. Поважай тварин і не поширюй шкідливих порад.':'Дотримуйся тематики розділу, спілкуйся ввічливо та не засмічуй стрічку.'}</p></div>)}
      </div>}
    </section>:infoOpen?null:null}
    {isPublicProfileRoute&&<section className="profile-panel public-profile-panel">
      {publicProfileLoading?<div className="public-profile-empty">Завантажуємо профіль…</div>:publicProfile?<>
        <div className="account-profile public-account-profile">
          <div className="account-profile-identity public-account-identity" style={{'--profile-accent':publicProfile.hex_login} as CSSProperties}>
            <span className="account-profile-avatar" style={{'--profile-accent':publicProfile.hex_login} as CSSProperties} aria-hidden="true"/>
            <div className="account-profile-heading"><h1>{publicProfile.hex_login}</h1><span className="account-profile-role">{publicProfile.is_admin?<><ShieldCheck aria-hidden="true"/>Адміністратор</>:publicProfile.is_moderator?'Модератор':'Учасник спільноти'}</span></div>
          </div>
          <div className="public-profile-body"><ProfilePulse posts={publicProfilePosts} topics={topics}/></div>
        </div>
      </>:<div className="public-profile-empty"><h2>Профіль не знайдено</h2><p>Перевір HEX-логін або повернись до стрічки.</p><button className="profile-logout" type="button" onClick={()=>navigate('/')}>На головну</button></div>}
    </section>}
    {(route==='/profile'||route==='/auth')&&<section className="profile-panel">
      {user&&profile?<>
      <div className="account-profile">
        <div className="account-profile-identity public-account-identity" style={{'--profile-accent':profile.hex_login} as CSSProperties}>
          <span className="account-profile-avatar" style={{'--profile-accent':profile.hex_login} as CSSProperties} aria-hidden="true"/>
          <div className="account-profile-heading"><h1>{profile.hex_login}</h1><span className="account-profile-role">{profile.is_admin?<><ShieldCheck aria-hidden="true"/>Адміністратор</>:profile.is_moderator?'Модератор':'Учасник спільноти'}</span></div>
          <button className="profile-logout profile-logout-top" type="button" disabled={busy} onClick={()=>void logout()}>Вийти</button>
        </div>
        <div className="public-profile-body">
          <ProfilePulse posts={ownProfilePosts} topics={topics}/>
          {user?.email?.startsWith('passkey-')&&<p className="profile-warning">Цей акаунт раніше використовував Passkey. Секретний ключ для входу ще не налаштований — не виходь з акаунта, доки не додамо ключ.</p>}
        </div>
      </div>
      </>:<div className="profile-auth">
        {authStep==='idle'?<div className="auth-choice"><button type="button" className="auth-link" onClick={()=>setAuthStep('login')}>Авторизуватись</button><button type="button" className="auth-link" onClick={()=>setAuthStep('registration')}>Зареєструватися</button></div>:authStep==='login'?<><input className="auth-key-input" type="password" autoComplete="current-password" value={loginKey} onChange={e=>setLoginKey(e.target.value)} placeholder="Секретний ключ"/><div className="auth-actions"><button type="button" className="auth-link muted" onClick={()=>{setAuthStep('idle');setLoginKey('');}}>Назад</button><button type="button" className="auth-link" disabled={busy||!loginKey.trim()} onClick={async()=>{await runAuthCommand(loginKey);setLoginKey('');}}>Увійти</button></div><p className="auth-switch">Ще немає акаунта? <button type="button" className="auth-link" onClick={()=>{setAuthStep('registration');setLoginKey('');}}>Зареєструватися</button></p></>:authStep==='registration'?<><label className="rules-check"><input type="checkbox" checked={rulesAccepted} onChange={e=>setRulesAccepted(e.target.checked)}/><span>Створюючи акаунт, ти погоджуєшся дотримуватися правил спільноти.</span></label><div className="auth-actions"><button type="button" className="auth-link muted" onClick={()=>setAuthStep('idle')}>Назад</button><button type="button" className="auth-link" disabled={busy||!rulesAccepted} onClick={()=>void beginRegistration()}>Створити акаунт</button></div></>:<><div className="secret-key">{registration?.secretKey}</div><div className="auth-actions auth-key-actions"><button type="button" className="auth-link copy-auth-key" onClick={()=>void navigator.clipboard.writeText(registration?.secretKey??'')}><Copy/> Скопіювати ключ</button><button type="button" className="auth-link" disabled={busy} onClick={()=>void continueRegistration()}>Продовжити</button></div><p className="auth-warning">Цей ключ неможливо відновити. Він єдиний спосіб увійти в акаунт — збережи його в надійному місці.</p></>}
      </div>}
      {status&&<div className={`status${error?' error':''}`}>{status}</div>}
    </section>}
    {route==='/admin'&&profile?.is_admin?<section className="admin-panel">
      <div className="admin-heading"><div><span className="admin-eyebrow">CONTROL ROOM</span><h2>Керування copypaste</h2></div><div className="admin-heading-actions"><button className="admin-refresh" type="button" onClick={()=>{void loadAdminStats();void loadTopics();}}>Оновити дані ↻</button><button className="admin-close" type="button" onClick={()=>{navigate('/profile');}}>До профілю ×</button></div></div>
      <div className="admin-stats"><div><strong>{stats.posts}</strong><span>повідомлень</span></div><div><strong>{stats.users}</strong><span>профілів</span></div><div><strong>{topics.length}</strong><span>розділів</span></div></div>
      <div className="admin-grid">
        <section className="admin-card admin-wide"><div className="admin-card-title"><span>01</span><h3>Публікації та обмеження</h3></div><p>Загальний інтервал між публікаціями для всіх учасників. 0 — без обмежень. Адміністратор не обмежується таймером.</p><div className="admin-inline"><label>Інтервал у хвилинах<input type="number" min="0" max="10080" value={cooldownMinutes} onChange={e=>setCooldownMinutes(e.target.value)}/></label><button type="button" onClick={async()=>{try{const value=Math.max(0,Math.min(10080,Number(cooldownMinutes)||0));await adminAction('update_settings',{cooldownMinutes:value});setCooldownMinutes(String(value));setNotice(value?'Загальний інтервал збережено.':'Часові обмеження вимкнено.');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Зберегти таймінг</button></div><div className="user-control-head"><div><h4>Керування конкретним акаунтом</h4><p>Знайди HEX-логін і вибери його. Можна заборонити публікації в окремих розділах або тимчасово вимкнути публікації повністю. Читання стрічки залишається відкритим.</p></div></div><input className="admin-search user-search" value={adminSearch} onChange={e=>setAdminSearch(e.target.value)} placeholder="Пошук за HEX-логіном, наприклад #B123AE"/><div className="user-picker">{adminUsers.filter(p=>!p.is_admin&&p.hex_login.toLowerCase().includes(adminSearch.toLowerCase())).map(p=><button type="button" className={selectedRestrictionUser===p.hex_login?'selected':''} key={p.id} onClick={()=>{setSelectedRestrictionUser(p.hex_login);setRestrictedTopics([...(restrictionMap[p.hex_login]??[])]);}}><span className="user-picker-login">{p.hex_login}</span><span>{p.is_suspended?'Заблокований':(restrictionMap[p.hex_login]?.length?'Обмежено: '+restrictionMap[p.hex_login].length+' розд.':'Без обмежень')}</span></button>)}</div>{selectedRestrictionUser&&<div className="selected-user-panel"><div className="selected-user-title"><strong>{selectedRestrictionUser}</strong><span>{adminUsers.find(p=>p.hex_login===selectedRestrictionUser)?.is_suspended?'Публікації заблоковано':'Керування доступом'}</span></div><p>Обмеження публікацій у розділах</p><div className="admin-check-grid">{topics.map(t=><label className="admin-check" key={t.id}><input type="checkbox" checked={restrictedTopics.includes(t.id)} onChange={e=>setRestrictedTopics(old=>e.target.checked?[...old,t.id]:old.filter(x=>x!==t.id))}/><span>{t.label}</span></label>)}</div><div className="admin-user-actions"><button type="button" onClick={async()=>{try{const next={...restrictionMap,[selectedRestrictionUser]:restrictedTopics};const restrictions=adminUsers.filter(p=>!p.is_admin).map(p=>({login:p.hex_login,topicIds:next[p.hex_login]??[]})).filter(x=>x.topicIds.length);await adminAction('replace_post_restrictions',{restrictions});setRestrictionMap(next);setNotice('Обмеження для '+selectedRestrictionUser+' збережено.');}catch(e){setNotice(e instanceof Error?e.message:'Не вдалося зберегти обмеження.',true);}}}>Зберегти обмеження</button><button type="button" className="admin-secondary" onClick={()=>setRestrictedTopics([])}>Очистити позначки розділів</button><button type="button" className="admin-danger" onClick={async()=>{try{const person=adminUsers.find(p=>p.hex_login===selectedRestrictionUser);const {error}=await supabase.rpc('copypaste_admin_set_suspension',{p_login:selectedRestrictionUser,p_suspended:!person?.is_suspended});if(error)throw error;setAdminUsers(old=>old.map(p=>p.hex_login===selectedRestrictionUser?{...p,is_suspended:!person?.is_suspended}:p));setNotice(person?.is_suspended?'Блокування акаунта знято.':'Акаунт тимчасово заблоковано.');await loadAdminStats();}catch(e){setNotice(e instanceof Error?e.message:'Не вдалося змінити статус акаунта.',true);}}}>{adminUsers.find(p=>p.hex_login===selectedRestrictionUser)?.is_suspended?'Відновити акаунт':'Заблокувати акаунт'}</button></div></div>}</section>
        <section className="admin-card"><div className="admin-card-title"><span>02</span><h3>Новий акаунт</h3></div><p>Введи 6 HEX-символів без #. Якщо залишити порожнім — створимо випадковий HEX-логін.</p><div className="admin-inline"><div className="hex-login-field"><span>#</span><input value={accountLogin} maxLength={6} onChange={e=>setAccountLogin(e.target.value.replace(/[^a-fA-F0-9]/g,'').slice(0,6).toUpperCase())} placeholder="A1B2C3"/></div><button type="button" disabled={loginAvailability==='checking'||loginAvailability==='taken'||loginAvailability==='invalid'} onClick={async()=>{try{const result=await adminAction('create_account',{login:accountLogin.trim()});setNewAccount({...result,login:typeof result.login==='string'?(result.login.startsWith('#')?result.login:'#'+result.login.toUpperCase()):result.login});setAccountLogin('');setLoginAvailability('idle');setNotice('Акаунт створено. Збережи секретний ключ.');await loadAdminStats();}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Створити</button></div><div className={`availability ${loginAvailability}`}>{loginAvailability==='checking'?'Перевіряємо доступність…':loginAvailability==='free'?'✓ Логін вільний':loginAvailability==='taken'?'✕ Логін уже зайнятий':loginAvailability==='invalid'?'Потрібно рівно 6 HEX-символів (0–9, A–F)':'Автоматичний HEX-логін буде згенеровано'}</div>{newAccount&&<div className="new-account"><strong>{newAccount.login}</strong><code>{newAccount.secretKey}</code><button type="button" onClick={()=>void navigator.clipboard.writeText('Логін: '+newAccount.login+'\nКлюч: '+newAccount.secretKey)}>Скопіювати логін і ключ</button></div>}</section>
        <section className="admin-card"><div className="admin-card-title"><span>03</span><h3>Модератори</h3></div><p>Вкажи HEX-логін і познач один або декілька розділів.</p><input value={moderatorLogin} onChange={e=>setModeratorLogin('#'+e.target.value.replace(/[^a-fA-F0-9]/g,'').slice(0,6).toUpperCase())} placeholder="#A1B2C3"/><div className="admin-check-grid">{topics.map(t=><label className="admin-check" key={t.id}><input type="checkbox" checked={selectedModeratorTopics.includes(t.id)} onChange={e=>setSelectedModeratorTopics(old=>e.target.checked?[...old,t.id]:old.filter(x=>x!==t.id))}/><span>{t.label}</span></label>)}</div><div className="admin-inline"><button type="button" disabled={!moderatorLogin||!selectedModeratorTopics.length} onClick={async()=>{try{await adminAction('set_role',{login:moderatorLogin,role:'moderator',topicIds:selectedModeratorTopics});setModeratorLogin('');setNotice('Права модератора надано для вибраних розділів.');await loadAdminStats();}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Надати права</button><button type="button" className="admin-text-button" disabled={!moderatorLogin} onClick={async()=>{try{await adminAction('set_role',{login:moderatorLogin,role:'user'});setNotice('Права модератора знято.');await loadAdminStats();}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Зняти права</button></div></section>
        <section className="admin-card"><div className="admin-card-title"><span>04</span><h3>Розділи</h3></div><p>Задай назву, адресу та будь-яку назву іконки з Lucide.</p><label>Назва розділу<input value={topicName} onChange={e=>{setTopicName(e.target.value);setTopicPath(slugifyTopic(e.target.value));}} placeholder="Наприклад, Ігри"/></label><label>Адреса сторінки<input value={topicPath} onChange={e=>setTopicPath(e.target.value.toLowerCase().replace(/^\/+/, '').replace(/[^a-z0-9_-]/g,'-'))} placeholder="games"/></label><label>Назва Lucide іконки<input value={topicIcon} onChange={e=>setTopicIcon(e.target.value.trim())} placeholder="Gamepad2"/></label><div className="topic-options"><label>Колір<input type="color" value={topicColor} onChange={e=>setTopicColor(e.target.value)}/></label><span className="topic-preview" style={{color:topicColor}}>{(()=>{const Preview=(LucideIcons as any)[topicIcon]??MessageCircle;return <Preview/>})()}<b>{topicName||'Новий розділ'}</b></span><span className="topic-path-preview">/{topicPath||'назва'}</span></div><button type="button" disabled={!topicName.trim()||!topicPath.trim()||!topicIcon.trim()} onClick={async()=>{try{await adminAction('create_topic',{id:topicPath,label:topicName,icon:topicIcon,color:topicColor});setTopicName('');setTopicPath('');setTopicIcon('MessageCircle');setTopicColor('#aaa0cf');await loadTopics();setNotice('Розділ створено. Адреса: /'+topicPath);}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Створити розділ</button></section>
        <section className="admin-card admin-wide stats-card"><div className="admin-card-title"><span>05</span><h3>Статистика</h3></div><div className="stats-actions"><button type="button" onClick={()=>{setStatsMode('topics');setStatsTopic('');setStatsUser(null);setStatsRows([]);}}>Розділи та учасники</button><button type="button" onClick={()=>void loadStatsRows('posts','',null)}>Усі повідомлення ({stats.posts})</button></div>{statsMode==='topics'?<div className="stats-topic-list">{topics.map(t=><button type="button" key={t.id} onClick={()=>void loadStatsRows('users',t.id,null)}>{t.label}<span>Переглянути учасників ↗</span></button>)}</div>:statsMode==='users'?<><h4>Учасники в розділі «{topics.find(t=>t.id===statsTopic)?.label}»</h4><div className="stats-user-list">{adminUsers.map((person:any)=>({id:person.id,login:person.hex_login,count:statsRows.filter((row:any)=>row.author_id===person.id).length})).sort((a:any,b:any)=>b.count-a.count).map((person:any)=><button type="button" key={person.id} onClick={()=>void loadStatsRows('posts',statsTopic,person.id)}><strong>{person.login}</strong><span>{person.count} повідомлень</span></button>)}</div></>:<><h4>{statsUser?'Повідомлення користувача':statsTopic?'Повідомлення розділу':'Усі повідомлення'}</h4><button type="button" className="admin-text-button" onClick={()=>{setStatsMode('topics');setStatsTopic('');setStatsUser(null);setStatsRows([]);}}>← До розділів</button><div className="stats-tools"><input value={statsSearch} onChange={e=>setStatsSearch(e.target.value)} placeholder="Пошук за текстом або HEX-логіном"/><button type="button" onClick={()=>{const rows=statsRows.filter(row=>(row.content+' '+row.hex_login+' '+row.topic).toLowerCase().includes(statsSearch.toLowerCase()));const esc=(v:any)=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv=['Дата,Номер,Тема,Логін,Повідомлення',...rows.map(row=>[esc(new Date(row.created_at).toISOString()),row.post_number,esc(topics.find(t=>t.id===row.topic)?.label??row.topic),esc(row.hex_login),esc(row.content)].join(','))].join('\n');const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='copypaste-statistics.csv';a.click();URL.revokeObjectURL(url);}}>Експорт CSV ↓</button></div><div className="stats-post-list">{statsRows.filter(row=>(row.content+' '+row.hex_login+' '+row.topic).toLowerCase().includes(statsSearch.toLowerCase())).map(row=><article key={row.id}><div><strong>{row.hex_login}</strong><span>{topics.find(t=>t.id===row.topic)?.label??row.topic} · №{row.post_number}</span></div><p>{row.content}</p><time>{new Date(row.created_at).toLocaleString('uk-UA')}</time></article>)}</div></>}</section>
      </div>
      <section className="admin-card admin-wide"><div className="admin-card-title"><span>06</span><h3>Журнал адміністратора</h3></div><p>Останні зміни статусу акаунтів: хто був заблокований або відновлений і коли це сталося.</p><div className="audit-list">{auditRows.length?auditRows.map(row=><div key={row.id}><strong>{row.target?.hex_login??'Користувач видалений'}</strong><span>{row.action==='suspend_user'?'Акаунт заблоковано':row.action==='restore_user'?'Доступ відновлено':row.action}</span><time>{new Date(row.created_at).toLocaleString('uk-UA')}</time></div>):<p>Поки що записів немає.</p>}</div></section>
      {status&&<p className={error?'status error':'status'}>{status}</p>}
    </section>:isFeedRoute?<>
      {user&&<form className="composer" onSubmit={publishPost} aria-label="Нове повідомлення">
        <textarea ref={composerRef} value={message} onChange={e=>setMessage(e.target.value.slice(0,180))} disabled={busy||!!profile?.is_suspended} maxLength={180} placeholder={profile?.is_suspended?"Публікації для цього акаунта призупинено":"Поділись думкою…"} aria-label="Твоє повідомлення"/>
        <div className="compose-row"><span className="counter">{message.length}/180</span><button type="submit" disabled={!canPublish}>Опублікувати ↗</button></div>{profile?.is_suspended&&<div className="status error" role="status">Публікації з цього акаунта тимчасово призупинені адміністрацією. Читати стрічку можна.</div>}
        {status&&<div className={`status${error?' error':''}`} role="status" aria-live="polite">{status}</div>}
      </form>}
      <section aria-label="Усі повідомлення">
        <div className="topics">{topics.map(item=>{const Icon=(ICONS as any)[item.icon]??(LucideIcons as any)[item.icon]??MessageCircle;return <button key={item.id} type="button" className={`topic-btn${topic===item.id?' active':''}`} style={{'--topic-color':item.color} as CSSProperties} onClick={()=>updateTopic(item.id)}><Icon/>{item.label}</button>;})}</div>
        <div id="feed" aria-live="polite">
          {posts.length===0&&!loading?<div className="empty-state"><MessageCircle/><p>Тут поки тихо</p><span>Залиш першу думку в цьому розділі</span></div>:posts.map(post=><article className="post" key={post.id}>
            <div className="meta"><div className="identity"><span className="swatch" style={{backgroundColor:post.profile?.hex_login??'#aaa'}}/><button type="button" className="hex profile-user-link" onClick={()=>{if(post.profile?.hex_login)navigate('/'+post.profile.hex_login.replace(/^#/,'').toLowerCase());}}>{post.profile?.hex_login?.toLowerCase()??'#??????'}</button>{post.profile?.is_moderator&&post.profile.moderator_topics?.includes(post.topic)&&(()=>{const topicIconName=topics.find(t=>t.id===post.topic)?.icon??'';const TopicIcon=(ICONS as any)[topicIconName]??(LucideIcons as any)[topicIconName]??MessageCircle;return <TopicIcon className="moderator-topic-icon" style={{color:topics.find(t=>t.id===post.topic)?.color??'#777'}} aria-label="Модератор розділу"/>})()}</div><time dateTime={post.created_at}>{kyivInfo(post.created_at,post.post_number)}</time>
              {(profile?.is_admin||(profile?.is_moderator&&moderatorTopics.includes(post.topic)))&&<button className="moderate-delete" type="button" aria-label="Видалити повідомлення" onClick={async()=>{try{await adminAction('delete_post',{postId:post.id});await loadPosts(true);}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}><Trash2/></button>}
            </div><p className="message"><FormattedText value={post.content} canRevealSpoilers={!!user&&!!profile?.is_registered}/></p>
          </article>)}
          {loading&&posts.length===0&&<div className="empty">Завантажуємо потік…</div>}
        </div>
        <div ref={sentinelRef} id="sentinel"/>
        {hasMore&&posts.length>0&&<button className="load-more" type="button" disabled={loading} onClick={()=>void loadPosts(false)}>{loading?'Завантажуємо…':'Завантажити ще'}</button>}
      </section>
    </>:null}
  </main>;
}
