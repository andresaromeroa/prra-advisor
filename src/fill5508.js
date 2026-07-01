// ── IMM 5508 PDF FILL FUNCTION ─────────────────────────────────────────────
// Maps wizard answers to all 522 AcroForm fields in the IMM 5508 PDF

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

// Helper: split a phone number into area code and number
function splitPhone(phone) {
  if (!phone) return { area: "", num: "" };
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return { area: digits.slice(-10, -7), num: digits.slice(-7) };
  }
  return { area: "", num: digits };
}

// Helper: split date string (YYYY-MM-DD or DD/MM/YYYY or similar) into day/month/year
function splitDate(dateStr) {
  if (!dateStr) return { d: "", m: "", y: "" };
  // Try YYYY-MM-DD
  let match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return { y: match[1], m: match[2], d: match[3] };
  // Try DD/MM/YYYY
  match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return { d: match[1].padStart(2,"0"), m: match[2].padStart(2,"0"), y: match[3] };
  // Try MM/YYYY
  match = dateStr.match(/^(\d{1,2})\/(\d{4})$/);
  if (match) return { d: "", m: match[1].padStart(2,"0"), y: match[2] };
  return { d: "", m: "", y: "" };
}

// Helper: split call time "9:00 AM" → {h:"09", min:"00", ampm:"am"}
function splitCallTime(t) {
  if (!t) return { h: "", min: "", ampm: "am" };
  const match = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (match) return { h: match[1].padStart(2,"0"), min: match[2], ampm: (match[3]||"am").toLowerCase() };
  return { h: "", min: "", ampm: "am" };
}

// Map document checklist values to human-readable types for E-52
function docTypeLabel(v) {
  const map = {
    passport: "Passport or national ID card",
    threats:  "Threatening letters, emails, or messages",
    police:   "Police reports or court documents",
    medical:  "Medical records showing injuries or trauma",
    news:     "News articles about situation or country",
    photos:   "Photos or videos as evidence",
    witness:  "Written statements from witnesses",
    org:      "Letters from organizations or NGOs",
    other:    "Other supporting documents",
  };
  return map[v] || v;
}

