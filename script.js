// script.js (módulo) - sincronización en tiempo real con Firebase + charts

// ---- IMPORTS FIREBASE (v11.x) ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getDatabase, ref, push, onValue, remove, update
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";

// ---- CONFIGURACIÓN FIREBASE (usa tu config) ----
const firebaseConfig = {
  apiKey: "AIzaSyBzxk8viz1uTuyw5kaKJKoHiwBIVp2Q8II",
  authDomain: "officinastock.firebaseapp.com",
  databaseURL: "https://officinastock-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "officinastock",
  storageBucket: "officinastock.firebasestorage.app",
  messagingSenderId: "616030382400",
  appId: "1:616030382400:web:24d9266f1f0fb75464f2a5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ---- REFERENCIAS ----
const matRef = ref(db, "materiales");
const filRef = ref(db, "filtros");
const notRef = ref(db, "notas");
// NUEVA REFERENCIA
const histRef = ref(db, "historial_usos"); 

// ---- UTILIDADES DOM / escape ----
function $(q){ return document.querySelector(q); }
function el(t){ return document.createElement(t); }
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

// Función de formato de fecha
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString(currentLang, {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ---- NAVEGACIÓN (definida globalmente porque HTML usa onclick inline) ----
window.navigate = function(page){
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  const elPage = document.getElementById(page);
  if(elPage) elPage.style.display = 'block';
  // update charts when showing dashboard
  if(page === 'dashboard'){
    updateChartMateriales(lastMatData);
    updateChartFiltros(lastFilData);
  }
};

// ---- LANGS (incluyendo USE y Historial) ----
const LANGS = {
  es: { 
    materials:"Materiales", filters:"Filtros", notas:"Notas", add:"Añadir", edit:"Editar", delete:"Eliminar", save:"Guardar", close:"Cerrar", use:"Usar",
    titles: {
      app: "GESTIÓN TALLER", dashboard: "Dashboard", refs: "Referencias", footer: "Almacenamiento: Firebase Realtime Database",
      chart_mat: "Gráfico Materiales", chart_fil: "Gráfico Filtros por categoría", hist:"Historial de Usos",
      ref: "Referencia", qty: "Cantidad", actions: "Acciones", brand: "Marca", model: "Modelo", category: "Categoría",
      add_mat: "Añadir", add_fil: "Añadir filtro", add_note: "Guardar nota", use_fil:"Usar Filtro",
      placeholder_ref: "Referencia", placeholder_qty: "Cantidad", placeholder_brand: "Marca", placeholder_model: "Modelo", placeholder_note: "Añadir nota",
      modal_edit: "Editar", page_mat: "Materiales (Página)", page_fil: "Filtros (Página)", page_not: "Notas",
      cat_aceite: "aceite", cat_aire: "aire", cat_habitaculos: "habitáculos", cat_combustible: "combustible",
      alert_empty_ref: "Referencia vacía", alert_full_fields: "Referencia y Marca requeridos", 
      alert_no_stock: "No hay stock disponible para esta referencia.", 
      alert_usage_fields: "Marca y Modelo del coche son requeridos.",
      prompt_car_brand: "Marca del Coche", prompt_car_model: "Modelo del Coche", prompt_used_ref: "Referencia Usada",
      hist_ref: "Ref. Usada", hist_car: "Vehículo", hist_time: "Fecha/Hora"
    }
  },
  en: { 
    materials:"Materials", filters:"Filters", notas:"Notes", add:"Add", edit:"Edit", delete:"Delete", save:"Save", close:"Close", use:"Use",
    titles: {
      app: "WORKSHOP MANAGEMENT", dashboard: "Dashboard", refs: "References", footer: "Storage: Firebase Realtime Database",
      chart_mat: "Materials Chart", chart_fil: "Filters by Category Chart", hist:"Usage History",
      ref: "Reference", qty: "Quantity", actions: "Actions", brand: "Brand", model: "Model", category: "Category",
      add_mat: "Add", add_fil: "Add Filter", add_note: "Save Note", use_fil:"Use Filter",
      placeholder_ref: "Reference", placeholder_qty: "Quantity", placeholder_brand: "Brand", placeholder_model: "Model", placeholder_note: "Add note",
      modal_edit: "Edit", page_mat: "Materials (Page)", page_fil: "Filters (Page)", page_not: "Notes",
      cat_aceite: "oil", cat_aire: "air", cat_habitaculos: "cabin", cat_combustible: "fuel",
      alert_empty_ref: "Empty reference", alert_full_fields: "Reference and Brand required", 
      alert_no_stock: "No stock available for this reference.", 
      alert_usage_fields: "Car Brand and Model are required.",
      prompt_car_brand: "Car Brand", prompt_car_model: "Car Model", prompt_used_ref: "Used Reference",
      hist_ref: "Used Ref.", hist_car: "Vehicle", hist_time: "Date/Time"
    }
  },
  it: { 
    materials:"Materiali", filters:"Filtri", notas:"Note", add:"Aggiungi", edit:"Modifica", delete:"Elimina", save:"Salva", close:"Chiudi", use:"Usa",
    titles: {
      app: "GESTIONE OFFICINA", dashboard: "Dashboard", refs: "Riferimenti", footer: "Archiviazione: Firebase Realtime Database",
      chart_mat: "Grafico Materiali", chart_fil: "Grafico Filtri per categoria", hist:"Cronologia Utilizzo",
      ref: "Riferimento", qty: "Quantità", actions: "Azioni", brand: "Marca", model: "Modello", category: "Categoria",
      add_mat: "Aggiungi", add_fil: "Aggiungi filtro", add_note: "Salva nota", use_fil:"Usa Filtro",
      placeholder_ref: "Riferimento", placeholder_qty: "Quantità", placeholder_brand: "Marca", placeholder_model: "Modello", placeholder_note: "Aggiungi nota",
      modal_edit: "Modifica", page_mat: "Materiali (Pagina)", page_fil: "Filtri (Pagina)", page_not: "Note",
      cat_aceite: "olio", cat_aire: "aria", cat_habitaculos: "abitacolo", cat_combustible: "carburante",
      alert_empty_ref: "Riferimento vuoto", alert_full_fields: "Riferimento e Marca richiesti",
      alert_no_stock: "Nessuna scorta disponibile per questo riferimento.",
      alert_usage_fields: "Marca e Modello dell'auto sono richiesti.",
      prompt_car_brand: "Marca dell'Auto", prompt_car_model: "Modello dell'Auto", prompt_used_ref: "Riferimento Usato",
      hist_ref: "Rif. Usato", hist_car: "Veicolo", hist_time: "Data/Ora"
    }
  }
};
const langSelector = $('#lang_selector');
let currentLang = localStorage.getItem('almacen_lang') || 'es'; // Variable global para el idioma actual

if(langSelector){
  Object.keys(LANGS).forEach(l => { const o = el('option'); o.value = l; o.textContent = l.toUpperCase(); langSelector.appendChild(o); });
  langSelector.value = currentLang;
  langSelector.onchange = applyLang;
}

// Función central para aplicar el idioma y re-renderizar
function applyLang(){
  currentLang = langSelector?.value || 'es';
  localStorage.setItem('almacen_lang', currentLang);

  const lang = LANGS[currentLang];
  const t = lang.titles;

  // 1. Traducción de Títulos y navegación fija
  $('#app_title').textContent = t.app;
  $('#page_title').textContent = t.app;
  $('#nav_dashboard').textContent = t.dashboard;
  $('#nav_materiales').textContent = lang.materials;
  $('#nav_filtros').textContent = lang.filters;
  $('#nav_notas').textContent = lang.notas;
  $('#side_ref_title').textContent = t.refs;
  $('#footer_text').textContent = t.footer;
  
  // 2. Traducción de Contenedores de Página (Dashboard)
  $('#mat_title').textContent = lang.materials;
  $('#chart_mat_title').textContent = t.chart_mat;
  $('#fil_title').textContent = lang.filters;
  $('#chart_fil_title').textContent = t.chart_fil;
  $('#not_page_title').textContent = lang.notas;
  $('#hist_title').textContent = t.hist; // NUEVA TRADUCCIÓN

  // 3. Traducción de Encabezados de Tablas (Theads)
  $('#th_mat_ref').textContent = t.ref;
  $('#th_mat_qty').textContent = t.qty;
  $('#th_mat_actions').textContent = t.actions;
  $('#th_fil_ref').textContent = t.ref;
  $('#th_fil_brand').textContent = t.brand;
  $('#th_fil_model').textContent = t.model;
  $('#th_fil_cat').textContent = t.category;
  $('#th_fil_qty').textContent = t.qty;
  $('#th_fil_actions').textContent = t.actions;

  // 4. Traducción de Placeholders y Botones de Añadir
  $('#mat_ref').placeholder = t.placeholder_ref;
  $('#mat_qty').placeholder = t.placeholder_qty;
  $('#fil_ref_input').placeholder = t.placeholder_ref;
  $('#fil_brand_input').placeholder = t.placeholder_brand;
  $('#fil_model_input').placeholder = t.placeholder_model;
  $('#nota_text').placeholder = t.placeholder_note;
  
  // NUEVAS TRADUCCIONES DEL MODAL DE USO
  $('#use_car_brand').placeholder = t.prompt_car_brand;
  $('#use_car_model').placeholder = t.prompt_car_model;
  $('#use_prompt_text').textContent = t.use_fil + ':';

  // 5. Traducción de Botones Principales (Añadir/Guardar)
  $('#mat_add').textContent = t.add_mat;
  $('#fil_add').textContent = t.add_fil;
  $('#nota_save').textContent = t.add_note;
  $('#modal_use_filter').textContent = lang.use; // NUEVO BOTÓN

  // 6. Traducción de Opciones de Filtro (Select Options)
  $('#opt_aceite').textContent = t.cat_aceite;
  $('#opt_aire').textContent = t.cat_aire;
  $('#opt_habitaculos').textContent = t.cat_habitaculos;
  $('#opt_combustible').textContent = t.cat_combustible;
  
  // 7. Traducción de Páginas Secundarias
  $('#page_mat_title').textContent = t.page_mat;
  $('#page_fil_title').textContent = t.page_fil;
  $('#page_not_title').textContent = t.page_not;

  // 8. Traducción de Modal
  $('#modal_title').textContent = t.modal_edit;
  $('#modal_save').textContent = lang.save;
  $('#modal_close').textContent = lang.close;
  
  // CRUCIAL: Volver a renderizar las tablas para que los botones de Edit/Delete/Use tengan el texto traducido.
  renderAll(); 
}

// Función para renderizar todo (útil al cambiar de idioma)
function renderAll(){
    renderMateriales(lastMatData);
    renderFiltros(lastFilData);
    renderNotas(lastNotData);
    renderHistorial(lastHistData);
}

// ---- DATA CACHE (ultimos dumps) ----
let lastMatData = {};
let lastFilData = {};
let lastNotData = {};
let lastHistData = {}; // NUEVA CACHE

// ---- RENDER: MATERIALES ----
function renderMateriales(data){
  lastMatData = data || {};
  const tbody = $('#mat_table tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  
  const lang = LANGS[currentLang]; 

  Object.entries(data || {}).forEach(([id, item]) => {
    const tr = el('tr');
    tr.innerHTML = `
      <td>${escapeHtml(item.ref)}</td>
      <td>${Number(item.qty) || 0}</td>
      <td>
        <button class="btn-edit" data-id="${id}" data-type="material">${lang.edit}</button>
        <button class="btn-delete" data-id="${id}" data-type="material">${lang.delete}</button>
      </td>`;
    tbody.appendChild(tr);
  });
  // ... (otros renders)
  updateChartMateriales(data);
}

// ---- RENDER: FILTROS ----
function renderFiltros(data){
  lastFilData = data || {};
  const tbody = $('#fil_table tbody');
  if(!tbody) return;
  tbody.innerHTML = '';

  const lang = LANGS[currentLang]; 
  const t = lang.titles; // Títulos traducidos

  // 1. Renderizar la tabla del DASHBOARD
  Object.entries(data || {}).forEach(([id, item])=>{
    const tr = el('tr');
    const translatedCategory = escapeHtml(LANGS[currentLang].titles['cat_' + item.categoria] || item.categoria);
    
    tr.innerHTML = `
      <td>${escapeHtml(item.ref)}</td>
      <td>${escapeHtml(item.brand)}</td>
      <td>${escapeHtml(item.model)}</td>
      <td>${translatedCategory}</td>
      <td>${Number(item.qty)||0}</td>
      <td>
        <button class="btn-use" data-id="${id}" data-ref="${escapeHtml(item.ref)}">${lang.use}</button>
        <button class="btn-edit" data-id="${id}" data-type="filtro">${lang.edit}</button>
        <button class="btn-delete" data-id="${id}" data-type="filtro">${lang.delete}</button>
      </td>`;
    tbody.appendChild(tr);
  });
  
  // 2. Renderizar la tabla de la página COMPLETA (filtros_full)
  const full = $('#filtros_full');
  if(full) {
    let html = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>${t.ref}</th>
              <th>${t.brand}</th>
              <th>${t.model}</th>
              <th>${t.category}</th>
              <th>${t.qty}</th>
            </tr>
          </thead>
          <tbody>
    `;

    Object.values(data || {}).forEach(item => {
      const translatedCategory = escapeHtml(LANGS[currentLang].titles['cat_' + item.categoria] || item.categoria);
      
      html += `
        <tr>
          <td>${escapeHtml(item.ref)}</td>
          <td>${escapeHtml(item.brand)}</td>
          <td>${escapeHtml(item.model)}</td>
          <td>${translatedCategory}</td>
          <td>${Number(item.qty)||0}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
    
    full.innerHTML = html;
  }
  
  updateChartFiltros(data);
}

// ---- RENDER: HISTORIAL DE USOS (NUEVO) ----
function renderHistorial(data){
    lastHistData = data || {};
    const div = $('#hist_list'); if(!div) return;
    div.innerHTML = '';
    
    // Creamos la tabla del historial
    const table = el('table');
    table.style.width = '100%';
    table.innerHTML = `
        <thead>
            <tr>
                <th>${LANGS[currentLang].titles.hist_ref}</th>
                <th>${LANGS[currentLang].titles.hist_car}</th>
                <th>${LANGS[currentLang].titles.hist_time}</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    // Mapeamos los datos, ordenados por fecha descendente
    const sortedData = Object.entries(data || {}).sort(([, a], [, b]) => b.ts - a.ts);

    sortedData.forEach(([id, item]) => {
        const tr = el('tr');
        tr.innerHTML = `
            <td>${escapeHtml(item.ref)}</td>
            <td>${escapeHtml(item.carBrand)} ${escapeHtml(item.carModel)}</td>
            <td>${formatDate(item.ts)}</td>
        `;
        tbody.appendChild(tr);
    });

    div.appendChild(table);
}

// ---- RENDER: NOTAS ----
function renderNotas(data){
  lastNotData = data || {};
  const div = $('#notas_list'); if(!div) return;
  div.innerHTML = '';
  Object.entries(data || {}).forEach(([id,n])=>{
    const d = el('div'); d.className = 'nota'; d.textContent = n.text; div.appendChild(d);
  });
}


// ---- LÓGICA DE USO DE FILTRO (NUEVO) ----

let currentFilterIdToUse = null; // Guarda el ID del filtro seleccionado

// 1. Muestra el modal de uso
window.useFilterModal = function(id, refText){
    const modal = $('#modal');
    const modalTitle = $('#modal_title');
    const modalEditBody = $('#modal_body');
    const modalUseForm = $('#modal_uso_form');
    const modalUseButton = $('#modal_use_filter');
    const modalSaveButton = $('#modal_save');
    const refSelect = $('#use_ref_select');

    currentFilterIdToUse = id;

    // Ocultar elementos de Edición y mostrar los de Uso
    modalEditBody.style.display = 'none';
    modalSaveButton.style.display = 'none';

    modalUseForm.style.display = 'block';
    modalUseButton.style.display = 'inline-block';

    modalTitle.textContent = LANGS[currentLang].titles.use_fil;
    
    // Limpiar y llenar el desplegable (Select)
    refSelect.innerHTML = '';
    const option = el('option');
    // Muestra la referencia del filtro clickeado, no un listado de todas las refs
    option.value = id;
    option.textContent = refText;
    refSelect.appendChild(option);
    refSelect.disabled = true; // No permitimos cambiar la ref en este modal simple

    // Limpiar campos de coche
    $('#use_car_brand').value = '';
    $('#use_car_model').value = '';

    modal.style.display = 'flex';
};

// 2. Ejecuta el uso del filtro, resta stock y guarda historial
window.useFilter = function(){
    const t = LANGS[currentLang].titles;
    const filterId = currentFilterIdToUse;
    const item = lastFilData[filterId];
    
    if(!item) {
        alert("Error: Filtro no encontrado.");
        return;
    }

    // Verificar Stock
    const currentQty = Number(item.qty) || 0;
    if (currentQty <= 0) {
        alert(t.alert_no_stock);
        return;
    }

    // Capturar datos del coche
    const carBrand = $('#use_car_brand').value.trim();
    const carModel = $('#use_car_model').value.trim();

    if (!carBrand || !carModel) {
        alert(t.alert_usage_fields);
        return;
    }

    // 1. ACTUALIZAR STOCK EN FILTROS (Restar 1)
    update(ref(db, 'filtros/' + filterId), { qty: currentQty - 1 });

    // 2. AÑADIR REGISTRO AL HISTORIAL
    push(histRef, {
        ref: item.ref,
        carBrand: carBrand,
        carModel: carModel,
        categoria: item.categoria,
        ts: Date.now() 
    });

    // 3. Cerrar Modal
    $('#modal').style.display = 'none';
    currentFilterIdToUse = null;
    alert(`Filtro ${item.ref} usado y registrado.`);
};

// ---- ELIMINAR y EDICIÓN (Añadido 'data-type' para delegación) ----

window.deleteMaterial = function(id){ remove(ref(db, 'materiales/' + id)); };
window.deleteFiltro = function(id){ remove(ref(db, 'filtros/' + id)); };

window.editMaterial = function(id){
    // (Lógica de edición simple con prompt, permanece igual)
    const t = LANGS[currentLang].titles;
    const item = lastMatData[id] || { ref: '', qty: 0 };
    const newRef = prompt(t.ref + ':', item.ref); 
    if(newRef === null) return;
    const newQty = prompt(t.qty + ':', item.qty || 0); 
    if(newQty === null) return;
    update(ref(db,'materiales/'+id), { ref: newRef, qty: parseInt(newQty)||0 });
};
window.editFiltro = function(id){
    // (Lógica de edición simple con prompt, permanece igual)
    const t = LANGS[currentLang].titles;
    const item = lastFilData[id] || { ref:'', brand:'', model:'', categoria:'aceite', qty:0 };
    const newRef = prompt(t.ref + ':', item.ref); if(newRef===null) return; 
    const newBrand = prompt(t.brand + ':', item.brand); if(newBrand===null) return; 
    const newModel = prompt(t.model + ':', item.model); if(newModel===null) return; 
    const catOptions = `${t.cat_aceite}/${t.cat_aire}/${t.cat_habitaculos}/${t.cat_combustible}`;
    const newCat = prompt(`${t.category} (${catOptions}):`, item.categoria); if(newCat===null) return; 
    const newQty = prompt(t.qty + ':', item.qty||0); if(newQty===null) return; 
    update(ref(db,'filtros/'+id), { ref:newRef, brand:newBrand, model:newModel, categoria:newCat, qty: parseInt(newQty)||0 });
};

// ---- EVENT DELEGATION para botones Edit / Delete / USE en tablas ----
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if(!btn) return;
  
  const idVal = btn.dataset.id;
  const refText = btn.dataset.ref;

  if (btn.classList.contains('btn-use') && idVal) {
      // Llamar al nuevo Modal de Uso
      return window.useFilterModal(idVal, refText);
  }

  if(btn.classList.contains('btn-delete') && idVal){
      if(btn.dataset.type === 'material') return deleteMaterial(idVal);
      if(btn.dataset.type === 'filtro') return deleteFiltro(idVal);
  }
  
  if(btn.classList.contains('btn-edit') && idVal){
      if(btn.dataset.type === 'material') return editMaterial(idVal);
      if(btn.dataset.type === 'filtro') return editFiltro(idVal);
  }
});


// ---- REALTIME LISTENERS ----
onValue(matRef, snapshot => {
  const data = snapshot.val() || {};
  Object.keys(data).forEach(k => { if(data[k] && data[k].qty!==undefined) data[k].qty = Number(data[k].qty); });
  renderMateriales(data);
});

onValue(filRef, snapshot => {
  const data = snapshot.val() || {};
  Object.keys(data).forEach(k => { if(data[k] && data[k].qty!==undefined) data[k].qty = Number(data[k].qty); });
  renderFiltros(data);
});

onValue(notRef, snapshot => {
  const data = snapshot.val() || {};
  renderNotas(data);
});

// NUEVO LISTENER para el historial
onValue(histRef, snapshot => {
    const data = snapshot.val() || {};
    renderHistorial(data);
});


// ---- CHARTS (Permanece igual) ----
let chartMat = null, chartFil = null;
function createCharts(){
  const ctxM = document.getElementById('chart_materiales')?.getContext('2d');
  const ctxF = document.getElementById('chart_filtros')?.getContext('2d');
  if(ctxM){
    chartMat = new Chart(ctxM, { type:'doughnut', data:{ labels:[], datasets:[{ data:[], backgroundColor:[] }] }, options:{ responsive:true, maintainAspectRatio:false } });
  }
  if(ctxF){
    const t = LANGS[currentLang].titles;
    const labels = [t.cat_aceite, t.cat_aire, t.cat_habitaculos, t.cat_combustible];
    chartFil = new Chart(ctxF, { type:'doughnut', data:{ labels:labels, datasets:[{ data:[0,0,0,0], backgroundColor:['#f28e2b','#4e79a7','#e15759','#59a14f'] }] }, options:{ responsive:true, maintainAspectRatio:false } });
  }
}

function updateChartMateriales(data){
  if(!chartMat) return;
  const labels = Object.values(data||{}).map(it => it.ref);
  const values = Object.values(data||{}).map(it => Number(it.qty)||0);
  chartMat.data.labels = labels;
  chartMat.data.datasets[0].data = values;
  chartMat.data.datasets[0].backgroundColor = labels.map((_,i)=>['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ac'][i%10]);
  chartMat.update();
}

function updateChartFiltros(data){
  if(!chartFil) return;
  const counts = { aceite:0, aire:0, habitaculos:0, combustible:0 };
  Object.values(data||{}).forEach(f => { if(f && f.categoria && counts[f.categoria]!==undefined) counts[f.categoria]++; });
  
  const t = LANGS[currentLang].titles;
  chartFil.data.labels = [t.cat_aceite, t.cat_aire, t.cat_habitaculos, t.cat_combustible];
  
  chartFil.data.datasets[0].data = [counts.aceite, counts.aire, counts.habitaculos, counts.combustible];
  chartFil.update();
}

// ---- INIT ----
window.onload = function(){
  navigate('dashboard');
  
  createCharts(); 

  // Conexión de botones de añadir
  const matAdd = document.getElementById('mat_add');
  if(matAdd) matAdd.onclick = window.addMaterial;
  const filAdd = document.getElementById('fil_add');
  if(filAdd) filAdd.onclick = window.addFiltro;
  const notaSave = document.getElementById('nota_save');
  if(notaSave) notaSave.onclick = window.addNota;
  
  // Conexión del botón de "Usar Filtro" del modal
  const modalUseFilterBtn = document.getElementById('modal_use_filter');
  if(modalUseFilterBtn) modalUseFilterBtn.onclick = window.useFilter;
  
  // Conexión del botón "Cerrar" del modal para limpiar el estado
  const modalCloseBtn = document.getElementById('modal_close');
  if(modalCloseBtn) modalCloseBtn.onclick = () => $('#modal').style.display = 'none';

  // Esto llama a renderAll() internamente y traduce TODO
  applyLang(); 
};
