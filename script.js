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

// ---- REFERENCIAS FIREBASE ----
const matRef = ref(db, "materiales");
const filRef = ref(db, "filtros");
const notRef = ref(db, "notas");
const histRef = ref(db, "historial_usos"); 

// =======================================================
// ---- CONFIGURACIÓN DE WHATSAPP (MODIFICADO) ----
// Número de teléfono de destino: 393491908064 (Italia)
const WHATSAPP_PHONE_NUMBER = '393491908064'; 
const STOCK_ALERT_THRESHOLD = 2; // Umbral de stock bajo
// =======================================================

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

// ---- NAVEGACIÓN ----
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

// ---- SIDEBAR (Toggle Referencias) ----
window.toggleRefs = function(){
    const refsList = $('#refs_list');
    const toggleBtn = $('#toggle_refs_btn');
    const lang = LANGS[currentLang];

    const isOpen = refsList.classList.toggle('is-open');

    if (toggleBtn) {
        const refsText = lang.titles.refs || 'References';
        const hideText = lang.titles.hide_refs || ' (Ocultar)';
        toggleBtn.textContent = isOpen ? `${refsText}${hideText}` : refsText;
    }
}


// ---- LANGS (incluyendo USE, Historial y Aviso de Stock) ----
const LANGS = {
  es: { 
    materials:"Materiales", filters:"Filtros", notas:"Notas", add:"Añadir", edit:"Editar", delete:"Eliminar", save:"Guardar", close:"Cerrar", use:"Usar",
    titles: {
      app: "GESTIÓN TALLER", dashboard: "Dashboard", refs: "Referencias", hide_refs: " (Ocultar)", footer: "Almacenamiento: Firebase Realtime Database",
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
      hist_ref: "Ref. Usada", hist_car: "Vehículo/Nota", hist_time: "Fecha/Hora",
      // NUEVAS TRADUCCIONES PARA ALERTA DE STOCK
      stock_alert_btn: "Aviso de Stock",
      modal_stock_alert: "Aviso de Stock (WhatsApp)",
      alert_instructions: "Añade Referencia y Cantidad requerida de los artículos a pedir.",
      alert_add_item: "Añadir Artículo",
      alert_ref_placeholder: "Ref. Producto",
      alert_qty_placeholder: "Cant."
    }
  },
  en: { 
    materials:"Materials", filters:"Filters", notas:"Notes", add:"Add", edit:"Edit", delete:"Delete", save:"Save", close:"Close", use:"Use",
    titles: {
      app: "WORKSHOP MANAGEMENT", dashboard: "Dashboard", refs: "References", hide_refs: " (Hide)", footer: "Storage: Firebase Realtime Database",
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
      hist_ref: "Used Ref.", hist_car: "Vehicle/Note", hist_time: "Date/Time",
      // NUEVAS TRADUCCIONES PARA ALERTA DE STOCK
      stock_alert_btn: "Stock Alert",
      modal_stock_alert: "Stock Alert (WhatsApp)",
      alert_instructions: "Add Reference and Quantity needed for the items to order.",
      alert_add_item: "Add Item",
      alert_ref_placeholder: "Product Ref.",
      alert_qty_placeholder: "Qty."
    }
  },
  it: { 
    materials:"Materiali", filters:"Filtri", notas:"Note", add:"Aggiungi", edit:"Modifica", delete:"Elimina", save:"Salva", close:"Chiudi", use:"Usa",
    titles: {
      app: "GESTIONE OFFICINA", dashboard: "Dashboard", refs: "Riferimenti", hide_refs: " (Nascondi)", footer: "Archiviazione: Firebase Realtime Database",
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
      hist_ref: "Rif. Usato", hist_car: "Veicolo/Nota", hist_time: "Data/Ora",
      // NUEVAS TRADUCCIONES PARA ALERTA DE STOCK
      stock_alert_btn: "Avviso di Scorta",
      modal_stock_alert: "Avviso di Scorta (WhatsApp)",
      alert_instructions: "Aggiungi Riferimento e Quantità richiesta degli articoli da ordinare.",
      alert_add_item: "Aggiungi Articolo",
      alert_ref_placeholder: "Rif. Prodotto",
      alert_qty_placeholder: "Quantità"
    }
  }
};
const langSelector = $('#lang_selector');
let currentLang = localStorage.getItem('almacen_lang') || 'es'; 

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
  // Se asume que #side_ref_title no existe en tu HTML, se usa #toggle_refs_btn
  // $('#side_ref_title').textContent = t.refs;
  $('#toggle_refs_btn').textContent = t.refs; 
  $('#footer_text').textContent = t.footer;
  $('#stock_alert_btn').textContent = t.stock_alert_btn; // NUEVO BOTÓN
  
  // 2. Traducción de Contenedores de Página (Dashboard)
  $('#mat_title').textContent = lang.materials;
  $('#chart_mat_title').textContent = t.chart_mat;
  $('#fil_title').textContent = lang.filters;
  $('#chart_fil_title').textContent = t.chart_fil;
  $('#hist_title').textContent = t.hist;

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
  
  // TRADUCCIONES DEL MODAL DE USO
  $('#use_car_brand').placeholder = t.prompt_car_brand;
  $('#use_car_model').placeholder = t.prompt_car_model;
  $('#use_prompt_text').textContent = t.use_fil + ':';

  // TRADUCCIONES DEL MODAL DE ALERTA DE STOCK
  $('#alert_instructions').textContent = t.alert_instructions;
  $('#alert_add_item_btn').textContent = t.alert_add_item;
  $('#alert_send_btn').textContent = lang.save; // Usamos 'Guardar'/'Save' para el envío final

  // 5. Traducción de Botones Principales (Añadir/Guardar)
  $('#mat_add').textContent = t.add_mat;
  $('#fil_add').textContent = t.add_fil;
  $('#nota_save').textContent = t.add_note;
  $('#modal_use_filter').textContent = lang.use;

  // 6. Traducción de Opciones de Filtro (Select Options)
  $('#opt_aceite').textContent = t.cat_aceite;
  $('#opt_aire').textContent = t.cat_aire;
  $('#opt_habitaculos').textContent = t.cat_habitaculos;
  $('#opt_combustible').textContent = t.cat_combustible;
  
  // 7. Traducción de Páginas Secundarias
  $('#page_mat_title').textContent = t.page_mat;
  $('#page_fil_title').textContent = t.page_fil;
  $('#page_not_title').textContent = lang.notas;

  // 8. Traducción de Modal
  // El título del modal se actualizará dinámicamente al abrirlo (editar/usar/alerta)
  $('#modal_close').textContent = lang.close;
  
  // Volver a renderizar las tablas para que los botones de Edit/Delete/Use/Alert tengan el texto traducido.
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
let lastHistData = {}; 

