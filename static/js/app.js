// ============================================================
// MFM ORINOCO – Vue 3 Application (app.js) v3 – Sidebar + Data Cruda
// ============================================================
const { createApp, ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } = Vue;

function alarmClass(value, cfg) {
  if (!cfg) return '';
  const v = parseFloat(value);
  if (isNaN(v)) return '';
  if (cfg.SP_HH !== null && v >= cfg.SP_HH) return 'alarm-hh';
  if (cfg.SP_H  !== null && v >= cfg.SP_H)  return 'alarm-h';
  if (cfg.SP_LL !== null && v <= cfg.SP_LL) return 'alarm-ll';
  if (cfg.SP_L  !== null && v <= cfg.SP_L)  return 'alarm-l';
  return '';
}

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════
const App = {
  template: `
  <div id="app" class="flex flex-col h-screen bg-bg-primary font-sans overflow-hidden">

    <!-- ══ HEADER ══ -->
    <header class="hdr flex-shrink-0 z-20">
      <div class="hdr-logo">
        <img src="/static/img/Vox-X4,%20Logo.png" alt="Vox X4" class="h-10 object-contain" />
        <div class="hdr-logo-text">
         
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="hdr-clock">{{ clock }}</div>
        <div class="w-2.5 h-2.5 rounded-full transition-all duration-300"
             :style="connected
               ? 'background:var(--accent-green);box-shadow:0 0 6px var(--accent-green)'
               : 'background:var(--accent-red);box-shadow:0 0 6px var(--accent-red)'"></div>
      </div>
      <div class="hdr-title">
        
        <img src="/static/img/Logo_vox_home.png" alt="Vox Home" class="h-10 object-contain" />
      </div>
    </header>

    <!-- ══ BODY (sidebar + content) ══ -->
    <div class="flex flex-1 overflow-hidden">

      <!-- ════ SIDEBAR COLAPSABLE ════ -->
      <aside :class="[
        'sidebar-nav flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out z-30',
        sidebarOpen ? 'w-52' : 'w-14'
      ]">
        <!-- Toggle button -->
        <button @click="sidebarOpen = !sidebarOpen"
                class="sidebar-toggle flex items-center justify-center h-8 w-full border-b border-gray-700 hover:bg-white/10 transition-colors">
          <span class="text-accent-yellow text-lg font-bold select-none">
            {{ sidebarOpen ? '◀' : '☰' }}
          </span>
        </button>

        <!-- Nav links -->
        <nav class="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
          <button v-for="item in navItems" :key="item.key"
                  @click="page = item.key; if(window?.innerWidth < 768) sidebarOpen = false"
                  :class="[
                    'nav-side-btn flex items-center gap-2 w-full rounded-lg transition-all duration-200 text-left',
                    page === item.key ? 'bg-accent-blue text-white' : 'text-gray-300 hover:bg-white/10',
                    sidebarOpen ? 'px-3 py-1.5' : 'px-0 py-1.5 justify-center'
                  ]">
            <span class="text-base flex-shrink-0">{{ item.icon }}</span>
            <span v-if="sidebarOpen" class="text-xs font-semibold truncate leading-tight">{{ item.label }}</span>
          </button>
        </nav>

        <!-- Bottom section -->
        <div class="p-1.5 border-t border-gray-700 flex flex-col gap-1">
          <button @click="toggleLazos"
                  :class="[
                    'flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-bold transition-all w-full',
                    lazos ? 'bg-accent-red text-white' : 'bg-yellow-700 text-white',
                    sidebarOpen ? 'justify-start' : 'justify-center'
                  ]">
            <span class="text-sm flex-shrink-0">{{ lazos ? '🔴' : '🟡' }}</span>
            <span v-if="sidebarOpen" class="text-xs truncate">{{ lazos ? 'Deshab. Lazos' : 'Habilit. Lazos' }}</span>
          </button>

          <template v-if="page === 'proceso'">
            <button @click="openPid('PIC-01')"
                    :class="['flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold bg-bg-tag text-white hover:brightness-110 transition-all w-full',
                              sidebarOpen ? 'justify-start' : 'justify-center']">
              <span class="flex-shrink-0">⚙️</span>
              <span v-if="sidebarOpen">PIC-01</span>
            </button>
            <button @click="openPid('LIC-01')"
                    :class="['flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold bg-bg-tag text-white hover:brightness-110 transition-all w-full',
                              sidebarOpen ? 'justify-start' : 'justify-center']">
              <span class="flex-shrink-0">⚙️</span>
              <span v-if="sidebarOpen">LIC-01</span>
            </button>
          </template>
        </div>
      </aside>

      <!-- ════ CONTENT ════ -->
      <div class="flex-1 overflow-hidden h-full flex flex-col min-w-0">
        <proceso-page v-if="page==='proceso'"
          :proc="proc" :pid_p="pid_p" :pid_n="pid_n"
          :alarmas="alarmas" :lazos="lazos"
          @open-pid="openPid"/>

        <div v-if="page==='inicio_prueba'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <inicio-prueba-page />
        </div>

        <div v-if="page==='reportes'" class="flex-1 overflow-y-auto overflow-x-hidden flex items-center justify-center">
          <reportes-page />
        </div>

        <div v-if="page==='data_cruda'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <data-cruda-page :proc="proc"/>
        </div>

        <div v-if="page==='rangos'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <rangos-page
            :alarmas="alarmas"
            @saved="loadAlarmas"
            @toast="showToast"/>
        </div>
      </div>
    </div>

    <!-- PID Modal -->
    <pid-modal v-if="modalPid.show"
      :pid="modalPid.pid==='PIC-01' ? pid_p : pid_n"
      :tag="modalPid.pid"
      @close="modalPid.show=false"
      @save="savePid"/>

    <!-- Toasts -->
    <div class="toast-container">
      <div v-for="t in toasts" :key="t.id" :class="['toast',t.type]">{{ t.msg }}</div>
    </div>
  </div>`,

  setup() {
    const page        = ref('proceso');
    const connected   = ref(false);
    const lazos       = ref(true);
    const toasts      = ref([]);
    const alarmas     = ref([]);
    const clock       = ref('--:--:--');
    const sidebarOpen = ref(true);

    const navItems = [
      { key: 'proceso',    icon: '🏠', label: 'Inicio / Proceso' },
      { key: 'inicio_prueba', icon: '📝', label: 'Inicio Prueba' },
      { key: 'reportes',   icon: '📥', label: 'Reportes'         },
      { key: 'data_cruda', icon: '📊', label: 'Data Cruda'       },
      { key: 'rangos',     icon: '🔧', label: 'Conf. Instrum.'   },
    ];

    const proc = reactive({
      FI_03:0, PI_01:0, TI_01:0, LI_01:0,
      PDI_01:0, PDI_03:0, PDI_02_dp:0, PDI_02_psig:0,
      TI_02:0, GAS_01:0, VI_01:0,
      PCV_01_cv:0, LCV_01_cv:0, timestamp:'--'
    });
    const pid_p = reactive({ instrumento:'PIC-01', modo:'Manual', PV:0, CV:0, SP:0, CV_manual:0, Kp:1.2, Ki:0.08, Kd:0.05 });
    const pid_n = reactive({ instrumento:'LIC-01', modo:'Manual', PV:0, CV:0, SP:0, CV_manual:0, Kp:1.0, Ki:0.10, Kd:0.02 });
    const modalPid = reactive({ show:false, pid:'PIC-01' });

    let clockTimer;
    const tickClock = () => { clock.value = new Date().toLocaleTimeString('es-VE'); };

    function showToast(msg, type='success') {
      const id = Date.now();
      toasts.value.push({ id, msg, type });
      setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 3000);
    }

    async function loadAlarmas() {
      try { alarmas.value = await (await fetch('/api/alarmas')).json(); } catch(e) {}
    }

    function openPid(tag) { modalPid.pid = tag; modalPid.show = true; }

    async function savePid(payload) {
      try {
        const r = await fetch(`/api/pid/${payload.instrumento}`, {
          method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
        });
        if (r.ok) {
          const d = await r.json();
          Object.assign(payload.instrumento==='PIC-01' ? pid_p : pid_n, d);
          showToast(`✅ ${payload.instrumento} guardado`);
          modalPid.show = false;
        }
      } catch(e) { showToast('❌ Error al guardar','error'); }
    }

    async function toggleLazos() {
      try {
        const d = await (await fetch('/api/lazos/deshabilitar',{method:'POST'})).json();
        lazos.value = d.lazos_habilitados;
        showToast(lazos.value ? '✅ Lazos habilitados' : '⚠️ Lazos deshabilitados', lazos.value?'success':'error');
      } catch(e) {}
    }

    let socket;
    onMounted(() => {
      loadAlarmas();
      clockTimer = setInterval(tickClock, 1000);
      tickClock();
      socket = io({ transports:['websocket'], reconnectionDelay:1000 });
      socket.on('connect',    () => { connected.value = true; });
      socket.on('disconnect', () => { connected.value = false; });
      socket.on('process_data', d => {
        Object.assign(proc,  d.process);
        Object.assign(pid_p, d.pid_presion);
        Object.assign(pid_n, d.pid_nivel);
        lazos.value = d.lazos_habilitados;
      });
      socket.on('pid_updated', d => { Object.assign(d.instrumento==='PIC-01'?pid_p:pid_n, d); });
      socket.on('pid_config',  d => {
        if (d['PIC-01']) Object.assign(pid_p, d['PIC-01']);
        if (d['LIC-01']) Object.assign(pid_n, d['LIC-01']);
      });
    });
    onUnmounted(() => { clearInterval(clockTimer); if (socket) socket.disconnect(); });

    return { page, connected, lazos, toasts, alarmas, clock, proc, pid_p, pid_n, modalPid,
             sidebarOpen, navItems, openPid, savePid, toggleLazos, loadAlarmas, showToast };
  }
};

