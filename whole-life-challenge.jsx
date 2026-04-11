import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

const CHALLENGE_START = "2026-04-11";
const CHALLENGE_DAYS = 42;
const HABITS = [
  { id: "exercise", label: "Exercise", icon: "🏃", desc: "10+ min activity", color: "#E8634A" },
  { id: "mobilize", label: "Mobilize", icon: "🧘", desc: "10 min stretching", color: "#E8A34A" },
  { id: "sleep", label: "Sleep", icon: "😴", desc: "Hit your sleep target", color: "#6B5CE7" },
  { id: "hydrate", label: "Hydrate", icon: "💧", desc: "Weight ÷ 3 in oz", color: "#4AAFE8" },
  { id: "wellbeing", label: "Well-Being", icon: "🌿", desc: "Weekly practice", color: "#4AE88A" },
  { id: "reflect", label: "Reflect", icon: "📝", desc: "Daily journal", color: "#E84A8A" },
];

const getDayIndex = (dateStr) => {
  const start = new Date(CHALLENGE_START + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  return Math.floor((d - start) / 86400000);
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const getAllDates = () => {
  const dates = [];
  const start = new Date(CHALLENGE_START + "T00:00:00");
  for (let i = 0; i < CHALLENGE_DAYS; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return dates;
};

const emptyDay = () => ({
  nutrition: 5,
  exercise: false,
  mobilize: false,
  sleep: false,
  hydrate: false,
  wellbeing: false,
  reflect: false,
  reflection: "",
});

const scoreDay = (day) => {
  if (!day) return 0;
  let s = Math.max(0, day.nutrition || 0);
  HABITS.forEach((h) => { if (day[h.id]) s += 5; });
  return s;
};

export default function WLCTracker() {
  const [data, setData] = useState({});
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [view, setView] = useState("today");
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState(null);
  const [weightInput, setWeightInput] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("wlc-data");
        if (res?.value) setData(JSON.parse(res.value));
      } catch {}
      try {
        const w = await window.storage.get("wlc-weight");
        if (w?.value) setWeight(Number(w.value));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const save = useCallback(async (newData) => {
    setData(newData);
    try { await window.storage.set("wlc-data", JSON.stringify(newData)); } catch {}
  }, []);

  const today = getToday();
  const dayIndex = getDayIndex(today);
  const currentDay = data[selectedDate] || emptyDay();
  const allDates = getAllDates();

  const toggleHabit = (habitId) => {
    const updated = { ...data, [selectedDate]: { ...currentDay, [habitId]: !currentDay[habitId] } };
    save(updated);
  };

  const setNutrition = (val) => {
    const updated = { ...data, [selectedDate]: { ...currentDay, nutrition: val } };
    save(updated);
  };

  const setReflection = (text) => {
    const updated = { ...data, [selectedDate]: { ...currentDay, reflection: text } };
    save(updated);
  };

  const saveWeight = async () => {
    const w = parseFloat(weightInput);
    if (w > 0) {
      setWeight(w);
      try { await window.storage.set("wlc-weight", String(w)); } catch {}
    }
  };

  // Chart data
  const chartData = allDates.slice(0, Math.min(dayIndex + 1, CHALLENGE_DAYS)).map((d, i) => ({
    day: i + 1,
    score: scoreDay(data[d]),
    date: d,
  }));

  const totalScore = Object.entries(data).reduce((sum, [k, v]) => {
    if (getDayIndex(k) >= 0 && getDayIndex(k) < CHALLENGE_DAYS) return sum + scoreDay(v);
    return sum;
  }, 0);

  const maxPossible = Math.max(1, (Math.min(dayIndex + 1, CHALLENGE_DAYS))) * 35;
  const pct = Math.round((totalScore / maxPossible) * 100);

  const streak = (() => {
    let s = 0;
    for (let i = dayIndex; i >= 0; i--) {
      const d = allDates[i];
      if (d && scoreDay(data[d]) === 35) s++;
      else break;
    }
    return s;
  })();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D0D0F", color: "#f0ebe3" }}>
        <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 20 }}>Loading...</p>
      </div>
    );
  }

  const isSelected = selectedDate === today ? "today" : formatDate(selectedDate);
  const selDayIndex = getDayIndex(selectedDate);
  const canEdit = selDayIndex >= 0 && selDayIndex <= dayIndex && selDayIndex < CHALLENGE_DAYS;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2e; border-radius: 3px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .habit-card { transition: all 0.2s ease; }
        .habit-card:hover { transform: translateY(-2px); }
        .habit-card:active { transform: scale(0.97); }
        .nav-btn { transition: all 0.15s ease; }
        .nav-btn:hover { background: #1e1e22 !important; }
        textarea:focus { outline: none; border-color: #E8634A !important; }
      `}</style>
      <div style={{
        minHeight: "100vh",
        background: "#0D0D0F",
        color: "#f0ebe3",
        fontFamily: "'DM Sans', sans-serif",
        padding: "20px 16px 40px",
        maxWidth: 480,
        margin: "0 auto",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28, animation: "fadeUp 0.5s ease" }}>
          <p style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#E8634A", fontWeight: 600, marginBottom: 4 }}>
            Whole Life Challenge
          </p>
          <h1 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 32, fontWeight: 300, letterSpacing: -0.5, lineHeight: 1.1 }}>
            Day {Math.min(Math.max(dayIndex + 1, 1), 42)} <span style={{ color: "#555" }}>/ 42</span>
          </h1>
          <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Apr 11 — May 22, 2026</p>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "#141416", borderRadius: 12, padding: 4 }}>
          {[["today", "Check In"], ["progress", "Progress"], ["journal", "Journal"]].map(([v, l]) => (
            <button key={v} className="nav-btn" onClick={() => { setView(v); if (v === "today") setSelectedDate(today); }}
              style={{
                flex: 1, padding: "10px 0", border: "none", borderRadius: 10, cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                background: view === v ? "#1e1e22" : "transparent",
                color: view === v ? "#f0ebe3" : "#555",
              }}>
              {l}
            </button>
          ))}
        </div>

        {/* Score Summary */}
        {view === "today" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            {/* Stats Row */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[
                { label: "Today", value: scoreDay(currentDay), max: "/35", accent: "#E8634A" },
                { label: "Total", value: totalScore, max: `/${maxPossible}`, accent: "#4AAFE8" },
                { label: "Rate", value: `${pct}%`, max: "", accent: "#4AE88A" },
                { label: "Streak", value: streak, max: "🔥", accent: "#E8A34A" },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1, background: "#141416", borderRadius: 12, padding: "14px 8px", textAlign: "center",
                  border: "1px solid #1e1e22",
                }}>
                  <div style={{ fontSize: 22, fontFamily: "'Crimson Pro', serif", fontWeight: 700, color: s.accent }}>
                    {s.value}<span style={{ fontSize: 11, color: "#444", fontWeight: 400 }}>{s.max}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Date selector */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <button onClick={() => {
                const d = new Date(selectedDate + "T00:00:00");
                d.setDate(d.getDate() - 1);
                const prev = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                if (getDayIndex(prev) >= 0) setSelectedDate(prev);
              }} style={{ background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer", padding: "4px 12px" }}>←</button>
              <span style={{ fontSize: 14, fontWeight: 600, color: selectedDate === today ? "#E8634A" : "#999" }}>
                {selectedDate === today ? "Today" : formatDate(selectedDate)}
              </span>
              <button onClick={() => {
                const d = new Date(selectedDate + "T00:00:00");
                d.setDate(d.getDate() + 1);
                const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                if (getDayIndex(next) <= dayIndex && getDayIndex(next) < CHALLENGE_DAYS) setSelectedDate(next);
              }} style={{ background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer", padding: "4px 12px" }}>→</button>
            </div>

            {/* Nutrition */}
            <div style={{
              background: "#141416", borderRadius: 14, padding: 16, marginBottom: 10,
              border: `1px solid ${currentDay.nutrition === 5 ? "#2a4a2a" : currentDay.nutrition >= 3 ? "#4a3a1a" : "#3a1a1a"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>🥗</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Nutrition</div>
                    <div style={{ fontSize: 11, color: "#666" }}>Deduct per non-compliant food</div>
                  </div>
                </div>
                <div style={{
                  fontSize: 24, fontFamily: "'Crimson Pro', serif", fontWeight: 700,
                  color: currentDay.nutrition === 5 ? "#4AE88A" : currentDay.nutrition >= 3 ? "#E8A34A" : "#E8634A",
                }}>
                  {currentDay.nutrition}
                </div>
              </div>
              {canEdit && (
                <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                  {[5, 4, 3, 2, 1, 0].map((v) => (
                    <button key={v} onClick={() => setNutrition(v)}
                      style={{
                        width: 42, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14,
                        background: currentDay.nutrition === v ? (v >= 4 ? "#2a4a2a" : v >= 2 ? "#4a3a1a" : "#3a1a1a") : "#1e1e22",
                        color: currentDay.nutrition === v ? (v >= 4 ? "#4AE88A" : v >= 2 ? "#E8A34A" : "#E8634A") : "#555",
                      }}>
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Habits */}
            {HABITS.map((h, i) => {
              const done = currentDay[h.id];
              return (
                <div key={h.id} className="habit-card"
                  onClick={() => canEdit && toggleHabit(h.id)}
                  style={{
                    background: "#141416", borderRadius: 14, padding: "14px 16px", marginBottom: 8,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    border: `1px solid ${done ? h.color + "33" : "#1e1e22"}`,
                    cursor: canEdit ? "pointer" : "default",
                    animation: `fadeUp ${0.3 + i * 0.05}s ease`,
                    opacity: canEdit ? 1 : 0.5,
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{h.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: done ? h.color : "#888" }}>{h.label}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>{h.desc}</div>
                    </div>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: done ? h.color : "#1e1e22",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, transition: "all 0.2s ease",
                    animation: done ? "pulse 0.3s ease" : "none",
                  }}>
                    {done ? "✓" : ""}
                  </div>
                </div>
              );
            })}

            {/* Quick Reflection */}
            <div style={{ marginTop: 12 }}>
              <textarea
                placeholder="How did today go? (This counts as your Reflect habit)"
                value={currentDay.reflection || ""}
                onChange={(e) => setReflection(e.target.value)}
                disabled={!canEdit}
                style={{
                  width: "100%", minHeight: 80, background: "#141416", border: "1px solid #1e1e22",
                  borderRadius: 14, padding: 14, color: "#f0ebe3", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Hydration helper */}
            <div style={{ marginTop: 16, background: "#141416", borderRadius: 14, padding: 14, border: "1px solid #1e1e22" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#4AAFE8", marginBottom: 8 }}>💧 Hydration Target</div>
              {weight ? (
                <div style={{ fontSize: 13, color: "#999" }}>
                  At {weight} lbs → drink <strong style={{ color: "#4AAFE8" }}>{Math.round(weight / 3)} oz</strong> of water today
                  <button onClick={() => setWeight(null)} style={{ background: "none", border: "none", color: "#444", fontSize: 11, marginLeft: 8, cursor: "pointer" }}>edit</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="number" placeholder="Weight (lbs)" value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    style={{ flex: 1, background: "#1e1e22", border: "1px solid #2a2a2e", borderRadius: 8, padding: "8px 12px", color: "#f0ebe3", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}
                  />
                  <button onClick={saveWeight} style={{
                    background: "#4AAFE8", border: "none", borderRadius: 8, padding: "8px 16px",
                    color: "#0D0D0F", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  }}>Set</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress View */}
        {view === "progress" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 24, fontWeight: 300, marginBottom: 20, textAlign: "center" }}>
              Your Journey
            </h2>

            {/* Score over time */}
            <div style={{ background: "#141416", borderRadius: 14, padding: "16px 8px 8px", marginBottom: 16, border: "1px solid #1e1e22" }}>
              <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, paddingLeft: 8 }}>Daily Score</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E8634A" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#E8634A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: "#444", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 35]} tick={{ fill: "#444", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ background: "#1e1e22", border: "1px solid #2a2a2e", borderRadius: 8, color: "#f0ebe3", fontSize: 12 }}
                    formatter={(v) => [`${v}/35`, "Score"]}
                    labelFormatter={(l) => `Day ${l}`}
                  />
                  <Area type="monotone" dataKey="score" stroke="#E8634A" strokeWidth={2} fill="url(#scoreGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Habit Heatmap */}
            <div style={{ background: "#141416", borderRadius: 14, padding: 16, marginBottom: 16, border: "1px solid #1e1e22" }}>
              <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Habit Heatmap</p>
              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 500 }}>
                  {/* Nutrition row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, color: "#666", width: 60, flexShrink: 0 }}>Nutrition</span>
                    <div style={{ display: "flex", gap: 2, flexWrap: "nowrap" }}>
                      {allDates.slice(0, Math.min(dayIndex + 1, CHALLENGE_DAYS)).map((d, i) => {
                        const v = data[d]?.nutrition ?? -1;
                        const opacity = v < 0 ? 0.1 : v / 5;
                        return <div key={i} title={`Day ${i + 1}: ${v < 0 ? "—" : v}`} style={{ width: 10, height: 10, borderRadius: 2, background: `rgba(232, 99, 74, ${Math.max(0.1, opacity)})` }} />;
                      })}
                    </div>
                  </div>
                  {HABITS.map((h) => (
                    <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 10, color: "#666", width: 60, flexShrink: 0 }}>{h.label}</span>
                      <div style={{ display: "flex", gap: 2, flexWrap: "nowrap" }}>
                        {allDates.slice(0, Math.min(dayIndex + 1, CHALLENGE_DAYS)).map((d, i) => {
                          const done = data[d]?.[h.id];
                          return <div key={i} title={`Day ${i + 1}`} style={{ width: 10, height: 10, borderRadius: 2, background: done ? h.color : "#1e1e22" }} />;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly breakdown */}
            <div style={{ background: "#141416", borderRadius: 14, padding: 16, border: "1px solid #1e1e22" }}>
              <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Weekly Totals</p>
              {[0, 1, 2, 3, 4, 5].map((week) => {
                const weekDates = allDates.slice(week * 7, (week + 1) * 7);
                const weekScore = weekDates.reduce((s, d) => s + scoreDay(data[d]), 0);
                const weekMax = weekDates.length * 35;
                const weekPct = weekMax > 0 ? Math.round((weekScore / weekMax) * 100) : 0;
                const isFuture = getDayIndex(weekDates[0]) > dayIndex;
                if (isFuture) return null;
                return (
                  <div key={week} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: "#888" }}>Week {week + 1}</span>
                      <span style={{ color: "#f0ebe3", fontWeight: 600 }}>{weekScore}/{weekMax} <span style={{ color: "#555" }}>({weekPct}%)</span></span>
                    </div>
                    <div style={{ height: 6, background: "#1e1e22", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${weekPct}%`, background: `linear-gradient(90deg, #E8634A, #E8A34A)`, borderRadius: 3, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Journal View */}
        {view === "journal" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 24, fontWeight: 300, marginBottom: 20, textAlign: "center" }}>
              Reflections
            </h2>
            {allDates.slice(0, Math.min(dayIndex + 1, CHALLENGE_DAYS)).reverse().map((d) => {
              const entry = data[d];
              if (!entry?.reflection) return null;
              return (
                <div key={d} style={{
                  background: "#141416", borderRadius: 14, padding: 16, marginBottom: 10,
                  border: "1px solid #1e1e22",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#E84A8A" }}>Day {getDayIndex(d) + 1}</span>
                    <span style={{ fontSize: 11, color: "#555" }}>{formatDate(d)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#ccc", lineHeight: 1.6 }}>{entry.reflection}</p>
                  <div style={{ marginTop: 8, fontSize: 11, color: "#444" }}>Score: {scoreDay(entry)}/35</div>
                </div>
              );
            })}
            {!allDates.slice(0, Math.min(dayIndex + 1, CHALLENGE_DAYS)).some((d) => data[d]?.reflection) && (
              <p style={{ textAlign: "center", color: "#444", fontSize: 13, marginTop: 40 }}>
                No reflections yet. Write your first one in today's check-in!
              </p>
            )}
          </div>
        )}

        {/* Reset */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button onClick={async () => {
            if (confirm("Reset all data? This cannot be undone.")) {
              setData({});
              try { await window.storage.delete("wlc-data"); } catch {}
            }
          }} style={{ background: "none", border: "none", color: "#333", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Reset All Data
          </button>
        </div>
      </div>
    </>
  );
}