export async function fillIMM5508(answers, docTexts) {
  const { PDFDocument } = await import("pdf-lib");

  const url = BASE + "/imm5508e.pdf";
  const bytes = await fetch(url).then(r => r.arrayBuffer());
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdf.getForm();

  // Safe fill helpers
  const fillText = (name, val) => {
    if (!val) return;
    try { form.getTextField(name).setText(String(val)); } catch {}
  };
  const checkBox = (name, shouldCheck) => {
    if (!shouldCheck) return;
    try { form.getCheckBox(name).check(); } catch {}
  };

  // ── HEADER ──────────────────────────────────────────────────────────────
  const lang = answers._lang || "en";
  if (lang === "fr") {
    checkBox("preferred-language-french", true);
  } else {
    checkBox("preferred-language-english", true);
  }

  if (answers.needsInterpreter === "yes") {
    checkBox("require-interpreter-es", true);
    fillText("interpreter_language", answers.interpreterLanguage || "");
  } else {
    checkBox("require-interpreter-no", true);
  }

  // Always principal applicant for our tool
  checkBox("you-are-the-principal-applicant", true);

  // Previous refugee protection
  if (answers.claimRejected === "yes" || ["abroad","canada","both"].includes(answers.prevRefugeeClaims)) {
    checkBox("PREVIOUSLY-APPLIED-FOR-REFUGEE-PROTECTION-YES", true);
  } else {
    checkBox("PREVIOUSLY-APPLIED-FOR-REFUGEE-PROTECTION-NO", true);
  }

  // Applied for PRRA before
  if (answers.isFirstPRRA === "no") {
    checkBox("APPLIED-PRRA-BEFORE-YES", true);
  } else {
    checkBox("APPLIED-PRRA-BEFORE-NO", true);
  }

  fillText("client-id-number", answers.uci && answers.uci !== "skip" ? answers.uci : "");

  // ── SECTION A — PERSONAL INFO ────────────────────────────────────────────
  fillText("A-1-Surname-Family-Name", answers.lastName || "");
  fillText("A-1-Given-names", answers.firstName || "");
  fillText("A-2-OTHER-NAMES-USED", answers.otherNames && answers.otherNames !== "skip" ? answers.otherNames : "");

  // Sex checkboxes
  if (answers.sex === "male") {
    checkBox("A-3-MALE", true);
  } else if (answers.sex === "female") {
    checkBox("A-4-MALE", true); // confusingly named field for female
  }

  // DOB
  const dob = splitDate(answers.dob);
  fillText("A-4-DATE-OF-BIRTH", dob.d && dob.m && dob.y ? `${dob.d}/${dob.m}/${dob.y}` : answers.dob || "");
  fillText("A-4-PLACE-OF-BIRTH", answers.placeOfBirth || "");

  fillText("A-5-CITIZEN-OF-1", answers.country || "");
  fillText("A-5-CITIZEN-OF-2", answers.citizenship2 && answers.citizenship2 !== "skip" ? answers.citizenship2 : "");

  // Physical description
  const phys = answers.physicalDesc || {};
  fillText("A-6-HEIGHT", phys.height || "");
  fillText("A-7-WEIGHT", phys.weight || "");
  fillText("A-8-EYE-COLOR", phys.eyeColor || "");

  // Marital status
  const ms = answers.maritalStatus;
  if (ms) {
    checkBox("A-9-MARITAL-STATUS-UNMARRIED",        ms === "unmarried");
    checkBox("A-9-MARITAL-STATUS-MARRIED",          ms === "married" || ms === "commonlaw");
    checkBox("A-9-MARITAL-STATUS-WIDOWED",          ms === "widowed");
    checkBox("A-9-MARITAL-STATUS-LEGALLY-SEPARATED",ms === "separated");
    checkBox("A-9-MARITAL-STATUS-DIVORCED",         ms === "divorced");
    checkBox("A-9-MARITAL-STATUS-ANNULLED",         ms === "annulled");
  }

  // Address
  fillText("A-10-PRESENT-ADDRESS", answers.address || "");
  fillText("A-10-POSTAL-CODE", answers.postalCode || "");

  const phone = splitPhone(answers.homePhone);
  fillText("A-10-HOME-TEL-AREA-CODE", phone.area);
  fillText("A-10-HOME-TEL-NUMBER", phone.num);

  // Mailing address same as present
  checkBox("A-11-MAILING-ADDRESS-SAME-AS-PRESENT-ADDRESS", true);

  // Message phone
  if (answers.msgPhone && answers.msgPhone !== "skip") {
    const msgP = splitPhone(answers.msgPhone);
    fillText("A-12-MSG-TEL-AREA-CODE", msgP.area);
    fillText("A-12-MSG-TEL-NUMBER", msgP.num);
  }

  // Call time
  const ct = splitCallTime(answers.callTime);
  fillText("A-13-CONV-TIME-HH", ct.h);
  fillText("A-13-CONV-TIME-MM", ct.min);
  checkBox("A-13-CONV-TIME-AM", ct.ampm === "am");
  checkBox("A-13-CONV-TIME-PM", ct.ampm === "pm");

  // A-14: Family applying together (up to 3)
  const fam = answers.familyApplying || [];
  fam.slice(0, 3).forEach((f, i) => {
    const n = i + 1;
    fillText(`A-14-FAM-MEM-SURNAME-${n}`,      f.surname || "");
    fillText(`A-14-FAM-MEM-GIVEN-NAMES-${n}`,  f.givenNames || "");
    checkBox(`A-14-FAM-MEM-SEX-MALE-${n}`,     f.sex === "male");
    checkBox(`A-14-FAM-MEM-SEX-FEMALE-${n}`,   f.sex === "female");
    fillText(`A-14-FAM-MEM-DOB-${n}`,          f.dob || "");
    fillText(`A-14-FAM-MEM-MARITAL-STATUS-${n}`,f.marital || "");
    fillText(`A-14-FAM-MEM-RELATIONSHIP-${n}`, f.relationship || "");
    fillText(`A-14-FAM-MEM-CLIENT-ID-NO-${n}`, f.clientId || "");
    fillText(`A-14-FAM-MEM-CITIZENSHIP-${n}`,  f.citizenship || "");
  });

  // A-15: Family worldwide (up to 13)
  const fw = answers.familyWorldwide || [];
  fw.slice(0, 13).forEach((f, i) => {
    const n = i + 1;
    fillText(`A-15-FAM-NAME-${n}`,       f.familyName || "");
    fillText(`A-15-GIVEN-NAME-${n}`,     f.givenName || "");
    fillText(`A-15-DOB-${n}`,            f.dob || "");
    fillText(`A-15-CITIZENSHIP-${n}`,    f.citizenship || "");
    fillText(`A-15-RELATIONSHIP-${n}`,   f.relationship || "");
    checkBox(`A-15-IN-CANADA-YES-${n}`,  f.inCanada === "yes");
    checkBox(`A-15-IN-CANADA-NO-${n}`,   f.inCanada !== "yes");
    fillText(`A-15-IF-YES-${n}`,         f.statusOrLocation || "");
  });

  // ── SECTION B — PERSONAL HISTORY ─────────────────────────────────────────

  // B-16: Countries lived in last 10 years (home country as row 1, then others)
  const lived = answers.countriesLived || [];
  // Row 1: home country
  fillText("B-16-COUNTRY-1", answers.country || "");
  fillText("B-16-STATUS-1",  "Citizen");
  fillText("B-16-DATE-FROM-1", "");
  fillText("B-16-DATE-TO-1",   "");
  // Rows 2-4: other countries
  lived.slice(0, 3).forEach((c, i) => {
    const n = i + 2;
    fillText(`B-16-COUNTRY-${n}`,    c.country || "");
    fillText(`B-16-STATUS-${n}`,     c.status || "");
    fillText(`B-16-DATE-FROM-${n}`,  c.dateFrom || "");
    fillText(`B-16-DATE-TO-${n}`,    c.dateTo || "");
  });

  // B-17: Been to Canada before
  checkBox("B-17-YES", answers.beenToCanada === "yes");
  checkBox("B-17-NO",  answers.beenToCanada !== "yes");
  const visits = answers.canadaVisits || [];
  visits.slice(0, 3).forEach((v, i) => {
    const n = i + 1;
    fillText(`B-17-IF-YES-DATE-FROM-${n}`, v.dateFrom || "");
    fillText(`B-17-IF-YES-DATE-TO-${n}`,   v.dateTo || "");
    fillText(`B-17-IF-YES-PURPOSE-${n}`,   v.purpose || "");
  });

  // B-18: War crimes
  checkBox("B-18-YES", answers.warCrimes === "yes");
  checkBox("B-18-NO",  answers.warCrimes !== "yes");

  // B-19: Military service
  checkBox("B-19-YES", answers.militaryService === "yes");
  checkBox("B-19-NO",  answers.militaryService !== "yes");
  const mil = answers.militaryDetails || [];
  mil.slice(0, 3).forEach((m, i) => {
    const n = i + 1;
    fillText(`B-19-IF-YES-DATE-FROM-${n}`,    m.dateFrom || "");
    fillText(`B-19-IF-YES-DATE-TO-${n}`,      m.dateTo || "");
    fillText(`B-19-IF-YES-ORG-NAME-${n}`,     m.orgName || "");
    fillText(`B-19-IF-YES-LOC-SERVED-${n}`,   m.location || "");
    fillText(`B-19-IF-YES-POSITION-HELD-${n}`,m.position || "");
  });

  // B-20: Armed conflict
  checkBox("B-20-YES", answers.armedConflict === "yes");
  checkBox("B-20-NO",  answers.armedConflict !== "yes");
  const conf = answers.conflictDetails || [];
  conf.slice(0, 3).forEach((c, i) => {
    const n = i + 1;
    fillText(`B-20-IF-YES-DATE-FROM-${n}`, c.dateFrom || "");
    fillText(`B-20-IF-YES-DATE-TO-${n}`,   c.dateTo || "");
    fillText(`B-20-IF-YES-LOCATION-${n}`,  c.location || "");
    fillText(`B-20-IF-YES-ROLE-DESC-${n}`, c.role || "");
  });

  // B-21: Government positions
  const govPos = answers.govPositions || [];
  for (let i = 1; i <= 7; i++) {
    const held = govPos.includes(String(i));
    checkBox(`B-21-${i}-YES`, held);
    checkBox(`B-21-${i}-NO`,  !held);
  }
  fillText("B-21-IF-YES-POSITION-DESCRIBE-WORK", answers.govPositionDetails || "");

  // B-22: Criminal record
  const hasCriminal = answers.criminalRecord !== "none" && answers.criminalRecord !== undefined;
  checkBox("B-22-YES", hasCriminal);
  checkBox("B-22-NO",  !hasCriminal);
  const charges = answers.criminalCharges || [];
  charges.slice(0, 5).forEach((c, i) => {
    const n = i + 1;
    fillText(`B-22-CONVICTION-CHARGE-${n}`, c.charge || "");
    fillText(`B-22-DATE-${n}`,              c.date || "");
    fillText(`B-22-WHERE-${n}`,             c.where || "");
    fillText(`B-22-SENTENCE-${n}`,          c.sentence || "");
  });
  fillText("B-22-IF-YES-DESCRIBE-CIRCUMSTANCES", answers.criminalCircumstances || "");

  // ── SECTION C — ARRIVAL DETAILS ──────────────────────────────────────────
  const arr = answers.arrivalInCanada || {};
  const arrDate = splitDate(arr.arrivalDate || "");
  fillText("C-23-DAY",          arrDate.d);
  fillText("C-23-MONTH",        arrDate.m);
  fillText("C-23-YEAR",         arrDate.y);
  fillText("C-23-ARRIVAL-PLACE",arr.arrivalPlace || "");

  // C-24: Journey route
  const route = answers.journeyRoute || [];
  route.slice(0, 5).forEach((r, i) => {
    const n = i + 1;
    fillText(`C-24-COUNTRY-${n}`,       r.country || "");
    fillText(`C-24-STATUS-COUNTRY-${n}`,r.status || "");
    fillText(`C-24-TRANSP-METHOD-${n}`, r.transport || "");
    fillText(`C-24-COMPANY-NAME-${n}`,  r.company || "");
    fillText(`C-24-ARRIVAL-DATE-${n}`,  r.arrivalDate || "");
    fillText(`C-24-DEPART-DATE-${n}`,   r.departDate || "");
  });

  // C-25: No Canadian immigrant visa (most PRRA applicants)
  checkBox("C-25-NO", true);

  // C-26: Intend to stay indefinitely (always for PRRA)
  checkBox("C-26-INDEF-PERIOD", true);

  // C-27: Status at arrival
  const arrStatus = answers.arrivalStatus || [];
  checkBox("C-27-LAWF-ADMITTED",  arrStatus.includes("lawful"));
  checkBox("C-27-TEMP-RES-PERM",  arrStatus.includes("terpermit"));
  checkBox("C-27-FALSE-DOCS",     arrStatus.includes("falsedocs"));

  // C-28: False docs detail
  if (arrStatus.includes("falsedocs")) {
    fillText("C-28-FRAUD-MEANS",       answers.falseDocsDetail || "");
    fillText("C-28-MISREP-FACTS",      answers.falseDocsDetail || "");
    fillText("C-28-FALSE-DOC-LOCATION",answers.falseDocsDetail || "");
  }

  // C-29: Arrival documents
  const arrDocs = answers.arrivalDocs || [];
  arrDocs.slice(0, 3).forEach((d, i) => {
    const n = i + 1;
    fillText(`C-29-DOCUMENT-TYPE-${n}`,  d.type || "");
    fillText(`C-29-COUNTRY-ISSUED-${n}`, d.country || "");
    fillText(`C-29-ISSUE-DATE-${n}`,     d.issueDate || "");
    fillText(`C-29-EXPIRY-DATE-${n}`,    d.expiryDate || "");
    fillText(`C-29-SERIAL-NUMBER-${n}`,  d.serialNum || "");
  });

  // C-30 to C-36: Passport/visa questions
  checkBox("C-30-YES", answers.passportApplied === "yes");
  checkBox("C-30-NO",  answers.passportApplied !== "yes");
  checkBox("C-31-YES", answers.passportIssued === "yes");
  checkBox("C-31-NO",  answers.passportIssued !== "yes");
  checkBox("C-32-YES", answers.exitVisaNeeded === "yes");
  checkBox("C-32-NO",  answers.exitVisaNeeded !== "yes");
  checkBox("C-33-YES", answers.exitVisaApplied === "yes");
  checkBox("C-33-NO",  answers.exitVisaApplied !== "yes");
  checkBox("C-34-YES", answers.exitVisaIssued === "yes");
  checkBox("C-34-NO",  answers.exitVisaIssued !== "yes");
  checkBox("C-35-NO",  true); // No Canadian immigrant visa
  checkBox("C-36-NO",  true); // No Canadian temporary resident visa

  // C-37: Why no docs applied
  fillText("C-37-EXPLAIN", answers.whyNoDocApplied || "");

  // C-38: Issued documents
  const issuedDocs = answers.issuedDocs || [];
  issuedDocs.slice(0, 3).forEach((d, i) => {
    const n = i + 1;
    fillText(`C-38-DOC-TYPE-${n}`,         d.type || "");
    fillText(`C-38-DOC-NUMBER-${n}`,        d.number || "");
    fillText(`C-38-DOC-COUNTRY-ISSUE-${n}`, d.country || "");
    fillText(`C-38-DOC-ISSUE-DATE-${n}`,    d.issueDate || "");
    fillText(`C-38-DOC-LOCATION-${n}`,      d.whereNow || "");
    checkBox(`C-38-DOC-FALSE-${n}`,         d.isfalse === "yes");
    const exp = splitDate(d.expiryDate || "");
    fillText(`C-38-EXPIRY-DATE-DAY-${n}`,   exp.d);
    fillText(`C-38-EXPIRY-DATE-MONTH-${n}`, exp.m);
    fillText(`C-38-EXPIRY-DATE-YEAR-${n}`,  exp.y);
  });

  // C-39: Why docs not issued
  fillText("39-REASONS-DOCS-NOT-ISSUED", answers.whyDocsNotIssued || "");

  // C-40: Other travel docs
  const otherDocs = answers.otherTravelDocs || [];
  otherDocs.slice(0, 4).forEach((d, i) => {
    const n = i + 1;
    fillText(`C-40-DOC-TYPE-${n}`,          d.type || "");
    fillText(`C-40-DOC-NUM-${n}`,           d.number || "");
    fillText(`C-40-DOC-COUNTRY-ISSUE-${n}`, d.country || "");
    fillText(`C-40-DOC-ISSUE-DATE-${n}`,    d.issueDate || "");
    checkBox(`C-40-DOC-FALSE-${n}`,         d.isfalse === "yes");
  });

  // C-41: Documents in possession
  const possession = answers.docsInPossession || [];
  possession.slice(0, 4).forEach((d, i) => {
    const n = i + 1;
    fillText(`C-41-DOC-TYPE-${n}`,          d.type || "");
    fillText(`C-41-DOC-NUM-${n}`,           d.number || "");
    fillText(`C-41-DOC-COUNTRY-ISSUE-${n}`, d.country || "");
    fillText(`C-41-DOC-ISSUE-DATE-${n}`,    d.issueDate || "");
  });

  // C-42: Applied for docs after arrival
  checkBox("C-42-YES", answers.appliedDocsAfterArrival === "yes");
  checkBox("C-42-NO",  answers.appliedDocsAfterArrival !== "yes");
  const postArrival = answers.appliedDocsDetails || [];
  postArrival.slice(0, 2).forEach((d, i) => {
    const n = i + 1;
    fillText(`C-42-DOC-TYPE-${n}`,      d.type || "");
    fillText(`C-42-DOC-NUM-${n}`,       d.number || "");
    fillText(`C-42-ISSUE-COUNTRY-${n}`, d.country || "");
    fillText(`C-42-APP-DATE-${n}`,      d.appDate || "");
  });

  // C-43: Travel in last 5 years
  checkBox("C-43-YES", answers.travelLast5Years === "yes");
  checkBox("C-43-NO",  answers.travelLast5Years !== "yes");
  fillText("C-43-IF-YES-GIVE-DETAILS", answers.travelLast5Details || "");

  // ── SECTION D — PRRA SPECIFIC ─────────────────────────────────────────────
  fillText("D-44-ANSWER", answers.countriesAtRisk || answers.country || "");

  checkBox("D-45-YES", answers.wantedByAuthorities === "yes");
  checkBox("D-45-NO",  answers.wantedByAuthorities !== "yes");
  fillText("D-45-IF-YES-WHICH-COUNTRIES", answers.wantedCountries || "");

  // D-46: Previous refugee claims
  const hadClaim = ["abroad","canada","both"].includes(answers.prevRefugeeClaims);
  checkBox("D-46-A-YES", answers.prevRefugeeClaims === "abroad" || answers.prevRefugeeClaims === "both");
  checkBox("D-46-A-NO",  !(answers.prevRefugeeClaims === "abroad" || answers.prevRefugeeClaims === "both"));
  checkBox("D-46-B-YES", answers.prevRefugeeClaims === "canada" || answers.prevRefugeeClaims === "both" || answers.claimRejected === "yes");
  checkBox("D-46-B-NO",  !(answers.prevRefugeeClaims === "canada" || answers.prevRefugeeClaims === "both" || answers.claimRejected === "yes"));

  const prevClaims = answers.prevClaimsDetails || [];
  prevClaims.slice(0, 2).forEach((c, i) => {
    const n = i + 1;
    fillText(`D-46-CLAIM-COUNTRY-${n}`,   c.claimCountry || "");
    fillText(`D-46-FEEING-COUNTRY-${n}`,  c.fleeingFrom || "");
    fillText(`D-46-CLAIM-DATE-${n}`,      c.claimDate || "");
    fillText(`D-46-CLAIM-RESULT-${n}`,    c.result || "");
    fillText(`D-46-LEFT-CANADA-DATE-${n}`,c.leftCanada || "");
  });

  // Fill D-46 text summary fields
  const claimSummary = (answers.prevClaimsDetails||[]).map(c=>`${c.claimCountry||""} (${c.claimDate||""}): ${c.result||""}`).join("; ");
  fillText("D-46-A-IF-YES-DETAILS", claimSummary);
  fillText("D-46-B-IF-YES-DETAILS", claimSummary);

  // D-47: Convention refugee in other countries
  checkBox("D-47-YES", answers.conventionRefugeeOther === "yes");
  checkBox("D-47-NO",  answers.conventionRefugeeOther !== "yes");
  const convClaims = answers.conventionClaimsDetails || [];
  convClaims.slice(0, 3).forEach((c, i) => {
    const n = i + 1;
    fillText(`D-47-CLAIM-COUNTRY-${n}`,    c.claimCountry || "");
    fillText(`D-47-FEEING-COUNTRY-${n}`,   c.fleeingFrom || "");
    fillText(`D-47-CLAIM-DATE-${n}`,       c.claimDate || "");
    fillText(`D-47-CLAIM-RESULT-${n}`,     c.result || "");
    // docIssued may contain "date, serial" — put full text in date field, try to extract SN
    fillText(`D-47-CLAIM-ISSUE-DATE-${n}`, c.docIssued || "");
    const snMatch = (c.docIssued||"").match(/#?([A-Z0-9]{4,})/);
    fillText(`D-47-DOC-SN-${n}`, snMatch ? snMatch[1] : "");
  });

  // D-48: UNHCR
  checkBox("D-48-YES", answers.unhcrApplication === "yes");
  checkBox("D-48-NO",  answers.unhcrApplication !== "yes");
  fillText("D-48-EXPLAIN-1", answers.unhcrNoExplain || "");
  fillText("D-48-EXPLAIN-2", answers.unhcrNoExplain || "");
  const unhcrY = answers.unhcrYesDetails || {};
  fillText("D-48-COUNTRY-APPLIED", unhcrY.country || "");
  checkBox("D-48-CONVENTION-REFUGEE-YES", unhcrY.recognized === "yes");
  checkBox("D-48-CONVENTION-REFUGEE-NO",  unhcrY.recognized === "no");
  checkBox("D-48-STATUS-CONF-DOCS-YES",   unhcrY.hasDoc === "yes");
  checkBox("D-48-STATUS-CONF-DOCS-NO",    unhcrY.hasDoc !== "yes");

  // D-49: Family claims in Canada
  const famClaims = answers.familyClaimsInCanada || [];
  famClaims.slice(0, 3).forEach((c, i) => {
    const n = i + 1;
    fillText(`D-49-FULL-NAME-${n}`,      c.fullName || "");
    fillText(`D-49-RELATIONSHIP-${n}`,   c.relationship || "");
    fillText(`D-49-CLAIM-DATE-${n}`,     c.claimDate || "");
    fillText(`D-49-CLAIM-PLACE-${n}`,    c.claimCountry || "");
    fillText(`D-49-FLEEING-COUNTRY-${n}`,c.fleeingFrom || "");
    fillText(`D-49-CLAIM-RESULT-${n}`,   c.result || "");
  });

  // ── SECTION E — REASONS ──────────────────────────────────────────────────
  // E: Principal applicant always completes reasons (not family member)
  checkBox("E-PRRA-APP-REASONS-NO", true);

  // E-50: Significant incidents — Claude generated
  fillText("E-50-SIGNIFICANT-INCIDENTS", docTexts?.incidents || "");

  // E-51: Protection sought — Claude generated
  fillText("E-51-PROTECTION", docTexts?.protection || "");

  // E-52: Supporting documents
  const docs = answers.documents || [];
  docs.slice(0, 5).forEach((d, i) => {
    const n = i + 1;
    fillText(`E-52-DOC-TYPE-${n}`,          docTypeLabel(d));
    fillText(`E-52-PROTECTION-SUPPORT-${n}`, (docTexts?.docSupport || [])[i] || "");
  });

  // ── SECTION F — DECLARATION ───────────────────────────────────────────────
  const today = new Date();
  fillText("F-DATED-DAY",   String(today.getDate()).padStart(2,"0"));
  fillText("F-DATED-MONTH", String(today.getMonth()+1).padStart(2,"0"));
  fillText("F-DATED-YEAR",  String(today.getFullYear()));

  // City and province from address
  const addrParts = (answers.address || "").split(",").map(s => s.trim());
  fillText("F-SIGNED-CITY",     addrParts[1] || addrParts[0] || "");
  fillText("F-SIGNED-PROVINCE", addrParts[2] || "");

  // Section G: Leave blank — user is applying

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}
