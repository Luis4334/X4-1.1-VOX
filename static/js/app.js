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
      <!-- Indicador de Prueba en Progreso -->
      <div v-if="proc.b_Prueba_en_Progreso"
           class="flex items-center gap-1.5 px-4 py-1.5 bg-red-600/35 border-2 border-red-500 rounded-lg
                  text-red-500 text-xs font-black uppercase tracking-widest animate-pulse select-none shadow-[0_0_12px_rgba(239,68,68,0.35)]">
        <span>🔴</span>
        <span>Prueba en Proceso</span>
      </div>
      <div class="flex items-center gap-4">
        <button @click="toggleTheme" 
                class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-border"
                :title="isLightMode ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'">
          <span v-if="isLightMode" class="text-accent-yellow text-lg"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
  <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z" />
</svg>
</span>
          <span v-else class="text-blue-300 text-lg"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
  <path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clip-rule="evenodd" />
</svg>
</span>
        </button>
        <div class="hdr-clock">{{ clock }}</div>
        <div class="w-2.5 h-2.5 rounded-full transition-all duration-300"
             :style="!connected
               ? 'background:#ef4444;box-shadow:0 0 6px #ef4444'
               : db_ok
                 ? 'background:var(--accent-green);box-shadow:0 0 6px var(--accent-green)'
                 : 'background:#f97316;box-shadow:0 0 6px #f97316'"
             :title="!connected ? 'Sin conexión WebSocket' : db_ok ? 'BD MySQL conectada' : 'WebSocket OK — BD MySQL desconectada'"
        ></div>
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
                class="sidebar-toggle flex items-center justify-center h-8 w-full border-b border-border hover:bg-white/10 transition-colors">
          <span class="text-accent-yellow text-lg font-bold select-none">
            {{ sidebarOpen ? '◀' : '☰' }}
          </span>
        </button>

        <!-- Nav links -->
        <nav class="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
          <div v-for="item in navItems" :key="item.key" class="flex flex-col gap-0.5">
            <!-- Botón Principal -->
            <button @click="handleNavClick(item)"
                    :class="[
                      'nav-side-btn flex items-center gap-2 w-full rounded-lg transition-all duration-200 text-left',
                      (page === item.key || (item.children && item.children.some(c => c.key === page))) ? 'bg-accent-blue text-white' : 'text-text-secondary hover:bg-white/10',
                      sidebarOpen ? 'px-3 py-1.5' : 'px-0 py-1.5 justify-center'
                    ]">
              <span class="text-base flex-shrink-0 flex items-center justify-center" v-html="item.icon"></span>
              <span v-if="sidebarOpen" class="text-xs font-semibold truncate leading-tight flex-1">{{ item.label }}</span>
              <span v-if="sidebarOpen && item.children" class="text-[10px] text-text-secondary">
                {{ expandedMenus[item.key] ? '▼' : '▶' }}
              </span>
            </button>
            
            <!-- Items del Submenú -->
            <div v-if="sidebarOpen && item.children && expandedMenus[item.key]" class="flex flex-col gap-0.5 pl-6 mt-0.5">
              <button v-for="child in item.children" :key="child.key"
                      @click="page = child.key; if(window?.innerWidth < 768) sidebarOpen = false"
                      :class="[
                        'flex items-center gap-2 w-full rounded-lg py-1 px-3 transition-all duration-200 text-left text-xs',
                        page === child.key ? 'bg-accent-steel text-white font-bold' : 'text-text-secondary hover:bg-text-primary/5 hover:text-text-primary'
                      ]">
                <span class="truncate leading-tight">{{ child.label }}</span>
              </button>
            </div>
          </div>
        </nav>

        <!-- Bottom section -->
        <div class="p-1.5 border-t border-border flex flex-col gap-1">
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
          :instrument-selection="instrumentSelection"
          @open-pid="openPid"/>

        <div v-if="page==='inicio_prueba'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <inicio-prueba-page :proc="proc" @toast="showToast" />
        </div>

        <div v-if="page==='propiedades'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <propiedades-page @open-pvt="page='pvt'" @toast="showToast" />
        </div>

        <div v-if="page==='pvt'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <pvt-page :proc="proc" @back="page='propiedades'" @toast="showToast" />
        </div>

        <div v-if="page==='historico_alarmas'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <historico-alarmas-page />
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

        <div v-if="page==='config_instrument_2'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <config-instrument-2-page
            :instrument-selection="instrumentSelection"
            @toast="showToast"/>
        </div>

        <div v-if="page==='calibracion'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <calibracion-page @toast="showToast" />
        </div>

        <div v-if="page==='config_instrument_3'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <config-instrument-3-page @toast="showToast" />
        </div>

        <div v-if="page==='daq_config'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <daq-config-page />
        </div>

        <div v-if="page==='hart_config'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <hart-config-page />
        </div>

        <div v-if="page==='modbus_rtu_config'" class="flex-1 overflow-y-auto overflow-x-hidden">
          <modbus-rtu-config-page />
        </div>
      </div>
    </div>

    <!-- PID Modal -->
    <pid-modal v-if="modalPid.show"
      :pid="modalPid.pid==='PIC-01' ? pid_p : pid_n"
      :tag="modalPid.pid"
      :control-pid-gas="instrumentSelection.b_Control_PID_Gas"
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
    const db_ok = ref(false);
    const lazos = ref(true);
    const toasts = ref([]);
    const alarmas = ref([]);
    const clock = ref('--:--:--');
    const sidebarOpen = ref(true);
    
    const isLightMode = ref(false);

    function toggleTheme() {
      isLightMode.value = !isLightMode.value;
      if (isLightMode.value) {
        document.documentElement.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
      }
    }

    // Inicializar el tema
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      isLightMode.value = true;
      document.documentElement.classList.add('light-theme');
    }

    const expandedMenus = reactive({
      conf_instrum: false,
      prueba: false
    });

    const instrumentSelection = reactive({
      b_Control_PID_Gas: false,
      b_PID_POSIC_SW: false,
      b_Sw_Wedge_Gas: false,
      b_SW_DIL_MEDIDO_CALC: false,
      b_Sw_Wedge_Gas_2: false,
      b_SEL_LAMINAR: false,
      b_SEL_T_baja: false
    });

    function handleNavClick(item) {
      if (item.children) {
        if (!sidebarOpen.value) {
          sidebarOpen.value = true;
          expandedMenus[item.key] = true;
        } else {
          expandedMenus[item.key] = !expandedMenus[item.key];
        }
      } else {
        page.value = item.key;
        if (window?.innerWidth < 768) sidebarOpen.value = false;
      }
    }

    const navItems = [
      { key: 'proceso', icon: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M240-440h360v-80H240v80Zm0-120h360v-80H240v80Zm-80 400q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z"/></svg>`, label: 'Inicio / Proceso' },
      {
        key: 'prueba',
        icon: '🧪',
        label: 'Prueba',
        children: [
          { key: 'inicio_prueba', label: 'Inicio Prueba' },
          { key: 'data_cruda', label: 'Data Cruda' },
          { key: 'prueba_progreso', label: 'Prueba Progreso' },
          { key: 'reportes', label: 'Reportes' },
          { key: 'historico_alarmas', label: 'Hist. Alarmas' },
        ]
      },
      {
        key: 'conf_instrum',
        icon: `
<svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="25px" fill="currentColor"><path d="m388-80-20-126q-19-7-40-19t-37-25l-118 54-93-164 108-79q-2-9-2.5-20.5T185-480q0-9 .5-20.5T188-521L80-600l93-164 118 54q16-13 37-25t40-18l20-127h184l20 126q19 7 40.5 18.5T669-710l118-54 93 164-108 77q2 10 2.5 21.5t.5 21.5q0 10-.5 21t-2.5 21l108 78-93 164-118-54q-16 13-36.5 25.5T592-206L572-80H388Zm48-60h88l14-112q33-8 62.5-25t53.5-41l106 46 40-72-94-69q4-17 6.5-33.5T715-480q0-17-2-33.5t-7-33.5l94-69-40-72-106 46q-23-26-52-43.5T538-708l-14-112h-88l-14 112q-34 7-63.5 24T306-642l-106-46-40 72 94 69q-4 17-6.5 33.5T245-480q0 17 2.5 33.5T254-413l-94 69 40 72 106-46q24 24 53.5 41t62.5 25l14 112Zm44-210q54 0 92-38t38-92q0-54-38-92t-92-38q-54 0-92 38t-38 92q0 54 38 92t92 38Zm0-130Z"/></svg>`,
        label: 'Configuracion',
        children: [
          { key: 'propiedades', label: 'Propiedades' },
          { key: 'rangos', label: 'Rangos y Alarmas' },
          { key: 'config_instrument_2', label: 'Config. Instrumentos' },
          { key: 'config_instrument_3', label: 'Selección de Fórmulas' },
          { key: 'calibracion', label: 'Datos Calibración' },
          { key: 'daq_config', label: 'Config AI/AO/DI/DO' },
          { key: 'hart_config', label: 'Config HART' },
          { key: 'modbus_rtu_config', label: 'Configuración Modbus' },
        ]
      },
    ];

    const proc = reactive({
      r_LIT_001: 0, r_WC: 0, PDI_01: 0, r_Q_gas_STD: 0, r_P_Gas: 0, r_T_Gas: 0,
      r_P_Oil: 0, r_PDT_02: 0, r_T_oil_F: 0, r_T_Oil_C: 0, r_Q_gas: 0,
      r_GVoidF: 0, r_v_oil_medida: 0, r_nivel_aux: 0,
      PCV_01_cv: 0, LCV_01_cv: 0, timestamp: '--',
      Est_Q_Liq: 0, Est_Q_Crudo: 0, Est_Q_Neto: 0, Est_Q_Dil: 0, Est_Q_Agua: 0, Est_Q_Gas: 0,
      Q_Liq: 0, Q_Crudo: 0, Q_Neto: 0, Q_Dil: 0, Q_Agua: 0, Q_Gas: 0,
      // ── Estado de Prueba ──────────────────────────
      b_Prueba_en_Progreso: false,
      b_Parada_en_Progreso: false,
      ad_TIEMPO_inicio_prueba: [0,0,0,0,0,0,0,0],
      ad_TIEMPO_prueba: [0,0,0,0,0,0,0,0],
      ar_TIEMPO_prueba_TOTAL: [0,0,0,0,0,0,0,0],
      ad_IHM_HORA_inicio: [0,0,0,0,0,0,0,0],
      // ── Tags Inicio Prueba ────────────────────────
      i_duracion_prueba_horas: 0,
      as_Codigo_pozo_16: '', as_Codigo_pozo_17: '', as_Codigo_pozo_03: '',
      as_Codigo_pozo_06: '', as_Codigo_pozo_08: '', as_Codigo_pozo_18: '',
      as_Codigo_pozo_19: '',
      r_T_Yac_C: 0, r_API_formacion_BM: 0, r_API_2: 0, r_API_1: 0, r_caudal_dil_BM: 0,
      i_posicion_combo_box_1: 0, i_posicion_combo_box_2: 0,
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
        const d = await (await fetch('/api/plc/lazos', { method: 'POST' })).json();
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
      window._appSocket = socket;  // Exponer globalmente para subcomponentes
      socket.on('connect', () => { connected.value = true; });
      socket.on('disconnect', () => { connected.value = false; });
      socket.on('process_data', d => {
        Object.assign(proc, d.process);
        Object.assign(pid_p, d.pid_presion);
        Object.assign(pid_n, d.pid_nivel);
        lazos.value = d.lazos_habilitados;
        db_ok.value  = d.db_ok ?? false;
        if (d.instrument_selection) {
          Object.assign(instrumentSelection, d.instrument_selection);
        }
      });
      socket.on('pid_updated', d => { Object.assign(d.instrumento === 'PIC-01' ? pid_p : pid_n, d); });
      socket.on('pid_config', d => {
        if (d['PIC-01']) Object.assign(pid_p, d['PIC-01']);
        if (d['LIC-01']) Object.assign(pid_n, d['LIC-01']);
      });
    });
    onUnmounted(() => { clearInterval(clockTimer); if (socket) socket.disconnect(); });

    return {
      page, connected, db_ok, lazos, toasts, alarmas, clock, proc, pid_p, pid_n, modalPid,
      sidebarOpen, navItems, openPid, savePid, toggleLazos, loadAlarmas, showToast,
      expandedMenus, handleNavClick, instrumentSelection, isLightMode, toggleTheme
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// PROCESO PAGE  –  Imagen P&ID + tags superpuestos (shifted right)
// ═══════════════════════════════════════════════════════════════
const ProcesoPage = {
  name: 'ProcesoPage',
  props: ['proc', 'pid_p', 'pid_n', 'alarmas', 'lazos', 'instrumentSelection'],
  emits: ['open-pid'],
  template: `
  <div class="flex flex-col h-full overflow-hidden">
    <!-- ══ CANVAS con imagen de fondo P&ID ══ -->
    <div class="pid-wrap">

      <!-- INDICADOR MÉTODO DE LÍQUIDO ACTIVO EN CÁLCULOS -->
      <div class="pid-active-method" style="position: absolute; top: 12px; left: 12px; z-index: 10; display: flex; align-items: center; gap: 8px; background: rgba(10, 18, 30, 0.85); border: 1.5px solid #0f3d5c; padding: 6px 12px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
        <span style="font-size: 11px; font-weight: 700; color: #a5b4fc; text-transform: uppercase; letter-spacing: 0.5px;">Método Activo:</span>
        <span class="inst-mode-badge" :class="activeMethodBadgeClass" style="font-size: 11px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
          {{ activeMethodLabel }}
        </span>
      </div>

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
      <div class="pid-tag li-tag" :class="alarmCls(instrumentSelection?.b_PID_POSIC_SW ? 'r_nivel_aux' : 'r_LIT_001')">
        <div class="pt-name">{{ instrumentSelection?.b_PID_POSIC_SW ? 'LIT-01-Aux' : 'LIT-01' }}</div>
        <div class="pt-val">{{ fmt(instrumentSelection?.b_PID_POSIC_SW ? proc.r_nivel_aux : proc.r_LIT_001, 1) }}<span class="pt-unit"> %</span></div>
        <div class="li-bar-wrap">
          <div class="li-bar-fill" :style="{width: Math.min(100,Math.max(0,(instrumentSelection?.b_PID_POSIC_SW ? proc.r_nivel_aux : proc.r_LIT_001)||0))+'%'}"></div>
        </div>
      </div>
      <!-- ════ FILA SUPERIOR: FIT-03 | PIT-01 | TIT-02 ════ -->
      <div class="pid-tag-group top-row">
        <div class="pid-tag" :class="alarmCls('r_Q_gas_STD')">
          <div class="pt-name">FIT-03</div>
          <div class="pt-val">{{ fmt(proc.r_Q_gas_STD,2) }}<span class="pt-unit"> MSCFD</span></div>
        </div>
        <div class="pid-tag" :class="alarmCls('r_P_Gas')">
          <div class="pt-name">PIT-01</div>
          <div class="pt-val">{{ fmt(proc.r_P_Gas,2) }}<span class="pt-unit"> PSIG</span></div>
        </div>
        <div class="pid-tag" :class="alarmCls('r_T_Gas')">
          <div class="pt-name">TIT-02</div>
          <div class="pt-val">
            <span v-if="alarmCls('r_T_Gas')" class="pt-alarm-icon">🔴</span>
            {{ fmt(proc.r_T_Gas,1) }}<span class="pt-unit"> °C</span>
          </div>
          <div class="pt-val pt-secondary">{{ fmt(proc.r_T_oil_F,2) }}<span class="pt-unit"> °F</span></div>
        </div>
      </div>

      <!-- ════ FILA INFERIOR: LAMINAR A | WEDGE | TIT-01 | WC | VIT-01 | A % GAS-01 ════ -->
      <div class="pid-tag-group bot-row">
        <div class="pid-tag" :class="alarmCls('PDI_01')">
          <div class="pt-name">Laminar A</div>
          <div class="pt-val">{{ fmt(proc.PDI_01,2) }}<span class="pt-unit"> inH2O</span></div>
        </div>
        <div class="pid-tag" :class="alarmCls('r_PDT_02')">
          <div class="pt-name">Wedge</div>
          <div class="pt-val">{{ fmt(proc.r_PDT_02,2) }}<span class="pt-unit"> inH2O</span></div>
          <div class="pt-val pt-secondary">{{ fmt(proc.r_P_Oil,2) }}<span class="pt-unit"> PSIG</span></div>
        </div>
        <div class="pid-tag" :class="alarmCls('r_T_Oil_C')">
          <div class="pt-name">TIT-01</div>
          <div class="pt-val">{{ fmt(proc.r_T_Oil_C,2) }}<span class="pt-unit"> °C</span></div>
        </div>
        <div class="pid-tag" :class="alarmCls('r_WC')">
          <div class="pt-name">WC</div>
          <div class="pt-val">{{ fmt(proc.r_WC,1) }}<span class="pt-unit"> %</span></div>
          <div class="li-bar-wrap">
            <div class="li-bar-fill" :style="{width: Math.min(100,Math.max(0,proc.r_WC||0))+'%'}"></div>
          </div>
        </div>
        <div class="pid-tag" :class="alarmCls('r_v_oil_medida')">
          <div class="pt-name">VIT-01</div>
          <div class="pt-val">{{ fmt(proc.r_v_oil_medida,1) }}<span class="pt-unit"> CP</span></div>
        </div>
        <div class="pid-tag" :class="alarmCls('r_GVoidF')">
          <div class="pt-name">A %GAS-01</div>
          <div class="pt-val">
            <span v-if="alarmCls('r_GVoidF')" class="pt-alarm-icon">🔥</span>
            {{ fmt(proc.r_GVoidF,1) }}<span class="pt-unit"> %</span>
          </div>
        </div>
      </div>

      <!-- ════ FILA CORIOLIS ════ -->
      <div class="pid-tag-group" style="left: 35%; top: 75%;">
        <div class="pid-tag" :class="alarmCls('Coriolis_Density')">
          <div class="pt-name">Densidad</div>
          <div class="pt-val">{{ fmt(proc.Coriolis_Density, 3) }}<span class="pt-unit"> gr/cm³</span></div>
        </div>
        <div class="pid-tag" :class="alarmCls('Coriolis_Temp')">
          <div class="pt-name">Temperatura</div>
          <div class="pt-val">{{ fmt(proc.Coriolis_Temp, 2) }}<span class="pt-unit"> °F</span></div>
        </div>
        <div class="pid-tag" :class="alarmCls('Coriolis_Vol_flow_Rate')">
          <div class="pt-name">Caudal</div>
          <div class="pt-val">{{ fmt(proc.Coriolis_Vol_flow_Rate, 2) }}<span class="pt-unit"> BB/D</span></div>
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
    <div class="flex-shrink-0 bg-bg-card border border-transparent rounded-b-xl overflow-hidden mt-0.5">
      <table class="w-full text-xs">
        <thead>
          <tr class="bg-bg-surface text-text-primary font-semibold border-b border-transparent">
            <th class="py-1 px-2 uppercase text-[10px]">TIPO</th>
            <th class="py-1 px-2 uppercase text-[10px]">Q LIQ (BBLD)</th>
            <th class="py-1 px-2 uppercase text-[10px]">Q CRUDO (BBLD)</th>
            <th class="py-1 px-2 uppercase text-[10px]">Q NETO (BBLD)</th>
            <th class="py-1 px-2 uppercase text-[10px]">Q DIL (BBLD)</th>
            <th class="py-1 px-2 uppercase text-[10px]">Q AGUA (BBLD)</th>
            <th class="py-1 px-2 uppercase text-[10px]">Q GAS (MCFD)</th>
          </tr>
        </thead>
        <tbody class="text-text-primary">
          <!-- Fila 1: Caudales Estimados (durante prueba activa) -->
          <tr class="border-b border-transparent bg-text-primary/5">
            <td class="text-center py-1.5"><span class="font-bold bg-accent-yellow/20 text-accent-yellow px-2 py-0.5 rounded text-[10px]">ESTIMADOS</span></td>
            <td class="text-center font-mono text-[11px] py-1.5">{{ proc.Est_Q_Liq?.toFixed(3) || '0.000' }}</td>
            <td class="text-center font-mono text-[11px] py-1.5">{{ proc.Est_Q_Crudo?.toFixed(3) || '0.000' }}</td>
            <td class="text-center font-mono text-[11px] py-1.5">{{ proc.Est_Q_Neto?.toFixed(3) || '0.000' }}</td>
            <td class="text-center font-mono text-[11px] py-1.5">{{ proc.Est_Q_Dil?.toFixed(3) || '0.000' }}</td>
            <td class="text-center font-mono text-[11px] py-1.5">{{ proc.Est_Q_Agua?.toFixed(3) || '0.000' }}</td>
            <td class="text-center font-mono text-[11px] py-1.5">{{ proc.Est_Q_Gas?.toFixed(3) || '0.000' }}</td>
          </tr>

          <!-- Fila 2: Caudales Medidos (en tiempo real) -->
          <tr>
            <td class="text-center py-1.5"><span class="font-bold bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded text-[10px]">MEDIDOS</span></td>
            <td class="text-center font-mono text-[11px] py-1.5">{{ proc.Q_Liq?.toFixed(3) || '0.000' }}</td>
            <td class="text-center font-mono text-[11px] py-1.5">{{ proc.Q_Crudo?.toFixed(3) || '0.000' }}</td>
            <td class="text-center font-mono text-[11px] py-1.5">{{ proc.Q_Neto?.toFixed(3) || '0.000' }}</td>
            <td class="text-center font-mono text-[11px] py-1.5">{{ proc.Q_Dil?.toFixed(3) || '0.000' }}</td>
            <td class="text-center font-mono text-[11px] py-1.5">{{ proc.Q_Agua?.toFixed(3) || '0.000' }}</td>
            <td class="text-center font-mono text-[11px] py-1.5">{{ proc.Q_Gas?.toFixed(3) || '0.000' }}</td>
          </tr>
        </tbody>
      </table>
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
        r_nivel_aux: 'NIV-AUX',
        PDI_01: 'PDI-01',
        r_PDT_02: 'PDI-02',
        r_PDT_03: 'PDI-03',
        r_Transmisor_Gas: 'PDI-04',
        r_P_Oil: 'PI-02',
        r_T_Gas: 'TI-02',
        r_GVoidF: 'GAS-01',
        r_v_oil_medida: 'VI-01',
        r_WC: 'WC',
        Coriolis_Density: 'Coriolis_Density',
        Coriolis_Temp: 'Coriolis_Temp',
        Coriolis_Vol_flow_Rate: 'Coriolis_Vol_flow_Rate',
      };
      const tag = tagMap[key] || key;
      const cfg = alarmMap.value[tag] || (tag === 'Coriolis_Vol_flow_Rate' ? alarmMap.value['Coriolis_Vol_flow_Ra'] : null);
      if (!cfg) return '';
      return alarmClass(props.proc[key], cfg);
    }

    const activeLevel = computed(() => {
      const isAux = props.instrumentSelection?.b_PID_POSIC_SW;
      return parseFloat(isAux ? props.proc.r_nivel_aux : props.proc.r_LIT_001) || 0;
    });
    const levelPct = computed(() => Math.min(100, Math.max(0, activeLevel.value)));

    const activeMethodLabel = computed(() => {
      if (props.proc.b_Laminar) return '🌀 LAMINAR';
      if (props.proc.b_Wedge) return '🔷 WEDGE';
      const tm = props.proc.i_Tipo_medidor;
      if (tm === 1) return '🌀 LAMINAR';
      if (tm === 2) return '🔷 WEDGE';
      return '❓ INDETERMINADO';
    });

    const activeMethodBadgeClass = computed(() => {
      if (props.proc.b_Laminar) return 'badge-purple';
      if (props.proc.b_Wedge) return 'badge-teal';
      const tm = props.proc.i_Tipo_medidor;
      if (tm === 1) return 'badge-purple';
      if (tm === 2) return 'badge-teal';
      return 'badge-gray';
    });

    return { fmt, alarmCls, imgError, levelPct, activeMethodLabel, activeMethodBadgeClass };
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
        <h1 class="text-xl font-bold text-text-primary tracking-wide">📊 Data Cruda – Tendencias</h1>
        <p class="text-xs text-text-secondary mt-0.5">Histórico en tiempo real de variables de proceso</p>
      </div>
      <div class="flex gap-2 items-center">
        <span class="text-xs text-text-secondary">Ventana:</span>
        <select v-model="windowSize" class="bg-bg-card border border-border text-text-primary text-xs rounded px-2 py-1 outline-none focus:border-accent-yellow">
          <option :value="60">1 min</option>
          <option :value="120">2 min</option>
          <option :value="300">5 min</option>
        </select>
        <button @click="clearHistory"
                class="px-3 py-1 text-xs font-semibold bg-accent-red hover:brightness-110 text-white rounded transition-all">
          🗑 Limpiar
        </button>
        <button @click="paused = !paused"
                :class="['px-3 py-1 text-xs font-semibold text-text-primary rounded transition-all',
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
                        v.active ? 'text-text-primary border-transparent' : 'border-border text-text-secondary bg-transparent hover:bg-text-primary/5']"
              :style="v.active ? {background: v.color, boxShadow: '0 0 8px '+v.color+'66'} : {}">
        <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{background: v.color}"></span>
        {{ v.label }}
      </button>
    </div>

    <!-- GRÁFICA PRINCIPAL -->
    <div class="bg-bg-card rounded-xl border border-border p-4" style="height: 360px;">
      <canvas ref="chartCanvas" style="width:100%;height:100%;"></canvas>
    </div>

    <!-- VALORES ACTUALES en cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
      <div v-for="v in variables" :key="v.key"
           class="data-card bg-bg-surface rounded-xl border p-3 flex flex-col gap-1 transition-all"
           :style="{borderColor: v.color+'55'}">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold tracking-wider" :style="{color: v.color}">{{ v.label }}</span>
          <span class="w-2 h-2 rounded-full" :style="{background: v.active ? v.color : 'var(--text-secondary)'}"></span>
        </div>
        <div class="font-mono text-2xl font-bold text-text-primary leading-none">
          {{ fmtVal(proc[v.key], v.decimals) }}
        </div>
        <div class="text-xs text-text-secondary">{{ v.unit }}</div>
        <!-- Mini sparkline indicator -->
        <div class="mt-1 h-1 rounded-full bg-border overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500"
               :style="{
                 width: getPercent(v.key, v.min, v.max)+'%',
                 background: v.color
               }"></div>
        </div>
      </div>
    </div>

    <!-- TABLA SNAPSHOT -->
    <div class="bg-bg-card rounded-xl border border-border overflow-hidden">
      <div class="px-4 py-3 border-b border-border flex items-center justify-between">
        <span class="text-sm font-bold text-text-primary">📋 Últimos Valores Registrados</span>
        <span class="text-xs text-text-secondary font-mono">{{ proc.timestamp || '--' }}</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border">
              <th class="px-4 py-2 text-left text-text-secondary font-semibold">Variable</th>
              <th class="px-4 py-2 text-right text-text-secondary font-semibold">Valor</th>
              <th class="px-4 py-2 text-right text-text-secondary font-semibold">Unidad</th>
              <th class="px-4 py-2 text-right text-text-secondary font-semibold">Mín (sesión)</th>
              <th class="px-4 py-2 text-right text-text-secondary font-semibold">Máx (sesión)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in variables" :key="v.key"
                class="border-b border-border hover:bg-text-primary/5 transition-colors">
              <td class="px-4 py-2 font-bold" :style="{color: v.color}">{{ v.label }}</td>
              <td class="px-4 py-2 text-right font-mono text-text-primary font-semibold">{{ fmtVal(proc[v.key], v.decimals) }}</td>
              <td class="px-4 py-2 text-right text-text-secondary">{{ v.unit }}</td>
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
      { key: 'r_Q_gas_STD',    label: 'FI-03 (Flujo Gas)',    unit: 'MSCFD', color: '#5ac8d4', active: true,  decimals: 2, min: 0, max: 10 },
      { key: 'r_P_Gas',        label: 'PI-01 (Presión Gas)',  unit: 'PSIG',  color: '#e6a817', active: true,  decimals: 1, min: 0, max: 500 },
      { key: 'r_T_Oil_C',      label: 'TI-01 (Temp. Mezcla)', unit: '°C',    color: '#e67e22', active: true,  decimals: 2, min: 0, max: 100 },
      { key: 'r_LIT_001',      label: 'LIT-01 (Nivel)',       unit: '%',     color: '#27a766', active: true,  decimals: 1, min: 0, max: 100 },
      { key: 'r_T_Gas',        label: 'TI-02 (Temp. Gas)',    unit: '°C',    color: '#c0392b', active: false, decimals: 1, min: 0, max: 100 },
      { key: 'r_GVoidF',       label: 'GVF-01 (Corte Gas)',   unit: '%',     color: '#9b59b6', active: false, decimals: 1, min: 0, max: 100 },
      { key: 'r_v_oil_medida', label: 'VI-01 (Viscosidad)',   unit: 'CP',    color: '#3498db', active: false, decimals: 1, min: 0, max: 200 },
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
  props: ['pid', 'tag', 'controlPidGas'],
  emits: ['close', 'save'],
  template: `
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ tag }} – {{ tag==='PIC-01' ? (controlPidGas ? 'Control de Nivel (PCV-01)' : 'Control de Presión (PCV-01)') : 'Control de Nivel (LCV-01)' }}</h3>
        <button class="modal-close" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <table class="form-table">
          <tr>
            <td class="label-cell">PV</td>
            <td class="value-cell">
              <span class="val-display">{{ fmt(pid.PV,3) }}</span>
              <span style="font-size:10px;color:var(--text-secondary);"> {{ tag==='PIC-01' ? (controlPidGas ? '%' : 'PSIG') : '%' }}</span>
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
      <div class="page-title">Configuración de Instrumentos – Rangos y Alarmas</div>
      
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

    <!-- Modal: advertencia al activar Modo Manual -->
    <div v-if="modalManual.show" class="modal-overlay" @click.self="modalManual.show=false">
      <div class="modal-box" style="max-width:420px">
        <div class="modal-title" style="color:#f97316">&#9888;&#65039; Activar Modo Manual</div>
        <div class="modal-body">
          Estás a punto de forzar el instrumento
          <strong style="color:#ffd040">{{ modalManual.instrumento }}</strong> en <strong style="color:#ff6b6b">Modo Manual</strong>.<br><br>
          <span style="font-size:12px;color:var(--text-secondary)">
            Al confirmar, el sistema deshabilitará <b>automáticamente</b> este instrumento en <b>Config DAQ</b> o <b>Config HART</b> (según el protocolo que esté activo) para evitar conflictos de datos con las señales físicas.
          </span>
        </div>
        <div class="modal-actions">
          <button class="btn-modal-cancel" @click="modalManual.show=false">Cancelar</button>
          <button class="btn-modal-confirm" @click="confirmManual">Sí, activar Manual</button>
        </div>
      </div>
    </div>
  </div>`,


  setup(props, { emit }) {
    const { ref, onMounted } = Vue;
    const localRows = ref([]);

    // Mapa instrumento → clave en proc (WebSocket)
    const LIVE_MAP = {
      'FI-03':                  'r_Q_gas_STD',
      'GAS-01':                 'r_GVoidF',
      'LI-01':                  'r_LIT_001',
      'PDI-01':                 'PDI_01',
      'PDI-02':                 'r_PDT_02',
      'PDI-03':                 'PDI_03',
      'PDI-04':                 'r_Transmisor_Gas',
      'PI-01':                  'r_P_Gas',
      'PI-02':                  'r_P_Oil',
      'TI-01':                  'r_T_Oil_C',
      'TI-02':                  'r_T_Gas',
      'VI-01':                  'r_v_oil_medida',
      'WC':                     'r_WC',
      'NIV-AUX':                'r_nivel_aux',
      'Coriolis_Density':       'Coriolis_Density',
      'Coriolis_Temp':          'Coriolis_Temp',
      'Coriolis_Vol_flow_Rate': 'Coriolis_Vol_flow_Rate',
      'Coriolis_Vol_flow_Ra':   'Coriolis_Vol_flow_Rate',
    };

    // Devuelve el valor live formateado
    function fmtLive(row) {
      const key = LIVE_MAP[row.instrumento] || row.instrumento;
      const v = key ? props.proc?.[key] : undefined;
      if (v === undefined || v === null || isNaN(Number(v))) return '—';
      return parseFloat(v).toFixed(2);
    }

    // Clase de color según si está en alarma o normal
    function liveColor(row) {
      const key = LIVE_MAP[row.instrumento] || row.instrumento;
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

    // Modal de confirmación para modo Manual
    const { reactive: _reactive } = Vue;
    const modalManual = _reactive({ show: false, instrumento: '', _row: null });

    function toggleModo(row) {
      if (row.modo_manual) {
        // Volver a Automático: sin confirmación
        row.modo_manual = 0;
        row.valor_manual = null;
      } else {
        // Pasar a Manual: mostrar advertencia
        modalManual._row = row;
        modalManual.instrumento = row.instrumento;
        modalManual.show = true;
      }
    }

    function confirmManual() {
      if (modalManual._row) {
        modalManual._row.modo_manual = 1;
      }
      modalManual.show = false;
    }

    async function saveRow(row) {
      try {
        const payload = {
          ...row,
          minimo: (row.minimo !== '' && row.minimo !== null && !isNaN(row.minimo)) ? Number(row.minimo) : null,
          maximo: (row.maximo !== '' && row.maximo !== null && !isNaN(row.maximo)) ? Number(row.maximo) : null,
          SP_HH: (row.SP_HH !== '' && row.SP_HH !== null && !isNaN(row.SP_HH)) ? Number(row.SP_HH) : null,
          SP_H: (row.SP_H !== '' && row.SP_H !== null && !isNaN(row.SP_H)) ? Number(row.SP_H) : null,
          SP_L: (row.SP_L !== '' && row.SP_L !== null && !isNaN(row.SP_L)) ? Number(row.SP_L) : null,
          SP_LL: (row.SP_LL !== '' && row.SP_LL !== null && !isNaN(row.SP_LL)) ? Number(row.SP_LL) : null,
          DB: (row.DB !== '' && row.DB !== null && !isNaN(row.DB)) ? Number(row.DB) : 2.0,
          RAW_H: (row.RAW_H !== '' && row.RAW_H !== null && !isNaN(row.RAW_H)) ? Number(row.RAW_H) : null,
          RAW_L: (row.RAW_L !== '' && row.RAW_L !== null && !isNaN(row.RAW_L)) ? Number(row.RAW_L) : null,
          modo_manual: row.modo_manual ? 1 : 0,
          valor_manual: (row.modo_manual && row.valor_manual !== '' && row.valor_manual !== null && !isNaN(row.valor_manual)) ? Number(row.valor_manual) : null,
        };
        const r = await fetch(`/api/alarmas/${row.instrumento}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (r.ok) {
          emit('saved');
          const modoLabel = payload.modo_manual ? `Manual (${payload.valor_manual ?? '—'})` : 'Automático';
          emit('toast', `✅ ${row.instrumento} guardado — Modo: ${modoLabel}`);
          await cargar();
        } else {
          emit('toast', '❌ Error al guardar en servidor', 'error');
        }
      } catch (e) { emit('toast', '❌ Error al guardar', 'error'); }
    }

    return { localRows, modalManual, toggleModo, confirmManual, saveRow, fmtLive, liveColor, alarmClass };
  }
};
// ═══════════════════════════════════════════════════════════════
// INICIO PRUEBA PAGE
// ═══════════════════════════════════════════════════════════════
const InicioPruebaPage = {
  name: 'InicioPruebaPage',
  props: ['proc'],
  emits: ['toast'],
  template: `
  <div class="p-6 flex flex-col gap-6 w-full max-w-5xl mx-auto animation-fade-in overflow-y-auto h-full">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold text-text-primary tracking-wide flex items-center gap-2">
        <span class="text-accent-yellow">🚀</span> Inicio de Prueba
      </h1>
      <div v-if="proc.b_Prueba_en_Progreso" class="flex items-center gap-2 px-4 py-1.5 bg-red-500/20 border border-red-500/50 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]">
        <div class="w-2 h-2 rounded-full bg-red-500"></div>
        <span class="text-red-400 text-xs font-black uppercase tracking-widest">Prueba Activa</span>
      </div>
    </div>

    <!-- PANEL SUPERIOR -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      <!-- Datos Inicio de Prueba (Ocupa 3 columnas) -->
      <div class="lg:col-span-3 bg-bg-card border border-border rounded-xl overflow-hidden shadow-lg flex flex-col">
        <div class="bg-accent-blue/20 px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 class="text-xs font-bold text-accent-blue uppercase tracking-widest">Datos Inicio de Prueba</h2>
          <div class="text-xs text-text-secondary">
            <span class="font-bold text-text-primary">Duración:</span> {{ proc.i_duracion_prueba_horas ?? 0 }} Horas
          </div>
        </div>
        
        <div class="p-5 grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1 items-center">
          
          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">(32c) Código de Reporte</span>
            <span class="text-lg font-mono text-text-primary font-medium bg-bg-primary px-3 py-1.5 rounded border border-border w-fit">
              {{ proc.as_Codigo_pozo_16 || '—' }}
            </span>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Fecha de Inicio</span>
            <span class="text-base font-mono text-accent-yellow">
              {{ String(proc.ad_TIEMPO_inicio_prueba?.[2] ?? 0).padStart(2, '0') }} /
              {{ String(proc.ad_TIEMPO_inicio_prueba?.[1] ?? 0).padStart(2, '0') }} /
              {{ proc.ad_TIEMPO_inicio_prueba?.[0] ?? '0000' }}
            </span>
            <div class="text-[10px] font-bold text-text-secondary mt-1">
              Hora: <span class="text-text-primary font-mono">{{ String(proc.ad_TIEMPO_inicio_prueba?.[3] ?? 0).padStart(2, '0') }}:{{ String(proc.ad_TIEMPO_inicio_prueba?.[4] ?? 0).padStart(2, '0') }}:{{ String(proc.ad_TIEMPO_inicio_prueba?.[5] ?? 0).padStart(2, '0') }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">(4c) Num. Reporte</span>
            <span class="text-base text-text-primary mb-1">{{ proc.as_Codigo_pozo_19 || '—' }}</span>
            
            <span class="text-[10px] font-bold text-text-secondary uppercase tracking-wider mt-2">Tiempo Transc.</span>
            <span class="text-base font-mono text-accent-green">
              {{ String(proc.ar_TIEMPO_prueba_TOTAL?.[3] ?? 0).padStart(2, '0') }}:{{ String(proc.ar_TIEMPO_prueba_TOTAL?.[5] ?? 0).padStart(2, '0') }}:{{ String(proc.ar_TIEMPO_prueba_TOTAL?.[6] ?? 0).padStart(2, '0') }}
            </span>
          </div>

        </div>
      </div>

      <!-- Controles (Ocupa 1 columna) -->
      <div class="bg-bg-card border border-border rounded-xl shadow-lg p-5 flex flex-col gap-4 justify-center">
        <button @click="showCargar = true" class="w-full px-4 py-3 bg-accent-orange hover:bg-orange-500 text-text-primary text-xs font-bold uppercase rounded-lg transition-all shadow-lg flex items-center justify-center gap-2">
          <span>📝</span> Cargar Datos
        </button>
        
        <button v-if="!proc.b_Prueba_en_Progreso" @click="iniciarPrueba" class="w-full px-4 py-3 bg-accent-yellow text-black hover:bg-yellow-400 text-xs font-black uppercase rounded-lg transition-all shadow-lg flex items-center justify-center gap-2">
          <span>▶</span> Iniciar Prueba
        </button>
        
        <button v-if="proc.b_Prueba_en_Progreso" @click="pararPrueba" class="w-full px-4 py-3 bg-accent-red hover:bg-red-500 text-text-primary text-xs font-bold uppercase rounded-lg transition-all shadow-lg flex items-center justify-center gap-2">
          <span>⏹</span> Detener
        </button>
        
        <button v-if="proc.b_Prueba_en_Progreso" @click="abortarPrueba" class="w-full px-4 py-3 bg-transparent border border-red-500 text-red-500 hover:bg-red-500/10 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2">
          <span>✕</span> Abortar
        </button>
      </div>

    </div>

    <!-- PANEL INFERIOR: Datos Generales -->
    <div class="bg-bg-card border border-border rounded-xl shadow-lg overflow-hidden flex-1">
      <div class="bg-bg-surface px-5 py-3 border-b border-border flex items-center gap-3">
        <span class="text-accent-steel text-lg">📋</span>
        <h2 class="text-xs font-bold text-text-primary uppercase tracking-widest">Datos Generales de la Prueba</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-bg-primary/50 text-[10px] text-text-secondary uppercase tracking-wider border-b border-border">
              <th class="py-3 px-5 font-semibold">Parámetro</th>
              <th class="py-3 px-5 font-semibold">Valores Registrados</th>
            </tr>
          </thead>
          <tbody class="text-xs text-text-primary divide-y divide-border/50">
            <tr class="hover:bg-bg-primary/30 transition-colors">
              <td class="py-2.5 px-5 font-medium text-text-secondary">(16c) Lugar de la Prueba</td>
              <td class="py-2.5 px-5 text-text-primary">{{ proc.as_Codigo_pozo_17 || '—' }}</td>
            </tr>
            <tr class="hover:bg-bg-primary/30 transition-colors">
              <td class="py-2.5 px-5 font-medium text-text-secondary">(6c) Código del Pozo</td>
              <td class="py-2.5 px-5 text-accent-yellow font-bold">{{ proc.as_Codigo_pozo_03 || '—' }}</td>
            </tr>
            <tr class="hover:bg-bg-primary/30 transition-colors">
              <td class="py-2.5 px-5 font-medium text-text-secondary">(6c) Método de Producción</td>
              <td class="py-2.5 px-5 text-text-primary">{{ proc.as_Codigo_pozo_06 || '—' }}</td>
            </tr>
            <tr class="hover:bg-bg-primary/30 transition-colors">
              <td class="py-2.5 px-5 font-medium text-text-secondary">(4c) RPM Bomba / Diámetro Disco</td>
              <td class="py-2.5 px-5 text-text-primary font-mono">{{ proc.as_Codigo_pozo_08 || '—' }}</td>
            </tr>
            <tr class="hover:bg-bg-primary/30 transition-colors">
              <td class="py-2.5 px-5 font-medium text-text-secondary">(4c) Inyección Diluente</td>
              <td class="py-2.5 px-5 text-text-primary font-mono">{{ proc.as_Codigo_pozo_18 || '—' }}</td>
            </tr>
            
            <tr class="hover:bg-bg-primary/30 transition-colors bg-bg-surface/30">
              <td class="py-2.5 px-5 pl-10 font-medium text-text-secondary relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">↳</span> Temperatura de Yacimiento
              </td>
              <td class="py-2.5 px-5 text-accent-steel font-mono">{{ (proc.r_T_Yac_C ?? 0).toFixed(3) }} <span class="text-text-secondary text-[10px]">°C</span></td>
            </tr>
            <tr class="hover:bg-bg-primary/30 transition-colors bg-bg-surface/30">
              <td class="py-2.5 px-5 pl-10 font-medium text-text-secondary relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">↳</span> API de Formación
              </td>
              <td class="py-2.5 px-5 text-accent-steel font-mono">{{ (proc.r_API_formacion_BM ?? 0).toFixed(3) }} <span class="text-text-secondary text-[10px]">@60°F y 1Atm</span></td>
            </tr>
            <tr class="hover:bg-bg-primary/30 transition-colors bg-bg-surface/30">
              <td class="py-2.5 px-5 pl-10 font-medium text-text-secondary relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">↳</span> API de la Mezcla
              </td>
              <td class="py-2.5 px-5 text-accent-steel font-mono">{{ (proc.r_API_2 ?? 0).toFixed(3) }} <span class="text-text-secondary text-[10px]">@60°F y 1Atm</span></td>
            </tr>
            <tr class="hover:bg-bg-primary/30 transition-colors bg-bg-surface/30">
              <td class="py-2.5 px-5 pl-10 font-medium text-text-secondary relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">↳</span> API de Diluente
              </td>
              <td class="py-2.5 px-5 text-accent-steel font-mono">{{ (proc.r_API_1 ?? 0).toFixed(3) }} <span class="text-text-secondary text-[10px]">@60°F y 1Atm</span></td>
            </tr>
            <tr class="hover:bg-bg-primary/30 transition-colors bg-bg-surface/30">
              <td class="py-2.5 px-5 pl-10 font-medium text-text-secondary relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">↳</span> Caudal de Diluente
              </td>
              <td class="py-2.5 px-5 text-accent-steel font-mono">{{ (proc.r_caudal_dil_BM ?? 0).toFixed(3) }} <span class="text-text-secondary text-[10px]">BBD</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL CARGAR DATOS -->
    <div v-if="showCargar" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animation-fade-in" @click.self="showCargar = false">
      <div class="bg-bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div class="bg-bg-surface px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 class="text-sm font-bold text-text-primary tracking-wide flex items-center gap-2">
            <span class="text-accent-blue">📝</span> Cargar Datos de Inicio de Prueba
          </h3>
          <button @click="showCargar = false" class="text-text-secondary hover:text-text-primary transition-colors p-1">
            ✕
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto flex-1 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">(16c) Lugar de la Prueba</label>
            <input v-model="form.lugar" type="text" maxlength="16" class="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-blue transition-colors" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">(6c) Número de Pozo</label>
            <input v-model="form.pozo" type="text" maxlength="6" class="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-blue transition-colors" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">(6c) Método de Producción</label>
            <div class="flex items-center gap-2">
              <select v-model.number="form.comboMetodo" @change="onComboMetodoChange" class="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-blue transition-colors appearance-none">
                <option v-for="(op, idx) in metodosProduccion" :key="idx" :value="idx">{{ op }}</option>
              </select>
              <span class="text-xs text-text-secondary whitespace-nowrap bg-bg-surface px-2 py-1.5 rounded border border-border">Actual: {{ proc.as_Codigo_pozo_06 || '—' }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">(4c) RPM / Diámetro Disco</label>
            <input v-model="form.rpm" type="text" maxlength="4" class="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-blue transition-colors" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">(4c) Inyección de Diluente</label>
            <div class="flex items-center gap-2">
              <select v-model.number="form.comboInyeccion" @change="onComboInyeccionChange" class="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-blue transition-colors appearance-none">
                <option v-for="(op, idx) in inyeccionOpciones" :key="idx" :value="idx">{{ op }}</option>
              </select>
              <span class="text-xs text-text-secondary whitespace-nowrap bg-bg-surface px-2 py-1.5 rounded border border-border">Actual: {{ proc.as_Codigo_pozo_18 || '—' }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Duración Prueba (Horas)</label>
            <input v-model.number="form.duracionHoras" type="number" step="1" min="0" class="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-accent-yellow font-mono text-sm outline-none focus:border-accent-yellow transition-colors" />
          </div>

          <div class="col-span-full border-t border-border/50 my-2"></div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Temperatura de Yacimiento</label>
            <div class="relative">
              <input v-model.number="form.tempYac" type="number" step="0.001" class="w-full bg-bg-primary border border-border rounded-lg pl-3 pr-10 py-2 text-text-primary text-sm outline-none focus:border-accent-steel transition-colors" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">°C</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">API de Formación</label>
            <div class="relative">
              <input v-model.number="form.apiFormacion" type="number" step="0.001" class="w-full bg-bg-primary border border-border rounded-lg pl-3 pr-24 py-2 text-text-primary text-sm outline-none focus:border-accent-steel transition-colors" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary">@60°F, 1Atm</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">API de Mezcla</label>
            <div class="relative">
              <input v-model.number="form.apiMezcla" type="number" step="0.001" class="w-full bg-bg-primary border border-border rounded-lg pl-3 pr-24 py-2 text-text-primary text-sm outline-none focus:border-accent-steel transition-colors" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary">@60°F, 1Atm</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">API de Diluente</label>
            <div class="relative">
              <input v-model.number="form.apiDiluente" type="number" step="0.001" class="w-full bg-bg-primary border border-border rounded-lg pl-3 pr-24 py-2 text-text-primary text-sm outline-none focus:border-accent-steel transition-colors" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary">@60°F, 1Atm</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Caudal de Diluente</label>
              <span v-if="form.comboInyeccion === 1 && proc.b_SW_DIL_MEDIDO_CALC" class="text-[10px] text-accent-teal font-mono">Modo Instrumento (FIT-05)</span>
              <span v-else-if="form.comboInyeccion === 0" class="text-[10px] text-text-secondary font-mono">Sin inyección</span>
            </div>
            <div class="relative">
              <input v-model.number="form.caudalDiluente" :disabled="form.comboInyeccion === 0" type="number" step="0.001" :class="{'opacity-50 cursor-not-allowed bg-bg-surface': form.comboInyeccion === 0}" class="w-full bg-bg-primary border border-border rounded-lg pl-3 pr-12 py-2 text-text-primary text-sm outline-none focus:border-accent-steel transition-colors" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary">BBL/D</span>
            </div>
          </div>

        </div>

        <div class="bg-bg-surface px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <button @click="showCargar = false" class="px-5 py-2.5 text-xs font-bold text-text-secondary hover:text-text-primary bg-transparent hover:bg-text-primary/5 border border-border rounded-lg transition-all">
            Cancelar
          </button>
          <button @click="guardarDatos" class="px-6 py-2.5 text-xs font-bold text-white bg-accent-blue hover:brightness-110 border border-accent-blue/50 rounded-lg shadow-lg flex items-center gap-2 transition-all">
            <span>💾</span> Guardar en PLC
          </button>
        </div>
      </div>
    </div>
  </div>
  `,

  setup(props, { emit }) {
    const showCargar = ref(false);

    // Opciones de combo boxes
    const metodosProduccion = ['BM', 'BES', 'GAS LIFT', 'SURGENTE', 'PCP', 'OTRO'];
    const inyeccionOpciones = ['NO', 'SI'];

    // Formulario de datos a cargar en el PLC
    const form = reactive({
      lugar:         '',
      pozo:          '',
      rpm:           '',
      comboMetodo:   0,
      comboInyeccion:0,
      tempYac:       0.0,
      apiFormacion:  0.0,
      apiMezcla:     0.0,
      apiDiluente:   0.0,
      caudalDiluente:0.0,
      duracionHoras: 0,
      fechaDD:       0,
      fechaMM:       0,
      fechaAAAA:     0,
      horaHH:        0,
      horaMM:        0,
    });

    // Al abrir el modal, pre-carga con los valores actuales del PLC
    watch(() => showCargar.value, (val) => {
      if (val && props.proc) {
        const p = props.proc;
        form.lugar          = p.as_Codigo_pozo_17 || '';
        form.pozo           = p.as_Codigo_pozo_03 || '';
        form.rpm            = p.as_Codigo_pozo_08 || '';
        form.comboMetodo    = p.i_posicion_combo_box_1 ?? 0;
        form.comboInyeccion = p.i_posicion_combo_box_2 ?? 0;
        form.tempYac        = p.r_T_Yac_C         ?? 0.0;
        form.apiFormacion   = p.r_API_formacion_BM ?? 0.0;
        form.apiMezcla      = p.r_API_2            ?? 0.0;
        form.apiDiluente    = p.r_API_1            ?? 0.0;
        form.caudalDiluente = form.comboInyeccion === 0 ? 0.0 : (p.r_caudal_dil_BM ?? 0.0);
        form.duracionHoras  = p.i_duracion_prueba_horas ?? 0;
        const ih = p.ad_IHM_HORA_inicio || [];
        form.fechaAAAA = ih[0] ?? 0;
        form.fechaMM   = ih[1] ?? 0;
        form.fechaDD   = ih[2] ?? 0;
        form.horaHH    = ih[3] ?? 0;
        form.horaMM    = ih[4] ?? 0;
      }
    });

    function onComboMetodoChange() {
      form.metodo = metodosProduccion[form.comboMetodo] || '';
    }
    function onComboInyeccionChange() {
      form.inyeccion = inyeccionOpciones[form.comboInyeccion] || '';
      if (form.comboInyeccion === 0) {
        form.caudalDiluente = 0.0;
      }
    }

    async function guardarDatos() {
      try {
        const payload = {
          lugar:          form.lugar,
          pozo:           form.pozo,
          rpm:            form.rpm,
          metodo:         metodosProduccion[form.comboMetodo] || '',
          inyeccion:      inyeccionOpciones[form.comboInyeccion] || '',
          comboMetodo:    form.comboMetodo,
          comboInyeccion: form.comboInyeccion,
          tempYac:        form.tempYac,
          apiFormacion:   form.apiFormacion,
          apiMezcla:      form.apiMezcla,
          apiDiluente:    form.apiDiluente,
          caudalDiluente: form.caudalDiluente,
          duracionHoras:  form.duracionHoras,
          fechaDD:        form.fechaDD,
          fechaMM:        form.fechaMM,
          fechaAAAA:      form.fechaAAAA,
          horaHH:         form.horaHH,
          horaMM:         form.horaMM,
        };
        const r = await fetch('/api/plc/prueba/cargar_datos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (r.ok) {
          emit('toast', '✅ Datos cargados en PLC', 'success');
          showCargar.value = false;
        } else {
          emit('toast', '❌ Error al guardar datos', 'error');
        }
      } catch (e) {
        emit('toast', '❌ Error de conexión', 'error');
      }
    }

    async function iniciarPrueba() {
      try {
        const r = await fetch('/api/plc/prueba/iniciar', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        if (r.ok) emit('toast', '▶ Prueba iniciada', 'success');
        else emit('toast', '❌ Error al iniciar', 'error');
      } catch (e) { emit('toast', '❌ Error de conexión', 'error'); }
    }

    async function pararPrueba() {
      try {
        const r = await fetch('/api/plc/prueba/parar', { method: 'POST' });
        if (r.ok) emit('toast', '⏹ Prueba detenida', 'success');
        else emit('toast', '❌ Error al detener', 'error');
      } catch (e) { emit('toast', '❌ Error de conexión', 'error'); }
    }

    async function abortarPrueba() {
      try {
        const r = await fetch('/api/plc/prueba/abortar', { method: 'POST' });
        if (r.ok) emit('toast', '✕ Prueba abortada', 'success');
        else emit('toast', '❌ Error al abortar', 'error');
      } catch (e) { emit('toast', '❌ Error de conexión', 'error'); }
    }

    async function vaciarDatos() {
      if(!confirm("¿Está seguro de vaciar todos los datos de la prueba? Esto limpiará la base de datos y la memoria.")) return;
      try {
        const r = await fetch('/api/plc/prueba/vaciar', { method: 'POST' });
        if(r.ok) emit('toast', 'Datos vaciados correctamente', 'success');
        else emit('toast', '❌ Error al vaciar', 'error');
      } catch (e) { emit('toast', '❌ Error de conexión', 'error'); }
    }

    return {
      showCargar, form,
      metodosProduccion, inyeccionOpciones,
      onComboMetodoChange, onComboInyeccionChange,
      guardarDatos, iniciarPrueba, pararPrueba, abortarPrueba, vaciarDatos,
    };
  }
};


// ═══════════════════════════════════════════════════════════════
// HISTÓRICO DE ALARMAS PAGE
// ═══════════════════════════════════════════════════════════════
const HistoricoAlarmasPage = {
  name: 'HistoricoAlarmasPage',
  template: `
  <div class="px-4 py-6 flex flex-col w-full max-w-7xl mx-auto gap-5">

    <!-- NUEVA ALARMA – banner flash -->
    <transition name="inst-fade">
      <div v-if="nuevosPendientes > 0"
           class="flex items-center gap-3 px-4 py-2.5 bg-red-600/30 border border-red-500 rounded-lg animate-pulse">
        <span class="text-red-400 text-lg">🚨</span>
        <span class="text-red-300 text-sm font-bold">
          {{ nuevosPendientes }} nueva{{ nuevosPendientes > 1 ? 's' : '' }} alarma{{ nuevosPendientes > 1 ? 's' : '' }} registrada{{ nuevosPendientes > 1 ? 's' : '' }}
        </span>
      </div>
    </transition>

    <!-- HEADER -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-bold text-text-primary tracking-wide">Histórico de Alarmas</h1>
          <!-- Badge EN VIVO -->
          
        </div>
        <p class="text-xs text-text-secondary mt-0.5">
          Registro automático de transiciones de alarma
          <span v-if="ultimaActualizacion" class="ml-2 text-green-400">
            · Última: {{ ultimaActualizacion }}
          </span>
        </p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button @click="cargar" :disabled="cargando"
                class="px-4 py-2 bg-accent-blue hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold rounded transition-all flex items-center gap-1.5">
          <span>🔄</span> {{ cargando ? 'Cargando...' : 'Actualizar' }}
        </button>
        <button @click="exportarExcel"
                class="px-4 py-2 bg-accent-green hover:brightness-110 text-white text-xs font-bold rounded transition-all flex items-center gap-1.5">
          <span>📥</span> Descargar Excel
        </button>
      </div>
    </div>

    <!-- FILTROS -->
    <div class="bg-bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <div class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Filtros de Búsqueda</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Fecha inicio -->
        <div class="flex flex-col gap-1">
          <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Desde</label>
          <input type="datetime-local" v-model="filtro.inicio"
                 class="bg-bg-primary border border-border rounded-md px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-yellow transition-all" />
        </div>
        <!-- Fecha fin -->
        <div class="flex flex-col gap-1">
          <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Hasta</label>
          <input type="datetime-local" v-model="filtro.fin"
                 class="bg-bg-primary border border-border rounded-md px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-yellow transition-all" />
        </div>
        <!-- Instrumento -->
        <div class="flex flex-col gap-1">
          <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Instrumento</label>
          <select v-model="filtro.instrumento"
                  class="bg-bg-primary border border-border rounded-md px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-yellow transition-all">
            <option value="">Todos</option>
            <option v-for="i in instrumentos" :key="i" :value="i">{{ i }}</option>
          </select>
        </div>
        <!-- Nivel -->
        <div class="flex flex-col gap-1">
          <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Nivel de Alarma</label>
          <select v-model="filtro.nivel"
                  class="bg-bg-primary border border-border rounded-md px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-yellow transition-all">
            <option value="">Todos</option>
            <option value="HH">🔴 HH (Alto-Alto)</option>
            <option value="H">🟠 H (Alto)</option>
            <option value="L">🟡 L (Bajo)</option>
            <option value="LL">🟣 LL (Bajo-Bajo)</option>
            <option value="OK">✅ OK (Retorno Normal)</option>
          </select>
        </div>
      </div>
      <!-- Atajos de fecha -->
      <div class="flex flex-wrap gap-2 items-center mt-1">
        <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider mr-1">Período rápido:</span>
        <button v-for="p in periodos" :key="p.label" @click="setPeriodo(p.horas)"
                class="px-3 py-1 bg-bg-primary border border-border hover:border-accent-yellow text-text-secondary hover:text-text-primary text-xs rounded transition-all">
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- RESUMEN DE CONTEOS -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-3" v-if="rows.length > 0">
      <div v-for="n in [{nivel:'HH',label:'Alto-Alto',color:'#ef4444'},{nivel:'H',label:'Alto',color:'#f97316'},
                        {nivel:'L',label:'Bajo',color:'#eab308'},{nivel:'LL',label:'Bajo-Bajo',color:'#a855f7'},
                        {nivel:'OK',label:'Retorno',color:'#22c55e'}]"
           :key="n.nivel"
           class="bg-bg-card border border-border rounded-lg p-3 text-center">
        <div class="text-2xl font-black" :style="{color: n.color}">{{ conteoNivel(n.nivel) }}</div>
        <div class="text-[10px] text-text-secondary uppercase tracking-wider mt-1">{{ n.label }}</div>
      </div>
    </div>

    <!-- TABLA -->
    <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div v-if="cargando" class="py-16 text-center text-text-secondary text-sm">
        ⏳ Cargando registros...
      </div>
      <div v-else-if="rows.length === 0" class="py-16 text-center text-text-secondary text-sm flex flex-col items-center gap-2">
        <span class="text-4xl">🔕</span>
        <div>No hay registros de alarmas en el período seleccionado.</div>
        <div class="text-xs text-text-secondary">Las alarmas se registran automáticamente cada 10 segundos al detectar transiciones en los set-points.</div>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="bg-bg-primary text-text-secondary border-b border-border uppercase tracking-wider text-[10px] font-bold">
              <th class="p-3 w-8">#</th>
              <th class="p-3">Fecha / Hora</th>
              <th class="p-3">Instrumento</th>
              <th class="p-3">Descripción</th>
              <th class="p-3 text-center">Unidad</th>
              <th class="p-3 text-right">Valor</th>
              <th class="p-3 text-center">Nivel</th>
              <th class="p-3 text-right">SP Activo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in rowsPaginados" :key="r.id"
                :class="['border-b border-border transition-all hover:brightness-110', rowBg(r.nivel)]">
              <td class="p-3 text-text-secondary font-mono">{{ (pagina - 1) * porPagina + idx + 1 }}</td>
              <td class="p-3 font-mono text-text-secondary whitespace-nowrap">{{ r.timestamp }}</td>
              <td class="p-3 font-bold text-text-primary">{{ r.instrumento }}</td>
              <td class="p-3 text-text-secondary" style="font-size:11px">{{ r.descripcion }}</td>
              <td class="p-3 text-center text-text-secondary">{{ r.unidad }}</td>
              <td class="p-3 text-right font-mono font-bold" :class="rowTxt(r.nivel)">{{ fmtVal(r.valor) }}</td>
              <td class="p-3 text-center">
                <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase" :class="badgeClass(r.nivel)">
                  {{ r.nivel === 'OK' ? '✅ Normal' : r.nivel }}
                </span>
              </td>
              <td class="p-3 text-right text-text-secondary font-mono">{{ r.sp_activo !== null && r.sp_activo !== '' ? fmtVal(r.sp_activo) : '—' }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Paginación -->
        <div class="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-primary">
          <div class="text-xs text-text-secondary">
            Mostrando {{ (pagina-1)*porPagina+1 }}–{{ Math.min(pagina*porPagina, rows.length) }} de {{ rows.length }} registros
          </div>
          <div class="flex gap-1">
            <button @click="pagina = Math.max(1, pagina-1)" :disabled="pagina===1"
                    class="px-3 py-1 bg-bg-card border border-border disabled:opacity-40 text-text-primary text-xs rounded hover:bg-bg-primary transition-all">◀</button>
            <span class="px-3 py-1 text-xs text-text-secondary">{{ pagina }} / {{ totalPaginas }}</span>
            <button @click="pagina = Math.min(totalPaginas, pagina+1)" :disabled="pagina===totalPaginas"
                    class="px-3 py-1 bg-bg-card border border-border disabled:opacity-40 text-text-primary text-xs rounded hover:bg-bg-primary transition-all">▶</button>
          </div>
        </div>
      </div>
    </div>
  </div>`,

  setup() {
    const { ref, reactive, computed, onMounted } = Vue;

    const rows     = ref([]);
    const cargando = ref(false);
    const pagina   = ref(1);
    const porPagina = 8;   // Máximo 8 filas visibles por página

    // Calcular inicio predeterminado: últimas 24 h
    const ahora = new Date();
    const hace24 = new Date(ahora.getTime() - 24 * 3600 * 1000);
    const toLocal = d => {
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const filtro = reactive({
      inicio:      toLocal(hace24),
      fin:         toLocal(ahora),
      instrumento: '',
      nivel:       '',
    });

    const periodos = [
      { label: 'Última hora', horas: 1 },
      { label: '6 horas',     horas: 6 },
      { label: '24 horas',    horas: 24 },
      { label: '7 días',      horas: 168 },
      { label: '30 días',     horas: 720 },
    ];

    function setPeriodo(horas) {
      const fin = new Date();
      filtro.fin   = toLocal(fin);
      filtro.inicio = toLocal(new Date(fin.getTime() - horas * 3600 * 1000));
      cargar();
    }

    const instrumentos = [
      'FI-03','GAS-01','LI-01','NIV-AUX',
      'PDI-01','PDI-02','PDI-03','PDI-04',
      'PI-01','PI-02','TI-01','TI-02','VI-01','WC'
    ];

    async function cargar() {
      cargando.value = true;
      pagina.value   = 1;
      try {
        const p = new URLSearchParams();
        if (filtro.inicio) p.append('inicio', filtro.inicio.replace('T', ' ') + ':00');
        if (filtro.fin)    p.append('fin',    filtro.fin.replace('T', ' ')    + ':59');
        if (filtro.instrumento) p.append('instrumento', filtro.instrumento);
        if (filtro.nivel)       p.append('nivel', filtro.nivel);
        const r = await fetch(`/api/historico_alarmas?${p}`);
        rows.value = await r.json();
      } catch(e) { rows.value = []; }
      finally     { cargando.value = false; }
    }

    function exportarExcel() {
      const p = new URLSearchParams();
      if (filtro.inicio) p.append('inicio', filtro.inicio.replace('T', ' ') + ':00');
      if (filtro.fin)    p.append('fin',    filtro.fin.replace('T', ' ')    + ':59');
      if (filtro.instrumento) p.append('instrumento', filtro.instrumento);
      if (filtro.nivel)       p.append('nivel', filtro.nivel);
      window.open(`/api/historico_alarmas/excel?${p}`, '_blank');
    }

    const totalPaginas = computed(() => Math.max(1, Math.ceil(rows.value.length / porPagina)));
    const rowsPaginados = computed(() => {
      const s = (pagina.value - 1) * porPagina;
      return rows.value.slice(s, s + porPagina);
    });

    function conteoNivel(niv) {
      return rows.value.filter(r => r.nivel === niv).length;
    }
    function fmtVal(v) {
      const n = parseFloat(v);
      return isNaN(n) ? '—' : n.toFixed(3);
    }
    function rowBg(nivel) {
      return {
        'bg-red-900/20':    nivel === 'HH',
        'bg-orange-900/15': nivel === 'H',
        'bg-yellow-900/10': nivel === 'L',
        'bg-purple-900/15': nivel === 'LL',
        'bg-green-900/10':  nivel === 'OK',
      };
    }
    function rowTxt(nivel) {
      return {
        'text-red-400':    nivel === 'HH',
        'text-orange-400': nivel === 'H',
        'text-yellow-400': nivel === 'L',
        'text-purple-400': nivel === 'LL',
        'text-green-400':  nivel === 'OK',
        'text-text-primary':      !nivel,
      };
    }
    function badgeClass(nivel) {
      return {
        'bg-red-600 text-white':    nivel === 'HH',
        'bg-orange-500 text-text-primary': nivel === 'H',
        'bg-yellow-400 text-gray-900': nivel === 'L',
        'bg-purple-600 text-text-primary': nivel === 'LL',
        'bg-green-700 text-white':  nivel === 'OK',
        'bg-gray-600 text-text-primary':   !nivel,
      };
    }

    const ultimaActualizacion = ref('');
    const nuevosPendientes    = ref(0);
    let _socketListener = null;
    let _pollInterval = null;

    function _conectarSocket() {
      // Reusar el socket global del App (window._appSocket) con reintentos
      const _intentar = (intentos) => {
        const sock = window._appSocket;
        if (sock) {
          _socketListener = (alarma) => {
            const filtroNivel = filtro.nivel;
            const filtroInst  = filtro.instrumento;
            if (filtroNivel && alarma.nivel !== filtroNivel) return;
            if (filtroInst  && alarma.instrumento !== filtroInst) return;

            // Avanzar filtro.fin para incluir este registro
            filtro.fin = toLocal(new Date());
            rows.value.unshift(alarma);
            ultimaActualizacion.value = alarma.timestamp;
            nuevosPendientes.value += 1;
            setTimeout(() => { nuevosPendientes.value = Math.max(0, nuevosPendientes.value - 1); }, 5000);
            pagina.value = 1;
          };
          sock.on('new_alarm', _socketListener);
        } else if (intentos < 20) {
          // Reintentar cada 500 ms hasta 10 s
          setTimeout(() => _intentar(intentos + 1), 500);
        }
      };
      _intentar(0);
    }

    // ── Polling de respaldo cada 10 s (sincronizado con ciclo de detección) ──
    function _iniciarPolling() {
      _pollInterval = setInterval(async () => {
        try {
          const ahora = new Date();
          const finFiltro = new Date(filtro.fin);
          // Auto-avanzar "Hasta" solo si el filtro actual está cerca del presente (modo en vivo)
          // Evita que registros nuevos queden fuera, y previene sobrescribir filtros históricos.
          if (ahora - finFiltro < 120000) {
            filtro.fin = toLocal(ahora);
          }

          const p = new URLSearchParams();
          if (filtro.inicio) p.append('inicio', filtro.inicio.replace('T', ' ') + ':00');
          p.append('fin', filtro.fin.replace('T', ' ') + ':59');
          if (filtro.instrumento) p.append('instrumento', filtro.instrumento);
          if (filtro.nivel)       p.append('nivel', filtro.nivel);
          const r = await fetch(`/api/historico_alarmas?${p}`);
          const nuevos = await r.json();
          rows.value = nuevos;
          if (nuevos.length > 0) {
            ultimaActualizacion.value = new Date().toLocaleTimeString('es-VE');
          }
        } catch(e) {}
      }, 10000);  // cada 10 segundos
    }


    onMounted(() => {
      cargar();
      _conectarSocket();
      _iniciarPolling();
    });

    // Limpieza al desmontar el componente
    const { onUnmounted } = Vue;
    onUnmounted(() => {
      // Quitar solo el listener, NO desconectar el socket compartido
      if (_socketListener && window._appSocket) {
        window._appSocket.off('new_alarm', _socketListener);
      }
      if (_pollInterval) clearInterval(_pollInterval);
    });

    return {
      rows, cargando, filtro, pagina, porPagina, periodos, instrumentos,
      totalPaginas, rowsPaginados, conteoNivel, fmtVal,
      rowBg, rowTxt, badgeClass, cargar, exportarExcel, setPeriodo,
      ultimaActualizacion, nuevosPendientes,
    };
  }
};


// ═══════════════════════════════════════════════════════════════
// REPORTES PAGE
// ═══════════════════════════════════════════════════════════════
const ReportesPage = {
  name: 'ReportesPage',
  template: `
  <div class="px-6 py-8 flex flex-col items-center justify-center w-full max-w-5xl mx-auto animation-fade-in">
    <!-- TITULO Y CABECERA -->
    <div class="bg-bg-card border border-border rounded-xl shadow-lg w-full overflow-hidden mb-6">
      <div class="bg-accent-steel text-center text-white font-bold py-3 text-sm border-b border-border uppercase tracking-widest shadow-inner">
        Descarga de Reportes
      </div>

      <!-- SELECTOR DE METODO -->
      <div class="flex border-b border-border bg-bg-surface">
        <button 
          @click="setMetodo('dates')" 
          :class="['flex-1 py-3 text-sm font-semibold transition-all border-r border-border focus:outline-none', 
                   metodo === 'dates' ? 'bg-bg-card text-accent-yellow border-b-2 border-b-accent-yellow' : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary']">
          📅 Por Rango de Fecha y Hora
        </button>
        <button 
          @click="setMetodo('pruebas')" 
          :class="['flex-1 py-3 text-sm font-semibold transition-all focus:outline-none', 
                   metodo === 'pruebas' ? 'bg-bg-card text-accent-yellow border-b-2 border-b-accent-yellow' : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary']">
          🧪 Por Histórico de Pruebas de Pozo
        </button>
      </div>

      <!-- CONTENIDO METODO: FECHAS -->
      <div v-if="metodo === 'dates'" class="flex flex-col md:flex-row gap-6 p-8 justify-center bg-bg-surface">
        <!-- Fecha Inicio -->
        <div class="flex-1 bg-bg-card border border-border shadow-sm rounded-lg p-5 flex flex-col items-center max-w-[300px]">
          <div class="text-text-primary font-bold mb-4 uppercase text-xs tracking-wider border-b border-border w-full text-center pb-2">Fecha Inicio</div>
          <div class="w-full flex flex-col gap-4 mt-2">
            <div class="relative">
              <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1 block">Día</label>
              <input type="date" v-model="fechaInicio" class="w-full bg-bg-primary border border-border rounded-md px-4 py-2 text-text-primary text-sm outline-none focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow transition-all" />
            </div>
            <div class="relative">
              <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1 block">Hora</label>
              <input type="time" v-model="horaInicio" class="w-full bg-bg-primary border border-border rounded-md px-4 py-2 text-text-primary text-sm outline-none focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow transition-all" />
            </div>
          </div>
        </div>

        <!-- Fecha Final -->
        <div class="flex-1 bg-bg-card border border-border shadow-sm rounded-lg p-5 flex flex-col items-center max-w-[300px]">
          <div class="text-text-primary font-bold mb-4 uppercase text-xs tracking-wider border-b border-border w-full text-center pb-2">Fecha Final</div>
          <div class="w-full flex flex-col gap-4 mt-2">
            <div class="relative">
              <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1 block">Día</label>
              <input type="date" v-model="fechaFin" class="w-full bg-bg-primary border border-border rounded-md px-4 py-2 text-text-primary text-sm outline-none focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow transition-all" />
            </div>
            <div class="relative">
              <label class="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1 block">Hora</label>
              <input type="time" v-model="horaFin" class="w-full bg-bg-primary border border-border rounded-md px-4 py-2 text-text-primary text-sm outline-none focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow transition-all" />
            </div>
          </div>
        </div>
      </div>
      
      <!-- BOTON DE DESCARGA METODO FECHAS -->
      <div v-if="metodo === 'dates'" class="p-5 bg-bg-card border-t border-border flex justify-center items-center">
        <button @click="descargar" class="px-10 py-3 bg-bg-tag hover:brightness-110 text-white font-bold rounded shadow-lg transition-transform transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 border border-accent-steel border-opacity-50">
          <span class="text-lg">📊</span>
          <span>Descargar Reporte (Excel / CSV)</span>
        </button>
      </div>

      <!-- CONTENIDO METODO: PRUEBAS -->
      <div v-if="metodo === 'pruebas'" class="p-6 bg-bg-surface flex flex-col">
        <!-- BUSCADOR -->
        <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div class="w-full md:w-auto flex-1 max-w-md relative">
            <input 
              type="text" 
              v-model="filtroBusqueda" 
              placeholder="Buscar por código, pozo, lugar, método o estado..." 
              class="w-full bg-bg-primary border border-border rounded-md pl-10 pr-4 py-2 text-text-primary text-sm outline-none focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow transition-all" 
            />
            <span class="absolute left-3 top-2.5 text-text-secondary text-sm">🔍</span>
          </div>
          
          <button @click="cargarPruebas" class="px-4 py-2 bg-bg-card border border-border hover:bg-bg-primary text-text-primary font-semibold rounded text-xs flex items-center gap-2 transition-all">
            <span>🔄</span> Actualizar Lista
          </button>
        </div>

        <!-- FILTROS DE DURACIÓN -->
        <div class="flex flex-wrap items-center gap-2 mb-4 bg-bg-card p-3 rounded-lg border border-border">
          <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider mr-2">Duración de Prueba:</span>
          <button 
            v-for="opt in [{val:'all', label:'Todas'}, {val:'1', label:'1 h'}, {val:'3', label:'3 h'}, {val:'12', label:'12 h'}, {val:'24', label:'24 h'}, {val:'other', label:'Otras'}]"
            :key="opt.val"
            @click="duracionFiltro = opt.val"
            :class="['px-3 py-1 rounded text-xs font-semibold border transition-all', 
                     duracionFiltro === opt.val ? 'bg-accent-yellow text-bg-primary border-accent-yellow shadow-md' : 'bg-bg-primary text-text-secondary border-border hover:text-text-primary hover:bg-bg-card']"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- TABLA DE PRUEBAS -->
        <div class="overflow-x-auto w-full border border-border rounded-lg bg-bg-card shadow-inner">
          <div v-if="cargandoPruebas" class="py-10 text-center text-text-secondary text-sm">
            Cargando historial de pruebas...
          </div>
          <div v-else-if="pruebasFiltradas.length === 0" class="py-10 text-center text-text-secondary text-sm">
            No se encontraron registros de pruebas.
          </div>
          <table v-else class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-bg-primary text-text-secondary border-b border-border uppercase tracking-wider text-[10px] font-bold">
                <th class="p-3">ID</th>
                <th class="p-3">Código Pozo</th>
                <th class="p-3">Lugar / Pozo</th>
                <th class="p-3">Método / RPM</th>
                <th class="p-3">Duración (H)</th>
                <th class="p-3">Inicio</th>
                <th class="p-3">Fin</th>
                <th class="p-3 text-center">Estado</th>
                <th class="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in pruebasPaginadas" :key="p.id" class="border-b border-border hover:bg-bg-primary hover:bg-opacity-50 text-text-primary transition-all">
                <td class="p-3 font-semibold text-accent-yellow">#{{ p.id }}</td>
                <td class="p-3 font-mono">{{ p.codigo_pozo || '-' }}</td>
                <td class="p-3">
                  <div class="font-medium text-text-primary">{{ p.lugar || '-' }}</div>
                  <div class="text-[10px] text-text-secondary">Pozo: {{ p.pozo || '-' }}</div>
                </td>
                <td class="p-3">
                  <div>{{ p.metodo || '-' }}</div>
                  <div class="text-[10px] text-text-secondary">RPM: {{ p.rpm || '-' }}</div>
                </td>
                <td class="p-3 font-semibold text-accent-blue">{{ p.duracion_horas }} h</td>
                <td class="p-3 text-text-secondary font-mono text-[10px]">{{ p.fecha_inicio }}</td>
                <td class="p-3 text-text-secondary font-mono text-[10px]">{{ p.fecha_fin || 'En progreso...' }}</td>
                <td class="p-3 text-center">
                  <span :style="p.estado === 'Completada' ? 'background:#064e3b; color:#34d399; border: 1px solid #059669;' : 
                                p.estado === 'Abortada' ? 'background:#7f1d1d; color:#f87171; border: 1px solid #dc2626;' : 
                                p.estado === 'En progreso' ? 'background:#78350f; color:#fbbf24; border: 1px solid #d97706;' :
                                'background:#1f2937; color:#9ca3af; border: 1px solid #374151;'"
                        class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    {{ p.estado }}
                  </span>
                </td>
                <td class="p-3 text-center">
                  <button 
                    @click="descargarPrueba(p.id)" 
                    class="px-3 py-1.5 bg-bg-tag hover:brightness-110 text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-accent-steel border-opacity-50 mx-auto transition-all shadow-md active:scale-95">
                    <span>📥</span> Descargar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- CONTROLES DE PAGINACIÓN -->
        <div v-if="totalPaginas > 1" class="flex justify-center items-center gap-2 mt-4 p-2">
          <button @click="prevPag" :disabled="paginaActual === 1" class="px-3 py-1 bg-bg-primary text-text-secondary border border-border rounded hover:bg-white/10 disabled:opacity-50 transition-all text-xs font-semibold">Anterior</button>
          
          <div class="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-none" style="scrollbar-width: none;">
            <button v-for="p in totalPaginas" :key="p" @click="irPag(p)"
                    :class="['w-8 h-8 flex-shrink-0 flex items-center justify-center rounded text-xs font-bold transition-all',
                             paginaActual === p ? 'bg-accent-yellow text-bg-primary shadow-md' : 'bg-bg-primary text-text-secondary border border-border hover:text-text-primary']">
              {{ p }}
            </button>
          </div>
          
          <button @click="nextPag" :disabled="paginaActual === totalPaginas" class="px-3 py-1 bg-bg-primary text-text-secondary border border-border rounded hover:bg-white/10 disabled:opacity-50 transition-all text-xs font-semibold">Siguiente</button>
        </div>

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

    const metodo = ref('dates'); // 'dates' o 'pruebas'
    const pruebas = ref([]);
    const cargandoPruebas = ref(false);
    const filtroBusqueda = ref('');
    const duracionFiltro = ref('all');

    const paginaActual = ref(1);
    const itemsPorPagina = 5;

    async function cargarPruebas() {
      cargandoPruebas.value = true;
      try {
        const r = await fetch('/api/reportes/pruebas');
        if(r.ok) {
          pruebas.value = await r.json();
          paginaActual.value = 1;
        }
      } catch(e) {
        console.error("Error cargando pruebas:", e);
      } finally {
        cargandoPruebas.value = false;
      }
    }

    function setMetodo(m) {
      metodo.value = m;
      if (m === 'pruebas') {
        cargarPruebas();
      }
    }

    function descargar() {
      const dtInicio = fechaInicio.value + " " + horaInicio.value + ":00";
      const dtFin = fechaFin.value + " " + horaFin.value + ":59";

      const qs = new URLSearchParams({ inicio: dtInicio, fin: dtFin });
      window.location.href = "/api/reportes/descargar?" + qs.toString();
    }

    function descargarPrueba(id) {
      window.location.href = "/api/reportes/descargar?prueba_id=" + id;
    }

    watch([filtroBusqueda, duracionFiltro], () => {
      paginaActual.value = 1;
    });

    const pruebasFiltradas = computed(() => {
      let list = pruebas.value;

      // Filtro por duración
      if (duracionFiltro.value !== 'all') {
        if (duracionFiltro.value === 'other') {
          list = list.filter(p => ![1, 3, 12, 24].includes(Number(p.duracion_horas)));
        } else {
          const targetDur = Number(duracionFiltro.value);
          list = list.filter(p => Number(p.duracion_horas) === targetDur);
        }
      }

      // Filtro por búsqueda de texto
      if (!filtroBusqueda.value) return list;
      const q = filtroBusqueda.value.toLowerCase();
      return list.filter(p => {
        return (p.codigo_pozo && p.codigo_pozo.toLowerCase().includes(q)) ||
               (p.lugar && p.lugar.toLowerCase().includes(q)) ||
               (p.pozo && p.pozo.toLowerCase().includes(q)) ||
               (p.metodo && p.metodo.toLowerCase().includes(q)) ||
               (p.estado && p.estado.toLowerCase().includes(q)) ||
               (p.id && String(p.id).includes(q));
      });
    });

    const totalPaginas = computed(() => Math.ceil(pruebasFiltradas.value.length / itemsPorPagina));

    const pruebasPaginadas = computed(() => {
      const start = (paginaActual.value - 1) * itemsPorPagina;
      const end = start + itemsPorPagina;
      return pruebasFiltradas.value.slice(start, end);
    });

    function nextPag() { if (paginaActual.value < totalPaginas.value) paginaActual.value++; }
    function prevPag() { if (paginaActual.value > 1) paginaActual.value--; }
    function irPag(p) { paginaActual.value = p; }

    return { 
      fechaInicio, horaInicio, fechaFin, horaFin, descargar,
      metodo, pruebas, cargandoPruebas, filtroBusqueda, duracionFiltro,
      setMetodo, descargarPrueba, pruebasFiltradas, cargarPruebas,
      paginaActual, totalPaginas, pruebasPaginadas, nextPag, prevPag, irPag
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// PRUEBA-PROGRESO
// ═══════════════════════════════════════════════════════════════
const PruebaProgresoPage = {
  name: 'PruebaProgresoPage',
  props: ['proc'],
  template: `
  <div class="p-6 flex flex-col gap-6 w-full mx-auto animation-fade-in overflow-y-auto h-full">

    <!-- HEADER -->
    <div class="bg-bg-card border border-border rounded-xl p-4 grid grid-cols-3 gap-6">
      <div class="flex flex-col gap-1">
        <div class="flex justify-between text-xs py-0.5"><span class="text-text-primary font-bold uppercase">Reporte</span><span class="text-accent-yellow font-mono">{{ data.reporte }}</span></div>
        <div class="flex justify-between text-xs py-0.5"><span class="text-text-primary font-bold uppercase">Fecha Inicio</span><span class="text-accent-yellow font-mono">{{ data.fechaInicio }}</span></div>
        <div class="flex justify-between text-xs py-0.5"><span class="text-text-primary font-bold uppercase">Hora Inicio</span><span class="text-accent-yellow font-mono">{{ data.horaInicio }}</span></div>
      </div>
      <div class="flex flex-col gap-1">
        <div class="flex justify-between text-xs py-0.5"><span class="text-text-primary font-bold uppercase">Método</span><span class="text-accent-yellow font-mono">{{ data.metodo }}</span></div>
        <div class="flex justify-between text-xs py-0.5"><span class="text-text-primary font-bold uppercase">Pozo</span><span class="text-accent-yellow font-mono">{{ data.pozo }}</span></div>
        <div class="flex justify-between text-xs py-0.5"><span class="text-text-primary font-bold uppercase">Tiempo Trans.</span><span class="text-accent-yellow font-mono">{{ data.tiempoTranscurrido }}</span></div>
      </div>
      <div class="flex flex-col gap-1">
        <div class="flex justify-between text-xs py-0.5"><span class="text-text-primary font-bold uppercase">RPM Bomba</span><span class="text-accent-yellow font-mono">{{ data.rpmBomba }}</span></div>
        <div class="flex justify-between text-xs py-0.5"><span class="text-text-primary font-bold uppercase">API</span><span class="text-accent-yellow font-mono">{{ data.api }}</span></div>
        <div class="flex justify-between text-xs py-0.5"><span class="text-text-primary font-bold uppercase">Iny. Diluente</span><span class="text-accent-yellow font-mono">{{ data.inyeccionDiluente }}</span></div>
      </div>
    </div>

    <!-- TREND + VALORES -->
    <div class="grid grid-cols-5 gap-5">
      <div class="col-span-3 bg-bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-accent-blue/10">
          <span class="text-accent-blue font-bold text-[10px] uppercase tracking-widest">Monitor de Tendencias</span>
          <div class="flex gap-1 flex-wrap">
            <button v-for="v in trendVars" :key="v.key" @click="v.active=!v.active;rebuildCharts()"
              :class="['px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all',v.active?'text-text-primary':'border-border text-text-secondary']"
              :style="v.active?{background:v.color,borderColor:v.color}:{}">{{ v.label }}</button>
            <button @click="paused=!paused" class="px-1.5 py-0.5 text-[8px] bg-white/10 text-text-primary border border-white/20 rounded ml-1">{{ paused?'▶':'⏸' }}</button>
            <button @click="clearHistory" class="px-1.5 py-0.5 text-[8px] bg-accent-red/20 text-accent-red border border-accent-red/30 rounded">✕</button>
          </div>
        </div>
        <div class="p-3 flex-1" style="height:270px"><canvas ref="c0"></canvas></div>
      </div>
      <div class="col-span-2 bg-bg-card border border-border rounded-xl overflow-hidden">
        <div class="bg-accent-blue/10 text-center text-accent-blue font-bold py-2 text-xs border-b border-border uppercase tracking-widest">Valores Actuales</div>
        <div class="p-3 flex flex-col gap-1">
          <div v-for="p in params" :key="p.label" class="flex justify-between items-center border-b border-border/20 py-1.5">
            <span class="text-xs text-text-primary font-bold uppercase">{{ p.label }}</span>
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
          <button @click="pausedL=!pausedL" class="px-1.5 py-0.5 text-[8px] bg-white/10 text-text-primary border border-white/20 rounded">{{ pausedL?'▶':'⏸' }}</button>
        </div>
        <div class="p-3" style="height:220px"><canvas ref="c1"></canvas></div>
        <div class="border-t border-border/30 overflow-y-auto" style="max-height:210px">
          <table class="w-full text-[11px]"><tbody>
            <tr v-for="r in condLinea" :key="r.label" class="border-b border-border/20 hover:bg-text-primary/5">
              <td class="px-3 py-1 text-text-primary font-bold uppercase">{{ r.label }}</td>
              <td class="px-3 py-1 text-right font-mono text-accent-yellow font-semibold">{{ r.value }}</td>
            </tr>
          </tbody></table>
        </div>
      </div>
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-border" style="background:rgba(39,167,102,0.15)">
          <span class="text-accent-green font-bold text-[10px] uppercase">Cond. Estándar (14.7 PSIA / 15.56°C)</span>
          <button @click="pausedS=!pausedS" class="px-1.5 py-0.5 text-[8px] bg-white/10 text-text-primary border border-white/20 rounded">{{ pausedS?'▶':'⏸' }}</button>
        </div>
        <div class="p-3" style="height:220px"><canvas ref="c2"></canvas></div>
        <div class="border-t border-border/30 overflow-y-auto" style="max-height:210px">
          <table class="w-full text-[11px]"><tbody>
            <tr v-for="r in condEstandar" :key="r.label" class="border-b border-border/20 hover:bg-text-primary/5">
              <td class="px-3 py-1 text-text-primary font-bold uppercase">{{ r.label }}</td>
              <td class="px-3 py-1 text-right font-mono text-accent-yellow font-semibold">{{ r.value }}</td>
            </tr>
          </tbody></table>
        </div>
      </div>
    </div>

   

  </div>
  `,
  setup(props) {
    const c0 = ref(null), c1 = ref(null), c2 = ref(null);
    const paused = ref(false), pausedL = ref(false), pausedS = ref(false);
    let charts = [null, null, null];

    const data = computed(() => {
      const p = props.proc || {};
      
      const ih = p.ad_IHM_HORA_inicio || [0,0,0,0,0];
      const yy = ih[0], mm = ih[1], dd = ih[2];
      const hh = ih[3], mn = ih[4];
      const fecha = (dd && mm && yy) ? `${dd.toString().padStart(2,'0')}/${mm.toString().padStart(2,'0')}/${yy}` : '--/--/----';
      const hora = (hh || mn) ? `${hh.toString().padStart(2,'0')}:${mn.toString().padStart(2,'0')}` : '--:--';

      const tt = p.ar_TIEMPO_prueba_TOTAL || [];
      const th = tt[3] || 0, tm = tt[5] || 0, ts = tt[6] || 0;
      const t_trans = `${th.toString().padStart(2,'0')}:${tm.toString().padStart(2,'0')}:${ts.toString().padStart(2,'0')}`;

      return {
        reporte: p.as_Codigo_pozo_16 || '—',
        fechaInicio: fecha,
        horaInicio: hora,
        metodo: p.as_Codigo_pozo_06 || '—',
        pozo: p.as_Codigo_pozo_03 || '—',
        tiempoTranscurrido: t_trans,
        rpmBomba: p.as_Codigo_pozo_08 || '—',
        api: (p.r_API_2 !== undefined && p.r_API_2 !== null) ? parseFloat(p.r_API_2).toFixed(1) : '—',
        inyeccionDiluente: p.as_Codigo_pozo_18 || '—'
      };
    });

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
      { label: 'Vol. Líquido (BBLS)', value: parseFloat(props.proc.Vol_Liquido || 0).toFixed(3) },
      { label: 'Vol. Crudo (BBLS)', value: parseFloat(props.proc.Vol_Crudo || 0).toFixed(3) },
      { label: 'Vol. Crudo Neto (BBLS)', value: parseFloat(props.proc.Vol_Crudo_Neto || 0).toFixed(3) },
      { label: 'Vol. Diluente (BBLS)', value: parseFloat(props.proc.Vol_Diluente || 0).toFixed(3) },
      { label: 'Vol. Agua (BBLS)', value: parseFloat(props.proc.Vol_Agua || 0).toFixed(3) },
      { label: 'Vol. Gas Arrastrado (CF)', value: parseFloat(props.proc.Vol_Gas_Arr || 0).toFixed(3) },
      { label: 'Vol. Gas Total (MCF)', value: parseFloat(props.proc.Vol_Gas_Total || 0).toFixed(3) },
      { label: 'Tasa Est. Líquido (BPD)', value: parseFloat(props.proc.Est_Q_Liq || 0).toFixed(3) },
      { label: 'Tasa Est. Crudo (BPD)', value: parseFloat(props.proc.Est_Q_Crudo || 0).toFixed(3) },
      { label: 'Tasa Est. Crudo Neto (BPD)', value: parseFloat(props.proc.Est_Q_Neto || 0).toFixed(3) },
      { label: 'Tasa Est. Diluente (BPD)', value: parseFloat(props.proc.Est_Q_Dil || 0).toFixed(3) },
      { label: 'Tasa Est. Agua (BPD)', value: parseFloat(props.proc.Est_Q_Agua || 0).toFixed(3) },
      { label: 'Tasa Est. Gas Arrastrado (CFD)', value: parseFloat(props.proc.Est_Q_gat || 0).toFixed(3) },
      { label: 'Tasa Est. Gas Total (MCFD)', value: parseFloat(props.proc.Est_Q_gas_line || 0).toFixed(3) },
    ]);

    const condEstandar = computed(() => [
      { label: 'Vol. Líquido (BBLS)', value: parseFloat(props.proc.Vol_Liquido_sc || 0).toFixed(3) },
      { label: 'Vol. Crudo (BBLS)', value: parseFloat(props.proc.Vol_Crudo_sc || 0).toFixed(3) },
      { label: 'Vol. Crudo Neto (BBLS)', value: parseFloat(props.proc.Vol_Crudo_Neto_sc || 0).toFixed(3) },
      { label: 'Vol. Diluente (BBLS)', value: parseFloat(props.proc.Vol_Diluente_sc || 0).toFixed(3) },
      { label: 'Vol. Agua (BBLS)', value: parseFloat(props.proc.Vol_Agua_sc || 0).toFixed(3) },
      { label: 'Vol. Gas Arrastrado (CF)', value: parseFloat(props.proc.Vol_Gas_Arr_sc || 0).toFixed(3) },
      { label: 'Vol. Gas Total (MCF)', value: parseFloat(props.proc.Vol_Gas_Total_sc || 0).toFixed(3) },
      { label: 'Tasa Est. Líquido (BPD)', value: parseFloat(props.proc.Est_Q_Liq_sc || 0).toFixed(3) },
      { label: 'Tasa Est. Crudo (BPD)', value: parseFloat(props.proc.Est_Q_Crudo_sc || 0).toFixed(3) },
      { label: 'Tasa Est. Crudo Neto (BPD)', value: parseFloat(props.proc.Est_Q_Crudo_Neto_sc || 0).toFixed(3) },
      { label: 'Tasa Est. Diluente (BPD)', value: parseFloat(props.proc.Est_Q_Dil_sc || 0).toFixed(3) },
      { label: 'Tasa Est. Agua (BPD)', value: parseFloat(props.proc.Est_Q_Agua_sc || 0).toFixed(3) },
      { label: 'Tasa Est. Gas Arrastrado (CFD)', value: parseFloat(props.proc.Est_Q_gat_sc || 0).toFixed(3) },
      { label: 'Tasa Est. Gas Total (MCFD)', value: parseFloat(props.proc.Est_Q_Gas || 0).toFixed(3) },
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
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold text-text-primary tracking-wide">⚙️ Configuración de Propiedades Físicas</h1>
      
    </div>
    
    <!-- SECTION 1: Referencias de Densidad Estandar -->
    <div class="bg-bg-card border border-border shadow-lg rounded-xl overflow-hidden">
      <div class="bg-accent-blue/20 text-center text-accent-blue font-bold py-2 text-xs border-b border-border uppercase tracking-widest">
        Referencias de Densidad Estándar
      </div>
      <div class="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-bg-surface/30">
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-text-primary font-bold uppercase mb-1">Densidad Ref Diluente</label>
          <label class="text-[9px] text-text-secondary mb-2">(g/cm3 @ 60ºF, 14.7 PSIA)</label>
          <input v-if="isEditing" type="number" step="any" v-model.number="propiedades.densidadRefDiluente" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow" />
          <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ fmtP(propiedades.densidadRefDiluente) }}</span>
        </div>
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-text-primary font-bold uppercase mb-1">Densidad Ref Crudo</label>
          <label class="text-[9px] text-text-secondary mb-2">(g/cm3 @ 60ºF, 14.7 PSIA)</label>
          <input v-if="isEditing" type="number" step="any" v-model.number="propiedades.densidadRefCrudo" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow" />
          <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ fmtP(propiedades.densidadRefCrudo) }}</span>
        </div>
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-text-primary font-bold uppercase mb-1">Grav Esp Gas</label>
          <label class="text-[9px] text-text-secondary mb-2">(SG)</label>
          <input v-if="isEditing" type="number" step="any" v-model.number="propiedades.gravEspGas" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow" />
          <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ fmtP(propiedades.gravEspGas) }}</span>
        </div>
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-text-primary font-bold uppercase mb-1">Presión Atm</label>
          <label class="text-[9px] text-text-secondary mb-2">(PSIA)</label>
          <input v-if="isEditing" type="number" step="any" v-model.number="propiedades.presionAtm" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow" />
          <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ fmtP(propiedades.presionAtm) }}</span>
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
          <label class="text-[10px] text-text-primary font-bold uppercase mb-1">Constante de Gas (Kj/Kg/oK)</label>
          <input v-if="isEditing" type="number" step="any" v-model.number="propiedades.constanteGas" class="w-32 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow" />
          <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ fmtP(propiedades.constanteGas) }}</span>
        </div>
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-text-primary font-bold uppercase mb-1">Presión Crítica de Gas (PSIA)</label>
          <input v-if="isEditing" type="number" step="any" v-model.number="propiedades.presionCriticaGas" class="w-32 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow" />
          <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ fmtP(propiedades.presionCriticaGas) }}</span>
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
            <label class="text-[10px] text-text-primary font-bold">A</label>
            <input v-if="isEditing" type="number" step="any" v-model.number="propiedades.A" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow" />
            <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ fmtP(propiedades.A) }}</span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <label class="text-[10px] text-text-primary font-bold">D</label>
            <input v-if="isEditing" type="number" step="any" v-model.number="propiedades.D" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow" />
            <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ fmtP(propiedades.D) }}</span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <label class="text-[10px] text-text-primary font-bold">B</label>
            <input v-if="isEditing" type="number" step="any" v-model.number="propiedades.B" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow" />
            <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ fmtP(propiedades.B) }}</span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <label class="text-[10px] text-text-primary font-bold">E</label>
            <input v-if="isEditing" type="number" step="any" v-model.number="propiedades.E" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow" />
            <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ fmtP(propiedades.E) }}</span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <label class="text-[10px] text-text-primary font-bold">C</label>
            <input v-if="isEditing" type="number" step="any" v-model.number="propiedades.C" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow" />
            <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ fmtP(propiedades.C) }}</span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <label class="text-[10px] text-text-primary font-bold">Z</label>
            <span class="font-mono text-sm text-text-secondary font-semibold">{{ fmtP(propiedades.Z) }}</span>
          </div>
        </div>
        <div class="mt-2 pt-2 border-t border-border/50 w-full flex justify-center items-center gap-4">
          <label class="text-[10px] text-text-primary font-bold uppercase">Densidad del Gas (Kg/m3)</label>
          <input v-if="isEditing" type="number" step="any" v-model.number="propiedades.densidadGas" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow" />
          <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ fmtP(propiedades.densidadGas) }}</span>
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
          <label class="text-[10px] text-text-primary font-bold uppercase">Laminar</label>
          <input v-if="isEditing" type="number" step="any" v-model.number="propiedades.laminar" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow" />
          <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ fmtP(propiedades.laminar) }}</span>
        </div>
        <div class="flex items-center justify-center gap-4">
          <label class="text-[10px] text-text-primary font-bold uppercase">Wedge</label>
          <input v-if="isEditing" type="number" step="any" v-model.number="propiedades.wedge" class="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow" />
          <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ fmtP(propiedades.wedge) }}</span>
        </div>
      </div>
    </div>

    <!-- FOOTER BUTTONS -->
    <div class="flex items-center justify-between mt-4">
      <button @click="openPvt" class="px-8 py-2 bg-gray-300 hover:bg-white text-gray-800 font-bold rounded shadow-md border-b-4 border-gray-500 active:border-b-0 active:translate-y-1 transition-all">
        PVT
      </button>
      <button v-if="!isEditing" @click="isEditing = true" class="px-8 py-2 bg-accent-blue text-white font-bold rounded shadow-md border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition-all">
          Editar Propiedades
        </button>
        <template v-else>
          <button @click="cancelarEdicion" class="px-8 py-2 bg-gray-600 hover:bg-gray-500 text-text-primary font-bold rounded shadow-md border-b-4 border-border active:border-b-0 active:translate-y-1 transition-all">
            Cancelar
          </button>
          <button @click="guardarPropiedades" class="px-8 py-2 bg-accent-green text-white font-bold rounded shadow-md border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all">
            Guardar Todo
          </button>
        </template>
      </div>
    </div>

  </div>
  `,
  setup(props, { emit }) {
    const propiedades = reactive({
      densidadRefDiluente:0.0, densidadRefCrudo:0.0, gravEspGas:0.0, presionAtm:0.0,
      constanteGas:0.0, presionCriticaGas:0.0,
      A:0.0, B:0.0, C:0.0, D:0.0, E:0.0, Z:0.0,
      densidadGas:0.0, laminar:0.0, wedge:0.0
    });
    const isEditing = ref(false);

    const fmtP = (val, dec=3) =>
      (val!==undefined && val!==null) ? parseFloat(val).toFixed(dec) : '0.000';

    async function cargar() {
      try {
        const r = await fetch('/api/propiedades');
        Object.assign(propiedades, await r.json());
      } catch(e) {}
    }
    async function guardarPropiedades() {
      try {
        const r = await fetch('/api/propiedades', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({...propiedades})
        });
        if (r.ok) { emit('toast','✅ Propiedades guardadas'); isEditing.value=false; cargar(); }
        else emit('toast','❌ Error al guardar','error');
      } catch(e) { emit('toast','❌ Error de red','error'); }
    }
    function cancelarEdicion() { isEditing.value=false; cargar(); }
    function openPvt() { emit('open-pvt'); }

    let timer;
    onMounted(() => {
      cargar();
      timer = setInterval(() => { if(!isEditing.value) cargar(); }, 2000);
    });
    onUnmounted(() => clearInterval(timer));

    return { propiedades, isEditing, fmtP, openPvt,
              guardarPropiedades, cancelarEdicion };
  }
}

// ═══════════════════════════════════════════════════════════════
// PVT PAGE
// ═══════════════════════════════════════════════════════════════
const PvtPage = {
  name: 'PvtPage',
  props: ['proc'],
  emits: ['back', 'toast'],
  template: `
  <div class="p-6 flex flex-col gap-6 w-full max-w-5xl mx-auto animation-fade-in overflow-y-auto h-full">
    
    <!-- SECTION 1: Cálculos de PVT -->
    <div class="bg-bg-card border border-border shadow-lg rounded-xl overflow-hidden">
      <div class="bg-accent-blue/20 text-center text-accent-blue font-bold py-2 text-xs border-b border-border uppercase tracking-widest flex items-center justify-center gap-2">
        <span>🧪</span> Cálculos de PVT
      </div>
      <div class="p-6 grid grid-cols-1 sm:grid-cols-3 gap-8 bg-bg-surface/30">
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-text-primary font-bold uppercase mb-1">Temp. Yacimiento (°F)</label>
          <input v-if="pvtMode === 1" type="number" step="0.1" v-model.number="pvt.tempYac" class="w-32 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow font-mono" />
          <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ proc?.r_T_Yac_C || 0 }}</span>
        </div>
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-text-primary font-bold uppercase mb-1">RSO (PCN/BN)</label>
          <input v-if="pvtMode === 1" type="number" step="0.01" v-model.number="pvt.rso" class="w-32 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow font-mono" />
          <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ proc?.r_Rso_PT || 0 }}</span>
        </div>
        <div class="flex flex-col items-center text-center">
          <label class="text-[10px] text-text-primary font-bold uppercase mb-1">BO (BY/BN)</label>
          <input v-if="pvtMode === 1" type="number" step="0.001" v-model.number="pvt.bo" class="w-32 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary text-xs text-center outline-none focus:border-accent-yellow font-mono" />
          <span v-else class="font-mono text-sm text-accent-yellow font-semibold">{{ proc?.r_Bo_PT || proc?.r_Bo || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- SECTION 2: Balance de Masa -->
    <div class="bg-bg-card border border-border shadow-lg rounded-xl overflow-hidden">
      <div class="bg-accent-blue/20 text-center text-accent-blue font-bold py-2 text-xs border-b border-border uppercase tracking-widest flex items-center justify-center gap-2">
        <span>⚖️</span> Balance de Masa
      </div>
      <div class="overflow-x-auto bg-bg-surface/30">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="border-b border-border/50 bg-text-primary/5">
              <th class="p-3 font-bold text-text-secondary uppercase tracking-wider">Parámetro</th>
              <th class="p-3 font-bold text-text-secondary uppercase tracking-wider text-center">Reales</th>
              <th class="p-3 font-bold text-text-secondary uppercase tracking-wider text-center">Teórico</th>
              <th class="p-3 font-bold text-text-secondary uppercase tracking-wider text-center">Error %</th>
            </tr>
          </thead>
          <tbody class="text-text-primary">
            <tr v-for="row in balanceRows" :key="row.label" class="border-b border-border/30 hover:bg-text-primary/5 transition-colors">
              <td class="p-3 font-semibold">{{ row.label }}</td>
              <td class="p-3 text-center">
                <input v-if="pvtMode === 1" type="number" step="0.01" v-model.number="pvt[row.key+'_real']" class="w-24 bg-bg-primary border border-border rounded px-1.5 py-0.5 text-xs text-center outline-none focus:border-accent-yellow font-mono" />
                <span v-else class="font-mono text-xs text-accent-yellow">{{ (proc && row.real_key ? proc[row.real_key] : 0) || 0 }}</span>
              </td>
              <td class="p-3 text-center">
                <input v-if="pvtMode === 1" type="number" step="0.01" v-model.number="pvt[row.key+'_teo']" class="w-24 bg-bg-primary border border-border rounded px-1.5 py-0.5 text-xs text-center outline-none focus:border-accent-yellow font-mono" />
                <span v-else class="font-mono text-xs text-accent-yellow">{{ (proc && row.teo_key ? proc[row.teo_key] : 0) || 0 }}</span>
              </td>
              <td class="p-3 text-center text-accent-yellow font-mono font-semibold">{{ calcError(pvtMode===1 ? pvt[row.key+'_real'] : (proc && row.real_key ? proc[row.real_key] : 0), pvtMode===1 ? pvt[row.key+'_teo'] : (proc && row.teo_key ? proc[row.teo_key] : 0)) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Botón modo PVT -->
    <div class="flex flex-col items-center justify-center mt-2 gap-1">
      <span class="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Modo de Operación PVT:</span>
      <button id="b_PB_PVT"
              @click="togglePvtMode"
              :class="['px-8 py-2 font-bold rounded shadow-md border-b-4 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-2',
                       pvtMode===0
                         ? 'bg-accent-green text-white border-green-700'
                         : 'bg-accent-orange text-white border-orange-700']">
        <span>{{ pvtMode===0 ? '⚡ MODO: CALCULADA' : '📝 MODO: INGRESADA' }}</span>
      </button>
    </div>

    <!-- FOOTER BUTTONS -->
    <div class="flex items-center justify-between mt-4 flex-wrap gap-3">
      <button @click="$emit('back')" class="w-10 h-10 rounded-full bg-accent-green flex items-center justify-center text-white shadow-lg hover:brightness-110 active:scale-95 transition-all">
        <span class="text-xl">⬅️</span>
      </button>
      <div class="flex items-center gap-3">
        <button v-if="pvtMode === 1" @click="cargarDatos" class="px-6 py-2 bg-gray-300 hover:bg-white text-gray-800 font-bold rounded shadow-md border-b-4 border-gray-500 active:border-b-0 active:translate-y-1 transition-all text-xs flex items-center gap-1.5">
          <span>📋</span> Cargar Datos PVT
        </button>
        <button @click="guardarPvtBalance" class="px-8 py-2 bg-accent-blue hover:brightness-110 text-white font-bold rounded shadow-md border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition-all text-xs flex items-center gap-2">
          <span>💾</span> Guardar Datos en BD
        </button>
      </div>
    </div>

    <!-- PVT DATA MODAL -->
    <pvt-data-modal v-if="showPvtModal" :initial-rso="pvt.rso" :initial-bo="pvt.bo" @close="showPvtModal=false" @save="onPvtModalSave" />

  </div>
  `,
  setup(props, { emit }) {
    const pvt = reactive({
      tempYac: 0, rso: 0, bo: 1.0,
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
      { label: 'API Formación @60ºF', key: 'apiForm', real_key: 'r_API_formacion_BM', teo_key: 'r_API_formacion_BM' },
      { label: 'API Mezcla @60ºF', key: 'apiMez', real_key: 'r_API_2', teo_key: 'r_API_MEZCLA_TEORICO' },
      { label: 'API Diluente @60ºF', key: 'apiDil', real_key: 'r_API_1', teo_key: 'r_API_1' },
      { label: 'Q Diluente BBDL', key: 'qDil', real_key: 'r_caudal_dil_BM', teo_key: 'r_caudal_dil_BM' },
      { label: 'Q Neto BBDL', key: 'qNet', real_key: 'Q_Neto', teo_key: 'r_CAUDAL_NETO_TEORICO' },
      { label: 'Q Neto + Diluente BBDL', key: 'qNetDil', real_key: 'Q_Crudo', teo_key: 'Q_Crudo' },
      { label: 'Q Agua BBDL', key: 'qAgua', real_key: 'Q_Agua', teo_key: 'Q_Agua' },
      { label: 'Q Total BBDL', key: 'qTotal', real_key: 'Q_Liq', teo_key: 'Q_Liq' }
    ];

    const showPvtModal = ref(false);
    const pvtMode = ref(0); // 0 = Calculada, 1 = Ingresada

    function calcError(real, teo) {
      const r = parseFloat(real) || 0;
      const t = parseFloat(teo) || 0;
      if (!t || t === 0) return '0.00';
      const err = ((r - t) / t) * 100;
      return err.toFixed(2);
    }

    function cargarDatos() { showPvtModal.value = true; }

    async function loadPvtBalance() {
      try {
        const r = await fetch('/api/pvt-balance');
        const d = await r.json();
        if (d && d.ok !== false) {
          pvtMode.value = d.pvtMode ?? 0;
          pvt.tempYac = d.tempYac ?? 0;
          pvt.rso = d.rso ?? 0;
          pvt.bo = d.bo ?? 1.0;
          pvt.apiForm_real = d.apiForm_real ?? 0;
          pvt.apiForm_teo = d.apiForm_teo ?? 0;
          pvt.apiMez_real = d.apiMez_real ?? 0;
          pvt.apiMez_teo = d.apiMez_teo ?? 0;
          pvt.apiDil_real = d.apiDil_real ?? 0;
          pvt.apiDil_teo = d.apiDil_teo ?? 0;
          pvt.qDil_real = d.qDil_real ?? 0;
          pvt.qDil_teo = d.qDil_teo ?? 0;
          pvt.qNet_real = d.qNet_real ?? 0;
          pvt.qNet_teo = d.qNet_teo ?? 0;
          pvt.qNetDil_real = d.qNetDil_real ?? 0;
          pvt.qNetDil_teo = d.qNetDil_teo ?? 0;
          pvt.qAgua_real = d.qAgua_real ?? 0;
          pvt.qAgua_teo = d.qAgua_teo ?? 0;
          pvt.qTotal_real = d.qTotal_real ?? 0;
          pvt.qTotal_teo = d.qTotal_teo ?? 0;
        }
      } catch(e) {
        console.error('Error cargando datos PVT y Balance:', e);
      }
    }

    async function guardarPvtBalance(silent = false) {
      try {
        const payload = {
          pvtMode: pvtMode.value,
          ...pvt
        };
        const r = await fetch('/api/pvt-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (r.ok) {
          if (!silent) emit('toast', '💾 Cálculos de PVT y Balance de Masa guardados en BD');
        } else {
          if (!silent) emit('toast', '❌ Error al guardar en BD', 'error');
        }
      } catch(e) {
        if (!silent) emit('toast', '❌ Error de red al guardar en BD', 'error');
      }
    }

    async function onPvtModalSave(data) {
      pvt.rso = data.rso;
      pvt.bo = data.bo;
      await guardarPvtBalance(true);
      emit('toast', '✅ Datos PVT guardados y actualizados en BD');
    }

    async function togglePvtMode() {
      const newVal = pvtMode.value === 0 ? 1 : 0;
      pvtMode.value = newVal;
      try {
        await fetch('/api/pvt-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pvtMode: newVal, ...pvt })
        });
        emit('toast', newVal === 1 ? 'PVT: Modo Ingresada (1) activado y guardado' : 'PVT: Modo Calculada (0) activado y guardado');
      } catch(e) {
        emit('toast', '❌ Error al actualizar modo PVT', 'error');
      }
    }

    onMounted(() => {
      loadPvtBalance();
    });

    return {
      pvt, balanceRows, calcError, cargarDatos,
      showPvtModal, onPvtModalSave, pvtMode, togglePvtMode,
      guardarPvtBalance
    };
  }
}

// PVT DATA MODAL (Popup)
// ═══════════════════════════════════════════════════════════════
const PvtDataModal = {
  name: 'PvtDataModal',
  props: ['initialRso', 'initialBo'],
  emits: ['close', 'save'],
  template: `
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="bg-[#d1e8f7] border-2 border-[#1a6496] p-6 rounded shadow-2xl w-80 animation-scale-in">
      <div class="text-center text-[#1a6496] font-bold text-sm mb-6 tracking-widest uppercase flex items-center justify-center gap-1.5">
        <span>🧪</span> DATOS PVT
      </div>
      <div class="flex flex-col gap-4 mb-6 px-4">
        <div class="flex items-center justify-between gap-4">
          <label class="text-xs font-bold text-gray-800">RSO</label>
          <input type="number" step="0.01" v-model.number="form.rso" class="w-32 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-center text-gray-800 outline-none focus:border-accent-blue font-mono" />
        </div>
        <div class="flex items-center justify-between gap-4">
          <label class="text-xs font-bold text-gray-800">BO</label>
          <input type="number" step="0.001" v-model.number="form.bo" class="w-32 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-center text-gray-800 outline-none focus:border-accent-blue font-mono" />
        </div>
      </div>
      <div class="flex justify-center gap-3">
        <button @click="$emit('close')" class="px-6 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded shadow border border-gray-400 active:translate-y-0.5 transition-all uppercase text-xs">
          Cancelar
        </button>
        <button @click="save" class="px-8 py-1.5 bg-[#1a6496] hover:bg-[#15527b] text-white font-bold rounded shadow-md border border-[#144d73] active:translate-y-0.5 transition-all uppercase text-xs">
          Guardar PVT
        </button>
      </div>
    </div>
  </div>
  `,
  setup(props, { emit }) {
    const form = reactive({
      rso: props.initialRso ?? 0.0,
      bo: props.initialBo ?? 1.0
    });

    watch(() => [props.initialRso, props.initialBo], ([newRso, newBo]) => {
      if (newRso !== undefined) form.rso = newRso;
      if (newBo !== undefined) form.bo = newBo;
    });

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
        <h1 class="text-xl font-bold text-text-primary tracking-wide">📡 Configuración Modbus / DAQ</h1>
        <p class="text-xs text-text-secondary mt-0.5">Lectura en tiempo real de canales AI y configuración de mapeo</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button @click="forceReconnect"
                :disabled="reconnecting"
                :class="['px-3 py-1.5 text-text-primary text-xs font-bold rounded transition-all',
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
            <div class="text-sm font-bold text-text-primary">
              {{ live.connected ? '✅ DAQ Conectada' : live.stale ? '🟡 Sin Datos (Stale)' : '🔴 DAQ Desconectada' }}
            </div>
            <div class="text-xs text-text-secondary">
              Última lectura: {{ live.ts || '--' }}
              <span v-if="live.data_age_s > 1" class="ml-2" :class="live.stale ? 'text-yellow-400' : 'text-text-secondary'">
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
            <div class="text-xs text-text-secondary">Puerto</div>
            <div class="text-sm font-mono font-bold text-accent-yellow">{{ live.port || '--' }}</div>
          </div>
          <div class="bg-bg-primary rounded-lg p-2">
            <div class="text-xs text-text-secondary">Baudrate</div>
            <div class="text-sm font-mono font-bold text-accent-yellow">{{ live.baudrate || '--' }}</div>
          </div>
          <div class="bg-bg-primary rounded-lg p-2">
            <div class="text-xs text-text-secondary">Slave ID</div>
            <div class="text-sm font-mono font-bold text-accent-yellow">{{ live.slave_id ?? '--' }}</div>
          </div>
        </div>
      </div>

      <!-- Card edición de conexión -->
      <div class="bg-bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <div class="text-sm font-bold text-text-primary mb-1">⚙️ Parámetros de Conexión RTU</div>
        <div class="grid grid-cols-3 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-text-secondary">Puerto</label>
            <input v-model="connForm.port" placeholder="COM3"
                   class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-text-secondary">Baudrate</label>
            <select v-model.number="connForm.baudrate"
                    class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue">
              <option>1200</option><option>2400</option><option>4800</option>
              <option>9600</option><option>19200</option><option>38400</option>
              <option>57600</option><option>115200</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-text-secondary">Slave ID</label>
            <input v-model.number="connForm.slave_id" type="number" min="1" max="247"
                   class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 text-xs text-text-secondary mt-1">
          <span>Paridad: N, 8, 1</span>
          <span>Protocolo: Modbus RTU</span>
          <span>Formato: Engineering ×1000</span>
        </div>
      </div>
    </div>

    <!-- Canales AI en tiempo real -->
    <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-border flex items-center justify-between">
        <span class="text-sm font-bold text-text-primary">📥 Canales de Entrada Analógica (AI) — Lectura en Vivo</span>
        <span class="text-xs text-text-secondary font-mono">Actualización: cada 500 ms</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border bg-bg-primary">
              <th class="px-3 py-2 text-left text-text-secondary font-semibold w-40">Variable V (fija)</th>
              <th class="px-3 py-2 text-left text-text-secondary font-semibold">Descripción / Instrumento</th>
              <th class="px-3 py-2 text-center text-text-secondary font-semibold w-32">Address Canal Modbus</th>
              <th class="px-3 py-2 text-right text-text-secondary font-semibold w-24">Raw (xescala)</th>
              <th class="px-3 py-2 text-right text-text-secondary font-semibold w-28">Valor [mA]</th>
              <th class="px-3 py-2 text-center text-text-secondary font-semibold w-20">Estado</th>
              <th class="px-3 py-2 text-center text-text-secondary font-semibold w-20">Escala</th>
              <th class="px-3 py-2 text-center text-text-secondary font-semibold w-16">Editar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ch in mergedChannels" :key="ch.var"
                class="border-b border-border hover:bg-text-primary/5 transition-colors"
                :class="[!ch.enabled ? 'opacity-40' : ch.open_wire ? 'opacity-50' : '']">
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
                         class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1 w-full outline-none focus:border-accent-blue" />
                </span>
                <span v-else class="text-text-primary font-medium">{{ ch.desc || '—' }}</span>
              </td>
              <!-- Address Canal Modbus (editable 0-5) -->
              <td class="px-3 py-2 text-center">
                <span v-if="editingCh === ch.var">
                  <select v-model.number="editForms[ch.var].modbus_addr"
                          class="bg-bg-primary border border-border text-text-primary text-xs rounded px-1.5 py-1 outline-none focus:border-accent-blue font-mono">
                    <option v-for="num in [0,1,2,3,4,5]" :key="num" :value="num">
                      CH:{{ String(num).padStart(2,'0') }} (addr {{ num }})
                    </option>
                  </select>
                </span>
                <span v-else class="flex flex-col items-center justify-center font-mono leading-tight">
                  <span class="text-accent-yellow font-bold">CH:{{ String(ch.modbus_addr).padStart(2,'0') }}</span>
                  <span class="text-[10px] text-text-secondary">addr {{ ch.modbus_addr }}</span>
                </span>
              </td>
              <!-- Raw (xescala) -->
              <td class="px-3 py-2 text-right font-mono">
                <span :class="ch.open_wire ? 'text-red-400' : 'text-text-secondary'">{{ ch.raw ?? '—' }}</span>
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
                <span v-if="!ch.enabled"
                      class="px-2 py-0.5 text-xs font-bold rounded bg-gray-800 text-text-secondary">DESHABILITADO</span>
                <span v-else-if="ch.open_wire"
                      class="px-2 py-0.5 text-xs font-bold rounded bg-red-900/60 text-red-300">SIN SEÑAL</span>
                <span v-else
                      class="px-2 py-0.5 text-xs font-bold rounded bg-green-900/60 text-green-300">OK</span>
              </td>
              <!-- Escala -->
              <td class="px-3 py-2 text-center font-mono">
                <span v-if="editingCh === ch.var">
                  <input v-model.number="editForms[ch.var].scale" type="number" step="1"
                         class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1 w-20 outline-none focus:border-accent-blue font-mono text-center" />
                </span>
                <span v-else class="text-text-secondary font-mono">{{ ch.scale ?? 1000 }}</span>
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
                          class="px-2 py-0.5 text-xs bg-gray-600 hover:brightness-110 text-text-primary rounded">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Salidas analógicas (AO) - Monitoreo en tiempo real -->
    <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-border">
        <span class="text-sm font-bold text-text-primary">📤 Canales de Salida Analógica (AO) — Control de Válvulas</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="bg-bg-primary text-text-secondary border-b border-border text-[11px] uppercase tracking-wider">
              <th class="px-3 py-2 font-semibold">Variable / Descripción</th>
              <th class="px-3 py-2 font-semibold text-center">Físico / Modbus</th>
              <th class="px-3 py-2 font-semibold text-center">Scale Min/Max</th>
              <th class="px-3 py-2 font-semibold text-right">Raw (mA)</th>
              <th class="px-3 py-2 font-semibold text-right">Apertura %</th>
              <th class="px-3 py-2 font-semibold text-center">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700/50">
            <tr v-for="ao in mergedAoChannels" :key="ao.var"
                class="hover:bg-gray-800/30 transition-colors"
                :class="{'opacity-50': !ao.enabled}">
              <!-- Nombre y descripción -->
              <td class="px-3 py-2">
                <div class="font-mono font-bold text-accent-yellow">{{ ao.var }}</div>
                <div v-if="editingCh === ao.var" class="mt-1">
                  <input v-model="editForms[ao.var].description"
                         class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1 w-full outline-none focus:border-accent-blue"
                         placeholder="Descripción corta" />
                </div>
                <div v-else class="text-xs text-text-secondary truncate w-48">{{ ao.desc }}</div>
              </td>
              <!-- Hardware / Modbus Addr -->
              <td class="px-3 py-2 text-center">
                <span v-if="editingCh === ao.var">
                  <input v-model.number="editForms[ao.var].modbus_addr" type="number" min="0" max="255"
                         class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1 w-16 outline-none focus:border-accent-blue font-mono text-center" title="Modbus Addr" />
                </span>
                <span v-else class="flex flex-col items-center justify-center font-mono leading-tight">
                  <span class="text-accent-yellow font-bold">CH:{{ String(ao.channel_addr).padStart(2,'0') }}</span>
                  <span class="text-[10px] text-text-secondary">addr {{ ao.modbus_addr }}</span>
                </span>
              </td>
              <!-- Escala Min/Max -->
              <td class="px-3 py-2 text-center font-mono">
                <span v-if="editingCh === ao.var" class="flex flex-col gap-1 items-center">
                  <input v-model.number="editForms[ao.var].scale_min" type="number" step="1"
                         class="bg-bg-primary border border-border text-text-primary text-xs rounded px-1 py-1 w-16 outline-none focus:border-accent-blue font-mono text-center" title="Scale Min" />
                  <input v-model.number="editForms[ao.var].scale_max" type="number" step="1"
                         class="bg-bg-primary border border-border text-text-primary text-xs rounded px-1 py-1 w-16 outline-none focus:border-accent-blue font-mono text-center" title="Scale Max" />
                </span>
                <span v-else class="text-text-secondary font-mono text-xs">{{ ao.scale_min }} - {{ ao.scale_max }}</span>
              </td>
              <!-- Raw (mA) -->
              <td class="px-3 py-2 text-right font-mono">
                <span class="text-accent-green font-bold">{{ ao.val_raw !== undefined && ao.val_raw !== null ? ao.val_raw.toFixed(0) : '4000' }}</span>
                <div class="text-[10px] text-text-secondary mt-0.5">Raw</div>
              </td>
              <!-- Apertura % -->
              <td class="px-3 py-2 text-right">
                <div class="flex flex-col items-end gap-1">
                  <span class="font-mono text-accent-blue font-bold">{{ ao.val_eu !== undefined && ao.val_eu !== null ? ao.val_eu.toFixed(1) : '0.0' }}%</span>
                  <div class="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full bg-accent-blue rounded-full transition-all duration-300"
                         :style="{width: Math.min(100, Math.max(0, ao.val_eu || 0)) + '%'}"></div>
                  </div>
                </div>
              </td>
              <!-- Editar -->
              <td class="px-3 py-2 text-center">
                <button v-if="editingCh !== ao.var"
                        @click="startEditAo(ao)"
                        class="px-2 py-0.5 text-xs bg-accent-blue hover:brightness-110 text-white rounded transition-all">✏️</button>
                <div v-else class="flex flex-col gap-1 items-center">
                  <button @click="saveAoCh(ao)"
                          class="px-2 py-0.5 w-full text-xs bg-accent-green hover:brightness-110 text-white rounded">✓</button>
                  <button @click="editingCh = null"
                          class="px-2 py-0.5 w-full text-xs bg-gray-600 hover:brightness-110 text-text-primary rounded">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Salidas digitales (DO) -->
    <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-border">
        <span class="text-sm font-bold text-text-primary">🔌 Salidas Digitales (DO) — No en uso actualmente</span>
      </div>
      <div class="grid grid-cols-3 gap-3 p-4">
        <div v-for="i in 3" :key="i"
             class="bg-bg-primary rounded-lg p-3 border border-border opacity-50 flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-gray-600"></span>
          <span class="text-xs text-text-secondary">DO:0{{ i-1 }} — Sin asignar</span>
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
      ao_channels: [
        { ch: 0, desc: 'LCV-01 Válvula Nivel', addr: 20, var: 'fb_LEVEL_PID_r_CVEU', val_eu: 0, val_raw: 4000 },
        { ch: 1, desc: 'PCV-01 Válvula Presión', addr: 21, var: 'fb_PRESS_PID_r_CVEU', val_eu: 0, val_raw: 4000 }
      ]
    });
    const connForm = reactive({ port: 'COM3', baudrate: 9600, slave_id: 1 });
    const dbConfig = ref([]);
    const dbAoConfig = ref([]);
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
          enabled: dbCh.enabled !== undefined ? dbCh.enabled : 1,
        };
      });
    });

    // Mezcla datos en vivo + config AO BD
    const mergedAoChannels = computed(() => {
      const dbByVar = {};
      dbAoConfig.value.forEach(c => { dbByVar[c.v_name] = c; });

      const sortedDbConfig = [...dbAoConfig.value].sort((a, b) => a.channel_addr - b.channel_addr);
      
      const fixedVars = sortedDbConfig.length > 0 
        ? sortedDbConfig.map(c => c.v_name)
        : [
            'r_Local_2_O_Ch0Data',
            'r_Local_2_O_Ch1Data'
          ];

      return fixedVars.map((varName, index) => {
        const dbCh = dbByVar[varName] || {};
        const liveCh = (live.ao_channels || []).find(ch => ch.var === varName) || {};

        return {
          var: varName,
          channel_addr: dbCh.channel_addr !== undefined ? dbCh.channel_addr : index,
          desc: dbCh.description || liveCh.desc || '',
          modbus_addr: dbCh.modbus_addr !== undefined ? dbCh.modbus_addr : (liveCh.ch !== undefined ? liveCh.ch : index),
          scale_min: dbCh.scale_min !== undefined ? dbCh.scale_min : 4000,
          scale_max: dbCh.scale_max !== undefined ? dbCh.scale_max : 20000,
          enabled: dbCh.enabled !== undefined ? dbCh.enabled : 1,
          val_eu: liveCh.val_eu,
          val_raw: liveCh.val_raw
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
        live.ao_channels = d.ao_channels || live.ao_channels;
        live.ts = d.ts;
        live.last_error = d.last_error || '';
        live.retry_in_s = d.retry_in_s ?? 0;
        live.stale = d.stale ?? false;
        live.data_age_s = d.data_age_s ?? 0;
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

    async function loadDbAoConfig() {
      try {
        const d = await (await fetch('/api/daq/ao_config')).json();
        dbAoConfig.value = d;
      } catch (e) { }
    }

    async function loadConnConfig() {
      try {
        const d = await (await fetch('/api/daq/connection')).json();
        connForm.port = d.port || 'COM3';
        connForm.baudrate = d.baudrate || 9600;
        connForm.slave_id = d.slave_id || 1;
        _connFormDirty = false;
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

    async function forceReconnect() {
      reconnecting.value = true;
      try {
        await fetch('/api/daq/connection', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(connForm),
        });
        showToast('🔄 Forzando reconexión...');
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

    function startEditAo(ch) {
      editingCh.value = ch.var;
      editForms[ch.var] = {
        description: ch.desc || '',
        modbus_addr: ch.modbus_addr,
        scale_min: ch.scale_min || 4000,
        scale_max: ch.scale_max || 20000,
      };
    }

    async function saveAoCh(ch) {
      const f = editForms[ch.var];
      try {
        const r = await fetch('/api/daq/ao_config', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel_addr: ch.channel_addr,
            v_name: ch.var,
            description: f.description,
            scale_min: f.scale_min,
            scale_max: f.scale_max,
            modbus_addr: f.modbus_addr,
          }),
        });
        if (r.ok) {
          showToast(`✅ ${ch.var} guardado`);
          editingCh.value = null;
          await loadDbAoConfig();
        } else showToast('❌ Error al guardar', false);
      } catch (e) { showToast('❌ Error de red', false); }
    }

    const fmt = v => v !== null && v !== undefined ? parseFloat(v).toFixed(3) : '—';

    function maPercent(ma) {
      if (ma === null || ma === undefined) return 0;
      return Math.min(100, Math.max(0, ((ma - 4) / 16) * 100));
    }

    function maColor(ma) {
      if (ma === null || ma === undefined) return '#6b7280';
      const pct = maPercent(ma);
      if (pct < 5) return '#e55353';
      if (pct > 95) return '#e55353';
      return '#27a766';
    }

    let liveTimer;
    onMounted(() => {
      loadLive();
      loadDbConfig();
      loadDbAoConfig();
      loadConnConfig();
      liveTimer = setInterval(loadLive, 1000);
    });
    onUnmounted(() => { clearInterval(liveTimer); });

    return {
      live, connForm, mergedChannels, mergedAoChannels, editingCh, editForms, toast,
      reconnecting, loadLive, forceReconnect, saveConnection,
      startEdit, saveCh, startEditAo, saveAoCh, fmt, maPercent, maColor, rebooting, rebootDaq
    };
  }
};

const ModbusRtuConfigPage = {
  name: 'ModbusRtuConfigPage',
  template: `
  <div class="p-4 flex flex-col gap-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-text-primary tracking-wide">📡 Configuración Modbus</h1>
        <p class="text-xs text-text-secondary mt-0.5">Administra dispositivos Modbus RTU — comandos, registros y variables con interpretación configurable</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button @click="addDevice" class="px-3 py-1.5 bg-accent-blue hover:brightness-110 text-white text-xs font-bold rounded transition-all">➕ Nuevo Dispositivo</button>
        <button @click="loadAll"  class="px-3 py-1.5 bg-gray-700 hover:brightness-110 text-white text-xs font-bold rounded transition-all">↻ Actualizar</button>
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="bg-bg-card border rounded-xl p-3 flex flex-col gap-1" :style="{borderColor: statusSummary.any_connected ? '#27a766' : '#e55353'}">
        <div class="flex items-center gap-2">
          <span class="relative flex h-5 w-5 items-center justify-center flex-shrink-0">
            <span v-if="statusSummary.any_connected" class="animate-ping absolute inline-flex h-3 w-3 rounded-full opacity-50" style="background:#27a766"></span>
            <span class="relative inline-flex rounded-full h-3 w-3" :style="{background: statusSummary.any_connected ? '#27a766' : '#e55353'}"></span>
          </span>
          <span class="text-sm font-bold text-text-primary">{{ statusSummary.any_connected ? '✅ Al menos 1 conectado' : '🔴 Sin conexiones activas' }}</span>
        </div>
        <div class="text-xs text-text-secondary pl-7">{{ statusSummary.connected }}/{{ statusSummary.total }} dispositivos activos</div>
      </div>
      <div class="bg-bg-card border border-border rounded-xl p-3 flex flex-col gap-1">
        <div class="text-xs text-text-secondary">Dispositivos configurados</div>
        <div class="text-xl font-mono font-bold text-accent-yellow">{{ devices.length }}</div>
      </div>
      <div class="bg-bg-card border border-border rounded-xl p-3 flex flex-col gap-1">
        <div class="text-xs text-text-secondary">Última actualización</div>
        <div class="text-sm font-mono font-bold text-text-primary">{{ lastUpdate || '--:--:--' }}</div>
      </div>
    </div>
    <div v-if="devices.length === 0" class="bg-bg-card border border-border rounded-xl p-8 text-center">
      <div class="text-4xl mb-3">📡</div>
      <div class="text-text-primary font-bold mb-1">No hay dispositivos configurados</div>
      <div class="text-text-secondary text-xs mb-4">Haz clic en "Nuevo Dispositivo" para agregar tu primer dispositivo Modbus RTU</div>
      <button @click="addDevice" class="px-4 py-2 bg-accent-blue hover:brightness-110 text-white text-xs font-bold rounded">➕ Agregar dispositivo</button>
    </div>
    <div v-for="(dev, idx) in devices" :key="dev.id || idx" class="bg-bg-card border rounded-xl overflow-hidden" :style="{borderColor: devStatus(dev).connected ? '#27a766' : '#374151'}">
      <div class="flex items-center gap-3 px-4 py-3 border-b border-border cursor-pointer" @click="dev._open = !dev._open">
        <span class="relative flex h-5 w-5 items-center justify-center flex-shrink-0">
          <span v-if="devStatus(dev).connected" class="animate-ping absolute inline-flex h-3 w-3 rounded-full opacity-50" style="background:#27a766"></span>
          <span class="relative inline-flex rounded-full h-3 w-3" :style="{background: devStatus(dev).connected ? '#27a766' : (devStatus(dev).error ? '#e55353' : '#6b7280')}"></span>
        </span>
        <div class="flex-1 min-w-0">
          <span class="text-sm font-bold text-text-primary">{{ dev.name || 'Dispositivo ' + (idx+1) }}</span>
          <span class="ml-2 text-xs text-text-secondary font-mono">{{ dev.port }} @ {{ dev.baudrate }} baud</span>
          <span v-if="devStatus(dev).connected" class="ml-2 text-xs text-green-400">✅ Conectado</span>
          <span v-else-if="devStatus(dev).error" class="ml-2 text-xs text-red-400 truncate">⚠ {{ devStatus(dev).error }}</span>
          <span v-else class="ml-2 text-xs text-gray-400">⏸ Inactivo</span>
          <span class="ml-3 text-xs text-text-secondary bg-bg-primary px-1.5 py-0.5 rounded font-mono">{{ (commands[dev.id] || []).length }} cmd{{ (commands[dev.id] || []).length !== 1 ? 's' : '' }}</span>
        </div>
        <div class="flex gap-1 flex-shrink-0" @click.stop>
          <button @click="scanDevice(dev)" :disabled="dev._scanning" class="px-2 py-0.5 text-xs bg-purple-700 hover:brightness-110 disabled:opacity-50 text-white rounded" title="Escanear combinaciones de baudrate, paridad y slave ID">{{ dev._scanning ? '🔍 Buscando...' : '🔍 Auto-detectar' }}</button>
          <button @click="testDevice(dev)" :disabled="dev._testing" class="px-2 py-0.5 text-xs bg-accent-blue hover:brightness-110 disabled:opacity-50 text-white rounded">{{ dev._testing ? '⏳' : '🔌 Probar' }}</button>
          <button @click="saveDevice(dev)" class="px-2 py-0.5 text-xs bg-accent-green hover:brightness-110 text-white rounded">💾</button>
          <button @click="removeDevice(dev, idx)" class="px-2 py-0.5 text-xs bg-accent-red hover:brightness-110 text-white rounded">🗑</button>
        </div>
        <span class="text-text-secondary text-sm ml-1">{{ dev._open ? '▲' : '▼' }}</span>
      </div>
      <div v-if="dev._open" class="flex flex-col gap-4 p-4">
        <div class="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-xs text-text-secondary font-semibold">Nombre</label>
            <input v-model="dev.name" placeholder="Ej: Caudalimetro A" class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-text-secondary font-semibold">Puerto COM</label>
            <input v-model="dev.port" placeholder="COM3" class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-text-secondary font-semibold">Baudrate</label>
            <select v-model.number="dev.baudrate" class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue">
              <option>1200</option><option>2400</option><option>4800</option>
              <option>9600</option><option>19200</option><option>38400</option>
              <option>57600</option><option>115200</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-text-secondary font-semibold">Paridad</label>
            <select v-model="dev.parity" class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue">
              <option value="N">Ninguna (N)</option>
              <option value="E">Par (Even - E)</option>
              <option value="O">Impar (Odd - O)</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-text-secondary font-semibold">Stop Bits</label>
            <select v-model.number="dev.stopbits" class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue">
              <option :value="1">1</option>
              <option :value="2">2</option>
            </select>
          </div>
        </div>
        <div class="flex gap-4 text-xs text-text-secondary">
          <span>⚙ Paridad: {{ dev.parity || 'N' }}</span><span>⚙ Bits: 8</span><span>⚙ Stop: {{ dev.stopbits || 1 }}</span><span>⚙ Protocolo: Modbus RTU</span>
        </div>
        <div class="bg-bg-primary rounded-lg p-3 text-xs flex flex-wrap gap-4">
          <div><span class="text-text-secondary">Estado: </span><span :class="devStatus(dev).connected ? 'text-green-400' : 'text-red-400'" class="font-bold">{{ devStatus(dev).connected ? 'Conectado' : 'Desconectado' }}</span></div>
          <div><span class="text-text-secondary">Último check: </span><span class="font-mono text-text-primary">{{ devStatus(dev).last_check || '--' }}</span></div>
          <div v-if="devStatus(dev).latency_ms"><span class="text-text-secondary">Latencia: </span><span class="font-mono text-accent-green">{{ devStatus(dev).latency_ms }} ms</span></div>
          <div v-if="devStatus(dev).error" class="text-red-400">⚠ {{ devStatus(dev).error }}</div>
        </div>
        <div class="flex justify-between items-center">
          <button @click="scanDevice(dev)" :disabled="dev._scanning" class="px-3 py-1.5 bg-purple-700 hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold rounded flex items-center gap-1.5">
            <span>{{ dev._scanning ? '⏳ Escaneando puerto...' : '🔍 Auto-detectar Instrumento' }}</span>
          </button>
          <button @click="saveDevice(dev)" class="px-4 py-1.5 bg-accent-green hover:brightness-110 text-white text-xs font-bold rounded">💾 Guardar Dispositivo</button>
        </div>
        <div class="border border-border rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2.5 bg-bg-primary border-b border-border">
            <span class="text-sm font-bold text-text-primary">📋 Comandos Modbus</span>
            <button @click="addCmd(dev)" :disabled="!dev.id" :title="dev.id ? '' : 'Guarda el dispositivo primero'" class="px-3 py-1 bg-accent-blue hover:brightness-110 disabled:opacity-40 text-white text-xs font-bold rounded transition-all">➕ Agregar Comando</button>
          </div>
          <div v-if="!(commands[dev.id] || []).length" class="p-6 text-center text-xs text-text-secondary">No hay comandos. Haz clic en "Agregar Comando" para comenzar.</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-bg-primary border-b border-border text-text-secondary">
                  <th class="px-2 py-2 text-center w-6">#</th>
                  <th class="px-2 py-2 text-center w-12">Estado</th>
                  <th class="px-2 py-2 text-center w-12">Habilitado</th>
                  <th class="px-2 py-2 text-left">Nombre / Int. Addr.</th>
                  <th class="px-2 py-2 text-center w-20">Node Addr</th>
                  <th class="px-2 py-2 text-center w-28">FC</th>
                  <th class="px-2 py-2 text-center w-20">MB Addr</th>
                  <th class="px-2 py-2 text-center w-20">Reg Count</th>
                  <th class="px-2 py-2 text-center w-16"># Vars</th>
                  <th class="px-2 py-2 text-center w-28">Swap Code</th>
                  <th class="px-2 py-2 text-left">Valores actuales</th>
                  <th class="px-2 py-2 text-center w-24">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(cmd, ci) in (commands[dev.id] || [])" :key="cmd.id || ci">
                  <tr class="border-b border-border hover:bg-text-primary/5 transition-colors" :class="{'opacity-50': !cmd.enabled, 'bg-accent-blue/5': isEditingCmd(dev.id, ci)}">
                    <td class="px-2 py-1.5 text-center text-text-secondary font-mono">{{ ci + 1 }}</td>
                    <td class="px-2 py-1.5 text-center">
                      <span class="relative flex h-4 w-4 items-center justify-center mx-auto">
                        <span v-if="cmdLive(cmd.id).connected" class="animate-ping absolute inline-flex h-3 w-3 rounded-full opacity-40" style="background:#27a766"></span>
                        <span class="relative inline-flex rounded-full h-3 w-3" :style="{background: cmdLive(cmd.id).connected ? '#27a766' : (cmdLive(cmd.id).error ? '#e55353' : '#6b7280')}"></span>
                      </span>
                      <div class="text-center text-[9px] mt-0.5" :class="cmdLive(cmd.id).connected ? 'text-green-400' : 'text-gray-500'">{{ cmdLive(cmd.id).connected ? 'OK' : (cmdLive(cmd.id).error ? 'ERR' : '---') }}</div>
                    </td>
                    <td class="px-2 py-1.5 text-center"><span :class="cmd.enabled ? 'bg-green-900/60 text-green-300' : 'bg-gray-800 text-gray-500'" class="px-1.5 py-0.5 rounded text-[10px] font-bold">{{ cmd.enabled ? 'ON' : 'OFF' }}</span></td>
                    <td class="px-2 py-1.5">
                      <div class="font-medium text-text-primary">{{ cmd.cmd_name || '—' }}</div>
                      <div class="text-[10px] text-text-secondary font-mono">{{ cmd.internal_address || '' }}</div>
                    </td>
                    <td class="px-2 py-1.5 text-center font-mono text-accent-yellow">{{ cmd.node_address }}</td>
                    <td class="px-2 py-1.5 text-center"><span class="bg-bg-primary px-1.5 py-0.5 rounded text-[10px] font-mono text-accent-blue">{{ fcShort(cmd.modbus_function) }}</span></td>
                    <td class="px-2 py-1.5 text-center font-mono">{{ cmd.mb_address }}</td>
                    <td class="px-2 py-1.5 text-center font-mono">{{ cmd.reg_count }}</td>
                    <td class="px-2 py-1.5 text-center font-mono text-accent-yellow">{{ cmd.num_variables }}</td>
                    <td class="px-2 py-1.5 text-center"><span class="bg-bg-primary px-1.5 py-0.5 rounded text-[10px] font-mono">{{ swapShort(cmd.swap_code) }}</span></td>
                    <td class="px-2 py-1.5">
                      <div v-if="getCmdVarVal(cmd, 0) !== null" class="flex flex-wrap gap-1">
                        <span v-for="(_, vi) in (cmd.num_variables || 1)" :key="vi" class="bg-bg-primary border border-border px-1.5 py-0.5 rounded text-[10px] font-mono text-accent-green">
                          {{ varLabel(cmd, vi) }}: {{ getCmdVarVal(cmd, vi) !== null ? Number(getCmdVarVal(cmd, vi)).toFixed(4) : '—' }}
                        </span>
                      </div>
                      <span v-else-if="cmdLive(cmd.id).error" class="text-red-400 text-[10px]" :title="cmdLive(cmd.id).error">⚠ {{ cmdLive(cmd.id).error }}</span>
                      <span v-else class="text-text-secondary text-[10px]">Sin datos — esperando lectura</span>
                    </td>
                    <td class="px-2 py-1.5 text-center">
                      <div class="flex gap-1 justify-center">
                        <button @click="startEditCmd(dev, ci)" class="px-1.5 py-0.5 text-[10px] bg-accent-blue hover:brightness-110 text-white rounded">✏️</button>
                        <button @click="pollCmd(dev, cmd)" :disabled="cmd._polling" class="px-1.5 py-0.5 text-[10px] bg-gray-600 hover:brightness-110 disabled:opacity-50 text-white rounded">{{ cmd._polling ? '⏳' : '🔌' }}</button>
                        <button @click="deleteCmd(dev, cmd, ci)" class="px-1.5 py-0.5 text-[10px] bg-accent-red hover:brightness-110 text-white rounded">🗑</button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="isEditingCmd(dev.id, ci)" :key="'edit-' + (cmd.id || ci)">
                    <td colspan="12" class="p-0 border-b border-border">
                      <div class="bg-bg-primary p-4 flex flex-col gap-4">
                        <div class="text-xs font-bold text-text-primary mb-1">⚙️ Editar Comando {{ ci+1 }}</div>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div class="flex flex-col gap-1">
                            <label class="text-[10px] text-text-secondary uppercase tracking-wide">Nombre del Comando</label>
                            <input v-model="editForm.cmd_name" placeholder="Ej: Caudal Liquido" class="bg-bg-card border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue" />
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[10px] text-text-secondary uppercase tracking-wide">Internal Address (var BD)</label>
                            <input v-model="editForm.internal_address" placeholder="Ej: r_caudal_liq" class="bg-bg-card border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[10px] text-text-secondary uppercase tracking-wide">Enable</label>
                            <select v-model="editForm.enabled" class="bg-bg-card border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue">
                              <option :value="true">Habilitado (Continuous)</option>
                              <option :value="false">Deshabilitado</option>
                            </select>
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[10px] text-text-secondary uppercase tracking-wide">Poll Interval</label>
                            <input v-model.number="editForm.poll_interval" type="number" min="1" max="999" class="bg-bg-card border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
                          </div>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div class="flex flex-col gap-1">
                            <label class="text-[10px] text-text-secondary uppercase tracking-wide">Node Address (Slave ID)</label>
                            <input v-model.number="editForm.node_address" type="number" min="1" max="247" class="bg-bg-card border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
                            <span class="text-[9px] text-text-secondary">Dirección Modbus del instrumento</span>
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[10px] text-text-secondary uppercase tracking-wide">Modbus Function</label>
                            <select v-model="editForm.modbus_function" class="bg-bg-card border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue">
                              <option v-for="fc in MB_FUNCTIONS" :key="fc" :value="fc">{{ fc }}</option>
                            </select>
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[10px] text-text-secondary uppercase tracking-wide">MB Address in Device</label>
                            <input v-model.number="editForm.mb_address" type="number" min="0" class="bg-bg-card border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
                            <span class="text-[9px] text-text-secondary">Registro inicial a consultar</span>
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[10px] text-text-secondary uppercase tracking-wide">Reg Count</label>
                            <input v-model.number="editForm.reg_count" type="number" min="1" max="125" class="bg-bg-card border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
                            <span class="text-[9px] text-text-secondary">Total de registros a leer</span>
                          </div>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div class="flex flex-col gap-1 sm:col-span-2">
                            <label class="text-[10px] text-text-secondary uppercase tracking-wide">Swap Code — Formato de bytes del instrumento</label>
                            <select v-model="editForm.swap_code" class="bg-bg-card border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue">
                              <option v-for="sc in SWAP_CODES" :key="sc.val" :value="sc.val">{{ sc.label }}</option>
                            </select>
                            <div class="bg-bg-card border border-border rounded p-2 text-[10px] text-text-secondary leading-relaxed">
                              <span v-if="editForm.swap_code === 'No Change'"><b class="text-accent-yellow">ABCD</b> — Big-endian estándar.</span>
                              <span v-else-if="editForm.swap_code === 'Word Swap'"><b class="text-accent-yellow">CDAB</b> — LSW primero.</span>
                              <span v-else-if="editForm.swap_code === 'Word and Byte Swap'"><b class="text-accent-yellow">DCBA</b> — Little-endian completo.</span>
                              <span v-else-if="editForm.swap_code === 'Byte Swap'"><b class="text-accent-yellow">BADC</b> — Swap de bytes internos.</span>
                            </div>
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[10px] text-text-secondary uppercase tracking-wide"># Variables a obtener</label>
                            <input v-model.number="editForm.num_variables" type="number" min="1" max="64" @change="syncVarForms" class="bg-bg-card border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
                            <span class="text-[9px] text-text-secondary">{{ editForm.reg_count }} regs / {{ editForm.num_variables }} vars = <b class="text-accent-yellow">{{ Math.floor(editForm.reg_count / editForm.num_variables) }} regs/var</b></span>
                          </div>
                          <div class="flex flex-col gap-1 justify-end">
                            <div class="bg-bg-card border border-border rounded p-2 text-[10px] text-text-secondary"><b>Poll Interval:</b> {{ editForm.poll_interval }}<br><b>Paridad:</b> N, 8 bits, 1 stop</div>
                          </div>
                        </div>
                        <div class="border border-border rounded-lg overflow-hidden">
                          <div class="bg-bg-card px-3 py-2 text-xs font-bold text-text-primary border-b border-border">📊 Variables producidas por este comando</div>
                          <table class="w-full text-xs">
                            <thead>
                              <tr class="bg-bg-primary border-b border-border text-text-secondary">
                                <th class="px-3 py-1.5 text-center w-10">Var #</th>
                                <th class="px-3 py-1.5 text-left">Nombre (var_name en BD)</th>
                                <th class="px-3 py-1.5 text-left">Etiqueta (descripción)</th>
                                <th class="px-3 py-1.5 text-center w-24">Valor actual</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(vf, vi) in editForm.variables" :key="vi" class="border-b border-border">
                                <td class="px-3 py-1.5 text-center font-mono text-accent-yellow">{{ vi + 1 }}</td>
                                <td class="px-3 py-1.5"><input v-model="vf.var_name" placeholder="r_mi_variable" class="bg-bg-card border border-border text-text-primary text-xs rounded px-2 py-1 w-full outline-none focus:border-accent-blue font-mono" /></td>
                                <td class="px-3 py-1.5"><input v-model="vf.var_label" placeholder="Descripción de la variable" class="bg-bg-card border border-border text-text-primary text-xs rounded px-2 py-1 w-full outline-none focus:border-accent-blue" /></td>
                                <td class="px-3 py-1.5 text-center font-mono">
                                  <span :class="getCmdVarVal(cmd, vi) !== null ? 'text-accent-green font-bold' : 'text-text-secondary'">
                                    {{ getCmdVarVal(cmd, vi) !== null ? Number(getCmdVarVal(cmd, vi)).toFixed(4) : '—' }}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div class="flex gap-2 justify-end">
                          <button @click="cancelEditCmd" class="px-3 py-1.5 bg-gray-700 hover:brightness-110 text-white text-xs font-bold rounded">✕ Cancelar</button>
                          <button @click="saveCmd(dev)" class="px-4 py-1.5 bg-accent-green hover:brightness-110 text-white text-xs font-bold rounded">💾 Guardar Comando</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <transition name="fade">
      <div v-if="toast.show" class="fixed bottom-6 right-6 px-4 py-2 rounded-lg text-sm font-bold shadow-xl z-50" :class="toast.ok ? 'bg-accent-green text-white' : 'bg-accent-red text-white'">{{ toast.msg }}</div>
    </transition>
  </div>`,
  setup() {
    const { ref, reactive, computed, onMounted, onUnmounted } = Vue;
    const devices   = ref([]);
    const commands  = reactive({});
    const statuses  = ref({});
    const liveVals  = ref({});
    const lastUpdate = ref('');
    const toast = reactive({ show: false, ok: true, msg: '' });
    const editingCmd = ref(null);
    const editForm   = reactive({
      cmd_name: '', enabled: true, internal_address: '', poll_interval: 1,
      reg_count: 2, swap_code: 'No Change', node_address: 1,
      modbus_function: 'FC 3 - Read Holding Registers (4X)',
      mb_address: 0, num_variables: 1, variables: []
    });

    const SWAP_CODES = [
      { val: 'No Change',          label: 'No Change — ABCD (Big-Endian, MSW first)' },
      { val: 'Word Swap',          label: 'Word Swap — CDAB (LSW first)' },
      { val: 'Word and Byte Swap', label: 'Word and Byte Swap — DCBA (Little-Endian)' },
      { val: 'Byte Swap',          label: 'Byte Swap — BADC (Byte swap in-word)' },
    ];
    const MB_FUNCTIONS = [
      'FC 1 - Read Coil (0X)', 'FC 2 - Read Input (1x)', 'FC 3 - Read Holding Registers (4X)',
      'FC 4 - Read Input Registers (3X)', 'FC 5 - Force (Write) Single Coil (0X)',
      'FC 6 - Preset (Write) Single Register', 'FC 15 - Force (Write) Multiple Coil (0X)',
      'FC 16 - Preset (Write) Multiple Registers',
    ];

    function showToast(msg, ok = true) {
      toast.msg = msg; toast.ok = ok; toast.show = true;
      setTimeout(() => { toast.show = false; }, 2800);
    }

    const statusSummary = computed(() => {
      const vals = Object.values(statuses.value);
      const connected = vals.filter(s => s.connected).length;
      return { total: devices.value.length, connected, any_connected: connected > 0 };
    });

    function devStatus(dev) { return statuses.value[dev.id] || { connected: false, error: '', last_check: '--', latency_ms: null }; }
    function cmdLive(cmdId) { return liveVals.value[cmdId] || { connected: false, error: '', values: [], ts: '--' }; }
    function fcShort(fc) { if (!fc) return '—'; const m = fc.match(/FC\s*(\d+)/i); return m ? 'FC' + m[1] : fc.substring(0, 6); }
    function swapShort(sc) { if (!sc || sc === 'No Change') return 'ABCD'; if (sc === 'Word Swap') return 'CDAB'; if (sc === 'Word and Byte Swap') return 'DCBA'; if (sc === 'Byte Swap') return 'BADC'; return sc.substring(0, 8); }
    function varLabel(cmd, vi) { return (cmd.variables && cmd.variables[vi]) ? (cmd.variables[vi].var_label || cmd.variables[vi].var_name || `V${vi+1}`) : `V${vi+1}`; }
    function isEditingCmd(devId, ci) { return editingCmd.value && editingCmd.value.devId === devId && editingCmd.value.cmdIdx === ci; }

    function getCmdVarVal(cmd, vi) {
      if (!cmd) return null;
      const live = cmdLive(cmd.id);
      if (live && live.values && live.values[vi] !== undefined && live.values[vi] !== null) {
        return live.values[vi];
      }
      if (cmd.variables && cmd.variables[vi] && cmd.variables[vi].current_val !== undefined && cmd.variables[vi].current_val !== null) {
        return cmd.variables[vi].current_val;
      }
      return null;
    }

    function syncVarForms() {
      const n = Math.max(1, editForm.num_variables);
      while (editForm.variables.length < n) {
        const i = editForm.variables.length;
        editForm.variables.push({ var_index: i, var_name: '', var_label: `Variable ${i+1}` });
      }
      while (editForm.variables.length > n) editForm.variables.pop();
    }

    async function loadAll() {
      try {
        const res  = await fetch('/api/modbus_rtu/devices');
        const data = await res.json();
        const prevState = {};
        devices.value.forEach(d => { prevState[d.id] = { _open: d._open }; });
        devices.value = (data || []).map(d => ({ ...d, _open: prevState[d.id]?._open ?? false, _testing: false }));
        lastUpdate.value = new Date().toLocaleTimeString();
        await loadStatuses();
        for (const dev of devices.value) { if (dev.id) await loadCommands(dev.id); }
        await loadLiveVals();
      } catch (e) { console.error('Error cargando dispositivos Modbus:', e); }
    }

    async function loadStatuses() { try { const d = await (await fetch('/api/modbus_rtu/status')).json(); statuses.value = d || {}; } catch (e) {} }
    async function loadCommands(devId) { if (!devId) return; try { const res = await fetch(`/api/modbus_rtu/devices/${devId}/commands`); const data = await res.json(); commands[devId] = (data || []).map(c => ({ ...c, _polling: false })); } catch (e) {} }
    async function loadLiveVals() { try { const d = await (await fetch('/api/modbus_rtu/live_values')).json(); liveVals.value = d || {}; } catch (e) {} }

    function addDevice() { devices.value.push({ id: null, name: 'Nuevo Dispositivo', port: 'COM4', baudrate: 9600, slave_id: 1, parity: 'N', stopbits: 1, enabled: true, _open: true, _testing: false }); }

    async function saveDevice(dev) {
      try {
        const res = await fetch('/api/modbus_rtu/devices', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: dev.id, name: dev.name, port: dev.port, baudrate: dev.baudrate,
            slave_id: dev.slave_id, parity: dev.parity || 'N', stopbits: dev.stopbits || 1,
            enabled: dev.enabled !== false
          })
        });
        const data = await res.json();
        if (res.ok && data.ok) { dev.id = data.id; showToast(`✅ "${dev.name}" guardado`); await loadAll(); } else showToast('❌ Error al guardar', false);
      } catch (e) { showToast('❌ Error de red', false); }
    }

    async function removeDevice(dev, idx) {
      if (!confirm(`¿Eliminar "${dev.name || 'Dispositivo ' + (idx+1)}"?`)) return;
      if (dev.id) { try { await fetch(`/api/modbus_rtu/devices/${dev.id}`, { method: 'DELETE' }); } catch (e) {} }
      devices.value.splice(idx, 1);
      if (dev.id) delete commands[dev.id];
      showToast('🗑 Dispositivo eliminado');
    }

    async function testDevice(dev) {
      dev._testing = true;
      try {
        const res = await fetch('/api/modbus_rtu/test', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            port: dev.port, baudrate: dev.baudrate, parity: dev.parity || 'N',
            stopbits: dev.stopbits || 1, slave_id: dev.slave_id, id: dev.id
          })
        });
        const data = await res.json();
        if (data.connected) { showToast(`✅ Conexión exitosa`); if (dev.id) statuses.value[dev.id] = { ...data, last_check: new Date().toLocaleTimeString() }; } else showToast('❌ ' + (data.error || 'Sin respuesta'), false);
      } catch (e) { showToast('❌ Error de red', false); } finally { dev._testing = false; }
    }

    async function addCmd(dev) {
      if (!dev.id) { showToast('⚠ Guarda el dispositivo primero', false); return; }
      if (!commands[dev.id]) commands[dev.id] = [];
      const newCmd = { id: null, device_id: dev.id, cmd_name: 'Nuevo Comando', enabled: true, internal_address: '', poll_interval: 1, reg_count: 2, swap_code: 'No Change', node_address: dev.slave_id || 1, modbus_function: 'FC 3 - Read Holding Registers (4X)', mb_address: 0, num_variables: 1, variables: [], _polling: false };
      commands[dev.id].push(newCmd);
      startEditCmd(dev, commands[dev.id].length - 1);
    }

    function startEditCmd(dev, ci) {
      const cmd = (commands[dev.id] || [])[ci];
      if (!cmd) return;
      editingCmd.value = { devId: dev.id, cmdIdx: ci, cmdId: cmd.id };
      editForm.cmd_name = cmd.cmd_name || ''; editForm.enabled = cmd.enabled !== false; editForm.internal_address = cmd.internal_address || ''; editForm.poll_interval = cmd.poll_interval ?? 1; editForm.reg_count = cmd.reg_count ?? 2; editForm.swap_code = cmd.swap_code || 'No Change'; editForm.node_address = cmd.node_address ?? 1; editForm.modbus_function = cmd.modbus_function || 'FC 3 - Read Holding Registers (4X)'; editForm.mb_address = cmd.mb_address ?? 0; editForm.num_variables = cmd.num_variables ?? 1;
      const existing = (cmd.variables || []).slice();
      editForm.variables = [];
      for (let i = 0; i < editForm.num_variables; i++) { editForm.variables.push({ var_index: i, var_name: existing[i]?.var_name || '', var_label: existing[i]?.var_label || `Variable ${i+1}` }); }
    }

    function cancelEditCmd() { if (editingCmd.value) { const { devId, cmdIdx } = editingCmd.value; const cmd = (commands[devId] || [])[cmdIdx]; if (cmd && !cmd.id) commands[devId].splice(cmdIdx, 1); } editingCmd.value = null; }

    async function saveCmd(dev) {
      if (!editingCmd.value) return;
      const { devId, cmdIdx } = editingCmd.value;
      const cmd = (commands[devId] || [])[cmdIdx];
      Object.assign(cmd, { cmd_name: editForm.cmd_name, enabled: editForm.enabled, internal_address: editForm.internal_address, poll_interval: editForm.poll_interval, reg_count: editForm.reg_count, swap_code: editForm.swap_code, node_address: editForm.node_address, modbus_function: editForm.modbus_function, mb_address: editForm.mb_address, num_variables: editForm.num_variables });
      try {
        const res = await fetch('/api/modbus_rtu/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cmd, device_id: devId }) });
        const data = await res.json();
        if (res.ok && data.ok) {
          cmd.id = data.id;
          if (editingCmd.value) editingCmd.value.cmdId = data.id;
          const varsPayload = editForm.variables.map((v, i) => ({
            var_index: i, var_name: v.var_name, var_label: v.var_label
          }));
          await fetch(`/api/modbus_rtu/commands/${data.id}/variables`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(varsPayload)
          });
          showToast(`✅ Comando "${cmd.cmd_name}" guardado`);
          editingCmd.value = null;
          await loadCommands(devId);
        } else {
          showToast('❌ Error al guardar comando: ' + (data.error || ''), false);
        }
      } catch (e) {
        showToast('❌ Error de red', false);
      }
    }

    async function deleteCmd(dev, cmd, ci) {
      if (!confirm(`¿Eliminar comando "${cmd.cmd_name || (ci+1)}"?`)) return;
      if (cmd.id) {
        try { await fetch(`/api/modbus_rtu/commands/${cmd.id}`, { method: 'DELETE' }); } catch (e) {}
      }
      (commands[dev.id] || []).splice(ci, 1);
      if (editingCmd.value && editingCmd.value.devId === dev.id && editingCmd.value.cmdIdx === ci) {
        editingCmd.value = null;
      }
      showToast('🗑 Comando eliminado');
    }

    async function pollCmd(dev, cmd) {
      if (!cmd.id) { showToast('⚠ Guarda el comando primero', false); return; }
      cmd._polling = true;
      try {
        const res = await fetch(`/api/modbus_rtu/commands/${cmd.id}/poll`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device: {
              port: dev.port, baudrate: dev.baudrate,
              parity: dev.parity || 'N', stopbits: dev.stopbits || 1
            },
            cmd
          })
        });
        const data = await res.json();
        liveVals.value[cmd.id] = { connected: data.connected, error: data.error, values: data.values, ts: data.ts };
        if (data.connected) {
          showToast(`✅ Lectura OK — ${data.values?.length ?? 0} valores (${data.latency_ms} ms)`);
        } else {
          showToast('❌ ' + (data.error || 'Sin respuesta del instrumento'), false);
        }
      } catch (e) {
        showToast('❌ Error de red', false);
      } finally {
        cmd._polling = false;
      }
    }

    async function scanDevice(dev) {
      dev._scanning = true;
      try {
        const res = await fetch('/api/modbus_rtu/scan', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ port: dev.port, slave_start: 1, slave_end: 16 })
        });
        const data = await res.json();
        if (data.ok && data.found && data.found.length > 0) {
          const f = data.found[0];
          dev.baudrate = f.baudrate;
          dev.parity   = f.parity;
          dev.stopbits = f.stopbits;
          dev.slave_id = f.slave_id;
          showToast(`🎯 ¡Detectado! Slave ${f.slave_id} @ ${f.baudrate} ${f.parity}-8-${f.stopbits}`);
          await saveDevice(dev);
        } else {
          showToast('❌ No se detectó ningún instrumento respondiendo en ' + dev.port, false);
        }
      } catch (e) {
        showToast('❌ Error durante el escaneo: ' + e.message, false);
      } finally {
        dev._scanning = false;
      }
    }

    let pollTimer;
    onMounted(() => {
      loadAll();
      pollTimer = setInterval(async () => {
        await loadStatuses();
        await loadLiveVals();
      }, 3000);
    });
    onUnmounted(() => clearInterval(pollTimer));

    return {
      devices, commands, statuses, liveVals, statusSummary, lastUpdate, toast,
      editingCmd, editForm, SWAP_CODES, MB_FUNCTIONS,
      devStatus, cmdLive, fcShort, swapShort, varLabel, isEditingCmd, syncVarForms, getCmdVarVal,
      loadAll, addDevice, saveDevice, removeDevice, testDevice, scanDevice,
      addCmd, startEditCmd, cancelEditCmd, saveCmd, deleteCmd, pollCmd
    };
  }
};

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
        <h1 class="text-xl font-bold text-text-primary tracking-wide">⚡ Configuración Modbus HART</h1>
        <p class="text-xs text-text-secondary mt-0.5">Tags fijos por slot. Edita la descripción y el HART Device asignado a cada instrumento.</p>
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

    <!-- Estado de conexión + parámetros RTU/TCP -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- Card estado -->
      <div class="bg-bg-card border rounded-xl p-4 flex flex-col gap-3"
           :style="{borderColor: liveState.connected ? '#27a766' : '#e55353'}">
        <div class="flex items-center gap-3">
          <!-- Indicador pulsante -->
          <span class="relative flex h-6 w-6 items-center justify-center flex-shrink-0">
            <span v-if="liveState.connected"
                  class="animate-ping absolute inline-flex h-4 w-4 rounded-full opacity-50"
                  style="background:#27a766"></span>
            <span class="relative inline-flex rounded-full h-4 w-4"
                  :style="{background: liveState.connected ? '#27a766' : '#e55353'}"></span>
          </span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-bold text-text-primary">
              {{ liveState.connected ? '✅ Gateway HART Conectado' : liveState.stale ? '🟡 Sin Datos (Stale)' : '🔴 Gateway HART Desconectado' }}
            </div>
            <div class="text-xs text-text-secondary">
              Última lectura: {{ liveState.ts || '--' }}
              <span v-if="liveState.data_age_s > 1" class="ml-2" :class="liveState.stale ? 'text-yellow-400' : 'text-text-secondary'">
                (hace {{ liveState.data_age_s }} s)
              </span>
            </div>
            <!-- Mensaje de error -->
            <div v-if="!liveState.connected && liveState.last_error"
                 class="text-xs text-red-400 mt-0.5 truncate" :title="liveState.last_error">
              ⚠ {{ liveState.last_error }}
            </div>
            <!-- Contador de reintento -->
            <div v-if="!liveState.connected && liveState.retry_in_s > 0"
                 class="text-xs text-yellow-400 mt-0.5">
              🔁 Reintentando en {{ liveState.retry_in_s }} s
            </div>
            <div v-if="!liveState.connected && liveState.retry_in_s === 0"
                 class="text-xs text-blue-400 mt-0.5 animate-pulse">
              ⏳ Intentando conectar...
            </div>
          </div>
        </div>
        <div class="grid gap-2 text-center grid-cols-2">
          <template v-if="liveState.mode === 'tcp'">
            <div class="bg-bg-primary rounded-lg p-2">
              <div class="text-xs text-text-secondary">IP</div>
              <div class="text-sm font-mono font-bold text-accent-yellow">{{ liveState.ip || '--' }}</div>
            </div>
            <div class="bg-bg-primary rounded-lg p-2">
              <div class="text-xs text-text-secondary">Puerto</div>
              <div class="text-sm font-mono font-bold text-accent-yellow">{{ liveState.port || '--' }}</div>
            </div>
          </template>
          <template v-else>
            <div class="bg-bg-primary rounded-lg p-2">
              <div class="text-xs text-text-secondary">COM</div>
              <div class="text-sm font-mono font-bold text-accent-yellow">{{ liveState.com_port || '--' }}</div>
            </div>
            <div class="bg-bg-primary rounded-lg p-2">
              <div class="text-xs text-text-secondary">Baudrate</div>
              <div class="text-sm font-mono font-bold text-accent-yellow">{{ liveState.baudrate || '--' }}</div>
            </div>
          </template>
        </div>
      </div>

      <!-- Card edición de conexión -->
      <div class="bg-bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <div class="text-sm font-bold text-text-primary mb-1">⚙️ Parámetros de Conexión Gateway</div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-text-secondary">Modo de Comunicación</label>
          <select v-model="connForm.mode"
                  class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue">
            <option value="tcp">Modbus TCP/IP (Ethernet) - Por defecto</option>
            
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <template v-if="connForm.mode === 'tcp'">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-text-secondary">Dirección IP</label>
              <input v-model="connForm.ip" placeholder="192.168.255.1"
                     class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-text-secondary">Puerto TCP</label>
              <input v-model.number="connForm.port" type="number"
                     class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
            </div>
          </template>
          <template v-if="connForm.mode === 'rtu'">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-text-secondary">Puerto COM</label>
              <input v-model="connForm.com_port" placeholder="COM3"
                     class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue font-mono" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-text-secondary">Baudrate</label>
              <select v-model.number="connForm.baudrate"
                      class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1.5 outline-none focus:border-accent-blue">
                <option>1200</option><option>2400</option><option>4800</option>
                <option>9600</option><option>19200</option><option>38400</option>
                <option>57600</option><option>115200</option>
              </select>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Tabla de Instrumentos HART -->
    <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-border flex items-center justify-between">
        <span class="text-sm font-bold text-text-primary">📥 Instrumentos HART (Mapeo por Slot)</span>
        <span class="text-xs text-text-secondary font-mono">Actualización: cada 5 s</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border bg-bg-primary">
              <th class="px-3 py-2 text-left text-text-secondary font-semibold w-8">N°</th>
              <th class="px-3 py-2 text-left text-text-secondary font-semibold w-36">Tag / Rol</th>
              <th class="px-3 py-2 text-left text-text-secondary font-semibold">Descripción</th>
              <th class="px-3 py-2 text-center text-text-secondary font-semibold w-32">HART Device</th>
              <th class="px-3 py-2 text-center text-text-secondary font-semibold w-20">Estado</th>
              <th class="px-3 py-2 text-right text-text-secondary font-semibold w-28">
                PV1 <span class="text-text-secondary font-normal"></span>
              </th>
              <th class="px-3 py-2 text-right text-text-secondary font-semibold w-28">
                PV2 <span class="text-text-secondary font-normal"></span>
              </th>
              <th class="px-3 py-2 text-right text-text-secondary font-semibold w-28">
                PV3 <span class="text-text-secondary font-normal"></span>
              </th>
              <th class="px-3 py-2 text-right text-text-secondary font-semibold w-28">
                PV4 <span class="text-text-secondary font-normal"></span>
              </th>
              <th class="px-3 py-2 text-center text-text-secondary font-semibold w-16">Editar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ch in mergedHartChannels" :key="ch.channel_idx"
                class="border-b border-border hover:bg-text-primary/5 transition-colors"
                :class="!ch.enabled ? 'opacity-40' : ''">

              <!-- N° -->
              <td class="px-3 py-2 text-text-secondary font-mono text-center">{{ ch.channel_idx + 1 }}</td>

              <!-- Tag/Rol FIJO -->
              <td class="px-3 py-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide"
                      :class="ROLES[ch.instrument_type]?.badgeCls || 'bg-gray-700 text-text-secondary'">
                  {{ ROLES[ch.instrument_type]?.label || 'Sin asignar' }}
                </span>
              </td>

              <!-- Descripción: editable o sólo lectura -->
              <td class="px-3 py-2">
                <input v-if="editingCh === ch.channel_idx"
                       v-model="editForms[ch.channel_idx].description"
                       class="bg-bg-primary border border-border text-text-primary text-xs rounded px-2 py-1 w-full outline-none focus:border-accent-blue" />
                <span v-else class="text-text-primary font-medium">{{ ch.desc || '—' }}</span>
              </td>

              <!-- HART Device: editable o sólo lectura -->
              <td class="px-3 py-2 text-center">
                <div v-if="editingCh === ch.channel_idx" class="flex flex-col gap-1.5 items-center">
                  <select v-model.number="editForms[ch.channel_idx].hart_device_index"
                          class="bg-bg-primary border border-accent-yellow/60 text-text-primary text-xs rounded px-1.5 py-1 outline-none focus:border-accent-yellow font-mono">
                    <option v-for="n in Array.from({length: 15}, (_, i) => i)" :key="n" :value="n">
                      HART Device {{ n }}
                    </option>
                  </select>
                  <label class="inline-flex items-center gap-1 text-[10px] text-text-secondary cursor-pointer">
                    <input type="checkbox" v-model="editForms[ch.channel_idx].enabled" />
                    Habilitado
                  </label>
                </div>
                <div v-else class="flex flex-col items-center gap-0.5 leading-tight">
                  <span class="font-mono font-bold text-accent-yellow text-xs">HART Device {{ ch.hart_device_index }}</span>
                  <span class="text-[9px] text-text-secondary font-mono">reg {{ 1300 + ch.hart_device_index * 10 }}</span>
                </div>
              </td>

              <!-- Estado -->
              <td class="px-3 py-2 text-center">
                <span v-if="!ch.enabled"
                      class="px-2 py-0.5 text-xs font-bold rounded bg-gray-800 text-text-secondary">DESC.</span>
                <span v-else-if="ch.connected"
                      class="px-2 py-0.5 text-xs font-bold rounded bg-green-900/60 text-green-300">CONECTADO</span>
                <span v-else
                      class="px-2 py-0.5 text-xs font-bold rounded bg-red-900/60 text-red-300">ERROR</span>
              </td>

              <!-- PV1 -->
              <td class="px-3 py-2 text-right font-mono">
                <div class="text-text-primary">{{ fmtValue(ch.pv1) }}</div>
                <div class="text-[9px] text-text-secondary">{{ ROLES[ch.instrument_type]?.pv1lbl || 'EU' }}</div>
              </td>
              <!-- PV2 -->
              <td class="px-3 py-2 text-right font-mono">
                <div class="text-text-primary">{{ fmtValue(ch.pv2) }}</div>
                <div class="text-[9px] text-text-secondary">{{ ROLES[ch.instrument_type]?.pv2lbl || 'EU' }}</div>
              </td>
              <!-- PV3 -->
              <td class="px-3 py-2 text-right font-mono">
                <div class="text-text-primary">{{ fmtValue(ch.pv3) }}</div>
                <div class="text-[9px] text-text-secondary">{{ ROLES[ch.instrument_type]?.pv3lbl || 'EU' }}</div>
              </td>
              <!-- PV4 -->
              <td class="px-3 py-2 text-right font-mono">
                <div class="text-text-primary">{{ fmtValue(ch.pv4) }}</div>
                <div class="text-[9px] text-text-secondary">{{ ROLES[ch.instrument_type]?.pv4lbl || 'EU' }}</div>
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
                          class="px-2 py-0.5 text-xs bg-gray-600 hover:brightness-110 text-text-primary rounded">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Leyenda de roles -->
    <div class="bg-bg-card border border-border rounded-xl p-4">
      <div class="text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">Leyenda de Roles — Variables inyectadas</div>
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
        <div v-for="(r, key) in ROLES" :key="key" class="flex flex-col gap-0.5 bg-bg-primary rounded-lg p-2 border border-border">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold mb-1 w-fit" :class="r.badgeCls">{{ r.label }}</span>
          <div class="text-[10px] text-text-secondary">PV1: <span class="text-text-secondary">{{ r.pv1lbl }}</span></div>
          <div class="text-[10px] text-text-secondary">PV2: <span class="text-text-secondary">{{ r.pv2lbl }}</span></div>
          <div class="text-[10px] text-text-secondary">PV3: <span class="text-text-secondary">{{ r.pv3lbl }}</span></div>
          <div class="text-[10px] text-text-secondary">PV4: <span class="text-text-secondary">{{ r.pv4lbl }}</span></div>
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
    const liveState = ref({ connected: false, stale: false, last_error: '', ts: '', retry_in_s: 0, ip: '', port: '', mode: 'tcp', com_port: '', baudrate: 9600, data_age_s: 0 });
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
        badgeCls: 'bg-gray-700 text-text-secondary',
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
        liveChannels.value = d.channels || [];
        liveState.value = { 
          connected: d.connected, stale: d.stale, last_error: d.last_error, 
          ts: d.ts, retry_in_s: d.retry_in_s, ip: d.ip, port: d.port, 
          mode: d.mode, com_port: d.com_port, baudrate: d.baudrate, data_age_s: d.data_age_s 
        };
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
      liveChannels, liveState, connForm, dbConfig, editingCh, editForms, toast,
      loadLive, saveConnection, startEdit, saveCh, mergedHartChannels,
      fmtValue, rebooting, rebootGateway, ROLES
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
        <h1 class="text-xl font-bold text-text-primary tracking-wide"> Datos de Calibración</h1>
        <p class="text-xs text-text-secondary mt-0.5">Parámetros físicos de los medidores — Los campos con fondo oscuro son solo lectura (calculados por el PLC)</p>
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
        <div class="calib-panel-header"> Wedge Gas</div>
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
        <div class="calib-panel-header"> Calibración Wedge Crudo</div>
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
        <div class="calib-panel-header"> Calibración Laminar</div>
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

    </div>

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

    async function cargar(incluirEditables = true) {
      try {
        const r = await fetch('/api/calibracion');
        const d = await r.json();
        // Llenar editables si se solicita (ej: en carga inicial o post-guardado)
        if (incluirEditables) {
          for (const k of Object.keys(form)) if (k in d) form[k] = d[k];
        }
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
        if (r.ok) {
          emit('toast', '✅ Calibración guardada en el SoftPLC');
          cargar(true); // Sincronizar editables tras guardar con éxito
        }
        else emit('toast', '❌ Error al guardar', 'error');
      } catch (e) { emit('toast', '❌ Error de red', 'error'); }
    }

    let timer;
    onMounted(() => { cargar(true); timer = setInterval(() => cargar(false), 2000); });
    onUnmounted(() => clearInterval(timer));

    return { form, data, fmtC, guardarTodo };
  }
};


