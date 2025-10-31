// Νέο component για το tab 'Έργα' του μεταφορέα (web)
function TransporterProjectsTab({ tProjects }: { tProjects: any[] }) {
  const all = A(tProjects || []);
  const iwms = all.filter((p: any) => !p.external);
  const others = all.filter((p: any) => !!p.external);
  const [subtab, setSubtab] = React.useState<'all' | 'iwm' | 'external'>('all');
  const [externalProjects, setExternalProjects] = React.useState<any[]>(others);

  React.useEffect(() => { if (subtab === 'external') setExternalProjects(others); }, [subtab, all.length]);

  let list = all;
  if (subtab === 'iwm') list = iwms;
  if (subtab === 'external') list = externalProjects;

  const handleCompleteExternal = (p: any) => {
    try {
      const raw = localStorage.getItem('iwm_transporter_external_projects');
      const arr = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(arr) ? arr.filter((x: any) => !(x.producer === p.producer && x.projectName === p.projectName)) : arr;
      localStorage.setItem('iwm_transporter_external_projects', JSON.stringify(next));
      const rawP = localStorage.getItem('iwm_unit_offline_projects');
      const objP = rawP ? JSON.parse(rawP) : {};
      if (objP && typeof objP === 'object' && objP[p.producer]) {
        objP[p.producer] = (objP[p.producer] || []).filter((name: string) => name !== p.projectName);
        if (objP[p.producer].length === 0) delete objP[p.producer];
        localStorage.setItem('iwm_unit_offline_projects', JSON.stringify(objP));
      }
      setExternalProjects((prev) => prev.filter((x: any) => !(x.producer === p.producer && x.projectName === p.projectName)));
    } catch {}
  };

  return (
    <div className="bg-white border rounded p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Έργα</div>
            <div className="text-sm text-gray-500">Διαχείριση έργων — μεταφορέας</div>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => {/* TODO: open modal */}}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 text-white text-sm shadow-md hover:from-blue-700 hover:to-blue-600 transition"
              title="Προσθήκη νέου έργου"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium">Προσθήκη Έργου</span>
            </button>
          </div>
        </div>

        {/* subtabs: placed above projects, left-aligned */}
        <div className="mt-3 flex items-center gap-2">
          <div className="inline-flex bg-gray-100 p-1 rounded-full">
            <button onClick={() => setSubtab('all')} className={`px-3 py-1.5 rounded-full text-sm ${subtab === 'all' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Όλα</button>
            <button onClick={() => setSubtab('iwm')} className={`px-3 py-1.5 rounded-full text-sm ${subtab === 'iwm' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Έργα πλατφόρμας</button>
            <button onClick={() => setSubtab('external')} className={`px-3 py-1.5 rounded-full text-sm ${subtab === 'external' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Έργα εκτός πλατφόρμας</button>
          </div>

          {/* mobile add button near subtabs for small screens */}
          <div className="sm:hidden ml-auto">
            <button
              onClick={() => {/* TODO: open modal */}}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm shadow-sm hover:bg-blue-700 transition"
              title="Προσθήκη"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="mb-3 text-sm text-gray-700">Σύνολο: <span className="font-medium">{list.length}</span></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.length === 0 ? (
          <div className="col-span-full p-6 text-center text-gray-500">—</div>
        ) : list.map((p: any, i: number) => (
          <div key={p.id || i} className="border rounded p-3 bg-white shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${p.external ? 'bg-gray-400' : 'bg-green-500'}`} />
                    <div className="font-semibold text-sm">{p.projectName}{p.agreement && p.agreement !== '-' ? ` (${p.agreement})` : ''}</div>
                    <div className={`ml-2 text-xs font-medium ${p.external ? 'text-gray-500' : 'text-green-600'}`}>
                      {p.external ? 'offline' : 'online'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{p.producer}</div>
                </div>
                <div className="text-xs text-gray-500">{p.unit || '-'}</div>
              </div>
            <div className="mt-2 text-sm text-gray-700">{p.address || '-'}</div>
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
              <div>{p.managerName || '-'}</div>
              <div>{p.managerPhone || '-'}</div>
            </div>
            <div className="mt-3 flex justify-end">
              {p.external ? (
                <button className="px-3 py-1.5 rounded bg-green-600 text-white text-sm" onClick={() => handleCompleteExternal(p)}>Ολοκλήρωση</button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
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
// --- Fallback dummy data for missing constants/helpers ---
// Expanded EKA list for category 17 (Construction & Demolition wastes — non-hazardous)
// This provides common 17.* codes with short Greek descriptions used in project waste lines.
const EKA = [
  { code: '17 01 01', description: 'ΣΚΥΡΟΔΕΜΑ' },
  { code: '17 01 02', description: 'ΤΟΥΒΛΑ' },
  { code: '17 01 03', description: 'ΠΛΑΚΑΚΙΑ ΚΑΙ ΚΕΡΑΜΙΚΑ' },
  { code: '17 01 07', description: 'ΜΕΙΓΜΑ ΣΚΥΡΟΔΕΜΑΤΟΣ, ΤΟΥΒΛΩΝ, ΠΛΑΚΑΚΙΩΝ ΚΑΙ ΚΕΡΑΜΙΚΩΝ ΕΚΤΟΣ ΕΚΕΙΝΩΝ ΠΟΥ ΠΕΡΙΛΑΜΒΑΝΟΝΤΑΙ ΣΤΟ ΣΗΜΕΙΟ 170706 ΤΟΥ ΚΑΤΑΛΟΓΟΥ ΑΠΟΒΛΗΤΩΝ' },
  { code: '17 02 01', description: 'ΞΥΛΟ' },
  { code: '17 02 02', description: 'ΓΥΑΛΙ' },
  { code: '17 02 03', description: 'ΠΛΑΣΤΙΚΟ' },
  { code: '17 03 02', description: 'ΜΕΙΓΜΑΤΑ ΟΡΥΚΤΗΣ ΑΣΦΑΛΤΟΥ ΕΚΤΟΣ ΕΚΕΙΝΩΝ ΠΟΥ ΠΕΡΙΛΑΜΒΑΝΟΝΤΑΙ ΣΤΟ ΣΗΜΕΙΟ 170301 ΤΟΥ ΚΑΤΑΛΟΓΟΥ ΑΠΟΒΛΗΤΩΝ' },
  { code: '17 04 01', description: 'ΧΑΛΚΟΣ, ΜΠΡΟΥΝΤΖΟΣ, ΟΡΕΙΧΑΛΚΟΣ' },
  { code: '17 04 02', description: 'ΑΛΟΥΜΙΝΙΟ' },
  { code: '17 04 03', description: 'ΜΟΛΥΒΔΟΣ' },
  { code: '17 04 04', description: 'ΨΕΥΔΑΡΓΥΡΟΣ' },
  { code: '17 04 05', description: 'ΣΙΔΗΡΟΣ ΚΑΙ ΧΑΛΥΒΑΣ' },
  { code: '17 04 06', description: 'ΚΑΣΣΙΤΕΡΟΣ' },
  { code: '17 04 07', description: 'ΑΝΑΜΕΙΚΤΑ ΜΕΤΑΛΛΑ' },
  { code: '17 05 04', description: 'ΧΩΜΑΤΑ ΚΑΙ ΠΕΤΡΕΣ ΑΛΛΑ ΑΠΟ ΤΑ ΑΝΑΦΕΡΟΜΕΝΑ ΣΤΟ ΣΗΜΕΙΟ 170503 ΤΟΥ ΚΑΤΑΛΟΓΟΥ ΑΠΟΒΛΗΤΩΝ' },
  { code: '17 05 06', description: 'ΜΠΑΖΑ ΕΣΚΑΦΩΝ ΑΛΛΑ ΑΠΟ ΤΑ ΑΝΑΦΕΡΟΜΕΝΑ ΣΤΟ ΣΗΜΕΙΟ 170505 ΤΟΥ ΚΑΤΑΛΟΓΟΥ ΑΠΟΒΛΗΤΩΝ' },
  { code: '17 05 08', description: 'ΕΡΜΑ ΣΙΔΗΡΟΤΡΟΧΙΩΝ ΕΚΤΟΣ ΕΚΕΙΝΟΥ ΠΟΥ ΠΕΡΙΛΑΜΒΑΝΕΤΑΙ ΣΤΟ ΣΗΜΕΙΟ 170507 ΤΟΥ ΚΑΤΑΛΟΓΟΥ ΑΠΟΒΛΗΤΩΝ' },
  { code: '17 06 04', description: 'ΜΟΝΩΤΙΚΑ ΥΛΙΚΑ ΕΚΤΟΣ ΕΚΕΙΝΩΝ ΠΟΥ ΠΕΡΙΛΑΜΒΑΝΟΝΤΑΙ ΣΤΑ ΣΗΜΕΙΑ 170601 ΚΑΙ 170603 ΤΟΥ ΚΑΤΑΛΟΓΟΥ ΑΠΟΒΛΗΤΩΝ' },
  { code: '17 08 02', description: 'ΥΛΙΚΑ ΔΟΜΙΚΩΝ ΚΑΤΑΣΚΕΥΩΝ ΜΕ ΒΑΣΗ ΤΟ ΓΥΨΟ ΕΚΤΟΣ ΕΚΕΙΝΩΝ ΠΟΥ ΠΕΡΙΛΑΜΒΑΝΟΝΤΑΙ ΣΤΟ ΣΗΜΕΙΟ 170801 ΤΟΥ ΚΑΤΑΛΟΓΟΥ ΑΠΟΒΛΗΤΩΝ' },
  { code: '17 09 04', description: 'ΜΕΙΓΜΑΤΑ ΑΠΟΒΛΗΤΩΝ ΔΟΜΙΚΩΝ ΚΑΤΑΣΚΕΥΩΝ ΚΑΙ ΚΑΤΕΔΑΦΙΣΕΩΝ (ΕΚΤΟΣ ΑΥΤΩΝ ΠΟΥ ΠΕΡΙΛΑΜΒΑΝΟΝΤΑΙ ΣΤΑ ΣΗΜΕΙΑ 170901-170903)' },
];
// EKA codes to hide from producer project tables (normalized without spaces)
const EXCLUDED_EKA = new Set(['170401','170402','170403','170404','170405','170406','170407','170508']);
const readStoredDebtors = () => {
  try {
    const raw = localStorage.getItem('iwm_unit_offline_debtors');
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};
const UNITS = ['RRC', 'Latouros'];
const TRANSPORTERS = ['Euroskip', 'Skip Hire'];
const uniqueProducers = (projects: any[]) => Array.from(new Set(projects.map((p: any) => p.producer).filter(Boolean)));
const projectsByProducer = (projects: any[], producer?: string) => producer ? projects.filter((p: any) => p.producer === producer) : projects;
const downloadCSV = (...args: any[]) => { alert('Λειτουργία εξαγωγής CSV προσωρινά απενεργοποιημένη'); };
const applyProjectFilter = (projects: any[], filter: any, producer?: string) => projects;
const plates = () => [];
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
import { Bell, Inbox, Truck, Factory, FileText, CheckCircle2, Clock, Menu, Filter, Package, ArrowUpCircle, ArrowDownCircle, Trash2, ChevronRight, DollarSign } from 'lucide-react';

/******** helpers ********/
const gid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('el-GR') : '-');
const to2 = (n: number | string) => String(n).padStart(2, '0');
const yearYY = () => to2(new Date().getFullYear() % 100);
const A = (x: any) => (Array.isArray(x) ? x : []);
const sumWaste = (lines: any[] = []) => A(lines).reduce((s: number, l: any) => s + (parseFloat(l?.quantity || '0') || 0), 0);


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

// simple Delivery Slip PDF for weighing entries (independent of transports)
const pdfSlip = (s: any) => {
  const d = new jsPDF();
  d.setFontSize(14);
  d.text('DELIVERY SLIP', 14, 18);
  d.setFontSize(11);
  d.text(`Producer: ${s.producer || '-'}`, 14, 32);
  d.text(`Project: ${s.project || '-'}`, 14, 40);
  d.text(`Transporter: ${s.transporter || '-'}`, 14, 48);
  d.text(`Vehicle: ${s.vehicle || '-'}`, 14, 56);
  d.text(`Date: ${s.date || '-'}`, 14, 64);
  d.text(`Time: ${s.time || '-'}`, 14, 72);
  d.text(`EKA: ${s.ekaCategory || '-'}`, 14, 80);
  d.text(`Weight: ${s.weight || '-'} tn`, 14, 88);
  d.save(`slip_${(s.project || 'project').replace(/\s+/g, '_')}_${s.date || today()}.pdf`);
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
               <span className={`ml-2 text-xs rounded-full px-2 ${t.count === 0 ? 'bg-gray-200 text-gray-700' : 'bg-red-600 text-white'}`}>{t.count}</span>
             )}
        </button>
      ))}
    </div>
  );
};

const Modal = ({ title, children, onClose, onSubmit, submitLabel = 'Καταχώρηση', inside = false }: any) => (
  <div className={`${inside ? 'absolute' : 'fixed'} inset-0 bg-black/40 flex items-center justify-center z-50 animate-in`}>
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
      {message}
      {onClose && (
        <button className="ml-2 text-xs underline" onClick={onClose}>Κλείσιμο</button>
      )}
    </div>
  );
}

const FilterBar = ({ producers = [], projects = [], debtors = [], transporters = [], plates = {}, value, onChange, showProject = true, showProducer = true, showDebtor = false, showTransporter = false, showPlate = false }: any) => (
  <div className="mb-3">
    <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-xl p-3 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
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
              {projects.map((p: any) => (<option key={p.id} value={p.id}>{p.projectName}{p.agreement && p.agreement !== '-' ? ` (${p.agreement})` : ''}</option>))}
            </select>
          </div>
        )}
        {showDebtor && (
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Χρεώστης</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={value.debtor || ''}
              onChange={(e: any) => onChange({ ...value, debtor: e.target.value })}
            >
              <option value="">— Όλοι —</option>
              {debtors.map((d: string) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>
        )}
        {showTransporter && (
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Μεταφορέας</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={value.transporter || ''}
              onChange={(e: any) => onChange({ ...value, transporter: e.target.value, vehicle: '' })}
            >
              <option value="">— Όλοι —</option>
              {transporters.map((t: string) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
        )}
        {showPlate && (
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Αρ. Οχήματος</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={value.vehicle || ''}
              onChange={(e: any) => onChange({ ...value, vehicle: e.target.value })}
            >
              <option value="">— Όλα —</option>
              {(((value.transporter && plates && plates[value.transporter]) ? plates[value.transporter] : ([] as string[]).concat(...(Object.values(plates || {}) as any))).filter(Boolean) as string[]).map((pl: string) => (<option key={pl} value={pl}>{pl}</option>))}
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
          onClick={() => onChange({ producer: '', project: '', debtor: '', transporter: '', vehicle: '', from: '', to: '' })}
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
const ProjectDetails = ({ project, transports, documents = [], onUploadDocument, onBack, onRequestTransfer, onCancelRequest, addNotif, onUpdateProject }: any) => {
  const list = A(transports).filter((t: any) => t.projectId === project.id);
  const [justRequested, setJustRequested] = React.useState<string | null>(null);
  const [showReqModal, setShowReqModal] = React.useState(false);
  const [reqType, setReqType] = React.useState<'new-bin' | 'change-bin' | 'move-bin' | ''>('');
  const [subTab, setSubTab] = React.useState<'overview' | 'reports' | 'collective'>('overview');
  // Products ordering (to Unit)
  const [prodOrderOpen, setProdOrderOpen] = React.useState(false);
  const [unitProducts, setUnitProducts] = React.useState<any[]>([]);
  const [prodOrderForm, setProdOrderForm] = React.useState<{ product: string; quantity: string }>({ product: '', quantity: '' });
  const [editingTransporter, setEditingTransporter] = React.useState(false);
  const [editTransporterVal, setEditTransporterVal] = React.useState<string>('');
  React.useEffect(() => {
    setEditingTransporter(false);
    setEditTransporterVal(project.transporter || '');
  }, [project?.id]);
  // Unit slips (from tablet) for off-platform projects
  const [unitSlips, setUnitSlips] = React.useState<any[]>([]);
  React.useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem('iwm_tablet_slips');
        const arr = raw ? JSON.parse(raw) : [];
        setUnitSlips(Array.isArray(arr) ? arr : []);
      } catch { setUnitSlips([]); }
    };
    read();
    const id = window.setInterval(read, 1500);
    return () => window.clearInterval(id);
  }, []);

  // Per-slip uploaded forms (recognition/monitoring) stored by slip id
  const [slipForms, setSlipForms] = React.useState<Record<string, any>>(() => {
    try {
      const raw = localStorage.getItem('iwm_slip_forms');
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === 'object' ? obj : {};
    } catch {
      return {} as Record<string, any>;
    }
  });
  React.useEffect(() => {
    try { localStorage.setItem('iwm_slip_forms', JSON.stringify(slipForms)); } catch {}
  }, [slipForms]);
  
  const refreshUnitProducts = () => {
    try { const raw = localStorage.getItem('iwm_unit_products'); const arr = raw ? JSON.parse(raw) : []; setUnitProducts(Array.isArray(arr) ? arr : []); } catch { setUnitProducts([]); }
  };
  // local fallback storage if parent doesn't pass documents state/handler
  const [localDocs, setLocalDocs] = React.useState<any[]>([]);
  // dedicated file inputs per document type
  const [siteNoticeFile, setSiteNoticeFile] = React.useState<File | null>(null); // Γνωστοποίηση Εργοταξίου
  const [wastePlanFile, setWastePlanFile] = React.useState<File | null>(null);   // Σχέδιο Διαχείρισης Αποβλήτων
  const [agreementFile, setAgreementFile] = React.useState<File | null>(null);   // Συμφωνία Διαχείρισης Αποβλήτων

  // delivered transports (received by unit)
  const deliveredTransports = A(list).filter((t: any) => t.receivedByUnit);
  // also include manual slips recorded on the tablet/web (stored in localStorage under 'iwm_tablet_slips')
  const deliveredSlips = A(unitSlips).filter((s: any) => {
    // match either by project id or by project name/producer
    if (!s) return false;
    if (s.projectId && project.id && String(s.projectId) === String(project.id)) return true;
    if (s.project && project.projectName && String(s.project).trim() === String(project.projectName).trim() && s.producer === project.producer) return true;
    return false;
  });

  const actualsMap: Record<string, number> = {};
  // accumulate from transports
  deliveredTransports.forEach((t: any) => {
    const code = t.ekaCategory || '—';
    const w = parseFloat(String(t.weight || '0')) || 0;
    actualsMap[code] = (actualsMap[code] || 0) + w;
  });
  // accumulate from slips (manual weighs)
  deliveredSlips.forEach((s: any) => {
    const code = s.ekaCategory || s.eka || '—';
    const w = parseFloat(String(s.weight || s.w || s.weight_tn || '0')) || parseFloat(String(s.weight || '0')) || 0;
    actualsMap[code] = (actualsMap[code] || 0) + w;
  });
  const isOff = !!project.offPlatformTransporter;
  const TON_PER_LOAD = 7;
  const totalEstimatedTons = A(project.wasteLines).reduce((s: number, w: any) => s + (Number(w.quantity || 0) || 0), 0);
  // Prices: try to read unit-specific pricelist from localStorage, fallback to deterministic per-unit prices
  const getStoredPriceMap = (unit: string) => {
    try {
      const rawAll = localStorage.getItem('iwm_unit_pricelist');
      if (rawAll) {
        const obj = JSON.parse(rawAll || '{}') || {};
        if (obj && obj[unit]) return Array.isArray(obj[unit]) ? obj[unit].reduce((acc: any, p: any) => ({ ...acc, [String(p.code).replace(/\s+/g,'')]: Number(p.price) }), {}) : {};
      }
      const rawUnit = localStorage.getItem(`iwm_unit_pricelist_${unit}`);
      if (rawUnit) {
        const arr = JSON.parse(rawUnit || '[]') || [];
        return Array.isArray(arr) ? arr.reduce((acc: any, p: any) => ({ ...acc, [String(p.code).replace(/\s+/g,'')]: Number(p.price) }), {}) : {};
      }
    } catch { /* ignore */ }
    return {};
  };

  // helper: read subscription for a given producer (canonicalize legacy 'free' -> 'basic')
  const subscriptionForProducer = (producerName: string) => {
    try {
      const key = `iwm_producer_subscription_${(producerName || '').replace(/\s/g, '_')}`;
      const v = localStorage.getItem(key);
      if (v === 'free') return 'basic';
      return v || 'basic';
    } catch {
      return 'basic';
    }
  };

  const priceFor = (code: string, unit: string) => {
    const norm = String(code || '').replace(/\s+/g, '');
    const stored = getStoredPriceMap(unit) || {};
    if (stored && typeof stored[norm] === 'number') return stored[norm];
    // No stored price — return 0 (unit admin should set prices to make estimates meaningful)
    try { console.warn && console.warn(`No price for EKA ${norm} in unit ${unit}`); } catch {}
    return 0;
  };

  const totalEstimatedCost = React.useMemo(() => {
    try {
      const unit = project.unit || '';
      return A(project.wasteLines).filter((w:any) => Number(w.quantity || 0) > 0).reduce((sum: number, w: any) => {
        const code = String(w.code || w.ekaCategory || '').replace(/\s+/g, '');
        if (EXCLUDED_EKA.has(code)) return sum;
        const qty = Number(w.quantity || 0) || 0;
        const price = priceFor(code, unit) || 0;
        return sum + qty * price;
      }, 0);
    } catch { return 0; }
  }, [project?.wasteLines, project?.unit]);

  const fmtCurrency = (v: number) => {
    try { return v.toLocaleString('el-GR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).replace('\u00A0', ''); } catch { return `${Math.round(v)}€`; }
  };
  // Optimization modal state
  const [optOpen, setOptOpen] = React.useState(false);
  const [optResult, setOptResult] = React.useState<any>(null);

  const computeOptimization = () => {
    // Do not allow optimization for Basic subscribers (per-producer)
    const curSub = subscriptionForProducer(project.producer);
    if (curSub === 'basic') {
      setOptResult({ kind: 'none', message: 'Η βελτιστοποίηση είναι διαθέσιμη μόνο σε Premium πακέτο.' });
      setOptOpen(true);
      return;
    }
    const lines = A(project.wasteLines).filter((w:any) => Number(w.quantity || 0) > 0 && !EXCLUDED_EKA.has(String(w.code || w.ekaCategory || '').replace(/\s+/g, '')));
    const totalTons = lines.reduce((s:number, w:any) => s + (Number(w.quantity || 0) || 0), 0);
    const t170904 = lines.reduce((s:number, w:any) => s + ((String(w.code || w.ekaCategory || '').replace(/\s+/g, '') === '170904') ? (Number(w.quantity || 0) || 0) : 0), 0);
    const current = totalEstimatedCost;
    if (totalTons === 0) {
      setOptResult({ kind: 'none', message: 'Δεν υπάρχουν εκτιμώμενες ποσότητες για υπολογισμό.' });
      setOptOpen(true);
      return;
    }

    const baseSavingPercent = Math.floor(totalTons / 100) * 0.10; // 10% per 100 tn
    // if majority of mass is 170904, generate targeted scenarios
    const scenarios: any[] = [];
    if (t170904 >= 0.5 * totalTons) {
      // scenario: 2 skips (1 clean 170101 + 1 170904) - standard
      scenarios.push({
        id: '2skips_standard',
        title: '2 κάδοι — 1 καθαρά (170101) + 1 170904',
        multiplier: 1.0,
        note: 'Διαχωρισμός σε δύο κάδους: καθαρά και 170904.'
      });
      // conservative
      scenarios.push({ id: '2skips_conservative', title: '2 κάδοι — Συντηρητικό', multiplier: 0.6, note: 'Μερικός διαχωρισμός, λιγότερη απόδοση ταξινόμησης.' });
      // aggressive: try more sorting / additional κάδοι
      scenarios.push({ id: '3skips_aggressive', title: '3 κάδοι — Περισσότερος διαχωρισμός', multiplier: 1.2, note: 'Επιπλέον κάδοι για μεγαλύτερη καθαρότητα' });
    } else {
      // generic suggestions even if 170904 not majority
      scenarios.push({ id: '2skips_generic', title: '2 κάδοι — Διαχωρισμός', multiplier: 0.8, note: 'Προσπάθεια διαχωρισμού σε καθαρά/αναμεικτα' });
      scenarios.push({ id: 'sorting_plan', title: 'Σχέδιο Ταξινόμησης', multiplier: 0.5, note: 'Εντατικό πρόγραμμα ταξινόμησης στο εργοτάξιο' });
    }

    const computed = scenarios.map(s => {
      const savingPercent = Math.min(0.9, baseSavingPercent * (s.multiplier || 1));
      const proposed = current * (1 - savingPercent);
      return { ...s, savingPercent, current, proposed, savings: current - proposed };
    });

    setOptResult({ kind: 'scenarios', totalTons, t170904, scenarios: computed });
    setOptOpen(true);
  };
  const applyScenario = (s: any) => {
    // placeholder: in future create a transfer/order/action
    try { alert(`Εφαρμογή σεναρίου: ${s.title}\nΕξοικονόμηση: ${fmtCurrency(s.savings)}`); } catch {}
    setOptOpen(false);
  };
  const estimatedLoads = totalEstimatedTons > 0 ? Math.ceil(totalEstimatedTons / TON_PER_LOAD) : 0;
  const completedLoads = deliveredTransports.length;
  const overallPct = estimatedLoads > 0 ? Math.min(100, Math.round((completedLoads / estimatedLoads) * 100)) : 0;

  const quickRequest = (type: 'empty-bin' | 'full-pickup' | 'change-bin') => {
    onRequestTransfer(project, type as any);
    setJustRequested(type);
    setTimeout(() => setJustRequested(null), 2600);
  };

  const allDocs = [...A(documents), ...A(localDocs)];
  const docsForProject = A(allDocs).filter((d: any) => d.projectId === project.id);
  const hasType = (type: string) => docsForProject.some((d: any) => d.type === type);
  const uploadedSiteNotice = hasType('Γνωστοποίηση Εργοταξίου');
  const uploadedWastePlan = hasType('Σχέδιο Διαχείρισης Αποβλήτων');
  const uploadedAgreement = hasType('Συμφωνία Διαχείρισης Αποβλήτων') || !!project.agreement;
  // find docs per type (for showing filenames)
  const siteNoticeDoc = A(docsForProject).find((d: any) => d.type === 'Γνωστοποίηση Εργοταξίου');
  const wastePlanDoc = A(docsForProject).find((d: any) => d.type === 'Σχέδιο Διαχείρισης Αποβλήτων');
  const agreementDoc = A(docsForProject).find((d: any) => d.type === 'Συμφωνία Διαχείρισης Αποβλήτων');
  const allUploaded = uploadedSiteNotice && uploadedWastePlan && uploadedAgreement;
  const submitProjectDoc = (type: string, file: File | null, reset: () => void) => {
    if (!file) { alert('Επιλέξτε αρχείο'); return; }
    const doc = {
      id: gid(),
      producer: project.producer,
      projectId: project.id,
      project: project.projectName,
      name: file.name,
      type,
      date: today(),
      status: 'Αναμονή Ελέγχου από Συλλογικό Σύστημα',
      source: 'upload',
    };
    if (onUploadDocument) onUploadDocument(doc);
    else setLocalDocs(prev => [doc, ...prev]);
    reset();
  };
  const handleSubmitAll = () => {
    // simulate submission completion for local docs
    setLocalDocs(prev => prev.map(d => d.projectId === project.id ? { ...d, status: 'Υποβλήθηκε' } : d));
    alert('Τα έντυπα υποβλήθηκαν.');
  };

  return (
    <div className="p-4">
      
      <div className="flex justify-between items-center mb-3">
  <h2 className="text-xl font-bold">
    {project.projectName}
    {project.agreement && project.agreement !== '-' ? (
      project.agreement === 'Σε εκκρεμότητα' ? (
        <span className="ml-2 relative inline-flex items-center group">
          <span aria-hidden title="Συμφωνία σε εκκρεμότητα" className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">!</span>
          <div className="hidden group-hover:block absolute left-0 top-full mt-2 z-20 w-64 bg-white border border-gray-200 rounded shadow p-2 text-xs text-gray-700">
            <ul className="list-disc pl-4 space-y-1">
              <li>Εκκρεμεί η Συμφωνία Διαχείρισης Αποβλήτων</li>
              <li>Εκκρεμεί η έκδοση ID του έργου</li>
            </ul>
          </div>
        </span>
      ) : (
        ` (${project.agreement})`
      )
    ) : ''}
  </h2>
        <div className="flex gap-2">
          <Btn className="bg-gray-100" onClick={onBack}>← Πίσω</Btn>
        </div>
      </div>

      {(() => {
        const collectiveLabel = (
          <span className="relative inline-flex items-center">
            Συλλογικό Σύστημα
            {!allUploaded && (
              <span
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold"
                title="Λείπουν αρχεία"
                aria-label="Λείπουν αρχεία"
              >
                !
              </span>
            )}
          </span>
        );
        return (
          <TabBar
            tabs={[
              { key: 'overview', label: 'Σύνοψη', count: 0 },
              { key: 'reports', label: 'Αναφορές', count: 0 },
              { key: 'collective', label: collectiveLabel, count: docsForProject.length },
            ]}
            active={subTab}
            onChange={(k: string) => setSubTab((k as any) || 'overview')}
          />
        );
  })()}

      {subTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 text-sm mb-3">
            <div className="bg-white rounded border p-3 lg:col-span-4">
              <div className="font-semibold mb-2">Στοιχεία Έργου</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                  {/* Removed invalid setTab/setMenuOpen for ProjectDetails, these should only be in Producer menu */}
                { (project.addressStreet || project.addressLocation || project.addressCity || project.addressPostalCode || project.addressProvince || project.addressPlanSheetNumber || project.addressParcelNumber || project.addressOtherNotes || project.address) && (
                  <div>
                    <div className="font-bold text-sm mb-1">1. Διεύθυνση</div>
                    <div className="text-gray-800">{([project.addressStreet, project.addressLocation || project.addressCity, project.addressPostalCode, project.addressProvince].filter(Boolean).join(', ') || project.address || '—')}</div>
                    <div className="mt-1 text-gray-600 text-xs">
                      {project.addressPlanSheetNumber && <span className="mr-3">Αρ. Φύλλου/Σχεδίου: {project.addressPlanSheetNumber}</span>}
                      {project.addressParcelNumber && <span className="mr-3">Αρ. Τεμαχίου/ων: {project.addressParcelNumber}</span>}
                      {project.addressOtherNotes && <div className="mt-1">Σημειώσεις: {project.addressOtherNotes}</div>}
                    </div>
                  </div>
                )}

                {/* 2. Owner */}
                { (project.ownerName || project.ownerEmail || project.ownerPhone || project.ownerPostalAddress) && (
                  <div>
                    <div className="font-bold text-sm mb-1">2. Κύριος(οι) / Ιδιοκτήτης(ες)</div>
                    <div className="text-gray-800">{project.ownerName || '—'}</div>
                    <div className="mt-1 text-gray-600 text-xs">
                      {project.ownerPostalAddress && <div>Ταχ. Διεύθυνση: {project.ownerPostalAddress}</div>}
                      {project.ownerPhone && <div>Τηλ.: {project.ownerPhone}</div>}
                      {project.ownerEmail && <div>e-mail: {project.ownerEmail}</div>}
                    </div>
                  </div>
                )}

                {/* 3. Contractor */}
                { (project.contractorName || project.contractorEmail || project.contractorPhone || project.contractorPostalAddress || project.contractorRegistryNumber || project.contractorID || project.contractorVAT || project.contractorTechDirectorName) && (
                  <div>
                    <div className="font-bold text-sm mb-1">3. Εργολήπτης / Εταιρεία</div>
                    <div className="text-gray-800 font-semibold">{project.contractorName || '—'}</div>
                    <div className="mt-1 text-gray-600 text-xs">
                      {project.contractorPostalAddress && <div>Ταχ. Διεύθυνση: {project.contractorPostalAddress}</div>}
                      {project.contractorPhone && <div>Τηλ.: {project.contractorPhone}</div>}
                      {project.contractorEmail && <div>e-mail: {project.contractorEmail}</div>}
                      {project.contractorRegistryNumber && <div>Αρ. Μητρώου: {project.contractorRegistryNumber}</div>}
                      {project.contractorID && <div>Αρ. Ταυτότητας: {project.contractorID}</div>}
                      {project.contractorVAT && <div>Αρ. ΦΠΑ: {project.contractorVAT}</div>}
                      {project.contractorTechDirectorName && <div>Τεχνικός Διευθυντής: {project.contractorTechDirectorName}</div>}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {/* 4. System */}
                <div>
                  <div className="font-bold text-sm mb-1">4. Σύστημα</div>
                  <div className="text-gray-800">{project.collectiveSystem || '—'}</div>
                </div>

                {/* 5. Supervisor */}
                { (project.supervisorName || project.supervisorRegistryNumber) && (
                  <div>
                      <div className="font-bold text-sm mb-1">5. Επιβλέπων Μηχανικός</div>
                    <div className="text-gray-800">{project.supervisorName || '—'}{project.supervisorRegistryNumber ? ` — ΕΤΕΚ ${project.supervisorRegistryNumber}` : ''}</div>
                  </div>
                )}

                {/* 6. Type / Size */}
                { (project.typeNewConstruction || project.typeExtension || project.typeConversion || project.typeRenovation || project.typeDemolition || project.typeOther || project.sizeDetails) && (
                  <div>
                    <div className="font-bold text-sm mb-1">6. Στοιχεία / Είδος Έργου</div>
                    <div className="text-gray-800">{project.sizeDetails || '—'}</div>
                    <div className="mt-1 text-gray-600 text-xs">{(() => { const parts: string[] = []; if (project.typeNewConstruction) parts.push('Νέα Κατασκευή'); if (project.typeExtension) parts.push('Επέκταση/Προσθήκη'); if (project.typeConversion) parts.push('Μετατροπή/Αλλαγή χρήσης'); if (project.typeRenovation) parts.push('Ανακαίνιση / Αποκατάσταση'); if (project.typeDemolition) parts.push('Κατεδάφιση'); if (project.typeOther) parts.push(project.typeOther); return parts.length ? parts.join(', ') : '—'; })()}</div>
                  </div>
                )}

                {/* 7. Period */}
                {(project.start || project.end) && (
                  <div>
                    <div className="font-bold text-sm mb-1">7. Περίοδος εκτέλεσης</div>
                    <div className="text-gray-800 font-semibold">{fmt(project.start)} — {fmt(project.end)}</div>
                  </div>
                )}

                {/* 8. Συνεργάτες */}
                <div>
                  <div className="font-bold text-sm mb-1">8. Συνεργάτες</div>
                  <div className="text-gray-800">Μονάδα: <span className="font-semibold">{project.unit || '—'}</span></div>
                  <div className="text-gray-800">Μεταφορέας: {(() => {
                    const ps = subscriptionForProducer(project.producer);
                    const platformOptions = (typeof TRANSPORTERS !== 'undefined' && Array.isArray(TRANSPORTERS)) ? TRANSPORTERS : [];
                    if (ps === 'premium') {
                      if (!editingTransporter) {
                        return (
                          <span className="inline-flex items-center gap-2">
                            <span>{project.transporter || '—'}</span>
                            {project.offPlatformTransporter && <span className="text-xs text-gray-500">(εκτός πλατφόρμας)</span>}
                            <button className="text-xs text-blue-600 underline ml-2" onClick={() => { setEditTransporterVal(project.transporter || ''); setEditingTransporter(true); }}>Αλλαγή</button>
                          </span>
                        );
                      }
                      return (
                        <div className="inline-flex items-center gap-2">
                          <select className="border p-1" value={editTransporterVal} onChange={(e:any) => setEditTransporterVal(e.target.value)}>
                            <option value="">— Επιλογή Μεταφορέα —</option>
                            {platformOptions.map((o: string) => (<option key={o} value={o}>{o}</option>))}
                          </select>
                          <button className="px-2 py-1 rounded bg-blue-600 text-white text-sm" onClick={() => {
                            if (onUpdateProject) onUpdateProject(project.id, { transporter: editTransporterVal, offPlatformTransporter: false, isNew: true });
                            setEditingTransporter(false);
                          }}>Αποθήκευση</button>
                          <button className="px-2 py-1 rounded bg-gray-200 text-sm" onClick={() => { setEditingTransporter(false); setEditTransporterVal(project.transporter || ''); }}>Άκυρο</button>
                        </div>
                      );
                    }
                    return <><span>{project.transporter || '—'}</span>{project.offPlatformTransporter ? <span className="text-xs text-gray-500"> (εκτός πλατφόρμας)</span> : null}</>;
                  })()}</div>
                </div>
              </div>
            </div>
            </div>

            <div className="bg-white rounded border p-3 lg:col-span-4">
              <div className="font-semibold mb-3">Εντολές &amp; Εργαλεία Έργου</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 hover:shadow transition bg-gradient-to-r from-yellow-50 to-white h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-6 h-6 text-yellow-600" />
                      <div>
                        <div className="font-semibold">Αίτημα Κάδου</div>
                        <div className="text-xs text-gray-600">Επιλέξτε τύπο αιτήματος (Νέος / Αλλαγή / Μεταφορά)</div>
                      </div>
                    </div>
                    {list.some((t: any) => t.fromProducer && !t.approvedByProducer && ['new-bin','move-bin','change-bin'].includes(t.requestType)) && (
                      <div className="mt-2 text-xs text-gray-600">Υπάρχει αίτημα σε αναμονή αποδοχής</div>
                    )}
                    {justRequested && (
                      <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                        {justRequested === 'new-bin' ? 'Ο μεταφορέας θα ενημερωθεί για νέο κάδο.' : justRequested === 'move-bin' ? 'Ο μεταφορέας θα ενημερωθεί για μεταφορά κάδου.' : 'Ο μεταφορέας θα ενημερωθεί για αλλαγή κάδου.'}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    {(() => {
                      const ps = subscriptionForProducer(project.producer);
                      return (
                        <button
                          onClick={() => { if (ps !== 'basic') setShowReqModal(true); }}
                          disabled={ps === 'basic'}
                          className={`${ps === 'basic' ? 'px-3 py-1 rounded bg-gray-300 text-white text-sm cursor-not-allowed' : 'px-3 py-1 rounded bg-yellow-600 text-white text-sm'}`}
                          title={ps === 'basic' ? 'Η λειτουργία Αίτημα Κάδου απαιτεί Premium συνδρομή' : 'Αίτημα'}
                        >Αίτημα</button>
                      );
                    })()}
                  </div>
                </div>

                <div className="rounded-lg border p-3 hover:shadow transition bg-gradient-to-r from-indigo-50 to-white h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-indigo-600" />
                      <div>
                        <div className="font-semibold">Παραγγελία Υλικού</div>
                        <div className="text-xs text-gray-600">Επέλεξε προϊόν και ποσότητα για παραγγελία από τη Μονάδα</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <button onClick={() => { refreshUnitProducts(); setProdOrderOpen(true); }} className="px-3 py-1 rounded bg-indigo-600 text-white text-sm">Παραγγελία</button>
                  </div>
                </div>

                <div className="rounded-lg border p-3 hover:shadow transition bg-gradient-to-r from-green-50 to-white h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-6 h-6 text-green-600" />
                      <div>
                        <div className="font-semibold">Υπολογιστής Κόστους</div>
                        <div className="text-xs text-gray-600">Εκτίμηση κόστους ανά τόνο / συνολικό κόστος διαχείρισης</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold">Συνολικό κόστος: <span className="text-green-700">{fmtCurrency(totalEstimatedCost)}</span></div>
                      <div className="text-xs text-gray-500 mt-1">(Υπολογισμός βάσει εκτιμημένων ποσοτήτων και τιμών μονάδας)</div>
                    </div>
                    <div className="mt-2 flex items-center justify-end">
                      {(() => {
                        const ps = subscriptionForProducer(project.producer);
                        return (
                          <button
                            onClick={() => computeOptimization()}
                            disabled={ps === 'basic'}
                            className={`${ps === 'basic' ? 'px-3 py-1 rounded bg-gray-300 text-white text-sm cursor-not-allowed' : 'px-3 py-1 rounded bg-green-600 text-white text-sm'}`}
                            title={ps === 'basic' ? 'Η Βελτιστοποίηση απαιτεί Premium συνδρομή' : 'Βελτιστοποίηση'}
                          >Βελτιστοποίηση</button>
                        );
                      })()}
                    </div>
                    {optOpen && (
                      <Modal title="Πρόταση Βελτιστοποίησης Κόστους" onClose={() => setOptOpen(false)}>
                        <div className="p-2 text-sm">
                          {optResult?.kind === 'scenarios' ? (
                            <div className="space-y-3">
                              {A(optResult.scenarios).map((s: any) => (
                                <div key={s.id} className="border rounded p-2">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-semibold">{s.title}</div>
                                      <div className="text-xs text-gray-500">{s.note}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xl font-bold text-green-700">{fmtCurrency(s.proposed)}</div>
                                      <div className="text-sm text-gray-600">Εξοικονόμηση: {fmtCurrency(s.savings)}</div>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-right">
                                    <button className="px-3 py-1 rounded bg-blue-600 text-white text-sm" onClick={() => applyScenario(s)}>Εφαρμογή</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div>{optResult?.message || 'Δεν υπάρχουν προτάσεις.'}</div>
                          )}
                        </div>
                      </Modal>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm mb-4">
            <div className="bg-white rounded border p-3">
              <div className="font-semibold mb-2">ΕΚΑ / Ποσότητες (Εκτίμηση)</div>
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 whitespace-nowrap">Α/Α</th>
                    <th className="border px-2">ΕΚΑ</th>
                    <th className="border px-2">Περιγραφή</th>
                    <th className="border px-2">Ποσότητα (tn)</th>
                  </tr>
                </thead>
                <tbody>
                  {A(project.wasteLines).filter((w:any) => {
                    const code = String(w.code || w.ekaCategory || '').replace(/\s+/g, '');
                    return Number(w.quantity || 0) > 0 && !EXCLUDED_EKA.has(code);
                  }).length === 0 ? (
                    <tr><td className="border text-center p-3" colSpan={4}>—</td></tr>
                  ) : (
                    A(project.wasteLines).filter((w:any) => {
                      const code = String(w.code || w.ekaCategory || '').replace(/\s+/g, '');
                      return Number(w.quantity || 0) > 0 && !EXCLUDED_EKA.has(code);
                    }).map((w: any, i: number) => (
                      <tr key={i}>
                        <td className="border text-center"><span className="whitespace-nowrap">{i + 1}</span></td>
                        <td className="border px-2"><span className="whitespace-nowrap">{String(w.code).replace(/ /g, '\u00A0')}</span></td>
                        <td className="border px-2">{w.description}</td>
                        <td className="border px-2 text-right">{Number(w.quantity || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded p-2">
                <div className="font-semibold mb-2">ΕΚΑ / Ποσότητες (Πραγματικές)</div>
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 whitespace-nowrap">Α/Α</th>
                      <th className="border px-2">ΕΚΑ</th>
                      <th className="border px-2">Περιγραφή</th>
                      <th className="border px-2">Ποσότητα (tn)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const visible = A(project.wasteLines).filter((w:any) => {
                        const code = String(w.code || w.ekaCategory || '').replace(/\s+/g, '');
                        return Number(w.quantity || 0) > 0 && !EXCLUDED_EKA.has(code);
                      });
                      if (visible.length === 0) return (<tr><td className="border text-center p-3" colSpan={4}>—</td></tr>);
                      const actualCodes = Object.keys(actualsMap || {});
                      const shownExtras = new Set<string>();
                      return visible.map((w: any, i: number) => {
                        const codeNorm = String(w.code || w.ekaCategory || '').replace(/\s+/g, '');
                        // group by first 3 digits (e.g., 170xxx) to find alternative actual codes like 170101 vs 170904
                        const groupKey = codeNorm.slice(0, 3);
                        const extras = actualCodes.filter(c => {
                          const cn = String(c || '').replace(/\s+/g, '');
                          return cn !== codeNorm && cn.startsWith(groupKey) && !EXCLUDED_EKA.has(cn) && Number(actualsMap[c] || 0) > 0;
                        });
                        return (
                          <React.Fragment key={`actual-frag-${codeNorm}-${i}`}>
                            {extras.filter(c => !shownExtras.has(c)).map((c: string, idx: number) => {
                              shownExtras.add(c);
                              const cn = String(c || '').replace(/\s+/g, '');
                              const ek = A(EKA).find((e: any) => String(e.code || '').replace(/\s+/g, '') === cn) || {};
                              const desc = (ek && ek.description) ? ek.description : '(Αναφορά από ζύγιση)';
                              return (
                                <tr key={`actual-extra-${c}-${i}`} className="bg-yellow-50">
                                  <td className="border text-center"><span className="whitespace-nowrap">{/* keep numbering aligned with parent index */}{i + 1}</span></td>
                                  <td className="border px-2"><span className="whitespace-nowrap">{String(c).replace(/ /g, '\u00A0')}</span></td>
                                  <td className="border px-2">{desc}</td>
                                  <td className="border px-2 text-right">{Number(actualsMap[c] || 0).toFixed(2)}</td>
                                </tr>
                              );
                            })}
                            <tr key={`actual-${codeNorm}-${i}`}>
                              <td className="border text-center"><span className="whitespace-nowrap">{i + 1}</span></td>
                              <td className="border px-2"><span className="whitespace-nowrap">{String(w.code).replace(/ /g, '\u00A0')}</span></td>
                              <td className="border px-2">{w.description}</td>
                              <td className="border px-2 text-right">{Number(actualsMap[w.code] || 0).toFixed(2)}</td>
                            </tr>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

            <div className="grid grid-cols-1 gap-4 mb-4">
              {/* Forms + delivery tables container */}
              <div className={`bg-white rounded border p-3 space-y-4 ${isOff ? 'pointer-events-none bg-gradient-to-r from-gray-50 to-white border-gray-200 text-gray-500 ring-1 ring-gray-100 shadow-sm' : ''}`}>
                <div className="font-semibold text-lg">Ψηφιακά Εντυπα Αναγνώρισης και Παρακαολουθησης</div>
                <div>
                  <div className="font-semibold mb-2">Παράδοση στον μεταφορέα (Κίτρινο μέρος Εντύπου Α&Π)</div>
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
                    <th className="border px-2">Κατάσταση</th>
                    <th className="border px-2">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {project.offPlatformTransporter ? (
                    <tr><td className="border text-center p-3" colSpan={10}>Ο μεταφορέας δεν χρησιμοποιεί την πλατφόρμα</td></tr>
                  ) : (() => {
                  const rows = list.filter((t: any) => t.approvedByProducer && !t.manualWeighed && !t.manualCreated);
                    if (rows.length === 0) return (<tr><td className="border text-center p-3" colSpan={10}>—</td></tr>);
                    return rows.map((t: any, i: number) => (
                      <tr key={t.id} className={t.isNew ? 'bg-green-50' : ''}>
                        <td className="border text-center">{i + 1}</td>
                        <td className="border px-2">{project.projectName}{project.agreement && project.agreement !== '-' ? ` (${project.agreement})` : ''}</td>
                        <td className="border px-2">{t.address || project.address}</td>
                        <td className="border text-center">{fmt(t.date)}</td>
                        <td className="border text-center">{t.time || '-'}</td>
                        <td className="border text-center">{t.transporter || project.transporter || '—'}</td>
                        <td className="border text-center">{t.vehicle || '—'}</td>
                        <td className="border text-center">{t.unit || project.unit || '—'}</td>
                        <td className="border text-center">
                          {t.receivedByUnit ? (<span className="text-green-700 font-medium">Ολοκληρώθηκε</span>) : (<span className="text-gray-600">Εκκρεμεί</span>)}
                        </td>
                        <td className="border text-center"><Btn className="bg-gray-100" onClick={() => pdfTransfer(t)}>PDF</Btn></td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
              </div>
              <div className="mt-3">
                <div className="font-semibold mb-2">Ολοκληρωμένες Μεταφορές (Ροζ μέρος Εντύπου Α&Π)</div>
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
                  {project.offPlatformTransporter ? (
                    <tr><td className="border text-center p-3" colSpan={10}>Ο μεταφορέας δεν χρησιμοποιεί την πλατφόρμα</td></tr>
                  ) : (
                    list.filter((t: any) => t.receivedByUnit).length === 0 ? (
                      <tr><td className="border text-center p-3" colSpan={10}>—</td></tr>
                    ) : (
                      list.filter((t: any) => t.receivedByUnit).map((t: any, i: number) => {
                        const prj = project;
                        return (
                          <tr key={t.id}>
                            <td className="border text-center">{i + 1}</td>
                            <td className="border text-center">{t.producer}</td>
                            <td className="border text-center">{t.project || (project.projectName + (project.agreement && project.agreement !== '-' ? ` (${project.agreement})` : ''))}</td>
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
                    )
                  )}
                </tbody>
              </table>
              </div>
            </div>
            {isOff && (
              <div className="mb-2 p-2 rounded border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">i</span>
                <span className="mr-auto">Ο μεταφορέας δεν χρησιμοποιεί την πλατφόρμα.</span>
                <button
                  className="px-2 py-1 rounded bg-blue-600 text-white text-xs"
                  onClick={() => {
                    try {
                      addNotif && addNotif(
                        'Αίτημα εντύπων προς Μονάδα',
                        `Αποστολή εντύπων αναγνώρισης/παρακολούθησης για το έργο "${project.projectName}"`,
                        { page: 'unit', tab: 'transfers' }
                      );
                    } catch {}
                    alert('Στάλθηκε αίτημα προς τη Μονάδα για αποστολή εντύπων.');
                  }}
                >
                  Αίτημα προς Μονάδα για αποστολή εντύπων
                </button>
              </div>
            )}
            {/* Separation before slips section */}
            <div className="my-4 border-t" />
            {project.offPlatformTransporter && (
              <div className="bg-white rounded border p-3">
                <div className="font-semibold mb-2">Δελτία Παραλαβής Μονάδας Διαχείρισης Αποβλήτων</div>
                {(() => {
                  const slipsForProject = A(unitSlips).filter((s: any) => {
                    const byId = s.projectId && project.id && s.projectId === project.id;
                    const byName = s.project && s.project === project.projectName;
                    const byProducer = !project.producer || (s.producer === project.producer);
                    return (byId || byName) && byProducer;
                  });
                  return (
                    <table className="w-full border text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border px-2">Α/Α</th>
                          <th className="border px-2">Ημ/νία</th>
                          <th className="border px-2">Ώρα</th>
                          <th className="border px-2">Μεταφορέας</th>
                          <th className="border px-2">Αρ. Οχήματος</th>
                          <th className="border px-2">Βάρος (tn)</th>
                          <th className="border px-2">ΕΚΑ</th>
                          <th className="border px-2">PDF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slipsForProject.length === 0 ? (
                          <tr><td className="border text-center p-3" colSpan={8}>—</td></tr>
                        ) : (
                          slipsForProject.map((s: any, i: number) => (
                            <tr key={s.id}>
                              <td className="border text-center">{i + 1}</td>
                              <td className="border text-center">{fmt(s.date)}</td>
                              <td className="border text-center">{s.time || '-'}</td>
                              <td className="border text-center">{s.transporter || '—'}</td>
                              <td className="border text-center">{s.vehicle || '—'}</td>
                              <td className="border text-center">{s.weight || '—'}</td>
                              <td className="border text-center">{s.ekaCategory || '—'}</td>
                              <td className="border text-center"><Btn className="bg-gray-100" onClick={() => pdfSlip(s)}>PDF</Btn></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            )}
          </div>
        </>
      )}

      {subTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-4">
          <div className="bg-white rounded border p-3">
            <div className="text-xs text-gray-500">Συνολικές Μεταφορές</div>
            <div className="text-2xl font-semibold">{list.length}</div>
          </div>
          <div className="bg-white rounded border p-3">
            <div className="text-xs text-gray-500">Ολοκληρωμένες</div>
            <div className="text-2xl font-semibold">{deliveredTransports.length}</div>
          </div>
          <div className="bg-white rounded border p-3">
            <div className="text-xs text-gray-500">Συνολικό Βάρος (tn)</div>
            <div className="text-2xl font-semibold">{(Object.values(actualsMap).reduce((s: number, v: any) => s + (Number(v) || 0), 0)).toFixed(2)}</div>
          </div>
        </div>
      )}

      {showReqModal && (
        <Modal
          title="Νέο Αίτημα Κάδου"
          onClose={() => { setShowReqModal(false); setReqType(''); }}
          onSubmit={() => {
            if (!reqType) { alert('Επιλέξτε τύπο αιτήματος'); return; }
            if (onRequestTransfer) {
              onRequestTransfer(project, reqType as any);
              setJustRequested(reqType);
            }
            setShowReqModal(false);
            setReqType('');
            setTimeout(() => setJustRequested(null), 2600);
          }}
          submitLabel="Αίτημα"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <label className="block">Έργο
              <input className="border p-1 w-full bg-gray-50" value={project.projectName} readOnly />
            </label>
            <label className="block">Διεύθυνση
              <input className="border p-1 w-full bg-gray-50" value={project.address || ''} readOnly />
            </label>
            <label className="block">Μονάδα
              <input className="border p-1 w-full bg-gray-50" value={project.unit || ''} readOnly />
            </label>
            <label className="block md:col-span-2">Μεταφορέας
              <input className="border p-1 w-full bg-gray-50" value={project.transporter || ''} readOnly />
            </label>
          </div>

          <div className="mt-4">
            <div className="font-semibold mb-2">Επιλογή τύπου αιτήματος</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button type="button" onClick={() => setReqType('new-bin')} className={`px-3 py-2 rounded border text-sm ${reqType === 'new-bin' ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-gray-50 text-gray-800'}`}>
                Νέος κάδος
              </button>
              <button type="button" onClick={() => setReqType('change-bin')} className={`px-3 py-2 rounded border text-sm ${reqType === 'change-bin' ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-gray-50 text-gray-800'}`}>
                Αλλαγή κάδου
              </button>
              <button type="button" onClick={() => setReqType('move-bin')} className={`px-3 py-2 rounded border text-sm ${reqType === 'move-bin' ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-gray-50 text-gray-800'}`}>
                Μεταφορά κάδου
              </button>
            </div>
            {!reqType && (
              <div className="text-xs text-gray-500 mt-2">Επιλέξτε έναν τύπο για να συνεχίσετε.</div>
            )}
          </div>
        </Modal>
      )}

      {prodOrderOpen && (
        <Modal
          title="Παραγγελία Υλικού"
          onClose={() => { setProdOrderOpen(false); setProdOrderForm({ product: '', quantity: '' }); }}
          onSubmit={() => {
            const productName = (prodOrderForm.product || '').trim();
            const qtyNum = parseFloat(String(prodOrderForm.quantity).replace(',', '.'));
            if (!productName) { alert('Επιλέξτε προϊόν'); return; }
            if (!(qtyNum > 0)) { alert('Συμπληρώστε έγκυρη ποσότητα'); return; }
            try {
              const raw = localStorage.getItem('iwm_unit_product_orders');
              const arr = raw ? JSON.parse(raw) : [];
              const orders = Array.isArray(arr) ? arr : [];
              const order = {
                id: gid(),
                producer: project.producer,
                project: project.projectName,
                projectId: project.id,
                managerName: project.managerName || '',
                managerPhone: project.managerPhone || '',
                product: productName,
                quantity: qtyNum,
                date: today(),
                time: new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', hour12: false }),
                status: '',
              };
              const next = [order, ...orders];
              localStorage.setItem('iwm_unit_product_orders', JSON.stringify(next));
            } catch {}
            setProdOrderOpen(false);
            setProdOrderForm({ product: '', quantity: '' });
            alert('Η παραγγελία καταχωρήθηκε.');
          }}
          submitLabel="Καταχώρηση"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <label className="block">Έργο
              <input className="border p-1 w-full bg-gray-50" value={project.projectName} readOnly />
            </label>
            <label className="block">Μονάδα
              <input className="border p-1 w-full bg-gray-50" value={project.unit || ''} readOnly />
            </label>
            <label className="block">Προϊόν
              <select className="border p-1 w-full rounded" value={prodOrderForm.product} onChange={(e:any)=> setProdOrderForm(f => ({ ...f, product: e.target.value }))}>
                <option value="">— Επιλογή —</option>
                {A(unitProducts).length === 0 ? (
                  <option value="" disabled>Δεν υπάρχουν διαθέσιμα προϊόντα</option>
                ) : (
                  unitProducts.map((p:any) => (<option key={p.id} value={p.name}>{p.name} {p.price ? `— €${p.price}` : ''}</option>))
                )}
              </select>
            </label>
            <label className="block">Ποσότητα
              <input className="border p-1 w-full rounded" inputMode="decimal" placeholder="π.χ. 10" value={prodOrderForm.quantity} onChange={(e:any)=> setProdOrderForm(f => ({ ...f, quantity: e.target.value }))} />
            </label>
          </div>
          {A(unitProducts).length === 0 && (
            <div className="mt-2 text-xs text-gray-500">Δεν έχουν οριστεί προϊόντα από τη Μονάδα.</div>
          )}
        </Modal>
      )}

      {subTab === 'collective' && (
        <div className="grid grid-cols-1 gap-4 text-sm">
          <div className="bg-white rounded border p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Ανέβασμα Εντύπων</div>
              <div className="text-xs text-gray-600">Συλλογικό Σύστημα: <span className="font-semibold">{project.collectiveSystem || '—'}</span></div>
            </div>
            <div className="space-y-4">
              {/* Γνωστοποίηση Εργοταξίου */}
              <div className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Γνωστοποίηση Εργοταξίου</div>
                  {uploadedSiteNotice && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 text-green-700 px-2 py-0.5 text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.5a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 1.414-1.414L8.5 12.086l6.793-6.793a1 1 0 0 1 1.411-.003z" clipRule="evenodd" />
                        </svg>
                        Ανεβασμένο
                      </span>
                      {siteNoticeDoc?.name && (
                        <span className="text-xs text-gray-500 truncate max-w-[180px]" title={siteNoticeDoc.name}>{siteNoticeDoc.name}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-600">Αρχείο</label>
                    <input type="file" className="w-full border p-1" accept=".pdf,image/*" onChange={(e: any) => setSiteNoticeFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <button disabled={uploadedSiteNotice} className={`w-full px-3 py-2 rounded ${uploadedSiteNotice ? 'bg-green-100 text-green-700 cursor-default' : 'bg-green-600 text-white'}`} onClick={() => submitProjectDoc('Γνωστοποίηση Εργοταξίου', siteNoticeFile, () => setSiteNoticeFile(null))}>
                      {uploadedSiteNotice ? 'Ανέβηκε' : 'Ανέβασμα'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Σχέδιο Διαχείρισης Αποβλήτων */}
              <div className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Σχέδιο Διαχείρισης Αποβλήτων</div>
                  {uploadedWastePlan && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 text-green-700 px-2 py-0.5 text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.5a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 1.414-1.414L8.5 12.086l6.793-6.793a1 1 0 0 1 1.411-.003z" clipRule="evenodd" />
                        </svg>
                        Ανεβασμένο
                      </span>
                      {wastePlanDoc?.name && (
                        <span className="text-xs text-gray-500 truncate max-w-[180px]" title={wastePlanDoc.name}>{wastePlanDoc.name}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-600">Αρχείο</label>
                    <input type="file" className="w-full border p-1" accept=".pdf,image/*" onChange={(e: any) => setWastePlanFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                  {/* If transporter is off-platform, show the request banner below the tables */}
                  </div>
                </div>
              </div>

                {/* Συμφωνία Διαχείρισης Αποβλήτων */}
              <div className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Συμφωνία Διαχείρισης Αποβλήτων</div>
                  {/* καμία ένδειξη τίτλου/τικ */}
                </div>
                {/* Agreement display logic:
                    - if project.agreement exists and is not '-', show agreement number and PDF
                    - if estimated < 12 tn, show '-' and explanatory text
                    - otherwise show the default informative text */}
                {(() => {
                  const est = project.estimated ?? sumWaste(project.wasteLines || []);
                  if (project.agreement && project.agreement !== '-') {
                    return (
                      <div className="flex items-center justify-between bg-gray-50 border rounded p-3">
                        <div className="text-sm">
                          <div className="text-gray-700">Αρ. Συμφωνίας: <span className="font-semibold">{project.agreement}</span></div>
                          {project.agreementDate && (
                            <div className="text-xs text-gray-500">Ημ/νία: {fmt(project.agreementDate)}</div>
                          )}
                        </div>
                        <div>
                          <Btn className="bg-gray-100" onClick={() => pdfAgreement(project)}>PDF</Btn>
                        </div>
                      </div>
                    );
                  }
                  if ((est || 0) < 12) {
                    return (
                      <div className="text-xs text-gray-700">
                        <div className="font-semibold">-</div>
                        <div className="text-xs text-gray-500 mt-1">Για έργα με απόβλητα &lt;12 κυβικά δεν χρειάζεται συμφωνία</div>
                      </div>
                    );
                  }
                  return <div className="text-xs text-gray-500">Δημιουργείται αυτόματα μετά την αποδοχή της μονάδας</div>;
                })()}
              </div>

              <div className="flex justify-end pt-2">
                <button disabled={!allUploaded} onClick={handleSubmitAll} className={`px-4 py-2 rounded ${allUploaded ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 cursor-not-allowed'}`}>Υποβολή</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ProjectView: full project page with details, pending/completed transfers and comparison tables */
const ProjectView = ({ project, transports, onBack }: any) => {
  // pending and completed transfers for project
  const pending = A(transports).filter((t: any) => t.projectId === project.id && t.approvedByProducer && !t.receivedByUnit && !t.manualWeighed && !t.manualCreated);
  const completed = A(transports).filter((t: any) => t.projectId === project.id && t.receivedByUnit);

  // estimated lines from project
  const estimated = A(project.wasteLines);

  // Unit slips (from tablet) for off-platform projects
  const [unitSlips, setUnitSlips] = React.useState<any[]>([]);
  React.useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem('iwm_tablet_slips');
        const arr = raw ? JSON.parse(raw) : [];
        setUnitSlips(Array.isArray(arr) ? arr : []);
      } catch { setUnitSlips([]); }
    };
    read();
    const id = window.setInterval(read, 1500);
    return () => window.clearInterval(id);
  }, []);

  // actuals aggregated by EKA code from completed transports and (if off-platform) unit slips
  const actualsMap: Record<string, number> = {};
  // from completed transports
  completed.forEach((t: any) => {
    const code = t.ekaCategory || '—';
    const w = parseFloat(String(t.weight || '0')) || 0;
    actualsMap[code] = (actualsMap[code] || 0) + w;
  });
  // from unit slips (off-platform projects)
  if (project.offPlatformTransporter) {
    const slipsForProject = A(unitSlips).filter((s: any) => {
      const byId = s.projectId && project.id && s.projectId === project.id;
      const byName = s.project && s.project === project.projectName;
      const byProducer = !project.producer || (s.producer === project.producer);
      return (byId || byName) && byProducer;
    });
    slipsForProject.forEach((s: any) => {
      const code = s.ekaCategory || '—';
      const w = parseFloat(String(s.weight || '0')) || 0;
      actualsMap[code] = (actualsMap[code] || 0) + w;
    });
  }

  

  // Per-slip uploaded forms (recognition/monitoring) stored by slip id
  const [slipForms, setSlipForms] = React.useState<Record<string, any>>(() => {
    try {
      const raw = localStorage.getItem('iwm_slip_forms');
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === 'object' ? obj : {};
    } catch {
      return {} as Record<string, any>;
    }
  });
  React.useEffect(() => {
    try { localStorage.setItem('iwm_slip_forms', JSON.stringify(slipForms)); } catch {}
  }, [slipForms]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Btn className="bg-gray-100" onClick={onBack}>← Επιστροφή</Btn>
        </div>
  <h2 className="text-xl font-bold">
    {project.projectName}
    {project.agreement && project.agreement !== '-' ? (
      project.agreement === 'Σε εκκρεμότητα' ? (
        <span className="ml-2 relative inline-flex items-center group">
          <span aria-hidden title="Συμφωνία σε εκκρεμότητα" className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">!</span>
          <div className="hidden group-hover:block absolute left-0 top-full mt-2 z-20 w-64 bg-white border border-gray-200 rounded shadow p-2 text-xs text-gray-700">
            <ul className="list-disc pl-4 space-y-1">
              <li>Εκκρεμεί η Συμφωνία Διαχείρισης Αποβλήτων</li>
              <li>Εκκρεμεί η έκδοση ID του έργου</li>
            </ul>
          </div>
        </span>
      ) : (
        ` (${project.agreement})`
      )
    ) : ''}
  </h2>
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
              {project.offPlatformTransporter ? (
                <tr><td className="border text-center p-3" colSpan={4}>Ο μεταφορέας δεν χρησιμοποιεί την πλατφόρμα</td></tr>
              ) : pending.length === 0 ? (
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
              {project.offPlatformTransporter ? (
                <tr><td className="border text-center p-3" colSpan={5}>Ο μεταφορέας δεν χρησιμοποιεί την πλατφόρμα</td></tr>
              ) : (() => {
                // include transports that were delivered to unit but are awaiting transporter signature
                const pendingDelivered = A(transports).filter((t:any) => (
                  (t.projectId === project.id || (t.project && project.projectName && String(t.project).trim().toLowerCase() === String(project.projectName).trim().toLowerCase()))
                  && t.deliveredToUnit && !t.receivedByUnit
                ));
                // combine received (completed) and pendingDelivered, prefer completed over pending when they refer to the same delivery
                const combined: any[] = [];
                const completedKeys = new Set<string>();
                const mkKey = (x:any) => {
                  const proj = x.projectId || x.project || '';
                  const veh = String(x.vehicle || '').trim().toLowerCase();
                  const dt = String(x.unitDate || x.date || '').trim();
                  const prod = String(x.producer || '').trim().toLowerCase();
                  return `${prod}||${proj}||${veh}||${dt}`;
                };
                // add completed first and record keys
                A(completed).forEach((c:any) => { combined.push(c); completedKeys.add(mkKey(c)); });
                // add pendingDelivered only if there isn't a completed with same key
                pendingDelivered.forEach((p:any) => {
                  const k = mkKey(p);
                  if (!completedKeys.has(k)) combined.push(p);
                });
                if (combined.length === 0) return (<tr><td className="border text-center p-3" colSpan={5}>—</td></tr>);
                // sort by unitDate/date desc
                combined.sort((a:any,b:any)=> (b.unitDate || b.date || '').localeCompare(a.unitDate || a.date || ''));
                return combined.map((t:any, i:number) => (
                  <tr key={t.id} className={`${(t.deliveredToUnit && !t.receivedByUnit) ? 'bg-yellow-50' : ''}`}>
                    <td className="border text-center">{i + 1}</td>
                    <td className="border text-center">
                      {t.producer}
                      {(t.deliveredToUnit && !t.receivedByUnit) && (
                        <span className="ml-2 inline-flex items-center text-red-700 text-xs">❗ Εκκρεμούν υπογραφές παράδοσης</span>
                      )}
                    </td>
                    <td className="border text-center">{fmt(t.unitDate || t.date)}</td>
                    <td className="border text-center">{t.weight}</td>
                    <td className="border text-center">{t.ekaCategory}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {project.offPlatformTransporter && (
        <div className="bg-white rounded border p-4 mb-4">
          <div className="font-semibold mb-2">Δελτία Παραλαβής</div>
          {(() => {
            const slipsForProject = A(unitSlips).filter((s: any) => {
              const byId = s.projectId && project.id && s.projectId === project.id;
              const byName = s.project && s.project === project.projectName;
              const byProducer = !project.producer || (s.producer === project.producer);
              return (byId || byName) && byProducer;
            });
            return (
              <>
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2">Α/Α</th>
                      <th className="border px-2">Ημ/νία</th>
                      <th className="border px-2">Ώρα</th>
                      <th className="border px-2">Μεταφορέας</th>
                      <th className="border px-2">Αρ. Οχήματος</th>
                      <th className="border px-2">Βάρος (tn)</th>
                      <th className="border px-2">ΕΚΑ</th>
                      <th className="border px-2">PDF</th>
                      <th className="border px-2">Έντυπο</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slipsForProject.length === 0 ? (
                      <tr><td className="border text-center p-3" colSpan={9}>—</td></tr>
                    ) : (
                      slipsForProject.map((s: any, i: number) => (
                        <tr key={s.id}>
                          <td className="border text-center">{i + 1}</td>
                          <td className="border text-center">{fmt(s.date)}</td>
                          <td className="border text-center">{s.time || '-'}</td>
                          <td className="border text-center">{s.transporter || '—'}</td>
                          <td className="border text-center">{s.vehicle || '—'}</td>
                          <td className="border text-center">{s.weight || '—'}</td>
                          <td className="border text-center">{s.ekaCategory || '—'}</td>
                          <td className="border text-center"><Btn className="bg-gray-100" onClick={() => pdfSlip(s)}>PDF</Btn></td>
                          <td className="border text-center">
                            {(() => {
                              const f = slipForms[s.id];
                              const onPick = (file: File | null) => {
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setSlipForms((prev: any) => ({ ...prev, [s.id]: { name: file.name, date: today(), data: reader.result } }));
                                };
                                reader.readAsDataURL(file);
                              };
                              const inputId = `slip_upload_${s.id}`;
                              return (
                                <div className="flex items-center justify-center gap-2">
                                  {f ? (
                                    <>
                                      <span className="text-xs text-green-700" title={f.name}>Ανέβηκε</span>
                                      {f.data && (
                                        <button className="px-2 py-1 rounded bg-gray-100 text-xs" onClick={() => { try { const w = window.open(); if (w) { w.document.write(`<iframe src='${f.data}' style='border:0;position:fixed;left:0;top:0;width:100%;height:100%'></iframe>`); } } catch {} }}>Προβολή</button>
                                      )}
                                      <label htmlFor={inputId} className="px-2 py-1 rounded bg-blue-600 text-white text-xs cursor-pointer">Αντικατάσταση</label>
                                      <input id={inputId} type="file" className="hidden" accept="application/pdf,.pdf" onChange={(e: any) => onPick(e.target.files?.[0] || null)} />
                                    </>
                                  ) : (
                                    <>
                                      <label htmlFor={inputId} className="px-2 py-1 rounded bg-blue-600 text-white text-xs cursor-pointer">Ανέβασμα PDF</label>
                                      <input id={inputId} type="file" className="hidden" accept="application/pdf,.pdf" onChange={(e: any) => onPick(e.target.files?.[0] || null)} />
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-gray-600">Μαζικό ανέβασμα εντύπων (pdf).</div>
                  {(() => {
                    const bulkId = `bulk_upload_${project.id}`;
                    const handleBulk = (files: FileList | null) => {
                      const arr = files ? Array.from(files) : [];
                      if (arr.length === 0 || slipsForProject.length === 0) return;
                      const n = Math.min(arr.length, slipsForProject.length);
                      for (let i = 0; i < n; i++) {
                        const file = arr[i];
                        const slip = slipsForProject[i];
                        const reader = new FileReader();
                        reader.onload = () => {
                          const data = reader.result as string;
                          setSlipForms((prev: any) => ({ ...prev, [slip.id]: { name: file.name, date: today(), data } }));
                        };
                        reader.readAsDataURL(file);
                      }
                      if (arr.length > n) {
                        alert(`Ανέβηκαν ${n} από ${arr.length} αρχεία (όσα δελτία εμφανίζονται).`);
                      } else {
                        alert(`Ανέβηκαν ${n} αρχεία.`);
                      }
                    };
                    return (
                      <>
                        <label htmlFor={bulkId} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm cursor-pointer">Ανέβασμα Όλων</label>
                        <input id={bulkId} type="file" className="hidden" accept="application/pdf,.pdf" multiple onChange={(e: any) => handleBulk(e.target.files)} />
                      </>
                    );
                  })()}
                </div>
              </>
            );
          })()}
        </div>
      )}

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
                      <tr key={e.code}><td className="border px-2"><span className="whitespace-nowrap">{String(e.code).replace(/ /g, '\u00A0')}</span></td><td className="border px-2 text-right">{e.quantity || 0}</td></tr>
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
                {estimated.length === 0 ? (
                  <tr><td className="border text-center p-3" colSpan={2}>—</td></tr>
                ) : (
                  // Show same rows/codes as in the initial estimate; fill with actual quantities (0 if none)
                  <>
                    {estimated.map((e: any) => (
                      <tr key={`actual-${e.code}`}>
                        <td className="border px-2"><span className="whitespace-nowrap">{String(e.code).replace(/ /g, '\u00A0')}</span></td>
                        <td className="border px-2 text-right">{Number(actualsMap[e.code] || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {/* Include any extra codes that appeared in actuals but not in estimate */}
                    {Object.keys(actualsMap).filter(c => !A(estimated).some((e: any) => e.code === c)).map((code) => (
                      <tr key={`actual-extra-${code}`}>
                        <td className="border px-2"><span className="whitespace-nowrap">{String(code).replace(/ /g, '\u00A0')}</span></td>
                        <td className="border px-2 text-right">{Number(actualsMap[code] || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Small helper component for editing transporter in ProjectDetails
const EditableTransporter = ({ current, offPlatform, options = [], onSave }: any) => {
  const [val, setVal] = React.useState(current || '');
  return (
    <div className="flex items-center gap-2">
      <select className="border p-1" value={val} onChange={(e:any) => setVal(e.target.value)}>
        <option value="">— Επιλογή Μεταφορέα —</option>
        {options.map((o: string) => (<option key={o} value={o}>{o}</option>))}
      </select>
      <button className="px-2 py-1 rounded bg-blue-600 text-white text-sm" onClick={() => onSave(val)}>Αποθήκευση</button>
      {offPlatform && <div className="text-xs text-gray-500">(Αλλαγή από εκτός πλατφόρμας σε εντός πλατφόρμας)</div>}
    </div>
  );
};

 

/******** producer ********/
const Producer = ({ projects, transports, onAddProject, onApproveTransport, onRejectTransport, onOpenProject, onRequestTransfer, onCancelRequest, notifications, onJump, deepLink, onClearTransNew, onClearProjectsNew }: any) => {
  const [filter, setFilter] = useState({ producer: '', project: '', debtor: '', transporter: '', vehicle: '', from: '', to: '' });
  const [exportOpen, setExportOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [tab, setTab] = useState('projects');
  const [menuOpen, setMenuOpen] = useState(false);

  const subscriptionRef = React.useRef<any>(null);
  React.useEffect(() => {
    try {
      if (tab === 'subscription' && subscriptionRef.current) {
        subscriptionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch {}
  }, [tab]);
  const [subTab, setSubTab] = useState('active');
  const [projSubTab, setProjSubTab] = useState<'active' | 'completed'>('active');
  const [showProjectFilters, setShowProjectFilters] = useState(false);
  const [showTransferFilters, setShowTransferFilters] = useState(false);
  const [reqSubTab, setReqSubTab] = useState<'all' | 'transfers' | 'bins'>('all');
  const DEFAULT_PRODUCER_NAME = 'Παραγωγός Α';
  const [myProducer, setMyProducer] = useState<string>(DEFAULT_PRODUCER_NAME);
  const [prevProfileKey, setPrevProfileKey] = useState<string | null>(null);
  // Producer profile (editable, persisted per-producer)
  const [profileForm, setProfileForm] = useState<any>({
    contractorName: '',
    contractorEmail: '',
    contractorPhone: '',
    contractorPostalAddress: '',
    contractorFax: '',
    contractorRegistryNumber: '',
    contractorID: '',
    contractorTechDirectorName: '',
    contractorVAT: '',
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('basic');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  React.useEffect(() => {
    try {
      // Attempt to load profile from default key first, then fall back to any existing profile key
      let defaultKey = `iwm_producer_profile_${(DEFAULT_PRODUCER_NAME||'').replace(/\s+/g,'_')}`;
      let raw = localStorage.getItem(defaultKey);
      let loaded: any = null;
      let foundKey: string | null = null;
      if (raw) {
        try {
          const obj = JSON.parse(raw);
          if (obj && typeof obj === 'object') {
            loaded = obj;
            foundKey = defaultKey;
          }
        } catch {}
      }
      if (!loaded) {
        // scan for any existing producer profile key
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || '';
          if (k.startsWith('iwm_producer_profile_')) {
            try {
              const r = localStorage.getItem(k);
              if (!r) continue;
              const obj = JSON.parse(r);
              if (obj && typeof obj === 'object') {
                loaded = obj;
                foundKey = k;
                break;
              }
            } catch {}
          }
        }
      }
      if (loaded) {
        setProfileForm(loaded);
        if (loaded.contractorName) setMyProducer(loaded.contractorName);
        setPrevProfileKey(foundKey);
        try {
          const namePart = (foundKey || '').replace('iwm_producer_profile_', '');
          const subKey = `iwm_producer_subscription_${namePart}`;
          const v = localStorage.getItem(subKey);
          if (v === 'premium' || v === 'basic' || v === 'free') setSubscriptionPlan(v === 'free' ? 'basic' : v);
          else if (v === '1') setSubscriptionPlan('premium');
          else setSubscriptionPlan('basic');
        } catch {}
      } else {
        setPrevProfileKey(defaultKey);
        try {
          const namePart = (DEFAULT_PRODUCER_NAME||'').replace(/\s+/g,'_');
          const subKey = `iwm_producer_subscription_${namePart}`;
          const v = localStorage.getItem(subKey);
          if (v === 'premium' || v === 'basic' || v === 'free') setSubscriptionPlan(v === 'free' ? 'basic' : v);
          else if (v === '1') setSubscriptionPlan('premium');
          else setSubscriptionPlan('basic');
        } catch {}
      }
    } catch {}
  }, []);

  // (Removed invalid useEffect with JSX for subscription tab)
  const saveProfile = () => {
    try {
      const nameForKey = (profileForm.contractorName || myProducer || DEFAULT_PRODUCER_NAME).replace(/\s+/g,'_');
      const newKey = `iwm_producer_profile_${nameForKey}`;
      localStorage.setItem(newKey, JSON.stringify(profileForm || {}));
      // remove previous key if it differs
      try {
        if (prevProfileKey && prevProfileKey !== newKey) localStorage.removeItem(prevProfileKey);
      } catch {}
      setPrevProfileKey(newKey);
      if (profileForm.contractorName) setMyProducer(profileForm.contractorName);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch {}
  };
  const resetProfile = () => {
    try {
      if (prevProfileKey) localStorage.removeItem(prevProfileKey);
    } catch {}
    setProfileForm({ contractorName: '', contractorEmail: '', contractorPhone: '', contractorPostalAddress: '', contractorFax: '', contractorRegistryNumber: '', contractorID: '', contractorTechDirectorName: '', contractorVAT: '' });
    setMyProducer(DEFAULT_PRODUCER_NAME);
    // reset prev key to default
    try { setPrevProfileKey(`iwm_producer_profile_${(DEFAULT_PRODUCER_NAME||'').replace(/\s+/g,'_')}`); } catch {}
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 1200);
  };
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
    projectName: '',
    
    // detailed address fields
    addressStreet: '', addressCity: '', addressPostalCode: '', addressProvince: '', addressLocation: '', addressPlanSheetNumber: '', addressParcelNumber: '', addressOtherNotes: '',
    // owners
    ownerName: '', ownerEmail: '', ownerPhone: '', ownerPostalAddress: '',
    // contractor
    contractorName: '', contractorEmail: '', contractorPhone: '', contractorPostalAddress: '', contractorFax: '', contractorRegistryNumber: '', contractorID: '', contractorTechDirectorName: '', contractorVAT: '',
    // collective/system
    collectiveSystem: 'ΟΑΚ',
    // supervising engineer
    supervisorName: '', supervisorRegistryNumber: '',
    // project type / size (checkboxes & details)
    typeNewConstruction: false, typeExtension: false, typeConversion: false, typeRenovation: false, typeDemolition: false, typeOther: '', sizeDetails: '',
    start: today(), end: today(), unit: UNITS[0], transporter: TRANSPORTERS[0],
    // allow choosing a transporter outside the platform as a manual entry
    transporterMode: 'platform' as 'platform' | 'manual',
    otherTransporter: '',
    // managerName/phone/email removed per requirements
    wasteLines: EKA.map(e => ({ code: e.code, description: e.description, quantity: '' })),
  }));
  const totalEstimated = sumWaste(pForm.wasteLines);

  // Enforce off-platform transporter when Basic plan is selected and Add New modal is open
  React.useEffect(() => {
    if (showNew && subscriptionPlan === 'basic' && pForm.transporterMode !== 'manual') {
      setPForm((prev: any) => ({ ...prev, transporterMode: 'manual' }));
    }
  }, [showNew, subscriptionPlan]);

  const submitNew = () => {
    if (!pForm.projectName || !pForm.addressStreet) return;
    // resolve transporter based on mode; when manual, require a name and mark off-platform
    let finalTransporter = pForm.transporter;
    let offPlatformTransporter = false;
    if (pForm.transporterMode === 'manual') {
      const name = (pForm.otherTransporter || '').trim();
      if (!name) return alert('Συμπλήρωσε το όνομα μεταφορέα (εκτός πλατφόρμας)');
      finalTransporter = name;
      offPlatformTransporter = true;
    }
  const { transporterMode, otherTransporter, ...rest } = pForm as any;
  const composedAddress = [pForm.addressStreet, pForm.addressLocation || pForm.addressCity, pForm.addressPostalCode, pForm.addressProvince].filter(Boolean).join(', ');
    // Agreement requirement: projects with estimated total < 12 (tn) do not require an agreement
    const agreementRequired = (totalEstimated || 0) >= 12;
    // Do not accept a manual agreement number from the Add New Project form anymore.
    // If an agreement is required, mark it as pending; otherwise store '-'.
    const agreementValue = agreementRequired ? 'Σε εκκρεμότητα' : '-';
    onAddProject({ id: gid(), producer: myProducer, ...rest, address: composedAddress, transporter: finalTransporter, offPlatformTransporter, estimated: totalEstimated, agreement: agreementValue, agreementDate: null, isNew: true,
      // fill contractor fields from producer profile when available
      contractorName: profileForm.contractorName || rest.contractorName || '',
      contractorEmail: profileForm.contractorEmail || rest.contractorEmail || '',
      contractorPhone: profileForm.contractorPhone || rest.contractorPhone || '',
      contractorPostalAddress: profileForm.contractorPostalAddress || rest.contractorPostalAddress || '',
      contractorFax: profileForm.contractorFax || rest.contractorFax || '',
      contractorRegistryNumber: profileForm.contractorRegistryNumber || rest.contractorRegistryNumber || '',
      contractorID: profileForm.contractorID || rest.contractorID || '',
      contractorTechDirectorName: profileForm.contractorTechDirectorName || rest.contractorTechDirectorName || '',
      contractorVAT: profileForm.contractorVAT || rest.contractorVAT || ''
    });
  setShowNew(false);
    setPForm({ ...pForm,
    projectName: '', addressStreet: '', addressCity: '', addressPostalCode: '', addressProvince: '', addressLocation: '', addressPlanSheetNumber: '', addressParcelNumber: '', addressOtherNotes: '',
    ownerName: '', ownerEmail: '', ownerPhone: '', ownerPostalAddress: '',
    // prefill contractor fields from profile so new projects pick them up automatically
    contractorName: profileForm.contractorName || '', contractorEmail: profileForm.contractorEmail || '', contractorPhone: profileForm.contractorPhone || '', contractorPostalAddress: profileForm.contractorPostalAddress || '', contractorFax: profileForm.contractorFax || '', contractorRegistryNumber: profileForm.contractorRegistryNumber || '', contractorID: profileForm.contractorID || '', contractorTechDirectorName: profileForm.contractorTechDirectorName || '', contractorVAT: profileForm.contractorVAT || '',
    collectiveSystem: 'ΟΑΚ', supervisorName: '', supervisorRegistryNumber: '',
    typeNewConstruction: false, typeExtension: false, typeConversion: false, typeRenovation: false, typeDemolition: false, typeOther: '', sizeDetails: '',
    start: today(), end: today(), transporterMode: 'platform', otherTransporter: '', wasteLines: EKA.map(e => ({ code: e.code, description: e.description, quantity: '' }))
  });
  };

  const tabs = [
    { key: 'projects', label: 'Έργα', count: A(projects).filter((p:any)=> !!p.isNew).length },
    { key: 'transfers', label: 'Μεταφορές', count: A(transports).filter((t:any)=> !!t.isNew).length },
    { key: 'reports', label: 'Αναφορές', count: 0 },
    { key: 'profile', label: 'Προφίλ' },
    { key: 'subscription', label: 'Συνδρομή' },
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
        <div className="flex items-center gap-3">
          <BellBtn items={A(notifications).filter((n: any) => n.target?.page === 'producer')} onJump={onJump} />
          <div className="relative">
            <button aria-label="Μενού" title="Μενού" onClick={() => setMenuOpen(v => !v)} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200">☰</button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white border rounded shadow-lg z-20">
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); setTab('profile'); }}>Προφίλ</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); setTab('subscription'); }}>Συνδρομή</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); setTab('requests'); }}>Αιτήματα</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600" onClick={() => { setMenuOpen(false); alert('Αποσύνδεση'); }}>Αποσύνδεση</button>
              </div>
            )}
          </div>
        </div>
      </div>
      

      {tab !== 'requests' && (
        <TabBar tabs={tabs} active={tab} onChange={(k: string) => {
          const key = typeof k === 'string' ? k : 'aitimata';
          if (key === 'transfers') { onClearTransNew && onClearTransNew(); }
          if (key === 'projects') { onClearProjectsNew && onClearProjectsNew(); }
          setTab(key);
        }} />
      )}
      {tab === 'requests' && (
        <div className="mb-3">
          <button
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
            onClick={() => setTab('projects')}
          >
            ← Πίσω
          </button>
        </div>
      )}
      {false && tab === 'transfers' && (
        <FilterBar producers={uniqueProducers(projects)} projects={projectsByProducer(projects, myProducer)} value={filter} onChange={setFilter} showProject={true} showProducer={false} />
      )}

      {tab === 'subscription' && (
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <h2 className="text-xl font-bold mb-6">Επιλογή Πακέτου Συνδρομής</h2>
          <div className="w-full max-w-2xl mb-4 text-center text-sm text-gray-600">Επίλεξε ένα πακέτο παρακάτω</div>
          <div className="mt-8 text-gray-600 w-full max-w-2xl">
            <div className="mb-3">Επιλεγμένο πακέτο: <span className="font-bold">{subscriptionPlan === 'premium' ? 'Premium' : 'Basic'}</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              <div className={`border rounded p-4 cursor-pointer flex flex-col justify-between h-full ${subscriptionPlan === 'basic' ? 'ring-2 ring-blue-500 shadow-sm' : 'hover:shadow-md'} bg-green-50`} onClick={() => { setSubscriptionPlan('basic'); try { localStorage.setItem(`iwm_producer_subscription_${myProducer.replace(/\s/g,'_')}`, 'basic'); } catch {} }}>
                <div className="flex flex-col items-center text-center">
                  <div className="text-lg font-semibold">Basic</div>
                  <div className="text-sm text-gray-700 mt-4">Ιδανικό για βασική χρήση και μικρές επιχειρήσεις.</div>
                </div>
                <ul className="mt-5 text-sm text-gray-700 list-disc list-inside">
                  <li>Πλήρης πρόσβαση στις βασικές λειτουργίες</li>
                  <li>Στατικές αναφορές με εξαγωγή CSV</li>
                  <li>Βασική αναφορά ανά έργο και περίοδο</li>
                </ul>
                <div className="mt-4 text-sm font-semibold text-indigo-700 text-center">ΔΩΡΕΑΝ</div>
              </div>
              <div className={`border rounded p-4 cursor-pointer flex flex-col justify-between h-full ${subscriptionPlan === 'premium' ? 'ring-2 ring-yellow-400 shadow-sm' : 'hover:shadow-md'} bg-yellow-50`} onClick={() => { setSubscriptionPlan('premium'); try { localStorage.setItem(`iwm_producer_subscription_${myProducer.replace(/\s/g,'_')}`, 'premium'); } catch {} }}>
                <div className="flex flex-col items-center text-center">
                  <div className="text-lg font-semibold">Premium</div>
                  <div className="text-sm text-gray-700 mt-4">Για επιχειρήσεις που χρειάζονται προχωρημένα reports και αυτοματισμούς.</div>
                </div>
                <ul className="mt-5 text-sm text-gray-700 list-disc list-inside">
                  <li>online μεταφορές, online έντυπα αναγνώρισης και παρακολούθησης</li>
                  <li>χρήση εργαλείων και εντολών</li>
                  <li>Προτεραιότητα υποστήριξης και οδηγίες ενσωμάτωσης</li>
                </ul>
                <div className="mt-4 text-sm font-semibold text-indigo-700 text-center">€50/μήνα</div>
              </div>
            </div>
          </div>
        </div>
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
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex gap-2">
                <button onClick={() => setSubTab('active')} className={`px-3 py-2 ${subTab === 'active' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Εκκρεμείς</button>
                <button onClick={() => setSubTab('completed')} className={`px-3 py-2 ${subTab === 'completed' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Ολοκληρωμένες</button>
              </div>
              {/* mobile: show filter next to subtabs (will appear below because parent stacks on small screens) */}
              <button className="flex items-center gap-2 px-2 py-1 text-gray-700 hover:text-blue-700 sm:hidden" onClick={() => setShowTransferFilters(v => !v)} title="Φίλτρα">
                <Filter className="w-4 h-4" />
                <span className="text-sm">Φίλτρα</span>
              </button>
            </div>
            {/* desktop: keep filter on the right */}
            <button className="hidden sm:flex items-center gap-2 px-2 py-1 text-gray-700 hover:text-blue-700" onClick={() => setShowTransferFilters(v => !v)} title="Φίλτρα">
              <Filter className="w-4 h-4" />
              <span className="text-sm">Φίλτρα</span>
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

      {tab === 'profile' && (
        <div className="bg-white border rounded p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">Προφίλ Παραγωγού</div>
            <div className="text-sm text-gray-600">Παραγωγός</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <label className="col-span-2">Εργολήπτης / Εταιρεία
              <input className="border p-1 w-full" value={profileForm.contractorName} onChange={(e:any)=> setProfileForm((f:any)=> ({ ...f, contractorName: e.target.value }))} />
            </label>

            <label>Ηλ. Διεύθυνση
              <input className="border p-1 w-full" value={profileForm.contractorEmail} onChange={(e:any)=> setProfileForm((f:any)=> ({ ...f, contractorEmail: e.target.value }))} />
            </label>

            <label>Τηλ.
              <input className="border p-1 w-full" value={profileForm.contractorPhone} onChange={(e:any)=> setProfileForm((f:any)=> ({ ...f, contractorPhone: e.target.value }))} />
            </label>

            <label className="col-span-2">Ταχ. Διεύθυνση
              <input className="border p-1 w-full" value={profileForm.contractorPostalAddress} onChange={(e:any)=> setProfileForm((f:any)=> ({ ...f, contractorPostalAddress: e.target.value }))} />
            </label>

            <label>Τηλεομοιότυπο
              <input className="border p-1 w-full" value={profileForm.contractorFax} onChange={(e:any)=> setProfileForm((f:any)=> ({ ...f, contractorFax: e.target.value }))} />
            </label>

            <label>Αρ. Μητρώου
              <input className="border p-1 w-full" value={profileForm.contractorRegistryNumber} onChange={(e:any)=> setProfileForm((f:any)=> ({ ...f, contractorRegistryNumber: e.target.value }))} />
            </label>

            <label>Αρ. Ταυτότητας
              <input className="border p-1 w-full" value={profileForm.contractorID} onChange={(e:any)=> setProfileForm((f:any)=> ({ ...f, contractorID: e.target.value }))} />
            </label>

            <label className="col-span-2">Ονοματεπώνυμο Τεχνικού Διευθυντή
              <input className="border p-1 w-full" value={profileForm.contractorTechDirectorName} onChange={(e:any)=> setProfileForm((f:any)=> ({ ...f, contractorTechDirectorName: e.target.value }))} />
            </label>

            <label>Αρ. ΦΠΑ
              <input className="border p-1 w-full" value={profileForm.contractorVAT} onChange={(e:any)=> setProfileForm((f:any)=> ({ ...f, contractorVAT: e.target.value }))} />
            </label>

            <div className="col-span-2 flex items-center gap-3 justify-end">
              <button className="px-3 py-2 rounded bg-gray-200" onClick={resetProfile}>Επαναφορά</button>
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={saveProfile}>Αποθήκευση</button>
            </div>
          </div>
          {profileSaved && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 text-green-800 rounded text-sm">
              Προφίλ αποθηκεύτηκε
              <button className="ml-3 text-green-600 underline" onClick={() => setProfileSaved(false)}>Κλείσιμο</button>
            </div>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div>
          <div className="flex gap-2">
            {/* New Transfer button removed for Producer web requests tab */}
          </div>

          {(() => {
            let list: any[] = [];
            if (reqSubTab === 'all') list = [...reqFromTransporter, ...reqFromProducer].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
            if (reqSubTab === 'transfers') list = reqFromTransporter;
            if (reqSubTab === 'bins') list = reqFromProducer.filter((t: any) => t.requestType === 'new-bin' || t.requestType === 'move-bin' || t.requestType === 'change-bin');
            // For 'all' view keep both; for 'transfers' show only transporter-created, for 'bins' show only producer bin-related requests
            return (
              <div className="bg-white border rounded p-3">
                <div className="font-semibold mb-2">Αιτήματα {reqSubTab === 'all' ? '(Όλα)' : reqSubTab === 'transfers' ? '(Μεταφοράς)' : '(Κάδων)'}
                </div>
                <table className="w-full border bg-white text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2">Α/Α</th>
                      <th className="border px-2">Έργο</th>
                      <th className="border px-2">Διεύθυνση</th>
                      <th className="border px-2">Ημ/νία</th>
                      <th className="border px-2">Κατάσταση</th>
                      <th className="border px-2">Ενέργεια</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.length ? list.map((t: any, i: number) => (
                      <tr key={t.id} className={t.isNew ? 'bg-green-50' : ''}>
                        <td className="border text-center">{i + 1}</td>
                        <td className="border text-center">{t.project}</td>
                        <td className="border text-center">{t.address}</td>
                        <td className="border text-center">{fmt(t.date)}</td>
                        <td className="border text-left align-top">
                          <div className="text-xs text-gray-700 py-2">
                            {(() => {
                              const typeLabel = t.requestType === 'new-bin' ? 'Αίτημα Νέου Κάδου' : t.requestType === 'move-bin' ? 'Αίτημα Μεταφοράς Κάδου' : t.requestType === 'change-bin' ? 'Αίτημα Αλλαγής Κάδου' : 'Αίτημα';
                              return <div className="font-medium">{typeLabel} για το "{t.project}"</div>;
                            })()}
                            <div className="mt-2">
                              {t.acceptedByTransporter ? (
                                <Badge tone="green"><CheckCircle2 className="w-3 h-3" /><span className="ml-1">Αποδεκτό από μεταφορέα</span></Badge>
                              ) : (
                                <Badge tone="orange"><Clock className="w-3 h-3" /><span className="ml-1">Αναμονή αποδοχής μεταφορέα</span></Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="border text-center align-top">
                          {t.fromProducer ? (
                            t.acceptedByTransporter ? (
                              <span>—</span>
                            ) : (
                              <Btn className="bg-red-600 text-white" onClick={() => onCancelRequest && onCancelRequest(t.projectId, t.requestType)}>Ακύρωση</Btn>
                            )
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr><td className="border text-center p-3" colSpan={6}>—</td></tr>
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
            <Btn className="bg-green-600 text-white" onClick={() => {
              // prefill contractor fields from profile before opening the modal
              setPForm((prev:any) => ({
                ...prev,
                contractorName: profileForm.contractorName || '',
                contractorEmail: profileForm.contractorEmail || '',
                contractorPhone: profileForm.contractorPhone || '',
                contractorPostalAddress: profileForm.contractorPostalAddress || '',
                contractorFax: profileForm.contractorFax || '',
                contractorRegistryNumber: profileForm.contractorRegistryNumber || '',
                contractorID: profileForm.contractorID || '',
                contractorTechDirectorName: profileForm.contractorTechDirectorName || '',
                contractorVAT: profileForm.contractorVAT || '',
                // if producer is on Basic plan, force manual (off-platform) transporter selection
                transporterMode: subscriptionPlan === 'basic' ? 'manual' : (prev.transporterMode || 'platform')
              }));
              setShowNew(true);
            }}>+ Νέο Έργο</Btn>
          </div>
          <table className="w-full border bg-white">
            <thead className="bg-gray-100 text-sm">
              <tr>
                <th className="border px-2">Α/Α</th>
                <th className="border px-2">ID Έργου</th>
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
              {(() => {
                const fp = applyProjectFilter(projects, filter, myProducer).filter((p: any) => {
                  const t = today();
                  const isActive = !p.end || p.end >= t;
                  return projSubTab === 'active' ? isActive : (!isActive);
                });
                if (fp.length === 0) {
                  return (
                    <tr>
                      <td className="border text-center p-4 text-gray-500" colSpan={10}>
                        {projSubTab === 'active' ? 'Δεν υπάρχουν ενεργά έργα' : 'Δεν υπάρχουν ολοκληρωμένα έργα'}
                      </td>
                    </tr>
                  );
                }
                return fp.map((p: any, i: number) => (
                  <tr key={p.id} className={p.isNew ? 'bg-green-50' : ''}>
                    <td className="border text-center">{i + 1}</td>
                    <td className="border text-center">Σε εκκρεμότητα</td>
                    <td className="border text-blue-700 underline cursor-pointer" onClick={() => onOpenProject(p)}>{p.projectName}</td>
                    <td className="border text-center">{p.address}</td>
                    <td className="border text-center">{fmt(p.start)}</td>
                    <td className="border text-center">{fmt(p.end)}</td>
                    <td className="border text-center">{p.estimated ?? sumWaste(p.wasteLines)}</td>
                    <td className="border text-center">{p.unit}</td>
                    <td className="border text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${p.offPlatformTransporter ? 'bg-gray-400' : 'bg-green-500'}`} aria-hidden />
                        <span>{p.transporter}</span>
                      </div>
                    </td>
                    <td className="border text-center">{p.agreement}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>

          <div className="mt-2 text-xs text-gray-600 flex items-center gap-4">
            <div className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-500" aria-hidden />
              <span>Μεταφορέας εντος πλατφόρμας</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-gray-400" aria-hidden />
              <span>Μεταφορέας εκτος πλατφόρμας</span>
            </div>
          </div>

          {showNew && (
            <Modal title="Προσθήκη Νέου Έργου" onClose={() => setShowNew(false)} onSubmit={submitNew}>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="col-span-2">Όνομα Έργου
                  <input className="border p-1 w-full" value={pForm.projectName} onChange={(e: any) => setPForm({ ...pForm, projectName: e.target.value })} />
                </label>
                {/* Agreement number removed per request (handled by unit when required) */}
                <div className="col-span-2 font-semibold">1. Διεύθυνση Τεχνικού/Οικοδομικού Έργου / Τεμαχίου</div>
                <div className="col-span-2 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <label>Οδός & Αριθμός
                      <input className="border p-1 w-full" value={pForm.addressStreet} onChange={(e: any) => setPForm({ ...pForm, addressStreet: e.target.value })} />
                    </label>
                  </div>
                  <div>
                    <label>Πόλη/Κοινότητα
                      <input className="border p-1 w-full" value={pForm.addressCity} onChange={(e: any) => setPForm({ ...pForm, addressCity: e.target.value })} />
                    </label>
                  </div>
                  <div>
                    <label>Ταχυδρομικός Κώδικας
                      <input className="border p-1 w-full" value={pForm.addressPostalCode} onChange={(e: any) => setPForm({ ...pForm, addressPostalCode: e.target.value })} />
                    </label>
                  </div>
                  <div>
                    <label>Επαρχία
                      <input className="border p-1 w-full" value={pForm.addressProvince} onChange={(e: any) => setPForm({ ...pForm, addressProvince: e.target.value })} />
                    </label>
                  </div>
                  <div>
                    <label>Τοποθεσία
                      <input className="border p-1 w-full" value={pForm.addressLocation} onChange={(e: any) => setPForm({ ...pForm, addressLocation: e.target.value })} />
                    </label>
                  </div>
                  <div>
                    <label>Αρ. Φύλλου/Σχεδίου
                      <input className="border p-1 w-full" value={pForm.addressPlanSheetNumber} onChange={(e: any) => setPForm({ ...pForm, addressPlanSheetNumber: e.target.value })} />
                    </label>
                  </div>
                  <div>
                    <label>Αρ. Τεμαχίου/ων
                      <input className="border p-1 w-full" value={pForm.addressParcelNumber} onChange={(e: any) => setPForm({ ...pForm, addressParcelNumber: e.target.value })} />
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label>Άλλες διευκρινίσεις
                      <input className="border p-1 w-full" value={pForm.addressOtherNotes} onChange={(e: any) => setPForm({ ...pForm, addressOtherNotes: e.target.value })} />
                    </label>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-2">
                  <div className="font-semibold">2. Κύριος(οι) / Ιδιοκτήτης(ες) του έργου</div>
                  <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                    <label>Ονοματεπώνυμο
                      <input className="border p-1 w-full" value={pForm.ownerName} onChange={(e:any)=>setPForm({...pForm, ownerName: e.target.value})} />
                    </label>
                    <label>Ηλ. Διεύθυνση
                      <input className="border p-1 w-full" value={pForm.ownerEmail} onChange={(e:any)=>setPForm({...pForm, ownerEmail: e.target.value})} />
                    </label>
                    <label>Τηλ.
                      <input className="border p-1 w-full" value={pForm.ownerPhone} onChange={(e:any)=>setPForm({...pForm, ownerPhone: e.target.value})} />
                    </label>
                    <label>Ταχ. Διεύθυνση
                      <input className="border p-1 w-full" value={pForm.ownerPostalAddress} onChange={(e:any)=>setPForm({...pForm, ownerPostalAddress: e.target.value})} />
                    </label>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-2">
                  <div className="font-semibold">3. Εργολήπτης / Εταιρεία</div>
                  <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                    <label>Όνομα Εργολήπτη / Εταιρείας
                      <input className="border p-1 w-full" value={pForm.contractorName} onChange={(e:any)=>setPForm({...pForm, contractorName: e.target.value})} />
                    </label>
                    <label>Ηλ. Διεύθυνση
                      <input className="border p-1 w-full" value={pForm.contractorEmail} onChange={(e:any)=>setPForm({...pForm, contractorEmail: e.target.value})} />
                    </label>
                    <label>Τηλ.
                      <input className="border p-1 w-full" value={pForm.contractorPhone} onChange={(e:any)=>setPForm({...pForm, contractorPhone: e.target.value})} />
                    </label>
                    <label>Ταχ. Διεύθυνση
                      <input className="border p-1 w-full" value={pForm.contractorPostalAddress} onChange={(e:any)=>setPForm({...pForm, contractorPostalAddress: e.target.value})} />
                    </label>
                    <label>Τηλεομοιότυπο
                      <input className="border p-1 w-full" value={pForm.contractorFax} onChange={(e:any)=>setPForm({...pForm, contractorFax: e.target.value})} />
                    </label>
                    <label>Αρ. Μητρώου
                      <input className="border p-1 w-full" value={pForm.contractorRegistryNumber} onChange={(e:any)=>setPForm({...pForm, contractorRegistryNumber: e.target.value})} />
                    </label>
                    <label>Αρ. Ταυτότητας
                      <input className="border p-1 w-full" value={pForm.contractorID} onChange={(e:any)=>setPForm({...pForm, contractorID: e.target.value})} />
                    </label>
                    <label>Ονοματεπώνυμο Τεχνικού Διευθυντή
                      <input className="border p-1 w-full" value={pForm.contractorTechDirectorName} onChange={(e:any)=>setPForm({...pForm, contractorTechDirectorName: e.target.value})} />
                    </label>
                    <label>Αρ. ΦΠΑ
                      <input className="border p-1 w-full" value={pForm.contractorVAT} onChange={(e:any)=>setPForm({...pForm, contractorVAT: e.target.value})} />
                    </label>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-2">
                  <label className="font-semibold">4. Σύστημα (Συλλογικό ή Ατομικό)
                    <select className="border p-1 w-full" value={pForm.collectiveSystem} onChange={(e:any)=>setPForm({...pForm, collectiveSystem: e.target.value})}>
                      <option value="ΟΑΚ">ΟΑΚ</option>
                      <option value="ΚΟΔΑ">ΚΟΔΑ</option>
                    </select>
                  </label>
                </div>

                <div className="col-span-2 border-t pt-2">
                  <div className="font-semibold">5. Επιβλέπων Μηχανικός</div>
                  <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                    <label>Ονοματεπώνυμο Μηχανικού
                      <input className="border p-1 w-full" value={pForm.supervisorName} onChange={(e:any)=>setPForm({...pForm, supervisorName: e.target.value})} />
                    </label>
                    <label>Αρ. Μητρώου ΕΤΕΚ
                      <input className="border p-1 w-full" value={pForm.supervisorRegistryNumber} onChange={(e:any)=>setPForm({...pForm, supervisorRegistryNumber: e.target.value})} />
                    </label>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-2">
                  <div className="font-semibold">6. Στοιχεία / Είδος Έργου (σημειώστε ότι ισχύει)</div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={pForm.typeNewConstruction} onChange={(e:any)=>setPForm({...pForm, typeNewConstruction: e.target.checked})} /> Νέα Κατασκευή</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={pForm.typeExtension} onChange={(e:any)=>setPForm({...pForm, typeExtension: e.target.checked})} /> Επέκταση/Προσθήκη</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={pForm.typeConversion} onChange={(e:any)=>setPForm({...pForm, typeConversion: e.target.checked})} /> Μετατροπή/Αλλαγή χρήσης</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={pForm.typeRenovation} onChange={(e:any)=>setPForm({...pForm, typeRenovation: e.target.checked})} /> Ανακαίνιση / Αποκατάσταση</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={pForm.typeDemolition} onChange={(e:any)=>setPForm({...pForm, typeDemolition: e.target.checked})} /> Κατεδάφιση</label>
                    <label className="col-span-3">Άλλο
                      <input className="border p-1 w-full" value={pForm.typeOther} onChange={(e:any)=>setPForm({...pForm, typeOther: e.target.value})} />
                    </label>
                    <label className="col-span-3">Μέγεθος / Σημειώσεις (π.χ. συνολικό εμβαδόν m2, τύπος έργου)
                      <input className="border p-1 w-full" value={pForm.sizeDetails} onChange={(e:any)=>setPForm({...pForm, sizeDetails: e.target.value})} />
                    </label>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-2 font-semibold">7. Περίοδος εκτέλεσης του έργου</div>
                <label>Έναρξη
                  <input type="date" className="border p-1 w-full" value={pForm.start} onChange={(e: any) => setPForm({ ...pForm, start: e.target.value })} />
                </label>
                <label>Λήξη
                  <input type="date" className="border p-1 w-full" value={pForm.end} onChange={(e: any) => setPForm({ ...pForm, end: e.target.value })} />
                </label>

                <div className="col-span-2 border-t pt-2 font-semibold">8. Συνεργάτες</div>
                <label>Μονάδα
                  <select className="border p-1 w-full" value={pForm.unit} onChange={(e: any) => setPForm({ ...pForm, unit: e.target.value })}>
                    {UNITS.map((u: string) => (<option key={u} value={u}>{u}</option>))}
                  </select>
                </label>
                <div className="col-span-2">
                  <label className="block mb-1">Μεταφορέας</label>
                  <div className="flex items-center gap-4 mb-2 text-sm">
                    <label className="inline-flex items-center gap-1">
                      <input type="radio" name="p_trans_mode" value="platform" disabled={subscriptionPlan === 'basic'} checked={pForm.transporterMode === 'platform'} onChange={() => setPForm({ ...pForm, transporterMode: 'platform' })} />
                      <span>Στην πλατφόρμα</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input type="radio" name="p_trans_mode" value="manual" checked={pForm.transporterMode === 'manual'} onChange={() => setPForm({ ...pForm, transporterMode: 'manual' })} />
                      <span>Εκτός πλατφόρμας</span>
                    </label>
                  </div>
                  {subscriptionPlan === 'basic' && (
                    <div className="text-xs text-gray-500 mb-2">Στο Basic πακέτο οι μεταφορείς εντός πλατφόρμας δεν είναι διαθέσιμοι — επιλέχθηκε «Εκτός πλατφόρμας».</div>
                  )}
                  {pForm.transporterMode === 'platform' ? (
                    <select className="border p-1 w-full" value={pForm.transporter} onChange={(e: any) => setPForm({ ...pForm, transporter: e.target.value })}>
                      {TRANSPORTERS.map((t: string) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                  ) : (
                    <input className="border p-1 w-full" placeholder="Όνομα μεταφορέα (εκτός πλατφόρμας)" value={pForm.otherTransporter} onChange={(e: any) => setPForm({ ...pForm, otherTransporter: e.target.value })} />
                  )}
                </div>

                <div className="col-span-2 font-semibold mt-2">9. Αναλυτικές Ποσότητες Αποβλήτων (tn)</div>
                <table className="col-span-2 w-full border text-xs">
                  <thead className="bg-gray-100">
                    <tr><th className="border px-2 w-44">ΕΚΑ</th><th className="border px-2">Περιγραφή</th><th className="border px-2">Ποσότητα</th></tr>
                  </thead>
                  <tbody>
                    {A(pForm.wasteLines).filter((w: any) => {
                      const code = String(w.code || w.ekaCategory || '').replace(/\s+/g, '');
                      return !EXCLUDED_EKA.has(code);
                    }).map((w: any) => {
                          // find original index in the full wasteLines array so updates map correctly
                          const origIdx = (pForm.wasteLines || []).findIndex((x: any) => String((x.code || x.ekaCategory) || '').replace(/\s+/g, '') === String((w.code || w.ekaCategory) || '').replace(/\s+/g, ''));
                          return (
                          <tr key={w.code}>
                            <td className="border px-2 w-44 whitespace-nowrap">{w.code}</td>
                            <td className="border px-2">{w.description}</td>
                            <td className="border px-2">
                              <input
                                type="number"
                                className="border p-1 w-full"
                                value={w.quantity}
                                onChange={(e: any) => {
                                  const v = [...pForm.wasteLines];
                                  if (origIdx >= 0 && origIdx < v.length) {
                                    v[origIdx] = { ...v[origIdx], quantity: e.target.value };
                                    setPForm({ ...pForm, wasteLines: v });
                                  } else {
                                    // fallback: find by code and update first match
                                    const f = v.findIndex((x:any)=> String((x.code||x.ekaCategory)||'').replace(/\s+/g,'') === String((w.code||w.ekaCategory)||'').replace(/\s+/g,''));
                                    if (f >= 0) { v[f] = { ...v[f], quantity: e.target.value }; setPForm({ ...pForm, wasteLines: v }); }
                                  }
                                }}
                              />
                            </td>
                          </tr>
                        );
                    })}
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
            setReqSubTab('bins');
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
const Transporter = ({ projects, transports, onAddTransport, notifications, onJump, onAcceptRequest, onRejectRequest, addNotif, deepLink, onAddProject, onClearTransNew, onClearProjectsNew }: any) => {
  // Default to 'projects' tab
  const [tab, setTab] = useState('projects');
  const [show, setShow] = useState(false);
  const opts = useMemo(() => plates(), []);
  const [form, setForm] = useState({ producer: '', project: '', address: '', unit: '', vehicle: '', date: today(), time: '08:00', viaStation: false });
  const [acceptModal, setAcceptModal] = useState<any>({ open: false, row: null, vehicle: '', date: today(), time: '08:00' });
  const [menuOpen, setMenuOpen] = useState(false);
  // Transporter identity (web) — assumes Euroskip is the logged-in transporter
  const myTransporter = 'Euroskip';
  // Vehicles map persisted per transporter
  const [vehiclesMap, setVehiclesMap] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem('iwm_transporter_vehicles');
      const obj = raw ? JSON.parse(raw) : {};
      if (Array.isArray(obj)) {
        // backward compatibility: previous schema might have been a plain array
        return { [myTransporter]: obj } as Record<string, string[]>;
      }
      return obj && typeof obj === 'object' ? obj : {};
    } catch {
      return {} as Record<string, string[]>;
    }
  });
  React.useEffect(() => {
    try { localStorage.setItem('iwm_transporter_vehicles', JSON.stringify(vehiclesMap)); } catch {}
  }, [vehiclesMap]);
  // Sync transporter profiles and plates to Unit's offline database
  React.useEffect(() => {
    try {
      // Ensure transporters exist in unit DB
      const rawT = localStorage.getItem('iwm_unit_offline_transporters');
      const arrT: string[] = rawT ? (JSON.parse(rawT) || []) : [];
      const setT = new Set<string>(Array.isArray(arrT) ? arrT : []);
      Object.keys(vehiclesMap || {}).forEach((name) => { if (name) setT.add(name); });
      localStorage.setItem('iwm_unit_offline_transporters', JSON.stringify(Array.from(setT)));

      // Mirror plates per transporter
      const rawP = localStorage.getItem('iwm_unit_offline_transporter_plates');
      const objP = rawP ? JSON.parse(rawP) : {};
      const nextP: Record<string, string[]> = (objP && typeof objP === 'object') ? { ...objP } : {};
      Object.entries(vehiclesMap || {}).forEach(([name, plates]) => {
        const unique = Array.from(new Set((plates || []).filter(Boolean)));
        nextP[name] = unique;
      });
      localStorage.setItem('iwm_unit_offline_transporter_plates', JSON.stringify(nextP));
    } catch {}
  }, [vehiclesMap]);
  const myVehicles: string[] = (vehiclesMap[myTransporter] || []).filter(Boolean);
  const vehicleOptions = myVehicles.length ? myVehicles : opts;
  const [newPlate, setNewPlate] = useState('');
  const addPlate = () => {
    const p = (newPlate || '').trim().toUpperCase();
    if (!p) return;
    setVehiclesMap(prev => ({ ...prev, [myTransporter]: [...new Set([...(prev[myTransporter] || []), p])] }));
    setNewPlate('');
  };
  const removePlate = (p: string) => {
    setVehiclesMap(prev => ({ ...prev, [myTransporter]: (prev[myTransporter] || []).filter(x => x !== p) }));
  };
  const [acceptCustomVehicle, setAcceptCustomVehicle] = useState('');
  // Ensure latest vehicles are used whenever a modal opens
  React.useEffect(() => {
    if (show || acceptModal.open) {
      try {
        const raw = localStorage.getItem('iwm_transporter_vehicles');
        const obj = raw ? JSON.parse(raw) : {};
        if (Array.isArray(obj)) {
          setVehiclesMap({ [myTransporter]: obj });
        } else if (obj && typeof obj === 'object') setVehiclesMap(obj);
      } catch {}
    }
  }, [show, acceptModal.open]);
  // Default vehicle preselect when opening New Transfer
  React.useEffect(() => {
    if (show) {
      const first = vehicleOptions[0] || '';
      setForm(f => ({ ...f, vehicle: first }));
    }
  }, [show, vehicleOptions.join('|')]);

  const onSubmit = () => {
    if (!form.producer || !form.project) return;
    const proj = A(projects).find((p: any) => p.producer === form.producer && p.projectName === form.project);
    const vehicleValue = form.vehicle === 'CUSTOM' ? (customVehicle || vehicleOptions[0] || opts[0]) : (form.vehicle || vehicleOptions[0] || opts[0]);
    onAddTransport({ id: gid(), producer: form.producer, project: form.project, projectId: proj?.id, address: form.address || proj?.address || '-', unit: form.unit || proj?.unit || '-', vehicle: vehicleValue, date: form.date, time: form.time, status: 'Αναμονή αποδοχής παραγωγού', approvedByProducer: false, receivedByUnit: false, fromProducer: false, isNew: true });
    addNotif && addNotif('Νέο Αίτημα Μεταφοράς (Μεταφορέα)', `${form.producer} / ${form.project}`, { page: 'producer', tab: 'aitimata' });
    setShow(false);
    setForm({ producer: '', project: '', address: '', unit: '', vehicle: '', date: today(), time: '08:00', viaStation: false });
  };

  const producerReq = (() => {
    const msDay = 24 * 60 * 60 * 1000;
    const now = new Date();
    return A(transports)
      // Only show producer-origin requests that are bin-related (new/move/change)
      .filter((t: any) => !t.approvedByProducer && !t.receivedByUnit && t.fromProducer && ['new-bin','move-bin','change-bin'].includes(t.requestType))
      .filter((t: any) => {
        if (!t.acceptedByTransporter) return true; // pending: always show
        const at = t.acceptedByTransporterAt ? new Date(t.acceptedByTransporterAt) : null;
        if (!at || isNaN(at.getTime())) return true; // missing/invalid timestamp: keep
        const diff = (now.getTime() - at.getTime()) / msDay;
        return diff < 3; // keep for 3 days
      });
  })();
  const carrierReq = A(transports).filter((t: any) => !t.approvedByProducer && !t.receivedByUnit && !t.fromProducer);
  const pending = A(transports).filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit);

  const transNotifs = A(notifications).filter((n: any) => n.target?.page === 'transporter');
  // Merge global projects and transporter-local external projects
  // External projects: support marking as completed (persisted in localStorage)
  const tProjectsLocal = (() => {
    try {
      const raw = localStorage.getItem('iwm_transporter_external_projects');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) {
        const list = arr.filter((p: any) => (p.creatorTransporter === myTransporter || p.transporter === myTransporter) && !p.completed);
        const seen = new Set();
        return list.filter((p: any) => {
          const k = `${p.producer}:::${p.projectName}`;
          if (seen.has(k)) return false; seen.add(k); return true;
        });
      }
    } catch {}
    return [];
  })();
  // Platform projects: support marking as completed (in-memory only)
  const [completedPlatformProjects, setCompletedPlatformProjects] = React.useState<string[]>([]);
  // Merge platform and external projects, dedupe by producer+projectName
  const tProjects = (() => {
    const platform = A(projects).filter((p: any) => (p.transporter === myTransporter || p.creatorTransporter === myTransporter) && !completedPlatformProjects.includes(`${p.producer}:::${p.projectName}`));
    const all = [...platform, ...tProjectsLocal];
    const seen = new Set();
    return all.filter((p: any) => {
      const k = `${p.producer}:::${p.projectName}`;
      if (seen.has(k)) return false; seen.add(k); return true;
    });
  })();

  // Mark project as completed (platform or external)
  const markProjectCompleted = (p: any) => {
    if (p.external) {
      try {
        const raw = localStorage.getItem('iwm_transporter_external_projects');
        const arr = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(arr) ? arr.map((x: any) => {
          if (x.producer === p.producer && x.projectName === p.projectName) return { ...x, completed: true };
          return x;
        }) : arr;
        localStorage.setItem('iwm_transporter_external_projects', JSON.stringify(next));
      } catch {}
    } else {
      setCompletedPlatformProjects(prev => [...prev, `${p.producer}:::${p.projectName}`]);
    }
  };
  const [projSubTab, setProjSubTab] = useState<'iwm' | 'external'>('iwm');
  const [addExternalOpen, setAddExternalOpen] = useState(false);
  const [extForm, setExtForm] = useState({ producer: '', projectName: '', address: '', unit: '', managerName: '', managerPhone: '' });
  const tabs = [
    // 'Έργα' tab should come before 'Αιτήματα'
    { key: 'projects', label: 'Έργα', count: A(projects).filter((p:any)=> !!p.isNew).length },
    { key: 'aitimata', label: 'Αιτήματα', count: (producerReq || []).length },
    { key: 'transfers', label: 'Έντυπα Αναγνώρισης και Παρακολούθησης', count: A(transports).filter((t:any)=> !!t.isNew && !t.createdByTransporterMobile).length },
    { key: 'profile', label: 'Προφίλ' },
  ];

  const [filter, setFilter] = useState({ producer: '', project: '', from: '', to: '' });
  const [exportOpen, setExportOpen] = useState(false);
  const [customVehicle, setCustomVehicle] = useState('');
  const [showTransferFilters, setShowTransferFilters] = useState(false);
  const [transfersSubTab, setTransfersSubTab] = useState<'pending' | 'completed'>('pending');

  // deep link handling
  React.useEffect(() => {
    if (!deepLink) return;
    if (deepLink.page !== 'transporter') return;
    if (deepLink.tab) setTab(deepLink.tab);
    // if deepLink contains an id for a request, open accept modal
    if (deepLink.requestId) {
      const row = A(transports).find((t: any) => t.id === deepLink.requestId);
      if (row) setAcceptModal({ open: true, row, vehicle: (vehicleOptions[0] || plates()[0]), date: row.date || today(), time: row.time || '08:00', projectInfo: A(projects).find((p: any) => p.id === row.projectId) });
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
          <th className="border px-2">Ημ/νία</th>
          <th className="border px-2">Αίτημα</th>
          <th className="border px-2">Κατάσταση</th>
          <th className="border px-2">Ενέργεια</th>
        </tr>
      </thead>
      <tbody>
        {A(rows).length > 0 ? (
          A(rows).map((t: any, i: number) => (
            <tr key={t.id} className={`${t.isNew ? 'bg-green-50' : ''} ${t.requestType === 'change-bin' ? 'bg-yellow-50' : ''}`}>
              <td className="border text-center">{i + 1}</td>
              <td className="border text-center">{t.producer}</td>
              <td className="border text-center">{t.project}</td>
              <td className="border text-center">{t.address}</td>
              <td className="border text-center">{fmt(t.date)}</td>
              <td className="border text-center">
                {t.requestType === 'new-bin' ? 'Νέος Κάδος' : t.requestType === 'move-bin' ? 'Μεταφορά Κάδου' : t.requestType === 'change-bin' ? 'Αλλαγή Κάδου' : (String(t.status || '').replace(/^Αίτη[σμ]α Παραγωγού\s*—\s*/i, '').replace(/Αίτη[σμ]α Παραγωγού/i, '').trim() || '—')}
              </td>
              <td className="border text-center">
                {t.acceptedByTransporter ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Αποδέχτηκε</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">Εκκρεμές</span>
                )}
              </td>
              <td className="border text-center">
                {showAcceptBtn ? (
                  <div className="flex items-center justify-center gap-2">
                    {t.fromProducer && (t.requestType === 'change-bin' || t.requestType === 'new-bin' || t.requestType === 'move-bin') ? (
                      t.acceptedByTransporter ? (
                        <Btn className="bg-gray-200 text-gray-800" onClick={() => onRejectRequest && onRejectRequest(t)}>Ακύρωση</Btn>
                      ) : (
                        <>
                          <Btn className="bg-green-600 text-white" onClick={() => { onAcceptRequest && onAcceptRequest(t); }}>Αποδοχή</Btn>
                          <Btn className="bg-red-600 text-white" onClick={() => onRejectRequest && onRejectRequest(t)}>Απόρριψη</Btn>
                        </>
                      )
                    ) : (
                      <>
                        <Btn className="bg-green-600 text-white" onClick={() => {
                          const pr = A(projects).find((p: any) => p.id === t.projectId);
                          setAcceptModal({ open: true, row: t, vehicle: (vehicleOptions[0] || plates()[0]), date: t.date || today(), time: t.time || '08:00', projectInfo: pr });
                        }}>Αποδοχή</Btn>
                        <Btn className="bg-red-600 text-white" onClick={() => onRejectRequest && onRejectRequest(t)}>Απόρριψη</Btn>
                      </>
                    )}
                  </div>
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
        <div className="flex items-center gap-3">
          <BellBtn items={A(notifications).filter((n: any) => n.target?.page === 'transporter')} onJump={onJump} />
          <div className="relative">
            <button aria-label="Μενού" title="Μενού" onClick={() => setMenuOpen(v => !v)} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200">☰</button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white border rounded shadow-lg z-20">
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); setTab('profile'); }}>Προφίλ</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); setTab('aitimata'); }}>Αιτήματα</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600" onClick={() => { setMenuOpen(false); alert('Αποσύνδεση'); }}>Αποσύνδεση</button>
              </div>
            )}
          </div>
        </div>
      </div>

  <TabBar tabs={tabs} active={tab} onChange={(k: string) => { const key = typeof k === 'string' ? k : 'aitimata'; if (key==='transfers' || key==='aitimata') { onClearTransNew && onClearTransNew(); } if (key==='projects') { onClearProjectsNew && onClearProjectsNew(); } setTab(key); }} />

      {tab === 'aitimata' && (
        <div className="space-y-4">
          <div>
            <div className="font-semibold mb-2">Αιτήματα Παραγωγών</div>
            <Table rows={producerReq} emptyText="—" showAcceptBtn />
          </div>
        </div>
      )}

      {tab === 'subscription' && (
        <div className="bg-white border rounded p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">Συνδρομή</div>
            <div className="text-sm text-gray-600">Παραγωγός</div>
          </div>
          <div className="mb-3 p-3 bg-gradient-to-r from-gray-50 to-white border rounded">
            <div className="text-sm text-gray-700">Επιλογή Συνδρομής για:</div>
            <div className="text-xl font-bold">Παραγωγός</div>
            <div className="text-sm text-gray-500">Τρέχουσα επιλογή: <span className="font-semibold">{(typeof window !== 'undefined' && localStorage.getItem('iwm_subscription_transporter')) || '—'}</span></div>
          </div>
          <div className="space-y-3">
            <div className="text-sm">Επιλογή Πακέτου Συνδρομής</div>
            <div className="text-sm text-gray-700">Επίλεξε ένα από τα πακέτα παρακάτω για τον παραγωγό.</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div className={`border rounded p-4 cursor-pointer transition-shadow ${((typeof window !== 'undefined' && localStorage.getItem('iwm_subscription_transporter')) === 'basic') ? 'ring-2 ring-blue-500 shadow-sm' : 'hover:shadow-md'}`} onClick={() => {
                const key = `iwm_subscription_transporter`;
                try { localStorage.setItem(key, 'basic'); } catch {}
                alert('Επιλέχθηκε Basic (τοπικά)');
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">Basic</div>
                    <div className="text-xs text-gray-600">Βασικές λειτουργίες της πλατφόρμας</div>
                  </div>
                  <div className="text-sm font-bold text-gray-600">ΔΩΡΕΑΝ</div>
                </div>
                <ul className="mt-3 text-sm text-gray-700 list-disc list-inside">
                  <li>Πλήρης πρόσβαση στις βασικές λειτουργίες</li>
                  <li>Στατικές αναφορές με εξαγωγή CSV</li>
                  <li>Βασική αναφορά ανά έργο και περίοδο</li>
                </ul>
              </div>

              <div className={`border rounded p-4 cursor-pointer transition-shadow ${((typeof window !== 'undefined' && localStorage.getItem('iwm_subscription_transporter')) === 'premium') ? 'ring-2 ring-yellow-400 shadow-sm' : 'hover:shadow-md'}`} onClick={() => {
                const key = `iwm_subscription_transporter`;
                try { localStorage.setItem(key, 'premium'); } catch {}
                alert('Επιλέχθηκε Premium (τοπικά)');
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">Premium</div>
                    <div className="text-xs text-gray-600">Αναβαθμισμένα reports και επιπλέον εξαγωγές</div>
                  </div>
                  <div className="text-sm font-bold text-yellow-700">€50/μήνα</div>
                </div>
                <ul className="mt-3 text-sm text-gray-700 list-disc list-inside">
                  <li>Προσαρμοσμένες αναφορές με προηγμένα φίλτρα</li>
                  <li>Προγραμματισμένες (scheduled) εξαγωγές CSV/Excel</li>
                  <li>Πρόσβαση API για αυτόματη λήψη δεδομένων</li>
                  <li>Προτεραιότητα υποστήριξης και οδηγίες ενσωμάτωσης</li>
                </ul>
              </div>
            </div>
            <div className="mt-3">
              <button className="px-3 py-2 rounded bg-gray-100" onClick={() => alert('Πληροφορίες: Το πακέτο Premium παρέχει πρόσθετες λειτουργίες. Επικοινωνήστε για λεπτομέρειες.')}>Περισσότερα</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'subscription' && (
        <div className="bg-white border rounded p-6">
          <div className="text-lg font-semibold mb-3">Συνδρομή — Επιλογή Πακέτου</div>
          <div className="mb-4">Επίλεξε ένα από τα δύο παρακάτω πακέτα. Η επιλογή θα αποθηκευτεί και θα χρησιμοποιηθεί για τις λειτουργίες του παραγωγού.</div>
          <div className="flex gap-4">
            <button className={`flex-1 px-4 py-6 rounded border text-left ${((typeof window !== 'undefined' && localStorage.getItem('iwm_subscription_transporter')) === 'basic') ? 'bg-blue-50 border-blue-400' : 'bg-white hover:shadow'}`} onClick={() => {
              const key = `iwm_subscription_transporter`;
              try { localStorage.setItem(key, 'basic'); } catch {}
              alert('Επιλέχθηκε Basic — αποθηκεύτηκε (τοπικά).');
            }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold">Basic</div>
                  <div className="text-sm text-gray-600 mt-2">Βασικές λειτουργίες · Εξαγωγές CSV</div>
                </div>
                <div className="text-sm font-bold text-gray-600">ΔΩΡΕΑΝ</div>
              </div>
              <ul className="mt-3 text-sm text-gray-700 list-disc list-inside">
                <li>Βασικές αναφορές ανά έργο</li>
                <li>Εξαγωγές CSV για ανάλυση offline</li>
                <li>Κατάλληλο για δοκιμή ή μικρές ανάγκες</li>
              </ul>
            </button>

            <button className={`flex-1 px-4 py-6 rounded border text-left ${((typeof window !== 'undefined' && localStorage.getItem('iwm_subscription_transporter')) === 'premium') ? 'bg-yellow-50 border-yellow-400' : 'bg-white hover:shadow'}`} onClick={() => {
              const key = `iwm_subscription_transporter`;
              try { localStorage.setItem(key, 'premium'); } catch {}
              alert('Επιλέχθηκε Premium — αποθηκεύτηκε (τοπικά).');
            }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold">Premium</div>
                  <div className="text-sm text-gray-600 mt-2">Αναβαθμισμένα reports · Προγραμματισμένες εξαγωγές · API</div>
                </div>
                <div className="text-sm font-bold text-yellow-700">€50/μήνα</div>
              </div>
              <ul className="mt-3 text-sm text-gray-700 list-disc list-inside">
                <li>Προγραμματισμένες εξαγωγές (π.χ. ημερήσιες/εβδομαδιαίες)</li>
                <li>API access για αυτόματη ενσωμάτωση σε ERP/BI</li>
                <li>Δημιουργία προσαρμοσμένων αναφορών κατά παραγγελία</li>
              </ul>
            </button>
          </div>
          <div className="mt-4 text-sm text-gray-700">Τρέχουσα επιλογή: <span className="font-semibold">{(typeof window !== 'undefined' && localStorage.getItem('iwm_subscription_transporter')) || '—'}</span></div>
        </div>
      )}

      {tab === 'transfers' && (
        <div className="bg-white border rounded p-3 space-y-4">
          <div className="flex items-center justify-end gap-2">
            <button className="flex items-center gap-2 px-2 py-1 text-gray-700 hover:text-blue-700" onClick={() => setShowTransferFilters(v => !v)} title="Φίλτρα">
              <Filter className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Φίλτρα</span>
            </button>
          </div>
          {showTransferFilters && (
            <div className="mb-2">
              <FilterBar producers={uniqueProducers(projects)} projects={projectsByProducer(projects, filter.producer)} value={filter} onChange={setFilter} showProject={true} showProducer={true} />
            </div>
          )}
          {(() => {
            const rowsAll = applyTransportFilter(transports, projects, filter);
            const pendingRows = rowsAll.filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit);
            const completedRows = rowsAll.filter((t: any) => t.receivedByUnit);
            return (
              <div className="space-y-3">
                <div className="inline-flex bg-gray-100 p-1 rounded-full">
                  <button onClick={() => setTransfersSubTab('pending')} className={`px-3 py-1.5 rounded-full text-sm ${transfersSubTab === 'pending' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Εκκρεμείς Μεταφορές</button>
                  <button onClick={() => setTransfersSubTab('completed')} className={`px-3 py-1.5 rounded-full text-sm ${transfersSubTab === 'completed' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Ολοκληρωμένες μεταφορές</button>
                </div>

                {transfersSubTab === 'pending' && (
                  <table className="w-full border bg-white text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-2">Α/Α</th>
                        <th className="border px-2">Παραγωγός</th>
                        <th className="border px-2">Έργο</th>
                        <th className="border px-2">Διεύθυνση</th>
                        <th className="border px-2">Μονάδα</th>
                        <th className="border px-2">Ημ/νία</th>
                        <th className="border px-2">Αρ. Αυτοκινήτου</th>
                        <th className="border px-2">Κατάσταση</th>
                        <th className="border px-2">PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRows.length ? (
                        pendingRows.map((t: any, i: number) => (
                          <tr key={t.id}>
                            <td className="border text-center">{i + 1}</td>
                            <td className="border text-center">{t.producer}</td>
                            <td className="border text-center">{t.project}</td>
                            <td className="border text-center">{t.address}</td>
                            <td className="border text-center">{t.unit}</td>
                            <td className="border text-center">{fmt(t.date)}{t.time ? ` • ${t.time}` : ''}</td>
                            <td className="border text-center">{t.vehicle || '—'}</td>
                            <td className="border text-center text-blue-700">{t.status}</td>
                            <td className="border text-center"><Btn className="bg-gray-100" onClick={() => pdfTransfer(t)}>PDF</Btn></td>
                          </tr>
                        ))
                      ) : (
                        <tr><td className="border text-center p-3" colSpan={9}>—</td></tr>
                      )}
                    </tbody>
                  </table>
                )}

                {transfersSubTab === 'completed' && (
                  <>
                  <div className="flex items-center justify-end mb-2">
                    <button className="px-3 py-1.5 rounded bg-green-600 text-white text-sm" onClick={() => setExportOpen(true)}>Ετήσια Έκθεση</button>
                  </div>
                  <table className="w-full border bg-white text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-2">Α/Α</th>
                        <th className="border px-2">Παραγωγός</th>
                        <th className="border px-2">Έργο</th>
                        <th className="border px-2">Ημ/νία</th>
                        <th className="border px-2">Μονάδα</th>
                        <th className="border px-2">Αρ. Αυτοκινήτου</th>
                        <th className="border px-2">Κωδικός ΕΚΑ</th>
                        <th className="border px-2">Βάρος (tn)</th>
                        <th className="border px-2">PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedRows.length ? (
                        completedRows.map((t: any, i: number) => (
                          <tr key={t.id}>
                            <td className="border text-center">{i + 1}</td>
                            <td className="border text-center">{t.producer}</td>
                            <td className="border text-center">{t.project}</td>
                            <td className="border text-center">{fmt(t.unitDate)}</td>
                            <td className="border text-center">{t.unit || '-'}</td>
                            <td className="border text-center">{t.vehicle || '-'}</td>
                            <td className="border text-center">{t.ekaCategory || '-'}</td>
                            <td className="border text-center">{t.weight || '-'}</td>
                            <td className="border text-center"><Btn className="bg-gray-100" onClick={() => pdfTransfer(t)}>PDF</Btn></td>
                          </tr>
                        ))
                      ) : (
                        <tr><td className="border text-center p-3" colSpan={9}>—</td></tr>
                      )}
                    </tbody>
                  </table>
                  {exportOpen && (() => {
                    const YearModal = ({ onClose, onSubmit }: any) => {
                      const [y, setY] = React.useState(new Date().getFullYear());
                      return (
                        <Modal title="Ετήσια Έκθεση" onClose={onClose} onSubmit={() => onSubmit(y)}>
                          <div className="text-sm mb-3">Επίλεξε έτος για εξαγωγή των ολοκληρωμένων μεταφορών σε CSV (Excel).</div>
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
                        const rows = completedRows.filter((t: any) => {
                          const yr = t.unitDate ? new Date(t.unitDate).getFullYear() : null;
                          return yr === selectedYear;
                        }).map((t: any, i: number) => ({
                          index: i + 1,
                          producer: t.producer,
                          project: t.project,
                          unitDate: t.unitDate,
                          unit: t.unit || '-',
                          vehicle: t.vehicle || '-',
                          eka: t.ekaCategory || '-',
                          weight: t.weight || '-',
                        }));
                        downloadCSV(`transporter_completed_${selectedYear}_${Date.now()}.csv`, rows, ['index','producer','project','unitDate','unit','vehicle','eka','weight']);
                        setExportOpen(false);
                      }} />
                    );
                  })()}
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {tab === 'profile' && (
        <div className="bg-white border rounded p-3 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Προφίλ Μεταφορέα</div>
            <div className="text-sm text-gray-600">{myTransporter}</div>
          </div>
          <div>
            <div className="font-medium mb-2">Οχήματα</div>
            <div className="flex items-center gap-2 mb-3">
              <input className="border p-1 w-48" placeholder="π.χ. ΚΥΧ123" value={newPlate} onChange={(e:any)=> setNewPlate(e.target.value)} onKeyDown={(e:any)=>{ if(e.key==='Enter') addPlate(); }} />
              <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={addPlate}>+ Προσθήκη</button>
            </div>
            {myVehicles.length === 0 ? (
              <div className="text-sm text-gray-600">Δεν υπάρχουν καταχωρημένα οχήματα. Πρόσθεσε τουλάχιστον ένα. Προτεινόμενη μορφή: 3 ελληνικά γράμματα + 3 αριθμοί (π.χ. ΚΥΧ123).</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {myVehicles.map(v => (
                  <div key={v} className="flex items-center justify-between border rounded px-2 py-1 text-sm bg-gray-50">
                    <span className="font-medium">{v}</span>
                    <button className="text-red-600 hover:underline" onClick={() => removePlate(v)}>Αφαίρεση</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">Οι λίστες οχημάτων αποθηκεύονται μόνο στη συσκευή (localStorage) και ισχύουν ανά μεταφορέα.</div>
        </div>
      )}

      {tab === 'projects' && (
        <TransporterProjectsTab tProjects={tProjects} />
      )}

      {/* Notifications tab removed from transporter web per requirements */}

      {show && (
        <Modal title="Νέα Μεταφορά" onClose={() => setShow(false)} onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="col-span-2">Παραγωγός
              <select className="border p-1 w-full" value={form.producer} onChange={(e: any) => setForm({ ...form, producer: e.target.value, project: '', address: '', unit: '' })}>
                <option value="">— Επιλογή Παραγωγού —</option>
                {(() => {
                  const central = A(projects).map((p: any) => p.producer || '').filter(Boolean);
                  const transportLocal = tProjectsLocal.map((p: any) => p.producer || '').filter(Boolean);
                  const merged = Array.from(new Set([...central, ...transportLocal]));
                  return merged.map((p: string) => (<option key={p} value={p}>{p}</option>));
                })()}
              </select>
            </label>
            <label className="col-span-2">Έργο
              <select className="border p-1 w-full" value={form.project} onChange={(e: any) => setForm({ ...form, project: e.target.value })}>
                <option value="">— Επιλογή Έργου —</option>
                {(() => {
                  const central = A(projects).filter((p: any) => p.producer === form.producer).map((p: any) => p.projectName);
                  const transportLocal = tProjectsLocal.filter((p: any) => p.producer === form.producer).map((p: any) => p.projectName);
                  const merged = Array.from(new Set([...(central || []), ...(transportLocal || [])]));
                  return merged.map((name: string, idx: number) => (<option key={`${form.producer}:::${name}:::${idx}`} value={name}>{name}</option>));
                })()}
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
                {myVehicles.length > 0 && (
                  <optgroup label="Αποθηκευμένα">
                    {myVehicles.map((pl: string) => (<option key={`sav-${pl}`} value={pl}>{pl}</option>))}
                  </optgroup>
                )}
                <optgroup label="Προεπιλεγμένα">
                  {opts.map((pl: string) => (<option key={`def-${pl}`} value={pl}>{pl}</option>))}
                </optgroup>
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
          onClose={() => { setAcceptModal({ open: false, row: null, vehicle: '', date: today(), time: '08:00' }); setAcceptCustomVehicle(''); }}
          onSubmit={() => {
            if (!acceptModal.row) return;
            const finalVehicle = acceptModal.vehicle === 'CUSTOM' ? (acceptCustomVehicle || vehicleOptions[0] || opts[0]) : acceptModal.vehicle;
            onAcceptRequest(acceptModal.row, { vehicle: finalVehicle, date: acceptModal.date, time: acceptModal.time });
            setAcceptModal({ open: false, row: null, vehicle: '', date: today(), time: '08:00' });
            setAcceptCustomVehicle('');
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
                {myVehicles.length > 0 && (
                  <optgroup label="Αποθηκευμένα">
                    {myVehicles.map((pl: string) => (<option key={`sav-${pl}`} value={pl}>{pl}</option>))}
                  </optgroup>
                )}
                <optgroup label="Προεπιλεγμένα">
                  {opts.map((pl: string) => (<option key={`def-${pl}`} value={pl}>{pl}</option>))}
                </optgroup>
                <option value="CUSTOM">— Καταχώρηση χειροκίνητα —</option>
              </select>
            </label>
            {acceptModal.vehicle === 'CUSTOM' && (
              <label className="col-span-2">Αρ. Κυκλοφορίας
                <input className="border p-1 w-full" value={acceptCustomVehicle} onChange={(e:any)=> setAcceptCustomVehicle((e.target.value||'').toUpperCase())} />
              </label>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

/******** unit ********/
const Unit = ({ projects, transports, onAcceptAgreement, onRejectAgreement, onReceive, onFinalize, notifications, onJump, onOpenProject, deepLink, onClearTransNew, onClearProjectsNew, onClearTransNewWhere, adminOnly = false }: any) => {
  const [tab, setTab] = useState('projects');
  const [filter, setFilter] = useState({ producer: '', project: '', from: '', to: '' });
  const [exportOpen, setExportOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Unit Products (catalog): simple local list of { id, name, price }
  const [unitProducts, setUnitProducts] = useState<any[]>(() => {
    try { const raw = localStorage.getItem('iwm_unit_products'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
  });
  React.useEffect(() => { try { localStorage.setItem('iwm_unit_products', JSON.stringify(unitProducts)); } catch {} }, [unitProducts]);
  const [newProd, setNewProd] = useState<{ name: string; price: string }>({ name: '', price: '' });
  // Unit Product Orders (incoming from producers) — placeholder until producer flow is wired
  const [unitOrders, setUnitOrders] = useState<any[]>(() => {
    try { const raw = localStorage.getItem('iwm_unit_product_orders'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
  });
  React.useEffect(() => { try { localStorage.setItem('iwm_unit_product_orders', JSON.stringify(unitOrders)); } catch {} }, [unitOrders]);
  const acceptOrder = (id: string) => setUnitOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'Αποδοχή' } : o));
  const rejectOrder = (id: string) => setUnitOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'Απόρριψη' } : o));
  const pending = A(transports).filter((t: any) => t.approvedByProducer && !t.receivedByUnit);
  const done = A(transports).filter((t: any) => t.receivedByUnit);
  // Price list for admin — a simple EKA price catalog (randomized per session)
  const [priceList, setPriceList] = useState<any[]>(() => {
    try {
      // try to read stored pricelist (either global map or per-unit keys)
      const rawAll = localStorage.getItem('iwm_unit_pricelist');
      if (rawAll) {
        try {
          const obj = JSON.parse(rawAll) || {};
          // prefer any known unit entry
          for (const u of UNITS) {
            if (Array.isArray(obj[u])) return obj[u].map((p: any) => ({ code: String(p.code), description: (EKA.find((e:any) => String(e.code).replace(/\s+/g,'') === String(p.code).replace(/\s+/g,'')) || {}).description || '', price: (Number(p.price) || 0).toFixed(2) }));
          }
          // fallback to first available key
          const keys = Object.keys(obj);
          if (keys.length > 0 && Array.isArray(obj[keys[0]])) {
            return obj[keys[0]].map((p: any) => ({ code: String(p.code), description: (EKA.find((e:any) => String(e.code).replace(/\s+/g,'') === String(p.code).replace(/\s+/g,'')) || {}).description || '', price: (Number(p.price) || 0).toFixed(2) }));
          }
        } catch { /* ignore parse errors */ }
      }
      // check per-unit keys
      for (const u of UNITS) {
        try {
          const rawUnit = localStorage.getItem(`iwm_unit_pricelist_${u}`);
          if (rawUnit) {
            const arr = JSON.parse(rawUnit || '[]') || [];
            if (Array.isArray(arr) && arr.length > 0) return arr.map((p: any) => ({ code: String(p.code), description: (EKA.find((e:any) => String(e.code).replace(/\s+/g,'') === String(p.code).replace(/\s+/g,'')) || {}).description || '', price: (Number(p.price) || 0).toFixed(2) }));
          }
        } catch { /* ignore */ }
      }
      // fallback: create randomized list
      return EKA.map((e: any) => ({ code: e.code, description: e.description, price: (Math.random() * (80 - 5) + 5).toFixed(2) }));
    } catch { return []; }
  });
  // edit mode for pricelist
  const [priceEditMode, setPriceEditMode] = useState(false);
  const [editPrices, setEditPrices] = useState<Record<string, string>>({});

  const tabs = adminOnly ? [
    { key: 'projects', label: 'Έργα', count: A(projects).filter((p: any) => !!p.isNew).length },
    { key: 'pricelist', label: 'Τιμοκατάλογος' },
    { key: 'products', label: 'Προϊόντα' },
    { key: 'stats', label: 'Αναλύσεις & Στατιστικά' },
  ] : [
    { key: 'weigh', label: 'Ζύγιση' },
    { key: 'transfers', label: 'Μεταφορές', count: A(transports).filter((t: any) => !!t.isNew).length },
    { key: 'slips', label: 'Δελτία Παραλαβής' },
  ];

  const [weighOpen, setWeighOpen] = useState(false);
  // Unit Projects sub-tab: Με συμφωνία (εντός IWM/από παραγωγό) vs Χωρίς συμφωνία (εκτός IWM/από μεταφορέα)
  const [unitProjSub, setUnitProjSub] = useState<'with' | 'without'>('with');
  // weighData holds id, weight, eka
  const [weighData, setWeighData] = useState<any>({ id: null as any, weight: '', eka: EKA[0].code });
  // Stats tabs/subtabs state
  const [statsTab, setStatsTab] = useState<'overview' | 'projects' | 'deliveries' | 'forecast' | 'finance' | 'alerts'>('overview');
  const [statsSub, setStatsSub] = useState<string>('kpis');
  // Products subtabs (catalog vs orders)
  const [prodSubTab, setProdSubTab] = useState<'products' | 'orders'>('products');
  // Unit Transfers subtabs
  const [unitTransfersSubTab, setUnitTransfersSubTab] = useState<'open' | 'awaiting' | 'completed'>('open');
  React.useEffect(() => {
    const defaults: Record<string, string> = {
      overview: 'kpis',
      projects: 'progress',
      deliveries: 'today-week',
      forecast: 'next-weeks',
      finance: 'by-project',
      alerts: 'notifications',
    };
    setStatsSub(defaults[statsTab] || 'kpis');
  }, [statsTab]);

  const openWeigh = (t: any) => {
    // simulate weighing with a random tonnage between 5.0 and 12.0
    const rnd = (Math.random() * (12 - 5) + 5);
    setWeighOpen(true);
    setWeighData({ id: t.id, weight: rnd.toFixed(2), eka: EKA[0].code });
  };
  const submitWeigh = () => {
    if (!weighData.id) return;
    onReceive && onReceive(weighData.id, parseFloat(weighData.weight || '0'), weighData.eka, true);
    setWeighOpen(false);
  };

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
        <div className="flex items-center gap-3">
          <BellBtn items={A(notifications).filter((n: any) => n.target?.page === 'unit')} onJump={onJump} />
          <div className="relative">
            <button aria-label="Μενού" title="Μενού" onClick={() => setMenuOpen(v => !v)} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200">☰</button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white border rounded shadow-lg z-20">
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); alert('Προφίλ'); }}>Προφίλ</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); setTab('projects'); }}>Αιτήματα</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600" onClick={() => { setMenuOpen(false); alert('Αποσύνδεση'); }}>Αποσύνδεση</button>
              </div>
            )}
          </div>
        </div>
      </div>

  <TabBar tabs={tabs} active={tab} onChange={(k: string) => { const key = typeof k === 'string' ? k : 'projects'; if (key==='transfers') { onClearTransNew && onClearTransNew(); } if (key==='projects') { onClearProjectsNew && onClearProjectsNew(); } setTab(key); }} />
          <div className="flex items-center justify-end gap-2 mb-2">
    {tab === 'slips' && (
      <Btn className="bg-blue-600 text-white" onClick={() => setExportOpen(true)}>Ετήσια Έκθεση</Btn>
    )}
    {tab !== 'weigh' && (
      (tab === 'slips' && !adminOnly) ? (
        // slips tab in web ζυγιστικό: icon-only filter button
        <button className="p-1 rounded hover:bg-gray-100" onClick={() => setShowFilters((v: any) => !v)} title="Φίλτρα">
          <Filter className="w-5 h-5 text-gray-700" />
        </button>
      ) : (
        <button className="flex items-center gap-2 px-2 py-1 text-gray-700 hover:text-blue-700" onClick={() => setShowFilters((v: any) => !v)} title="Φίλτρα">
          <Filter className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">Φίλτρα</span>
        </button>
      )
    )}
  </div>
  {showFilters && tab !== 'weigh' && (tab !== 'slips' || !adminOnly) && (
    <div className="mb-2">
      {/* include debtor, transporter and vehicle filters for slips in web mode */}
      <FilterBar
        producers={uniqueProducers(projects)}
        projects={projectsByProducer(projects, filter.producer)}
        debtors={[...new Set((transports || []).map((t:any)=> t.debtor).filter(Boolean))]}
  transporters={[...new Set([...(projects || []).map((p:any)=> p.transporter).filter(Boolean), ...(transports || []).map((t:any)=> t.transporter).filter(Boolean)])]}
        plates={((projects || []).reduce((acc:any, p:any) => { if (p.transporter && p.plates) acc[p.transporter] = p.plates; return acc; }, {}) as any) || {}}
        value={filter}
        onChange={setFilter}
        showProject={true}
        showDebtor={true}
        showTransporter={true}
        showPlate={true}
      />
      {tab === 'slips' && !adminOnly && (
        <div className="mt-2">
          <button className="text-sm text-gray-600 hover:text-gray-900" onClick={() => { setFilter({ producer: '', project: '', from: '', to: '' }); setShowFilters(true); }}>Επαναφορά φίλτρων</button>
        </div>
      )}
    </div>
  )}

      {tab === 'projects' && (
        <div className="bg-white border rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Έργα</div>
            <div className="inline-flex bg-gray-100 p-1 rounded-full">
              <button onClick={() => setUnitProjSub('with')} className={`px-3 py-1.5 rounded-full text-sm ${unitProjSub === 'with' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Με συμφωνία</button>
              <button onClick={() => setUnitProjSub('without')} className={`px-3 py-1.5 rounded-full text-sm ${unitProjSub === 'without' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Χωρίς συμφωνία</button>
            </div>
          </div>
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
              {(() => {
                const all = applyProjectFilter(projects, filter);
                const rows = unitProjSub === 'with' ? all.filter((p: any) => !p.external) : all.filter((p: any) => !!p.external);
                if (rows.length === 0) return (
                  <tr><td className="border text-center p-3" colSpan={7}>—</td></tr>
                );
                return rows.map((p: any, i: number) => (
                  <tr key={p.id} className={p.isNew ? 'bg-green-50' : ''}>
                    <td className="border text-center">{i + 1}</td>
                    <td className="border text-center">{p.producer}</td>
                      <td className="border text-center">
                      <span className="text-blue-700 underline cursor-pointer" onClick={() => onOpenProject ? onOpenProject(p) : null}>{p.projectName}{p.agreement && p.agreement !== '-' ? ` (${p.agreement})` : ''}</span>
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
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'weigh' && (
        <div>
          <UnitTabletApp
            projects={projects}
            transports={transports}
            onReceive={onReceive}
            onFinalize={onFinalize}
            lockTab="weigh"
            hideChrome={true}
            onNavigateUnit={(toTab: 'projects'|'weigh'|'transfers'|'slips'|'stats', subTab?: 'open'|'awaiting'|'completed') => {
              setTab(toTab);
              if (toTab === 'transfers' && subTab) setUnitTransfersSubTab(subTab);
            }}
          />
        </div>
      )}

      {tab === 'transfers' && (
        adminOnly ? (
          <div className="bg-white border rounded p-3">
            {/* Subtabs for transfers (admin view) */}
            {(() => {
              const filtered = applyTransportFilter(transports, projects, filter);
              const openNewCount = filtered.filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit && t.isNew).length;
              const awaitingNewCount = filtered.filter((t: any) => t.deliveredToUnit && !t.receivedByUnit && t.isNew).length;
              const completedCount = filtered.filter((t: any) => t.receivedByUnit).length;
              const completedNewCount = filtered.filter((t: any) => t.receivedByUnit && t.isNew).length;
              return (
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => { onClearTransNewWhere && onClearTransNewWhere((t:any)=> t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit); setUnitTransfersSubTab('open'); }} className={`px-3 py-1.5 rounded-full text-sm ${unitTransfersSubTab === 'open' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    <span className="inline-flex items-center gap-2">Ανοιχτές{openNewCount > 0 && <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] bg-gray-300 text-gray-800">{openNewCount}</span>}</span>
                  </button>
                  <button onClick={() => { onClearTransNewWhere && onClearTransNewWhere((t:any)=> t.deliveredToUnit && !t.receivedByUnit); setUnitTransfersSubTab('awaiting'); }} className={`px-3 py-1.5 rounded-full text-sm ${unitTransfersSubTab === 'awaiting' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    <span className="inline-flex items-center gap-2">Παραδόθηκαν{awaitingNewCount > 0 && <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] bg-red-600 text-white">{awaitingNewCount}</span>}</span>
                  </button>
                  <button onClick={() => { onClearTransNewWhere && onClearTransNewWhere((t:any)=> !!t.receivedByUnit); setUnitTransfersSubTab('completed'); }} className={`px-3 py-1.5 rounded-full text-sm ${unitTransfersSubTab === 'completed' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    <span className="inline-flex items-center gap-2">Ολοκληρωμένες{completedNewCount > 0 && <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] bg-gray-300 text-gray-800">{completedNewCount}</span>}</span>
                  </button>
                </div>
              );
            })()}

            {unitTransfersSubTab === 'open' && (
              <>
              <div className="font-semibold mb-2">Ανοιχτές Μεταφορές (Αναμένονται για Παραλαβή)</div>
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2">Α/Α</th>
                    <th className="border px-2">Παραγωγός</th>
                    <th className="border px-2">Έργο</th>
                    <th className="border px-2">Συμφωνία</th>
                    <th className="border px-2">Διεύθυνση</th>
                    <th className="border px-2">Μεταφορέας</th>
                    <th className="border px-2">Αρ. Οχήματος</th>
                  </tr>
                </thead>
                <tbody>
                  {applyTransportFilter(transports, projects, filter).filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit).length === 0 ? (
                    <tr><td className="border text-center p-2" colSpan={7}>—</td></tr>
                  ) : (
                    applyTransportFilter(transports, projects, filter).filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit).map((t: any, i: number) => {
                      const prj = A(projects).find((p: any) => p.id === t.projectId);
                      return (
                        <tr key={t.id} className={t.isNew ? 'bg-green-50' : ''}>
                          <td className="border text-center">{i + 1}</td>
                          <td className="border text-center"><div className="font-semibold">{t.producer}</div></td>
                          <td className="border text-center">{prj ? (prj.projectName + (prj.agreement && prj.agreement !== '-' ? ` (${prj.agreement})` : '')) : t.project}</td>
                          <td className="border text-center">{(prj && prj.agreement) || '—'}</td>
                          <td className="border text-center">{t.address}</td>
                          <td className="border text-center">{prj?.transporter || '—'}</td>
                          <td className="border text-center">{t.vehicle || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </>
            )}

            {unitTransfersSubTab === 'awaiting' && (
              (() => {
                const rows = applyTransportFilter(transports, projects, filter).filter((t: any) => t.deliveredToUnit && !t.receivedByUnit);
                const latestId = (() => {
                  if (rows.length === 0) return null;
                  let best: any = null;
                  let bestTs = -Infinity;
                  for (const r of rows) {
                    const d = r.unitDate || '1970-01-01';
                    const tm = (r.unitTime || '00:00').padStart(5, '0');
                    const ts = new Date(`${d}T${tm.length === 5 ? tm+':00' : tm}`).getTime();
                    if (ts >= bestTs) { bestTs = ts; best = r; }
                  }
                  return best ? best.id : null;
                })();
                return (
                  <>
                    <div className="font-semibold mb-2">Παραδόθηκαν (Εκκρεμούν Υπογραφές)</div>
                    <table className="w-full border text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border px-2">Α/Α</th>
                          <th className="border px-2">Παραγωγός</th>
                          <th className="border px-2">Έργο</th>
                          <th className="border px-2">Διεύθυνση</th>
                          <th className="border px-2">Ημ/νία Παράδοσης</th>
                          <th className="border px-2">Ώρα Παράδοσης</th>
                          <th className="border px-2">Κατάσταση</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr><td className="border text-center p-2" colSpan={6}>—</td></tr>
                        ) : (
                          rows.map((t: any, i: number) => (
                            <tr key={t.id} className={t.id === latestId ? 'bg-green-50' : ''}>
                              <td className="border text-center">{i + 1}</td>
                              <td className="border text-center">{t.producer}</td>
                              <td className="border text-center">{(() => { const prj = A(projects).find((p:any)=> p.id === t.projectId || (p.projectName && String(p.projectName).trim().toLowerCase() === String(t.project || '').trim().toLowerCase())); return prj ? (prj.projectName + (prj.agreement && prj.agreement !== '-' ? ` (${prj.agreement})` : '')) : t.project; })()}</td>
                              <td className="border text-center">{t.address}</td>
                              <td className="border text-center">{fmt(t.unitDate)}</td>
                              <td className="border text-center">{t.unitTime || '—'}</td>
                              <td className="border text-center text-blue-700">
                                {t.status === 'Completed' ? (
                                  'Ολοκληρώθηκε'
                                ) : t.status === 'Waiting for transporter signature' ? (
                                  'Αναμονή για υπογραφή μεταφορέα'
                                ) : t.status === 'Waiting for unit signature' ? (
                                  <span title="Πήγαινε στο tablet για υπογραφή">Αναμονή για υπογραφή μονάδας</span>
                                ) : t.status === 'Waiting' ? (
                                  'Αναμονή'
                                ) : (
                                  t.status || 'Αναμονή υπογραφής'
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </>
                );
              })()
            )}

            {unitTransfersSubTab === 'completed' && (
              <>
              <div className="font-semibold mb-2">Ολοκληρωμένες (Ολοκληρωμένες Μεταφορές)</div>
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
                          <td className="border text-center">{prj ? (prj.projectName + (prj.agreement && prj.agreement !== '-' ? ` (${prj.agreement})` : '')) : t.project}</td>
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
              </>
            )}
          </div>
        ) : (
          <div className="bg-white border rounded p-3">
            {/* Web weigh mode: show only completed transfers with the requested title */}
            <div className="font-semibold mb-2">Ολοκληρωμένες Μεταφορές - Εντυπα Αναγνώρισης και Παρακολούθησης</div>
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
                        <td className="border text-center">{prj ? (prj.projectName + (prj.agreement && prj.agreement !== '-' ? ` (${prj.agreement})` : '')) : t.project}</td>
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
        )
      )}

      {tab === 'slips' && (
        <div>
          <UnitTabletApp
            projects={projects}
            transports={transports}
            onReceive={onReceive}
            onFinalize={onFinalize}
              lockTab="slips"
              hideChrome={true}
              parentFilter={filter}
              parentSetFilter={setFilter}
          />
        </div>
      )}

      {tab === 'pricelist' && (
        <div className="bg-white border rounded p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Τιμοκατάλογος</div>
            <div>
              {!priceEditMode ? (
                <button className="px-3 py-1.5 rounded bg-blue-600 text-white" onClick={() => { setEditPrices(Object.fromEntries(priceList.map((pp:any)=>[pp.code, pp.price]))); setPriceEditMode(true); }}>Επεξεργασία</button>
                  ) : (
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded bg-green-600 text-white" onClick={() => {
                    // apply edits (normalize to two decimals)
                    try {
                      const next = priceList.map((pp: any) => ({ ...pp, price: (parseFloat(String(editPrices[pp.code] ?? pp.price).replace(',', '.')) || 0).toFixed(2) }));
                      setPriceList(next);

                      // persist pricelist so priceFor() can pick it up
                      try {
                        // store under a shared key structure expected by getStoredPriceMap
                        const arr = next.map((p: any) => ({ code: String(p.code || ''), price: Number(p.price || 0) }));
                        const rawAll = localStorage.getItem('iwm_unit_pricelist');
                        const obj = rawAll ? (JSON.parse(rawAll) || {}) : {};
                        // write the same pricelist for known units and as the default entry ('')
                        obj[''] = arr;
                        for (const u of UNITS) obj[u] = arr;
                        localStorage.setItem('iwm_unit_pricelist', JSON.stringify(obj));
                        // also write per-unit keys for direct lookup
                        for (const u of UNITS) {
                          try { localStorage.setItem(`iwm_unit_pricelist_${u}`, JSON.stringify(arr)); } catch {}
                        }
                      } catch (e) { /* ignore persistence errors */ }
                    } catch { /* ignore */ }
                    setPriceEditMode(false);
                    setEditPrices({});
                  }}>Αποθήκευση</button>
                  <button className="px-3 py-1.5 rounded bg-gray-100" onClick={() => { setPriceEditMode(false); setEditPrices({}); }}>Ακύρωση</button>
                </div>
              )}
            </div>
          </div>
          <div className="text-sm">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2">Α/Α</th>
                  <th className="border px-2">ΕΚΑ</th>
                  <th className="border px-2">Περιγραφή</th>
                  <th className="border px-2">Τιμή (€ / tn)</th>
                </tr>
              </thead>
              <tbody>
                {priceList.length === 0 ? (
                  <tr><td className="border text-center p-2" colSpan={4}>—</td></tr>
                ) : (
                  priceList.map((p: any, i: number) => (
                    <tr key={p.code}>
                      <td className="border text-center">{i + 1}</td>
                      <td className="border px-2"><span className="whitespace-nowrap">{String(p.code).replace(/ /g, '\u00A0')}</span></td>
                      <td className="border px-2">{p.description}</td>
                      <td className="border px-2 text-right">
                        {priceEditMode ? (
                          <input
                            type="text"
                            className="border p-1 text-right w-24"
                            value={editPrices[p.code] ?? p.price}
                            onChange={(e:any) => setEditPrices(prev => ({ ...prev, [p.code]: e.target.value }))}
                          />
                        ) : (
                          p.price
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="bg-white border rounded p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Προϊόντα</div>
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => setProdSubTab('products')} className={`px-3 py-1.5 rounded ${prodSubTab==='products' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Προϊόντα</button>
              <button onClick={() => setProdSubTab('orders')} className={`px-3 py-1.5 rounded ${prodSubTab==='orders' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Παραγγελίες</button>
            </div>
          </div>

          {prodSubTab === 'products' && (
            <>
              <div className="flex items-center gap-2 text-sm mb-3">
                <input
                  className="border p-1 rounded w-48"
                  placeholder="Όνομα προϊόντος"
                  value={newProd.name}
                  onChange={(e:any)=> setNewProd(p => ({ ...p, name: e.target.value }))}
                />
                <input
                  className="border p-1 rounded w-28"
                  placeholder="Τιμή (€)"
                  inputMode="decimal"
                  value={newProd.price}
                  onChange={(e:any)=> setNewProd(p => ({ ...p, price: e.target.value }))}
                />
                <button
                  className="px-3 py-1.5 rounded bg-green-600 text-white"
                  onClick={() => {
                    const name = (newProd.name || '').trim();
                    const priceNum = parseFloat(String(newProd.price).replace(',', '.'));
                    if (!name) { alert('Συμπλήρωσε όνομα προϊόντος'); return; }
                    if (!(priceNum >= 0)) { alert('Συμπλήρωσε έγκυρη τιμή'); return; }
                    setUnitProducts(prev => [{ id: gid(), name, price: priceNum.toFixed(2) }, ...prev]);
                    setNewProd({ name: '', price: '' });
                  }}
                  title="Πρόσθεσε Προϊόν"
                >
                  Πρόσθεσε Προϊόν
                </button>
              </div>
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2">Α/Α</th>
                    <th className="border px-2">Όνομα</th>
                    <th className="border px-2">Τιμή (€)</th>
                    <th className="border px-2">Ενέργειες</th>
                  </tr>
                </thead>
                <tbody>
                  {unitProducts.length === 0 ? (
                    <tr><td className="border text-center p-2" colSpan={4}>—</td></tr>
                  ) : (
                    unitProducts.map((p: any, i: number) => (
                      <tr key={p.id}>
                        <td className="border text-center">{i + 1}</td>
                        <td className="border px-2">{p.name}</td>
                        <td className="border text-center">{p.price}</td>
                        <td className="border text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              className="px-2 py-1 rounded bg-gray-100"
                              onClick={() => {
                                const cur = String(p.price ?? '');
                                const next = (prompt('Νέα τιμή (€)', cur) || '').trim();
                                if (!next) return;
                                const num = parseFloat(next.replace(',', '.'));
                                if (!(num >= 0)) { alert('Μη έγκυρη τιμή'); return; }
                                setUnitProducts(prev => prev.map((x:any)=> x.id===p.id ? { ...x, price: num.toFixed(2) } : x));
                              }}
                            >Επεξεργασία</button>
                            <button
                              className="px-2 py-1 rounded bg-red-600 text-white"
                              onClick={() => {
                                if (!confirm('Διαγραφή προϊόντος;')) return;
                                setUnitProducts(prev => prev.filter((x:any)=> x.id !== p.id));
                              }}
                            >Αφαίρεση</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}

          {prodSubTab === 'orders' && (
            <>
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2">Α/Α</th>
                    <th className="border px-2">Εργολάβος</th>
                    <th className="border px-2">Έργο</th>
                    <th className="border px-2">Υπεύθυνος</th>
                    <th className="border px-2">Τηλ.</th>
                    <th className="border px-2">Προϊόν</th>
                    <th className="border px-2">Ποσότητα (tn)</th>
                    <th className="border px-2">Ενέργεια</th>
                  </tr>
                </thead>
                <tbody>
                  {unitOrders.length === 0 ? (
                    <tr><td className="border text-center p-2" colSpan={8}>—</td></tr>
                  ) : (
                    unitOrders.map((o: any, i: number) => (
                      <tr key={o.id}>
                        <td className="border text-center">{i + 1}</td>
                        <td className="border px-2">{o.producer || o.ergolavos || '-'}</td>
                        <td className="border px-2">{o.project || '-'}</td>
                        <td className="border px-2">{o.managerName || '-'}</td>
                        <td className="border text-center">{o.managerPhone || '-'}</td>
                        <td className="border px-2">{o.product || '-'}</td>
                        <td className="border text-center">{o.quantity ? String(o.quantity) : '-'}</td>
                        <td className="border text-center">
                          {o.status ? (
                            <span className={o.status === 'Αποδοχή' ? 'text-green-700' : 'text-red-700'}>{o.status}</span>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button className="px-2 py-1 rounded bg-green-600 text-white" onClick={() => acceptOrder(o.id)}>Αποδοχή</button>
                              <button className="px-2 py-1 rounded bg-red-600 text-white" onClick={() => rejectOrder(o.id)}>Απόρριψη</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {tab === 'stats' && (() => {
        const TON_PER_LOAD = 7;
        const all = A(transports);
        const active = all.filter((t: any) => !t.receivedByUnit);
        const awaiting = all.filter((t: any) => t.deliveredToUnit && !t.receivedByUnit);
        const open = all.filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit);
        const now = new Date();
        const ymd = (d: Date) => d.toISOString().slice(0,10);
        const todayStr = ymd(now);
        const todayExpected = active.filter((t: any) => t.date === todayStr);
        // week bounds
        const dow = (now.getDay() + 6) % 7; // 0=Mon
        const monday = new Date(now); monday.setDate(now.getDate() - dow);
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
        const weekStart = ymd(monday);
        const weekEnd = ymd(sunday);
        const weekExpected = active.filter((t: any) => (t.date >= weekStart && t.date <= weekEnd));
        // month
        const month = now.getMonth(); const year = now.getFullYear();
        const mStart = new Date(year, month, 1); const mEnd = new Date(year, month + 1, 0);
        const mStartStr = ymd(mStart), mEndStr = ymd(mEnd);
        const deliveredThisMonth = all.filter((t: any) => t.receivedByUnit && t.unitDate && t.unitDate >= mStartStr && t.unitDate <= mEndStr);
        const loadsMonth = deliveredThisMonth.length;
        const tonsMonth = deliveredThisMonth.reduce((s: number, t: any) => s + (parseFloat(String(t.weight||0))||0), 0);
        // rolling 30d
        const pastDays = 30; const pStart = new Date(now); pStart.setDate(now.getDate() - (pastDays - 1));
        const pStartStr = ymd(pStart), todayISO = ymd(now);
        const delivered30 = all.filter((t: any) => t.receivedByUnit && t.unitDate && t.unitDate >= pStartStr && t.unitDate <= todayISO);
        const avgDailyLoads = delivered30.length / pastDays;
        const avgDailyTons = (delivered30.reduce((s: number, t: any) => s + (parseFloat(String(t.weight||0))||0), 0)) / pastDays;
        const remainingDaysInMonth = Math.max(0, (mEnd.getDate() - now.getDate()));
        const forecastMonthTons = avgDailyTons * remainingDaysInMonth;

        // helpers
        const StatCard = ({ label, value, sub }: any) => (
          <div className="bg-white border rounded p-4 shadow-sm">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-2xl font-bold">{typeof value === 'function' ? value() : value}</div>
            {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
          </div>
        );

        return (
          <div className="space-y-4">
            <TabBar
              tabs={[
                { key: 'overview', label: 'Επισκόπηση' },
                { key: 'projects', label: 'Έργα' },
                { key: 'deliveries', label: 'Παραδόσεις' },
                { key: 'forecast', label: 'Προβλέψεις' },
                { key: 'finance', label: 'Οικονομικά' },
                { key: 'alerts', label: 'Ειδοποιήσεις & Εισηγήσεις' },
              ]}
              active={statsTab}
              onChange={(k: string) => setStatsTab((k as any) || 'overview')}
            />

            <div className="inline-flex bg-gray-100 p-1 rounded-full">
              {statsTab === 'overview' && (
                <>
                  <button onClick={() => setStatsSub('kpis')} className={`px-3 py-1.5 rounded-full text-sm ${statsSub === 'kpis' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Βασικοί Δείκτες</button>
                  <button onClick={() => setStatsSub('trends')} className={`px-3 py-1.5 rounded-full text-sm ${statsSub === 'trends' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Τάσεις</button>
                </>
              )}
              {statsTab === 'projects' && (
                <>
                  <button onClick={() => setStatsSub('progress')} className={`px-3 py-1.5 rounded-full text-sm ${statsSub === 'progress' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Πρόοδος έργων</button>
                  <button onClick={() => setStatsSub('by-contractor')} className={`px-3 py-1.5 rounded-full text-sm ${statsSub === 'by-contractor' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Ανά εργολάβο</button>
                </>
              )}
              {statsTab === 'deliveries' && (
                <>
                  <button onClick={() => setStatsSub('today-week')} className={`px-3 py-1.5 rounded-full text-sm ${statsSub === 'today-week' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Σήμερα / Εβδομάδα</button>
                  <button onClick={() => setStatsSub('history')} className={`px-3 py-1.5 rounded-full text-sm ${statsSub === 'history' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Ιστορικό</button>
                </>
              )}
              {statsTab === 'forecast' && (
                <>
                  <button onClick={() => setStatsSub('next-weeks')} className={`px-3 py-1.5 rounded-full text-sm ${statsSub === 'next-weeks' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Επόμενες εβδομάδες</button>
                  <button onClick={() => setStatsSub('deviations')} className={`px-3 py-1.5 rounded-full text-sm ${statsSub === 'deviations' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Αποκλίσεις</button>
                </>
              )}
              {statsTab === 'finance' && (
                <>
                  <button onClick={() => setStatsSub('by-project')} className={`px-3 py-1.5 rounded-full text-sm ${statsSub === 'by-project' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Ανά έργο</button>
                  <button onClick={() => setStatsSub('summary')} className={`px-3 py-1.5 rounded-full text-sm ${statsSub === 'summary' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Συνολικά</button>
                </>
              )}
              {statsTab === 'alerts' && (
                <>
                  <button onClick={() => setStatsSub('notifications')} className={`px-3 py-1.5 rounded-full text-sm ${statsSub === 'notifications' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Ειδοποιήσεις</button>
                  <button onClick={() => setStatsSub('insights')} className={`px-3 py-1.5 rounded-full text-sm ${statsSub === 'insights' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Προτάσεις</button>
                </>
              )}
            </div>

            {statsTab === 'overview' && statsSub === 'kpis' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard label="Συνολικές ποσότητες (tn)" value={all.filter((t:any)=>t.receivedByUnit).reduce((s:number,t:any)=> s + (parseFloat(String(t.weight||0))||0), 0).toFixed(1)} />
                <StatCard label="Ενεργά έργα" value={A(projects).filter((p:any)=> (p.end||'') >= todayStr).length} />
                <StatCard label="% Ολοκλήρωσης" value={() => {
                  const expected = A(projects).reduce((s:number,p:any)=> s + (A(p.wasteLines).reduce((ss:number,wl:any)=> ss + ((parseFloat(wl.quantity||'0')||0)*TON_PER_LOAD),0)), 0);
                  const actual = all.filter((t:any)=> t.receivedByUnit).reduce((s:number,t:any)=> s + (parseFloat(String(t.weight||0))||0),0);
                  return expected>0 ? `${Math.min(100,(actual/expected)*100).toFixed(0)}%` : '—';
                }} />
                <StatCard label="Καθυστερήσεις" value={awaiting.length} />
                <StatCard label="Πληρότητα" value="—" sub="—" />
                <StatCard label="Έσοδα" value="—" />
              </div>
            )}

            {statsTab === 'overview' && statsSub === 'trends' && (
              <div className="space-y-3">
                <div className="text-sm text-gray-600">Πραγματικές ποσότητες ανά μήνα (τρέχον έτος)</div>
                {(() => {
                  const months = Array.from({length:12}, (_,i)=> i);
                  const monthName = (i:number)=> new Date(year, i, 1).toLocaleString('el-GR',{month:'short'});
                  const actual: number[] = months.map((m)=> A(all).filter((t:any)=> t.receivedByUnit && t.unitDate && (new Date(t.unitDate).getMonth()===m) && (new Date(t.unitDate).getFullYear()===year)).reduce((s:number,t:any)=> s + (parseFloat(String(t.weight||0))||0),0));
                  const maxVal = Math.max(1, ...actual);
                  return (
                    <div className="grid grid-cols-1 gap-1">
                      {months.map((m)=> (
                        <div key={m} className="flex items-center gap-2">
                          <div className="w-16 text-xs text-gray-600">{monthName(m)}</div>
                          <div className="flex-1 h-3 bg-gray-100 rounded">
                            <div className="h-3 bg-blue-600 rounded" style={{ width: `${(actual[m]/maxVal)*100}%` }} />
                          </div>
                          <div className="w-16 text-right text-xs">{actual[m].toFixed(1)} tn</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {statsTab === 'projects' && statsSub === 'progress' && (
              <div className="overflow-auto">
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2">Έργο</th>
                      <th className="border px-2">Παραγωγός</th>
                      <th className="border px-2">% Ολοκλήρωσης</th>
                      <th className="border px-2">Καθυστερήσεις</th>
                      <th className="border px-2">Πρόβλεψη</th>
                    </tr>
                  </thead>
                  <tbody>
                    {A(projects).length === 0 ? (
                      <tr><td className="border text-center p-2" colSpan={5}>—</td></tr>
                    ) : (
                      A(projects).map((p:any)=>{
                        const expected = A(p.wasteLines).reduce((s:number,wl:any)=> s + ((parseFloat(wl.quantity||'0')||0)*TON_PER_LOAD),0);
                        const actual = A(transports).filter((t:any)=> t.projectId === p.id && t.receivedByUnit).reduce((s:number,t:any)=> s + (parseFloat(String(t.weight||0))||0),0);
                        const pct = expected>0 ? Math.min(100,(actual/expected)*100) : 0;
                        const delays = A(transports).filter((t:any)=> t.projectId===p.id && t.deliveredToUnit && !t.receivedByUnit).length;
                        return (
                          <tr key={p.id}>
                            <td className="border px-2">{p.projectName}</td>
                            <td className="border px-2">{p.producer}</td>
                            <td className="border px-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 h-2 rounded"><div className="bg-green-600 h-2 rounded" style={{ width: `${pct}%` }} /></div>
                                <div className="text-xs">{expected>0 ? `${pct.toFixed(0)}%` : '—'}</div>
                              </div>
                            </td>
                            <td className="border text-center">{delays}</td>
                            <td className="border text-center">—</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {statsTab === 'projects' && statsSub === 'by-contractor' && (
              <div className="overflow-auto">
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2">Εργολάβος</th>
                      <th className="border px-2">Ποσότητες (tn)</th>
                      <th className="border px-2">Συνέπεια</th>
                      <th className="border px-2">Καθυστερήσεις</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const map: Record<string,{tons:number, delays:number}> = {};
                      A(projects).forEach((p:any)=>{
                        const tr = p.transporter || '-';
                        if (!map[tr]) map[tr] = { tons: 0, delays: 0 };
                        const tons = A(transports).filter((t:any)=> t.projectId===p.id && t.receivedByUnit).reduce((s:number,t:any)=> s + (parseFloat(String(t.weight||0))||0),0);
                        const delays = A(transports).filter((t:any)=> t.projectId===p.id && t.deliveredToUnit && !t.receivedByUnit).length;
                        map[tr].tons += tons; map[tr].delays += delays;
                      });
                      const rows = Object.entries(map);
                      if (rows.length === 0) return (<tr><td className="border text-center p-2" colSpan={4}>—</td></tr>);
                      return rows.map(([name,vals]) => (
                        <tr key={name}>
                          <td className="border px-2">{name}</td>
                          <td className="border px-2 text-right">{vals.tons.toFixed(1)}</td>
                          <td className="border px-2 text-center">—</td>
                          <td className="border px-2 text-center">{vals.delays}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}

            {statsTab === 'deliveries' && statsSub === 'today-week' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold mb-2">Σήμερα</div>
                  <ul className="text-sm space-y-1">
                    {todayExpected.length === 0 ? (<li className="text-gray-500">—</li>) : todayExpected.map((t:any)=> (
                      <li key={t.id} className="flex justify-between bg-white border rounded px-2 py-1"><span>{t.producer} — {t.project}</span><span className="text-gray-500">{t.vehicle||'—'}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold mb-2">Εβδομάδα</div>
                  <ul className="text-sm space-y-1">
                    {weekExpected.length === 0 ? (<li className="text-gray-500">—</li>) : weekExpected.map((t:any)=> (
                      <li key={t.id} className="flex justify-between bg-white border rounded px-2 py-1"><span>{t.producer} — {t.project}</span><span className="text-gray-500">{t.date || '—'}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {statsTab === 'deliveries' && statsSub === 'history' && (
              <div className="overflow-auto">
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2">Ημ/νία</th>
                      <th className="border px-2">Παραγωγός</th>
                      <th className="border px-2">Έργο</th>
                      <th className="border px-2">ΕΚΑ</th>
                      <th className="border px-2">Βάρος (tn)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {A(all).filter((t:any)=> t.receivedByUnit).slice(0,100).map((t:any)=> (
                      <tr key={t.id}>
                        <td className="border px-2">{fmt(t.unitDate)}</td>
                        <td className="border px-2">{t.producer}</td>
                        <td className="border px-2">{t.project}</td>
                        <td className="border px-2">{t.ekaCategory}</td>
                        <td className="border px-2 text-right">{t.weight}</td>
                      </tr>
                    ))}
                    {A(all).filter((t:any)=> t.receivedByUnit).length === 0 && (
                      <tr><td className="border text-center p-2" colSpan={5}>—</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {statsTab === 'forecast' && statsSub === 'next-weeks' && (
              <div className="space-y-2 text-sm">
                <div className="text-gray-600">Αναμενόμενες ποσότητες (εκτίμηση tn με {TON_PER_LOAD} tn/φορτίο)</div>
                {(() => {
                  const twoWeeks: Record<string, number> = {};
                  const todayDate = new Date();
                  for (let i=0;i<14;i++) { const d = new Date(todayDate); d.setDate(d.getDate()+i); const k = ymd(d); twoWeeks[k]=0; }
                  A(open).forEach((t:any)=>{ if (twoWeeks[t.date]) twoWeeks[t.date] += 1; });
                  const entries = Object.entries(twoWeeks);
                  const maxL = Math.max(1, ...entries.map(([,c])=> c));
                  return (
                    <div className="space-y-1">
                      {entries.map(([d,c])=> (
                        <div key={d} className="flex items-center gap-2">
                          <div className="w-24 text-xs text-gray-600">{fmt(d)}</div>
                          <div className="flex-1 h-2 bg-gray-100 rounded"><div className="h-2 bg-indigo-600 rounded" style={{ width: `${(c/maxL)*100}%` }} /></div>
                          <div className="w-24 text-right text-xs">{(c*TON_PER_LOAD).toFixed(1)} tn</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {statsTab === 'forecast' && statsSub === 'deviations' && (
              <div className="space-y-2 text-sm">
                <div className="text-gray-600">Αποκλίσεις προβλέψεων vs πραγματικών (τρέχων μήνας)</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Πραγματικά (tn)" value={tonsMonth.toFixed(1)} />
                  <StatCard label="Πρόβλεψη υπολοίπου (tn)" value={forecastMonthTons.toFixed(1)} />
                  <StatCard label="Σύνολο εκτίμησης (tn)" value={(tonsMonth+forecastMonthTons).toFixed(1)} />
                  <StatCard label="Διαφορά" value={(0).toFixed(1)} />
                </div>
              </div>
            )}

            {statsTab === 'finance' && statsSub === 'by-project' && (
              <div className="text-sm text-gray-600">Οικονομικά ανά έργο — Προς υλοποίηση</div>
            )}
            {statsTab === 'finance' && statsSub === 'summary' && (
              <div className="text-sm text-gray-600">Συνολικά έσοδα/έξοδα ανά μήνα — Προς υλοποίηση</div>
            )}

            {statsTab === 'alerts' && statsSub === 'notifications' && (
              <div className="space-y-2">
                {A(notifications).filter((n:any)=> n.target?.page==='unit').length === 0 ? (
                  <div className="text-sm text-gray-500">Καμία ειδοποίηση</div>
                ) : (
                  A(notifications).filter((n:any)=> n.target?.page==='unit').map((n:any)=> (
                    <div key={n.id} className={`p-2 text-sm rounded ${n.read ? 'bg-gray-50' : 'bg-blue-50'}`}>{n.title || 'Ειδοποίηση'}</div>
                  ))
                )}
              </div>
            )}
            {statsTab === 'alerts' && statsSub === 'insights' && (
              <div className="space-y-2 text-sm">
                <div className="font-semibold">Προτάσεις</div>
                <ul className="list-disc pl-5 space-y-1">
                  {awaiting.length > 5 && (<li>Υψηλές εκκρεμότητες υπογραφών ({awaiting.length}). Εξετάστε επιτάχυνση διαδικασιών υπογραφής.</li>)}
                  {open.length > 10 && (<li>Πολλές ανοιχτές μεταφορές ({open.length}). Προτείνεται αύξηση δρομολογίων.</li>)}
                  {(awaiting.length <= 5 && open.length <= 10) && (<li>Δεν εντοπίστηκαν σημαντικές αποκλίσεις.</li>)}
                </ul>
              </div>
            )}
          </div>
        );
      })()}

      {weighOpen && (
        <Modal title="Παραλαβή/Ζύγιση" onClose={() => setWeighOpen(false)} onSubmit={submitWeigh} submitLabel="Ολοκλήρωση">
          {(() => {
            const row = A(transports).find((x: any) => x.id === weighData.id) || {};
            const proj = A(projects).find((p: any) => p.id === row.projectId) || null;
            return (
              <div className="space-y-3 text-sm">
                <div className="font-semibold">Στοιχεία Μεταφοράς</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Παραγωγός</div>
                    <div className="font-medium">{row.producer || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Έργο</div>
                    <div className="font-medium">{row.project || proj?.projectName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Διεύθυνση</div>
                    <div className="font-medium">{row.address || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Μονάδα</div>
                    <div className="font-medium">{row.unit || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Μεταφορέας</div>
                    <div className="font-medium">{proj?.transporter || row.transporter || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Όχημα</div>
                    <div className="font-medium">{row.vehicle || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Ημερομηνία</div>
                    <div className="font-medium">{fmt(row.date || row.unitDate) || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Ώρα</div>
                    <div className="font-medium">{row.time || row.unitTime || '-'}</div>
                  </div>
                </div>

                <div className="font-semibold">Στοιχεία Ζύγισης</div>
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

                <div className="font-semibold">Στοιχεία χρέωσης</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <label className="col-span-2">Χρεώστης
                    <select className="border p-1 w-full" value={weighData.debtor || ''} onChange={(e: any) => setWeighData({ ...weighData, debtor: e.target.value })}>
                      <option value="">— Επιλογή —</option>
                      {(Array.from(new Set(readStoredDebtors() || [])) as string[]).map((d: string)=> (<option key={d} value={d}>{d}</option>))}
                    </select>
                  </label>
                </div>

                {/* No signature at Unit step: after ολοκλήρωση ζύγισης, ο οδηγός θα κληθεί να υπογράψει στο mobile */}
              </div>
            );
          })()}
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
function EcoMobileFrame({ projects, transports, onAddTransport, notifications, onJump, onAcceptRequest, onRejectRequest, addNotif, onFinalizeDelivery, onUpdateTransport, onClearTransNew, onClearProjectsNew }: any) {
  const [curTransporter, setCurTransporter] = useState<string>(() => {
    try { return localStorage.getItem('iwm_transporter_current') || ''; } catch { return ''; }
  });
  const handleLogin = (name: string) => {
    try { localStorage.setItem('iwm_transporter_current', name); } catch {}
    setCurTransporter(name);
  };
  const handleLogout = () => {
    try { localStorage.removeItem('iwm_transporter_current'); } catch {}
    setCurTransporter('');
  };
  return (
    <div className="flex justify-center items-center min-h-[700px] bg-gray-200 rounded-lg">
      <div className="relative bg-black p-4 rounded-[3rem] w-[380px] h-[780px] shadow-2xl border-[8px] border-gray-900">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-800 rounded-full" />
        <div className="absolute inset-4 bg-white rounded-[2rem] overflow-hidden">
          {curTransporter ? (
            <EcoApp
              projects={projects}
              transports={transports}
              onAddTransport={onAddTransport}
              notifications={notifications}
              onJump={onJump}
              onAcceptRequest={onAcceptRequest}
              onRejectRequest={onRejectRequest}
              addNotif={addNotif}
              onFinalizeDelivery={onFinalizeDelivery}
              onUpdateTransport={onUpdateTransport}
              currentTransporter={curTransporter}
              onLogout={handleLogout}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <div className="text-2xl font-bold mb-1">Σύνδεση</div>
              <div className="text-sm text-gray-600 mb-6">Επέλεξε μεταφορέα για να συνεχίσεις</div>
              <div className="flex flex-col gap-3 w-56">
                <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={() => handleLogin('Euroskip')}>Σύνδεση ως Euroskip</button>
                <button className="px-4 py-2 rounded bg-indigo-600 text-white" onClick={() => handleLogin('Skip Hire')}>Σύνδεση ως Skip Hire</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/******** unit tablet (tablet app showing only transfers tab) ********/
function UnitTabletFrame({ projects, transports, onReceive, onFinalize, onAddTransport, addNotif }: any) {
  return (
    <div className="flex justify-center items-center min-h-[700px] bg-gray-200 rounded-lg">
      <div className="relative bg-black p-4 rounded-[2rem] w-[1024px] h-[768px] shadow-2xl border-[8px] border-gray-900">
        <div className="absolute inset-4 bg-white rounded-[1.5rem] overflow-hidden">
          <UnitTabletApp projects={projects} transports={transports} onReceive={onReceive} onFinalize={onFinalize} onAddTransport={onAddTransport} addNotif={addNotif} />
        </div>
      </div>
    </div>
  );
}

function UnitTabletApp({ projects, transports, onReceive, onFinalize, onAddTransport, addNotif, lockTab, hideChrome, onNavigateUnit, parentFilter, parentSetFilter }: any) {
  const [filter, setFilter] = useState<any>({ producer: '', project: '', from: '', to: '' });
  const [weighOpen, setWeighOpen] = useState(false);
  const [weighData, setWeighData] = useState<any>({ id: '', weight: '', eka: (EKA[0] && EKA[0].code) || '', debtor: '' });
  const [tab, setTab] = useState<'weigh' | 'awaiting' | 'completed' | 'slips'>(lockTab || 'weigh');
  // confirmation banners
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);
  const [showUnitSignConfirm, setShowUnitSignConfirm] = useState(false);
  const [unitSignModal, setUnitSignModal] = useState<any>({ open: false, id: null, signature: '' });

  // Local slips store for independent weighing (not linked to transports)
  const [slips, setSlips] = useState<any[]>([]);
  const [slipsFilter, setSlipsFilter] = useState<any>({ producer: '', project: '', debtor: '', transporter: '', vehicle: '', from: '', to: '' });
  const [showSlipsFilters, setShowSlipsFilters] = useState(false);
  // when embedded into the web Unit (hideChrome === true) we accept the parent filter instead of local slipsFilter
  const effectiveSlipsFilter = hideChrome && parentFilter ? parentFilter : slipsFilter;
  const effectiveSetSlipsFilter = hideChrome && parentSetFilter ? parentSetFilter : setSlipsFilter;
  const [completedFilter, setCompletedFilter] = useState<any>({ producer: '', project: '', transporter: '', vehicle: '', from: '', to: '' });
  // Offline (local) Producers & Projects for Unit web/tablet receive form
  const [offlineProducers, setOfflineProducers] = useState<string[]>(() => {
    try { const raw = localStorage.getItem('iwm_unit_offline_producers'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
  });
  const [offlineProjects, setOfflineProjects] = useState<Record<string, string[]>>(() => {
    try { const raw = localStorage.getItem('iwm_unit_offline_projects'); const obj = raw ? JSON.parse(raw) : {}; return obj && typeof obj === 'object' ? obj : {}; } catch { return {}; }
  });
  const [offlineTransporters, setOfflineTransporters] = useState<string[]>(() => {
    try { const raw = localStorage.getItem('iwm_unit_offline_transporters'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
  });
  const [offlineTransPlates, setOfflineTransPlates] = useState<Record<string, string[]>>(() => {
    try { const raw = localStorage.getItem('iwm_unit_offline_transporter_plates'); const obj = raw ? JSON.parse(raw) : {}; return obj && typeof obj === 'object' ? obj : {}; } catch { return {}; }
  });
  const [offlineDebtors, setOfflineDebtors] = useState<string[]>(() => {
    try { const raw = localStorage.getItem('iwm_unit_offline_debtors'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
  });
  React.useEffect(() => { try { localStorage.setItem('iwm_unit_offline_producers', JSON.stringify(offlineProducers)); } catch {} }, [offlineProducers]);
  React.useEffect(() => { try { localStorage.setItem('iwm_unit_offline_projects', JSON.stringify(offlineProjects)); } catch {} }, [offlineProjects]);
  React.useEffect(() => { try { localStorage.setItem('iwm_unit_offline_transporters', JSON.stringify(offlineTransporters)); } catch {} }, [offlineTransporters]);
  React.useEffect(() => { try { localStorage.setItem('iwm_unit_offline_transporter_plates', JSON.stringify(offlineTransPlates)); } catch {} }, [offlineTransPlates]);
  React.useEffect(() => { try { localStorage.setItem('iwm_unit_offline_debtors', JSON.stringify(offlineDebtors)); } catch {} }, [offlineDebtors]);
  // persist slips locally so they remain after refresh
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('iwm_tablet_slips');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setSlips(arr);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    try { localStorage.setItem('iwm_tablet_slips', JSON.stringify(slips)); } catch {}
  }, [slips]);
  const [wSubTab, setWSubTab] = useState<'open' | 'receive'>('receive');
  // success toast after manual receive
  const [showConfirm, setShowConfirm] = useState(false);
  // Unknown project registration flow (UI-only, no persistence yet)
  const [projReg, setProjReg] = useState<any>({ open: false, step: 'ask', project: '', producer: '', andPrint: false });
  // weigh form: manual project name, producer text, transporter from list, vehicle from per-transporter list
  const transporterList = ['Euroskip', 'Skip Hire'];
  const transporterPlates: Record<string, string[]> = {
    Euroskip: ['ΚΥΧ123', 'ΚΥΧ567', 'ΚΥΧ999'],
    'Skip Hire': ['ΑΑΖ567', 'ΑΑΖ112'],
  };
  const [wForm, setWForm] = useState<any>({ project: '', producer: '', debtor: '', transporter: '', plate: '', eka: (EKA[0] && EKA[0].code) || '', weight: '' });
  const [trDropOpen, setTrDropOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState<any>({ transporter: '', plate: '', plateTransporter: '', producer: '', projectProducer: '', project: '', debtor: '' });
  const randomWeigh = () => {
    const rnd = (Math.random() * (12 - 5) + 5);
    setWForm((f: any) => ({ ...f, weight: rnd.toFixed(2) }));
  };
  // Removed warning when selecting plate/transporter to allow manual receive without prompts
  const continueWeighSlip = (andPrint = false) => {
    const plate = (wForm.plate || '').trim();
    if (!wForm.project) return alert('Συμπλήρωσε Έργο');
    if (!plate) return alert('Συμπλήρωσε Αρ. Οχήματος');
    if (!wForm.eka) return alert('Επίλεξε κατηγορία ΕΚΑ');
    const w = parseFloat(String(wForm.weight || '0')) || 0;
    if (w <= 0) return alert('Άκυρο βάρος');
    // Try to find a matching open transfer from the Automatic list
    const openTransfers = A(transports).filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit);
    const tr = (wForm.transporter || '').trim();
    const pl = (wForm.plate || '').trim();
    let matchId: string | null = null;
    if (tr && pl) {
      const byTP = openTransfers.find((t: any) => {
        const prj = A(projects).find((p: any) => p.id === t.projectId);
        const tTrans = t.transporter || prj?.transporter || '';
        const tVeh = t.vehicle || '';
        return tTrans === tr && tVeh === pl;
      });
      if (byTP) matchId = byTP.id;
    }
    if (!matchId && wForm.producer && wForm.project) {
      const byPP = openTransfers.find((t: any) => {
          const prj = A(projects).find((p: any) => p.id === t.projectId);
          // Prefer matching by projectId when available to avoid collisions on identical names
          if (wForm.projectId) return String(t.projectId || '') === String(wForm.projectId);
          const tProj = t.project || prj?.projectName || '';
          return t.producer === wForm.producer && tProj === wForm.project;
        });
      if (byPP) matchId = byPP.id;
    }
    const now = new Date();
    const ymd = now.toISOString().slice(0,10);
    const tm = now.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const row = {
      id: gid(),
      date: ymd,
      time: tm,
      producer: (wForm.producer || '-'),
      project: (wForm.project || '-'),
      projectId: wForm.projectId,
      unit: '-',
      debtor: (wForm.debtor || '-'),
      transporter: (wForm.transporter || '-'),
      vehicle: plate,
      ekaCategory: wForm.eka,
      weight: w.toFixed(2),
    };
    setSlips((prev: any[]) => [row, ...prev]);
    // If transporter is on our platform, create a pending delivery record and notify transporter mobile
    // BUT if we already matched an existing open transfer (matchId) treat it as the same and do NOT create a duplicate
    const inPlatform = new Set(['Euroskip', 'Skip Hire']);
    if (wForm.transporter && inPlatform.has(wForm.transporter) && !matchId) {
      const rp = String(row.project || '').trim().toLowerCase();
      const matchedProject = A(projects).find((p:any) => {
        if (!p) return false;
        const pn = String(p.projectName || '').trim().toLowerCase();
        if (pn && pn === rp) return true;
        if (pn && rp && pn.includes(rp)) return true;
        if (p.id && String(p.id) === String(row.project)) return true;
        return false;
      });
      // For on-platform transporters we MUST create a transport entry so the driver
      // can sign the delivery via the transporter mobile app. Create a manual transport
      // that represents the delivered-to-unit record awaiting transporter signature.
      const t: any = {
        id: gid(),
        producer: row.producer,
        project: row.project,
        projectId: matchedProject ? matchedProject.id : undefined,
        address: '-',
        unit: row.unit,
        vehicle: row.vehicle,
        date: ymd,
        time: tm,
        unitDate: ymd,
        unitTime: tm,
        weight: row.weight,
        ekaCategory: row.ekaCategory,
        status: 'Waiting for transporter signature',
        approvedByProducer: true,
        deliveredToUnit: true,
        receivedByUnit: false,
        fromProducer: false,
        transporter: row.transporter,
        isNew: true,
        manualCreated: true,
        manualWeighed: false,
      };
      try { onAddTransport && onAddTransport(t); } catch {}
      try { addNotif && addNotif('Παράδοση στη μονάδα', `${row.producer} / ${row.project} — Παραλαβή (χειροκίνητη)`, { page: 'transporter', tab: 'transfers' }); } catch {}
    }
    if (andPrint) try { pdfSlip(row); } catch {}
    // If matched an existing open transfer, update it and redirect to Automatic tab
    if (matchId) {
      try { onReceive && onReceive(matchId, w, wForm.eka, true); } catch {}
    }
    // Stay on the manual receive page and show confirmation toast
    setTab('weigh' as any);
    setWSubTab('receive');
    setShowConfirm(true);
    setTimeout(() => setShowConfirm(false), 2000);
  setWForm({ project: '', producer: '', debtor: '', transporter: '', plate: '', eka: (EKA[0] && EKA[0].code) || '', weight: '' });
  };

  const submitWeighSlip = (andPrint = false) => {
    const plate = (wForm.plate || '').trim();
    if (!wForm.project) return alert('Συμπλήρωσε Έργο');
    if (!plate) return alert('Συμπλήρωσε Αρ. Οχήματος');
    if (!wForm.eka) return alert('Επίλεξε κατηγορία ΕΚΑ');
    // If project is not known (platform/offline), show central popup flow
    // Projects in the UI may be shown as labels that include agreement numbers
    // (e.g. "Project Name (AG123)"). Accept either the plain projectName or
    // the label that includes agreement as a known platform project.
    const platformNames = new Set(A(projects).map((p:any) => (p.projectName || '').trim()).filter(Boolean));
    const platformLabels = new Set(A(projects).map((p:any) => {
      const label = (p.projectName || '').trim();
      return label + (p.agreement && p.agreement !== '-' ? ` (${p.agreement})` : '');
    }).filter(Boolean));
    const offlineAll = new Set(Object.values(offlineProjects || {}).flat());
    const isKnown = platformNames.has(wForm.project) || platformLabels.has(wForm.project) || offlineAll.has(wForm.project);
    if (!isKnown) {
      setProjReg({ open: true, step: 'ask', project: wForm.project, producer: (wForm.producer||''), andPrint });
      return;
    }
    continueWeighSlip(andPrint);
  };

  const openWeigh = (t: any) => { const rnd = (Math.random() * (12 - 5) + 5); setWeighData({ id: t.id, weight: rnd.toFixed(2), eka: (EKA[0] && EKA[0].code) || '', debtor: '' }); setWeighOpen(true); };
  const submitWeigh = () => {
    if (!weighData.id) return;
    // call parent receive handler
  onReceive(weighData.id, parseFloat(weighData.weight || '0'), weighData.eka, true);
    // append a slip entry regardless of signatures/completion
    const t = A(transports).find((x: any) => x.id === weighData.id);
    const prj = t ? A(projects).find((p: any) => p.id === t.projectId) : null;
    const now = new Date();
    const ymd = now.toISOString().slice(0,10);
    const tm = now.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const slip = {
      id: gid(),
      date: ymd,
      time: tm,
      producer: t?.producer || '-',
      project: t?.project || '-',
      projectId: t?.projectId,
      unit: t?.unit || '-',
      debtor: (weighData.debtor || '-'),
      transporter: t?.transporter || prj?.transporter || '-',
      vehicle: t?.vehicle || '-',
      ekaCategory: weighData.eka,
      weight: (parseFloat(String(weighData.weight || '0')) || 0).toFixed(2),
    };
    setSlips((prev: any[]) => [slip, ...prev]);
    setWeighOpen(false);
    // show confirmation with navigation to awaiting signatures
    setShowAutoConfirm(true);
    setTimeout(() => setShowAutoConfirm(false), 3000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Success message will render contextually above manual fields; removed global toast */}
      {!hideChrome && (
        <div className="px-4 py-3 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Μονάδα — Tablet</div>
          </div>
        </div>
      )}
      <div className="p-4 overflow-auto">
        {/* Removed global filters above Unit Tablet tabs as requested */}

        {(() => {
          const all = applyTransportFilter(transports, projects, filter);
          const openList = all.filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit);
          // awaitingList shows only items delivered to unit (after weighing) and pending driver signature
          const awaitingList = all.filter((t: any) => t.deliveredToUnit && !t.receivedByUnit);
          const completedList = all.filter((t: any) => t.receivedByUnit);

          return (
            <div className="bg-white border rounded p-3">
              {!hideChrome && (
                <TabBar
                  tabs={[
                    { key: 'weigh', label: 'Ζύγιση', count: openList.length },
                    { key: 'awaiting', label: 'Εκκρεμή για υπογραφή', count: awaitingList.length },
                    { key: 'completed', label: 'Ολοκληρωμένες', count: completedList.length },
                    { key: 'slips', label: 'Δελτία παραλαβής', count: slips.length },
                  ]}
                  active={tab}
                  onChange={(k: string) => setTab((lockTab as any) || (k as any) || 'weigh')}
                />
              )}

              {showUnitSignConfirm && (
                <div className="relative mx-auto max-w-xl text-center bg-green-50 border border-green-200 text-green-800 rounded px-3 py-2 my-2">
                  <button
                    aria-label="Κλείσιμο"
                    className="absolute right-2 top-1 text-green-800 hover:text-green-900"
                    onClick={() => setShowUnitSignConfirm(false)}
                  >✕</button>
                  <span>
                    Η υπογραφή μονάδας καταχωρήθηκε.{' '}
                    <button
                      className="underline font-medium text-green-700 hover:text-green-800"
                      onClick={() => {
                        setTab('weigh');
                        setShowUnitSignConfirm(false);
                      }}
                    >Μετάβαση στη ζύγιση</button>
                  </span>
                </div>
              )}

              {tab === 'weigh' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setWSubTab('receive')} className={`px-3 py-2 ${wSubTab === 'receive' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Χειροκίνητη Παραλαβή</button>
                      <button onClick={() => setWSubTab('open')} className={`px-3 py-2 ${wSubTab === 'open' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>
                        Αυτόματη Παραλαβή
                        <span className={`ml-2 text-xs rounded-full px-2 ${openList.length === 0 ? 'bg-gray-200 text-gray-700' : 'bg-red-600 text-white'}`}>{openList.length}</span>
                      </button>
                    </div>
                    <button className="px-2 py-1 border rounded bg-gray-50 hover:bg-gray-100 text-sm" onClick={() => setAdminOpen(true)}>Database</button>
                  </div>

                  {showAutoConfirm && (
                    <div className="relative mx-auto max-w-xl text-center bg-green-50 border border-green-200 text-green-800 rounded px-3 py-2">
                      <button
                        aria-label="Κλείσιμο"
                        className="absolute right-2 top-1 text-green-800 hover:text-green-900"
                        onClick={() => setShowAutoConfirm(false)}
                      >✕</button>
                      Η παραλαβή καταχωρήθηκε επιτυχώς.{' '}
                      <button
                        className="underline font-medium text-green-700 hover:text-green-800"
                        onClick={() => {
                          if (onNavigateUnit) {
                            onNavigateUnit('transfers', 'awaiting');
                          } else {
                            setTab('awaiting');
                          }
                          setShowAutoConfirm(false);
                        }}
                      >{onNavigateUnit ? 'Μετάβαση στα Παραδόθηκαν' : 'Μετάβαση στα εκκρεμή για υπογραφή'}</button>
                    </div>
                  )}


                  {wSubTab === 'open' && (
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

                  {wSubTab === 'receive' && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {showConfirm && (
                        <div className="col-span-2">
                          <div className="mx-auto max-w-xl text-center bg-green-50 border border-green-200 text-green-800 rounded px-3 py-2">
                            Η παραλαβή καταχωρήθηκε επιτυχώς.{' '}
                            <button
                              className="underline font-medium text-green-700 hover:text-green-800"
                              onClick={() => setTab('slips')}
                            >Μετάβαση στα δελτία παραλαβής</button>
                          </div>
                        </div>
                      )}
                      {(() => {
                        // Dynamic platform data
                        const platformProducers = [...new Set(A(projects).map((p: any) => p.producer).filter(Boolean))];
                        const allProducers = Array.from(new Set([...(platformProducers as string[]), ...offlineProducers])).sort();
                          const projectOpts = (() => {
                            // Build labels that include agreement number when present to avoid homonyms
                            const makeLabel = (p: any) => (p.projectName + (p.agreement && p.agreement !== '-' ? ` (${p.agreement})` : ''));
                            if (wForm.producer) {
                              const platformForProducer = A(projects).filter((p:any)=> p.producer === wForm.producer).map((p:any)=> makeLabel(p)).filter(Boolean);
                              const offlineForProducer = (offlineProjects[wForm.producer] || []).map((nm: string) => nm);
                              return Array.from(new Set([...(platformForProducer as string[]), ...offlineForProducer])).sort();
                            }
                            const platformAll = A(projects).map((p:any)=> makeLabel(p)).filter(Boolean);
                            const offlineAll = Object.values(offlineProjects).flat();
                            return Array.from(new Set([...(platformAll as string[]), ...offlineAll])).sort();
                          })();
                        return (
                          <>
                            {/* Row 0: Clear button spanning both columns */}
                            <div className="col-span-2">
                              <button
                                type="button"
                                className="mb-2 px-2 py-1 border rounded bg-red-100 hover:bg-red-200 text-red-700 text-xs"
                                onClick={() => {
                                  setWForm({transporter:'', project:'', producer:'', debtor:'', plate:'', weight:'', notes:''});
                                  setTimeout(() => {
                                    const first = document.querySelector('#manual-receive-transporter');
                                    if (first) (first as HTMLInputElement).focus();
                                  }, 50);
                                }}
                              >
                                Clear
                              </button>
                            </div>

                            {/* Row 1: Plate */}
                            <label>Αρ. Οχήματος
                              {(() => {
                                const trSel = (wForm.transporter || '').trim();
                                // Show all plates for selected transporter, or all plates if none selected
                                let vehiclesMap: Record<string, string[]> = {};
                                try {
                                  const raw = localStorage.getItem('iwm_transporter_vehicles');
                                  vehiclesMap = raw ? JSON.parse(raw) : {};
                                } catch {}
                                // Only include plates for transporters that exist in the unit's database
                                const validTransporters = new Set(Object.keys(offlineTransPlates));
                                let allPlates: string[] = [];
                                if (trSel) {
                                  // Only show if transporter exists in unit DB
                                  if (validTransporters.has(trSel)) {
                                    const profilePlates = vehiclesMap[trSel] || [];
                                    const offlinePlates = offlineTransPlates[trSel] || [];
                                    allPlates = Array.from(new Set([...profilePlates, ...offlinePlates]));
                                  } else {
                                    allPlates = [];
                                  }
                                } else {
                                  // No transporter selected: show all plates from all transporters that exist in unit DB
                                  allPlates = Array.from(new Set([
                                    ...Object.entries(vehiclesMap).filter(([tr]) => validTransporters.has(tr)).map(([, arr]) => arr).flat(),
                                    ...Object.entries(offlineTransPlates).map(([, arr]) => arr).flat()
                                  ]));
                                }
                                const plateOwner: Record<string,string> = {};
                                Object.entries(offlineTransPlates).forEach(([tr, arr]) => { (arr||[]).forEach((pl:string)=> { plateOwner[pl] = tr; }); });
                                Object.entries(vehiclesMap).forEach(([tr, arr]) => { if (validTransporters.has(tr)) (arr||[]).forEach((pl:string)=> { plateOwner[pl] = tr; }); });
                                return (
                                  <>
                                    <input
                                      id="manual-receive-transporter"
                                      className="border p-1 w-full"
                                      placeholder="Πληκτρολόγησε ή επίλεξε αριθμό"
                                      list="dl-plates"
                                      value={wForm.plate}
                                      onChange={(e:any) => {
                                        const val = e.target.value.trim();
                                        setWForm((f:any)=> {
                                          const next:any = { ...f, plate: val };
                                          if (!f.transporter && plateOwner[val]) next.transporter = plateOwner[val];
                                          return next;
                                        });
                                      }}
                                    />
                                    <datalist id="dl-plates">
                                      {allPlates.map((pl)=> (<option key={pl} value={pl} />))}
                                    </datalist>
                                  </>
                                );
                              })()}
                            </label>
                            <label>Μεταφορέας
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const inPlatform = new Set(['Euroskip','Skip Hire']);
                                  const options = Array.from(new Set([...
                                    transporterList,
                                    ...offlineTransporters,
                                  ]));
                                  const selected = (wForm.transporter || '').trim();
                                  const selIsPlatform = selected ? inPlatform.has(selected) : false;
                                  return (
                                    <div className="flex-1 flex items-center gap-2">
                                      <span className={`inline-block w-2 h-2 rounded-full ${selected ? (selIsPlatform ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-300'}`}></span>
                                      <input
                                        id="manual-receive-transporter"
                                        className="border p-1 w-full"
                                        placeholder="Πληκτρολόγησε ή επίλεξε μεταφορέα"
                                        list="dl-transporters"
                                        value={wForm.transporter}
                                        onChange={(e:any) => setWForm((f:any)=> ({ ...f, transporter: e.target.value }))}
                                      />
                                      <datalist id="dl-transporters">
                                        {options.map((name: string) => (<option key={name} value={name} />))}
                                      </datalist>
                                    </div>
                                  );
                                })()}
                                <button
                                  type="button"
                                  className="px-2 py-1 border rounded bg-gray-50 hover:bg-gray-100"
                                  title="Προσθήκη νέου Μεταφορέα"
                                  onClick={() => {
                                    const name = (prompt('Νέος Μεταφορέας') || '').trim();
                                    if (!name) return;
                                    setOfflineTransporters((prev)=> prev.includes(name) ? prev : [...prev, name]);
                                    setWForm((f:any)=> ({ ...f, transporter: name }));
                                  }}
                                >+
                                </button>
                              </div>
                            </label>

                            {/* Row 2: Project, Producer */}
                            <label>Έργο
                              <div className="flex items-center gap-2">
                                <input
                                  className="border p-1 w-full"
                                  placeholder="Πληκτρολόγησε ή επίλεξε έργο"
                                  list="dl-unit-projects"
                                  value={wForm.project}
                                  onChange={(e: any) => {
                                    const val = e.target.value;
                                    // try to resolve exact project by label (including agreement) first, then by name
                                    const found = A(projects).find((p:any) => {
                                      const label = p.projectName + (p.agreement && p.agreement !== '-' ? ` (${p.agreement})` : '');
                                      return label === val || p.projectName === val;
                                    });
                                    if (found) {
                                      setWForm((f: any) => ({ ...f, project: val, projectId: found.id, producer: found.producer }));
                                    } else {
                                      // if not found, clear projectId to avoid accidental mixing with similarly named projects
                                      // but still keep producer if it was manually set earlier
                                      // also try to find in offlineProjects by exact name
                                      const offlineMatch = Object.entries(offlineProjects).find(([,list])=> Array.isArray(list) && list.includes(val));
                                      if (offlineMatch) {
                                        setWForm((f:any)=> ({ ...f, project: val, projectId: undefined, producer: offlineMatch[0] }));
                                      } else {
                                        setWForm((f: any) => ({ ...f, project: val, projectId: undefined }));
                                      }
                                    }
                                  }}
                                />
                                <datalist id="dl-unit-projects">
                                  {projectOpts.map((nm: string) => (<option key={nm} value={nm} />))}
                                </datalist>
                                <button
                                  type="button"
                                  className="px-2 py-1 border rounded bg-gray-50 hover:bg-gray-100"
                                  title="Προσθήκη νέου Έργου"
                                  onClick={() => {
                                    if (!wForm.producer) { alert('Επιλέξτε πρώτα Παραγωγό'); return; }
                                    const nm = (prompt('Νέο Έργο') || '').trim();
                                    if (!nm) return;
                                    setOfflineProjects((prev) => {
                                      const cur = prev[wForm.producer] || [];
                                      const next = cur.includes(nm) ? cur : [...cur, nm];
                                      return { ...prev, [wForm.producer]: next };
                                    });
                                    setWForm((f: any) => ({ ...f, project: nm }));
                                  }}
                                >+
                                </button>
                              </div>
                            </label>
                            <label>
                              <div className="flex items-center gap-1 mb-1 relative group">
                                <span>Παραγωγός</span>
                                <button
                                  type="button"
                                  aria-label="Πληροφορίες"
                                  className="peer inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  tabIndex={0}
                                >i</button>
                                <div className="hidden group-hover:block peer-focus:block absolute left-0 top-full mt-1 z-20">
                                  <div className="bg-white border border-blue-200 text-gray-700 text-xs rounded shadow px-2 py-1 whitespace-nowrap">
                                    Μόνο για έργα που έχουν συμφωνία
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <select className="border p-1 w-full" value={wForm.producer} onChange={(e: any) => setWForm((f: any) => ({ ...f, producer: e.target.value }))}>
                                  <option value="">— Επιλογή Παραγωγού —</option>
                                  {allProducers.map((name: string) => (<option key={name} value={name}>{name}</option>))}
                                </select>
                                <button
                                  type="button"
                                  className="px-2 py-1 border rounded bg-gray-50 hover:bg-gray-100"
                                  title="Προσθήκη νέου Παραγωγού"
                                  onClick={() => {
                                    const name = (prompt('Νέος Παραγωγός') || '').trim();
                                    if (!name) return;
                                    setOfflineProducers((prev) => (prev.includes(name) ? prev : [...prev, name]));
                                    setWForm((f: any) => ({ ...f, producer: name }));
                                  }}
                                >+
                                </button>
                              </div>
                            </label>

                            {/* Row 3: Debtor (full width) */}
                            <label className="col-span-2">Χρεώστης
                              <div className="flex items-center gap-2">
                                <select className="border p-1 w-full" value={wForm.debtor} onChange={(e: any) => setWForm((f: any) => ({ ...f, debtor: e.target.value }))}>
                                  <option value="">— Επιλογή —</option>
                                  {(Array.from(new Set(offlineDebtors || [])) as string[]).map((d: string)=> (<option key={d} value={d}>{d}</option>))}
                                </select>
                                <button
                                  type="button"
                                  className="px-2 py-1 border rounded bg-gray-50 hover:bg-gray-100"
                                  title="Προσθήκη νέου Χρεώστη"
                                  onClick={() => {
                                    const name = (prompt('Νέος Χρεώστης') || '').trim();
                                    if (!name) return;
                                    setOfflineDebtors((prev)=> prev.includes(name) ? prev : [...prev, name]);
                                    setWForm((f:any)=> ({ ...f, debtor: name }));
                                  }}
                                >+
                                </button>
                              </div>
                            </label>

                            {/* Row 4: EKA, Weight */}
                            <label>Κατηγορία ΕΚΑ
                              <select className="border p-1 w-full" value={wForm.eka} onChange={(e: any) => setWForm((f: any) => ({ ...f, eka: e.target.value }))}>
                                {EKA.map(e => (<option key={e.code} value={e.code}>{e.code} — {e.description}</option>))}
                              </select>
                            </label>
                            <div>
                              <label>Βάρος (tn)
                                <input type="number" className="border p-1 w-full" value={wForm.weight} onChange={(e: any) => setWForm((f: any) => ({ ...f, weight: e.target.value }))} />
                              </label>
                              <button className="mt-1 px-2 py-1 border rounded text-xs" onClick={randomWeigh}>Τυχαία Ζύγιση</button>
                            </div>
                          </>
                        );
                      })()}
                      {/* Χωρίς πεδίο υπογραφής για Παραλαβή (εκτός IWM) */}
                      <div className="col-span-2 flex justify-end gap-2">
                        <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={() => submitWeighSlip(false)}>Καταχώριση</button>
                        <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => submitWeighSlip(true)}>Καταχώριση και Εκτύπωση</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'slips' && (
                (() => {
                  const slipProducers = [...new Set(A(slips).map((s:any)=>s.producer).filter(Boolean))];
                  const slipProjects = [...new Set(A(slips).map((s:any)=>s.project).filter(Boolean))];
                  const slipDebtors = [...new Set(A(slips).map((s:any)=>s.debtor).filter(Boolean))];
                  const slipTransporters = [...new Set(A(slips).map((s:any)=>s.transporter).filter(Boolean))];
                  const slipVehiclesAll = [...new Set(A(slips).map((s:any)=>s.vehicle).filter(Boolean))];
                  const slipVehicles = effectiveSlipsFilter.transporter
                    ? [...new Set(A(slips).filter((s:any)=> s.transporter === effectiveSlipsFilter.transporter).map((s:any)=> s.vehicle).filter(Boolean))]
                    : slipVehiclesAll;
                  const inRange = (d: string) => {
                    if (!d) return true;
                    const dd = d;
                    if (effectiveSlipsFilter.from && dd < effectiveSlipsFilter.from) return false;
                    if (effectiveSlipsFilter.to && dd > effectiveSlipsFilter.to) return false;
                    return true;
                  };
                  const rows = A(slips).filter((s:any)=> {
                    if (effectiveSlipsFilter.producer && s.producer !== effectiveSlipsFilter.producer) return false;
                    if (effectiveSlipsFilter.project && s.project !== effectiveSlipsFilter.project) return false;
                    if (effectiveSlipsFilter.debtor && s.debtor !== effectiveSlipsFilter.debtor) return false;
                    if (effectiveSlipsFilter.transporter && s.transporter !== effectiveSlipsFilter.transporter) return false;
                    if (effectiveSlipsFilter.vehicle && s.vehicle !== effectiveSlipsFilter.vehicle) return false;
                    if (!inRange(s.date)) return false;
                    return true;
                  });
                  const totalWeight = rows.reduce((acc:number, s:any)=> acc + (parseFloat(String(s.weight||'0'))||0), 0);
                  const exportCSV = () => {
                    const filename = `slips_${today()}_${Date.now()}.csv`;
                    const cols = ['date','time','producer','project','debtor','transporter','vehicle','ekaCategory','weight'];
                    downloadCSV(filename, rows, cols);
                  };
                  return (
                    <div className="space-y-3">
                      {/* Header + Actions */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <div className="text-base font-semibold">Δελτία παραλαβής</div>
                          {!hideChrome && (
                            <div className="text-xs text-gray-600">Εγγραφές: <span className="font-medium">{rows.length}</span> • Σύνολο βαρών: <span className="font-medium">{totalWeight.toFixed(2)} tn</span></div>
                          )}
                        </div>
                        {!hideChrome && (
                          <div className="flex items-center gap-2">
                              <button className="p-2 rounded hover:bg-gray-100" title="Φίλτρα" onClick={() => setShowSlipsFilters((v:any) => !v)}>
                                <Filter className="w-5 h-5 text-gray-700" />
                              </button>
                              <button className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white" onClick={exportCSV}>Εξαγωγή CSV</button>
                            </div>
                        )}
                      </div>

                      {/* Filters Card */}
                      {!hideChrome && showSlipsFilters && (
                        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Παραγωγός</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={effectiveSlipsFilter.producer} onChange={(e:any)=> effectiveSetSlipsFilter({ ...effectiveSlipsFilter, producer: e.target.value })}>
                              <option value="">— Όλοι —</option>
                              {slipProducers.map((p:string)=>(<option key={p} value={p}>{p}</option>))}
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Έργο</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={effectiveSlipsFilter.project} onChange={(e:any)=> effectiveSetSlipsFilter({ ...effectiveSlipsFilter, project: e.target.value })}>
                              <option value="">— Όλα —</option>
                              {slipProjects.map((p:string)=>(<option key={p} value={p}>{p}</option>))}
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Χρεώστης</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={effectiveSlipsFilter.debtor} onChange={(e:any)=> effectiveSetSlipsFilter({ ...effectiveSlipsFilter, debtor: e.target.value })}>
                              <option value="">— Όλοι —</option>
                              {slipDebtors.map((p:string)=>(<option key={p} value={p}>{p}</option>))}
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Μεταφορέας</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={effectiveSlipsFilter.transporter} onChange={(e:any)=> effectiveSetSlipsFilter({ ...effectiveSlipsFilter, transporter: e.target.value, vehicle: '' })}>
                              <option value="">— Όλοι —</option>
                              {slipTransporters.map((p:string)=>(<option key={p} value={p}>{p}</option>))}
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Αρ. Οχήματος</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={effectiveSlipsFilter.vehicle} onChange={(e:any)=> effectiveSetSlipsFilter({ ...effectiveSlipsFilter, vehicle: e.target.value })}>
                              <option value="">— Όλα —</option>
                              {slipVehicles.map((v:string)=>(<option key={v} value={v}>{v}</option>))}
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Από</label>
                            <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={effectiveSlipsFilter.from} onChange={(e:any)=> effectiveSetSlipsFilter({ ...effectiveSlipsFilter, from: e.target.value })} />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Έως</label>
                            <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={effectiveSlipsFilter.to} onChange={(e:any)=> effectiveSetSlipsFilter({ ...effectiveSlipsFilter, to: e.target.value })} />
                          </div>
                        </div>
                        </div>
                      )}

                      {/* Table */}
                      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${hideChrome ? '' : 'max-h-[60vh] overflow-auto'}`}>
                        <table className={`w-full ${hideChrome ? 'text-xs' : 'text-sm'}`}>
                          <thead className={`bg-gray-50 text-gray-700 ${hideChrome ? '' : 'sticky top-0 z-10'}`}>
                            <tr className="divide-x divide-gray-200">
                              <th className={`${hideChrome ? 'px-1 py-1 text-[11px]' : 'px-2 py-2'} text-center`}>Α/Α</th>
                              <th className={`${hideChrome ? 'px-1 py-1 text-[11px]' : 'px-2 py-2'} text-center`}>Παραγωγός</th>
                              <th className={`${hideChrome ? 'px-1 py-1 text-[11px]' : 'px-2 py-2'} text-center`}>Έργο</th>
                              <th className={`${hideChrome ? 'px-1 py-1 text-[11px]' : 'px-2 py-2'} text-center`}>Χρεώστης</th>
                              <th className={`${hideChrome ? 'px-1 py-1 text-[11px]' : 'px-2 py-2'} text-center`}>Μεταφορέας</th>
                              <th className={`${hideChrome ? 'px-1 py-1 text-[11px]' : 'px-2 py-2'} text-center`}>Αρ. Οχήματος</th>
                              <th className={`${hideChrome ? 'px-1 py-1 text-[11px]' : 'px-2 py-2'} text-center`}>Ημ/νία</th>
                              <th className={`${hideChrome ? 'px-1 py-1 text-[11px]' : 'px-2 py-2'} text-center`}>Ώρα</th>
                              <th className={`${hideChrome ? 'px-1 py-1 text-[11px]' : 'px-2 py-2'} text-center`}>Βάρος (tn)</th>
                              <th className={`${hideChrome ? 'px-1 py-1 text-[11px]' : 'px-2 py-2'} text-center`}>ΕΚΑ</th>
                              <th className={`${hideChrome ? 'px-1 py-1 text-[11px]' : 'px-2 py-2'} text-center`}>PDF</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {rows.length === 0 ? (
                              <tr><td className="text-center p-4 text-gray-500" colSpan={11}>Δεν βρέθηκαν δελτία</td></tr>
                            ) : (
                              rows.map((s: any, i: number) => (
                                <tr key={s.id} className="hover:bg-gray-50">
                                  <td className={`text-center ${hideChrome ? 'px-1 py-1' : 'px-2 py-1'}`}>{i + 1}</td>
                                  <td className={`text-center ${hideChrome ? 'px-1 py-1' : 'px-2 py-1'}`}>{s.producer}</td>
                                  <td className={`text-center ${hideChrome ? 'px-1 py-1' : 'px-2 py-1'}`}>{s.project}</td>
                                  <td className={`text-center ${hideChrome ? 'px-1 py-1' : 'px-2 py-1'}`}>{s.debtor}</td>
                                  <td className={`text-center ${hideChrome ? 'px-1 py-1' : 'px-2 py-1'}`}>{s.transporter}</td>
                                  <td className={`text-center ${hideChrome ? 'px-1 py-1' : 'px-2 py-1'}`}>{s.vehicle}</td>
                                  <td className={`text-center ${hideChrome ? 'px-1 py-1' : 'px-2 py-1'}`}>{fmt(s.date)}</td>
                                  <td className={`text-center ${hideChrome ? 'px-1 py-1' : 'px-2 py-1'}`}>{s.time}</td>
                                  <td className={`text-center ${hideChrome ? 'px-1 py-1' : 'px-2 py-1'}`}>{s.weight}</td>
                                  <td className={`text-center ${hideChrome ? 'px-1 py-1' : 'px-2 py-1'}`}>{s.ekaCategory}</td>
                                  <td className={`text-center ${hideChrome ? 'px-1 py-1' : 'px-2 py-1'}`}><Btn className="bg-gray-100" onClick={() => pdfSlip(s)}>PDF</Btn></td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()
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
                      <th className="border px-2">Ενέργειες</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awaitingList.length === 0 ? (
                      <tr><td className="border text-center p-2" colSpan={7}>—</td></tr>
                    ) : (
                      awaitingList.map((t: any, i: number) => (
                        <tr key={t.id} className={t.isNew ? 'bg-yellow-50' : ''}>
                          <td className="border text-center">{i + 1}</td>
                          <td className="border text-center">{t.producer}</td>
                          <td className="border text-center">{t.project}</td>
                          <td className="border text-center">{t.address}</td>
                          <td className="border text-center">{fmt(t.unitDate)}</td>
                          <td className="border text-center">
                            {t.status === 'Completed' ? (
                              <span className="text-green-700 font-semibold">Ολοκληρώθηκε</span>
                            ) : t.status === 'Waiting for transporter signature' ? (
                              <span className="text-blue-700">Αναμονή για υπογραφή μεταφορέα</span>
                            ) : t.status === 'Waiting for unit signature' ? (
                              <span className="text-blue-700">Αναμονή για υπογραφή μονάδας</span>
                            ) : (
                              <span className="text-blue-700">{t.status ? t.status : 'Αναμονή'}</span>
                            )}
                          </td>
                          <td className="border text-center">
                            <Btn
                              className="bg-green-600 text-white"
                              disabled={t.status !== 'Waiting for unit signature'}
                              onClick={() => setUnitSignModal({ open: true, id: t.id, signature: '' })}
                            >
                              Υπογραφή
                            </Btn>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {tab === 'completed' && (
                (() => {
                  // derive unique options from completed list
                  const transDisplay = (row: any) => {
                    const prj = A(projects).find((p: any) => p.id === row.projectId);
                    return row.transporter || prj?.transporter || '-';
                  };
                  const compl = A(completedList);
                  const cProducers = [...new Set(compl.map((r:any)=> r.producer).filter(Boolean))];
                  const cProjects = [...new Set(compl.map((r:any)=> r.project).filter(Boolean))];
                  const cTransportersAll = [...new Set(compl.map((r:any)=> transDisplay(r)).filter((v:any)=> v && v !== '-'))];
                  const cVehiclesAll = [...new Set(compl.map((r:any)=> r.vehicle).filter(Boolean))];
                  const cVehicles = completedFilter.transporter
                    ? [...new Set(compl.filter((r:any)=> transDisplay(r) === completedFilter.transporter).map((r:any)=> r.vehicle).filter(Boolean))]
                    : cVehiclesAll;

                  const inRange = (d?: string) => {
                    if (!d) return true;
                    if (completedFilter.from && d < completedFilter.from) return false;
                    if (completedFilter.to && d > completedFilter.to) return false;
                    return true;
                  };
                  const rows = compl.filter((r:any)=> {
                    if (completedFilter.producer && r.producer !== completedFilter.producer) return false;
                    if (completedFilter.project && r.project !== completedFilter.project) return false;
                    if (completedFilter.transporter && transDisplay(r) !== completedFilter.transporter) return false;
                    if (completedFilter.vehicle && r.vehicle !== completedFilter.vehicle) return false;
                    if (!inRange(r.unitDate)) return false;
                    return true;
                  });
                  const totalWeight = rows.reduce((acc:number, r:any)=> acc + (parseFloat(String(r.weight||'0'))||0), 0);
                  return (
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div />
                        <div className="mt-2 flex justify-end gap-2">
                          <button className="px-3 py-2 text-sm rounded-lg border border-gray-300" onClick={()=> setCompletedFilter({ producer:'', project:'', transporter:'', vehicle:'', from:'', to:'' })}>Επαναφορά</button>
                          <button className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white" onClick={() => {
                            const filename = `completed_${today()}_${Date.now()}.csv`;
                            const mapped = rows.map((r:any)=>({
                              unitDate: r.unitDate,
                              unitTime: r.unitTime || '',
                              producer: r.producer,
                              project: r.project,
                              transporter: (A(projects).find((p:any)=> p.id===r.projectId)?.transporter) || r.transporter || '',
                              vehicle: r.vehicle || '',
                              ekaCategory: r.ekaCategory || '',
                              weight: r.weight
                            }));
                            const cols = ['unitDate','unitTime','producer','project','transporter','vehicle','ekaCategory','weight'];
                            downloadCSV(filename, mapped, cols);
                          }}>Εξαγωγή CSV</button>
                        </div>
                      </div>

                      {/* Filters Card */}
                      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Παραγωγός</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={completedFilter.producer} onChange={(e:any)=> setCompletedFilter({ ...completedFilter, producer: e.target.value })}>
                              <option value="">— Όλοι —</option>
                              {cProducers.map((p:string)=>(<option key={p} value={p}>{p}</option>))}
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Έργο</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={completedFilter.project} onChange={(e:any)=> setCompletedFilter({ ...completedFilter, project: e.target.value })}>
                              <option value="">— Όλα —</option>
                              {cProjects.map((p:string)=>(<option key={p} value={p}>{p}</option>))}
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Μεταφορέας</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={completedFilter.transporter} onChange={(e:any)=> setCompletedFilter({ ...completedFilter, transporter: e.target.value, vehicle: '' })}>
                              <option value="">— Όλοι —</option>
                              {cTransportersAll.map((p:string)=>(<option key={p} value={p}>{p}</option>))}
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Αρ. Οχήματος</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={completedFilter.vehicle} onChange={(e:any)=> setCompletedFilter({ ...completedFilter, vehicle: e.target.value })}>
                              <option value="">— Όλα —</option>
                              {cVehicles.map((v:string)=>(<option key={v} value={v}>{v}</option>))}
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Από</label>
                            <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={completedFilter.from} onChange={(e:any)=> setCompletedFilter({ ...completedFilter, from: e.target.value })} />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Έως</label>
                            <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={completedFilter.to} onChange={(e:any)=> setCompletedFilter({ ...completedFilter, to: e.target.value })} />
                          </div>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="bg-white border border-gray-200 rounded-xl shadow-sm max-h-[60vh] overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10">
                            <tr className="divide-x divide-gray-200">
                              <th className="px-2 py-2 text-center">Α/Α</th>
                              <th className="px-2 py-2 text-center">Παραγωγός</th>
                              <th className="px-2 py-2 text-center">Έργο</th>
                              <th className="px-2 py-2 text-center">Μεταφορέας</th>
                              <th className="px-2 py-2 text-center">Αρ. Οχήματος</th>
                              <th className="px-2 py-2 text-center">Ημ/νία Παραλαβής</th>
                              <th className="px-2 py-2 text-center">Ώρα Παραλαβής</th>
                              <th className="px-2 py-2 text-center">Βάρος (tn)</th>
                              <th className="px-2 py-2 text-center">ΕΚΑ</th>
                              <th className="px-2 py-2 text-center">PDF</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {rows.length === 0 ? (
                              <tr><td className="text-center p-4 text-gray-500" colSpan={10}>Δεν βρέθηκαν εγγραφές</td></tr>
                            ) : (
                              rows.map((t: any, i: number) => {
                                const transporterName = transDisplay(t);
                                return (
                                  <tr key={t.id} className={`hover:bg-gray-50 ${t.isNew ? 'bg-green-50' : ''}`}>
                                    <td className="text-center px-2 py-1">{i + 1}</td>
                                    <td className="text-center px-2 py-1">{t.producer}</td>
                                    <td className="text-center px-2 py-1">{t.project}</td>
                                    <td className="text-center px-2 py-1">{transporterName}</td>
                                    <td className="text-center px-2 py-1">{t.vehicle || '—'}</td>
                                    <td className="text-center px-2 py-1">{fmt(t.unitDate)}</td>
                                    <td className="text-center px-2 py-1">{t.unitTime || '—'}</td>
                                    <td className="text-center px-2 py-1">{t.weight}</td>
                                    <td className="text-center px-2 py-1">{t.ekaCategory}</td>
                                    <td className="text-center px-2 py-1"><Btn className="bg-gray-100" onClick={() => pdfTransfer(t)}>PDF</Btn></td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()
              )}

              {unitSignModal.open && (
                <div className="absolute inset-0 z-50 bg-white p-4 overflow-auto animate-in">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold">Υπογραφή Παραλαβής Μονάδας</div>
                    <button onClick={() => setUnitSignModal({ open: false, id: null, signature: '' })} className="px-2 py-1 rounded bg-gray-100">✕</button>
                  </div>
                  <div className="text-sm mb-2">Ο Υπεύθυνος Παραλαβής της μονάδας, παρακαλώ σχεδιάστε την υπογραφή σας.</div>
                  <div className="border p-2 rounded bg-white">
                    <SignaturePad value={unitSignModal.signature} onChange={(v: any) => setUnitSignModal((m: any) => ({ ...m, signature: v }))} className="h-36" />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded" onClick={() => setUnitSignModal({ open: false, id: null, signature: '' })}>Άκυρο</button>
                    <button className="flex-1 bg-green-600 text-white px-3 py-2 rounded" onClick={() => {
                      if (!unitSignModal.id) return; if (!unitSignModal.signature) return alert('Απαιτείται υπογραφή');
                      // Ensure transporter has signed first
                      const row = A(transports).find((x: any) => x.id === unitSignModal.id);
                      if (!row || !row.transporterSignature) { alert('Απαιτείται πρώτα υπογραφή μεταφορέα'); return; }
                      onFinalize && onFinalize(unitSignModal.id, unitSignModal.signature);
                      setUnitSignModal({ open: false, id: null, signature: '' });
                      // redirect to Completed and show confirmation with link to slips
                      setTab('completed');
                      setShowUnitSignConfirm(true);
                      setTimeout(() => setShowUnitSignConfirm(false), 6000);
                    }}>Υπογραφή</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {weighOpen && (
        <Modal title="Παραλαβή/Ζύγιση" onClose={() => setWeighOpen(false)} onSubmit={submitWeigh} submitLabel="Ολοκλήρωση">
          {(() => {
            const row = A(transports).find((x: any) => x.id === weighData.id) || {};
            const proj = A(projects).find((p: any) => p.id === row.projectId) || null;
            return (
              <div className="space-y-3 text-sm">
                <div className="font-semibold">Στοιχεία Μεταφοράς</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Παραγωγός</div>
                    <div className="font-medium">{row.producer || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Έργο</div>
                    <div className="font-medium">{row.project || proj?.projectName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Διεύθυνση</div>
                    <div className="font-medium">{row.address || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Μονάδα</div>
                    <div className="font-medium">{row.unit || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Μεταφορέας</div>
                    <div className="font-medium">{proj?.transporter || row.transporter || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Όχημα</div>
                    <div className="font-medium">{row.vehicle || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Ημερομηνία</div>
                    <div className="font-medium">{fmt(row.date || row.unitDate) || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Ώρα</div>
                    <div className="font-medium">{row.time || row.unitTime || '-'}</div>
                  </div>
                </div>

                <div className="font-semibold">Στοιχεία Ζύγισης</div>
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

                <div className="font-semibold">Στοιχεία χρέωσης</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <label className="col-span-2">Χρεώστης
                    <select className="border p-1 w-full" value={weighData.debtor || ''} onChange={(e: any) => setWeighData({ ...weighData, debtor: e.target.value })}>
                      <option value="">— Επιλογή —</option>
                      {(Array.from(new Set(readStoredDebtors() || [])) as string[]).map((d: string)=> (<option key={d} value={d}>{d}</option>))}
                    </select>
                  </label>
                </div>

                {/* Το βάρος προ-συμπληρώνεται τυχαία στο tablet (openWeigh) και μπορεί να τροποποιηθεί πριν την ολοκλήρωση */}
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Unknown Project Registration Flow (Centered Popups) - moved into UnitTabletApp scope */}
      {projReg.open && projReg.step === 'ask' && (
        <Modal title="Καταχώριση Έργου" onClose={() => { setProjReg((m:any)=> ({ ...m, open: false })); continueWeighSlip(projReg.andPrint); }} inside={false}>
          <div className="space-y-3 text-sm">
            <div>
              Θέλεις να καταχωρήσεις το Έργο "<span className="font-semibold">{projReg.project}</span>";
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded bg-gray-200" onClick={() => { setProjReg((m:any)=> ({ ...m, open: false })); continueWeighSlip(projReg.andPrint); }}>Όχι</button>
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => setProjReg((m:any)=> ({ ...m, step: 'form' }))}>Ναι</button>
            </div>
          </div>
        </Modal>
      )}
      {projReg.open && projReg.step === 'form' && (
        <Modal title="Νέο Έργο" onClose={() => { setProjReg((m:any)=> ({ ...m, open: false })); continueWeighSlip(projReg.andPrint); }} onSubmit={() => {
          if (!projReg.producer || !projReg.producer.trim()) { alert('Συμπλήρωσε Παραγωγό'); return; }
          // Do not persist yet as requested; just proceed
          // reflect chosen producer in form for UX continuity
          if (!wForm.producer) setWForm((f:any)=> ({ ...f, producer: projReg.producer }));
          setProjReg((m:any)=> ({ ...m, open: false }));
          continueWeighSlip(projReg.andPrint);
        }} submitLabel="OK">
          <div className="space-y-3 text-sm">
            <label className="block">Έργο
              <input className="border p-1 w-full bg-gray-100" value={projReg.project} readOnly />
            </label>
            <label className="block">Παραγωγός
              <input className="border p-1 w-full" value={projReg.producer || ''} onChange={(e:any)=> setProjReg((m:any)=> ({ ...m, producer: e.target.value }))} />
            </label>
          </div>
        </Modal>
      )}

      {adminOpen && (
        <Modal title="Database" onClose={() => setAdminOpen(false)} inside={false}>
          <div className="space-y-4 text-sm">
            <div>
              <div className="font-semibold mb-2">Μεταφορέας</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="col-span-2">Νέος Μεταφορέας
                  <div className="flex gap-2">
                    <input className="border p-1 w-full" value={adminForm.transporter} onChange={(e:any)=> setAdminForm((f:any)=> ({ ...f, transporter: e.target.value }))} />
                    <button className="px-2 py-1 border rounded bg-gray-50 hover:bg-gray-100" onClick={()=>{
                      const name = (adminForm.transporter||'').trim(); if (!name) return;
                      setOfflineTransporters((prev)=> prev.includes(name) ? prev : [...prev, name]);
                      setAdminForm((f:any)=> ({ ...f, transporter: '' }));
                    }}>Προσθήκη</button>
                  </div>
                </label>
                <label>Μεταφορέας για Όχημα
                  <select className="border p-1 w-full" value={adminForm.plateTransporter} onChange={(e:any)=> setAdminForm((f:any)=> ({ ...f, plateTransporter: e.target.value }))}>
                    <option value="">— Επιλογή —</option>
                    {Array.from(new Set([...
                      transporterList,
                      ...offlineTransporters,
                    ])).map((nm:string)=> (<option key={nm} value={nm}>{nm}</option>))}
                  </select>
                </label>
                <label>Αρ. Οχήματος
                  <div className="flex gap-2">
                    <input className="border p-1 w-full" value={adminForm.plate} onChange={(e:any)=> setAdminForm((f:any)=> ({ ...f, plate: e.target.value.toUpperCase() }))} />
                    <button className="px-2 py-1 border rounded bg-gray-50 hover:bg-gray-100" onClick={()=>{
                      const tr = (adminForm.plateTransporter||'').trim(); const pl = (adminForm.plate||'').trim(); if (!tr || !pl) return;
                      setOfflineTransPlates((prev)=> {
                        const cur = prev[tr] || [];
                        const next = cur.includes(pl) ? cur : [...cur, pl];
                        return { ...prev, [tr]: next };
                      });
                      setAdminForm((f:any)=> ({ ...f, plate: '' }));
                    }}>Προσθήκη</button>
                  </div>
                </label>
                {adminForm.plateTransporter && (
                  <div className="col-span-2 text-xs text-gray-600">
                    <div className="mb-1">Οχήματα (offline) για {adminForm.plateTransporter}:</div>
                    <div className="flex flex-wrap gap-1">
                      {(offlineTransPlates[adminForm.plateTransporter]||[]).map((pl:string)=> (
                        <span key={pl} className="px-2 py-0.5 border rounded bg-gray-50">{pl}</span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Transporters list with edit/delete */}
                <div className="col-span-2">
                  <div className="mt-3 font-medium">Καταχωρημένοι Μεταφορείς</div>
                  <div className="border rounded divide-y mt-1">
                    {Array.from(new Set([
                      ...offlineTransporters,
                      ...transporterList,
                    ])).map((nm: string) => {
                      const isDefault = transporterList.includes(nm);
                      return (
                        <div key={nm} className="flex items-center justify-between px-2 py-1">
                          <div>
                            <span className="mr-2">{nm}</span>
                            {isDefault ? (
                              <span className="text-[10px] text-gray-500 border px-1 rounded">default</span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <span>
                              <button
                                className={`text-blue-700 text-xs ${isDefault ? 'opacity-40 cursor-not-allowed' : ''}`}
                                disabled={isDefault}
                                onClick={() => {
                                  const next = window.prompt('Μετονομασία μεταφορέα', nm)?.trim();
                                  if (!next || next === nm) return;
                                  setOfflineTransporters((prev) => {
                                    const arr = prev.filter(x => x !== nm);
                                    return arr.includes(next) ? arr : [...arr, next];
                                  });
                                  setOfflineTransPlates((prev) => {
                                    const copy = { ...prev } as Record<string, string[]>;
                                    if (copy[nm]) {
                                      const plates = copy[nm];
                                      delete copy[nm];
                                      copy[next] = Array.from(new Set([...(copy[next] || []), ...plates]));
                                    }
                                    return copy;
                                  });
                                  setAdminForm((f: any) => ({
                                    ...f,
                                    plateTransporter: f.plateTransporter === nm ? next : f.plateTransporter,
                                  }));
                                }}
                              >
                                Επεξεργασία
                              </button>
                            </span>
                            <span>
                              <button
                                className={`text-red-700 text-xs ${isDefault ? 'opacity-40 cursor-not-allowed' : ''}`}
                                disabled={isDefault}
                                onClick={() => {
                                  if (!window.confirm(`Διαγραφή μεταφορέα "${nm}";`)) return;
                                  setOfflineTransporters((prev) => prev.filter(x => x !== nm));
                                  setOfflineTransPlates((prev) => {
                                    const copy = { ...prev } as Record<string, string[]>;
                                    if (copy[nm]) delete copy[nm];
                                    return copy;
                                  });
                                  setAdminForm((f: any) => ({
                                    ...f,
                                    plateTransporter: f.plateTransporter === nm ? '' : f.plateTransporter,
                                  }));
                                }}
                              >
                                Διαγραφή
                              </button>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Plates list for selected transporter with edit/delete; include defaults as read-only */}
                {adminForm.plateTransporter && (
                  <div className="col-span-2">
                    <div className="mt-3 font-medium">Πινακίδες για {adminForm.plateTransporter}</div>
                    <div className="border rounded divide-y mt-1">
                      {Array.from(new Set([...
                        (offlineTransPlates[adminForm.plateTransporter]||[]),
                        ...(transporterPlates[adminForm.plateTransporter]||[]),
                      ])).map((pl:string)=> {
                        const isDefaultPl = (transporterPlates[adminForm.plateTransporter]||[]).includes(pl);
                        return (
                          <div key={pl} className="flex items-center justify-between px-2 py-1">
                            <div>
                              <span className="mr-2">{pl}</span>
                              {isDefaultPl && (<span className="text-[10px] text-gray-500 border px-1 rounded">default</span>)}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                className={`text-blue-700 text-xs ${isDefaultPl ? 'opacity-40 cursor-not-allowed' : ''}`}
                                disabled={isDefaultPl}
                                onClick={()=>{
                                  const next = window.prompt('Μετονομασία πινακίδας', pl)?.trim().toUpperCase();
                                  if (!next || next === pl) return;
                                  setOfflineTransPlates((prev)=> {
                                    const copy = { ...prev } as Record<string,string[]>;
                                    const list = Array.from(new Set([...(copy[adminForm.plateTransporter]||[])]));
                                    const idx = list.indexOf(pl);
                                    if (idx >= 0) {
                                      list[idx] = next;
                                      copy[adminForm.plateTransporter] = Array.from(new Set(list));
                                    } else {
                                      // if original was default, treat as add
                                      copy[adminForm.plateTransporter] = Array.from(new Set([...(copy[adminForm.plateTransporter]||[]), next]));
                                    }
                                    return copy;
                                  });
                                }}>Επεξεργασία</button>
                              <button
                                className={`text-red-700 text-xs ${isDefaultPl ? 'opacity-40 cursor-not-allowed' : ''}`}
                                disabled={isDefaultPl}
                                onClick={()=>{
                                  if (!window.confirm(`Διαγραφή πινακίδας "${pl}";`)) return;
                                  setOfflineTransPlates((prev)=> {
                                    const copy = { ...prev } as Record<string,string[]>;
                                    copy[adminForm.plateTransporter] = (copy[adminForm.plateTransporter]||[]).filter(x=> x !== pl);
                                    return copy;
                                  });
                                }}>Διαγραφή</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="font-semibold mb-2">Παραγωγός</div>
              <div className="flex gap-2">
                <input className="border p-1 w-full" value={adminForm.producer} onChange={(e:any)=> setAdminForm((f:any)=> ({ ...f, producer: e.target.value }))} />
                <button className="px-2 py-1 border rounded bg-gray-50 hover:bg-gray-100" onClick={()=>{
                  const name = (adminForm.producer||'').trim(); if (!name) return;
                  setOfflineProducers((prev)=> prev.includes(name) ? prev : [...prev, name]);
                  setAdminForm((f:any)=> ({ ...f, producer: '' }));
                }}>Προσθήκη</button>
              </div>
              {/* Producers list with edit/delete */}
              <div className="mt-2 border rounded divide-y">
                {Array.from(new Set([...
                  offlineProducers,
                  ...A(projects).map((p:any)=> p.producer).filter(Boolean),
                ])).map((nm:string)=> {
                  const isDefault = A(projects).map((p:any)=> p.producer).filter(Boolean).includes(nm);
                  return (
                    <div key={nm} className="flex items-center justify-between px-2 py-1">
                      <div>
                        <span className="mr-2">{nm}</span>
                        {isDefault && (<span className="text-[10px] text-gray-500 border px-1 rounded">default</span>)}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className={`text-blue-700 text-xs ${isDefault ? 'opacity-40 cursor-not-allowed' : ''}`}
                          disabled={isDefault}
                          onClick={()=>{
                            const next = window.prompt('Μετονομασία παραγωγού', nm)?.trim();
                            if (!next || next === nm) return;
                            setOfflineProducers((prev)=> {
                              const arr = prev.filter(x=> x !== nm);
                              return arr.includes(next) ? arr : [...arr, next];
                            });
                            setOfflineProjects((prev)=> {
                              const copy = { ...prev } as Record<string,string[]>;
                              if (copy[nm]) {
                                const projs = copy[nm];
                                delete copy[nm];
                                copy[next] = Array.from(new Set([...(copy[next]||[]), ...projs]));
                              }
                              return copy;
                            });
                            setAdminForm((f:any)=> ({
                              ...f,
                              projectProducer: f.projectProducer === nm ? next : f.projectProducer,
                            }));
                          }}>Επεξεργασία</button>
                        <button
                          className={`text-red-700 text-xs ${isDefault ? 'opacity-40 cursor-not-allowed' : ''}`}
                          disabled={isDefault}
                          onClick={()=>{
                            if (!window.confirm(`Διαγραφή παραγωγού "${nm}";`)) return;
                            setOfflineProducers((prev)=> prev.filter(x=> x !== nm));
                            setOfflineProjects((prev)=> {
                              const copy = { ...prev } as Record<string,string[]>;
                              if (copy[nm]) delete copy[nm];
                              return copy;
                            });
                            setAdminForm((f:any)=> ({
                              ...f,
                              projectProducer: f.projectProducer === nm ? '' : f.projectProducer,
                            }));
                          }}>Διαγραφή</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="font-semibold mb-2">Έργο</div>
              <div className="grid grid-cols-2 gap-2">
                <label>Παραγωγός
                  <select className="border p-1 w-full" value={adminForm.projectProducer} onChange={(e:any)=> setAdminForm((f:any)=> ({ ...f, projectProducer: e.target.value }))}>
                    <option value="">— Επιλογή Παραγωγού —</option>
                    {Array.from(new Set([...
                      A(projects).map((p:any)=> p.producer).filter(Boolean),
                      offlineProducers,
                    ])).filter(Boolean).map((nm:string)=> (<option key={nm} value={nm}>{nm}</option>))}
                  </select>
                </label>
                <label>Όνομα Έργου
                  <div className="flex gap-2">
                    <input className="border p-1 w-full" value={adminForm.project} onChange={(e:any)=> setAdminForm((f:any)=> ({ ...f, project: e.target.value }))} />
                    <button className="px-2 py-1 border rounded bg-gray-50 hover:bg-gray-100" onClick={()=>{
                      const prod = (adminForm.projectProducer||'').trim(); const nm = (adminForm.project||'').trim(); if (!prod || !nm) return;
                      setOfflineProjects((prev)=> {
                        const cur = prev[prod] || [];
                        const next = cur.includes(nm) ? cur : [...cur, nm];
                        return { ...prev, [prod]: next };
                      });
                      setAdminForm((f:any)=> ({ ...f, project: '' }));
                    }}>Προσθήκη</button>
                  </div>
                </label>
              </div>
              {/* Projects list for selected producer */}
              {adminForm.projectProducer && (
                <div className="mt-2 border rounded divide-y">
                  {Array.from(new Set([...
                    (offlineProjects[adminForm.projectProducer]||[]),
                    ...A(projects).filter((p:any)=> p.producer === adminForm.projectProducer).map((p:any)=> p.projectName),
                  ])).map((nm:string)=> {
                    const isDefault = A(projects).filter((p:any)=> p.producer === adminForm.projectProducer).map((p:any)=> p.projectName).includes(nm);
                    return (
                      <div key={nm} className="flex items-center justify-between px-2 py-1">
                        <div>
                          <span className="mr-2">{nm}</span>
                          {isDefault && (<span className="text-[10px] text-gray-500 border px-1 rounded">default</span>)}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className={`text-blue-700 text-xs ${isDefault ? 'opacity-40 cursor-not-allowed' : ''}`}
                            disabled={isDefault}
                            onClick={()=>{
                              const next = window.prompt('Μετονομασία έργου', nm)?.trim();
                              if (!next || next === nm) return;
                              setOfflineProjects((prev)=> {
                                const copy = { ...prev } as Record<string,string[]>;
                                const list = Array.from(new Set([...(copy[adminForm.projectProducer]||[])]));
                                const idx = list.indexOf(nm);
                                if (idx >= 0) {
                                  list[idx] = next;
                                  copy[adminForm.projectProducer] = Array.from(new Set(list));
                                } else {
                                  copy[adminForm.projectProducer] = Array.from(new Set([...(copy[adminForm.projectProducer]||[]), next]));
                                }
                                return copy;
                              });
                            }}>Επεξεργασία</button>
                          <button
                            className={`text-red-700 text-xs ${isDefault ? 'opacity-40 cursor-not-allowed' : ''}`}
                            disabled={isDefault}
                            onClick={()=>{
                              if (!window.confirm(`Διαγραφή έργου "${nm}";`)) return;
                              setOfflineProjects((prev)=> {
                                const copy = { ...prev } as Record<string,string[]>;
                                copy[adminForm.projectProducer] = (copy[adminForm.projectProducer]||[]).filter(x=> x !== nm);
                                return copy;
                              });
                            }}>Διαγραφή</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="font-semibold mb-2">Χρεώστης</div>
              <div className="flex gap-2">
                <input className="border p-1 w-full" value={adminForm.debtor} onChange={(e:any)=> setAdminForm((f:any)=> ({ ...f, debtor: e.target.value }))} />
                <button className="px-2 py-1 border rounded bg-gray-50 hover:bg-gray-100" onClick={()=>{
                  const name = (adminForm.debtor||'').trim(); if (!name) return;
                  setOfflineDebtors((prev)=> prev.includes(name) ? prev : [...prev, name]);
                  setAdminForm((f:any)=> ({ ...f, debtor: '' }));
                }}>Προσθήκη</button>
              </div>
              {/* Debtors list with edit/delete */}
              <div className="mt-2 border rounded divide-y">
                {Array.from(new Set(offlineDebtors || [])).map((nm:string)=> {
                  return (
                    <div key={nm} className="flex items-center justify-between px-2 py-1">
                      <div>
                        <span className="mr-2">{nm}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className={`text-blue-700 text-xs`}
                          onClick={()=>{
                            const next = window.prompt('Μετονομασία χρεώστη', nm)?.trim();
                            if (!next || next === nm) return;
                            setOfflineDebtors((prev)=> {
                              const arr = prev.filter(x=> x !== nm);
                              return arr.includes(next) ? arr : [...arr, next];
                            });
                          }}>Επεξεργασία</button>
                        <button
                          className={`text-red-700 text-xs`}
                          onClick={()=>{
                            if (!window.confirm(`Διαγραφή χρεώστη "${nm}";`)) return;
                            setOfflineDebtors((prev)=> prev.filter(x=> x !== nm));
                          }}>Διαγραφή</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Producer mobile frame and app
function ProducerMobileFrame({ projects, transports, onApprove, onReject, onRequest, onCancelRequest, onDismissRequest, notifications, onJump, deepLink, onOpenProject, onClearTransNew, onClearProjectsNew }: any) {
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
            onCancelRequest={onCancelRequest}
            onDismissRequest={onDismissRequest}
            notifications={notifications}
            onJump={onJump}
            deepLink={deepLink}
            onOpenProject={onOpenProject}
            onClearTransNew={onClearTransNew}
            onClearProjectsNew={onClearProjectsNew}
          />
        </div>
      </div>
    </div>
  );
}

function ProducerMobileApp({ projects, transports, onApprove, onReject, onRequest, onCancelRequest, onDismissRequest, notifications, onJump, onOpenProject, onClearTransNew, onClearProjectsNew }: any) {
  const [tab, setTab] = useState('projects');
  const [show, setShow] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [myRequestsOpen, setMyRequestsOpen] = useState(false);
  const [ntProjectId, setNtProjectId] = useState('');
  const [ntForm, setNtForm] = useState({ address: '', unit: '', transporter: '', requestType: 'change-bin', vehicle: '' });
  const [signModal, setSignModal] = useState<any>({ open: false, id: null, signature: '' });
  const [detailRow, setDetailRow] = useState<any>(null);
  const [reqTypeModal, setReqTypeModal] = useState<any>({ open: false, project: null as any, type: 'change-bin' as 'change-bin' | 'new-bin' | 'move-bin' });
  // Mobile new request: choose target (transporter vs unit)
  const [newReqTarget, setNewReqTarget] = useState<'transporter' | 'unit'>('transporter');
  // Unit order form on mobile
  const [unitProducts, setUnitProducts] = useState<any[]>([]);
  const [prodOrderForm, setProdOrderForm] = useState<{ product: string; quantity: string }>({ product: '', quantity: '' });
  const refreshUnitProducts = () => { try { const raw = localStorage.getItem('iwm_unit_products'); const arr = raw ? JSON.parse(raw) : []; setUnitProducts(Array.isArray(arr) ? arr : []); } catch { setUnitProducts([]); } };
  const myProducer = 'Παραγωγός Α';
  const [subscriptionPlanMobile, setSubscriptionPlanMobile] = useState<string>(() => {
    try {
      const k = `iwm_producer_subscription_${myProducer.replace(/\s+/g,'_')}`;
      const v = localStorage.getItem(k);
      if (v === 'premium' || v === 'basic' || v === 'free') return v === 'free' ? 'basic' : v;
      if (v === '1') return 'premium';
    } catch {}
    return 'basic';
  });
  const [reqFilter, setReqFilter] = useState<'all' | 'carrier' | 'producer'>('all');

  const req = A(transports).filter((t: any) => t.producer === myProducer && !t.approvedByProducer && !t.receivedByUnit);
  const producerReq = req.filter((t: any) => t.fromProducer && ['change-bin','new-bin','move-bin'].includes(t.requestType));
  const carrierReq = req.filter((t: any) => !t.fromProducer);
  const open = A(transports).filter((t: any) => t.producer === myProducer && t.approvedByProducer && !t.receivedByUnit);
  const done = A(transports).filter((t: any) => t.producer === myProducer && t.receivedByUnit);
  const myProjects = projectsByProducer(projects, myProducer);

  // Dynamic, centered title per tab
  const title = show
    ? (tab === 'requests' ? 'Νέο Αίτημα' : 'Νέα Μεταφορά')
    : (tab === 'requests' ? 'Αιτήματα' : tab === 'transfers' ? 'Μεταφορές' : 'Έργα');

  // Simple toast for confirmations
  const [toast, setToast] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });
  const notify = (msg: string) => {
    setToast({ open: true, msg });
    setTimeout(() => setToast({ open: false, msg: '' }), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
  {/* Header with left menu and centered title */}
  <div className="mobile-header safe-top px-4">
    <div className="h-14 flex items-center justify-between">
          <button aria-label="Μενού" onClick={() => setMenuOpen(true)} className="p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="font-semibold text-center">{title}</div>
          <BellBtn items={A(notifications).filter((n: any) => n.target?.page === 'producer')} onJump={onJump} />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {show ? (
          <div className="p-4 space-y-3 animate-in">
            <div className="flex items-center justify-between mb-2">
              <button className="text-blue-700" onClick={() => setShow(false)}>‹ Πίσω</button>
              <div className="font-semibold"></div>
              <div style={{ width: 40 }} />
            </div>
            {/* Target picker */}
            <div className="inline-flex bg-gray-100 p-1 rounded-full">
              <button onClick={() => setNewReqTarget('transporter')} className={`px-3 py-1.5 rounded-full text-sm ${newReqTarget === 'transporter' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Προς Μεταφορέα</button>
              <button onClick={() => { setNewReqTarget('unit'); refreshUnitProducts(); }} className={`px-3 py-1.5 rounded-full text-sm ${newReqTarget === 'unit' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Προς Μονάδα</button>
            </div>
            {/* Highlighted info box for creation */}
            {tab === 'requests' ? (
              <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-200">
                <div className="text-sm font-medium mb-2">
                  {newReqTarget === 'unit'
                    ? 'Παραγγελία Υλικού'
                    : (ntForm.requestType === 'new-bin' ? 'Αίτημα Νέου Κάδου' : ntForm.requestType === 'move-bin' ? 'Αίτημα Μεταφοράς Κάδου' : 'Αίτημα Αλλαγής Κάδου')}
                </div>
                <div className="text-xs text-gray-600">{newReqTarget === 'unit' ? 'Η Μονάδα θα ενημερωθεί.' : 'Ο μεταφορέας θα ενημερωθεί.'}</div>
              </div>
            ) : (
              <div className="text-sm text-gray-600">Επιλέξτε έργο για να δημιουργηθεί αίτημα μεταφοράς.</div>
            )}
            <label className="block text-sm">Έργο
              <select className="border p-1 w-full rounded mt-1" value={ntProjectId} onChange={(e: any) => {
                const id = e.target.value; setNtProjectId(id);
                const pr = A(projects).find((p: any) => p.id === id);
                if (pr) setNtForm({ address: pr.address || '', unit: pr.unit || '', transporter: pr.transporter || '', requestType: '', vehicle: '' });
              }}>
                <option value="">— Επιλογή Έργου —</option>
                {projectsByProducer(projects, myProducer).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.projectName} — {p.address}</option>
                ))}
              </select>
            </label>
            <input readOnly className="border p-2 w-full rounded bg-gray-100" value={ntForm.address} placeholder="Διεύθυνση" />
            {newReqTarget === 'transporter' && (
              <input readOnly className="border p-2 w-full rounded bg-gray-100" value={ntForm.transporter} placeholder="Μεταφορέας" />
            )}
            {tab === 'requests' ? (
              <>
                {newReqTarget === 'transporter' ? (
                  <>
                    {/* Request type selection */}
                    <div className="mt-1">
                      <div className="text-xs text-gray-600 mb-1">Τύπος αιτήματος</div>
                      <div className="grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => setNtForm(f => ({ ...f, requestType: 'new-bin' }))} className={`px-2 py-2 text-xs rounded border ${ntForm.requestType==='new-bin' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700'}`}>Νέος κάδος</button>
                        <button type="button" onClick={() => setNtForm(f => ({ ...f, requestType: 'change-bin' }))} className={`px-2 py-2 text-xs rounded border ${ntForm.requestType==='change-bin' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700'}`}>Αλλαγή</button>
                        <button type="button" onClick={() => setNtForm(f => ({ ...f, requestType: 'move-bin' }))} className={`px-2 py-2 text-xs rounded border ${ntForm.requestType==='move-bin' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700'}`}>Μεταφορά</button>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 bg-gray-200 text-gray-800 px-3 py-2 rounded" onClick={() => { setShow(false); setNtForm({ address: '', unit: '', transporter: '', requestType: '', vehicle: '' }); setNtProjectId(''); }}>Άκυρο</button>
                      <button className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded" onClick={() => {
                        const proj = A(projects).find((p: any) => p.id === ntProjectId);
                        if (!proj) return;
                        const rt = (ntForm.requestType || 'change-bin') as any;
                        onRequest && onRequest(proj, rt);
                        setShow(false); setNtProjectId(''); setNtForm({ address: '', unit: '', transporter: '', requestType: '', vehicle: '' }); setTab('requests');
                      }}>Αποστολή</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-2 mt-1">
                      <label className="text-sm">Προϊόν
                        <select className="border p-1 w-full rounded mt-1" value={prodOrderForm.product} onChange={(e:any)=> setProdOrderForm(f => ({ ...f, product: e.target.value }))}>
                          <option value="">— Επιλογή —</option>
                          {A(unitProducts).length === 0 ? (
                            <option value="" disabled>Δεν υπάρχουν διαθέσιμα προϊόντα</option>
                          ) : (
                            unitProducts.map((p:any) => (<option key={p.id} value={p.name}>{p.name} {p.price ? `— €${p.price}` : ''}</option>))
                          )}
                        </select>
                      </label>
                      <label className="text-sm">Ποσότητα
                        <input className="border p-1 w-full rounded" inputMode="decimal" placeholder="π.χ. 10" value={prodOrderForm.quantity} onChange={(e:any)=> setProdOrderForm(f => ({ ...f, quantity: e.target.value }))} />
                      </label>
                    </div>
                    {A(unitProducts).length === 0 && (
                      <div className="text-xs text-gray-500">Δεν έχουν οριστεί προϊόντα από τη Μονάδα.</div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 bg-gray-200 text-gray-800 px-3 py-2 rounded" onClick={() => { setShow(false); setNtProjectId(''); setProdOrderForm({ product: '', quantity: '' }); }}>Άκυρο</button>
                      <button className="flex-1 bg-green-600 text-white px-3 py-2 rounded" onClick={() => {
                        const proj = A(projects).find((p: any) => p.id === ntProjectId);
                        if (!proj) return alert('Επιλέξτε έργο');
                        const productName = (prodOrderForm.product || '').trim();
                        const qtyNum = parseFloat(String(prodOrderForm.quantity).replace(',', '.'));
                        if (!productName) { alert('Επιλέξτε προϊόν'); return; }
                        if (!(qtyNum > 0)) { alert('Συμπληρώστε έγκυρη ποσότητα'); return; }
                        try {
                          const raw = localStorage.getItem('iwm_unit_product_orders');
                          const arr = raw ? JSON.parse(raw) : [];
                          const orders = Array.isArray(arr) ? arr : [];
                          const order = {
                            id: gid(),
                            producer: myProducer,
                            project: proj.projectName,
                            projectId: proj.id,
                            managerName: proj.managerName || '',
                            managerPhone: proj.managerPhone || '',
                            product: productName,
                            quantity: qtyNum,
                            date: today(),
                            time: new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', hour12: false }),
                            status: '',
                          };
                          const next = [order, ...orders];
                          localStorage.setItem('iwm_unit_product_orders', JSON.stringify(next));
                        } catch {}
                        setShow(false);
                        setNtProjectId('');
                        setProdOrderForm({ product: '', quantity: '' });
                        setNewReqTarget('transporter');
                        alert('Η παραγγελία καταχωρήθηκε.');
                      }}>Καταχώρηση</button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <button className="flex-1 bg-gray-200 text-gray-800 px-3 py-2 rounded" onClick={() => setShow(false)}>Άκυρο</button>
                <button className="flex-1 bg-green-600 text-white px-3 py-2 rounded" onClick={() => {
                  const proj = A(projects).find((p: any) => p.id === ntProjectId);
                  if (!proj) return;
                  onRequest && onRequest(proj);
                  setShow(false); setNtProjectId(''); setNtForm({ address: '', unit: '', transporter: '', requestType: '', vehicle: '' }); setTab('requests');
                }}>Αίτημα</button>
              </div>
            )}
          </div>
        ) : (
          <>
            {tab === 'requests' && (
              <div className="p-3 space-y-3">
                {/* Show producer's own pending requests first */}
                {producerReq.length > 0 && (
                  <div className="space-y-2">
                    {producerReq.map((t: any) => {
                      const typeLabel = t.requestType === 'new-bin' ? 'Νέος κάδος' : t.requestType === 'move-bin' ? 'Μεταφορά κάδου' : 'Αλλαγή κάδου';
                      const accepted = !!t.acceptedByTransporter;
                      return (
                        <div key={t.id} className={`border rounded-lg p-3 shadow-sm text-sm ${accepted ? 'bg-green-50' : 'bg-yellow-50'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{typeLabel} — {t.project}</div>
                              <div className="text-xs text-gray-600 mt-1">{accepted ? 'Ο μεταφορέας αποδέχτηκε το αίτημα' : 'Σε αναμονή αποδοχής μεταφορέα'}</div>
                            </div>
                            <div className="w-36 flex-shrink-0 text-right">
                              <div className="text-xs text-gray-500">Ημερομηνία</div>
                              <div className="font-semibold">{fmt(t.date)}</div>
                              <div className="text-xs text-gray-500 mt-1">Ώρα</div>
                              <div className="font-medium">{t.time || '-'}</div>
                            </div>
                          </div>
                          <div className="mt-2 flex justify-end gap-2">
                            {!accepted ? (
                              <button className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs" onClick={() => onCancelRequest && onCancelRequest(t.projectId, t.requestType)}>Ακύρωση</button>
                            ) : (
                              <button className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs" onClick={() => onDismissRequest && onDismissRequest(t.id)}>Αφαίρεση</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Transporter-created requests for signature */}
                {(() => {
                  const items = A(carrierReq)
                    .sort((a: any, b: any) => {
                      const da = new Date(a.date || 0).getTime();
                      const db = new Date(b.date || 0).getTime();
                      return db - da;
                    });
                  if (items.length === 0 && producerReq.length === 0) return (
                    <div className="text-center p-8">
                      <div className="mx-auto w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
                        <Inbox className="w-7 h-7 text-indigo-600" />
                      </div>
                      <div className="font-medium">Δεν υπάρχουν νέα αιτήματα</div>
                      <div className="text-xs text-gray-500 mt-1">Μπορείς να παραγγείλεις υλικό ή να αιτηθείς κάδο.</div>
                      <div className="mt-3">
                        <button className="px-3 py-2 rounded bg-yellow-600 text-white text-xs" onClick={() => { setTab('requests'); setShow(true); }}>Νέο Αίτημα</button>
                      </div>
                    </div>
                  );
                  return items.map((t: any) => {
                    const bg = 'bg-blue-50';
                    const pr = A(projects).find((p: any) => p.id === t.projectId);
                    const transporterName = t.transporter || t.transporterName || pr?.transporter || 'Μεταφορέας';
                    return (
                      <div key={t.id} className={`border rounded-lg p-3 shadow-sm text-sm ${bg}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-semibold text-sm">Αίτημα Υπογραφής — {t.project}</div>
                            <div className="text-xs text-gray-600 mt-1">Από: <span className="font-medium">{transporterName}</span></div>
                            <div className="mt-2 text-sm">
                              <div className="text-xs text-gray-500">Διεύθυνση</div>
                              <div className="text-sm font-medium">{t.address || '-'}</div>
                            </div>
                          </div>
                          <div className="w-36 flex-shrink-0 text-right">
                            <div className="text-xs text-gray-500">Ημερομηνία</div>
                            <div className="font-semibold">{fmt(t.date)}</div>
                            <div className="text-xs text-gray-500 mt-1">Ώρα</div>
                            <div className="font-medium">{t.time || '-'}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Btn className="flex-1 bg-indigo-600 text-white" onClick={() => setSignModal({ open: true, id: t.id, signature: '' })}>Υπογραφή</Btn>
                          <button className="px-3 py-2 rounded bg-white border text-xs" onClick={() => setDetailRow(t)}>Λεπτομέρειες</button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {tab === 'transfers' && (
              <div className="space-y-2">
                <MobileTransfersProducer
                  open={open}
                  done={done}
                  onPreviewPdf={(t: any) => setPdfPreview(pdfTransferDataUrl(t))}
                />
              </div>
            )}

            {tab === 'projects' && (
              <div className="p-3 space-y-3">
                {myProjects.length === 0 ? (
                  <div className="text-center p-10">
                    <div className="mx-auto w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
                      <FileText className="w-7 h-7 text-indigo-600" />
                    </div>
                    <div className="font-medium">Δεν βρέθηκαν έργα</div>
                    <div className="text-xs text-gray-500 mt-1">Όταν δημιουργηθούν έργα θα εμφανιστούν εδώ.</div>
                  </div>
                ) : myProjects.map((p: any) => {
                  const initials = (p.projectName || '').split(' ').map((s: string) => s[0]).slice(0,2).join('').toUpperCase();
                  return (
                    <div key={p.id} className="mobile-card overflow-hidden p-0">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-semibold">{initials}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{p.projectName}</div>
                            <div className="text-xs text-indigo-100 truncate">{p.address}</div>
                          </div>
                        </div>
                      </div>
                      {/* Body */}
                      <div className="p-3 text-sm">
                        <div className="grid grid-cols-1 gap-1 text-xs text-gray-700">
                          <div>Μεταφορέας: <span className="font-semibold">{p.transporter}</span></div>
                          <div>Μονάδα: <span className="font-semibold">{p.unit}</span></div>
                        </div>
                        {/* Actions */}
                        <div className="mt-3 grid grid-cols-1 gap-2">
                          <button onClick={() => onOpenProject && onOpenProject(p)} className="px-3 py-2 rounded bg-gray-100 text-gray-800 text-xs">Περισσότερα</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom nav */}
      {!show && (
        <div className="mobile-nav safe-bottom relative">
          <div className="flex items-center gap-2 max-w-[380px] mx-auto p-2">
            <button onClick={() => { onClearTransNew && onClearTransNew(); setTab('requests'); }} aria-pressed={tab==='requests'} aria-label="Αιτήματα" className={`mobile-pressable relative flex-1 flex items-center justify-center rounded-xl py-2 ${tab==='requests' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'}`}>
              <Inbox className="w-5 h-5" />
              {(producerReq.length + carrierReq.length) > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full min-w-[16px] h-4 leading-4 px-1 text-center">{producerReq.length + carrierReq.length}</span>
              )}
            </button>
            <button onClick={() => { onClearProjectsNew && onClearProjectsNew(); setTab('projects'); }} aria-pressed={tab==='projects'} aria-label="Έργα" className={`mobile-pressable relative flex-[1.6] flex items-center justify-center rounded-2xl py-3 shadow-2xl ${tab==='projects' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'}`}>
              <FileText className="w-6 h-6" />
            </button>
            <button onClick={() => { onClearTransNew && onClearTransNew(); setTab('transfers'); }} aria-pressed={tab==='transfers'} aria-label="Μεταφορές" className={`mobile-pressable relative flex-1 flex items-center justify-center rounded-xl py-2 ${tab==='transfers' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'}`}>
              <Truck className="w-5 h-5" />
              {open.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full min-w-[16px] h-4 leading-4 px-1 text-center">{open.length}</span>
              )}
            </button>
          </div>
          {/* Floating action: show only on Requests tab */}
          {tab === 'requests' && (
            <div className="absolute right-4 -top-10 md:-top-20">
              <button
                onClick={() => setShow(true)}
                aria-label="Νέο Αίτημα Κάδου"
                className="rounded-full bg-yellow-600 text-white w-14 h-14 flex items-center justify-center fab-shadow mobile-pressable transition-all duration-300 ease-out hover:scale-105 active:scale-95"
              >
                <Inbox className="w-6 h-6 text-white" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast.open && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-50">
          <div className="bg-black/80 text-white text-sm px-3 py-2 rounded-full shadow-lg">{toast.msg}</div>
        </div>
      )}

      {/* Subscription view for mobile */}
      {tab === 'subscription' && (
        <div className="p-4">
          <div className="text-lg font-semibold mb-2">Συνδρομή</div>
          <div className="mb-3">Επίλεξε πακέτο για {myProducer}:</div>
          <div className="flex gap-3">
            <button className={`flex-1 px-3 py-4 rounded border ${subscriptionPlanMobile === 'basic' ? 'bg-blue-50 border-blue-300' : ''}`} onClick={() => { const k = `iwm_producer_subscription_${myProducer.replace(/\s+/g,'_')}`; try { localStorage.setItem(k, 'basic'); } catch {} setSubscriptionPlanMobile('basic'); notify('Επιλέχθηκε Basic'); }}>Basic</button>
            <button className={`flex-1 px-3 py-4 rounded border ${subscriptionPlanMobile === 'premium' ? 'bg-yellow-50 border-yellow-300' : ''}`} onClick={() => { const k = `iwm_producer_subscription_${myProducer.replace(/\s+/g,'_')}`; try { localStorage.setItem(k, 'premium'); } catch {} setSubscriptionPlanMobile('premium'); notify('Επιλέχθηκε Premium'); }}>Premium</button>
          </div>
          <div className="mt-3 text-sm">Τρέχουσα επιλογή: <span className="font-semibold">{subscriptionPlanMobile === 'premium' ? 'Premium' : 'Basic'}</span></div>
          <div className="mt-3">
            {subscriptionPlanMobile === 'basic' && (
              <ul className="text-sm text-gray-700 list-disc list-inside">
                <li>Βασικές λειτουργίες πλατφόρμας και εξαγωγές CSV</li>
                <li>Ιδανικό για μικρές επιχειρήσεις και δοκιμή</li>
              </ul>
            )}
            {subscriptionPlanMobile === 'premium' && (
              <ul className="text-sm text-gray-700 list-disc list-inside">
                <li>Προχωρημένα reports, scheduled exports και API</li>
                <li>Προτεραιότητα υποστήριξης και οδηγίες ενσωμάτωσης</li>
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Αίτημα Κάδου (επιλογή τύπου) */}
      {reqTypeModal.open && (
        <Modal
          title="Αίτημα Κάδου"
          inside
          onClose={() => setReqTypeModal({ open: false, project: null, type: 'change-bin' })}
          onSubmit={() => {
            if (onRequest && reqTypeModal.project) {
              onRequest(reqTypeModal.project, reqTypeModal.type);
              notify(reqTypeModal.type === 'new-bin' ? 'Στάλθηκε αίτημα νέου κάδου' : reqTypeModal.type === 'move-bin' ? 'Στάλθηκε αίτημα μεταφοράς κάδου' : 'Στάλθηκε αίτημα αλλαγής κάδου');
            }
            setReqTypeModal({ open: false, project: null, type: 'change-bin' });
          }}
          submitLabel="Αποστολή"
        >
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-gray-500 text-xs">Παραγωγός</div>
                <div className="font-medium">{reqTypeModal.project?.producer}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Έργο</div>
                <div className="font-medium">{reqTypeModal.project?.projectName}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Διεύθυνση</div>
                <div className="font-medium">{reqTypeModal.project?.address || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Μονάδα</div>
                <div className="font-medium">{reqTypeModal.project?.unit || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Μεταφορέας</div>
                <div className="font-medium">{reqTypeModal.project?.transporter || '-'}</div>
              </div>
            </div>
            <div className="pt-2">
              <div className="text-xs text-gray-600 mb-1">Τύπος αιτήματος</div>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setReqTypeModal((m: any) => ({ ...m, type: 'new-bin' }))} className={`px-2 py-2 text-xs rounded border ${reqTypeModal.type==='new-bin' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700'}`}>Νέος Κάδος</button>
                <button type="button" onClick={() => setReqTypeModal((m: any) => ({ ...m, type: 'change-bin' }))} className={`px-2 py-2 text-xs rounded border ${reqTypeModal.type==='change-bin' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700'}`}>Αλλαγή Κάδου</button>
                <button type="button" onClick={() => setReqTypeModal((m: any) => ({ ...m, type: 'move-bin' }))} className={`px-2 py-2 text-xs rounded border ${reqTypeModal.type==='move-bin' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700'}`}>Μεταφορά Κάδου</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Menu modal */}
      {menuOpen && (
        <div className="absolute inset-0 z-40 bg-black/40 flex items-start justify-start p-4">
          <div className="bg-white rounded-lg w-full max-w-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Μενού</div>
              <button onClick={() => setMenuOpen(false)} className="text-gray-600">✕</button>
            </div>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100">Προφίλ</button>
              <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100">Ρυθμίσεις</button>
              <button onClick={() => { setMyRequestsOpen(true); setMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded hover:bg-gray-100">Οι αιτήσεις μου</button>
            </div>
          </div>
        </div>
      )}

      {/* Οι αιτήσεις μου modal - lists producer open requests */}
            {myRequestsOpen && (
        <div className="absolute inset-0 z-50 bg-white p-3 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Οι αιτήσεις μου</div>
            <button onClick={() => setMyRequestsOpen(false)} className="px-2 py-1 rounded bg-gray-100">✕</button>
          </div>
          <div className="space-y-3">
            <div className="font-semibold text-sm">Ανοιχτά αιτήματα προς μεταφορέα</div>
            {producerReq.length === 0 ? <div className="text-sm text-gray-400">—</div> : producerReq.map((t: any) => {
              const typeLabel = t.requestType === 'new-bin' ? 'Νέος κάδος' : t.requestType === 'move-bin' ? 'Μεταφορά κάδου' : 'Αλλαγή κάδου';
              return (
                <div key={t.id} className="border rounded p-3 text-sm bg-indigo-50">
                  <div className="font-medium">{typeLabel} — {t.project}</div>
                  <div className="text-xs text-gray-600">{fmt(t.date)} {t.time || ''} — {t.address}</div>
                </div>
              );
            })}

            <div className="font-semibold text-sm mt-3">Αιτήσεις προς μονάδα (συμφωνίες)</div>
            {open.length === 0 ? <div className="text-sm text-gray-400">—</div> : open.map((t: any) => (
              <div key={t.id} className="border rounded p-3 text-sm bg-yellow-50">
                <div className="font-medium">Συμφωνία — {t.project}</div>
                <div className="text-xs text-gray-600">{fmt(t.date)} {t.time || ''} — {t.address}</div>
              </div>
            ))}
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
      {signModal.open && (
        <div className="absolute inset-0 z-50 bg-white p-4 overflow-auto animate-in">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Υπογραφή Υπευθύνου Έργου</div>
            <button onClick={() => setSignModal({ open: false, id: null, signature: '' })} className="px-2 py-1 rounded bg-gray-100">✕</button>
          </div>
          <div className="text-sm mb-2">Σχεδιάστε την υπογραφή του Υπευθύνου έργου.</div>
          <div className="border p-2 rounded bg-white">
            <SignaturePad value={signModal.signature} onChange={(v: any) => setSignModal((s: any) => ({ ...s, signature: v }))} className="h-36" />
          </div>
          <div className="flex gap-2 mt-3">
            <button className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded" onClick={() => setSignModal({ open: false, id: null, signature: '' })}>Άκυρο</button>
            <button className="flex-1 bg-green-600 text-white px-3 py-2 rounded" onClick={() => {
              if (!signModal.id) return; if (!signModal.signature) return alert('Απαιτείται υπογραφή');
              onApprove && onApprove(signModal.id, signModal.signature);
              // after successful signature, switch to Transfers tab so user sees the updated transport
              setTab('transfers');
              setSignModal({ open: false, id: null, signature: '' });
            }}>Υπογραφή</button>
          </div>
        </div>
      )}
      {detailRow && (
        <div className="absolute inset-0 z-50 bg-white p-4 overflow-auto animate-in">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Λεπτομέρειες Μεταφοράς</div>
            <button onClick={() => setDetailRow(null)} className="px-2 py-1 rounded bg-gray-100">✕</button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="font-semibold text-base">{detailRow.project} — {detailRow.producer}</div>
            <div>
              <div className="text-xs text-gray-500">Διεύθυνση</div>
              <div className="font-medium">{detailRow.address || '-'}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500">Μονάδα</div>
                <div className="font-medium">{detailRow.unit || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Όχημα</div>
                <div className="font-medium">{detailRow.vehicle || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Ημερομηνία</div>
                <div className="font-medium">{fmt(detailRow.date)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Ώρα</div>
                <div className="font-medium">{detailRow.time || '-'}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Υπεύθυνος Έργου</div>
              <div className="font-medium">{detailRow.managerName || '-'}</div>
              <div className="text-xs text-gray-500">Τηλέφωνο</div>
              <div className="font-medium">{detailRow.managerPhone || '-'}</div>
            </div>
            {detailRow.wasteLines && detailRow.wasteLines.length > 0 && (
              <div>
                <div className="text-xs text-gray-500">Στοιχεία Απόρριψης</div>
                <div className="mt-1 space-y-1 text-xs">
                  {detailRow.wasteLines.map((l: any, i: number) => (
                    <div key={i} className="flex justify-between"><div>{l.eka || l.name}</div><div className="font-medium">{l.quantity}</div></div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3">
              <button className="px-3 py-2 rounded bg-gray-200" onClick={() => setDetailRow(null)}>Κλείσιμο</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EcoApp({ projects, transports, onAddTransport, notifications, onJump, onAcceptRequest, onRejectRequest, addNotif, onFinalizeDelivery, onUpdateTransport, onAddProject, currentTransporter, onLogout }: any) {
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
  const [showDeliveryCompleteToast, setShowDeliveryCompleteToast] = useState(false);
  const [showReqActionToast, setShowReqActionToast] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // dynamic, centered title per tab (replaces static IWM label)
  const title = show
    ? 'Νέα Μεταφορά'
    : (tab === 'transfers' ? 'Μεταφορές' : tab === 'requests' ? 'Αιτήματα' : tab === 'projects' ? 'Έργα' : 'Ειδοποιήσεις');
  // external project add page state (independent screen)
  const [addExternalOpen, setAddExternalOpen] = useState(false);
  const [extForm, setExtForm] = useState({ producer: '', projectName: '', address: '', unit: '', managerName: '', managerPhone: '', transporterMode: 'self' as 'self' | 'other', otherTransporter: '' });

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

  const VEH = ['ΚΥΧ123', 'ΑΑΖ567', 'ΒΒΚ432', 'ΝΟΠ998'];
  const req = A(transports).filter((t: any) => !t.approvedByProducer && !t.receivedByUnit);
  const producerReq = req.filter((t: any) => t.fromProducer && !t.acceptedByTransporter && !(typeof t.status === 'string' && t.status.startsWith('Απορρίφθηκε')));
  const carrierReq = req.filter((t: any) => !t.fromProducer);
  const open = A(transports).filter((t: any) => t.approvedByProducer && !t.receivedByUnit && !t.deliveredToUnit);
  const delivery = A(transports).filter((t: any) => !!t.deliveredToUnit && !t.receivedByUnit);
  const done = A(transports).filter((t: any) => t.receivedByUnit);
  const [mobileSignModal, setMobileSignModal] = useState<any>({ open: false, row: null, vehicle: '', date: today(), time: '08:00', producerSignature: '', transporterSignature: '', step: 1, producerSignMode: 'notify' });
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [deliverySignModal, setDeliverySignModal] = useState<any>({ open: false, row: null, transporterSignature: '' });
  const [mobileTransfersSubTab, setMobileTransfersSubTab] = useState<'pending' | 'open' | 'delivery'>('open');
  const [reqFilter, setReqFilter] = useState<'all' | 'carrier' | 'producer'>('all');
  const [projTab, setProjTab] = useState<'all' | 'iwm' | 'external'>('all');
  const myTransporter = currentTransporter || 'Euroskip';
  // Merge global projects and transporter-local external projects (mobile)
  const tProjectsLocal = (() => {
    try {
      const raw = localStorage.getItem('iwm_transporter_external_projects');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) {
        const list = arr.filter((p: any) => p.creatorTransporter === myTransporter || p.transporter === myTransporter);
        const seen = new Set();
        return list.filter((p: any) => {
          const k = `${p.producer}:::${p.projectName}`;
          if (seen.has(k)) return false; seen.add(k); return true;
        });
      }
    } catch {}
    return [];
  })();
  const tProjects = [...A(projects).filter((p: any) => p.transporter === myTransporter || p.creatorTransporter === myTransporter), ...tProjectsLocal];
  // Vehicles per transporter (mobile)
  const [vehiclesMap, setVehiclesMap] = useState<Record<string, string[]>>(() => {
    try { const raw = localStorage.getItem('iwm_transporter_vehicles'); const obj = raw ? JSON.parse(raw) : {}; return obj && typeof obj === 'object' ? obj : {}; } catch { return {}; }
  });
  const myVehicles = (vehiclesMap[myTransporter] || []).filter(Boolean);
  // Show only the vehicles from the transporter's profile; if none, show an empty list (no options except placeholder)
  const mobileVehicleOptions = myVehicles.length ? myVehicles : [];
  React.useEffect(() => {
    try { const raw = localStorage.getItem('iwm_transporter_vehicles'); const obj = raw ? JSON.parse(raw) : {}; if (obj && typeof obj === 'object') setVehiclesMap(obj); } catch {}
  }, [currentTransporter]);
  // Do not preselect vehicle on mobile; keep placeholder as default
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
  onAddTransport({ id: gid(), producer, project, projectId: pr?.id, address: pr?.address || '-', unit, vehicle, date: mDate || today(), time, managerName: pr?.managerName || '', managerPhone: pr?.managerPhone || '', status: 'Αναμονή αποδοχής παραγωγού', approvedByProducer: false, receivedByUnit: false, fromProducer: false, isNew: true, createdByTransporterMobile: true });
    addNotif && addNotif('Νέο Αίτημα Μεταφοράς (Μεταφορέα)', `${producer} / ${project}`, { page: 'producer', tab: 'aitimata' });
    // After creating via 'Αίτημα', navigate to Requests tab
    setTab('requests');
    setShow(false); setProducer(''); setProject(''); setUnit(''); setVehicle(''); setMDate(today()); setMAddress(''); setMManagerName(''); setMManagerPhone('');
  };

  const handleNewWithSign = () => {
    if (!producer || !project || !unit || !vehicle) return;
    const pr = A(projects).find((p: any) => p.producer === producer && p.projectName === project);
  const t = { id: gid(), producer, project, projectId: pr?.id, address: pr?.address || '-', unit, vehicle, date: mDate || today(), time, managerName: pr?.managerName || '', managerPhone: pr?.managerPhone || '', status: 'Αναμονή αποδοχής παραγωγού', approvedByProducer: false, receivedByUnit: false, fromProducer: false, isNew: true, createdByTransporterMobile: true };
    onAddTransport(t);
    addNotif && addNotif('Νέο Αίτημα Μεταφοράς (Μεταφορέα)', `${producer} / ${project}`, { page: 'producer', tab: 'aitimata' });
  // switch to Transfers tab (open) on mobile so user sees the created transport
  setTab('transfers');
    // open signature page (step 2) for the newly created request
    setShow(false); setProducer(''); setProject(''); setUnit(''); setVehicle(''); setMDate(today()); setMAddress(''); setMManagerName(''); setMManagerPhone('');
  setMobileSignModal({ open: true, row: t, vehicle: t.vehicle || VEH[0], date: t.date, time: t.time, step: 2, producerSignature: '', transporterSignature: '', projectInfo: pr, producerSignMode: pr?.external ? 'here' : 'notify' });
  };

  const submitExternalProject = () => {
    if (!extForm.producer || !extForm.projectName) return alert('Συμπλήρωσε Παραγωγό και Όνομα Έργου');
    if (!extForm.unit) return alert('Συμπλήρωσε Μονάδα');
    const obj: any = {
      id: gid(),
      producer: extForm.producer,
      projectName: extForm.projectName,
      address: extForm.address || '-',
      unit: extForm.unit || '',
      managerName: extForm.managerName || '',
      managerPhone: extForm.managerPhone || '',
      transporter: myTransporter,
      offPlatformTransporter: false,
      creatorTransporter: myTransporter,
      external: true,
      offline: true,
      isNew: true,
      start: today(),
      end: today(),
    };
    // Persist to transporter-local external projects only (not global projects)
    try {
      const raw = localStorage.getItem('iwm_transporter_external_projects');
      const arr = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(arr) ? arr : [];
      const key = `${obj.producer}:::${obj.projectName}`;
      const exists = next.some((p: any) => (p.producer && p.projectName) && (`${p.producer}:::${p.projectName}`) === key);
      if (!exists) next.push(obj);
      localStorage.setItem('iwm_transporter_external_projects', JSON.stringify(next));
    } catch {}
    setAddExternalOpen(false);
    setExtForm({ producer: '', projectName: '', address: '', unit: '', managerName: '', managerPhone: '' } as any);
    setTab('projects');
  };

  return (
    <>
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Mobile header: menu left, tab title centered, bell on right */}
      <div className="mobile-header safe-top px-4">
        <div className="h-14 flex items-center justify-between">
          <div className="relative">
            <button
              aria-label="Μενού"
              className="p-2 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors"
              onClick={() => setMenuOpen(v => !v)}
            >
              <Menu className="w-6 h-6" />
            </button>
            {menuOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white border rounded shadow z-50 py-1">
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>Προφίλ</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>Ρυθμίσεις</button>
                <div className="my-1 border-t" />
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setTab('transfers'); setMenuOpen(false); }}>Μεταφορές</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setTab('requests'); setMenuOpen(false); }}>Αιτήματα</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setTab('projects'); setMenuOpen(false); }}>Έργα</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setTab('notifications'); setMenuOpen(false); }}>Ειδοποιήσεις</button>
                <div className="my-1 border-t" />
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600" onClick={() => { setMenuOpen(false); onLogout && onLogout(); }}>Αποσύνδεση</button>
              </div>
            )}
          </div>
          <div className="font-semibold text-center">{title}</div>
          <button
            aria-label="Ειδοποιήσεις"
            className="p-2 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors relative"
            onClick={() => setTab('notifications')}
          >
            <Bell className="w-6 h-6" />
            {A(notifications).filter((n: any) => n.target?.page === 'transporter' && !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full min-w-[16px] h-4 leading-4 px-1 text-center">
                {A(notifications).filter((n: any) => n.target?.page === 'transporter' && !n.read).length}
              </span>
            )}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="absolute inset-0 z-40" onClick={() => setMenuOpen(false)} />
      )}

      {/* toast */}
      {showToast && (
        <div className="absolute top-12 right-4 z-50 bg-black text-white text-sm px-3 py-2 rounded shadow">Νέα μεταφορά καταχωρήθηκε</div>
      )}

      {showDeliveryCompleteToast && (
        <div className="absolute top-12 right-4 z-50 bg-green-600 text-white text-sm px-3 py-2 rounded shadow">Η μεταφορά ολοκληρώθηκε με επιτυχία</div>
      )}
      {showReqActionToast && (
        <div className="absolute top-12 right-4 z-50 bg-black text-white text-sm px-3 py-2 rounded shadow">Επιτυχημένη ενέργεια</div>
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
              {(() => {
                const central = A(projects).map((p: any) => p.producer || '').filter(Boolean);
                const transportLocal = tProjectsLocal.map((p: any) => p.producer || '').filter(Boolean);
                const merged = Array.from(new Set([...central, ...transportLocal]));
                return merged.map((p: string) => (<option key={p} value={p}>{p}</option>));
              })()}
            </select>
            <select value={project} onChange={(e: any) => {
              const val = e.target.value;
              setProject(val);
              const pr = A(projects).find((x: any) => x.producer === producer && x.projectName === val) || (tProjectsLocal.find((x: any) => x.producer === producer && x.projectName === val));
              const u = pr?.unit;
              setUnit(u || '');
              setMAddress(pr?.address || '');
              setMManagerName(pr?.managerName || '');
              setMManagerPhone(pr?.managerPhone || '');
            }} className="border p-1 w-full rounded">
              <option value="">Επιλογή Έργου</option>
              {(() => {
                const central = A(projects).filter((p: any) => p.producer === producer && !p.offPlatformTransporter).map((p: any) => p.projectName);
                const transportLocal = tProjectsLocal.filter((p: any) => p.producer === producer).map((p: any) => p.projectName);
                const merged = Array.from(new Set([...(central || []), ...(transportLocal || [])]));
                return merged.map((name: string, idx: number) => (<option key={`${producer}:::${name}:::${idx}`} value={name}>{name}</option>));
              })()}
            </select>
            <input value={mAddress} readOnly placeholder="Διεύθυνση" className="border p-1 w-full rounded bg-gray-100" />
            <input value={unit} readOnly placeholder="Μονάδα" className="border p-1 w-full rounded bg-gray-100" />
            <input value={mManagerName} readOnly placeholder="Υπεύθυνος" className="border p-1 w-full rounded bg-gray-100" />
            <input value={mManagerPhone} readOnly placeholder="Τηλέφωνο" className="border p-1 w-full rounded bg-gray-100" />
            <select value={vehicle} onChange={(e: any) => setVehicle(e.target.value)} className="border p-1 w-full rounded">
              <option value="">Επιλογή Οχήματος</option>
              {mobileVehicleOptions.length > 0 && mobileVehicleOptions.map((v: string) => (<option key={v} value={v}>{v}</option>))}
            </select>
            <input type="date" value={mDate} readOnly className="border p-1 w-full rounded bg-gray-100" />
            <input type="time" value={time} readOnly className="border p-1 w-full rounded bg-gray-100" />
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <button onClick={() => { setShow(false); }} className="w-full bg-gray-200 text-gray-800 px-3 py-2 rounded text-sm text-left">Ακύρωση</button>
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
                if (mobileSignModal.step === 1) return setMobileSignModal({ open: false, row: null, vehicle: '', date: today(), time: '08:00', step: 1, producerSignature: '', transporterSignature: '', projectInfo: null, producerSignMode: 'notify' });
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
                  <div className="col-span-2">Διεύθυνση: <span className="font-semibold">{mobileSignModal.row?.address || '-'}</span></div>
                  <div>Μονάδα: <span className="font-semibold">{mobileSignModal.row?.unit || '-'}</span></div>
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
                      <option value="">Επιλογή Οχήματος</option>
                      {mobileVehicleOptions.length > 0 && mobileVehicleOptions.map((pl: string) => (<option key={pl} value={pl}>{pl}</option>))}
                    </select>
                  </label>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                {(() => { const isExternal = !!mobileSignModal.projectInfo?.external; return (
                  <div className="text-sm mb-2">{isExternal ? 'Για έργα εκτός IWM επιτρέπεται μόνο "Υπογραφή εδώ".' : 'Επιλέξτε τρόπο υπογραφής για τον Υπεύθυνο Έργου και συμπληρώστε τις υπογραφές.'}</div>
                ); })()}
                  <div className="mb-3">
                    <div className="flex items-center gap-3 mb-2 text-sm">
                      <label className={`px-3 py-1 rounded cursor-pointer ${mobileSignModal.producerSignMode === 'here' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`} onClick={() => setMobileSignModal((m:any)=> ({ ...m, producerSignMode: 'here' }))}>Υπογραφή εδώ</label>
                      {(!mobileSignModal.projectInfo?.external) && (
                        <label className={`px-3 py-1 rounded cursor-pointer ${mobileSignModal.producerSignMode === 'notify' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`} onClick={() => setMobileSignModal((m:any)=> ({ ...m, producerSignMode: 'notify' }))}>Αποστολή ειδοποίησης στον Παραγωγό</label>
                      )}
                    </div>

                    {mobileSignModal.producerSignMode === 'here' ? (
                      <>
                        <div className="text-xs mb-1">Υπογραφή Παραγωγού (Υπεύθυνος παράδοσης)</div>
                        <div className="border p-2 rounded bg-white mb-3">
                          <SignaturePad value={mobileSignModal.producerSignature} onChange={(v: any) => setMobileSignModal((m: any) => ({ ...m, producerSignature: v }))} className="h-36" />
                        </div>
                      </>
                    ) : (
                      <div className="p-3 bg-yellow-50 border rounded text-sm text-gray-700 mb-3">
                        Αν επιλέξετε "Αποστολή ειδοποίησης", ο οδηγός θα υπογράψει εδώ και θα σταλεί ειδοποίηση στον υπεύθυνο έργου ώστε να ανοίξει την εφαρμογή του παραγωγού και να υπογράψει από το κινητό του. Η μεταφορά θα καταχωρηθεί με την υπογραφή του οδηγού και θα παραμείνει σε εκκρεμότητα μέχρι να υπογράψει ο παραγωγός.
                      </div>
                    )}

                    <div>
                      <div className="text-xs mb-1">Υπογραφή Μεταφορέα (Οδηγός)</div>
                      <div className="border p-2 rounded bg-white">
                        <SignaturePad value={mobileSignModal.transporterSignature} onChange={(v: any) => setMobileSignModal((m: any) => ({ ...m, transporterSignature: v }))} className="h-36" />
                      </div>
                    </div>
                  </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="pt-3">
              {mobileSignModal.step === 1 ? (
                <div className="flex gap-2">
                  <button className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded" onClick={() => setMobileSignModal({ open: false, row: null, vehicle: '', date: today(), time: '08:00', step: 1, producerSignature: '', transporterSignature: '', projectInfo: null, producerSignMode: 'notify' })}>Άκυρο</button>
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
                    const isExternal = !!mobileSignModal.projectInfo?.external;
                    // If producer signs here, require both signatures and complete via onAcceptRequest (existing behavior)
                    if (mobileSignModal.producerSignMode === 'here') {
                      if (!mobileSignModal.producerSignature || !mobileSignModal.transporterSignature) return alert('Απαιτούνται και οι δύο υπογραφές');
                      onAcceptRequest(mobileSignModal.row, { vehicle: mobileSignModal.vehicle, date: mobileSignModal.date, time: mobileSignModal.time, producerSignature: mobileSignModal.producerSignature, transporterSignature: mobileSignModal.transporterSignature });
                      // switch to Transfers tab in mobile view so the user sees the updated transport
                      // show the Open ('Ανοιχτές') subtab when signing here
                      setMobileTransfersSubTab('open');
                      setTab('transfers');
                      setMobileSignModal({ open: false, row: null, vehicle: '', date: today(), time: '08:00', producerSignature: '', transporterSignature: '', step: 1, producerSignMode: 'notify' });
                      return;
                    }

                    if (isExternal) { alert('Για έργα εκτός IWM επιτρέπεται μόνο "Υπογραφή εδώ".'); return; }
                    // Otherwise, notify producer to sign via their mobile app. Persist only transporter signature.
                    if (!mobileSignModal.transporterSignature) return alert('Απαιτείται υπογραφή οδηγού');
                    // update transport with transporter signature and set status to waiting for unit signature
                    onUpdateTransport && onUpdateTransport(mobileSignModal.row.id, { transporterSignature: mobileSignModal.transporterSignature, status: 'Waiting for unit signature' });
                    // send notification to producer to sign in their app and redirect to Transfers -> Παραγωγός
                    addNotif && addNotif('Αίτημα Υπογραφής από Παραγωγό', `${mobileSignModal.row.producer} / ${mobileSignModal.row.project}`, { page: 'producer', tab: 'aitimata' });
                    // ensure MobileTransfers shows the 'Παραγωγός' (pending) subtab
                    setMobileTransfersSubTab('pending');
                    setTab('transfers');
                    setMobileSignModal({ open: false, row: null, vehicle: '', date: today(), time: '08:00', producerSignature: '', transporterSignature: '', step: 1, producerSignMode: 'notify' });
                  }}>Ολοκλήρωση</button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'transfers' && !show && (
      <div className="space-y-2">
        <MobileTransfers
              open={open}
              pending={carrierReq}
              delivery={delivery}
              done={done}
              projects={projects}
              onPreviewPdf={(t: any) => setPdfPreview(pdfTransferDataUrl(t))}
              onCreateNew={() => setShow(true)}
              onOpenDeliverySign={(row: any) => setDeliverySignModal({ open: true, row, transporterSignature: '' })}
              onOpenSign={(row: any) => {
                const pr = A(projects).find((p: any) => p.id === row.projectId);
                setMobileSignModal({ open: true, row, vehicle: '', date: row.date || today(), time: row.time || '08:00', step: 2, producerSignature: '', transporterSignature: '', projectInfo: pr, producerSignMode: pr?.external ? 'here' : 'notify' });
              }}
              activeSubTab={mobileTransfersSubTab}
            />
          </div>
        )}

        {tab === 'requests' && !show && (
          <MobileRequests
            producerReq={producerReq}
            carrierReq={carrierReq}
            onAccept={(t: any) => { onAcceptRequest && onAcceptRequest(t); setShowReqActionToast(true); setTimeout(() => setShowReqActionToast(false), 1500); }}
            onReject={(t: any) => { onRejectRequest && onRejectRequest(t); setShowReqActionToast(true); setTimeout(() => setShowReqActionToast(false), 1500); }}
            onPreviewPdf={(t: any) => setPdfPreview(pdfTransferDataUrl(t))}
          />
        )}

        {tab === 'projects' && !show && (
          <div className="p-4 space-y-3">
            <div className="inline-flex bg-gray-100 p-1 rounded-full mb-3">
              <button onClick={() => setProjTab('all')} className={`px-3 py-1.5 rounded-full text-sm ${projTab === 'all' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Όλα</button>
              <button onClick={() => setProjTab('iwm')} className={`px-3 py-1.5 rounded-full text-sm ${projTab === 'iwm' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Έργα IWM</button>
              <button onClick={() => setProjTab('external')} className={`px-3 py-1.5 rounded-full text-sm ${projTab === 'external' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Έργα Εκτός IWM</button>
            </div>

            {(() => {
              const all = A(tProjects);
              const iwms = all.filter((p: any) => !p.external);
              const others = all.filter((p: any) => !!p.external);
              const list = projTab === 'all' ? all : (projTab === 'iwm' ? iwms : others);
              if (list.length === 0) return <div className="text-center text-gray-400 py-6">—</div>;
              return list.map((p: any) => {
                const showNew = !!p.isNew && !seenProjectIds[p.id];
                const estTons = (typeof p.estimated === 'number' ? p.estimated : (p.estimated ?? sumWaste(p.wasteLines))) || 0;
                const totalTrips = Math.max(1, Math.ceil(estTons / 7));
                const doneTrips = A(transports).filter((t: any) => (t.projectId === p.id || t.project === p.projectName) && t.receivedByUnit).length;
                return (
                  <div key={p.id} className={`mobile-card p-3 w-full text-left transition-all ${showNew ? 'bg-green-50 ring-1 ring-green-300' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-sm truncate">Παραγωγός: <span className="font-medium">{p.producer}</span>{p.external && <span className="ml-1 text-[11px] font-normal text-orange-700">(εκτός IWM)</span>}</div>
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
                    <div className="text-xs text-gray-700 truncate">
                      <span className="text-gray-500">Έργο:</span>{' '}
                      <span className="font-medium">{p.projectName}</span>
                    </div>
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
                );
              });
            })()}
          </div>
        )}

        {tab === 'notifications' && !show && (
          <div className="p-4 space-y-3">
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
        {/* Floating actions */}
        <div className="absolute right-4 -top-10 md:-top-20 text-center">
          {(tab !== 'projects' && tab !== 'transfers' && tab !== 'requests') ? (
            <button
              onClick={() => setShow((v:any)=>!v)}
              aria-label="Νέα Μεταφορά"
              className="rounded-full bg-green-600 text-white w-14 h-14 flex items-center justify-center fab-shadow mobile-pressable transition-all duration-300 ease-out hover:scale-105 active:scale-95"
              style={{ willChange: 'transform' }}
            >
              +
            </button>
          ) : null}
        </div>
        {/* Projects tab: Centered Add External Project button above the nav bar (sticky) */}
        <div className="fixed left-1/2 -translate-x-1/2 bottom-20 z-40">
          {tab === 'projects' ? (
            <button
              onClick={() => setAddExternalOpen(true)}
              aria-label="Προσθήκη έργου εκτός IWM"
              className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm shadow hover:bg-indigo-700 active:bg-indigo-800 mobile-pressable"
            >
              Προσθήκη έργου (εκτός IWM)
            </button>
          ) : null}
        </div>
        {/* Transfers tab: Centered Add Transfer button above the nav bar (sticky) */}
        <div className="fixed left-1/2 -translate-x-1/2 bottom-20 z-40">
          {tab === 'transfers' ? (
            <button
              onClick={() => setShow(true)}
              aria-label="Προσθήκη μεταφοράς"
              className="px-4 py-2 rounded-full bg-green-600 text-white text-sm shadow hover:bg-green-700 active:bg-green-800 mobile-pressable"
            >
              Προσθήκη μεταφοράς
            </button>
          ) : null}
        </div>
      </div>
      )}

      {/* Add External Project - independent page */}
      {addExternalOpen && (
        <div className="absolute inset-0 z-50 bg-white p-4 overflow-auto animate-in">
          <div className="flex items-center justify-between mb-3">
            <button className="text-blue-700" onClick={() => { setAddExternalOpen(false); }}>‹ Πίσω</button>
            <div className="font-semibold">Προσθήκη Έργου (εκτός IWM)</div>
            <div style={{ width: 40 }} />
          </div>
          <div className="space-y-3 text-sm">
            <label className="block">Παραγωγός
              <input className="border p-2 w-full rounded" placeholder="Όνομα Παραγωγού" value={extForm.producer} onChange={(e: any) => setExtForm({ ...extForm, producer: e.target.value })} />
            </label>
            <label className="block">Όνομα Έργου
              <input className="border p-2 w-full rounded" placeholder="Π.χ. Ανακαίνιση Κτιρίου" value={extForm.projectName} onChange={(e: any) => setExtForm({ ...extForm, projectName: e.target.value })} />
            </label>
            <label className="block">Διεύθυνση
              <input className="border p-2 w-full rounded" placeholder="Οδός, Αριθμός, Πόλη" value={extForm.address} onChange={(e: any) => setExtForm({ ...extForm, address: e.target.value })} />
            </label>
            <label className="block">Μονάδα
              <select className="border p-2 w-full rounded" value={extForm.unit} onChange={(e: any) => setExtForm({ ...extForm, unit: e.target.value })}>
                <option value="">— Επιλογή Μονάδας —</option>
                {UNITS.map((u: string) => (<option key={u} value={u}>{u}</option>))}
              </select>
            </label>
            {/* Στο mobile, ο μεταφορέας είναι πάντα ο τρέχων χρήστης. Δεν εμφανίζουμε επιλογή μεταφορέα. */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">Υπεύθυνος έργου (προαιρετικό)
                <input className="border p-2 w-full rounded" placeholder="Ονοματεπώνυμο" value={extForm.managerName} onChange={(e: any) => setExtForm({ ...extForm, managerName: e.target.value })} />
              </label>
              <label className="block">Τηλέφωνο (προαιρετικό)
                <input className="border p-2 w-full rounded" placeholder="69xxxxxxxx" value={extForm.managerPhone} onChange={(e: any) => setExtForm({ ...extForm, managerPhone: e.target.value })} />
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="flex-1 bg-gray-200 text-gray-800 px-3 py-2 rounded" onClick={() => setAddExternalOpen(false)}>Άκυρο</button>
            <button className="flex-1 bg-green-600 text-white px-3 py-2 rounded" onClick={submitExternalProject}>Καταχώρηση</button>
          </div>
        </div>
      )}
    </div>
    {deliverySignModal.open && (
      <div className="absolute inset-0 bg-white z-40 overflow-auto p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <button className="text-blue-700" onClick={() => setDeliverySignModal({ open: false, row: null, transporterSignature: '' })}>✕ Κλείσιμο</button>
          <div className="font-semibold">Επιβεβαίωση Παράδοσης (Οδηγός)</div>
          <div style={{ width: 48 }} />
        </div>
        <div className="flex-1">
          <div className="text-sm mb-2">Ο οδηγός επιβεβαιώνει τη παράδοση με την υπογραφή του. Μετά την υπογραφή, η μεταφορά παραμένει σε εκκρεμότητα μέχρι να υπογράψει η μονάδα.</div>
          <div className="border p-2 rounded bg-white">
            <SignaturePad value={deliverySignModal.transporterSignature} onChange={(v: any) => setDeliverySignModal((m: any) => ({ ...m, transporterSignature: v }))} className="h-36" />
          </div>
        </div>
        <div className="pt-3 flex gap-2">
          <button className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded" onClick={() => setDeliverySignModal({ open: false, row: null, transporterSignature: '' })}>Άκυρο</button>
          <button className="flex-1 bg-green-600 text-white px-3 py-2 rounded" onClick={() => {
            if (!deliverySignModal.row) return;
            if (!deliverySignModal.transporterSignature) return alert('Απαιτείται υπογραφή οδηγού');
            // mark driver signature and await unit signature
            onUpdateTransport && onUpdateTransport(deliverySignModal.row.id, { transporterSignature: deliverySignModal.transporterSignature, status: 'Waiting for unit signature' });
            addNotif && addNotif('Υπογραφή Οδηγού', 'Ο οδηγός υπέγραψε — παρακαλούμε υπογράψτε', { page: 'unit', tab: 'transfers' });
            addNotif && addNotif('Η υπογραφή αποθηκεύτηκε', 'Η υπογραφή σας αποθηκεύτηκε', { page: 'transporter', tab: 'unit' });
            // ensure Transfers page in menu is updated (do not show completion toast here)
            setTab('transfers');
            setDeliverySignModal({ open: false, row: null, transporterSignature: '' });
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

function MobileTransfers({ pending = [], open, delivery = [], done, onPreviewPdf, projects, onCreateNew, onOpenDeliverySign, onOpenSign, activeSubTab }: any) {
  const [subTab, setSubTab] = useState<'pending' | 'open' | 'delivery'>('open');
  React.useEffect(() => {
    if (typeof activeSubTab !== 'undefined' && activeSubTab) setSubTab(activeSubTab);
  }, [activeSubTab]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // simple filters kept for completed
  const [fUnit, setFUnit] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const producers = Array.from(new Set((projects || []).map((p: any) => p.producer)));

  const filteredPending = A(pending);
  const filteredOpen = open; // keep open list simple on mobile
  // Exclude transports created by transporter mobile from the delivery list (don't show waiting-for-unit box for those)
  const filteredDelivery = A(delivery).filter((t: any) => !t.createdByTransporterMobile);

  const counts = { pending: filteredPending.length, open: filteredOpen.length, delivery: filteredDelivery.length };

  return (
    <div className="p-3 space-y-3">
      {/* Header removed (duplicate with centered app header) */}

      {/* Summary pills */}
      <div className="flex gap-2">
        <button onClick={() => setSubTab('pending')} className={`flex-1 p-2 rounded-lg text-center ${subTab==='pending' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          <div className="text-sm font-medium">Παραγωγός</div>
          <div className="text-xs">{counts.pending}</div>
        </button>
        <button onClick={() => setSubTab('open')} className={`flex-1 p-2 rounded-lg text-center ${subTab==='open' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          <div className="text-sm font-medium">Ανοιχτές</div>
          <div className="text-xs">{counts.open}</div>
        </button>
        <button onClick={() => setSubTab('delivery')} className={`relative flex-1 p-2 rounded-lg text-center ${subTab==='delivery' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          <div className="text-sm font-medium">Μονάδα</div>
          <div className="text-xs">{counts.delivery}</div>
          {counts.delivery > 0 && (
            <span className="absolute -top-2 -right-2 inline-flex items-center justify-center bg-red-600 text-white text-[10px] rounded-full min-w-[18px] h-5 px-1">{counts.delivery}</span>
          )}
        </button>
      </div>

      {subTab === 'pending' && (
        <div>
          {filteredPending.length === 0 ? (
            <div className="text-center text-gray-400 py-6">
              <div className="mb-2">Δεν υπάρχουν αιτήματα που απαιτούν έγκριση παραγωγού</div>
              <div className="text-sm text-gray-500">Οι μεταφορές που δημιουργήθηκαν από εσάς και περιμένουν υπογραφή του παραγωγού θα εμφανιστούν εδώ.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPending.map((t: any) => (
                <div key={t.id} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <button onClick={() => onPreviewPdf ? onPreviewPdf(t) : pdfTransfer(t)} className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center focus:outline-none">
                        {t.logo ? (
                          <img src={t.logo} alt={t.producer} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-12 h-12 flex items-center justify-center font-semibold text-sm ${avatarColor(t.producer || t.project || '')}`}>{((t.producer || t.project) || '').split(' ').map((s:string)=>s[0]).slice(0,2).join('')}</div>
                        )}
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-500 font-semibold">{t.producer}</div>
                          <div className="mt-1 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-sm truncate">{t.project}</div>
                              <Truck className="w-4 h-4 text-gray-400 filter grayscale opacity-70" />
                              <div className="font-medium text-sm truncate">{t.unit}</div>
                            </div>
                            
                          </div>
                          <div className="text-xs text-gray-500 mt-2">{fmt(t.date)} {t.time ? `• ${t.time}` : ''}</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Badge tone="orange"><Clock className="w-4 h-4" /><span className="ml-2">Αναμονή έγκρισης από Παραγωγό</span></Badge>
                        <div className="text-xs text-gray-500 mt-2">Ο υπεύθυνος έργου θα ειδοποιηθεί για να υπογράψει.</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {subTab === 'open' && (
        <div>
          {filteredOpen.length === 0 ? (
            <div className="text-center text-gray-400 py-6">
              <div className="mb-2">Δεν υπάρχουν ενεργές μεταφορές</div>
              <div className="text-sm text-gray-500">Πατήστε το + στο κάτω δεξιά μέρος για να καταχωρήσετε νέα μεταφορά.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOpen.map((t: any) => (
                <div key={t.id} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      {/* Avatar becomes the PDF affordance */}
                      <button onClick={() => onPreviewPdf ? onPreviewPdf(t) : pdfTransfer(t)} className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center focus:outline-none">
                        {t.logo ? (
                          <img src={t.logo} alt={t.producer} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-12 h-12 flex items-center justify-center font-semibold text-sm ${avatarColor(t.producer || t.project || '')}`}>{((t.producer || t.project) || '').split(' ').map((s:string)=>s[0]).slice(0,2).join('')}</div>
                        )}
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-500 font-semibold">{t.producer}</div>
                          <div className="mt-1">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-sm truncate">{t.project}</div>
                              <span className="truck-anim"><Truck className="w-4 h-4 text-green-600" /></span>
                              <div className="font-medium text-sm truncate">{t.unit}</div>
                            </div>
                            <div className="text-xs text-gray-500 mt-2">{fmt(t.date)} {t.time ? `• ${t.time}` : ''}</div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'delivery' && (
        <div>
          {filteredDelivery.length === 0 ? (
            <div className="text-center text-gray-400 py-6">Καμία παράδοση προς ολοκλήρωση</div>
          ) : (
            <div className="space-y-3">
              {filteredDelivery.map((t: any) => (
                <div key={t.id} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1" />
                  </div>
                  <div className="mt-3">
                    <div className="rounded-lg bg-white shadow-sm p-3 text-center">
                      {/* Primary action first: show Sign or Waiting at the top */}
                      {t.status === 'Waiting for unit signature' ? (
                        <div className="mb-3 text-sm text-orange-600 flex items-center justify-center">
                          <span className="mr-1 inline-block animate-spin">⏳</span> Αναμονή υπογραφής μονάδας
                        </div>
                      ) : (
                        <button onClick={() => onOpenDeliverySign && onOpenDeliverySign(t)} className="mb-3 w-full px-3 py-2 rounded bg-green-600 text-white text-sm">Υπογραφή</button>
                      )}

                      <div className="flex items-center justify-between text-sm font-semibold mb-1">
                        <span className="truncate">Μονάδα: {t.unit}</span>
                        <span className="truncate ml-2">Έργο: {t.project}</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">{fmt(t.unitDate)} {t.unitTime ? `• ${t.unitTime}` : (t.time ? `• ${t.time}` : '')}</div>
                      <div className="text-xs text-gray-500">Αρ. Οχήματος</div>
                      <div className="font-semibold text-sm mb-2">{t.vehicle || '—'}</div>

                      <div className="text-xs text-gray-500">Βάρος (tn)</div>
                      <div className="font-semibold text-sm mb-2">{t.weight ?? '—'}</div>

                      <div className="text-xs text-gray-500">ΕΚΑ</div>
                      <div className="font-semibold text-sm mb-3">{t.ekaCategory || '—'}{(EKA.find((e:any) => e.code === t.ekaCategory)?.description) ? ` — ${EKA.find((e:any) => e.code === t.ekaCategory)?.description}` : ''}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      

      {filtersOpen && (
        <div className="absolute inset-0 z-50 bg-white p-3 overflow-auto animate-in">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Φίλτρα</div>
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
            <div className="flex gap-2 justify-end">
              <Btn className="bg-gray-100" onClick={() => { setFUnit(''); setFFrom(''); setFTo(''); setFiltersOpen(false); }}>Επαναφορά</Btn>
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
            <div className="text-center p-10">
              <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                <Truck className="w-7 h-7 text-blue-600" />
              </div>
              <div className="font-medium">Καμία ενεργή μεταφορά</div>
              <div className="text-xs text-gray-500 mt-1">Όταν ξεκινήσει μια μεταφορά θα εμφανιστεί εδώ.</div>
            </div>
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
                            {/* keep PDF action but show chevron on the right since avatar opens the PDF now */}
                            <button onClick={() => onPreviewPdf ? onPreviewPdf(t) : pdfTransfer(t)} title="Open PDF" aria-label="Open PDF" className="p-1 rounded bg-orange-50 text-orange-700"><ChevronRight className="w-4 h-4" /></button>
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
            <div className="text-center p-10">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <div className="font-medium">Δεν υπάρχουν ολοκληρωμένες μεταφορές</div>
              <div className="text-xs text-gray-500 mt-1">Όταν ολοκληρωθούν, θα τις βρείτε εδώ.</div>
            </div>
          ) : (
            filteredDone.map((t: any) => (
              <div key={t.id} className="border rounded-lg p-3 shadow-sm text-sm bg-gray-50">
                <div className="font-semibold">{t.project}</div>
                <div className="text-xs text-gray-500">Παραλαβή: {fmt(t.unitDate)}</div>
                <div className="text-xs text-green-700 mt-1">Ολοκληρωμένο <button onClick={() => onPreviewPdf ? onPreviewPdf(t) : pdfTransfer(t)} title="Open PDF" aria-label="Open PDF" className="ml-2 p-1 rounded bg-green-100 text-green-800"><ChevronRight className="w-4 h-4" /></button></div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

function MobileRequests({ producerReq = [], carrierReq = [], onAccept, onReject, onPreviewPdf }: any) {
  const prod = A(producerReq);
  const carr = A(carrierReq);
  const total = prod.length + carr.length;
  return (
    <div className="p-3 space-y-4">
      {/* Tab title */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Αίτήματα</div>
        </div>
      </div>

      {/* Unified empty state */}
      {total === 0 && (
        <div className="text-center text-gray-400 text-sm">Δεν υπάρχουν αιτήματα</div>
      )}

      {/* Producer requests (primary) with type label and icon */}
      {prod.length > 0 && (
        <div className="space-y-2">
          {prod.map((t: any) => {
            const type = t.requestType;
            const typeLabel = type === 'new-bin' ? 'Νέος κάδος' : type === 'move-bin' ? 'Μεταφορά κάδου' : type === 'change-bin' ? 'Αλλαγή κάδου' : 'Αίτημα Παραγωγού';
            const tone = type === 'new-bin' ? 'bg-emerald-50' : type === 'move-bin' ? 'bg-blue-50' : type === 'change-bin' ? 'bg-yellow-50' : 'bg-gray-50';
            return (
              <div key={t.id} className={`mobile-card p-3 text-sm ${tone}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* type icon */}
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border">
                      {type === 'new-bin' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v8m4-4H8M4 7h16M9 7v10a2 2 0 002 2h2a2 2 0 002-2V7"/></svg>
                      )}
                      {type === 'move-bin' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 17l-5-5 5-5"/></svg>
                      )}
                      {type === 'change-bin' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M4 10l4-4m12 8l-4 4"/></svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{typeLabel} — {t.project}</div>
                      <div className="text-xs text-gray-600 truncate">Παραγωγός: {t.producer}</div>
                      <div className="text-xs text-gray-600 truncate">{t.address}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-gray-500">{fmt(t.date)}</div>
                    <div className="text-xs text-gray-500">{t.time || '-'}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-blue-700">{t.status}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onReject && onReject(t)} className="px-2 py-1 rounded bg-red-600 text-white text-xs">Απόρριψη</button>
                    <button onClick={() => onAccept && onAccept(t)} className="px-2 py-1 rounded bg-green-600 text-white text-xs">Αποδοχή</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Carrier requests (secondary) - no header label per requirements */}
      {carr.length > 0 && (
        <div>
          {carr.map((t: any) => (
            <div key={t.id} className="mobile-card p-3 mb-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold truncate">{t.producer} — {t.project}</div>
                <div className="text-xs text-gray-500">{fmt(t.date)}</div>
              </div>
              <div className="text-xs text-gray-600 truncate">{t.address}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-blue-700">{t.status}</span>
                <button onClick={() => onPreviewPdf ? onPreviewPdf(t) : pdfTransfer(t)} className="p-1 rounded bg-orange-50 text-orange-700" aria-label="Open PDF"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
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

  // Start with no pre-filled projects (user requested no default project)
  const [projects, setProjects] = useState<any[]>(() => []);

  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  // Start with an empty transports list (no pre-populated transport rows)
  const [transports, setTransports] = useState<any[]>(() => []);

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

  const approveTransport = (id: string, producerSignature?: string) => {
    setTransports((prev: any[]) => prev.map((t: any) => (t.id === id ? { ...t, approvedByProducer: true, status: 'Σε πορεία', isNew: true, producerSignature: producerSignature || t.producerSignature } : t)));
    addNotif('Αίτημα Εγκρίθηκε', 'Έγκριση από Παραγωγό', { page: 'transporter', tab: 'transfers' });
  };
  const rejectTransport = (id: string) => {
    setTransports((prev: any[]) => prev.map((t: any) => (t.id === id ? { ...t, status: 'Απορρίφθηκε από Παραγωγό', isNew: true } : t)));
  };
  const addTransport = (t: any) => setTransports((prev: any[]) => [t, ...prev]);
  const unitReceive = (id: string, weight: number, eka: string) => {
    // After weighing, mark as delivered to unit and await driver's signature
    setTransports((prev: any[]) => prev.map((t: any) => (t.id === id ? {
      ...t,
      deliveredToUnit: true,
      receivedByUnit: false,
      unitDate: today(),
      unitTime: new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      weight,
      ekaCategory: eka,
      status: 'Waiting for transporter signature',
      isNew: true,
    } : t)));
  addNotif('Παράδοση στη Μονάδα', 'Αναμονή για υπογραφή μεταφορέα', { page: 'transporter', tab: 'delivery' });
  };

  // finalize flow now supports two-step signing: driver then unit
  // - When called with transporterSignature (driver): mark awaiting unit signature
  // - When called with unit signature: complete transfer
  const finalizeUnitDelivery = (id: string, unitSignature?: string, transporterSignature?: string) => {
    let completed = false;
    setTransports((prev: any[]) => prev.map((t: any) => {
      if (t.id !== id) return t;
      const hasUnit = !!unitSignature;
      completed = hasUnit;
      return {
        ...t,
        transporterSignature: transporterSignature || t.transporterSignature,
        unitSignature: unitSignature || t.unitSignature,
        receivedByUnit: hasUnit ? true : t.receivedByUnit,
        deliveredToUnit: hasUnit ? false : true, // remains true while awaiting unit signature
        status: hasUnit ? 'Completed' : (transporterSignature ? 'Waiting for unit signature' : 'Waiting for transporter signature'),
        isNew: true,
      };
    }));
    if (completed) {
      addNotif('Ολοκλήρωση Μεταφοράς', 'Η μεταφορά ολοκληρώθηκε', { page: 'producer', tab: 'transfers' });
      addNotif('Υπογραφή Μονάδας', 'Η μονάδα υπέγραψε και ολοκλήρωσε τη μεταφορά', { page: 'transporter', tab: 'unit' });
    } else if (transporterSignature) {
      addNotif('Υπογραφή Οδηγού', 'Ο οδηγός υπέγραψε — αναμονή για υπογραφή μονάδας', { page: 'unit', tab: 'transfers' });
      addNotif('Η υπογραφή αποθηκεύτηκε', 'Η υπογραφή σας αποθηκεύτηκε', { page: 'transporter', tab: 'unit' });
    }
  };

  // producer → create request (supports multiple request types)
  const requestTransfer = (project: any, requestType?: 'empty-bin' | 'full-pickup' | 'change-bin' | 'new-bin' | 'move-bin') => {
    // Derive a human-friendly status label including the request type when provided
    const status = requestType === 'empty-bin'
      ? 'Αίτηση Παραγωγού — Κενός Κάδος'
      : requestType === 'full-pickup'
        ? 'Αίτηση Παραγωγού — Παραλαβή Γεμάτου'
        : requestType === 'change-bin'
          ? 'Αίτηση Παραγωγού — Αλλαγή Κάδου'
          : requestType === 'new-bin'
            ? 'Αίτηση Παραγωγού — Νέος Κάδος'
            : requestType === 'move-bin'
              ? 'Αίτηση Παραγωγού — Μεταφορά Κάδου'
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

  // producer → cancel request (remove pending requests created by producer)
  const cancelRequest = (projectId: string, requestType?: 'empty-bin' | 'full-pickup' | 'change-bin' | 'new-bin' | 'move-bin') => {
    setTransports((prev: any[]) => prev.filter((t: any) => !(t.projectId === projectId && t.fromProducer && !t.approvedByProducer && t.requestType === requestType)));
    addNotif && addNotif('Ακύρωση Αίτησης', 'Η αίτηση ακυρώθηκε από Παραγωγό', { page: 'transporter', tab: 'aitimata' });
  };

  // transporter accepts request (web & mobile share this)
  const acceptRequest = (t: any, details?: { vehicle?: string; date?: string; time?: string; producerSignature?: string; transporterSignature?: string }) => {
    const { vehicle, date, time } = details || {};
    const v = vehicle || plates()[0];
    const nowTime = new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', hour12: false });
    // if signatures provided (from mobile flow), persist them on the transport record
    const producerSignature = (details as any)?.producerSignature;
    const transporterSignature = (details as any)?.transporterSignature;

    // Producer bin requests are an independent flow (new-bin, move-bin, change-bin).
    // Do NOT convert them to transfers. Keep them as requests, mark accepted, and notify the producer.
    if (t.fromProducer && ['change-bin','new-bin','move-bin'].includes(t.requestType)) {
      setTransports((prev: any[]) => prev.map((x: any) => x.id === t.id ? { ...x, acceptedByTransporter: true, acceptedByTransporterAt: today(), isNew: true } : x));
      const title = t.requestType === 'new-bin'
        ? 'Αποδοχή Αιτήματος Νέου Κάδου'
        : t.requestType === 'move-bin'
          ? 'Αποδοχή Αιτήματος Μεταφοράς Κάδου'
          : 'Αποδοχή Αιτήματος Αλλαγής Κάδου';
      addNotif && addNotif(title, `${t.producer} / ${t.project}`, { page: 'producer', tab: 'requests' });
      return;
    }

    // Default path: approve transfer request and continue normal flow
    setTransports((prev: any[]) => prev.map((x: any) => (x.id === t.id ? {
      ...x,
      vehicle: v,
      date: date || x.date,
      time: time || x.time,
      approvedByProducer: true,
      receivedByUnit: x.receivedByUnit,
      unitDate: x.unitDate,
      unitTime: x.unitTime,
      status: 'Σε πορεία',
      isNew: true,
      producerSignature: producerSignature || x.producerSignature,
      transporterSignature: transporterSignature || x.transporterSignature,
    } : x)));
    // notify unit about the approved transfer
    addNotif && addNotif('Η αίτηση εγκρίθηκε', `${t.producer} / ${t.project}`, { page: 'unit', tab: 'transfers' });
  };

  // transporter rejects request
  const rejectRequest = (t: any) => {
    // For Producer bin requests (new/move/change)
    if (t.fromProducer && ['new-bin','move-bin','change-bin'].includes(t.requestType)) {
      // If already accepted, treat as cancel acceptance (revert)
      if (t.acceptedByTransporter) {
        setTransports((prev: any[]) => prev.map((x: any) => x.id === t.id ? { ...x, acceptedByTransporter: false, acceptedByTransporterAt: undefined, isNew: true } : x));
        const title = t.requestType === 'new-bin' ? 'Ακύρωση Αποδοχής Αιτήματος Νέου Κάδου' : t.requestType === 'move-bin' ? 'Ακύρωση Αποδοχής Αιτήματος Μεταφοράς Κάδου' : 'Ακύρωση Αποδοχής Αιτήματος Αλλαγής Κάδου';
        addNotif && addNotif(title, `${t.producer} / ${t.project}`, { page: 'producer', tab: 'requests' });
        return;
      }
      // If not accepted yet: preserve previous behavior
      if (t.requestType === 'change-bin') {
        setTransports((prev: any[]) => prev.filter((x: any) => x.id !== t.id));
        addNotif && addNotif('Απόρριψη Αίτησης Αλλαγής Κάδου', `Ο μεταφορέας απέρριψε το αίτημα αλλαγής κάδου για το έργο "${t.project}"`, { page: 'producer', tab: 'requests' });
        return;
      }
      // For new-bin and move-bin before acceptance, mark as rejected and notify
      setTransports((prev: any[]) => prev.map((x: any) => (x.id === t.id ? { ...x, status: 'Απορρίφθηκε από Μεταφορέα', isNew: true } : x)));
      addNotif && addNotif('Απόρριψη Αίτησης', `${t.producer} / ${t.project}`, { page: 'producer', tab: 'requests' });
      return;
    }
    // For other requests: mark as rejected by transporter and notify producer
    setTransports((prev: any[]) => prev.map((x: any) => (x.id === t.id ? { ...x, status: 'Απορρίφθηκε από Μεταφορέα', isNew: true } : x)));
    addNotif && addNotif('Απόρριψη Αίτησης', `${t.producer} / ${t.project}`, { page: 'producer', tab: 'aitimata' });
  };

  // update transport record (used to persist signatures or minor updates without approving)
  const updateTransport = (id: string, updates: any) => {
    setTransports((prev: any[]) => prev.map(x => x.id === id ? { ...x, ...updates } : x));
  };

  // Producer removes an accepted notification-only request (e.g., change-bin) from their list
  const dismissRequest = (id: string) => {
    setTransports((prev: any[]) => prev.filter((t: any) => t.id !== id));
  };

  // clear notification flags (isNew) globally or with a predicate
  const clearTransNew = (predicate?: (t: any) => boolean) => {
    setTransports((prev: any[]) => prev.map((t: any) => {
      const match = predicate ? !!predicate(t) : true;
      return (match && t.isNew) ? { ...t, isNew: false } : t;
    }));
  };
  const clearTransNewWhere = (predicate: (t: any) => boolean) => clearTransNew(predicate);
  const clearProjectsNew = (predicate?: (p: any) => boolean) => {
    setProjects((prev: any[]) => prev.map((p: any) => {
      const match = predicate ? !!predicate(p) : true;
      return (match && p.isNew) ? { ...p, isNew: false } : p;
    }));
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
        {/* Top-level bell removed to avoid duplicate bells; in-page bells remain */}
      </div>

      {page === 'producer' && (
        <div>
          <div className="flex gap-3 mb-3">
            <Btn className={producerMode === 'web' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setProducerMode('web')}>🌐 Web</Btn>
            <Btn className={producerMode === 'mobile' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setProducerMode('mobile')}>📱 Mobile</Btn>
          </div>
            {selectedProject ? (
              <ProjectDetails project={selectedProject} transports={transports} onBack={() => setSelectedProject(null)} onRequestTransfer={requestTransfer} onCancelRequest={cancelRequest} addNotif={addNotif} onUpdateProject={(id: string, updates: any) => setProjects((prev: any[]) => prev.map((p: any) => p.id === id ? { ...p, ...updates } : p))} />
            ) : (
              producerMode === 'web' ? (
                <Producer projects={projects} transports={transports} onAddProject={addProject} onApproveTransport={approveTransport} onRejectTransport={rejectTransport} onOpenProject={(p: any) => setSelectedProject(p)} onRequestTransfer={requestTransfer} onCancelRequest={cancelRequest} notifications={notifications} onJump={jumpByNotif} deepLink={deepLink} onClearTransNew={clearTransNew} onClearProjectsNew={clearProjectsNew} />
              ) : (
                <ProducerMobileFrame projects={projects} transports={transports} onApprove={approveTransport} onReject={rejectTransport} onRequest={requestTransfer} onCancelRequest={cancelRequest} onDismissRequest={dismissRequest} notifications={notifications} onJump={jumpByNotif} deepLink={deepLink} onOpenProject={(p: any) => setSelectedProject(p)} onClearTransNew={clearTransNew} onClearProjectsNew={clearProjectsNew} />
              )
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
            <Transporter projects={projects} transports={transports} onAddTransport={addTransport} notifications={notifications} onJump={jumpByNotif} onAcceptRequest={acceptRequest} onRejectRequest={rejectRequest} addNotif={addNotif} deepLink={deepLink} onAddProject={addProject} onClearTransNew={clearTransNew} onClearProjectsNew={clearProjectsNew} />
          ) : (
            <EcoMobileFrame projects={projects} transports={transports} onAddTransport={addTransport} notifications={notifications} onJump={jumpByNotif} onAcceptRequest={acceptRequest} onRejectRequest={rejectRequest} addNotif={addNotif} deepLink={deepLink} onFinalizeDelivery={finalizeUnitDelivery} onUpdateTransport={updateTransport} onAddProject={addProject} onClearTransNew={clearTransNew} onClearProjectsNew={clearProjectsNew} />
          )}
        </div>
      )}

      {page === 'unit' && (
            <div>
              <div className="flex gap-3 mb-3">
                <Btn className={unitMode === 'webAdmin' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setUnitMode('webAdmin')}>🌐 Web Admin</Btn>
                <Btn className={unitMode === 'web' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setUnitMode('web')}>🌐 Web Ζυγιστικό</Btn>
                <Btn className={unitMode === 'tablet' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setUnitMode('tablet')}>📱 Tablet</Btn>
              </div>
              {unitMode === 'tablet' ? (
                <UnitTabletFrame projects={projects} transports={transports} onReceive={unitReceive} onFinalize={finalizeUnitDelivery} onAddTransport={addTransport} addNotif={addNotif} />
              ) : (
                // Render the same Unit web UI for both Web Admin and Web Ζυγιστικό
                <Unit projects={projects} transports={transports} onAcceptAgreement={acceptAgreement} onRejectAgreement={rejectAgreement} onReceive={unitReceive} onFinalize={finalizeUnitDelivery} notifications={notifications} onJump={jumpByNotif} onOpenProject={(p: any) => { setSelectedProject(p); setPage('projectView'); }} deepLink={deepLink} onClearTransNew={clearTransNew} onClearProjectsNew={clearProjectsNew} onClearTransNewWhere={clearTransNewWhere} adminOnly={unitMode === 'webAdmin'} />
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
