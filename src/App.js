import { useState, useEffect, useRef } from "react";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SB_URL = "https://wtmeywptzxcnxzqharjq.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bWV5d3B0enhjbnh6cWhhcmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTI5NTYsImV4cCI6MjA4OTA2ODk1Nn0.wTzjQcri_I3srSQ807OdxC15-8qMEWGDamos0XFCnbQ";

const sbHeaders = (token) => ({
  "Content-Type": "application/json",
  apikey: SB_KEY,
  Authorization: `Bearer ${token || SB_KEY}`,
  Prefer: "resolution=merge-duplicates,return=minimal",
});

// Upsert a row in user_data table: { user_id, key, value }
const sbSet = async (token, uid, key, value) => {
  try {
    await fetch(`${SB_URL}/rest/v1/user_data`, {
      method: "POST",
      headers: sbHeaders(token),
      body: JSON.stringify({ user_id: uid, key, value: JSON.stringify(value) }),
    });
  } catch {}
};

// Get all rows for a user
const sbGetAll = async (token, uid) => {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/user_data?user_id=eq.${uid}&select=key,value`,
      {
        headers: sbHeaders(token),
      }
    );
    const rows = await res.json();
    if (!Array.isArray(rows)) return {};
    const out = {};
    rows.forEach((r) => {
      try {
        out[r.key] = JSON.parse(r.value);
      } catch {
        out[r.key] = r.value;
      }
    });
    return out;
  } catch {
    return {};
  }
};

// Delete a key
const sbDel = async (token, uid, key) => {
  try {
    await fetch(
      `${SB_URL}/rest/v1/user_data?user_id=eq.${uid}&key=eq.${encodeURIComponent(
        key
      )}`,
      {
        method: "DELETE",
        headers: sbHeaders(token),
      }
    );
  } catch {}
};

// Send magic link
const sendMagicLink = async (email) => {
  const res = await fetch(`${SB_URL}/auth/v1/otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SB_KEY },
    body: JSON.stringify({ email, create_user: true }),
  });
  return res.ok;
};

// Exchange OTP token from URL hash
const getSessionFromUrl = async () => {
  const hash = window.location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash.replace("#", "?"));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token) return null;
  // Verify by getting user
  try {
    const res = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${access_token}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    window.location.hash = "";
    return { access_token, refresh_token, user };
  } catch {
    return null;
  }
};

