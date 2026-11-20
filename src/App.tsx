import { useCallback, useEffect, useRef, useState, type FormEvent, type CSSProperties } from 'react';
import * as LucideIcons from 'lucide-react';
import { AlarmClock, Anchor, Archive, Award, Baby, BadgeCheck, Banknote, Bell, Binary, Blocks, Bot, Box, Briefcase, Building2, Calendar, Car, Castle, Check, ChessKnight, Cloud, Crown, Database, Dog, DoorOpen, Feather, Flag, Flower, Footprints, Gift, GraduationCap, Handshake, Headphones, Key, Leaf, Lock, Mail, Mic, Moon, Mountain, Plane, Puzzle, QrCode, Radio, Rainbow, Scissors, Server, ShieldCheck, Ship, ShoppingCart, Snowflake, Swords, Ticket, Trees, Tv, Umbrella, Waves, Wifi, Wind, Activity, Aperture, Atom, AudioLines, Bike, Bird, Book, BookOpen, Bookmark, BriefcaseBusiness, Camera, Cat, ChartNoAxesCombined, CircleHelp, Code, Coffee, Compass, Cpu, Dice5, Dumbbell, Earth, Film, Flame, FlaskConical, Flower2, Gamepad2, Gem, Ghost, Globe2, Hammer, Heart, House, Lightbulb, Map as MapIcon, MessageCircle, Music, Palette, PawPrint, Rocket, School, Search, Shield, ShoppingBag, Smile, Sparkles, Star, Sun, Terminal, Trophy, Users, Video, Wallet, WandSparkles, Wrench, Zap, Newspaper, Trash2, Info, UserRound, Copy } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import ProfileActivity from './components/ProfileActivity';

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