// Función para generar y abrir el enlace de WhatsApp (INDIVIDUAL)
window.sendWhatsAppAlert = function(itemRef, currentQty, type) {
    const lang = LANGS[currentLang].titles;
    const itemType = (type === 'material') ? lang.materials : lang.filters;
    const message = encodeURIComponent(
        `🚨 ALERTA DE STOCK BAJO 🚨\n\n` +
        `Tipo: ${itemType}\n` +
        `Referencia: ${itemRef}\n` +
        `Stock Actual: ${currentQty}\n\n` +
        `¡URGENTE! Necesito reponer ${itemRef}.`
    );
    
    // Generar la URL de WhatsApp usando el número configurado
    const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${message}`;
    window.open(whatsappUrl, '_blank');
}


// =======================================================
// ---- NUEVA LÓGICA: ENVÍO MASIVO DE ALERTA DE STOCK ----
// =======================================================

/**
 * 1. Muestra el modal de alerta de stock.
 */
window.openStockAlertModal = function() {
    const modal = $('#modal');
    const t = LANGS[currentLang].titles;
    
    // Ocultar otros formularios del modal
    $('#modal_uso_form').style.display = 'none';
    $('#modal_use_filter').style.display = 'none';
    
    // Configurar y mostrar el formulario de alerta
    const alertForm = $('#stock_alert_form');
    alertForm.style.display = 'flex';
    $('#modal_title').textContent = t.modal_stock_alert;
    
    // Limpiar y añadir un campo de artículo por defecto
    const container = $('#alert_items_container');
    container.innerHTML = '';
    window.addAlertItem();

    modal.style.display = 'flex';
};


/**
 * 2. Crea y añade un nuevo par de campos de Referencia y Cantidad.
 */
window.addAlertItem = function() {
    const container = $('#alert_items_container');
    const t = LANGS[currentLang].titles;
    
    const div = el('div');
    div.className = 'alert-item-group';
    
    // Input de Referencia
    const refInput = el('input');
    refInput.type = 'text';
    refInput.className = 'alert-ref-input';
    refInput.placeholder = t.alert_ref_placeholder;
    
    // Input de Cantidad
    const qtyInput = el('input');
    qtyInput.type = 'number';
    qtyInput.min = '1';
    qtyInput.className = 'alert-qty-input';
    qtyInput.placeholder = t.alert_qty_placeholder;
    qtyInput.value = '1';

    div.appendChild(refInput);
    div.appendChild(qtyInput);
    
    // Botón de eliminar (si hay más de uno)
    if (container.children.length > 0) {
        const deleteBtn = el('button');
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'X';
        deleteBtn.onclick = () => container.removeChild(div);
        deleteBtn.className = 'small btn-delete';
        div.appendChild(deleteBtn);
    }

    container.appendChild(div);
    refInput.focus();
};

/**
 * 3. Recopila los datos y envía el mensaje de WhatsApp.
 */
window.sendStockAlert = function() {
    const t = LANGS[currentLang].titles;
    const items = [];
    const itemGroups = document.querySelectorAll('#alert_items_container .alert-item-group');

    // 1. Recopilar datos
    itemGroups.forEach(group => {
        const refInput = group.querySelector('.alert-ref-input');
        const qtyInput = group.querySelector('.alert-qty-input');
        
        const refVal = refInput.value.trim();
        const qtyVal = parseInt(qtyInput.value.trim());

        if (refVal && qtyVal > 0) {
            items.push({ ref: refVal, qty: qtyVal });
        }
    });

    if (items.length === 0) {
        alert("Por favor, añade al menos un artículo con Referencia y Cantidad.");
        return;
    }

    // 2. Construir el mensaje
    let messageBody = "🚨 SOLICITUD DE PEDIDO DE STOCK 🚨\n\n";
    messageBody += "Lista de artículos a pedir:\n";
    
    items.forEach(item => {
        messageBody += `\n* ${item.ref} (Cant: ${item.qty})`;
    });

    messageBody += "\n\nPor favor, gestiona el pedido lo antes posible.";
    
    const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(messageBody)}`;
    
    // 3. Enviar y cerrar modal
    window.open(whatsappUrl, '_blank');
    $('#modal').style.display = 'none';

    // 4. Feedback (opcional)
    alert("Mensaje de WhatsApp generado con éxito.");
};