// ═══════════════════════════════════════════════════════════════
// PROCESO PAGE  –  Imagen P&ID + tags superpuestos (shifted right)
// ═══════════════════════════════════════════════════════════════
const ProcesoPage = {
  name: 'ProcesoPage',
  props: ['proc','pid_p','pid_n','alarmas','lazos'],
  emits: ['open-pid'],
  template: `
  <div class="flex flex-col h-full overflow-hidden">
    <!-- ══ CANVAS con imagen de fondo P&ID ══ -->
    <div class="pid-wrap">

      <!-- Imagen del P&ID -->
      <img src="/static/img/pid_fondos.png" class="pid-bg-img"
           alt="P&ID Diagrama"
           @error="imgError=true"
           v-show="!imgError"/>

      <!-- Fallback si la imagen no existe -->
      <div v-if="imgError" class="pid-no-img">
        📁 Copia tu imagen del P&ID a:<br/>
        <code>static/img/pid_fondo.png</code><br/>
        y recarga la página.
      </div>

      <!-- ══ OVERLAY NIVEL SEPARADOR ══ -->
      <div class="tank-overlay">
        <svg width="100%" height="100%" viewBox="0 0 100 100"
             preserveAspectRatio="none" style="position:absolute;inset:0;">
          <rect x="0" y="0" width="100" height="100"
                fill="rgba(10,18,30,0.45)" rx="8"/>
          <rect x="0" :y="100 - levelPct" width="100" :height="levelPct"
                fill="rgba(140,90,20,0.75)"/>
          <rect x="0" :y="100 - Math.min(levelPct, 15)" width="100"
                :height="Math.min(levelPct, 15)"
                fill="rgba(20,60,100,0.7)"/>
          <line x1="0" :y1="100-levelPct" x2="100" :y2="100-levelPct"
                stroke="rgba(80,200,255,0.6)" stroke-width="1.5"
                v-if="levelPct > 2 && levelPct < 98"/>
          <rect x="0" y="0" width="12" height="100"
                fill="rgba(255,255,255,0.04)"/>
        </svg>
        <div class="tank-scale">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
      </div>

      <!-- TAG LI-01 (junto al tanque) -->
      <div class="pid-tag li-tag" :class="alarmCls('LI_01')">
        <div class="pt-name">LI-01</div>
        <div class="pt-val">{{ fmt(proc.LI_01,1) }}<span class="pt-unit"> %</span></div>
        <div class="li-bar-wrap">
          <div class="li-bar-fill" :style="{width: Math.min(100,Math.max(0,proc.LI_01||0))+'%'}"></div>
        </div>
      </div>

      <!-- ════ FILA SUPERIOR: FI-03 | PI-01 | TI-01 ════ -->
      <div class="pid-tag-group top-row">
        <div class="pid-tag" :class="alarmCls('FI_03')">
          <div class="pt-name">FI-03</div>
          <div class="pt-val">{{ fmt(proc.FI_03,2) }}<span class="pt-unit"> MSCFD</span></div>
        </div>
        <div class="pid-tag" :class="alarmCls('PI_01')">
          <div class="pt-name">PI-01</div>
          <div class="pt-val">{{ fmt(proc.PI_01,2) }}<span class="pt-unit"> PSIG</span></div>
        </div>
        <div class="pid-tag" :class="alarmCls('TI_01')">
          <div class="pt-name">TI-01</div>
          <div class="pt-val">{{ fmt(proc.TI_01,2) }}<span class="pt-unit"> °C</span></div>
        </div>
      </div>

      <!-- ════ FILA INFERIOR: TI-02 | %GAS-01 | VI-01 ════ -->
      <div class="pid-tag-group bot-row">
        <div class="pid-tag" :class="alarmCls('TI_02')">
          <div class="pt-name">TI-02</div>
          <div class="pt-val">
            <span v-if="alarmCls('TI_02')" class="pt-alarm-icon">🔴</span>
            {{ fmt(proc.TI_02,1) }}<span class="pt-unit"> °C</span>
          </div>
          <div class="pt-val pt-secondary">{{ fmt(proc.TI_02*9/5+32,2) }}<span class="pt-unit"> °F</span></div>
        </div>
        <div class="pid-tag warn-tag">
          <div class="pt-name">A %GAS-01</div>
          <div class="pt-val">
            <span v-if="proc.GAS_01 > 20" class="pt-alarm-icon">🔥</span>
            {{ fmt(proc.GAS_01,1) }}<span class="pt-unit"> %</span>
          </div>
        </div>
        <div class="pid-tag" :class="alarmCls('VI_01')">
          <div class="pt-name">M VI-01</div>
          <div class="pt-val">{{ fmt(proc.VI_01,1) }}<span class="pt-unit"> CP</span></div>
        </div>
      </div>

      <!-- ══ PIC-01 / PCV-01 ══ -->
      <div class="pid-valve-block pcv-pos">
        <div class="pvb-row">
          <span class="pvb-tag-lbl">PIC-01</span>
          <button class="pvb-mode" :class="pid_p.modo==='Manual'?'manual':'auto'"
            @click="$emit('open-pid','PIC-01')">{{ pid_p.modo }}</button>
        </div>
        <div class="pvb-cv-row">PCV-01&nbsp;<span class="pvb-cv">{{ fmt(pid_p.CV,1) }}%</span></div>
      </div>

      <!-- ══ LIC-01 / LCV-01 ══ -->
      <div class="pid-valve-block lcv-pos">
        <div class="pvb-row">
          <span class="pvb-tag-lbl">LIC-01</span>
          <button class="pvb-mode" :class="pid_n.modo==='Manual'?'manual':'auto'"
            @click="$emit('open-pid','LIC-01')">{{ pid_n.modo }}</button>
        </div>
        <div class="pvb-cv-row">LCV-01&nbsp;<span class="pvb-cv">{{ fmt(pid_n.CV,1) }}%</span></div>
      </div>

      <!-- Banner lazos deshabilitados -->
      <div v-if="!lazos" class="pid-lazos-banner">⚠️ LAZOS DESHABILITADOS</div>
    </div>

    <!-- TABLAS INFERIORES -->
    <div class="bottom-grid flex-shrink-0">
      <div class="bt-cell header"><span class="bt-label">Tasa Est. Líquido</span><span class="bt-value">—</span><span class="bt-label">BBLD</span></div>
      <div class="bt-cell header"><span class="bt-label">Tasa Est. Crudo</span><span class="bt-value">—</span><span class="bt-label">BBLD</span></div>
      <div class="bt-cell header"><span class="bt-label">Tasa Est. Diluente</span><span class="bt-value">—</span><span class="bt-label">BBLD</span></div>
      <div class="bt-cell header"><span class="bt-label">Tasa Est. Agua</span><span class="bt-value">—</span><span class="bt-label">BBLD</span></div>
      <div class="bt-cell header"><span class="bt-label">Est. Gas Total STD</span><span class="bt-value">{{ fmt(proc.FI_03,3) }}</span><span class="bt-label">MSCFD</span></div>
      <div class="bt-cell"><span class="bt-label">Q Líquido</span><span class="bt-value">BD</span></div>
      <div class="bt-cell"><span class="bt-label">Q Crudo</span><span class="bt-value">BD</span></div>
      <div class="bt-cell"><span class="bt-label">Q Agua</span><span class="bt-value">BD</span></div>
      <div class="bt-cell"><span class="bt-label">Q Gas Atrapado</span><span class="bt-value">CFD</span></div>
      <div class="bt-cell"><span class="bt-label">M Q Diluente</span><span class="bt-value">BD</span></div>
    </div>
  </div>`,

  setup(props) {
    const imgError = ref(false);
    const fmt = (v, d=2) => (v !== undefined && v !== null) ? parseFloat(v).toFixed(d) : '—';

    const alarmMap = computed(() => {
      const m = {};
      (props.alarmas || []).forEach(a => { m[a.instrumento] = a; });
      return m;
    });

    function alarmCls(key) {
      const tagMap = { FI_03:'FI-03', PI_01:'PI-01', TI_01:'TI-01', LI_01:'LI-01', TI_02:'TI-02', VI_01:'VI-01' };
      const tag = tagMap[key];
      if (!tag) return '';
      return alarmClass(props.proc[key], alarmMap.value[tag]);
    }

    const levelPct = computed(() => Math.min(100, Math.max(0, parseFloat(props.proc.LI_01) || 0)));

    return { fmt, alarmCls, imgError, levelPct };
  }
};

