// ============================================================
// MFM ORINOCO – Vue 3 Application (app.js) v3 – Sidebar + Data Cruda
// ============================================================
const { createApp, ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } = Vue;

function alarmClass(value, cfg) {
  if (!cfg) return '';
  const v = parseFloat(value);
  if (isNaN(v)) return '';
  if (cfg.SP_HH !== null && v >= cfg.SP_HH) return 'alarm-hh';
  if (cfg.SP_H !== null && v >= cfg.SP_H) return 'alarm-h';
  if (cfg.SP_LL !== null && v <= cfg.SP_LL) return 'alarm-ll';
  if (cfg.SP_L !== null && v <= cfg.SP_L) return 'alarm-l';
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

        <div v-if="page==='propiedades'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <propiedades-page @open-pvt="page='pvt'" />
        </div>

        <div v-if="page==='pvt'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <pvt-page @back="page='propiedades'" />
        </div>

        <div v-if="page==='reportes'" class="flex-1 overflow-y-auto overflow-x-hidden flex items-center justify-center">
          <reportes-page />
        </div>

        <div v-if="page==='data_cruda'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <data-cruda-page :proc="proc"/>
        </div>

        <div v-if="page==='prueba_progreso'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <prueba-progreso-page :proc="proc" />
        </div>

        <div v-if="page==='rangos'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <rangos-page
            :alarmas="alarmas"
            :proc="proc"
            @saved="loadAlarmas"
            @toast="showToast"/>
        </div>

        <div v-if="page==='calibracion'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <calibracion-page @toast="showToast" />
        </div>

        <div v-if="page==='daq_config'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <daq-config-page />
        </div>

        <div v-if="page==='hart_config'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <hart-config-page />
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
    const page = ref('proceso');
    const connected = ref(false);
    const lazos = ref(true);
    const toasts = ref([]);
    const alarmas = ref([]);
    const clock = ref('--:--:--');
    const sidebarOpen = ref(true);

    const navItems = [
      { key: 'proceso', icon: '🏠', label: 'Inicio / Proceso' },
      { key: 'inicio_prueba', icon: '📝', label: 'Inicio Prueba' },
      { key: 'reportes', icon: '📥', label: 'Reportes' },
      { key: 'data_cruda', icon: '📊', label: 'Data Cruda' },
      { key: 'rangos', icon: '🔧', label: 'Conf. Instrum.' },
      { key: 'propiedades', icon: '🔧', label: 'Propiedades' },
      { key: 'calibracion', icon: '🎯', label: 'Datos Calibración' },
      { key: 'prueba_progreso', icon: '🔧', label: 'Prueba Progreso' },
      { key: 'daq_config', icon: '📡', label: 'Config DAQ' },
      { key: 'hart_config', icon: '⚡', label: 'Config HART' },
    ];

    const proc = reactive({
      r_LIT_001: 0, r_WC: 0, PDI_01: 0, r_Q_gas_STD: 0, r_P_Gas: 0, r_T_Gas: 0,
      r_P_Oil: 0, r_PDT_02: 0, r_T_oil_F: 0, r_T_Oil_C: 0, r_Q_gas: 0,
      r_GVoidF: 0, r_v_oil_medida: 0, r_nivel_aux: 0,
      PCV_01_cv: 0, LCV_01_cv: 0, timestamp: '--',
      Est_Q_Liq: 0, Est_Q_Crudo: 0, Est_Q_Neto: 0, Est_Q_Dil: 0, Est_Q_Agua: 0, Est_Q_Gas: 0,
      Q_Liq: 0, Q_Crudo: 0, Q_Neto: 0, Q_Dil: 0, Q_Agua: 0, Q_Gas: 0
    });
    const pid_p = reactive({ instrumento: 'PIC-01', modo: 'Manual', PV: 0, CV: 0, SP: 0, CV_manual: 0, Kp: 1.2, Ki: 0.08, Kd: 0.05 });
    const pid_n = reactive({ instrumento: 'LIC-01', modo: 'Manual', PV: 0, CV: 0, SP: 0, CV_manual: 0, Kp: 1.0, Ki: 0.10, Kd: 0.02 });
    const modalPid = reactive({ show: false, pid: 'PIC-01' });

    let clockTimer;
    const tickClock = () => { clock.value = new Date().toLocaleTimeString('es-VE'); };

    function showToast(msg, type = 'success') {
      const id = Date.now();
      toasts.value.push({ id, msg, type });
      setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 3000);
    }

    async function loadAlarmas() {
      try { alarmas.value = await (await fetch('/api/alarmas')).json(); } catch (e) { }
    }

    function openPid(tag) { modalPid.pid = tag; modalPid.show = true; }

    async function savePid(payload) {
      try {
        const r = await fetch(`/api/pid/${payload.instrumento}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (r.ok) {
          const d = await r.json();
          Object.assign(payload.instrumento === 'PIC-01' ? pid_p : pid_n, d);
          showToast(`✅ ${payload.instrumento} guardado`);
          modalPid.show = false;
        }
      } catch (e) { showToast('❌ Error al guardar', 'error'); }
    }

    async function toggleLazos() {
      try {
        const d = await (await fetch('/api/lazos/deshabilitar', { method: 'POST' })).json();
        lazos.value = d.lazos_habilitados;
        showToast(lazos.value ? '✅ Lazos habilitados' : '⚠️ Lazos deshabilitados', lazos.value ? 'success' : 'error');
      } catch (e) { }
    }

    let socket;
    onMounted(() => {
      loadAlarmas();
      clockTimer = setInterval(tickClock, 1000);
      tickClock();
      socket = io({ transports: ['websocket'], reconnectionDelay: 1000 });
      socket.on('connect', () => { connected.value = true; });
      socket.on('disconnect', () => { connected.value = false; });
      socket.on('process_data', d => {
        Object.assign(proc, d.process);
        Object.assign(pid_p, d.pid_presion);
        Object.assign(pid_n, d.pid_nivel);
        lazos.value = d.lazos_habilitados;
      });
      socket.on('pid_updated', d => { Object.assign(d.instrumento === 'PIC-01' ? pid_p : pid_n, d); });
      socket.on('pid_config', d => {
        if (d['PIC-01']) Object.assign(pid_p, d['PIC-01']);
        if (d['LIC-01']) Object.assign(pid_n, d['LIC-01']);
      });
    });
    onUnmounted(() => { clearInterval(clockTimer); if (socket) socket.disconnect(); });

    return {
      page, connected, lazos, toasts, alarmas, clock, proc, pid_p, pid_n, modalPid,
      sidebarOpen, navItems, openPid, savePid, toggleLazos, loadAlarmas, showToast
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// PROCESO PAGE  –  Imagen P&ID + tags superpuestos (shifted right)
// ═══════════════════════════════════════════════════════════════
const ProcesoPage = {
  name: 'ProcesoPage',
  props: ['proc', 'pid_p', 'pid_n', 'alarmas', 'lazos'],
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

      <!-- TAG LIT-01 (junto al tanque) -->
      <div class="pid-tag li-tag" :class="alarmCls('r_LIT_001')">
        <div class="pt-name">LIT-01</div>
        <div class="pt-val">{{ fmt(proc.r_LIT_001,1) }}<span class="pt-unit"> %</span></div>
        <div class="li-bar-wrap">
          <div class="li-bar-fill" :style="{width: Math.min(100,Math.max(0,proc.r_LIT_001||0))+'%'}"></div>
        </div>
      </div>
      <!-- TAG WC (debajo de LIT-01) -->
      <div class="pid-tag wc-tag" :class="alarmCls('r_WC')">
        <div class="pt-name">WC</div>
        <div class="pt-val">{{ fmt(proc.r_WC,1) }}<span class="pt-unit"> %</span></div>
        <div class="li-bar-wrap">
          <div class="li-bar-fill" :style="{width: Math.min(100,Math.max(0,proc.r_WC||0))+'%'}"></div>
        </div>
      </div>
      <!-- TAG Nivel Aux (debajo de WC) -->
      <div class="pid-tag" style="position: absolute; left: 18.5%; top: 70%; min-width: 70px; z-index: 11;" :class="alarmCls('r_nivel_aux')">
        <div class="pt-name">Nivel Aux</div>
        <div class="pt-val">{{ fmt(proc.r_nivel_aux,1) }}<span class="pt-unit"> %</span></div>
      </div>

      <!-- TAG LAMINAR A (Gas) -->
      <div class="pid-tag laminar-a-tag" :class="alarmCls('PDI_01')">
        <div class="pt-name">Laminar A</div>
        <div class="pt-val">{{ fmt(proc.PDI_01,2) }}<span class="pt-unit"> inH2O</span></div>
      </div>

      <!-- TAG WEDGE (Líquido) -->
      <div class="pid-tag wedge-tag" :class="alarmCls('r_PDT_02')">
        <div class="pt-name">Wedge</div>
        <div class="pt-val">{{ fmt(proc.r_PDT_02,2) }}<span class="pt-unit"> inH2O</span></div>
        <div class="pt-val pt-secondary">{{ fmt(proc.r_P_Oil,2) }}<span class="pt-unit"> PSIG</span></div>
      </div>

      <!-- ════ FILA SUPERIOR: FIT-03 | PIT-01 | TIT-01 ════ -->
      <div class="pid-tag-group top-row">
        <div class="pid-tag" :class="alarmCls('r_Q_gas_STD')">
          <div class="pt-name">FIT-03</div>
          <div class="pt-val">{{ fmt(proc.r_Q_gas_STD,2) }}<span class="pt-unit"> MSCFD</span></div>
        </div>
        <div class="pid-tag" :class="alarmCls('r_P_Gas')">
          <div class="pt-name">PIT-01</div>
          <div class="pt-val">{{ fmt(proc.r_P_Gas,2) }}<span class="pt-unit"> PSIG</span></div>
        </div>
        <div class="pid-tag" :class="alarmCls('r_T_Oil_C')">
          <div class="pt-name">TIT-01</div>
          <div class="pt-val">{{ fmt(proc.r_T_Oil_C,2) }}<span class="pt-unit"> °C</span></div>
        </div>
      </div>

      <!-- ════ FILA INFERIOR: TIT-02 | %GAS-01 | VI-01 ════ -->
      <div class="pid-tag-group bot-row">
        <div class="pid-tag" :class="alarmCls('r_T_Gas')">
          <div class="pt-name">TIT-02</div>
          <div class="pt-val">
            <span v-if="alarmCls('r_T_Gas')" class="pt-alarm-icon">🔴</span>
            {{ fmt(proc.r_T_Gas,1) }}<span class="pt-unit"> °C</span>
          </div>
          <div class="pt-val pt-secondary">{{ fmt(proc.r_T_oil_F,2) }}<span class="pt-unit"> °F</span></div>
        </div>
        <div class="pid-tag warn-tag">
          <div class="pt-name">A %GAS-01</div>
          <div class="pt-val">
            <span v-if="proc.r_GVoidF > 20" class="pt-alarm-icon">🔥</span>
            {{ fmt(proc.r_GVoidF,1) }}<span class="pt-unit"> %</span>
          </div>
        </div>
        <div class="pid-tag" :class="alarmCls('r_v_oil_medida')">
          <div class="pt-name">VIT-01</div>
          <div class="pt-val">{{ fmt(proc.r_v_oil_medida,1) }}<span class="pt-unit"> CP</span></div>
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
      <!-- Fila 1: Estimados -->
      <div class="bt-cell header"><span class="bt-label">Est. Qliq</span><span class="bt-value">{{ fmt(proc.Est_Q_Liq,3) }}</span><span class="bt-label">BBLD</span></div>
      <div class="bt-cell header"><span class="bt-label">Est. Q.Crudo</span><span class="bt-value">{{ fmt(proc.Est_Q_Crudo,3) }}</span><span class="bt-label">BBLD</span></div>
      <div class="bt-cell header"><span class="bt-label">Est. Q.Neto</span><span class="bt-value">{{ fmt(proc.Est_Q_Neto,3) }}</span><span class="bt-label">BBLD</span></div>
      <div class="bt-cell header"><span class="bt-label">Est. Q.Diluente</span><span class="bt-value">{{ fmt(proc.Est_Q_Dil,3) }}</span><span class="bt-label">BBLD</span></div>
      <div class="bt-cell header"><span class="bt-label">Est. Q.Agua</span><span class="bt-value">{{ fmt(proc.Est_Q_Agua,3) }}</span><span class="bt-label">BBLD</span></div>
      <div class="bt-cell header"><span class="bt-label">Est. Gas Total STD</span><span class="bt-value">{{ fmt(proc.Est_Q_Gas,3) }}</span><span class="bt-label">MSCFD</span></div>
      <!-- Fila 2: Medidos -->
      <div class="bt-cell"><span class="bt-label">Q Líquido</span><span class="bt-value">{{ fmt(proc.Q_Liq,3) }}</span><span class="bt-label">BD</span></div>
      <div class="bt-cell"><span class="bt-label">Q Crudo</span><span class="bt-value">{{ fmt(proc.Q_Crudo,3) }}</span><span class="bt-label">BD</span></div>
      <div class="bt-cell"><span class="bt-label">Q Neto</span><span class="bt-value">{{ fmt(proc.Q_Neto,3) }}</span><span class="bt-label">BD</span></div>
      <div class="bt-cell"><span class="bt-label">Q Diluente</span><span class="bt-value">{{ fmt(proc.Q_Dil,3) }}</span><span class="bt-label">BD</span></div>
      <div class="bt-cell"><span class="bt-label">Q Agua</span><span class="bt-value">{{ fmt(proc.Q_Agua,3) }}</span><span class="bt-label">BD</span></div>
      <div class="bt-cell"><span class="bt-label">Q Gas</span><span class="bt-value">{{ fmt(proc.Q_Gas,3) }}</span><span class="bt-label">MSCFD</span></div>
    </div>
  </div>`,

  setup(props) {
    const imgError = ref(false);
    const fmt = (v, d = 2) => (v !== undefined && v !== null) ? parseFloat(v).toFixed(d) : '—';

    const alarmMap = computed(() => {
      const m = {};
      (props.alarmas || []).forEach(a => { m[a.instrumento] = a; });
      return m;
    });

    function alarmCls(key) {
      const tagMap = {
        r_Q_gas_STD: 'FI-03',
        r_P_Gas: 'PI-01',
        r_T_Oil_C: 'TI-01',
        r_LIT_001: 'LI-01',
        PDI_01: 'PDI-01',
        r_PDT_02: 'PDI-02',
        r_T_Gas: 'TI-02',
        r_GVoidF: 'GAS-01',
        r_v_oil_medida: 'VI-01'
      };
      const tag = tagMap[key];
      if (!tag) return '';
      return alarmClass(props.proc[key], alarmMap.value[tag]);
    }

    const levelPct = computed(() => Math.min(100, Math.max(0, parseFloat(props.proc.r_LIT_001) || 0)));

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
    const paused = ref(false);
    const windowSize = ref(120);  // puntos mostrados
    let chartInstance = null;

    const variables = reactive([
      { key: 'r_Q_gas_STD', label: 'r_Q_gas_STD Caudal Gas', unit: 'MSCFD', color: '#5ac8d4', active: true, decimals: 2, min: 0, max: 10 },
      { key: 'r_P_Gas', label: 'r_P_Gas Presión', unit: 'PSIG', color: '#e6a817', active: true, decimals: 1, min: 0, max: 500 },
      { key: 'r_T_Oil_C', label: 'r_T_Oil_C Temperatura', unit: '°C', color: '#e67e22', active: true, decimals: 2, min: 0, max: 100 },
      { key: 'r_LIT_001', label: 'r_LIT_001 Nivel', unit: '%', color: '#27a766', active: true, decimals: 1, min: 0, max: 100 },
      { key: 'r_T_Gas', label: 'r_T_Gas Temp. Fondo', unit: '°C', color: '#c0392b', active: false, decimals: 1, min: 0, max: 100 },
      { key: 'r_GVoidF', label: 'r_GVoidF Fracción Gas', unit: '%', color: '#9b59b6', active: false, decimals: 1, min: 0, max: 100 },
      { key: 'r_v_oil_medida', label: 'r_v_oil_medida Viscosidad', unit: 'CP', color: '#3498db', active: false, decimals: 1, min: 0, max: 200 },
    ]);

    // Historia de cada variable
    const historyLabels = ref([]);
    const historyData = reactive({});
    const histStats = reactive({});

    variables.forEach(v => {
      historyData[v.key] = [];
      histStats[v.key] = null;
    });

    function fmtVal(val, d = 2) {
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
        histStats[v.key] = null;
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
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#6b7280', font: { family: 'Roboto Mono', size: 10 }, maxTicksLimit: 10 },
              border: { color: '#30363d' },
            },
            y: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#6b7280', font: { family: 'Roboto Mono', size: 10 } },
              border: { color: '#30363d' },
            },
          },
        },
      });
    }

    function updateChart() {
      if (!chartInstance) return;
      chartInstance.data.datasets = buildDatasets();
      chartInstance.data.labels = [...historyLabels.value];
      chartInstance.update('none');
    }

    // Observar cambios de proc para añadir puntos
    let ticker = null;
    watch(() => props.proc.timestamp, () => {
      if (paused.value) return;
      const now = new Date().toLocaleTimeString('es-VE');
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
  props: ['pid', 'tag'],
  emits: ['close', 'save'],
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
    const fmt = (v, d = 2) => parseFloat(v || 0).toFixed(d);
    const form = reactive({
      SP: props.pid.SP, modo: props.pid.modo,
      CV_manual: props.pid.CV_manual, SP_manual: props.pid.SP,
      Kp: props.pid.Kp, Ki: props.pid.Ki, Kd: props.pid.Kd,
    });
    function save() {
      emit('save', {
        instrumento: props.tag, SP: form.SP, modo: form.modo,
        CV_manual: form.CV_manual, Kp: form.Kp, Ki: form.Ki, Kd: form.Kd
      });
    }
    return { fmt, form, save };
  }
};

