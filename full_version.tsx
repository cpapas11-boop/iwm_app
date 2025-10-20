import React, { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import { Bell, Inbox, Truck, Factory, FileText, CheckCircle2, Clock } from 'lucide-react';

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
  d.text('ΕΝΤΥΠΟ ΠΑΡΑΚΟΛΟΥΘΗΣΗΣ ΜΕΤΑΦΟΡΑΣ', 14, 18);
  d.setFontSize(11);
  d.text(`Παραγωγός: ${t.producer || '-'}`, 14, 32);
  d.text(`Έργο: ${t.project || '-'}`, 14, 40);
  d.text(`Διεύθυνση: ${t.address || '-'}`, 14, 48);
  d.text(`Μονάδα: ${t.unit || '-'}`, 14, 56);
  d.text(`Ημ/νία: ${t.date || '-'}`, 14, 64);
  d.text(`Όχημα: ${t.vehicle || '-'}`, 14, 72);
  if (t.approvedByProducer) d.text('✔ Παραδόθηκε στον Μεταφορέα', 14, 82);
  if (t.receivedByUnit) {
    d.text('✔ Παραδόθηκε στη Μονάδα', 14, 90);
    d.text(`Ημ/νία παραλαβής: ${t.unitDate || '-'}`, 14, 98);
    d.text(`Βάρος: ${t.weight || '-'} tn`, 14, 106);
    d.text(`ΕΚΑ: ${t.ekaCategory || '-'}`, 14, 114);
  }
  d.save(`transfer_${(t.project || 'project').replace(/\s+/g, '_')}.pdf`);
};

const pdfAgreement = (p: any) => {
  const d = new jsPDF();
  d.setFontSize(14);
  d.text('ΣΥΜΦΩΝΙΑ ΑΝΑΚΥΚΛΩΣΗΣ ΑΕΚΚ', 14, 18);
  d.setFontSize(11);
  d.text(`Παραγωγός: ${p.producer}`, 14, 32);
  d.text(`Έργο: ${p.projectName}`, 14, 40);
  d.text(`Διεύθυνση: ${p.address}`, 14, 48);
  d.text(`Μονάδα: ${p.unit}`, 14, 56);
  d.text(`Αρ. Συμφωνίας: ${p.agreement}`, 14, 64);
  d.text(`Ημ/νία: ${fmt(p.agreementDate)}`, 14, 72);
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
    green: 'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-xs border ${m[tone]}`}>
      {children}
    </span>
  );
};

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
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded shadow-lg p-4 w-full max-w-3xl">
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

