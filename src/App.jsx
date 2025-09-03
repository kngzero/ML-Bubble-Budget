// Subscription Bubble Tracker – Dual View (Bubbles + Table)
// Each circle = a payment. Size = amount. Color = closeness to due date.
// Single-file React component. Tailwind for styling.

import { useEffect, useMemo, useRef, useState } from "react";
import ShaderBubbleView from "./lib/ShaderBubbleView.jsx";
import { packCircles, updateSelection } from "./lib/utils.js";

/******************** Utilities ********************/
function daysBetween(a, b) {
  const ms = (new Date(b)).setHours(0,0,0,0) - (new Date(a)).setHours(0,0,0,0);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
function addInterval(date, cycle, intervalDays = 30) {
  const d = new Date(date);
  if (cycle === "weekly") d.setDate(d.getDate() + 7);
  else if (cycle === "monthly") d.setMonth(d.getMonth() + 1);
  else if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else if (cycle === "custom") d.setDate(d.getDate() + Number(intervalDays || 30));
  return d.toISOString().slice(0,10);
}
function formatCurrency(n, symbol) {
  return `${symbol}${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function monthlyEquivalent(amount, cycle, intervalDays=30){
  const n = Number(amount || 0);
  if (cycle === 'weekly') return n * 4.34524; // avg weeks per month
  if (cycle === 'yearly') return n / 12;
  if (cycle === 'custom') return n * (30/intervalDays);
  return n; // monthly
}
// Map days-left → HSL color (blue → green → yellow → red)
function dueColor(daysLeft, lookahead=30){
  const d = Math.max(Math.min(daysLeft, lookahead), 0);
  const t = 1 - d / lookahead; // 0 far, 1 near
  const ease = t*t*(3-2*t);
  const hue = 220 - ease * 220; // 220 → 0
  const sat = 90; const light = 58;
  return `hsl(${hue} ${sat}% ${light}%)`;
}
function futureDate(days){ const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
const STORAGE_KEY = "subscription-tracker-v2";
function normalizeItem(x){
  return { id: x.id || crypto.randomUUID(), name: x.name||'', category: x.category||'', amount: Number(x.amount||0), cycle: x.cycle||'monthly', intervalDays: x.intervalDays||30, nextDue: x.nextDue || new Date().toISOString().slice(0,10), autopay: !!x.autopay };
}
function hydrate(arr){ return arr.map(normalizeItem); }
function dehydrate(arr){ return arr.map(({id,name,category,amount,cycle,intervalDays,nextDue,autopay})=>({id,name,category,amount,cycle,intervalDays,nextDue,autopay})); }

/******************** Sample ********************/
const SAMPLE = [
  { name: "Netflix", category: "Entertainment", amount: 15.99, cycle: "monthly", nextDue: futureDate(5), autopay: true },
  { name: "Adobe CC", category: "Productivity", amount: 54.99, cycle: "monthly", nextDue: futureDate(2), autopay: true },
  { name: "Spotify", category: "Entertainment", amount: 9.99, cycle: "monthly", nextDue: futureDate(13), autopay: false },
  { name: "iCloud 2TB", category: "Storage", amount: 9.99, cycle: "monthly", nextDue: futureDate(22), autopay: true },
  { name: "Notion", category: "Productivity", amount: 8, cycle: "monthly", nextDue: futureDate(1), autopay: false },
  { name: "Figma", category: "Productivity", amount: 12, cycle: "monthly", nextDue: futureDate(27), autopay: true },
  { name: "AWS (avg)", category: "Infrastructure", amount: 42, cycle: "monthly", nextDue: futureDate(9), autopay: true },
  { name: "Domain Pack", category: "Infrastructure", amount: 96, cycle: "yearly", nextDue: futureDate(60), autopay: false },
  { name: "GYM", category: "Health", amount: 39, cycle: "monthly", nextDue: futureDate(4), autopay: true },
  { name: "VPN", category: "Security", amount: 4.5, cycle: "monthly", nextDue: futureDate(17), autopay: true },
];

/******************** App ********************/
export default function SubscriptionBubbleTracker(){
  const [currency, setCurrency] = useState("$");
  const [lookahead, setLookahead] = useState(30);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | overdue | autopay | manual
  const [sortBy, setSortBy] = useState("due"); // due | amount | name | category
  const [view, setView] = useState("bubbles"); // bubbles | table | shader
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system");
  const [items, setItems] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return hydrate(SAMPLE);
    try { return hydrate(JSON.parse(raw)); } catch { return hydrate(SAMPLE); }
  });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  useEffect(()=>{ localStorage.setItem(STORAGE_KEY, JSON.stringify(dehydrate(items))); },[items]);

  const now = new Date();
  const enriched = useMemo(()=> items.map(x=>{
    const daysLeft = daysBetween(now, x.nextDue);
    return { ...x, id: x.id, daysLeft, color: daysLeft < 0 ? 'hsl(0 90% 50%)' : dueColor(daysLeft, lookahead) };
  }),[items, lookahead]);

  const filtered = useMemo(()=> enriched.filter(it => {
    if (query && !(""+it.name).toLowerCase().includes(query.toLowerCase()) && !(""+it.category).toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'overdue' && it.daysLeft >= 0) return false;
    if (filter === 'autopay' && !it.autopay) return false;
    if (filter === 'manual' && it.autopay) return false;
    return true;
  }),[enriched, query, filter]);

  const amountRange = useMemo(()=>{
    const vals = filtered.map(f=>f.amount);
    const min = Math.min(...vals, 1); const max = Math.max(...vals, 100);
    return {min, max};
  },[filtered]);

  const sorted = useMemo(()=> {
    return [...filtered].sort((a,b)=>
      sortBy==='amount' ? b.amount - a.amount :
      sortBy==='name' ? a.name.localeCompare(b.name) :
      sortBy==='category' ? (a.category||'').localeCompare(b.category||'') :
      a.daysLeft - b.daysLeft);
  },[filtered, sortBy]);

  // Radius mapping
  const ref = useRef(null); const [size, setSize] = useState({w: 800, h: 520});
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(es => {
      for (const e of es) {
        const c = e.contentRect;
        setSize({ w: c.width, h: Math.max(380, c.height) });
      }
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [view]);
  const { amountToRadius, pos } = useMemo(() => {
    const { min, max } = amountRange;
    const rMin = 28;
    const rMax = Math.min(140, Math.floor(Math.min(size.w, size.h) * 0.28));
    const base = (v) =>
      max === min
        ? (rMin + rMax) / 2
        : rMin + (rMax - rMin) * ((v - min) / (max - min));
    const layout = sorted.map((x) => ({ id: x.id, r: base(x.amount) }));
    if (layout.length === 0) return { amountToRadius: base, pos: new Map() };
    let packed = packCircles(layout, size.w, size.h, 0.5);
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const { id, r } of layout) {
      const p = packed.get(id);
      if (!p) continue;
      minX = Math.min(minX, p.x - r);
      maxX = Math.max(maxX, p.x + r);
      minY = Math.min(minY, p.y - r);
      maxY = Math.max(maxY, p.y + r);
    }
    const usedW = maxX - minX;
    const usedH = maxY - minY;
    const scale = Math.min(size.w / usedW, size.h / usedH);
    if (scale > 1) {
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const scaled = new Map();
      for (const { id, r } of layout) {
        const p = packed.get(id);
        scaled.set(id, {
          x: size.w / 2 + (p.x - cx) * scale,
          y: size.h / 2 + (p.y - cy) * scale,
        });
      }
      packed = scaled;
    }
    const amountToRadius = (v) => base(v) * (scale > 1 ? scale : 1);
    return { amountToRadius, pos: packed };
  }, [sorted, amountRange, size]);

  const monthlyTotal = useMemo(() =>
    filtered.reduce(
      (acc, x) => acc + monthlyEquivalent(x.amount, x.cycle, x.intervalDays),
      0,
    ),
  [filtered]);
  const yearlyTotal = useMemo(() => monthlyTotal * 12, [monthlyTotal]);

  function handleMarkPaid(it){ setItems(prev => prev.map(p => p.id===it.id ? { ...p, nextDue: addInterval(p.nextDue, p.cycle, p.intervalDays) } : p)); }
  function handleDelete(it){ setItems(prev => prev.filter(p => p.id !== it.id)); }
  function handleEdit(it){ setEditing(it); setShowForm(true); }
  function handleSave(form){ if(form.id){ setItems(prev=>prev.map(p=>p.id===form.id? normalizeItem(form):p)); } else { setItems(prev=>[...prev, normalizeItem({...form, id: crypto.randomUUID()})]); } setShowForm(false); setEditing(null); }
  function handleExport(){ const blob=new Blob([JSON.stringify(dehydrate(items),null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='subscriptions.json'; a.click(); URL.revokeObjectURL(url); }
  function handleImport(e){ const f=e.target.files?.[0]; if(!f) return; const fr=new FileReader(); fr.onload=()=>{ try{ setItems(hydrate(JSON.parse(String(fr.result)))); }catch{ alert('Invalid JSON'); } }; fr.readAsText(f); }
  function handleAddQuick(){ setItems(prev=>[...prev, normalizeItem({ name:'New', category:'', amount:10, cycle:'monthly', intervalDays:30, nextDue:new Date().toISOString().slice(0,10), autopay:true })]); }
  function updateRow(id, patch){ setItems(prev => prev.map(p => p.id===id ? normalizeItem({...p, ...patch}) : p)); }

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      if (theme === "dark") {
        root.classList.add("dark");
      } else if (theme === "light") {
        root.classList.remove("dark");
      } else {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    };
    apply();
    localStorage.setItem("theme", theme);
    if (theme === "system") {
      const m = window.matchMedia("(prefers-color-scheme: dark)");
      m.addEventListener("change", apply);
      return () => m.removeEventListener("change", apply);
    }
  }, [theme]);

  return (
    <div className="w-full min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Subscription Tracker</h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm md:text-base">Primary view: bubbles. Secondary view: table for quick edits.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 rounded-2xl bg-neutral-200 dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10">
              <button onClick={()=>setView('bubbles')} className={`px-3 py-1.5 rounded-xl text-sm font-medium ${view==='bubbles'?'bg-white text-neutral-900':'text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white'}`}>Bubbles</button>
              <button onClick={()=>setView('table')} className={`px-3 py-1.5 rounded-xl text-sm font-medium ${view==='table'?'bg-white text-neutral-900':'text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white'}`}>Table</button>
              <button onClick={()=>setView('shader')} className={`px-3 py-1.5 rounded-xl text-sm font-medium ${view==='shader'?'bg-white text-neutral-900':'text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white'}`}>Shader</button>
            </div>
            <select value={theme} onChange={e=>setTheme(e.target.value)} className="px-3 py-2 rounded-2xl bg-neutral-200 dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10 text-sm">
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <button onClick={()=>{setEditing(null); setShowForm(true);}} className="px-3 py-2 rounded-2xl bg-white text-neutral-900 text-sm font-medium shadow hover:shadow-md transition">Add Subscription</button>
            <label className="px-3 py-2 rounded-2xl bg-neutral-200 dark:bg-neutral-800 text-sm cursor-pointer hover:bg-neutral-300 dark:hover:bg-neutral-700 transition">Import JSON<input type="file" onChange={handleImport} accept="application/json" className="hidden"/></label>
            <button onClick={handleExport} className="px-3 py-2 rounded-2xl bg-neutral-200 dark:bg-neutral-800 text-sm hover:bg-neutral-300 dark:hover:bg-neutral-700 transition">Export JSON</button>
          </div>
        </header>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-4 gap-3">
          <div className="xl:col-span-3">
            {view==='bubbles' ? (
              <div ref={ref} className="relative h-[56vh] min-h-[420px] rounded-3xl bg-neutral-100 dark:bg-neutral-900/70 ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
                {sorted.map(it => {
                  const p = pos.get(it.id) || { x: 60, y: 60 };
                  const r = amountToRadius(it.amount);
                  const selected = selectedIds.includes(it.id);
                  return (
                    <Bubble
                      key={it.id}
                      x={p.x} y={p.y} r={r}
                      color={it.color}
                      item={it}
                      currency={currency}
                      selected={selected}
                      onSelect={(e)=>setSelectedIds(prev=>updateSelection(prev, it.id, e.shiftKey))}
                      onDeselect={(e)=>setSelectedIds(prev=>updateSelection(prev, it.id, e.shiftKey))}
                    />
                  );
                })}
                {selectedIds.length > 0 && (
                  <BubbleToolbar
                    count={selectedIds.length}
                    onMarkPaid={()=>{ selectedIds.forEach(id=>{ const it=items.find(x=>x.id===id); if(it) handleMarkPaid(it); }); setSelectedIds([]); }}
                    onEdit={()=>{ const it=items.find(x=>x.id===selectedIds[0]); if(it) handleEdit(it); }}
                    onDelete={()=>{ if(confirm('Delete selected subscriptions?')){ selectedIds.forEach(id=>handleDelete({id})); setSelectedIds([]); } }}
                  />
                )}
              </div>
            ) : view==='shader' ? (
              <div ref={ref} className="relative h-[56vh] min-h-[420px] rounded-3xl bg-neutral-100 dark:bg-neutral-900/70 ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
                <ShaderBubbleView items={sorted} pos={pos} size={size} amountToRadius={amountToRadius} />
              </div>
            ) : (
              <TableView
                rows={sorted}
                currency={currency}
                lookahead={lookahead}
                onChange={updateRow}
                onDelete={(id)=>handleDelete({id})}
                onMarkPaid={(id)=>{ const it=items.find(x=>x.id===id); if(it) handleMarkPaid(it); }}
                onAdd={handleAddQuick}
              />
            )}
          </div>

          <aside className="xl:col-span-1 flex flex-col gap-3">
            <div className="rounded-3xl bg-neutral-100 dark:bg-neutral-900/70 ring-1 ring-black/10 dark:ring-white/10 p-4">
              <div className="flex items-center gap-2"><span className="text-sm text-neutral-600 dark:text-neutral-400">Currency</span>
                <input value={currency} onChange={e=>setCurrency(e.target.value)} className="w-16 px-2 py-1 rounded-lg bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10"/>
              </div>
              <div className="mt-3">
                <label className="text-sm text-neutral-700 dark:text-neutral-300">Lookahead window: <span className="font-medium">{lookahead} days</span></label>
                <input type="range" min={7} max={90} value={lookahead} onChange={e=>setLookahead(Number(e.target.value))} className="w-full"/>
                <ColorLegend />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <select value={filter} onChange={e=>setFilter(e.target.value)} className="col-span-1 px-2 py-2 rounded-xl bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10 text-sm">
                  <option value="all">All</option>
                  <option value="overdue">Overdue</option>
                  <option value="autopay">Autopay</option>
                  <option value="manual">Manual</option>
                </select>
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="col-span-1 px-2 py-2 rounded-xl bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10 text-sm">
                  <option value="due">Sort by Due</option>
                  <option value="amount">Sort by Amount</option>
                  <option value="name">Sort by Name</option>
                  <option value="category">Sort by Category</option>
                </select>
                <input placeholder="Search" value={query} onChange={e=>setQuery(e.target.value)} className="col-span-2 px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10 text-sm"/>
              </div>
            </div>

            <div className="rounded-3xl bg-neutral-100 dark:bg-neutral-900/70 ring-1 ring-black/10 dark:ring-white/10 p-4">
              <h3 className="text-sm text-neutral-600 dark:text-neutral-400">Monthly equivalent</h3>
              <div className="mt-1 text-2xl font-semibold">{formatCurrency(monthlyTotal, currency)}</div>
              <h3 className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">Yearly total</h3>
              <div className="mt-1 text-2xl font-semibold">{formatCurrency(yearlyTotal, currency)}</div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Yearly/weekly/custom amounts are converted to monthly estimates to help budget planning. Yearly total is derived from this estimate.</p>
            </div>
          </aside>
        </div>

        <footer className="mt-6 text-center text-neutral-500 text-xs">
          Tip: Click a bubble to edit. Switch to the Table view for bulk edits.
        </footer>
      </div>

      {showForm && (
        <Modal onClose={()=>{ setShowForm(false); setEditing(null); }}>
          <EditForm
            initial={editing || { name: '', category: '', amount: 10, cycle: 'monthly', intervalDays: 30, nextDue: new Date().toISOString().slice(0,10), autopay: true }}
            onCancel={()=>{ setShowForm(false); setEditing(null); }}
            onSave={(f)=>handleSave(f)}
            currency={currency}
          />
        </Modal>
      )}
    </div>
  );
}

/******************** UI Components ********************/
function Bubble({ x, y, r, color, item, currency, selected, onSelect, onDeselect }) {
  const style = {
    position: 'absolute',
    left: x,
    top: y,
    width: r * 2,
    height: r * 2,
    transform: 'translate(-50%, -50%)',
    borderRadius: '9999px',
    background: color,
    transition: 'left 400ms, top 400ms, width 300ms, height 300ms, transform 150ms',
    boxShadow: selected ? '0 0 0 4px rgba(255,255,255,0.8)' : undefined,
    opacity: selected ? 0.8 : 1,
    zIndex: selected ? 5 : 1,
  };
  const overdue = item.daysLeft < 0;
  return (
    <div
      data-bubble-root
      style={style}
      className="select-none cursor-pointer"
      onClick={(e) => {
        selected ? onDeselect(e) : onSelect(e);
      }}
    >
      <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center text-center px-2 pointer-events-none">
        <div className="text-[11px] md:text-xs font-medium leading-tight">{item.name}</div>
        <div className="text-base md:text-lg font-semibold">{formatCurrency(item.amount, currency)}</div>
        <div className={`text-[10px] md:text-xs ${overdue ? 'text-black/80' : 'text-black/70'} font-semibold`}>
          {item.daysLeft < 0 ? `${Math.abs(item.daysLeft)}d overdue` : `${item.daysLeft}d`}
        </div>
      </div>
    </div>
  );
}

function BubbleToolbar({ count, onMarkPaid, onEdit, onDelete }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 bg-neutral-100 dark:bg-neutral-900/95 ring-1 ring-black/10 dark:ring-white/10 rounded-2xl shadow-xl px-4 py-2 flex items-center gap-2">
      <span className="text-sm text-neutral-600 dark:text-neutral-400 mr-2">{count} selected</span>
      <button onClick={onMarkPaid} className="px-3 py-1 rounded-lg bg-white text-neutral-900 text-sm font-semibold">Mark paid</button>
      <button onClick={onEdit} className="px-3 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-sm">Edit</button>
      <button onClick={onDelete} className="px-3 py-1 rounded-lg bg-red-600/90 text-sm">Delete</button>
    </div>
  );
}

function ColorLegend(){
  return (
    <div className="mt-3">
      <div className="h-3 rounded-full w-full" style={{background: 'linear-gradient(90deg, hsl(220 90% 58%), hsl(160 90% 58%), hsl(60 90% 58%), hsl(0 90% 50%))'}}/>
      <div className="flex justify-between text-[10px] text-neutral-600 dark:text-neutral-400 mt-1"><span>Far</span><span>Near</span><span>Due</span><span>Overdue</span></div>
    </div>
  );
}

function Modal({ children, onClose }){
  useEffect(()=>{ const onKey=(e)=>{ if(e.key==='Escape') onClose(); }; window.addEventListener('keydown', onKey); return ()=>window.removeEventListener('keydown', onKey); }, [onClose]);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="w-full max-w-xl" onClick={(e)=>e.stopPropagation()}>
        <div className="rounded-3xl bg-neutral-50 dark:bg-neutral-900 ring-1 ring-black/10 dark:ring-white/10 p-4 md:p-6 shadow-2xl">{children}</div>
      </div>
    </div>
  );
}

function EditForm({ initial, onCancel, onSave, currency }){
  const [form, setForm] = useState({ ...initial });
  function set(k,v){ setForm(s=>({ ...s, [k]: v })); }
  return (
    <form className="grid grid-cols-2 gap-3" onSubmit={(e)=>{ e.preventDefault(); onSave(form); }}>
      <h2 className="col-span-2 text-lg font-semibold">{initial?.id ? 'Edit' : 'Add'} Subscription</h2>
      <label className="col-span-2 text-sm">Name
        <input value={form.name} onChange={e=>set('name', e.target.value)} required className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10"/>
      </label>
      <label className="col-span-2 text-sm">Category
        <input value={form.category||''} onChange={e=>set('category', e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10"/>
      </label>
      <label className="text-sm">Amount ({currency})
        <input type="number" step="0.01" min="0" value={form.amount} onChange={e=>set('amount', parseFloat(e.target.value))} required className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10"/>
      </label>
      <label className="text-sm">Cycle
        <select value={form.cycle} onChange={e=>set('cycle', e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10">
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="custom">Custom (days)</option>
        </select>
      </label>
      {form.cycle === 'custom' && (
        <label className="text-sm">Interval (days)
          <input type="number" min="1" value={form.intervalDays || 30} onChange={e=>set('intervalDays', parseInt(e.target.value)||30)} className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10"/>
        </label>
      )}
      <label className="text-sm col-span-">Next due
        <input type="date" value={form.nextDue} onChange={e=>set('nextDue', e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10"/>
      </label>
      <label className="text-sm flex items-center gap-2 col-span-2 mt-1">
        <input type="checkbox" checked={!!form.autopay} onChange={e=>set('autopay', e.target.checked)} className="scale-110"/>
        Autopay enabled
      </label>
      <div className="col-span-2 flex justify-end gap-2 mt-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800">Cancel</button>
        <button type="submit" className="px-3 py-2 rounded-xl bg-white text-neutral-900 font-semibold">Save</button>
      </div>
    </form>
  );
}

function TableView({ rows, currency, lookahead, onChange, onDelete, onMarkPaid, onAdd }){
  return (
    <div className="rounded-3xl bg-neutral-100 dark:bg-neutral-900/70 ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <h3 className="text-sm text-neutral-600 dark:text-neutral-400">Quick edit table</h3>
        <button onClick={onAdd} className="px-3 py-1.5 rounded-xl bg-white text-neutral-900 text-sm">Add Row</button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-200 dark:bg-neutral-900/80 sticky top-0">
            <tr className="text-neutral-600 dark:text-neutral-400">
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Category</th>
              <th className="text-left px-3 py-2">Amount</th>
              <th className="text-left px-3 py-2">Cycle</th>
              <th className="text-left px-3 py-2">Interval</th>
              <th className="text-left px-3 py-2">Next due</th>
              <th className="text-left px-3 py-2">Autopay</th>
              <th className="text-left px-3 py-2">Monthly</th>
              <th className="text-left px-3 py-2">Days</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const monthly = monthlyEquivalent(r.amount, r.cycle, r.intervalDays);
              const days = r.daysLeft;
              const dot = r.daysLeft < 0 ? 'hsl(0 90% 50%)' : dueColor(r.daysLeft, lookahead);
              return (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="px-3 py-2"><input className="w-40 max-w-full px-2 py-1 rounded-lg bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10" value={r.name} onChange={(e)=>onChange(r.id,{name:e.target.value})}/></td>
                  <td className="px-3 py-2"><input className="w-32 px-2 py-1 rounded-lg bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10" value={r.category||''} onChange={(e)=>onChange(r.id,{category:e.target.value})}/></td>
                  <td className="px-3 py-2"><input type="number" step="0.01" min="0" className="w-28 px-2 py-1 rounded-lg bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10" value={r.amount} onChange={(e)=>onChange(r.id,{amount:parseFloat(e.target.value)})}/></td>
                  <td className="px-3 py-2">
                    <select className="px-2 py-1 rounded-lg bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10" value={r.cycle} onChange={(e)=>onChange(r.id,{cycle:e.target.value})}>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {r.cycle==='custom' ? (
                      <input type="number" min="1" className="w-24 px-2 py-1 rounded-lg bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10" value={r.intervalDays||30} onChange={(e)=>onChange(r.id,{intervalDays:parseInt(e.target.value)||30})}/>
                    ) : <span className="text-neutral-500">—</span>}
                  </td>
                  <td className="px-3 py-2"><input type="date" className="px-2 py-1 rounded-lg bg-white dark:bg-neutral-800 ring-1 ring-black/10 dark:ring-white/10" value={r.nextDue} onChange={(e)=>onChange(r.id,{nextDue:e.target.value})}/></td>
                  <td className="px-3 py-2"><input type="checkbox" className="scale-110" checked={!!r.autopay} onChange={(e)=>onChange(r.id,{autopay:e.target.checked})}/></td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(monthly, currency)}</td>
                  <td className="px-3 py-2"><div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{background:dot}}/> {days}d</div></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button onClick={()=>onMarkPaid(r.id)} className="px-2 py-1 rounded-lg bg-white text-neutral-900">Mark paid</button>
                      <button onClick={()=>{ if(confirm('Delete subscription?')) onDelete(r.id); }} className="px-2 py-1 rounded-lg bg-red-600/90">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