// ═══════════════════════════════════════════════════════════════
// DATA CRUDA PAGE – Gráfica de tendencia con Chart.js
// ═══════════════════════════════════════════════════════════════
const DataCrudaPage = {
  name: 'DataCrudaPage',
  props: ['proc'],
  template: `
  <div class="p-4 flex flex-col gap-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-white tracking-wide">📊 Data Cruda – Tendencias</h1>
        <p class="text-xs text-gray-400 mt-0.5">Histórico en tiempo real de variables de proceso</p>
      </div>
      <div class="flex gap-2 items-center">
        <span class="text-xs text-gray-400">Ventana:</span>
        <select v-model="windowSize" class="bg-bg-card border border-gray-600 text-white text-xs rounded px-2 py-1 outline-none focus:border-accent-yellow">
          <option :value="60">1 min</option>
          <option :value="120">2 min</option>
          <option :value="300">5 min</option>
        </select>
        <button @click="clearHistory"
                class="px-3 py-1 text-xs font-semibold bg-accent-red hover:brightness-110 text-white rounded transition-all">
          🗑 Limpiar
        </button>
        <button @click="paused = !paused"
                :class="['px-3 py-1 text-xs font-semibold text-white rounded transition-all',
                          paused ? 'bg-accent-green hover:brightness-110' : 'bg-yellow-700 hover:brightness-110']">
          {{ paused ? '▶ Reanudar' : '⏸ Pausar' }}
        </button>
      </div>
    </div>

    <!-- SELECCIÓN DE VARIABLES -->
    <div class="flex flex-wrap gap-2">
      <button v-for="v in variables" :key="v.key"
              @click="v.active = !v.active; updateChart()"
              :class="['flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                        v.active ? 'text-white border-transparent' : 'border-gray-600 text-gray-400 bg-transparent hover:bg-white/5']"
              :style="v.active ? {background: v.color, boxShadow: '0 0 8px '+v.color+'66'} : {}">
        <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{background: v.color}"></span>
        {{ v.label }}
      </button>
    </div>

    <!-- GRÁFICA PRINCIPAL -->
    <div class="bg-bg-card rounded-xl border border-gray-700 p-4" style="height: 360px;">
      <canvas ref="chartCanvas" style="width:100%;height:100%;"></canvas>
    </div>

    <!-- VALORES ACTUALES en cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
      <div v-for="v in variables" :key="v.key"
           class="data-card rounded-xl border p-3 flex flex-col gap-1 transition-all"
           :style="{borderColor: v.color+'55', background: 'rgba(28,36,48,0.9)'}">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold tracking-wider" :style="{color: v.color}">{{ v.label }}</span>
          <span class="w-2 h-2 rounded-full" :style="{background: v.active ? v.color : '#6b7280'}"></span>
        </div>
        <div class="font-mono text-2xl font-bold text-white leading-none">
          {{ fmtVal(proc[v.key], v.decimals) }}
        </div>
        <div class="text-xs text-gray-500">{{ v.unit }}</div>
        <!-- Mini sparkline indicator -->
        <div class="mt-1 h-1 rounded-full bg-gray-700 overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500"
               :style="{
                 width: getPercent(v.key, v.min, v.max)+'%',
                 background: v.color
               }"></div>
        </div>
      </div>
    </div>

    <!-- TABLA SNAPSHOT -->
    <div class="bg-bg-card rounded-xl border border-gray-700 overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <span class="text-sm font-bold text-white">📋 Últimos Valores Registrados</span>
        <span class="text-xs text-gray-500 font-mono">{{ proc.timestamp || '--' }}</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-gray-700">
              <th class="px-4 py-2 text-left text-gray-400 font-semibold">Variable</th>
              <th class="px-4 py-2 text-right text-gray-400 font-semibold">Valor</th>
              <th class="px-4 py-2 text-right text-gray-400 font-semibold">Unidad</th>
              <th class="px-4 py-2 text-right text-gray-400 font-semibold">Mín (sesión)</th>
              <th class="px-4 py-2 text-right text-gray-400 font-semibold">Máx (sesión)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in variables" :key="v.key"
                class="border-b border-gray-800 hover:bg-white/5 transition-colors">
              <td class="px-4 py-2 font-bold" :style="{color: v.color}">{{ v.label }}</td>
              <td class="px-4 py-2 text-right font-mono text-white font-semibold">{{ fmtVal(proc[v.key], v.decimals) }}</td>
              <td class="px-4 py-2 text-right text-gray-400">{{ v.unit }}</td>
              <td class="px-4 py-2 text-right font-mono text-blue-400">{{ histStats[v.key] ? fmtVal(histStats[v.key].min, v.decimals) : '—' }}</td>
              <td class="px-4 py-2 text-right font-mono text-orange-400">{{ histStats[v.key] ? fmtVal(histStats[v.key].max, v.decimals) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>`,

  setup(props) {
    const chartCanvas = ref(null);
    const paused      = ref(false);
    const windowSize  = ref(120);  // puntos mostrados
    let chartInstance = null;

    const variables = reactive([
      { key:'FI_03',  label:'FI-03 Caudal Gas',    unit:'MSCFD', color:'#5ac8d4', active:true,  decimals:2, min:0, max:10  },
      { key:'PI_01',  label:'PI-01 Presión',        unit:'PSIG',  color:'#e6a817', active:true,  decimals:1, min:0, max:500 },
      { key:'TI_01',  label:'TI-01 Temperatura',    unit:'°C',    color:'#e67e22', active:true,  decimals:2, min:0, max:100 },
      { key:'LI_01',  label:'LI-01 Nivel',          unit:'%',     color:'#27a766', active:true,  decimals:1, min:0, max:100 },
      { key:'TI_02',  label:'TI-02 Temp. Fondo',    unit:'°C',    color:'#c0392b', active:false, decimals:1, min:0, max:100 },
      { key:'GAS_01', label:'%GAS-01 Fracción Gas', unit:'%',     color:'#9b59b6', active:false, decimals:1, min:0, max:100 },
      { key:'VI_01',  label:'VI-01 Viscosidad',     unit:'CP',    color:'#3498db', active:false, decimals:1, min:0, max:200 },
    ]);

    // Historia de cada variable
    const historyLabels = ref([]);
    const historyData   = reactive({});
    const histStats     = reactive({});

    variables.forEach(v => {
      historyData[v.key] = [];
      histStats[v.key]   = null;
    });

    function fmtVal(val, d=2) {
      if (val === undefined || val === null) return '—';
      return parseFloat(val).toFixed(d);
    }

    function getPercent(key, min, max) {
      const v = parseFloat(props.proc[key] || 0);
      return Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
    }

    function clearHistory() {
      historyLabels.value = [];
      variables.forEach(v => {
        historyData[v.key] = [];
        histStats[v.key]   = null;
      });
      if (chartInstance) {
        chartInstance.data.labels = [];
        chartInstance.data.datasets.forEach(ds => { ds.data = []; });
        chartInstance.update('none');
      }
    }

    function buildDatasets() {
      return variables.map(v => ({
        label: v.label,
        data: [...historyData[v.key]],
        borderColor: v.color,
        backgroundColor: v.color + '22',
        borderWidth: v.active ? 2 : 0,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: false,
        tension: 0.35,
        hidden: !v.active,
        yAxisID: 'y',
      }));
    }

    function initChart() {
      if (!chartCanvas.value) return;
      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

      chartInstance = new Chart(chartCanvas.value, {
        type: 'line',
        data: {
          labels: [],
          datasets: buildDatasets(),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 0 },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: 'rgba(22,27,34,0.97)',
              borderColor: '#30363d',
              borderWidth: 1,
              titleColor: '#e8eaed',
              bodyColor: '#9aa3af',
              titleFont: { family: 'Inter', size: 11 },
              bodyFont: { family: 'Roboto Mono', size: 11 },
              padding: 10,
            },
          },
          scales: {
            x: {
              grid:  { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#6b7280', font: { family:'Roboto Mono', size:10 }, maxTicksLimit: 10 },
              border:{ color: '#30363d' },
            },
            y: {
              grid:  { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#6b7280', font: { family:'Roboto Mono', size:10 } },
              border:{ color: '#30363d' },
            },
          },
        },
      });
    }

    function updateChart() {
      if (!chartInstance) return;
      chartInstance.data.datasets = buildDatasets();
      chartInstance.data.labels   = [...historyLabels.value];
      chartInstance.update('none');
    }

    // Observar cambios de proc para añadir puntos
    let ticker = null;
    watch(() => props.proc.timestamp, () => {
      if (paused.value) return;
      const now  = new Date().toLocaleTimeString('es-VE');
      const maxPts = windowSize.value;

      historyLabels.value.push(now);
      if (historyLabels.value.length > maxPts) historyLabels.value.shift();

      variables.forEach(v => {
        const val = parseFloat(props.proc[v.key] || 0);
        historyData[v.key].push(val);
        if (historyData[v.key].length > maxPts) historyData[v.key].shift();

        // stats
        if (!histStats[v.key]) {
          histStats[v.key] = { min: val, max: val };
        } else {
          if (val < histStats[v.key].min) histStats[v.key].min = val;
          if (val > histStats[v.key].max) histStats[v.key].max = val;
        }
      });

      updateChart();
    });

    onMounted(() => {
      nextTick(() => { initChart(); });
    });

    onUnmounted(() => {
      if (chartInstance) chartInstance.destroy();
    });

    return { chartCanvas, variables, paused, windowSize, fmtVal, getPercent, clearHistory, histStats, updateChart };
  }
};

