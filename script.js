// script.js - sincronización en tiempo real con Firebase y Charts

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-database.js";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.esm.min.js";

// ==================== CONFIG FIREBASE ====================
const firebaseConfig = {
  apiKey: "AIzaSyBzxk8viz1uTuyw5kaKJKoHiwBIVp2Q8II",
  authDomain: "officinastock.firebaseapp.com",
  databaseURL: "https://officinastock-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "officinastock",
  storageBucket: "officinastock.firebasedestorage.app",
  messagingSenderId: "616030382400",
  appId: "1:616030382400:web:24d9266f1f0fb75464f2a5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Referencias
const matRef = ref(db, 'materiales');
const filRef = ref(db, 'filtros');
const notRef = ref(db, 'notas');

// ==================== UTIL ====================
function $(q){ return document.querySelector(q); }
function el(t){ return document.createElement(t); }
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function navigate(page){
  document.querySelectorAll('.page').forEach(p=>p.style.display='none');
  const elPage = document.getElementById(page);
  if(elPage) elPage.style.display='block';
}

// ==================== LANGS ====================
const LANGS = {
  es: { materials:"Materiales", filters:"Filtros", notas:"Notas", add:"Añadir", edit:"Editar", delete:"Eliminar", qty:"Cantidad", ref:"Referencia", brand:"Marca", model:"Modelo", category:"Categoría", modal:{save:"Guardar", close:"Cerrar"} },
  en: { materials:"Materials", filters:"Filters", notas:"Notes", add:"Add", edit:"Edit", delete:"Delete", qty:"Quantity", ref:"Reference", brand:"Brand", model:"Model", category:"Category", modal:{save:"Save", close:"Close"} },
  it: { materials:"Materiali", filters:"Filtri", notas:"Note", add:"Aggiungi", edit:"Modifica", delete:"Elimina", qty:"Quantità", ref:"Riferimento", brand:"Marca", model:"Modello", category:"Categoria", modal:{save:"Salva", close:"Chiudi"} }
};
const langSelector = $('#lang_selector');

function applyLang(){
  const current = langSelector?.value || 'es';
  localStorage.setItem('almacen_lang', current);
  $('#mat_title').textContent = LANGS[current].materials;
  $('#fil_title').textContent = LANGS[current].filters;
  $('#not_page_title').textContent = LANGS[current].notas;
  document.querySelectorAll('.btn-add').forEach(b=>b.textContent = LANGS[current].add);
}

// Inicializar selector
if(langSelector){
  Object.keys(LANGS).forEach(l=>{ const o=el('option'); o.value=l; o.textContent=l.toUpperCase(); langSelector.appendChild(o); });
  langSelector.value = localStorage.getItem('almacen_lang')||'es';
  langSelector.onchange = applyLang;
  applyLang();
}

// ==================== MATERIAL ====================
let chartMat = null;
function renderMateriales(data){
  const tbody = $('#mat_table tbody'); tbody.innerHTML='';
  Object.entries(data||{}).forEach(([id,item])=>{
    const tr=el('tr');
    tr.innerHTML=`<td>${escapeHtml(item.ref)}</td><td>${item.qty||0}</td>
      <td><button onclick="editMaterial('${id}')">${LANGS[langSelector.value].edit}</button>
          <button onclick="deleteMaterial('${id}')">${LANGS[langSelector.value].delete}</button></td>`;
    tbody.appendChild(tr);
  });
  updateChartMateriales(data);
}

window.addMaterial = () => {
  const refVal = $('#mat_ref').value.trim();
  const qtyVal = parseInt($('#mat_qty').value)||0;
  if(!refVal) return alert('Referencia vacía');
  push(matRef,{ ref: refVal, qty: qtyVal });
  $('#mat_ref').value=''; $('#mat_qty').value='';
};

window.deleteMaterial = (id) => remove(ref(db,'materiales/'+id));
window.editMaterial = (id) => {
  const refVal = prompt('Referencia nueva:');
  const qtyVal = prompt('Cantidad nueva:');
  if(refVal!==null && qtyVal!==null) update(ref(db,'materiales/'+id),{ ref: refVal, qty: parseInt(qtyVal)||0 });
};

onValue(matRef, snapshot => renderMateriales(snapshot.val()));

// ==================== FILTROS ====================
let chartFil = null;
function renderFiltros(data){
  const tbody = $('#fil_table tbody'); tbody.innerHTML='';
  Object.entries(data||{}).forEach(([id,it])=>{
    const tr = el('tr');
    tr.innerHTML = `<td>${it.ref}</td><td>${it.brand}</td><td>${it.model}</td><td>${it.categoria}</td><td>${it.qty||0}</td>
      <td><button onclick="editFiltro('${id}')">${LANGS[langSelector.value].edit}</button>
          <button onclick="deleteFiltro('${id}')">${LANGS[langSelector.value].delete}</button></td>`;
    tbody.appendChild(tr);
  });
  updateChartFiltros(data);
}

window.addFiltro = () => {
  const refVal = $('#fil_ref').value.trim();
  const brand = $('#fil_brand').value.trim();
  const model = $('#fil_model').value.trim();
  const cat = $('#fil_cat').value;
  const qty = parseInt($('#fil_qty').value)||0;
  if(!refVal || !brand) return alert('Completa referencia y marca');
  push(filRef,{ ref: refVal, brand, model, categoria: cat, qty });
  $('#fil_ref').value=''; $('#fil_brand').value=''; $('#fil_model').value=''; $('#fil_qty').value=0;
};
window.deleteFiltro = (id) => remove(ref(db,'filtros/'+id));
window.editFiltro = (id) => {
  const refVal = prompt('Referencia nueva:');
  const brand = prompt('Marca nueva:');
  const model = prompt('Modelo nuevo:');
  const cat = prompt('Categoría nueva: aceite/aire/habitaculos/combustible');
  const qty = prompt('Cantidad nueva:');
  if(refVal!==null && brand!==null && model!==null && cat!==null && qty!==null){
    update(ref(db,'filtros/'+id), { ref: refVal, brand, model, categoria: cat, qty: parseInt(qty)||0 });
  }
};

onValue(filRef, snapshot => renderFiltros(snapshot.val()));

// ==================== NOTAS ====================
function renderNotas(data){
  const div = $('#notas_list'); div.innerHTML='';
  Object.entries(data||{}).forEach(([id,n])=>{
    const d = el('div'); d.className='nota'; d.textContent = n.text; div.appendChild(d);
  });
}

window.addNota = () => {
  const txt = $('#nota_text').value.trim(); if(!txt) return;
  push(notRef,{ text: txt, ts: Date.now() });
  $('#nota_text').value='';
};
onValue(notRef, snapshot => renderNotas(snapshot.val()));

// ==================== CHARTS ====================
function createCharts(){
  const ctxM = $('#chart_materiales').getContext('2d');
  chartMat = new Chart(ctxM,{ type:'doughnut', data:{ labels:[], datasets:[{ data:[], backgroundColor:[] }] }, options:{ responsive:true, maintainAspectRatio:false } });
  const ctxF = $('#chart_filtros').getContext('2d');
  chartFil = new Chart(ctxF,{ type:'doughnut', data:{ labels:['aceite','aire','habitaculos','combustible'], datasets:[{ data:[0,0,0,0], backgroundColor:['#f28e2b','#4e79a7','#e15759','#59a14f'] }] }, options:{ responsive:true, maintainAspectRatio:false } });
}

function updateChartMateriales(data){
  if(!chartMat) return;
  const labels = Object.values(data||{}).map(m=>m.ref);
  const values = Object.values(data||{}).map(m=>m.qty||0);
  chartMat.data.labels = labels;
  chartMat.data.datasets[0].data = values;
  chartMat.data.datasets[0].backgroundColor = labels.map((_,i)=>['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ac'][i%10]);
  chartMat.update();
}

function updateChartFiltros(data){
  if(!chartFil) return;
  const counts = { aceite:0, aire:0, habitaculos:0, combustible:0 };
  Object.values(data||{}).forEach(f=>{ if(f.categoria && counts[f.categoria]!==undefined) counts[f.categoria]++; });
  chartFil.data.datasets[0].data = [counts.aceite, counts.aire, counts.habitaculos, counts.combustible];
  chartFil.update();
}

// ==================== INIT ====================
window.onload = () => {
  navigate('dashboard');
  createCharts();
};
