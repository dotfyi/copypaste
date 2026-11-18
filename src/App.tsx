import { useCallback, useEffect, useRef, useState, type FormEvent, type CSSProperties } from 'react';
import { Activity, Aperture, Atom, AudioLines, Bike, Bird, Book, BookOpen, Bookmark, BriefcaseBusiness, Camera, Cat, ChartNoAxesCombined, CircleHelp, Code, Coffee, Compass, Cpu, Dice5, Dumbbell, Earth, Film, Flame, FlaskConical, Flower2, Gamepad2, Gem, Ghost, Globe2, Hammer, Heart, House, Lightbulb, Map, MessageCircle, Music, Palette, PawPrint, Rocket, School, Search, Shield, ShoppingBag, Smile, Sparkles, Star, Sun, Terminal, Trophy, Users, Video, Wallet, WandSparkles, Wrench, Zap, Newspaper, Trash2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

type Topic = { id: string; label: string; icon: string; color: string };
type Profile = { hex_login: string; is_admin: boolean; is_moderator: boolean; is_registered: boolean };
type Post = {
  id: string; post_number: number; content: string; created_at: string; author_id: string; topic: string;
  profile?: { hex_login: string; is_admin?: boolean; is_moderator?: boolean } | null;
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
const ICONS: Record<string, typeof Globe2> = {Activity,Aperture,Atom,AudioLines,Bike,Bird,Book,BookOpen,Bookmark,BriefcaseBusiness,Camera,Cat,ChartNoAxesCombined,CircleHelp,Code,Coffee,Compass,Cpu,Dice5,Dumbbell,Earth,Film,Flame,FlaskConical,Flower2,Gamepad2,Gem,Ghost,Globe2,Hammer,Heart,House,Lightbulb,Map,MessageCircle,Music,Palette,PawPrint,Rocket,School,Search,Shield,ShoppingBag,Smile,Sparkles,Star,Sun,Terminal,Trophy,Users,Video,Wallet,WandSparkles,Wrench,Zap,Newspaper};
const ICON_OPTIONS = Object.keys(ICONS).sort();
function kyivInfo(value: string, postNumber: number) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'2-digit',timeZone:'Europe/Kyiv'}).format(date);
  const weekday = new Intl.DateTimeFormat('uk-UA',{weekday:'short',timeZone:'Europe/Kyiv'}).format(date);
  const time = new Intl.DateTimeFormat('uk-UA',{hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZone:'Europe/Kyiv'}).format(date);
  return `${day} ${weekday.charAt(0).toLocaleUpperCase('uk-UA')}${weekday.slice(1)} ${time} №${postNumber}`;
}

