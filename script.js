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

// ---- UTILIDADES DOM / escape ----
function $(q){ return document.querySelector(q); }
function el(t){ return document.createElement(t); }
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

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

// ---- LANGS (mantén simple) ----
const LANGS = {
  es: { materials:"Materiales", filters:"Filtros", notas:"Notas", add:"Añadir", edit:"Editar", delete:"Eliminar" },
  en: { materials:"Materials", filters:"Filters", notas:"Notes", add:"Add", edit:"Edit", delete:"Delete" },
  it: { materials:"Materiali", filters:"Filtri", notas:"Note", add:"Aggiungi", edit:"Modifica", delete:"Elimina" }
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
  $('#mat_title').textContent = lang.materials;
  $('#fil_title').textContent = lang.filters;
  $('#not_page_title').textContent = lang.notas;
  document.querySelectorAll('.btn-add').forEach(b => b.textContent = lang.add);
  
  // CORRECCIÓN: Volver a renderizar las tablas para que los botones de Edit/Delete tengan el texto traducido.
  renderAll(); 
}

// Función para renderizar todo (útil al cambiar de idioma)
function renderAll(){
    renderMateriales(lastMatData);
    renderFiltros(lastFilData);
    renderNotas(lastNotData);
}

// ---- DATA CACHE (ultimos dumps) ----
let lastMatData = {};
let lastFilData = {};
let lastNotData = {};

// ---- RENDER: MATERIALES ----
function renderMateriales(data){
  lastMatData = data || {};
  const tbody = $('#mat_table tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  
  const lang = LANGS[currentLang]; // Obtener las etiquetas traducidas

  Object.entries(data || {}).forEach(([id, item]) => {
    const tr = el('tr');
    tr.innerHTML = `
      <td>${escapeHtml(item.ref)}</td>
      <td>${Number(item.qty) || 0}</td>
      <td>
        <button class="btn-edit" data-id="${id}">${lang.edit}</button>
        <button class="btn-delete" data-id="${id}">${lang.delete}</button>
      </td>`;
    tbody.appendChild(tr);
  });
  // full list page
  const full = $('#materiales_full');
  if(full) full.innerHTML = Object.entries(data || {}).map(([id,it])=>`${escapeHtml(it.ref)} — ${Number(it.qty)||0}`).join('<br>');
  updateChartMateriales(data);
}

// ---- RENDER: FILTROS ----
function renderFiltros(data){
  lastFilData = data || {};
  const tbody = $('#fil_table tbody');
  if(!tbody) return;
  tbody.innerHTML = '';

  const lang = LANGS[currentLang]; // Obtener las etiquetas traducidas

  Object.entries(data || {}).forEach(([id, item])=>{
    const tr = el('tr');
    tr.innerHTML = `
      <td>${escapeHtml(item.ref)}</td>
      <td>${escapeHtml(item.brand)}</td>
      <td>${escapeHtml(item.model)}</td>
      <td>${escapeHtml(item.categoria)}</td>
      <td>${Number(item.qty)||0}</td>
      <td>
        <button class="btn-edit" data-id="${id}">${lang.edit}</button>
        <button class="btn-delete" data-id="${id}">${lang.delete}</button>
      </td>`;
    tbody.appendChild(tr);
  });
  const full = $('#filtros_full');
  if(full) full.innerHTML = Object.entries(data || {}).map(([id,it])=>`${escapeHtml(it.ref)} — ${escapeHtml(it.brand)} — ${escapeHtml(it.model)} — ${escapeHtml(it.categoria)} — ${Number(it.qty)||0}`).join('<br>');
  updateChartFiltros(data);
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

// ---- EVENTS: Añadir / editar / borrar materiales ----
window.addMaterial = function(){
  const refVal = $('#mat_ref').value.trim();
  const qty = parseInt($('#mat_qty').value) || 0;
  if(!refVal) return alert('Referencia vacía');
  push(matRef, { ref: refVal, qty });
  $('#mat_ref').value = ''; $('#mat_qty').value = '';
};

window.addFiltro = function(){
  const refVal = $('#fil_ref').value.trim();
  const brand = $('#fil_brand').value.trim();
  const model = $('#fil_model').value.trim();
  const cat = $('#fil_cat').value;
  const qty = parseInt($('#fil_qty').value) || 0;
  if(!refVal || !brand) return alert('Completa referencia y marca');
  push(filRef, { ref: refVal, brand, model, categoria: cat, qty });
  $('#fil_ref').value = ''; $('#fil_brand').value = ''; $('#fil_model').value = ''; $('#fil_qty').value = 0;
};

window.addNota = function(){
  const txt = $('#nota_text').value.trim();
  if(!txt) return;
  push(notRef, { text: txt, ts: Date.now() });
  $('#nota_text').value = '';
};

// ---- ELIMINAR ----
window.deleteMaterial = function(id){
  remove(ref(db, 'materiales/' + id));
};
window.deleteFiltro = function(id){
  remove(ref(db, 'filtros/' + id));
};

// ---- EDICIÓN SIMPLE (prompts para no complicar modal) ----
window.editMaterial = function(id){
  const item = lastMatData[id] || { ref: '', qty: 0 };
  const newRef = prompt('Referencia:', item.ref);
  if(newRef === null) return;
  const newQty = prompt('Cantidad:', item.qty || 0);
  if(newQty === null) return;
  update(ref(db,'materiales/'+id), { ref: newRef, qty: parseInt(newQty)||0 });
};
window.editFiltro = function(id){
  const item = lastFilData[id] || { ref:'', brand:'', model:'', categoria:'aceite', qty:0 };
  const newRef = prompt('Referencia:', item.ref); if(newRef===null) return;
  const newBrand = prompt('Marca:', item.brand); if(newBrand===null) return;
  const newModel = prompt('Modelo:', item.model); if(newModel===null) return;
  const newCat = prompt('Categoría (aceite/aire/habitaculos/combustible):', item.categoria); if(newCat===null) return;
  const newQty = prompt('Cantidad:', item.qty||0); if(newQty===null) return;
  update(ref(db,'filtros/'+id), { ref:newRef, brand:newBrand, model:newModel, categoria:newCat, qty: parseInt(newQty)||0 });
};

// ---- EVENT DELEGATION para botones Edit / Delete en tablas ----
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if(!btn) return;
  
  // CORRECCIÓN CLAVE: Usar clases en lugar de textContent para independencia del idioma
  const idVal = btn.dataset.id;
  if (!idVal) return; // Se requiere un ID para cualquier acción

  if(btn.classList.contains('btn-delete')){
      if(lastMatData && lastMatData[idVal]) return deleteMaterial(idVal);
      if(lastFilData && lastFilData[idVal]) return deleteFiltro(idVal);
  }
  
  if(btn.classList.contains('btn-edit')){
      if(lastMatData && lastMatData[idVal]) return editMaterial(idVal);
      if(lastFilData && lastFilData[idVal]) return editFiltro(idVal);
  }
});

