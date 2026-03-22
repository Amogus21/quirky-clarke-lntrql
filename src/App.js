import { useState, useEffect, useRef } from "react";

const SB_URL = "https://wtmeywptzxcnxzqharjq.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bWV5d3B0enhjbnh6cWhhcmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTI5NTYsImV4cCI6MjA4OTA2ODk1Nn0.wTzjQcri_I3srSQ807OdxC15-8qMEWGDamos0XFCnbQ";

const sbHeaders = (token) => ({
  "Content-Type": "application/json",
  apikey: SB_KEY,
  Authorization: `Bearer ${token || SB_KEY}`,
  Prefer: "resolution=merge-duplicates,return=minimal",
});
const sbSet = async (token, uid, key, value) => {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/user_data?on_conflict=user_id,key`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SB_KEY,
          Authorization: `Bearer ${token || SB_KEY}`,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          user_id: uid,
          key,
          value: JSON.stringify(value),
        }),
      }
    );
    if (!res.ok) console.error("sbSet failed:", res.status, await res.text());
  } catch (e) {
    console.error("sbSet error:", e);
  }
};
const sbGetAll = async (token, uid) => {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/user_data?user_id=eq.${uid}&select=key,value`,
      { headers: sbHeaders(token) }
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
const sbDel = async (token, uid, key) => {
  try {
    await fetch(
      `${SB_URL}/rest/v1/user_data?user_id=eq.${uid}&key=eq.${encodeURIComponent(
        key
      )}`,
      { method: "DELETE", headers: sbHeaders(token) }
    );
  } catch {}
};
const sendMagicLink = async (email) => {
  const res = await fetch(`${SB_URL}/auth/v1/otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SB_KEY },
    body: JSON.stringify({ email, create_user: true }),
  });
  return res.ok;
};
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

const EXAM_DATES = [
  { date: "2026-05-12", label: "Biology Paper 1", time: "PM" },
  { date: "2026-05-14", label: "Maths Paper 1 - Non-Calculator", time: "AM" },
  { date: "2026-05-18", label: "Chemistry Paper 1", time: "AM" },
  {
    date: "2026-05-21",
    label: "English Language Paper 1 - Creative Reading & Writing",
    time: "AM",
  },
  { date: "2026-06-02", label: "Physics Paper 1", time: "AM" },
  { date: "2026-06-03", label: "Maths Paper 2 - Calculator", time: "AM" },
  {
    date: "2026-06-05",
    label: "English Language Paper 2 - Viewpoints & Perspectives",
    time: "AM",
  },
  { date: "2026-06-05", label: "Biology Paper 2", time: "PM" },
  { date: "2026-06-10", label: "Maths Paper 3 - Calculator", time: "AM" },
  { date: "2026-06-12", label: "Chemistry Paper 2", time: "AM" },
  { date: "2026-06-15", label: "Physics Paper 2", time: "AM" },
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

const DAILY_SCHEDULE = [
  { time: "9:20-10:05", task: "Session - 1", type: "study" },
  { time: "10:05-10:20", task: "Break - 1", type: "break" },
  { time: "10:20-11:05", task: "Session - 2", type: "study" },
  { time: "11:05-11:20", task: "Break - 2", type: "break" },
  { time: "11:20-12:05", task: "Session - 3", type: "study" },
  { time: "12:05-12:20", task: "Break - 3", type: "break" },
  { time: "12:20-1:05", task: "Session - 4", type: "study" },
  { time: "1:05-2:05", task: "Lunch", type: "lunch" },
  { time: "2:05-2:50", task: "Session - 5", type: "study" },
  { time: "2:50-3:05", task: "Break - 4", type: "break" },
  { time: "3:05-3:50", task: "Session - 6", type: "study" },
  { time: "3:50-4:05", task: "Break - 5", type: "break" },
  { time: "4:05-4:50", task: "Session - 7", type: "study" },
  { time: "4:50+", task: "Study done. Evening is yours.", type: "done" },
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
      "Maths Genie - videos + practice per topic",
      "Corbett Maths - harder questions",
      "Edexcel Higher past papers (2018-2025)",
      "MathsWatch (if Maths Genie isn't clicking)",
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

const TODO_ITEMS = [
  {
    id: "t1",
    section: "MORNING",
    label: "Alarm - turn heater on",
    detail:
      "Phone across the room before sleep. Turn heater on immediately. Three alarms: 7:45, 7:50, 7:55.",
  },
  {
    id: "t2",
    section: "MORNING",
    label: "Drink a full glass of water",
    detail: "Glass on your desk the night before. Drink before anything else.",
  },
  {
    id: "t3",
    section: "MORNING",
    label: "Breakfast (2 eggs)",
    detail: "Add toast or fruit if you can. Do not skip this.",
  },
  { id: "t4", section: "MORNING", label: "Vitamins", detail: "" },
  { id: "t5", section: "MORNING", label: "Brush teeth", detail: "" },
  { id: "t6", section: "MORNING", label: "Shave", detail: "" },
  { id: "t7", section: "MORNING", label: "Shower + wipe glasses", detail: "" },
  {
    id: "t8",
    section: "MORNING",
    label: "Morning skincare",
    detail:
      "Cleanser → Azelaic acid (wait 5 min) → Moisturiser. No Daily Dose in the morning.",
  },
  {
    id: "t9",
    section: "MORNING",
    label: "Free time",
    detail: "YouTube, music, chill - whatever you want before study starts.",
  },
  { id: "t10", section: "STUDY", label: "Session - 1", detail: "" },
  { id: "t11", section: "STUDY", label: "Break - 1", detail: "" },
  { id: "t12", section: "STUDY", label: "Session - 2", detail: "" },
  { id: "t13", section: "STUDY", label: "Break - 2", detail: "" },
  { id: "t14", section: "STUDY", label: "Session - 3", detail: "" },
  { id: "t15", section: "STUDY", label: "Break - 3", detail: "" },
  { id: "t16", section: "STUDY", label: "Session - 4", detail: "" },
  {
    id: "t17",
    section: "STUDY",
    label: "Lunch",
    detail:
      "Cook and eat a proper meal. Go outside. YouTube is fine. No gaming.",
  },
  { id: "t18", section: "STUDY", label: "Session - 5", detail: "" },
  { id: "t19", section: "STUDY", label: "Break - 4", detail: "" },
  { id: "t20", section: "STUDY", label: "Session - 6", detail: "" },
  { id: "t21", section: "STUDY", label: "Break - 5", detail: "" },
  { id: "t22", section: "STUDY", label: "Session - 7", detail: "" },
  {
    id: "t23",
    section: "EVENING",
    label: "Aim training + Valorant warmup (1hr)",
    detail:
      "Angle hold v2 → Head tracking → Flicking → Deathmatch x2 → Team DM x2.",
  },
  {
    id: "t24",
    section: "EVENING",
    label: "Ranked queue (2hrs)",
    detail:
      "Hard cap at 3 games / 2 hours. Set a timer. Finish your game then stop.",
  },
  {
    id: "t25",
    section: "EVENING",
    label: "Movie / episodes / chill (1hr)",
    detail: "1-2 episodes or 1 movie. Guaranteed wind-down time.",
  },
  {
    id: "t26",
    section: "NIGHT",
    label: "Night skincare",
    detail:
      "Cleanser → Daily Dose (wait 10 min) → Moisturiser. No azelaic acid at night.",
  },
  {
    id: "t27",
    section: "NIGHT",
    label: "In bed - turn off heater",
    detail: "Turn the heater off before getting in. Lights out by 11pm.",
  },
];

const SP_CLIENT_ID = "2741ff4671b04fa3bfa8e5550369e0f7";
const SP_REDIRECT = "https://cerulean-parfait-7652ed.netlify.app";
const SP_SCOPES =
  "streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative user-library-read";

const spGenerateVerifier = () => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};
const spChallenge = async (verifier) => {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};
const spGetToken = async (code) => {
  const verifier = localStorage.getItem("sp_verifier");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: SP_CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: SP_REDIRECT,
      code_verifier: verifier,
    }),
  });
  return res.ok ? res.json() : null;
};
const spRefreshToken = async (refresh_token) => {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: SP_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token,
    }),
  });
  return res.ok ? res.json() : null;
};
const spApi = async (token, path, method = "GET", body) => {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204 || res.status === 202) return null;
  return res.ok ? res.json() : null;
};

const parseExamDate = (str) => {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

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
    else setError("Something went wrong. Try again.");
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
          GCSE 2026
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
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
              sign in.
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

export default function StudyPlan() {
  const [session, setSession] = useState(() => ls.get("gcse_session", null));
  const [authLoading, setAuthLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [view, setView] = useState("today");
  const [, setTick] = useState(0);
  const [checkedTips, setCheckedTips] = useState({});
  const [dark, setDark] = useState(() => ls.get("gcse_dark", false));
  const toggleDark = () =>
    setDark((d) => {
      ls.set("gcse_dark", !d);
      return !d;
    });

  const [spToken, setSpToken] = useState(() => ls.get("sp_token", null));
  const [spPlayer, setSpPlayer] = useState(null);
  const [spDeviceId, setSpDeviceId] = useState(null);
  const [spPlaying, setSpPlaying] = useState(false);
  const [spTrack, setSpTrack] = useState(null);
  const [spProgress, setSpProgress] = useState(0);
  const [spDuration, setSpDuration] = useState(0);
  const [spVolume, setSpVolume] = useState(0.5);
  const [spSearch, setSpSearch] = useState("");
  const [spResults, setSpResults] = useState([]);
  const [spSearching, setSpSearching] = useState(false);
  const [spReady, setSpReady] = useState(false);
  const [spShuffle, setSpShuffle] = useState(false);
  const [spRepeat, setSpRepeat] = useState(0); // 0=off 1=context 2=track
  const [spSearchTab, setSpSearchTab] = useState("tracks"); // tracks | playlists
  const [spPlaylists, setSpPlaylists] = useState([]);
  const [spSelectedPlaylist, setSpSelectedPlaylist] = useState(null); // { id, name, tracks: [] }
  const [spLoadingPlaylist, setSpLoadingPlaylist] = useState(false);
  const spProgressRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.message === "Script error." || e.filename?.includes("spotify")) {
        e.preventDefault();
        return true;
      }
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;
    window.history.replaceState({}, "", window.location.pathname);
    (async () => {
      const data = await spGetToken(code);
      if (data?.access_token) {
        const tok = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + data.expires_in * 1000,
        };
        ls.set("sp_token", tok);
        setSpToken(tok);
        setView("spotify");
      }
    })();
  }, []);

  const getSpAccess = async () => {
    if (!spToken) return null;
    // If no expires_at or expired, refresh
    if (!spToken.expires_at || Date.now() >= spToken.expires_at - 60000) {
      if (!spToken.refresh_token) {
        ls.del("sp_token");
        setSpToken(null);
        return null;
      }
      const data = await spRefreshToken(spToken.refresh_token);
      if (!data?.access_token) {
        ls.del("sp_token");
        setSpToken(null);
        return null;
      }
      const tok = {
        ...spToken,
        access_token: data.access_token,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      };
      ls.set("sp_token", tok);
      setSpToken(tok);
      return tok.access_token;
    }
    return spToken.access_token;
  };

  useEffect(() => {
    if (!spToken) return;
    try {
      const initPlayer = () => {
        try {
          const player = new window.Spotify.Player({
            name: "Grade 9 Study Plan",
            getOAuthToken: async (cb) => {
              const t = await getSpAccess();
              if (t) cb(t);
            },
            volume: 0.5,
          });
          player.addListener("ready", ({ device_id }) => {
            setSpDeviceId(device_id);
            setSpReady(true);
          });
          player.addListener("player_state_changed", (state) => {
            if (!state) return;
            setSpTrack(state.track_window.current_track);
            setSpPlaying(!state.paused);
            setSpProgress(state.position);
            setSpDuration(state.duration);
          });
          player.connect();
          setSpPlayer(player);
        } catch (e) {
          console.warn(
            "Spotify player init failed (expected in CodeSandbox):",
            e.message
          );
        }
      };
      if (window.Spotify) {
        initPlayer();
      } else if (!document.getElementById("sp-sdk")) {
        window.onSpotifyWebPlaybackSDKReady = initPlayer;
        const script = document.createElement("script");
        script.id = "sp-sdk";
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.onerror = () =>
          console.warn("Spotify SDK failed to load (expected in CodeSandbox)");
        document.head.appendChild(script);
      } else {
        window.onSpotifyWebPlaybackSDKReady = initPlayer;
      }
    } catch (e) {
      console.warn("Spotify setup failed:", e.message);
    }
  }, [spToken]);

  useEffect(() => {
    clearInterval(spProgressRef.current);
    if (spPlaying)
      spProgressRef.current = setInterval(
        () => setSpProgress((p) => p + 500),
        500
      );
    return () => clearInterval(spProgressRef.current);
  }, [spPlaying]);

  const spSearchTracks = async (q) => {
    if (!q.trim()) return;
    setSpSearching(true);
    const t = await getSpAccess();
    if (!t) {
      setSpSearching(false);
      return;
    }
    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", q.trim());
    url.searchParams.set("type", "track");
    url.searchParams.set("limit", "10");
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Search failed:", res.status, err);
      if (res.status === 401) {
        ls.del("sp_token");
        setSpToken(null);
      }
      setSpSearching(false);
      return;
    }
    const data = await res.json();
    setSpResults(data?.tracks?.items || []);
    setSpSearching(false);
  };
  const spPlayTrack = async (uri) => {
    const t = await getSpAccess();
    if (!t || !spDeviceId) return;
    await spApi(t, `/me/player/play?device_id=${spDeviceId}`, "PUT", {
      uris: [uri],
    });
  };
  const spToggle = () => spPlayer?.togglePlay();
  const spNext = () => spPlayer?.nextTrack();
  const spPrev = () => spPlayer?.previousTrack();
  const spSetVol = (v) => {
    setSpVolume(v);
    spPlayer?.setVolume(v);
  };
  const spLogout = () => {
    ls.del("sp_token");
    setSpToken(null);
    setSpPlayer(null);
    setSpReady(false);
  };

  const spToggleShuffle = async () => {
    const t = await getSpAccess();
    if (!t) return;
    const next = !spShuffle;
    setSpShuffle(next);
    await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${next}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${t}` },
    });
  };
  const spCycleRepeat = async () => {
    const t = await getSpAccess();
    if (!t) return;
    const next = (spRepeat + 1) % 3;
    setSpRepeat(next);
    const modes = ["off", "context", "track"];
    await fetch(
      `https://api.spotify.com/v1/me/player/repeat?state=${modes[next]}`,
      { method: "PUT", headers: { Authorization: `Bearer ${t}` } }
    );
  };
  const spLoadPlaylists = async () => {
    const t = await getSpAccess();
    if (!t) return;
    const res = await fetch(
      "https://api.spotify.com/v1/me/playlists?limit=30",
      { headers: { Authorization: `Bearer ${t}` } }
    );
    if (!res.ok) return;
    const data = await res.json();
    setSpPlaylists(data?.items || []);
  };
  const spPlayPlaylist = async (uri) => {
    const t = await getSpAccess();
    if (!t || !spDeviceId) return;
    await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${spDeviceId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ context_uri: uri }),
      }
    );
  };
  const spOpenPlaylist = async (pl) => {
    setSpSelectedPlaylist({
      id: pl.id,
      name: pl.name,
      image: pl.images?.[0]?.url,
      uri: pl.uri,
      tracks: [],
      error: null,
    });
    setSpLoadingPlaylist(true);
    const t = await getSpAccess();
    if (!t) return;
    try {
      // Try the full playlist object which includes tracks inline
      const res = await fetch(`https://api.spotify.com/v1/playlists/${pl.id}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const text = await res.text();
      console.log("Playlist response:", res.status, text.slice(0, 400));
      if (!res.ok) {
        setSpSelectedPlaylist((p) => ({
          ...p,
          error: `${res.status}: ${text.slice(0, 200)}`,
        }));
        setSpLoadingPlaylist(false);
        return;
      }
      const data = JSON.parse(text);
      const items = Array.isArray(data?.tracks?.items) ? data.tracks.items : [];
      const tracks = items.map((i) => i?.track).filter((t) => t && t.id);
      setSpSelectedPlaylist((p) => ({
        ...p,
        tracks,
        name: data.name || pl.name,
        image: data.images?.[0]?.url || pl.images?.[0]?.url,
      }));
    } catch (e) {
      console.error("Playlist error:", e);
      setSpSelectedPlaylist((p) => ({ ...p, error: e.message }));
    }
    setSpLoadingPlaylist(false);
  };
  const spPlayFromPlaylist = async (playlistUri, trackUri) => {
    const t = await getSpAccess();
    if (!t || !spDeviceId) return;
    await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${spDeviceId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context_uri: playlistUri,
          offset: { uri: trackUri },
        }),
      }
    );
  };
  const spDoLogin = async () => {
    const verifier = spGenerateVerifier();
    const challenge = await spChallenge(verifier);
    localStorage.setItem("sp_verifier", verifier);
    const params = new URLSearchParams({
      client_id: SP_CLIENT_ID,
      response_type: "code",
      redirect_uri: SP_REDIRECT,
      scope: SP_SCOPES,
      code_challenge_method: "S256",
      code_challenge: challenge,
    });
    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  };
  const fmtTime = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const c = {
    bg: dark ? "#111" : "#fff",
    text: dark ? "#e8e8e8" : "#111",
    textMid: dark ? "#aaa" : "#555",
    textDim: dark ? "#666" : "#bbb",
    border: dark ? "#333" : "#ddd",
    borderStrong: dark ? "#e8e8e8" : "#000",
    card: dark ? "#1a1a1a" : "#fff",
    input: dark ? "#1a1a1a" : "#fff",
  };

  useEffect(() => {
    (async () => {
      if (window.location.hash.includes("access_token")) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const newSession = {
            access_token,
            refresh_token,
            user: { id: "temp-user" },
          };
          ls.set("gcse_session", newSession);
          setSession(newSession);
          window.history.replaceState({}, document.title, "/");
          setAuthLoading(false);
          return;
        }
      }
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

  const syncSet = (key, value) => {
    ls.set(key, value);
    if (session?.access_token && session?.user?.id)
      sbSet(session.access_token, session.user.id, key, value)
        .then(() => {
          setSyncStatus("synced");
          setTimeout(() => setSyncStatus(""), 2000);
        })
        .catch(() => setSyncStatus("offline"));
  };
  const syncDel = (key) => {
    ls.del(key);
    if (session?.access_token && session?.user?.id)
      sbDel(session.access_token, session.user.id, key).catch(() => {});
  };

  useEffect(() => {
    if (!session?.access_token || !session?.user?.id) return;
    (async () => {
      setSyncing(true);
      const remote = await sbGetAll(session.access_token, session.user.id);
      ["gcse_todo", "gcse_topics", "gcse_streak", "gcse_tutor_logs"].forEach(
        (key) => {
          if (!(key in remote)) ls.del(key);
        }
      );
      Object.entries(remote).forEach(([key, value]) => {
        if (key === "gcse_timer_state" || key === "gcse_sw_state") return;
        ls.set(key, value);
      });
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
      setSyncing(false);
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus(""), 3000);
    })();
  }, [session?.user?.id]);

  const signOut = () => {
    ls.del("gcse_session");
    setSession(null);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const examDate = parseExamDate("2026-05-12");
  const daysUntilExam = Math.ceil((examDate - today) / 86400000);
  const toggleTip = (i) => setCheckedTips((p) => ({ ...p, [i]: !p[i] }));

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

  const updateStreak = (wasComplete) => {
    const streakData = ls.get("gcse_streak", { count: 0, lastDate: null });
    const todayKey = getTodayKey();
    if (streakData.lastDate === todayKey) return streakData.count;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = `${yesterday.getFullYear()}-${String(
      yesterday.getMonth() + 1
    ).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    const newCount = wasComplete
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

  const [sessionSubjects, setSessionSubjects] = useState(() =>
    ls.get("gcse_session_subjects_" + getTodayKey(), {})
  );

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

  const notesKey = `gcse_notes_${getTodayKey()}`;
  const [notes, setNotes] = useState(() => ls.get(notesKey, ""));
  const saveNotes = (val) => {
    setNotes(val);
    syncSet(notesKey, val);
  };

  const SW_KEY = "gcse_sw_state";
  const loadSw = () => {
    const saved = ls.get(SW_KEY, null);
    if (!saved) return { ms: 0, laps: [], running: false };
    if (saved.running && saved.startedAt)
      return {
        ...saved,
        ms: saved.ms + (Date.now() - saved.startedAt),
        running: true,
      };
    return saved;
  };
  const initSw = loadSw();
  const [swRunning, setSwRunning] = useState(initSw.running);
  const [swMs, setSwMs] = useState(initSw.ms);
  const [swLaps, setSwLaps] = useState(initSw.laps || []);
  const swRef = useRef(null);
  const swStartRef = useRef(initSw.running ? Date.now() : null);
  const swBaseRef = useRef(initSw.ms);
  const saveSw = (ms, laps, running) => {
    ls.set(SW_KEY, {
      ms,
      laps,
      running,
      startedAt: running ? Date.now() : null,
    });
  };
  useEffect(() => {
    if (swRunning) {
      swStartRef.current = Date.now();
      saveSw(swBaseRef.current, swLaps, true);
      swRef.current = setInterval(() => {
        const newMs = swBaseRef.current + (Date.now() - swStartRef.current);
        setSwMs(newMs);
        if (Math.floor(newMs / 1000) % 5 === 0)
          saveSw(swBaseRef.current, swLaps, true);
      }, 50);
    } else {
      clearInterval(swRef.current);
      if (swStartRef.current) {
        swBaseRef.current += Date.now() - swStartRef.current;
        swStartRef.current = null;
      }
      saveSw(swBaseRef.current, swLaps, false);
    }
    return () => clearInterval(swRef.current);
  }, [swRunning]);
  const swReset = () => {
    clearInterval(swRef.current);
    setSwRunning(false);
    setSwMs(0);
    setSwLaps([]);
    swBaseRef.current = 0;
    swStartRef.current = null;
    ls.del(SW_KEY);
  };
  const swLap = () => {
    if (!swRunning && swMs === 0) return;
    const newLaps = [{ id: swLaps.length + 1, ms: swMs }, ...swLaps];
    setSwLaps(newLaps);
    saveSw(swBaseRef.current, newLaps, swRunning);
  };
  const fmtMs = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    return `${String(Math.floor(totalSecs / 60)).padStart(2, "0")}:${String(
      totalSecs % 60
    ).padStart(2, "0")}.${String(Math.floor((ms % 1000) / 10)).padStart(
      2,
      "0"
    )}`;
  };

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

  if (authLoading) {
  } // skip loading screen
  // if (!session) return <SignIn onSession={s => { ls.set("gcse_session",s); setSession(s); }} dark={dark} c={c} />;

  const subjects = [
    "Biology",
    "Chemistry",
    "Physics",
    "Maths",
    "English Language",
    "Light review",
  ];
  const totalTopics = Object.values(SUBJECT_TOPICS).reduce(
    (a, t) => a + t.length,
    0
  );
  const doneTopics = Object.keys(topicsDone).filter(
    (k) => topicsDone[k] === true
  ).length;
  const topicsPct = Math.round((doneTopics / totalTopics) * 100);
  const nowForDay = new Date();
  const minsLeftToday =
    (23 - nowForDay.getHours()) * 60 + (59 - nowForDay.getMinutes());
  const hoursLeftToday = Math.floor(minsLeftToday / 60);
  const minsLeftTodayRem = minsLeftToday % 60;

  if (!document.getElementById("gcse-fonts")) {
    const link = document.createElement("link");
    link.id = "gcse-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=IBM+Plex+Mono:wght@400;600&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);
  }

  const D = dark;
  const bg = D ? "#0a0a0a" : "#f2f1ee",
    surface = D ? "#141414" : "#fafaf8",
    surface2 = D ? "#1c1c1c" : "#f0efec",
    surface3 = D ? "#242424" : "#e8e7e3";
  const border1 = D ? "#2a2a2a" : "#dddbd5",
    border2 = D ? "#383838" : "#c8c6bf";
  const txt1 = D ? "#ececec" : "#1a1a1a",
    txt2 = D ? "#999" : "#5a5a5a",
    txt3 = D ? "#555" : "#9a9896";
  const accentBg = D ? "#ececec" : "#1a1a1a",
    accentTx = D ? "#0a0a0a" : "#fafaf8";
  const shadow = D ? "0 1px 3px rgba(0,0,0,0.6)" : "0 1px 4px rgba(0,0,0,0.08)";
  const mono = "'IBM Plex Mono', monospace",
    sans = "'DM Sans', sans-serif",
    serif = "'DM Serif Display', serif";

  const card = (extra = {}) => ({
    background: surface,
    border: `1px solid ${border1}`,
    borderRadius: 6,
    boxShadow: shadow,
    ...extra,
  });
  const pill = (active) => ({
    background: active ? accentBg : "transparent",
    color: active ? accentTx : txt2,
    border: `1px solid ${active ? accentBg : border1}`,
    padding: "5px 13px",
    fontSize: 11,
    fontFamily: sans,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    borderRadius: 4,
    letterSpacing: "0.2px",
  });
  const sh = {
    fontFamily: sans,
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "1.5px",
    color: txt3,
    marginBottom: 14,
  };

  return (
    <div
      style={{
        fontFamily: sans,
        background: bg,
        minHeight: "100vh",
        color: txt1,
      }}
    >
      {/* NAVBAR */}
      <div
        style={{
          background: surface,
          borderBottom: `1px solid ${border1}`,
          height: 54,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: shadow,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: serif, fontSize: 17, color: txt1 }}>
              Grade 9
            </span>
            <span style={{ fontFamily: mono, fontSize: 10, color: txt3 }}>
              GCSE 2026
            </span>
          </div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {[
              ["today", "Today"],
              ["tracker", "Topics"],
              ["tutor", "Tutor Log"],
              ["notes", "Notes"],
              ["resources", "Resources"],
              ["motivation", "Motivation"],
              ["spotify", "♫ Spotify"],
            ].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={pill(view === v)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {syncing && (
            <span style={{ fontFamily: mono, fontSize: 10, color: txt3 }}>
              syncing…
            </span>
          )}
          {syncStatus === "synced" && (
            <span style={{ fontFamily: mono, fontSize: 10, color: txt3 }}>
              ✓ synced
            </span>
          )}
          <button
            onClick={toggleDark}
            style={{ ...pill(false), padding: "5px 10px", fontSize: 13 }}
          >
            {D ? "☀" : "☾"}
          </button>
          <button onClick={signOut} style={{ ...pill(false), fontSize: 11 }}>
            Sign out
          </button>
        </div>
      </div>

      {/* STAT STRIP */}
      <div
        style={{
          background: surface2,
          borderBottom: `1px solid ${border1}`,
          display: "flex",
          overflowX: "auto",
        }}
      >
        {[
          { v: daysUntilExam, l: "Days to Bio P1" },
          { v: `${hoursLeftToday}h ${minsLeftTodayRem}m`, l: "Left today" },
          { v: streak ? `🔥 ${streak}` : "0", l: "Day streak" },
          { v: `${doneTopics}/${totalTopics}`, l: `Topics · ${topicsPct}%` },
          { v: `${totalDone}/${TODO_ITEMS.length}`, l: "Tasks today" },
          { v: `${sessionCounts.study || 0}/7`, l: "Sessions" },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              padding: "12px 24px",
              borderRight: `1px solid ${border1}`,
              flexShrink: 0,
              minWidth: 100,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: mono,
                fontSize: 22,
                fontWeight: 600,
                lineHeight: 1,
                color: txt1,
              }}
            >
              {s.v}
            </div>
            <div
              style={{
                fontFamily: sans,
                fontSize: 10,
                color: txt3,
                textTransform: "uppercase",
                letterSpacing: "1.2px",
                marginTop: 4,
              }}
            >
              {s.l}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{ maxWidth: 1440, margin: "0 auto", padding: "20px 20px 40px" }}
      >
        {/* TODAY */}
        {view === "today" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 330px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ ...card(), padding: 24 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: serif,
                        fontSize: 22,
                        color: txt1,
                        letterSpacing: "-0.5px",
                      }}
                    >
                      Today's Plan
                    </div>
                    <div
                      style={{
                        fontFamily: sans,
                        fontSize: 12,
                        color: txt2,
                        marginTop: 4,
                      }}
                    >
                      {today.toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{ fontFamily: mono, fontSize: 13, color: txt2 }}
                    >
                      {totalDone}
                      <span style={{ color: txt3 }}>/{TODO_ITEMS.length}</span>
                    </div>
                    <button
                      onClick={resetAll}
                      style={{
                        ...pill(false),
                        fontSize: 10,
                        padding: "4px 10px",
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    height: 2,
                    background: border1,
                    borderRadius: 2,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      height: 2,
                      background: accentBg,
                      borderRadius: 2,
                      width: `${(totalDone / TODO_ITEMS.length) * 100}%`,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
                {["MORNING", "STUDY", "EVENING", "NIGHT"].map((section) => {
                  const items = TODO_ITEMS.filter((t) => t.section === section);
                  const secDone = items.filter((t) => checked[t.id]).length;
                  return (
                    <div key={section} style={{ marginBottom: 20 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: mono,
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: "2px",
                            color: txt3,
                            textTransform: "uppercase",
                          }}
                        >
                          {section}
                        </span>
                        <span
                          style={{
                            fontFamily: mono,
                            fontSize: 10,
                            color: txt3,
                          }}
                        >
                          {secDone}/{items.length}
                        </span>
                      </div>
                      {items.map((item) => {
                        const done = !!checked[item.id];
                        const isSession = item.label.startsWith("Session");
                        const isBreak = item.label.startsWith("Break");
                        const isLunch = item.label === "Lunch";
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleCheck(item.id)}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                              padding: "8px 10px",
                              marginBottom: 2,
                              borderRadius: 4,
                              background: done
                                ? surface3
                                : isBreak || isLunch
                                ? surface2
                                : "transparent",
                              cursor: "pointer",
                              opacity: done ? 0.55 : 1,
                            }}
                          >
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                flexShrink: 0,
                                marginTop: 1,
                                borderRadius: 3,
                                border: `1.5px solid ${
                                  done ? accentBg : border2
                                }`,
                                background: done ? accentBg : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {done && (
                                <span
                                  style={{
                                    fontSize: 9,
                                    color: accentTx,
                                    fontWeight: 700,
                                  }}
                                >
                                  ✓
                                </span>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontFamily: sans,
                                  fontSize: 13,
                                  fontWeight: isSession ? 600 : 400,
                                  color: txt1,
                                  textDecoration: done
                                    ? "line-through"
                                    : "none",
                                }}
                              >
                                {item.label}
                              </div>
                              {item.detail && (
                                <div
                                  style={{
                                    fontFamily: sans,
                                    fontSize: 11,
                                    color: txt2,
                                    marginTop: 2,
                                    lineHeight: "1.5",
                                  }}
                                >
                                  {item.detail}
                                </div>
                              )}
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
                      background: accentBg,
                      borderRadius: 6,
                      padding: "14px 18px",
                      textAlign: "center",
                      marginTop: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: serif,
                        fontSize: 15,
                        color: accentTx,
                      }}
                    >
                      Day complete{streak > 1 ? ` · ${streak} day streak` : ""}.
                    </span>
                  </div>
                )}
                <div
                  style={{
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: `1px solid ${border1}`,
                  }}
                >
                  <div style={sh}>Today's Notes</div>
                  <textarea
                    value={notes}
                    onChange={(e) => saveNotes(e.target.value)}
                    placeholder="What did you cover today?"
                    style={{
                      width: "100%",
                      minHeight: 80,
                      background: surface2,
                      border: `1px solid ${border1}`,
                      borderRadius: 4,
                      padding: "10px 12px",
                      fontSize: 12,
                      fontFamily: sans,
                      color: txt1,
                      resize: "vertical",
                      outline: "none",
                      lineHeight: "1.6",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ ...card(), padding: 24 }}>
                <div style={sh}>Sessions Today — Pick a Subject</div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))",
                    gap: 10,
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <div
                      key={n}
                      style={{
                        background: sessionSubjects[n] ? surface3 : surface2,
                        border: `1px solid ${
                          sessionSubjects[n] ? border2 : border1
                        }`,
                        borderRadius: 5,
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: mono,
                          fontSize: 10,
                          color: txt3,
                          marginBottom: 10,
                        }}
                      >
                        Session {n}
                      </div>
                      <div
                        style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
                      >
                        {subjects.map((s) => (
                          <button
                            key={s}
                            onClick={() =>
                              setSessionSubjects((p) => {
                                const next = { ...p, [n]: p[n] === s ? "" : s };
                                syncSet(
                                  "gcse_session_subjects_" + getTodayKey(),
                                  next
                                );
                                return next;
                              })
                            }
                            style={{
                              ...pill(sessionSubjects[n] === s),
                              fontSize: 10,
                              padding: "3px 9px",
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ ...card(), padding: 20 }}>
                <div style={sh}>Next Exams</div>
                {EXAM_DATES.filter((e) => parseExamDate(e.date) >= today)
                  .slice(0, 5)
                  .map((e, i, arr) => {
                    const d = Math.ceil(
                      (parseExamDate(e.date) - today) / 86400000
                    );
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 0",
                          borderBottom:
                            i < arr.length - 1
                              ? `1px solid ${border1}`
                              : "none",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontFamily: sans,
                              fontSize: 12,
                              fontWeight: 500,
                              color: txt1,
                            }}
                          >
                            {e.label.split(" - ")[0]}
                          </div>
                          <div
                            style={{
                              fontFamily: mono,
                              fontSize: 10,
                              color: txt3,
                              marginTop: 2,
                            }}
                          >
                            {parseExamDate(e.date).toLocaleDateString("en-GB", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}{" "}
                            · {e.time}
                          </div>
                        </div>
                        <div
                          style={{
                            fontFamily: mono,
                            fontSize: 20,
                            fontWeight: 600,
                            color: d <= 14 ? txt1 : txt2,
                          }}
                        >
                          {d}
                          <span style={{ fontSize: 10, color: txt3 }}>d</span>
                        </div>
                      </div>
                    );
                  })}
                {EXAM_DATES.filter((e) => parseExamDate(e.date) >= today)
                  .length > 5 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginTop: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {EXAM_DATES.filter((e) => parseExamDate(e.date) >= today)
                      .slice(5)
                      .map((e, i) => {
                        const d = Math.ceil(
                          (parseExamDate(e.date) - today) / 86400000
                        );
                        return (
                          <div
                            key={i}
                            style={{
                              background: surface2,
                              border: `1px solid ${border1}`,
                              borderRadius: 4,
                              padding: "5px 9px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                fontFamily: mono,
                                fontSize: 13,
                                fontWeight: 600,
                                color: txt2,
                              }}
                            >
                              {d}d
                            </div>
                            <div
                              style={{
                                fontFamily: sans,
                                fontSize: 9,
                                color: txt3,
                              }}
                            >
                              {e.label.split(" ")[0]} {e.label.split(" ")[1]}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div style={{ ...card(), padding: 20 }}>
                <div style={sh}>Focus Timer</div>
                <div
                  style={{
                    height: 2,
                    background: border1,
                    borderRadius: 2,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      height: 2,
                      background: accentBg,
                      borderRadius: 2,
                      width: `${timerPct}%`,
                      transition: "width 1s linear",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: timerDone ? 28 : 44,
                    fontWeight: 600,
                    color: timerDone ? txt3 : txt1,
                    textAlign: "center",
                    marginBottom: 14,
                    letterSpacing: 1,
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
                    gap: 6,
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  {timerRunning ? (
                    <button
                      onClick={pauseTimer}
                      style={{
                        ...pill(true),
                        padding: "8px 22px",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={resumeTimer}
                      disabled={timerSeconds === 0}
                      style={{
                        ...pill(timerSeconds > 0),
                        padding: "8px 22px",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={resetTimer}
                    style={{ ...pill(false), padding: "8px 14px" }}
                  >
                    Reset
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  {[
                    { l: "45m study", m: 45, t: "study" },
                    { l: "15m break", m: 15, t: "break" },
                    { l: "60m lunch", m: 60, t: "lunch" },
                  ].map(({ l, m, t }) => (
                    <button
                      key={m}
                      onClick={() => startTimer(m, t)}
                      style={{
                        ...pill(false),
                        fontSize: 10,
                        padding: "4px 9px",
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    borderTop: `1px solid ${border1}`,
                    paddingTop: 14,
                  }}
                >
                  {[
                    { l: "Sessions", k: "study", tg: 7 },
                    { l: "Breaks", k: "break", tg: 5 },
                    { l: "Lunch", k: "lunch", tg: 1 },
                  ].map(({ l, k, tg }, i) => (
                    <div
                      key={k}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        borderRight: i < 2 ? `1px solid ${border1}` : "none",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: mono,
                          fontSize: 20,
                          fontWeight: 600,
                          color: (sessionCounts[k] || 0) >= tg ? txt1 : txt2,
                        }}
                      >
                        {sessionCounts[k] || 0}
                        <span style={{ fontSize: 11, color: txt3 }}>/{tg}</span>
                      </div>
                      <div
                        style={{
                          fontFamily: sans,
                          fontSize: 9,
                          color: txt3,
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          marginTop: 2,
                        }}
                      >
                        {l}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...card(), padding: 20 }}>
                <div style={sh}>Stopwatch</div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 36,
                    fontWeight: 600,
                    color: txt1,
                    textAlign: "center",
                    marginBottom: 12,
                    letterSpacing: 1,
                  }}
                >
                  {fmtMs(swMs)}
                </div>
                <div
                  style={{ display: "flex", gap: 6, justifyContent: "center" }}
                >
                  <button
                    onClick={() => setSwRunning((r) => !r)}
                    style={{
                      ...pill(swRunning),
                      padding: "7px 18px",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {swRunning ? "Stop" : swMs > 0 ? "Resume" : "Start"}
                  </button>
                  <button
                    onClick={swLap}
                    disabled={!swRunning && swMs === 0}
                    style={{ ...pill(false), padding: "7px 12px" }}
                  >
                    Lap
                  </button>
                  <button
                    onClick={swReset}
                    style={{ ...pill(false), padding: "7px 12px" }}
                  >
                    Reset
                  </button>
                </div>
                {swLaps.length > 0 && (
                  <div
                    style={{ marginTop: 12, maxHeight: 120, overflowY: "auto" }}
                  >
                    {swLaps.map((lap, i) => (
                      <div
                        key={lap.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "5px 0",
                          borderBottom: `1px solid ${border1}`,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: mono,
                            fontSize: 10,
                            color: txt3,
                          }}
                        >
                          Lap {swLaps.length - i}
                        </span>
                        <span
                          style={{
                            fontFamily: mono,
                            fontSize: 11,
                            fontWeight: 600,
                            color: txt1,
                          }}
                        >
                          {fmtMs(lap.ms)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TOPIC TRACKER */}
        {view === "tracker" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
                gap: 10,
                marginBottom: 16,
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
                    onClick={() =>
                      setOpenSubject(openSubject === subject ? null : subject)
                    }
                    style={{ ...card(), padding: 16, cursor: "pointer" }}
                  >
                    <div
                      style={{
                        fontFamily: sans,
                        fontSize: 11,
                        fontWeight: 600,
                        color: txt2,
                        marginBottom: 10,
                      }}
                    >
                      {subject}
                    </div>
                    <div
                      style={{
                        fontFamily: mono,
                        fontSize: 24,
                        fontWeight: 600,
                        color: txt1,
                      }}
                    >
                      {done}
                      <span style={{ fontSize: 12, color: txt3 }}>
                        /{topics.length}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 2,
                        background: border1,
                        borderRadius: 2,
                        marginTop: 10,
                      }}
                    >
                      <div
                        style={{
                          height: 2,
                          background: accentBg,
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
                <div key={subject} style={{ ...card(), marginBottom: 8 }}>
                  <div
                    onClick={() => setOpenSubject(isOpen ? null : subject)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 18px",
                      cursor: "pointer",
                      borderLeft:
                        done === topics.length
                          ? `3px solid ${accentBg}`
                          : `3px solid ${border1}`,
                      borderRadius: "6px 6px 0 0",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <span
                        style={{
                          fontFamily: sans,
                          fontSize: 14,
                          fontWeight: 600,
                          color: txt1,
                        }}
                      >
                        {subject}
                      </span>
                      <span
                        style={{ fontFamily: mono, fontSize: 11, color: txt3 }}
                      >
                        {done}/{topics.length}
                      </span>
                    </div>
                    <span
                      style={{ fontFamily: mono, fontSize: 11, color: txt3 }}
                    >
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </div>
                  {isOpen && (
                    <div
                      style={{
                        padding: "4px 14px 14px",
                        borderTop: `1px solid ${border1}`,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill,minmax(200px,1fr))",
                          gap: 2,
                          marginTop: 10,
                        }}
                      >
                        {topics.map((topic) => {
                          const isDone = !!topicsDone[`${subject}::${topic}`];
                          return (
                            <div
                              key={topic}
                              onClick={() => toggleTopic(subject, topic)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 9,
                                padding: "7px 10px",
                                borderRadius: 4,
                                background: isDone ? surface3 : "transparent",
                                cursor: "pointer",
                              }}
                            >
                              <div
                                style={{
                                  width: 14,
                                  height: 14,
                                  flexShrink: 0,
                                  borderRadius: 3,
                                  border: `1.5px solid ${
                                    isDone ? accentBg : border2
                                  }`,
                                  background: isDone ? accentBg : "transparent",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {isDone && (
                                  <span
                                    style={{
                                      fontSize: 8,
                                      color: accentTx,
                                      fontWeight: 700,
                                    }}
                                  >
                                    ✓
                                  </span>
                                )}
                              </div>
                              <span
                                style={{
                                  fontFamily: sans,
                                  fontSize: 12,
                                  color: isDone ? txt3 : txt1,
                                  textDecoration: isDone
                                    ? "line-through"
                                    : "none",
                                }}
                              >
                                {topic}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <button
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
                        style={{ ...pill(false), marginTop: 10, fontSize: 10 }}
                      >
                        {topics.every((t) => topicsDone[`${subject}::${t}`])
                          ? "Uncheck all"
                          : "Check all"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TUTOR LOG */}
        {view === "tutor" && (
          <div style={{ maxWidth: 720 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span style={{ fontFamily: serif, fontSize: 22, color: txt1 }}>
                Tutor Log
              </span>
              <button
                onClick={() => setShowTutorForm((f) => !f)}
                style={{
                  ...pill(showTutorForm),
                  padding: "7px 16px",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {showTutorForm ? "Cancel" : "+ New Session"}
              </button>
            </div>
            {showTutorForm && (
              <div style={{ ...card(), padding: 20, marginBottom: 16 }}>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    color: txt3,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    marginBottom: 14,
                  }}
                >
                  New Session —{" "}
                  {new Date().toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  {["Science + Maths", "English"].map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        setTutorForm((f) => ({ ...f, subject: s }))
                      }
                      style={pill(tutorForm.subject === s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {[
                  {
                    key: "covered",
                    label: "What was covered",
                    ph: "e.g. Cell biology - diffusion and osmosis",
                  },
                  {
                    key: "mistakes",
                    label: "Got wrong / found hard",
                    ph: "e.g. Kept mixing up active transport",
                  },
                  {
                    key: "revise",
                    label: "Revise before next session",
                    ph: "e.g. Re-read osmosis, do 5 more PMT questions",
                  },
                ].map((f) => (
                  <div key={f.key} style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        fontFamily: mono,
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                        color: txt3,
                        marginBottom: 6,
                      }}
                    >
                      {f.label}
                    </div>
                    <textarea
                      value={tutorForm[f.key]}
                      onChange={(e) =>
                        setTutorForm((p) => ({ ...p, [f.key]: e.target.value }))
                      }
                      placeholder={f.ph}
                      rows={2}
                      style={{
                        width: "100%",
                        background: surface2,
                        border: `1px solid ${border1}`,
                        borderRadius: 4,
                        padding: "9px 11px",
                        fontSize: 12,
                        fontFamily: sans,
                        color: txt1,
                        resize: "vertical",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
                <button
                  onClick={saveTutorLog}
                  style={{
                    ...pill(true),
                    padding: "9px 22px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Save Session
                </button>
              </div>
            )}
            {tutorLogs.length === 0 && !showTutorForm && (
              <div
                style={{
                  ...card(),
                  padding: 48,
                  textAlign: "center",
                  color: txt3,
                  fontFamily: sans,
                  fontSize: 13,
                }}
              >
                No sessions logged yet.
              </div>
            )}
            {tutorLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  ...card(),
                  padding: 18,
                  marginBottom: 10,
                  borderLeft: `3px solid ${accentBg}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: sans,
                        fontSize: 14,
                        fontWeight: 600,
                        color: txt1,
                      }}
                    >
                      {log.subject}
                    </div>
                    <div
                      style={{
                        fontFamily: mono,
                        fontSize: 10,
                        color: txt3,
                        marginTop: 3,
                      }}
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
                      background: "transparent",
                      border: "none",
                      color: txt3,
                      cursor: "pointer",
                      fontSize: 16,
                    }}
                  >
                    ✕
                  </button>
                </div>
                {[
                  { l: "Covered", v: log.covered },
                  { l: "Got wrong", v: log.mistakes },
                  { l: "Revise", v: log.revise },
                ]
                  .filter((f) => f.v)
                  .map((f) => (
                    <div key={f.l} style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          fontFamily: mono,
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: "1.5px",
                          textTransform: "uppercase",
                          color: txt3,
                          marginBottom: 4,
                        }}
                      >
                        {f.l}
                      </div>
                      <div
                        style={{
                          fontFamily: sans,
                          fontSize: 12,
                          color: txt2,
                          lineHeight: "1.6",
                        }}
                      >
                        {f.v}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}

        {/* NOTES */}
        {view === "notes" &&
          (() => {
            const allNoteKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith("gcse_notes_")) allNoteKeys.push(k);
            }
            allNoteKeys.sort().reverse();
            return (
              <div style={{ maxWidth: 720 }}>
                <div
                  style={{
                    fontFamily: serif,
                    fontSize: 22,
                    color: txt1,
                    marginBottom: 4,
                  }}
                >
                  Notes
                </div>
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 12,
                    color: txt2,
                    marginBottom: 20,
                  }}
                >
                  Your daily study notes, most recent first.
                </div>
                {allNoteKeys.length === 0 && (
                  <div
                    style={{
                      ...card(),
                      padding: 40,
                      textAlign: "center",
                      color: txt3,
                      fontFamily: sans,
                      fontSize: 13,
                    }}
                  >
                    No notes yet. Add them from the Today tab.
                  </div>
                )}
                {allNoteKeys.map((k) => {
                  const dateStr = k.replace("gcse_notes_", "");
                  const val = ls.get(k, "");
                  if (!val) return null;
                  const [y, m, d] = dateStr.split("-").map(Number);
                  const dateLabel = new Date(y, m - 1, d).toLocaleDateString(
                    "en-GB",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  );
                  const isToday = dateStr === getTodayKey();
                  return (
                    <div
                      key={k}
                      style={{
                        ...card(),
                        padding: 20,
                        marginBottom: 10,
                        borderLeft: isToday
                          ? `3px solid ${accentBg}`
                          : `3px solid ${border1}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            fontFamily: sans,
                            fontSize: 13,
                            fontWeight: 600,
                            color: txt1,
                          }}
                        >
                          {dateLabel}
                        </div>
                        {isToday && (
                          <span
                            style={{
                              fontFamily: mono,
                              fontSize: 9,
                              color: accentBg,
                              letterSpacing: "1.5px",
                              textTransform: "uppercase",
                            }}
                          >
                            Today
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontFamily: sans,
                          fontSize: 13,
                          color: txt2,
                          lineHeight: "1.7",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {val}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

        {/* RESOURCES */}
        {view === "resources" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
              gap: 16,
            }}
          >
            {RESOURCES.map((r, i) => (
              <div key={i} style={{ ...card(), padding: 20 }}>
                <div style={sh}>{r.subject}</div>
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                  {r.items.map((item, j) => (
                    <li
                      key={j}
                      style={{
                        fontFamily: sans,
                        fontSize: 12,
                        lineHeight: "2.1",
                        color: txt2,
                      }}
                    >
                      — {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* MOTIVATION */}
        {view === "motivation" && (
          <div style={{ maxWidth: 720 }}>
            {MOTIVATION_TIPS.map((tip, i) => (
              <div
                key={i}
                onClick={() => toggleTip(i)}
                style={{
                  ...card(),
                  padding: 18,
                  marginBottom: 8,
                  cursor: "pointer",
                  borderLeft: checkedTips[i]
                    ? `3px solid ${accentBg}`
                    : `3px solid ${border1}`,
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ fontSize: 18, color: txt2, flexShrink: 0 }}>
                  {tip.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: sans,
                      fontSize: 14,
                      fontWeight: 600,
                      color: txt1,
                      marginBottom: 4,
                    }}
                  >
                    {tip.title}
                  </div>
                  <div
                    style={{
                      fontFamily: sans,
                      fontSize: 12,
                      color: txt2,
                      lineHeight: "1.7",
                    }}
                  >
                    {tip.body}
                  </div>
                </div>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                    marginTop: 2,
                    borderRadius: 3,
                    border: `1.5px solid ${
                      checkedTips[i] ? accentBg : border2
                    }`,
                    background: checkedTips[i] ? accentBg : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {checkedTips[i] && (
                    <span
                      style={{ fontSize: 9, color: accentTx, fontWeight: 700 }}
                    >
                      ✓
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div style={{ ...card(), padding: 20, marginTop: 8 }}>
              <div style={sh}>On the Burnout Cycle</div>
              <p
                style={{
                  fontFamily: sans,
                  color: txt2,
                  fontSize: 13,
                  lineHeight: "1.8",
                  margin: 0,
                }}
              >
                You mentioned studying 1-2 hours, getting stressed, then losing
                focus. That cycle happens because you're trying to study for too
                long without structure. With 45-minute blocks and breaks built
                in, there's nothing to escape from — the break is already
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

        {/* SPOTIFY */}
        {view === "spotify" &&
          (() => {
            const spGreen = "#1db954";
            const iconBtn = (active) => ({
              background: "none",
              border: "none",
              cursor: "pointer",
              color: active ? spGreen : txt3,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            });

            // SVG icons
            const IconShuffle = ({ active }) => (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={active ? spGreen : txt3}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
              </svg>
            );
            const IconPrev = () => (
              <svg width="20" height="20" viewBox="0 0 24 24" fill={txt2}>
                <polygon points="19 20 9 12 19 4 19 20" />
                <line
                  x1="5"
                  y1="19"
                  x2="5"
                  y2="5"
                  stroke={txt2}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            );
            const IconNext = () => (
              <svg width="20" height="20" viewBox="0 0 24 24" fill={txt2}>
                <polygon points="5 4 15 12 5 20 5 4" />
                <line
                  x1="19"
                  y1="5"
                  x2="19"
                  y2="19"
                  stroke={txt2}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            );
            const IconRepeat = ({ mode }) => (
              <div style={{ position: "relative", display: "inline-flex" }}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={mode > 0 ? spGreen : txt3}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                {mode === 2 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%,-50%)",
                      fontSize: 7,
                      fontWeight: 700,
                      color: spGreen,
                      lineHeight: 1,
                      fontFamily: "sans-serif",
                      pointerEvents: "none",
                    }}
                  >
                    1
                  </span>
                )}
              </div>
            );
            const IconVolume = () => (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={txt3}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            );

            return (
              <div style={{ maxWidth: 760, margin: "0 auto" }}>
                {!spToken ? (
                  <div style={{ ...card(), padding: 48, textAlign: "center" }}>
                    <div
                      style={{
                        fontFamily: serif,
                        fontSize: 26,
                        color: txt1,
                        marginBottom: 10,
                      }}
                    >
                      Spotify
                    </div>
                    <div
                      style={{
                        fontFamily: sans,
                        fontSize: 13,
                        color: txt2,
                        marginBottom: 28,
                        lineHeight: "1.6",
                      }}
                    >
                      Connect your Spotify Premium account to play music
                      directly in your study app.
                    </div>
                    <button
                      onClick={spDoLogin}
                      style={{
                        ...pill(true),
                        padding: "12px 32px",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Connect Spotify
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {/* NOW PLAYING BAR */}
                    <div
                      style={{
                        ...card(),
                        padding: "14px 20px",
                        background: D ? "#181818" : surface,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                        }}
                      >
                        {/* Left: art + track info — allow it to grow and wrap */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            flex: "0 0 auto",
                            maxWidth: 260,
                          }}
                        >
                          {spTrack?.album?.images?.[2]?.url ? (
                            <img
                              src={spTrack.album.images[2].url}
                              alt=""
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 4,
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 4,
                                background: surface3,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div>
                            <div
                              style={{
                                fontFamily: sans,
                                fontSize: 13,
                                fontWeight: 600,
                                color: txt1,
                                lineHeight: "1.3",
                              }}
                            >
                              {spTrack?.name || "Nothing playing"}
                            </div>
                            <div
                              style={{
                                fontFamily: sans,
                                fontSize: 11,
                                color: txt3,
                                marginTop: 3,
                              }}
                            >
                              {spTrack?.artists
                                ?.map((a) => a.name)
                                .join(", ") || ""}
                            </div>
                          </div>
                        </div>

                        {/* Centre: controls + progress */}
                        <div
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 20,
                            }}
                          >
                            <button
                              onClick={spToggleShuffle}
                              style={iconBtn(spShuffle)}
                            >
                              <IconShuffle active={spShuffle} />
                            </button>
                            <button onClick={spPrev} style={iconBtn(false)}>
                              <IconPrev />
                            </button>

                            {/* Play/Pause — proper circle with centered SVG icon */}
                            <button
                              onClick={spToggle}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: txt1,
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {spPlaying ? (
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill={D ? "#111" : "#fff"}
                                >
                                  <rect
                                    x="6"
                                    y="4"
                                    width="4"
                                    height="16"
                                    rx="1"
                                  />
                                  <rect
                                    x="14"
                                    y="4"
                                    width="4"
                                    height="16"
                                    rx="1"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill={D ? "#111" : "#fff"}
                                  style={{ marginLeft: 2 }}
                                >
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                              )}
                            </button>

                            <button onClick={spNext} style={iconBtn(false)}>
                              <IconNext />
                            </button>
                            <button
                              onClick={spCycleRepeat}
                              style={iconBtn(spRepeat > 0)}
                            >
                              <IconRepeat mode={spRepeat} />
                            </button>
                          </div>

                          {/* Progress */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              width: "100%",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: mono,
                                fontSize: 10,
                                color: txt3,
                                flexShrink: 0,
                                minWidth: 32,
                                textAlign: "right",
                              }}
                            >
                              {fmtTime(spProgress)}
                            </span>
                            <div
                              onClick={(e) => {
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                const pos = Math.floor(
                                  ((e.clientX - rect.left) / rect.width) *
                                    spDuration
                                );
                                setSpProgress(pos);
                                spPlayer?.seek(pos);
                              }}
                              style={{
                                flex: 1,
                                height: 4,
                                background: border1,
                                borderRadius: 2,
                                cursor: "pointer",
                                position: "relative",
                              }}
                            >
                              <div
                                style={{
                                  position: "absolute",
                                  left: 0,
                                  top: 0,
                                  height: 4,
                                  background: D ? spGreen : accentBg,
                                  borderRadius: 2,
                                  width: `${
                                    spDuration
                                      ? Math.min(
                                          (spProgress / spDuration) * 100,
                                          100
                                        )
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontFamily: mono,
                                fontSize: 10,
                                color: txt3,
                                flexShrink: 0,
                                minWidth: 32,
                              }}
                            >
                              {fmtTime(spDuration)}
                            </span>
                          </div>
                        </div>

                        {/* Right: volume + disconnect */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flex: "0 0 auto",
                          }}
                        >
                          <IconVolume />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={spVolume}
                            onChange={(e) =>
                              spSetVol(parseFloat(e.target.value))
                            }
                            style={{
                              width: 72,
                              accentColor: D ? spGreen : txt1,
                              cursor: "pointer",
                            }}
                          />
                          <button
                            onClick={spLogout}
                            title="Disconnect"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: txt3,
                              fontSize: 18,
                              marginLeft: 6,
                              lineHeight: 1,
                              padding: 0,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      {!spReady && (
                        <div
                          style={{
                            fontFamily: mono,
                            fontSize: 10,
                            color: txt3,
                            marginTop: 10,
                            textAlign: "center",
                          }}
                        >
                          Connecting player…
                        </div>
                      )}
                    </div>

                    {/* SEARCH + PLAYLISTS */}
                    <div style={{ ...card(), padding: 20 }}>
                      <div
                        style={{ display: "flex", gap: 4, marginBottom: 16 }}
                      >
                        <button
                          onClick={() => setSpSearchTab("tracks")}
                          style={{
                            ...pill(spSearchTab === "tracks"),
                            fontSize: 11,
                          }}
                        >
                          Search Tracks
                        </button>
                        <button
                          onClick={() => {
                            setSpSearchTab("playlists");
                            if (spPlaylists.length === 0) spLoadPlaylists();
                          }}
                          style={{
                            ...pill(spSearchTab === "playlists"),
                            fontSize: 11,
                          }}
                        >
                          My Playlists
                        </button>
                      </div>

                      {spSearchTab === "tracks" && (
                        <div>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              marginBottom: 12,
                            }}
                          >
                            <input
                              value={spSearch}
                              onChange={(e) => setSpSearch(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && spSearchTracks(spSearch)
                              }
                              placeholder="Search songs, artists, albums…"
                              style={{
                                flex: 1,
                                background: surface2,
                                border: `1px solid ${border1}`,
                                borderRadius: 20,
                                padding: "8px 16px",
                                fontSize: 13,
                                fontFamily: sans,
                                color: txt1,
                                outline: "none",
                              }}
                            />
                            <button
                              onClick={() => spSearchTracks(spSearch)}
                              style={{
                                ...pill(true),
                                padding: "8px 18px",
                                fontSize: 12,
                                fontWeight: 600,
                                borderRadius: 20,
                              }}
                            >
                              {spSearching ? "…" : "Search"}
                            </button>
                          </div>
                          {spResults.length > 0 &&
                            spResults.map((track, i) => (
                              <div
                                key={track.id}
                                onClick={() => spPlayTrack(track.uri)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                  padding: "8px 10px",
                                  borderRadius: 4,
                                  cursor: "pointer",
                                  background:
                                    spTrack?.id === track.id
                                      ? surface3
                                      : "transparent",
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: mono,
                                    fontSize: 11,
                                    color: txt3,
                                    width: 18,
                                    textAlign: "right",
                                    flexShrink: 0,
                                  }}
                                >
                                  {spTrack?.id === track.id && spPlaying ? (
                                    <svg
                                      width="11"
                                      height="11"
                                      viewBox="0 0 24 24"
                                      fill={spGreen}
                                    >
                                      <rect
                                        x="6"
                                        y="4"
                                        width="4"
                                        height="16"
                                        rx="1"
                                      />
                                      <rect
                                        x="14"
                                        y="4"
                                        width="4"
                                        height="16"
                                        rx="1"
                                      />
                                    </svg>
                                  ) : (
                                    i + 1
                                  )}
                                </span>
                                {track.album?.images?.[2]?.url && (
                                  <img
                                    src={track.album.images[2].url}
                                    alt=""
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 3,
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontFamily: sans,
                                      fontSize: 13,
                                      fontWeight:
                                        spTrack?.id === track.id ? 600 : 400,
                                      color:
                                        spTrack?.id === track.id
                                          ? D
                                            ? spGreen
                                            : accentBg
                                          : txt1,
                                    }}
                                  >
                                    {track.name}
                                  </div>
                                  <div
                                    style={{
                                      fontFamily: sans,
                                      fontSize: 11,
                                      color: txt3,
                                    }}
                                  >
                                    {track.artists
                                      ?.map((a) => a.name)
                                      .join(", ")}{" "}
                                    · {track.album?.name}
                                  </div>
                                </div>
                                <span
                                  style={{
                                    fontFamily: mono,
                                    fontSize: 11,
                                    color: txt3,
                                    flexShrink: 0,
                                  }}
                                >
                                  {fmtTime(track.duration_ms)}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}

                      {spSearchTab === "playlists" && (
                        <div>
                          {spPlaylists.length === 0 ? (
                            <div
                              style={{
                                textAlign: "center",
                                color: txt3,
                                fontFamily: sans,
                                fontSize: 13,
                                padding: "20px 0",
                              }}
                            >
                              Loading your playlists…
                            </div>
                          ) : (
                            <>
                              <div
                                style={{
                                  fontFamily: sans,
                                  fontSize: 11,
                                  color: txt3,
                                  marginBottom: 12,
                                }}
                              >
                                Click a playlist to play it. Track browsing
                                requires Spotify Extended API access.
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 2,
                                }}
                              >
                                {spPlaylists.map((pl, i) => (
                                  <div
                                    key={pl.id}
                                    onClick={() => spPlayPlaylist(pl.uri)}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 12,
                                      padding: "8px 10px",
                                      borderRadius: 4,
                                      cursor: "pointer",
                                      background: "transparent",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.background =
                                        surface2)
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.background =
                                        "transparent")
                                    }
                                  >
                                    {pl.images?.[0]?.url ? (
                                      <img
                                        src={pl.images[0].url}
                                        alt=""
                                        style={{
                                          width: 44,
                                          height: 44,
                                          borderRadius: 4,
                                          flexShrink: 0,
                                        }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: 44,
                                          height: 44,
                                          borderRadius: 4,
                                          background: surface3,
                                          flexShrink: 0,
                                        }}
                                      />
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div
                                        style={{
                                          fontFamily: sans,
                                          fontSize: 13,
                                          fontWeight: 500,
                                          color: txt1,
                                        }}
                                      >
                                        {pl.name}
                                      </div>
                                      <div
                                        style={{
                                          fontFamily: sans,
                                          fontSize: 11,
                                          color: txt3,
                                          marginTop: 2,
                                        }}
                                      >
                                        {pl.tracks?.total} tracks
                                      </div>
                                    </div>
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill={txt3}
                                    >
                                      <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
      </div>

      <div
        style={{
          borderTop: `1px solid ${border1}`,
          textAlign: "center",
          padding: "14px 20px",
          fontFamily: mono,
          fontSize: 10,
          color: txt3,
          background: surface,
        }}
      >
        GCSE 2026 · AQA & Edexcel · Always confirm exam dates with your centre
      </div>
    </div>
  );
}