// ═══════════════════════════════════════════════════════════════
// CONFIG INSTRUMENT 2 PAGE (Selección de Instrumentos)
// ═══════════════════════════════════════════════════════════════
const ConfigInstrument2Page = {
  name: 'ConfigInstrument2Page',
  props: ['instrumentSelection'],
  emits: ['toast'],
  template: `
  <div class="p-4 overflow-y-auto h-full">
    <div class="prof-panel-container">
      <h2 class="prof-panel-title">Selección de Instrumentos</h2>
      
      <div class="prof-grid">
        
        <!-- Control PID Gas -->
        <div class="prof-card">
          <div class="prof-card-header">
            <div class="prof-card-title">Control PID Gas</div>
            <span class="prof-badge" :class="instrumentSelection.b_Control_PID_Gas ? 'prof-badge-teal' : 'prof-badge-primary'">
              {{ instrumentSelection.b_Control_PID_Gas ? 'NIVEL' : 'PRESIÓN' }}
            </span>
          </div>
          <div class="prof-btn-group">
            <button @click="setSelection('b_Control_PID_Gas', false)" 
                    :class="['prof-btn', instrumentSelection.b_Control_PID_Gas ? 'inactive' : 'active active-primary']">
              PRESIÓN
            </button>
            <button @click="setSelection('b_Control_PID_Gas', true)" 
                    :class="['prof-btn', !instrumentSelection.b_Control_PID_Gas ? 'inactive' : 'active active-teal']">
              NIVEL
            </button>
          </div>
        </div>

        <!-- Selector de Nivel -->
        <div class="prof-card">
          <div class="prof-card-header">
            <div class="prof-card-title">Selector de Nivel</div>
            <span class="prof-badge" :class="instrumentSelection.b_PID_POSIC_SW ? 'prof-badge-secondary' : 'prof-badge-blue'">
              {{ instrumentSelection.b_PID_POSIC_SW ? 'LIT-01-Aux' : 'LIT-01' }}
            </span>
          </div>
          <div class="prof-btn-group">
            <button @click="setSelection('b_PID_POSIC_SW', false)" 
                    :class="['prof-btn', instrumentSelection.b_PID_POSIC_SW ? 'inactive' : 'active active-blue']">
              LIT-01
            </button>
            <button @click="setSelection('b_PID_POSIC_SW', true)" 
                    :class="['prof-btn', !instrumentSelection.b_PID_POSIC_SW ? 'inactive' : 'active active-secondary']">
              LIT-01-Aux
            </button>
          </div>
        </div>

        <!-- Instrumento Medidor de Gas -->
        <div class="prof-card" :class="{'prof-card-wide': instrumentSelection.b_Sw_Wedge_Gas}">
          <div class="prof-card-header">
            <div class="prof-card-title">💨 Instrumento Medidor de Gas</div>
            <span class="prof-badge" :class="instrumentSelection.b_Sw_Wedge_Gas ? 'prof-badge-teal' : 'prof-badge-purple'">
              {{ instrumentSelection.b_Sw_Wedge_Gas ? (instrumentSelection.b_Sw_Wedge_Gas_2 ? 'GAS MV' : 'GAS DP') : 'VORTEX' }}
            </span>
          </div>
          <div class="prof-btn-group">
            <button @click="setMedidorGas('VORTEX')" 
                    :class="['prof-btn', instrumentSelection.b_Sw_Wedge_Gas ? 'inactive' : 'active active-purple']">
              VORTEX
            </button>
            <button @click="setMedidorGas('GAS')" 
                    :class="['prof-btn', !instrumentSelection.b_Sw_Wedge_Gas ? 'inactive' : 'active active-teal']">
              GAS (DP/MV)
            </button>
          </div>

          <transition name="inst-fade">
            <div v-if="instrumentSelection.b_Sw_Wedge_Gas" class="prof-submenu">
              <div class="prof-submenu-label">► Seleccionar Tipo de Gas:</div>
              <div class="prof-btn-group">
                <button @click="setTipoGas('DP')"
                        :class="['prof-btn', instrumentSelection.b_Sw_Wedge_Gas_2 ? 'inactive' : 'active active-green']">
                  GAS DP
                </button>
                <button @click="setTipoGas('MV')"
                        :class="['prof-btn', !instrumentSelection.b_Sw_Wedge_Gas_2 ? 'inactive' : 'active active-orange']">
                  GAS MV
                </button>
              </div>
            </div>
          </transition>
        </div>

        <!-- Flujo de Diluente -->
        <div class="prof-card">
          <div class="prof-card-header">
            <div class="prof-card-title">💧 Flujo de Diluente</div>
            <span class="prof-badge" :class="instrumentSelection.b_SW_DIL_MEDIDO_CALC ? 'prof-badge-teal' : 'prof-badge-purple'">
              {{ instrumentSelection.b_SW_DIL_MEDIDO_CALC ? 'INSTRUMENTO' : 'MANUAL' }}
            </span>
          </div>
          <div class="prof-btn-group">
            <button @click="setDiluente('MANUAL')" 
                    :class="['prof-btn', instrumentSelection.b_SW_DIL_MEDIDO_CALC ? 'inactive' : 'active active-purple']">
              MANUAL
            </button>
            <button @click="setDiluente('INSTRUM')" 
                    :class="['prof-btn', !instrumentSelection.b_SW_DIL_MEDIDO_CALC ? 'inactive' : 'active active-teal']">
              INSTRUMENTO
            </button>
          </div>
        </div>

        <!-- Selector cuña de gas -->
        <div class="prof-card" :class="{'prof-card-wide': !instrumentSelection.b_AUTO_GAS_01}">
          <div class="prof-card-header">
            <div class="prof-card-title">🎛️ Selector cuña de gas</div>
            <span class="prof-badge" :class="instrumentSelection.b_AUTO_GAS_01 ? 'prof-badge-green' : 'prof-badge-purple'">
              {{ instrumentSelection.b_AUTO_GAS_01 ? 'AUTOMÁTICO' : (instrumentSelection.b_SEL_VLV_GAS_01 ? 'MANUAL (ALTA)' : 'MANUAL (BAJA)') }}
            </span>
          </div>
          <div class="prof-btn-group">
            <button @click="setCunaGas('MANUAL')" 
                    :class="['prof-btn', instrumentSelection.b_AUTO_GAS_01 ? 'inactive' : 'active active-purple']">
              MANUAL
            </button>
            <button @click="setCunaGas('AUTO')" 
                    :class="['prof-btn', !instrumentSelection.b_AUTO_GAS_01 ? 'inactive' : 'active active-green']">
              AUTOMÁTICO
            </button>
          </div>

          <transition name="inst-fade">
            <div v-if="!instrumentSelection.b_AUTO_GAS_01" class="prof-submenu">
              <div class="prof-submenu-label">► Selección de Válvula Manual:</div>
              <div class="prof-btn-group">
                <button @click="setVlvGas('BAJA')"
                        :class="['prof-btn', instrumentSelection.b_SEL_VLV_GAS_01 ? 'inactive' : 'active active-orange']">
                  BAJA
                </button>
                <button @click="setVlvGas('ALTA')"
                        :class="['prof-btn', !instrumentSelection.b_SEL_VLV_GAS_01 ? 'inactive' : 'active active-teal']">
                  ALTA
                </button>
              </div>
            </div>
          </transition>
        </div>

        <!-- Método de Medición de Líquido -->
        <div class="prof-card prof-card-wide">
          <div class="prof-card-header">
            <div class="prof-card-title"> Método de Medición de Líquido</div>
            <span class="prof-badge" :class="modoLiquidoBadgeClass.replace('badge-', 'prof-badge-')">{{ modoLiquidoLabel }}</span>
          </div>

          <!-- Nivel 1: Automatico / Manual -->
          <div class="prof-btn-group">
            <!-- AUTOMATICO: b_sw_AM_Laminar_Wedge_x = true -->
            <button @click="setModoLiquido('AUTOMATICO')"
                    :class="['prof-btn', !instrumentSelection.b_sw_AM_Laminar_Wedge_x ? 'inactive' : 'active active-green']">
              ⚡ AUTOMÁTICO
            </button>
            <!-- MANUAL: b_sw_AM_Laminar_Wedge_x = false -->
            <button @click="setModoLiquido('MANUAL')"
                    :class="['prof-btn', instrumentSelection.b_sw_AM_Laminar_Wedge_x ? 'inactive' : 'active active-blue']">
              🔧 MANUAL
            </button>
          </div>

          <!-- Nivel 2: Sub-selección (solo visible en MANUAL) -->
          <transition name="inst-fade">
            <div v-if="!instrumentSelection.b_sw_AM_Laminar_Wedge_x" class="prof-submenu mt-4">
              <div class="prof-submenu-label">► Seleccionar Método Manual:</div>
              <div class="prof-btn-group">
                <!-- LAMINAR: b_sw_AM_Laminar_Wedge_y = false -->
                <button @click="setModoManual('LAMINAR')"
                        :class="['prof-btn', instrumentSelection.b_sw_AM_Laminar_Wedge_y ? 'inactive' : 'active active-purple']">
                  🌀 LAMINAR
                </button>
                <!-- WEDGE: b_sw_AM_Laminar_Wedge_y = true -->
                <button @click="setModoManual('WEDGE')"
                        :class="['prof-btn', !instrumentSelection.b_sw_AM_Laminar_Wedge_y ? 'inactive' : 'active active-teal']">
                  🔷 WEDGE
                </button>
              </div>

              <!-- Nivel 3: Sub-selección Transmisor Laminar -->
              <transition name="inst-fade">
                <div v-if="!instrumentSelection.b_sw_AM_Laminar_Wedge_y" class="mt-4 pt-4" style="border-top: 1px dashed rgba(255,255,255,0.1);">
                  <div class="prof-submenu-label">► Transmisor Laminar:</div>
                  <div class="prof-btn-group">
                    <!-- AUTO: b_SEL_T_baja = false -->
                    <button @click="setTransmisorLaminar('AUTO')"
                            :class="['prof-btn', instrumentSelection.b_SEL_T_baja ? 'inactive' : 'active active-green']">
                      ⚡ AUTOMÁTICO
                    </button>
                    <!-- BAJA: b_SEL_T_baja = true -->
                    <button @click="setTransmisorLaminar('BAJA')"
                            :class="['prof-btn', !instrumentSelection.b_SEL_T_baja ? 'inactive' : 'active active-orange']">
                      🔽 BAJA
                    </button>
                  </div>
                </div>
              </transition>
            </div>
          </transition>
        </div>

      </div>

      
    </div>
  </div>`,
  setup(props, { emit }) {
    async function updateSelection(payload) {
      // Merge with current state so we don't omit keys (backend defaults omitted keys to False)
      const fullPayload = { ...props.instrumentSelection, ...payload };
      try {
        const response = await fetch('/api/instrument_selection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullPayload)
        });
        if (response.ok) {
          emit('toast', '✅ Configuración de instrumento actualizada');
        } else {
          emit('toast', '❌ Error al actualizar configuración', 'error');
        }
      } catch (e) {
        emit('toast', '❌ Error de red al actualizar', 'error');
      }
    }

    function toggleSelection(key) {
      const currentVal = props.instrumentSelection[key];
      updateSelection({ [key]: !currentVal });
    }

    function setSelection(key, val) {
      updateSelection({ [key]: val });
    }

    function setModoLiquido(modo) {
      if (modo === 'AUTOMATICO') {
        // Automatico: x = true, limpiar seleccion manual
        updateSelection({
          b_sw_AM_Laminar_Wedge_x: true,
          b_sw_AM_Laminar_Wedge_y: false,
          b_SEL_T_baja: false,
          b_SEL_LAMINAR: false,
        });
      } else {
        // Manual: x = false, dejar sub-selección al usuario
        updateSelection({
          b_sw_AM_Laminar_Wedge_x: false,
          b_sw_AM_Laminar_Wedge_y: false,
          b_SEL_T_baja: false,
          b_SEL_LAMINAR: false,
        });
      }
    }

    function setModoManual(metodo) {
      if (metodo === 'LAMINAR') {
        // Laminar: y = false. Se resetea T_baja a false por defecto.
        updateSelection({
          b_sw_AM_Laminar_Wedge_x: false,
          b_sw_AM_Laminar_Wedge_y: false,
          b_SEL_T_baja: false,
          b_SEL_LAMINAR: true,
        });
      } else if (metodo === 'WEDGE') {
        // Wedge: y = true
        updateSelection({
          b_sw_AM_Laminar_Wedge_x: false,
          b_sw_AM_Laminar_Wedge_y: true,
          b_SEL_T_baja: false,
          b_SEL_LAMINAR: false,
        });
      }
    }

    function setTransmisorLaminar(transmisor) {
      if (transmisor === 'AUTO') {
        updateSelection({ b_SEL_T_baja: false });
      } else if (transmisor === 'BAJA') {
        updateSelection({ b_SEL_T_baja: true });
      }
    }

    function setMedidorGas(tipo) {
      if (tipo === 'VORTEX') {
        updateSelection({ b_Sw_Wedge_Gas: false, b_Sw_Wedge_Gas_2: false });
      } else {
        updateSelection({ b_Sw_Wedge_Gas: true });
      }
    }

    function setTipoGas(tipo) {
      if (tipo === 'DP') {
        updateSelection({ b_Sw_Wedge_Gas_2: false });
      } else {
        updateSelection({ b_Sw_Wedge_Gas_2: true });
      }
    }

    function setDiluente(tipo) {
      if (tipo === 'MANUAL') {
        updateSelection({ b_SW_DIL_MEDIDO_CALC: false });
      } else {
        updateSelection({ b_SW_DIL_MEDIDO_CALC: true });
      }
    }

    function setCunaGas(tipo) {
      if (tipo === 'MANUAL') {
        updateSelection({ b_AUTO_GAS_01: false, b_SEL_VLV_GAS_01: false });
      } else {
        updateSelection({ b_AUTO_GAS_01: true });
      }
    }

    function setVlvGas(tipo) {
      if (tipo === 'BAJA') {
        updateSelection({ b_SEL_VLV_GAS_01: false });
      } else {
        updateSelection({ b_SEL_VLV_GAS_01: true });
      }
    }

    // Computed helpers para el badge de estado del método
    const { computed } = Vue;
    const modoLiquidoLabel = computed(() => {
      const sel = props.instrumentSelection;
      if (sel.b_sw_AM_Laminar_Wedge_x) return 'AUTO';
      if (sel.b_sw_AM_Laminar_Wedge_y) return 'MANUAL → WEDGE';
      if (sel.b_SEL_T_baja) return 'MANUAL → LAMINAR (BAJA)';
      return 'MANUAL → LAMINAR (AUTO)';
    });
    const modoLiquidoBadgeClass = computed(() => {
      const sel = props.instrumentSelection;
      if (sel.b_sw_AM_Laminar_Wedge_x) return 'badge-green';
      if (sel.b_sw_AM_Laminar_Wedge_y) return 'badge-teal';
      if (sel.b_SEL_T_baja) return 'badge-orange';
      return 'badge-purple';
    });

    return { 
      toggleSelection, setSelection, setModoLiquido, setModoManual, setTransmisorLaminar, 
      setMedidorGas, setTipoGas, setDiluente, setCunaGas, setVlvGas,
      modoLiquidoLabel, modoLiquidoBadgeClass 
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// CONFIG INSTRUMENT 3 PAGE (Selección de Fórmulas)
// ═══════════════════════════════════════════════════════════════
const ConfigInstrument3Page = {
  name: 'ConfigInstrument3Page',
  emits: ['toast'],
  template: `
  <div class="p-4 overflow-y-auto h-full">
    <div class="prof-panel-container">
      <h2 class="prof-panel-title">Configuración Avanzada de Fórmulas</h2>
      
      <div class="prof-grid">
        
        <!-- Formula Viscosidad -->
        <div class="prof-card">
          <div class="prof-card-header">
            <div class="prof-card-title">Viscosidad del Crudo<br><span style="font-size: 11px; color: #9aa3af; font-family: 'Roboto Mono', monospace;">b_IHM_PB_miu</span></div>
            <span class="prof-badge" :class="formulas.b_IHM_PB_miu ? 'prof-badge-secondary' : 'prof-badge-primary'">
              {{ formulas.b_IHM_PB_miu ? 'Calculada' : 'Medida' }}
            </span>
          </div>
          <div class="prof-btn-group">
            <button @click="toggleFormula('b_IHM_PB_miu', 0)" 
                    :class="['prof-btn', formulas.b_IHM_PB_miu ? 'inactive' : 'active active-primary']">
              Fórmula 1 (Medida)
            </button>
            <button @click="toggleFormula('b_IHM_PB_miu', 1)" 
                    :class="['prof-btn', !formulas.b_IHM_PB_miu ? 'inactive' : 'active active-secondary']">
              Fórmula 2 (Calculada)
            </button>
          </div>
        </div>

        <!-- Formula Viscosidad Externa -->
        <div class="prof-card">
          <div class="prof-card-header">
            <div class="prof-card-title">Viscosidad Externa<br><span style="font-size: 11px; color: #9aa3af; font-family: 'Roboto Mono', monospace;">b_externa</span></div>
            <span class="prof-badge" :class="formulas.b_externa ? 'prof-badge-secondary' : 'prof-badge-purple'">
              {{ formulas.b_externa ? 'Exponencial' : 'Polinómica' }}
            </span>
          </div>
          <div class="prof-btn-group">
            <button @click="toggleFormula('b_externa', 0)" 
                    :class="['prof-btn', formulas.b_externa ? 'inactive' : 'active active-purple']">
              Fórmula 3 (Polinómica)
            </button>
            <button @click="toggleFormula('b_externa', 1)" 
                    :class="['prof-btn', !formulas.b_externa ? 'inactive' : 'active active-secondary']">
              Fórmula 4 (Exponencial)
            </button>
          </div>
        </div>

        <!-- Formula Reynolds / Transición -->
        <div class="prof-card">
          <div class="prof-card-header">
            <div class="prof-card-title">Reynolds y Factor C<br><span style="font-size: 11px; color: #9aa3af; font-family: 'Roboto Mono', monospace;">b_SEL_LAMINAR</span></div>
            <span class="prof-badge" :class="formulas.b_SEL_LAMINAR ? 'prof-badge-secondary' : 'prof-badge-primary'">
              {{ formulas.b_SEL_LAMINAR ? 'Manual' : 'Automático' }}
            </span>
          </div>
          <div class="prof-btn-group">
            <button @click="toggleFormula('b_SEL_LAMINAR', 0)" 
                    :class="['prof-btn', formulas.b_SEL_LAMINAR ? 'inactive' : 'active active-primary']">
              Fórmulas 5 y 6 (Auto)
            </button>
            <button @click="toggleFormula('b_SEL_LAMINAR', 1)" 
                    :class="['prof-btn', !formulas.b_SEL_LAMINAR ? 'inactive' : 'active active-secondary']">
              Fórmulas 7 y 8 (Manual)
            </button>
          </div>
        </div>

      </div>


    </div>
  </div>`,
  setup(props, { emit }) {
    const formulas = reactive({ b_IHM_PB_miu: 0, b_externa: 0, b_SEL_LAMINAR: 0 });

    async function cargar() {
      try {
        const r = await fetch('/api/formulas');
        const d = await r.json();
        Object.assign(formulas, d);
      } catch(e) {}
    }
    async function toggleFormula(key, val) {
      if (formulas[key] === val) return;
      formulas[key] = val;
      try {
        const r = await fetch('/api/formulas', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: val })
        });
        if (r.ok) { emit('toast', `✅ ${key} = ${val}`); cargar(); }
        else emit('toast', '❌ Error', 'error');
      } catch(e) { emit('toast', '❌ Red', 'error'); }
    }
    onMounted(() => cargar());
    return { formulas, toggleFormula };
  }
};

// ── Mount ────────────────────────────────────────────────────
const app = createApp(App);
app.component('proceso-page', ProcesoPage);
app.component('inicio-prueba-page', InicioPruebaPage);
app.component('historico-alarmas-page', HistoricoAlarmasPage);
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
app.component('modbus-rtu-config-page', ModbusRtuConfigPage);
app.component('config-instrument-2-page', ConfigInstrument2Page);
app.component('config-instrument-3-page', ConfigInstrument3Page);
app.mount('#app');