// ---- REALTIME LISTENERS ----
onValue(matRef, snapshot => {
  const data = snapshot.val() || {};
  // convert numeric qty to numbers
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

// ---- CHARTS ----
let chartMat = null, chartFil = null;
function createCharts(){
  const ctxM = document.getElementById('chart_materiales')?.getContext('2d');
  const ctxF = document.getElementById('chart_filtros')?.getContext('2d');
  if(ctxM){
    chartMat = new Chart(ctxM, { type:'doughnut', data:{ labels:[], datasets:[{ data:[], backgroundColor:[] }] }, options:{ responsive:true, maintainAspectRatio:false } });
  }
  if(ctxF){
    chartFil = new Chart(ctxF, { type:'doughnut', data:{ labels:['Aceite','Aire','Habitáculos','Combustible'], datasets:[{ data:[0,0,0,0], backgroundColor:['#f28e2b','#4e79a7','#e15759','#59a14f'] }] }, options:{ responsive:true, maintainAspectRatio:false } });
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
  chartFil.data.datasets[0].data = [counts.aceite, counts.aire, counts.habitaculos, counts.combustible];
  chartFil.update();
}

// ---- INIT ----
window.onload = function(){
  navigate('dashboard');
  createCharts();

  // Wire up UI buttons to exported functions (the HTML uses inline onclicks but we also attach here)
  const matAdd = document.getElementById('mat_add');
  if(matAdd) matAdd.onclick = window.addMaterial;
  const filAdd = document.getElementById('fil_add');
  if(filAdd) filAdd.onclick = window.addFiltro;
  const notaSave = document.getElementById('nota_save');
  if(notaSave) notaSave.onclick = window.addNota;
  
  // keep language applied - Esto llama a renderAll() internamente
  applyLang(); 
};