// Refresh session
const refreshSession = async (refresh_token) => {
  try {
    const res = await fetch(
      `${SB_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SB_KEY },
        body: JSON.stringify({ refresh_token }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
    };
  } catch {
    return null;
  }
};

// ─── APP DATA ─────────────────────────────────────────────────────────────────
const EXAM_DATES = [
  {
    date: "2026-05-12",
    label: "Biology Paper 1",
    subject: "bio",
    code: "8461/1H",
    time: "PM",
    duration: "1h 45m",
  },
  {
    date: "2026-05-14",
    label: "Maths Paper 1 - Non-Calculator",
    subject: "maths",
    code: "1MA1/1H",
    time: "AM",
    duration: "1h 30m",
  },
  {
    date: "2026-05-18",
    label: "Chemistry Paper 1",
    subject: "chem",
    code: "8462/1H",
    time: "AM",
    duration: "1h 45m",
  },
  {
    date: "2026-05-21",
    label: "English Language Paper 1 - Creative Reading & Writing",
    subject: "englang",
    code: "8700/1",
    time: "AM",
    duration: "1h 45m",
  },
  {
    date: "2026-06-02",
    label: "Physics Paper 1",
    subject: "phys",
    code: "8463/1H",
    time: "AM",
    duration: "1h 45m",
  },
  {
    date: "2026-06-03",
    label: "Maths Paper 2 - Calculator",
    subject: "maths",
    code: "1MA1/2H",
    time: "AM",
    duration: "1h 30m",
  },
  {
    date: "2026-06-05",
    label: "English Language Paper 2 - Viewpoints & Perspectives",
    subject: "englang",
    code: "8700/2",
    time: "AM",
    duration: "1h 45m",
  },
  {
    date: "2026-06-05",
    label: "Biology Paper 2",
    subject: "bio",
    code: "8461/2H",
    time: "PM",
    duration: "1h 45m",
  },
  {
    date: "2026-06-10",
    label: "Maths Paper 3 - Calculator",
    subject: "maths",
    code: "1MA1/3H",
    time: "AM",
    duration: "1h 30m",
  },
  {
    date: "2026-06-12",
    label: "Chemistry Paper 2",
    subject: "chem",
    code: "8462/2H",
    time: "AM",
    duration: "1h 45m",
  },
  {
    date: "2026-06-15",
    label: "Physics Paper 2",
    subject: "phys",
    code: "8463/2H",
    time: "AM",
    duration: "1h 45m",
  },
];

const SUBJECT_TOPICS = {
  Biology: [
    "Cell Biology",
    "Transport in Cells",
    "Cell Division",
    "Organisation",
    "Infection & Response",
    "Bioenergetics",
    "Homeostasis",
    "Inheritance",
    "Variation & Evolution",
    "Ecology",
    "Key Concepts in Biology",
    "Genetics",
    "Natural Selection",
    "Ecosystems",
    "Required Practicals",
  ],
  Chemistry: [
    "Atomic Structure",
    "Periodic Table",
    "Structure & Bonding",
    "Chemical Changes",
    "Energy Changes",
    "Rate & Equilibrium",
    "Organic Chemistry",
    "Chemical Analysis",
    "Atmosphere",
    "Using Resources",
    "Quantitative Chemistry",
    "Required Practicals",
  ],
  Physics: [
    "Energy",
    "Electricity",
    "Particle Model",
    "Atomic Structure",
    "Forces",
    "Waves",
    "Magnetism & Electromagnetism",
    "Space Physics",
    "Required Practicals",
  ],
  Maths: [
    "Number",
    "Algebra",
    "Ratio & Proportion",
    "Geometry & Measures",
    "Probability",
    "Statistics",
    "Surds",
    "Quadratics",
    "Simultaneous Equations",
    "Circle Theorems",
    "Vectors",
    "Trigonometry",
    "Transformations",
    "Inequalities",
    "Functions",
    "Iteration",
  ],
  "English Language": [
    "Paper 1 Q1 - List",
    "Paper 1 Q2 - Language Analysis",
    "Paper 1 Q3 - Structure",
    "Paper 1 Q4 - Evaluation",
    "Paper 1 Q5 - Creative Writing",
    "Paper 2 Q1 - Identify",
    "Paper 2 Q2 - Summary",
    "Paper 2 Q3 - Language Analysis",
    "Paper 2 Q4 - Comparison",
    "Paper 2 Q5 - Viewpoint Writing",
  ],
};

const PHASE_INFO = [
  {
    phase: 1,
    name: "Topic-by-Topic Build",
    days: "Days 1-30",
    desc: "One topic per subject per day. Build your Master Doc and complete the PMT question booklet for each topic before moving on.",
    focus: [
      "Daily rotation: Mon = Bio, Tue = Chem, Wed = Phys, Thu = Maths, Fri = next Bio topic... repeat. English covered in your weekly 1hr tutor session.",
      "Science (per topic): PMT summary notes → FreeScienceLessons video → key facts + definitions into Master Doc → highlight summary PDF → attempt PMT question booklet BEFORE checking answers.",
      "Maths (per topic): Maths Genie video → attempt questions yourself first → then check. Stay 1-2 topics ahead of your tutor so lessons are reinforcement, not first exposure.",
      "English: 1hr weekly tutor session covers Paper 2. Between sessions: re-read section just covered and write one timed practice answer for the question type taught.",
    ],
    tip: "On mark schemes: look AFTER writing your full attempt - even if wrong. Your brain needs to struggle first. Copying answers is why things don't stick in lessons.",
  },
  {
    phase: 2,
    name: "Consolidate & Push Harder",
    days: "Days 31-48",
    desc: "Master Doc is built. Now test yourself harder and add Corbett Maths. Flashcards become your daily habit.",
    focus: [
      "Keep the daily rotation but add: 15 mins of flashcard review at the START of each session (definitions from topics already done).",
      "Science: Attempt a second set of PMT questions or a full topic past paper section without notes first. Mark honestly.",
      "Maths: Switch to Corbett Maths for tougher questions on completed topics. This is where Grade 8/9 marks come from. Do Corbett AFTER Maths Genie, not instead.",
      "English: Should be finishing Paper 2 and starting Paper 1 structure with your tutor. Practice one full timed question per week independently.",
    ],
    tip: "By Day 40 your first Language exam is ~40 days away. Make sure your Master Doc for Bio and Maths is fully complete - those exams come fast.",
  },
  {
    phase: 3,
    name: "Exam Mode",
    days: "Days 49-60",
    desc: "Exams are already happening. Prioritise by date. Full papers, timed, honest marking.",
    focus: [
      "Prioritise by order: Bio P1 (12 May) → Maths P1 (14 May) → Chem P1 (18 May) → Lang P1 (21 May). Don't study Physics at the expense of these.",
      "Science: Full timed papers. Mark with mark scheme. For every mark lost, find the topic in your Master Doc and re-read. Then do one more question on it.",
      "Maths: Full Edexcel Higher past papers under timed conditions. Do NOT check mid-paper. Corbett Maths to drill topics where you repeatedly drop marks.",
      "English: One full timed Paper 1 + Paper 2 before each exam. Focus on timing - students often run out of time on Q5 of Paper 2.",
    ],
    tip: "You will feel underprepared. That is normal. Focus only on the next exam. Don't panic about papers that are weeks away.",
  },
];

const DAILY_SCHEDULE = [
  { time: "9:20-9:30", task: "Flashcard warm-up", type: "study" },
  { time: "9:30-10:15", task: "Session - 1", type: "study" },
  { time: "10:15-10:30", task: "Break - 1", type: "break" },
  { time: "10:30-11:15", task: "Session - 2", type: "study" },
  { time: "11:15-11:30", task: "Break - 2", type: "break" },
  { time: "11:30-12:15", task: "Session - 3", type: "study" },
  { time: "12:15-12:30", task: "Break - 3", type: "break" },
  { time: "12:30-1:15", task: "Session - 4", type: "study" },
  { time: "1:15-2:15", task: "Lunch", type: "lunch" },
  { time: "2:15-3:00", task: "Session - 5", type: "study" },
  { time: "3:00-3:15", task: "Break - 4", type: "break" },
  { time: "3:15-4:00", task: "Session - 6", type: "study" },
  { time: "4:00-4:15", task: "Break - 5", type: "break" },
  { time: "4:15-5:00", task: "Session - 7", type: "study" },
  { time: "5:00+", task: "Study done. Evening is yours.", type: "done" },
];

const RESOURCES = [
  {
    subject: "Biology",
    items: [
      "PMT Biology (8461) - topic list + definitions PDF",
      "FreeScienceLessons Biology playlist (YouTube)",
      "Physics and Maths Tutor - past papers by topic",
      "MME predicted papers (Biology)",
    ],
  },
  {
    subject: "Chemistry",
    items: [
      "PMT Chemistry (8462) - topic list + definitions PDF",
      "FreeScienceLessons Chemistry playlist (YouTube)",
      "Physics and Maths Tutor - past papers by topic",
      "Periodic Table on AQA website",
    ],
  },
  {
    subject: "Physics",
    items: [
      "PMT Physics (8463) - topic list + definitions PDF",
      "FreeScienceLessons Physics playlist (YouTube)",
      "Physics and Maths Tutor - past papers by topic",
      "AQA Physics Equation Sheet - memorise ALL of them",
    ],
  },
  {
    subject: "Maths",
    items: [
      "Maths Genie - videos + practice per topic (Phase 1)",
      "Corbett Maths - harder questions (Phase 2+)",
      "Edexcel Higher past papers (2018-2025)",
      "MathsWatch (if Maths Genie isn't clicking for a topic)",
    ],
  },
  {
    subject: "English Language",
    items: [
      "Your tutor's Paper 2 PDF (primary resource)",
      "AQA specimen papers adapted for 2026 format",
      "BBC Bitesize AQA English Language - question-by-question guides",
      "Save My Exams - English Language mark scheme walkthroughs",
    ],
  },
];

const MOTIVATION_TIPS = [
  {
    icon: "⏱",
    title: "Use 45-min blocks, not hours",
    body: "Your brain can't sustain focus for 2 hours straight. 45 minutes on, 15 minutes off is more effective and sustainable. You won't burn out.",
  },
  {
    icon: "♪",
    title: "Music strategy",
    body: "Listen to lo-fi or instrumental music (no lyrics) while studying. It reduces anxiety without breaking focus. Save your favourite songs for breaks as a reward.",
  },
  {
    icon: "◻",
    title: "Phone in another room",
    body: "Put your phone in a different room during each 45-min block. This alone can double your productivity. Check it on breaks.",
  },
  {
    icon: "✓",
    title: "Tick things off a list",
    body: "Each morning, write 3 specific tasks. Ticking boxes gives a dopamine hit - use it. e.g. 'Watch FreeScienceLessons Cell Biology + write notes'.",
  },
  {
    icon: "↑",
    title: "Your parents believed in you",
    body: "They invested in this because they see your potential. Every 45-min session you complete is a real, concrete step forward.",
  },
  {
    icon: "→",
    title: "Feeling stressed is normal",
    body: "Stress means you care. When overwhelmed: stop, take 5 slow deep breaths, get water, go outside for 5 minutes. Then come back. One bad hour doesn't mean a bad day.",
  },
];

const FULL_ROUTINE = [
  {
    time: "7:45 AM",
    label: "Alarm - turn heater on immediately",
    detail:
      "Phone goes across the room before you sleep. The moment the alarm goes off, turn the heater on. Set three alarms: 7:45, 7:50, 7:55.",
    type: "wake",
  },
  {
    time: "7:45-8:00 AM",
    label: "Drink a full glass of water",
    detail:
      "Keep a full glass on your desk the night before. Drink it before anything else. Dehydration is a major cause of morning grogginess.",
    type: "wake",
  },
  {
    time: "8:00-8:15 AM",
    label: "Breakfast",
    detail:
      "2 eggs. Add toast or fruit if you can. Do not skip this - studying on an empty stomach tanks your focus.",
    type: "morning",
  },
  {
    time: "8:15-8:45 AM",
    label: "Morning routine",
    detail:
      "Vitamins → Brush teeth → Shave → Shower → Wipe glasses. Same order every day.",
    type: "morning",
  },
  {
    time: "8:45-9:05 AM",
    label: "Morning skincare - Skin+Me",
    detail:
      "1. Jelly cleanser (no wait needed) → 2. Brighten + Boost azelaic acid serum → wait 5 mins → 3. Rich moisturiser. No Daily Dose in the morning. 20 mins total.",
    type: "morning",
  },
  {
    time: "9:05-9:15 AM",
    label: "Set up study space + flashcard warm-up",
    detail:
      "Clear your desk. Open your Master Doc. 10-15 mins of flashcard review eases your brain in.",
    type: "morning",
  },
  {
    time: "9:00 AM",
    label: "Study begins",
    detail:
      "See the Study Schedule tab for your full 45-min block structure. 7 sessions total with breaks built in.",
    type: "study",
  },
  {
    time: "9:45-10:00 AM",
    label: "Break 1 - Move your body",
    detail: "Walk outside if possible. Stretch. Get water. No phone scrolling.",
    type: "break",
  },
  {
    time: "10:45-11:00 AM",
    label: "Break 2 - Snack + fresh air",
    detail:
      "Small snack (fruit, nuts, crackers). Step outside for 5 mins. One or two songs - set a timer.",
    type: "break",
  },
  {
    time: "11:45-12:00 PM",
    label: "Break 3 - Step outside + water",
    detail:
      "Get out of the room. Drink water. Rest your eyes away from screens.",
    type: "break",
  },
  {
    time: "12:45-1:45 PM",
    label: "Lunch - proper break",
    detail:
      "Cook and eat a real meal. Go outside for at least 10 mins. YouTube is fine. Do NOT start gaming during lunch.",
    type: "lunch",
  },
  {
    time: "2:30-2:45 PM",
    label: "Break 4 - Eyes off screen",
    detail:
      "Look out the window. Stretch your neck and shoulders. Drink water. Splash cold water on your face if drowsy.",
    type: "break",
  },
  {
    time: "3:30-3:45 PM",
    label: "Break 5 - Walk or music",
    detail:
      "Listen to 1-2 favourite songs. Walk around the house. Do not sit back at your desk during this break.",
    type: "break",
  },
  {
    time: "4:30 PM",
    label: "Study done",
    detail:
      "Everything from here is yours. Do not feel guilty about enjoying your evening - you earned it.",
    type: "done",
  },
  {
    time: "4:15-5:15 PM",
    label: "Aim training + Valorant warmup",
    detail:
      "Angle hold v2 (10 min) → Head tracking (5 min) → Flicking practice (5 min) → Deathmatch x2 (20 min) → Team DM x2. Keep to 1hr max.",
    type: "evening",
  },
  {
    time: "5:15-7:15 PM",
    label: "Ranked queue",
    detail:
      "Play until a loss (skip if first game is a loss). Hard cap at 3 games / 2 hours. Set a timer. Finish your current game, then stop.",
    type: "evening",
  },
  {
    time: "7:15-8:15 PM",
    label: "Movie / episodes / chill",
    detail: "1-2 episodes or 1 movie. Guaranteed wind-down time.",
    type: "evening",
  },
  {
    time: "8:15-9:00 PM",
    label: "Homework / flashcards",
    detail:
      "Tutor homework if set. If none: 30 mins of flashcards for recent topics. Last study of the day - keep it light.",
    type: "study",
  },
  {
    time: "9:00-9:20 PM",
    label: "Night skincare - Skin+Me",
    detail:
      "1. Jelly cleanser (no wait needed) → 2. Daily Dose → wait 10 mins → 3. Rich moisturiser. No azelaic acid at night. 20 mins total.",
    type: "night",
  },
  {
    time: "9:20-10:30 PM",
    label: "Wind down",
    detail:
      "Prep tomorrow: fill water glass, set clothes out, put phone across the room. No screens ideally.",
    type: "night",
  },
  {
    time: "11:00 PM",
    label: "In bed - turn off heater",
    detail:
      "Turn the heater off before getting in. Set a timer for it to come back on at 7:30am if needed. Lights out by 11pm.",
    type: "night",
  },
  {
    time: "Note",
    label: "Why 9-11hrs sleep makes it worse",
    detail:
      "Too much sleep disrupts your sleep cycle and makes you more tired. 7.5-8 hours at consistent times is the sweet spot. Same time every day - even weekends.",
    type: "warning",
  },
];

const TODO_ITEMS = [
  {
    id: "t1",
    section: "MORNING",
    time: "7:45 AM",
    label: "Alarm - turn heater on",
    detail:
      "Phone across the room before sleep. Turn heater on immediately. Three alarms: 7:45, 7:50, 7:55.",
  },
  {
    id: "t2",
    section: "MORNING",
    time: "7:45-8:00 AM",
    label: "Drink a full glass of water",
    detail: "Glass on your desk the night before. Drink before anything else.",
  },
  {
    id: "t3",
    section: "MORNING",
    time: "8:00-8:15 AM",
    label: "Breakfast (2 eggs)",
    detail: "Add toast or fruit if you can. Do not skip this.",
  },
  {
    id: "t4",
    section: "MORNING",
    time: "8:15-8:25 AM",
    label: "Vitamins",
    detail: "",
  },
  {
    id: "t5",
    section: "MORNING",
    time: "8:25-8:35 AM",
    label: "Brush teeth",
    detail: "",
  },
  {
    id: "t6",
    section: "MORNING",
    time: "8:35-8:40 AM",
    label: "Shave",
    detail: "",
  },
  {
    id: "t7",
    section: "MORNING",
    time: "8:40-8:55 AM",
    label: "Shower",
    detail: "",
  },
  {
    id: "t8",
    section: "MORNING",
    time: "8:55-9:00 AM",
    label: "Wipe glasses",
    detail: "",
  },
  {
    id: "t9",
    section: "MORNING",
    time: "9:00-9:20 AM",
    label: "Morning skincare",
    detail:
      "Cleanser → Azelaic acid (wait 5 min) → Moisturiser. No Daily Dose in the morning.",
  },
  {
    id: "t10",
    section: "MORNING",
    time: "9:20-9:30 AM",
    label: "Flashcard warm-up",
    detail:
      "10-15 mins of flashcard review. Clear your desk. Open your Master Doc.",
  },
  {
    id: "t11",
    section: "STUDY",
    time: "9:30-10:15 AM",
    label: "Session - 1",
    detail: "",
  },
  {
    id: "t12",
    section: "STUDY",
    time: "10:15-10:30 AM",
    label: "Break - 1",
    detail: "",
  },
  {
    id: "t13",
    section: "STUDY",
    time: "10:30-11:15 AM",
    label: "Session - 2",
    detail: "",
  },
  {
    id: "t14",
    section: "STUDY",
    time: "11:15-11:30 AM",
    label: "Break - 2",
    detail: "",
  },
  {
    id: "t15",
    section: "STUDY",
    time: "11:30-12:15 PM",
    label: "Session - 3",
    detail: "",
  },
  {
    id: "t16",
    section: "STUDY",
    time: "12:15-12:30 PM",
    label: "Break - 3",
    detail: "",
  },
  {
    id: "t17",
    section: "STUDY",
    time: "12:30-1:15 PM",
    label: "Session - 4",
    detail: "",
  },
  {
    id: "t18",
    section: "STUDY",
    time: "1:15-2:15 PM",
    label: "Lunch",
    detail:
      "Cook and eat a proper meal. Go outside. YouTube is fine. No gaming - timer is law.",
  },
  {
    id: "t19",
    section: "STUDY",
    time: "2:15-3:00 PM",
    label: "Session - 5",
    detail: "",
  },
  {
    id: "t20",
    section: "STUDY",
    time: "3:00-3:15 PM",
    label: "Break - 4",
    detail: "",
  },
  {
    id: "t21",
    section: "STUDY",
    time: "3:15-4:00 PM",
    label: "Session - 6",
    detail: "",
  },
  {
    id: "t22",
    section: "STUDY",
    time: "4:00-4:15 PM",
    label: "Break - 5",
    detail: "",
  },
  {
    id: "t23",
    section: "STUDY",
    time: "4:15-5:00 PM",
    label: "Session - 7",
    detail: "",
  },
  {
    id: "t24",
    section: "EVENING",
    time: "5:00-6:00 PM",
    label: "Aim training + Valorant warmup",
    detail:
      "Angle hold v2 → Head tracking → Flicking → Deathmatch x2 → Team DM x2. 1hr max.",
  },
  {
    id: "t25",
    section: "EVENING",
    time: "6:00-8:00 PM",
    label: "Ranked queue",
    detail:
      "Hard cap at 3 games / 2 hours. Set a timer. Finish your game then stop.",
  },
  {
    id: "t26",
    section: "EVENING",
    time: "8:00-9:00 PM",
    label: "Movie / episodes / chill",
    detail: "1-2 episodes or 1 movie. Guaranteed wind-down time.",
  },
  {
    id: "t27",
    section: "EVENING",
    time: "9:00-9:30 PM",
    label: "Homework or flashcards",
    detail:
      "Tutor homework if set. If none: 30 mins of flashcards. Keep it light.",
  },
  {
    id: "t28",
    section: "NIGHT",
    time: "9:30-9:50 PM",
    label: "Night skincare",
    detail:
      "Cleanser → Daily Dose (wait 10 min) → Moisturiser. No azelaic acid at night.",
  },
  {
    id: "t29",
    section: "NIGHT",
    time: "9:50-11:00 PM",
    label: "Wind down",
    detail:
      "Prep tomorrow: fill water glass, set clothes out, put phone across the room.",
  },
  {
    id: "t30",
    section: "NIGHT",
    time: "11:00 PM",
    label: "In bed - turn off heater",
    detail: "Turn the heater off before getting in. Lights out by 11pm.",
  },
];

const tabs = [
  { id: "todo", label: "Daily To-Do" },
  { id: "today", label: "What to Study" },
  { id: "tracker", label: "Topic Tracker" },
  { id: "tutorlog", label: "Tutor Log" },
  { id: "overview", label: "Overview" },
  { id: "howto", label: "How to Use" },
  { id: "phases", label: "Study Phases" },
  { id: "daily", label: "Study Schedule" },
  { id: "resources", label: "Resources" },
  { id: "motivation", label: "Motivation" },
];

const parseExamDate = (str) => {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};
const typeLabel = {
  wake: "WAKE UP",
  morning: "MORNING",
  study: "STUDY",
  break: "BREAK",
  lunch: "LUNCH",
  done: "DONE",
  evening: "EVENING",
  night: "NIGHT",
  warning: "NOTE",
};

const ls = {
  get: (key, fallback) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (key, val) => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  },
  del: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

const getTodayKey = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ─── SIGN IN SCREEN ───────────────────────────────────────────────────────────
function SignIn({ onSession, dark, c }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const ok = await sendMagicLink(email.trim());
    setLoading(false);
    if (ok) setSent(true);
    else
      setError("Something went wrong. Check your email address and try again.");
  };

  return (
    <div
      style={{
        fontFamily: "'Georgia',serif",
        background: dark ? "#111" : "#fff",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 400, width: "100%" }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: c.textDim,
            marginBottom: 16,
          }}
        >
          GCSE 2026 - 60-Day Master Plan
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-1px",
            color: c.text,
            margin: "0 0 8px",
          }}
        >
          Your Path to Grade 9
        </h1>
        <p
          style={{
            color: c.textMid,
            fontSize: 13,
            margin: "0 0 32px",
            lineHeight: "1.6",
          }}
        >
          Sign in to sync your progress across all your devices.
        </p>

        {!sent ? (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: c.textDim,
                marginBottom: 8,
              }}
            >
              Email address
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="you@example.com"
              style={{
                width: "100%",
                border: `1px solid ${c.border}`,
                padding: "12px 14px",
                fontSize: 14,
                fontFamily: "'Georgia',serif",
                color: c.text,
                background: c.input,
                outline: "none",
                boxSizing: "border-box",
                marginBottom: 12,
              }}
            />
            {error && (
              <div style={{ fontSize: 12, color: "#c00", marginBottom: 10 }}>
                {error}
              </div>
            )}
            <button
              onClick={submit}
              disabled={loading || !email.trim()}
              style={{
                width: "100%",
                border: `2px solid ${c.borderStrong}`,
                background: c.borderStrong,
                color: dark ? "#111" : "#fff",
                padding: "12px",
                fontSize: 13,
                fontWeight: 700,
                cursor: email.trim() && !loading ? "pointer" : "default",
                fontFamily: "'Georgia',serif",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              {loading ? "Sending..." : "Send Magic Link"}
            </button>
            <p
              style={{
                fontSize: 12,
                color: c.textDim,
                marginTop: 16,
                lineHeight: "1.6",
              }}
            >
              We'll email you a link. Click it and you're in — no password
              needed.
            </p>
          </div>
        ) : (
          <div style={{ border: `2px solid ${c.borderStrong}`, padding: 24 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: c.text,
                marginBottom: 8,
              }}
            >
              Check your email
            </div>
            <p
              style={{
                fontSize: 13,
                color: c.textMid,
                margin: 0,
                lineHeight: "1.7",
              }}
            >
              We sent a link to{" "}
              <strong style={{ color: c.text }}>{email}</strong>. Click it to
              sign in. You can close this tab.
            </p>
            <button
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
              style={{
                marginTop: 16,
                border: `1px solid ${c.border}`,
                background: "transparent",
                color: c.textMid,
                padding: "8px 16px",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'Georgia',serif",
              }}
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function StudyPlan() {
  // ── Auth state ──
  const [session, setSession] = useState(() => ls.get("gcse_session", null));
  const [authLoading, setAuthLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(""); // "", "synced", "offline"

  // ── UI state ──
  const [activeTab, setActiveTab] = useState("todo");
  const [, setTick] = useState(0);
  const [checkedTips, setCheckedTips] = useState({});
  const [dark, setDark] = useState(() => ls.get("gcse_dark", false));
  const toggleDark = () =>
    setDark((d) => {
      ls.set("gcse_dark", !d);
      return !d;
    });

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const c = {
    bg: dark ? "#111" : "#fff",
    text: dark ? "#e8e8e8" : "#111",
    textMid: dark ? "#aaa" : "#555",
    textDim: dark ? "#666" : "#bbb",
    border: dark ? "#333" : "#ddd",
    borderStrong: dark ? "#e8e8e8" : "#000",
    rowAlt: dark ? "#1a1a1a" : "#fafafa",
    rowWarn: dark ? "#1e1a00" : "#f7f7f7",
    card: dark ? "#1a1a1a" : "#fff",
    input: dark ? "#1a1a1a" : "#fff",
    inputBorder: dark ? "#444" : "#ddd",
  };

  // ── Handle magic link on page load ──
  useEffect(() => {
    (async () => {
      // Check URL for magic link tokens
      if (window.location.hash.includes("access_token")) {
        const newSession = await getSessionFromUrl();
        if (newSession) {
          ls.set("gcse_session", newSession);
          setSession(newSession);
          setAuthLoading(false);
          return;
        }
      }
      // Try refreshing existing session
      if (session?.refresh_token) {
        const refreshed = await refreshSession(session.refresh_token);
        if (refreshed) {
          ls.set("gcse_session", refreshed);
          setSession(refreshed);
        } else {
          ls.del("gcse_session");
          setSession(null);
        }
      }
      setAuthLoading(false);
    })();
  }, []);

  // ── Sync helper: write to both localStorage and Supabase ──
  const syncSet = (key, value) => {
    ls.set(key, value);
    if (session?.access_token && session?.user?.id) {
      sbSet(session.access_token, session.user.id, key, value)
        .then(() => {
          setSyncStatus("synced");
          setTimeout(() => setSyncStatus(""), 2000);
        })
        .catch(() => setSyncStatus("offline"));
    }
  };

  const syncDel = (key) => {
    ls.del(key);
    if (session?.access_token && session?.user?.id) {
      sbDel(session.access_token, session.user.id, key).catch(() => {});
    }
  };

  // ── On sign-in: pull all data from Supabase and merge into localStorage ──
  useEffect(() => {
    if (!session?.access_token || !session?.user?.id) return;
    (async () => {
      setSyncing(true);
      const remote = await sbGetAll(session.access_token, session.user.id);
      // Merge: remote wins for most things, but keep local timer state
      Object.entries(remote).forEach(([key, value]) => {
        if (key === "gcse_timer_state") return; // timer is device-local
        ls.set(key, value);
      });
      // Reload state from localStorage after merge
      setChecked(() => {
        const saved = ls.get("gcse_todo", null);
        if (!saved || saved.date !== getTodayKey()) return {};
        return saved.data || {};
      });
      setTopicsDone(ls.get("gcse_topics", {}));
      setTutorLogs(ls.get("gcse_tutor_logs", []));
      setNotes(ls.get(`gcse_notes_${getTodayKey()}`, ""));
      setSessionCounts(
        ls.get(`gcse_sessions_${getTodayKey()}`, {
          study: 0,
          break: 0,
          lunch: 0,
        })
      );
      setSessionSubjects(ls.get("gcse_session_subjects_" + getTodayKey(), {}));
      const sd = ls.get("gcse_streak", { count: 0, lastDate: null });
      // streak is derived, will re-render naturally
      setSyncing(false);
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus(""), 3000);
    })();
  }, [session?.user?.id]);

  // ── Sign out ──
  const signOut = () => {
    ls.del("gcse_session");
    setSession(null);
  };

  // ── Dates ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const examDate = parseExamDate("2026-05-12");
  const daysUntilExam = Math.ceil((examDate - today) / 86400000);
  const now2 = new Date();
  const totalMinsUntilExam = Math.floor((examDate - now2) / 60000);
  const hoursUntilExam = Math.floor(totalMinsUntilExam / 60);
  const minsUntilExam = totalMinsUntilExam % 60;
  const toggleTip = (i) => setCheckedTips((p) => ({ ...p, [i]: !p[i] }));

  // ── TO-DO ──
  const [checked, setChecked] = useState(() => {
    const saved = ls.get("gcse_todo", null);
    if (!saved || saved.date !== getTodayKey()) return {};
    return saved.data || {};
  });
  const toggleCheck = (id) => {
    setChecked((p) => {
      const next = { ...p, [id]: !p[id] };
      syncSet("gcse_todo", { date: getTodayKey(), data: next });
      return next;
    });
  };
  const resetAll = () => {
    setChecked({});
    syncDel("gcse_todo");
  };
  const totalDone = Object.values(checked).filter(Boolean).length;
  const todoSections = [...new Set(TODO_ITEMS.map((t) => t.section))];

  // ── STREAK ──
  const updateStreak = (wasComplete) => {
    const streakData = ls.get("gcse_streak", { count: 0, lastDate: null });
    const todayKey = getTodayKey();
    if (streakData.lastDate === todayKey) return streakData.count;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday;
    const yKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(y.getDate()).padStart(2, "0")}`;
    let newCount = wasComplete
      ? streakData.lastDate === yKey
        ? streakData.count + 1
        : 1
      : 0;
    syncSet("gcse_streak", { count: newCount, lastDate: todayKey });
    return newCount;
  };
  const streakData = ls.get("gcse_streak", { count: 0, lastDate: null });
  const streak = streakData.lastDate === getTodayKey() ? streakData.count : 0;
  useEffect(() => {
    if (totalDone === TODO_ITEMS.length) updateStreak(true);
  }, [totalDone]);

  // ── TOPIC TRACKER ──
  const [topicsDone, setTopicsDone] = useState(() => ls.get("gcse_topics", {}));
  const [openSubject, setOpenSubject] = useState(null);
  const toggleTopic = (subject, topic) => {
    setTopicsDone((p) => {
      const key = `${subject}::${topic}`;
      const next = { ...p, [key]: !p[key] };
      syncSet("gcse_topics", next);
      return next;
    });
  };

  // ── SESSION SUBJECTS ──
  const [sessionSubjects, setSessionSubjects] = useState(() =>
    ls.get("gcse_session_subjects_" + getTodayKey(), {})
  );

  // ── TIMER (localStorage only — device specific) ──
  const TIMER_KEY = "gcse_timer_state";
  const loadTimerState = () => {
    const saved = ls.get(TIMER_KEY, null);
    if (!saved)
      return {
        seconds: 45 * 60,
        duration: 45 * 60,
        type: "study",
        running: false,
      };
    if (saved.running && saved.startedAt) {
      const elapsed = Math.floor((Date.now() - saved.startedAt) / 1000);
      const remaining = Math.max(0, saved.seconds - elapsed);
      return { ...saved, seconds: remaining, running: remaining > 0 };
    }
    return saved;
  };
  const initialTimer = loadTimerState();
  const [timerSeconds, setTimerSeconds] = useState(initialTimer.seconds);
  const [timerDuration, setTimerDuration] = useState(initialTimer.duration);
  const [timerType, setTimerType] = useState(initialTimer.type);
  const [timerRunning, setTimerRunning] = useState(initialTimer.running);
  const intervalRef = useRef(null);
  const timerSecondsRef = useRef(initialTimer.seconds);
  const saveTimerState = (seconds, duration, type, running) => {
    ls.set(TIMER_KEY, {
      seconds,
      duration,
      type,
      running,
      startedAt: running ? Date.now() : null,
    });
    timerSecondsRef.current = seconds;
  };

  // ── SESSION COUNTER ──
  const sessionCountKey = `gcse_sessions_${getTodayKey()}`;
  const [sessionCounts, setSessionCounts] = useState(() =>
    ls.get(sessionCountKey, { study: 0, break: 0, lunch: 0 })
  );
  const logSession = (type) => {
    setSessionCounts((p) => {
      const next = { ...p, [type]: (p[type] || 0) + 1 };
      syncSet(sessionCountKey, next);
      return next;
    });
  };

  useEffect(() => {
    if (timerRunning) {
      saveTimerState(timerSecondsRef.current, timerDuration, timerType, true);
      intervalRef.current = setInterval(() => {
        setTimerSeconds((s) => {
          const next = s <= 1 ? 0 : s - 1;
          timerSecondsRef.current = next;
          if (next % 5 === 0)
            saveTimerState(next, timerDuration, timerType, next > 0);
          if (next === 0) {
            clearInterval(intervalRef.current);
            setTimerRunning(false);
            logSession(timerType);
            ls.del(TIMER_KEY);
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      saveTimerState(timerSecondsRef.current, timerDuration, timerType, false);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerRunning, timerType, timerDuration]);

  const startTimer = (mins, type = "study") => {
    clearInterval(intervalRef.current);
    const secs = mins * 60;
    setTimerDuration(secs);
    setTimerSeconds(secs);
    setTimerType(type);
    timerSecondsRef.current = secs;
    setTimerRunning(true);
    saveTimerState(secs, secs, type, true);
  };
  const pauseTimer = () => {
    setTimerRunning(false);
    saveTimerState(timerSecondsRef.current, timerDuration, timerType, false);
  };
  const resumeTimer = () => {
    if (timerSecondsRef.current > 0) {
      setTimerRunning(true);
      saveTimerState(timerSecondsRef.current, timerDuration, timerType, true);
    }
  };
  const resetTimer = () => {
    clearInterval(intervalRef.current);
    setTimerRunning(false);
    setTimerSeconds(timerDuration);
    timerSecondsRef.current = timerDuration;
    saveTimerState(timerDuration, timerDuration, timerType, false);
  };
  const timerMins = Math.floor(timerSeconds / 60);
  const timerSecs = timerSeconds % 60;
  const timerPct =
    timerDuration > 0
      ? ((timerDuration - timerSeconds) / timerDuration) * 100
      : 0;
  const timerDone = timerSeconds === 0;

  // ── NOTES ──
  const notesKey = `gcse_notes_${getTodayKey()}`;
  const [notes, setNotes] = useState(() => ls.get(notesKey, ""));
  const saveNotes = (val) => {
    setNotes(val);
    syncSet(notesKey, val);
  };

  // ── TUTOR LOG ──
  const [tutorLogs, setTutorLogs] = useState(() =>
    ls.get("gcse_tutor_logs", [])
  );
  const [tutorForm, setTutorForm] = useState({
    subject: "Science + Maths",
    covered: "",
    mistakes: "",
    revise: "",
  });
  const [showTutorForm, setShowTutorForm] = useState(false);
  const saveTutorLog = () => {
    if (!tutorForm.covered.trim()) return;
    const log = { ...tutorForm, date: getTodayKey(), id: Date.now() };
    const next = [log, ...tutorLogs];
    setTutorLogs(next);
    syncSet("gcse_tutor_logs", next);
    setTutorForm({
      subject: "Science + Maths",
      covered: "",
      mistakes: "",
      revise: "",
    });
    setShowTutorForm(false);
  };
  const deleteTutorLog = (id) => {
    const next = tutorLogs.filter((l) => l.id !== id);
    setTutorLogs(next);
    syncSet("gcse_tutor_logs", next);
  };

  // ── AUTH LOADING / SIGN IN ──
  if (authLoading) {
    return (
      <div
        style={{
          background: dark ? "#111" : "#fff",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Georgia',serif",
          color: c.textDim,
          fontSize: 13,
        }}
      >
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <SignIn
        onSession={(s) => {
          ls.set("gcse_session", s);
          setSession(s);
        }}
        dark={dark}
        c={c}
      />
    );
  }

  // ── MAIN RENDER ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        fontFamily: "'Georgia', serif",
        background: c.bg,
        minHeight: "100vh",
        color: c.text,
        transition: "background 0.2s, color 0.2s",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: `2px solid ${c.borderStrong}`,
          padding: "28px 32px 20px",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: c.textDim,
            marginBottom: 8,
          }}
        >
          GCSE 2026 - 60-Day Master Plan
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                margin: "0 0 6px",
                fontSize: "clamp(22px,4vw,38px)",
                fontWeight: 700,
                letterSpacing: "-1.5px",
                lineHeight: 1.05,
              }}
            >
              Your Path to Grade 9
            </h1>
            <p style={{ margin: "0 0 16px", color: c.textMid, fontSize: 13 }}>
              {today.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              · First exam: 12 May ·{" "}
              <strong style={{ color: c.text }}>
                {daysUntilExam}d {hoursUntilExam % 24}h {minsUntilExam}m to go
              </strong>
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                "Bio P1: 12 May",
                "Maths P1: 14 May",
                "Chem P1: 18 May",
                "Lang P1: 21 May",
              ].map((e) => (
                <span
                  key={e}
                  style={{
                    border: `1px solid ${c.borderStrong}`,
                    padding: "3px 10px",
                    fontSize: 11,
                    letterSpacing: "0.5px",
                  }}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {streak > 0 && (
              <div
                style={{
                  border: `2px solid ${c.borderStrong}`,
                  padding: "12px 18px",
                  textAlign: "center",
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                  {streak}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    color: c.textDim,
                    marginTop: 4,
                  }}
                >
                  day streak
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                onClick={toggleDark}
                style={{
                  border: `1px solid ${c.border}`,
                  background: c.card,
                  color: c.text,
                  padding: "8px 14px",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "'Georgia',serif",
                }}
              >
                {dark ? "Light" : "Dark"}
              </button>
              <div
                style={{
                  fontSize: 10,
                  color: c.textDim,
                  textAlign: "center",
                  letterSpacing: "0.5px",
                }}
              >
                {syncing
                  ? "Syncing..."
                  : syncStatus === "synced"
                  ? "✓ Synced"
                  : syncStatus === "offline"
                  ? "Offline"
                  : session.user?.email?.split("@")[0]}
              </div>
              <button
                onClick={signOut}
                style={{
                  border: `1px solid ${c.border}`,
                  background: "transparent",
                  color: c.textDim,
                  padding: "6px 14px",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "'Georgia',serif",
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          borderBottom: `1px solid ${c.border}`,
          padding: "0 24px",
          background: c.bg,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom:
                activeTab === t.id
                  ? `2px solid ${c.borderStrong}`
                  : "2px solid transparent",
              color: activeTab === t.id ? c.text : c.textDim,
              padding: "13px 14px",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "'Georgia',serif",
              fontWeight: activeTab === t.id ? 700 : 400,
              letterSpacing: "1px",
              whiteSpace: "nowrap",
              textTransform: "uppercase",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "32px 24px",
          background: c.bg,
        }}
      >
        {/* ---- DAILY TO-DO ---- */}
        {activeTab === "todo" && (
          <div>
            <div style={{ position: "relative", marginBottom: 28 }}>
              <div
                style={{
                  overflowX: "auto",
                  display: "flex",
                  gap: 8,
                  paddingBottom: 6,
                  scrollbarWidth: "thin",
                }}
              >
                {EXAM_DATES.filter((e) => parseExamDate(e.date) >= today).map(
                  (e, i) => {
                    const d = Math.ceil(
                      (parseExamDate(e.date) - today) / 86400000
                    );
                    return (
                      <div
                        key={i}
                        style={{
                          border: `1px solid ${c.border}`,
                          padding: "12px 14px",
                          borderLeft:
                            d <= 14
                              ? `3px solid ${c.borderStrong}`
                              : `3px solid ${c.border}`,
                          background: c.card,
                          flexShrink: 0,
                          minWidth: 130,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            lineHeight: 1,
                            marginBottom: 4,
                          }}
                        >
                          {d}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 400,
                              color: c.textDim,
                              marginLeft: 3,
                            }}
                          >
                            days
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: c.textMid,
                            lineHeight: "1.4",
                          }}
                        >
                          {e.label.split(" - ")[0]}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: c.textDim,
                            marginTop: 3,
                          }}
                        >
                          {parseExamDate(e.date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: c.textDim,
                  letterSpacing: "1px",
                  marginTop: 4,
                }}
              >
                ← scroll to see all exams →
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 4,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    marginTop: 0,
                    marginBottom: 4,
                    letterSpacing: "-0.5px",
                  }}
                >
                  Today's Tasks
                </h2>
                <p style={{ color: c.textMid, fontSize: 13, margin: 0 }}>
                  Tick off as you go. Resets automatically each morning.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 12, color: c.textDim }}>
                  <strong style={{ color: c.text, fontSize: 15 }}>
                    {totalDone}
                  </strong>{" "}
                  / {TODO_ITEMS.length}
                </div>
                <button
                  onClick={resetAll}
                  style={{
                    border: `1px solid ${c.borderStrong}`,
                    background: c.bg,
                    color: c.text,
                    padding: "6px 14px",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: "'Georgia',serif",
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            <div
              style={{
                height: 3,
                background: c.border,
                margin: "16px 0 28px",
                borderRadius: 2,
              }}
            >
              <div
                style={{
                  height: 3,
                  background: c.borderStrong,
                  borderRadius: 2,
                  width: `${(totalDone / TODO_ITEMS.length) * 100}%`,
                  transition: "width 0.3s",
                }}
              />
            </div>

            {todoSections.map((section) => {
              const items = TODO_ITEMS.filter((t) => t.section === section);
              const sectionDone = items.filter((t) => checked[t.id]).length;
              return (
                <div key={section} style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "3px",
                        textTransform: "uppercase",
                        color: c.text,
                      }}
                    >
                      {section}
                    </div>
                    <div style={{ fontSize: 11, color: c.textDim }}>
                      {sectionDone}/{items.length}
                    </div>
                  </div>
                  {items.map((item) => {
                    const done = !!checked[item.id];
                    const isSession = item.label.startsWith("Session");
                    const isBreak = item.label.startsWith("Break");
                    const isLunch = item.label === "Lunch";
                    const lb = done
                      ? `3px solid ${c.borderStrong}`
                      : isSession
                      ? `3px solid ${c.borderStrong}`
                      : isBreak || isLunch
                      ? `3px solid ${c.textDim}`
                      : `3px solid ${dark ? "#333" : "#eee"}`;
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleCheck(item.id)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 0,
                          borderBottom: `1px solid ${c.border}`,
                          borderLeft: lb,
                          background: done
                            ? c.rowAlt
                            : isBreak || isLunch
                            ? c.rowAlt
                            : c.card,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          opacity: done ? 0.6 : 1,
                        }}
                      >
                        <div
                          style={{
                            minWidth: 100,
                            padding: "12px 14px",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: "2px",
                              textTransform: "uppercase",
                              color: c.textDim,
                              marginBottom: 3,
                            }}
                          >
                            {isSession
                              ? "STUDY"
                              : isBreak
                              ? "BREAK"
                              : isLunch
                              ? "LUNCH"
                              : section === "MORNING"
                              ? "MORNING"
                              : section === "EVENING"
                              ? "EVENING"
                              : "NIGHT"}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: c.textDim,
                              fontFamily: "monospace",
                              lineHeight: "1.4",
                            }}
                          >
                            {item.time}
                          </div>
                        </div>
                        <div style={{ flex: 1, padding: "12px 14px 12px 0" }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: c.text,
                              marginBottom: item.detail ? 4 : 0,
                              textDecoration: done ? "line-through" : "none",
                            }}
                          >
                            {item.label}
                          </div>
                          {item.detail && (
                            <div
                              style={{
                                fontSize: 12,
                                color: c.textMid,
                                lineHeight: "1.6",
                              }}
                            >
                              {item.detail}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            flexShrink: 0,
                            margin: "14px 14px 0 0",
                            border: `2px solid ${
                              done ? c.borderStrong : c.border
                            }`,
                            background: done ? c.borderStrong : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9,
                            color: dark ? "#111" : "#fff",
                            fontWeight: 700,
                          }}
                        >
                          {done ? "✓" : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {totalDone === TODO_ITEMS.length && (
              <div
                style={{
                  border: `2px solid ${c.borderStrong}`,
                  padding: 20,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                  Day complete. {streak > 1 ? `${streak} days in a row.` : ""}
                </div>
                <div style={{ fontSize: 13, color: c.textMid }}>
                  Every task done. Reset tomorrow morning and go again.
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: 32,
                borderTop: `1px solid ${c.border}`,
                paddingTop: 24,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: c.textDim,
                  marginBottom: 12,
                }}
              >
                Today's Notes
              </div>
              <textarea
                value={notes}
                onChange={(e) => saveNotes(e.target.value)}
                placeholder="What topics did you cover today? Any gaps to revisit? Keep it brief."
                style={{
                  width: "100%",
                  minHeight: 100,
                  border: `1px solid ${c.inputBorder}`,
                  padding: 14,
                  fontSize: 13,
                  fontFamily: "'Georgia',serif",
                  color: c.text,
                  background: c.input,
                  resize: "vertical",
                  outline: "none",
                  lineHeight: "1.7",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 11, color: c.textDim, marginTop: 6 }}>
                Saves automatically. Syncs to all devices. New note each day.
              </div>
            </div>
          </div>
        )}

        {/* ---- WHAT TO STUDY TODAY ---- */}
        {activeTab === "today" &&
          (() => {
            const dayNames = [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ];
            const dayName = dayNames[new Date().getDay()];
            const startDate = parseExamDate("2026-03-13");
            const dayNum = Math.max(
              1,
              Math.floor((today - startDate) / 86400000) + 1
            );
            const phase = dayNum <= 30 ? 1 : dayNum <= 48 ? 2 : 3;
            const phaseInfo = PHASE_INFO[phase - 1];
            const subjects = [
              "Biology",
              "Chemistry",
              "Physics",
              "Maths",
              "English Language",
              "Light review",
            ];
            const sessionTasks = {
              Biology: [
                "Watch FreeScienceLessons video for current topic",
                "Write key facts + definitions into Master Doc",
                "Attempt PMT question booklet - no mark scheme first",
                "Mark answers, note every gap, re-read weak sections",
                "Make flashcards for all definitions from this topic",
                "Review flashcards from last 3 Bio topics",
                "Prep Bio topic for next tutor lesson",
              ],
              Chemistry: [
                "Watch FreeScienceLessons Chemistry video for current topic",
                "Write key facts + definitions into Master Doc",
                "Attempt PMT Chemistry question booklet - no mark scheme first",
                "Mark answers, note every gap, re-read weak sections",
                "Make flashcards for all definitions from this topic",
                "Review flashcards from last 3 Chem topics",
                "Prep Chem topic for next tutor lesson",
              ],
              Physics: [
                "Watch FreeScienceLessons Physics video for current topic",
                "Write key facts + definitions into Master Doc",
                "Attempt PMT Physics question booklet - no mark scheme first",
                "Mark answers, note every gap, re-read weak sections",
                "Make flashcards for equations + definitions from this topic",
                "Review AQA Physics Equation Sheet",
                "Prep Physics topic for next tutor lesson",
              ],
              Maths: [
                "Watch Maths Genie video for current topic",
                "Attempt Maths Genie practice questions yourself first",
                "Check answers and note every mistake",
                phase >= 2
                  ? "Attempt Corbett Maths questions on same topic (harder)"
                  : "Re-do any questions you got wrong",
                "Review flashcards / formula sheet",
                "Prep topic for next tutor lesson",
                "Attempt one mixed-topic question from a past paper",
              ],
              "English Language": [
                "Read tutor PDF section for today",
                "Identify the question type and mark scheme structure",
                "Write a timed practice answer",
                "Self-mark against mark scheme",
                "Note what you lost marks on",
                "Re-read the relevant section",
                "Prep for next tutor session",
              ],
              "Light review": [
                "Review flashcards across all subjects",
                "Re-read any Master Doc sections that felt shaky",
                "Catch up on any topic skipped this week",
                "Rest if you've had a solid week - you've earned it",
                "Skim-read Master Doc summaries",
                "Do a quick Maths Genie set on a weak topic",
                "Write down 3 things you're not confident on yet",
              ],
            };
            return (
              <div>
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    marginTop: 0,
                    marginBottom: 4,
                    letterSpacing: "-0.5px",
                  }}
                >
                  What to Study Today
                </h2>
                <p
                  style={{
                    color: c.textMid,
                    fontSize: 13,
                    marginBottom: 24,
                    paddingBottom: 16,
                    borderBottom: `1px solid ${c.border}`,
                  }}
                >
                  Pick a subject for each session. Day {dayNum} of 60.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                    gap: 10,
                    marginBottom: 28,
                  }}
                >
                  {[
                    { label: "Today", value: dayName },
                    {
                      label: "Phase",
                      value: `Phase ${phase} - ${
                        phaseInfo.name.split(" ")[0]
                      } ${phaseInfo.name.split(" ")[1] || ""}`,
                    },
                    { label: "Day", value: `${dayNum} / 60` },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        border: `1px solid ${c.border}`,
                        padding: "14px 16px",
                        background: c.card,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "2px",
                          textTransform: "uppercase",
                          color: c.textDim,
                          marginBottom: 6,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{ fontSize: 15, fontWeight: 700, color: c.text }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    border: `2px solid ${c.borderStrong}`,
                    padding: 20,
                    marginBottom: 20,
                    background: c.card,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      color: c.textDim,
                      marginBottom: 16,
                    }}
                  >
                    Your 7 Sessions Today
                  </div>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                    const subj = sessionSubjects[n] || "";
                    return (
                      <div
                        key={n}
                        style={{
                          borderBottom:
                            n < 7 ? `1px solid ${c.border}` : "none",
                          paddingBottom: 14,
                          marginBottom: 14,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: c.textDim,
                              minWidth: 28,
                              fontFamily: "monospace",
                              flexShrink: 0,
                            }}
                          >
                            S{n}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                              flex: 1,
                            }}
                          >
                            {subjects.map((s) => (
                              <button
                                key={s}
                                onClick={() =>
                                  setSessionSubjects((p) => {
                                    const next = {
                                      ...p,
                                      [n]: p[n] === s ? "" : s,
                                    };
                                    syncSet(
                                      "gcse_session_subjects_" + getTodayKey(),
                                      next
                                    );
                                    return next;
                                  })
                                }
                                style={{
                                  border: `1px solid ${
                                    sessionSubjects[n] === s
                                      ? c.borderStrong
                                      : c.border
                                  }`,
                                  background:
                                    sessionSubjects[n] === s
                                      ? c.borderStrong
                                      : c.card,
                                  color:
                                    sessionSubjects[n] === s
                                      ? dark
                                        ? "#111"
                                        : "#fff"
                                      : c.textMid,
                                  padding: "4px 10px",
                                  fontSize: 10,
                                  cursor: "pointer",
                                  fontFamily: "'Georgia',serif",
                                  fontWeight:
                                    sessionSubjects[n] === s ? 700 : 400,
                                }}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    border: `1px solid ${c.border}`,
                    padding: 18,
                    background: c.rowAlt,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      color: c.textDim,
                      marginBottom: 10,
                    }}
                  >
                    Phase {phase} Focus
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: c.textMid,
                      margin: 0,
                      lineHeight: "1.7",
                      fontStyle: "italic",
                    }}
                  >
                    {phaseInfo.tip}
                  </p>
                </div>
              </div>
            );
          })()}

        {/* ---- TUTOR LOG ---- */}
        {activeTab === "tutorlog" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 4,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    marginTop: 0,
                    marginBottom: 4,
                    letterSpacing: "-0.5px",
                  }}
                >
                  Tutor Session Log
                </h2>
                <p style={{ color: c.textMid, fontSize: 13, margin: 0 }}>
                  Log what you covered after each session so nothing gets
                  forgotten.
                </p>
              </div>
              <button
                onClick={() => setShowTutorForm((f) => !f)}
                style={{
                  border: `2px solid ${c.borderStrong}`,
                  background: showTutorForm ? c.borderStrong : c.bg,
                  color: showTutorForm ? c.bg : c.text,
                  padding: "8px 16px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "'Georgia',serif",
                  flexShrink: 0,
                }}
              >
                {showTutorForm ? "Cancel" : "+ Add Session"}
              </button>
            </div>
            {showTutorForm && (
              <div
                style={{
                  border: `1px solid ${c.border}`,
                  padding: 20,
                  marginTop: 20,
                  marginBottom: 24,
                  background: c.card,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    color: c.textDim,
                    marginBottom: 16,
                  }}
                >
                  New Session -{" "}
                  {new Date().toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "1px",
                      color: c.textMid,
                      marginBottom: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    Subject
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["Science + Maths", "English"].map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          setTutorForm((f) => ({ ...f, subject: s }))
                        }
                        style={{
                          border: `1px solid ${
                            tutorForm.subject === s ? c.borderStrong : c.border
                          }`,
                          background:
                            tutorForm.subject === s ? c.borderStrong : c.bg,
                          color:
                            tutorForm.subject === s
                              ? dark
                                ? "#111"
                                : "#fff"
                              : c.text,
                          padding: "6px 14px",
                          fontSize: 12,
                          cursor: "pointer",
                          fontFamily: "'Georgia',serif",
                          fontWeight: tutorForm.subject === s ? 700 : 400,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {[
                  {
                    key: "covered",
                    label: "What was covered",
                    placeholder:
                      "e.g. Cell biology - diffusion and osmosis, Maths - quadratics",
                  },
                  {
                    key: "mistakes",
                    label: "What you got wrong / found hard",
                    placeholder:
                      "e.g. Kept mixing up active transport and facilitated diffusion",
                  },
                  {
                    key: "revise",
                    label: "What to revise before next session",
                    placeholder:
                      "e.g. Re-read osmosis section in Master Doc, do 5 more PMT questions",
                  },
                ].map((field) => (
                  <div key={field.key} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "1px",
                        color: c.textMid,
                        marginBottom: 6,
                        textTransform: "uppercase",
                      }}
                    >
                      {field.label}
                    </div>
                    <textarea
                      value={tutorForm[field.key]}
                      onChange={(e) =>
                        setTutorForm((f) => ({
                          ...f,
                          [field.key]: e.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      rows={2}
                      style={{
                        width: "100%",
                        border: `1px solid ${c.inputBorder}`,
                        padding: "10px 12px",
                        fontSize: 13,
                        fontFamily: "'Georgia',serif",
                        color: c.text,
                        background: c.input,
                        resize: "vertical",
                        outline: "none",
                        lineHeight: "1.6",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
                <button
                  onClick={saveTutorLog}
                  style={{
                    border: `2px solid ${c.borderStrong}`,
                    background: c.borderStrong,
                    color: dark ? "#111" : "#fff",
                    padding: "10px 20px",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: "'Georgia',serif",
                  }}
                >
                  Save Session
                </button>
              </div>
            )}
            {tutorLogs.length === 0 && !showTutorForm && (
              <div
                style={{
                  border: `1px solid ${c.border}`,
                  padding: "40px 20px",
                  textAlign: "center",
                  marginTop: 20,
                  color: c.textDim,
                  fontSize: 13,
                }}
              >
                No sessions logged yet. Add one after your next tutor lesson.
              </div>
            )}
            <div style={{ marginTop: showTutorForm ? 0 : 20 }}>
              {tutorLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    border: `1px solid ${c.border}`,
                    borderLeft: `3px solid ${c.borderStrong}`,
                    padding: 18,
                    marginBottom: 10,
                    background: c.card,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 13, fontWeight: 700, color: c.text }}
                      >
                        {log.subject}
                      </div>
                      <div
                        style={{ fontSize: 11, color: c.textDim, marginTop: 2 }}
                      >
                        {new Date(log.date).toLocaleDateString("en-GB", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTutorLog(log.id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: c.textDim,
                        cursor: "pointer",
                        fontSize: 13,
                        padding: "2px 6px",
                        fontFamily: "'Georgia',serif",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  {[
                    { label: "Covered", value: log.covered },
                    { label: "Got wrong", value: log.mistakes },
                    { label: "Revise before next session", value: log.revise },
                  ]
                    .filter((f) => f.value)
                    .map((field) => (
                      <div key={field.label} style={{ marginBottom: 10 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "1.5px",
                            textTransform: "uppercase",
                            color: c.textDim,
                            marginBottom: 4,
                          }}
                        >
                          {field.label}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: c.textMid,
                            lineHeight: "1.6",
                          }}
                        >
                          {field.value}
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- TOPIC TRACKER ---- */}
        {activeTab === "tracker" && (
          <div>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                marginTop: 0,
                marginBottom: 4,
                letterSpacing: "-0.5px",
              }}
            >
              Topic Tracker
            </h2>
            <p
              style={{
                color: c.textMid,
                fontSize: 13,
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: `1px solid ${c.border}`,
              }}
            >
              Tick off each topic as you complete it. Click a subject to expand
              it.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                gap: 8,
                marginBottom: 28,
              }}
            >
              {Object.entries(SUBJECT_TOPICS).map(([subject, topics]) => {
                const done = topics.filter(
                  (t) => topicsDone[`${subject}::${t}`]
                ).length;
                const pct = Math.round((done / topics.length) * 100);
                return (
                  <div
                    key={subject}
                    style={{
                      border: `1px solid ${c.border}`,
                      padding: "12px 14px",
                      cursor: "pointer",
                      background: c.card,
                    }}
                    onClick={() =>
                      setOpenSubject(openSubject === subject ? null : subject)
                    }
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        marginBottom: 8,
                        color: c.text,
                      }}
                    >
                      {subject}
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        marginBottom: 4,
                        color: c.text,
                      }}
                    >
                      {done}
                      <span
                        style={{
                          fontSize: 11,
                          color: c.textDim,
                          fontWeight: 400,
                        }}
                      >
                        /{topics.length}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: c.border,
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          height: 3,
                          background: c.borderStrong,
                          borderRadius: 2,
                          width: `${pct}%`,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {Object.entries(SUBJECT_TOPICS).map(([subject, topics]) => {
              const isOpen = openSubject === subject;
              const done = topics.filter(
                (t) => topicsDone[`${subject}::${t}`]
              ).length;
              return (
                <div
                  key={subject}
                  style={{ border: `1px solid ${c.border}`, marginBottom: 8 }}
                >
                  <div
                    onClick={() => setOpenSubject(isOpen ? null : subject)}
                    style={{
                      padding: "14px 16px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderLeft:
                        done === topics.length
                          ? `3px solid ${c.borderStrong}`
                          : `3px solid ${c.border}`,
                      background: isOpen ? c.rowAlt : c.card,
                    }}
                  >
                    <div>
                      <span
                        style={{ fontSize: 14, fontWeight: 700, color: c.text }}
                      >
                        {subject}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: c.textDim,
                          marginLeft: 12,
                        }}
                      >
                        {done}/{topics.length} topics done
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: c.textDim,
                        fontFamily: "monospace",
                      }}
                    >
                      {isOpen ? "▲" : "▼"}
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${c.border}` }}>
                      {topics.map((topic, i) => {
                        const key = `${subject}::${topic}`;
                        const isDone = !!topicsDone[key];
                        return (
                          <div
                            key={topic}
                            onClick={() => toggleTopic(subject, topic)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 14,
                              padding: "11px 16px",
                              borderBottom:
                                i < topics.length - 1
                                  ? `1px solid ${dark ? "#222" : "#f5f5f5"}`
                                  : "none",
                              borderLeft: isDone
                                ? `3px solid ${c.borderStrong}`
                                : "3px solid transparent",
                              background: isDone ? c.rowAlt : c.card,
                              cursor: "pointer",
                              transition: "all 0.1s",
                            }}
                          >
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                flexShrink: 0,
                                border: `2px solid ${
                                  isDone ? c.borderStrong : c.border
                                }`,
                                background: isDone
                                  ? c.borderStrong
                                  : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 9,
                                color: dark ? "#111" : "#fff",
                                fontWeight: 700,
                              }}
                            >
                              {isDone ? "✓" : ""}
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: isDone ? c.textDim : c.text,
                                textDecoration: isDone
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {topic}
                            </div>
                          </div>
                        );
                      })}
                      <div
                        onClick={() => {
                          const allDone = topics.every(
                            (t) => topicsDone[`${subject}::${t}`]
                          );
                          setTopicsDone((p) => {
                            const next = { ...p };
                            topics.forEach((t) => {
                              next[`${subject}::${t}`] = !allDone;
                            });
                            syncSet("gcse_topics", next);
                            return next;
                          });
                        }}
                        style={{
                          padding: "10px 16px",
                          fontSize: 11,
                          color: c.textDim,
                          cursor: "pointer",
                          borderTop: `1px solid ${c.border}`,
                          textAlign: "right",
                          letterSpacing: "0.5px",
                          background: c.card,
                        }}
                      >
                        {topics.every((t) => topicsDone[`${subject}::${t}`])
                          ? "Uncheck all"
                          : "Check all"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ---- OVERVIEW ---- */}
        {activeTab === "overview" && (
          <div>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                marginTop: 0,
                marginBottom: 4,
                letterSpacing: "-0.5px",
              }}
            >
              What you're working with
            </h2>
            <p
              style={{
                color: c.textMid,
                fontSize: 13,
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: `1px solid ${c.border}`,
              }}
            >
              Three subjects. Six science papers. Tight timeline. Totally
              doable.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {[
                {
                  label: "AQA Triple Science Higher",
                  exams: "6 papers - 2 Bio, 2 Chem, 2 Phys",
                  method: "PMT + FreeScienceLessons + Master Doc",
                  target: "Grade 9",
                },
                {
                  label: "Edexcel Maths Higher",
                  exams: "3 papers - 1 Non-Calc, 2 Calculator",
                  method: "Maths Genie → Corbett Maths",
                  target: "Grade 9",
                },
                {
                  label: "AQA English Language",
                  exams: "2 papers - 21 May & 5 June",
                  method: "Tutor PDF + practice papers",
                  target: "Grade 5-6",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    border: `1px solid ${c.border}`,
                    padding: 16,
                    background: c.card,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginBottom: 10,
                      color: c.text,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: c.textMid,
                      lineHeight: "1.9",
                    }}
                  >
                    <div>{s.exams}</div>
                    <div style={{ color: c.textDim }}>{s.method}</div>
                    <div style={{ marginTop: 10 }}>
                      <span
                        style={{
                          border: `1px solid ${c.borderStrong}`,
                          padding: "2px 8px",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "1px",
                          color: c.text,
                        }}
                      >
                        TARGET: {s.target}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                border: `1px solid ${c.border}`,
                padding: 18,
                marginBottom: 12,
                background: c.card,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: c.textDim,
                  marginBottom: 10,
                }}
              >
                Reality Check
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: "1.9",
                  color: c.textMid,
                }}
              >
                You have{" "}
                <strong style={{ color: c.text }}>{daysUntilExam} days</strong>{" "}
                until your first exam and need to learn subjects from scratch.
                With 7 hours a day in 45-min blocks, you have roughly{" "}
                <strong style={{ color: c.text }}>
                  {daysUntilExam * 7} hours
                </strong>{" "}
                of study time left. More than enough if used consistently. The
                key is showing up every day, even when you don't feel like it.
              </p>
            </div>
            <div
              style={{
                border: `2px solid ${c.borderStrong}`,
                padding: 20,
                background: c.card,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: c.textDim,
                  marginBottom: 14,
                }}
              >
                How Your Tutors Fit In
              </div>
              <div style={{ fontSize: 13, lineHeight: "2", color: c.textMid }}>
                <div>
                  <strong style={{ color: c.text }}>
                    Science + Maths (3hrs/week):
                  </strong>{" "}
                  PMT question booklets and Maths Genie in lesson. Complete the
                  Master Doc BEFORE the lesson so you can engage with questions
                  - not just copy answers.
                </div>
                <div style={{ marginTop: 10 }}>
                  <strong style={{ color: c.text }}>English (1hr/week):</strong>{" "}
                  Paper 2 with your tutor. After each session, write one timed
                  practice answer on the question type just taught.
                </div>
                <div style={{ marginTop: 10 }}>
                  <strong style={{ color: c.text }}>
                    On mark scheme cheating:
                  </strong>{" "}
                  Try first, even badly - then check. If you copy without
                  attempting, the lesson is wasted.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- HOW TO USE ---- */}
        {activeTab === "howto" && (
          <div>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                marginTop: 0,
                marginBottom: 4,
                letterSpacing: "-0.5px",
              }}
            >
              How to Use This Plan
            </h2>
            <p
              style={{
                color: c.textMid,
                fontSize: 13,
                marginBottom: 28,
                paddingBottom: 16,
                borderBottom: `1px solid ${c.border}`,
              }}
            >
              Start here. Read this once before you do anything else.
            </p>
            <div>
              {[
                {
                  step: "01",
                  title: "Read Overview first",
                  body: "The Overview tab explains all three subjects, your targets, and how your tutors fit into the plan. Read it once now.",
                  tab: "Overview tab",
                  tabId: "overview",
                },
                {
                  step: "02",
                  title: "Track your topics",
                  body: "Open the Topic Tracker and tick off topics as you complete them. It tells you exactly where you are across all five subjects.",
                  tab: "Topic Tracker tab",
                  tabId: "tracker",
                },
                {
                  step: "03",
                  title: "Understand the 3 phases",
                  body: "You are currently in Phase 1 (Days 1-30): learn each topic from scratch, build your Master Doc, attempt PMT questions. Don't worry about Phase 2 or 3 yet.",
                  tab: "Study Phases tab",
                  tabId: "phases",
                },
                {
                  step: "04",
                  title: "Pick your subjects each morning",
                  body: "Open What to Study and assign a subject to each of your 7 sessions. It tells you exactly what to do in each one. Reset each morning.",
                  tab: "What to Study tab",
                  tabId: "today",
                },
                {
                  step: "05",
                  title: "Use the timer for every study block",
                  body: "Open the Study Schedule tab and hit the 45-min timer at the start of each session. The tally counts your sessions and breaks automatically.",
                  tab: "Study Schedule tab",
                  tabId: "daily",
                },
                {
                  step: "06",
                  title: "Tick your to-do list each day",
                  body: "The Daily To-Do tab shows your full day in routine style from 7:45am to 11pm. Tick each item as you go. It resets every morning.",
                  tab: "Daily To-Do tab",
                  tabId: "todo",
                },
                {
                  step: "07",
                  title: "Log every tutor session",
                  body: "After each tutor lesson, open the Tutor Log and record what was covered, what you got wrong, and what to revise before next session.",
                  tab: "Tutor Log tab",
                  tabId: "tutorlog",
                },
                {
                  step: "08",
                  title: "Come back to Motivation when struggling",
                  body: "Not a one-time read - open it when you hit a rough day. One bad hour does not mean a bad day.",
                  tab: "Motivation tab",
                  tabId: "motivation",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    borderBottom: `1px solid ${c.border}`,
                    borderLeft: `3px solid ${c.borderStrong}`,
                    padding: "18px 16px",
                    background: i % 2 === 0 ? c.card : c.rowAlt,
                  }}
                >
                  <div
                    style={{ minWidth: 52, paddingRight: 16, flexShrink: 0 }}
                  >
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        color: c.border,
                        lineHeight: 1,
                      }}
                    >
                      {s.step}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        marginBottom: 6,
                        color: c.text,
                      }}
                    >
                      {s.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: c.textMid,
                        lineHeight: "1.75",
                        marginBottom: 8,
                      }}
                    >
                      {s.body}
                    </div>
                    <button
                      onClick={() => setActiveTab(s.tabId)}
                      style={{
                        border: `1px solid ${c.border}`,
                        background: "transparent",
                        color: c.text,
                        padding: "4px 12px",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        fontFamily: "'Georgia',serif",
                      }}
                    >
                      → {s.tab}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                border: `2px solid ${c.borderStrong}`,
                padding: 20,
                marginTop: 20,
                background: c.card,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: c.textDim,
                  marginBottom: 14,
                }}
              >
                The Single Most Important Rule
              </div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: c.text,
                  margin: "0 0 10px",
                }}
              >
                Do the work before you check the answer. Always.
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: c.textMid,
                  margin: 0,
                  lineHeight: "1.8",
                }}
              >
                Every time you copy a mark scheme without attempting the
                question first, you waste that question. Attempt first. Check
                second. Every single time.
              </p>
            </div>
          </div>
        )}

        {/* ---- STUDY PHASES ---- */}
        {activeTab === "phases" && (
          <div>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                marginTop: 0,
                marginBottom: 4,
                letterSpacing: "-0.5px",
              }}
            >
              3-Phase Study Plan
            </h2>
            <p
              style={{
                color: c.textMid,
                fontSize: 13,
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: `1px solid ${c.border}`,
              }}
            >
              Each phase builds on the last. Don't skip ahead.
            </p>
            {PHASE_INFO.map((p) => (
              <div
                key={p.phase}
                style={{
                  border: `1px solid ${c.borderStrong}`,
                  marginBottom: 16,
                  background: c.card,
                }}
              >
                <div
                  style={{
                    borderBottom: `2px solid ${c.borderStrong}`,
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 700,
                      fontFamily: "monospace",
                      opacity: 0.15,
                      lineHeight: 1,
                      color: c.text,
                    }}
                  >
                    0{p.phase}
                  </div>
                  <div>
                    <div
                      style={{ fontSize: 15, fontWeight: 700, color: c.text }}
                    >
                      {p.name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: c.textDim,
                        letterSpacing: "2px",
                        textTransform: "uppercase",
                        marginTop: 3,
                      }}
                    >
                      {p.days}
                    </div>
                  </div>
                </div>
                <div style={{ padding: 20 }}>
                  <p
                    style={{
                      color: c.textMid,
                      fontSize: 13,
                      margin: "0 0 16px",
                      lineHeight: "1.7",
                    }}
                  >
                    {p.desc}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    {p.focus.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          borderLeft: `2px solid ${c.borderStrong}`,
                          paddingLeft: 12,
                          fontSize: 13,
                          color: c.textMid,
                          lineHeight: "1.7",
                        }}
                      >
                        {f}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      background: c.rowAlt,
                      border: `1px solid ${c.border}`,
                      padding: "12px 16px",
                      fontSize: 13,
                      color: c.textMid,
                      lineHeight: "1.6",
                      fontStyle: "italic",
                    }}
                  >
                    {p.tip}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---- STUDY SCHEDULE + TIMER ---- */}
        {activeTab === "daily" && (
          <div>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                marginTop: 0,
                marginBottom: 4,
                letterSpacing: "-0.5px",
              }}
            >
              Study Block Schedule
            </h2>
            <p
              style={{
                color: c.textMid,
                fontSize: 13,
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: `1px solid ${c.border}`,
              }}
            >
              45-min focused blocks. Use the timer below - start it at the
              beginning of each session.
            </p>
            <div
              style={{
                border: `2px solid ${c.borderStrong}`,
                padding: 24,
                marginBottom: 28,
                textAlign: "center",
                background: c.card,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "3px",
                  textTransform: "uppercase",
                  color: c.textDim,
                  marginBottom: 16,
                }}
              >
                Session Timer
              </div>
              <div
                style={{
                  height: 4,
                  background: c.border,
                  borderRadius: 2,
                  maxWidth: 300,
                  margin: "0 auto 20px",
                }}
              >
                <div
                  style={{
                    height: 4,
                    background: c.borderStrong,
                    borderRadius: 2,
                    width: `${timerPct}%`,
                    transition: "width 1s linear",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: timerDone ? 28 : 52,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  letterSpacing: 2,
                  color: timerDone ? c.textDim : c.text,
                  marginBottom: 20,
                }}
              >
                {timerDone
                  ? "Done!"
                  : `${String(timerMins).padStart(2, "0")}:${String(
                      timerSecs
                    ).padStart(2, "0")}`}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "center",
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                {timerRunning ? (
                  <button
                    onClick={pauseTimer}
                    style={{
                      border: `2px solid ${c.borderStrong}`,
                      background: c.borderStrong,
                      color: dark ? "#111" : "#fff",
                      padding: "8px 20px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'Georgia',serif",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                    }}
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={resumeTimer}
                    disabled={timerSeconds === 0}
                    style={{
                      border: `2px solid ${c.borderStrong}`,
                      background:
                        timerSeconds === 0 ? c.rowAlt : c.borderStrong,
                      color:
                        timerSeconds === 0 ? c.textDim : dark ? "#111" : "#fff",
                      padding: "8px 20px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: timerSeconds === 0 ? "default" : "pointer",
                      fontFamily: "'Georgia',serif",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                    }}
                  >
                    Resume
                  </button>
                )}
                <button
                  onClick={resetTimer}
                  style={{
                    border: `1px solid ${c.border}`,
                    background: c.card,
                    color: c.textMid,
                    padding: "8px 20px",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'Georgia',serif",
                    letterSpacing: "1px",
                  }}
                >
                  Reset
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "center",
                  flexWrap: "wrap",
                  marginBottom: 24,
                }}
              >
                {[
                  { label: "45 min study", mins: 45, type: "study" },
                  { label: "15 min break", mins: 15, type: "break" },
                  { label: "60 min lunch", mins: 60, type: "lunch" },
                ].map(({ label, mins, type }) => (
                  <button
                    key={mins}
                    onClick={() => startTimer(mins, type)}
                    style={{
                      border: `1px solid ${c.border}`,
                      background: c.card,
                      padding: "6px 14px",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "'Georgia',serif",
                      color: c.textMid,
                      letterSpacing: "0.5px",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                style={{ borderTop: `1px solid ${c.border}`, paddingTop: 18 }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    color: c.textDim,
                    marginBottom: 12,
                  }}
                >
                  Today's Tally
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    { label: "Study sessions", key: "study", target: 7 },
                    { label: "Breaks", key: "break", target: 5 },
                    { label: "Lunch", key: "lunch", target: 1 },
                  ].map(({ label, key, target }) => (
                    <div
                      key={key}
                      style={{
                        border: `1px solid ${c.border}`,
                        padding: "12px 18px",
                        minWidth: 90,
                        background: c.rowAlt,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 700,
                          lineHeight: 1,
                          color:
                            sessionCounts[key] >= target
                              ? c.borderStrong
                              : c.text,
                        }}
                      >
                        {sessionCounts[key] || 0}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: c.textDim,
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          marginTop: 5,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{ fontSize: 10, color: c.textDim, marginTop: 2 }}
                      >
                        / {target}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: c.textDim, marginTop: 12 }}>
                  Counts up automatically when a timer finishes. Resets each
                  day.
                </div>
              </div>
            </div>
            {DAILY_SCHEDULE.map((s, i) => {
              const isDone = s.type === "done";
              const isBreak = s.type === "break";
              const isLunch = s.type === "lunch";
              const lb =
                isDone || (!isBreak && !isLunch)
                  ? `3px solid ${c.borderStrong}`
                  : `3px solid ${c.textDim}`;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    borderBottom: `1px solid ${c.border}`,
                    borderLeft: lb,
                    background:
                      isBreak || isLunch
                        ? c.rowAlt
                        : i % 2 === 0
                        ? c.card
                        : c.rowAlt,
                    padding: "12px 16px",
                  }}
                >
                  <div
                    style={{ minWidth: 100, paddingRight: 14, flexShrink: 0 }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "2px",
                        textTransform: "uppercase",
                        color: c.textDim,
                        marginBottom: 3,
                      }}
                    >
                      {isDone
                        ? "DONE"
                        : isBreak
                        ? "BREAK"
                        : isLunch
                        ? "LUNCH"
                        : "STUDY"}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: c.textDim,
                        fontFamily: "monospace",
                      }}
                    >
                      {s.time}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: c.text,
                      lineHeight: "1.6",
                      fontWeight: isDone ? 700 : 400,
                    }}
                  >
                    {s.task}
                  </div>
                </div>
              );
            })}
            <div
              style={{
                border: `1px solid ${c.borderStrong}`,
                padding: 20,
                marginTop: 20,
                background: c.card,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: c.textDim,
                  marginBottom: 14,
                }}
              >
                Weekly Subject Rotation
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(105px,1fr))",
                  gap: 8,
                }}
              >
                {[
                  { day: "Monday", sub: "Biology" },
                  { day: "Tuesday", sub: "Chemistry" },
                  { day: "Wednesday", sub: "Physics" },
                  { day: "Thursday", sub: "Maths" },
                  { day: "Friday", sub: "Biology" },
                  { day: "Saturday", sub: "Chemistry" },
                  { day: "Sunday", sub: "Light review" },
                ].map((d) => (
                  <div
                    key={d.day}
                    style={{
                      border: `1px solid ${c.border}`,
                      padding: 10,
                      textAlign: "center",
                      background: c.card,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        marginBottom: 5,
                        color: c.text,
                      }}
                    >
                      {d.day}
                    </div>
                    <div style={{ fontSize: 11, color: c.textMid }}>
                      {d.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---- RESOURCES ---- */}
        {activeTab === "resources" && (
          <div>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                marginTop: 0,
                marginBottom: 4,
                letterSpacing: "-0.5px",
              }}
            >
              Recommended Resources
            </h2>
            <p
              style={{
                color: c.textMid,
                fontSize: 13,
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: `1px solid ${c.border}`,
              }}
            >
              Stick to these. Don't hop between ten different websites - that
              wastes time.
            </p>
            {RESOURCES.map((r, i) => (
              <div
                key={i}
                style={{
                  borderBottom: `1px solid ${c.border}`,
                  padding: "16px 0",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    color: c.textDim,
                    marginBottom: 10,
                  }}
                >
                  {r.subject}
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    color: c.textMid,
                    fontSize: 13,
                    lineHeight: "2.2",
                  }}
                >
                  {r.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
            <div
              style={{
                border: `2px solid ${c.borderStrong}`,
                padding: 20,
                marginTop: 16,
                background: c.card,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: c.textDim,
                  marginBottom: 10,
                }}
              >
                Your Method is Strong
              </div>
              <p
                style={{
                  color: c.textMid,
                  fontSize: 13,
                  margin: 0,
                  lineHeight: "1.9",
                }}
              >
                Your science approach (FreeScienceLessons → Master Doc →
                definitions → flashcards) is excellent. Key adjustment:{" "}
                <strong style={{ color: c.text }}>
                  complete the Master Doc before your tutor lesson
                </strong>{" "}
                so the lesson becomes practice, not first exposure. For Maths:
                preview topics on Maths Genie at home. Add Corbett Maths from
                Phase 2 for Grade 8/9 questions.
              </p>
            </div>
          </div>
        )}

        {/* ---- MOTIVATION ---- */}
        {activeTab === "motivation" && (
          <div>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                marginTop: 0,
                marginBottom: 4,
                letterSpacing: "-0.5px",
              }}
            >
              Staying on Track
            </h2>
            <p
              style={{
                color: c.textMid,
                fontSize: 13,
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: `1px solid ${c.border}`,
              }}
            >
              Motivation is unreliable. What works is building habits and
              systems. Click each to mark it.
            </p>
            {MOTIVATION_TIPS.map((tip, i) => (
              <div
                key={i}
                onClick={() => toggleTip(i)}
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  borderBottom: `1px solid ${c.border}`,
                  borderLeft: checkedTips[i]
                    ? `3px solid ${c.borderStrong}`
                    : `3px solid ${c.border}`,
                  padding: 16,
                  cursor: "pointer",
                  background: checkedTips[i] ? c.rowAlt : c.card,
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    flexShrink: 0,
                    width: 22,
                    color: c.textMid,
                    fontFamily: "monospace",
                    marginTop: 1,
                  }}
                >
                  {tip.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      marginBottom: 5,
                      color: c.text,
                    }}
                  >
                    {tip.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: c.textMid,
                      lineHeight: "1.7",
                    }}
                  >
                    {tip.body}
                  </div>
                </div>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    flexShrink: 0,
                    marginTop: 2,
                    border: `2px solid ${
                      checkedTips[i] ? c.borderStrong : c.border
                    }`,
                    background: checkedTips[i] ? c.borderStrong : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: dark ? "#111" : "#fff",
                    fontWeight: 700,
                  }}
                >
                  {checkedTips[i] ? "✓" : ""}
                </div>
              </div>
            ))}
            <div
              style={{
                border: `1px solid ${c.borderStrong}`,
                padding: 20,
                marginTop: 16,
                background: c.card,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: c.textDim,
                  marginBottom: 12,
                }}
              >
                On the Burnout Cycle
              </div>
              <p
                style={{
                  color: c.textMid,
                  fontSize: 13,
                  lineHeight: "1.9",
                  margin: 0,
                }}
              >
                You mentioned studying 1-2 hours, getting stressed, then losing
                focus. That cycle happens because you're trying to study for too
                long without structure. With 45-minute blocks and breaks built
                in, there's nothing to escape from - the break is already
                coming.
                <br />
                <br />
                You recognise this pattern. That's the first step. When it
                happens: reset, and start the next 45-minute block. One bad hour
                doesn't mean a bad day.
              </p>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          borderTop: `1px solid ${c.border}`,
          textAlign: "center",
          padding: 20,
          color: c.textDim,
          fontSize: 11,
          letterSpacing: "0.5px",
          background: c.bg,
        }}
      >
        Exam dates sourced from AQA and Edexcel official 2026 timetables. Always
        confirm with your exam centre.
      </div>
    </div>
  );
}
