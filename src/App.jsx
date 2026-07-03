import { useState, useEffect, useRef } from "react";
import { STEPS, PHASES, getActiveSteps, DOC_TYPE_OPTS, MARITAL_OPTS, STATUS_OPTS, TRANSPORT_OPTS, EYE_OPTS, GOV_POSITIONS } from "./steps.js";
import { fillIMM5508 } from "./fill5508.js";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const API_KEY  = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const BASE_URL = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
const PRICE    = "$49 USD";
const SKEY     = "prra_v3";

// ── STORAGE ───────────────────────────────────────────────────────────────────
const load  = () => { try { return JSON.parse(localStorage.getItem(SKEY)||"null"); } catch { return null; } };
const save  = s  => { try { localStorage.setItem(SKEY, JSON.stringify({...s,ts:Date.now()})); } catch {} };
const wipe  = ()  => { try { localStorage.removeItem(SKEY); } catch {} };

// ── DATE UTILS ────────────────────────────────────────────────────────────────
const addDays  = (d,n) => { const x=new Date(d+"T12:00:00"); x.setDate(x.getDate()+n); return x.toISOString().split("T")[0]; };
const daysLeft = d     => d ? Math.ceil((new Date(d)-new Date())/864e5) : null;
const fmtDate  = s     => { if(!s) return ""; const d=new Date(s+"T12:00:00"); return d.toLocaleDateString("en-CA",{year:"numeric",month:"long",day:"numeric"}); };

// ── TRANSLATION ───────────────────────────────────────────────────────────────
const T = (obj, lang) => {
  if(!obj) return "";
  if(typeof obj === "string") return obj;
  return obj[lang] || obj.en || "";
};

// ── LANGUAGES ─────────────────────────────────────────────────────────────────
const LANG_NAMES = {en:"English",es:"Spanish",fr:"French",pt:"Portuguese",ar:"Arabic",hi:"Hindi",pa:"Punjabi",zh:"Mandarin Chinese",uk:"Ukrainian",ru:"Russian",tr:"Turkish",tl:"Filipino",sw:"Swahili",am:"Amharic",fa:"Persian",ko:"Korean",ro:"Romanian",bn:"Bengali",ta:"Tamil",so:"Somali",ne:"Nepali",ur:"Urdu",si:"Sinhala",ti:"Tigrinya"};

const LANGS = [
  {k:"en",f:"🇬🇧",l:"English"},{k:"es",f:"🇪🇸",l:"Español"},{k:"fr",f:"🇫🇷",l:"Français"},
  {k:"pt",f:"🇧🇷",l:"Português"},{k:"ar",f:"🇸🇦",l:"العربية"},{k:"hi",f:"🇮🇳",l:"हिन्दी"},
  {k:"pa",f:"🇮🇳",l:"ਪੰਜਾਬੀ"},{k:"zh",f:"🇨🇳",l:"中文"},{k:"uk",f:"🇺🇦",l:"Українська"},
  {k:"ru",f:"🇷🇺",l:"Русский"},{k:"tr",f:"🇹🇷",l:"Türkçe"},{k:"tl",f:"🇵🇭",l:"Filipino"},
  {k:"sw",f:"🇰🇪",l:"Kiswahili"},{k:"am",f:"🇪🇹",l:"አማርኛ"},{k:"fa",f:"🇮🇷",l:"فارسی"},
  {k:"ko",f:"🇰🇷",l:"한국어"},{k:"ro",f:"🇷🇴",l:"Română"},{k:"bn",f:"🇧🇩",l:"বাংলা"},
  {k:"ta",f:"🇱🇰",l:"தமிழ்"},{k:"so",f:"🇸🇴",l:"Soomaali"},{k:"ne",f:"🇳🇵",l:"नेपाली"},
  {k:"ur",f:"🇵🇰",l:"اردو"},{k:"si",f:"🇱🇰",l:"සිංහල"},{k:"ti",f:"🇪🇷",l:"ትግርኛ"},
];

const HELLOS = [
  {w:"Help",l:"English"},{w:"Ayuda",l:"Español"},{w:"Aide",l:"Français"},{w:"Ajuda",l:"Português"},
  {w:"مساعدة",l:"العربية"},{w:"मदद",l:"हिन्दी"},{w:"ਮਦਦ",l:"ਪੰਜਾਬੀ"},{w:"帮助",l:"中文"},
  {w:"Допомога",l:"Українська"},{w:"Помощь",l:"Русский"},{w:"Yardım",l:"Türkçe"},
  {w:"Tulong",l:"Filipino"},{w:"Usaidizi",l:"Kiswahili"},{w:"ድጋፍ",l:"አማርኛ"},
  {w:"کمک",l:"فارسی"},{w:"도움",l:"한국어"},{w:"Ajutor",l:"Română"},{w:"সাহায্য",l:"বাংলা"},
  {w:"உதவி",l:"தமிழ்"},{w:"Gargaar",l:"Soomaali"},{w:"मद्दत",l:"नेपाली"},
];

// ── UI STRINGS ────────────────────────────────────────────────────────────────
const UI = {
  continue:     {en:"Continue →",        es:"Continuar →",          fr:"Continuer →"},
  back:         {en:"← Back",            es:"← Atrás",              fr:"← Retour"},
  submit:       {en:"Submit my answer",  es:"Enviar mi respuesta",  fr:"Soumettre ma réponse"},
  skip:         {en:"Skip this question",es:"Saltar esta pregunta",  fr:"Ignorer cette question"},
  analyzing:    {en:"Reading your answer…",es:"Leyendo tu respuesta…",fr:"Lecture de votre réponse…"},
  addDetail:    {en:"Add this detail",   es:"Agregar este detalle",  fr:"Ajouter ce détail"},
  skipFollowUp: {en:"Continue — my answer is complete",es:"Continuar — mi respuesta está completa",fr:"Continuer — ma réponse est complète"},
  caseStrength: {en:"Case strength",     es:"Fortaleza del caso",    fr:"Force du dossier"},
  stepOf:       {en:"Step",              es:"Paso",                  fr:"Étape"},
  of:           {en:"of",               es:"de",                    fr:"sur"},
  deadline:     {en:"Your deadline",     es:"Tu fecha límite",       fr:"Votre date limite"},
  daysLeft:     {en:"days remaining",    es:"días restantes",        fr:"jours restants"},
  selectAll:    {en:"Select all that apply",es:"Selecciona todo lo que aplique",fr:"Sélectionnez tout ce qui s'applique"},
  noneApply:    {en:"None of these apply",es:"Ninguno de estos aplica",fr:"Aucun de ces éléments ne s'applique"},
  startOver:    {en:"Start over",        es:"Empezar de nuevo",      fr:"Recommencer"},
  reviewTitle:  {en:"Review before we prepare your documents",es:"Revisa antes de preparar tus documentos",fr:"Vérification avant de préparer vos documents"},
  confirmReady: {en:"Everything looks correct — prepare my documents",es:"Todo está correcto — preparar mis documentos",fr:"Tout est correct — préparer mes documents"},
  editAnswers:  {en:"I need to change something",es:"Necesito cambiar algo",fr:"Je dois changer quelque chose"},
  generating:   {en:"Preparing your application…",es:"Preparando tu solicitud…",fr:"Préparation de votre demande…"},
  payTitle:     {en:"Your application is ready",es:"Tu solicitud está lista",fr:"Votre demande est prête"},
  paySub:       {en:"3 documents have been prepared. Pay to unlock and download them.",es:"Se han preparado 3 documentos. Paga para desbloquearlos y descargarlos.",fr:"3 documents ont été préparés. Payez pour les déverrouiller et les télécharger."},
  payBtn:       {en:"Pay Now — "+PRICE,  es:"Pagar Ahora — "+PRICE, fr:"Payer Maintenant — "+PRICE},
  successTitle: {en:"Payment successful — download your documents",es:"Pago exitoso — descarga tus documentos",fr:"Paiement réussi — téléchargez vos documents"},
  successSub:   {en:"Download all 3, print, sign by hand, and submit before your deadline.",es:"Descarga los 3, imprime, firma a mano y envía antes de tu fecha límite.",fr:"Téléchargez les 3, imprimez, signez à la main et soumettez avant votre date limite."},
  doc1:         {en:"Written Submission Letter",es:"Carta de Argumentación",fr:"Lettre d'observations écrites"},
  doc2:         {en:"IMM 5476 — Use of a Representative",es:"IMM 5476 — Uso de Representante",fr:"IMM 5476 — Utilisation d'un représentant"},
  doc3:         {en:"IMM 5508 — PRRA Application",es:"IMM 5508 — Solicitud PRRA",fr:"IMM 5508 — Demande PRRA"},
  download:     {en:"Download",es:"Descargar",fr:"Télécharger"},
  sign:         {en:"Sign by hand before submitting",es:"Firma a mano antes de enviar",fr:"Signer à la main avant de soumettre"},
  resumeTitle:  {en:"Welcome back",es:"Bienvenido/a de vuelta",fr:"Bon retour"},
  resumeSub:    {en:"You have a saved application. Continue where you left off?",es:"Tienes una solicitud guardada. ¿Continuar donde lo dejaste?",fr:"Vous avez une demande sauvegardée. Continuer là où vous en étiez?"},
  resumeYes:    {en:"Continue my application",es:"Continuar mi solicitud",fr:"Continuer ma demande"},
  resumeNo:     {en:"Start fresh (delete saved progress)",es:"Empezar de nuevo (borrar progreso guardado)",fr:"Recommencer (supprimer la progression sauvegardée)"},
  saveItem:     {en:"Save",es:"Guardar",fr:"Enregistrer"},
  addAnother:   {en:"Add another",es:"Agregar otro/a",fr:"En ajouter un(e) autre"},
  removeItem:   {en:"Remove",es:"Eliminar",fr:"Supprimer"},
  itemsAdded:   {en:"added",es:"agregado(s)",fr:"ajouté(s)"},
  required:     {en:"Required",es:"Requerido",fr:"Requis"},
};

