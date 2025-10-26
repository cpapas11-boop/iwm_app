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
import { Bell, Inbox, Truck, Factory, FileText, CheckCircle2, Clock, Menu, Filter, Package, ArrowUpCircle, ArrowDownCircle, Trash2, ChevronRight } from 'lucide-react';

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
const DEBTOR_OPTIONS = ['Εργολάβος Α','Εργολάβος Β','Εργολάβος Γ','Εταιρεία Skip 1','Εταιρεία Skip 2','Εταιρεία Skip 3'];

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
            <span className="ml-2 text-xs bg-red-600 text-white rounded-full px-2">{t.count}</span>
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
const ProjectDetails = ({ project, transports, documents = [], onUploadDocument, onBack, onRequestTransfer, onCancelRequest }: any) => {
  const list = A(transports).filter((t: any) => t.projectId === project.id);
  const [justRequested, setJustRequested] = React.useState<string | null>(null);
  const [showReqModal, setShowReqModal] = React.useState(false);
  const [reqType, setReqType] = React.useState<'new-bin' | 'change-bin' | 'move-bin' | ''>('');
  const [subTab, setSubTab] = React.useState<'overview' | 'collective'>('overview');
  // Products ordering (to Unit)
  const [prodOrderOpen, setProdOrderOpen] = React.useState(false);
  const [unitProducts, setUnitProducts] = React.useState<any[]>([]);
  const [prodOrderForm, setProdOrderForm] = React.useState<{ product: string; quantity: string }>({ product: '', quantity: '' });
  const refreshUnitProducts = () => {
    try { const raw = localStorage.getItem('iwm_unit_products'); const arr = raw ? JSON.parse(raw) : []; setUnitProducts(Array.isArray(arr) ? arr : []); } catch { setUnitProducts([]); }
  };
  // local fallback storage if parent doesn't pass documents state/handler
  const [localDocs, setLocalDocs] = React.useState<any[]>([]);
  // dedicated file inputs per document type
  const [siteNoticeFile, setSiteNoticeFile] = React.useState<File | null>(null); // Γνωστοποίηση Εργοταξίου
  const [wastePlanFile, setWastePlanFile] = React.useState<File | null>(null);   // Σχέδιο Διαχείρισης Αποβλήτων
  const [agreementFile, setAgreementFile] = React.useState<File | null>(null);   // Συμφωνία Διαχείρισης Αποβλήτων

  const delivered = A(list).filter((t: any) => t.receivedByUnit);
  const actualsMap: Record<string, number> = {};
  delivered.forEach((t: any) => {
    const code = t.ekaCategory || '—';
    const w = parseFloat(String(t.weight || '0')) || 0;
    actualsMap[code] = (actualsMap[code] || 0) + w;
  });
  const TON_PER_LOAD = 7;
  const totalEstimatedTons = A(project.wasteLines).reduce((s: number, w: any) => s + (Number(w.quantity || 0) || 0), 0);
  const estimatedLoads = totalEstimatedTons > 0 ? Math.ceil(totalEstimatedTons / TON_PER_LOAD) : 0;
  const completedLoads = delivered.length;
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
        <h2 className="text-xl font-bold">{project.projectName}</h2>
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
              { key: 'collective', label: collectiveLabel, count: docsForProject.length },
            ]}
            active={subTab}
            onChange={(k: string) => setSubTab((k as any) || 'overview')}
          />
        );
  })()}

      {subTab === 'overview' && (
        <>
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
                <div className="w-full rounded-lg border p-3 hover:shadow transition bg-gradient-to-r from-yellow-50 to-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-6 h-6 text-yellow-600" />
                    <div>
                      <div className="font-semibold">Αίτημα Κάδου</div>
                      <div className="text-xs text-gray-600">Επιλέξτε τύπο αιτήματος (Νέος / Αλλαγή / Μεταφορά)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowReqModal(true)} className="px-3 py-1 rounded bg-yellow-600 text-white text-sm">Αίτημα</button>
                  </div>
                </div>

                {list.some((t: any) => t.fromProducer && !t.approvedByProducer && ['new-bin','move-bin','change-bin'].includes(t.requestType)) && (
                  <div className="text-xs text-gray-600">Υπάρχει αίτημα σε αναμονή αποδοχής</div>
                )}

                {justRequested && (
                  <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                    {justRequested === 'new-bin' ? 'Ο μεταφορέας θα ενημερωθεί για νέο κάδο.' : justRequested === 'move-bin' ? 'Ο μεταφορέας θα ενημερωθεί για μεταφορά κάδου.' : 'Ο μεταφορέας θα ενημερωθεί για αλλαγή κάδου.'}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded border p-3">
              <div className="font-semibold mb-2">Εντολές προς Μονάδα Διαχείρισης Αποβλήτων</div>
              <div className="w-full rounded-lg border p-3 hover:shadow transition bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-indigo-600" />
                  <div>
                    <div className="font-semibold">Παραγγελία Υλικού</div>
                    <div className="text-xs text-gray-600">Επέλεξε προϊόν και ποσότητα για παραγγελία από τη Μονάδα</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { refreshUnitProducts(); setProdOrderOpen(true); }} className="px-3 py-1 rounded bg-indigo-600 text-white text-sm">Παραγγελία</button>
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
        </>
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
            <label className="block">Παραγωγός
              <input className="border p-1 w-full bg-gray-50" value={project.producer} readOnly />
            </label>
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
            <label className="block">Παραγωγός
              <input className="border p-1 w-full bg-gray-50" value={project.producer} readOnly />
            </label>
            <label className="block">Έργο
              <input className="border p-1 w-full bg-gray-50" value={project.projectName} readOnly />
            </label>
            <label className="block">Μονάδα
              <input className="border p-1 w-full bg-gray-50" value={project.unit || ''} readOnly />
            </label>
            <div />
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
                    <button disabled={uploadedWastePlan} className={`w-full px-3 py-2 rounded ${uploadedWastePlan ? 'bg-green-100 text-green-700 cursor-default' : 'bg-green-600 text-white'}`} onClick={() => submitProjectDoc('Σχέδιο Διαχείρισης Αποβλήτων', wastePlanFile, () => setWastePlanFile(null))}>
                      {uploadedWastePlan ? 'Ανέβηκε' : 'Ανέβασμα'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Συμφωνία Διαχείρισης Αποβλήτων */}
              <div className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Συμφωνία Διαχείρισης Αποβλήτων</div>
                  {/* καμία ένδειξη τίτλου/τικ */}
                </div>
                {/* Αν υπάρχει αριθμός συμφωνίας, δείχνουμε τον αριθμό και PDF, αλλιώς εμφάνιση ενημερωτικού κειμένου */}
                {project.agreement ? (
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
                ) : (
                  <div className="text-xs text-gray-500">Δημιουργείται αυτόματα μετά την αποδοχή της μονάδας</div>
                )}
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
          <Btn className="bg-gray-100" onClick={onBack}>← Επιστροφή</Btn>
        </div>
        <h2 className="text-xl font-bold">{project.projectName}</h2>
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
const Producer = ({ projects, transports, onAddProject, onApproveTransport, onRejectTransport, onOpenProject, onRequestTransfer, onCancelRequest, notifications, onJump, deepLink, onClearTransNew, onClearProjectsNew }: any) => {
  const [filter, setFilter] = useState({ producer: '', project: '', from: '', to: '' });
  const [exportOpen, setExportOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [tab, setTab] = useState('projects');
  const [menuOpen, setMenuOpen] = useState(false);
  const [subTab, setSubTab] = useState('active');
  const [projSubTab, setProjSubTab] = useState<'active' | 'completed'>('active');
  const [showProjectFilters, setShowProjectFilters] = useState(false);
  const [showTransferFilters, setShowTransferFilters] = useState(false);
  const [reqSubTab, setReqSubTab] = useState<'all' | 'transfers' | 'bins'>('all');
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
    // allow choosing a transporter outside the platform as a manual entry
    transporterMode: 'platform' as 'platform' | 'manual',
    otherTransporter: '',
    collectiveSystem: 'ΟΑΚ',
    managerName: '', managerPhone: '', managerEmail: '',
    wasteLines: EKA.map(e => ({ code: e.code, description: e.description, quantity: '' })),
  }));
  const totalEstimated = sumWaste(pForm.wasteLines);

  const submitNew = () => {
    if (!pForm.projectName || !pForm.address) return;
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
    onAddProject({ id: gid(), producer: myProducer, ...rest, transporter: finalTransporter, offPlatformTransporter, estimated: totalEstimated, agreement: 'Σε εκκρεμότητα', agreementDate: null, isNew: true });
  setShowNew(false);
  setPForm({ ...pForm, projectName: '', address: '', start: today(), end: today(), transporterMode: 'platform', otherTransporter: '', collectiveSystem: 'ΟΑΚ', managerName: '', managerPhone: '', managerEmail: '', wasteLines: EKA.map(e => ({ code: e.code, description: e.description, quantity: '' })) });
  };

  const tabs = [
    { key: 'projects', label: 'Έργα', count: A(projects).filter((p:any)=> !!p.isNew).length },
    { key: 'transfers', label: 'Μεταφορές', count: A(transports).filter((t:any)=> !!t.isNew).length },
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
        <div className="flex items-center gap-3">
          <BellBtn items={A(notifications).filter((n: any) => n.target?.page === 'producer')} onJump={onJump} />
          <div className="relative">
            <button aria-label="Μενού" title="Μενού" onClick={() => setMenuOpen(v => !v)} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200">☰</button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white border rounded shadow-lg z-20">
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); alert('Προφίλ'); }}>Προφίλ</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); setTab('requests'); }}>Αιτήματα</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600" onClick={() => { setMenuOpen(false); alert('Αποσύνδεση'); }}>Αποσύνδεση</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {tab !== 'requests' && (
  <TabBar tabs={tabs} active={tab} onChange={(k: string) => { const key = typeof k === 'string' ? k : 'aitimata'; if (key==='transfers') { onClearTransNew && onClearTransNew(); } if (key==='projects') { onClearProjectsNew && onClearProjectsNew(); } setTab(key); }} />
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
            <Btn className="bg-green-600 text-white" onClick={() => setShowNew(true)}>+ Νέο Έργο</Btn>
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
                      <span>{p.transporter}</span>
                      {p.offPlatformTransporter && (
                        <span className="ml-2 text-xs text-orange-700">(εκτός πλατφόρμας)</span>
                      )}
                    </td>
                    <td className="border text-center">{p.agreement}</td>
                  </tr>
                ));
              })()}
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
                <div className="col-span-2">
                  <label className="block mb-1">Μεταφορέας</label>
                  <div className="flex items-center gap-4 mb-2 text-sm">
                    <label className="inline-flex items-center gap-1">
                      <input type="radio" name="p_trans_mode" value="platform" checked={pForm.transporterMode === 'platform'} onChange={() => setPForm({ ...pForm, transporterMode: 'platform' })} />
                      <span>Στην πλατφόρμα</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input type="radio" name="p_trans_mode" value="manual" checked={pForm.transporterMode === 'manual'} onChange={() => setPForm({ ...pForm, transporterMode: 'manual' })} />
                      <span>Εκτός πλατφόρμας</span>
                    </label>
                  </div>
                  {pForm.transporterMode === 'platform' ? (
                    <select className="border p-1 w-full" value={pForm.transporter} onChange={(e: any) => setPForm({ ...pForm, transporter: e.target.value })}>
                      {TRANSPORTERS.map((t: string) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                  ) : (
                    <input className="border p-1 w-full" placeholder="Όνομα μεταφορέα (εκτός πλατφόρμας)" value={pForm.otherTransporter} onChange={(e: any) => setPForm({ ...pForm, otherTransporter: e.target.value })} />
                  )}
                </div>
                <label>Συλλογικό Σύστημα
                  <select className="border p-1 w-full" value={pForm.collectiveSystem} onChange={(e: any) => setPForm({ ...pForm, collectiveSystem: e.target.value })}>
                    <option value="ΟΑΚ">ΟΑΚ</option>
                    <option value="ΚΟΔΑ">ΚΟΔΑ</option>
                  </select>
                </label>
                <label className="col-span-2">Υπεύθυνος έργου
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
  const [tab, setTab] = useState('transfers');
  const [show, setShow] = useState(false);
  const opts = useMemo(() => plates(), []);
  const [form, setForm] = useState({ producer: '', project: '', address: '', unit: '', vehicle: '', date: today(), time: '08:00', viaStation: false });
  const [acceptModal, setAcceptModal] = useState<any>({ open: false, row: null, vehicle: '', date: today(), time: '08:00' });
  const [menuOpen, setMenuOpen] = useState(false);

  const onSubmit = () => {
    if (!form.producer || !form.project) return;
    const proj = A(projects).find((p: any) => p.producer === form.producer && p.projectName === form.project);
    const vehicleValue = form.vehicle === 'CUSTOM' ? (customVehicle || opts[0]) : (form.vehicle || opts[0]);
    onAddTransport({ id: gid(), producer: form.producer, project: form.project, projectId: proj?.id, address: form.address || proj?.address || '-', unit: form.unit || proj?.unit || '-', vehicle: vehicleValue, date: form.date, time: form.time, status: 'Αναμονή αποδοχής παραγωγού', approvedByProducer: false, receivedByUnit: false, fromProducer: false, isNew: true });
    addNotif && addNotif('Νέο Αίτημα Μεταφοράς (Μεταφορέα)', `${form.producer} / ${form.project}`, { page: 'producer', tab: 'aitimata' });
    setShow(false);
    setForm({ producer: '', project: '', address: '', unit: '', vehicle: '', date: today(), time: '08:00', viaStation: false });
  };

  const producerReq = (() => {
    const msDay = 24 * 60 * 60 * 1000;
    const now = new Date();
    return A(transports)
      .filter((t: any) => !t.approvedByProducer && !t.receivedByUnit && t.fromProducer)
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
  // Transporter identity (web) — assumes Euroskip is the logged-in transporter
  const myTransporter = 'Euroskip';
  const tProjects = A(projects).filter((p: any) => p.transporter === myTransporter || p.creatorTransporter === myTransporter);
  const [projSubTab, setProjSubTab] = useState<'iwm' | 'external'>('iwm');
  const [addExternalOpen, setAddExternalOpen] = useState(false);
  const [extForm, setExtForm] = useState({ producer: '', projectName: '', address: '', unit: '', managerName: '', managerPhone: '' });
  const tabs = [
    { key: 'aitimata', label: 'Αιτήματα', count: A(transports).filter((t:any)=> !!t.isNew).length },
    { key: 'projects', label: 'Έργα', count: A(projects).filter((p:any)=> !!p.isNew).length },
    { key: 'transfers', label: 'Έντυπα Αναγνώρισης και Παρακολούθησης', count: A(transports).filter((t:any)=> !!t.isNew).length },
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
                          setAcceptModal({ open: true, row: t, vehicle: plates()[0], date: t.date || today(), time: t.time || '08:00', projectInfo: pr });
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
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); alert('Προφίλ'); }}>Προφίλ</button>
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

      {tab === 'projects' && (
        (() => {
          const all = A(tProjects);
          const iwms = all.filter((p: any) => !p.external);
          const others = all.filter((p: any) => !!p.external);
          const list = projSubTab === 'iwm' ? iwms : others;
          return (
            <div className="bg-white border rounded p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Έργα που σας έχουν ορίσει ως μεταφορέα</div>
                <div className="text-xs text-gray-600">Σύνολο: <span className="font-medium">{all.length}</span></div>
              </div>
              <div className="inline-flex bg-gray-100 p-1 rounded-full">
                <button onClick={() => setProjSubTab('iwm')} className={`px-3 py-1.5 rounded-full text-sm ${projSubTab === 'iwm' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Έργα IWM</button>
                <button onClick={() => setProjSubTab('external')} className={`px-3 py-1.5 rounded-full text-sm ${projSubTab === 'external' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>Έργα εκτός IWM</button>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">Σύνολο: <span className="font-medium">{list.length}</span></div>
                {projSubTab === 'external' && (
                  <button className="px-3 py-2 rounded bg-blue-600 text-white text-sm" onClick={() => setAddExternalOpen(true)}>+ Προσθήκη Έργου (εκτός IWM)</button>
                )}
              </div>
              <table className="w-full border bg-white text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2">Α/Α</th>
                    <th className="border px-2">Παραγωγός</th>
                    <th className="border px-2">Έργο</th>
                    <th className="border px-2">Διεύθυνση</th>
                    <th className="border px-2">Μονάδα</th>
                    <th className="border px-2">Υπεύθυνος</th>
                    <th className="border px-2">Τηλέφωνο</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr><td className="border text-center p-3" colSpan={7}>—</td></tr>
                  ) : (
                    list.map((p: any, i: number) => (
                      <tr key={p.id}>
                        <td className="border text-center">{i + 1}</td>
                        <td className="border text-center">{p.producer}</td>
                        <td className="border text-center">{p.projectName}</td>
                        <td className="border text-center">{p.address || '-'}</td>
                        <td className="border text-center">{p.unit || '-'}</td>
                        <td className="border text-center">{p.managerName || '-'}</td>
                        <td className="border text-center">{p.managerPhone || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {addExternalOpen && (
                <Modal title="Προσθήκη Έργου (εκτός IWM)" onClose={() => setAddExternalOpen(false)} onSubmit={() => {
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
                  onAddProject && onAddProject(obj);
                  setAddExternalOpen(false);
                  setExtForm({ producer: '', projectName: '', address: '', unit: '', managerName: '', managerPhone: '' });
                  setProjSubTab('external');
                }}>
                  <label className="block text-sm">Παραγωγός
                    <input className="border p-1 w-full" placeholder="Όνομα Παραγωγού" value={extForm.producer} onChange={(e: any) => setExtForm({ ...extForm, producer: e.target.value })} />
                  </label>
                  <label className="block text-sm">Όνομα Έργου
                    <input className="border p-1 w-full" placeholder="Π.χ. Ανακαίνιση" value={extForm.projectName} onChange={(e: any) => setExtForm({ ...extForm, projectName: e.target.value })} />
                  </label>
                  <label className="block text-sm">Διεύθυνση
                    <input className="border p-1 w-full" placeholder="Οδός, Αριθμός, Πόλη" value={extForm.address} onChange={(e: any) => setExtForm({ ...extForm, address: e.target.value })} />
                  </label>
                  <label className="block text-sm">Μονάδα
                    <select className="border p-1 w-full" value={extForm.unit} onChange={(e: any) => setExtForm({ ...extForm, unit: e.target.value })}>
                      <option value="">— Επιλογή Μονάδας —</option>
                      {UNITS.map((u: string) => (<option key={u} value={u}>{u}</option>))}
                    </select>
                  </label>
                  {/* Δεν ζητάμε μεταφορέα στο web modal του μεταφορέα: ο μεταφορέας είναι πάντα ο τρέχων χρήστης. */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">Υπεύθυνος (προαιρετικό)
                      <input className="border p-1 w-full" placeholder="Ονοματεπώνυμο" value={extForm.managerName} onChange={(e: any) => setExtForm({ ...extForm, managerName: e.target.value })} />
                    </label>
                    <label className="block text-sm">Τηλέφωνο (προαιρετικό)
                      <input className="border p-1 w-full" placeholder="69xxxxxxxx" value={extForm.managerPhone} onChange={(e: any) => setExtForm({ ...extForm, managerPhone: e.target.value })} />
                    </label>
                  </div>
                </Modal>
              )}
            </div>
          );
        })()
      )}

      {/* Notifications tab removed from transporter web per requirements */}

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
const Unit = ({ projects, transports, onAcceptAgreement, onRejectAgreement, onReceive, onFinalize, notifications, onJump, onOpenProject, deepLink, onClearTransNew, onClearProjectsNew, onClearTransNewWhere }: any) => {
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
  const tabs = [
    { key: 'projects', label: 'Έργα', count: A(projects).filter((p: any) => !!p.isNew).length },
    { key: 'weigh', label: 'Ζύγιση' },
    { key: 'transfers', label: 'Μεταφορές', count: A(transports).filter((t: any) => !!t.isNew).length },
    { key: 'slips', label: 'Δελτία Παραλαβής' },
    { key: 'products', label: 'Προϊόντα' },
    { key: 'stats', label: 'Στατιστικά' },
  ];

  const [weighOpen, setWeighOpen] = useState(false);
  // Unit Projects sub-tab: Με συμφωνία (εντός IWM/από παραγωγό) vs Χωρίς συμφωνία (εκτός IWM/από μεταφορέα)
  const [unitProjSub, setUnitProjSub] = useState<'with' | 'without'>('with');
  // weighData holds id, weight, eka
  const [weighData, setWeighData] = useState<any>({ id: null as any, weight: '', eka: EKA[0].code });
  // Stats tabs/subtabs state
  const [statsTab, setStatsTab] = useState<'overview' | 'projects' | 'deliveries' | 'forecast' | 'finance' | 'alerts'>('overview');
  const [statsSub, setStatsSub] = useState<string>('kpis');
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
    onReceive && onReceive(weighData.id, parseFloat(weighData.weight || '0'), weighData.eka);
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
      <button className="flex items-center gap-2 px-2 py-1 text-gray-700 hover:text-blue-700" onClick={() => setShowFilters(v => !v)} title="Φίλτρα">
        <Filter className="w-4 h-4" />
        <span className="text-sm hidden sm:inline">Φίλτρα</span>
      </button>
    )}
  </div>
  {showFilters && tab !== 'weigh' && (
    <div className="mb-2">
      <FilterBar producers={uniqueProducers(projects)} projects={projectsByProducer(projects, filter.producer)} value={filter} onChange={setFilter} showProject={true} />
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
        <div className="bg-white border rounded p-3">
          {/* Subtabs for transfers */}
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
                        <td className="border text-center">{t.project}</td>
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
                            <td className="border text-center">{t.project}</td>
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
            </>
          )}
        </div>
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
          />
        </div>
      )}

      {tab === 'products' && (
        <div className="bg-white border rounded p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Προϊόντα</div>
            <div className="flex items-center gap-2 text-sm">
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
          </div>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2">Α/Α</th>
                <th className="border px-2">Όνομα</th>
                <th className="border px-2">Τιμή (€)</th>
              </tr>
            </thead>
            <tbody>
              {unitProducts.length === 0 ? (
                <tr><td className="border text-center p-2" colSpan={3}>—</td></tr>
              ) : (
                unitProducts.map((p: any, i: number) => (
                  <tr key={p.id}>
                    <td className="border text-center">{i + 1}</td>
                    <td className="border px-2">{p.name}</td>
                    <td className="border text-center">{p.price}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Orders table */}
          <div className="font-semibold mt-6 mb-2">Παραγγελίες</div>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2">Α/Α</th>
                <th className="border px-2">Εργολάβος</th>
                <th className="border px-2">Έργο</th>
                <th className="border px-2">Υπεύθυνος</th>
                <th className="border px-2">Τηλ.</th>
                <th className="border px-2">Προϊόν</th>
                <th className="border px-2">Ποσότητα</th>
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
                      {DEBTOR_OPTIONS.map((d: string)=> (<option key={d} value={d}>{d}</option>))}
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
            onRejectRequest={onRejectRequest}
            addNotif={addNotif}
            onFinalizeDelivery={onFinalizeDelivery}
            onUpdateTransport={onUpdateTransport}
          />
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

function UnitTabletApp({ projects, transports, onReceive, onFinalize, onAddTransport, addNotif, lockTab, hideChrome, onNavigateUnit }: any) {
  const [filter, setFilter] = useState<any>({ producer: '', project: '', from: '', to: '' });
  const [weighOpen, setWeighOpen] = useState(false);
  const [weighData, setWeighData] = useState<any>({ id: '', weight: '', eka: (EKA[0] && EKA[0].code) || '', debtor: '' });
  const [tab, setTab] = useState<'weigh' | 'awaiting' | 'completed' | 'slips'>(lockTab || 'weigh');
  const [unitSignModal, setUnitSignModal] = useState<any>({ open: false, id: null, signature: '' });
  const DEBTOR_OPTIONS = ['Εργολάβος Α','Εργολάβος Β','Εργολάβος Γ','Εταιρεία Skip 1','Εταιρεία Skip 2','Εταιρεία Skip 3'];

  // Local slips store for independent weighing (not linked to transports)
  const [slips, setSlips] = useState<any[]>([]);
  const [slipsFilter, setSlipsFilter] = useState<any>({ producer: '', project: '', debtor: '', transporter: '', vehicle: '', from: '', to: '' });
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
      projectId: undefined,
      unit: '-',
      debtor: (wForm.debtor || '-'),
      transporter: (wForm.transporter || '-'),
      vehicle: plate,
      ekaCategory: wForm.eka,
      weight: w.toFixed(2),
    };
    setSlips((prev: any[]) => [row, ...prev]);
    // If transporter is on our platform, create a pending delivery record and notify transporter mobile
    const inPlatform = new Set(['Euroskip', 'Skip Hire']);
    if (wForm.transporter && inPlatform.has(wForm.transporter)) {
      const t = {
        id: gid(),
        producer: row.producer,
        project: row.project,
        projectId: undefined,
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
      };
      try { onAddTransport && onAddTransport(t); } catch {}
      try { addNotif && addNotif('Παράδοση στη μονάδα', `${row.producer} / ${row.project} — Παραλαβή (εκτός IWM)`, { page: 'transporter', tab: 'transfers' }); } catch {}
    }
    if (andPrint) try { pdfSlip(row); } catch {}
    // If matched an existing open transfer, update it and redirect to Automatic tab
    if (matchId) {
      try { onReceive && onReceive(matchId, w, wForm.eka); } catch {}
      if (onNavigateUnit) {
        try { onNavigateUnit('transfers', 'awaiting'); } catch {}
      } else {
        setTab('weigh' as any);
        setWSubTab('open');
      }
    } else {
      // otherwise, go to slips as before
      setTab('slips' as any);
    }
  setWForm({ project: '', producer: '', debtor: '', transporter: '', plate: '', eka: (EKA[0] && EKA[0].code) || '', weight: '' });
  };

  const submitWeighSlip = (andPrint = false) => {
    const plate = (wForm.plate || '').trim();
    if (!wForm.project) return alert('Συμπλήρωσε Έργο');
    if (!plate) return alert('Συμπλήρωσε Αρ. Οχήματος');
    if (!wForm.eka) return alert('Επίλεξε κατηγορία ΕΚΑ');
    // If project is not known (platform/offline), show central popup flow
    const platformAll = new Set(A(projects).map((p:any)=> p.projectName).filter(Boolean));
    const offlineAll = new Set(Object.values(offlineProjects || {}).flat());
    const isKnown = platformAll.has(wForm.project) || offlineAll.has(wForm.project);
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
    onReceive(weighData.id, parseFloat(weighData.weight || '0'), weighData.eka);
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
  };

  return (
    <div className="flex flex-col h-full">
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

              {tab === 'weigh' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setWSubTab('receive')} className={`px-3 py-2 ${wSubTab === 'receive' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Χειροκίνητη Παραλαβή</button>
                      <button onClick={() => setWSubTab('open')} className={`px-3 py-2 ${wSubTab === 'open' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Αυτόματη Παραλαβή</button>
                    </div>
                    <button className="px-2 py-1 border rounded bg-gray-50 hover:bg-gray-100 text-sm" onClick={() => setAdminOpen(true)}>Database</button>
                  </div>

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
                      {(() => {
                        // Dynamic platform data
                        const platformProducers = [...new Set(A(projects).map((p: any) => p.producer).filter(Boolean))];
                        const allProducers = Array.from(new Set([...(platformProducers as string[]), ...offlineProducers])).sort();
                        const projectOpts = (() => {
                          if (wForm.producer) {
                            const platformForProducer = A(projects).filter((p:any)=> p.producer === wForm.producer).map((p:any)=> p.projectName).filter(Boolean);
                            const offlineForProducer = offlineProjects[wForm.producer] || [];
                            return Array.from(new Set([...(platformForProducer as string[]), ...offlineForProducer])).sort();
                          }
                          const platformAll = A(projects).map((p:any)=> p.projectName).filter(Boolean);
                          const offlineAll = Object.values(offlineProjects).flat();
                          return Array.from(new Set([...(platformAll as string[]), ...offlineAll])).sort();
                        })();
                        return (
                          <>
                            {/* Row 1: Plate, Transporter */}
                            <label>Αρ. Οχήματος
                              {(() => {
                                const trSel = (wForm.transporter || '').trim();
                                const basePlates = trSel ? (transporterPlates[trSel] || []) : Object.values(transporterPlates).flat();
                                const offlinePlatesAll = trSel ? (offlineTransPlates[trSel] || []) : Object.values(offlineTransPlates).flat();
                                const allPlates: string[] = Array.from(new Set([...(basePlates as string[]), ...(offlinePlatesAll as string[])]));
                                const plateOwner: Record<string,string> = {};
                                Object.entries(transporterPlates).forEach(([tr, arr]) => { (arr||[]).forEach((pl:string)=> { plateOwner[pl] = tr; }); });
                                Object.entries(offlineTransPlates).forEach(([tr, arr]) => { (arr||[]).forEach((pl:string)=> { plateOwner[pl] = tr; }); });
                                return (
                                  <>
                                    <input
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
                                  const selected = wForm.transporter;
                                  const selIsPlatform = selected ? inPlatform.has(selected) : false;
                                  return (
                                    <div className="relative flex-1">
                                      <button type="button" className="w-full border p-1 text-left bg-white rounded" onClick={() => setTrDropOpen(v => !v)}>
                                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${selected ? (selIsPlatform ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-300'}`}></span>
                                        {selected || '— Επιλογή —'}
                                      </button>
                                      {trDropOpen && (
                                        <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow">
                                          <button className="w-full text-left px-2 py-1 hover:bg-gray-50" onClick={() => { setWForm((f:any)=> ({ ...f, transporter: '' })); setTrDropOpen(false); }}>
                                            <span className="inline-block w-2 h-2 rounded-full mr-2 bg-gray-300"></span>
                                            — Επιλογή —
                                          </button>
                                          {options.map((name: string) => (
                                            <button key={name} className="w-full text-left px-2 py-1 hover:bg-gray-50" onClick={() => { setWForm((f:any)=> ({ ...f, transporter: name })); setTrDropOpen(false); }}>
                                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${inPlatform.has(name) ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                              {name}
                                            </button>
                                          ))}
                                        </div>
                                      )}
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
                                    setWForm((f: any) => ({ ...f, project: val }));
                                    if (!wForm.producer && val) {
                                      const match = A(projects).find((p:any)=> p.projectName === val);
                                      if (match && match.producer) {
                                        setWForm((f:any)=> ({ ...f, producer: match.producer }));
                                      } else {
                                        const found = Object.entries(offlineProjects).find(([,list])=> Array.isArray(list) && list.includes(val));
                                        if (found) {
                                          const [prod] = found;
                                          setWForm((f:any)=> ({ ...f, producer: prod }));
                                        }
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
                            <label>Παραγωγός
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
                                  {Array.from(new Set([...
                                    DEBTOR_OPTIONS,
                                    ...offlineDebtors,
                                  ])).map((d: string)=> (<option key={d} value={d}>{d}</option>))}
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
                        <button className="px-3 py-2 rounded bg-gray-200" onClick={() => setWForm({ project: '', producer: '', debtor: '', transporter: '', plate: '', eka: (EKA[0] && EKA[0].code) || '', weight: '', signature: '' })}>Καθαρισμός</button>
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
                  const slipVehicles = slipsFilter.transporter
                    ? [...new Set(A(slips).filter((s:any)=> s.transporter === slipsFilter.transporter).map((s:any)=> s.vehicle).filter(Boolean))]
                    : slipVehiclesAll;
                  const inRange = (d: string) => {
                    if (!d) return true;
                    const dd = d;
                    if (slipsFilter.from && dd < slipsFilter.from) return false;
                    if (slipsFilter.to && dd > slipsFilter.to) return false;
                    return true;
                  };
                  const rows = A(slips).filter((s:any)=> {
                    if (slipsFilter.producer && s.producer !== slipsFilter.producer) return false;
                    if (slipsFilter.project && s.project !== slipsFilter.project) return false;
                    if (slipsFilter.debtor && s.debtor !== slipsFilter.debtor) return false;
                    if (slipsFilter.transporter && s.transporter !== slipsFilter.transporter) return false;
                    if (slipsFilter.vehicle && s.vehicle !== slipsFilter.vehicle) return false;
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
                        <div className="flex items-center gap-2">
                          <button className="px-3 py-2 text-sm rounded-lg border border-gray-300" onClick={()=> setSlipsFilter({ producer:'', project:'', debtor:'', transporter:'', vehicle:'', from:'', to:'' })}>Επαναφορά</button>
                          <button className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white" onClick={exportCSV}>Εξαγωγή CSV</button>
                        </div>
                      </div>

                      {/* Filters Card */}
                      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Παραγωγός</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={slipsFilter.producer} onChange={(e:any)=> setSlipsFilter({ ...slipsFilter, producer: e.target.value })}>
                              <option value="">— Όλοι —</option>
                              {slipProducers.map((p:string)=>(<option key={p} value={p}>{p}</option>))}
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Έργο</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={slipsFilter.project} onChange={(e:any)=> setSlipsFilter({ ...slipsFilter, project: e.target.value })}>
                              <option value="">— Όλα —</option>
                              {slipProjects.map((p:string)=>(<option key={p} value={p}>{p}</option>))}
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Χρεώστης</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={slipsFilter.debtor} onChange={(e:any)=> setSlipsFilter({ ...slipsFilter, debtor: e.target.value })}>
                              <option value="">— Όλοι —</option>
                              {slipDebtors.map((p:string)=>(<option key={p} value={p}>{p}</option>))}
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Μεταφορέας</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={slipsFilter.transporter} onChange={(e:any)=> setSlipsFilter({ ...slipsFilter, transporter: e.target.value, vehicle: '' })}>
                              <option value="">— Όλοι —</option>
                              {slipTransporters.map((p:string)=>(<option key={p} value={p}>{p}</option>))}
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Αρ. Οχήματος</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={slipsFilter.vehicle} onChange={(e:any)=> setSlipsFilter({ ...slipsFilter, vehicle: e.target.value })}>
                              <option value="">— Όλα —</option>
                              {slipVehicles.map((v:string)=>(<option key={v} value={v}>{v}</option>))}
                            </select>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Από</label>
                            <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={slipsFilter.from} onChange={(e:any)=> setSlipsFilter({ ...slipsFilter, from: e.target.value })} />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Έως</label>
                            <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={slipsFilter.to} onChange={(e:any)=> setSlipsFilter({ ...slipsFilter, to: e.target.value })} />
                          </div>
                        </div>
                      </div>

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
                        <div>
                          <div className="text-base font-semibold">Ολοκληρωμένες</div>
                          <div className="text-xs text-gray-600">Εγγραφές: <span className="font-medium">{rows.length}</span> • Σύνολο βαρών: <span className="font-medium">{totalWeight.toFixed(2)} tn</span></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="px-3 py-2 text-sm rounded-lg border border-gray-300" onClick={()=> setCompletedFilter({ producer:'', project:'', transporter:'', vehicle:'', from:'', to:'' })}>Επαναφορά</button>
                          <button className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white" onClick={()=>{
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
                                  <tr key={t.id} className="hover:bg-gray-50">
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
                      {DEBTOR_OPTIONS.map((d: string)=> (<option key={d} value={d}>{d}</option>))}
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
                        notify(rt === 'new-bin' ? 'Στάλθηκε αίτημα νέου κάδου' : rt === 'move-bin' ? 'Στάλθηκε αίτημα μεταφοράς κάδου' : 'Στάλθηκε αίτημα αλλαγής κάδου');
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
                        notify('Η παραγγελία καταχωρήθηκε.');
                        setShow(false);
                        setNtProjectId('');
                        setProdOrderForm({ product: '', quantity: '' });
                        setNewReqTarget('transporter');
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

function EcoApp({ projects, transports, onAddTransport, notifications, onJump, onAcceptRequest, onRejectRequest, addNotif, onFinalizeDelivery, onUpdateTransport, onAddProject }: any) {
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

  const VEH = ['ΚΥΧ1234', 'ΑΑΖ5678', 'ΒΒΚ4321', 'ΝΟΠ9988'];
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
  const myTransporter = 'Euroskip';
  const tProjects = A(projects).filter((p: any) => p.transporter === myTransporter || p.creatorTransporter === myTransporter);
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
    onAddProject && onAddProject(obj);
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
              {A(projects)
                .filter((p: any) => p.producer === producer && !p.offPlatformTransporter)
                .map((pr: any) => (<option key={pr.id} value={pr.projectName}>{pr.projectName}</option>))}
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
                      {plates().map((pl: string) => (<option key={pl} value={pl}>{pl}</option>))}
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
                setMobileSignModal({ open: true, row, vehicle: row.vehicle || VEH[0], date: row.date || today(), time: row.time || '08:00', step: 2, producerSignature: '', transporterSignature: '', projectInfo: pr, producerSignMode: pr?.external ? 'here' : 'notify' });
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
  const filteredDelivery = A(delivery);

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
              {producerMode === 'web' ? (
            selectedProject ? (
              <ProjectDetails project={selectedProject} transports={transports} onBack={() => setSelectedProject(null)} onRequestTransfer={requestTransfer} onCancelRequest={cancelRequest} />
            ) : (
                  <Producer projects={projects} transports={transports} onAddProject={addProject} onApproveTransport={approveTransport} onRejectTransport={rejectTransport} onOpenProject={(p: any) => setSelectedProject(p)} onRequestTransfer={requestTransfer} onCancelRequest={cancelRequest} notifications={notifications} onJump={jumpByNotif} deepLink={deepLink} onClearTransNew={clearTransNew} onClearProjectsNew={clearProjectsNew} />
            )
          ) : (
              <ProducerMobileFrame projects={projects} transports={transports} onApprove={approveTransport} onReject={rejectTransport} onRequest={requestTransfer} onCancelRequest={cancelRequest} onDismissRequest={dismissRequest} notifications={notifications} onJump={jumpByNotif} deepLink={deepLink} onOpenProject={(p: any) => setSelectedProject(p)} onClearTransNew={clearTransNew} onClearProjectsNew={clearProjectsNew} />
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
                <Btn className={unitMode === 'web' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setUnitMode('web')}>🌐 Web</Btn>
                <Btn className={unitMode === 'tablet' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setUnitMode('tablet')}>📱 Tablet</Btn>
              </div>
              {unitMode === 'web' ? (
                <Unit projects={projects} transports={transports} onAcceptAgreement={acceptAgreement} onRejectAgreement={rejectAgreement} onReceive={unitReceive} onFinalize={finalizeUnitDelivery} notifications={notifications} onJump={jumpByNotif} onOpenProject={(p: any) => { setSelectedProject(p); setPage('projectView'); }} deepLink={deepLink} onClearTransNew={clearTransNew} onClearProjectsNew={clearProjectsNew} onClearTransNewWhere={clearTransNewWhere} />
              ) : (
                <UnitTabletFrame projects={projects} transports={transports} onReceive={unitReceive} onFinalize={finalizeUnitDelivery} onAddTransport={addTransport} addNotif={addNotif} />
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
