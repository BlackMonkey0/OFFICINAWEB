// script.js - lógica de la app (frontend-only, usa localStorage)
let materiales = {};
let filtros = {};
let notas = {};

function $(q){ return document.querySelector(q); }
function el(t){ return document.createElement(t); }

function navigate(page){
  document.querySelectorAll('.page').forEach(p=>p.style.display='none');
  const elPage = document.getElementById(page);
  if(elPage) elPage.style.display='block';
}

// Idiomas: el selector se inicializa al final una vez definido `LANGS`
const langSelector = document.getElementById('lang_selector');

// localStorage keys
const KEY_MAT = 'almacen_materiales_v1';
const KEY_FIL = 'almacen_filtros_v1';
const KEY_NOTAS = 'almacen_notas_v1';

// Palette used for the materials chart (repeats if there are more labels than colors)
const MATERIAL_COLORS = [
  '#4e79a7', // blue
  '#f28e2b', // orange
  '#e15759', // red
  '#76b7b2', // teal
  '#59a14f', // green
  '#edc948', // yellow
  '#b07aa1', // purple
  '#ff9da7', // pink
  '#9c755f', // brown
  '#bab0ac'  // gray
];

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

function loadAll(){
  try{
    materiales = JSON.parse(localStorage.getItem(KEY_MAT) || '{}');
    filtros = JSON.parse(localStorage.getItem(KEY_FIL) || '{}');
    notas = JSON.parse(localStorage.getItem(KEY_NOTAS) || '{}');
  }catch(e){ console.error('Error leyendo localStorage', e); materiales = {}; filtros = {}; notas = {}; }
}

function saveAll(){
  localStorage.setItem(KEY_MAT, JSON.stringify(materiales));
  localStorage.setItem(KEY_FIL, JSON.stringify(filtros));
  localStorage.setItem(KEY_NOTAS, JSON.stringify(notas));
}

// Render functions
function renderMateriales(){
  const tbody = document.querySelector('#mat_table tbody');
  tbody.innerHTML = '';
  Object.entries(materiales).forEach(([id,item])=>{
    const tr=el('tr');
    const L = (LANGS && langSelector && LANGS[langSelector.value]) ? LANGS[langSelector.value] : (LANGS?LANGS.es:{edit:'Editar',delete:'Eliminar'});
    tr.innerHTML = `<td>${escapeHtml(item.ref)}</td><td>${item.qty||0}</td>
      <td class="actions">
        <button class="small btn-edit" data-action="edit" data-id="${id}">${escapeHtml(L.edit)}</button>
        <button class="small btn-delete" data-action="delete" data-id="${id}">${escapeHtml(L.delete)}</button>
      </td>`;
    tbody.appendChild(tr);
  });
  // full page list
  const full = $('#materiales_full'); if(full){ full.innerHTML = Object.entries(materiales).map(([id,it])=>`<div>${escapeHtml(it.ref)} — ${it.qty||0}</div>`).join(''); }
}

function renderFiltros(){
  const tbody = document.querySelector('#fil_table tbody');
  tbody.innerHTML = '';
  Object.entries(filtros).forEach(([id,item])=>{
    const tr=el('tr');
    const current = langSelector && langSelector.value ? langSelector.value : (localStorage.getItem('almacen_lang') || 'es');
    const L = (LANGS && LANGS[current]) ? LANGS[current] : LANGS.es;
    const catLabel = (LANGS[current] && LANGS[current].categories && LANGS[current].categories[item.categoria]) ? LANGS[current].categories[item.categoria] : (item.categoria || '');
    tr.innerHTML = `<td>${escapeHtml(item.ref)}</td><td>${escapeHtml(item.brand)}</td><td>${escapeHtml(item.model)}</td><td>${escapeHtml(catLabel)}</td><td>${Number(item.qty)||0}</td>
      <td class="actions">
        <button class="small btn-edit" data-action="edit" data-id="${id}">${escapeHtml(L.edit)}</button>
        <button class="small btn-delete" data-action="delete" data-id="${id}">${escapeHtml(L.delete)}</button>
      </td>`;
    tbody.appendChild(tr);
  });
  const full = $('#filtros_full'); if(full) full.innerHTML = Object.entries(filtros).map(([id,it])=>{
    const current = langSelector && langSelector.value ? langSelector.value : (localStorage.getItem('almacen_lang') || 'es');
    const catLabel = (LANGS[current] && LANGS[current].categories && LANGS[current].categories[it.categoria]) ? LANGS[current].categories[it.categoria] : (it.categoria || '');
    return `<div>${escapeHtml(it.ref)} — ${escapeHtml(it.brand)} — ${escapeHtml(it.model)} — ${escapeHtml(catLabel)} — ${Number(it.qty)||0}</div>`
  }).join('');
}