// ═══════════════════════════════════════════════════════════════
// PID MODAL
// ═══════════════════════════════════════════════════════════════
const PidModal = {
  name: 'PidModal',
  props: ['pid','tag'],
  emits: ['close','save'],
  template: `
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ tag }} – {{ tag==='PIC-01' ? 'Control de Presión (PCV-01)' : 'Control de Nivel (LCV-01)' }}</h3>
        <button class="modal-close" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <table class="form-table">
          <tr>
            <td class="label-cell">PV</td>
            <td class="value-cell">
              <span class="val-display">{{ fmt(pid.PV,3) }}</span>
              <span style="font-size:10px;color:var(--text-secondary);"> {{ tag==='PIC-01'?'PSIG':'%' }}</span>
            </td>
          </tr>
          <tr>
            <td class="label-cell">CV</td>
            <td class="value-cell">
              <span class="val-display">{{ fmt(pid.CV,2) }}</span>
              <span style="font-size:10px;color:var(--text-secondary);"> %</span>
            </td>
          </tr>
          <tr>
            <td class="label-cell">SP</td>
            <td class="value-cell"><input type="number" v-model.number="form.SP" step="0.1"/></td>
          </tr>
          <tr>
            <td class="label-cell">MANUAL / AUTO</td>
            <td class="value-cell">
              <div class="mode-toggle">
                <button class="mode-opt" :class="form.modo==='Manual'?'active manual':''" @click="form.modo='Manual'">Manual</button>
                <button class="mode-opt" :class="form.modo==='Auto'?'active auto':''"   @click="form.modo='Auto'">Auto</button>
              </div>
            </td>
          </tr>
          <tr v-if="form.modo==='Manual'">
            <td class="label-cell">CV Manual</td>
            <td class="value-cell"><input type="number" v-model.number="form.CV_manual" step="0.5" min="0" max="100"/></td>
          </tr>
          <tr v-if="form.modo==='Manual'">
            <td class="label-cell">SP Manual</td>
            <td class="value-cell"><input type="number" v-model.number="form.SP_manual" step="0.5"/></td>
          </tr>
        </table>
        <div class="pid-section">
          <h4>⚙️ Parámetros PID</h4>
          <div class="pid-grid">
            <div class="pid-field"><label>Kp</label><input type="number" v-model.number="form.Kp" step="0.01" min="0"/></div>
            <div class="pid-field"><label>Ki</label><input type="number" v-model.number="form.Ki" step="0.001" min="0"/></div>
            <div class="pid-field"><label>Kd</label><input type="number" v-model.number="form.Kd" step="0.001" min="0"/></div>
          </div>
        </div>
        <button class="btn-save" @click="save">💾 Guardar</button>
      </div>
    </div>
  </div>`,

  setup(props, { emit }) {
    const fmt = (v,d=2) => parseFloat(v||0).toFixed(d);
    const form = reactive({
      SP: props.pid.SP, modo: props.pid.modo,
      CV_manual: props.pid.CV_manual, SP_manual: props.pid.SP,
      Kp: props.pid.Kp, Ki: props.pid.Ki, Kd: props.pid.Kd,
    });
    function save() {
      emit('save', { instrumento:props.tag, SP:form.SP, modo:form.modo,
        CV_manual:form.CV_manual, Kp:form.Kp, Ki:form.Ki, Kd:form.Kd });
    }
    return { fmt, form, save };
  }
};

