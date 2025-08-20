// Utilities shared by App and tests
export function addInterval(date, cycle, intervalDays = 30) {
const d = new Date(date);
if (cycle === 'weekly') d.setDate(d.getDate() + 7);
else if (cycle === 'monthly') d.setMonth(d.getMonth() + 1);
else if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
else if (cycle === 'custom') d.setDate(d.getDate() + Number(intervalDays || 30));
return d.toISOString().slice(0,10);
}


export function formatCurrency(n, symbol = '$') {
return `${symbol}${Number(n).toLocaleString(undefined,{ minimumFractionDigits:2, maximumFractionDigits:2 })}`;
}


export function monthlyEquivalent(amount, cycle, intervalDays=30){
const n = Number(amount || 0);
if (cycle === 'weekly') return n * 4.34524; // avg weeks per month
if (cycle === 'yearly') return n / 12;
if (cycle === 'custom') return n * (30/intervalDays);
return n; // monthly
}


export function dueColor(daysLeft, lookahead=30){
const d = Math.max(Math.min(daysLeft, lookahead), 0);
const t = 1 - d / lookahead;
const ease = t*t*(3-2*t);
const hue = 220 - ease * 220; // 220 → 0
const sat = 90, light = 58;
return `hsl(${hue} ${sat}% ${light}%)`;
}


// Improved packing: tangent (or tiny gap) without overlaps
export function packCircles(items, width, height, touch = 0.5){
const nodes = items.map((it, i) => {
const angle = i * 0.6, rad = 4 + i * 2;
return { id: it.id, r: it.r, x: width/2 + Math.cos(angle)*rad, y: height/2 + Math.sin(angle)*rad };
});
const cx = width/2, cy = height/2, N = nodes.length;


// Relaxation pass
const ITER = Math.min(1200, 300 + N * 45);
for (let k = 0; k < ITER; k++){
for (let i=0;i<N;i++) for (let j=i+1;j<N;j++){
const a = nodes[i], b = nodes[j];
let dx = b.x - a.x, dy = b.y - a.y; let dist = Math.hypot(dx, dy);
if (!isFinite(dist) || dist === 0){ dx=(Math.random()-0.5)*1e-3; dy=(Math.random()-0.5)*1e-3; dist=Math.hypot(dx,dy); }
const target = a.r + b.r + touch, gap = dist - target, ux = dx/dist, uy = dy/dist;
if (gap < 0){ const s=(-gap)*0.5; a.x -= ux*s; a.y -= uy*s; b.x += ux*s; b.y += uy*s; }
else if (gap > 0.75){ const s=Math.min(gap*0.25, 0.8); a.x += ux*s; a.y += uy*s; b.x -= ux*s; b.y -= uy*s; }
}
for (let i=0;i<N;i++){
const n = nodes[i];
n.x += (cx - n.x) * 0.02; n.y += (cy - n.y) * 0.02;
if (n.x - n.r < 0) n.x = n.r; if (n.x + n.r > width) n.x = width - n.r;
if (n.y - n.r < 0) n.y = n.r; if (n.y + n.r > height) n.y = height - n.r;
}
}
// Exact resolution pass
const EPS = 0.1;
for (let pass=0; pass<6; pass++){
let moved = false;
for (let i=0;i<N;i++) for (let j=i+1;j<N;j++){
const a = nodes[i], b = nodes[j];
const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
const minDist = a.r + b.r + touch - EPS;
if (dist < minDist){
const ux = (dist === 0 ? 1 : dx/dist), uy = (dist === 0 ? 0 : dy/dist);
const push = (minDist - dist) * 0.5;
a.x -= ux*push; a.y -= uy*push; b.x += ux*push; b.y += uy*push;
if (a.x - a.r < 0) a.x = a.r; if (a.x + a.r > width) a.x = width - a.r;
if (a.y - a.r < 0) a.y = a.r; if (a.y + a.r > height) a.y = height - a.r;
if (b.x - b.r < 0) b.x = b.r; if (b.x + b.r > width) b.x = width - b.r;
if (b.y - b.r < 0) b.y = b.r; if (b.y + b.r > height) b.y = height - b.r;
moved = true;
}
}
if (!moved) break;
}
const pos = new Map(); nodes.forEach(n => pos.set(n.id, { x: n.x, y: n.y })); return pos;
}


export function parseHue(hsl){
const m = /hsl\(([^\s]+)\s/.exec(hsl);
return m ? parseFloat(m[1]) : NaN;
}
