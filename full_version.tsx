import React, { useMemo, useState } from 'react';
// Lightweight switches to move between prior code states without git
const CONFIG = {
  // true: in-app overlay inside mobile frame; false: use global modal for PDF preview
  PDF_OVERLAY_IN_APP: true,
  // mobile bottom button label (older variant used "Μετακινήσεις")
  MOBILE_LABEL: 'Μεταφορές',
  // show temporary dev banner used during HMR tests
  SHOW_DEV_BANNER: false,
};
import jsPDF from 'jspdf';
import { Bell, Inbox, Truck, Factory, FileText, CheckCircle2, Clock, Menu, Filter, Package, ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-react';

/******** helpers ********/
const gid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('el-GR') : '-');
const to2 = (n: number | string) => String(n).padStart(2, '0');
const yearYY = () => to2(new Date().getFullYear() % 100);
const A = (x: any) => (Array.isArray(x) ? x : []);
const sumWaste = (lines: any[] = []) => A(lines).reduce((s: number, l: any) => s + (parseFloat(l?.quantity || '0') || 0), 0);

const EKA = [
  { code: '17 01 01', description: 'Σκυρόδεμα' },
  { code: '17 01 02', description: 'Τούβλα' },
  { code: '17 01 03', description: 'Πλακάκια/Κεραμικά' },
  { code: '17 01 05', description: 'Μείγματα' },
  { code: '17 05 04', description: 'Χώματα/Πέτρες' },
  { code: '17 09 04', description: 'Ανάμικτα ΑΕΚΚ' },
];

const UNITS = ['RRC', 'Latouros'];
const TRANSPORTERS = ['Euroskip', 'Skip Hire'];

const plates = () => {
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const s = () => L[Math.floor(Math.random() * L.length)];
  const d = () => Math.floor(Math.random() * 10);
  const r = () => `${s()}${s()}${s()}${d()}${d()}${d()}`;
  return [r(), r(), r()];
};

// helpers: export CSV (simple Excel-friendly CSV)
const toCSV = (rows: any[], columns: string[]) => {
  const esc = (v: any) => {
    if (v == null) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const header = columns.join(',');
  const body = rows.map(r => columns.map(c => esc(r[c])).join(',')).join('\n');
  return header + '\n' + body;
};

const downloadCSV = (filename: string, rows: any[], columns: string[]) => {
  const csv = toCSV(rows, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const uniqueProducers = (projects: any[] = []) => [...new Set(A(projects).map((p: any) => p.producer))];
const projectsByProducer = (projects: any[] = [], producer = '') => A(projects).filter((p: any) => !producer || p.producer === producer);

// apply filters to projects (supports optional producer override)
const applyProjectFilter = (projects: any[] = [], filter: any = {}, producerOverride?: string) => A(projects).filter((p: any) => {
  const prod = producerOverride || filter.producer;
  if (prod && p.producer !== prod) return false;
  if (filter.project && p.id !== filter.project) return false;
  if (filter.from && p.start && p.start < filter.from) return false;
  if (filter.to && p.end && p.end > filter.to) return false;
  return true;
});

// apply filters to transports (handles t.projectId vs t.project fallback)
const applyTransportFilter = (transports: any[] = [], projects: any[] = [], filter: any = {}, producerOverride?: string) => A(transports).filter((t: any) => {
  const prod = producerOverride || filter.producer;
  if (prod && t.producer !== prod) return false;
  if (filter.project) {
    if (t.projectId && t.projectId !== filter.project) return false;
    const proj = A(projects).find((p: any) => p.id === filter.project);
    if (!t.projectId && proj && t.project !== proj.projectName) return false;
  }
  if (filter.from && t.date && t.date < filter.from) return false;
  if (filter.to && t.date && t.date > filter.to) return false;
  return true;
});

/******** pdf ********/
const pdfTransfer = (t: any) => {
  const d = new jsPDF();
  d.setFontSize(14);
  d.text('TRANSPORT MONITORING FORM', 14, 18);
  d.setFontSize(11);
  d.text(`Producer: ${t.producer || '-'}`, 14, 32);
  d.text(`Project: ${t.project || '-'}`, 14, 40);
  d.text(`Address: ${t.address || '-'}`, 14, 48);
  d.text(`Unit: ${t.unit || '-'}`, 14, 56);
  d.text(`Date: ${t.date || '-'}`, 14, 64);
  d.text(`Vehicle: ${t.vehicle || '-'}`, 14, 72);
  if (t.approvedByProducer) d.text('✔ Handed to Transporter', 14, 82);
  if (t.receivedByUnit) {
    d.text('✔ Delivered to Unit', 14, 90);
    d.text(`Receiving date: ${t.unitDate || '-'}`, 14, 98);
    d.text(`Weight: ${t.weight || '-'} tn`, 14, 106);
    d.text(`EKA: ${t.ekaCategory || '-'}`, 14, 114);
  }
  d.save(`transfer_${(t.project || 'project').replace(/\s+/g, '_')}.pdf`);
};

// return PDF as data URL (embed signatures if present)
const pdfTransferDataUrl = (t: any) => {
  const d = new jsPDF();
  d.setFontSize(14);
  d.text('TRANSPORT MONITORING FORM', 14, 18);
  d.setFontSize(11);
  d.text(`Producer: ${t.producer || '-'}`, 14, 32);
  d.text(`Project: ${t.project || '-'}`, 14, 40);
  d.text(`Address: ${t.address || '-'}`, 14, 48);
  d.text(`Unit: ${t.unit || '-'}`, 14, 56);
  d.text(`Date: ${t.date || '-'}`, 14, 64);
  d.text(`Vehicle: ${t.vehicle || '-'}`, 14, 72);
  if (t.approvedByProducer) d.text('✔ Handed to Transporter', 14, 82);
  if (t.receivedByUnit) {
    d.text('✔ Delivered to Unit', 14, 90);
    d.text(`Receiving date: ${t.unitDate || '-'}`, 14, 98);
    d.text(`Weight: ${t.weight || '-'} tn`, 14, 106);
    d.text(`EKA: ${t.ekaCategory || '-'}`, 14, 114);
  }
  // embed signatures if present (approx positions)
  try {
    if (t.producerSignature) {
      d.text('Producer signature:', 14, 130);
      d.addImage(t.producerSignature, 'PNG', 14, 134, 60, 30);
    }
  } catch (e) {
    // ignore image errors
  }
  try {
    if (t.transporterSignature) {
      d.text('Transporter signature:', 90, 130);
      d.addImage(t.transporterSignature, 'PNG', 90, 134, 60, 30);
    }
  } catch (e) {
    // ignore
  }
  return d.output('datauristring');
};

const pdfAgreement = (p: any) => {
  const d = new jsPDF();
  d.setFontSize(14);
  d.text('RECOVERY AGREEMENT - C&D WASTE', 14, 18);
  d.setFontSize(11);
  d.text(`Producer: ${p.producer}`, 14, 32);
  d.text(`Project: ${p.projectName}`, 14, 40);
  d.text(`Address: ${p.address}`, 14, 48);
  d.text(`Unit: ${p.unit}`, 14, 56);
  d.text(`Agreement #: ${p.agreement}`, 14, 64);
  d.text(`Date: ${fmt(p.agreementDate)}`, 14, 72);
  d.save(`agreement_${(p.projectName || 'project').replace(/\s+/g, '_')}.pdf`);
};

/******** ui ********/
const Btn = ({ children, onClick, className = '', type = 'button', disabled = false }: any) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`px-2 py-1 rounded text-sm border transition disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

const Badge = ({ tone = 'gray', children }: any) => {
  const m: any = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-800 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-xs border ${m[tone]}`}>
      {children}
    </span>
  );
};

// clickable badge (supports tone similar to Badge)
const ClickBadge = ({ tone = 'gray', children, onClick, className = '' }: any) => {
  const base = 'inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-xs border cursor-pointer ';
  const m: any = {
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };
  return (
    <button onClick={onClick} className={`${base} ${m[tone] || m.gray} ${className}`}>
      {children}
    </button>
  );
};

// deterministic color based on producer name
const avatarColor = (s: string) => {
  const colors = ['bg-blue-50 text-blue-600','bg-green-50 text-green-600','bg-orange-50 text-orange-600','bg-purple-50 text-purple-600','bg-teal-50 text-teal-600'];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return colors[Math.abs(h) % colors.length];
};

// small truck animation style (inline)
const TruckCSS = () => (
  <style>{`@keyframes truck-move { 0% { transform: translateX(-2px); } 50% { transform: translateX(2px); } 100% { transform: translateX(-2px); } } .truck-anim { display:inline-block; animation: truck-move 1.2s linear infinite; }`}</style>
);

