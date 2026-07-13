import { useState, useEffect, useCallback } from "react";

const C = {
  cream: "#FAF6F1", blush: "#F2D9CE", rose: "#C4826A",
  deep: "#7A4A3A", gold: "#D4A96A", sage: "#A8B89A",
  ink: "#3A2E2A", soft: "#EDE5DC", white: "#ffffff",
  red: "#c0392b",
};

const COLABORADORAS = [
  { id: "yasmin", estacion: "Estilista principal", color: C.rose, renta: 0, esPropia: true },
  { id: "unas", estacion: "Estación de uñas", color: "#b07cc6", renta: 800 },
  { id: "corte", estacion: "Estación de corte", color: "#6aabcb", renta: 700 },
  { id: "pestanas", estacion: "Estación de pestañas", color: "#e8a87c", renta: 600 },
  { id: "spa", estacion: "Cabina de spa", color: C.sage, renta: 650 },
];

const SERVICIOS = {
  yasmin: ["Corte y peinado", "Tinte", "Tratamiento", "Peinado de novia", "Brushing"],
  unas: ["Manicure", "Pedicure", "Uñas acrílicas", "Nail art", "Semipermanente"],
  corte: ["Corte dama", "Corte caballero", "Corte niño", "Flequillo"],
  pestanas: ["Extensiones", "Lifting", "Tinte de pestañas", "Diseño de cejas"],
  spa: ["Facial básico", "Facial profundo", "Masaje relajante", "Exfoliación"],
};