// ---- RENDER: MATERIALES (MODIFICADO) ----
function renderMateriales(data){
  lastMatData = data || {};
  const tbody = $('#mat_table_body'); 
  if(!tbody) return;
  tbody.innerHTML = '';
  
  const lang = LANGS[currentLang]; 
  const t = lang.titles; 

  // 1. Renderizar la tabla del DASHBOARD (Mini)
  Object.entries(data || {}).forEach(([id, item]) => {
    const qty = Number(item.qty) || 0;
    const refHtml = escapeHtml(item.ref);
    const tr = el('tr');

    let alertIcon = '';
    // Verificación y Botón de Alerta de Stock
    if (qty <= STOCK_ALERT_THRESHOLD) {
         alertIcon = `
            <span 
                class="alert-icon" 
                title="Stock Bajo: ${qty}. Haz clic para avisar por WhatsApp." 
                onclick="event.stopPropagation(); sendWhatsAppAlert('${refHtml}', ${qty}, 'material')">
                📞
            </span>
        `;
    }

    tr.innerHTML = `
      <td>${refHtml} ${alertIcon}</td>
      <td>${qty}</td>
      <td class="actions">
          <button class="btn-use-mat" data-id="${id}" data-ref="${refHtml}">${lang.use}</button> 
        <button class="btn-edit" data-id="${id}" data-type="material">${lang.edit}</button>
        <button class="btn-delete" data-id="${id}" data-type="material">${lang.delete}</button>
      </td>`;
    tbody.appendChild(tr);
  });
  
  // 2. Renderizar la tabla de la página COMPLETA (materiales_full)
  const full = $('#materiales_full');
  if(full) {
    // ... (Lógica de renderizado de tabla completa)
  }
  
  updateChartMateriales(data);
}