const TabBar = ({ tabs, active, onChange }: any) => {
  const T = A(tabs);
  const a = typeof active === 'string' ? active : '';
  return (
    <div className="flex gap-2 mb-3 border-b">
      {T.map((t: any) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-2 -mb-px ${a === t.key ? 'border-b-4 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}
        >
          {t.label}
          {t.count > 0 && (
            <span className="ml-2 text-xs bg-red-600 text-white rounded-full px-2">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
};

const Modal = ({ title, children, onClose, onSubmit, submitLabel = 'Καταχώρηση' }: any) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in">
    <div className="bg-white rounded shadow-lg p-4 w-full max-w-3xl animate-scale">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Btn className="bg-gray-100" onClick={onClose}>✕</Btn>
      </div>
      <div className="max-h-[70vh] overflow-auto pr-1">{children}</div>
      <div className="flex justify-end gap-2 mt-3">
        {onSubmit && (
          <Btn className="bg-green-600 text-white" onClick={onSubmit}>
            {submitLabel}
          </Btn>
        )}
      </div>
    </div>
  </div>
);

// small accessible snackbar
const Snackbar = ({ open, message, onClose }: any) => {
  if (!open) return null;
  return (
    <div role="status" aria-live="polite" className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 bg-gray-900 text-white px-4 py-2 rounded shadow">
      <div className="flex items-center gap-3">
        <div className="text-sm">{message}</div>
        <button aria-label="Close" onClick={onClose} className="text-xs bg-white/10 px-2 py-1 rounded">Close</button>
      </div>
    </div>
  );
};

// Simple signature pad using native canvas. Returns dataURL via onChange.
const SignaturePad = ({ value, onChange, ariaLabel, className = '' }: any) => {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  const drawing = React.useRef(false);

  React.useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    if (value) {
      const img = new Image(); img.src = value; img.onload = () => ctx.drawImage(img, 0, 0);
    }
  }, [value]);

  const start = (e: any) => { drawing.current = true; draw(e); };
  const end = () => { drawing.current = false; if (!ref.current) return; onChange(ref.current.toDataURL()); };
  const draw = (e: any) => {
    if (!drawing.current || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = ref.current.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke();
  };

  const clear = () => { if (!ref.current) return; const ctx = ref.current.getContext('2d'); if (!ctx) return; ctx.clearRect(0,0,ref.current.width, ref.current.height); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,ref.current.width, ref.current.height); onChange(''); };

  return (
    <div>
      <canvas
        ref={ref}
        width={500}
        height={160}
        aria-label={ariaLabel || 'signature-pad'}
        className={`border w-full bg-white touch-none ${className}`}
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={end}
        onTouchStart={start}
        onTouchMove={draw}
        onTouchEnd={end}
      />
      <div className="flex gap-2 mt-2">
        <Btn className="bg-gray-100" onClick={clear}>Καθαρισμός</Btn>
      </div>
    </div>
  );
};

const FilterBar = ({ producers = [], projects = [], value, onChange, showProject = true, showProducer = true }: any) => (
  <div className="mb-3">
    <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-xl p-3 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        {showProducer && (
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Παραγωγός</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={value.producer || ''}
              onChange={(e: any) => onChange({ ...value, producer: e.target.value, project: '' })}
            >
              <option value="">— Όλοι οι Παραγωγοί —</option>
              {producers.map((p: string) => (<option key={p} value={p}>{p}</option>))}
            </select>
          </div>
        )}
        {showProject && (
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Έργο</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={value.project || ''}
              onChange={(e: any) => onChange({ ...value, project: e.target.value })}
            >
              <option value="">— Όλα τα Έργα —</option>
              {projects.map((p: any) => (<option key={p.id} value={p.id}>{p.projectName}</option>))}
            </select>
          </div>
        )}
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Από</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={value.from || ''}
            onChange={(e: any) => onChange({ ...value, from: e.target.value })}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Έως</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={value.to || ''}
            onChange={(e: any) => onChange({ ...value, to: e.target.value })}
          />
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          onClick={() => onChange({ producer: '', project: '', from: '', to: '' })}
        >
          Επαναφορά
        </button>
      </div>
    </div>
  </div>
);

/******** notifications ********/
const BellBtn = ({ items, onJump }: any) => {
  const [open, setOpen] = useState(false);
  const unread = A(items).filter((n: any) => !n.read).length;
  return (
    <div className="relative">
      <button className="border rounded-full p-2 bg-white" onClick={() => setOpen(v => !v)}>
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full px-1">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-80 overflow-auto bg-white border rounded shadow z-50 p-2 text-sm">
          {A(items).length === 0 ? (
            <div className="text-center text-gray-400 py-6">Καμία ειδοποίηση</div>
          ) : (
            A(items).map((n: any) => (
              <div key={n.id} className={`p-2 rounded ${n.read ? 'bg-gray-50' : 'bg-blue-50'} mb-1`}>
                <div className="font-semibold">{n.title}</div>
                <div className="text-xs text-gray-600">{n.body}</div>
                <div className="text-right mt-1">
                  <Btn className="bg-blue-600 text-white" onClick={() => onJump(n.id)}>Μετάβαση</Btn>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/******** producer details ********/
const ProjectDetails = ({ project, transports, onBack, onRequestTransfer }: any) => {
  const list = A(transports).filter((t: any) => t.projectId === project.id);
  const [justRequested, setJustRequested] = React.useState<string | null>(null);

  // Aggregate actual delivered quantities by EKA for this project
  const delivered = A(list).filter((t: any) => t.receivedByUnit);
  const actualsMap: Record<string, number> = {};
  delivered.forEach((t: any) => {
    const code = t.ekaCategory || '—';
    const w = parseFloat(String(t.weight || '0')) || 0;
    actualsMap[code] = (actualsMap[code] || 0) + w;
  });
  const actuals = Object.entries(actualsMap).map(([code, qty]) => ({ code, qty }));
  const TON_PER_LOAD = 7; // tn per load (for overall estimation)
  const totalEstimatedTons = A(project.wasteLines).reduce((s: number, w: any) => s + (Number(w.quantity || 0) || 0), 0);
  const estimatedLoads = totalEstimatedTons > 0 ? Math.ceil(totalEstimatedTons / TON_PER_LOAD) : 0;
  const completedLoads = delivered.length;
  const overallPct = estimatedLoads > 0 ? Math.min(100, Math.round((completedLoads / estimatedLoads) * 100)) : 0;

  const quickRequest = (type: 'empty-bin' | 'full-pickup') => {
    onRequestTransfer(project, type);
    setJustRequested(type);
    setTimeout(() => setJustRequested(null), 2600);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold">{project.projectName}</h2>
        <div className="flex gap-2">
          <Btn className="bg-gray-100" onClick={onBack}>← Πίσω</Btn>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-sm mb-3">
        <div className="bg-white rounded border p-3 lg:col-span-2">
          <div className="font-semibold mb-2">Στοιχεία Έργου</div>
          <div>Διεύθυνση: {project.address}</div>
          <div>Ημ. Έναρξης: {fmt(project.start)}</div>
          <div>Ημ. Λήξης: {fmt(project.end)}</div>
          <div>Μονάδα: {project.unit}</div>
          <div>Μεταφορέας: {project.transporter}</div>
          <div>Υπεύθυνος: {project.managerName} — {project.managerPhone} — {project.managerEmail}</div>
        </div>

        <div className="bg-white rounded border p-3">
          <div className="font-semibold mb-2">Εντολές προς Μεταφορέα</div>
          <div className="space-y-2">
            <button
              className="w-full text-left rounded-lg border p-3 hover:shadow transition bg-gradient-to-r from-blue-50 to-white"
              onClick={() => quickRequest('empty-bin')}
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="font-semibold">Αίτημα Κενού Κάδου</div>
                  <div className="text-xs text-gray-600">Αίτημα για παράδοση άδειου κάδου στο έργο</div>
                </div>
              </div>
            </button>
            <button
              className="w-full text-left rounded-lg border p-3 hover:shadow transition bg-gradient-to-r from-green-50 to-white"
              onClick={() => quickRequest('full-pickup')}
            >
              <div className="flex items-center gap-3">
                <Truck className="w-6 h-6 text-green-600" />
                <div>
                  <div className="font-semibold">Αίτημα Παραλαβής Κάδου</div>
                  <div className="text-xs text-gray-600">Αίτημα για άμεση παραλαβή γεμάτου κάδου</div>
                </div>
              </div>
            </button>
            {justRequested && (
              <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                {justRequested === 'empty-bin'
                  ? 'Ο μεταφορέας θα ενημερωθεί για να φέρει κάδο.'
                  : 'Ο μεταφορέας θα ενημερωθεί για να παραλάβει τον κάδο.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-side: Estimated EKA vs Actual Delivered */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm mb-4">
        <div className="bg-white rounded border p-3">
          <div className="font-semibold mb-2">ΕΚΑ / Ποσότητες (Εκτίμηση)</div>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2">Α/Α</th>
                <th className="border px-2">ΕΚΑ</th>
                <th className="border px-2">Περιγραφή</th>
                <th className="border px-2">Ποσότητα (tn)</th>
              </tr>
            </thead>
            <tbody>
              {A(project.wasteLines).length === 0 ? (
                <tr><td className="border text-center p-3" colSpan={4}>—</td></tr>
              ) : (
                A(project.wasteLines).map((w: any, i: number) => (
                  <tr key={i}>
                    <td className="border text-center">{i + 1}</td>
                    <td className="border px-2">{w.code}</td>
                    <td className="border px-2">{w.description}</td>
                    <td className="border px-2 text-right">{Number(w.quantity || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Overall estimated transfers and progress */}
          <div className="mt-3">
            <div className="font-semibold mb-1">Εκτιμώμενες Μεταφορές</div>
            {estimatedLoads === 0 ? (
              <div className="text-xs text-gray-500">—</div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Σύνολο</span>
                  <span className="text-gray-600">{completedLoads} / {estimatedLoads} φορτία</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                  <div className="h-2 bg-blue-600" style={{ width: `${overallPct}%` }} />
                </div>
              </>
            )}
          </div>
          {/* Actual delivered quantities by EKA (same structure as estimate) */}
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded p-2">
            <div className="font-semibold mb-2">ΕΚΑ / Ποσότητες (Πραγματικές)</div>
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2">Α/Α</th>
                  <th className="border px-2">ΕΚΑ</th>
                  <th className="border px-2">Περιγραφή</th>
                  <th className="border px-2">Ποσότητα (tn)</th>
                </tr>
              </thead>
              <tbody>
                {A(project.wasteLines).length === 0 ? (
                  <tr><td className="border text-center p-3" colSpan={4}>—</td></tr>
                ) : (
                  A(project.wasteLines).map((w: any, i: number) => (
                    <tr key={`actual-${w.code}-${i}`}>
                      <td className="border text-center">{i + 1}</td>
                      <td className="border px-2">{w.code}</td>
                      <td className="border px-2">{w.description}</td>
                      <td className="border px-2 text-right">{Number(actualsMap[w.code] || 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        
      </div>

  {/* two detailed tables: pending deliveries and completed deliveries (completed below pending) */}
  <div className="grid grid-cols-1 gap-4 mb-4">
        <div className="bg-white rounded border p-3">
          <div className="font-semibold mb-2">Εκκρεμείς Μεταφορές</div>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2">Α/Α</th>
                <th className="border px-2">Όνομα Έργου</th>
                <th className="border px-2">Διεύθυνση</th>
                <th className="border px-2">Ημ/νία</th>
                <th className="border px-2">Ώρα</th>
                <th className="border px-2">Μεταφορέας</th>
                <th className="border px-2">Αρ. Αυτοκινήτου</th>
                <th className="border px-2">Μονάδα</th>
                <th className="border px-2">PDF</th>
              </tr>
            </thead>
            <tbody>
              {list.filter((t: any) => t.approvedByProducer && !t.receivedByUnit).length === 0 ? (
                <tr><td className="border text-center p-3" colSpan={9}>—</td></tr>
              ) : (
                list.filter((t: any) => t.approvedByProducer && !t.receivedByUnit).map((t: any, i: number) => (
                  <tr key={t.id} className={t.isNew ? 'bg-green-50' : ''}>
                    <td className="border text-center">{i + 1}</td>
                    <td className="border px-2">{project.projectName}</td>
                    <td className="border px-2">{t.address || project.address}</td>
                    <td className="border text-center">{fmt(t.date)}</td>
                    <td className="border text-center">{t.time || '-'}</td>
                    <td className="border text-center">{t.transporter || project.transporter || '—'}</td>
                    <td className="border text-center">{t.vehicle || '—'}</td>
                    <td className="border text-center">{t.unit || project.unit || '—'}</td>
                    <td className="border text-center"><Btn className="bg-gray-100" onClick={() => pdfTransfer(t)}>PDF</Btn></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded border p-3">
          <div className="font-semibold mb-2">Ολοκληρωμένες Μεταφορές</div>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2">Α/Α</th>
                <th className="border px-2">Παραγωγός</th>
                <th className="border px-2">Έργο</th>
                <th className="border px-2">Μεταφορέας</th>
                <th className="border px-2">Αρ. Οχήματος</th>
                <th className="border px-2">Ημ/νία Παραλαβής</th>
                <th className="border px-2">Ώρα Παραλαβής</th>
                <th className="border px-2">Βάρος (tn)</th>
                <th className="border px-2">ΕΚΑ</th>
                <th className="border px-2">PDF</th>
              </tr>
            </thead>
            <tbody>
              {list.filter((t: any) => t.receivedByUnit).length === 0 ? (
                <tr><td className="border text-center p-3" colSpan={10}>—</td></tr>
              ) : (
                list.filter((t: any) => t.receivedByUnit).map((t: any, i: number) => {
                  const prj = project;
                  return (
                    <tr key={t.id}>
                      <td className="border text-center">{i + 1}</td>
                      <td className="border text-center">{t.producer}</td>
                      <td className="border text-center">{t.project || project.projectName}</td>
                      <td className="border text-center">{t.transporter || prj?.transporter || '—'}</td>
                      <td className="border text-center">{t.vehicle || '—'}</td>
                      <td className="border text-center">{fmt(t.unitDate || t.date)}</td>
                      <td className="border text-center">{t.unitTime || '—'}</td>
                      <td className="border text-center">{t.weight}</td>
                      <td className="border text-center">{t.ekaCategory}</td>
                      <td className="border text-center"><Btn className="bg-gray-100" onClick={() => pdfTransfer(t)}>PDF</Btn></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ProjectView: full project page with details, pending/completed transfers and comparison tables */
const ProjectView = ({ project, transports, onBack }: any) => {
  // pending and completed transfers for project
  const pending = A(transports).filter((t: any) => t.projectId === project.id && t.approvedByProducer && !t.receivedByUnit);
  const completed = A(transports).filter((t: any) => t.projectId === project.id && t.receivedByUnit);

  // estimated lines from project
  const estimated = A(project.wasteLines);

  // actuals aggregated by eka code from completed transports (use ekaCategory and weight)
  const actualsMap: Record<string, number> = {};
  completed.forEach((t: any) => {
    const code = t.ekaCategory || '—';
    const w = parseFloat(String(t.weight || '0')) || 0;
    actualsMap[code] = (actualsMap[code] || 0) + w;
  });
  const actuals = Object.keys(actualsMap).map(code => ({ code, quantity: actualsMap[code] }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{project.projectName}</h1>
          <div className="text-sm text-gray-600">{project.address} • Μονάδα: {project.unit}</div>
        </div>
        <div>
          <Btn className="bg-gray-100" onClick={onBack}>← Επιστροφή</Btn>
        </div>
      </div>

      <div className="bg-white rounded border p-4 mb-4">
        <div className="font-semibold mb-2">Στοιχεία Έργου</div>
        <div>Διεύθυνση: {project.address}</div>
        <div>Ημ. Έναρξης: {fmt(project.start)}</div>
        <div>Ημ. Λήξης: {fmt(project.end)}</div>
        <div>Υπεύθυνος: {project.managerName} — {project.managerPhone}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded border p-4">
          <div className="font-semibold mb-2">Εκκρεμείς Μεταφορές</div>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2">Α/Α</th>
                <th className="border px-2">Παραγωγός</th>
                <th className="border px-2">Ημ/νία</th>
                <th className="border px-2">Κατάσταση</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr><td className="border text-center p-3" colSpan={4}>—</td></tr>
              ) : (
                pending.map((t: any, i: number) => (
                  <tr key={t.id} className={t.isNew ? 'bg-green-50' : ''}>
                    <td className="border text-center">{i + 1}</td>
                    <td className="border text-center">{t.producer}</td>
                    <td className="border text-center">{fmt(t.date)}</td>
                    <td className="border text-center">{t.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded border p-4">
          <div className="font-semibold mb-2">Ολοκληρωμένες Μεταφορές</div>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2">Α/Α</th>
                <th className="border px-2">Παραγωγός</th>
                <th className="border px-2">Ημ/νία Παραλαβής</th>
                <th className="border px-2">Βάρος (tn)</th>
                <th className="border px-2">ΕΚΑ</th>
              </tr>
            </thead>
            <tbody>
              {completed.length === 0 ? (
                <tr><td className="border text-center p-3" colSpan={5}>—</td></tr>
              ) : (
                completed.map((t: any, i: number) => (
                  <tr key={t.id}>
                    <td className="border text-center">{i + 1}</td>
                    <td className="border text-center">{t.producer}</td>
                    <td className="border text-center">{fmt(t.unitDate)}</td>
                    <td className="border text-center">{t.weight}</td>
                    <td className="border text-center">{t.ekaCategory}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded border p-4">
        <div className="font-semibold mb-2">Σύγκριση Εκτιμώμενων vs Πραγματικών (tn)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-2">Αρχική Εκτίμηση</div>
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr><th className="border px-2">Κωδικός ΕΚΑ</th><th className="border px-2">Ποσότητα (tn)</th></tr>
              </thead>
              <tbody>
                {estimated.length === 0 ? (
                  <tr><td className="border text-center p-3" colSpan={2}>—</td></tr>
                ) : (
                  estimated.map((e: any) => (
                    <tr key={e.code}><td className="border px-2">{e.code}</td><td className="border px-2 text-right">{e.quantity || 0}</td></tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Πραγματικά (Ολοκληρωμένες)</div>
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr><th className="border px-2">Κωδικός ΕΚΑ</th><th className="border px-2">Ποσότητα (tn)</th></tr>
              </thead>
              <tbody>
                {actuals.length === 0 ? (
                  <tr><td className="border text-center p-3" colSpan={2}>—</td></tr>
                ) : (
                  actuals.map((a: any) => (
                    <tr key={a.code}><td className="border px-2">{a.code}</td><td className="border px-2 text-right">{a.quantity.toFixed(2)}</td></tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

 

/******** producer ********/
const Producer = ({ projects, transports, onAddProject, onApproveTransport, onRejectTransport, onOpenProject, onRequestTransfer, notifications, onJump, deepLink }: any) => {
  const [filter, setFilter] = useState({ producer: '', project: '', from: '', to: '' });
  const [exportOpen, setExportOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [tab, setTab] = useState('projects');
  const [subTab, setSubTab] = useState('active');
  const [projSubTab, setProjSubTab] = useState<'active' | 'completed'>('active');
  const [showProjectFilters, setShowProjectFilters] = useState(false);
  const [showTransferFilters, setShowTransferFilters] = useState(false);
  const [reqSubTab, setReqSubTab] = useState<'all' | 'transporter' | 'producer'>('all');
  const myProducer = 'Παραγωγός Α';
  const myTrans = A(transports).filter((t: any) => t.producer === myProducer);
  // apply page-level filters (producer is fixed to this producer)
  const filteredTransports = applyTransportFilter(transports, projects, filter, myProducer);
  const reqFromTransporter = filteredTransports.filter((t: any) => !t.approvedByProducer && !t.receivedByUnit && !t.fromProducer);
  const reqFromProducer = filteredTransports.filter((t: any) => !t.approvedByProducer && !t.receivedByUnit && t.fromProducer);
  const pendingActive = filteredTransports.filter((t: any) => t.approvedByProducer && !t.receivedByUnit);
  const completed = filteredTransports.filter((t: any) => t.receivedByUnit);

  const [showNew, setShowNew] = useState(false);
  const [newTransferOpen, setNewTransferOpen] = useState(false);
  const [ntProjectId, setNtProjectId] = useState('');
  const [ntForm, setNtForm] = useState({ address: '', transporter: '', unit: '', vehicle: '' });
  const [pForm, setPForm] = useState(() => ({
    projectName: '', address: '', start: today(), end: today(), unit: UNITS[0], transporter: TRANSPORTERS[0],
    managerName: '', managerPhone: '', managerEmail: '',
    wasteLines: EKA.map(e => ({ code: e.code, description: e.description, quantity: '' })),
  }));
  const totalEstimated = sumWaste(pForm.wasteLines);

  const submitNew = () => {
    if (!pForm.projectName || !pForm.address) return;
    onAddProject({ id: gid(), producer: myProducer, ...pForm, estimated: totalEstimated, agreement: 'Σε εκκρεμότητα', agreementDate: null, isNew: true });
    setShowNew(false);
    setPForm({ ...pForm, projectName: '', address: '', start: today(), end: today(), managerName: '', managerPhone: '', managerEmail: '', wasteLines: EKA.map(e => ({ code: e.code, description: e.description, quantity: '' })) });
  };

  const tabs = [
    { key: 'projects', label: 'Έργα', count: 0 },
    { key: 'requests', label: 'Αιτήματα', count: reqFromTransporter.length + reqFromProducer.length },
    { key: 'transfers', label: 'Μεταφορές', count: pendingActive.length },
    { key: 'reports', label: 'Αναφορές', count: 0 },
  ];

  // react to deep link: set tab or open project
  React.useEffect(() => {
    if (!deepLink) return;
    if (deepLink.page !== 'producer') return;
    if (deepLink.tab) setTab(deepLink.tab);
    if (deepLink.projectId) {
      const p = A(projects).find((x: any) => x.id === deepLink.projectId || x.projectName === deepLink.projectId);
      if (p) onOpenProject && onOpenProject(p);
    }
  }, [deepLink]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
  <h1 className="text-2xl font-bold">Παραγωγός</h1>
  <BellBtn items={A(notifications).filter((n: any) => n.target?.page === 'producer')} onJump={onJump} />
      </div>

      <TabBar tabs={tabs} active={tab} onChange={(k: string) => setTab(typeof k === 'string' ? k : 'aitimata')} />
      {false && tab === 'transfers' && (
        <FilterBar producers={uniqueProducers(projects)} projects={projectsByProducer(projects, myProducer)} value={filter} onChange={setFilter} showProject={true} showProducer={false} />
      )}
      {exportOpen && (() => {
        // local component state shim: we need a piece of state inside the Modal; use a ref-like pattern via closure variables is insufficient in React,
        // so instead create a small inner component that manages its own state.
        const YearModal = ({ onClose, onSubmit }: any) => {
          const [y, setY] = React.useState(new Date().getFullYear());
          return (
            <Modal title="Ετήσια Έκθεση" onClose={onClose} onSubmit={() => onSubmit(y)}>
              <div className="text-sm mb-3">Επίλεξε έτος για να δημιουργηθεί η έκθεση CSV.</div>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 border rounded" onClick={() => setY((p: number) => p - 1)}>-</button>
                <input type="number" className="border p-1 w-28 text-center" value={String(y)} onChange={(e: any) => setY(Number(e.target.value || new Date().getFullYear()))} />
                <button className="px-2 py-1 border rounded" onClick={() => setY((p: number) => p + 1)}>+</button>
              </div>
            </Modal>
          );
        };

        return (
          <YearModal onClose={() => setExportOpen(false)} onSubmit={(selectedYear: number) => {
            const rows = applyTransportFilter(transports, projects, filter, myProducer).filter((t: any) => {
              const d1 = t.date ? new Date(t.date).getFullYear() : null;
              const d2 = t.unitDate ? new Date(t.unitDate).getFullYear() : null;
              return d1 === selectedYear || d2 === selectedYear;
            }).map((t: any) => ({ id: t.id, producer: t.producer, project: t.project, date: t.date || t.unitDate, status: t.status, unit: t.unit }));
            downloadCSV(`report_producer_${selectedYear}_${Date.now()}.csv`, rows, ['id','producer','project','date','status','unit']);
            setExportOpen(false);
          }} />
        );
      })()}

      {tab === 'transfers' && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-2">
              <button onClick={() => setSubTab('active')} className={`px-3 py-2 ${subTab === 'active' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Εκκρεμείς</button>
              <button onClick={() => setSubTab('completed')} className={`px-3 py-2 ${subTab === 'completed' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Ολοκληρωμένες</button>
            </div>
            <button className="flex items-center gap-2 px-2 py-1 text-gray-700 hover:text-blue-700" onClick={() => setShowTransferFilters(v => !v)} title="Φίλτρα">
              <Filter className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Φίλτρα</span>
            </button>
          </div>
          {showTransferFilters && (
            <div className="mb-3">
              <FilterBar producers={uniqueProducers(projects)} projects={projectsByProducer(projects, myProducer)} value={filter} onChange={setFilter} showProject={true} showProducer={false} />
            </div>
          )}

          {subTab === 'active' && (
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white border rounded p-3">
                <div className="font-semibold mb-2">Εκκρεμείς μεταφορές</div>
                <table className="w-full border bg-white text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2">Α/Α</th>
                      <th className="border px-2">Έργο</th>
                      <th className="border px-2">Διεύθυνση</th>
                      <th className="border px-2">Ημ/νία</th>
                      <th className="border px-2">Κατάσταση</th>
                      <th className="border px-2">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingActive.length ? pendingActive.map((t: any, i: number) => (
                      <tr key={t.id} className={t.isNew ? 'bg-green-50' : ''}>
                        <td className="border text-center">{i + 1}</td>
                        <td className="border text-center">{t.project}</td>
                        <td className="border text-center">{t.address}</td>
                        <td className="border text-center">{fmt(t.date)}</td>
                        <td className="border text-center text-blue-700">{t.status}</td>
                        <td className="border text-center"><Btn className="bg-gray-100" onClick={() => pdfTransfer(t)}>PDF</Btn></td>
                      </tr>
                    )) : (
                      <tr><td className="border text-center p-3" colSpan={6}>—</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {subTab === 'completed' && (
            <div className="bg-white border rounded p-3">
              <div className="font-semibold mb-2">Ολοκληρωμένες μεταφορές</div>
              <table className="w-full border bg-white text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2">Α/Α</th>
                    <th className="border px-2">Έργο</th>
                    <th className="border px-2">Ημ/νία Παραλαβής</th>
                    <th className="border px-2">Βάρος (tn)</th>
                    <th className="border px-2">ΕΚΑ</th>
                    <th className="border px-2">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.length ? completed.map((t: any, i: number) => (
                    <tr key={t.id}>
                      <td className="border text-center">{i + 1}</td>
                      <td className="border text-center">{t.project}</td>
                      <td className="border text-center">{fmt(t.unitDate)}</td>
                      <td className="border text-center">{t.weight}</td>
                      <td className="border text-center">{t.ekaCategory}</td>
                      <td className="border text-center"><Btn className="bg-gray-100" onClick={() => pdfTransfer(t)}>PDF</Btn></td>
                    </tr>
                  )) : (
                    <tr><td className="border text-center p-3" colSpan={6}>—</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {tab === 'reports' && (
        (() => {
          // Use unfiltered data (by this producer only) for reports
          const all = applyTransportFilter(transports, projects, {}, myProducer);
          const reqT = all.filter((t: any) => !t.approvedByProducer && !t.receivedByUnit && !t.fromProducer);
          const reqP = all.filter((t: any) => !t.approvedByProducer && !t.receivedByUnit && t.fromProducer);
          const pendingA = all.filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit);
          const awaiting = all.filter((t: any) => t.deliveredToUnit && !t.receivedByUnit);
          const completedR = all.filter((t: any) => t.receivedByUnit);
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Αναφορές & Στατιστικά</h2>
                <Btn className="bg-blue-600 text-white" onClick={() => setExportOpen(true)}>Ετήσια Έκθεση</Btn>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border rounded p-3">
                  <div className="text-xs text-gray-500">Αιτήματα</div>
                  <div className="text-2xl font-semibold">{reqT.length + reqP.length}</div>
                </div>
                <div className="bg-white border rounded p-3">
                  <div className="text-xs text-gray-500">Ανοιχτές Μεταφορές</div>
                  <div className="text-2xl font-semibold">{pendingA.length}</div>
                </div>
                <div className="bg-white border rounded p-3">
                  <div className="text-xs text-gray-500">Σε Παράδοση (υπογραφή)</div>
                  <div className="text-2xl font-semibold">{awaiting.length}</div>
                </div>
                <div className="bg-white border rounded p-3">
                  <div className="text-xs text-gray-500">Ολοκληρωμένες</div>
                  <div className="text-2xl font-semibold">{completedR.length}</div>
                </div>
              </div>

              {/* Top Projects by completed weight */}
              {(() => {
                const comp = completedR;
                const m: any = {};
                comp.forEach((t: any) => {
                  const key = t.projectId || t.project || '—';
                  const w = parseFloat(String(t.weight || '0')) || 0;
                  m[key] = (m[key] || 0) + w;
                });
                const rows = Object.entries(m).map(([k, v]: any) => ({
                  key: k,
                  name: (A(projects).find((p: any) => p.id === k)?.projectName) || k,
                  weight: v,
                })).sort((a: any, b: any) => b.weight - a.weight).slice(0, 5);
                return (
                  <div className="bg-white border rounded p-3">
                    <div className="font-semibold mb-2">Top Έργα (με βάση ολοκληρωμένα βάρη)</div>
                    <table className="w-full border text-sm">
                      <thead className="bg-gray-100">
                        <tr><th className="border px-2 text-left">Έργο</th><th className="border px-2 text-right">Συνολικό Βάρος (tn)</th></tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr><td className="border text-center p-3" colSpan={2}>—</td></tr>
                        ) : rows.map((r: any) => (
                          <tr key={r.key}>
                            <td className="border px-2">{r.name}</td>
                            <td className="border px-2 text-right">{r.weight.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Recent activity */}
              {(() => {
                const arr = A(all).slice().sort((a: any, b: any) => {
                  const da = new Date(a.unitDate || a.date || 0).getTime();
                  const db = new Date(b.unitDate || b.date || 0).getTime();
                  return db - da;
                }).slice(0, 6);
                return (
                  <div className="bg-white border rounded p-3">
                    <div className="font-semibold mb-2">Πρόσφατη Δραστηριότητα</div>
                    <table className="w-full border text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border px-2">Ημ/νία</th>
                          <th className="border px-2">Έργο</th>
                          <th className="border px-2">Κατάσταση</th>
                        </tr>
                      </thead>
                      <tbody>
                        {arr.length === 0 ? (
                          <tr><td className="border text-center p-3" colSpan={3}>—</td></tr>
                        ) : arr.map((t: any, i: number) => (
                          <tr key={i}>
                            <td className="border text-center">{fmt(t.unitDate || t.date)}</td>
                            <td className="border px-2">{t.project}</td>
                            <td className="border text-center">{t.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          );
        })()
      )}

      {tab === 'requests' && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-2">
              <button onClick={() => setReqSubTab('all')} className={`px-3 py-2 ${reqSubTab === 'all' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Όλα</button>
              <button onClick={() => setReqSubTab('transporter')} className={`px-3 py-2 ${reqSubTab === 'transporter' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Μεταφορέα</button>
              <button onClick={() => setReqSubTab('producer')} className={`px-3 py-2 ${reqSubTab === 'producer' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Παραγωγού</button>
            </div>
            <div className="flex gap-2">
              <Btn className="bg-blue-600 text-white" onClick={() => setNewTransferOpen(true)}>+ Νέα Μεταφορά</Btn>
            </div>
          </div>

          {(() => {
            let list: any[] = [];
            if (reqSubTab === 'all') list = [...reqFromTransporter, ...reqFromProducer].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
            if (reqSubTab === 'transporter') list = reqFromTransporter;
            if (reqSubTab === 'producer') list = reqFromProducer;
            return (
              <div className="bg-white border rounded p-3">
                <div className="font-semibold mb-2">Αιτήματα {reqSubTab === 'all' ? '(Όλα)' : reqSubTab === 'transporter' ? '(Μεταφορέα)' : '(Παραγωγού)'}
                </div>
                <table className="w-full border bg-white text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2">Α/Α</th>
                      <th className="border px-2">Έργο</th>
                      <th className="border px-2">Διεύθυνση</th>
                      <th className="border px-2">Ημ/νία</th>
                      <th className="border px-2">Κατάσταση / Ενέργεια</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.length ? list.map((t: any, i: number) => (
                      <tr key={t.id} className={t.isNew ? 'bg-green-50' : ''}>
                        <td className="border text-center">{i + 1}</td>
                        <td className="border text-center">{t.project}</td>
                        <td className="border text-center">{t.address}</td>
                        <td className="border text-center">{fmt(t.date)}</td>
                        <td className="border text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="text-xs text-gray-600">{t.requestType === 'empty-bin' ? 'Αίτημα Κενού Κάδου' : t.requestType === 'full-pickup' ? 'Αίτημα Παραλαβής Κάδου' : t.fromProducer ? 'Αίτημα Παραγωγού' : 'Αίτημα Μεταφορέα'}</div>
                            {!t.fromProducer ? (
                              <div className="flex gap-2 justify-center">
                                <Btn className="bg-green-600 text-white" onClick={() => onApproveTransport(t.id)}>Αποδοχή</Btn>
                                <Btn className="bg-red-600 text-white" onClick={() => onRejectTransport(t.id)}>Απόρριψη</Btn>
                              </div>
                            ) : (
                              <Badge tone="orange"><Clock className="w-3 h-3" /><span>Αναμονή</span></Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td className="border text-center p-3" colSpan={5}>—</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {tab === 'projects' && (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-2">
              <button onClick={() => setProjSubTab('active')} className={`px-3 py-2 ${projSubTab === 'active' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Ενεργά</button>
              <button onClick={() => setProjSubTab('completed')} className={`px-3 py-2 ${projSubTab === 'completed' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Ολοκληρωμένα</button>
            </div>
            <button className="flex items-center gap-2 px-2 py-1 text-gray-700 hover:text-blue-700" onClick={() => setShowProjectFilters(v => !v)} title="Φίλτρα">
              <Filter className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Φίλτρα</span>
            </button>
          </div>
          {showProjectFilters && (
            <div className="mb-2">
              <FilterBar producers={uniqueProducers(projects)} projects={projectsByProducer(projects, myProducer)} value={filter} onChange={setFilter} showProject={true} showProducer={false} />
            </div>
          )}
          <div className="flex justify-end mb-2">
            <Btn className="bg-green-600 text-white" onClick={() => setShowNew(true)}>+ Νέο Έργο</Btn>
          </div>
          <table className="w-full border bg-white">
            <thead className="bg-gray-100 text-sm">
              <tr>
                <th className="border px-2">Α/Α</th>
                <th className="border px-2">Έργο</th>
                <th className="border px-2">Διεύθυνση</th>
                <th className="border px-2">Έναρξη</th>
                <th className="border px-2">Λήξη</th>
                <th className="border px-2">Εκτιμώμενη (tn)</th>
                <th className="border px-2">Μονάδα</th>
                <th className="border px-2">Μεταφορέας</th>
                <th className="border px-2">Συμφωνία</th>
              </tr>
            </thead>
            <tbody>
              {applyProjectFilter(projects, filter, myProducer)
                .filter((p: any) => {
                  const t = today();
                  const isActive = !p.end || p.end >= t;
                  return projSubTab === 'active' ? isActive : (!isActive);
                })
                .map((p: any, i: number) => (
                <tr key={p.id} className={p.isNew ? 'bg-green-50' : ''}>
                  <td className="border text-center">{i + 1}</td>
                    <td className="border text-blue-700 underline cursor-pointer" onClick={() => onOpenProject(p)}>{p.projectName}</td>
                  <td className="border text-center">{p.address}</td>
                  <td className="border text-center">{fmt(p.start)}</td>
                  <td className="border text-center">{fmt(p.end)}</td>
                  <td className="border text-center">{p.estimated ?? sumWaste(p.wasteLines)}</td>
                  <td className="border text-center">{p.unit}</td>
                  <td className="border text-center">{p.transporter}</td>
                  <td className="border text-center">{p.agreement}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {showNew && (
            <Modal title="Προσθήκη Νέου Έργου" onClose={() => setShowNew(false)} onSubmit={submitNew}>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="col-span-2">Όνομα Έργου
                  <input className="border p-1 w-full" value={pForm.projectName} onChange={(e: any) => setPForm({ ...pForm, projectName: e.target.value })} />
                </label>
                <label className="col-span-2">Διεύθυνση
                  <input className="border p-1 w-full" value={pForm.address} onChange={(e: any) => setPForm({ ...pForm, address: e.target.value })} />
                </label>
                <label>Έναρξη
                  <input type="date" className="border p-1 w-full" value={pForm.start} onChange={(e: any) => setPForm({ ...pForm, start: e.target.value })} />
                </label>
                <label>Λήξη
                  <input type="date" className="border p-1 w-full" value={pForm.end} onChange={(e: any) => setPForm({ ...pForm, end: e.target.value })} />
                </label>
                <label>Μονάδα
                  <select className="border p-1 w-full" value={pForm.unit} onChange={(e: any) => setPForm({ ...pForm, unit: e.target.value })}>
                    {UNITS.map((u: string) => (<option key={u} value={u}>{u}</option>))}
                  </select>
                </label>
                <label>Μεταφορέας
                  <select className="border p-1 w-full" value={pForm.transporter} onChange={(e: any) => setPForm({ ...pForm, transporter: e.target.value })}>
                    {TRANSPORTERS.map((t: string) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </label>
                <label className="col-span-2">Υπεύθυνος
                  <input className="border p-1 w-full" value={pForm.managerName} onChange={(e: any) => setPForm({ ...pForm, managerName: e.target.value })} />
                </label>
                <label>Τηλέφωνο
                  <input className="border p-1 w-full" value={pForm.managerPhone} onChange={(e: any) => setPForm({ ...pForm, managerPhone: e.target.value })} />
                </label>
                <label>e-mail
                  <input className="border p-1 w-full" value={pForm.managerEmail} onChange={(e: any) => setPForm({ ...pForm, managerEmail: e.target.value })} />
                </label>
                <div className="col-span-2 font-semibold mt-2">Αναλυτικές Ποσότητες Αποβλήτων (tn)</div>
                <table className="col-span-2 w-full border text-xs">
                  <thead className="bg-gray-100">
                    <tr><th className="border px-2">ΕΚΑ</th><th className="border px-2">Περιγραφή</th><th className="border px-2">Ποσότητα</th></tr>
                  </thead>
                  <tbody>
                    {pForm.wasteLines.map((w: any, idx: number) => (
                      <tr key={w.code}>
                        <td className="border px-2">{w.code}</td>
                        <td className="border px-2">{w.description}</td>
                        <td className="border px-2">
                          <input
                            type="number"
                            className="border p-1 w-full"
                            value={w.quantity}
                            onChange={(e: any) => { const v = [...pForm.wasteLines]; v[idx] = { ...v[idx], quantity: e.target.value }; setPForm({ ...pForm, wasteLines: v }); }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="col-span-2 text-right text-sm mt-1">Σύνολο Εκτιμώμενο: <span className="font-semibold">{totalEstimated}</span> tn</div>
              </div>
            </Modal>
          )}

          
        </>
      )}

      {/* Global modal for creating a new transfer request by Producer (available from any tab) */}
      {newTransferOpen && (
        <Modal title="Νέα Μεταφορά" onClose={() => setNewTransferOpen(false)} onSubmit={() => {
          const proj = A(projects).find((p: any) => p.id === ntProjectId);
          if (proj) {
            // create the request using existing handler which will fill fields from project
            onRequestTransfer(proj);
            setNewTransferOpen(false);
            setNtProjectId('');
            setNtForm({ address: '', transporter: '', unit: '', vehicle: '' });
            // Switch to Requests tab so user sees it right away
            setTab('requests');
            setReqSubTab('producer');
          }
        }} submitLabel="Αίτημα">
          <div className="text-sm mb-2">Επιλέξτε έργο. Τα υπόλοιπα στοιχεία θα συμπληρωθούν αυτόματα.</div>
          <label className="block mb-2">Έργο
            <select className="border p-1 w-full" value={ntProjectId} onChange={(e: any) => {
              const id = e.target.value; setNtProjectId(id);
              const pr = A(projects).find((p: any) => p.id === id);
              if (pr) setNtForm({ address: pr.address || '', transporter: pr.transporter || '', unit: pr.unit || '', vehicle: '' });
            }}>
              <option value="">— Επιλογή Έργου —</option>
              {projectsByProducer(projects, myProducer).map((p: any) => (<option key={p.id} value={p.id}>{p.projectName} — {p.address}</option>))}
            </select>
          </label>
          <label className="block mb-2">Διεύθυνση
            <input className="border p-1 w-full" value={ntForm.address} readOnly />
          </label>
          <label className="block mb-2">Μεταφορέας
            <input className="border p-1 w-full" value={ntForm.transporter} readOnly />
          </label>
          <label className="block mb-2">Μονάδα
            <input className="border p-1 w-full" value={ntForm.unit} readOnly />
          </label>
          <label className="block">Σχόλια / Όχημα (προαιρετικό)
            <input className="border p-1 w-full" value={ntForm.vehicle} onChange={(e: any) => setNtForm({ ...ntForm, vehicle: e.target.value })} />
          </label>
        </Modal>
      )}

      {/* transfers subTabs render the pending/completed tables; duplicate block removed */}
    </div>
  );
};

/******** transporter (web) ********/
const Transporter = ({ projects, transports, onAddTransport, notifications, onJump, onAcceptRequest, addNotif, deepLink }: any) => {
  const [tab, setTab] = useState('transfers');
  const [show, setShow] = useState(false);
  const opts = useMemo(() => plates(), []);
  const [form, setForm] = useState({ producer: '', project: '', address: '', unit: '', vehicle: '', date: today(), time: '08:00', viaStation: false });
  const [acceptModal, setAcceptModal] = useState<any>({ open: false, row: null, vehicle: '', date: today(), time: '08:00' });

  const onSubmit = () => {
    if (!form.producer || !form.project) return;
    const proj = A(projects).find((p: any) => p.producer === form.producer && p.projectName === form.project);
    const vehicleValue = form.vehicle === 'CUSTOM' ? (customVehicle || opts[0]) : (form.vehicle || opts[0]);
    onAddTransport({ id: gid(), producer: form.producer, project: form.project, projectId: proj?.id, address: form.address || proj?.address || '-', unit: form.unit || proj?.unit || '-', vehicle: vehicleValue, date: form.date, time: form.time, status: 'Αναμονή αποδοχής παραγωγού', approvedByProducer: false, receivedByUnit: false, fromProducer: false, isNew: true });
    addNotif && addNotif('Νέο Αίτημα Μεταφοράς (Μεταφορέα)', `${form.producer} / ${form.project}`, { page: 'producer', tab: 'aitimata' });
    setShow(false);
    setForm({ producer: '', project: '', address: '', unit: '', vehicle: '', date: today(), time: '08:00', viaStation: false });
  };

  const producerReq = A(transports).filter((t: any) => !t.approvedByProducer && !t.receivedByUnit && t.fromProducer);
  const carrierReq = A(transports).filter((t: any) => !t.approvedByProducer && !t.receivedByUnit && !t.fromProducer);
  const pending = A(transports).filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit);

  const transNotifs = A(notifications).filter((n: any) => n.target?.page === 'transporter');
  const tabs = [
    { key: 'aitimata', label: 'Αιτήματα', count: producerReq.length + carrierReq.length },
    { key: 'transfers', label: 'Μεταφορές', count: pending.length },
    { key: 'notifications', label: 'Ειδοποιήσεις', count: transNotifs.filter((n: any) => !n.read).length },
  ];

  const [filter, setFilter] = useState({ producer: '', project: '', from: '', to: '' });
  const [exportOpen, setExportOpen] = useState(false);
  const [customVehicle, setCustomVehicle] = useState('');

  // deep link handling
  React.useEffect(() => {
    if (!deepLink) return;
    if (deepLink.page !== 'transporter') return;
    if (deepLink.tab) setTab(deepLink.tab);
    // if deepLink contains an id for a request, open accept modal
    if (deepLink.requestId) {
      const row = A(transports).find((t: any) => t.id === deepLink.requestId);
      if (row) setAcceptModal({ open: true, row, vehicle: plates()[0], date: row.date || today(), time: row.time || '08:00', projectInfo: A(projects).find((p: any) => p.id === row.projectId) });
    }
  }, [deepLink]);

  const Table = ({ rows = [], emptyText, showAcceptBtn = false }: any) => (
    <table className="w-full border bg-white text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="border px-2">Α/Α</th>
          <th className="border px-2">Παραγωγός</th>
          <th className="border px-2">Έργο</th>
          <th className="border px-2">Διεύθυνση</th>
          <th className="border px-2">Μονάδα</th>
          <th className="border px-2">Ημ/νία</th>
          <th className="border px-2">Κατάσταση</th>
          <th className="border px-2">Ενέργεια</th>
        </tr>
      </thead>
      <tbody>
        {A(rows).length > 0 ? (
          A(rows).map((t: any, i: number) => (
            <tr key={t.id} className={t.isNew ? 'bg-green-50' : ''}>
              <td className="border text-center">{i + 1}</td>
              <td className="border text-center">{t.producer}</td>
              <td className="border text-center">{t.project}</td>
              <td className="border text-center">{t.address}</td>
              <td className="border text-center">{t.unit}</td>
              <td className="border text-center">{fmt(t.date)}</td>
              <td className="border text-center text-blue-700">{t.status}</td>
              <td className="border text-center">
                {showAcceptBtn ? (
                  <Btn className="bg-green-600 text-white" onClick={() => {
                    const pr = A(projects).find((p: any) => p.id === t.projectId);
                    setAcceptModal({ open: true, row: t, vehicle: plates()[0], date: t.date || today(), time: t.time || '08:00', projectInfo: pr });
                  }}>Αποδοχή</Btn>
                ) : '—'}
              </td>
            </tr>
          ))
        ) : (
          <tr><td className="border text-center p-3" colSpan={8}>{emptyText}</td></tr>
        )}
      </tbody>
    </table>
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
  <h1 className="text-2xl font-bold">Μεταφορέας</h1>
  <BellBtn items={A(notifications).filter((n: any) => n.target?.page === 'transporter')} onJump={onJump} />
      </div>

      <TabBar tabs={tabs} active={tab} onChange={(k: string) => setTab(typeof k === 'string' ? k : 'aitimata')} />

      {tab === 'aitimata' && (
        <div className="space-y-4">
          <div className="flex justify-end"><Btn className="bg-blue-600 text-white" onClick={() => setShow(true)}>+ Νέα Μεταφορά</Btn></div>

          <div>
            <div className="font-semibold mb-2">Αιτήματα Παραγωγών</div>
            <Table rows={producerReq} emptyText="—" showAcceptBtn />
          </div>
          <div>
            <div className="font-semibold mb-2">Αιτήματα Μεταφορέα</div>
            <Table rows={carrierReq} emptyText="—" showAcceptBtn={false} />
          </div>
        </div>
      )}

      {tab === 'transfers' && (
        <div className="bg-white border rounded p-3 space-y-4">
          <div>
            <div className="font-semibold mb-2">Εκκρεμή Μεταφορές</div>
            <table className="w-full border bg-white text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2">Α/Α</th>
                  <th className="border px-2">Παραγωγός</th>
                  <th className="border px-2">Έργο</th>
                  <th className="border px-2">Διεύθυνση</th>
                  <th className="border px-2">Μονάδα</th>
                  <th className="border px-2">Ημ/νία</th>
                  <th className="border px-2">Κατάσταση</th>
                  <th className="border px-2">PDF</th>
                </tr>
              </thead>
              <tbody>
                {pending.length ? pending.map((t: any, i: number) => (
                  <tr key={t.id}>
                    <td className="border text-center">{i + 1}</td>
                    <td className="border text-center">{t.producer}</td>
                    <td className="border text-center">{t.project}</td>
                    <td className="border text-center">{t.address}</td>
                    <td className="border text-center">{t.unit}</td>
                    <td className="border text-center">{fmt(t.date)}{t.time ? ` • ${t.time}` : ''}</td>
                    <td className="border text-center text-blue-700">{t.status}</td>
                    <td className="border text-center"><Btn className="bg-gray-100" onClick={() => pdfTransfer(t)}>PDF</Btn></td>
                  </tr>
                )) : (
                  <tr><td className="border text-center p-3" colSpan={8}>—</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <div className="font-semibold mb-2">Ολοκληρωμένες Μεταφορές</div>
            <table className="w-full border bg-white text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2">Α/Α</th>
                  <th className="border px-2">Παραγωγός</th>
                  <th className="border px-2">Έργο</th>
                  <th className="border px-2">Ημ/νία</th>
                  <th className="border px-2">PDF</th>
                </tr>
              </thead>
              <tbody>
                {A(transports).filter((t: any) => t.receivedByUnit).length ? (
                  A(transports).filter((t: any) => t.receivedByUnit).map((t: any, i: number) => (
                    <tr key={t.id}>
                      <td className="border text-center">{i + 1}</td>
                      <td className="border text-center">{t.producer}</td>
                      <td className="border text-center">{t.project}</td>
                      <td className="border text-center">{fmt(t.unitDate)}</td>
                      <td className="border text-center"><Btn className="bg-gray-100" onClick={() => pdfTransfer(t)}>PDF</Btn></td>
                    </tr>
                  ))
                ) : (
                  <tr><td className="border text-center p-3" colSpan={5}>—</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="bg-white border rounded p-3 space-y-2">
          <div className="font-semibold mb-2">Ειδοποιήσεις</div>
          {transNotifs.length === 0 ? (
            <div className="text-center text-gray-400 py-6">Καμία ειδοποίηση</div>
          ) : (
            transNotifs.map((n: any) => (
              <div key={n.id} className={`p-2 rounded ${n.read ? 'bg-gray-50' : 'bg-blue-50'} border`}>
                <div className="font-semibold">{n.title}</div>
                <div className="text-xs text-gray-600">{n.body}</div>
                <div className="text-right mt-1">
                  <Btn className="bg-blue-600 text-white" onClick={() => onJump && onJump(n.id)}>Μετάβαση</Btn>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {show && (
        <Modal title="Νέα Μεταφορά" onClose={() => setShow(false)} onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="col-span-2">Παραγωγός
              <select className="border p-1 w-full" value={form.producer} onChange={(e: any) => setForm({ ...form, producer: e.target.value, project: '', address: '', unit: '' })}>
                <option value="">— Επιλογή Παραγωγού —</option>
                {[...new Set(A(projects).map((p: any) => p.producer))].map((p: string) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </label>
            <label className="col-span-2">Έργο
              <select className="border p-1 w-full" value={form.project} onChange={(e: any) => setForm({ ...form, project: e.target.value })}>
                <option value="">— Επιλογή Έργου —</option>
                {A(projects).filter((p: any) => p.producer === form.producer).map((p: any) => (<option key={p.id} value={p.projectName}>{p.projectName}</option>))}
              </select>
            </label>
            <label>Διεύθυνση
              <input className="border p-1 w-full" value={form.address || (A(projects).find((p: any) => p.producer === form.producer && p.projectName === form.project)?.address || '')} onChange={(e: any) => setForm({ ...form, address: e.target.value })} />
            </label>
            <label>Μονάδα
              <input className="border p-1 w-full" value={form.unit || (A(projects).find((p: any) => p.producer === form.producer && p.projectName === form.project)?.unit || '')} onChange={(e: any) => setForm({ ...form, unit: e.target.value })} />
            </label>
            <label>Όχημα
              <select className="border p-1 w-full" value={form.vehicle} onChange={(e: any) => setForm({ ...form, vehicle: e.target.value })}>
                <option value="">— Επιλογή —</option>
                {opts.map((pl: string) => (<option key={pl} value={pl}>{pl}</option>))}
                <option value="CUSTOM">— Καταχώρηση χειροκίνητα —</option>
              </select>
            </label>
            {form.vehicle === 'CUSTOM' && (
              <label>Αρ. Κυκλοφορίας
                <input className="border p-1 w-full" value={customVehicle || ''} onChange={(e: any) => { setCustomVehicle(e.target.value); setForm({ ...form, vehicle: e.target.value }); }} />
              </label>
            )}
            <label>Ημ/νία
              <input type="date" className="border p-1 w-full" value={form.date} onChange={(e: any) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label>Ώρα
              <input type="time" className="border p-1 w-full" value={form.time} onChange={(e: any) => setForm({ ...form, time: e.target.value })} />
            </label>
          </div>
        </Modal>
      )}

      {acceptModal.open && (
        <Modal
          title="Αποδοχή Αιτήματος Παραγωγού"
          onClose={() => setAcceptModal({ open: false, row: null, vehicle: '', date: today(), time: '08:00' })}
          onSubmit={() => {
            if (!acceptModal.row) return;
            onAcceptRequest(acceptModal.row, { vehicle: acceptModal.vehicle, date: acceptModal.date, time: acceptModal.time });
            setAcceptModal({ open: false, row: null, vehicle: '', date: today(), time: '08:00' });
          }}
          submitLabel="Αποδοχή"
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2 font-semibold">Στοιχεία έργου</div>
            <div>Παραγωγός: <span className="font-semibold">{acceptModal.row?.producer}</span></div>
            <div>Έργο: <span className="font-semibold">{acceptModal.row?.project}</span></div>
            <div className="col-span-2">Διεύθυνση: <span className="font-semibold">{acceptModal.row?.address}</span></div>
            <div>Μονάδα: <span className="font-semibold">{acceptModal.row?.unit}</span></div>
            <div>Υπεύθυνος: <span className="font-semibold">{acceptModal.projectInfo?.managerName || '-'}</span></div>
            <div>Τηλέφωνο: <span className="font-semibold">{acceptModal.projectInfo?.managerPhone || '-'}</span></div>
            <div className="col-span-2 border-t pt-2 font-semibold">Προγραμματισμός</div>
            <label>Ημ/νία
              <input type="date" className="border p-1 w-full" value={acceptModal.date} onChange={(e: any) => setAcceptModal((m: any) => ({ ...m, date: e.target.value }))} />
            </label>
            <label>Ώρα
              <input type="time" className="border p-1 w-full" value={acceptModal.time} onChange={(e: any) => setAcceptModal((m: any) => ({ ...m, time: e.target.value }))} />
            </label>
            <label className="col-span-2">Όχημα
              <select className="border p-1 w-full" value={acceptModal.vehicle} onChange={(e: any) => setAcceptModal((m: any) => ({ ...m, vehicle: e.target.value }))}>
                {plates().map((pl: string) => (<option key={pl} value={pl}>{pl}</option>))}
              </select>
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
};

/******** unit ********/
const Unit = ({ projects, transports, onAcceptAgreement, onRejectAgreement, onReceive, notifications, onJump, onOpenProject, deepLink }: any) => {
  const [tab, setTab] = useState('projects');
  const [filter, setFilter] = useState({ producer: '', project: '', from: '', to: '' });
  const [exportOpen, setExportOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const pending = A(transports).filter((t: any) => t.approvedByProducer && !t.receivedByUnit);
  const done = A(transports).filter((t: any) => t.receivedByUnit);
  const tabs = [
    { key: 'projects', label: 'Έργα', count: A(projects).filter((p: any) => p.agreement === 'Σε εκκρεμότητα').length },
    { key: 'transfers', label: 'Μεταφορές', count: pending.length },
    { key: 'stats', label: 'Στατιστικά & Αναμενόμενες' },
  ];

  const [weighOpen, setWeighOpen] = useState(false);
  // fixed: removed stray text that caused syntax error
  const [weighData, setWeighData] = useState({ id: null as any, weight: '', eka: EKA[0].code });

  const openWeigh = (t: any) => { setWeighOpen(true); setWeighData({ id: t.id, weight: '', eka: EKA[0].code }); };
  const submitWeigh = () => { if (!weighData.id) return; onReceive(weighData.id, parseFloat(weighData.weight || '0'), weighData.eka); setWeighOpen(false); };

  // respond to deepLink: switch tab or open project view
  React.useEffect(() => {
    if (!deepLink) return;
    if (deepLink.page !== 'unit') return;
    if (deepLink.tab) setTab(deepLink.tab);
    if (deepLink.projectId) {
      const p = A(projects).find((x: any) => x.id === deepLink.projectId || x.projectName === deepLink.projectId);
      if (p) onOpenProject && onOpenProject(p);
    }
  }, [deepLink]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
  <h1 className="text-2xl font-bold">Μονάδα</h1>
  <BellBtn items={A(notifications).filter((n: any) => n.target?.page === 'unit')} onJump={onJump} />
      </div>

  <TabBar tabs={tabs} active={tab} onChange={(k: string) => setTab(typeof k === 'string' ? k : 'projects')} />
  <div className="flex items-center justify-end gap-2 mb-2">
    {tab === 'stats' && (
      <Btn className="bg-blue-600 text-white" onClick={() => setExportOpen(true)}>Ετήσια Έκθεση</Btn>
    )}
    <button className="flex items-center gap-2 px-2 py-1 text-gray-700 hover:text-blue-700" onClick={() => setShowFilters(v => !v)} title="Φίλτρα">
      <Filter className="w-4 h-4" />
      <span className="text-sm hidden sm:inline">Φίλτρα</span>
    </button>
  </div>
  {showFilters && (
    <div className="mb-2">
      <FilterBar producers={uniqueProducers(projects)} projects={projectsByProducer(projects, filter.producer)} value={filter} onChange={setFilter} showProject={true} />
    </div>
  )}

      {tab === 'projects' && (
        <table className="w-full border bg-white text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2">Α/Α</th>
              <th className="border px-2">Παραγωγός</th>
              <th className="border px-2">Έργο</th>
              <th className="border px-2">Διεύθυνση</th>
              <th className="border px-2">Έναρξη</th>
              <th className="border px-2">Λήξη</th>
              <th className="border px-2">Συμφωνία</th>
            </tr>
          </thead>
          <tbody>
              {applyProjectFilter(projects, filter).map((p: any, i: number) => (
                    <tr key={p.id} className={p.isNew ? 'bg-green-50' : ''}>
                    <td className="border text-center">{i + 1}</td>
                    <td className="border text-center">{p.producer}</td>
                    <td className="border text-center">
                      <span className="text-blue-700 underline cursor-pointer" onClick={() => onOpenProject ? onOpenProject(p) : null}>{p.projectName}</span>
                    </td>
                <td className="border text-center">{p.address}</td>
                <td className="border text-center">{fmt(p.start)}</td>
                <td className="border text-center">{fmt(p.end)}</td>
                <td className="border text-center">
                  {p.agreement === 'Σε εκκρεμότητα' ? (
                    <div className="flex gap-2 justify-center">
                      <Btn className="bg-green-600 text-white" onClick={() => onAcceptAgreement(p.id)}>Αποδοχή</Btn>
                      <Btn className="bg-red-600 text-white" onClick={() => onRejectAgreement(p.id)}>Απόρριψη</Btn>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span className="text-blue-700 font-semibold underline cursor-pointer" onClick={() => pdfAgreement(p)}>{p.agreement}</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'transfers' && (
        <div className="bg-white border rounded p-3">
          <div className="font-semibold mb-2">Ανοιχτές Μεταφορές</div>
          <table className="w-full border text-sm mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2">Α/Α</th>
                <th className="border px-2">Παραγωγός</th>
                <th className="border px-2">Έργο</th>
                <th className="border px-2">Συμφωνία</th>
                <th className="border px-2">Διεύθυνση</th>
                <th className="border px-2">Μεταφορέας</th>
                <th className="border px-2">Αρ. Οχήματος</th>
                <th className="border px-2">Παραλαβή</th>
              </tr>
            </thead>
            <tbody>
              {applyTransportFilter(transports, projects, filter).filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit).length === 0 ? (
                <tr><td className="border text-center p-2" colSpan={8}>—</td></tr>
              ) : (
                applyTransportFilter(transports, projects, filter).filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit).map((t: any, i: number) => {
                  const prj = A(projects).find((p: any) => p.id === t.projectId);
                  return (
                    <tr key={t.id} className={t.isNew ? 'bg-green-50' : ''}>
                      <td className="border text-center">{i + 1}</td>
                      <td className="border text-center"><div className="font-semibold">{t.producer}</div></td>
                      <td className="border text-center">{t.project}</td>
                      <td className="border text-center">{(prj && prj.agreement) || '—'}</td>
                      <td className="border text-center">{t.address}</td>
                      <td className="border text-center">{prj?.transporter || '—'}</td>
                      <td className="border text-center">{t.vehicle || '—'}</td>
                      <td className="border text-center"><Btn className="bg-green-600 text-white" onClick={() => openWeigh(t)}>Παραλαβή</Btn></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="font-semibold mb-2">Εκκρεμή για υπογραφή παραλαβής</div>
          <table className="w-full border text-sm mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2">Α/Α</th>
                <th className="border px-2">Παραγωγός</th>
                <th className="border px-2">Έργο</th>
                <th className="border px-2">Διεύθυνση</th>
                <th className="border px-2">Ημ/νία Παράδοσης</th>
                <th className="border px-2">Κατάσταση</th>
              </tr>
            </thead>
            <tbody>
              {applyTransportFilter(transports, projects, filter).filter((t: any) => t.deliveredToUnit && !t.receivedByUnit).length === 0 ? (
                <tr><td className="border text-center p-2" colSpan={6}>—</td></tr>
              ) : (
                applyTransportFilter(transports, projects, filter).filter((t: any) => t.deliveredToUnit && !t.receivedByUnit).map((t: any, i: number) => (
                  <tr key={t.id} className={t.isNew ? 'bg-yellow-50' : ''}>
                    <td className="border text-center">{i + 1}</td>
                    <td className="border text-center">{t.producer}</td>
                    <td className="border text-center">{t.project}</td>
                    <td className="border text-center">{t.address}</td>
                    <td className="border text-center">{fmt(t.unitDate)}</td>
                    <td className="border text-center text-blue-700">{t.status || 'Αναμονή υπογραφής'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="font-semibold mb-2">Ολοκληρωμένες</div>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2">Α/Α</th>
                <th className="border px-2">Παραγωγός</th>
                <th className="border px-2">Έργο</th>
                <th className="border px-2">Μεταφορέας</th>
                <th className="border px-2">Αρ. Οχήματος</th>
                <th className="border px-2">Ημ/νία Παραλαβής</th>
                <th className="border px-2">Ώρα Παραλαβής</th>
                <th className="border px-2">Βάρος (tn)</th>
                <th className="border px-2">ΕΚΑ</th>
                <th className="border px-2">PDF</th>
              </tr>
            </thead>
            <tbody>
              {applyTransportFilter(transports, projects, filter).filter((t: any) => t.receivedByUnit).length === 0 ? (
                <tr><td className="border text-center p-2" colSpan={10}>—</td></tr>
              ) : (
                applyTransportFilter(transports, projects, filter).filter((t: any) => t.receivedByUnit).map((t: any, i: number) => {
                  const prj = A(projects).find((p: any) => p.id === t.projectId);
                  return (
                    <tr key={t.id}>
                      <td className="border text-center">{i + 1}</td>
                      <td className="border text-center">{t.producer}</td>
                      <td className="border text-center">{t.project}</td>
                      <td className="border text-center">{prj?.transporter || '—'}</td>
                      <td className="border text-center">{t.vehicle || '—'}</td>
                      <td className="border text-center">{fmt(t.unitDate)}</td>
                      <td className="border text-center">{t.unitTime || '—'}</td>
                      <td className="border text-center">{t.weight}</td>
                      <td className="border text-center">{t.ekaCategory}</td>
                      <td className="border text-center"><Btn className="bg-gray-100" onClick={() => pdfTransfer(t)}>PDF</Btn></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'stats' && (() => {
        const TON_PER_LOAD = 7;
        const all = A(transports);
        const active = all.filter((t: any) => !t.receivedByUnit);
        const awaiting = all.filter((t: any) => t.deliveredToUnit && !t.receivedByUnit);
        const open = all.filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit);

        const todayStr = today();
        const todayExpected = active.filter((t: any) => t.date === todayStr);

        const now = new Date();
        const dow = (now.getDay() + 6) % 7; // 0=Mon
        const monday = new Date(now); monday.setDate(now.getDate() - dow);
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
        const ymd = (d: Date) => d.toISOString().slice(0,10);
        const weekStart = ymd(monday);
        const weekEnd = ymd(sunday);
        const weekExpected = active.filter((t: any) => (t.date >= weekStart && t.date <= weekEnd));

        const month = now.getMonth();
        const year = now.getFullYear();
        const mStart = new Date(year, month, 1);
        const mEnd = new Date(year, month + 1, 0);
        const mStartStr = ymd(mStart), mEndStr = ymd(mEnd);

        const deliveredThisMonth = all.filter((t: any) => t.receivedByUnit && t.unitDate && t.unitDate >= mStartStr && t.unitDate <= mEndStr);
        const loadsMonth = deliveredThisMonth.length;
        const tonsMonth = deliveredThisMonth.reduce((s: number, t: any) => s + (parseFloat(String(t.weight||0))||0), 0);

        const pastDays = 30;
        const pStart = new Date(now); pStart.setDate(now.getDate() - (pastDays - 1));
        const pStartStr = ymd(pStart), todayISO = ymd(now);
        const delivered30 = all.filter((t: any) => t.receivedByUnit && t.unitDate && t.unitDate >= pStartStr && t.unitDate <= todayISO);
        const mapByDay: Record<string,{loads:number;tons:number}> = {};
        delivered30.forEach((t: any) => {
          const d = t.unitDate; if (!mapByDay[d]) mapByDay[d] = { loads: 0, tons: 0 };
          mapByDay[d].loads += 1; mapByDay[d].tons += (parseFloat(String(t.weight||0))||0);
        });
        const daysCount = Math.max(1, Object.keys(mapByDay).length || pastDays);
        const avgDailyLoads = delivered30.length / pastDays;
        const avgDailyTons = (delivered30.reduce((s: number, t: any) => s + (parseFloat(String(t.weight||0))||0), 0)) / pastDays;

        const remainingDaysInMonth = Math.max(0, (mEnd.getDate() - now.getDate()));
        const forecastMonthTons = avgDailyTons * remainingDaysInMonth;

        // Breakdowns by EKA
        const activeByEka: Record<string, { loads: number; estTons: number }> = {};
        active.forEach((t: any) => {
          const code = t.ekaCategory || 'Άγνωστο';
          if (!activeByEka[code]) activeByEka[code] = { loads: 0, estTons: 0 };
          activeByEka[code].loads += 1;
          activeByEka[code].estTons += TON_PER_LOAD;
        });

        const yStart = `${year}-01-01`;
        const yEnd = `${year}-12-31`;
        const agreeByEka: Record<string, { loads: number; estTons: number }> = {};
        A(projects).filter((p: any) => (p.start <= yEnd && p.end >= yStart)).forEach((p: any) => {
          (p.wasteLines || []).forEach((wl: any) => {
            const code = wl.code || 'Άγνωστο';
            const q = parseFloat(wl.quantity || '0') || 0;
            if (!agreeByEka[code]) agreeByEka[code] = { loads: 0, estTons: 0 };
            agreeByEka[code].loads += q;
            agreeByEka[code].estTons += q * TON_PER_LOAD;
          });
        });

        const doneByEka: Record<string, { loads: number; tons: number }> = {};
        all.filter((t: any) => t.receivedByUnit && t.unitDate && t.unitDate >= yStart && t.unitDate <= yEnd).forEach((t: any) => {
          const code = t.ekaCategory || 'Άγνωστο';
          if (!doneByEka[code]) doneByEka[code] = { loads: 0, tons: 0 };
          doneByEka[code].loads += 1;
          doneByEka[code].tons += parseFloat(String(t.weight || 0)) || 0;
        });

        // Top producers/projects (expected this week)
        const weekByProducer: Record<string, number> = {};
        weekExpected.forEach((t: any) => { weekByProducer[t.producer] = (weekByProducer[t.producer]||0) + 1; });
        const weekByProject: Record<string, number> = {};
        weekExpected.forEach((t: any) => { weekByProject[t.project] = (weekByProject[t.project]||0) + 1; });

        const sortEntries = (obj: any) => Object.entries(obj).sort((a: any, b: any) => (b[1].loads - a[1].loads));
        const sortNum = (obj: any) => Object.entries(obj).sort((a: any, b: any) => (b[1] - a[1]));

        const StatCard = ({ label, value, sub }: any) => (
          <div className="bg-white border rounded p-4 shadow-sm">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
            {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
          </div>
        );

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Ενεργές Μεταφορές" value={active.length} />
              <StatCard label="Αναμονή υπογραφής" value={awaiting.length} />
              <StatCard label="Αναμενόμενα σήμερα" value={`${todayExpected.length} φορτ.`} sub={`${(todayExpected.length * TON_PER_LOAD).toFixed(1)} tn`} />
              <StatCard label="Αναμενόμενα εβδομάδας" value={`${weekExpected.length} φορτ.`} sub={`${(weekExpected.length * TON_PER_LOAD).toFixed(1)} tn`} />
              <StatCard label="Παραλαβές μήνα" value={`${loadsMonth} φορτ.`} sub={`${tonsMonth.toFixed(1)} tn`} />
              <StatCard label="Μέση/ημέρα (30ημ)" value={`${avgDailyLoads.toFixed(2)} φορτ.`} sub={`${avgDailyTons.toFixed(2)} tn`} />
              <StatCard label="Πρόβλεψη υπολ. μήνα" value={`${forecastMonthTons.toFixed(1)} tn`} sub={`υπόθεση ${TON_PER_LOAD} tn/φορτίο`} />
              <StatCard label="Ανοιχτές για προγραμματισμό" value={open.length} sub="χωρίς παράδοση" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <div className="font-semibold mb-2">Αναμενόμενες Παραλαβές (Ενεργές) ανά ΕΚΑ</div>
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 text-left">Κωδ. ΕΚΑ</th>
                      <th className="border px-2 text-right">Φορτία</th>
                      <th className="border px-2 text-right">Εκτιμ. Τόνοι</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(activeByEka).length === 0 ? (
                      <tr><td className="border text-center p-2" colSpan={3}>—</td></tr>
                    ) : (
                      sortEntries(activeByEka).map(([code, v]: any) => (
                        <tr key={code}>
                          <td className="border px-2">{code}</td>
                          <td className="border px-2 text-right">{v.loads}</td>
                          <td className="border px-2 text-right">{v.estTons.toFixed(1)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div>
                <div className="font-semibold mb-2">Συμφωνίες Έτους ανά ΕΚΑ</div>
                <div className="text-xs text-gray-500 mb-1">{year}</div>
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 text-left">Κωδ. ΕΚΑ</th>
                      <th className="border px-2 text-right">Φορτία</th>
                      <th className="border px-2 text-right">Εκτιμ. Τόνοι</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(agreeByEka).length === 0 ? (
                      <tr><td className="border text-center p-2" colSpan={3}>—</td></tr>
                    ) : (
                      sortEntries(agreeByEka).map(([code, v]: any) => (
                        <tr key={code}>
                          <td className="border px-2">{code}</td>
                          <td className="border px-2 text-right">{v.loads}</td>
                          <td className="border px-2 text-right">{v.estTons.toFixed(1)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div>
                <div className="font-semibold mb-2">Παραδοθέντα (Έτος) ανά ΕΚΑ</div>
                <div className="text-xs text-gray-500 mb-1">{year}</div>
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 text-left">Κωδ. ΕΚΑ</th>
                      <th className="border px-2 text-right">Φορτία</th>
                      <th className="border px-2 text-right">Τόνοι</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(doneByEka).length === 0 ? (
                      <tr><td className="border text-center p-2" colSpan={3}>—</td></tr>
                    ) : (
                      sortEntries(doneByEka).map(([code, v]: any) => (
                        <tr key={code}>
                          <td className="border px-2">{code}</td>
                          <td className="border px-2 text-right">{v.loads}</td>
                          <td className="border px-2 text-right">{v.tons.toFixed(1)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="font-semibold mb-2">Top Παραγωγοί (Αυτή την εβδομάδα)</div>
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 text-left">Παραγωγός</th>
                      <th className="border px-2 text-right">Αναμενόμενα Φορτία</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(weekByProducer).length === 0 ? (
                      <tr><td className="border text-center p-2" colSpan={2}>—</td></tr>
                    ) : (
                      sortNum(weekByProducer).slice(0,5).map(([name, n]: any) => (
                        <tr key={name}>
                          <td className="border px-2">{name}</td>
                          <td className="border px-2 text-right">{n}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div>
                <div className="font-semibold mb-2">Top Έργα (Αυτή την εβδομάδα)</div>
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 text-left">Έργο</th>
                      <th className="border px-2 text-right">Αναμενόμενα Φορτία</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(weekByProject).length === 0 ? (
                      <tr><td className="border text-center p-2" colSpan={2}>—</td></tr>
                    ) : (
                      sortNum(weekByProject).slice(0,5).map(([name, n]: any) => (
                        <tr key={name}>
                          <td className="border px-2">{name}</td>
                          <td className="border px-2 text-right">{n}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {weighOpen && (
        <Modal title="Παραλαβή/Ζύγιση" onClose={() => setWeighOpen(false)} onSubmit={submitWeigh} submitLabel="Ολοκλήρωση">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label>Βάρος (tn)
              <input type="number" className="border p-1 w-full" value={weighData.weight} onChange={(e: any) => setWeighData({ ...weighData, weight: e.target.value })} />
            </label>
            <label>Κατηγορία ΕΚΑ
              <select className="border p-1 w-full" value={weighData.eka} onChange={(e: any) => setWeighData({ ...weighData, eka: e.target.value })}>
                {EKA.map(e => (<option key={e.code} value={e.code}>{e.code} — {e.description}</option>))}
              </select>
            </label>
          </div>
        </Modal>
      )}

      {exportOpen && (
        <Modal title="Ετήσια Έκθεση" onClose={() => setExportOpen(false)} onSubmit={() => {
          const rows = A(transports).filter((t: any) => {
            if (filter.producer && t.producer !== filter.producer) return false;
            if (filter.project && t.projectId !== filter.project) return false;
            if (filter.from && t.date < filter.from) return false;
            if (filter.to && t.date > filter.to) return false;
            return true;
          }).map((t: any) => ({ id: t.id, producer: t.producer, project: t.project, date: t.date, status: t.status, unit: t.unit }));
          downloadCSV(`report_unit_${Date.now()}.csv`, rows, ['id','producer','project','date','status','unit']);
          setExportOpen(false);
        }}>
          <div className="text-sm">Εξαγωγή αναφοράς μεταφορών για επιλεγμένη χρονική περίοδο/παραγωγό/έργο.</div>
        </Modal>
      )}
    </div>
  );
};

/******** mobile ********/
function EcoMobileFrame({ projects, transports, onAddTransport, notifications, onJump, onAcceptRequest, addNotif, onFinalizeDelivery }: any) {
  return (
    <div className="flex justify-center items-center min-h-[700px] bg-gray-200 rounded-lg">
      <div className="relative bg-black p-4 rounded-[3rem] w-[380px] h-[780px] shadow-2xl border-[8px] border-gray-900">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-800 rounded-full" />
        <div className="absolute inset-4 bg-white rounded-[2rem] overflow-hidden">
          <EcoApp
            projects={projects}
            transports={transports}
            onAddTransport={onAddTransport}
            notifications={notifications}
            onJump={onJump}
            onAcceptRequest={onAcceptRequest}
            addNotif={addNotif}
            onFinalizeDelivery={onFinalizeDelivery}
          />
        </div>
      </div>
    </div>
  );
}

/******** unit tablet (tablet app showing only transfers tab) ********/
function UnitTabletFrame({ projects, transports, onReceive }: any) {
  return (
    <div className="flex justify-center items-center min-h-[700px] bg-gray-200 rounded-lg">
      <div className="relative bg-black p-4 rounded-[2rem] w-[1024px] h-[768px] shadow-2xl border-[8px] border-gray-900">
        <div className="absolute inset-4 bg-white rounded-[1.5rem] overflow-hidden">
          <UnitTabletApp projects={projects} transports={transports} onReceive={onReceive} />
        </div>
      </div>
    </div>
  );
}

function UnitTabletApp({ projects, transports, onReceive }: any) {
  const [filter, setFilter] = useState<any>({ producer: '', project: '', from: '', to: '' });
  const [weighOpen, setWeighOpen] = useState(false);
  const [weighData, setWeighData] = useState<any>({ id: '', weight: '', eka: (EKA[0] && EKA[0].code) || '' });
  const [tab, setTab] = useState<'open' | 'awaiting' | 'completed'>('open');

  const openWeigh = (t: any) => { setWeighData({ id: t.id, weight: '', eka: (EKA[0] && EKA[0].code) || '' }); setWeighOpen(true); };
  const submitWeigh = () => { if (!weighData.id) return; onReceive(weighData.id, parseFloat(weighData.weight || '0'), weighData.eka); setWeighOpen(false); };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Μονάδα — Tablet</div>
        </div>
      </div>
      <div className="p-4 overflow-auto">
        <FilterBar producers={uniqueProducers(projects)} projects={projectsByProducer(projects, filter.producer)} value={filter} onChange={setFilter} showProject={true} />

        {(() => {
          const all = applyTransportFilter(transports, projects, filter);
          const openList = all.filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit);
          const awaitingList = all.filter((t: any) => t.deliveredToUnit && !t.receivedByUnit);
          const completedList = all.filter((t: any) => t.receivedByUnit);

          return (
            <div className="bg-white border rounded p-3">
              <TabBar
                tabs={[
                  { key: 'open', label: 'Ανοιχτές Μεταφορές', count: openList.length },
                  { key: 'awaiting', label: 'Εκκρεμή για υπογραφή', count: awaitingList.length },
                  { key: 'completed', label: 'Ολοκληρωμένες', count: completedList.length },
                ]}
                active={tab}
                onChange={(k: string) => setTab((k as any) || 'open')}
              />

              {tab === 'open' && (
                <table className="w-full border text-sm mb-0">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2">Α/Α</th>
                      <th className="border px-2">Παραγωγός</th>
                      <th className="border px-2">Έργο</th>
                      <th className="border px-2">Συμφωνία</th>
                      <th className="border px-2">Διεύθυνση</th>
                      <th className="border px-2">Μεταφορέας</th>
                      <th className="border px-2">Αρ. Οχήματος</th>
                      <th className="border px-2">Παραλαβή</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openList.length === 0 ? (
                      <tr><td className="border text-center p-2" colSpan={8}>—</td></tr>
                    ) : (
                      openList.map((t: any, i: number) => {
                        const prj = A(projects).find((p: any) => p.id === t.projectId);
                        return (
                          <tr key={t.id} className={t.isNew ? 'bg-green-50' : ''}>
                            <td className="border text-center">{i + 1}</td>
                            <td className="border text-center"><div className="font-semibold">{t.producer}</div></td>
                            <td className="border text-center">{t.project}</td>
                            <td className="border text-center">{(prj && prj.agreement) || '—'}</td>
                            <td className="border text-center">{t.address}</td>
                            <td className="border text-center">{prj?.transporter || '—'}</td>
                            <td className="border text-center">{t.vehicle || '—'}</td>
                            <td className="border text-center"><Btn className="bg-green-600 text-white" onClick={() => openWeigh(t)}>Παραλαβή</Btn></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {tab === 'awaiting' && (
                <table className="w-full border text-sm mb-0">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2">Α/Α</th>
                      <th className="border px-2">Παραγωγός</th>
                      <th className="border px-2">Έργο</th>
                      <th className="border px-2">Διεύθυνση</th>
                      <th className="border px-2">Ημ/νία Παράδοσης</th>
                      <th className="border px-2">Κατάσταση</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awaitingList.length === 0 ? (
                      <tr><td className="border text-center p-2" colSpan={6}>—</td></tr>
                    ) : (
                      awaitingList.map((t: any, i: number) => (
                        <tr key={t.id} className={t.isNew ? 'bg-yellow-50' : ''}>
                          <td className="border text-center">{i + 1}</td>
                          <td className="border text-center">{t.producer}</td>
                          <td className="border text-center">{t.project}</td>
                          <td className="border text-center">{t.address}</td>
                          <td className="border text-center">{fmt(t.unitDate)}</td>
                          <td className="border text-center text-blue-700">{t.status || 'Αναμονή υπογραφής'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {tab === 'completed' && (
                <table className="w-full border text-sm mb-0">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2">Α/Α</th>
                      <th className="border px-2">Παραγωγός</th>
                      <th className="border px-2">Έργο</th>
                      <th className="border px-2">Μεταφορέας</th>
                      <th className="border px-2">Αρ. Οχήματος</th>
                      <th className="border px-2">Ημ/νία Παραλαβής</th>
                      <th className="border px-2">Ώρα Παραλαβής</th>
                      <th className="border px-2">Βάρος (tn)</th>
                      <th className="border px-2">ΕΚΑ</th>
                      <th className="border px-2">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedList.length === 0 ? (
                      <tr><td className="border text-center p-2" colSpan={10}>—</td></tr>
                    ) : (
                      completedList.map((t: any, i: number) => {
                        const prj = A(projects).find((p: any) => p.id === t.projectId);
                        return (
                          <tr key={t.id}>
                            <td className="border text-center">{i + 1}</td>
                            <td className="border text-center">{t.producer}</td>
                            <td className="border text-center">{t.project}</td>
                            <td className="border text-center">{prj?.transporter || '—'}</td>
                            <td className="border text-center">{t.vehicle || '—'}</td>
                            <td className="border text-center">{fmt(t.unitDate)}</td>
                            <td className="border text-center">{t.unitTime || '—'}</td>
                            <td className="border text-center">{t.weight}</td>
                            <td className="border text-center">{t.ekaCategory}</td>
                            <td className="border text-center"><Btn className="bg-gray-100" onClick={() => pdfTransfer(t)}>PDF</Btn></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          );
        })()}
      </div>

      {weighOpen && (
        <Modal title="Παραλαβή/Ζύγιση" onClose={() => setWeighOpen(false)} onSubmit={submitWeigh} submitLabel="Ολοκλήρωση">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label>Βάρος (tn)
              <input type="number" className="border p-1 w-full" value={weighData.weight} onChange={(e: any) => setWeighData({ ...weighData, weight: e.target.value })} />
            </label>
            <label>Κατηγορία ΕΚΑ
              <select className="border p-1 w-full" value={weighData.eka} onChange={(e: any) => setWeighData({ ...weighData, eka: e.target.value })}>
                {EKA.map(e => (<option key={e.code} value={e.code}>{e.code} — {e.description}</option>))}
              </select>
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Producer mobile frame and app
function ProducerMobileFrame({ projects, transports, onApprove, onReject, onRequest, notifications, onJump, deepLink }: any) {
  return (
    <div className="flex justify-center items-center min-h-[700px] bg-gray-200 rounded-lg">
      <div className="relative bg-black p-4 rounded-[3rem] w-[380px] h-[780px] shadow-2xl border-[8px] border-gray-900">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-800 rounded-full" />
        <div className="absolute inset-4 bg-white rounded-[2rem] overflow-hidden">
          <ProducerMobileApp
            projects={projects}
            transports={transports}
            onApprove={onApprove}
            onReject={onReject}
            onRequest={onRequest}
            notifications={notifications}
            onJump={onJump}
            deepLink={deepLink}
          />
        </div>
      </div>
    </div>
  );
}

function ProducerMobileApp({ projects, transports, onApprove, onReject, onRequest, notifications, onJump }: any) {
  const [tab, setTab] = useState('projects');
  const [show, setShow] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [ntProjectId, setNtProjectId] = useState('');
  const [ntForm, setNtForm] = useState({ address: '', unit: '', transporter: '' });
  const myProducer = 'Παραγωγός Α';
  const [reqFilter, setReqFilter] = useState<'all' | 'carrier' | 'producer'>('all');

  const req = A(transports).filter((t: any) => t.producer === myProducer && !t.approvedByProducer && !t.receivedByUnit);
  const producerReq = req.filter((t: any) => t.fromProducer);
  const carrierReq = req.filter((t: any) => !t.fromProducer);
  const open = A(transports).filter((t: any) => t.producer === myProducer && t.approvedByProducer && !t.receivedByUnit);
  const done = A(transports).filter((t: any) => t.producer === myProducer && t.receivedByUnit);

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Header */}
      <div className="mobile-header safe-top px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">IWM</div>
          <BellBtn items={A(notifications).filter((n: any) => n.target?.page === 'producer')} onJump={onJump} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {show ? (
          <div className="p-4 space-y-3 animate-in">
            <div className="flex items-center justify-between mb-2">
              <button className="text-blue-700" onClick={() => setShow(false)}>‹ Πίσω</button>
              <div className="font-semibold">Νέα Μεταφορά</div>
              <div style={{ width: 40 }} />
            </div>
            <div className="text-sm text-gray-600">Επιλέξτε έργο για να δημιουργηθεί αίτημα μεταφοράς.</div>
            <label className="block text-sm">Έργο
              <select className="border p-1 w-full rounded mt-1" value={ntProjectId} onChange={(e: any) => {
                const id = e.target.value; setNtProjectId(id);
                const pr = A(projects).find((p: any) => p.id === id);
                if (pr) setNtForm({ address: pr.address || '', unit: pr.unit || '', transporter: pr.transporter || '' });
              }}>
                <option value="">— Επιλογή Έργου —</option>
                {projectsByProducer(projects, myProducer).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.projectName} — {p.address}</option>
                ))}
              </select>
            </label>
            <input readOnly className="border p-2 w-full rounded bg-gray-100" value={ntForm.address} placeholder="Διεύθυνση" />
            <input readOnly className="border p-2 w-full rounded bg-gray-100" value={ntForm.unit} placeholder="Μονάδα" />
            <input readOnly className="border p-2 w-full rounded bg-gray-100" value={ntForm.transporter} placeholder="Μεταφορέας" />
            <div className="flex gap-2">
              <button className="flex-1 bg-gray-200 text-gray-800 px-3 py-2 rounded" onClick={() => setShow(false)}>Άκυρο</button>
              <button className="flex-1 bg-green-600 text-white px-3 py-2 rounded" onClick={() => {
                const proj = A(projects).find((p: any) => p.id === ntProjectId);
                if (!proj) return;
                onRequest && onRequest(proj);
                setShow(false); setNtProjectId(''); setNtForm({ address: '', unit: '', transporter: '' }); setTab('requests');
              }}>Αίτημα</button>
            </div>
          </div>
        ) : (
          <>
            {tab === 'requests' && (
              <div className="p-3 space-y-3">
                {/* Segmented filter */}
                <div className="flex items-center justify-center">
                  <div className="inline-flex bg-gray-100 p-1 rounded-full shadow-inner">
                    <button onClick={() => setReqFilter('all')} className={`px-3 py-1.5 rounded-full text-sm ${reqFilter==='all' ? 'bg-white shadow' : 'text-gray-600'}`}>Όλα</button>
                    <button onClick={() => setReqFilter('carrier')} className={`px-3 py-1.5 rounded-full text-sm ${reqFilter==='carrier' ? 'bg-white shadow' : 'text-gray-600'}`}>Μεταφορέα</button>
                    <button onClick={() => setReqFilter('producer')} className={`px-3 py-1.5 rounded-full text-sm ${reqFilter==='producer' ? 'bg-white shadow' : 'text-gray-600'}`}>Παραγωγού</button>
                  </div>
                </div>

                {/* Unified list */}
                {(() => {
                  const combined = [...A(carrierReq), ...A(producerReq)]
                    .filter((t: any) => reqFilter === 'all' ? true : reqFilter === 'producer' ? !!t.fromProducer : !t.fromProducer)
                    .sort((a: any, b: any) => {
                      const da = new Date(a.date || 0).getTime();
                      const db = new Date(b.date || 0).getTime();
                      return db - da;
                    });
                  if (combined.length === 0) return <div className="text-center text-gray-400 text-sm">—</div>;
                  return combined.map((t: any) => {
                    const bg = t.fromProducer ? 'bg-indigo-50' : 'bg-blue-50';
                    const pr = A(projects).find((p: any) => p.id === t.projectId);
                    const statusText = t.fromProducer ? `Αναμονή αποδοχής από ${pr?.transporter || 'μεταφορέα'}` : '';
                    return (
                      <div key={t.id} className={`border rounded-lg p-3 shadow-sm text-sm ${bg}`}>
                        <div className="flex items-center justify-between">
                          <div className="font-semibold truncate">{t.project}</div>
                          <div className="text-xs text-gray-500">{fmt(t.date)}</div>
                        </div>
                        <div className="text-xs text-gray-600 truncate">{t.address}</div>
                        <div className="mt-2 flex items-center justify-between">
                          {statusText ? (
                            <span className="text-xs text-blue-700">{statusText}</span>
                          ) : (<span />)}
                          <div className="flex items-center gap-2">
                            {t.fromProducer ? (
                              <></>
                            ) : (
                              <>
                                <Btn className="bg-green-600 text-white" onClick={() => onApprove && onApprove(t.id)}>Αποδοχή</Btn>
                                <Btn className="bg-red-600 text-white" onClick={() => onReject && onReject(t.id)}>Απόρριψη</Btn>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {tab === 'transfers' && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm px-3">Μεταφορές</h3>
                <MobileTransfersProducer
                  open={open}
                  done={done}
                  onPreviewPdf={(t: any) => setPdfPreview(pdfTransferDataUrl(t))}
                />
              </div>
            )}

            {tab === 'projects' && (
              <div className="p-3 space-y-2">
                <h3 className="font-semibold text-sm mb-1">Έργα</h3>
                {projectsByProducer(projects, myProducer).map((p: any) => (
                  <div key={p.id} className="mobile-card p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold truncate">{p.projectName}</div>
                      {/* Ημερομηνίες κρυμμένες στο mobile έργα */}
                    </div>
                    <div className="text-xs text-gray-600 truncate">{p.address}</div>
                    {/* Μεταφορέας γραμμή πάνω από τη μονάδα, με το κουμπί Αίτημα δίπλα */}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs">Μεταφορέας: <span className="font-medium">{p.transporter}</span></span>
                      <button onClick={() => { setNtProjectId(p.id); setNtForm({ address: p.address || '', unit: p.unit || '', transporter: p.transporter || '' }); setShow(true); }} className="px-2 py-1 rounded bg-green-600 text-white text-xs">Αίτημα</button>
                    </div>
                    <div className="text-xs mt-1">Μονάδα: <span className="font-medium">{p.unit}</span></div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom nav */}
      {!show && (
        <div className="mobile-nav safe-bottom relative">
          <div className="flex items-center gap-2 max-w-[380px] mx-auto p-2">
            <button onClick={() => setTab('requests')} aria-pressed={tab==='requests'} aria-label="Αιτήματα" className={`mobile-pressable relative flex-1 flex items-center justify-center rounded-xl py-2 ${tab==='requests' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'}`}>
              <Inbox className="w-5 h-5" />
              {(producerReq.length + carrierReq.length) > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full min-w-[16px] h-4 leading-4 px-1 text-center">{producerReq.length + carrierReq.length}</span>
              )}
            </button>
            <button onClick={() => setTab('projects')} aria-pressed={tab==='projects'} aria-label="Έργα" className={`mobile-pressable relative flex-[1.6] flex items-center justify-center rounded-2xl py-3 shadow-2xl ${tab==='projects' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'}`}>
              <FileText className="w-6 h-6" />
            </button>
            <button onClick={() => setTab('transfers')} aria-pressed={tab==='transfers'} aria-label="Μεταφορές" className={`mobile-pressable relative flex-1 flex items-center justify-center rounded-xl py-2 ${tab==='transfers' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'}`}>
              <Truck className="w-5 h-5" />
              {open.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full min-w-[16px] h-4 leading-4 px-1 text-center">{open.length}</span>
              )}
            </button>
          </div>
          {/* Floating action for new request */}
          <div className="absolute right-4 -top-10 md:-top-20">
            <button onClick={() => setShow(true)} aria-label="Νέα Μεταφορά" className="rounded-full bg-green-600 text-white w-14 h-14 flex items-center justify-center fab-shadow mobile-pressable transition-all duration-300 ease-out hover:scale-105 active:scale-95">+</button>
          </div>
        </div>
      )}

      {pdfPreview && (
        <div className="absolute inset-0 z-50 bg-white p-3 overflow-auto animate-in">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Προεπισκόπηση PDF</div>
            <button onClick={() => setPdfPreview(null)} className="px-2 py-1 rounded bg-gray-100">✕</button>
          </div>
          <div style={{ height: 'calc(100% - 88px)' }} className="border">
            <iframe src={pdfPreview || undefined} className="w-full h-full" />
          </div>
          <div className="flex justify-end mt-3">
            <a href={pdfPreview || undefined} target="_blank" rel="noreferrer" className="px-3 py-2 bg-green-600 text-white rounded">Άνοιγμα σε νέα καρτέλα</a>
          </div>
        </div>
      )}
    </div>
  );
}

function EcoApp({ projects, transports, onAddTransport, notifications, onJump, onAcceptRequest, addNotif, onFinalizeDelivery }: any) {
  // accept deepLink prop if passed via wrapper
  const deepLink = (arguments[0] as any).deepLink;
  const [tab, setTab] = useState('transfers');
  const [show, setShow] = useState(false);
  const [producer, setProducer] = useState('');
  const [project, setProject] = useState('');
  const [unit, setUnit] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [time, setTime] = useState('08:00');
  const [mDate, setMDate] = useState(today());
  const [mAddress, setMAddress] = useState('');
  const [mManagerName, setMManagerName] = useState('');
  const [mManagerPhone, setMManagerPhone] = useState('');
  const [showNoSignInfo, setShowNoSignInfo] = useState(false);
  const infoRef = React.useRef<any>(null);
  const [tooltipAbove, setTooltipAbove] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  React.useEffect(() => {
    if (!showNoSignInfo) return;
    // decide whether to show tooltip above or below based on space
    try {
      const el = infoRef.current as HTMLElement | null;
      if (!el) return setTooltipAbove(false);
      const rect = el.getBoundingClientRect();
      // if distance from top is larger than 160px, show above, else below
      setTooltipAbove(rect.top > 160);
    } catch (e) {
      setTooltipAbove(false);
    }
  }, [showNoSignInfo]);

  const VEH = ['ΚΥΧ1234', 'ΑΑΖ5678', 'ΒΒΚ4321', 'ΝΟΠ9988'];
  const req = A(transports).filter((t: any) => !t.approvedByProducer && !t.receivedByUnit);
  const producerReq = req.filter((t: any) => t.fromProducer);
  const carrierReq = req.filter((t: any) => !t.fromProducer);
  const open = A(transports).filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit);
  const delivery = A(transports).filter((t: any) => !!t.deliveredToUnit && !t.receivedByUnit);
  const done = A(transports).filter((t: any) => t.receivedByUnit);
  const [mobileSignModal, setMobileSignModal] = useState<any>({ open: false, row: null, vehicle: '', date: today(), time: '08:00', producerSignature: '', transporterSignature: '', step: 1 });
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [deliverySignModal, setDeliverySignModal] = useState<any>({ open: false, row: null, unitSignature: '' });
  const [reqFilter, setReqFilter] = useState<'all' | 'carrier' | 'producer'>('all');
  const myTransporter = 'Euroskip';
  const tProjects = A(projects).filter((p: any) => p.transporter === myTransporter);
  // track first-visit highlighting for new projects in Projects tab
  const [seenProjectIds, setSeenProjectIds] = useState<Record<string, boolean>>({});
  React.useEffect(() => {
    if (tab !== 'projects') return;
    // once user visits projects tab, mark current new projects as seen (after showing them once)
    const updates: Record<string, boolean> = {};
    A(tProjects).filter((p: any) => p.isNew).forEach((p: any) => { updates[p.id] = true; });
    if (Object.keys(updates).length) setSeenProjectIds(prev => ({ ...prev, ...updates }));
  }, [tab, tProjects]);

  const handleNew = () => {
    if (!producer || !project || !unit || !vehicle) return;
    const pr = A(projects).find((p: any) => p.producer === producer && p.projectName === project);
    onAddTransport({ id: gid(), producer, project, projectId: pr?.id, address: pr?.address || '-', unit, vehicle, date: mDate || today(), time, managerName: pr?.managerName || '', managerPhone: pr?.managerPhone || '', status: 'Αναμονή αποδοχής παραγωγού', approvedByProducer: false, receivedByUnit: false, fromProducer: false, isNew: true });
    addNotif && addNotif('Νέο Αίτημα Μεταφοράς (Μεταφορέα)', `${producer} / ${project}`, { page: 'producer', tab: 'aitimata' });
    // After creating via 'Αίτημα', navigate to Requests tab
    setTab('requests');
    setShow(false); setProducer(''); setProject(''); setUnit(''); setVehicle(''); setMDate(today()); setMAddress(''); setMManagerName(''); setMManagerPhone('');
  };

  const handleNewWithSign = () => {
    if (!producer || !project || !unit || !vehicle) return;
    const pr = A(projects).find((p: any) => p.producer === producer && p.projectName === project);
    const t = { id: gid(), producer, project, projectId: pr?.id, address: pr?.address || '-', unit, vehicle, date: mDate || today(), time, managerName: pr?.managerName || '', managerPhone: pr?.managerPhone || '', status: 'Αναμονή αποδοχής παραγωγού', approvedByProducer: false, receivedByUnit: false, fromProducer: false, isNew: true };
    onAddTransport(t);
    addNotif && addNotif('Νέο Αίτημα Μεταφοράς (Μεταφορέα)', `${producer} / ${project}`, { page: 'producer', tab: 'aitimata' });
  // switch to Transfers tab (open) on mobile so user sees the created transport
  setTab('transfers');
    // open signature page (step 2) for the newly created request
    setShow(false); setProducer(''); setProject(''); setUnit(''); setVehicle(''); setMDate(today()); setMAddress(''); setMManagerName(''); setMManagerPhone('');
    setMobileSignModal({ open: true, row: t, vehicle: t.vehicle || VEH[0], date: t.date, time: t.time, step: 2, producerSignature: '', transporterSignature: '', projectInfo: pr });
  };

  return (
    <>
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Mobile header */}
      <div className="mobile-header safe-top px-4 py-3">
        <div className="relative flex items-center">
          <div className="absolute left-1/2 -translate-x-1/2 text-base font-semibold tracking-wide">IWM</div>
          <div className="ml-auto relative">
            <button
              aria-label="Μενού"
              className="p-2 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors"
              onClick={() => setMenuOpen(v => !v)}
            >
              <Menu className="w-6 h-6" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow z-50 py-1">
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>Προφίλ</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>Ρυθμίσεις</button>
                <div className="my-1 border-t" />
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setTab('transfers'); setMenuOpen(false); }}>Μεταφορές</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setTab('requests'); setMenuOpen(false); }}>Αιτήματα</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setTab('projects'); setMenuOpen(false); }}>Έργα</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setTab('notifications'); setMenuOpen(false); }}>Ειδοποιήσεις</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {menuOpen && (
        <div className="absolute inset-0 z-40" onClick={() => setMenuOpen(false)} />
      )}

      {/* toast */}
      {showToast && (
        <div className="absolute top-12 right-4 z-50 bg-black text-white text-sm px-3 py-2 rounded shadow">Νέα μεταφορά καταχωρήθηκε</div>
      )}

      <div className="flex-1 overflow-auto">
        {/* Mobile app: only Transfers page is shown in this mode */}

        {show && (
          <div className="p-4 space-y-3 animate-in">
            <div className="flex items-center justify-between mb-2">
              <button className="text-blue-700" onClick={() => setShow(false)}>‹ Πίσω</button>
              <div className="font-semibold">Νέα Μεταφορά</div>
              <div style={{ width: 40 }} />
            </div>
            <select value={producer} onChange={(e: any) => { setProducer(e.target.value); setProject(''); setUnit(''); }} className="border p-1 w-full rounded">
              <option value="">Επιλογή Παραγωγού</option>
              {[...new Set(A(projects).map((p: any) => p.producer))].map((p: string) => (<option key={p} value={p}>{p}</option>))}
            </select>
            <select value={project} onChange={(e: any) => {
              const val = e.target.value;
              setProject(val);
              const pr = A(projects).find((x: any) => x.producer === producer && x.projectName === val);
              const u = pr?.unit;
              setUnit(u || '');
              setMAddress(pr?.address || '');
              setMManagerName(pr?.managerName || '');
              setMManagerPhone(pr?.managerPhone || '');
            }} className="border p-1 w-full rounded">
              <option value="">Επιλογή Έργου</option>
              {A(projects).filter((p: any) => p.producer === producer).map((pr: any) => (<option key={pr.id} value={pr.projectName}>{pr.projectName}</option>))}
            </select>
            <input value={mAddress} readOnly placeholder="Διεύθυνση" className="border p-1 w-full rounded bg-gray-100" />
            <input value={unit} readOnly placeholder="Μονάδα" className="border p-1 w-full rounded bg-gray-100" />
            <input value={mManagerName} readOnly placeholder="Υπεύθυνος" className="border p-1 w-full rounded bg-gray-100" />
            <input value={mManagerPhone} readOnly placeholder="Τηλέφωνο" className="border p-1 w-full rounded bg-gray-100" />
            <select value={vehicle} onChange={(e: any) => setVehicle(e.target.value)} className="border p-1 w-full rounded">
              <option value="">Επιλογή Οχήματος</option>
              {['ΚΥΧ1234', 'ΑΑΖ5678', 'ΒΒΚ4321', 'ΝΟΠ9988'].map((v: string) => (<option key={v} value={v}>{v}</option>))}
            </select>
            <input type="date" value={mDate} readOnly className="border p-1 w-full rounded bg-gray-100" />
            <input type="time" value={time} readOnly className="border p-1 w-full rounded bg-gray-100" />
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <button onClick={() => { handleNew(); setShowToast(true); setTimeout(() => setShowToast(false), 1800); }} className="w-full bg-gray-200 text-gray-800 px-3 py-2 rounded text-sm text-left">Αίτημα</button>
                <button ref={infoRef} title="Περισσότερα" className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-yellow-100 border text-yellow-700 flex items-center justify-center text-xs" onClick={() => setShowNoSignInfo((s: any) => !s)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 18h.01" /></svg>
                </button>
                {showNoSignInfo && (
                  <div className={"absolute left-0 w-64 bg-white border rounded p-2 text-sm shadow animate-in " + (tooltipAbove ? ' -bottom-28' : ' mt-12')} style={tooltipAbove ? { bottom: '3.5rem' } : {}}>
                    <div className="mb-2">(Σε περίπτωση που γινει αποδεκτο το έντυπο μόνο με αποδοχη εντός της πλατφορμας)</div>
                    <div className="flex gap-2">
                      <button onClick={() => { handleNew(); setShowNoSignInfo(false); }} className="flex-1 bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm">Καταχώρηση</button>
                      <button onClick={() => setShowNoSignInfo(false)} className="flex-1 bg-white border text-gray-700 px-2 py-1 rounded text-sm">Άκυρο</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="w-36">
                <button onClick={handleNewWithSign} className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm">Υπογραφή</button>
              </div>
            </div>
          </div>
        )}

        {mobileSignModal.open && (
          <div className="absolute inset-0 bg-white z-40 overflow-auto p-4 flex flex-col">
            {/* Header with Back */}
            <div className="flex items-center justify-between mb-3">
              <button className="text-blue-700" onClick={() => {
                if (mobileSignModal.step === 1) return setMobileSignModal({ open: false, row: null, vehicle: '', date: today(), time: '08:00', step: 1, producerSignature: '', transporterSignature: '', projectInfo: null });
                setMobileSignModal((m: any) => ({ ...m, step: 1 }));
              }}>‹ Πίσω</button>
              <div className="font-semibold">{mobileSignModal.step === 1 ? 'Αποδοχή Αιτήματος Παραγωγού' : 'Υπογραφές Αποδοχής'}</div>
              <div style={{ width: 48 }} />
            </div>

            {mobileSignModal.step === 1 ? (
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="col-span-2 font-semibold">Στοιχεία έργου</div>
                  <div>Παραγωγός: <span className="font-semibold">{mobileSignModal.row?.producer}</span></div>
                  <div>Έργο: <span className="font-semibold">{mobileSignModal.row?.project}</span></div>
                  <div className="col-span-2">Διεύθυνση: <span className="font-semibold">{mobileSignModal.row?.address}</span></div>
                  <div>Μονάδα: <span className="font-semibold">{mobileSignModal.row?.unit}</span></div>
                  <div>Υπεύθυνος: <span className="font-semibold">{mobileSignModal.projectInfo?.managerName || '-'}</span></div>
                  <div>Τηλέφωνο: <span className="font-semibold">{mobileSignModal.projectInfo?.managerPhone || '-'}</span></div>
                  <div className="col-span-2 border-t pt-2 font-semibold">Προγραμματισμός</div>
                  <label>Ημ/νία
                    <input type="date" className="border p-1 w-full bg-gray-100" value={mobileSignModal.date} readOnly />
                  </label>
                  <label>Ώρα
                    <input type="time" className="border p-1 w-full bg-gray-100" value={mobileSignModal.time} readOnly />
                  </label>
                  <label className="col-span-2">Όχημα
                    <select className="border p-1 w-full" value={mobileSignModal.vehicle} onChange={(e: any) => setMobileSignModal((m: any) => ({ ...m, vehicle: e.target.value }))}>
                      {plates().map((pl: string) => (<option key={pl} value={pl}>{pl}</option>))}
                    </select>
                  </label>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <div className="text-sm mb-2">Σχεδιάστε τις υπογραφές στα παρακάτω πεδία.</div>
                <div className="mb-3">
                  <div className="text-xs mb-1">Υπογραφή Παραγωγού (Υπεύθυνος παράδοσης)</div>
                  <div className="border p-2 rounded bg-white">
                    <SignaturePad value={mobileSignModal.producerSignature} onChange={(v: any) => setMobileSignModal((m: any) => ({ ...m, producerSignature: v }))} className="h-36" />
                  </div>
                </div>
                <div>
                  <div className="text-xs mb-1">Υπογραφή Μεταφορέα (Οδηγός)</div>
                  <div className="border p-2 rounded bg-white">
                    <SignaturePad value={mobileSignModal.transporterSignature} onChange={(v: any) => setMobileSignModal((m: any) => ({ ...m, transporterSignature: v }))} className="h-36" />
                  </div>
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="pt-3">
              {mobileSignModal.step === 1 ? (
                <div className="flex gap-2">
                  <button className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded" onClick={() => setMobileSignModal({ open: false, row: null, vehicle: '', date: today(), time: '08:00', step: 1, producerSignature: '', transporterSignature: '', projectInfo: null })}>Άκυρο</button>
                  <button className="flex-1 bg-blue-600 text-white px-3 py-2 rounded" onClick={() => {
                    if (!mobileSignModal.vehicle) return alert('Επιλέξτε όχημα πριν προχωρήσετε');
                    setMobileSignModal((m: any) => ({ ...m, step: 2 }));
                  }}>Συνέχεια</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded" onClick={() => setMobileSignModal((m: any) => ({ ...m, step: 1 }))}>Πίσω</button>
                  <button className="flex-1 bg-green-600 text-white px-3 py-2 rounded" onClick={() => {
                    if (!mobileSignModal.row) return;
                    if (!mobileSignModal.producerSignature || !mobileSignModal.transporterSignature) return alert('Απαιτούνται και οι δύο υπογραφές');
                    onAcceptRequest(mobileSignModal.row, { vehicle: mobileSignModal.vehicle, date: mobileSignModal.date, time: mobileSignModal.time, producerSignature: mobileSignModal.producerSignature, transporterSignature: mobileSignModal.transporterSignature });
                    // switch to Transfers tab in mobile view so the user sees the updated transport
                    setTab('transfers');
                    setMobileSignModal({ open: false, row: null, vehicle: '', date: today(), time: '08:00', producerSignature: '', transporterSignature: '', step: 1 });
                  }}>Ολοκλήρωση</button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'transfers' && !show && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm px-3">Μεταφορές</h3>
            <MobileTransfers
              open={open}
              delivery={delivery}
              done={done}
              projects={projects}
              onPreviewPdf={(t: any) => setPdfPreview(pdfTransferDataUrl(t))}
              onCreateNew={() => setShow(true)}
              onOpenDeliverySign={(row: any) => setDeliverySignModal({ open: true, row, unitSignature: '' })}
            />
          </div>
        )}

        {tab === 'requests' && !show && (
          <div className="p-3 space-y-3">
            <h3 className="font-semibold text-sm">Αιτήματα</h3>
            {/* Segmented filter (Όλα / Μεταφορέα / Παραγωγού) */}
            <div className="flex items-center justify-center">
              <div className="inline-flex bg-gray-100 p-1 rounded-full shadow-inner">
                <button onClick={() => setReqFilter('all')} className={`px-3 py-1.5 rounded-full text-sm ${reqFilter==='all' ? 'bg-white shadow' : 'text-gray-600'}`}>Όλα</button>
                <button onClick={() => setReqFilter('carrier')} className={`px-3 py-1.5 rounded-full text-sm ${reqFilter==='carrier' ? 'bg-white shadow' : 'text-gray-600'}`}>Μεταφορέα</button>
                <button onClick={() => setReqFilter('producer')} className={`px-3 py-1.5 rounded-full text-sm ${reqFilter==='producer' ? 'bg-white shadow' : 'text-gray-600'}`}>Παραγωγού</button>
              </div>
            </div>

            {/* Unified list */}
            {(() => {
              const combined = [...A(carrierReq), ...A(producerReq)]
                .filter((t: any) => reqFilter === 'all' ? true : reqFilter === 'producer' ? !!t.fromProducer : !t.fromProducer)
                .sort((a: any, b: any) => {
                  const da = new Date(a.date || 0).getTime();
                  const db = new Date(b.date || 0).getTime();
                  return db - da;
                });
              if (combined.length === 0) return <div className="text-center text-gray-400 text-sm">—</div>;
              return combined.map((t: any) => {
                const bg = t.fromProducer ? 'bg-indigo-50' : 'bg-blue-50';
                return (
                  <div key={t.id} className={`border rounded-lg p-3 shadow-sm text-sm ${bg}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold truncate">{t.producer} — {t.project}</div>
                      <div className="text-xs text-gray-500">{fmt(t.date)}</div>
                    </div>
                    <div className="text-xs text-gray-600 truncate">{t.address}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-blue-700">{t.status}</span>
                      <div className="flex items-center gap-2">
                        {t.fromProducer ? (
                          <button className="px-2 py-1 rounded bg-green-600 text-white text-xs" onClick={() => {
                            const pr = A(projects).find((p: any) => p.id === t.projectId);
                            setMobileSignModal({ open: true, row: t, vehicle: plates()[0], date: t.date || today(), time: t.time || '08:00', projectInfo: pr, step: 1, producerSignature: '', transporterSignature: '' });
                          }}>Αποδοχή</button>
                        ) : (
                          <></>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {tab === 'projects' && !show && (
          <div className="p-4 space-y-3">
            <h2 className="font-bold text-lg mb-2">Έργα</h2>
            {A(tProjects).length === 0 ? (
              <div className="text-center text-gray-400 py-6">—</div>
            ) : (
              A(tProjects).map((p: any) => {
                const showNew = !!p.isNew && !seenProjectIds[p.id];
                const estTons = (typeof p.estimated === 'number' ? p.estimated : (p.estimated ?? sumWaste(p.wasteLines))) || 0;
                const totalTrips = Math.max(1, Math.ceil(estTons / 7));
                const doneTrips = A(transports).filter((t: any) => (t.projectId === p.id || t.project === p.projectName) && t.receivedByUnit).length;
                return (
                <div key={p.id} className={`mobile-card p-3 w-full text-left transition-all ${showNew ? 'bg-green-50 ring-1 ring-green-300' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-sm truncate">Παραγωγός: <span className="font-medium">{p.producer}</span></div>
                    {showNew && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-600 text-white">NEW</span>}
                    <button
                      aria-label="Νέα Μεταφορά"
                      title="Νέα Μεταφορά"
                      className="p-1.5 rounded-full bg-green-600 text-white hover:bg-green-700 active:bg-green-800"
                      onClick={() => {
                        // Prefill new transfer form with this project's details
                        setProducer(p.producer);
                        setProject(p.projectName);
                        setUnit(p.unit || '');
                        setMAddress(p.address || '');
                        setMManagerName(p.managerName || '');
                        setMManagerPhone(p.managerPhone || '');
                        setVehicle('');
                        setShow(true);
                      }}
                    >
                      <Truck className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-700 truncate"><span className="text-gray-500">Έργο:</span> <span className="font-medium">{p.projectName}</span></div>
                  <div className="text-xs text-blue-700 underline truncate cursor-pointer" onClick={() => { /* reserved for future: open maps */ }}>
                    <span className="text-gray-500">Διεύθυνση:</span> {p.address}
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[11px] text-gray-700 mb-1">
                      <span className="text-gray-500">Μεταφορές</span>
                      <span className="font-medium">{doneTrips}/{totalTrips}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-green-600 rounded" style={{ width: `${Math.min(100, Math.round((doneTrips / totalTrips) * 100))}%` }} />
                    </div>
                  </div>
                </div>
              );})
            )}
          </div>
        )}

        {tab === 'notifications' && !show && (
          <div className="p-4 space-y-3">
            <h2 className="font-bold text-lg mb-2">Ειδοποιήσεις</h2>
            {A(notifications).filter((n: any) => n.target?.page === 'transporter').length === 0 ? (
              <div className="text-center text-gray-400 py-6">Καμία ειδοποίηση</div>
            ) : (
              A(notifications).filter((n: any) => n.target?.page === 'transporter').map((n: any) => (
                <div key={n.id} className={`mobile-card p-3 text-sm ${n.read ? 'bg-gray-50' : 'bg-blue-50'}`}>
                  <div className="font-semibold">{n.title}</div>
                  <div className="text-xs text-gray-600">{n.body}</div>
                  <div className="text-right mt-2">
                    <button className="px-2 py-1 rounded bg-blue-600 text-white text-xs" onClick={() => onJump && onJump(n.id)}>Μετάβαση</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom navigation: Αιτήματα (αριστερά), Μεταφορές (κέντρο μεγάλο), Μονάδες (δεξιά) */}
      {!show && (
      <div className="mobile-nav safe-bottom relative">
        <div className="flex items-center gap-2 max-w-[380px] mx-auto p-2">
          <button
            onClick={() => setTab('requests')}
            aria-pressed={tab==='requests'}
            aria-label="Αιτήματα"
            className={`mobile-pressable relative flex-1 flex items-center justify-center rounded-xl py-2 ${tab==='requests' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'}`}
          >
            <Inbox className="w-5 h-5" />
            {(producerReq.length + carrierReq.length) > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full min-w-[16px] h-4 leading-4 px-1 text-center">
                {producerReq.length + carrierReq.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('transfers')}
            aria-pressed={tab==='transfers'}
            aria-label="Μεταφορές"
            className={`mobile-pressable relative flex-[1.6] flex items-center justify-center rounded-2xl py-3 shadow-2xl ${tab==='transfers' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'}`}
          >
            <Truck className="w-6 h-6" />
            {open.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full min-w-[16px] h-4 leading-4 px-1 text-center">
                {open.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('projects')}
            aria-pressed={tab==='projects'}
            aria-label="Έργα"
            className={`mobile-pressable relative flex-1 flex items-center justify-center rounded-xl py-2 ${tab==='projects' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'}`}
          >
            <FileText className="w-5 h-5" />
            {A(tProjects).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full min-w-[16px] h-4 leading-4 px-1 text-center">
                {A(tProjects).length}
              </span>
            )}
          </button>
        </div>
        {/* Floating action button (moved slightly higher and smoother) */}
        <div className="absolute right-4 -top-10 md:-top-20">
          <button
            onClick={() => setShow((v:any)=>!v)}
            aria-label="Νέα Μεταφορά"
            className="rounded-full bg-green-600 text-white w-14 h-14 flex items-center justify-center fab-shadow mobile-pressable transition-all duration-300 ease-out hover:scale-105 active:scale-95"
            style={{ willChange: 'transform' }}
          >
            +
          </button>
        </div>
      </div>
      )}
    </div>
    {deliverySignModal.open && (
      <div className="absolute inset-0 bg-white z-40 overflow-auto p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <button className="text-blue-700" onClick={() => setDeliverySignModal({ open: false, row: null, unitSignature: '' })}>✕ Κλείσιμο</button>
          <div className="font-semibold">Τελική Υπογραφή Μονάδας</div>
          <div style={{ width: 48 }} />
        </div>
        <div className="flex-1">
          <div className="text-sm mb-2">Υπογραφή υπευθύνου παραλαβής της μονάδας.</div>
          <div className="border p-2 rounded bg-white">
            <SignaturePad value={deliverySignModal.unitSignature} onChange={(v: any) => setDeliverySignModal((m: any) => ({ ...m, unitSignature: v }))} className="h-36" />
          </div>
        </div>
        <div className="pt-3 flex gap-2">
          <button className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded" onClick={() => setDeliverySignModal({ open: false, row: null, unitSignature: '' })}>Άκυρο</button>
          <button className="flex-1 bg-green-600 text-white px-3 py-2 rounded" onClick={() => {
            if (!deliverySignModal.row) return;
            if (!deliverySignModal.unitSignature) return alert('Απαιτείται υπογραφή μονάδας');
            onFinalizeDelivery && onFinalizeDelivery(deliverySignModal.row.id, deliverySignModal.unitSignature);
            setDeliverySignModal({ open: false, row: null, unitSignature: '' });
          }}>Ολοκλήρωση</button>
        </div>
      </div>
    )}
    {pdfPreview && (CONFIG.PDF_OVERLAY_IN_APP ? (
      <div className="absolute inset-0 z-50 bg-white p-3 overflow-auto animate-in">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Προεπισκόπηση PDF</div>
          <button onClick={() => setPdfPreview(null)} className="px-2 py-1 rounded bg-gray-100">✕</button>
        </div>
        <div style={{ height: 'calc(100% - 88px)' }} className="border">
          <iframe src={pdfPreview || undefined} className="w-full h-full" />
        </div>
        <div className="flex justify-end mt-3">
          <a href={pdfPreview || undefined} target="_blank" rel="noreferrer" className="px-3 py-2 bg-green-600 text-white rounded">Άνοιγμα σε νέα καρτέλα</a>
        </div>
      </div>
    ) : (
      <Modal title="Προεπισκόπηση PDF" onClose={() => setPdfPreview(null)}>
        <div className="border" style={{ height: 600 }}>
          <iframe src={pdfPreview || undefined} className="w-full h-full" />
        </div>
        <div className="flex justify-end mt-3">
          <a href={pdfPreview || undefined} target="_blank" rel="noreferrer" className="px-3 py-2 bg-green-600 text-white rounded">Άνοιγμα σε νέα καρτέλα</a>
        </div>
      </Modal>
    ))}
    </>
  );
}

function MobileTransfers({ open, delivery = [], done, onPreviewPdf, projects, onCreateNew, onOpenDeliverySign }: any) {
  const [subTab, setSubTab] = useState('open');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // filters state for completed transfers
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fUnit, setFUnit] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fProducer, setFProducer] = useState('');
  const [fProject, setFProject] = useState('');
  const producers = Array.from(new Set((projects || []).map((p: any) => p.producer)));
  const projectsForProducer = (projects || []).filter((p: any) => !fProducer || p.producer === fProducer);
  // Apply filters to both open and done lists
  const filteredOpen = open.filter((t: any) => {
    if (fUnit && t.unit !== fUnit) return false;
    if (fFrom && t.date && t.date < fFrom) return false;
    if (fTo && t.date && t.date > fTo) return false;
    if (fProducer && t.producer !== fProducer) return false;
    if (fProject && t.projectId && t.projectId !== fProject) return false;
    return true;
  });
  const filteredDone = done.filter((t: any) => {
    if (fUnit && t.unit !== fUnit) return false;
    if (fFrom && t.unitDate && t.unitDate < fFrom) return false;
    if (fTo && t.unitDate && t.unitDate > fTo) return false;
    if (fProducer && t.producer !== fProducer) return false;
    if (fProject && t.projectId && t.projectId !== fProject) return false;
    return true;
  });
  const filteredDelivery = A(delivery).filter((t: any) => {
    if (fUnit && t.unit !== fUnit) return false;
    if (fFrom && t.unitDate && t.unitDate < fFrom) return false;
    if (fTo && t.unitDate && t.unitDate > fTo) return false;
    if (fProducer && t.producer !== fProducer) return false;
    if (fProject && t.projectId && t.projectId !== fProject) return false;
    return true;
  });
  return (
    <div className="p-3 space-y-3">
      {/* Segmented subtabs: centered with a filter icon aligned to the right */}
      <div className="relative flex items-center justify-center">
        <div className="inline-flex bg-gray-100 p-1 rounded-full shadow-inner">
          <button
            onClick={() => setSubTab('open')}
            className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 ${subTab==='open' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Ανοιχτές
            {filteredOpen.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center bg-blue-600 text-white text-[10px] rounded-full min-w-[16px] h-4 leading-4 px-1">{filteredOpen.length}</span>
            )}
          </button>
          <button
            onClick={() => setSubTab('delivery')}
            className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 ${subTab==='delivery' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Παράδοση
            {filteredDelivery.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center bg-blue-600 text-white text-[10px] rounded-full min-w-[16px] h-4 leading-4 px-1">{filteredDelivery.length}</span>
            )}
          </button>
          <button
            onClick={() => setSubTab('done')}
            className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 ${subTab==='done' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Ολοκληρωμένες
            {filteredDone.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center bg-blue-600 text-white text-[10px] rounded-full min-w-[16px] h-4 leading-4 px-1">{filteredDone.length}</span>
            )}
          </button>
        </div>
        <button
          aria-label="Φίλτρα"
          onClick={() => setFiltersOpen(true)}
          className="absolute -right-2 p-2 rounded-full border bg-white text-gray-700 hover:bg-gray-50 active:scale-95 transition"
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {subTab === 'open' && (
        <>
          <div className="text-sm text-gray-500">Ενεργές μεταφορές</div>
          {filteredOpen.length === 0 ? (
            <div className="text-center text-gray-400 text-sm">Καμία ενεργή μεταφορά</div>
          ) : (
            filteredOpen.map((t: any) => (
              <div key={t.id} className="mobile-card p-2 text-sm">
                <TruckCSS />
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {t.logo ? (
                      <img src={t.logo} alt={t.producer} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${avatarColor(t.producer || '')}`}>{(t.producer || '').split(' ').map((s: string) => s[0]).slice(0,2).join('')}</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm flex items-center gap-2 truncate">
                        <span className="truncate">{t.producer}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">{fmt(t.date)}{t.time ? ` • ${t.time}` : ''}</div>
                        <div className="ml-2 flex items-center gap-1">
                          <ClickBadge tone="orange" onClick={() => setExpanded(e => ({ ...e, [t.id]: !e[t.id] }))}><span className="truck-anim"><Truck className="w-3 h-3" /></span></ClickBadge>
                          <button onClick={() => onPreviewPdf ? onPreviewPdf(t) : pdfTransfer(t)} title="Open PDF" aria-label="Open PDF" className="p-1 rounded bg-orange-50 text-orange-700"><FileText className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-xs text-gray-600 truncate">Προορισμός: <span className="font-medium">{t.unit}</span></div>
                      <div className="flex items-center gap-2">
                        <ClickBadge tone="green" onClick={() => setExpanded(e => ({ ...e, [t.id]: !e[t.id] }))} className="text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /></ClickBadge>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-blue-700">{t.status}</div>
                    <div className={`grid transition-all duration-300 overflow-hidden ${expanded[t.id] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="min-h-0">
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                        <div className="truncate"><strong>Λεπτομέρειες:</strong></div>
                        <div className="truncate">Όχημα: {t.vehicle || '—'}</div>
                        <div className="truncate">Υπεύθυνος: {t.managerName || '-' } {t.managerPhone ? `(${t.managerPhone})` : ''}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {subTab === 'done' && (
        <>
          <div className="text-sm text-gray-500">Ολοκληρωμένες μεταφορές</div>
          {done.length === 0 ? (
            <div className="text-center text-gray-400 text-sm">—</div>
          ) : (
            filteredDone.map((t: any) => (
              <div key={t.id} className="border rounded-lg p-3 shadow-sm text-sm bg-gray-50">
                <div className="font-semibold">{t.producer} - {t.project}</div>
                <div className="text-xs text-gray-500">{t.unit} • Παραλαβή: {fmt(t.unitDate)}</div>
                <div className="text-xs text-green-700 mt-1">Ολοκληρωμένο <button onClick={() => onPreviewPdf ? onPreviewPdf(t) : pdfTransfer(t)} title="Open PDF" aria-label="Open PDF" className="ml-2 p-1 rounded bg-green-100 text-green-800"><FileText className="w-4 h-4" /></button></div>
              </div>
            ))
          )}
        </>
      )}
      {subTab === 'delivery' && (
        <>
          <div className="text-sm text-gray-500">Παράδοση — αναμονή υπογραφής μονάδας</div>
          {filteredDelivery.length === 0 ? (
            <div className="text-center text-gray-400 text-sm">—</div>
          ) : (
            filteredDelivery.map((t: any) => (
              <div key={t.id} className="border rounded-lg p-3 shadow-sm text-sm bg-white">
                <div className="flex items-center justify-between">
                  <div className="font-semibold truncate">{t.producer} — {t.project}</div>
                  <div className="text-xs text-gray-500">{fmt(t.unitDate)}</div>
                </div>
                <div className="text-xs text-gray-600 truncate">{t.address}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-blue-700">{t.status || 'Παράδοση'}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onPreviewPdf ? onPreviewPdf(t) : pdfTransfer(t)} className="p-1 rounded bg-orange-50 text-orange-700" aria-label="Open PDF"><FileText className="w-4 h-4" /></button>
                    <button onClick={() => onOpenDeliverySign && onOpenDeliverySign(t)} className="px-2 py-1 rounded bg-green-600 text-white text-xs">Υπογραφή</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}
      {filtersOpen && (
        <div className="absolute inset-0 z-50 bg-white p-3 overflow-auto animate-in">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Φίλτρα Ολοκληρωμένων</div>
            <button onClick={() => setFiltersOpen(false)} className="px-2 py-1 rounded bg-gray-100">✕</button>
          </div>
          <div className="space-y-3 p-2">
            <div>
              <label className="text-xs">Μονάδα</label>
              <select className="w-full border p-1 mt-1" value={fUnit} onChange={(e: any) => setFUnit(e.target.value)}>
                <option value="">— Όλες —</option>
                {UNITS.map((u: string) => (<option key={u} value={u}>{u}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs">Από</label>
                <input type="date" className="w-full border p-1 mt-1" value={fFrom} onChange={(e: any) => setFFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs">Έως</label>
                <input type="date" className="w-full border p-1 mt-1" value={fTo} onChange={(e: any) => setFTo(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs">Παραγωγός</label>
              <select className="w-full border p-1 mt-1" value={fProducer} onChange={(e: any) => { setFProducer(e.target.value); setFProject(''); }}>
                <option value="">— Όλοι —</option>
                {(producers as string[]).map((p: string) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            {fProducer && (
              <div>
                <label className="text-xs">Έργο (προαιρετικό)</label>
                <select className="w-full border p-1 mt-1" value={fProject} onChange={(e: any) => setFProject(e.target.value)}>
                  <option value="">— Όλα —</option>
                  {projectsForProducer.map((p: any) => (<option key={p.id} value={p.id}>{p.projectName}</option>))}
                </select>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Btn className="bg-gray-100" onClick={() => { setFUnit(''); setFFrom(''); setFTo(''); setFProducer(''); setFProject(''); setFiltersOpen(false); }}>Επαναφορά</Btn>
              <Btn className="bg-blue-600 text-white" onClick={() => setFiltersOpen(false)}>Εφαρμογή</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Producer-flavored mobile transfers with two subtabs (Open, Done) and similar card styling
function MobileTransfersProducer({ open = [], done = [], onPreviewPdf }: any) {
  const [subTab, setSubTab] = useState('open');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const filteredOpen = A(open);
  const filteredDone = A(done);
  return (
    <div className="p-3 space-y-3">
      {/* Segmented subtabs */}
      <div className="relative flex items-center justify-center">
        <div className="inline-flex bg-gray-100 p-1 rounded-full shadow-inner">
          <button onClick={() => setSubTab('open')} className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 ${subTab==='open' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-800'}`}>
            Ανοιχτές
            {filteredOpen.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center bg-blue-600 text-white text-[10px] rounded-full min-w-[16px] h-4 leading-4 px-1">{filteredOpen.length}</span>
            )}
          </button>
          <button onClick={() => setSubTab('done')} className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 ${subTab==='done' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-800'}`}>
            Ολοκληρωμένες
            {filteredDone.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center bg-blue-600 text-white text-[10px] rounded-full min-w-[16px] h-4 leading-4 px-1">{filteredDone.length}</span>
            )}
          </button>
        </div>
      </div>

      {subTab === 'open' && (
        <>
          <div className="text-sm text-gray-500">Ενεργές μεταφορές</div>
          {filteredOpen.length === 0 ? (
            <div className="text-center text-gray-400 text-sm">Καμία ενεργή μεταφορά</div>
          ) : (
            filteredOpen.map((t: any) => (
              <div key={t.id} className="mobile-card p-2 text-sm">
                <TruckCSS />
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${avatarColor(t.project || '')}`}>{(t.project || '').split(' ').map((s: string) => s[0]).slice(0,2).join('')}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm flex items-center gap-2 truncate">
                        <span className="truncate">{t.project}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">{fmt(t.date)}{t.time ? ` • ${t.time}` : ''}</div>
                        <div className="ml-2 flex items-center gap-1">
                          <ClickBadge tone="orange" onClick={() => setExpanded(e => ({ ...e, [t.id]: !e[t.id] }))}><span className="truck-anim"><Truck className="w-3 h-3" /></span></ClickBadge>
                          <button onClick={() => onPreviewPdf ? onPreviewPdf(t) : pdfTransfer(t)} title="Open PDF" aria-label="Open PDF" className="p-1 rounded bg-orange-50 text-orange-700"><FileText className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-xs text-gray-600 truncate">Προορισμός: <span className="font-medium">{t.unit}</span></div>
                      <div className="flex items-center gap-2">
                        <ClickBadge tone="green" onClick={() => setExpanded(e => ({ ...e, [t.id]: !e[t.id] }))} className="text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /></ClickBadge>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-blue-700">{t.status}</div>
                    <div className={`grid transition-all duration-300 overflow-hidden ${expanded[t.id] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="min-h-0">
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                          <div className="truncate"><strong>Λεπτομέρειες:</strong></div>
                          <div className="truncate">Όχημα: {t.vehicle || '—'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {subTab === 'done' && (
        <>
          <div className="text-sm text-gray-500">Ολοκληρωμένες μεταφορές</div>
          {filteredDone.length === 0 ? (
            <div className="text-center text-gray-400 text-sm">—</div>
          ) : (
            filteredDone.map((t: any) => (
              <div key={t.id} className="border rounded-lg p-3 shadow-sm text-sm bg-gray-50">
                <div className="font-semibold">{t.project}</div>
                <div className="text-xs text-gray-500">Παραλαβή: {fmt(t.unitDate)}</div>
                <div className="text-xs text-green-700 mt-1">Ολοκληρωμένο <button onClick={() => onPreviewPdf ? onPreviewPdf(t) : pdfTransfer(t)} title="Open PDF" aria-label="Open PDF" className="ml-2 p-1 rounded bg-green-100 text-green-800"><FileText className="w-4 h-4" /></button></div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

function MobileRequests({ producerReq = [], carrierReq = [], onAccept, onPreviewPdf }: any) {
  return (
    <div className="p-3 space-y-4">
      <div>
        <h3 className="font-semibold text-sm mb-2">Αιτήματα Παραγωγών</h3>
        {A(producerReq).length === 0 ? (
          <div className="text-center text-gray-400 text-sm">—</div>
        ) : (
          A(producerReq).map((t: any) => (
            <div key={t.id} className="mobile-card p-3 mb-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold truncate">{t.producer} — {t.project}</div>
                <div className="text-xs text-gray-500">{fmt(t.date)}</div>
              </div>
              <div className="text-xs text-gray-600 truncate">{t.address}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-blue-700">{t.status}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => onPreviewPdf ? onPreviewPdf(t) : pdfTransfer(t)} className="p-1 rounded bg-orange-50 text-orange-700" aria-label="Open PDF"><FileText className="w-4 h-4" /></button>
                  <button onClick={() => onAccept && onAccept(t)} className="px-2 py-1 rounded bg-green-600 text-white text-xs">Αποδοχή</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-2">Αιτήματα Μεταφορέα</h3>
        {A(carrierReq).length === 0 ? (
          <div className="text-center text-gray-400 text-sm">—</div>
        ) : (
          A(carrierReq).map((t: any) => (
            <div key={t.id} className="mobile-card p-3 mb-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold truncate">{t.producer} — {t.project}</div>
                <div className="text-xs text-gray-500">{fmt(t.date)}</div>
              </div>
              <div className="text-xs text-gray-600 truncate">{t.address}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-blue-700">{t.status}</span>
                <button onClick={() => onPreviewPdf ? onPreviewPdf(t) : pdfTransfer(t)} className="p-1 rounded bg-orange-50 text-orange-700" aria-label="Open PDF"><FileText className="w-4 h-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/******** app ********/
export default function App() {
  
  const [page, setPage] = useState('producer');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [deepLink, setDeepLink] = useState<any>(null);

  const [producerIdMap, setProducerIdMap] = useState<any>({ 'Παραγωγός Α': 1 });
  const [producerSeqMap, setProducerSeqMap] = useState<any>({ 'Παραγωγός Α': 1 });

  const [projects, setProjects] = useState<any[]>(() => [
    {
      id: gid(),
      producer: 'Παραγωγός Α',
      projectName: 'Ανακαίνιση Κτιρίου',
      address: 'Οδός Ελευθερίας 1',
      unit: 'Latouros',
      transporter: 'Euroskip',
      start: today(),
      end: today(),
      managerName: 'Ιωάννης',
      managerPhone: '6999999999',
      managerEmail: 'ioannis@example.com',
      wasteLines: EKA.map((e, i) => ({ code: e.code, description: e.description, quantity: i % 2 ? '1' : '2' })),
      estimated: 6,
      agreement: '25/1/1',
      agreementDate: today(),
    },
  ]);

  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  const [transports, setTransports] = useState<any[]>(() => [
    { id: gid(), producer: 'Παραγωγός Α', project: 'Ανακαίνιση Κτιρίου', projectId: null, address: 'Οδός Ελευθερίας 1', unit: 'Latouros', vehicle: 'KHO123', date: today(), time: '08:00', status: 'Αναμονή αποδοχής παραγωγού', approvedByProducer: false, receivedByUnit: false, fromProducer: false },
  ]);

  const addNotif = (title: string, body: string, target: any) => setNotifications((prev: any[]) => [{ id: gid(), title, body, read: false, target }, ...prev]);

  const jumpByNotif = (id: string) => {
    setNotifications((prev: any[]) => {
      const found = prev.find((x: any) => x.id === id);
      if (found) {
        setDeepLink(found.target || null);
        if (found.target?.page) setPage(found.target.page);
      }
      return prev.map((n: any) => (n.id === id ? { ...n, read: true } : n));
    });
  };

  // actions
  const addProject = (p: any) => {
    setProducerIdMap((prev: any) => {
      if (prev[p.producer]) return prev;
      const vals = Object.values(prev).map((v: any) => Number(v) || 0);
      const nextId = Math.max(0, ...vals) + 1;
      return { ...prev, [p.producer]: nextId };
    });
    setProjects((prev: any[]) => [...prev, p]);
    // Notify transporter about new project assignment
    try {
      addNotif && addNotif(
        'Νέο Έργο',
        `Ο ${p.producer} σας πρόσθεσε ως μεταφορέα για το έργο "${p.projectName}"`,
        { page: 'transporter', tab: 'notifications', projectId: p.id }
      );
    } catch {}
  };

  const acceptAgreement = (projectId: string) => {
    setProjects((prev: any[]) => prev.map((p: any) => {
      if (p.id !== projectId) return p;
      const pid = producerIdMap[p.producer] ?? 1;
      const current = producerSeqMap[p.producer] ?? 0;
      const next = current + 1;
      setProducerSeqMap((s: any) => ({ ...s, [p.producer]: next }));
      return { ...p, agreement: `${yearYY()}/${pid}/${next}`, agreementDate: today(), isNew: true };
    }));
  };

  const rejectAgreement = (projectId: string) => {
    setProjects((prev: any[]) => prev.map((p: any) => (p.id === projectId ? { ...p, agreement: 'Απορρίφθηκε', agreementDate: today(), isNew: true } : p)));
  };

  const approveTransport = (id: string) => {
  setTransports((prev: any[]) => prev.map((t: any) => (t.id === id ? { ...t, approvedByProducer: true, status: 'Σε πορεία', isNew: true } : t)));
    addNotif('Αίτημα Εγκρίθηκε', 'Έγκριση από Παραγωγό', { page: 'transporter', tab: 'transfers' });
  };
  const rejectTransport = (id: string) => {
    setTransports((prev: any[]) => prev.map((t: any) => (t.id === id ? { ...t, status: 'Απορρίφθηκε από Παραγωγό', isNew: true } : t)));
  };
  const addTransport = (t: any) => setTransports((prev: any[]) => [t, ...prev]);
  const unitReceive = (id: string, weight: number, eka: string) => {
    setTransports((prev: any[]) => {
      let signed = false;
      const next = prev.map((t: any) => {
        if (t.id !== id) return t;
        signed = !!(t.producerSignature && t.transporterSignature);
        const nowTime = new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', hour12: false });
        if (signed) {
          // Signed flow: go to Παράδοση (awaiting final unit signature)
          return {
            ...t,
            deliveredToUnit: true,
            receivedByUnit: false,
            unitDate: today(),
            unitTime: nowTime,
            weight,
            ekaCategory: eka,
            status: 'Παράδοση — αναμονή υπογραφής',
            isNew: true,
          };
        }
        // No signatures (producer-only acceptance): complete directly
        return {
          ...t,
          deliveredToUnit: false,
          receivedByUnit: true,
          unitDate: today(),
          unitTime: nowTime,
          weight,
          ekaCategory: eka,
          status: 'Ολοκληρωμένο',
          isNew: true,
        };
      });
      // Fire appropriate notification based on path
      if (signed) {
        addNotif('Παράδοση στη Μονάδα', 'Αναμονή τελικής υπογραφής', { page: 'transporter', tab: 'transfers' });
      } else {
        addNotif('Ολοκλήρωση Μεταφοράς', 'Η μονάδα παρέλαβε (χωρίς υπογραφές)', { page: 'producer', tab: 'transfers' });
      }
      return next;
    });
  };

  // finalize delivery by unit (capture unit responsible signature)
  const finalizeUnitDelivery = (id: string, unitSignature?: string) => {
    setTransports((prev: any[]) => prev.map((t: any) => (t.id === id ? {
      ...t,
      receivedByUnit: true,
      deliveredToUnit: false,
      unitSignature: unitSignature || t.unitSignature,
      status: 'Ολοκληρωμένο',
      isNew: true,
    } : t)));
    addNotif('Ολοκλήρωση Μεταφοράς', 'Η μονάδα υπέγραψε την παραλαβή', { page: 'producer', tab: 'transfers' });
  };

  // producer → create request
  const requestTransfer = (project: any, requestType?: 'empty-bin' | 'full-pickup') => {
    // Derive a human-friendly status label including the request type when provided
    const status = requestType === 'empty-bin'
      ? 'Αίτηση Παραγωγού — Κενός Κάδος'
      : requestType === 'full-pickup'
        ? 'Αίτηση Παραγωγού — Παραλαβή Γεμάτου'
        : 'Αίτηση Παραγωγού';
    const req = {
      id: gid(),
      producer: project.producer,
      project: project.projectName,
      projectId: project.id,
      address: project.address,
      unit: project.unit,
      vehicle: '',
      date: today(),
      time: '08:00',
      status,
      requestType,
      approvedByProducer: false,
      receivedByUnit: false,
      fromProducer: true,
      isNew: true,
    };
    setTransports((p: any[]) => [req, ...p]);
    addNotif('Νέα Αίτηση Παραγωγού', `${project.producer} / ${project.projectName}`, { page: 'transporter', tab: 'aitimata' });
  };

  // transporter accepts request (web & mobile share this)
  const acceptRequest = (t: any, details?: { vehicle?: string; date?: string; time?: string }) => {
    const { vehicle, date, time } = details || {};
    const v = vehicle || plates()[0];
  // if signatures provided (from mobile flow), persist them on the transport record
  const producerSignature = (details as any)?.producerSignature;
  const transporterSignature = (details as any)?.transporterSignature;
  setTransports((prev: any[]) => prev.map((x: any) => (x.id === t.id ? {
    ...x,
    vehicle: v,
    date: date || x.date,
    time: time || x.time,
    approvedByProducer: true,
    status: 'Σε πορεία',
    isNew: true,
    producerSignature: producerSignature || x.producerSignature,
    transporterSignature: transporterSignature || x.transporterSignature,
  } : x)));
    addNotif('Η αίτηση εγκρίθηκε', `${t.producer} / ${t.project}`, { page: 'unit', tab: 'transfers' });
  };

  // counts
  const prodPending = A(transports).filter((t: any) => !t.approvedByProducer && !t.receivedByUnit).length;
  const transpReq = A(transports).filter((t: any) => !t.approvedByProducer && !t.receivedByUnit).length;
  const unitPend = A(transports).filter((t: any) => t.approvedByProducer && !t.receivedByUnit).length;

  const [transporterMode, setTransporterMode] = useState('web');

  const [producerMode, setProducerMode] = useState('web');
  const [unitMode, setUnitMode] = useState('web');
  return (
    <div className="p-4">
      {CONFIG.SHOW_DEV_BANNER && (
        <div className="mb-3 p-2 rounded text-white bg-red-600 text-center font-semibold">
          DEV HMR TEST — you should see this banner if the app updated
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <Btn className={page === 'producer' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => { setSelectedProject(null); setPage('producer'); }}>Παραγωγός {prodPending > 0 && <span className="ml-1 bg-red-600 text-white rounded-full px-2 text-xs">{prodPending}</span>}</Btn>
          <Btn className={page === 'transporter' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setPage('transporter')}>Μεταφορέας {transpReq > 0 && <span className="ml-1 bg-red-600 text-white rounded-full px-2 text-xs">{transpReq}</span>}</Btn>
          <Btn className={page === 'unit' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setPage('unit')}>Μονάδα {unitPend > 0 && <span className="ml-1 bg-red-600 text-white rounded-full px-2 text-xs">{unitPend}</span>}</Btn>
        </div>
  <BellBtn items={A(notifications).filter((n: any) => n.target?.page === page)} onJump={jumpByNotif} />
      </div>

      {page === 'producer' && (
        <div>
          <div className="flex gap-3 mb-3">
            <Btn className={producerMode === 'web' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setProducerMode('web')}>🌐 Web</Btn>
            <Btn className={producerMode === 'mobile' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setProducerMode('mobile')}>📱 Mobile</Btn>
          </div>
          {producerMode === 'web' ? (
            selectedProject ? (
              <ProjectDetails project={selectedProject} transports={transports} onBack={() => setSelectedProject(null)} onRequestTransfer={requestTransfer} />
            ) : (
              <Producer projects={projects} transports={transports} onAddProject={addProject} onApproveTransport={approveTransport} onRejectTransport={rejectTransport} onOpenProject={(p: any) => setSelectedProject(p)} onRequestTransfer={requestTransfer} notifications={notifications} onJump={jumpByNotif} deepLink={deepLink} />
            )
          ) : (
            <ProducerMobileFrame projects={projects} transports={transports} onApprove={approveTransport} onReject={rejectTransport} onRequest={requestTransfer} notifications={notifications} onJump={jumpByNotif} deepLink={deepLink} />
          )}
        </div>
      )}

      {page === 'transporter' && (
        <div>
          <div className="flex gap-3 mb-3">
            <Btn className={transporterMode === 'web' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setTransporterMode('web')}>🌐 Web</Btn>
            <Btn className={transporterMode === 'mobile' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setTransporterMode('mobile')}>📱 Mobile</Btn>
          </div>
          {transporterMode === 'web' ? (
            <Transporter projects={projects} transports={transports} onAddTransport={addTransport} notifications={notifications} onJump={jumpByNotif} onAcceptRequest={acceptRequest} addNotif={addNotif} deepLink={deepLink} />
          ) : (
            <EcoMobileFrame projects={projects} transports={transports} onAddTransport={addTransport} notifications={notifications} onJump={jumpByNotif} onAcceptRequest={acceptRequest} addNotif={addNotif} deepLink={deepLink} onFinalizeDelivery={finalizeUnitDelivery} />
          )}
        </div>
      )}

      {page === 'unit' && (
            <div>
              <div className="flex gap-3 mb-3">
                <Btn className={unitMode === 'web' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setUnitMode('web')}>🌐 Web</Btn>
                <Btn className={unitMode === 'tablet' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setUnitMode('tablet')}>📱 Tablet</Btn>
              </div>
              {unitMode === 'web' ? (
                <Unit projects={projects} transports={transports} onAcceptAgreement={acceptAgreement} onRejectAgreement={rejectAgreement} onReceive={unitReceive} notifications={notifications} onJump={jumpByNotif} onOpenProject={(p: any) => { setSelectedProject(p); setPage('projectView'); }} deepLink={deepLink} />
              ) : (
                <UnitTabletFrame projects={projects} transports={transports} onReceive={unitReceive} />
              )}
            </div>
      )}

      {page === 'projectView' && selectedProject && (
        <ProjectView project={selectedProject} transports={transports} onBack={() => setPage('unit')} />
      )}

      
    </div>
  );
}

/******** lightweight tests (non-blocking) ********/
(() => {
  if (typeof window === 'undefined') return;
  try {
    console.assert(Array.isArray(EKA) && EKA.length > 0, 'EKA list exists');
    console.assert(typeof gid() === 'string' && gid().length > 0, 'gid works');
    console.assert(typeof today() === 'string', 'today works');
    console.assert(sumWaste([{ quantity: '1.5' }, { quantity: '2' }]) === 3.5, 'sumWaste works');
    const p = plates();
    console.assert(Array.isArray(p) && p.length === 3, 'plates works');
    const f = fmt('2025-01-01');
    console.assert(typeof f === 'string' && f.length > 0, 'fmt returns locale date');
  } catch (e) {
    console.warn('Self-tests failed', e);
  }
})();