function renderNotas(){
  const div = $('#notas_list'); div.innerHTML='';
  Object.entries(notas).forEach(([id,n])=>{
    const d = el('div'); d.className='nota'; d.textContent = n.text; div.appendChild(d);
  });
}
// CRUD functions using localStorage (return Promises for compatibility)
function addMaterial(obj){
  const id = uid();
  materiales[id] = { ref: obj.ref, qty: Number(obj.qty)||0 };
  saveAll();
  renderMateriales(); updateChartMateriales();
  return Promise.resolve({ id, ...materiales[id] });
}
function updateMaterial(id,obj){
  if(!materiales[id]) return Promise.reject(new Error('Material no encontrado'));
  materiales[id] = { ref: obj.ref, qty: Number(obj.qty)||0 };
  saveAll(); renderMateriales(); updateChartMateriales();
  return Promise.resolve(materiales[id]);
}
function deleteMaterial(id){
  const current = langSelector && langSelector.value ? langSelector.value : (localStorage.getItem('almacen_lang') || 'es');
  const msg = (LANGS[current] && LANGS[current].confirm && LANGS[current].confirm.deleteMaterial) ? LANGS[current].confirm.deleteMaterial : '¿Eliminar material?';
  if(!confirm(msg)) return Promise.resolve();
  delete materiales[id]; saveAll(); renderMateriales(); updateChartMateriales();
  return Promise.resolve();
}

function addFiltro(obj){ const id = uid(); filtros[id] = { ref: obj.ref, brand: obj.brand, model: obj.model, categoria: obj.categoria, qty: Number(obj.qty)||0 }; saveAll(); renderFiltros(); updateChartFiltros(); return Promise.resolve({ id, ...filtros[id] }); }
function updateFiltro(id,obj){ if(!filtros[id]) return Promise.reject(new Error('Filtro no encontrado')); filtros[id] = { ref: obj.ref, brand: obj.brand, model: obj.model, categoria: obj.categoria, qty: Number(obj.qty)||0 }; saveAll(); renderFiltros(); updateChartFiltros(); return Promise.resolve(filtros[id]); }
function deleteFiltro(id){
  const current = langSelector && langSelector.value ? langSelector.value : (localStorage.getItem('almacen_lang') || 'es');
  const msg = (LANGS[current] && LANGS[current].confirm && LANGS[current].confirm.deleteFiltro) ? LANGS[current].confirm.deleteFiltro : '¿Eliminar filtro?';
  if(!confirm(msg)) return Promise.resolve();
  delete filtros[id]; saveAll(); renderFiltros(); updateChartFiltros(); return Promise.resolve();
}

function addNota(obj){ const id = uid(); notas[id] = { text: obj.text, ts: obj.ts||Date.now() }; saveAll(); renderNotas(); return Promise.resolve({ id, ...notas[id] }); }

// Events
$('#mat_add').onclick = ()=>{
  const ref = $('#mat_ref').value.trim();
  const qty = parseInt($('#mat_qty').value)||0;
  if(!ref) return alert('Referencia vacía');
  // evitar duplicados (case-insensitive)
  if(Object.values(materiales).some(it=>it.ref && it.ref.toLowerCase() === ref.toLowerCase())) return alert('Referencia ya existe');
  addMaterial({ ref, qty }).then(()=>{ $('#mat_ref').value=''; $('#mat_qty').value=''; });
};