const decodeB64url=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));
const encodeB64url=(value:ArrayBuffer)=>btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
function passkeyCredentialJSON(credential:PublicKeyCredential,kind:'registration'|'authentication'){
  const response=credential.response as AuthenticatorAttestationResponse & AuthenticatorAssertionResponse;
  const common={id:credential.id,rawId:encodeB64url(credential.rawId),type:credential.type,clientExtensionResults:credential.getClientExtensionResults()};
  if(kind==='registration'){
    const att=response as AuthenticatorAttestationResponse;
    return {...common,response:{attestationObject:encodeB64url(att.attestationObject),clientDataJSON:encodeB64url(att.clientDataJSON),transports:att.getTransports?.()??[]}};
  }
  const assertion=response as AuthenticatorAssertionResponse;
  return {...common,response:{authenticatorData:encodeB64url(assertion.authenticatorData),clientDataJSON:encodeB64url(assertion.clientDataJSON),signature:encodeB64url(assertion.signature),userHandle:assertion.userHandle?encodeB64url(assertion.userHandle):null}};
}
function Spoiler({children}:{children:string}) {
  const [revealed,setRevealed]=useState(false);
  const ref=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const close=(event:MouseEvent)=>{if(event.target instanceof Node&&!ref.current?.contains(event.target))setRevealed(false);};document.addEventListener('click',close);return()=>document.removeEventListener('click',close);},[]);
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
  const [adminCooldown,setAdminCooldown]=useState('1440');
  const [accountLogin,setAccountLogin]=useState('');
  const [loginAvailability,setLoginAvailability]=useState<'idle'|'checking'|'free'|'taken'|'invalid'>('idle');
  const [newAccount,setNewAccount]=useState<{login:string;secretKey:string}|null>(null);
  const [moderatorLogin,setModeratorLogin]=useState('');
  const [topicName,setTopicName]=useState('');
  const [topicIcon,setTopicIcon]=useState('MessageCircle');
  const [topicColor,setTopicColor]=useState('#aaa0cf');
  const [cooldownMinutes,setCooldownMinutes]=useState(1440);
  const [cooldownUntil,setCooldownUntil]=useState<number|null>(null);
  const [clockNow,setClockNow]=useState(Date.now());
  const [passkeyCount,setPasskeyCount]=useState(0);
  const [stats,setStats]=useState({posts:0,users:0});
  const sentinelRef=useRef<HTMLDivElement>(null);
  const composerRef=useRef<HTMLTextAreaElement>(null);
  const loadingRef=useRef(false);
  const offsetRef=useRef(0);
  const moreRef=useRef(true);

  const setNotice=(value:string,isError=false)=>{setStatus(value);setError(isError);};

  const ensureIdentity=useCallback(async()=>{
    let {data:sessionData,error:sessionError}=await supabase.auth.getSession();
    if(sessionError)throw sessionError;

    // Supabase session storage is the primary source. If it is missing after a
    // browser restart, recover the last anonymous session saved separately.
    if(!sessionData.session){
      const savedGuest=localStorage.getItem('copypaste_guest_session');
      if(savedGuest){
        try{
          const guest=JSON.parse(savedGuest) as {access_token?:string;refresh_token?:string};
          if(guest.access_token&&guest.refresh_token){
            const restored=await supabase.auth.setSession({access_token:guest.access_token,refresh_token:guest.refresh_token});
            if(!restored.error){
              ({data:sessionData,error:sessionError}=await supabase.auth.getSession());
              if(sessionError)throw sessionError;
            }else{
              localStorage.removeItem('copypaste_guest_session');
            }
          }else{
            localStorage.removeItem('copypaste_guest_session');
          }
        }catch{
          localStorage.removeItem('copypaste_guest_session');
        }
      }
    }

    if(!sessionData.session){
      const {data:created,error:signInError}=await supabase.auth.signInAnonymously();
      if(signInError)throw signInError;
      sessionData={session:created.session};
      if(created.session?.user?.is_anonymous){
        localStorage.setItem('copypaste_guest_session',JSON.stringify({access_token:created.session.access_token,refresh_token:created.session.refresh_token}));
      }
    }
    const activeUser=sessionData.session?.user;
    if(!activeUser)throw new Error('Не вдалося створити гостьову сесію.');
    let found:Profile|null=null;
    for(let i=0;i<12;i++){
      const result=await supabase.from('copypaste_profiles').select('hex_login,is_admin,is_moderator,is_registered').eq('id',activeUser.id).maybeSingle();
      if(result.error)throw result.error;
      if(result.data){found=result.data as Profile;break;}
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    if(!found)throw new Error('Не вдалося створити профіль.');
    setUser(activeUser);setProfile(found);
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
      const rows=(data??[]) as unknown as Post[];
      setPosts(current=>reset?rows:[...current,...rows]);
      offsetRef.current=start+rows.length;
      moreRef.current=rows.length===PAGE_SIZE&&offsetRef.current<(count??0);
      setHasMore(moreRef.current);
    }catch(cause){console.error(cause);setNotice('Не вдалося завантажити стрічку. Спробуй ще раз.',true);}
    finally{loadingRef.current=false;setLoading(false);}
  },[topic]);

  useEffect(()=>{void (async()=>{try{await ensureIdentity();setNotice('');}catch(e){console.error(e);setNotice('Не вдалося створити гостьовий профіль. Перевір, чи ввімкнений анонімний вхід.',true);}})();void loadTopics();},[ensureIdentity,loadTopics]);
  useEffect(()=>{if(user){void loadPosts(true);void refreshPasskeyStatus();}},[user,topic,loadPosts]);
  useEffect(()=>{
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(session?.user?.is_anonymous) localStorage.setItem('copypaste_guest_session',JSON.stringify(session));
    });
    return()=>listener.subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    let cancelled=false;
    async function refresh(){
      if(!user||!profile)return;
      if(profile.is_admin){setCooldownUntil(null);return;}
      const [{data:setting},{data:lastPost}] = await Promise.all([
        supabase.from('copypaste_settings').select('cooldown_minutes').eq('id',true).maybeSingle(),
        supabase.from('copypaste_posts').select('created_at').eq('author_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
      ]);
      if(cancelled)return;
      const mins=Number(setting?.cooldown_minutes??1440);setCooldownMinutes(mins);
      const until=lastPost?new Date(lastPost.created_at).getTime()+mins*60000:0;
      setCooldownUntil(until>Date.now()?until:null);
    }
    void refresh();return()=>{cancelled=true;};
  },[user,profile]);
  useEffect(()=>{
    if(cooldownUntil===null||cooldownUntil<=Date.now())return;
    const timer=window.setInterval(()=>{
      const now=Date.now();setClockNow(now);
      if(now>=cooldownUntil)setCooldownUntil(null);
    },1000);
    return()=>window.clearInterval(timer);
  },[cooldownUntil]);

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
    const el=composerRef.current;if(!el)return;el.style.height='auto';
    const line=Number.parseFloat(getComputedStyle(el).lineHeight)||24;const max=line*5+12;
    el.style.height=`${Math.min(el.scrollHeight,max)}px`;el.style.overflowY=el.scrollHeight>max?'auto':'hidden';
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
    try{
      const saved=localStorage.getItem('copypaste_guest_session');
      let restored=false;
      if(saved){
        try{
          const guest=JSON.parse(saved) as {access_token:string;refresh_token:string};
          const {error}=await supabase.auth.setSession({access_token:guest.access_token,refresh_token:guest.refresh_token});
          if(!error)restored=true;
        }catch{restored=false;}
      }
      if(!restored){
        await supabase.auth.signOut();
        const {error}=await supabase.auth.signInAnonymously();if(error)throw error;
      }
      await ensureIdentity();setAdminOpen(false);setNotice('Ти вийшов з акаунта.');
    }catch(e){setNotice(e instanceof Error?e.message:'Не вдалося вийти.',true);}
    finally{setBusy(false);}
  }

  async function refreshPasskeyStatus(){
    if(!user)return;
    const {data,error}=await supabase.functions.invoke('copypaste-passkey',{body:{action:'status'}});
    if(!error&&typeof data?.count==='number')setPasskeyCount(data.count);
  }
  async function registerPasskey(){
    if(!user||!profile)return;
    if(!window.PublicKeyCredential||!navigator.credentials){setNotice('Цей браузер не підтримує Passkey.',true);return;}
    setBusy(true);setNotice('Готуємо Passkey…');
    try{
      const {data:options,error}=await supabase.functions.invoke('copypaste-passkey',{body:{action:'register_options'}});
      if(error||data?.error)throw new Error(data?.error||'Не вдалося почати налаштування Passkey.');
      const publicKey={...options,challenge:decodeB64url(options.challenge),user:{...options.user,id:decodeB64url(options.user.id)},excludeCredentials:(options.excludeCredentials??[]).map((item:any)=>({...item,id:decodeB64url(item.id)}))} as PublicKeyCredentialCreationOptions;
      const credential=await navigator.credentials.create({publicKey}) as PublicKeyCredential|null;
      if(!credential)throw new Error('Створення Passkey скасовано.');
      const response=passkeyCredentialJSON(credential,'registration');
      const {data:verified,error:verifyError}=await supabase.functions.invoke('copypaste-passkey',{body:{action:'register_verify',challenge:options.challenge,response}});
      if(verifyError||verified?.error)throw new Error(verified?.error||'Не вдалося зберегти Passkey.');
      setPasskeyCount(v=>v+1);setNotice('Passkey додано. Тепер можна відновити цей HEX-профіль на іншому сеансі браузера.');
    }catch(e){setNotice(e instanceof Error?e.message:'Помилка Passkey.',true);}
    finally{setBusy(false);}
  }
  async function loginWithPasskey(){
    if(!window.PublicKeyCredential||!navigator.credentials){setNotice('Цей браузер не підтримує Passkey.',true);return;}
    setBusy(true);setNotice('Шукаємо Passkey…');
    try{
      const {data:options,error}=await supabase.functions.invoke('copypaste-passkey',{body:{action:'login_options'}});
      if(error||data?.error)throw new Error(data?.error||'Не вдалося почати вхід.');
      const publicKey={...options,challenge:decodeB64url(options.challenge),allowCredentials:(options.allowCredentials??[]).map((item:any)=>({...item,id:decodeB64url(item.id)}))} as PublicKeyCredentialRequestOptions;
      const credential=await navigator.credentials.get({publicKey}) as PublicKeyCredential|null;
      if(!credential)throw new Error('Вхід скасовано.');
      const response=passkeyCredentialJSON(credential,'authentication');
      const {data:session,error:verifyError}=await supabase.functions.invoke('copypaste-passkey',{body:{action:'login_verify',challenge:options.challenge,response}});
      if(verifyError||session?.error)throw new Error(session?.error||'Passkey не підтверджено.');
      const {error:setError}=await supabase.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
      if(setError)throw setError;
      await ensureIdentity();await refreshPasskeyStatus();setNotice('Повернули твій HEX-профіль.');
    }catch(e){setNotice(e instanceof Error?e.message:'Не вдалося увійти з Passkey.',true);}
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
    const [p,u,s]=await Promise.all([
      supabase.from('copypaste_posts').select('id',{count:'exact',head:true}),
      supabase.from('copypaste_profiles').select('id',{count:'exact',head:true}),
      supabase.from('copypaste_settings').select('cooldown_minutes').eq('id',true).single()
    ]);
    setStats({posts:p.count??0,users:u.count??0});if(s.data)setAdminCooldown(String(s.data.cooldown_minutes));
  }

  async function publishPost(event:FormEvent){
    event.preventDefault();const content=message.trim();if(!content||!user||!profile)return;
    if(content==='/exit'&&profile.is_registered){setMessage('');await logout();return;}
    if(content==='/auth'||content.startsWith('/auth ')){
      const key=content.slice(5).trim();if(!key){setNotice('Після /auth додай секретний ключ.',true);return;}
      setMessage('');await runAuthCommand(key);return;
    }

    if(content.length>180)return;
    if(cooldownUntil!==null&&cooldownUntil>Date.now()&&!profile.is_admin)return;
    setBusy(true);setNotice('');
    try{
      const {error}=await supabase.from('copypaste_posts').insert({content,topic});
      if(error){if(error.code==='42501'){if(cooldownMinutes>0)setCooldownUntil(Date.now()+cooldownMinutes*60000);setStatus('');return;}throw error;}
      if(!profile.is_admin&&cooldownMinutes>0)setCooldownUntil(Date.now()+cooldownMinutes*60000);
      setMessage('');await loadPosts(true);
    }catch(e){console.error(e);setNotice(e instanceof Error?e.message:'Не вдалося опублікувати.',true);}
    finally{setBusy(false);}
  }

  const cooldownSeconds=cooldownUntil===null?0:Math.max(0,Math.ceil((cooldownUntil-clockNow)/1000));
  const timerText=`${String(Math.floor(cooldownSeconds/3600)).padStart(2,'0')}:${String(Math.floor((cooldownSeconds%3600)/60)).padStart(2,'0')}:${String(cooldownSeconds%60).padStart(2,'0')}`;
  const cooldownActive=cooldownSeconds>0&&!profile?.is_admin;
  const canPublish=!!user&&!!profile&&!busy&&!cooldownActive&&!!message.trim()&&message.trim().length<=180;

  return <main className="shell">
    <header>
      <button className="brand" type="button" onClick={()=>setAdminOpen(false)} style={{color:topic==='general'?'#111':topics.find(t=>t.id===topic)?.color??'#111'}} aria-label="На головну"><strong>copy</strong><span>paste</span></button>
      <nav className="nav" aria-label="Навігація">
        {profile?.is_admin&&<button className="icon-btn" type="button" aria-label="Панель адміністратора" title="Панель адміністратора" onClick={()=>{setAdminOpen(v=>!v);if(!adminOpen)void loadAdminStats();}}><Shield/></button>}
      </nav>
    </header>
    {adminOpen&&profile?.is_admin?<section className="admin-panel">
      <div className="admin-heading"><div><span className="admin-eyebrow">CONTROL ROOM</span><h2>Керування copypaste</h2></div><button className="admin-close" type="button" onClick={()=>setAdminOpen(false)}>Закрити ×</button></div>
      <div className="admin-stats"><div><strong>{stats.posts}</strong><span>повідомлень</span></div><div><strong>{stats.users}</strong><span>профілів</span></div><div><strong>{topics.length}</strong><span>розділів</span></div></div>
      <div className="admin-grid">
        <section className="admin-card"><div className="admin-card-title"><span>01</span><h3>Публікації</h3></div><p>Проміжок між повідомленнями для звичайних користувачів. Для адміна обмеження вимкнені.</p><div className="admin-inline"><input aria-label="Інтервал у хвилинах" value={adminCooldown} onChange={e=>setAdminCooldown(e.target.value)} inputMode="numeric"/><button type="button" onClick={async()=>{try{await adminAction('update_settings',{cooldownMinutes:Number(adminCooldown)});setNotice('Інтервал збережено.');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Зберегти</button></div><small>0 — без ліміту для всіх</small></section>
        <section className="admin-card"><div className="admin-card-title"><span>02</span><h3>Новий акаунт</h3></div><p>Введи 6 HEX-символів без #. Якщо залишити порожнім — створимо випадковий HEX-логін.</p><div className="admin-inline"><div className="hex-login-field"><span>#</span><input value={accountLogin} maxLength={6} onChange={e=>setAccountLogin(e.target.value.replace(/[^a-fA-F0-9]/g,'').slice(0,6).toUpperCase())} placeholder="A1B2C3"/></div><button type="button" disabled={loginAvailability==='checking'||loginAvailability==='taken'||loginAvailability==='invalid'} onClick={async()=>{try{const result=await adminAction('create_account',{login:accountLogin.trim()});setNewAccount({...result,login:typeof result.login==='string'?(result.login.startsWith('#')?result.login:'#'+result.login.toUpperCase()):result.login});setAccountLogin('');setLoginAvailability('idle');setNotice('Акаунт створено. Збережи секретний ключ.');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Створити</button></div><div className={`availability ${loginAvailability}`}>{loginAvailability==='checking'?'Перевіряємо доступність…':loginAvailability==='free'?'✓ Логін вільний':loginAvailability==='taken'?'✕ Логін уже зайнятий':loginAvailability==='invalid'?'Потрібно рівно 6 HEX-символів (0–9, A–F)':'Автоматичний HEX-логін буде згенеровано'}</div>{newAccount&&<div className="new-account"><strong>{newAccount.login}</strong><code>{newAccount.secretKey}</code><button type="button" onClick={()=>void navigator.clipboard.writeText(`Логін: ${newAccount.login}\\nКлюч: ${newAccount.secretKey}`)}>Скопіювати логін і ключ</button></div>}</section>
        <section className="admin-card"><div className="admin-card-title"><span>03</span><h3>Модератори</h3></div><p>Надай права користувачу з уже створеним акаунтом.</p><div className="admin-inline"><input value={moderatorLogin} onChange={e=>setModeratorLogin('#'+e.target.value.replace(/[^a-fA-F0-9]/g,'').slice(0,6).toUpperCase())} placeholder="#A1B2C3"/><button type="button" onClick={async()=>{try{await adminAction('set_role',{login:moderatorLogin,role:'moderator'});setModeratorLogin('');setNotice('Права модератора оновлено.');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Надати</button></div></section>
        <section className="admin-card"><div className="admin-card-title"><span>04</span><h3>Розділи</h3></div><p>Створи нову тему для загальної стрічки.</p><div className="admin-inline"><input value={topicName} onChange={e=>setTopicName(e.target.value)} placeholder="Назва розділу"/><button type="button" disabled={!topicName.trim()} onClick={async()=>{try{await adminAction('create_topic',{id:topicName.toLowerCase().replace(/[^a-z0-9_-]/g,'-'),label:topicName,icon:topicIcon,color:topicColor});setTopicName('');setTopicIcon('MessageCircle');setTopicColor('#aaa0cf');await loadTopics();setNotice('Розділ додано.');}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}>Додати</button></div><div className="topic-options"><label>Lucide icon<select value={topicIcon} onChange={e=>setTopicIcon(e.target.value)}>{ICON_OPTIONS.map(name=><option key={name} value={name}>{name}</option>)}</select></label><label>Колір<input type="color" value={topicColor} onChange={e=>setTopicColor(e.target.value)}/></label><span className="topic-preview" style={{color:topicColor}}>{(()=>{const Preview=ICONS[topicIcon]??MessageCircle;return <Preview/>})()}<b>{topicName||'Новий розділ'}</b></span></div></section>
      </div>
      {status&&<p className={error?'status error':'status'}>{status}</p>}
    </section>:<>
      <div className="passkey-tools" aria-label="Захист гостьового профілю">
        {passkeyCount>0?<span>Passkey підключено · {passkeyCount}</span>:<span>Закріпи свій HEX, щоб не втратити його</span>}
        <div>
          {passkeyCount===0&&<button type="button" disabled={!user||busy} onClick={()=>void registerPasskey()}>Додати Passkey</button>}
          <button type="button" disabled={busy} onClick={()=>void loginWithPasskey()}>Відновити HEX через Passkey</button>
        </div>
      </div>
      <form className="composer" onSubmit={publishPost} aria-label="Нове повідомлення">
        <textarea ref={composerRef} value={message} onChange={e=>setMessage(e.target.value)} maxLength={180} disabled={!user||!profile||busy||cooldownActive}
          placeholder={!user?'Підключаємо анонімний профіль…':cooldownActive?`Наступне повідомлення через ${timerText}`:'Поділись думкою…'} aria-label="Твоє повідомлення"/>
        <div className="compose-row"><span className="counter">{message.length} / 180</span><button type="submit" disabled={!canPublish}>Опублікувати ↗</button></div>
        {status&&<div className={`status${error?' error':''}`} role="status" aria-live="polite">{status}</div>}
      </form>
      <section aria-label="Усі повідомлення">
        <div className="topics">{topics.map(item=>{const Icon=ICONS[item.icon]??MessageCircle;return <button key={item.id} type="button" className={`topic-btn${topic===item.id?' active':''}`} style={{'--topic-color':item.color} as CSSProperties} onClick={()=>updateTopic(item.id)}><Icon/>{item.label}</button>;})}</div>
        <div id="feed" aria-live="polite">
          {posts.length===0&&!loading?<div className="empty-state"><MessageCircle/><p>Тут поки тихо</p><span>Залиш першу думку в цьому розділі</span></div>:posts.map(post=><article className="post" key={post.id}>
            <div className="meta"><div className="identity"><span className="swatch" style={{backgroundColor:post.profile?.hex_login??'#aaa'}}/><span className="hex" style={{color:(post.profile?.is_admin||post.profile?.is_moderator)?post.profile.hex_login:'#111'}}>{post.profile?.hex_login?.toLowerCase()??'#??????'}</span></div><time dateTime={post.created_at}>{kyivInfo(post.created_at,post.post_number)}</time>
              {(profile?.is_admin||profile?.is_moderator)&&<button className="moderate-delete" type="button" aria-label="Видалити повідомлення" onClick={async()=>{try{await adminAction('delete_post',{postId:post.id});await loadPosts(true);}catch(e){setNotice(e instanceof Error?e.message:'Помилка',true);}}}><Trash2/></button>}
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