function Spoiler({children,canReveal}:{children:string;canReveal:boolean}) {
  const [revealed,setRevealed]=useState(false);
  useEffect(()=>{const close=(event:MouseEvent)=>{if(!(event.target instanceof Element&&event.target.closest('.spoiler-wrap')))setRevealed(false);};document.addEventListener('click',close);return()=>document.removeEventListener('click',close);},[]);
  return <span className="spoiler-wrap"><button type="button" className={`spoiler${revealed?' revealed':''}${canReveal?'':' locked'}`} onClick={()=>{if(canReveal)setRevealed(value=>!value);}} aria-label={canReveal?'Відкрити спойлер':'Прихований текст'}>{children}</button></span>;
}
function FormattedText({value,canRevealSpoilers}:{value:string;canRevealSpoilers:boolean}) {
  const pattern=/(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\|\|[^|]+\|\||>[^
]+)/gm;
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

export default function App() {
  const [route,setRoute]=useState(window.location.pathname);
  const [user,setUser]=useState<User|null>(null);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [posts,setPosts]=useState<Post[]>([]);
  const [postSocialSummaries,setPostSocialSummaries]=useState<Record<string,{reactions:{user_id:string;reaction:'heart'|'like'|'laugh'|'idea'}[];comments:number}>>({});
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
    useEffect(()=>{if(route==='/auth'&&!user)setAuthStep(step=>step==='registration'||step==='key-ready'?step:'login');},[route,user]);
  
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
      const socialSummary:Record<string,{reactions:{user_id:string;reaction:'heart'|'like'|'laugh'|'idea'}[];comments:number}>={};
      const postIds=rows.map(row=>row.id);
      if(postIds.length){
        const [reactionResult,commentResult]=await Promise.all([
          supabase.from('copypaste_post_reactions').select('post_id,user_id,reaction').in('post_id',postIds),
          supabase.from('copypaste_comments').select('post_id').in('post_id',postIds)
        ]);
        for(const id of postIds)socialSummary[id]={reactions:[],comments:0};
        if(!reactionResult.error)for(const reaction of reactionResult.data??[])socialSummary[reaction.post_id]?.reactions.push({user_id:reaction.user_id,reaction:reaction.reaction});
        if(!commentResult.error)for(const comment of commentResult.data??[])if(socialSummary[comment.post_id])socialSummary[comment.post_id].comments+=1;
      }
      setPostSocialSummaries(current=>reset?socialSummary:{...current,...socialSummary});
      setPosts(current=>reset?rows:[...current,...rows]);
      offsetRef.current=start+rows.length;
      moreRef.current=rows.length===PAGE_SIZE&&offsetRef.current<(count??0);
      setHasMore(moreRef.current);
    }catch(cause){console.error(cause);setNotice('Не вдалося завантажити стрічку. Спробуй ще раз.',true);}
    finally{loadingRef.current=false;setLoading(false);}
  },[topic]);

      useEffect(()=>{void (async()=>{try{await ensureIdentity();setNotice('');}catch(e){console.error(e);setNotice('Не вдалося перевірити авторизацію. Онови сторінку та спробуй ще раз.',true);}})();},[ensureIdentity]);

  useEffect(()=>{
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(!session){setUser(null);setProfile(null);}
    });
    return()=>listener.subscription.unsubscribe();
  },[]);


  const isPublicProfileRoute=/^\/[0-9a-fA-F]{6}$/.test(route);
  const isDiscussionRoute=route.startsWith('/discussion/');
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
        const rows: {id:string;created_at:string;topic:string}[] = [];
        for(let start=0;;start+=1000){
          const {data,error:postsError}=await supabase.from('copypaste_posts').select('id,created_at,topic').eq('author_id',person.id).order('created_at',{ascending:false}).range(start,start+999);
          if(postsError)throw postsError;
          rows.push(...(data??[]));
          if((data??[]).length<1000)break;
        }
        if(!cancelled){setPublicProfile(person as Profile&{id:string});setPublicProfilePosts(rows as unknown as Post[]);}
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
        const rows: {id:string;created_at:string;topic:string}[] = [];
        for(let start=0;;start+=1000){
          const {data,error:postsError}=await supabase.from('copypaste_posts').select('id,created_at,topic').eq('author_id',user.id).order('created_at',{ascending:false}).range(start,start+999);
          if(postsError)throw postsError;
          rows.push(...(data??[]));
          if((data??[]).length<1000)break;
        }
        if(!cancelled)setOwnProfilePosts(rows as unknown as Post[]);
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
      <button className="brand" type="button" onClick={()=>navigate('/')} aria-label="На головну"><strong>copy</strong><span>paste</span></button>
      <nav className="nav" aria-label="Навігація">
        <button className={`icon-btn${profileOpen?' active':''}`} type="button" aria-label="Профіль" title="Профіль" onClick={()=>{navigate(user?'/profile':'/auth');setProfileOpen(true);setAuthStep(user?'idle':'login');}}><UserRound/></button>
      </nav>
    </header>
    {(route==='/profile'||route==='/auth')&&<section className="profile-panel">
      {user&&profile?<>
      <div className="account-profile">
        <div className="account-profile-identity public-account-identity" style={{'--profile-accent':profile.hex_login} as CSSProperties}>
          <span className="account-profile-avatar" style={{'--profile-accent':profile.hex_login} as CSSProperties} aria-hidden="true"/>
          <div className="account-profile-heading"><h1>{profile.hex_login}</h1><span className="account-profile-role">{profile.is_admin?<><ShieldCheck aria-hidden="true"/>Адміністратор</>:profile.is_moderator?'Модератор':'Учасник спільноти'}</span></div>
          <button className="profile-logout profile-logout-top" type="button" disabled={busy} onClick={()=>void logout()}>Вийти</button>
        </div>
        <div className="public-profile-body">
          <ProfileActivity posts={ownProfilePosts}/>
          {user?.email?.startsWith('passkey-')&&<p className="profile-warning">Цей акаунт раніше використовував Passkey. Секретний ключ для входу ще не налаштований — не виходь з акаунта, доки не додамо ключ.</p>}
        </div>
      </div>
      </>:<div className="profile-auth">
        {authStep==='idle'?<div className="auth-choice"><button type="button" className="auth-link" onClick={()=>setAuthStep('login')}>Авторизуватись</button><button type="button" className="auth-link" onClick={()=>setAuthStep('registration')}>Зареєструватися</button></div>:authStep==='login'?<><input className="auth-key-input" type="password" autoComplete="current-password" value={loginKey} onChange={e=>setLoginKey(e.target.value)} placeholder="Секретний ключ"/><div className="auth-actions"><button type="button" className="auth-link muted" onClick={()=>{setAuthStep('idle');setLoginKey('');}}>Назад</button><button type="button" className="auth-link" disabled={busy||!loginKey.trim()} onClick={async()=>{await runAuthCommand(loginKey);setLoginKey('');}}>Увійти</button></div><p className="auth-switch">Ще немає акаунта? <button type="button" className="auth-link" onClick={()=>{setAuthStep('registration');setLoginKey('');}}>Зареєструватися</button></p></>:authStep==='registration'?<><label className="rules-check"><input type="checkbox" checked={rulesAccepted} onChange={e=>setRulesAccepted(e.target.checked)}/><span>Створюючи акаунт, ти погоджуєшся дотримуватися правил спільноти.</span></label><div className="auth-actions"><button type="button" className="auth-link muted" onClick={()=>setAuthStep('idle')}>Назад</button><button type="button" className="auth-link" disabled={busy||!rulesAccepted} onClick={()=>void beginRegistration()}>Створити акаунт</button></div></>:<><div className="secret-key">{registration?.secretKey}</div><div className="auth-actions auth-key-actions"><button type="button" className="auth-link copy-auth-key" onClick={()=>void navigator.clipboard.writeText(registration?.secretKey??'')}><Copy/> Скопіювати ключ</button><button type="button" className="auth-link" disabled={busy} onClick={()=>void continueRegistration()}>Продовжити</button></div><p className="auth-warning">Цей ключ неможливо відновити. Він єдиний спосіб увійти в акаунт — збережи його в надійному місці.</p></>}
      </div>}
      {status&&<div className={`status${error?' error':''}`}>{status}</div>}
    </section>}
  </main>;
}