$('#fil_add').onclick = ()=>{
  const ref = $('#fil_ref').value.trim();
  const brand = $('#fil_brand').value.trim();
  const model = $('#fil_model').value.trim();
  const categoria = $('#fil_cat').value;
  if(!ref || !brand) return alert('Completa referencia y marca');
  // evitar duplicados por referencia + marca
  if(Object.values(filtros).some(it=>it.ref && it.brand && it.ref.toLowerCase()===ref.toLowerCase() && it.brand.toLowerCase()===brand.toLowerCase())) return alert('Filtro con misma referencia y marca ya existe');
  addFiltro({ ref, brand, model, categoria }).then(()=>{ $('#fil_ref').value=''; $('#fil_brand').value=''; $('#fil_model').value=''; });
};

$('#nota_save').onclick = ()=>{
  const txt = $('#nota_text').value.trim();
  if(!txt) return;
  addNota({ text: txt, ts: Date.now() }).then(()=>{ $('#nota_text').value=''; });
};

// Modal editing
window.editMaterial = function(id){
  const data = materiales[id] || { ref:'', qty:0 };
  const current = langSelector && langSelector.value ? langSelector.value : (localStorage.getItem('almacen_lang') || 'es');
  const L = LANGS[current] || LANGS.es;
  const title = (LANGS[current] && LANGS[current].modal && LANGS[current].modal.editMaterial) ? LANGS[current].modal.editMaterial : 'Editar material';
  openModal(title, `
    <label>${escapeHtml(L.ref)}</label><input id="m_ref" value="${escapeHtml(data.ref)}"/>
    <label>${escapeHtml(L.qty)}</label><input id="m_qty" type="number" value="${data.qty||0}"/>
  `, ()=>{
    const ref = $('#m_ref').value.trim();
    const qty = parseInt($('#m_qty').value)||0;
    updateMaterial(id, { ref, qty }).then(closeModal).catch(err=>{ alert(err.message); });
  });
};
window.editFiltro = function(id){
  const d = filtros[id] || { ref:'', brand:'', model:'', categoria:'aceite', qty:0 };
  const current = langSelector && langSelector.value ? langSelector.value : (localStorage.getItem('almacen_lang') || 'es');
  const L = LANGS[current] || LANGS.es;
  const title = (LANGS[current] && LANGS[current].modal && LANGS[current].modal.editFiltro) ? LANGS[current].modal.editFiltro : 'Editar filtro';
  // Build category options using translations if present
  const categories = ['aceite','aire','habitaculos','combustible'];
  const catOptions = categories.map(c=>`<option value="${c}">${escapeHtml((LANGS[current] && LANGS[current].categories && LANGS[current].categories[c])||c)}</option>`).join('');
  openModal(title, `
    <label>${escapeHtml(L.ref)}</label><input id="f_ref" value="${escapeHtml(d.ref)}"/>
    <label>${escapeHtml(L.brand)}</label><input id="f_brand" value="${escapeHtml(d.brand)}"/>
    <label>${escapeHtml(L.model)}</label><input id="f_model" value="${escapeHtml(d.model)}"/>
    <label>${escapeHtml(L.qty)}</label><input id="f_qty" type="number" value="${Number(d.qty)||0}" />
    <label>${escapeHtml(L.category)}</label>
    <select id="f_cat">${catOptions}</select>
  `, ()=>{
    const obj = {
      ref: $('#f_ref').value.trim(),
      brand: $('#f_brand').value.trim(),
      model: $('#f_model').value.trim(),
      qty: parseInt($('#f_qty').value) || 0,
      categoria: $('#f_cat').value
    };
    updateFiltro(id, obj).then(closeModal).catch(err=>{ alert(err.message); });
  }, ()=>{
    setTimeout(()=>{ $('#f_cat').value = d.categoria || 'aceite' },40);
  });
};

function openModal(title, html, onSave, onOpen){
  $('#modal_title').textContent = title;
  $('#modal_body').innerHTML = html;
  $('#modal').style.display='flex';
  $('#modal_save').onclick = onSave;
  $('#modal_close').onclick = closeModal;
  if(onOpen) onOpen();
}
function closeModal(){ $('#modal').style.display='none' }