// ── CLAUDE API ────────────────────────────────────────────────────────────────
async function callClaude(messages, system, maxTokens=800) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,system,messages}),
  });
  const d = await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || "";
}

function buildSys(answers, lang) {
  const ln = LANG_NAMES[lang] || "English";
  const restricted = answers.criminalRecord === "serious";
  return `You are a compassionate expert PRRA (Pre-Removal Risk Assessment) advisor helping a ${answers.country||"unknown"} national stay in Canada. Respond ALWAYS in ${ln}. Use simple, warm, encouraging language.

LEGAL CONTEXT:
PRRA type: ${restricted?"RESTRICTED (s.112(3)) — only s.97 torture/life risk, NOT s.96 persecution":"FULL — both s.96 (persecution) and s.97 (torture/life risk/cruel treatment)"}
Country: ${answers.country||"unknown"}
Previous claim rejected: ${answers.claimRejected==="yes"?"YES — only NEW evidence allowed (IRPA s.113a)":"No"}

IRPA s.96: Persecution based on race, religion, nationality, political opinion, or membership in a particular social group. Nexus to one of these 5 grounds required.
IRPA s.97: (a) Danger of torture (requires state involvement) OR (b) risk to life / cruel treatment — must be personal, nationwide, not faced by general population, not from lawful sanctions.

Be specific, practical, and encouraging. Reference country conditions from EUAA, ACAPS, SIPRI, IRB, HRW, Amnesty as relevant.`;
}

async function getStoryFeedback(answer, qKey, answers, lang) {
  const qLabels = {
    why_danger:"Why would you be in danger if returned?",
    risk_type:"What kind of danger would you face?",
    personal_risk:"Why are YOU specifically targeted?",
    internal_flight:"Could you escape by moving elsewhere in your country?",
    general_risk:"How is your situation different from the general population?",
    protection_sought:"Did you seek protection from authorities? Why or why not?",
  };
  const sys = buildSys(answers, lang);
  const prompt = `The applicant answered this PRRA question:
Question: ${qLabels[qKey]||qKey}
Answer: "${answer}"

Analyze this answer for its legal strength in a PRRA application.
Return ONLY valid JSON (no markdown, no preamble):
{
  "feedback": "One warm sentence (max 35 words) noting what is legally significant in their answer",
  "followUp": "One specific question (max 25 words) to get a detail that would strengthen the case — or null if answer is already strong",
  "strength": 7,
  "tip": "One practical tip (max 25 words) about what would most improve this answer — or null"
}`;
  try {
    const raw = await callClaude([{role:"user",content:prompt}], sys, 500);
    return JSON.parse(raw.replace(/```json|```/g,"").trim());
  } catch {
    return {feedback:"Thank you for sharing that.", followUp:null, strength:5, tip:null};
  }
}

async function generateDocuments(answers, lang) {
  const ln = LANG_NAMES[lang] || "English";
  const sys = buildSys(answers, lang);
  const restricted = answers.criminalRecord === "serious";

  const prompt = `Generate complete PRRA application documents for:
Name: ${answers.firstName||""} ${answers.lastName||""}
Country: ${answers.country||""}
PRRA Type: ${restricted?"Restricted — s.97 only":"Full — s.96 + s.97"}
Previous claim rejected: ${answers.claimRejected==="yes"?"Yes":"No"}

Story answers:
1. Why in danger: ${answers.storyDanger||"Not provided"}
2. Type of risk: ${answers.storyRiskType||"Not provided"}
3. Personal risk: ${answers.storyPersonal||"Not provided"}
4. Internal flight: ${answers.storyInternal||"Not provided"}
5. Different from population: ${answers.storyGeneral||"Not provided"}
6. Protection sought: ${answers.protectionSought||"Not provided"}

Supporting documents the applicant has: ${(answers.documents||[]).join(", ")||"None specified"}

Return ONLY valid JSON:
{
  "letter": "Complete formal PRRA submission letter in English, starting with Dear Officer, 600-900 words, addresses all 5 PRRA questions with legal references to IRPA s.96/s.97 as appropriate",
  "incidents": "Chronological narrative for Form IMM 5508 Section E Question 50 — all significant incidents that caused the applicant to seek protection, 200-300 words, formal tone, in English",
  "protection": "Answer for IMM 5508 Question 51 — what protection was sought from home country authorities and why, or why no protection was sought, 100-150 words, formal English",
  "docSupport": ["How document 1 supports the claim (30 words)", "How document 2 supports the claim (30 words)", "How document 3 supports the claim (30 words)", "How document 4 supports the claim (30 words)", "How document 5 supports the claim (30 words)"]
}`;

  try {
    const raw = await callClaude([{role:"user",content:prompt}], sys, 3000);
    return JSON.parse(raw.replace(/```json|```/g,"").trim());
  } catch(e) {
    return {
      letter:`Dear Officer,\n\nThis is the Pre-Removal Risk Assessment submission for ${answers.firstName||""} ${answers.lastName||""} from ${answers.country||""}.\n\n[Document generation encountered an error. Please try again.]\n\nRespectfully submitted.`,
      incidents:answers.storyDanger||"",
      protection:answers.protectionSought||"",
      docSupport:[],
    };
  }
}

