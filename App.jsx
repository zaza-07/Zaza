import { useState, useMemo } from "react";
import * as XLSX from "xlsx";

const initialClients = [
  {
    id: 1,
    name: "ნინო კვარაცხელია",
    phone: "+995 599 123 456",
    email: "nino@example.com",
    notes: "VIP კლიენტი",
    payments: [
      { id: 1, amount: 500, date: "2026-05-01", status: "paid", desc: "კონსულტაცია" },
      { id: 2, amount: 300, date: "2026-05-10", status: "pending", desc: "სერვისი" },
    ],
    meetings: [
      { id: 1, date: "2026-05-18", time: "10:00", desc: "კონსულტაცია", reminder: true },
    ],
  },
  {
    id: 2,
    name: "გიორგი მამულაშვილი",
    phone: "+995 577 654 321",
    email: "giorgi@example.com",
    notes: "",
    payments: [
      { id: 1, amount: 800, date: "2026-04-20", status: "paid", desc: "პროექტი" },
    ],
    meetings: [],
  },
];

const TABS = ["კლიენტები", "გადახდები", "შეხვედრები"];

const S = {
  btn: (bg, color, extra = {}) => ({
    background: bg, color, border: "none", borderRadius: 8,
    padding: "8px 16px", cursor: "pointer", fontFamily: "inherit",
    fontSize: 13, ...extra
  }),
  input: {
    width: "100%", background: "#141414", border: "1px solid #2a2a2a",
    color: "#f0ece4", borderRadius: 8, padding: "10px 12px",
    fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box"
  },
  label: { fontSize: 11, color: "#666", marginBottom: 4, letterSpacing: 1 },
  card: { background: "#1a1a1a", border: "1px solid #222", borderRadius: 10, padding: "14px 18px" },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  modalBox: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 },
};