// ---- RENDER: FILTROS (MODIFICADO) ----
function renderFiltros(data){
  lastFilData = data || {};
  const tbody = $('#fil_table tbody'); 
  if(!tbody) return;
  tbody.innerHTML = '';

  const lang = LANGS[currentLang]; 
  const t = lang.titles;

  // 1. Renderizar la tabla del DASHBOARD
  Object.entries(data || {}).forEach(([id, item])=>{
    const qty = Number(item.qty) || 0;
    const refHtml = escapeHtml(item.ref);
    const tr = el('tr');
    const translatedCategory = escapeHtml(LANGS[currentLang].titles['cat_' + item.categoria] || item.categoria);
    
    let alertIcon = '';
    // Verificación y Botón de Alerta de Stock
    if (qty <= STOCK_ALERT_THRESHOLD) {
         alertIcon = `
            <span 
                class="alert-icon" 
                title="Stock Bajo: ${qty}. Haz clic para avisar por WhatsApp." 
                onclick="event.stopPropagation(); sendWhatsAppAlert('${refHtml}', ${qty}, 'filtro')">
                📞
            </span>
        `;
    }

    tr.innerHTML = `
      <td>${refHtml} ${alertIcon}</td>
      <td>${escapeHtml(item.brand)}</td>
      <td>${escapeHtml(item.model)}</td>
      <td>${translatedCategory}</td>
      <td>${qty}</td>
      <td class="actions">
        <button class="btn-use" data-id="${id}" data-ref="${refHtml}">${lang.use}</button>
        <button class="btn-edit" data-id="${id}" data-type="filtro">${lang.edit}</button>
        <button class="btn-delete" data-id="${id}" data-type="filtro">${lang.delete}</button>
      </td>`;
    tbody.appendChild(tr);
  });
  
  // 2. Renderizar la tabla de la página COMPLETA (filtros_full)
  const full = $('#filtros_full');
  if(full) {
    // ... (Lógica de renderizado de tabla completa)
  }
  
  updateChartFiltros(data);
}