// Charts
let chartMat = null, chartFil = null;
function createCharts(){
  const ctxM = document.getElementById('chart_materiales').getContext('2d');
  chartMat = new Chart(ctxM, {
    type:'doughnut',
    data:{ labels:[], datasets:[{ data:[] }] },
    options:{ responsive:true, maintainAspectRatio:false }
  });
  const ctxF = document.getElementById('chart_filtros').getContext('2d');
  chartFil = new Chart(ctxF, {
    type:'doughnut',
    data:{ labels:getCategoryLabels(), datasets:[{ data:[0,0,0,0] }] },
    options:{ responsive:true, maintainAspectRatio:false }
  });
}

function getCategoryLabels(lang){
  const current = lang || (langSelector && langSelector.value ? langSelector.value : (localStorage.getItem('almacen_lang') || 'es'));
  const cats = (LANGS[current] && LANGS[current].categories) ? LANGS[current].categories : (LANGS.es && LANGS.es.categories ? LANGS.es.categories : { aceite:'aceite', aire:'aire', habitaculos:'habitaculos', combustible:'combustible' });
  return ['aceite','aire','habitaculos','combustible'].map(k => cats[k] || k);
}

function updateChartMateriales(){
  if(!chartMat) return;
  const labels = Object.values(materiales).map(m => m.ref);
  const data = Object.values(materiales).map(m => Number(m.qty) || 0);
  chartMat.data.labels = labels;
  chartMat.data.datasets[0].data = data;
  // Assign a color per label using the MATERIAL_COLORS palette (wrap if needed)
  chartMat.data.datasets[0].backgroundColor = labels.map((_, i) => MATERIAL_COLORS[i % MATERIAL_COLORS.length]);
  chartMat.update();
}

function updateChartFiltros(){
  if(!chartFil) return;
  const counts = { aceite:0, aire:0, habitaculos:0, combustible:0 };
  Object.values(filtros).forEach(f=>{ if(f && counts[f.categoria]!==undefined) counts[f.categoria]++; });
  chartFil.data.datasets[0].data = [counts.aceite, counts.aire, counts.habitaculos, counts.combustible];
  // update labels according to current language
  if(chartFil.data){
    chartFil.data.labels = getCategoryLabels();
  }
  chartFil.update();
}

// Helper
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

// Init
window.onload = ()=>{
  loadAll();
  navigate('dashboard');
  createCharts();
  renderMateriales(); renderFiltros(); renderNotas(); updateChartMateriales(); updateChartFiltros();
};