// ═══════════════════════════════════════════════════════════════
// RANGOS PAGE
// ═══════════════════════════════════════════════════════════════
const RangosPage = {
  name: 'RangosPage',
  props: ['alarmas', 'proc'],
  emits: ['saved', 'toast'],
  template: `
  <div class="p-4">
    <div class="page-header">
      <div class="page-title">📋 Configuración de Instrumentos – Rangos y Alarmas</div>
      <span class="live-badge">● EN VIVO</span>
    </div>
    <div class="rangos-table-wrap">
      <table class="rangos-table">
        <thead>
          <tr>
            <th>Instrumento</th><th>Descripción</th><th>Unidad</th>
            <th class="th-live">Valor Actual</th>
            <th>Mínimo</th><th>Máximo</th>
            <th>SP HH</th><th>SP H</th><th>SP L</th><th>SP LL</th>
            <th>DB</th><th>RAW H</th><th>RAW L</th>
            <th class="th-modo">Modo</th>
            <th class="th-val-man">Valor Manual</th>
            <th>Guardar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in localRows" :key="row.instrumento"
              :class="[row.modo_manual ? 'row-manual' : '', alarmClass(row)]">
            <td class="td-tag">{{ row.instrumento }}</td>
            <td style="text-align:left;font-size:11px;color:var(--text-secondary)">{{ row.descripcion }}</td>
            <td>{{ row.unidad }}</td>
            <!-- Valor en tiempo real -->
            <td class="td-live">
              <span class="live-dot" :class="liveColor(row)"></span>
              <span class="live-val" :class="liveColor(row)">
                {{ fmtLive(row) }}
              </span>
            </td>
            <td><input class="rt-input" type="number" v-model.number="row.minimo"  step="0.1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.maximo"  step="0.1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.SP_HH"  step="0.1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.SP_H"   step="0.1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.SP_L"   step="0.1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.SP_LL"  step="0.1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.DB"     step="0.1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.RAW_H"  step="1"/></td>
            <td><input class="rt-input" type="number" v-model.number="row.RAW_L"  step="1"/></td>
            <!-- Modo Auto/Manual -->
            <td class="td-modo">
              <button
                :class="['btn-modo', row.modo_manual ? 'btn-modo-manual' : 'btn-modo-auto']"
                @click="toggleModo(row)"
                :title="row.modo_manual ? 'Clic para volver a Automático' : 'Clic para activar Manual'">
                {{ row.modo_manual ? '🔴 Manual' : '🟢 Auto' }}
              </button>
            </td>
            <!-- Valor Manual -->
            <td class="td-val-man">
              <input
                class="rt-input rt-input-man"
                type="number" step="0.01"
                :disabled="!row.modo_manual"
                v-model.number="row.valor_manual"
                :placeholder="row.modo_manual ? 'Ingrese valor' : '—'"
                :style="row.modo_manual ? '' : 'opacity:0.3;cursor:not-allowed'"
              />
            </td>
            <td><button class="btn-rt-save" @click="saveRow(row)">Guardar</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>`,

  setup(props, { emit }) {
    const { ref, onMounted } = Vue;
    const localRows = ref([]);

    // Mapa instrumento → clave en proc (WebSocket)
    const LIVE_MAP = {
      'FI-03':   'r_Q_gas_STD',
      'GAS-01':  'r_GVoidF',
      'LI-01':   'r_LIT_001',
      'PDI-01':  'PDI_01',
      'PDI-02':  'r_PDT_02',
      'PDI-03':  'PDI_03',
      'PI-01':   'r_P_Gas',
      'TI-01':   'r_T_Oil_C',
      'TI-02':   'r_T_Gas',
      'VI-01':   'r_v_oil_medida',
      'WC':      'r_WC',
      'NIV-AUX': 'r_nivel_aux',
    };

    // Devuelve el valor live formateado
    function fmtLive(row) {
      const key = LIVE_MAP[row.instrumento];
      const v = key ? props.proc?.[key] : undefined;
      if (v === undefined || v === null) return '—';
      return parseFloat(v).toFixed(2);
    }

    // Clase de color según si está en alarma o normal
    function liveColor(row) {
      const key = LIVE_MAP[row.instrumento];
      const v = key ? parseFloat(props.proc?.[key]) : NaN;
      if (isNaN(v)) return 'live-neutral';
      if (v >= row.SP_HH || v <= row.SP_LL) return 'live-alarm';
      if (v >= row.SP_H  || v <= row.SP_L)  return 'live-warn';
      return 'live-ok';
    }

    // Clase de la fila entera si en alarma
    function alarmClass(row) {
      const c = liveColor(row);
      if (c === 'live-alarm') return 'row-alarm';
      if (c === 'live-warn')  return 'row-warn';
      return '';
    }

    async function cargar() {
      try {
        const r = await fetch('/api/alarmas');
        const data = await r.json();
        localRows.value = data.map(row => ({
          ...row,
          modo_manual:  row.modo_manual  ? 1 : 0,
          valor_manual: row.valor_manual ?? null,
          RAW_H:        row.RAW_H        ?? null,
          RAW_L:        row.RAW_L        ?? null,
        }));
      } catch (e) { /* sin BD */ }
    }

    onMounted(cargar);

    function toggleModo(row) {
      row.modo_manual = row.modo_manual ? 0 : 1;
      if (!row.modo_manual) row.valor_manual = null;
    }

    async function saveRow(row) {
      try {
        const r = await fetch(`/api/alarmas/${row.instrumento}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        });
        if (r.ok) {
          emit('saved');
          const modoLabel = row.modo_manual ? `Manual (${row.valor_manual ?? '—'})` : 'Automático';
          emit('toast', `✅ ${row.instrumento} guardado — Modo: ${modoLabel}`);
        }
      } catch (e) { emit('toast', '❌ Error al guardar', 'error'); }
    }

    return { localRows, toggleModo, saveRow, fmtLive, liveColor, alarmClass };
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

    const form = reactive({ ...config });

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

// ═══════════════════════════════════════════════════════════════
// PRUEBA-PROGRESO
// ═══════════════════════════════════════════════════════════════
const PruebaProgresoPage = {
  name: 'PruebaProgresoPage',
  props: ['proc'],
  template: `
  <div class="p-6 flex flex-col gap-6 w-full max-w-6xl mx-auto animation-fade-in overflow-y-auto h-full">

    <!-- HEADER -->
    <div class="bg-bg-card border border-border rounded-xl p-4 grid grid-cols-3 gap-6">
      <div class="flex flex-col gap-1">
        <div class="flex justify-between text-xs py-0.5"><span class="text-white font-bold uppercase">Reporte</span><span class="text-accent-yellow font-mono">{{ data.reporte }}</span></div>
        <div class="flex justify-between text-xs py-0.5"><span class="text-white font-bold uppercase">Fecha Inicio</span><span class="text-accent-yellow font-mono">{{ data.fechaInicio }}</span></div>
        <div class="flex justify-between text-xs py-0.5"><span class="text-white font-bold uppercase">Hora Inicio</span><span class="text-accent-yellow font-mono">{{ data.horaInicio }}</span></div>
      </div>
      <div class="flex flex-col gap-1">
        <div class="flex justify-between text-xs py-0.5"><span class="text-white font-bold uppercase">Método</span><span class="text-accent-yellow font-mono">{{ data.metodo }}</span></div>
        <div class="flex justify-between text-xs py-0.5"><span class="text-white font-bold uppercase">Pozo</span><span class="text-accent-yellow font-mono">{{ data.pozo }}</span></div>
        <div class="flex justify-between text-xs py-0.5"><span class="text-white font-bold uppercase">Tiempo Trans.</span><span class="text-accent-yellow font-mono">{{ data.tiempoTranscurrido }}</span></div>
      </div>
      <div class="flex flex-col gap-1">
        <div class="flex justify-between text-xs py-0.5"><span class="text-white font-bold uppercase">RPM Bomba</span><span class="text-accent-yellow font-mono">{{ data.rpmBomba }}</span></div>
        <div class="flex justify-between text-xs py-0.5"><span class="text-white font-bold uppercase">API</span><span class="text-accent-yellow font-mono">{{ data.api }}</span></div>
        <div class="flex justify-between text-xs py-0.5"><span class="text-white font-bold uppercase">Iny. Diluente</span><span class="text-accent-yellow font-mono">{{ data.inyeccionDiluente }}</span></div>
      </div>
    </div>

    <!-- TREND + VALORES -->
    <div class="grid grid-cols-5 gap-5">
      <div class="col-span-3 bg-bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-accent-blue/10">
          <span class="text-accent-blue font-bold text-[10px] uppercase tracking-widest">Monitor de Tendencias</span>
          <div class="flex gap-1 flex-wrap">
            <button v-for="v in trendVars" :key="v.key" @click="v.active=!v.active;rebuildCharts()"
              :class="['px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all',v.active?'text-white':'border-gray-700 text-gray-500']"
              :style="v.active?{background:v.color,borderColor:v.color}:{}">{{ v.label }}</button>
            <button @click="paused=!paused" class="px-1.5 py-0.5 text-[8px] bg-white/10 text-white border border-white/20 rounded ml-1">{{ paused?'▶':'⏸' }}</button>
            <button @click="clearHistory" class="px-1.5 py-0.5 text-[8px] bg-accent-red/20 text-accent-red border border-accent-red/30 rounded">✕</button>
          </div>
        </div>
        <div class="p-3 flex-1" style="height:270px"><canvas ref="c0"></canvas></div>
      </div>
      <div class="col-span-2 bg-bg-card border border-border rounded-xl overflow-hidden">
        <div class="bg-accent-blue/10 text-center text-accent-blue font-bold py-2 text-xs border-b border-border uppercase tracking-widest">Valores Actuales</div>
        <div class="p-3 flex flex-col gap-1">
          <div v-for="p in params" :key="p.label" class="flex justify-between items-center border-b border-border/20 py-1.5">
            <span class="text-xs text-white font-bold uppercase">{{ p.label }}</span>
            <span class="text-sm font-mono font-bold text-accent-yellow">{{ p.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- CONDICIONES LINEA + ESTANDAR -->
    <div class="grid grid-cols-2 gap-5">
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-border" style="background:rgba(26,100,150,0.2)">
          <span class="text-accent-blue font-bold text-[10px] uppercase">Cond. de Línea</span>
          <button @click="pausedL=!pausedL" class="px-1.5 py-0.5 text-[8px] bg-white/10 text-white border border-white/20 rounded">{{ pausedL?'▶':'⏸' }}</button>
        </div>
        <div class="p-3" style="height:220px"><canvas ref="c1"></canvas></div>
        <div class="border-t border-border/30 overflow-y-auto" style="max-height:210px">
          <table class="w-full text-[11px]"><tbody>
            <tr v-for="r in condLinea" :key="r.label" class="border-b border-border/20 hover:bg-white/5">
              <td class="px-3 py-1 text-white font-bold uppercase">{{ r.label }}</td>
              <td class="px-3 py-1 text-right font-mono text-accent-yellow font-semibold">{{ r.value }}</td>
            </tr>
          </tbody></table>
        </div>
      </div>
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-border" style="background:rgba(39,167,102,0.15)">
          <span class="text-accent-green font-bold text-[10px] uppercase">Cond. Estándar (14.7 PSIA / 15.56°C)</span>
          <button @click="pausedS=!pausedS" class="px-1.5 py-0.5 text-[8px] bg-white/10 text-white border border-white/20 rounded">{{ pausedS?'▶':'⏸' }}</button>
        </div>
        <div class="p-3" style="height:220px"><canvas ref="c2"></canvas></div>
        <div class="border-t border-border/30 overflow-y-auto" style="max-height:210px">
          <table class="w-full text-[11px]"><tbody>
            <tr v-for="r in condEstandar" :key="r.label" class="border-b border-border/20 hover:bg-white/5">
              <td class="px-3 py-1 text-white font-bold uppercase">{{ r.label }}</td>
              <td class="px-3 py-1 text-right font-mono text-accent-yellow font-semibold">{{ r.value }}</td>
            </tr>
          </tbody></table>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between pb-1">
      <button class="w-10 h-10 rounded-full bg-accent-green flex items-center justify-center text-white shadow-lg hover:brightness-110 transition-all"><span>⬅️</span></button>
    </div>

  </div>
  `,
  setup(props) {
    const c0 = ref(null), c1 = ref(null), c2 = ref(null);
    const paused = ref(false), pausedL = ref(false), pausedS = ref(false);
    let charts = [null, null, null];

    const data = reactive({ reporte: 'REP-2026-001', fechaInicio: '08/05/2026', horaInicio: '10:30:15', metodo: 'Coriolis', pozo: 'BA-145', tiempoTranscurrido: '02:15:30', rpmBomba: '1250', api: '22.5', inyeccionDiluente: '15.2' });

    const trendVars = reactive([
      { key: 'r_WC', label: 'Corte Agua', color: '#27a766', active: true },
      { key: 'r_GVoidF', label: 'GVF', color: '#9b59b6', active: true },
      { key: 'r_T_Gas', label: 'T.Gas', color: '#5ac8d4', active: true },
      { key: 'r_P_Gas', label: 'Presión', color: '#e6a817', active: true },
      { key: 'r_v_oil_medida', label: 'Viscosidad', color: '#3498db', active: false },
    ]);

    const lineaVars = [
      { key: 'r_LIT_001', label: 'Vol. Líquido', color: '#27a766' },
      { key: 'r_P_Gas', label: 'Vol. Crudo', color: '#e6a817' },
      { key: 'r_Q_gas_STD', label: 'Vol. Gas', color: '#5ac8d4' },
    ];
    const estVars = [
      { key: 'r_LIT_001', label: 'Vol. Líq. Est', color: '#27a766' },
      { key: 'r_P_Gas', label: 'Vol. Crud. Est', color: '#e6a817' },
      { key: 'r_Q_gas_STD', label: 'Vol. Gas Est', color: '#5ac8d4' },
    ];

    const params = computed(() => [
      { label: 'Corte de Agua (%)', value: parseFloat(props.proc.r_WC || 0).toFixed(3) },
      { label: 'GVF (%)', value: parseFloat(props.proc.r_GVoidF || 0).toFixed(3) },
      { label: 'Temp. Gas (ºC)', value: parseFloat(props.proc.r_T_Gas || 0).toFixed(3) },
      { label: 'Temp. Mezcla (ºC)', value: parseFloat(props.proc.r_T_Oil_C || 0).toFixed(3) },
      { label: 'Presión en Línea (PSI)', value: parseFloat(props.proc.r_P_Gas || 0).toFixed(1) },
      { label: 'Viscosidad (cP)', value: parseFloat(props.proc.r_v_oil_medida || 0).toFixed(1) },
      { label: 'RGP', value: (parseFloat(props.proc.r_Q_gas_STD || 0) * 12.5).toFixed(3) },
      { label: 'RGP NETO', value: (parseFloat(props.proc.r_Q_gas_STD || 0) * 11.2).toFixed(3) },
    ]);

    const condLinea = computed(() => [
      { label: 'Vol. Líquido (BBLS)', value: (parseFloat(props.proc.r_LIT_001 || 0) * 0.1).toFixed(3) },
      { label: 'Vol. Crudo (BBLS)', value: (parseFloat(props.proc.r_P_Gas || 0) * 0.05).toFixed(3) },
      { label: 'Vol. Crudo Neto (BBLS)', value: (parseFloat(props.proc.r_P_Gas || 0) * 0.045).toFixed(3) },
      { label: 'Vol. Diluente (BBLS)', value: '0.000' },
      { label: 'Vol. Agua (BBLS)', value: (parseFloat(props.proc.r_LIT_001 || 0) * 0.02).toFixed(3) },
      { label: 'Vol. Gas Arrastrado (CF)', value: (parseFloat(props.proc.r_GVoidF || 0) * 1.2).toFixed(3) },
      { label: 'Vol. Gas Total (MCF)', value: (parseFloat(props.proc.r_Q_gas_STD || 0) * 0.8).toFixed(3) },
      { label: 'Tasa Est. Líquido (BPD)', value: (parseFloat(props.proc.r_LIT_001 || 0) * 2.4).toFixed(3) },
      { label: 'Tasa Est. Crudo (BPD)', value: (parseFloat(props.proc.r_P_Gas || 0) * 1.2).toFixed(3) },
      { label: 'Tasa Est. Crudo Neto (BPD)', value: (parseFloat(props.proc.r_P_Gas || 0) * 1.08).toFixed(3) },
      { label: 'Tasa Est. Diluente (BPD)', value: '0.000' },
      { label: 'Tasa Est. Agua (BPD)', value: (parseFloat(props.proc.r_LIT_001 || 0) * 0.48).toFixed(3) },
      { label: 'Tasa Est. Gas Arrastrado (CFD)', value: (parseFloat(props.proc.r_GVoidF || 0) * 28.8).toFixed(3) },
      { label: 'Tasa Est. Gas Total (MCFD)', value: (parseFloat(props.proc.r_Q_gas_STD || 0) * 19.2).toFixed(3) },
    ]);

    const condEstandar = computed(() => [
      { label: 'Vol. Líquido (BBLS)', value: (parseFloat(props.proc.r_LIT_001 || 0) * 0.098).toFixed(3) },
      { label: 'Vol. Crudo (BBLS)', value: (parseFloat(props.proc.r_P_Gas || 0) * 0.049).toFixed(3) },
      { label: 'Vol. Crudo Neto (BBLS)', value: (parseFloat(props.proc.r_P_Gas || 0) * 0.044).toFixed(3) },
      { label: 'Vol. Diluente (BBLS)', value: '0.000' },
      { label: 'Vol. Agua (BBLS)', value: (parseFloat(props.proc.r_LIT_001 || 0) * 0.019).toFixed(3) },
      { label: 'Vol. Gas Arrastrado (CF)', value: (parseFloat(props.proc.r_GVoidF || 0) * 1.15).toFixed(3) },
      { label: 'Vol. Gas Total (MCF)', value: (parseFloat(props.proc.r_Q_gas_STD || 0) * 0.76).toFixed(3) },
      { label: 'Tasa Est. Líquido (BPD)', value: (parseFloat(props.proc.r_LIT_001 || 0) * 2.35).toFixed(3) },
      { label: 'Tasa Est. Crudo (BPD)', value: (parseFloat(props.proc.r_P_Gas || 0) * 1.17).toFixed(3) },
      { label: 'Tasa Est. Crudo Neto (BPD)', value: (parseFloat(props.proc.r_P_Gas || 0) * 1.05).toFixed(3) },
      { label: 'Tasa Est. Diluente (BPD)', value: '0.000' },
      { label: 'Tasa Est. Agua (BPD)', value: (parseFloat(props.proc.r_LIT_001 || 0) * 0.46).toFixed(3) },
      { label: 'Tasa Est. Gas Arrastrado (CFD)', value: (parseFloat(props.proc.r_GVoidF || 0) * 27.6).toFixed(3) },
      { label: 'Tasa Est. Gas Total (MCFD)', value: (parseFloat(props.proc.r_Q_gas_STD || 0) * 18.2).toFixed(3) },
    ]);

    const hist = reactive({ labels: [], data: {} });
    const histL = reactive({ labels: [], data: {} });
    const histS = reactive({ labels: [], data: {} });
    trendVars.forEach(v => hist.data[v.key] = []);
    lineaVars.forEach(v => histL.data[v.key] = []);
    estVars.forEach(v => histS.data[v.key] = []);

    const chartOpts = {
      responsive: true, maintainAspectRatio: false, animation: { duration: 0 }, plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#9aa3af', font: { size: 10 }, maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#9aa3af', font: { size: 10 } } }
      }
    };

    function mkDS(vars, histObj) {
      return vars.map(v => ({ label: v.label, data: [...histObj.data[v.key]], borderColor: v.color, borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.3, hidden: v.active === false }));
    }

    function initCharts() {
      if (c0.value) charts[0] = new Chart(c0.value, { type: 'line', data: { labels: [], datasets: mkDS(trendVars, hist) }, options: chartOpts });
      if (c1.value) charts[1] = new Chart(c1.value, { type: 'line', data: { labels: [], datasets: mkDS(lineaVars, histL) }, options: chartOpts });
      if (c2.value) charts[2] = new Chart(c2.value, { type: 'line', data: { labels: [], datasets: mkDS(estVars, histS) }, options: chartOpts });
    }

    function rebuildCharts() {
      if (charts[0]) { charts[0].data.datasets = mkDS(trendVars, hist); charts[0].update('none'); }
    }

    function pushPt(now) {
      const MAX = 50;
      if (!paused.value) { hist.labels.push(now); if (hist.labels.length > MAX) hist.labels.shift(); trendVars.forEach(v => { hist.data[v.key].push(parseFloat(props.proc[v.key] || 0)); if (hist.data[v.key].length > MAX) hist.data[v.key].shift(); }); if (charts[0]) { charts[0].data.labels = [...hist.labels]; charts[0].data.datasets = mkDS(trendVars, hist); charts[0].update('none'); } }
      if (!pausedL.value) { histL.labels.push(now); if (histL.labels.length > MAX) histL.labels.shift(); lineaVars.forEach(v => { histL.data[v.key].push(parseFloat(props.proc[v.key] || 0)); if (histL.data[v.key].length > MAX) histL.data[v.key].shift(); }); if (charts[1]) { charts[1].data.labels = [...histL.labels]; charts[1].data.datasets = mkDS(lineaVars, histL); charts[1].update('none'); } }
      if (!pausedS.value) { histS.labels.push(now); if (histS.labels.length > MAX) histS.labels.shift(); estVars.forEach(v => { histS.data[v.key].push(parseFloat(props.proc[v.key] || 0)); if (histS.data[v.key].length > MAX) histS.data[v.key].shift(); }); if (charts[2]) { charts[2].data.labels = [...histS.labels]; charts[2].data.datasets = mkDS(estVars, histS); charts[2].update('none'); } }
    }

    function clearHistory() {
      hist.labels = []; trendVars.forEach(v => hist.data[v.key] = []);
      histL.labels = []; lineaVars.forEach(v => histL.data[v.key] = []);
      histS.labels = []; estVars.forEach(v => histS.data[v.key] = []);
      charts.forEach(ch => { if (ch) { ch.data.labels = []; ch.data.datasets.forEach(d => d.data = []); ch.update('none'); } });
    }

    watch(() => props.proc.timestamp, () => { pushPt(new Date().toLocaleTimeString('es-VE')); });
    onMounted(() => { nextTick(() => initCharts()); });
    onUnmounted(() => { charts.forEach(ch => { if (ch) ch.destroy(); }); });

    return { data, params, condLinea, condEstandar, trendVars, c0, c1, c2, paused, pausedL, pausedS, clearHistory, rebuildCharts };
  }
}
// ═══════════════════════════════════════════════════════════════
// PROPIEDADES 
// ═══════════════════════════════════════════════════════════════

const PropiedadesPage = {
  name: 'PropiedadesPage',
  template: `
  <div class="p-6 flex flex-col gap-6 w-full max-w-5xl mx-auto animation-fade-in overflow-y-auto h-full">
    
    <!-- SECTION 1: Referencias de Densidad Estandar -->
    <div class="bg-bg-card border border-border shadow-lg rounded-xl overflow-hidden">
      <div class="bg-accent-blue/20 text-center text-accent-blue font-bold py-2 text-xs border-b border-border uppercase tracking-widest">
        Referencias de Densidad Estándar
      </div>
      <div class="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-bg-surface/30">
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-white font-bold uppercase mb-1">Densidad Ref Diluente</label>
          <label class="text-[9px] text-gray-400 mb-2">(g/cm3 @ 60ºF, 14.7 PSIA)</label>
          <input type="number" v-model="propiedades.densidadRefDiluente" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
        </div>
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-white font-bold uppercase mb-1">Densidad Ref Crudo</label>
          <label class="text-[9px] text-gray-400 mb-2">(g/cm3 @ 60ºF, 14.7 PSIA)</label>
          <input type="number" v-model="propiedades.densidadRefCrudo" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
        </div>
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-white font-bold uppercase mb-1">Grav Esp Gas</label>
          <label class="text-[9px] text-gray-400 mb-2">(SG)</label>
          <input type="number" v-model="propiedades.gravEspGas" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
        </div>
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-white font-bold uppercase mb-1">Presión Atm</label>
          <label class="text-[9px] text-gray-400 mb-2">(PSIA)</label>
          <input type="number" v-model="propiedades.presionAtm" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
        </div>
      </div>
    </div>

    <!-- SECTION 2: Propiedades del Gas Estandar -->
    <div class="bg-bg-card border border-border shadow-lg rounded-xl overflow-hidden">
      <div class="bg-accent-blue/20 text-center text-accent-blue font-bold py-2 text-xs border-b border-border uppercase tracking-widest">
        Propiedades del Gas Estándar
      </div>
      <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-8 bg-bg-surface/30">
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-white font-bold uppercase mb-1">Constante de Gas (Kj/Kg/oK)</label>
          <input type="number" v-model="propiedades.constanteGas" class="w-32 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
        </div>
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-white font-bold uppercase mb-1">Presión Crítica de Gas (PSIA)</label>
          <input type="number" v-model="propiedades.presionCriticaGas" class="w-32 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
        </div>
      </div>
    </div>

    <!-- SECTION 3: Factor de Compresibilidad del Gas Z -->
    <div class="bg-bg-card border border-border shadow-lg rounded-xl overflow-hidden">
      <div class="bg-accent-blue/20 text-center text-accent-blue font-bold py-2 text-xs border-b border-border uppercase tracking-widest">
        Factor de Compresibilidad del Gas Z
      </div>
      <div class="p-4 bg-bg-surface/30 flex flex-col items-center gap-4">
        <div class="grid grid-cols-2 gap-x-12 gap-y-2 w-full max-w-md">
          <div class="flex items-center justify-between gap-4">
            <label class="text-[10px] text-white font-bold">A</label>
            <input type="number" v-model="propiedades.A" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
          </div>
          <div class="flex items-center justify-between gap-4">
            <label class="text-[10px] text-white font-bold">D</label>
            <input type="number" v-model="propiedades.D" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
          </div>
          <div class="flex items-center justify-between gap-4">
            <label class="text-[10px] text-white font-bold">B</label>
            <input type="number" v-model="propiedades.B" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
          </div>
          <div class="flex items-center justify-between gap-4">
            <label class="text-[10px] text-white font-bold">E</label>
            <input type="number" v-model="propiedades.E" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
          </div>
          <div class="flex items-center justify-between gap-4">
            <label class="text-[10px] text-white font-bold">C</label>
            <input type="number" v-model="propiedades.C" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
          </div>
          <div class="flex items-center justify-between gap-4">
            <label class="text-[10px] text-white font-bold">Z</label>
            <input type="number" v-model="propiedades.Z" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
          </div>
        </div>
        <div class="mt-2 pt-2 border-t border-border/50 w-full flex justify-center items-center gap-4">
          <label class="text-[10px] text-white font-bold uppercase">Densidad del Gas (Kg/m3)</label>
          <input type="number" v-model="propiedades.densidadGas" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
        </div>
      </div>
    </div>

    <!-- SECTION 4: Numero de Reynolds -->
    <div class="bg-bg-card border border-border shadow-lg rounded-xl overflow-hidden">
      <div class="bg-accent-blue/20 text-center text-accent-blue font-bold py-2 text-xs border-b border-border uppercase tracking-widest">
        Número de Reynolds para Condición de Medida
      </div>
      <div class="p-4 grid grid-cols-2 gap-8 bg-bg-surface/30">
        <div class="flex items-center justify-center gap-4">
          <label class="text-[10px] text-white font-bold uppercase">Laminar</label>
          <input type="number" v-model="propiedades.laminar" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
        </div>
        <div class="flex items-center justify-center gap-4">
          <label class="text-[10px] text-white font-bold uppercase">Wedge</label>
          <input type="number" v-model="propiedades.wedge" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
        </div>
      </div>
    </div>

    <!-- FOOTER BUTTONS -->
    <div class="flex items-center justify-between mt-4">
      <button class="w-10 h-10 rounded-full bg-accent-green flex items-center justify-center text-white shadow-lg hover:brightness-110 transition-all">
        <span class="text-xl">⬅️</span>
      </button>
      <div class="flex gap-4">
        <button @click="openPvt" class="px-8 py-2 bg-gray-300 hover:bg-white text-gray-800 font-bold rounded shadow-md border-b-4 border-gray-500 active:border-b-0 active:translate-y-1 transition-all">
          PVT
        </button>
        <button @click="cargarDatos" class="px-8 py-2 bg-gray-300 hover:bg-white text-gray-800 font-bold rounded shadow-md border-b-4 border-gray-500 active:border-b-0 active:translate-y-1 transition-all">
          Guardar
        </button>
      </div>
    </div>

    <!-- PVT DATA MODAL -->
    <pvt-data-modal v-if="showPvtModal" @close="showPvtModal=false" @save="onPvtModalSave" />

  </div>
  `,
  setup(props, { emit }) {
    const propiedades = reactive({
      densidadRefDiluente: 0.0,
      densidadRefCrudo: 0.0,
      gravEspGas: 0.0,
      presionAtm: 0.0,
      constanteGas: 0.0,
      presionCriticaGas: 0.0,
      A: 0.0, B: 0.0, C: 0.0, D: 0.0, E: 0.0, Z: 0.0,
      densidadGas: 0.0,
      laminar: 0.0,
      wedge: 0.0
    });

    const showPvtModal = ref(false);

    function openPvt() { emit('open-pvt'); }
    function cargarDatos() { showPvtModal.value = true; }
    function onPvtModalSave(data) {
      console.log("Datos PVT recibidos:", data);
      // Aquí se podrían actualizar los valores en el estado global o enviar a API
    }

    return { propiedades, openPvt, cargarDatos, showPvtModal, onPvtModalSave };
  }
}

// ═══════════════════════════════════════════════════════════════
// PVT PAGE
// ═══════════════════════════════════════════════════════════════
const PvtPage = {
  name: 'PvtPage',
  emits: ['back'],
  template: `
  <div class="p-6 flex flex-col gap-6 w-full max-w-5xl mx-auto animation-fade-in overflow-y-auto h-full">
    
    <!-- SECTION 1: Cálculos de PVT -->
    <div class="bg-bg-card border border-border shadow-lg rounded-xl overflow-hidden">
      <div class="bg-accent-blue/20 text-center text-accent-blue font-bold py-2 text-xs border-b border-border uppercase tracking-widest">
        Cálculos de PVT
      </div>
      <div class="p-6 grid grid-cols-1 sm:grid-cols-3 gap-8 bg-bg-surface/30">
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-white font-bold uppercase mb-1">Temp. Yacimiento (oF)</label>
          <input type="number" v-model="pvt.tempYac" class="w-32 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
        </div>
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-white font-bold uppercase mb-1">RSO</label>
          <input type="number" v-model="pvt.rso" class="w-32 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
        </div>
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-white font-bold uppercase mb-1">BO</label>
          <input type="number" v-model="pvt.bo" class="w-32 bg-bg-primary border border-border rounded px-2 py-1 text-white text-xs text-center outline-none focus:border-accent-yellow" />
        </div>
      </div>
    </div>

    <!-- SECTION 2: Balance de Masa -->
    <div class="bg-bg-card border border-border shadow-lg rounded-xl overflow-hidden">
      <div class="bg-accent-blue/20 text-center text-accent-blue font-bold py-2 text-xs border-b border-border uppercase tracking-widest">
        Balance de Masa
      </div>
      <div class="overflow-x-auto bg-bg-surface/30">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="border-b border-border/50 bg-white/5">
              <th class="p-3 font-bold text-gray-400 uppercase tracking-wider">Parámetro</th>
              <th class="p-3 font-bold text-gray-400 uppercase tracking-wider text-center">Reales</th>
              <th class="p-3 font-bold text-gray-400 uppercase tracking-wider text-center">Teórico</th>
              <th class="p-3 font-bold text-gray-400 uppercase tracking-wider text-center">Error %</th>
            </tr>
          </thead>
          <tbody class="text-white">
            <tr v-for="row in balanceRows" :key="row.label" class="border-b border-border/30 hover:bg-white/5 transition-colors">
              <td class="p-3 font-semibold">{{ row.label }}</td>
              <td class="p-3 text-center">
                <input type="number" v-model="pvt[row.key+'_real']" class="w-20 bg-bg-primary border border-border rounded px-1 text-xs text-center outline-none focus:border-accent-yellow" />
              </td>
              <td class="p-3 text-center">
                <input type="number" v-model="pvt[row.key+'_teo']" class="w-20 bg-bg-primary border border-border rounded px-1 text-xs text-center outline-none focus:border-accent-yellow" />
              </td>
              <td class="p-3 text-center text-accent-yellow font-mono">{{ calcError(pvt[row.key+'_real'], pvt[row.key+'_teo']) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- FOOTER BUTTONS -->
    <div class="flex items-center justify-between mt-4">
      <button @click="$emit('back')" class="w-10 h-10 rounded-full bg-accent-green flex items-center justify-center text-white shadow-lg hover:brightness-110 transition-all">
        <span class="text-xl">⬅️</span>
      </button>
      <div class="flex justify-center flex-1">
         <button @click="cargarDatos" class="px-8 py-2 bg-gray-300 hover:bg-white text-gray-800 font-bold rounded shadow-md border-b-4 border-gray-500 active:border-b-0 active:translate-y-1 transition-all">
          Cargar Datos PVT
        </button>
      </div>
    </div>

    <!-- PVT DATA MODAL -->
    <pvt-data-modal v-if="showPvtModal" @close="showPvtModal=false" @save="onPvtModalSave" />

  </div>
  `,
  setup() {
    const pvt = reactive({
      tempYac: 0, rso: 0, bo: 0,
      apiForm_real: 0, apiForm_teo: 0,
      apiMez_real: 0, apiMez_teo: 0,
      apiDil_real: 0, apiDil_teo: 0,
      qDil_real: 0, qDil_teo: 0,
      qNet_real: 0, qNet_teo: 0,
      qNetDil_real: 0, qNetDil_teo: 0,
      qAgua_real: 0, qAgua_teo: 0,
      qTotal_real: 0, qTotal_teo: 0
    });

    const balanceRows = [
      { label: 'API Formación @60ºF', key: 'apiForm' },
      { label: 'API Mezcla @60ºF', key: 'apiMez' },
      { label: 'API Diluente @60ºF', key: 'apiDil' },
      { label: 'Q Diluente BBDL', key: 'qDil' },
      { label: 'Q Neto BBDL', key: 'qNet' },
      { label: 'Q Neto + Diluente BBDL', key: 'qNetDil' },
      { label: 'Q Agua BBDL', key: 'qAgua' },
      { label: 'Q Total BBDL', key: 'qTotal' }
    ];

    const showPvtModal = ref(false);

    function calcError(real, teo) {
      if (!teo || teo === 0) return '0.00';
      const err = ((real - teo) / teo) * 100;
      return err.toFixed(2);
    }

    function cargarDatos() { showPvtModal.value = true; }

    function onPvtModalSave(data) {
      pvt.rso = data.rso;
      pvt.bo = data.bo;
    }

    return { pvt, balanceRows, calcError, cargarDatos, showPvtModal, onPvtModalSave };
  }
}

// ═══════════════════════════════════════════════════════════════
// PVT DATA MODAL (Popup)
// ═══════════════════════════════════════════════════════════════
const PvtDataModal = {
  name: 'PvtDataModal',
  emits: ['close', 'save'],
  template: `
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="bg-[#d1e8f7] border-2 border-[#1a6496] p-6 rounded shadow-2xl w-80 animation-scale-in">
      <div class="text-center text-[#1a6496] font-bold text-sm mb-6 tracking-widest uppercase">
        DATOS PVT
      </div>
      <div class="flex flex-col gap-4 mb-6 px-4">
        <div class="flex items-center justify-between gap-4">
          <label class="text-xs font-bold text-gray-800">RSO</label>
          <input type="number" v-model="form.rso" class="w-32 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-center text-gray-800 outline-none focus:border-accent-blue" />
        </div>
        <div class="flex items-center justify-between gap-4">
          <label class="text-xs font-bold text-gray-800">BO</label>
          <input type="number" v-model="form.bo" class="w-32 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-center text-gray-800 outline-none focus:border-accent-blue" />
        </div>
      </div>
      <div class="flex justify-center">
        <button @click="save" class="px-10 py-1.5 bg-gray-200 hover:bg-white text-gray-800 font-bold rounded shadow-md border border-gray-400 active:translate-y-0.5 transition-all uppercase text-xs">
          PVT
        </button>
      </div>
    </div>
  </div>
  `,
  setup(props, { emit }) {
    const form = reactive({ rso: 0.0, bo: 0.0 });
    function save() {
      emit('save', { ...form });
      emit('close');
    }
    return { form, save };
  }
}

// ═══════════════════════════════════════════════════════════════
// DAQ CONFIG PAGE — Monitor y configuración Modbus RTU en vivo
// ═══════════════════════════════════════════════════════════════
const DaqConfigPage = {
  name: 'DaqConfigPage',
  template: `
  <div class="p-4 flex flex-col gap-4">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-white tracking-wide">📡 Configuración Modbus / DAQ</h1>
        <p class="text-xs text-gray-400 mt-0.5">Lectura en tiempo real de canales AI y configuración de mapeo</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button @click="forceReconnect"
                :disabled="reconnecting"
                :class="['px-3 py-1.5 text-white text-xs font-bold rounded transition-all',
                          reconnecting ? 'bg-gray-600 cursor-wait' : 'bg-accent-blue hover:brightness-110']">
          {{ reconnecting ? '⏳ Reconectando...' : '🔄 Forzar Reconexión' }}
        </button>
        <button @click="loadLive"
                class="px-3 py-1.5 bg-gray-700 hover:brightness-110 text-white text-xs font-bold rounded transition-all">
          ↻ Leer Estado
        </button>
        <button @click="saveConnection"
                class="px-3 py-1.5 bg-accent-green hover:brightness-110 text-white text-xs font-bold rounded transition-all">
          💾 Guardar Conexión
        </button>
        <button @click="rebootDaq"
                :disabled="rebooting"
                class="px-3 py-1.5 bg-accent-red hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold rounded transition-all">
          ⚡ Reiniciar DAQ (M-7026)
        </button>
      </div>
    </div>

    <!-- Estado de conexión + parámetros RTU -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- Card estado -->
      <div class="bg-bg-card border rounded-xl p-4 flex flex-col gap-3"
           :style="{borderColor: live.connected ? '#27a766' : '#e55353'}">
        <div class="flex items-center gap-3">
          <!-- Indicador pulsante -->
          <span class="relative flex h-6 w-6 items-center justify-center flex-shrink-0">
            <span v-if="live.connected"
                  class="animate-ping absolute inline-flex h-4 w-4 rounded-full opacity-50"
                  style="background:#27a766"></span>
            <span class="relative inline-flex rounded-full h-4 w-4"
                  :style="{background: live.connected ? '#27a766' : '#e55353'}"></span>
          </span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-bold text-white">
              {{ live.connected ? '✅ DAQ Conectada' : live.stale ? '🟡 Sin Datos (Stale)' : '🔴 DAQ Desconectada' }}
            </div>
            <div class="text-xs text-gray-400">
              Última lectura: {{ live.ts || '--' }}
              <span v-if="live.data_age_s > 1" class="ml-2" :class="live.stale ? 'text-yellow-400' : 'text-gray-500'">
                (hace {{ live.data_age_s }} s)
              </span>
            </div>
            <!-- Mensaje de error -->
            <div v-if="!live.connected && live.last_error"
                 class="text-xs text-red-400 mt-0.5 truncate" :title="live.last_error">
              ⚠ {{ live.last_error }}
            </div>
            <!-- Contador de reintento -->
            <div v-if="!live.connected && live.retry_in_s > 0"
                 class="text-xs text-yellow-400 mt-0.5">
              🔁 Reintentando en {{ live.retry_in_s }} s
            </div>
            <div v-if="!live.connected && live.retry_in_s === 0"
                 class="text-xs text-blue-400 mt-0.5 animate-pulse">
              ⏳ Intentando conectar...
            </div>
          </div>
          <span v-if="live.simulating"
                class="ml-auto px-2 py-0.5 text-xs font-bold rounded bg-yellow-700 text-yellow-200 flex-shrink-0">
            ⚡ SIM
          </span>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-bg-primary rounded-lg p-2">
            <div class="text-xs text-gray-500">Puerto</div>
            <div class="text-sm font-mono font-bold text-accent-yellow">{{ live.port || '--' }}</div>
          </div>
          <div class="bg-bg-primary rounded-lg p-2">
            <div class="text-xs text-gray-500">Baudrate</div>
            <div class="text-sm font-mono font-bold text-accent-yellow">{{ live.baudrate || '--' }}</div>
          </div>
          <div class="bg-bg-primary rounded-lg p-2">
            <div class="text-xs text-gray-500">Slave ID</div>
            <div class="text-sm font-mono font-bold text-accent-yellow">{{ live.slave_id ?? '--' }}</div>
          </div>
        </div>
      </div>

      <!-- Card edición de conexión -->
      <div class="bg-bg-card border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
        <div class="text-sm font-bold text-white mb-1">⚙️ Parámetros de Conexión RTU</div>
        <div class="grid grid-cols-3 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-400">Puerto</label>
            <input v-model="connForm.port" placeholder="COM3"
                   class="bg-bg-primary border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-400">Baudrate</label>
            <select v-model.number="connForm.baudrate"
                    class="bg-bg-primary border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue">
              <option>1200</option><option>2400</option><option>4800</option>
              <option>9600</option><option>19200</option><option>38400</option>
              <option>57600</option><option>115200</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-400">Slave ID</label>
            <input v-model.number="connForm.slave_id" type="number" min="1" max="247"
                   class="bg-bg-primary border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 text-xs text-gray-400 mt-1">
          <span>Paridad: N, 8, 1</span>
          <span>Protocolo: Modbus RTU</span>
          <span>Formato: Engineering ×1000</span>
        </div>
      </div>
    </div>

    <!-- Canales AI en tiempo real -->
    <div class="bg-bg-card border border-gray-700 rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <span class="text-sm font-bold text-white">📥 Canales de Entrada Analógica (AI) — Lectura en Vivo</span>
        <span class="text-xs text-gray-500 font-mono">Actualización: cada 500 ms</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-gray-700 bg-bg-primary">
              <th class="px-3 py-2 text-left text-gray-400 font-semibold w-40">Variable V (fija)</th>
              <th class="px-3 py-2 text-left text-gray-400 font-semibold">Descripción / Instrumento</th>
              <th class="px-3 py-2 text-center text-gray-400 font-semibold w-32">Address Canal Modbus</th>
              <th class="px-3 py-2 text-right text-gray-400 font-semibold w-24">Raw (xescala)</th>
              <th class="px-3 py-2 text-right text-gray-400 font-semibold w-28">Valor [mA]</th>
              <th class="px-3 py-2 text-center text-gray-400 font-semibold w-20">Estado</th>
              <th class="px-3 py-2 text-center text-gray-400 font-semibold w-20">Escala</th>
              <th class="px-3 py-2 text-center text-gray-400 font-semibold w-16">Editar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ch in mergedChannels" :key="ch.var"
                class="border-b border-gray-800 hover:bg-white/5 transition-colors"
                :class="ch.open_wire ? 'opacity-50' : ''">
              <!-- Variable V (fija) -->
              <td class="px-3 py-2">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e271a] border border-[#1b5e20] text-xs font-mono font-bold text-accent-green">
                  🔒 {{ ch.var }}
                </span>
              </td>
              <!-- Descripción / Instrumento -->
              <td class="px-3 py-2">
                <span v-if="editingCh === ch.var">
                  <input v-model="editForms[ch.var].description"
                         class="bg-bg-primary border border-gray-600 text-white text-xs rounded px-2 py-1 w-full outline-none focus:border-accent-blue" />
                </span>
                <span v-else class="text-gray-200 font-medium">{{ ch.desc || '—' }}</span>
              </td>
              <!-- Address Canal Modbus (editable 0-5) -->
              <td class="px-3 py-2 text-center">
                <span v-if="editingCh === ch.var">
                  <select v-model.number="editForms[ch.var].modbus_addr"
                          class="bg-bg-primary border border-gray-600 text-white text-xs rounded px-1.5 py-1 outline-none focus:border-accent-blue font-mono">
                    <option v-for="num in [0,1,2,3,4,5]" :key="num" :value="num">
                      CH:{{ String(num).padStart(2,'0') }} (addr {{ num }})
                    </option>
                  </select>
                </span>
                <span v-else class="flex flex-col items-center justify-center font-mono leading-tight">
                  <span class="text-accent-yellow font-bold">CH:{{ String(ch.modbus_addr).padStart(2,'0') }}</span>
                  <span class="text-[10px] text-gray-500">addr {{ ch.modbus_addr }}</span>
                </span>
              </td>
              <!-- Raw (xescala) -->
              <td class="px-3 py-2 text-right font-mono">
                <span :class="ch.open_wire ? 'text-red-400' : 'text-gray-300'">{{ ch.raw ?? '—' }}</span>
              </td>
              <!-- Valor [mA] -->
              <td class="px-3 py-2 text-right">
                <!-- barra mA 4-20 -->
                <div v-if="!ch.open_wire" class="flex items-center gap-2 justify-end">
                  <div class="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-300"
                         :style="{
                           width: maPercent(ch.ma)+'%',
                           background: maColor(ch.ma)
                         }"></div>
                  </div>
                  <span class="font-mono font-bold w-14 text-right"
                        :style="{color: maColor(ch.ma)}">{{ fmt(ch.ma) }} mA</span>
                </div>
                <span v-else class="text-red-400 font-mono">OPEN WIRE</span>
              </td>
              <!-- Estado -->
              <td class="px-3 py-2 text-center">
                <span v-if="ch.open_wire"
                      class="px-2 py-0.5 text-xs font-bold rounded bg-red-900/60 text-red-300">SIN SEÑAL</span>
                <span v-else
                      class="px-2 py-0.5 text-xs font-bold rounded bg-green-900/60 text-green-300">OK</span>
              </td>
              <!-- Escala -->
              <td class="px-3 py-2 text-center font-mono">
                <span v-if="editingCh === ch.var">
                  <input v-model.number="editForms[ch.var].scale" type="number" step="1"
                         class="bg-bg-primary border border-gray-600 text-white text-xs rounded px-2 py-1 w-20 outline-none focus:border-accent-blue font-mono text-center" />
                </span>
                <span v-else class="text-gray-400 font-mono">{{ ch.scale ?? 1000 }}</span>
              </td>
              <!-- Editar -->
              <td class="px-3 py-2 text-center">
                <button v-if="editingCh !== ch.var"
                        @click="startEdit(ch)"
                        class="px-2 py-0.5 text-xs bg-accent-blue hover:brightness-110 text-white rounded transition-all">✏️</button>
                <div v-else class="flex gap-1 justify-center">
                  <button @click="saveCh(ch)"
                          class="px-2 py-0.5 text-xs bg-accent-green hover:brightness-110 text-white rounded">✓</button>
                  <button @click="editingCh = null"
                          class="px-2 py-0.5 text-xs bg-gray-600 hover:brightness-110 text-white rounded">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Salidas analógicas (AO) - solo lectura por ahora -->
    <div class="bg-bg-card border border-gray-700 rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-700">
        <span class="text-sm font-bold text-white">📤 Canales de Salida Analógica (AO) — Control de Válvulas</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
        <div class="bg-bg-primary rounded-xl p-4 border border-gray-700 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-accent-yellow">AO:00 — LCV-03 Válvula Nivel</span>
            <span class="text-xs text-gray-500">addr: 20</span>
          </div>
          <div class="text-xs text-gray-400">Variable: <span class="font-mono text-white">fb_LEVEL_PID_r_CVEU</span></div>
          <div class="text-xs text-gray-400">Escala salida: 0-100% → 0-10000 (×100)</div>
          <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
            <div class="h-full bg-accent-blue rounded-full" style="width:0%"></div>
          </div>
        </div>
        <div class="bg-bg-primary rounded-xl p-4 border border-gray-700 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-accent-yellow">AO:01 — PCV-03 Válvula Presión</span>
            <span class="text-xs text-gray-500">addr: 21</span>
          </div>
          <div class="text-xs text-gray-400">Variable: <span class="font-mono text-white">fb_PRESS_PID_r_CVEU</span></div>
          <div class="text-xs text-gray-400">Escala salida: 0-100% → 0-10000 (×100)</div>
          <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
            <div class="h-full bg-accent-blue rounded-full" style="width:0%"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Salidas digitales (DO) -->
    <div class="bg-bg-card border border-gray-700 rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-700">
        <span class="text-sm font-bold text-white">🔌 Salidas Digitales (DO) — No en uso actualmente</span>
      </div>
      <div class="grid grid-cols-3 gap-3 p-4">
        <div v-for="i in 3" :key="i"
             class="bg-bg-primary rounded-lg p-3 border border-gray-700 opacity-50 flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-gray-600"></span>
          <span class="text-xs text-gray-500">DO:0{{ i-1 }} — Sin asignar</span>
        </div>
      </div>
    </div>

    <!-- Toast interno -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 right-6 px-4 py-2 rounded-lg text-sm font-bold shadow-xl z-50"
           :class="toast.ok ? 'bg-accent-green text-white' : 'bg-accent-red text-white'">
        {{ toast.msg }}
      </div>
    </transition>
  </div>`,

  setup() {
    const live = reactive({
      connected: false, port: 'COM3', baudrate: 9600, slave_id: 1,
      simulating: false, channels: [], ts: '--',
      last_error: '', retry_in_s: 0, stale: false, data_age_s: 0,
    });
    const connForm = reactive({ port: 'COM3', baudrate: 9600, slave_id: 1 });
    const dbConfig = ref([]);
    const editingCh = ref(null);
    const editForms = reactive({});
    const toast = reactive({ show: false, ok: true, msg: '' });
    const reconnecting = ref(false);

    // Flag: el usuario editó connForm y no ha guardado aun
    // (variable JS simple, no necesita ser reactiva)
    let _connFormDirty = false;
    // Marcar como dirty cuando el usuario toca cualquier campo del form
    watch(connForm, () => { _connFormDirty = true; }, { deep: true, flush: 'sync' });

    // Mezcla datos en vivo + config BD en una sola lista de 6 canales ordenada por channel_addr (0-5)
    const mergedChannels = computed(() => {
      const dbByVar = {};
      dbConfig.value.forEach(c => { dbByVar[c.v_name] = c; });

      const sortedDbConfig = [...dbConfig.value].sort((a, b) => a.channel_addr - b.channel_addr);
      
      const fixedVars = sortedDbConfig.length > 0 
        ? sortedDbConfig.map(c => c.v_name)
        : [
            'r_Local_2_I_Ch0Data',
            'r_Local_2_I_Ch1Data',
            'r_Local_2_I_Ch2Data',
            'r_Local_2_I_Ch3Data',
            'r_Local_4_I_Ch0Data',
            'r_Local_4_I_Ch1Data'
          ];

      return fixedVars.map((varName, index) => {
        const dbCh = dbByVar[varName] || {};
        const liveCh = (live.channels || []).find(ch => ch.var === varName) || {};

        return {
          var: varName,
          channel_addr: dbCh.channel_addr !== undefined ? dbCh.channel_addr : index,
          desc: dbCh.description || liveCh.desc || '',
          modbus_addr: dbCh.modbus_addr !== undefined ? dbCh.modbus_addr : (liveCh.ch !== undefined ? liveCh.ch : index),
          scale: dbCh.scale || liveCh.scale || 1000,
          raw: liveCh.raw !== undefined ? liveCh.raw : null,
          ma: liveCh.ma !== undefined ? liveCh.ma : null,
          open_wire: liveCh.open_wire !== undefined ? liveCh.open_wire : true,
        };
      });
    });

    function showToast(msg, ok = true) {
      toast.msg = msg; toast.ok = ok; toast.show = true;
      setTimeout(() => { toast.show = false; }, 2500);
    }

    async function loadLive() {
      try {
        const d = await (await fetch('/api/daq/live')).json();
        live.connected = d.connected;
        live.simulating = d.simulating;
        live.channels = d.channels;
        live.ts = d.ts;
        live.last_error = d.last_error || '';
        live.retry_in_s = d.retry_in_s ?? 0;
        live.stale = d.stale ?? false;
        live.data_age_s = d.data_age_s ?? 0;
        // Sincronizar parámetros de conexión SOLO si el usuario no está editando
        if (!_connFormDirty) {
          live.port = d.port;
          live.baudrate = d.baudrate;
          live.slave_id = d.slave_id;
          connForm.port = d.port;
          connForm.baudrate = d.baudrate;
          connForm.slave_id = d.slave_id;
        }
      } catch (e) { console.error('DAQ live error:', e); }
    }

    async function loadDbConfig() {
      try {
        const d = await (await fetch('/api/daq/config')).json();
        dbConfig.value = d;
      } catch (e) { }
    }

    // Carga la config de conexión guardada en BD y la pone en connForm
    async function loadConnConfig() {
      try {
        const d = await (await fetch('/api/daq/connection')).json();
        connForm.port = d.port || 'COM3';
        connForm.baudrate = d.baudrate || 9600;
        connForm.slave_id = d.slave_id || 1;
        _connFormDirty = false;  // recién cargado de BD, no es dirty
      } catch (e) { }
    }

    async function saveConnection() {
      try {
        const r = await fetch('/api/daq/connection', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(connForm),
        });
        if (r.ok) {
          _connFormDirty = false;
          showToast('✅ Parámetros guardados en BD — reconectando...');
          await loadLive();
        } else showToast('❌ Error al guardar', false);
      } catch (e) { showToast('❌ Error de red', false); }
    }

    // Fuerza reconexión inmediata con los parámetros actuales del módulo
    async function forceReconnect() {
      reconnecting.value = true;
      try {
        // Enviar POST con los parámetros actuales para forzar reconexión limpia
        await fetch('/api/daq/connection', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(connForm),
        });
        showToast('🔄 Forzando reconexión...');
        // Esperar 1.5 s para que el ciclo PLC intente conectar
        await new Promise(res => setTimeout(res, 1500));
        await loadLive();
      } catch (e) {
        showToast('❌ Error al reconectar', false);
      } finally {
        reconnecting.value = false;
      }
    }

    const rebooting = ref(false);

    async function rebootDaq() {
      if (!confirm("¿Está seguro de que desea reiniciar la conexión con la DAQ M-7026?\nEsto liberará el puerto COM y reconectará inmediatamente.")) {
        return;
      }
      rebooting.value = true;
      showToast("⏳ Enviando comando de reinicio...");
      try {
        const r = await fetch('/api/daq/reboot', { method: 'POST' });
        const d = await r.json();
        if (r.ok && d.ok) {
          showToast("⚡ " + d.message);
          await loadLive();
        } else {
          showToast("❌ Error: " + (d.error || "No se pudo reiniciar"), false);
        }
      } catch (e) {
        showToast("❌ Error de red al conectar con el servidor", false);
      } finally {
        rebooting.value = false;
      }
    }

    function startEdit(ch) {
      editingCh.value = ch.var;
      editForms[ch.var] = {
        description: ch.desc || '',
        modbus_addr: ch.modbus_addr,
        scale: ch.scale || 1000,
      };
    }

    async function saveCh(ch) {
      const f = editForms[ch.var];
      try {
        const r = await fetch('/api/daq/config', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel_addr: ch.channel_addr,
            v_name: ch.var,
            description: f.description,
            scale: f.scale,
            modbus_addr: f.modbus_addr,
          }),
        });
        if (r.ok) {
          showToast(`✅ ${ch.var} guardado`);
          editingCh.value = null;
          await loadDbConfig();
        } else showToast('❌ Error al guardar', false);
      } catch (e) { showToast('❌ Error de red', false); }
    }

    const fmt = v => v !== null && v !== undefined ? parseFloat(v).toFixed(3) : '—';

    // Porcentaje 4-20 mA para la barra visual
    function maPercent(ma) {
      if (ma === null || ma === undefined) return 0;
      return Math.min(100, Math.max(0, ((ma - 4) / 16) * 100));
    }

    // Color de la barra según el valor mA
    function maColor(ma) {
      if (ma === null || ma === undefined) return '#6b7280';
      const pct = maPercent(ma);
      if (pct < 5) return '#e55353';  // muy bajo
      if (pct > 95) return '#e55353';  // saturado
      return '#27a766';
    }

    let liveTimer;
    onMounted(() => {
      loadLive();
      loadDbConfig();
      loadConnConfig();   // cargar parámetros guardados en BD
      liveTimer = setInterval(loadLive, 1000);
    });
    onUnmounted(() => { clearInterval(liveTimer); });

    return {
      live, connForm, mergedChannels, editingCh, editForms, toast,
      reconnecting, loadLive, forceReconnect, saveConnection,
      startEdit, saveCh, fmt, maPercent, maColor, rebooting, rebootDaq
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// HART CONFIG PAGE
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// HART CONFIG PAGE
// ═══════════════════════════════════════════════════════════════
const HartConfigPage = {
  name: 'HartConfigPage',
  template: `
  <div class="p-4 flex flex-col gap-4">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-white tracking-wide">⚡ Configuración Modbus HART</h1>
        <p class="text-xs text-gray-400 mt-0.5">Tags fijos por slot. Edita la descripción y el HART Device asignado a cada instrumento.</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button @click="loadLive"
                class="px-3 py-1.5 bg-gray-700 hover:brightness-110 text-white text-xs font-bold rounded transition-all">
          ↻ Leer Estado
        </button>
        <button @click="saveConnection"
                class="px-3 py-1.5 bg-accent-green hover:brightness-110 text-white text-xs font-bold rounded transition-all">
          💾 Guardar Conexión Gateway
        </button>
        <button v-if="connForm.mode === 'tcp'"
                @click="rebootGateway"
                :disabled="rebooting"
                class="px-3 py-1.5 bg-accent-red hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold rounded transition-all">
          ⚡ Reiniciar Gateway (Reboot)
        </button>
      </div>
    </div>

    <!-- Parámetros de Conexión Gateway -->
    <div class="bg-bg-card border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between mb-1">
        <div class="text-sm font-bold text-white">⚙️ Parámetros de Conexión del Gateway</div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-400">Estado del Gateway:</span>
          <span v-if="isGatewayConnected" class="px-2 py-0.5 text-xs font-bold rounded bg-green-900/60 text-green-300 border border-green-800">ONLINE</span>
          <span v-else class="px-2 py-0.5 text-xs font-bold rounded bg-red-900/60 text-red-300 border border-red-800">OFFLINE</span>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400">Modo de Comunicación</label>
          <select v-model="connForm.mode"
                  class="bg-bg-primary border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue">
            <option value="tcp">Modbus TCP/IP (Ethernet) - Por defecto</option>
            <option value="rtu">Modbus RTU (Puertos COM) - Opcional</option>
          </select>
        </div>
        <template v-if="connForm.mode === 'tcp'">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-400">Dirección IP</label>
            <input v-model="connForm.ip" placeholder="192.168.255.1"
                   class="bg-bg-primary border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-400">Puerto TCP</label>
            <input v-model.number="connForm.port" type="number"
                   class="bg-bg-primary border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
          </div>
        </template>
        <template v-if="connForm.mode === 'rtu'">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-400">Puerto COM</label>
            <input v-model="connForm.com_port" placeholder="COM3"
                   class="bg-bg-primary border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-400">Baudrate</label>
            <select v-model.number="connForm.baudrate"
                    class="bg-bg-primary border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue">
              <option>1200</option><option>2400</option><option>4800</option>
              <option>9600</option><option>19200</option><option>38400</option>
              <option>57600</option><option>115200</option>
            </select>
          </div>
        </template>
      </div>
    </div>

    <!-- Tabla de Instrumentos HART -->
    <div class="bg-bg-card border border-gray-700 rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <span class="text-sm font-bold text-white">📥 Instrumentos HART (Mapeo por Slot)</span>
        <span class="text-xs text-gray-500 font-mono">Actualización: cada 5 s</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-gray-700 bg-bg-primary">
              <th class="px-3 py-2 text-left text-gray-400 font-semibold w-8">N°</th>
              <th class="px-3 py-2 text-left text-gray-400 font-semibold w-36">Tag / Rol</th>
              <th class="px-3 py-2 text-left text-gray-400 font-semibold">Descripción</th>
              <th class="px-3 py-2 text-center text-gray-400 font-semibold w-32">HART Device</th>
              <th class="px-3 py-2 text-center text-gray-400 font-semibold w-20">Estado</th>
              <th class="px-3 py-2 text-right text-gray-400 font-semibold w-28">
                PV1 <span class="text-gray-600 font-normal">mA/EU</span>
              </th>
              <th class="px-3 py-2 text-right text-gray-400 font-semibold w-28">
                PV2 <span class="text-gray-600 font-normal">DP/EU</span>
              </th>
              <th class="px-3 py-2 text-right text-gray-400 font-semibold w-28">
                PV3 <span class="text-gray-600 font-normal">P/EU</span>
              </th>
              <th class="px-3 py-2 text-right text-gray-400 font-semibold w-28">
                PV4 <span class="text-gray-600 font-normal">T/EU</span>
              </th>
              <th class="px-3 py-2 text-center text-gray-400 font-semibold w-16">Editar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ch in mergedHartChannels" :key="ch.channel_idx"
                class="border-b border-gray-800 hover:bg-white/5 transition-colors"
                :class="!ch.enabled ? 'opacity-40' : ''">

              <!-- N° -->
              <td class="px-3 py-2 text-gray-500 font-mono text-center">{{ ch.channel_idx + 1 }}</td>

              <!-- Tag/Rol FIJO -->
              <td class="px-3 py-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide"
                      :class="ROLES[ch.instrument_type]?.badgeCls || 'bg-gray-700 text-gray-400'">
                  {{ ROLES[ch.instrument_type]?.label || 'Sin asignar' }}
                </span>
              </td>

              <!-- Descripción: editable o sólo lectura -->
              <td class="px-3 py-2">
                <input v-if="editingCh === ch.channel_idx"
                       v-model="editForms[ch.channel_idx].description"
                       class="bg-bg-primary border border-gray-600 text-white text-xs rounded px-2 py-1 w-full outline-none focus:border-accent-blue" />
                <span v-else class="text-gray-200 font-medium">{{ ch.desc || '—' }}</span>
              </td>

              <!-- HART Device: editable o sólo lectura -->
              <td class="px-3 py-2 text-center">
                <div v-if="editingCh === ch.channel_idx" class="flex flex-col gap-1.5 items-center">
                  <select v-model.number="editForms[ch.channel_idx].hart_device_index"
                          class="bg-bg-primary border border-accent-yellow/60 text-white text-xs rounded px-1.5 py-1 outline-none focus:border-accent-yellow font-mono">
                    <option v-for="n in Array.from({length: 15}, (_, i) => i)" :key="n" :value="n">
                      HART Device {{ n }}
                    </option>
                  </select>
                  <label class="inline-flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer">
                    <input type="checkbox" v-model="editForms[ch.channel_idx].enabled" />
                    Habilitado
                  </label>
                </div>
                <div v-else class="flex flex-col items-center gap-0.5 leading-tight">
                  <span class="font-mono font-bold text-accent-yellow text-xs">HART Device {{ ch.hart_device_index }}</span>
                  <span class="text-[9px] text-gray-500 font-mono">reg {{ 1300 + ch.hart_device_index * 10 }}</span>
                </div>
              </td>

              <!-- Estado -->
              <td class="px-3 py-2 text-center">
                <span v-if="!ch.enabled"
                      class="px-2 py-0.5 text-xs font-bold rounded bg-gray-800 text-gray-400">DESC.</span>
                <span v-else-if="ch.connected"
                      class="px-2 py-0.5 text-xs font-bold rounded bg-green-900/60 text-green-300">CONECTADO</span>
                <span v-else
                      class="px-2 py-0.5 text-xs font-bold rounded bg-red-900/60 text-red-300">ERROR</span>
              </td>

              <!-- PV1 -->
              <td class="px-3 py-2 text-right font-mono">
                <div class="text-gray-200">{{ fmtValue(ch.pv1) }}</div>
                <div class="text-[9px] text-gray-500">{{ ROLES[ch.instrument_type]?.pv1lbl || 'EU' }}</div>
              </td>
              <!-- PV2 -->
              <td class="px-3 py-2 text-right font-mono">
                <div class="text-gray-200">{{ fmtValue(ch.pv2) }}</div>
                <div class="text-[9px] text-gray-500">{{ ROLES[ch.instrument_type]?.pv2lbl || 'EU' }}</div>
              </td>
              <!-- PV3 -->
              <td class="px-3 py-2 text-right font-mono">
                <div class="text-gray-200">{{ fmtValue(ch.pv3) }}</div>
                <div class="text-[9px] text-gray-500">{{ ROLES[ch.instrument_type]?.pv3lbl || 'EU' }}</div>
              </td>
              <!-- PV4 -->
              <td class="px-3 py-2 text-right font-mono">
                <div class="text-gray-200">{{ fmtValue(ch.pv4) }}</div>
                <div class="text-[9px] text-gray-500">{{ ROLES[ch.instrument_type]?.pv4lbl || 'EU' }}</div>
              </td>

              <!-- Editar -->
              <td class="px-3 py-2 text-center">
                <button v-if="editingCh !== ch.channel_idx"
                        @click="startEdit(ch)"
                        class="px-2 py-0.5 text-xs bg-accent-blue hover:brightness-110 text-white rounded transition-all">✏️</button>
                <div v-else class="flex gap-1 justify-center">
                  <button @click="saveCh(ch)"
                          class="px-2 py-0.5 text-xs bg-accent-green hover:brightness-110 text-white rounded">✓</button>
                  <button @click="editingCh = null"
                          class="px-2 py-0.5 text-xs bg-gray-600 hover:brightness-110 text-white rounded">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Leyenda de roles -->
    <div class="bg-bg-card border border-gray-700 rounded-xl p-4">
      <div class="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Leyenda de Roles — Variables inyectadas</div>
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
        <div v-for="(r, key) in ROLES" :key="key" class="flex flex-col gap-0.5 bg-bg-primary rounded-lg p-2 border border-gray-800">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold mb-1 w-fit" :class="r.badgeCls">{{ r.label }}</span>
          <div class="text-[10px] text-gray-500">PV1: <span class="text-gray-300">{{ r.pv1lbl }}</span></div>
          <div class="text-[10px] text-gray-500">PV2: <span class="text-gray-300">{{ r.pv2lbl }}</span></div>
          <div class="text-[10px] text-gray-500">PV3: <span class="text-gray-300">{{ r.pv3lbl }}</span></div>
          <div class="text-[10px] text-gray-500">PV4: <span class="text-gray-300">{{ r.pv4lbl }}</span></div>
          <div v-if="r.injects" class="mt-1 text-[9px] text-accent-yellow font-mono">→ {{ r.injects }}</div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
           class="fixed bottom-6 right-6 px-4 py-2 rounded-lg text-sm font-bold shadow-xl z-50"
           :class="toast.ok ? 'bg-accent-green text-white' : 'bg-accent-red text-white'">
        {{ toast.msg }}
      </div>
    </transition>
  </div>`,
  setup() {
    const liveChannels = ref([]);
    const connForm = reactive({
      mode: 'tcp', ip: '192.168.255.1', port: 502,
      com_port: 'COM3', baudrate: 9600, slave_id: 1, start_address: 618
    });
    const dbConfig = ref([]);
    const editingCh = ref(null);
    const editForms = reactive({});
    const toast = reactive({ show: false, ok: true, msg: '' });

    // ── Definición de roles fijos (coincide con instrument_type en BD) ──────
    const ROLES = {
      LAMINAR_A: {
        label: 'Laminar A',
        badgeCls: 'bg-yellow-900/70 text-yellow-300 border border-yellow-700',
        pv1lbl: 'SCFH',
        pv2lbl: 'DP → r_PDT_01',
        pv3lbl: 'P [psia]',
        pv4lbl: 'T [°F]',
        injects: 'r_PDT_01 ← PV2'
      },
      WEDGE_LIQ: {
        label: 'Wedge Líquido',
        badgeCls: 'bg-blue-900/70 text-blue-300 border border-blue-700',
        pv1lbl: 'SCFH',
        pv2lbl: 'DP → r_PDT_02',
        pv3lbl: 'P → r_P_Oil',
        pv4lbl: 'T → r_T_Oil',
        injects: 'r_PDT_02 | r_P_Oil | r_T_Oil_C/F'
      },
      WEDGE_GAS: {
        label: 'Wedge Gas',
        badgeCls: 'bg-green-900/70 text-green-300 border border-green-700',
        pv1lbl: 'SCFH',
        pv2lbl: 'DP → r_DP_gas',
        pv3lbl: 'P → r_P_Gas',
        pv4lbl: 'T → r_T_Gas',
        injects: 'r_DP_gas | r_P_Gas | r_T_Gas'
      },
      LAMINAR_B: {
        label: 'Laminar B',
        badgeCls: 'bg-orange-900/70 text-orange-300 border border-orange-700',
        pv1lbl: 'SCFH',
        pv2lbl: 'DP → r_PDT_03',
        pv3lbl: 'P [psia]',
        pv4lbl: 'T [°F]',
        injects: 'r_PDT_03 ← PV2'
      },
      NIVEL: {
        label: 'Nivel (LIT)',
        badgeCls: 'bg-purple-900/70 text-purple-300 border border-purple-700',
        pv1lbl: '% → r_LIT_001',
        pv2lbl: 'DP [inH2O]',
        pv3lbl: 'P [psia]',
        pv4lbl: 'T [°F]',
        injects: 'r_LIT_001 ← PV1'
      },
      NONE: {
        label: 'Sin asignar',
        badgeCls: 'bg-gray-700 text-gray-400',
        pv1lbl: 'EU', pv2lbl: 'EU', pv3lbl: 'EU', pv4lbl: 'EU',
        injects: null
      }
    };

    function showToast(msg, ok = true) {
      toast.msg = msg; toast.ok = ok; toast.show = true;
      setTimeout(() => { toast.show = false; }, 2500);
    }

    async function loadConfig() {
      try {
        const d = await (await fetch('/api/hart/config')).json();
        Object.assign(connForm, d);
      } catch (e) { }
    }

    async function saveConnection() {
      try {
        const r = await fetch('/api/hart/config', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(connForm),
        });
        showToast(r.ok ? '✅ Configuración de conexión HART guardada' : '❌ Error al guardar', r.ok);
      } catch (e) { showToast('❌ Error de red', false); }
    }

    const rebooting = ref(false);

    async function rebootGateway() {
      if (!confirm("¿Está seguro de que desea reiniciar el Gateway ICP DAS HRT-711?\nSe perderá la conexión durante aproximadamente 15 segundos.")) return;
      rebooting.value = true;
      showToast("⏳ Enviando comando de reinicio...");
      try {
        const r = await fetch('/api/hart/reboot', { method: 'POST' });
        const d = await r.json();
        if (r.ok && d.ok) {
          showToast("⚡ " + d.message);
          setTimeout(() => { loadLive(); }, 15000);
        } else {
          showToast("❌ Error: " + (d.error || "No se pudo reiniciar"), false);
        }
      } catch (e) { showToast("❌ Error de red", false); }
      finally { rebooting.value = false; }
    }

    async function loadDbConfig() {
      try {
        const d = await (await fetch('/api/hart/config/channels')).json();
        dbConfig.value = d;
      } catch (e) { }
    }

    async function loadLive() {
      try {
        const d = await (await fetch('/api/hart/live')).json();
        liveChannels.value = d;
      } catch (e) { }
    }

    function startEdit(ch) {
      editingCh.value = ch.channel_idx;
      editForms[ch.channel_idx] = {
        description:         ch.desc || '',
        hart_device_index:   ch.hart_device_index,
        enabled:             ch.enabled,
      };
    }

    async function saveCh(ch) {
      const f = editForms[ch.channel_idx];
      try {
        const r = await fetch('/api/hart/config/channels', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel_idx:         ch.channel_idx,
            v_name:              ch.v_name,
            description:         f.description,
            hart_device_index:   f.hart_device_index,
            hart_device_address: f.hart_device_index,   // alias
            enabled:             f.enabled,
            instrument_type:     ch.instrument_type,     // rol fijo: siempre el del slot
          }),
        });
        if (r.ok) {
          showToast(`✅ ${ch.instrument_type} → HART Device ${f.hart_device_index} (reg ${1300 + f.hart_device_index * 10})`);
          editingCh.value = null;
          await loadDbConfig();
          await loadLive();
        } else {
          showToast('❌ Error al guardar', false);
        }
      } catch (e) { showToast('❌ Error de red', false); }
    }

    const mergedHartChannels = computed(() => {
      const dbByIdx = {};
      dbConfig.value.forEach(c => { dbByIdx[c.channel_idx] = c; });

      return Array.from({ length: 15 }, (_, i) => {
        const dbCh = dbByIdx[i] || {};
        const liveCh = liveChannels.value.find(ch => ch.channel_idx === i) || {};

        const devIndex = dbCh.hart_device_index !== undefined ? Number(dbCh.hart_device_index) : i;

        return {
          channel_idx:       i,
          v_name:            dbCh.v_name || `HART_CH${i}`,
          desc:              dbCh.description || `Instrumento HART ${i + 1}`,
          instrument_type:   dbCh.instrument_type || 'NONE',
          hart_device_index: devIndex,
          enabled:           dbCh.enabled !== undefined ? !!dbCh.enabled : (i === 0),
          connected:         liveCh.connected || false,
          error:             liveCh.error || null,
          pv1:               liveCh.pv1 || { value: 0.0, unit: '-' },
          pv2:               liveCh.pv2 || { value: 0.0, unit: '-' },
          pv3:               liveCh.pv3 || { value: 0.0, unit: '-' },
          pv4:               liveCh.pv4 || { value: 0.0, unit: '-' },
        };
      });
    });

    const isGatewayConnected = computed(() => liveChannels.value.some(ch => ch.connected || ch.error === 'Desc.'));
    const fmtValue = pv => pv && pv.value !== undefined && pv.value !== null
      ? parseFloat(pv.value).toFixed(2) + ' ' + (pv.unit || '')
      : '—';

    let liveTimer;
    onMounted(() => { loadConfig(); loadDbConfig(); loadLive(); liveTimer = setInterval(loadLive, 5000); });
    onUnmounted(() => { clearInterval(liveTimer); });

    return {
      liveChannels, connForm, dbConfig, editingCh, editForms, toast,
      loadLive, saveConnection, startEdit, saveCh, mergedHartChannels,
      fmtValue, rebooting, rebootGateway, isGatewayConnected, ROLES
    };
  }
};


// ═══════════════════════════════════════════════════════════════
// CALIBRACION PAGE
// ═══════════════════════════════════════════════════════════════
const CalibracionPage = {
  name: 'CalibracionPage',
  emits: ['toast'],
  template: `
  <div class="p-4 flex flex-col gap-4 h-full overflow-y-auto w-full">

    <!-- Header -->
    <div class="flex items-center justify-between flex-shrink-0">
      <div>
        <h1 class="text-xl font-bold text-white tracking-wide">🎯 Datos de Calibración</h1>
        <p class="text-xs text-gray-400 mt-0.5">Parámetros físicos de los medidores — Los campos con fondo oscuro son solo lectura (calculados por el PLC)</p>
      </div>
      <button @click="guardarTodo"
        class="px-4 py-2 bg-accent-green hover:brightness-110 text-white text-sm font-bold rounded-lg transition-all shadow-lg flex items-center gap-2">
        💾 Guardar Todo
      </button>
    </div>

    <!-- Grid de 3 paneles -->
    <div class="grid grid-cols-3 gap-4 flex-shrink-0">

      <!-- ══ PANEL 1: WEDGE GAS ══ -->
      <div class="calib-panel">
        <div class="calib-panel-header">⛽ Wedge Gas</div>
        <div class="calib-body">

          <div class="calib-row">
            <span class="calib-label">D (mm)</span>
            <input class="calib-input" type="number" step="0.01" v-model.number="form.r_D_wedge_gas" />
          </div>
          <div class="calib-row">
            <span class="calib-label">h (mm)</span>
            <input class="calib-input" type="number" step="0.01" v-model.number="form.r_h_wedge_gas" />
          </div>
          <div class="calib-row">
            <span class="calib-label">K</span>
            <input class="calib-input" type="number" step="0.0001" v-model.number="form.r_k_mp" />
          </div>

          <div class="calib-divider"></div>

          <div class="calib-row">
            <span class="calib-label">DP (inH₂O)</span>
            <span class="calib-readonly">{{ fmtC(data.r_DP_gas_PK, 3) }}</span>
          </div>
          <div class="calib-row">
            <span class="calib-label">β (Beta)</span>
            <span class="calib-readonly">{{ fmtC(data.r_Beta_mp, 4) }}</span>
          </div>
          <div class="calib-row">
            <span class="calib-label">Ao (m²)</span>
            <span class="calib-readonly">{{ fmtC(data.r_Ao_cd, 6) }}</span>
          </div>
          <div class="calib-row">
            <span class="calib-label">Y1</span>
            <span class="calib-readonly">{{ fmtC(data.r_Y1, 4) }}</span>
          </div>
        </div>
      </div>

      <!-- ══ PANEL 2: WEDGE CRUDO ══ -->
      <div class="calib-panel">
        <div class="calib-panel-header">🛢️ Calibración Wedge Crudo</div>
        <div class="calib-body">

          <div class="calib-row">
            <span class="calib-label">Diámetro Tubo (mm)</span>
            <input class="calib-input" type="number" step="0.01" v-model.number="form.r_D_Wedge" />
          </div>
          <div class="calib-row">
            <span class="calib-label">Relación H/D</span>
            <input class="calib-input" type="number" step="0.001" v-model.number="form.r_m" />
          </div>
          <div class="calib-row">
            <span class="calib-label">Calibración K</span>
            <input class="calib-input" type="number" step="0.001" v-model.number="form.r_K_wedge" />
          </div>

          <div class="calib-divider"></div>

          <div class="calib-row">
            <span class="calib-label">Delta P (inH₂O)</span>
            <span class="calib-readonly">{{ fmtC(data.r_PDT_02, 3) }}</span>
          </div>
          <div class="calib-row">
            <span class="calib-label">Reynolds</span>
            <span class="calib-readonly">{{ fmtC(data.r_RE_W, 1) }}</span>
          </div>
          <div class="calib-row">
            <span class="calib-label">Tasa Mezcla (BPD)</span>
            <span class="calib-readonly">{{ fmtC(data.r_Qb_Liquido_W, 1) }}</span>
          </div>
        </div>
      </div>

      <!-- ══ PANEL 3: LAMINAR ══ -->
      <div class="calib-panel">
        <div class="calib-panel-header">🌊 Calibración Laminar</div>
        <div class="calib-body">

          <div class="calib-row">
            <span class="calib-label">Diámetro Tubo (m)</span>
            <input class="calib-input" type="number" step="0.0001" v-model.number="form.r_d_L" />
          </div>
          <div class="calib-row">
            <span class="calib-label">Largo de Tubo (m)</span>
            <input class="calib-input" type="number" step="0.001" v-model.number="form.r_L" />
          </div>
          <div class="calib-row">
            <span class="calib-label">Número de Tubos</span>
            <input class="calib-input" type="number" step="1" v-model.number="form.r_N_Tubos" />
          </div>
          <div class="calib-row">
            <span class="calib-label">Factor A</span>
            <input class="calib-input" type="number" step="0.000001" v-model.number="form.r_AK_L" />
          </div>
          <div class="calib-row">
            <span class="calib-label">Factor B</span>
            <input class="calib-input" type="number" step="0.000001" v-model.number="form.r_BK_L" />
          </div>
          <div class="calib-row">
            <span class="calib-label">Factor C</span>
            <input class="calib-input" type="number" step="0.000001" v-model.number="form.r_CK_L" />
          </div>

          <div class="calib-divider"></div>

          <div class="calib-row">
            <span class="calib-label">DP Baja (inH₂O)</span>
            <span class="calib-readonly">{{ fmtC(data.r_PDT_03, 3) }}</span>
          </div>
          <div class="calib-row">
            <span class="calib-label">DP Alta (inH₂O)</span>
            <span class="calib-readonly">{{ fmtC(data.r_PDT_01, 3) }}</span>
          </div>
          <div class="calib-row">
            <span class="calib-label">Reynolds</span>
            <span class="calib-readonly">{{ fmtC(data.r_RE_L, 1) }}</span>
          </div>
          <div class="calib-row">
            <span class="calib-label">Tasa Mezcla (BPD)</span>
            <span class="calib-readonly">{{ fmtC(data.r_Qb_Liquido_L, 1) }}</span>
          </div>
        </div>
      </div>

    </div><!-- /grid -->

    <!-- Nota al pie -->
    <p class="text-xs text-gray-500 mt-auto flex-shrink-0">
      ⚠️ Los cambios se aplican inmediatamente en la memoria del SoftPLC. Los valores calculados (sin fondo editable)
      se actualizan automáticamente con cada ciclo del PLC.
    </p>
  </div>`,

  setup(_, { emit }) {
    const { ref, reactive, onMounted, onUnmounted } = Vue;

    const data = reactive({  // solo-lectura (devueltos por el GET)
      r_DP_gas_PK: 0, r_Beta_mp: 0, r_Ao_cd: 0, r_Y1: 0,
      r_PDT_02: 0, r_RE_W: 0, r_Qb_Liquido_W: 0,
      r_PDT_03: 0, r_PDT_01: 0, r_RE_L: 0, r_Qb_Liquido_L: 0,
    });

    const form = reactive({  // editables
      // Wedge Gas
      r_D_wedge_gas: 0, r_h_wedge_gas: 0, r_k_mp: 0,
      // Wedge Crudo
      r_D_Wedge: 0, r_m: 0, r_K_wedge: 1,
      // Laminar
      r_d_L: 0, r_L: 0, r_N_Tubos: 0,
      r_AK_L: 0, r_BK_L: 0, r_CK_L: 0,
    });

    const fmtC = (v, d = 3) =>
      (v !== undefined && v !== null) ? parseFloat(v).toFixed(d) : '—';

    async function cargar() {
      try {
        const r = await fetch('/api/calibracion');
        const d = await r.json();
        // Llenar editables
        for (const k of Object.keys(form)) if (k in d) form[k] = d[k];
        // Llenar solo-lectura
        for (const k of Object.keys(data)) if (k in d) data[k] = d[k];
      } catch (e) { /* sin conexión */ }
    }

    async function guardarTodo() {
      try {
        const r = await fetch('/api/calibracion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form }),
        });
        if (r.ok) emit('toast', '✅ Calibración guardada en el SoftPLC');
        else emit('toast', '❌ Error al guardar', 'error');
      } catch (e) { emit('toast', '❌ Error de red', 'error'); }
    }

    let timer;
    onMounted(() => { cargar(); timer = setInterval(cargar, 2000); });
    onUnmounted(() => clearInterval(timer));

    return { form, data, fmtC, guardarTodo };
  }
};


// ── Mount ────────────────────────────────────────────────────
const app = createApp(App);
app.component('proceso-page', ProcesoPage);
app.component('inicio-prueba-page', InicioPruebaPage);
app.component('reportes-page', ReportesPage);
app.component('data-cruda-page', DataCrudaPage);
app.component('pid-modal', PidModal);
app.component('prueba-progreso-page', PruebaProgresoPage);
app.component('propiedades-page', PropiedadesPage);
app.component('pvt-page', PvtPage);
app.component('pvt-data-modal', PvtDataModal);
app.component('rangos-page', RangosPage);
app.component('calibracion-page', CalibracionPage);
app.component('daq-config-page', DaqConfigPage);
app.component('hart-config-page', HartConfigPage);
app.mount('#app');

