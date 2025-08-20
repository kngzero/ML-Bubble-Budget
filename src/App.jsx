import { useEffect, useMemo, useRef, useState } from 'react';
<label className="text-sm col-span-2">Next due
<input type="date" value={form.nextDue} onChange={e=>set('nextDue', e.target.value)} className={`mt-1 w-full px-3 py-2 rounded-xl ${inputClass}`}/>
</label>
<label className="text-sm flex items-center gap-2 col-span-2 mt-1">
<input type="checkbox" checked={!!form.autopay} onChange={e=>set('autopay', e.target.checked)} className="scale-110"/>
Autopay enabled
</label>
<div className="col-span-2 flex justify-end gap-2 mt-2">
<button type="button" onClick={onCancel} className={`px-3 py-2 rounded-xl ${'bg-neutral-800'}`}>Cancel</button>
<button type="submit" className="px-3 py-2 rounded-xl bg-white text-neutral-900 font-semibold">Save</button>
</div>
</form>
);
}


function TableView({ rows, currency, lookahead, onChange, onDelete, onMarkPaid, onAdd, inputClass }){
return (
<div>
<div className="flex items-center justify-between p-3">
<h3 className="text-sm opacity-70">Quick edit table</h3>
<button onClick={onAdd} className="px-3 py-1.5 rounded-xl bg-white text-neutral-900 text-sm">Add Row</button>
</div>
<div className="overflow-auto">
<table className="min-w-full text-sm">
<thead className="sticky top-0">
<tr className="opacity-70">
<th className="text-left px-3 py-2">Name</th>
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
{rows.map(r=>{
const monthly = monthlyEquivalent(r.amount, r.cycle, r.intervalDays);
const dot = r.daysLeft < 0 ? 'hsl(0 90% 50%)' : dueColor(r.daysLeft, lookahead);
return (
<tr key={r.id} className="border-t border-white/5">
<td className="px-3 py-2"><input className={`w-40 max-w-full px-2 py-1 rounded-lg ${inputClass}`} value={r.name} onChange={(e)=>onChange(r.id,{name:e.target.value})}/></td>
<td className="px-3 py-2"><input type="number" step="0.01" min="0" className={`w-28 px-2 py-1 rounded-lg ${inputClass}`} value={r.amount} onChange={(e)=>onChange(r.id,{amount:parseFloat(e.target.value)})}/></td>
<td className="px-3 py-2">
<select className={`px-2 py-1 rounded-lg ${inputClass}`} value={r.cycle} onChange={(e)=>onChange(r.id,{cycle:e.target.value})}>
<option value="weekly">Weekly</option>
<option value="monthly">Monthly</option>
<option value="yearly">Yearly</option>
<option value="custom">Custom</option>
</select>
</td>
<td className="px-3 py-2">{r.cycle==='custom' ? (<input type="number" min="1" className={`w-24 px-2 py-1 rounded-lg ${inputClass}`} value={r.intervalDays||30} onChange={(e)=>onChange(r.id,{intervalDays:parseInt(e.target.value)||30})}/>) : <span className="opacity-50">—</span>}</td>
<td className="px-3 py-2"><input type="date" className={`px-2 py-1 rounded-lg ${inputClass}`} value={r.nextDue} onChange={(e)=>onChange(r.id,{nextDue:e.target.value})}/></td>
<td className="px-3 py-2"><input type="checkbox" className="scale-110" checked={!!r.autopay} onChange={(e)=>onChange(r.id,{autopay:e.target.checked})}/></td>
<td className="px-3 py-2 whitespace-nowrap">{formatCurrency(monthly, currency)}</td>
<td className="px-3 py-2"><div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{background:dot}}/> {r.daysLeft}d</div></td>
<td className="px-3 py-2"><div className="flex gap-2"><button onClick={()=>onMarkPaid(r.id)} className="px-2 py-1 rounded-lg bg-white text-neutral-900">Mark paid</button><button onClick={()=>{ if(confirm('Delete subscription?')) onDelete(r.id); }} className="px-2 py-1 rounded-lg bg-red-600/90">Delete</button></div></td>
</tr>
);
})}
</tbody>
</table>
</div>
</div>
);
}


// Helpers used here (kept local for simplicity)
function normalizeItem(x){ return { id: x.id || crypto.randomUUID(), name: x.name, amount: Number(x.amount||0), cycle: x.cycle||'monthly', intervalDays: x.intervalDays||30, nextDue: x.nextDue || new Date().toISOString().slice(0,10), autopay: !!x.autopay }; }
function hydrate(arr){ return arr.map(normalizeItem); }
function dehydrate(arr){ return arr.map(({id,name,amount,cycle,intervalDays,nextDue,autopay})=>({id,name,amount,cycle,intervalDays,nextDue,autopay})); }


// Console self-tests to mirror unit tests
function runSelfTests(){
try{
console.groupCollapsed('Subscription Bubble Tracker – self-tests');
const d0 = daysBetween('2025-01-01','2025-01-05'); console.assert(d0===4,'daysBetween 4', d0);
console.assert(addInterval('2025-01-01','weekly')==='2025-01-08','weekly addInterval');
console.assert(addInterval('2025-01-31','monthly')>='2025-02-28','monthly addInterval');
console.assert(addInterval('2024-02-29','yearly')==='2025-02-28' || addInterval('2024-02-29','yearly').startsWith('2025-02'),'yearly leap');
console.assert(Math.abs(monthlyEquivalent(10,'weekly')-43.4524)<1e-6,'weekly monthlyEquivalent');
const hFar=parseHue(dueColor(30,30)), hNear=parseHue(dueColor(1,30)); console.assert(hFar>hNear,'dueColor monotonic', hFar, hNear);
console.groupEnd();
}catch(e){ console.error('Self-tests crashed', e); }
}
