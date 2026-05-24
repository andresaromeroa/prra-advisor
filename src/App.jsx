import { useState, useEffect, useRef, useReducer, useCallback } from "react";

// ── STORAGE ───────────────────────────────────────────────────────────────────
const KEY = 'prra_v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)||'null'); } catch { return null; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify({...s,ts:Date.now()})); } catch {} };
const clear = () => { try { localStorage.removeItem(KEY); } catch {} };

// ── DATE UTILS ────────────────────────────────────────────────────────────────
const addDays = (dateStr, n) => { const d=new Date(dateStr); d.setDate(d.getDate()+n); return d.toISOString().split('T')[0]; };
const daysLeft = (dl) => { if(!dl) return null; return Math.ceil((new Date(dl)-new Date())/(864e5)); };
const fmtDate = (s) => { if(!s) return ''; const d=new Date(s+'T12:00:00'); return d.toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric'}); };

// ── LANGUAGE DATA ─────────────────────────────────────────────────────────────
const LANGS = [
  {k:'en',f:'🇬🇧',l:'English'},{k:'es',f:'🇪🇸',l:'Español'},{k:'fr',f:'🇫🇷',l:'Français'},
  {k:'pt',f:'🇧🇷',l:'Português'},{k:'ar',f:'🇸🇦',l:'العربية'},{k:'hi',f:'🇮🇳',l:'हिन्दी'},
  {k:'pa',f:'🇮🇳',l:'ਪੰਜਾਬੀ'},{k:'zh',f:'🇨🇳',l:'中文'},{k:'uk',f:'🇺🇦',l:'Українська'},
  {k:'ru',f:'🇷🇺',l:'Русский'},{k:'tr',f:'🇹🇷',l:'Türkçe'},{k:'tl',f:'🇵🇭',l:'Filipino'},
  {k:'sw',f:'🇰🇪',l:'Kiswahili'},{k:'am',f:'🇪🇹',l:'አማርኛ'},{k:'fa',f:'🇮🇷',l:'فارسی'},
  {k:'ko',f:'🇰🇷',l:'한국어'},{k:'ro',f:'🇷🇴',l:'Română'},{k:'bn',f:'🇧🇩',l:'বাংলা'},
  {k:'ta',f:'🇱🇰',l:'தமிழ்'},{k:'so',f:'🇸🇴',l:'Soomaali'},{k:'ne',f:'🇳🇵',l:'नेपाली'},
  {k:'ur',f:'🇵🇰',l:'اردو'},{k:'si',f:'🇱🇰',l:'සිංහල'},{k:'ti',f:'🇪🇷',l:'ትግርኛ'},
];

const HELLOS = [
  {w:'Help',l:'English'},{w:'Ayuda',l:'Español'},{w:'Aide',l:'Français'},{w:'Ajuda',l:'Português'},
  {w:'مساعدة',l:'العربية'},{w:'मदद',l:'हिन्दी'},{w:'ਮਦਦ',l:'ਪੰਜਾਬੀ'},{w:'帮助',l:'中文'},
  {w:'Допомога',l:'Українська'},{w:'Помощь',l:'Русский'},{w:'Yardım',l:'Türkçe'},
  {w:'Tulong',l:'Filipino'},{w:'Usaidizi',l:'Kiswahili'},{w:'ድጋፍ',l:'አማርኛ'},
  {w:'کمک',l:'فارسی'},{w:'도움',l:'한국어'},{w:'Ajutor',l:'Română'},{w:'সাহায্য',l:'বাংলা'},
  {w:'உதவி',l:'தமிழ்'},{w:'Gargaar',l:'Soomaali'},{w:'मद्दत',l:'नेपाली'},
];

const LANGNAMES = {en:'English',es:'Spanish',fr:'French',pt:'Portuguese',ar:'Arabic',hi:'Hindi',pa:'Punjabi',zh:'Mandarin Chinese',uk:'Ukrainian',ru:'Russian',tr:'Turkish',tl:'Filipino/Tagalog',sw:'Swahili',am:'Amharic',fa:'Persian/Farsi',ko:'Korean',ro:'Romanian',bn:'Bengali',ta:'Tamil',so:'Somali',ne:'Nepali',ur:'Urdu',si:'Sinhala',ti:'Tigrinya'};

// ── UI TRANSLATIONS ───────────────────────────────────────────────────────────
const UI = {
  hello:{en:'Hello',es:'Hola',fr:'Bonjour',pt:'Olá',ar:'مرحباً',hi:'नमस्ते',pa:'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ',zh:'你好',uk:'Привіт',ru:'Привет',tr:'Merhaba',tl:'Kamusta',sw:'Habari',am:'ሰላም',fa:'سلام',ko:'안녕하세요',ro:'Bună',bn:'হ্যালো',ta:'வணக்கம்',so:'Salaan',ne:'नमस्कार',ur:'سلام',si:'හෙලෝ',ti:'ሰላም'},
  firstPRRA:{en:'First PRRA application',es:'Primera solicitud PRRA',fr:'Première demande PRRA',pt:'Primeira solicitação PRRA',ar:'طلب PRRA الأول',hi:'पहला PRRA आवेदन',zh:'第一次PRRA申请',uk:'Перша заявка PRRA',ru:'Первое заявление PRRA',tr:'İlk PRRA başvurusu',ko:'첫 번째 PRRA 신청',ro:'Prima cerere PRRA'},
  repeatPRRA:{en:'Repeat PRRA application',es:'Segunda solicitud PRRA',fr:'Deuxième demande PRRA',pt:'Segunda solicitação PRRA',ar:'طلب PRRA متكرر',hi:'दोबारा PRRA आवेदन',zh:'重复PRRA申请',uk:'Повторна заявка PRRA',ru:'Повторное заявление PRRA',tr:'Tekrar PRRA başvurusu',ko:'반복 PRRA 신청',ro:'A doua cerere PRRA'},
  day:{en:'day',es:'día',fr:'jour',pt:'dia',ar:'يوم',hi:'दिन',zh:'天',uk:'день',ru:'день',tr:'gün',tl:'araw',sw:'siku',ko:'일',ro:'zi'},
  days:{en:'days',es:'días',fr:'jours',pt:'dias',ar:'أيام',hi:'दिन',zh:'天',uk:'днів',ru:'дней',tr:'gün',tl:'araw',sw:'siku',ko:'일',ro:'zile'},
  deadlinePassed:{en:'DEADLINE PASSED — Contact CBSA immediately',es:'PLAZO VENCIDO — Contacta a la CBSA de inmediato',fr:'DATE LIMITE DÉPASSÉE — Contactez la CBSA immédiatement',pt:'PRAZO EXPIRADO — Contate a CBSA imediatamente',ar:'انتهى الموعد النهائي — اتصل بـ CBSA فوراً',hi:'समयसीमा बीत गई — तुरंत CBSA से संपर्क करें',zh:'截止日期已过 — 立即联系CBSA',uk:'ТЕРМІН ВИЙШОВ — Негайно зверніться до CBSA',ru:'СРОК ИСТЁК — Немедленно свяжитесь с CBSA',tr:'SON TARİH GEÇTİ — CBSA ile hemen iletişime geçin',ko:'기한 초과 — 즉시 CBSA에 연락하세요',ro:'TERMEN DEPĂȘIT — Contactați CBSA imediat'},
  urgent:{en:'URGENT — Act today',es:'URGENTE — Actúa hoy',fr:'URGENT — Agissez aujourd\'hui',pt:'URGENTE — Aja hoje',ar:'عاجل — تصرف اليوم',hi:'जरूरी — आज ही कार्य करें',zh:'紧急 — 今天就行动',uk:'ТЕРМІНОВО — Дійте сьогодні',ru:'СРОЧНО — Действуйте сегодня',tr:'ACİL — Bugün harekete geçin',ko:'긴급 — 오늘 행동하세요',ro:'URGENT — Acționați astăzi'},
  approaching:{en:'Deadline approaching',es:'Fecha límite próxima',fr:'Date limite proche',pt:'Prazo se aproximando',ar:'الموعد النهائي يقترب',hi:'समयसीमा नजदीक',zh:'截止日期临近',uk:'Термін наближається',ru:'Срок приближается',tr:'Son tarih yaklaşıyor',ko:'기한이 다가오고 있습니다',ro:'Termenul limită se apropie'},
  deadline:{en:'Deadline',es:'Fecha límite',fr:'Date limite',pt:'Prazo',ar:'الموعد النهائي',hi:'समयसीमा',zh:'截止日期',uk:'Термін',ru:'Срок',tr:'Son tarih',ko:'기한',ro:'Termen'},
  everyDay:{en:'Every day counts. Submit your application as soon as possible.',es:'Cada día cuenta. Envía tu solicitud lo antes posible.',fr:'Chaque jour compte. Soumettez votre demande dès que possible.',pt:'Cada dia conta. Envie sua solicitação o mais rápido possível.',ar:'كل يوم مهم. قدم طلبك في أقرب وقت ممكن.',hi:'हर दिन मायने रखता है। जल्द से जल्द आवेदन करें।',zh:'每一天都很重要。请尽快提交您的申请。',uk:'Кожен день важливий. Подайте заявку якомога швидше.',ru:'Каждый день важен. Подайте заявку как можно скорее.',tr:'Her gün önemli. Başvurunuzu mümkün olan en kısa sürede gönderin.',ko:'매일이 중요합니다. 가능한 빨리 신청서를 제출하세요.',ro:'Fiecare zi contează. Trimiteți cererea cât mai curând posibil.'},
  complete:{en:'% complete',es:'% completado',fr:'% complété',pt:'% concluído',ar:'% مكتمل',hi:'% पूर्ण',zh:'% 完成',uk:'% завершено',ru:'% выполнено',tr:'% tamamlandı',ko:'% 완료',ro:'% complet'},
  startOver:{en:'Start over',es:'Empezar de nuevo',fr:'Recommencer',pt:'Recomeçar',ar:'ابدأ من جديد',hi:'फिर से शुरू करें',zh:'重新开始',uk:'Почати знову',ru:'Начать заново',tr:'Yeniden başla',ko:'다시 시작',ro:'Începe de la capăt'},
  back:{en:'← Back',es:'← Atrás',fr:'← Retour',pt:'← Voltar',ar:'← رجوع',hi:'← वापस',zh:'← 返回',uk:'← Назад',ru:'← Назад',tr:'← Geri',ko:'← 뒤로',ro:'← Înapoi'},
  disclaimer:{
    en:'This tool provides information and process guidance only — not legal or immigration advice. For cases involving serious criminality, security inadmissibility, or other complex situations, consult a registered RCIC or immigration lawyer. Always verify information at',
    es:'Esta herramienta proporciona solo información y guía del proceso — no asesoría legal ni migratoria. Para casos con criminalidad grave u otras situaciones complejas, consulta un RCIC registrado o un abogado de inmigración. Verifica siempre la información en',
    fr:'Cet outil fournit uniquement des informations et des conseils de procédure — pas de conseils juridiques ou d\'immigration. Pour les cas complexes, consultez un RCIC enregistré ou un avocat en immigration. Vérifiez toujours les informations sur',
    pt:'Esta ferramenta fornece apenas informações e orientação de processo — não aconselhamento jurídico ou de imigração. Para casos complexos, consulte um RCIC registrado ou advogado de imigração. Sempre verifique as informações em',
    ar:'تقدم هذه الأداة معلومات وإرشادات فقط — وليس مشورة قانونية. للحالات المعقدة، استشر RCIC مسجلاً أو محامياً. تحقق دائماً من المعلومات على',
    hi:'यह टूल केवल जानकारी और मार्गदर्शन देता है — कानूनी सलाह नहीं। जटिल मामलों के लिए पंजीकृत RCIC या वकील से सलाह लें। हमेशा जानकारी की जांच करें',
    zh:'本工具仅提供信息和流程指导，不构成法律建议。复杂情况请咨询注册RCIC或移民律师。始终在以下网址验证信息：',
    uk:'Цей інструмент надає лише інформацію — не юридичні поради. Для складних справ зверніться до зареєстрованого RCIC або адвоката. Завжди перевіряйте інформацію на',
    ru:'Этот инструмент предоставляет только информацию — не юридические советы. По сложным делам проконсультируйтесь с RCIC или адвокатом. Всегда проверяйте информацию на',
    ko:'이 도구는 정보와 절차 안내만 제공하며, 법률 조언이 아닙니다. 복잡한 경우 등록된 RCIC 또는 변호사와 상담하세요. 항상 다음에서 정보를 확인하세요:',
    ro:'Acest instrument oferă doar informații — nu sfaturi juridice. Pentru cazuri complexe, consultați un RCIC înregistrat sau avocat. Verificați întotdeauna informațiile pe',
  },
};

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
const buildSys = (lang, profile) => `You are a warm, compassionate PRRA (Pre-Removal Risk Assessment) guide helping people in Canada who face removal. Respond in ${LANGNAMES[lang]||'English'}. Use simple, clear language. Avoid jargon.

USER PROFILE: Name: ${profile?.firstName||'?'} ${profile?.lastName||''} | Country: ${profile?.country||'?'} | First PRRA: ${profile?.isFirstPRRA?'Yes':'No'} | Deadline: ${profile?.deadline||'?'} | Method: ${profile?.notificationMethod||'?'}

PRRA KNOWLEDGE (canada.ca 2025):
WHAT IS PRRA: Protects people being removed from Canada from persecution, torture, cruel treatment, or risk to life. You can ONLY apply if CBSA notified you.
DEADLINES: 15 days if form received IN PERSON from CBSA. 22 days if received BY MAIL. Missing the deadline = deportation without review.
CRITICAL: If you leave Canada while waiting for a decision, application is automatically abandoned and rejected.
FIRST vs REPEAT: First PRRA = removal order is stayed (paused) automatically. Repeat PRRA = NO automatic stay.
EVIDENCE: If previous claim was rejected, you can ONLY submit NEW evidence — evidence that arose after the rejection, was not previously accessible, or could not reasonably have been presented before.
INADMISSIBILITY: If inadmissible for serious criminality (10+ year crime, 2+ year sentence), only torture/life risk/cruel treatment is assessed. NOT persecution.
12-MONTH WAIT: Must wait 12 months after: negative IRB decision, negative previous PRRA, abandoned/withdrawn claim, or Federal Court refusal. EXCEPTIONS: Iran (active exemption until Dec 2025), Venezuela (various periods), West Bank/Gaza, Afghanistan, and others — check canada.ca for current list.
FORMS: IMM 5508 = main PRRA application (given by CBSA in person, NOT downloadable). IMM 5476 = Use of Representative form (downloadable PDF, needed if anyone represents you). IMM 5475 = Authority to release info to designated individual.
THE 5 RISK QUESTIONS (must answer all in written submission): 1) Why at risk if returned? 2) What kind of risk? 3) How does it affect you DIRECTLY and PERSONALLY? 4) Could you escape by moving elsewhere in your country? 5) How does your situation compare to the general population?
SUBMISSION: Online via Canada Post Connect (recommended — faster, timestamps immediately). OR mail to: IRCC - Humanitarian Migration - Vancouver, #300-800 Burrard Street, Vancouver BC V6Z 0B6. Documents must be in English or French. PDFs max 25MB each.
TRANSLATIONS: Every document not in English/French needs: certified translation + translator declaration (name, original language, accuracy statement). Family members cannot translate.
HEARING: Only scheduled if credibility issue needs addressing. Virtual via Microsoft Teams. Must join 15 min early. Missing 2nd hearing = application abandoned = deportation.
WORK: First PRRA + on-time submission: can apply for work permit. Repeat PRRA: cannot work legally in Canada.
HEALTH: May qualify for Interim Federal Health Program (IFHP) coverage while waiting.
DECISION: Positive = become "protected person" → can apply for Permanent Residence. Negative = must leave; can apply to Federal Court for review but must still leave unless court grants a stay.
COST: Applying for PRRA is FREE. Hiring an RCIC consultant or lawyer costs money — not required.
DISCLAIMER: Always add that you provide information only, not legal advice. For serious criminality or security inadmissibility, recommend consulting a registered RCIC or immigration lawyer.
Keep responses concise, warm, practical. Max 4-5 paragraphs or bullet points.`;

// ── API ───────────────────────────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

const callAPI = async (messages, sys) => {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1200,system:sys,messages})
  });
  const d = await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || '';
};