function exportAll(){
  const data = { materiales: Object.values(materiales), filtros: Object.values(filtros), notas: Object.values(notas) };
  const blob = new Blob([JSON.stringify(data, null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='almacen_backup.json'; a.click();
}
// Diccionario de textos por idioma
const LANGS = {
  es: {
    materials: "Materiales",
    filters: "Filtros",
    notas: "Notas",
    dashboard: "Dashboard",
    add: "Añadir",
    edit: "Editar",
    delete: "Eliminar",
    save: "Guardar",
    ref: "Referencia",
    brand: "Marca",
    model: "Modelo",
    category: "Categoría",
    qty: "Cantidad",
    placeholderRef: "Introduce la referencia",
    placeholderBrand: "Introduce la marca",
    placeholderModel: "Introduce el modelo",
    placeholderQty: "Cantidad"
  },
  en: {
    materials: "Materials",
    filters: "Filters",
    notas: "Notes",
    dashboard: "Dashboard",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    ref: "Reference",
    brand: "Brand",
    model: "Model",
    category: "Category",
    qty: "Quantity",
    placeholderRef: "Enter reference",
    placeholderBrand: "Enter brand",
    placeholderModel: "Enter model",
    placeholderQty: "Quantity"
  },
  it: {
    materials: "Materiali",
    filters: "Filtri",
    notas: "Note",
    dashboard: "Dashboard",
    add: "Aggiungi",
    edit: "Modifica",
    delete: "Elimina",
    save: "Salva",
    ref: "Riferimento",
    brand: "Marca",
    model: "Modello",
    category: "Categoria",
    qty: "Quantità",
    placeholderRef: "Inserisci riferimento",
    placeholderBrand: "Inserisci marca",
    placeholderModel: "Inserisci modello",
    placeholderQty: "Quantità"
  }
};
// Añadir textos extra (nav, chart titles, modal labels, confirmaciones)
LANGS.es.nav = { dashboard: 'Dashboard', materiales: 'Materiales', filtros: 'Filtros', notas: 'Notas' };
LANGS.en.nav = { dashboard: 'Dashboard', materiales: 'Materials', filtros: 'Filters', notas: 'Notes' };
LANGS.it.nav = { dashboard: 'Dashboard', materiales: 'Materiali', filtros: 'Filtri', notas: 'Note' };

LANGS.es.chart = { materiales: 'Gráfico Materiales', filtros: 'Gráfico Filtros por categoría' };
LANGS.en.chart = { materiales: 'Materials Chart', filtros: 'Filters by Category' };
LANGS.it.chart = { materiales: 'Grafico Materiali', filtros: 'Grafico Filtri per categoria' };

LANGS.es.modal = { editMaterial: 'Editar material', editFiltro: 'Editar filtro', save: 'Guardar', close: 'Cerrar' };
LANGS.en.modal = { editMaterial: 'Edit material', editFiltro: 'Edit filter', save: 'Save', close: 'Close' };
LANGS.it.modal = { editMaterial: 'Modifica materiale', editFiltro: 'Modifica filtro', save: 'Salva', close: 'Chiudi' };

LANGS.es.confirm = { deleteMaterial: '¿Eliminar material?', deleteFiltro: '¿Eliminar filtro?' };
LANGS.en.confirm = { deleteMaterial: 'Delete material?', deleteFiltro: 'Delete filter?' };
LANGS.it.confirm = { deleteMaterial: 'Eliminare il materiale?', deleteFiltro: 'Eliminare il filtro?' };

// Traducciones de categorías (clave => etiqueta traducida)
LANGS.es.categories = { aceite: 'Aceite', aire: 'Aire', habitaculos: 'Habitáculos', combustible: 'Combustible' };
LANGS.en.categories = { aceite: 'Oil', aire: 'Air', habitaculos: 'Cabin', combustible: 'Fuel' };
LANGS.it.categories = { aceite: 'Olio', aire: 'Aria', habitaculos: 'Abitacolo', combustible: 'Combustibile' };
function applyLang(){
  const current = langSelector && langSelector.value ? langSelector.value : (localStorage.getItem('almacen_lang') || 'es');
  const L = LANGS[current] || LANGS.es;
  // persistir idioma
  localStorage.setItem('almacen_lang', current);

  // Títulos de secciones (comprobar existencia)
  const elMat = document.getElementById('mat_title'); if(elMat) elMat.textContent = L.materials;
  const elFil = document.getElementById('fil_title'); if(elFil) elFil.textContent = L.filters;
  const elNot = document.getElementById('not_title'); if(elNot) elNot.textContent = L.notas;

  // nav
  const nav = LANGS[current].nav || LANGS.es.nav;
  const bDash = document.getElementById('nav_dashboard'); if(bDash) bDash.textContent = nav.dashboard;
  const bMat = document.getElementById('nav_materiales'); if(bMat) bMat.textContent = nav.materiales;
  const bFil = document.getElementById('nav_filtros'); if(bFil) bFil.textContent = nav.filtros;
  const bNot = document.getElementById('nav_notas'); if(bNot) bNot.textContent = nav.notas;

  // Botones
  document.querySelectorAll('.btn-add').forEach(b=>b.textContent = L.add);
  document.querySelectorAll('.btn-save').forEach(b=>b.textContent = LANGS[current].modal ? LANGS[current].modal.save : L.save);
  document.querySelectorAll('.btn-edit').forEach(b=>b.textContent = L.edit);
  document.querySelectorAll('.btn-delete').forEach(b=>b.textContent = L.delete);

  // Inputs / placeholders
  const refInput = document.querySelectorAll('input[data-key="ref"]');
  refInput.forEach(i=>i.placeholder = L.placeholderRef);

  const brandInput = document.querySelectorAll('input[data-key="brand"]');
  brandInput.forEach(i=>i.placeholder = L.placeholderBrand);

  const modelInput = document.querySelectorAll('input[data-key="model"]');
  modelInput.forEach(i=>i.placeholder = L.placeholderModel);

  const qtyInput = document.querySelectorAll('input[data-key="qty"]');
  qtyInput.forEach(i=>i.placeholder = L.placeholderQty);

  // chart titles
  const chartT = LANGS[current].chart || LANGS.es.chart;
  const ctMat = document.getElementById('chart_mat_title'); if(ctMat) ctMat.textContent = chartT.materiales;
  const ctFil = document.getElementById('chart_fil_title'); if(ctFil) ctFil.textContent = chartT.filtros;

  // modal buttons and close
  const modalSave = document.getElementById('modal_save'); if(modalSave) modalSave.textContent = LANGS[current].modal ? LANGS[current].modal.save : L.save;
  const modalClose = document.getElementById('modal_close'); if(modalClose) modalClose.textContent = LANGS[current].modal ? LANGS[current].modal.close : 'Cerrar';

  // translate category select options (preserve values)
  const sel = document.getElementById('fil_cat');
  if(sel){
    const cats = (LANGS[current] && LANGS[current].categories) ? LANGS[current].categories : LANGS.es.categories;
    const prev = sel.value;
    Array.from(sel.options).forEach(opt => {
      opt.text = cats[opt.value] || opt.value;
    });
    // restore previous selection if possible
    sel.value = prev;
  }
  // update charts labels after language change
  updateChartFiltros();
}

// Inicializar selector de idioma y aplicar idioma por defecto
if(langSelector){
  Object.keys(LANGS).forEach(l=>{ const o = el('option'); o.value = l; o.textContent = l.toUpperCase(); langSelector.appendChild(o); });
  const storedLang = localStorage.getItem('almacen_lang') || 'es';
  langSelector.value = storedLang;
  langSelector.onchange = applyLang;
  applyLang();
}

// Event delegation for table actions (edit/delete)
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-action]');
  if(!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  // Determine scope by table
  if(action === 'edit'){
    // If exists in materiales
    if(materiales[id]) return editMaterial(id);
    if(filtros[id]) return editFiltro(id);
  }
  if(action === 'delete'){
    if(materiales[id]) return deleteMaterial(id);
    if(filtros[id]) return deleteFiltro(id);
  }
});
fetch("https://script.google.com/macros/s/AKfycbweA-ym692XqARpQdMuh1v7hYQrHn18n7ixBhRB9Y1C93nQkh8Mp3R9B_x5ccLQdAgh/exec")
  .then(r => r.json())
  .then(data => {
    console.log("Productos:", data);
    // Aquí los muestras en tu HTML
  });
function actualizarStock(id, nuevoStock) {
  fetch("https://script.google.com/macros/s/AKfycbweA-ym692XqARpQdMuh1v7hYQrHn18n7ixBhRB9Y1C93nQkh8Mp3R9B_x5ccLQdAgh/exec", {
    method: "POST",
    body: new URLSearchParams({
      id: id,
      stock: nuevoStock
    })
  })
  .then(() => alert("Stock actualizado"));
}
// Importar Firebase y Realtime Database
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue, remove } from "firebase/database";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBzxk8viz1uTuyw5kaKJKoHiwBIVp2Q8II",
  authDomain: "officinastock.firebaseapp.com",
  databaseURL: "https://officinastock-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "officinastock",
  storageBucket: "officinastock.firebasestorage.app",
  messagingSenderId: "616030382400",
  appId: "1:616030382400:web:24d9266f1f0fb75464f2a5",
  measurementId: "G-V1TMXJ7Z3D"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Referencia al inventario
const inventarioRef = ref(database, 'inventario');

// Función para escuchar cambios en tiempo real
onValue(inventarioRef, (snapshot) => {
    const data = snapshot.val() || {};
    actualizarListaInventario(data);
});

// Función para agregar producto
export function agregarProducto(nombre, cantidad) {
    push(inventarioRef, { nombre, cantidad });
}

// Función para eliminar producto
export function eliminarProducto(id) {
    remove(ref(database, 'inventario/' + id));
}

// Función para actualizar tu HTML
function actualizarListaInventario(data) {
    const lista = document.getElementById('lista-inventario');
    lista.innerHTML = '';
    Object.keys(data).forEach(key => {
        const item = document.createElement('li');
        item.textContent = data[key].nombre + ' - ' + data[key].cantidad;

        const btn = document.createElement('button');
        btn.textContent = 'Eliminar';
        btn.onclick = () => eliminarProducto(key);

        item.appendChild(btn);
        lista.appendChild(item);
    });
}