// ---- RENDER: HISTORIAL DE USOS ----
function renderHistorial(data){
    lastHistData = data || {};
    const div = $('#hist_list'); if(!div) return;
    div.innerHTML = '';
    
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

    const sortedData = Object.entries(data || {}).sort(([, a], [, b]) => b.ts - a.ts);

    sortedData.forEach(([id, item]) => {
        const tr = el('tr');
        
        let vehicleText = '';
        if (item.categoria === 'material') {
            // Para materiales, carModel contiene la nota o "Stock General"
            vehicleText = escapeHtml(item.carModel); 
        } else {
            // Para filtros, se muestra la Marca y Modelo del Coche
            vehicleText = `${escapeHtml(item.carBrand || '')} ${escapeHtml(item.carModel || '')}`;
        }
        
        tr.innerHTML = `
            <td>${escapeHtml(item.ref)}</td>
            <td>${vehicleText}</td> 
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

// ---- LOGICA FIREBASE (Funciones ADD) ----
window.addMaterial = function(){
    const t = LANGS[currentLang].titles;
    const refVal = $('#mat_ref').value.trim();
    const qtyVal = parseInt($('#mat_qty').value.trim());

    if (!refVal || isNaN(qtyVal) || qtyVal < 0) {
        alert(t.alert_empty_ref);
        return;
    }
    push(matRef, { ref: refVal, qty: qtyVal });
    $('#mat_ref').value = '';
    $('#mat_qty').value = '';
};

window.addFiltro = function(){
    const t = LANGS[currentLang].titles;
    const refVal = $('#fil_ref_input').value.trim();
    const brandVal = $('#fil_brand_input').value.trim();
    const modelVal = $('#fil_model_input').value.trim();
    const categoriaVal = $('#fil_cat_select').value;
    const qtyVal = parseInt($('#fil_qty_input').value.trim());

    if (!refVal || !brandVal || isNaN(qtyVal) || qtyVal < 0) {
        alert(t.alert_full_fields);
        return;
    }
    push(filRef, { ref: refVal, brand: brandVal, model: modelVal, categoria: categoriaVal, qty: qtyVal });
    $('#fil_ref_input').value = '';
    $('#fil_brand_input').value = '';
    $('#fil_model_input').value = '';
    $('#fil_qty_input').value = '';
};

window.addNota = function(){
    const text = $('#nota_text').value.trim();
    if (!text) return;
    push(notRef, { text: text, ts: Date.now() });
    $('#nota_text').value = '';
};

// ---- LÓGICA DE USO DE MATERIAL ----
window.useMaterial = function(id, refText){
    const t = LANGS[currentLang].titles;
    const item = lastMatData[id];
    
    if(!item) {
        alert("Error: Material no encontrado.");
        return;
    }

    const currentQty = Number(item.qty) || 0;
    if (currentQty <= 0) {
        alert(t.alert_no_stock);
        return;
    }
    
    // Pedir una nota/vehículo usado (opcional)
    const note = prompt("Añade una nota o vehículo (Opcional):", "");

    // 1. ACTUALIZAR STOCK EN MATERIALES (Restar 1)
    update(ref(db, 'materiales/' + id), { qty: currentQty - 1 });

    // 2. AÑADIR REGISTRO AL HISTORIAL
    push(histRef, {
        ref: refText,
        carBrand: "Material", 
        carModel: (note && note.trim()) ? note.trim() : "Stock General", 
        categoria: "material", 
        ts: Date.now()  
    });
    
    alert(`Material ${refText} usado y registrado.`);
};


// ---- LÓGICA DE USO DE FILTRO ----

let currentFilterIdToUse = null; 

// 1. Muestra el modal de uso
window.useFilterModal = function(id, refText){
    const modal = $('#modal');
    const modalTitle = $('#modal_title');
    const modalUseForm = $('#modal_uso_form');
    const modalUseButton = $('#modal_use_filter');

    currentFilterIdToUse = id;

    // Ocultar formulario de alerta
    $('#stock_alert_form').style.display = 'none';

    modalUseForm.style.display = 'block';
    modalUseButton.style.display = 'inline-block';
    
    modalTitle.textContent = LANGS[currentLang].titles.use_fil;
    
    const refSelect = $('#use_ref_select');
    refSelect.innerHTML = '';
    const option = el('option');
    option.value = id;
    option.textContent = refText;
    refSelect.appendChild(option);
    refSelect.disabled = true; 

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

// ---- ELIMINAR y EDICIÓN (Simplificada) ----

window.deleteMaterial = function(id){ remove(ref(db, 'materiales/' + id)); };
window.deleteFiltro = function(id){ remove(ref(db, 'filtros/' + id)); };

window.editMaterial = function(id){
    const t = LANGS[currentLang].titles;
    const item = lastMatData[id] || { ref: '', qty: 0 };
    const newRef = prompt(t.ref + ':', item.ref); 
    if(newRef === null) return;
    const newQty = prompt(t.qty + ':', item.qty || 0); 
    if(newQty === null) return;
    update(ref(db,'materiales/'+id), { ref: newRef, qty: parseInt(newQty)||0 });
};
window.editFiltro = function(id){
    const t = LANGS[currentLang].titles;
    const item = lastFilData[id] || { ref:'', brand:'', model:'', categoria:'aceite', qty:0 };
    const newRef = prompt(t.ref + ':', item.ref); if(newRef===null) return; 
    const newBrand = prompt(t.brand + ':', item.brand); if(newBrand===null) return; 
    const newModel = prompt(t.model + ':', item.model); if(newModel===null) return; 
    // La categoría se edita usando un valor simple para simplificar la UI de prompt
    const newCat = prompt(`${t.category} (aceite/aire/habitaculos/combustible):`, item.categoria); if(newCat===null) return; 
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
      return window.useFilterModal(idVal, refText);
  }

  if (btn.classList.contains('btn-use-mat') && idVal) {
      return window.useMaterial(idVal, refText);
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

onValue(histRef, snapshot => {
    const data = snapshot.val() || {};
    renderHistorial(data);
});


// ---- CHARTS (Gráficos) ----
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
  
  // Conexión del botón de "Aviso de Stock" (sidebar)
  const stockAlertBtn = document.getElementById('stock_alert_btn');
  if(stockAlertBtn) stockAlertBtn.onclick = window.openStockAlertModal;
  
  // Conexión de los botones del modal de Alerta de Stock
  const alertAddItemBtn = document.getElementById('alert_add_item_btn');
  if(alertAddItemBtn) alertAddItemBtn.onclick = window.addAlertItem;
  const alertSendBtn = document.getElementById('alert_send_btn');
  if(alertSendBtn) alertSendBtn.onclick = window.sendStockAlert;


  // Conexión del botón "Cerrar" del modal para limpiar el estado
  const modalCloseBtn = document.getElementById('modal_close');
  if(modalCloseBtn) modalCloseBtn.onclick = () => {
        $('#modal').style.display = 'none';
        // Asegurarse de ocultar todos los formularios al cerrar
        $('#modal_uso_form').style.display = 'none';
        $('#stock_alert_form').style.display = 'none';
  };

  applyLang(); 
};