const FilterBar = ({ producers = [], projects = [], value, onChange, showProject = true, showProducer = true }: any) => (
  <div className="flex gap-2 items-center mb-3">
    {showProducer && (
      <select className="border p-1" value={value.producer || ''} onChange={(e: any) => onChange({ ...value, producer: e.target.value, project: '' })}>
        <option value="">— Όλοι οι Παραγωγοί —</option>
        {producers.map((p: string) => (<option key={p} value={p}>{p}</option>))}
      </select>
    )}
    {showProject && (
      <select className="border p-1" value={value.project || ''} onChange={(e: any) => onChange({ ...value, project: e.target.value })}>
        <option value="">— Όλα τα Έργα —</option>
        {projects.map((p: any) => (<option key={p.id} value={p.id}>{p.projectName}</option>))}
      </select>
    )}
    <label className="text-sm">Από <input type="date" className="border p-1 ml-1" value={value.from || ''} onChange={(e: any) => onChange({ ...value, from: e.target.value })} /></label>
    <label className="text-sm">Έως <input type="date" className="border p-1 ml-1" value={value.to || ''} onChange={(e: any) => onChange({ ...value, to: e.target.value })} /></label>
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
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold">{project.projectName}</h2>
        <div className="flex gap-2">
          <Btn className="bg-orange-600 text-white" onClick={() => onRequestTransfer(project)}>Αίτηση Μεταφοράς</Btn>
          <Btn className="bg-gray-100" onClick={onBack}>← Πίσω</Btn>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div className="bg-white rounded border p-3">
          <div className="font-semibold mb-2">Στοιχεία Έργου</div>
          <div>Διεύθυνση: {project.address}</div>
          <div>Ημ. Έναρξης: {fmt(project.start)}</div>
          <div>Ημ. Λήξης: {fmt(project.end)}</div>
          <div>Μονάδα: {project.unit}</div>
          <div>Μεταφορέας: {project.transporter}</div>
          <div>Υπεύθυνος: {project.managerName} — {project.managerPhone} — {project.managerEmail}</div>
          <div className="mt-2 font-semibold">ΕΚΑ/Ποσότητες (tn)</div>
          <ul className="list-disc ml-5">
            {A(project.wasteLines).map((w: any, i: number) => (
              <li key={i}>{w.code} — {w.description} — {w.quantity || 0}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* two detailed tables: pending deliveries and completed deliveries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                <th className="border px-2">Όνομα Έργου</th>
                <th className="border px-2">Διεύθυνση</th>
                <th className="border px-2">Ημ/νία Παραλαβής</th>
                <th className="border px-2">Ώρα</th>
                <th className="border px-2">Μεταφορέας</th>
                <th className="border px-2">Αρ. Αυτοκινήτου</th>
                <th className="border px-2">Μονάδα</th>
                <th className="border px-2">PDF</th>
              </tr>
            </thead>
            <tbody>
              {list.filter((t: any) => t.receivedByUnit).length === 0 ? (
                <tr><td className="border text-center p-3" colSpan={9}>—</td></tr>
              ) : (
                list.filter((t: any) => t.receivedByUnit).map((t: any, i: number) => (
                  <tr key={t.id}>
                    <td className="border text-center">{i + 1}</td>
                    <td className="border px-2">{project.projectName}</td>
                    <td className="border px-2">{t.address || project.address}</td>
                    <td className="border text-center">{fmt(t.unitDate || t.date)}</td>
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
  const [tab, setTab] = useState('projects');
  const [subTab, setSubTab] = useState('aitimata');
  const myProducer = 'Παραγωγός Α';
  const myTrans = A(transports).filter((t: any) => t.producer === myProducer);
  // apply page-level filters (producer is fixed to this producer)
  const filteredTransports = applyTransportFilter(transports, projects, filter, myProducer);
  const reqFromTransporter = filteredTransports.filter((t: any) => !t.approvedByProducer && !t.receivedByUnit && !t.fromProducer);
  const reqFromProducer = filteredTransports.filter((t: any) => !t.approvedByProducer && !t.receivedByUnit && t.fromProducer);
  const pendingActive = filteredTransports.filter((t: any) => t.approvedByProducer && !t.receivedByUnit);
  const completed = filteredTransports.filter((t: any) => t.receivedByUnit);

  const [showNew, setShowNew] = useState(false);
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
    { key: 'transfers', label: 'Μεταφορές', count: pendingActive.length + reqFromTransporter.length + reqFromProducer.length },
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
      {(tab === 'projects' || tab === 'transfers') && (
        <>
          <FilterBar producers={uniqueProducers(projects)} projects={projectsByProducer(projects, myProducer)} value={filter} onChange={setFilter} showProject={true} showProducer={false} />
          <div className="flex justify-end mb-2">
            <Btn className="bg-blue-600 text-white" onClick={() => setExportOpen(true)}>Ετήσια Έκθεση</Btn>
          </div>
        </>
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
          <div className="mb-3">
            <div className="flex gap-2">
              <button onClick={() => setSubTab('aitimata')} className={`px-3 py-2 ${subTab === 'aitimata' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Αιτήματα</button>
              <button onClick={() => setSubTab('active')} className={`px-3 py-2 ${subTab === 'active' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Εκκρεμείς</button>
              <button onClick={() => setSubTab('completed')} className={`px-3 py-2 ${subTab === 'completed' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-gray-500'}`}>Ολοκληρωμένες</button>
            </div>
          </div>

          {subTab === 'aitimata' && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white border rounded p-3">
                <div className="font-semibold mb-2">Αιτήματα Μεταφορέα</div>
                <table className="w-full border bg-white text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2">Α/Α</th>
                      <th className="border px-2">Έργο</th>
                      <th className="border px-2">Διεύθυνση</th>
                      <th className="border px-2">Ημ/νία</th>
                      <th className="border px-2">Ενέργεια</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reqFromTransporter.length ? reqFromTransporter.map((t: any, i: number) => (
                      <tr key={t.id} className={t.isNew ? 'bg-green-50' : ''}>
                        <td className="border text-center">{i + 1}</td>
                        <td className="border text-center">{t.project}</td>
                        <td className="border text-center">{t.address}</td>
                        <td className="border text-center">{fmt(t.date)}</td>
                        <td className="border text-center">
                          <div className="flex gap-2 justify-center">
                            <Btn className="bg-green-600 text-white" onClick={() => onApproveTransport(t.id)}>Αποδοχή</Btn>
                            <Btn className="bg-red-600 text-white" onClick={() => onRejectTransport(t.id)}>Απόρριψη</Btn>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td className="border text-center p-2" colSpan={5}>—</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-white border rounded p-3">
                <div className="font-semibold mb-2">Αιτήματα Παραγωγού</div>
                <table className="w-full border bg-white text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2">Α/Α</th>
                      <th className="border px-2">Έργο</th>
                      <th className="border px-2">Διεύθυνση</th>
                      <th className="border px-2">Ημ/νία</th>
                      <th className="border px-2">Κατάσταση</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reqFromProducer.length ? reqFromProducer.map((t: any, i: number) => (
                      <tr key={t.id} className={t.isNew ? 'bg-green-50' : ''}>
                        <td className="border text-center">{i + 1}</td>
                        <td className="border text-center">{t.project}</td>
                        <td className="border text-center">{t.address}</td>
                        <td className="border text-center">{fmt(t.date)}</td>
                        <td className="border text-center">
                          <Badge tone="orange"><Clock className="w-3 h-3" /><span>Αναμονή</span></Badge>
                        </td>
                      </tr>
                    )) : (
                      <tr><td className="border text-center p-2" colSpan={5}>—</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
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

      {tab === 'projects' && (
        <>
          <div className="flex justify-end mb-2"><Btn className="bg-green-600 text-white" onClick={() => setShowNew(true)}>+ Νέο Έργο</Btn></div>
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
              {applyProjectFilter(projects, filter, myProducer).map((p: any, i: number) => (
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

      {/* transfers subTabs render the pending/completed tables; duplicate block removed */}
    </div>
  );
};

/******** transporter (web) ********/
const Transporter = ({ projects, transports, onAddTransport, notifications, onJump, onAcceptRequest, addNotif, deepLink }: any) => {
  const [tab, setTab] = useState('aitimata');
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
  const pending = A(transports).filter((t: any) => t.approvedByProducer && !t.receivedByUnit);

  const tabs = [
    { key: 'aitimata', label: 'Αιτήματα', count: producerReq.length + carrierReq.length },
    { key: 'transfers', label: 'Μεταφορές', count: pending.length },
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
  const pending = A(transports).filter((t: any) => t.approvedByProducer && !t.receivedByUnit);
  const done = A(transports).filter((t: any) => t.receivedByUnit);
  const tabs = [
    { key: 'projects', label: 'Έργα', count: A(projects).filter((p: any) => p.agreement === 'Σε εκκρεμότητα').length },
    { key: 'transfers', label: 'Μεταφορές', count: pending.length },
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
  <FilterBar producers={uniqueProducers(projects)} projects={projectsByProducer(projects, filter.producer)} value={filter} onChange={setFilter} showProject={true} />
  <div className="flex justify-end mb-2"><Btn className="bg-blue-600 text-white" onClick={() => setExportOpen(true)}>Ετήσια Έκθεση</Btn></div>

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
                    <div className="flex gap-2 items-center justify-center">
                      <span className="text-blue-700 font-semibold">{p.agreement}</span>
                      <Btn className="bg-gray-100" onClick={() => pdfAgreement(p)}>PDF</Btn>
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
          <div className="font-semibold mb-2">Εκκρεμή Μεταφορές</div>
          <table className="w-full border text-sm mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2">Α/Α</th>
                <th className="border px-2">Παραγωγός</th>
                <th className="border px-2">Έργο</th>
                <th className="border px-2">Διεύθυνση</th>
                <th className="border px-2">Συμφωνία</th>
                <th className="border px-2">Παραλαβή</th>
              </tr>
            </thead>
            <tbody>
              {applyTransportFilter(transports, projects, filter).filter((t: any) => t.approvedByProducer && !t.receivedByUnit).length === 0 ? (
                <tr><td className="border text-center p-2" colSpan={6}>—</td></tr>
              ) : (
                applyTransportFilter(transports, projects, filter).filter((t: any) => t.approvedByProducer && !t.receivedByUnit).map((t: any, i: number) => {
                  const prj = A(projects).find((p: any) => p.id === t.projectId);
                  return (
                    <tr key={t.id} className={t.isNew ? 'bg-green-50' : ''}>
                      <td className="border text-center">{i + 1}</td>
                      <td className="border text-center">{t.producer}</td>
                      <td className="border text-center">{t.project}</td>
                      <td className="border text-center">{t.address}</td>
                      <td className="border text-center">{(prj && prj.agreement) || '—'}</td>
                      <td className="border text-center"><Btn className="bg-green-600 text-white" onClick={() => openWeigh(t)}>Παραλαβή</Btn></td>
                    </tr>
                  );
                })
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
                <th className="border px-2">Βάρος (tn)</th>
                <th className="border px-2">ΕΚΑ</th>
                <th className="border px-2">PDF</th>
              </tr>
            </thead>
            <tbody>
              {applyTransportFilter(transports, projects, filter).filter((t: any) => t.receivedByUnit).length === 0 ? (
                <tr><td className="border text-center p-2" colSpan={6}>—</td></tr>
              ) : (
                applyTransportFilter(transports, projects, filter).filter((t: any) => t.receivedByUnit).map((t: any, i: number) => (
                  <tr key={t.id}>
                    <td className="border text-center">{i + 1}</td>
                    <td className="border text-center">{t.producer}</td>
                    <td className="border text-center">{t.project}</td>
                    <td className="border text-center">{t.weight}</td>
                    <td className="border text-center">{t.ekaCategory}</td>
                    <td className="border text-center"><Btn className="bg-gray-100" onClick={() => pdfTransfer(t)}>PDF</Btn></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

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
function EcoMobileFrame({ projects, transports, onAddTransport, notifications, onJump, onAcceptRequest, addNotif }: any) {
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
          />
        </div>
      </div>
    </div>
  );
}

function EcoApp({ projects, transports, onAddTransport, notifications, onJump, onAcceptRequest, addNotif }: any) {
  // accept deepLink prop if passed via wrapper
  const deepLink = (arguments[0] as any).deepLink;
  const [tab, setTab] = useState('aitimata');
  const [show, setShow] = useState(false);
  const [producer, setProducer] = useState('');
  const [project, setProject] = useState('');
  const [unit, setUnit] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [time, setTime] = useState('08:00');

  const VEH = ['ΚΥΧ1234', 'ΑΑΖ5678', 'ΒΒΚ4321', 'ΝΟΠ9988'];
  const req = A(transports).filter((t: any) => !t.approvedByProducer && !t.receivedByUnit);
  const open = A(transports).filter((t: any) => t.approvedByProducer && !t.receivedByUnit);
  const done = A(transports).filter((t: any) => t.receivedByUnit);

  const handleNew = () => {
    if (!producer || !project || !unit || !vehicle) return;
    const pr = A(projects).find((p: any) => p.producer === producer && p.projectName === project);
    onAddTransport({ id: gid(), producer, project, projectId: pr?.id, address: pr?.address || '-', unit, vehicle, date: today(), time, status: 'Αναμονή αποδοχής παραγωγού', approvedByProducer: false, receivedByUnit: false, fromProducer: false, isNew: true });
    addNotif && addNotif('Νέο Αίτημα Μεταφοράς (Μεταφορέα)', `${producer} / ${project}`, { page: 'producer', tab: 'aitimata' });
    setShow(false); setProducer(''); setProject(''); setUnit(''); setVehicle('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      <div className="flex items-center justify-between p-2 border-b">
  <div className="font-semibold">Eco Mobile</div>
        <BellBtn items={A(notifications).filter((n: any) => n.target?.page === 'transporter')} onJump={onJump} />
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'aitimata' && !show && (
          <div className="p-3 space-y-2">
            {req.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400">Δεν υπάρχουν αιτήματα</div>
            ) : (
              req.map((r: any) => (
                <div key={r.id} className="bg-white border rounded-lg p-3">
                  <div className="font-semibold text-sm">{r.producer} — {r.project}</div>
                  <div className="text-xs text-gray-500">{fmt(r.date)} → {r.unit}</div>
                  <div className="mt-1 flex justify-between items-center">
                    <Badge tone={r.fromProducer ? 'orange' : 'gray'}>
                      {r.fromProducer ? (<Clock className="w-3 h-3" />) : (<FileText className="w-3 h-3" />)}
                      {r.fromProducer ? 'Αναμονή αποδοχής' : 'Υποβλήθηκε από μεταφορέα'}
                    </Badge>
                    {r.fromProducer && (
                      <Btn className="bg-green-600 text-white" onClick={() => onAcceptRequest(r, { vehicle: VEH[0], date: r.date, time: '08:00' })}>Αποδοχή</Btn>
                    )}
                  </div>
                </div>
              ))
            )}
            <div className="pt-3"><Btn className="bg-blue-600 text-white w-full" onClick={() => setShow(true)}>+ Νέα Μεταφορά</Btn></div>
          </div>
        )}

        {show && (
          <div className="p-4 space-y-3">
            <h2 className="text-lg font-bold">Νέα Μεταφορά</h2>
            <select value={producer} onChange={(e: any) => { setProducer(e.target.value); setProject(''); setUnit(''); }} className="border p-1 w-full rounded">
              <option value="">Επιλογή Παραγωγού</option>
              {[...new Set(A(projects).map((p: any) => p.producer))].map((p: string) => (<option key={p} value={p}>{p}</option>))}
            </select>
            <select value={project} onChange={(e: any) => { setProject(e.target.value); const u = A(projects).find((x: any) => x.producer === producer && x.projectName === e.target.value)?.unit; setUnit(u || ''); }} className="border p-1 w-full rounded">
              <option value="">Επιλογή Έργου</option>
              {A(projects).filter((p: any) => p.producer === producer).map((pr: any) => (<option key={pr.id} value={pr.projectName}>{pr.projectName}</option>))}
            </select>
            <input value={unit} readOnly placeholder="Μονάδα" className="border p-1 w-full rounded bg-gray-100" />
            <select value={vehicle} onChange={(e: any) => setVehicle(e.target.value)} className="border p-1 w-full rounded">
              <option value="">Επιλογή Οχήματος</option>
              {['ΚΥΧ1234', 'ΑΑΖ5678', 'ΒΒΚ4321', 'ΝΟΠ9988'].map((v: string) => (<option key={v} value={v}>{v}</option>))}
            </select>
            <input type="time" value={time} onChange={(e: any) => setTime(e.target.value)} className="border p-1 w-full rounded" />
            <div className="flex gap-2">
              <button onClick={handleNew} className="bg-green-600 text-white px-3 py-2 rounded text-sm">Καταχώρηση</button>
              <button onClick={() => setShow(false)} className="bg-gray-400 text-white px-3 py-2 rounded text-sm">Άκυρο</button>
            </div>
          </div>
        )}

        {tab === 'transfers' && (
          <MobileTransfers open={open} done={done} />
        )}

        {tab === 'units' && (
          <div className="p-4 space-y-3">
            <h2 className="font-bold text-lg mb-2">Μονάδες</h2>
            {UNITS.map((u: string) => (
              <div key={u} className="border rounded-lg p-3 bg-gray-50 w-full text-left">
                <div className="font-semibold text-sm flex items-center gap-2"><Factory className="w-4 h-4" /> {u}</div>
                <div className="text-xs text-gray-500">Ολοκληρωμένες: {done.filter((t: any) => t.unit === u).length}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 border-t bg-white relative">
        {[
          { k: 'aitimata', l: 'Αιτήματα', i: Inbox },
          { k: 'transfers', l: 'Μεταφορές', i: Truck },
          { k: 'units', l: 'Μονάδες', i: Factory },
        ].map(({ k, l, i: Icon }) => (
          <button key={k} onClick={() => { setShow(false); setTab(k); }} className={`relative py-2 flex flex-col items-center ${tab === k ? 'text-blue-700' : 'text-gray-500'}`}>
            <Icon className="w-5 h-5" />
            <span className="text-xs">{l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MobileTransfers({ open, done }: any) {
  const [subTab, setSubTab] = useState('open');
  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button className={`py-2 rounded-lg border ${subTab === 'open' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`} onClick={() => setSubTab('open')}>Ανοιχτές</button>
        <button className={`py-2 rounded-lg border ${subTab === 'done' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`} onClick={() => setSubTab('done')}>Ολοκληρωμένες</button>
      </div>

      {subTab === 'open' && (
        <>
          <div className="text-sm text-gray-500">Ενεργές μεταφορές</div>
          {open.length === 0 ? (
            <div className="text-center text-gray-400 text-sm">Καμία ενεργή μεταφορά</div>
          ) : (
            open.map((t: any) => (
              <div key={t.id} className="border rounded-lg p-3 shadow-sm text-sm bg-white">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{t.producer} - {t.project}</div>
                  <Badge tone="green"><CheckCircle2 className="w-3 h-3" /> OK για παράδοση</Badge>
                </div>
                <div className="text-xs text-gray-500">{t.unit} | {t.vehicle} • {fmt(t.date)}{t.time ? ` • ${t.time}` : ''}</div>
                <div className="text-xs text-blue-700 mt-1">{t.status}</div>
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
            done.map((t: any) => (
              <div key={t.id} className="border rounded-lg p-3 shadow-sm text-sm bg-gray-50">
                <div className="font-semibold">{t.producer} - {t.project}</div>
                <div className="text-xs text-gray-500">{t.unit} • Παραλαβή: {fmt(t.unitDate)}</div>
                <div className="text-xs text-green-700 mt-1">Ολοκληρωμένο</div>
              </div>
            ))
          )}
        </>
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
    setTransports((prev: any[]) => prev.map((t: any) => (t.id === id ? { ...t, approvedByProducer: true, status: 'Εγκρίθηκε από Παραγωγό', isNew: true } : t)));
    addNotif('Αίτημα Εγκρίθηκε', 'Έγκριση από Παραγωγό', { page: 'transporter', tab: 'transfers' });
  };
  const rejectTransport = (id: string) => {
    setTransports((prev: any[]) => prev.map((t: any) => (t.id === id ? { ...t, status: 'Απορρίφθηκε από Παραγωγό', isNew: true } : t)));
  };
  const addTransport = (t: any) => setTransports((prev: any[]) => [t, ...prev]);
  const unitReceive = (id: string, weight: number, eka: string) => {
    setTransports((prev: any[]) => prev.map((t: any) => (t.id === id ? { ...t, receivedByUnit: true, unitDate: today(), weight, ekaCategory: eka, status: 'Ολοκληρωμένο', isNew: true } : t)));
    addNotif('Ολοκλήρωση Μεταφοράς', 'Η μονάδα παρέλαβε', { page: 'producer', tab: 'transfers' });
  };

  // producer → create request
  const requestTransfer = (project: any) => {
    const req = { id: gid(), producer: project.producer, project: project.projectName, projectId: project.id, address: project.address, unit: project.unit, vehicle: '', date: today(), time: '08:00', status: 'Αίτηση Παραγωγού', approvedByProducer: false, receivedByUnit: false, fromProducer: true, isNew: true };
    setTransports((p: any[]) => [req, ...p]);
    addNotif('Νέα Αίτηση Παραγωγού', `${project.producer} / ${project.projectName}`, { page: 'transporter', tab: 'aitimata' });
  };

  // transporter accepts request (web & mobile share this)
  const acceptRequest = (t: any, details?: { vehicle?: string; date?: string; time?: string }) => {
    const { vehicle, date, time } = details || {};
    const v = vehicle || plates()[0];
    setTransports((prev: any[]) => prev.map((x: any) => (x.id === t.id ? { ...x, vehicle: v, date: date || x.date, time: time || x.time, approvedByProducer: true, status: 'Εγκρίθηκε από Παραγωγό', isNew: true } : x)));
    addNotif('Η αίτηση εγκρίθηκε', `${t.producer} / ${t.project}`, { page: 'unit', tab: 'transfers' });
  };

  // counts
  const prodPending = A(transports).filter((t: any) => !t.approvedByProducer && !t.receivedByUnit).length;
  const transpReq = A(transports).filter((t: any) => !t.approvedByProducer && !t.receivedByUnit).length;
  const unitPend = A(transports).filter((t: any) => t.approvedByProducer && !t.receivedByUnit).length;

  const [transporterMode, setTransporterMode] = useState('web');

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <Btn className={page === 'producer' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => { setSelectedProject(null); setPage('producer'); }}>Παραγωγός {prodPending > 0 && <span className="ml-1 bg-red-600 text-white rounded-full px-2 text-xs">{prodPending}</span>}</Btn>
          <Btn className={page === 'transporter' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setPage('transporter')}>Μεταφορέας {transpReq > 0 && <span className="ml-1 bg-red-600 text-white rounded-full px-2 text-xs">{transpReq}</span>}</Btn>
          <Btn className={page === 'unit' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setPage('unit')}>Μονάδα {unitPend > 0 && <span className="ml-1 bg-red-600 text-white rounded-full px-2 text-xs">{unitPend}</span>}</Btn>
        </div>
  <BellBtn items={A(notifications).filter((n: any) => n.target?.page === page)} onJump={jumpByNotif} />
      </div>

      {page === 'producer' && (selectedProject ? (
        <ProjectDetails project={selectedProject} transports={transports} onBack={() => setSelectedProject(null)} onRequestTransfer={requestTransfer} />
      ) : (
        <Producer projects={projects} transports={transports} onAddProject={addProject} onApproveTransport={approveTransport} onRejectTransport={rejectTransport} onOpenProject={(p: any) => setSelectedProject(p)} onRequestTransfer={requestTransfer} notifications={notifications} onJump={jumpByNotif} deepLink={deepLink} />
      ))}

      {page === 'transporter' && (
        <div>
          <div className="flex gap-3 mb-3">
            <Btn className={transporterMode === 'web' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setTransporterMode('web')}>🌐 Web</Btn>
            <Btn className={transporterMode === 'mobile' ? 'bg-blue-600 text-white' : 'bg-gray-100'} onClick={() => setTransporterMode('mobile')}>📱 Mobile</Btn>
          </div>
          {transporterMode === 'web' ? (
            <Transporter projects={projects} transports={transports} onAddTransport={addTransport} notifications={notifications} onJump={jumpByNotif} onAcceptRequest={acceptRequest} addNotif={addNotif} deepLink={deepLink} />
          ) : (
            <EcoMobileFrame projects={projects} transports={transports} onAddTransport={addTransport} notifications={notifications} onJump={jumpByNotif} onAcceptRequest={acceptRequest} addNotif={addNotif} deepLink={deepLink} />
          )}
        </div>
      )}

      {page === 'unit' && (
  <Unit projects={projects} transports={transports} onAcceptAgreement={acceptAgreement} onRejectAgreement={rejectAgreement} onReceive={unitReceive} notifications={notifications} onJump={jumpByNotif} onOpenProject={(p: any) => { setSelectedProject(p); setPage('projectView'); }} deepLink={deepLink} />
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