// ═══════════════════════════════════════════════════════════════
// RANGOS PAGE
// ═══════════════════════════════════════════════════════════════
const RangosPage = {
  name: 'RangosPage',
  props: ['alarmas'],
  emits: ['saved','toast'],
  template: `
  <div class="p-4">
    <div class="page-header">
      <div class="page-title">📋 Configuración de Instrumentos – Rangos y Alarmas</div>
    </div>
    <div class="rangos-table-wrap">
      <table class="rangos-table">
        <thead>
          <tr>
            <th>Instrumento</th><th>Descripción</th><th>Unidad</th>
            <th>Mínimo</th><th>Máximo</th>
            <th>SP HH</th><th>SP H</th><th>SP L</th><th>SP LL</th>
            <th>DB</th><th>RAW H</th><th>RAW L</th><th>Guardar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in localRows" :key="row.instrumento">
            <td>{{ row.instrumento }}</td>
            <td style="text-align:left;font-size:11px;color:var(--text-secondary)">{{ row.descripcion }}</td>
            <td>{{ row.unidad }}</td>
            <td><input class="rt-input" type="number" v-model.number="row.minimo" step="0.1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.maximo" step="0.1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.SP_HH"  step="0.1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.SP_H"   step="0.1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.SP_L"   step="0.1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.SP_LL"  step="0.1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.DB"     step="0.1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.RAW_H"  step="1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.RAW_L"  step="1"/></td>
            <td><button class="btn-rt-save" @click="saveRow(row)">Guardar</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>`,

  setup(props, { emit }) {
    const localRows = ref([]);
    watch(() => props.alarmas, v => {
      localRows.value = JSON.parse(JSON.stringify(v || []));
    }, { immediate: true });

    async function saveRow(row) {
      try {
        const r = await fetch(`/api/alarmas/${row.instrumento}`, {
          method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(row)
        });
        if (r.ok) { emit('saved'); emit('toast', `✅ ${row.instrumento} guardado`); }
      } catch(e) { emit('toast','❌ Error al guardar','error'); }
    }

    return { localRows, saveRow };
  }
};
// ═══════════════════════════════════════════════════════════════
// INICIO PRUEBA PAGE
// ═══════════════════════════════════════════════════════════════
const InicioPruebaPage = {
  name: 'InicioPruebaPage',
  template: `
  <div class="p-4 flex flex-col gap-4 h-full overflow-y-auto w-full">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-white tracking-wide">📝 Inicio de Prueba</h1>
        <p class="text-xs text-gray-400 mt-0.5">Gestión y configuración de la prueba actual</p>
      </div>
      <div class="flex flex-wrap gap-2">
         <button class="px-3 py-1.5 bg-accent-blue hover:brightness-110 text-white text-xs font-bold rounded transition-all">
           Registro Total
         </button>
         <button class="px-3 py-1.5 bg-accent-blue hover:brightness-110 text-white text-xs font-bold rounded transition-all" @click="showForm = true">
           📋 Llenar Datos
         </button>
         <button class="px-3 py-1.5 bg-accent-green hover:brightness-110 text-white text-xs font-bold rounded transition-all">
           ▶ Iniciar Prueba
         </button>
         <button class="px-3 py-1.5 bg-accent-orange hover:brightness-110 text-white text-xs font-bold rounded transition-all">
           Cargar Datos
         </button>
      </div>
    </div>

    <!-- MAIN TABLES -->
    <div class="bg-bg-surface border border-gray-700 rounded-xl overflow-hidden mt-1 shadow-md">
      <div class="bg-accent-steel text-center text-white font-bold py-1.5 text-xs border-b border-gray-700 uppercase tracking-widest">
        Datos Inicio de Prueba
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-center">
          <thead>
            <tr class="bg-bg-tag text-white">
               <th class="py-2 px-2 border-r border-gray-700 font-semibold tracking-wide">REPORTE</th>
               <th class="py-2 px-2 border-r border-gray-700 font-semibold tracking-wide">NUMERO DE<br/>REPORTE</th>
               <th class="py-2 px-2 border-r border-gray-700 font-semibold tracking-wide">FECHA DE INICIO DE PRUEBA<br/>(DD/MM/AA)</th>
               <th class="py-2 px-2 border-r border-gray-700 font-semibold tracking-wide">HORA DE INICIO DE PRUEBA<br/>(HH:MM:SS)</th>
               <th class="py-2 px-2 font-semibold tracking-wide">TIEMPO TRANSCURRIDO<br/>(HH:MM:SS)</th>
            </tr>
          </thead>
          <tbody>
            <tr class="text-gray-200 font-mono border-b border-gray-700 bg-white/5">
               <td class="py-2 px-2 border-r border-gray-700">{{ config.reporte || '—' }}</td>
               <td class="py-2 px-2 border-r border-gray-700">{{ config.numReporte || '—' }}</td>
               <td class="py-2 px-2 border-r border-gray-700">{{ sysDate }}</td>
               <td class="py-2 px-2 border-r border-gray-700">{{ startHour }}</td>
               <td class="py-2 px-2">{{ elapsedTime }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="bg-bg-surface border border-gray-700 rounded-xl overflow-hidden shadow-md mt-1">
      <table class="w-full text-xs">
        <thead>
          <tr class="bg-bg-tag text-white">
             <th class="py-2 px-4 text-center font-semibold border-r border-gray-700 w-2/3 uppercase tracking-wide">Parámetro</th>
             <th class="py-2 px-4 text-center font-semibold uppercase tracking-wide">Valores</th>
          </tr>
        </thead>
        <tbody class="text-gray-200">
          <tr class="border-b border-gray-700/50 hover:bg-white/5">
            <td class="py-2.5 px-4 text-center font-bold border-r border-gray-700 text-white bg-accent-steel/20 uppercase">Lugar de la Prueba</td>
            <td class="py-2.5 px-4 text-center font-mono">{{ config.lugar || '—' }}</td>
          </tr>
          <tr class="border-b border-gray-700/50 hover:bg-white/5">
            <td class="py-2.5 px-4 text-center font-bold border-r border-gray-700 text-white bg-accent-steel/20 uppercase">Numero de Pozo</td>
            <td class="py-2.5 px-4 text-center font-mono">{{ config.pozo || '—' }}</td>
          </tr>
          <tr class="border-b border-gray-700/50 hover:bg-white/5">
            <td class="py-2.5 px-4 text-center font-bold border-r border-gray-700 text-white bg-accent-steel/20 uppercase">Metodo de Produccion</td>
            <td class="py-2.5 px-4 text-center font-mono">{{ config.metodo || '—' }}</td>
          </tr>
          <tr class="border-b border-gray-700/50 hover:bg-white/5">
            <td class="py-2.5 px-4 text-center font-bold border-r border-gray-700 text-white bg-accent-steel/20 uppercase">RPM de la Bomba/ Diametro del Disco</td>
            <td class="py-2.5 px-4 text-center font-mono">{{ config.rpm || '—' }}</td>
          </tr>
          <tr class="border-b border-gray-700/50 hover:bg-white/5">
            <td class="py-2.5 px-4 text-center font-bold border-r border-gray-700 text-white bg-accent-steel/20 uppercase">Inyeccion Diluente</td>
            <td class="py-2.5 px-4 text-center font-mono">{{ config.inyeccion || '—' }}</td>
          </tr>
          <tr class="border-b border-gray-700/50 hover:bg-white/5">
            <td class="py-2.5 px-4 text-center font-bold border-r border-gray-700 text-white bg-accent-steel/20 uppercase">Temperatura de Yacimiento</td>
            <td class="py-2.5 px-4 text-center font-mono">{{ config.tempYac ? config.tempYac + ' °C' : '—' }}</td>
          </tr>
          <tr class="border-b border-gray-700/50 hover:bg-white/5">
            <td class="py-2.5 px-4 text-center font-bold border-r border-gray-700 text-white bg-accent-steel/20 uppercase">API de Formacion</td>
            <td class="py-2.5 px-4 text-center font-mono">{{ config.apiFormacion || '—' }}</td>
          </tr>
          <tr class="border-b border-gray-700/50 hover:bg-white/5">
            <td class="py-2.5 px-4 text-center font-bold border-r border-gray-700 text-white bg-accent-steel/20 uppercase">API de la Mezcla</td>
            <td class="py-2.5 px-4 text-center font-mono">{{ config.apiMezcla || '—' }}</td>
          </tr>
          <tr class="border-b border-gray-700/50 hover:bg-white/5">
            <td class="py-2.5 px-4 text-center font-bold border-r border-gray-700 text-white bg-accent-steel/20 uppercase">API Diluente</td>
            <td class="py-2.5 px-4 text-center font-mono">{{ config.apiDiluente || '—' }}</td>
          </tr>
          <tr class="hover:bg-white/5">
            <td class="py-2.5 px-4 text-center font-bold border-r border-gray-700 text-white bg-accent-steel/20 uppercase">Caudal de Diluente</td>
            <td class="py-2.5 px-4 text-center font-mono">{{ config.caudalDiluente || '0 (BBD)' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL FORM -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal" style="width: 440px;">
        <div class="modal-header">
          <h3>Datos de Inicio de Prueba</h3>
          <button class="modal-close" @click="showForm = false">✕</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <table class="form-table">
            <tr><td class="label-cell">Reporte</td><td class="value-cell"><input v-model="form.reporte" type="text" /></td></tr>
            <tr><td class="label-cell">Número Reporte</td><td class="value-cell"><input v-model="form.numReporte" type="text" /></td></tr>
            <tr><td class="label-cell">Lugar de la Prueba</td><td class="value-cell"><input v-model="form.lugar" type="text" /></td></tr>
            <tr><td class="label-cell">Numero de Pozo</td><td class="value-cell"><input v-model="form.pozo" type="text" /></td></tr>
            <tr><td class="label-cell">Metodo Producción</td><td class="value-cell"><input v-model="form.metodo" type="text" /></td></tr>
            <tr><td class="label-cell">RPM / Diam. Disco</td><td class="value-cell"><input v-model="form.rpm" type="text" /></td></tr>
            <tr><td class="label-cell">Inyección Diluente</td><td class="value-cell"><input v-model="form.inyeccion" type="text" /></td></tr>
            <tr><td class="label-cell">Temp. Yacimiento</td><td class="value-cell"><input v-model="form.tempYac" type="text" /></td></tr>
            <tr><td class="label-cell">API de Formacion</td><td class="value-cell"><input v-model="form.apiFormacion" type="text" /></td></tr>
            <tr><td class="label-cell">API de Mezcla</td><td class="value-cell"><input v-model="form.apiMezcla" type="text" /></td></tr>
            <tr><td class="label-cell">API Diluente</td><td class="value-cell"><input v-model="form.apiDiluente" type="text" /></td></tr>
            <tr><td class="label-cell">Caudal Diluente</td><td class="value-cell"><input v-model="form.caudalDiluente" type="text" /></td></tr>
          </table>
          <button @click="saveForm" class="btn-save" style="margin-top: 16px;">💾 Guardar</button>
        </div>
      </div>
    </div>
  </div>
  `,
  setup() {
    const showForm = ref(false);
    
    const config = reactive({
      reporte: '116-1998-196-BM7-171',
      numReporte: '117',
      lugar: 'BARE5',
      pozo: '196',
      metodo: 'BM',
      rpm: '7',
      inyeccion: '',
      tempYac: '134,4',
      apiFormacion: '9,3',
      apiMezcla: '26',
      apiDiluente: '30,7',
      caudalDiluente: '0'
    });

    const form = reactive({...config});

    function saveForm() {
      Object.assign(config, form);
      showForm.value = false;
    }

    const sysDate = ref('0/0/0');
    const startHour = ref('0:0:0');
    const elapsedTime = ref('0:0:0');

    // Inicializamos con valores similares a la UI al cargar
    onMounted(() => {
        const d = new Date();
        sysDate.value = d.toLocaleDateString();
        startHour.value = d.toLocaleTimeString();
    });

    return { showForm, config, form, saveForm, sysDate, startHour, elapsedTime };
  }
};