// ── IMM 5476 PDF FILL ─────────────────────────────────────────────────────────
async function fillIMM5476(answers) {
  const {PDFDocument} = await import("pdf-lib");
  const url = BASE_URL+"/imm5476e.pdf";
  const bytes = await fetch(url).then(r=>r.arrayBuffer());
  const pdf = await PDFDocument.load(bytes,{ignoreEncryption:true});
  const form = pdf.getForm();
  const fill = (name,val) => { try { form.getTextField(name).setText(String(val||"")); } catch {} };
  fill("IMM_5476[0].Page1[0].SectionA[0].familyName[0]",  answers.lastName||"");
  fill("IMM_5476[0].Page1[0].SectionA[0].givenName[0]",   answers.firstName||"");
  fill("IMM_5476[0].Page1[0].SectionA[0].application[0]", "Pre-Removal Risk Assessment (PRRA)");
  fill("IMM_5476[0].Page1[0].SectionA[0].UCI[0]",         answers.uci&&answers.uci!=="skip"?answers.uci:"");
  const rn = (answers.repName||"").trim().split(" ");
  fill("IMM_5476[0].Page1[0].SectionB[0].familyName[0]",  rn[rn.length-1]||"");
  fill("IMM_5476[0].Page1[0].SectionB[0].givenName[0]",   rn.slice(0,-1).join(" ")||rn[0]||"");
  fill("IMM_5476[0].Page1[0].SectionB[0].question6[0].questionI[0].membership[0]", answers.repMemberId&&answers.repMemberId!=="skip"?answers.repMemberId:"");
  fill("IMM_5476[0].Page1[0].SectionB[0].question7[0].organization[0]", answers.repOrg&&answers.repOrg!=="skip"?answers.repOrg:"");
  fill("IMM_5476[0].Page1[0].SectionB[0].question7[0].phoneNumber[0]", answers.repPhone||"");
  fill("IMM_5476[0].Page1[0].SectionB[0].question7[0].email[0]",       answers.repEmail||"");
  if(answers.repAddress){
    const parts = answers.repAddress.split(",");
    fill("IMM_5476[0].Page1[0].SectionB[0].question7[0].streetName[0]",  parts[0]||"");
    fill("IMM_5476[0].Page1[0].SectionB[0].question7[0].city[0]",        parts[1]||"");
    fill("IMM_5476[0].Page1[0].SectionB[0].question7[0].province[0]",    parts[2]||"");
    fill("IMM_5476[0].Page1[0].SectionB[0].question7[0].country[0]",     "Canada");
  }
  try { form.getRadioGroup("IMM_5476[0].Page1[0].RadioButtonList[0]").select("0"); } catch {}
  const out = await pdf.save();
  return new Blob([out],{type:"application/pdf"});
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;font-family:Inter,system-ui,sans-serif;background:#f4f0e8;-webkit-font-smoothing:antialiased}
:root{
  --bg:#f4f0e8;--paper:#fff;--paper2:#f8f5f0;
  --navy:#1e3a5c;--navy2:#132740;--navyl:#dce8f5;
  --amber:#c47c2b;--amberp:#fef3cd;
  --teal:#1a5c52;--tealp:#d4ede9;
  --red:#b91c1c;--redp:#fee2e2;
  --green:#16803c;--greenp:#dcfce7;
  --ink:#1a2535;--ink2:#4a5568;--ink3:#94a3b8;
  --brd:#e0d8cc;
}
@keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes sl{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes bob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-5px)}}
.fi{animation:fi .3s ease both}
.sl{animation:sl .25s ease both}
button:focus-visible{outline:2px solid var(--navy);outline-offset:2px}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#c8bfb0;border-radius:2px}
textarea,input,select{font-family:inherit}
`;

// ── REUSABLE COMPONENTS ───────────────────────────────────────────────────────
const Btn = ({children,onClick,disabled,variant="primary",full,style={}}) => {
  const base={fontFamily:"inherit",fontWeight:600,borderRadius:12,border:"none",cursor:disabled?"not-allowed":"pointer",transition:"all .18s",fontSize:15,padding:"13px 22px",width:full?"100%":undefined,...style};
  const v={
    primary:{background:disabled?"#b0b8c1":"var(--navy)",color:"#fff",boxShadow:disabled?"none":"0 2px 10px rgba(30,58,92,.2)"},
    secondary:{background:"transparent",border:"2px solid var(--brd)",color:"var(--ink2)"},
    teal:{background:"var(--teal)",color:"#fff"},
    amber:{background:"var(--amber)",color:"#fff"},
    danger:{background:"var(--redp)",color:"var(--red)",border:"1.5px solid #fca5a5"},
    success:{background:"var(--green)",color:"#fff"},
    ghost:{background:"none",border:"none",color:"var(--ink3)",padding:"6px 12px",fontSize:13,fontWeight:500},
  };
  return <button onClick={disabled?null:onClick} disabled={disabled} style={{...base,...v[variant]}}>{children}</button>;
};

const PhaseBar = ({phase, stepNum, totalSteps, lang}) => {
  const phaseInfo = PHASES.find(p=>p.id===phase) || PHASES[0];
  const pct = Math.round((stepNum/totalSteps)*100);
  return (
    <div style={{background:"var(--navy2)",padding:"12px 20px",flexShrink:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
        <span style={{color:"rgba(255,255,255,.6)",fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:"1px"}}>{T(phaseInfo,lang)}</span>
        <span style={{color:"rgba(255,255,255,.45)",fontSize:12}}>{T(UI.stepOf,lang)} {stepNum} {T(UI.of,lang)} {totalSteps}</span>
      </div>
      <div style={{height:4,background:"rgba(255,255,255,.15)",borderRadius:2,overflow:"hidden"}}>
        <div style={{height:4,width:`${pct}%`,background:phaseInfo.col||"#fff",borderRadius:2,transition:"width .4s"}}/>
      </div>
    </div>
  );
};

const CaseMeter = ({strength,lang}) => {
  if(strength===null||strength===undefined) return null;
  const s = Math.round(strength);
  const [label,color,bg] = s>=9?["Very Strong","var(--teal)","var(--tealp)"]:s>=7?["Strong","var(--green)","var(--greenp)"]:s>=4?["Building","var(--amber)","var(--amberp)"]:["Developing","var(--red)","var(--redp)"];
  const labels = {en:label,es:label==="Very Strong"?"Muy Sólido":label==="Strong"?"Sólido":label==="Building"?"Construyendo":"Desarrollando",fr:label==="Very Strong"?"Très Solide":label==="Strong"?"Solide":label==="Building"?"En construction":"En développement"};
  return (
    <div style={{background:bg,borderRadius:10,padding:"10px 14px",marginTop:14,display:"flex",alignItems:"center",gap:10}}>
      <div style={{flex:1}}>
        <div style={{fontSize:11,fontWeight:700,color,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>{T(UI.caseStrength,lang)}</div>
        <div style={{height:6,background:"rgba(0,0,0,.08)",borderRadius:3,overflow:"hidden"}}>
          <div style={{height:6,width:`${s*10}%`,background:color,borderRadius:3,transition:"width .8s"}}/>
        </div>
      </div>
      <div style={{fontFamily:"Georgia,serif",fontSize:17,fontWeight:700,color,flexShrink:0}}>{T(labels,lang)}</div>
    </div>
  );
};

const DeadlineBanner = ({deadline,lang}) => {
  if(!deadline) return null;
  const n = daysLeft(deadline);
  if(n===null) return null;
  const [bg,tc] = n<=3?["var(--red)","#fff"]:n<=7?["var(--amber)","#fff"]:["var(--teal)","#fff"];
  return (
    <div style={{background:bg,color:tc,padding:"7px 20px",fontSize:12,fontWeight:600,textAlign:"center",flexShrink:0}}>
      {T(UI.deadline,lang)}: {fmtDate(deadline)} — {Math.max(0,n)} {T(UI.daysLeft,lang)}
    </div>
  );
};

// ── SUB-FORM FIELD ────────────────────────────────────────────────────────────
function SubField({field, lang, value, onChange}) {
  const langObj = field[lang] || field.en || {};
  const label   = langObj.label || "";
  const ph      = langObj.ph    || "";
  const type  = field.type || "text";
  const inputStyle = {width:"100%",border:"2px solid var(--brd)",borderRadius:8,padding:"10px 12px",fontSize:14,color:"#1a2535",background:"#fff",outline:"none",fontFamily:"inherit"};

  if(type === "select") {
    const opts = (field.opts || []);
    return (
      <div>
        <label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--ink2)",marginBottom:4}}>{label}{field.req&&<span style={{color:"var(--red)",marginLeft:2}}>*</span>}</label>
        <select value={value||""} onChange={e=>onChange(e.target.value)} style={{...inputStyle,cursor:"pointer"}}>
          <option value="">{T({en:"Select…",es:"Seleccionar…",fr:"Sélectionner…"},lang)}</option>
          {opts.map(o=><option key={o.v} value={o.v}>{T(o,lang)||o.en}</option>)}
        </select>
      </div>
    );
  }

  if(type === "date") {
    return (
      <div>
        <label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--ink2)",marginBottom:4}}>{label}{field.req&&<span style={{color:"var(--red)",marginLeft:2}}>*</span>}</label>
        <input type="date" value={value||""} onChange={e=>onChange(e.target.value)} max={new Date().toISOString().split("T")[0]}
          style={{...inputStyle,WebkitAppearance:"none",appearance:"none",display:"block",boxSizing:"border-box"}}/>
      </div>
    );
  }

  return (
    <div>
      <label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--ink2)",marginBottom:4}}>{label}{field.req&&<span style={{color:"var(--red)",marginLeft:2}}>*</span>}</label>
      <input value={value||""} onChange={e=>onChange(e.target.value)} placeholder={ph||""}
        style={inputStyle}
        onFocus={e=>e.target.style.borderColor="var(--navy)"}
        onBlur={e=>e.target.style.borderColor="var(--brd)"}/>
    </div>
  );
}

// ── REPEAT STEP ───────────────────────────────────────────────────────────────
function RepeatStep({stepData, lang, value, onAnswer, onBack}) {
  const items   = value || [];
  const max     = stepData.max || 10;
  const sFields = stepData.subFields || [];
  const [isAdding, setIsAdding] = useState(items.length === 0);
  const [current, setCurrent]   = useState({});

  const canSave = sFields.filter(f=>f.req).every(f => (current[f.id]||"").trim());

  const saveItem = () => {
    if(!canSave) return;
    onAnswer(stepData.field, [...items, current]);
    setCurrent({});
    setIsAdding(false);
  };

  const removeItem = (idx) => onAnswer(stepData.field, items.filter((_,i)=>i!==idx));

  const done = () => onAnswer(stepData.field, items, true);

  const L = lang;
  const s = stepData;
  const addBtnLabel = T(s[L]?.addBtn||s.en?.addBtn||{en:"Add another"},L) || "Add another";
  const doneBtnLabel = T(s[L]?.doneBtn||s.en?.doneBtn||{en:"Continue"},L) || "Continue";
  const skipBtnLabel = s[L]?.skipBtn || s.en?.skipBtn;

  // Summary label for an item
  const itemSummary = (item) => {
    const first = sFields.find(f=>f.req&&item[f.id]);
    const second = sFields.filter(f=>f.req&&item[f.id])[1];
    return [item[first?.id], item[second?.id]].filter(Boolean).join(" — ");
  };

  return (
    <div>
      {/* Existing items */}
      {items.length > 0 && (
        <div style={{marginBottom:16,display:"flex",flexDirection:"column",gap:8}}>
          {items.map((item,idx)=>(
            <div key={idx} style={{background:"var(--greenp)",borderRadius:10,padding:"10px 14px",border:"1px solid #6bbdad",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,color:"var(--teal)",fontWeight:600}}>✓ {itemSummary(item)}</span>
              <button onClick={()=>removeItem(idx)} style={{background:"none",border:"none",color:"var(--red)",cursor:"pointer",fontSize:12,fontWeight:600,padding:"2px 6px"}}>{T(UI.removeItem,L)}</button>
            </div>
          ))}
          <div style={{fontSize:12,color:"var(--ink3)",textAlign:"center"}}>{items.length} {T(UI.itemsAdded,L)}{items.length<max?"":" (maximum reached)"}</div>
        </div>
      )}

      {/* Add form */}
      {isAdding && (
        <div className="fi" style={{background:"var(--paper)",borderRadius:14,padding:"18px",border:"1.5px solid var(--navy)",marginBottom:14}}>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:14}}>
            {sFields.map(f=>(
              <SubField key={f.id} field={f} lang={L} value={current[f.id]||""} onChange={v=>setCurrent(c=>({...c,[f.id]:v}))}/>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={saveItem} disabled={!canSave} style={{flex:1}}>{T(UI.saveItem,L)}</Btn>
            {items.length>0&&<Btn onClick={()=>{setCurrent({});setIsAdding(false);}} variant="secondary">✕</Btn>}
          </div>
        </div>
      )}

      {/* Controls */}
      {!isAdding && (
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
          {items.length < max && (
            <Btn onClick={()=>{setCurrent({});setIsAdding(true);}} variant="secondary" full>{addBtnLabel}</Btn>
          )}
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <Btn onClick={done} full disabled={isAdding&&items.length===0&&!canSave}>{doneBtnLabel}</Btn>
        {skipBtnLabel && items.length === 0 && !isAdding && (
          <Btn onClick={()=>onAnswer(stepData.field,[],true)} variant="ghost" full>{skipBtnLabel}</Btn>
        )}
      </div>

      {(items.length>0||isAdding)&&<button onClick={onBack} style={{background:"none",border:"none",color:"var(--ink3)",fontFamily:"inherit",fontSize:12,cursor:"pointer",marginTop:14,padding:"4px 0"}}>{T(UI.back,L)}</button>}
    </div>
  );
}

// ── GROUPED STEP ──────────────────────────────────────────────────────────────
function GroupedStep({stepData, lang, value, onAnswer, onBack}) {
  const sFields = stepData.subFields || [];
  const [vals, setVals] = useState(value || {});
  const canContinue = sFields.filter(f=>f.req).every(f=>(vals[f.id]||"").toString().trim());
  const L = lang;
  return (
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
        {sFields.map(f=>(
          <SubField key={f.id} field={f} lang={L} value={vals[f.id]||""} onChange={v=>setVals(c=>({...c,[f.id]:v}))}/>
        ))}
      </div>
      <Btn onClick={()=>canContinue&&onAnswer(stepData.field,vals)} disabled={!canContinue} full>{T(UI.continue,L)}</Btn>
      <button onClick={onBack} style={{background:"none",border:"none",color:"var(--ink3)",fontFamily:"inherit",fontSize:12,cursor:"pointer",marginTop:12,padding:"4px 0"}}>{T(UI.back,L)}</button>
    </div>
  );
}

// ── STORY STEP ────────────────────────────────────────────────────────────────
function StoryStep({stepData, lang, answers, value, feedback: initFeedback, onAnswer, onFeedbackDone, onBack, avgStrength}) {
  const [val, setVal]           = useState(value||"");
  const [phase, setPhase]       = useState(initFeedback?"feedback":"input");
  const [feedback, setFeedback] = useState(initFeedback||null);
  const [followVal, setFollowVal] = useState("");
  const L = lang;
  const ph = T(stepData[L]?.ph||stepData.en?.ph||{},L)||"";

  const submit = async () => {
    if(val.trim().length<15) return;
    setPhase("loading");
    const fb = await getStoryFeedback(val.trim(), stepData.claudeQ, answers, L);
    setFeedback(fb);
    setPhase("feedback");
  };

  const finish = () => {
    const final = followVal.trim() ? val.trim()+"\n\nAdditional detail: "+followVal.trim() : val.trim();
    onFeedbackDone(stepData.field, final, feedback);
  };

  return (
    <div>
      {phase==="input"&&(
        <div>
          <textarea value={val} onChange={e=>setVal(e.target.value)} placeholder={ph} rows={6} autoFocus
            style={{width:"100%",border:"2px solid var(--brd)",borderRadius:12,padding:"14px 16px",fontSize:14,color:"var(--ink)",lineHeight:1.7,resize:"vertical",background:"#fff",outline:"none",fontFamily:"inherit"}}
            onFocus={e=>e.target.style.borderColor="var(--navy)"} onBlur={e=>e.target.style.borderColor="var(--brd)"}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,marginBottom:4}}>
            <span style={{fontSize:12,color:"var(--ink3)"}}>{val.trim().split(/\s+/).filter(Boolean).length} {T({en:"words",es:"palabras",fr:"mots"},L)}</span>
            <Btn onClick={submit} disabled={val.trim().length<15}>{T(UI.submit,L)}</Btn>
          </div>
          {val.trim().length>0&&val.trim().length<15&&<p style={{fontSize:12,color:"var(--amber)"}}>Please write at least a few sentences to help us build your case.</p>}
        </div>
      )}

      {phase==="loading"&&(
        <div style={{textAlign:"center",padding:"36px 20px"}}>
          <div style={{width:40,height:40,border:"3px solid var(--navyl)",borderTop:"3px solid var(--navy)",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 14px"}}/>
          <p style={{color:"var(--ink2)",fontSize:14}}>{T(UI.analyzing,L)}</p>
        </div>
      )}

      {(phase==="feedback"||phase==="followup")&&feedback&&(
        <div>
          <div style={{background:"var(--paper)",borderRadius:12,padding:"14px 16px",border:"1.5px solid var(--navy)",marginBottom:12}}>
            <div style={{fontSize:11,color:"var(--navy)",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>⚖️ {T({en:"Analysis of your answer",es:"Análisis de tu respuesta",fr:"Analyse de votre réponse"},L)}</div>
            <p style={{fontSize:14,color:"var(--ink)",lineHeight:1.65}}>{feedback.feedback}</p>
            {feedback.tip&&<p style={{fontSize:13,color:"var(--amber)",marginTop:8,fontWeight:600}}>💡 {feedback.tip}</p>}
            <CaseMeter strength={feedback.strength} lang={L}/>
          </div>

          {feedback.followUp&&phase==="feedback"&&(
            <div style={{background:"var(--amberp)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
              <p style={{fontSize:14,color:"var(--ink)",marginBottom:10,fontWeight:600}}>❓ {feedback.followUp}</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <Btn onClick={()=>setPhase("followup")} variant="amber">{T(UI.addDetail,L)}</Btn>
                <button onClick={finish} style={{background:"none",border:"none",color:"var(--ink3)",fontFamily:"inherit",fontSize:13,cursor:"pointer",textDecoration:"underline"}}>{T(UI.skipFollowUp,L)}</button>
              </div>
            </div>
          )}

          {phase==="followup"&&(
            <div style={{marginBottom:12}}>
              <textarea value={followVal} onChange={e=>setFollowVal(e.target.value)} placeholder={feedback.followUp} rows={3} autoFocus
                style={{width:"100%",border:"2px solid var(--amber)",borderRadius:10,padding:"12px 14px",fontSize:14,color:"var(--ink)",lineHeight:1.65,resize:"vertical",background:"#fff",outline:"none",fontFamily:"inherit",marginBottom:8}}/>
              <Btn onClick={finish} variant="amber" full>{T(UI.addDetail,L)} →</Btn>
            </div>
          )}

          {phase==="feedback"&&!feedback.followUp&&<Btn onClick={finish} full>{T(UI.continue,L)}</Btn>}
        </div>
      )}

      {avgStrength!==null&&<CaseMeter strength={avgStrength} lang={L}/>}
      {phase==="input"&&<button onClick={onBack} style={{background:"none",border:"none",color:"var(--ink3)",fontFamily:"inherit",fontSize:12,cursor:"pointer",marginTop:14,padding:"4px 0"}}>{T(UI.back,L)}</button>}
    </div>
  );
}

// ── REVIEW CARD ───────────────────────────────────────────────────────────────
function ReviewCard({answers, lang, onConfirm, onBack}) {
  const L = lang;
  const rows = [
    {l:{en:"Name",es:"Nombre",fr:"Nom"},        v:`${answers.firstName||""} ${answers.lastName||""}`.trim()},
    {l:{en:"Country",es:"País",fr:"Pays"},       v:answers.country},
    {l:{en:"Deadline",es:"Fecha límite",fr:"Date limite"}, v:fmtDate(answers.deadline)},
    {l:{en:"PRRA type",es:"Tipo PRRA",fr:"Type PRRA"}, v:answers.criminalRecord==="serious"?"Restricted (s.97 only)":"Full (s.96 + s.97)"},
    {l:{en:"Date of birth",es:"Fecha de nacimiento",fr:"Date de naissance"}, v:answers.dob},
    {l:{en:"Marital status",es:"Estado civil",fr:"État civil"}, v:answers.maritalStatus},
    {l:{en:"Address in Canada",es:"Dirección en Canadá",fr:"Adresse au Canada"}, v:answers.address},
    {l:{en:"UCI number",es:"Número UCI",fr:"Numéro IUC"}, v:answers.uci&&answers.uci!=="skip"?answers.uci:"Not provided"},
    {l:{en:"Representative",es:"Representante",fr:"Représentant"}, v:answers.hasRep==="yes"?(answers.repName||"Yes"):"None"},
    {l:{en:"Documents",es:"Documentos",fr:"Documents"}, v:(answers.documents||[]).length+" item(s) checked"},
  ].filter(r=>r.v);
  return (
    <div>
      <div style={{background:"var(--paper)",borderRadius:14,overflow:"hidden",border:"1px solid var(--brd)",marginBottom:18}}>
        {rows.map((r,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"11px 16px",borderBottom:i<rows.length-1?"1px solid var(--brd)":"none",fontSize:13}}>
            <span style={{color:"var(--ink2)",fontWeight:500}}>{T(r.l,L)}</span>
            <span style={{color:"var(--ink)",fontWeight:600,textAlign:"right",maxWidth:"55%"}}>{r.v}</span>
          </div>
        ))}
      </div>
      <Btn onClick={onConfirm} full style={{marginBottom:10}}>{T(UI.confirmReady,L)}</Btn>
      <Btn onClick={onBack} variant="secondary" full style={{fontSize:13}}>{T(UI.editAnswers,L)}</Btn>
    </div>
  );
}

// ── WIZARD STEP DISPATCHER ────────────────────────────────────────────────────
function WizardStep({stepData, lang, answers, onAnswer, onBack, feedbackState, onFeedbackDone, avgStrength}) {
  const [val, setVal]   = useState(answers[stepData.field]||"");
  const [multi, setMulti] = useState(answers[stepData.field]||[]);
  const [key, setKey]   = useState(0);
  const L = lang;
  const deadline = answers.deadline;

  useEffect(()=>{
    setVal(answers[stepData.field]||"");
    setMulti(answers[stepData.field]||[]);
    setKey(k=>k+1);
  },[stepData.id]);

  const q     = T(stepData[L]?.q || stepData.en?.q, L);
  const intro = T(stepData[L]?.intro || stepData.en?.intro, L);
  const ph    = T(stepData[L]?.ph || stepData.en?.ph, L) || "";

  const advance = (field, value, extra={}) => {
    if(field) {
      const newAnswers = {...answers, [field]:value, ...extra};
      // Calculate deadline when notification date is set
      if(field==="notificationDate" && value) {
        const days = newAnswers.notificationMethod==="inperson"?15:22;
        extra.deadline = addDays(value, days);
      }
    }
    onAnswer(field, value, extra);
  };

  return (
    <div className="sl" key={key} style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
      <DeadlineBanner deadline={deadline} lang={L}/>
      <div style={{flex:1,overflowY:"auto",padding:"20px 20px 80px",maxWidth:580,margin:"0 auto",width:"100%"}}>

        {/* Phase tag */}
        {stepData.phase>0&&(()=>{
          const ph = PHASES.find(p=>p.id===stepData.phase);
          if(!ph) return null;
          return <div style={{display:"inline-block",background:"#e8f0fe",color:ph.col,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",padding:"3px 10px",borderRadius:20,marginBottom:14}}>{T(ph,L)}</div>;
        })()}

        {/* Intro */}
        {intro&&<p style={{fontSize:14,color:"var(--ink2)",lineHeight:1.7,marginBottom:18,background:"var(--paper)",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid var(--amber)"}}>{intro}</p>}

        {/* Question */}
        <h2 style={{fontFamily:"Georgia,serif",fontSize:"clamp(19px,4vw,26px)",color:"var(--ink)",lineHeight:1.3,marginBottom:20}}>{q}</h2>

        {/* ── TEXT ── */}
        {stepData.type==="text"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={val} onChange={e=>setVal(e.target.value)} placeholder={ph} autoFocus
              onKeyDown={e=>e.key==="Enter"&&val.trim()&&advance(stepData.field,val.trim())}
              style={{border:"2px solid var(--brd)",borderRadius:12,padding:"14px 16px",fontSize:16,color:"var(--ink)",background:"#fff",outline:"none",transition:"border-color .2s"}}
              onFocus={e=>e.target.style.borderColor="var(--navy)"} onBlur={e=>e.target.style.borderColor="var(--brd)"}/>
            <Btn onClick={()=>val.trim()&&advance(stepData.field,val.trim())} disabled={!val.trim()} full>{T(UI.continue,L)}</Btn>
            <button onClick={onBack} style={{background:"none",border:"none",color:"var(--ink3)",fontFamily:"inherit",fontSize:12,cursor:"pointer",padding:"4px 0"}}>{T(UI.back,L)}</button>
          </div>
        )}

        {/* ── TEXTSKIP ── */}
        {stepData.type==="textSkip"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={val} onChange={e=>setVal(e.target.value)} placeholder={ph} autoFocus
              style={{border:"2px solid var(--brd)",borderRadius:12,padding:"14px 16px",fontSize:16,color:"var(--ink)",background:"#fff",outline:"none",transition:"border-color .2s"}}
              onFocus={e=>e.target.style.borderColor="var(--navy)"} onBlur={e=>e.target.style.borderColor="var(--brd)"}/>
            <Btn onClick={()=>advance(stepData.field,val.trim()||"skip")} full>{val.trim()?T(UI.continue,L):T(UI.skip,L)}</Btn>
            <button onClick={onBack} style={{background:"none",border:"none",color:"var(--ink3)",fontFamily:"inherit",fontSize:12,cursor:"pointer",padding:"4px 0"}}>{T(UI.back,L)}</button>
          </div>
        )}

        {/* ── DATE ── */}
        {stepData.type==="date"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input type="date" value={val} onChange={e=>setVal(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              style={{border:"2px solid var(--brd)",borderRadius:12,padding:"14px 16px",fontSize:16,color:"#1a2535",background:"#fff",outline:"none",WebkitAppearance:"none",appearance:"none",width:"100%",display:"block",boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor="var(--navy)"} onBlur={e=>e.target.style.borderColor="var(--brd)"}/>
            <Btn onClick={()=>{
              if(!val) return;
              if(stepData.field==="notificationDate") {
                const days = answers.notificationMethod==="inperson"?15:22;
                advance(stepData.field, val, {deadline:addDays(val,days)});
              } else {
                advance(stepData.field, val);
              }
            }} disabled={!val} full>{T(UI.continue,L)}</Btn>
            <button onClick={onBack} style={{background:"none",border:"none",color:"var(--ink3)",fontFamily:"inherit",fontSize:12,cursor:"pointer",padding:"4px 0"}}>{T(UI.back,L)}</button>
          </div>
        )}

        {/* ── CHOICE ── */}
        {stepData.type==="choice"&&(
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {(stepData.opts||[]).map(o=>(
              <button key={o.v} onClick={()=>advance(stepData.field,o.v)}
                style={{background:"var(--paper2)",border:"2px solid var(--brd)",borderRadius:12,padding:"14px 16px",textAlign:"left",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:500,color:"var(--ink)",display:"flex",alignItems:"center",gap:12,transition:"all .15s",outline:"none"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--navy)";e.currentTarget.style.background="var(--navyl)";e.currentTarget.style.transform="translateX(4px)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--brd)";e.currentTarget.style.background="var(--paper2)";e.currentTarget.style.transform="none";}}>
                {o.e&&<span style={{fontSize:20,flexShrink:0,width:28,textAlign:"center"}}>{o.e}</span>}
                <span>{T(o,L)||o.en}</span>
              </button>
            ))}
            {stepData.phase>0&&<button onClick={onBack} style={{background:"none",border:"none",color:"var(--ink3)",fontFamily:"inherit",fontSize:12,cursor:"pointer",marginTop:6,padding:"4px 0"}}>{T(UI.back,L)}</button>}
          </div>
        )}

        {/* ── MULTICHOICE ── */}
        {stepData.type==="multiChoice"&&(
          <div>
            <p style={{fontSize:12,color:"var(--ink3)",marginBottom:12,fontWeight:600,textTransform:"uppercase",letterSpacing:".5px"}}>{T(UI.selectAll,L)}</p>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {(stepData.opts||[]).map(o=>{
                const checked = multi.includes(o.v);
                return (
                  <button key={o.v} onClick={()=>setMulti(m=>checked?m.filter(x=>x!==o.v):[...m,o.v])}
                    style={{background:checked?"var(--navyl)":"var(--paper2)",border:`2px solid ${checked?"var(--navy)":"var(--brd)"}`,borderRadius:12,padding:"12px 14px",textAlign:"left",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:500,color:"var(--ink)",display:"flex",alignItems:"center",gap:10,transition:"all .15s",outline:"none"}}>
                    <span style={{width:20,height:20,borderRadius:5,border:`2px solid ${checked?"var(--navy)":"#c8bfb0"}`,background:checked?"var(--navy)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {checked&&<span style={{color:"#fff",fontSize:11,fontWeight:800}}>✓</span>}
                    </span>
                    {o.e&&<span style={{fontSize:17,flexShrink:0}}>{o.e}</span>}
                    <span>{T(o,L)||o.en}</span>
                  </button>
                );
              })}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {multi.length>0
                ?<Btn onClick={()=>advance(stepData.field,multi)} full>{T(UI.continue,L)}</Btn>
                :<Btn onClick={()=>advance(stepData.field,[])} variant="secondary" full>{stepData.noneOpt?T(stepData.noneOpt,L):T(UI.noneApply,L)}</Btn>
              }
              <button onClick={onBack} style={{background:"none",border:"none",color:"var(--ink3)",fontFamily:"inherit",fontSize:12,cursor:"pointer",padding:"4px 0"}}>{T(UI.back,L)}</button>
            </div>
          </div>
        )}

        {/* ── TEXTAREA ── */}
        {stepData.type==="textarea"&&(
          <div>
            <textarea value={val} onChange={e=>setVal(e.target.value)} placeholder={ph} rows={6} autoFocus
              style={{width:"100%",border:"2px solid var(--brd)",borderRadius:12,padding:"14px 16px",fontSize:14,color:"var(--ink)",lineHeight:1.7,resize:"vertical",background:"#fff",outline:"none",fontFamily:"inherit",marginBottom:12}}
              onFocus={e=>e.target.style.borderColor="var(--navy)"} onBlur={e=>e.target.style.borderColor="var(--brd)"}/>
            <Btn onClick={()=>val.trim()&&advance(stepData.field,val.trim())} disabled={!val.trim()} full>{T(UI.continue,L)}</Btn>
            <button onClick={onBack} style={{background:"none",border:"none",color:"var(--ink3)",fontFamily:"inherit",fontSize:12,cursor:"pointer",marginTop:12,padding:"4px 0"}}>{T(UI.back,L)}</button>
          </div>
        )}

        {/* ── GROUPED ── */}
        {stepData.type==="grouped"&&(
          <GroupedStep stepData={stepData} lang={L} value={answers[stepData.field]} onAnswer={(f,v)=>advance(f,v)} onBack={onBack}/>
        )}

        {/* ── REPEAT ── */}
        {stepData.type==="repeat"&&(
          <RepeatStep stepData={stepData} lang={L} value={answers[stepData.field]}
            onAnswer={(f,v,done)=>{
              if(done) advance(f,v);
              else answers[f]=v; // interim update without advancing
            }} onBack={onBack}/>
        )}

        {/* ── STORY ── */}
        {stepData.type==="story"&&(
          <StoryStep stepData={stepData} lang={L} answers={answers} value={answers[stepData.field]} feedback={feedbackState} onAnswer={(f,v)=>advance(f,v)} onFeedbackDone={onFeedbackDone} onBack={onBack} avgStrength={avgStrength}/>
        )}

        {/* ── REVIEW ── */}
        {stepData.type==="review"&&(
          <ReviewCard answers={answers} lang={L} onConfirm={()=>advance(null,null)} onBack={onBack}/>
        )}
      </div>
    </div>
  );
}

// ── LANG SELECT ───────────────────────────────────────────────────────────────
function LangSelect({onSelect}) {
  const [idx, setIdx] = useState(0);
  const [vis, setVis] = useState(true);
  useEffect(()=>{
    const t=setInterval(()=>{setVis(false);setTimeout(()=>{setIdx(i=>(i+1)%HELLOS.length);setVis(true);},300);},2200);
    return()=>clearInterval(t);
  },[]);
  const g = HELLOS[idx];
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(155deg,#0d2137 0%,#1e3a5c 50%,#1a5c52 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 20px"}}>
      <style>{CSS}</style>
      <div style={{textAlign:"center",marginBottom:40,minHeight:120,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(-8px)",transition:"all .28s ease"}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:"clamp(56px,12vw,88px)",color:"#fff",fontWeight:700,lineHeight:1}}>{g.w}</div>
          <div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:6,letterSpacing:"3px",textTransform:"uppercase"}}>{g.l}</div>
        </div>
      </div>
      <div style={{marginBottom:28,textAlign:"center"}}>
        <div style={{color:"rgba(255,255,255,.9)",fontSize:16,fontWeight:600,marginBottom:4}}>⚖️ PRRA Guide · Canada</div>
        <div style={{color:"rgba(255,255,255,.45)",fontSize:13}}>Choose your language to begin</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(126px,1fr))",gap:6,maxWidth:580,width:"100%"}}>
        {LANGS.map(({k,f,l})=>(
          <button key={k} onClick={()=>onSelect(k)}
            style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.14)",borderRadius:10,padding:"8px 10px",color:"#fff",fontFamily:"inherit",fontSize:12,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.2)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.08)";}}>
            <span style={{fontSize:16}}>{f}</span><span>{l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── RESUME SCREEN ─────────────────────────────────────────────────────────────
function ResumeScreen({saved, onResume, onRestart}) {
  const L = saved?.lang||"en";
  const n = daysLeft(saved?.answers?.deadline);
  const [bg,tc] = n!==null&&n<=3?["var(--redp)","var(--red)"]:n!==null&&n<=7?["var(--amberp)","var(--amber)"]:["var(--tealp)","var(--teal)"];
  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 16px"}}>
      <style>{CSS}</style>
      <div className="fi" style={{background:"var(--paper)",borderRadius:16,maxWidth:460,width:"100%",padding:"36px 28px",boxShadow:"0 4px 28px rgba(30,58,92,.1)"}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:42,marginBottom:10}}>📋</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:24,color:"var(--ink)",marginBottom:6}}>{T(UI.resumeTitle,L)}, {saved?.answers?.firstName||""}!</h2>
          <p style={{color:"var(--ink2)",fontSize:14,lineHeight:1.6}}>{T(UI.resumeSub,L)}</p>
        </div>
        {n!==null&&<div style={{background:bg,borderRadius:10,padding:"12px",textAlign:"center",marginBottom:18}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:26,color:tc,fontWeight:700}}>{Math.max(0,n)} {T(UI.daysLeft,L)}</div>
          <div style={{color:tc,fontSize:13,opacity:.85}}>{T(UI.deadline,L)}: {fmtDate(saved.answers?.deadline)}</div>
        </div>}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Btn onClick={onResume} full>{T(UI.resumeYes,L)}</Btn>
          <Btn onClick={onRestart} variant="secondary" full style={{fontSize:13}}>{T(UI.resumeNo,L)}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── GENERATING SCREEN ─────────────────────────────────────────────────────────
const GEN_MSGS = {
  en:["Analyzing your story…","Writing your submission letter…","Filling your official forms…","Almost ready…"],
  es:["Analizando tu historia…","Escribiendo tu carta…","Llenando tus formularios oficiales…","Casi listo…"],
  fr:["Analyse de votre histoire…","Rédaction de votre lettre…","Remplissage de vos formulaires officiels…","Presque prêt…"],
};

function GeneratingScreen({lang, answers, onDone}) {
  const [msgIdx, setMsgIdx] = useState(0);
  const msgs = GEN_MSGS[lang]||GEN_MSGS.en;

  useEffect(()=>{
    const int = setInterval(()=>setMsgIdx(i=>Math.min(i+1,msgs.length-1)),2200);
    let cancelled = false;
    (async()=>{
      try {
        const docTexts = await generateDocuments(answers, lang);
        const answersWithLang = {...answers, _lang:lang};
        const [imm5476Blob, imm5508Blob] = await Promise.all([
          answers.hasRep==="yes" ? fillIMM5476(answers) : Promise.resolve(null),
          fillIMM5508(answersWithLang, docTexts),
        ]);
        if(!cancelled) onDone({docTexts, imm5476Blob, imm5508Blob});
      } catch(err) {
        if(!cancelled) onDone({docTexts:{letter:"Error generating documents. Please try again.",incidents:"",protection:"",docSupport:[]}, imm5476Blob:null, imm5508Blob:null});
      }
    })();
    return()=>{cancelled=true;clearInterval(int);};
  },[]);

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(155deg,#0d2137 0%,#1e3a5c 50%,#1a5c52 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 20px"}}>
      <style>{CSS}</style>
      <div style={{width:60,height:60,border:"4px solid rgba(255,255,255,.2)",borderTop:"4px solid #fff",borderRadius:"50%",animation:"spin 1.2s linear infinite",marginBottom:28}}/>
      <h2 style={{fontFamily:"Georgia,serif",color:"#fff",fontSize:"clamp(20px,4vw,28px)",textAlign:"center",marginBottom:10}}>{T(UI.generating,lang)}</h2>
      <p style={{color:"rgba(255,255,255,.65)",fontSize:15,textAlign:"center",transition:"all .4s"}}>{msgs[msgIdx]}</p>
      <div style={{display:"flex",gap:6,marginTop:24}}>
        {msgs.map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:i<=msgIdx?"#fff":"rgba(255,255,255,.25)",transition:"background .3s"}}/>)}
      </div>
    </div>
  );
}

// ── PAYWALL SCREEN ────────────────────────────────────────────────────────────
function PaywallScreen({lang, answers, onPay}) {
  const L = lang;
  const n = daysLeft(answers.deadline);
  const docs = [
    {icon:"📄",name:T(UI.doc1,L),desc:{en:"Your personalized risk submission letter, professionally written in English",es:"Tu carta de argumentación de riesgos, escrita profesionalmente en inglés",fr:"Votre lettre d'observations sur les risques, rédigée professionnellement"}},
    ...(answers.hasRep==="yes"?[{icon:"📋",name:T(UI.doc2,L),desc:{en:"Official IMM 5476 form pre-filled with your and your representative's information",es:"Formulario IMM 5476 oficial pre-llenado con tu información y la de tu representante",fr:"Formulaire IMM 5476 officiel pré-rempli avec vos informations et celles de votre représentant"}}]:[]),
    {icon:"📝",name:T(UI.doc3,L),desc:{en:"Official IMM 5508 form filled with all your information — ready to sign and submit",es:"Formulario IMM 5508 oficial llenado con toda tu información — listo para firmar y enviar",fr:"Formulaire IMM 5508 officiel rempli avec toutes vos informations — prêt à signer et soumettre"}},
  ];
  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",padding:"0 0 48px"}}>
      <style>{CSS}</style>
      <div style={{background:"linear-gradient(135deg,var(--navy2),var(--navy))",padding:"28px 20px 32px"}}>
        <div style={{maxWidth:560,margin:"0 auto",textAlign:"center"}}>
          <div style={{fontSize:46,marginBottom:10}}>✅</div>
          <h1 style={{fontFamily:"Georgia,serif",color:"#fff",fontSize:"clamp(22px,4vw,28px)",marginBottom:8}}>{T(UI.payTitle,L)}</h1>
          <p style={{color:"rgba(255,255,255,.7)",fontSize:14,lineHeight:1.6}}>{T(UI.paySub,L)}</p>
          {n!==null&&<div style={{marginTop:12,background:"rgba(255,255,255,.15)",borderRadius:10,padding:"9px 16px",display:"inline-block",color:"#fff",fontSize:13,fontWeight:600}}>{Math.max(0,n)} {T(UI.daysLeft,L)} · {fmtDate(answers.deadline)}</div>}
        </div>
      </div>
      <div style={{maxWidth:560,margin:"0 auto",padding:"22px 16px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:22}}>
          {docs.map((doc,i)=>(
            <div key={i} style={{background:"var(--paper)",borderRadius:14,padding:"16px",border:"1px solid var(--brd)",display:"flex",gap:12,alignItems:"flex-start",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,backdropFilter:"blur(5px)",background:"rgba(248,245,240,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>
                <span style={{fontSize:26}}>🔒</span>
              </div>
              <span style={{fontSize:26,flexShrink:0}}>{doc.icon}</span>
              <div><div style={{fontWeight:700,fontSize:14,color:"var(--ink)",marginBottom:3}}>{doc.name}</div>
              <div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.5}}>{T(doc.desc,L)}</div></div>
            </div>
          ))}
        </div>
        <Btn onClick={onPay} full style={{fontSize:17,padding:"16px",marginBottom:10}}>{T(UI.payBtn,L)}</Btn>
        <p style={{fontSize:12,color:"var(--ink3)",textAlign:"center",lineHeight:1.6}}>
          {L==="es"?"Pago seguro. Descarga inmediata. Los documentos son solo para tu uso.":L==="fr"?"Paiement sécurisé. Téléchargement immédiat. Les documents sont uniquement pour votre usage.":"Secure payment. Immediate download. Documents are for your use only."}
        </p>
      </div>
    </div>
  );
}

// ── SUCCESS SCREEN ────────────────────────────────────────────────────────────
function SuccessScreen({lang, answers, documents, onRestart}) {
  const L = lang;
  const [dl, setDl] = useState(null);

  const downloadLetter = () => {
    setDl("letter");
    const blob = new Blob([documents.docTexts?.letter||""], {type:"text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="PRRA_Submission_Letter.txt"; a.click();
    URL.revokeObjectURL(url);
    setTimeout(()=>setDl(null),1000);
  };

  const downloadPDF = (blob, name) => {
    if(!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=name; a.click();
    URL.revokeObjectURL(url);
  };

  const docs = [
    {key:"letter",icon:"📄",name:T(UI.doc1,L), action:downloadLetter,      avail:!!documents?.docTexts?.letter},
    ...(answers.hasRep==="yes"?[{key:"5476",icon:"📋",name:T(UI.doc2,L),action:()=>downloadPDF(documents.imm5476Blob,"IMM_5476_Filled.pdf"),avail:!!documents?.imm5476Blob}]:[]),
    {key:"5508",icon:"📝",name:T(UI.doc3,L),   action:()=>downloadPDF(documents.imm5508Blob,"IMM_5508_Filled.pdf"), avail:!!documents?.imm5508Blob},
  ];

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",padding:"0 0 48px"}}>
      <style>{CSS}</style>
      <div style={{background:"linear-gradient(135deg,var(--teal),#1a6b3e)",padding:"30px 20px"}}>
        <div style={{maxWidth:560,margin:"0 auto",textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:10}}>🎉</div>
          <h1 style={{fontFamily:"Georgia,serif",color:"#fff",fontSize:"clamp(20px,4vw,26px)",marginBottom:8}}>{T(UI.successTitle,L)}</h1>
          <p style={{color:"rgba(255,255,255,.8)",fontSize:14,lineHeight:1.65}}>{T(UI.successSub,L)}</p>
        </div>
      </div>
      <div style={{maxWidth:560,margin:"0 auto",padding:"22px 16px"}}>
        {answers.deadline&&<div style={{background:"var(--redp)",borderRadius:12,padding:"12px 16px",marginBottom:18,fontSize:13,color:"var(--red)",fontWeight:600,textAlign:"center"}}>
          ⏰ {T(UI.deadline,L)}: {fmtDate(answers.deadline)} — {Math.max(0,daysLeft(answers.deadline)||0)} {T(UI.daysLeft,L)}
        </div>}
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
          {docs.map(doc=>(
            <div key={doc.key} style={{background:"var(--paper)",borderRadius:14,padding:"16px",border:`1.5px solid ${doc.avail?"var(--teal)":"var(--brd)"}`,display:"flex",gap:12,alignItems:"center"}}>
              <span style={{fontSize:24,flexShrink:0}}>{doc.icon}</span>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:"var(--ink)"}}>{doc.name}</div></div>
              {doc.avail&&<Btn onClick={doc.action} variant="teal" style={{padding:"9px 16px",fontSize:13,flexShrink:0}}>{dl===doc.key?"…":T(UI.download,L)}</Btn>}
            </div>
          ))}
        </div>
        <div style={{background:"var(--amberp)",borderRadius:12,padding:"12px 16px",marginBottom:18,fontSize:13,color:"var(--amber)",lineHeight:1.65}}>
          ✏️ {T(UI.sign,L)}
        </div>
        <button onClick={onRestart} style={{background:"none",border:"1px solid var(--brd)",borderRadius:10,padding:"10px 20px",cursor:"pointer",color:"var(--ink3)",fontFamily:"inherit",fontSize:13,display:"block",margin:"0 auto"}}>{T(UI.startOver,L)}</button>
      </div>
    </div>
  );
}

// ── DEADLINE PASSED SCREEN ────────────────────────────────────────────────────
function DeadlinePassedScreen({lang, deadline, onRestart}) {
  const L = lang;

  const IRCC_WEBFORM = "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/contact-ircc/web-form.html";
  const INTL_PHONE   = "https://www.canada.ca/en/employment-social-development/corporate/contact/1-800-o-canada-international.html";
  const BRO_EMAIL    = "mailto:vancouverbro@cic.gc.ca?subject=PRRA%20Application%20%E2%80%93%20File%20Number%3A%20INSERT%20APPLICATION%20FILE%20NUMBER%20HERE";

  const txt = {
    en:{
      title:"We are sorry — your application deadline has passed",
      body:"The deadline to submit your Pre-Removal Risk Assessment (PRRA) application was {date}. Unfortunately, as that date has now passed, you are no longer able to apply through the standard process.",
      note:"You may still have options available under exceptional circumstances. We strongly encourage you to act immediately — every day matters.",
      o1title:"Contact your immigration lawyer or consultant",
      o1body:"If you have an immigration lawyer, consultant, or advisor, contact them immediately. They may be aware of options available to you under exceptional circumstances and can act on your behalf.",
      o2title:"Email the IRCC Backlog Reduction Office (BRO)",
      o2body:"The BRO handles PRRA applications and may be able to assist you. Send an email to the Vancouver BRO office at:",
      o2include:"Include the following in your email:",
      o2items:[
        "Your full name, exactly as it appears on your official documents",
        "Your Unique Client Identifier (UCI) or Client ID number",
        "Your application file number in the subject line of the email",
      ],
      o2note:"Before sending, replace INSERT APPLICATION FILE NUMBER HERE in the subject line with your actual file number.",
      o2btn:"Open email draft →",
      o3title:"Contact IRCC online or by phone",
      o3body:"You can submit an online request to IRCC explaining your situation, or call them directly.",
      o3webBtn:"IRCC Online Web Form →",
      o3phone:"You can also call IRCC directly at:",
      o3num:"1-888-242-2100",
      o3hours:"Monday to Friday, 8:00 AM – 4:00 PM (Canada only)",
      o4title:"General information line — last resort",
      o4body:"For general questions only, you may call 1-800-O-Canada (1-800-622-6232). Please note this number is for use within Canada only.",
      o4intl:"Calling from outside Canada?",
      o4intlBtn:"Find international contact numbers →",
      restart:"Start a new application",
    },
    es:{
      title:"Lo sentimos — la fecha límite de tu solicitud ha pasado",
      body:"La fecha límite para presentar tu solicitud de Evaluación de Riesgos Antes de la Remoción (PRRA) era el {date}. Lamentablemente, dado que esa fecha ya ha pasado, ya no puedes aplicar a través del proceso estándar.",
      note:"Es posible que todavía tengas opciones disponibles bajo circunstancias excepcionales. Te instamos a actuar de inmediato — cada día cuenta.",
      o1title:"Contacta a tu abogado o consultor de inmigración",
      o1body:"Si tienes un abogado, consultor o asesor de inmigración, contáctalo de inmediato. Es posible que conozca opciones disponibles bajo circunstancias excepcionales y pueda actuar en tu nombre.",
      o2title:"Envía un correo electrónico a la Oficina de Reducción de Atrasos (BRO) del IRCC",
      o2body:"La BRO maneja las solicitudes PRRA y puede ayudarte. Envía un correo electrónico a la oficina BRO de Vancouver a:",
      o2include:"Incluye lo siguiente en tu correo:",
      o2items:[
        "Tu nombre completo, exactamente como aparece en tus documentos oficiales",
        "Tu Identificador Único de Cliente (UCI) o número de ID de cliente",
        "El número de expediente de tu solicitud en el asunto del correo",
      ],
      o2note:"Antes de enviar, reemplaza INSERT APPLICATION FILE NUMBER HERE en el asunto con tu número de expediente real.",
      o2btn:"Abrir borrador de correo →",
      o3title:"Contacta al IRCC en línea o por teléfono",
      o3body:"Puedes enviar una solicitud en línea al IRCC explicando tu situación, o llamarlos directamente.",
      o3webBtn:"Formulario web en línea del IRCC →",
      o3phone:"También puedes llamar al IRCC directamente a:",
      o3num:"1-888-242-2100",
      o3hours:"De lunes a viernes, 8:00 AM – 4:00 PM (solo dentro de Canadá)",
      o4title:"Línea de información general — último recurso",
      o4body:"Solo para preguntas generales, puedes llamar al 1-800-O-Canada (1-800-622-6232). Ten en cuenta que este número es únicamente para uso dentro de Canadá.",
      o4intl:"¿Llamando desde fuera de Canadá?",
      o4intlBtn:"Encuentra números de contacto internacionales →",
      restart:"Iniciar una nueva solicitud",
    },
    fr:{
      title:"Nous sommes désolés — la date limite de votre demande est passée",
      body:"La date limite pour soumettre votre demande d'Examen des Risques Avant Renvoi (ERAR) était le {date}. Malheureusement, cette date étant maintenant passée, vous ne pouvez plus postuler par le biais du processus standard.",
      note:"Des options pourraient encore être disponibles dans des circonstances exceptionnelles. Nous vous encourageons vivement à agir immédiatement — chaque jour compte.",
      o1title:"Contactez votre avocat ou consultant en immigration",
      o1body:"Si vous avez un avocat, consultant ou conseiller en immigration, contactez-le immédiatement. Il pourrait connaître des options disponibles dans des circonstances exceptionnelles et agir en votre nom.",
      o2title:"Envoyez un courriel au Bureau de réduction des arriérés (BRA) de l'IRCC",
      o2body:"Le BRA traite les demandes PRRA et pourrait être en mesure de vous aider. Envoyez un courriel au bureau BRA de Vancouver à:",
      o2include:"Incluez les éléments suivants dans votre courriel:",
      o2items:[
        "Votre nom complet, exactement tel qu'il figure sur vos documents officiels",
        "Votre Identifiant unique de client (IUC) ou numéro d'identifiant client",
        "Le numéro de dossier de votre demande dans l'objet du courriel",
      ],
      o2note:"Avant d'envoyer, remplacez INSERT APPLICATION FILE NUMBER HERE dans l'objet par votre vrai numéro de dossier.",
      o2btn:"Ouvrir le brouillon du courriel →",
      o3title:"Contactez l'IRCC en ligne ou par téléphone",
      o3body:"Vous pouvez soumettre une demande en ligne à l'IRCC en expliquant votre situation, ou les appeler directement.",
      o3webBtn:"Formulaire web en ligne de l'IRCC →",
      o3phone:"Vous pouvez également appeler l'IRCC directement au:",
      o3num:"1-888-242-2100",
      o3hours:"Du lundi au vendredi, 8h00 – 16h00 (Canada seulement)",
      o4title:"Ligne d'information générale — dernier recours",
      o4body:"Pour des questions générales seulement, vous pouvez appeler le 1-800-O-Canada (1-800-622-6232). Veuillez noter que ce numéro est uniquement pour une utilisation au Canada.",
      o4intl:"Vous appelez depuis l'extérieur du Canada?",
      o4intlBtn:"Trouver les numéros de contact internationaux →",
      restart:"Commencer une nouvelle demande",
    },
  };

  const m = txt[L] || txt.en;
  const bodyText = m.body.replace("{date}", fmtDate(deadline));

  const card  = {background:"var(--paper)",borderRadius:14,padding:"20px",border:"1px solid var(--brd)",marginBottom:12};
  const badge = {display:"inline-block",background:"var(--navy)",color:"#fff",borderRadius:20,fontSize:11,fontWeight:700,padding:"3px 10px",marginBottom:10,letterSpacing:"1px",textTransform:"uppercase"};
  const aBtn  = {display:"inline-block",marginTop:10,background:"var(--navy)",color:"#fff",borderRadius:8,padding:"10px 18px",fontSize:13,fontWeight:700,textDecoration:"none"};
  const aLink = {display:"inline-block",marginTop:8,color:"var(--navy)",fontSize:13,fontWeight:600,textDecoration:"underline"};

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",alignItems:"center",padding:"0 0 48px"}}>
      <style>{CSS}</style>

      <div style={{width:"100%",background:"linear-gradient(135deg,#7f1d1d,#b91c1c)",padding:"36px 20px 32px",textAlign:"center"}}>
        <div style={{fontSize:52,marginBottom:14}}>⏰</div>
        <h1 style={{fontFamily:"Georgia,serif",color:"#fff",fontSize:"clamp(19px,4vw,25px)",lineHeight:1.35,marginBottom:14,maxWidth:540,margin:"0 auto 14px"}}>{m.title}</h1>
        <div style={{background:"rgba(0,0,0,.3)",borderRadius:10,display:"inline-block",padding:"8px 20px",color:"#fff",fontSize:14,fontWeight:700,marginTop:8}}>
          {T(UI.deadline,L)}: {fmtDate(deadline)}
        </div>
      </div>

      <div style={{maxWidth:560,width:"100%",padding:"22px 16px"}}>
        <p style={{fontSize:14,color:"var(--ink)",lineHeight:1.75,marginBottom:14,background:"var(--paper)",borderRadius:12,padding:"16px 18px",borderLeft:"4px solid var(--red)"}}>{bodyText}</p>
        <div style={{background:"var(--amberp)",borderRadius:12,padding:"14px 18px",marginBottom:22,borderLeft:"4px solid var(--amber)"}}>
          <p style={{fontSize:14,color:"#92400e",fontWeight:700}}>⚠️ {m.note}</p>
        </div>

        <div style={card}>
          <div style={badge}>Option 1</div>
          <h3 style={{fontSize:15,fontWeight:700,color:"var(--ink)",marginBottom:8,lineHeight:1.4}}>{m.o1title}</h3>
          <p style={{fontSize:13,color:"var(--ink2)",lineHeight:1.7}}>{m.o1body}</p>
        </div>

        <div style={card}>
          <div style={badge}>Option 2</div>
          <h3 style={{fontSize:15,fontWeight:700,color:"var(--ink)",marginBottom:8,lineHeight:1.4}}>{m.o2title}</h3>
          <p style={{fontSize:13,color:"var(--ink2)",lineHeight:1.7,marginBottom:10}}>{m.o2body}</p>
          <div style={{background:"var(--navyl)",borderRadius:8,padding:"10px 14px",fontSize:14,fontWeight:700,color:"var(--navy)",marginBottom:12}}>vancouverbro@cic.gc.ca</div>
          <p style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:8}}>{m.o2include}</p>
          <ul style={{paddingLeft:20,marginBottom:12}}>
            {m.o2items.map((item,i)=>(
              <li key={i} style={{fontSize:13,color:"var(--ink2)",lineHeight:1.7,marginBottom:4}}>{item}</li>
            ))}
          </ul>
          <p style={{fontSize:12,color:"#92400e",fontWeight:600,background:"var(--amberp)",borderRadius:8,padding:"8px 12px",marginBottom:12}}>⚠️ {m.o2note}</p>
          <a href={BRO_EMAIL} style={aBtn}>{m.o2btn}</a>
        </div>

        <div style={card}>
          <div style={badge}>Option 3</div>
          <h3 style={{fontSize:15,fontWeight:700,color:"var(--ink)",marginBottom:8,lineHeight:1.4}}>{m.o3title}</h3>
          <p style={{fontSize:13,color:"var(--ink2)",lineHeight:1.7,marginBottom:10}}>{m.o3body}</p>
          <a href={IRCC_WEBFORM} target="_blank" rel="noopener noreferrer" style={aBtn}>{m.o3webBtn}</a>
          <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid var(--brd)"}}>
            <p style={{fontSize:13,color:"var(--ink2)",marginBottom:6}}>{m.o3phone}</p>
            <div style={{fontSize:20,fontWeight:700,color:"var(--navy)",marginBottom:4}}>{m.o3num}</div>
            <p style={{fontSize:12,color:"var(--ink3)"}}>{m.o3hours}</p>
          </div>
        </div>

        <div style={{...card,borderColor:"#d1d5db",background:"var(--paper2)"}}>
          <div style={{...badge,background:"var(--ink3)"}}>Option 4</div>
          <h3 style={{fontSize:15,fontWeight:700,color:"var(--ink)",marginBottom:8,lineHeight:1.4}}>{m.o4title}</h3>
          <p style={{fontSize:13,color:"var(--ink2)",lineHeight:1.7,marginBottom:8}}>{m.o4body}</p>
          <div style={{fontSize:18,fontWeight:700,color:"var(--ink)",marginBottom:10}}>1-800-622-6232</div>
          <p style={{fontSize:12,color:"var(--ink3)",marginBottom:4}}>{m.o4intl}</p>
          <a href={INTL_PHONE} target="_blank" rel="noopener noreferrer" style={aLink}>{m.o4intlBtn}</a>
        </div>

        <button onClick={onRestart} style={{background:"none",border:"1px solid var(--brd)",borderRadius:10,padding:"10px 20px",cursor:"pointer",color:"var(--ink3)",fontFamily:"inherit",fontSize:13,display:"block",margin:"16px auto 0"}}>{m.restart}</button>
      </div>
    </div>
  );
}


export default function App() {
  const saved = load();
  const [screen, setScreen]     = useState(saved?"resume":"lang");
  const [lang, setLang]         = useState(saved?.lang||"en");
  const [stepIdx, setStepIdx]   = useState(saved?.stepIdx||0);
  const [answers, setAnswers]   = useState(saved?.answers||{});
  const [feedbacks, setFeedbacks] = useState(saved?.feedbacks||{});
  const [documents, setDocuments] = useState(null);

  const activeSteps = getActiveSteps(answers);
  const totalSteps  = activeSteps.length;
  const currentStep = activeSteps[stepIdx] || activeSteps[activeSteps.length-1];

  // Persist
  useEffect(()=>{
    if(screen!=="lang") save({lang,stepIdx,answers,feedbacks,screen});
  },[lang,stepIdx,answers,feedbacks,screen]);

  const avgStrength = (() => {
    const scores = Object.values(feedbacks).map(f=>f?.strength).filter(Boolean);
    return scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
  })();

  const handleAnswer = (field, value, extra={}) => {
    let newAnswers = answers;
    if(field) {
      newAnswers = {...answers, [field]:value, ...extra};
      // Special: calculate deadline and check if already passed
      if(field==="notificationDate" && value) {
        const days = newAnswers.notificationMethod==="inperson"?15:22;
        const dl = addDays(value, days);
        newAnswers.deadline = dl;
        // If deadline is in the past, stop here
        if(daysLeft(dl) < 0) {
          setAnswers(newAnswers);
          setScreen("deadlinePassed");
          return;
        }
      }
      setAnswers(newAnswers);
    }
    // Advance to next step
    const newActive = getActiveSteps(newAnswers);
    const nextIdx = stepIdx+1;
    if(nextIdx < newActive.length) {
      setStepIdx(nextIdx);
    } else {
      setScreen("generating");
    }
  };

  const handleFeedbackDone = (field, finalAnswer, fb) => {
    const na = {...answers, [field]:finalAnswer};
    setAnswers(na);
    setFeedbacks(f=>({...f,[field]:fb}));
    const newActive = getActiveSteps(na);
    const next = stepIdx+1;
    if(next < newActive.length) setStepIdx(next);
    else setScreen("generating");
  };

  const handleBack = () => {
    if(stepIdx > 0) setStepIdx(i=>i-1);
  };

  const restart = () => {
    wipe();
    setScreen("lang"); setLang("en"); setStepIdx(0);
    setAnswers({}); setFeedbacks({}); setDocuments(null);
  };

  if(screen==="lang") return <LangSelect onSelect={l=>{setLang(l);setScreen("wizard");}}/>;

  if(screen==="deadlinePassed") return (
    <DeadlinePassedScreen lang={lang} deadline={answers.deadline} onRestart={restart}/>
  );

  if(screen==="resume") return (
    <ResumeScreen saved={saved} onResume={()=>setScreen(saved.screen||"wizard")} onRestart={restart}/>
  );

  if(screen==="generating") return (
    <GeneratingScreen lang={lang} answers={answers} onDone={docs=>{setDocuments(docs);setScreen("paywall");}}/>
  );

  if(screen==="paywall") return (
    <PaywallScreen lang={lang} answers={answers} onPay={()=>setScreen("success")}/>
  );

  if(screen==="success") return (
    <SuccessScreen lang={lang} answers={answers} documents={documents} onRestart={restart}/>
  );

  // Wizard
  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column"}}>
      <style>{CSS}</style>
      {currentStep&&(
        <>
          <PhaseBar phase={currentStep.phase} stepNum={stepIdx+1} totalSteps={totalSteps} lang={lang}/>
          <WizardStep
            key={currentStep.id}
            stepData={currentStep}
            lang={lang}
            answers={answers}
            onAnswer={handleAnswer}
            onBack={handleBack}
            feedbackState={feedbacks[currentStep.field]}
            onFeedbackDone={handleFeedbackDone}
            avgStrength={currentStep.phase===6?avgStrength:null}
          />
        </>
      )}
    </div>
  );
}