function SMSModal({ client, onClose }) {
  const [msg, setMsg] = useState(`გამარჯობა ${client.name.split(" ")[0]}, გახსენებთ შეხვედრის შესახებ.`);
  const smsLink = `sms:${client.phone}?body=${encodeURIComponent(msg)}`;
  return (
    <div style={S.modal}>
      <div style={S.modalBox}>
        <div style={{ fontSize: 18, fontWeight: "bold", color: "#c8a96e", marginBottom: 4, fontStyle: "italic" }}>📱 SMS შეხსენება</div>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 20 }}>{client.name} · {client.phone}</div>
        <div style={{ marginBottom: 16 }}>
          <div style={S.label}>შეტყობინება</div>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4} style={{ ...S.input, resize: "vertical" }} />
          <div style={{ fontSize: 11, color: "#555", marginTop: 4, textAlign: "right" }}>{msg.length} სიმბოლო</div>
        </div>
        <div style={{ background: "#141414", borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 12, color: "#888" }}>
          ℹ️ SMS გაიხსნება თქვენს ტელეფონზე გაგზავნისთვის.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ ...S.btn("#2a2a2a", "#888"), flex: 1 }}>გაუქმება</button>
          <a href={smsLink} onClick={onClose} style={{ flex: 1, textDecoration: "none" }}>
            <button style={{ ...S.btn("#c8a96e", "#0f0f0f", { fontWeight: "bold", width: "100%" }) }}>📤 SMS გაგზავნა</button>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function CRMApp() {
  const [clients, setClients] = useState(initialClients);
  const [activeTab, setActiveTab] = useState("კლიენტები");
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const [showClientForm, setShowClientForm] = useState(false);
  const [editClientId, setEditClientId] = useState(null);
  const [clientForm, setClientForm] = useState({ name: "", phone: "", email: "", notes: "" });

  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", date: "", status: "pending", desc: "" });

  const [showMeetForm, setShowMeetForm] = useState(false);
  const [meetForm, setMeetForm] = useState({ date: "", time: "", desc: "", reminder: true });
  const [meetClientId, setMeetClientId] = useState(null);

  const [showSMS, setShowSMS] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [meetFilter, setMeetFilter] = useState("upcoming");

  const selected = clients.find(c => c.id === selectedId);

  const filteredClients = useMemo(() =>
    clients.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    ), [clients, search]);

  const allPayments = useMemo(() =>
    clients.flatMap(c => c.payments.map(p => ({ ...p, clientName: c.name, clientId: c.id })))
      .sort((a, b) => new Date(b.date) - new Date(a.date)), [clients]);

  const allMeetings = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return clients
      .flatMap(c => (c.meetings || []).map(m => ({ ...m, clientName: c.name, clientId: c.id, phone: c.phone })))
      .sort((a, b) => (`${a.date}${a.time}` > `${b.date}${b.time}` ? 1 : -1))
      .filter(m => meetFilter === "all" ? true : meetFilter === "upcoming" ? m.date >= today : m.date < today);
  }, [clients, meetFilter]);

  const totalPaid = allPayments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = allPayments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const upcomingCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return clients.flatMap(c => (c.meetings || []).filter(m => m.date >= today)).length;
  }, [clients]);

  // CLIENT CRUD
  function openAddClient() { setEditClientId(null); setClientForm({ name: "", phone: "", email: "", notes: "" }); setShowClientForm(true); }
  function openEditClient(c) { setEditClientId(c.id); setClientForm({ name: c.name, phone: c.phone, email: c.email, notes: c.notes }); setShowClientForm(true); }
  function saveClient() {
    if (!clientForm.name.trim()) return;
    if (editClientId) {
      setClients(cs => cs.map(c => c.id === editClientId ? { ...c, ...clientForm } : c));
    } else {
      setClients(cs => [...cs, { id: Date.now(), ...clientForm, payments: [], meetings: [] }]);
    }
    setShowClientForm(false);
  }
  function deleteClient(id) { setClients(cs => cs.filter(c => c.id !== id)); if (selectedId === id) setSelectedId(null); }

  // PAYMENT CRUD
  function openAddPayment(clientId) {
    setSelectedId(clientId);
    setPayForm({ amount: "", date: new Date().toISOString().slice(0, 10), status: "pending", desc: "" });
    setShowPayForm(true);
  }
  function savePayment() {
    if (!payForm.amount || !selectedId) return;
    setClients(cs => cs.map(c => c.id === selectedId
      ? { ...c, payments: [...c.payments, { id: Date.now(), ...payForm, amount: Number(payForm.amount) }] } : c));
    setShowPayForm(false);
  }
  function togglePayStatus(clientId, payId) {
    setClients(cs => cs.map(c => c.id === clientId
      ? { ...c, payments: c.payments.map(p => p.id === payId ? { ...p, status: p.status === "paid" ? "pending" : "paid" } : p) } : c));
  }

  // MEETING CRUD
  function openAddMeeting(clientId) {
    setMeetClientId(clientId);
    setMeetForm({ date: new Date().toISOString().slice(0, 10), time: "10:00", desc: "", reminder: true });
    setShowMeetForm(true);
  }
  function saveMeeting() {
    if (!meetForm.date || !meetClientId) return;
    setClients(cs => cs.map(c => c.id === meetClientId
      ? { ...c, meetings: [...(c.meetings || []), { id: Date.now(), ...meetForm }] } : c));
    setShowMeetForm(false);
  }
  function deleteMeeting(clientId, meetId) {
    setClients(cs => cs.map(c => c.id === clientId ? { ...c, meetings: c.meetings.filter(m => m.id !== meetId) } : c));
  }

  // EXCEL EXPORT
  function exportExcel() {
    const wb = XLSX.utils.book_new();
    const clientRows = clients.map(c => ({
      "სახელი": c.name, "ტელეფონი": c.phone, "მეილი": c.email,
      "გადახდილი (₾)": c.payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0),
      "მოლოდინში (₾)": c.payments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0),
      "შეხვედრები": (c.meetings || []).length, "შენიშვნები": c.notes,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientRows), "კლიენტები");
    const payRows = allPayments.map(p => ({
      "კლიენტი": p.clientName, "თანხა (₾)": p.amount,
      "სტატუსი": p.status === "paid" ? "გადახდილი" : "მოლოდინი",
      "აღწერა": p.desc, "თარიღი": p.date,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payRows), "გადახდები");
    const meetRows = allMeetings.map(m => ({
      "კლიენტი": m.clientName, "თარიღი": m.date, "დრო": m.time,
      "აღწერა": m.desc, "შეხსენება": m.reminder ? "კი" : "არა",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(meetRows), "შეხვედრები");
    XLSX.writeFile(wb, "CRM_ექსპორტი.xlsx");
  }

  const clientPaid = c => c.payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const clientPending = c => c.payments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const filteredPayments = filterStatus === "all" ? allPayments : allPayments.filter(p => p.status === filterStatus);

  return (
    <div style={{ fontFamily: "'Georgia', serif", minHeight: "100vh", background: "#0f0f0f", color: "#f0ece4" }}>

      {/* Header */}
      <div style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", padding: "0 20px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #c8a96e, #8b6914)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✦</div>
            <span style={{ fontSize: 17, letterSpacing: 2, fontStyle: "italic", color: "#c8a96e" }}>CRM</span>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                background: activeTab === t ? "#c8a96e" : "transparent",
                color: activeTab === t ? "#0f0f0f" : "#888",
                border: "none", borderRadius: 6, padding: "5px 14px",
                cursor: "pointer", fontSize: 12, fontFamily: "inherit", letterSpacing: 1,
              }}>{t}</button>
            ))}
            <button onClick={exportExcel} style={{ ...S.btn("#1e2e1a", "#4caf84", { fontSize: 12, padding: "5px 14px", border: "1px solid #2a4a2a" }) }}>
              ↓ Excel
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: "#141414", borderBottom: "1px solid #1e1e1e" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 20px", display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "კლიენტები", value: clients.length, icon: "◈", color: "#c8a96e" },
            { label: "გადახდილი", value: `₾${totalPaid.toLocaleString()}`, icon: "◉", color: "#4caf84" },
            { label: "მოლოდინში", value: `₾${totalPending.toLocaleString()}`, icon: "◎", color: "#e8a44a" },
            { label: "შეხვედრები", value: upcomingCount, icon: "◷", color: "#6ab4e8" },
          ].map(s => (
            <div key={s.label} style={{ background: "#1a1a1a", borderRadius: 10, padding: "10px 18px", flex: "1 1 100px", border: "1px solid #222" }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 3 }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: 20, fontWeight: "bold", color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>

        {/* ── CLIENTS TAB ── */}
        {activeTab === "კლიენტები" && (
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 260px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input placeholder="🔍 ძებნა..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ ...S.input, flex: 1, padding: "8px 12px" }} />
                <button onClick={openAddClient} style={{ ...S.btn("#c8a96e", "#0f0f0f", { fontWeight: "bold", fontSize: 20, lineHeight: 1, padding: "6px 14px" }) }}>+</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredClients.map(c => (
                  <div key={c.id} onClick={() => setSelectedId(c.id === selectedId ? null : c.id)} style={{
                    background: selectedId === c.id ? "#1e1a12" : "#1a1a1a",
                    border: `1px solid ${selectedId === c.id ? "#c8a96e" : "#222"}`,
                    borderRadius: 10, padding: "12px 16px", cursor: "pointer",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 2 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "#666" }}>{c.phone}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, color: "#4caf84" }}>₾{clientPaid(c).toLocaleString()}</div>
                        {clientPending(c) > 0 && <div style={{ fontSize: 11, color: "#e8a44a" }}>₾{clientPending(c).toLocaleString()} →</div>}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredClients.length === 0 && <div style={{ color: "#444", textAlign: "center", padding: 32, fontSize: 13 }}>კლიენტი ვერ მოიძებნა</div>}
              </div>
            </div>

            {selected && (
              <div style={{ flex: "1 1 300px", background: "#1a1a1a", borderRadius: 14, border: "1px solid #2a2a2a", padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: "bold", color: "#c8a96e", marginBottom: 3 }}>{selected.name}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{selected.email}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{selected.phone}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button onClick={() => setShowSMS(selected)} style={{ ...S.btn("#1a2040", "#6ab4e8", { fontSize: 11, padding: "5px 10px", border: "1px solid #2a3a60" }) }}>📱 SMS</button>
                    <button onClick={() => openEditClient(selected)} style={{ ...S.btn("#2a2a2a", "#c8a96e", { fontSize: 11, padding: "5px 10px" }) }}>✏️</button>
                    <button onClick={() => deleteClient(selected.id)} style={{ ...S.btn("#2a1a1a", "#e85a4a", { fontSize: 11, padding: "5px 10px" }) }}>🗑</button>
                  </div>
                </div>

                {selected.notes && (
                  <div style={{ background: "#141414", borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12, color: "#aaa", borderLeft: "3px solid #c8a96e" }}>
                    📝 {selected.notes}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, letterSpacing: 1, color: "#666" }}>◈ გადახდები</div>
                  <button onClick={() => openAddPayment(selected.id)} style={{ ...S.btn("#c8a96e", "#0f0f0f", { fontWeight: "bold", fontSize: 11, padding: "3px 10px" }) }}>+ დამატება</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                  {selected.payments.length === 0 && <div style={{ color: "#444", fontSize: 12, textAlign: "center", padding: 12 }}>გადახდები არ არის</div>}
                  {selected.payments.map(p => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#141414", borderRadius: 8, padding: "8px 12px" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: "bold" }}>₾{p.amount.toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: "#666" }}>{p.desc} · {p.date}</div>
                      </div>
                      <button onClick={() => togglePayStatus(selected.id, p.id)} style={{
                        background: p.status === "paid" ? "#1a2e1e" : "#2e1e0a",
                        color: p.status === "paid" ? "#4caf84" : "#e8a44a",
                        border: `1px solid ${p.status === "paid" ? "#4caf84" : "#e8a44a"}`,
                        borderRadius: 20, padding: "3px 10px", cursor: "pointer", fontSize: 11, fontFamily: "inherit"
                      }}>{p.status === "paid" ? "✓ გადახდილი" : "⏳ მოლოდინი"}</button>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, letterSpacing: 1, color: "#666" }}>◷ შეხვედრები</div>
                  <button onClick={() => openAddMeeting(selected.id)} style={{ ...S.btn("#1a2040", "#6ab4e8", { fontSize: 11, padding: "3px 10px", border: "1px solid #2a3a60" }) }}>+ დამატება</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(selected.meetings || []).length === 0 && <div style={{ color: "#444", fontSize: 12, textAlign: "center", padding: 12 }}>შეხვედრები არ არის</div>}
                  {(selected.meetings || []).sort((a, b) => a.date > b.date ? 1 : -1).map(m => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#141420", borderRadius: 8, padding: "8px 12px", border: "1px solid #1e1e30" }}>
                      <div>
                        <div style={{ fontSize: 13, color: "#6ab4e8", fontWeight: "bold" }}>{m.date} {m.time && `· ${m.time}`}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>{m.desc} {m.reminder && "🔔"}</div>
                      </div>
                      <button onClick={() => deleteMeeting(selected.id, m.id)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PAYMENTS TAB ── */}
        {activeTab === "გადახდები" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {[["all", "ყველა"], ["paid", "გადახდილი"], ["pending", "მოლოდინში"]].map(([v, l]) => (
                <button key={v} onClick={() => setFilterStatus(v)} style={{
                  background: filterStatus === v ? "#c8a96e" : "#1a1a1a",
                  color: filterStatus === v ? "#0f0f0f" : "#888",
                  border: "1px solid #2a2a2a", borderRadius: 20, padding: "5px 14px",
                  cursor: "pointer", fontSize: 12, fontFamily: "inherit"
                }}>{l}</button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredPayments.map(p => (
                <div key={`${p.clientId}-${p.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...S.card }}>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: 15 }}>₾{p.amount.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{p.clientName} · {p.desc}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      display: "inline-block", marginBottom: 4,
                      background: p.status === "paid" ? "#1a2e1e" : "#2e1e0a",
                      color: p.status === "paid" ? "#4caf84" : "#e8a44a",
                      border: `1px solid ${p.status === "paid" ? "#4caf84" : "#e8a44a"}`,
                      borderRadius: 20, padding: "3px 10px", fontSize: 11
                    }}>{p.status === "paid" ? "✓ გადახდილი" : "⏳ მოლოდინი"}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{p.date}</div>
                  </div>
                </div>
              ))}
              {filteredPayments.length === 0 && <div style={{ color: "#444", textAlign: "center", padding: 40, fontSize: 13 }}>გადახდები არ არის</div>}
            </div>
          </div>
        )}

        {/* ── MEETINGS TAB ── */}
        {activeTab === "შეხვედრები" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {[["upcoming", "მომავალი"], ["past", "გასული"], ["all", "ყველა"]].map(([v, l]) => (
                <button key={v} onClick={() => setMeetFilter(v)} style={{
                  background: meetFilter === v ? "#6ab4e8" : "#1a1a1a",
                  color: meetFilter === v ? "#0f0f0f" : "#888",
                  border: "1px solid #2a2a2a", borderRadius: 20, padding: "5px 14px",
                  cursor: "pointer", fontSize: 12, fontFamily: "inherit"
                }}>{l}</button>
              ))}
            </div>
            {allMeetings.length === 0 && <div style={{ color: "#444", textAlign: "center", padding: 40, fontSize: 13 }}>შეხვედრები არ არის</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {allMeetings.map(m => {
                const client = clients.find(c => c.id === m.clientId);
                return (
                  <div key={`${m.clientId}-${m.id}`} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: "3px solid #6ab4e8" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#6ab4e8", fontWeight: "bold", marginBottom: 3 }}>
                        📅 {m.date} {m.time && `· ${m.time}`} {m.reminder && "🔔"}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: "bold" }}>{m.clientName}</div>
                      {m.desc && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{m.desc}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {client && (
                        <button onClick={() => setShowSMS(client)} style={{ ...S.btn("#1a2040", "#6ab4e8", { fontSize: 11, padding: "5px 10px", border: "1px solid #2a3a60" }) }}>📱 SMS</button>
                      )}
                      <button onClick={() => deleteMeeting(m.clientId, m.id)} style={{ ...S.btn("#2a1a1a", "#e85a4a", { fontSize: 11, padding: "5px 10px" }) }}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── CLIENT FORM MODAL ── */}
      {showClientForm && (
        <div style={S.modal}>
          <div style={S.modalBox}>
            <div style={{ fontSize: 17, fontWeight: "bold", color: "#c8a96e", marginBottom: 20, fontStyle: "italic" }}>
              {editClientId ? "კლიენტის რედაქტირება" : "ახალი კლიენტი"}
            </div>
            {[["სახელი", "name", "text"], ["ტელეფონი", "phone", "tel"], ["მეილი", "email", "email"]].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={S.label}>{label}</div>
                <input type={type} value={clientForm[key]} onChange={e => setClientForm(f => ({ ...f, [key]: e.target.value }))} style={S.input} />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <div style={S.label}>შენიშვნები</div>
              <textarea value={clientForm.notes} onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                style={{ ...S.input, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowClientForm(false)} style={{ ...S.btn("#2a2a2a", "#888"), flex: 1 }}>გაუქმება</button>
              <button onClick={saveClient} style={{ ...S.btn("#c8a96e", "#0f0f0f", { fontWeight: "bold" }), flex: 1 }}>შენახვა</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENT FORM MODAL ── */}
      {showPayForm && (
        <div style={S.modal}>
          <div style={{ ...S.modalBox, maxWidth: 380 }}>
            <div style={{ fontSize: 17, fontWeight: "bold", color: "#c8a96e", marginBottom: 20, fontStyle: "italic" }}>ახალი გადახდა</div>
            {[["თანხა (₾)", "amount", "number"], ["თარიღი", "date", "date"], ["აღწერა", "desc", "text"]].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={S.label}>{label}</div>
                <input type={type} value={payForm[key]} onChange={e => setPayForm(f => ({ ...f, [key]: e.target.value }))} style={S.input} />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <div style={S.label}>სტატუსი</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["pending", "⏳ მოლოდინი"], ["paid", "✓ გადახდილი"]].map(([v, l]) => (
                  <button key={v} onClick={() => setPayForm(f => ({ ...f, status: v }))} style={{
                    flex: 1,
                    background: payForm.status === v ? (v === "paid" ? "#1a2e1e" : "#2e1e0a") : "#141414",
                    color: payForm.status === v ? (v === "paid" ? "#4caf84" : "#e8a44a") : "#666",
                    border: `1px solid ${payForm.status === v ? (v === "paid" ? "#4caf84" : "#e8a44a") : "#2a2a2a"}`,
                    borderRadius: 8, padding: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13
                  }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowPayForm(false)} style={{ ...S.btn("#2a2a2a", "#888"), flex: 1 }}>გაუქმება</button>
              <button onClick={savePayment} style={{ ...S.btn("#c8a96e", "#0f0f0f", { fontWeight: "bold" }), flex: 1 }}>შენახვა</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MEETING FORM MODAL ── */}
      {showMeetForm && (
        <div style={S.modal}>
          <div style={{ ...S.modalBox, maxWidth: 380 }}>
            <div style={{ fontSize: 17, fontWeight: "bold", color: "#6ab4e8", marginBottom: 20, fontStyle: "italic" }}>📅 ახალი შეხვედრა</div>
            {[["თარიღი", "date", "date"], ["დრო", "time", "time"], ["აღწერა", "desc", "text"]].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={S.label}>{label}</div>
                <input type={type} value={meetForm[key]} onChange={e => setMeetForm(f => ({ ...f, [key]: e.target.value }))} style={S.input} />
              </div>
            ))}
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" id="rem" checked={meetForm.reminder}
                onChange={e => setMeetForm(f => ({ ...f, reminder: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: "pointer" }} />
              <label htmlFor="rem" style={{ fontSize: 13, color: "#aaa", cursor: "pointer" }}>🔔 SMS შეხსენება</label>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowMeetForm(false)} style={{ ...S.btn("#2a2a2a", "#888"), flex: 1 }}>გაუქმება</button>
              <button onClick={saveMeeting} style={{ ...S.btn("#1a2a40", "#6ab4e8", { fontWeight: "bold", border: "1px solid #2a4a70" }), flex: 1 }}>შენახვა</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SMS MODAL ── */}
      {showSMS && <SMSModal client={showSMS} onClose={() => setShowSMS(null)} />}
    </div>
  );
}