// ═══════════════════════════════════════════════════════════════
// REPORTES PAGE
// ═══════════════════════════════════════════════════════════════
const ReportesPage = {
  name: 'ReportesPage',
  template: `
  <div class="px-6 py-8 flex flex-col items-center justify-center w-full max-w-4xl mx-auto animation-fade-in">
    <!-- TITULO Y CABECERA -->
    <div class="bg-bg-card border border-border rounded-xl shadow-lg w-full overflow-hidden mb-6">
      <div class="bg-accent-steel text-center text-white font-bold py-3 text-sm border-b border-border uppercase tracking-widest shadow-inner">
        Descarga de Reportes
      </div>

      <div class="flex flex-col md:flex-row gap-6 p-8 justify-center bg-bg-surface">
        
        <!-- Fecha Inicio -->
        <div class="flex-1 bg-bg-card border border-border shadow-sm rounded-lg p-5 flex flex-col items-center max-w-[300px]">
          <div class="text-white font-bold mb-4 uppercase text-xs tracking-wider border-b border-border w-full text-center pb-2">Fecha Inicio</div>
          <div class="w-full flex flex-col gap-4 mt-2">
            <div class="relative">
              <label class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 block">Día</label>
              <input type="date" v-model="fechaInicio" class="w-full bg-bg-primary border border-border rounded-md px-4 py-2 text-white text-sm outline-none focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow transition-all" />
            </div>
            <div class="relative">
              <label class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 block">Hora</label>
              <input type="time" v-model="horaInicio" class="w-full bg-bg-primary border border-border rounded-md px-4 py-2 text-white text-sm outline-none focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow transition-all" />
            </div>
          </div>
        </div>

        <!-- Fecha Final -->
        <div class="flex-1 bg-bg-card border border-border shadow-sm rounded-lg p-5 flex flex-col items-center max-w-[300px]">
          <div class="text-white font-bold mb-4 uppercase text-xs tracking-wider border-b border-border w-full text-center pb-2">Fecha Final</div>
          <div class="w-full flex flex-col gap-4 mt-2">
            <div class="relative">
              <label class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 block">Día</label>
              <input type="date" v-model="fechaFin" class="w-full bg-bg-primary border border-border rounded-md px-4 py-2 text-white text-sm outline-none focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow transition-all" />
            </div>
            <div class="relative">
              <label class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 block">Hora</label>
              <input type="time" v-model="horaFin" class="w-full bg-bg-primary border border-border rounded-md px-4 py-2 text-white text-sm outline-none focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow transition-all" />
            </div>
          </div>
        </div>

      </div>
      
      <!-- BOTON DE DESCARGA -->
      <div class="p-5 bg-bg-card border-t border-border flex justify-center items-center">
        <button @click="descargar" class="px-10 py-3 bg-bg-tag hover:brightness-110 text-white font-bold rounded shadow-lg transition-transform transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 border border-accent-steel border-opacity-50">
          <span class="text-lg">📊</span>
          <span>Descargar Reporte (Excel / CSV)</span>
        </button>
      </div>
    </div>
  </div>
  `,
  setup() {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000; 
    const localISO = new Date(d.getTime() - tzOffset).toISOString();
    const todayStr = localISO.split('T')[0];
    
    // Iniciar el día a las 00:00 y fin a 23:59
    const fechaInicio = ref(todayStr);
    const horaInicio = ref('00:00');
    
    const fechaFin = ref(todayStr);
    const horaFin = ref('23:59');

    function descargar() {
      const dtInicio = fechaInicio.value + " " + horaInicio.value + ":00";
      const dtFin = fechaFin.value + " " + horaFin.value + ":59";

      const qs = new URLSearchParams({ inicio: dtInicio, fin: dtFin });
      window.location.href = "/api/reportes/descargar?" + qs.toString();
    }

    return { fechaInicio, horaInicio, fechaFin, horaFin, descargar };
  }
};

// ── Mount ────────────────────────────────────────────────────
const app = createApp(App);
app.component('proceso-page',   ProcesoPage);
app.component('inicio-prueba-page', InicioPruebaPage);
app.component('reportes-page',  ReportesPage);
app.component('data-cruda-page',DataCrudaPage);
app.component('pid-modal',      PidModal);
app.component('rangos-page',    RangosPage);
app.mount('#app');
