// ==============================
//  Firebase Config
// ==============================
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyASKKdLTodvjx9m_7nPz09ATbeKLiDM-fs",
  authDomain: "officinaweb-39828.firebaseapp.com",
  databaseURL: "https://officinaweb-39828-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "officinaweb-39828",
  storageBucket: "officinaweb-39828.appspot.com",
  messagingSenderId: "888087946199",
  appId: "1:888087946199:web:a2edfe3f2e3149eea9c279"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==============================
// Helpers
// ==============================
const $ = (sel) => document.querySelector(sel);
const el = (tag) => document.createElement(tag);
const escapeHtml = (t) =>
  t ? t.replace(/[<>&"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;"
  }[c])) :
  "";

// ==============================
// Navigation
// ==============================
window.navigate = function (page) {
  document.querySelectorAll(".page").forEach((p) => p.style.display = "none");
  document.getElementById(page).style.display = "block";
};

// ==============================
// Global data cache
// ==============================
let lastMatData = {};
let lastFilData = {};

// ==============================
// Save Material
// ==============================
$("#mat_save").addEventListener("click", () => {
  const refVal = $("#mat_ref").value.trim();
  const qty = Number($("#mat_qty").value);

  if (!refVal || qty < 0) {
    alert("Datos inválidos");
    return;
  }

  push(ref(db, "materiales"), {
    ref: refVal,
    qty
  });

  $("#mat_ref").value = "";
  $("#mat_qty").value = "";
});

// ==============================
// Save Filtro
// ==============================
$("#fil_save").addEventListener("click", () => {
  const refVal = $("#fil_ref").value.trim();
  const brand = $("#fil_brand").value.trim();
  const model = $("#fil_model").value.trim();
  const categoria = $("#fil_cat").value.trim();
  const qty = Number($("#fil_qty").value);

  if (!refVal || !brand || !model || !categoria || qty < 0) {
    alert("Datos inválidos");
    return;
  }

  push(ref(db, "filtros"), {
    ref: refVal,
    brand,
    model,
    categoria,
    qty
  });

  $("#fil_ref").value = "";
  $("#fil_brand").value = "";
  $("#fil_model").value = "";
  $("#fil_cat").value = "";
  $("#fil_qty").value = "";
});

// ==============================
// Delete functions
// ==============================
window.deleteMaterial = function (id) {
  if (confirm("¿Eliminar material?")) {
    remove(ref(db, "materiales/" + id));
  }
};

window.deleteFiltro = function (id) {
  if (confirm("¿Eliminar filtro?")) {
    remove(ref(db, "filtros/" + id));
  }
};

// ==============================
// EDIT MATERIAL
// ==============================
window.editMaterial = function (id) {
  const item = lastMatData[id];
  if (!item) return;

  const newRef = prompt("Nueva referencia:", item.ref);
  if (newRef === null) return;

  const newQty = prompt("Nueva cantidad:", item.qty);
  if (newQty === null) return;

  update(ref(db, "materiales/" + id), {
    ref: newRef,
    qty: Number(newQty)
  });
};

// ==============================
// EDIT FILTRO
// ==============================
window.editFiltro = function (id) {
  const item = lastFilData[id];
  if (!item) return;

  const newRef = prompt("Nueva referencia:", item.ref);
  if (newRef === null) return;

  const newBrand = prompt("Nueva marca:", item.brand);
  if (newBrand === null) return;

  const newModel = prompt("Nuevo modelo:", item.model);
  if (newModel === null) return;

  const newCat = prompt("Nueva categoría (aceite/aire/habitaculos/combustible):", item.categoria);
  if (newCat === null) return;

  const newQty = prompt("Nueva cantidad:", item.qty);
  if (newQty === null) return;

  update(ref(db, "filtros/" + id), {
    ref: newRef,
    brand: newBrand,
    model: newModel,
    categoria: newCat,
    qty: Number(newQty)
  });
};

// ==============================
// RENDER MATERIALS
// ==============================
function renderMateriales(data) {
  lastMatData = data || {};

  const tbody = $("#mat_table tbody");
  tbody.innerHTML = "";

  Object.entries(lastMatData).forEach(([id, item]) => {
    const tr = el("tr");

    tr.innerHTML = `
      <td>${escapeHtml(item.ref)}</td>
      <td>${item.qty}</td>
      <td>
        <button class="btn-edit" onclick="editMaterial('${id}')">Editar</button>
        <button class="btn-delete" onclick="deleteMaterial('${id}')">Eliminar</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  updateChartMateriales(lastMatData);
}

// ==============================
// RENDER FILTROS
// ==============================
function renderFiltros(data) {
  lastFilData = data || {};

  const tbody = $("#fil_table tbody");
  tbody.innerHTML = "";

  Object.entries(lastFilData).forEach(([id, item]) => {
    const tr = el("tr");

    tr.innerHTML = `
      <td>${escapeHtml(item.ref)}</td>
      <td>${escapeHtml(item.brand)}</td>
      <td>${escapeHtml(item.model)}</td>
      <td>${escapeHtml(item.categoria)}</td>
      <td>${item.qty}</td>
      <td>
        <button class="btn-edit" onclick="editFiltro('${id}')">Editar</button>
        <button class="btn-delete" onclick="deleteFiltro('${id}')">Eliminar</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  updateChartFiltros(lastFilData);
}

// ==============================
// LISTENERS FIREBASE
// ==============================
onValue(ref(db, "materiales"), (snap) => {
  renderMateriales(snap.val());
});

onValue(ref(db, "filtros"), (snap) => {
  renderFiltros(snap.val());
});

// ==============================
// CHARTS
// ==============================
let chartMateriales = null;
let chartFiltros = null;

function updateChartMateriales(data) {
  const labels = Object.values(data).map(i => i.ref);
  const values = Object.values(data).map(i => i.qty);

  if (chartMateriales) chartMateriales.destroy();

  chartMateriales = new Chart($("#chartMateriales"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Cantidad",
        data: values
      }]
    }
  });
}

function updateChartFiltros(data) {
  const labels = Object.values(data).map(i => i.ref);
  const values = Object.values(data).map(i => i.qty);

  if (chartFiltros) chartFiltros.destroy();

  chartFiltros = new Chart($("#chartFiltros"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Cantidad",
        data: values
      }]
    }
  });
}