function getFecha() {
  return new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function toISO(d) { return d.toISOString().split("T")[0]; }
function todayISO() { return toISO(new Date()); }
function labelFecha(iso) {
  const hoy = todayISO();
  const man = toISO(new Date(Date.now() + 86400000));
  if (iso === hoy) return "Hoy";
  if (iso === man) return "Mañana";
  const [y, m, d] = iso.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}
function getProximos14() {
  return Array.from({ length: 14 }, (_, i) => toISO(new Date(Date.now() + i * 86400000)));
}

const initData = () => {
  const citas = {}, ingresos = {}, inventario = [
    { id: 1, nombre: "Tinte", cantidad: 10, minimo: 3, unidad: "pzas" },
    { id: 2, nombre: "Oxidante", cantidad: 5, minimo: 2, unidad: "litros" },
    { id: 3, nombre: "Shampoo", cantidad: 8, minimo: 2, unidad: "litros" },
    { id: 4, nombre: "Acondicionador", cantidad: 4, minimo: 1, unidad: "litros" },
    { id: 5, nombre: "Uñas acrílicas", cantidad: 2, minimo: 2, unidad: "kits" },
  ];
  COLABORADORAS.forEach(c => { citas[c.id] = []; ingresos[c.id] = []; });
  return { citas, ingresos, inventario };
};

// ── STORAGE HOOK ──
function usePersistentData() {
  const [data, setDataRaw] = useState(initData);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await localStorage.getItem("lua-salon-data");
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          // merge con initData para no perder estructura
          const base = initData();
          setDataRaw({ ...base, ...parsed });
        }
      } catch (e) { /* primera vez, sin datos */ }
      setLoaded(true);
    })();
  }, []);

  const setData = useCallback((updater) => {
    setDataRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem("lua-salon-data", JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { data, setData, loaded };
}

// ── COMPONENTES UI ──
function Card({ children, style = {} }) {
  return <div style={{ background: C.white, borderRadius: 16, padding: 18, marginBottom: 14, boxShadow: "0 2px 12px rgba(122,74,58,0.07)", ...style }}>{children}</div>;
}
function CardTitle({ icon, children }) {
  return <div style={{ fontFamily: "Georgia,serif", fontSize: 16, color: C.deep, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}><span>{icon}</span>{children}</div>;
}
function Badge({ color, children }) {
  return <span style={{ background: color + "22", color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{children}</span>;
}
function Pill({ active, color, onClick, children }) {
  return <button onClick={onClick} style={{ border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", background: active ? color : C.soft, color: active ? "white" : C.ink, transition: "all 0.2s", flexShrink: 0 }}>{children}</button>;
}

const inp = { width: "100%", border: `1.5px solid ${C.blush}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", background: C.cream, fontFamily: "inherit", color: C.ink, boxSizing: "border-box" };
const lbl = { fontSize: 11, color: C.rose, fontWeight: 600, display: "block", marginBottom: 4, letterSpacing: 0.3 };
const btnPrimary = (color) => ({ background: color, color: "white", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" });

// ── AGENDA ──
function Agenda({ data, setData }) {
  const [colab, setColab] = useState("yasmin");
  const [vistaFecha, setVistaFecha] = useState(todayISO());
  const [form, setForm] = useState({ hora: "10:00", servicio: "", cliente: "", monto: "", fecha: todayISO() });
  const [custom, setCustom] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);

  const col = COLABORADORAS.find(c => c.id === colab);
  const todasCitas = data.citas[colab] || [];
  const citasDia = todasCitas.filter(c => c.fecha === vistaFecha).sort((a, b) => a.hora.localeCompare(b.hora));
  const citasPorFecha = {};
  todasCitas.forEach(c => { citasPorFecha[c.fecha] = (citasPorFecha[c.fecha] || 0) + 1; });

  const agregar = () => {
    const srv = form.servicio === "__custom" ? custom : form.servicio;
    if (!srv || !form.hora || !form.fecha) return;
    const nueva = { id: Date.now(), hora: form.hora, fecha: form.fecha, servicio: srv, cliente: form.cliente || "—", monto: parseFloat(form.monto) || 0, pagada: false };
    setData(d => ({ ...d, citas: { ...d.citas, [colab]: [...(d.citas[colab] || []), nueva] } }));
    setVistaFecha(form.fecha);
    setForm(f => ({ ...f, hora: "10:00", servicio: "", cliente: "", monto: "" }));
    setCustom(""); setMostrarForm(false);
  };

  const togglePagada = (id) => setData(d => ({ ...d, citas: { ...d.citas, [colab]: d.citas[colab].map(c => c.id === id ? { ...c, pagada: !c.pagada } : c) } }));
  const eliminar = (id) => setData(d => ({ ...d, citas: { ...d.citas, [colab]: d.citas[colab].filter(c => c.id !== id) } }));
  const total = citasDia.filter(c => c.pagada).reduce((s, c) => s + c.monto, 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 14, scrollbarWidth: "none" }}>
        {COLABORADORAS.map(c => <Pill key={c.id} active={colab === c.id} color={c.color} onClick={() => setColab(c.id)}>{c.esPropia ? "Yo" : c.estacion}</Pill>)}
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 14, scrollbarWidth: "none" }}>
        {getProximos14().map(fecha => {
          const esHoy = fecha === todayISO(), activo = fecha === vistaFecha;
          const cnt = citasPorFecha[fecha] || 0;
          return (
            <div key={fecha} onClick={() => setVistaFecha(fecha)}
              style={{ flexShrink: 0, textAlign: "center", cursor: "pointer", background: activo ? col.color : esHoy ? C.blush : C.soft, borderRadius: 12, padding: "8px 10px", minWidth: 52, border: activo ? "none" : esHoy ? `2px solid ${col.color}` : "2px solid transparent", transition: "all 0.2s" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: activo ? "white" : C.rose, textTransform: "uppercase" }}>
                {new Date(fecha + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short" })}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: activo ? "white" : C.ink, margin: "2px 0" }}>{fecha.split("-")[2]}</div>
              {cnt > 0
                ? <div style={{ width: 18, height: 18, borderRadius: "50%", background: activo ? "rgba(255,255,255,0.4)" : col.color, color: "white", fontSize: 10, fontWeight: 700, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>{cnt}</div>
                : <div style={{ height: 18 }} />}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <span style={{ fontFamily: "Georgia,serif", fontSize: 16, color: C.deep, fontWeight: 700 }}>{labelFecha(vistaFecha)}</span>
          <span style={{ fontSize: 12, color: C.rose, marginLeft: 8, opacity: 0.7 }}>{citasDia.length} cita{citasDia.length !== 1 ? "s" : ""}</span>
        </div>
        <button onClick={() => { setMostrarForm(f => !f); setForm(f => ({ ...f, fecha: vistaFecha })); }}
          style={{ background: col.color, color: "white", border: "none", borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {mostrarForm ? "✕ Cerrar" : "+ Nueva cita"}
        </button>
      </div>

      {mostrarForm && (
        <Card>
          <CardTitle icon="➕">Nueva cita — <span style={{ color: col.color }}>{col.estacion}</span></CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div><label style={lbl}>Fecha</label><input type="date" style={inp} value={form.fecha} min={todayISO()} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></div>
            <div><label style={lbl}>Hora</label><input type="time" style={inp} value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} /></div>
            <div><label style={lbl}>Cliente</label><input style={inp} placeholder="Nombre" value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} /></div>
            <div><label style={lbl}>Monto $</label><input style={inp} type="number" placeholder="0" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>Servicio</label>
            <select style={inp} value={form.servicio} onChange={e => setForm(f => ({ ...f, servicio: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {(SERVICIOS[colab] || []).map(s => <option key={s} value={s}>{s}</option>)}
              <option value="__custom">Otro...</option>
            </select>
            {form.servicio === "__custom" && <input style={{ ...inp, marginTop: 6 }} placeholder="Escribe el servicio" value={custom} onChange={e => setCustom(e.target.value)} />}
          </div>
          <button style={btnPrimary(col.color)} onClick={agregar}>Guardar cita</button>
        </Card>
      )}

      <Card>
        <CardTitle icon="📋">{col.estacion} · {labelFecha(vistaFecha)}</CardTitle>
        {citasDia.length === 0 && <p style={{ fontSize: 13, color: C.rose, opacity: 0.6, textAlign: "center", padding: "16px 0" }}>Sin citas para este día 🌸</p>}
        {citasDia.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: `1px solid ${C.soft}`, opacity: c.pagada ? 0.6 : 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: col.color, minWidth: 46 }}>{c.hora}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, textDecoration: c.pagada ? "line-through" : "none" }}>{c.servicio}</div>
              <div style={{ fontSize: 11, color: C.rose, opacity: 0.7 }}>{c.cliente}</div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.deep }}>${c.monto}</span>
            <button onClick={() => togglePagada(c.id)} style={{ border: "none", borderRadius: 8, padding: "4px 8px", fontSize: 11, cursor: "pointer", background: c.pagada ? C.sage : C.blush, color: c.pagada ? "white" : C.deep, flexShrink: 0 }}>
              {c.pagada ? "✓" : "Cobrar"}
            </button>
            <button onClick={() => eliminar(c.id)} style={{ border: "none", background: "none", color: C.blush, cursor: "pointer", fontSize: 15 }}>✕</button>
          </div>
        ))}
        {citasDia.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: `2px solid ${C.soft}` }}>
            <span style={{ fontSize: 13 }}>Total cobrado</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: col.color }}>${total}</span>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── INGRESOS ──
function Ingresos({ data, setData }) {
  const [colab, setColab] = useState("yasmin");
  const [form, setForm] = useState({ concepto: "", monto: "", tipo: "ingreso" });
  const col = COLABORADORAS.find(c => c.id === colab);
  const movs = data.ingresos[colab] || [];

  const agregar = () => {
    if (!form.concepto || !form.monto) return;
    const mov = { id: Date.now(), concepto: form.concepto, monto: parseFloat(form.monto), tipo: form.tipo, hora: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) };
    setData(d => ({ ...d, ingresos: { ...d.ingresos, [colab]: [...(d.ingresos[colab] || []), mov] } }));
    setForm(f => ({ ...f, concepto: "", monto: "" }));
  };

  const eliminarMov = (id) => setData(d => ({ ...d, ingresos: { ...d.ingresos, [colab]: d.ingresos[colab].filter(m => m.id !== id) } }));

  const entradas = movs.filter(m => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);
  const salidas = movs.filter(m => m.tipo === "gasto").reduce((s, m) => s + m.monto, 0);
  const citasCobradas = (data.citas[colab] || []).filter(c => c.pagada && c.fecha === todayISO()).reduce((s, c) => s + c.monto, 0);
  const neto = citasCobradas + entradas - salidas;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 14, scrollbarWidth: "none" }}>
        {COLABORADORAS.map(c => <Pill key={c.id} active={colab === c.id} color={c.color} onClick={() => setColab(c.id)}>{c.esPropia ? "Yo" : c.estacion}</Pill>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[["💰", "Ingresos", "$" + (citasCobradas + entradas), C.sage], ["🧾", "Gastos", "$" + salidas, C.rose], ["✨", "Neto hoy", "$" + neto, col.color]].map(([icon, label, val, color]) => (
          <div key={label} style={{ background: C.white, borderRadius: 14, padding: "14px 10px", textAlign: "center", boxShadow: "0 2px 8px rgba(122,74,58,0.06)" }}>
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div style={{ fontSize: 11, color: C.rose, marginTop: 4 }}>{label}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color }}>{val}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardTitle icon="➕">Registrar movimiento</CardTitle>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {["ingreso", "gasto"].map(t => (
            <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))} style={{ flex: 1, border: "none", borderRadius: 10, padding: "8px", fontSize: 13, fontWeight: 500, cursor: "pointer", background: form.tipo === t ? (t === "ingreso" ? C.sage : C.rose) : C.soft, color: form.tipo === t ? "white" : C.ink }}>
              {t === "ingreso" ? "💰 Ingreso" : "🧾 Gasto"}
            </button>
          ))}
        </div>
        <input style={{ ...inp, marginBottom: 8 }} placeholder="Concepto (ej: propina, producto...)" value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} onKeyDown={e => e.key === "Enter" && agregar()} />
        <input style={{ ...inp, marginBottom: 10 }} type="number" placeholder="$0" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} onKeyDown={e => e.key === "Enter" && agregar()} />
        <button style={btnPrimary(col.color)} onClick={agregar}>Agregar</button>
      </Card>

      <Card>
        <CardTitle icon="📋">Movimientos del día</CardTitle>
        {citasCobradas > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.soft}`, fontSize: 13 }}>
            <span>✂️ Servicios cobrados (agenda)</span>
            <span style={{ color: C.sage, fontWeight: 600 }}>+${citasCobradas}</span>
          </div>
        )}
        {movs.length === 0 && citasCobradas === 0 && <p style={{ fontSize: 13, color: C.rose, opacity: 0.6, textAlign: "center", padding: "12px 0" }}>Sin movimientos</p>}
        {movs.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.soft}`, fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 500 }}>{m.concepto}</div>
              <div style={{ fontSize: 11, color: C.rose, opacity: 0.6 }}>{m.hora}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, color: m.tipo === "ingreso" ? C.sage : C.rose }}>{m.tipo === "ingreso" ? "+" : "-"}${m.monto}</span>
              <button onClick={() => eliminarMov(m.id)} style={{ border: "none", background: "none", color: C.blush, cursor: "pointer", fontSize: 15 }}>✕</button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── EQUIPO ──
function Equipo({ data, setData }) {
  const [modos, setModos] = useState(() => {
    const m = {};
    COLABORADORAS.filter(c => !c.esPropia).forEach(c => { m[c.id] = "renta"; });
    return m;
  });
  const [comisiones, setComisiones] = useState(() => {
    const m = {};
    COLABORADORAS.filter(c => !c.esPropia).forEach(c => { m[c.id] = 30; });
    return m;
  });
  const [pagadas, setPagadas] = useState({});

  return (
    <div>
      <Card style={{ background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`, color: "white" }}>
        <p style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: 14, lineHeight: 1.5 }}>
          "Un equipo que trabaja con claridad,<br/>trabaja con compromiso." 💛
        </p>
      </Card>

      {COLABORADORAS.filter(c => !c.esPropia).map(c => {
        const modo = modos[c.id];
        const com = comisiones[c.id];
        const pagada = pagadas[c.id];
        const icon = c.id === "unas" ? "💅" : c.id === "corte" ? "✂️" : c.id === "pestanas" ? "👁️" : "🧖‍♀️";
        return (
          <Card key={c.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: c.color + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.estacion}</div>
                <Badge color={c.color}>{modo === "renta" ? `Renta $${c.renta}/sem` : `Comisión ${com}%`}</Badge>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {["renta", "comision"].map(t => (
                <button key={t} onClick={() => setModos(m => ({ ...m, [c.id]: t }))} style={{ flex: 1, border: "none", borderRadius: 10, padding: "7px", fontSize: 12, fontWeight: 500, cursor: "pointer", background: modo === t ? c.color : C.soft, color: modo === t ? "white" : C.ink }}>
                  {t === "renta" ? "🏷️ Renta fija" : "📊 Comisión"}
                </button>
              ))}
            </div>
            {modo === "renta" ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.cream, borderRadius: 12, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 12, color: C.rose }}>Renta semanal</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>${c.renta}</div>
                </div>
                <button onClick={() => setPagadas(p => ({ ...p, [c.id]: !p[c.id] }))}
                  style={{ border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: pagada ? C.sage : C.blush, color: pagada ? "white" : C.deep }}>
                  {pagada ? "✓ Pagada" : "Marcar pagada"}
                </button>
              </div>
            ) : (
              <div style={{ background: C.cream, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: C.rose }}>% de comisión</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{com}%</span>
                </div>
                <input type="range" min={10} max={60} step={5} value={com} onChange={e => setComisiones(m => ({ ...m, [c.id]: +e.target.value }))} style={{ width: "100%", accentColor: c.color }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.rose, opacity: 0.6 }}><span>10%</span><span>60%</span></div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ── INVENTARIO ──
function Inventario({ data, setData }) {
  const items = data.inventario || [];
  const [form, setForm] = useState({ nombre: "", cantidad: "", minimo: "", unidad: "pzas" });

  const agregar = () => {
    if (!form.nombre || !form.cantidad) return;
    const nuevo = { id: Date.now(), nombre: form.nombre, cantidad: +form.cantidad, minimo: +form.minimo || 1, unidad: form.unidad };
    setData(d => ({ ...d, inventario: [...(d.inventario || []), nuevo] }));
    setForm({ nombre: "", cantidad: "", minimo: "", unidad: "pzas" });
  };
  const ajustar = (id, delta) => setData(d => ({ ...d, inventario: d.inventario.map(i => i.id === id ? { ...i, cantidad: Math.max(0, i.cantidad + delta) } : i) }));
  const eliminar = (id) => setData(d => ({ ...d, inventario: d.inventario.filter(i => i.id !== id) }));

  const bajos = items.filter(i => i.cantidad <= i.minimo);

  return (
    <div>
      {bajos.length > 0 && (
        <div style={{ background: "#fff3cd", border: "1px solid #f0c040", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>⚠️ Por surtir ({bajos.length})</div>
          {bajos.map(i => <div key={i.id} style={{ fontSize: 12, color: C.deep }}>• {i.nombre} — quedan {i.cantidad} {i.unidad}</div>)}
        </div>
      )}
      <Card>
        <CardTitle icon="➕">Agregar producto</CardTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div><label style={lbl}>Producto</label><input style={inp} placeholder="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
          <div><label style={lbl}>Unidad</label>
            <select style={inp} value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
              {["pzas","litros","kits","cajas","frascos"].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Cantidad</label><input style={inp} type="number" placeholder="0" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} /></div>
          <div><label style={lbl}>Mínimo</label><input style={inp} type="number" placeholder="1" value={form.minimo} onChange={e => setForm(f => ({ ...f, minimo: e.target.value }))} /></div>
        </div>
        <button style={btnPrimary(C.rose)} onClick={agregar}>Agregar producto</button>
      </Card>
      <Card>
        <CardTitle icon="📦">Inventario actual</CardTitle>
        {items.map((item, idx) => {
          const bajo = item.cantidad <= item.minimo;
          return (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: idx < items.length - 1 ? `1px solid ${C.soft}` : "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.nombre}</div>
                <div style={{ fontSize: 11, color: bajo ? C.red : C.rose, opacity: bajo ? 1 : 0.6 }}>{bajo ? "⚠️ Pedir pronto" : `Mín. ${item.minimo} ${item.unidad}`}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => ajustar(item.id, -1)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: C.blush, cursor: "pointer", fontSize: 16 }}>−</button>
                <span style={{ fontWeight: 700, fontSize: 15, color: bajo ? C.red : C.deep, minWidth: 28, textAlign: "center" }}>{item.cantidad}</span>
                <button onClick={() => ajustar(item.id, 1)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: C.sage, cursor: "pointer", fontSize: 16, color: "white" }}>+</button>
                <span style={{ fontSize: 11, color: C.rose, opacity: 0.6, minWidth: 36 }}>{item.unidad}</span>
                <button onClick={() => eliminar(item.id)} style={{ border: "none", background: "none", color: C.blush, cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ── RESUMEN ──
function Resumen({ data }) {
  const hoy = todayISO();
  const totales = COLABORADORAS.map(c => {
    const monto = (data.citas[c.id] || []).filter(x => x.pagada && x.fecha === hoy).reduce((s, x) => s + x.monto, 0);
    const citas = (data.citas[c.id] || []).filter(x => x.fecha === hoy).length;
    return { ...c, monto, citas };
  });
  const totalDia = totales.reduce((s, c) => s + c.monto, 0);

  return (
    <div>
      <Card style={{ background: `linear-gradient(135deg, ${C.deep}, ${C.rose})`, color: "white" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.8, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Total cobrado hoy</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 42, fontWeight: 700 }}>${totalDia}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{getFecha()}</div>
        </div>
      </Card>
      <Card>
        <CardTitle icon="👩‍🦰">Por estación hoy</CardTitle>
        {totales.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.soft}` }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13 }}>{c.estacion}</span>
            <span style={{ fontSize: 11, color: C.rose, opacity: 0.7 }}>{c.citas} citas</span>
            <span style={{ fontWeight: 700, color: c.color, fontSize: 15 }}>${c.monto}</span>
          </div>
        ))}
      </Card>
      <Card>
        <CardTitle icon="🏷️">Rentas semanales esperadas</CardTitle>
        {COLABORADORAS.filter(c => !c.esPropia).map(c => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.soft}`, fontSize: 13 }}>
            <span>{c.estacion}</span>
            <span style={{ fontWeight: 600, color: c.color }}>${c.renta}/sem</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 4, borderTop: `2px solid ${C.soft}`, fontWeight: 700 }}>
          <span>Total rentas</span>
          <span style={{ color: C.rose }}>${COLABORADORAS.filter(c => !c.esPropia).reduce((s, c) => s + c.renta, 0)}/sem</span>
        </div>
      </Card>
    </div>
  );
}

// ── TABS ──
const TABS = [
  { id: "agenda", icon: "📅", label: "Agenda" },
  { id: "ingresos", icon: "💰", label: "Ingresos" },
  { id: "equipo", icon: "👩‍🦰", label: "Equipo" },
  { id: "inventario", icon: "📦", label: "Inventario" },
  { id: "resumen", icon: "📊", label: "Resumen" },
];

// ── APP PRINCIPAL ──
export default function LuaSalon() {
  const [tab, setTab] = useState("agenda");
  const { data, setData, loaded } = usePersistentData();

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: C.cream, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <div style={{ fontSize: 32 }}>🌸</div>
      <div style={{ fontFamily: "Georgia,serif", color: C.rose, fontSize: 18 }}>Cargando LUA...</div>
    </div>
  );

  const tabContent = {
    agenda: <Agenda data={data} setData={setData} />,
    ingresos: <Ingresos data={data} setData={setData} />,
    equipo: <Equipo data={data} setData={setData} />,
    inventario: <Inventario data={data} setData={setData} />,
    resumen: <Resumen data={data} />,
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.cream, minHeight: "100vh", color: C.ink }}>
      <div style={{ background: `linear-gradient(135deg, ${C.deep} 0%, ${C.rose} 60%, ${C.gold} 100%)`, color: "white", textAlign: "center", padding: "32px 20px 22px" }}>
        <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", opacity: 0.7, marginBottom: 6 }}>Panel de control</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>LUA Salón de Belleza</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8, fontStyle: "italic" }}>{getFecha()}</div>
      </div>

      <div style={{ display: "flex", background: "white", borderBottom: `2px solid ${C.soft}`, overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, minWidth: 60, border: "none", borderBottom: tab === t.id ? `3px solid ${C.rose}` : "3px solid transparent", background: "white", padding: "12px 6px 10px", fontSize: 11, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? C.rose : C.ink, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "18px 14px 80px" }}>
        {tabContent[tab]}
      </div>

      <div style={{ textAlign: "center", padding: 16, fontSize: 11, color: C.rose, fontStyle: "italic", opacity: 0.6 }}>LUA Salón · Hecho con 💛</div>
    </div>
  );
}