// ── GLOBAL STYLE ──────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Inter:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#f2ede6;font-family:'Inter',sans-serif}
:root{
  --ink:#1c2533;--ink2:#4a5568;--ink3:#94a3b8;
  --navy:#1e3a5c;--navy2:#132740;--navyl:#dce8f5;
  --teal:#1a5c52;--tealp:#d4ede9;
  --amber:#b45309;--amberp:#fef3cd;
  --red:#b91c1c;--redp:#fee2e2;
  --bg:#f2ede6;--paper:#ffffff;--paper2:#f8f5f0;
  --brd:#e0d8cc;--r:14px;
}
.fi{animation:fi .3s ease both}@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.sl{animation:sl .25s ease both}@keyframes sl{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}
button:focus-visible{outline:2px solid var(--navy);outline-offset:2px}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#c8bfb0;border-radius:2px}
input,textarea,select{font-family:'Inter',sans-serif}
`;

// ── HELPERS ───────────────────────────────────────────────────────────────────
const Btn = ({children,onClick,disabled,variant='primary',style={}}) => {
  const base = {fontFamily:'Inter,sans-serif',fontWeight:600,fontSize:14,borderRadius:10,padding:'11px 20px',border:'none',cursor:disabled?'not-allowed':'pointer',transition:'all .18s',...style};
  const vars = {
    primary:{background:disabled?'#bbb':'var(--navy)',color:'#fff'},
    secondary:{background:'none',border:'1.5px solid var(--brd)',color:'var(--ink2)'},
    danger:{background:'var(--redp)',color:'var(--red)',border:'1.5px solid #fca5a5'},
    success:{background:'var(--tealp)',color:'var(--teal)',border:'1.5px solid #86c9b8'},
  };
  return <button onClick={disabled?null:onClick} disabled={disabled} style={{...base,...vars[variant]}}>{children}</button>;
};

// ── COUNTDOWN ─────────────────────────────────────────────────────────────────
function Countdown({deadline, lang}) {
  const u = (k) => UI[k]?.[lang] || UI[k]?.en || '';
  const n = daysLeft(deadline);
  if(n===null) return null;
  const [bg,bc,tc] = n<=3?['#fee2e2','#fca5a5','var(--red)']:n<=7?['#fef3cd','#fcd34d','var(--amber)']:['var(--tealp)','#86c9b8','var(--teal)'];
  return (
    <div style={{background:bg,border:`2px solid ${bc}`,borderRadius:14,padding:'18px 22px',marginBottom:18,display:'flex',alignItems:'center',gap:20}}>
      <div style={{textAlign:'center',flexShrink:0}}>
        <div style={{fontFamily:'Playfair Display,serif',fontSize:52,lineHeight:1,color:tc,fontWeight:700}}>{Math.max(0,n)}</div>
        <div style={{color:tc,fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.5px'}}>{n===1?u('day'):u('days')}</div>
      </div>
      <div>
        <div style={{color:tc,fontWeight:700,fontSize:15,marginBottom:3}}>{n<=0?u('deadlinePassed'):n<=3?u('urgent'):n<=7?u('approaching'):u('deadline')}</div>
        <div style={{color:tc,fontSize:13,opacity:.85}}>{fmtDate(deadline)}</div>
        {n>0&&n<=15&&<div style={{color:tc,fontSize:12,marginTop:4,opacity:.75}}>{u('everyDay')}</div>}
      </div>
    </div>
  );
}

// ── LANGUAGE SELECT ───────────────────────────────────────────────────────────
function LangScreen({onSelect}) {
  const [idx,setIdx] = useState(0);
  const [vis,setVis] = useState(true);
  useEffect(()=>{const t=setInterval(()=>{setVis(false);setTimeout(()=>{setIdx(i=>(i+1)%HELLOS.length);setVis(true);},300);},2000);return()=>clearInterval(t);},[]);
  const g = HELLOS[idx];
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(155deg,#0d2137 0%,#1e3a5c 50%,#1a5c52 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 20px'}}>
      <style>{CSS}</style>
      <div style={{textAlign:'center',marginBottom:44,minHeight:130,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <div style={{opacity:vis?1:0,transform:vis?'translateY(0) scale(1)':'translateY(-10px) scale(.95)',transition:'all .3s ease'}}>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'clamp(56px,11vw,88px)',color:'#fff',fontWeight:700,lineHeight:1}}>{g.w}</div>
          <div style={{color:'rgba(255,255,255,.38)',fontSize:13,marginTop:8,letterSpacing:'3px',textTransform:'uppercase'}}>{g.l}</div>
        </div>
      </div>
      <div style={{marginBottom:32,textAlign:'center'}}>
        <div style={{color:'rgba(255,255,255,.9)',fontSize:17,fontWeight:600,marginBottom:4}}>⚖️ PRRA Guide · Canada</div>
        <div style={{color:'rgba(255,255,255,.4)',fontSize:13}}>Pre-Removal Risk Assessment · Free information tool</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(128px,1fr))',gap:7,maxWidth:620,width:'100%',marginBottom:32}}>
        {LANGS.map(({k,f,l})=>(
          <button key={k} onClick={()=>onSelect(k)}
            style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.14)',borderRadius:10,padding:'9px 12px',color:'#fff',fontFamily:'Inter,sans-serif',fontSize:12.5,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:7,transition:'all .17s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.2)';e.currentTarget.style.borderColor='rgba(255,255,255,.4)';e.currentTarget.style.transform='translateY(-1px)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.08)';e.currentTarget.style.borderColor='rgba(255,255,255,.14)';e.currentTarget.style.transform='none';}}>
            <span style={{fontSize:17}}>{f}</span><span>{l}</span>
          </button>
        ))}
      </div>
      <p style={{color:'rgba(255,255,255,.22)',fontSize:11,textAlign:'center',maxWidth:380,lineHeight:1.6}}>This tool provides information only — not legal advice. Always verify at canada.ca. For complex cases, consult a registered RCIC or immigration lawyer.</p>
    </div>
  );
}

// ── RESUME ────────────────────────────────────────────────────────────────────
function ResumeScreen({saved, onResume, onRestart}) {
  const n = daysLeft(saved?.profile?.deadline);
  const [bg,tc] = n!==null&&n<=3?['var(--redp)','var(--red)']:n!==null&&n<=7?['var(--amberp)','var(--amber)']:['var(--tealp)','var(--teal)'];
  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 20px'}}>
      <style>{CSS}</style>
      <div className="fi" style={{background:'var(--paper)',borderRadius:18,padding:'36px 32px',maxWidth:460,width:'100%',boxShadow:'0 4px 28px rgba(30,58,92,.1)'}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:44,marginBottom:12}}>📋</div>
          <h2 style={{fontFamily:'Playfair Display,serif',fontSize:26,color:'var(--ink)',marginBottom:6}}>Welcome back</h2>
          <p style={{color:'var(--ink2)',fontSize:15}}>{saved?.profile?.firstName?`${saved.profile.firstName}, your`:'Your'} progress is saved.</p>
        </div>
        {n!==null&&(
          <div style={{background:bg,borderRadius:11,padding:'14px 18px',textAlign:'center',marginBottom:22}}>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:32,color:tc,fontWeight:700}}>{Math.max(0,n)} {n===1?'day':'days'} remaining</div>
            <div style={{color:tc,fontSize:13,opacity:.8}}>Deadline: {fmtDate(saved.profile.deadline)}</div>
          </div>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <Btn onClick={onResume} style={{padding:'14px',fontSize:15,width:'100%'}}>Continue where I left off →</Btn>
          <Btn onClick={onRestart} variant="secondary" style={{padding:'12px',fontSize:14,width:'100%'}}>Start over (new application)</Btn>
        </div>
      </div>
    </div>
  );
}

// ── DIAGNOSIS ─────────────────────────────────────────────────────────────────
const DQ = [
  {id:'firstName',type:'text',
    q:{en:'What is your first name?',es:'¿Cuál es tu nombre?',fr:'Quel est votre prénom?',pt:'Qual é o seu primeiro nome?',ar:'ما اسمك الأول؟',hi:'आपका पहला नाम क्या है?',zh:'您的名字是什么？',uk:'Як вас звати?',ru:'Как вас зовут?',tr:'Adınız nedir?',tl:'Ano ang iyong pangalan?',sw:'Jina lako ni nani?',ko:'이름이 무엇인가요?',ro:'Care este prenumele dvs.?'},
    ph:{en:'First name',es:'Nombre',fr:'Prénom',pt:'Primeiro nome',ar:'الاسم الأول',hi:'पहला नाम',zh:'名字',uk:'Ім\'я',ru:'Имя',tr:'Ad',tl:'Pangalan',sw:'Jina',ko:'이름',ro:'Prenume'}},
  {id:'lastName',type:'text',
    q:{en:'And your last name?',es:'¿Y tu apellido?',fr:'Et votre nom de famille?',pt:'E seu sobrenome?',ar:'وما اسم العائلة؟',hi:'और आपका उपनाम?',zh:'您的姓氏？',uk:'Прізвище?',ru:'Фамилия?',tr:'Ve soyadınız?',ko:'성은요?',ro:'Și numele de familie?'},
    ph:{en:'Last name',es:'Apellido',fr:'Nom de famille',pt:'Sobrenome',ar:'اسم العائلة',hi:'उपनाम',zh:'姓氏',uk:'Прізвище',ru:'Фамилия',tr:'Soyad',ko:'성',ro:'Nume de familie'}},
  {id:'country',type:'text',
    q:{en:'What country are you originally from?',es:'¿De qué país eres originalmente?',fr:'De quel pays êtes-vous originaire?',pt:'De qual país você é?',ar:'من أي بلد أنت؟',hi:'आप मूल रूप से किस देश से हैं?',zh:'您来自哪个国家？',uk:'З якої ви країни?',ru:'Из какой вы страны?',tr:'Hangi ülkedensiniz?',ko:'어느 나라 출신이세요?',ro:'Din ce țară ești?'},
    ph:{en:'e.g. Mexico, Nigeria, Iran…',es:'ej. México, Nigeria, Irán…',fr:'ex. Mexique, Nigéria, Iran…'}},
  {id:'isFirstPRRA',type:'choice',
    q:{en:'Is this your first PRRA application?',es:'¿Es esta tu primera solicitud PRRA?',fr:'Est-ce votre première demande PRRA?',pt:'Esta é sua primeira solicitação PRRA?',ar:'هل هذا أول طلب PRRA لك؟',hi:'क्या यह आपका पहला PRRA आवेदन है?',zh:'这是您第一次申请PRRA吗？',uk:'Це ваша перша заявка на PRRA?',ru:'Это ваше первое заявление PRRA?',ko:'첫 번째 PRRA 신청인가요?',ro:'Aceasta este prima ta cerere PRRA?'},
    opts:[
      {v:true,e:'✅',l:{en:'Yes — first time',es:'Sí — primera vez',fr:'Oui — première fois',pt:'Sim — primeira vez',ar:'نعم — أول مرة',hi:'हाँ — पहली बार',zh:'是 — 第一次',uk:'Так — вперше',ru:'Да — первый раз',ko:'예 — 처음',ro:'Da — prima oară'}},
      {v:false,e:'🔄',l:{en:'No — I had a previous PRRA',es:'No — ya tuve una PRRA antes',fr:'Non — j\'ai déjà eu une PRRA',pt:'Não — já tive uma PRRA antes',ar:'لا — كان لدي طلب PRRA سابق',hi:'नहीं — मेरा पहले भी PRRA था',zh:'否 — 我之前有过PRRA',uk:'Ні — у мене вже була PRRA',ru:'Нет — у меня уже было PRRA',ko:'아니요 — 이전에 PRRA가 있었어요',ro:'Nu — am mai avut o PRRA'}}
    ]},
  {id:'notificationMethod',type:'choice',
    q:{en:'How did you receive the PRRA notification?',es:'¿Cómo recibiste la notificación PRRA?',fr:'Comment avez-vous reçu la notification PRRA?',pt:'Como você recebeu a notificação PRRA?',ar:'كيف تلقيت إشعار PRRA؟',hi:'आपको PRRA अधिसूचना कैसे मिली?',zh:'您如何收到PRRA通知？',uk:'Як ви отримали повідомлення PRRA?',ru:'Как вы получили уведомление PRRA?',ko:'PRRA 통보를 어떻게 받았나요?',ro:'Cum ați primit notificarea PRRA?'},
    opts:[
      {v:'inperson',e:'🏢',l:{en:'In person from a CBSA officer → 15 days to apply',es:'En persona de un oficial CBSA → 15 días para aplicar',fr:'En personne d\'un agent CBSA → 15 jours pour postuler',pt:'Pessoalmente de um agente CBSA → 15 dias para solicitar',ar:'شخصياً من ضابط CBSA ← 15 يوماً للتقديم',hi:'CBSA अधिकारी से व्यक्तिगत रूप से → 15 दिन',zh:'CBSA官员当面通知 → 15天申请期',uk:'Особисто від офіцера CBSA → 15 днів на подачу',ru:'Лично от офицера CBSA → 15 дней на подачу',ko:'CBSA 직원에게 직접 → 15일',ro:'Personal de la un ofițer CBSA → 15 zile'}},
      {v:'mail',e:'📬',l:{en:'By mail → 22 days to apply',es:'Por correo postal → 22 días para aplicar',fr:'Par courrier → 22 jours pour postuler',pt:'Por correio → 22 dias para solicitar',ar:'بالبريد ← 22 يوماً للتقديم',hi:'डाक द्वारा → 22 दिन',zh:'邮件通知 → 22天申请期',uk:'Поштою → 22 дні на подачу',ru:'По почте → 22 дня на подачу',ko:'우편으로 → 22일',ro:'Prin poștă → 22 zile'}}
    ]},
  {id:'notificationDate',type:'date',
    q:{en:'What date did you receive the notification?',es:'¿Qué fecha recibiste la notificación?',fr:'À quelle date avez-vous reçu la notification?',pt:'Em que data você recebeu a notificação?',ar:'ما التاريخ الذي تلقيت فيه الإشعار؟',hi:'आपको अधिसूचना किस तारीख को मिली?',zh:'您是哪天收到通知的？',uk:'Яку дату ви отримали повідомлення?',ru:'Какого числа вы получили уведомление?',ko:'통보를 받은 날짜가 언제인가요?',ro:'Ce dată ați primit notificarea?'},
    sub:{en:'This lets us calculate your exact deadline',es:'Esto nos permite calcular tu fecha límite exacta',fr:'Cela nous permet de calculer votre date limite exacte',pt:'Isso nos permite calcular seu prazo exato',ko:'정확한 마감일을 계산하는 데 사용됩니다',ro:'Aceasta ne permite să calculăm data limită exactă'}},
];

function Diagnosis({lang, onDone}) {
  const [idx,setIdx] = useState(0);
  const [ans,setAns] = useState({});
  const [txt,setTxt] = useState('');
  const [k,setK] = useState(0);
  const cur = DQ[idx];
  const T = useCallback((obj) => obj?.[lang]||obj?.en||'', [lang]);
  const next = (id, val) => {
    const na = {...ans,[id]:val};
    setAns(na); setTxt('');
    if(idx+1<DQ.length){setTimeout(()=>{setIdx(i=>i+1);setK(k=>k+1);},160);}
    else{
      const days = na.notificationMethod==='inperson'?15:22;
      const deadline = addDays(na.notificationDate, days);
      onDone({...na, deadline});
    }
  };
  const pct = Math.round((idx/DQ.length)*100);
  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',padding:'24px 16px',display:'flex',flexDirection:'column',alignItems:'center'}}>
      <div style={{width:'100%',maxWidth:540,height:4,background:'#d8d0c4',borderRadius:2,marginBottom:28}}>
        <div style={{height:4,width:`${pct}%`,background:'var(--navy)',borderRadius:2,transition:'width .35s ease'}}/>
      </div>
      {cur&&(
        <div className="sl" key={k} style={{background:'var(--paper)',borderRadius:18,padding:'32px 28px',maxWidth:540,width:'100%',boxShadow:'0 2px 24px rgba(30,58,92,.08)'}}>
          <div style={{fontSize:11,color:'var(--ink3)',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:10}}>{idx+1} / {DQ.length}</div>
          <h2 style={{fontFamily:'Playfair Display,serif',fontSize:'clamp(18px,3vw,23px)',color:'var(--ink)',marginBottom:cur.sub?6:22,lineHeight:1.35}}>{T(cur.q)}</h2>
          {cur.sub&&<p style={{color:'var(--ink2)',fontSize:13,marginBottom:18,lineHeight:1.55}}>{T(cur.sub)}</p>}
          {cur.type==='text'&&(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <input value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&txt.trim()&&next(cur.id,txt.trim())}
                placeholder={T(cur.ph)||''}
                style={{border:'2px solid var(--brd)',borderRadius:10,padding:'12px 15px',fontSize:15,color:'var(--ink)',background:'var(--paper2)',outline:'none',transition:'border-color .2s'}}
                onFocus={e=>e.target.style.borderColor='var(--navy)'} onBlur={e=>e.target.style.borderColor='var(--brd)'} autoFocus/>
              <Btn onClick={()=>txt.trim()&&next(cur.id,txt.trim())} disabled={!txt.trim()} style={{width:'100%',padding:'13px'}}>Continue →</Btn>
            </div>
          )}
          {cur.type==='date'&&(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <input type="date" value={txt} onChange={e=>setTxt(e.target.value)}
                style={{border:'2px solid var(--brd)',borderRadius:10,padding:'12px 15px',fontSize:15,color:'var(--ink)',background:'var(--paper2)',outline:'none'}}
                onFocus={e=>e.target.style.borderColor='var(--navy)'} onBlur={e=>e.target.style.borderColor='var(--brd)'} autoFocus/>
              <Btn onClick={()=>txt&&next(cur.id,txt)} disabled={!txt} style={{width:'100%',padding:'13px'}}>Continue →</Btn>
            </div>
          )}
          {cur.type==='choice'&&(
            <div style={{display:'flex',flexDirection:'column',gap:9}}>
              {cur.opts.map(o=>(
                <button key={String(o.v)} onClick={()=>next(cur.id,o.v)}
                  style={{background:'var(--paper2)',border:'2px solid var(--brd)',borderRadius:11,padding:'13px 16px',textAlign:'left',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:14,fontWeight:500,color:'var(--ink)',display:'flex',alignItems:'center',gap:12,transition:'all .15s',outline:'none'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--navy)';e.currentTarget.style.background='var(--navyl)';e.currentTarget.style.transform='translateX(3px)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--brd)';e.currentTarget.style.background='var(--paper2)';e.currentTarget.style.transform='none';}}>
                  <span style={{fontSize:19,flexShrink:0,width:26,textAlign:'center'}}>{o.e}</span>
                  <span>{T(o.l)}</span>
                </button>
              ))}
            </div>
          )}
          {idx>0&&<button onClick={()=>{setIdx(i=>i-1);setK(k=>k+1);}} style={{background:'none',border:'none',color:'var(--ink3)',fontFamily:'Inter,sans-serif',fontSize:12,cursor:'pointer',marginTop:14,padding:'4px 0'}}>← Back</button>}
        </div>
      )}
    </div>
  );
}

// ── CHECKLIST ─────────────────────────────────────────────────────────────────
const ITEMS = [
  {id:'imm5508',cat:'forms',icon:'📄',
    en:{t:'Form IMM 5508',d:'The main PRRA application form. Given to you IN PERSON by your CBSA officer. NOT downloadable online. Each family member 18+ needs their own copy.',tip:'Ask your CBSA officer for extra blank copies when they give you the kit.'},
    es:{t:'Formulario IMM 5508',d:'El formulario principal de solicitud PRRA. Te lo entrega EN PERSONA tu oficial de la CBSA. NO se puede descargar en línea. Cada familiar de 18+ necesita su propia copia.',tip:'Pide copias adicionales en blanco a tu oficial de la CBSA cuando te entreguen el kit.'},
    fr:{t:'Formulaire IMM 5508',d:'Le formulaire principal de demande PRRA. Remis EN PERSONNE par votre agent CBSA. NON téléchargeable en ligne. Chaque membre de la famille 18+ a besoin de sa propre copie.',tip:'Demandez des copies supplémentaires vierges à votre agent CBSA.'}},
  {id:'identity',cat:'docs',icon:'🪪',
    en:{t:'Identity documents (photocopies)',d:'Passport, national ID card, birth certificate, or any government-issued identity document. Bring originals and make clear photocopies of every page including cover.'},
    es:{t:'Documentos de identidad (fotocopias)',d:'Pasaporte, INE, cédula de identidad, acta de nacimiento, o cualquier documento de identidad gubernamental. Lleva originales y saca fotocopias claras de cada página incluyendo la portada.'},
    fr:{t:'Documents d\'identité (photocopies)',d:'Passeport, carte d\'identité nationale, acte de naissance, ou tout document d\'identité officiel. Apportez les originaux et faites des photocopies nettes de chaque page.'}},
  {id:'family',cat:'docs',icon:'👨‍👩‍👧',
    en:{t:'Family / relationship documents',d:'Marriage certificate, children\'s birth certificates, proof of common-law relationship. Required if family members are included in your application.'},
    es:{t:'Documentos familiares',d:'Acta de matrimonio, actas de nacimiento de hijos, prueba de unión libre. Necesarios si incluyes familiares en tu solicitud.'},
    fr:{t:'Documents familiaux',d:'Certificat de mariage, actes de naissance des enfants, preuve de relation de fait. Requis si des membres de la famille sont inclus dans votre demande.'}},
  {id:'translations',cat:'docs',icon:'🌐',
    en:{t:'Certified translations',d:'EVERY document not in English or French must have: (1) a copy of the original, (2) a certified/stamped translation, and (3) a translator declaration with their name, original language, and a statement that the translation is accurate. Family members CANNOT translate.',tip:'Documents without translations will not be considered — even if the content is important.'},
    es:{t:'Traducciones certificadas',d:'CADA documento que no esté en inglés o francés debe tener: (1) copia del original, (2) una traducción certificada/sellada, y (3) una declaración del traductor con su nombre, idioma original y confirmación de exactitud. Los familiares NO pueden traducir.',tip:'Los documentos sin traducción no serán considerados — aunque el contenido sea importante.'},
    fr:{t:'Traductions certifiées',d:'TOUT document non en anglais ou français doit avoir : (1) une copie de l\'original, (2) une traduction certifiée/tamponée, et (3) une déclaration du traducteur avec son nom, la langue originale et une attestation d\'exactitude. Les membres de la famille NE PEUVENT PAS traduire.',tip:'Les documents sans traduction ne seront pas pris en compte — même si le contenu est important.'}},
  {id:'riskletter',cat:'submissions',icon:'✍️',
    en:{t:'Written submissions (risk letter)',d:'Your letter answering the 5 official risk questions. This is THE most important document for your case — it explains why returning to your country puts you at risk. Use the Risk Letter Builder section to create it.',tip:'Be specific and personal. Generic answers are less convincing than concrete details from your own experience.'},
    es:{t:'Escrito de riesgos (carta)',d:'Tu carta respondiendo las 5 preguntas oficiales de riesgo. Este es EL documento más importante de tu caso — explica por qué regresar a tu país te pone en riesgo. Usa la sección Constructor de Carta de Riesgos para crearlo.',tip:'Sé específico y personal. Las respuestas genéricas convencen menos que detalles concretos de tu propia experiencia.'},
    fr:{t:'Observations écrites (lettre de risques)',d:'Votre lettre répondant aux 5 questions officielles sur les risques. C\'est LE document le plus important de votre dossier. Utilisez la section Rédacteur de Lettre de Risques pour la créer.',tip:'Soyez précis et personnel. Les réponses génériques sont moins convaincantes que des détails concrets de votre vécu.'}},
  {id:'country_docs',cat:'submissions',icon:'📰',
    en:{t:'Country condition evidence',d:'News articles, Amnesty International or Human Rights Watch reports, UN reports, government travel advisories — anything that shows conditions in your country create risk for people like you.'},
    es:{t:'Evidencia de condiciones del país',d:'Artículos de noticias, reportes de Amnistía Internacional o Human Rights Watch, reportes de la ONU, avisos de viaje del gobierno — todo lo que muestre que las condiciones en tu país crean riesgo para personas como tú.'},
    fr:{t:'Preuves sur les conditions du pays',d:'Articles de presse, rapports d\'Amnesty International ou de Human Rights Watch, rapports ONU, avis aux voyageurs — tout ce qui montre que les conditions dans votre pays créent un risque pour des personnes comme vous.'}},
  {id:'personal_docs',cat:'submissions',icon:'📁',
    en:{t:'Personal supporting documents',d:'Police reports, medical records, court documents, threatening letters or messages, photos of injuries, written testimonies from witnesses, personal letters. Any personal evidence that supports your specific risk.'},
    es:{t:'Documentos personales de apoyo',d:'Reportes policiales, expedientes médicos, documentos judiciales, cartas o mensajes de amenaza, fotos de lesiones, testimonios escritos de testigos, cartas personales. Toda evidencia personal que apoye tu riesgo específico.'},
    fr:{t:'Documents personnels de soutien',d:'Rapports de police, dossiers médicaux, documents judiciaires, lettres ou messages de menace, photos de blessures, témoignages écrits de témoins, lettres personnelles. Toute preuve personnelle appuyant votre risque spécifique.'}},
  {id:'imm5476',cat:'forms',icon:'👤',
    en:{t:'Form IMM 5476 (if you have a representative)',d:'Use of a Representative form. Needed if ANYONE helps you and acts on your behalf — paid or unpaid, family or friend. Generate it in the IMM 5476 section.',tip:'Even an unpaid friend or family member helping you act on your behalf requires this form.'},
    es:{t:'Formulario IMM 5476 (si tienes representante)',d:'Formulario de Uso de Representante. Necesario si ALGUIEN te ayuda y actúa en tu nombre — pagado o no, familiar o amigo. Genéralo en la sección IMM 5476.',tip:'Incluso un amigo o familiar no pagado que actúe en tu nombre requiere este formulario.'},
    fr:{t:'Formulaire IMM 5476 (si vous avez un représentant)',d:'Formulaire d\'utilisation d\'un représentant. Requis si quelqu\'un agit en votre nom — payé ou non, famille ou ami. Générez-le dans la section IMM 5476.',tip:'Même un ami ou un membre de la famille non rémunéré agissant en votre nom nécessite ce formulaire.'}},
];

function ChecklistScreen({lang, checklist, onChange}) {
  const T = (item) => item[lang]||item.en;
  const done = ITEMS.filter(i=>checklist[i.id]).length;
  const pct = Math.round((done/ITEMS.length)*100);
  const cats = [
    {k:'forms',l:'📋 Required Forms'},
    {k:'docs',l:'🗂️ Identity & Supporting Documents'},
    {k:'submissions',l:'✍️ Written Submissions & Evidence'},
  ];
  return (
    <div>
      <div style={{background:'var(--navyl)',borderRadius:12,padding:'14px 18px',marginBottom:18,display:'flex',alignItems:'center',gap:16}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:600,color:'var(--navy)',marginBottom:5,fontSize:14}}>{done} of {ITEMS.length} items ready</div>
          <div style={{height:6,background:'#b8cfe0',borderRadius:3,overflow:'hidden'}}>
            <div style={{height:6,width:`${pct}%`,background:'var(--navy)',borderRadius:3,transition:'width .5s ease'}}/>
          </div>
        </div>
        <div style={{fontFamily:'Playfair Display,serif',fontSize:30,color:'var(--navy)',fontWeight:700}}>{pct}%</div>
      </div>
      {cats.map(cat=>(
        <div key={cat.k} style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>{cat.l}</div>
          {ITEMS.filter(i=>i.cat===cat.k).map(item=>{
            const info=T(item);const isDone=checklist[item.id];
            return (
              <div key={item.id} onClick={()=>onChange(item.id,!isDone)}
                style={{background:isDone?'var(--tealp)':'var(--paper)',border:`1.5px solid ${isDone?'#86c9b8':'var(--brd)'}`,borderRadius:12,padding:'14px 16px',marginBottom:8,cursor:'pointer',transition:'all .18s',display:'flex',gap:13,alignItems:'flex-start'}}>
                <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${isDone?'var(--teal)':'#c8bfb0'}`,background:isDone?'var(--teal)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1,transition:'all .18s'}}>
                  {isDone&&<span style={{color:'#fff',fontSize:12,fontWeight:800}}>✓</span>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14,color:isDone?'var(--teal)':'var(--ink)',marginBottom:4,display:'flex',gap:8,alignItems:'center'}}>
                    <span>{item.icon}</span><span>{info.t}</span>
                  </div>
                  <p style={{fontSize:13,color:'var(--ink2)',lineHeight:1.6}}>{info.d}</p>
                  {info.tip&&<div style={{fontSize:12,color:'var(--amber)',fontWeight:600,marginTop:6,display:'flex',gap:5,alignItems:'flex-start'}}><span>💡</span><span>{info.tip}</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── RISK LETTER ───────────────────────────────────────────────────────────────
const RQS = [
  {id:'q1',
    en:'Why would you be at risk or in danger if returned to your country?',
    es:'¿Por qué estarías en riesgo o peligro si te regresan a tu país?',
    fr:'Pourquoi seriez-vous en danger si vous retourniez dans votre pays?',
    hint:{en:'Describe the specific group, authority, or situation that threatens you. Who threatens you and why?',es:'Describe el grupo específico, autoridad o situación que te amenaza. ¿Quién te amenaza y por qué?',fr:'Décrivez le groupe, l\'autorité ou la situation spécifique qui vous menace. Qui vous menace et pourquoi?'}},
  {id:'q2',
    en:'What kind of risks or danger would you face, and why?',
    es:'¿Qué tipo de riesgos o peligros enfrentarías, y por qué?',
    fr:'Quels types de risques ou de dangers rencontreriez-vous, et pourquoi?',
    hint:{en:'Be specific: physical harm, imprisonment, torture, death? What has already happened to you or others like you?',es:'Sé específico: ¿daño físico, encarcelamiento, tortura, muerte? ¿Qué ya te ha pasado a ti o a personas como tú?',fr:'Soyez précis : préjudices physiques, emprisonnement, torture, mort? Qu\'est-il déjà arrivé à vous ou à d\'autres personnes comme vous?'}},
  {id:'q3',
    en:'How do these risks concern you DIRECTLY and PERSONALLY?',
    es:'¿Cómo te afectan estos riesgos a TI directa y personalmente?',
    fr:'Comment ces risques vous concernent-ils DIRECTEMENT et PERSONNELLEMENT?',
    hint:{en:'This is critical. Explain specific incidents that happened TO YOU, threats you received, why YOU specifically are targeted.',es:'Esto es crítico. Explica incidentes específicos que TE pasaron a TI, amenazas que recibiste, por qué TÚ específicamente eres blanco.',fr:'C\'est crucial. Expliquez les incidents spécifiques qui vous sont arrivés À VOUS, les menaces que vous avez reçues, pourquoi VOUS spécifiquement êtes ciblé(e).'}},
  {id:'q4',
    en:'Could you escape these risks by moving to another city or region in your country?',
    es:'¿Podrías escapar de estos riesgos mudándote a otra ciudad o región de tu país?',
    fr:'Pourriez-vous échapper à ces risques en déménageant dans une autre ville ou région de votre pays?',
    hint:{en:'Explain why you cannot find safety by relocating within your country. Is the threat nationwide? From the government itself?',es:'Explica por qué no puedes encontrar seguridad reubicándote dentro de tu país. ¿La amenaza es a nivel nacional? ¿Del propio gobierno?',fr:'Expliquez pourquoi vous ne pouvez pas trouver la sécurité en vous déplaçant dans votre pays. La menace est-elle nationale? Vient-elle du gouvernement lui-même?'}},
  {id:'q5',
    en:'How does your situation compare to the rest of the population in your country?',
    es:'¿Cómo se compara tu situación con la del resto de la población de tu país?',
    fr:'Comment votre situation se compare-t-elle à celle du reste de la population de votre pays?',
    hint:{en:'Are you being singled out? Why is your risk greater than that of the general population? What makes your case unique?',es:'¿Te están señalando específicamente? ¿Por qué tu riesgo es mayor que el de la población general? ¿Qué hace tu caso único?',fr:'Êtes-vous spécifiquement ciblé(e)? Pourquoi votre risque est-il plus grand que celui de la population générale? Qu\'est-ce qui rend votre cas unique?'}},
];

function RiskLetterBuilder({lang, profile, riskLetter, onChange, apiKey}) {
  const [activeQ,setActiveQ] = useState(0);
  const [generating,setGenerating] = useState(false);
  const [letter,setLetter] = useState('');
  const [showLetter,setShowLetter] = useState(false);
  const [copied,setCopied] = useState(false);
  const T = (obj) => obj?.[lang]||obj?.en||'';
  const answered = RQS.filter(q=>riskLetter[q.id]?.trim()).length;

  const generate = async() => {
    setGenerating(true);
    const content = RQS.map((q,i)=>`Q${i+1}: ${q.en}\nAnswer: ${riskLetter[q.id]||'(not provided)'}`).join('\n\n');
    const prompt = `The following are a PRRA applicant's answers to the 5 official risk questions. Write a complete, professional written submission letter in formal English, addressed "Dear Officer,". The letter should: be well-organized with clear structure, address all 5 questions comprehensively, present the information compellingly but honestly, use formal but clear language, and be formatted for submission to IRCC. Expand thoughtfully on what's provided. End with a professional closing. Do not add false information — only expand on what's given.\n\nApplicant country of origin: ${profile?.country||'unknown'}\n\n${content}`;
    try {
      const text = await callAPI([{role:'user',content:prompt}], buildSys(lang,profile));
      setLetter(text);
      setShowLetter(true);
    } catch(e) { console.error(e); }
    setGenerating(false);
  };

  const copyLetter = () => {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  };

  if(showLetter) return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <h3 style={{fontFamily:'Playfair Display,serif',fontSize:19,color:'var(--ink)'}}>Your Written Submission</h3>
        <Btn onClick={()=>setShowLetter(false)} variant="secondary" style={{padding:'7px 14px',fontSize:13}}>← Edit</Btn>
      </div>
      <div style={{background:'var(--amberp)',borderRadius:10,padding:'12px 16px',marginBottom:14,fontSize:13,color:'var(--amber)',lineHeight:1.6}}>
        <strong>⚠️ Before submitting:</strong> Review carefully. Correct any inaccuracies. Add details you didn't include in your answers. This letter must reflect your true situation. If any information is wrong, fix it before submitting.
      </div>
      <div style={{background:'var(--paper)',border:'1px solid var(--brd)',borderRadius:12,padding:'24px',marginBottom:14,lineHeight:1.8,fontSize:14,color:'var(--ink)',whiteSpace:'pre-wrap',fontFamily:'Georgia,serif',maxHeight:500,overflowY:'auto'}}>{letter}</div>
      <div style={{display:'flex',gap:10}}>
        <Btn onClick={copyLetter} variant={copied?'success':'primary'} style={{flex:1,padding:'12px'}}>{copied?'✓ Copied!':'📋 Copy to clipboard'}</Btn>
        <Btn onClick={()=>{const b=new Blob([letter],{type:'text/plain'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='PRRA_Written_Submission.txt';a.click();}} variant="secondary" style={{flex:1,padding:'12px'}}>💾 Download .txt</Btn>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{background:'var(--navyl)',borderRadius:12,padding:'14px 18px',marginBottom:18,fontSize:13,color:'var(--navy)',lineHeight:1.65}}>
        Answer all 5 questions below in as much detail as possible, in any language. The AI will write a complete professional letter in English for you to review and submit. <strong>Be specific and personal</strong> — this is the most important document in your application.
      </div>
      <div style={{display:'flex',gap:6,marginBottom:18,flexWrap:'wrap'}}>
        {RQS.map((q,i)=>(
          <button key={q.id} onClick={()=>setActiveQ(i)}
            style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${activeQ===i?'var(--navy)':riskLetter[q.id]?.trim()?'var(--teal)':'var(--brd)'}`,background:activeQ===i?'var(--navy)':riskLetter[q.id]?.trim()?'var(--tealp)':'var(--paper)',color:activeQ===i?'#fff':riskLetter[q.id]?.trim()?'var(--teal)':'var(--ink2)',fontFamily:'Inter,sans-serif',fontSize:13,fontWeight:600,cursor:'pointer',outline:'none'}}>
            Q{i+1}{riskLetter[q.id]?.trim()?' ✓':''}
          </button>
        ))}
      </div>
      {RQS.map((q,i)=>i===activeQ&&(
        <div key={q.id} className="sl">
          <div style={{fontWeight:700,fontSize:13,color:'var(--navy)',marginBottom:6,textTransform:'uppercase',letterSpacing:'1px'}}>Question {i+1} of 5</div>
          <p style={{fontSize:15,color:'var(--ink)',marginBottom:8,lineHeight:1.55,fontStyle:'italic',fontFamily:'Playfair Display,serif'}}>"{T(q)}"</p>
          <div style={{background:'var(--amberp)',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12.5,color:'var(--amber)',lineHeight:1.6}}>
            💡 {T(q.hint)}
          </div>
          <textarea value={riskLetter[q.id]||''} onChange={e=>onChange(q.id,e.target.value)}
            rows={6} placeholder="Write in any language — be as detailed and specific as possible..."
            style={{width:'100%',border:'2px solid var(--brd)',borderRadius:10,padding:'12px 14px',fontSize:14,color:'var(--ink)',lineHeight:1.65,resize:'vertical',background:'var(--paper)',outline:'none',transition:'border-color .2s',fontFamily:'Inter,sans-serif'}}
            onFocus={e=>e.target.style.borderColor='var(--navy)'} onBlur={e=>e.target.style.borderColor='var(--brd)'}/>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:12,gap:10}}>
            {i>0?<Btn onClick={()=>setActiveQ(i-1)} variant="secondary" style={{padding:'9px 16px'}}>← Prev</Btn>:<div/>}
            {i<4
              ?<Btn onClick={()=>setActiveQ(i+1)} style={{padding:'9px 16px'}}>Next →</Btn>
              :<Btn onClick={generate} disabled={generating||answered<3} variant={generating||answered<3?'secondary':'primary'} style={{padding:'9px 18px'}}>
                {generating?'Generating…':'✨ Generate letter'}
              </Btn>
            }
          </div>
          {i===4&&answered<3&&<p style={{color:'var(--red)',fontSize:12,marginTop:8}}>Answer at least 3 questions before generating.</p>}
        </div>
      ))}
    </div>
  );
}

// ── IMM 5476 ──────────────────────────────────────────────────────────────────
function IMM5476({lang, profile, data, onChange}) {
  const fields = [
    {id:'appLast',label:'Applicant — Last name (family name)',dflt:profile?.lastName||''},
    {id:'appFirst',label:'Applicant — First/given name(s)',dflt:profile?.firstName||''},
    {id:'appDOB',label:'Applicant — Date of birth',type:'date'},
    {id:'appEmail',label:'Applicant — Email address',type:'email'},
    {id:'appUCI',label:'Applicant — UCI / Client ID',ph:'Leave blank if you don\'t have one yet'},
    {id:'appType',label:'Type of application',dflt:'Pre-Removal Risk Assessment (PRRA)'},
    {id:'repType',label:'Representative type',type:'select',opts:[{v:'unpaid',l:'Unpaid — friend, family, or community member (no fee charged)'},{v:'cicc',l:'Paid — CICC member (immigration consultant)'},{v:'lawyer',l:'Paid — Lawyer / member of a Canadian law society'},{v:'notary',l:'Paid — Quebec notary (Chambre des notaires du Québec)'}]},
    {id:'repName',label:'Representative — Full name (as on official membership list if paid)'},
    {id:'repMember',label:'Representative — Membership / registration ID',ph:'Leave blank if unpaid representative'},
    {id:'repOrg',label:'Representative — Organization or firm name',ph:'Optional'},
    {id:'repAddress',label:'Representative — Full address'},
    {id:'repPhone',label:'Representative — Phone number'},
    {id:'repEmail',label:'Representative — Email address'},
  ];

  const printForm = () => {
    const d = {...data};
    const repTypeLabel = {unpaid:'Unpaid representative (friend, family, or community member)',cicc:'Paid — CICC member (immigration consultant)',lawyer:'Paid — Lawyer / Canadian law society member',notary:'Paid — Quebec notary (Chambre des notaires du Québec)'}[d.repType||'unpaid']||'';
    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>IMM 5476 – Use of a Representative</title>
    <style>body{font-family:Arial,sans-serif;font-size:11.5px;color:#000;margin:24px;max-width:760px}
    h1{font-size:15px;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:6px}
    .subtitle{font-size:11px;color:#555;margin-bottom:18px}
    h2{font-size:12px;background:#e0e0e0;padding:5px 10px;margin:16px 0 8px;font-weight:bold}
    .field{margin-bottom:9px}.label{font-weight:bold;font-size:10.5px;color:#333;margin-bottom:2px}
    .val{border-bottom:1.5px solid #555;min-height:20px;padding:2px 4px;font-size:12.5px}
    .sig{border:1px solid #000;height:55px;margin-top:4px}
    .note{font-size:10px;color:#555;border:1px solid #bbb;padding:10px;margin-top:20px;line-height:1.5}
    .chk{border:1.5px solid #c00;padding:6px 10px;font-size:11px;color:#c00;margin:10px 0;font-weight:bold}
    @media print{body{margin:8px}}</style></head><body>
    <h1>Use of a Representative — IMM 5476 (November 2025)</h1>
    <div class="subtitle">Government of Canada · Immigration, Refugees and Citizenship Canada (IRCC)</div>
    <div class="chk">☑ Appointing a representative</div>
    <h2>Section A — Applicant Information</h2>
    <div class="field"><div class="label">1. Last name (Surname / Family name) and Given name(s)</div><div class="val">${d.appLast||profile?.lastName||''} &nbsp;&nbsp; ${d.appFirst||profile?.firstName||''}</div></div>
    <div class="field"><div class="label">2. Date of birth</div><div class="val">${d.appDOB||''}</div></div>
    <div class="field"><div class="label">3. Email address / Other contact</div><div class="val">${d.appEmail||profile?.email||''}</div></div>
    <div class="field"><div class="label">4. Type of application submitted</div><div class="val">${d.appType||'Pre-Removal Risk Assessment (PRRA)'}</div></div>
    <div class="field"><div class="label">5. UCI / Client ID (if known)</div><div class="val">${d.appUCI||''}</div></div>
    <h2>Section B — Representative Information</h2>
    <div class="field"><div class="label">6. Representative full name</div><div class="val">${d.repName||''}</div></div>
    <div class="field"><div class="label">7. Type of representative</div><div class="val">${repTypeLabel}</div></div>
    <div class="field"><div class="label">Membership / Registration ID (if paid representative)</div><div class="val">${d.repMember||'N/A — Unpaid representative'}</div></div>
    <div class="field"><div class="label">Organization / Firm</div><div class="val">${d.repOrg||''}</div></div>
    <div class="field"><div class="label">8. Representative address</div><div class="val">${d.repAddress||''}</div></div>
    <div class="field"><div class="label">Phone</div><div class="val">${d.repPhone||''}</div></div>
    <div class="field"><div class="label">Email</div><div class="val">${d.repEmail||''}</div></div>
    <h2>Section B — Representative Declaration (signed by representative)</h2>
    <p style="font-size:11px;margin-bottom:8px">I accept to represent the applicant named above and to conduct business on their behalf with Immigration, Refugees and Citizenship Canada (IRCC) and the Canada Border Services Agency (CBSA) in connection with the application identified above.</p>
    <div class="field"><div class="label">Representative signature</div><div class="sig"></div></div>
    <div class="field"><div class="label">Date signed</div><div class="val">&nbsp;</div></div>
    <h2>Section E — Applicant Declaration (signed by applicant)</h2>
    <p style="font-size:11px;margin-bottom:8px">I authorize the above-named person to act as my representative and to conduct business on my behalf with IRCC and CBSA. I understand that all correspondence from IRCC and CBSA will be sent to my representative and not to me directly.</p>
    <div class="field"><div class="label">Applicant signature (or typed name)</div><div class="sig"></div></div>
    <div class="field"><div class="label">Date signed</div><div class="val">&nbsp;</div></div>
    <div class="note"><strong>IMPORTANT:</strong> This form was pre-filled using the PRRA Guide tool. Verify all information is accurate before signing. Both the applicant and representative must sign. Submit with your PRRA application via Canada Post Connect or by mail to: IRCC – Humanitarian Migration – Vancouver, #300-800 Burrard Street, Vancouver BC V6Z 0B6. Official form: IMM 5476 (11-2025). Verify the latest version at canada.ca.</div>
    </body></html>`);
    w.document.close(); setTimeout(()=>w.print(),400);
  };

  return (
    <div>
      <div style={{background:'var(--navyl)',borderRadius:12,padding:'14px 18px',marginBottom:18,fontSize:13,color:'var(--navy)',lineHeight:1.65}}>
        <strong>IMM 5476 — Use of a Representative</strong><br/>
        Complete the fields below and click Print / Save as PDF. Both you and your representative must sign it by hand before including it with your PRRA application.
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:13}}>
        {fields.map(f=>(
          <div key={f.id}>
            <label style={{display:'block',fontSize:11.5,fontWeight:700,color:'var(--ink2)',marginBottom:5,letterSpacing:'0.5px'}}>{f.label}</label>
            {f.type==='select'
              ?<select value={data[f.id]||'unpaid'} onChange={e=>onChange(f.id,e.target.value)}
                  style={{width:'100%',border:'2px solid var(--brd)',borderRadius:8,padding:'10px 12px',fontSize:14,color:'var(--ink)',background:'var(--paper)',outline:'none',fontFamily:'Inter,sans-serif'}}
                  onFocus={e=>e.target.style.borderColor='var(--navy)'} onBlur={e=>e.target.style.borderColor='var(--brd)'}>
                  {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              :<input type={f.type||'text'} value={data[f.id]||(f.dflt||'')} onChange={e=>onChange(f.id,e.target.value)}
                  placeholder={f.ph||''}
                  style={{width:'100%',border:'2px solid var(--brd)',borderRadius:8,padding:'10px 12px',fontSize:14,color:'var(--ink)',background:'var(--paper)',outline:'none',transition:'border-color .2s'}}
                  onFocus={e=>e.target.style.borderColor='var(--navy)'} onBlur={e=>e.target.style.borderColor='var(--brd)'}/>
            }
          </div>
        ))}
      </div>
      <Btn onClick={printForm} style={{width:'100%',padding:'14px',marginTop:22,fontSize:15}}>🖨️ Print / Save as PDF</Btn>
      <p style={{fontSize:12,color:'var(--ink3)',textAlign:'center',marginTop:8,lineHeight:1.5}}>After printing, sign by hand. Your representative must also sign. Then include it with your IMM 5508 application.</p>
    </div>
  );
}

// ── SUBMISSION GUIDE ──────────────────────────────────────────────────────────
function SubmissionGuide() {
  const [method,setMethod] = useState(null);
  const guides = {
    online:[
      {n:1,t:'Sign up for Canada Post Connect',d:'Go to the IRCC Connect signup form at canada.ca. Provide your full name (as on passport), UCI/Client ID, and email. Allow 1 business day to receive your account. Sign up at least 5 days before your deadline.',link:'https://forms-formulaires.alpha.canada.ca/en/id/cm7aryep1004qyo6ag3bfarzc'},
      {n:2,t:'Convert everything to PDF',d:'All documents must be in PDF format. Each file must be under 25MB. If a file is larger, split it into parts (e.g., Evidence_Part1.pdf, Evidence_Part2.pdf).'},
      {n:3,t:'Send via your Connect account',d:'Log in and attach your documents. The timestamp in Connect is your official submission time — this is what matters for your deadline. Do NOT submit the same documents again by mail.'},
      {n:4,t:'Monitor your Connect inbox daily',d:'Check your Connect inbox AND your email spam folder regularly. IRCC will contact you through Connect for hearings, additional requests, or their decision.'},
    ],
    mail:[
      {n:1,t:'Use a 9" × 12" (23 × 30.5 cm) envelope',d:'Print your full name and address clearly in the top left corner. Do NOT use staples, binders, plastic sleeves, or folders inside. Paper clips or elastic bands are OK.'},
      {n:2,t:'Address the envelope correctly',d:'Send to: IRCC — Humanitarian Migration — Vancouver\n#300 - 800 Burrard Street\nVancouver, BC  V6Z 0B6'},
      {n:3,t:'Use tracked mail / courier',d:'Use Canada Post with tracking, or a courier service. The envelope needs extra postage — have the post office weigh it. Keep your tracking receipt as proof of mailing.'},
      {n:4,t:'Mail well before your deadline',d:'Mail delivery time counts against your deadline. If you have 5 days left, mail TODAY or use a courier. IRCC must receive your application before the deadline — not just postmarked.'},
    ],
  };
  return (
    <div>
      <div style={{background:'var(--amberp)',borderRadius:12,padding:'13px 17px',marginBottom:18,fontSize:13,color:'var(--amber)',lineHeight:1.65,fontWeight:600}}>
        ⚠️ IRCC must RECEIVE your application before your deadline — not just send it. Online is faster and timestamps immediately.
      </div>
      <div style={{display:'flex',gap:10,marginBottom:20}}>
        {[{k:'online',e:'💻',l:'Online via Connect (Recommended)'},{k:'mail',e:'📮',l:'By Mail'}].map(({k,e,l})=>(
          <button key={k} onClick={()=>setMethod(k)}
            style={{flex:1,padding:'13px',borderRadius:11,border:`2px solid ${method===k?'var(--navy)':'var(--brd)'}`,background:method===k?'var(--navy)':'var(--paper)',color:method===k?'#fff':'var(--ink2)',fontFamily:'Inter,sans-serif',fontWeight:600,fontSize:13.5,cursor:'pointer',outline:'none'}}>
            {e} {l}
          </button>
        ))}
      </div>
      {method&&(guides[method]||[]).map((s,i)=>(
        <div key={i} className="fi" style={{background:'var(--paper)',border:'1.5px solid var(--brd)',borderRadius:12,padding:'15px',marginBottom:10,display:'flex',gap:13}}>
          <div style={{width:30,height:30,borderRadius:'50%',background:'var(--navy)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,flexShrink:0}}>{s.n}</div>
          <div>
            <div style={{fontWeight:600,color:'var(--ink)',marginBottom:4,fontSize:14}}>{s.t}</div>
            <div style={{fontSize:13,color:'var(--ink2)',lineHeight:1.65,whiteSpace:'pre-line'}}>{s.d}</div>
            {s.link&&<a href={s.link} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:8,color:'var(--navy)',fontSize:13,fontWeight:600}}>Open Connect signup form →</a>}
          </div>
        </div>
      ))}
      {!method&&<div style={{textAlign:'center',color:'var(--ink3)',padding:'40px 0',fontSize:14}}>Select a submission method above</div>}
    </div>
  );
}

// ── HEARING GUIDE ─────────────────────────────────────────────────────────────
function HearingGuide() {
  const steps = [
    {e:'📬',t:'Receive your hearing notification',d:'You\'ll get a letter via Connect or mail with the date, time, and issues to be addressed. Read it carefully and note the deadline to request an interpreter or observers.'},
    {e:'💻',t:'Download and test Microsoft Teams',d:'All hearings are virtual via Microsoft Teams. Download the app and test your camera, microphone, and internet connection BEFORE the hearing day. Join a test meeting if possible.'},
    {e:'🌐',t:'Request an interpreter if needed',d:'If you need an interpreter, fill in the interpreter request form included with your hearing notification and submit it promptly. The officer MUST arrange an interpreter for you — this is your right.'},
    {e:'👤',t:'Confirm your representative',d:'Your representative has the right to attend your hearing. Observers (family, support person) may also be allowed — request them as instructed in your notification letter.'},
    {e:'⏰',t:'Join 15 minutes early',d:'Connect to the Teams meeting at least 15 minutes before the start time. If you join too early and get removed from the lobby after 15 min, reconnect using the same link from your invitation email.'},
    {e:'🎙️',t:'During the hearing',d:'Speak clearly and directly into the microphone. Say "Yes" or "No" instead of nodding. Mute your mic when not speaking. Give the interpreter time to translate fully. Take notes.'},
    {e:'🔴',t:'CRITICAL — Do not miss your hearing',d:'Missing your FIRST hearing: IRCC reschedules once. Missing your SECOND hearing: your application is declared abandoned and you WILL be deported. If something prevents you from attending, contact IRCC IMMEDIATELY via Connect or by phone.'},
  ];
  return (
    <div>
      <div style={{background:'var(--navyl)',borderRadius:12,padding:'13px 17px',marginBottom:16,fontSize:13,color:'var(--navy)',lineHeight:1.65}}>
        Not all PRRA applications require a hearing. You only get one if an officer needs to address a credibility issue. If you receive a hearing notification letter, follow these steps carefully.
      </div>
      {steps.map((s,i)=>(
        <div key={i} style={{background:s.e==='🔴'?'var(--redp)':'var(--paper)',border:`1.5px solid ${s.e==='🔴'?'#fca5a5':'var(--brd)'}`,borderRadius:12,padding:'15px',marginBottom:10,display:'flex',gap:13}}>
          <span style={{fontSize:22,flexShrink:0,width:28,textAlign:'center'}}>{s.e}</span>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:s.e==='🔴'?'var(--red)':'var(--ink)',marginBottom:4}}>{s.t}</div>
            <div style={{fontSize:13,color:s.e==='🔴'?'var(--red)':'var(--ink2)',lineHeight:1.65,opacity:s.e==='🔴'?.9:1}}>{s.d}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CHAT ──────────────────────────────────────────────────────────────────────
function Chat({lang, profile}) {
  const welcome = {en:'Hello! I\'m your PRRA guide. Ask me anything about your application, documents, deadlines, or what to expect next.',es:'¡Hola! Soy tu guía de PRRA. Pregúntame lo que necesites sobre tu solicitud, documentos, plazos o qué esperar.',fr:'Bonjour! Je suis votre guide PRRA. Posez-moi toute question sur votre demande, vos documents, vos délais ou ce qui vous attend.'};
  const quick = {en:['What is "new evidence"?','Can I work while waiting?','What if I miss the deadline?','Do I need a representative?','What happens if PRRA is rejected?'],es:['¿Qué es "evidencia nueva"?','¿Puedo trabajar mientras espero?','¿Qué pasa si pierdo el plazo?','¿Necesito un representante?','¿Qué pasa si rechazan mi PRRA?'],fr:['Qu\'est-ce qu\'une "nouvelle preuve"?','Puis-je travailler en attendant?','Que se passe-t-il si je rate la date limite?','Ai-je besoin d\'un représentant?','Que se passe-t-il si la PRRA est rejetée?']};
  const [msgs,setMsgs] = useState([{role:'assistant',content:welcome[lang]||welcome.en}]);
  const [inp,setInp] = useState('');
  const [loading,setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[msgs]);
  const send = async(msg) => {
    if(!msg.trim()||loading) return;
    const nm=[...msgs,{role:'user',content:msg}];
    setMsgs(nm);setInp('');setLoading(true);
    try {const t=await callAPI(nm,buildSys(lang,profile));setMsgs([...nm,{role:'assistant',content:t}]);}
    catch {setMsgs([...nm,{role:'assistant',content:'Connection error. Please try again.'}]);}
    setLoading(false);
  };
  return (
    <div>
      <div style={{minHeight:200,maxHeight:420,overflowY:'auto',display:'flex',flexDirection:'column',gap:10,paddingBottom:10}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{maxWidth:'86%',padding:'11px 14px',fontSize:14,lineHeight:1.7,whiteSpace:'pre-wrap',
            borderRadius:m.role==='user'?'12px 4px 12px 12px':'4px 12px 12px 12px',
            background:m.role==='user'?'var(--navy)':'var(--navyl)',
            color:m.role==='user'?'#fff':'var(--ink)',
            alignSelf:m.role==='user'?'flex-end':'flex-start'}}>
            {m.content}
          </div>
        ))}
        {loading&&<div style={{maxWidth:'86%',padding:'11px 14px',borderRadius:'4px 12px 12px 12px',background:'var(--navyl)',color:'var(--ink3)',fontSize:14,alignSelf:'flex-start'}}>Thinking…</div>}
        <div ref={endRef}/>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:11,color:'var(--ink3)',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>Quick questions</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
          {(quick[lang]||quick.en).map(q=>(
            <button key={q} onClick={()=>send(q)} style={{background:'var(--paper2)',border:'1px solid var(--brd)',borderRadius:16,padding:'5px 12px',fontSize:12,cursor:'pointer',color:'var(--ink2)',fontFamily:'Inter,sans-serif',fontWeight:500,transition:'all .15s',outline:'none'}}
              onMouseEnter={e=>{e.target.style.borderColor='var(--navy)';e.target.style.color='var(--navy)';}}
              onMouseLeave={e=>{e.target.style.borderColor='var(--brd)';e.target.style.color='var(--ink2)';}}>
              {q}
            </button>
          ))}
        </div>
      </div>
      <div style={{display:'flex',gap:8}}>
        <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send(inp)}
          placeholder="Ask anything about your PRRA…"
          style={{flex:1,border:'2px solid var(--brd)',borderRadius:9,padding:'10px 13px',fontSize:14,color:'var(--ink)',background:'var(--paper)',outline:'none',transition:'border-color .2s',fontFamily:'Inter,sans-serif'}}
          onFocus={e=>e.target.style.borderColor='var(--navy)'} onBlur={e=>e.target.style.borderColor='var(--brd)'}/>
        <Btn onClick={()=>send(inp)} disabled={!inp.trim()||loading} style={{padding:'10px 18px'}}>Send</Btn>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
const PHASES = [
  {id:'checklist',icon:'📋',en:'Document Checklist',es:'Lista de Documentos',fr:'Liste de Documents',pt:'Lista de Documentos',ar:'قائمة المستندات',hi:'दस्तावेज़ सूची',zh:'文件清单',uk:'Список документів',ru:'Список документов',ko:'서류 체크리스트',ro:'Lista de documente'},
  {id:'riskletter',icon:'✍️',en:'Risk Letter Builder',es:'Constructor de Carta de Riesgos',fr:'Rédacteur de Lettre de Risques',ko:'위험 편지 작성기',ro:'Redactor scrisoare de risc'},
  {id:'imm5476',icon:'📄',en:'Form IMM 5476',es:'Formulario IMM 5476',fr:'Formulaire IMM 5476',ko:'양식 IMM 5476'},
  {id:'submission',icon:'📮',en:'How to Submit',es:'Cómo Enviar',fr:'Comment Soumettre',ko:'제출 방법',ro:'Cum să trimiteți'},
  {id:'hearing',icon:'💻',en:'Hearing Preparation',es:'Preparación para Audiencia',fr:'Préparation à l\'Audience',ko:'청문회 준비',ro:'Pregătire pentru audiere'},
  {id:'chat',icon:'💬',en:'Ask a Question',es:'Hacer una Pregunta',fr:'Poser une Question',ko:'질문하기',ro:'Pune o întrebare'},
];

function Dashboard({lang, profile, checklist, riskLetter, imm5476Data, dispatch, onReset}) {
  const [active,setActive] = useState(null);
  const T = (obj) => obj?.[lang]||obj?.en||'';
  const checkDone = ITEMS.filter(i=>checklist[i.id]).length;
  const riskDone = Object.values(riskLetter||{}).filter(v=>v?.trim()).length;
  const imm5476Done = Object.keys(imm5476Data||{}).length;
  const progress = {checklist:Math.round((checkDone/ITEMS.length)*100),riskletter:Math.round((riskDone/5)*100),imm5476:imm5476Done>0?60:0,submission:0,hearing:0,chat:0};

  const renderPhase = () => {
    switch(active) {
      case 'checklist': return <ChecklistScreen lang={lang} checklist={checklist} onChange={(id,v)=>dispatch({type:'CHECK',id,v})}/>;
      case 'riskletter': return <RiskLetterBuilder lang={lang} profile={profile} riskLetter={riskLetter} onChange={(id,v)=>dispatch({type:'RISK',id,v})}/>;
      case 'imm5476': return <IMM5476 lang={lang} profile={profile} data={imm5476Data} onChange={(id,v)=>dispatch({type:'IMM',id,v})}/>;
      case 'submission': return <SubmissionGuide/>;
      case 'hearing': return <HearingGuide/>;
      case 'chat': return <Chat lang={lang} profile={profile}/>;
      default: return null;
    }
  };

  if(active) {
    const phase = PHASES.find(p=>p.id===active);
    return (
      <div style={{minHeight:'100vh',background:'var(--bg)'}}>
        <div style={{background:'var(--navy2)',padding:'14px 20px',display:'flex',alignItems:'center',gap:14,position:'sticky',top:0,zIndex:10}}>
          <button onClick={()=>setActive(null)} style={{background:'rgba(255,255,255,.12)',border:'none',borderRadius:8,padding:'6px 13px',color:'#fff',fontFamily:'Inter,sans-serif',fontSize:13,fontWeight:600,cursor:'pointer'}}>{UI.back?.[lang]||'← Back'}</button>
          <div style={{fontFamily:'Playfair Display,serif',color:'#fff',fontSize:18}}>{phase?.icon} {T(phase)}</div>
        </div>
        <div style={{maxWidth:620,margin:'0 auto',padding:'24px 16px 48px'}}>
          {renderPhase()}
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <div style={{background:'linear-gradient(140deg,var(--navy2) 0%,var(--navy) 60%,#1a5c52 100%)',padding:'26px 20px 32px'}}>
        <div style={{maxWidth:620,margin:'0 auto'}}>
          <div style={{color:'rgba(255,255,255,.5)',fontSize:11,letterSpacing:'2.5px',textTransform:'uppercase',marginBottom:6}}>⚖️ PRRA Guide · Canada</div>
          <h1 style={{fontFamily:'Playfair Display,serif',color:'#fff',fontSize:'clamp(22px,5vw,32px)',marginBottom:4,lineHeight:1.2}}>
            {profile?.firstName?`${UI.hello?.[lang]||'Hello'}, ${profile.firstName}`:(UI.deadline?.[lang]||'Your PRRA Process')}
          </h1>
          <div style={{color:'rgba(255,255,255,.65)',fontSize:14}}>
            {profile?.country} · {profile?.isFirstPRRA?(UI.firstPRRA?.[lang]||'First PRRA application'):(UI.repeatPRRA?.[lang]||'Repeat PRRA application')}
          </div>
        </div>
      </div>
      <div style={{maxWidth:620,margin:'0 auto',padding:'20px 16px 48px'}}>
        <Countdown deadline={profile?.deadline} lang={lang}/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(168px,1fr))',gap:11,marginBottom:22}}>
          {PHASES.map(phase=>{
            const pct=progress[phase.id]||0;
            return(
              <button key={phase.id} onClick={()=>setActive(phase.id)}
                style={{background:'var(--paper)',border:'1.5px solid var(--brd)',borderRadius:14,padding:'18px 16px',textAlign:'left',cursor:'pointer',fontFamily:'Inter,sans-serif',transition:'all .2s',position:'relative',overflow:'hidden',outline:'none'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--navy)';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 5px 18px rgba(30,58,92,.12)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--brd)';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
                {pct>0&&<div style={{position:'absolute',bottom:0,left:0,height:3,width:`${pct}%`,background:'var(--teal)',borderRadius:'0 3px 0 0',transition:'width .5s ease'}}/>}
                <div style={{fontSize:26,marginBottom:9}}>{phase.icon}</div>
                <div style={{fontWeight:600,fontSize:13.5,color:'var(--ink)',lineHeight:1.35}}>{T(phase)}</div>
                {pct>0&&<div style={{fontSize:11,color:'var(--ink3)',marginTop:5}}>{pct}{UI.complete?.[lang]||'% complete'}</div>}
              </button>
            );
          })}
        </div>
        <div style={{background:'var(--paper)',borderRadius:12,padding:'15px 18px',border:'1px solid var(--brd)',fontSize:12.5,color:'var(--ink2)',lineHeight:1.7,marginBottom:14}}>
          <strong style={{color:'var(--ink)'}}>⚖️</strong> {UI.disclaimer?.[lang]||UI.disclaimer?.en} <a href="https://canada.ca" target="_blank" rel="noreferrer" style={{color:'var(--navy)'}}>canada.ca</a>.
        </div>
        <button onClick={onReset} style={{background:'none',border:'1px solid var(--brd)',borderRadius:8,padding:'8px 16px',cursor:'pointer',color:'var(--ink3)',fontFamily:'Inter,sans-serif',fontSize:12}}>{UI.startOver?.[lang]||'Start over'}</button>
      </div>
    </div>
  );
}

// ── STATE ─────────────────────────────────────────────────────────────────────
const init = {checklist:{},riskLetter:{},imm5476:{}};
function reducer(state,action) {
  switch(action.type){
    case 'CHECK': return {...state,checklist:{...state.checklist,[action.id]:action.v}};
    case 'RISK': return {...state,riskLetter:{...state.riskLetter,[action.id]:action.v}};
    case 'IMM': return {...state,imm5476:{...state.imm5476,[action.id]:action.v}};
    case 'RESET': return init;
    default: return state;
  }
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const saved = load();
  const [screen,setScreen] = useState(saved?.profile?'resume':'lang');
  const [lang,setLang] = useState(saved?.lang||'en');
  const [profile,setProfile] = useState(saved?.profile||null);
  const [state,dispatch] = useReducer(reducer,{
    checklist: saved?.checklist||{},
    riskLetter: saved?.riskLetter||{},
    imm5476: saved?.imm5476||{},
  });

  // Save on every state change
  useEffect(()=>{
    if(profile) save({lang,profile,...state});
  },[lang,profile,state]);

  const dispatchAndSave = useCallback((action)=>{
    dispatch(action);
  },[]);

  const reset = () => {
    clear();
    dispatch({type:'RESET'});
    setProfile(null);
    setLang('en');
    setScreen('lang');
  };

  if(screen==='lang') return (
    <>
      <style>{CSS}</style>
      <LangScreen onSelect={l=>{setLang(l);setScreen('diagnosis');}}/>
    </>
  );

  if(screen==='resume') return (
    <>
      <style>{CSS}</style>
      <ResumeScreen saved={saved} onResume={()=>setScreen('dashboard')} onRestart={reset}/>
    </>
  );

  if(screen==='diagnosis') return (
    <>
      <style>{CSS}</style>
      <Diagnosis lang={lang} onDone={p=>{setProfile(p);setScreen('dashboard');}}/>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <Dashboard
        lang={lang} profile={profile}
        checklist={state.checklist} riskLetter={state.riskLetter} imm5476Data={state.imm5476}
        dispatch={dispatchAndSave} onReset={reset}
      />
    </>
  );
}
