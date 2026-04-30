const STORAGE_KEY = "cs-skins-transactions";

const fallbackSkins = [
  "AK-47 | Redline",
  "AWP | Asiimov",
  "M4A1-S | Printstream",
  "USP-S | Kill Confirmed",
  "Glock-18 | Gamma Doppler",
  "Desert Eagle | Blaze",
  "Karambit | Doppler",
  "Butterfly Knife | Fade",
];

const modal = document.querySelector("#transactionModal");
const form = document.querySelector("#transactionForm");
const openButton = document.querySelector("#openTransaction");
const closeButton = document.querySelector("#closeTransaction");
const cancelButton = document.querySelector("#cancelTransaction");
const skinGrid = document.querySelector("#skinGrid");
const emptyState = document.querySelector("#emptyState");
const totalSkins = document.querySelector("#totalSkins");
const totalInvested = document.querySelector("#totalInvested");
const totalSold = document.querySelector("#totalSold");
const totalPnl = document.querySelector("#totalPnl");
const skinSearchResults = document.querySelector("#skinSearchResults");
const purchaseDate = document.querySelector("#purchaseDate");
const skinNameInput = document.querySelector("#skinName");
const skinIdInput = document.querySelector("#skinId");
const skinRarityInput = document.querySelector("#skinRarity");
const skinRarityColorInput = document.querySelector("#skinRarityColor");
const skinPreview = document.querySelector("#skinPreview");
const skinPreviewImage = document.querySelector("#skinPreviewImage");
const skinPreviewName = document.querySelector("#skinPreviewName");
const skinPreviewRarity = document.querySelector("#skinPreviewRarity");
const saleModal = document.querySelector("#saleModal");
const saleForm = document.querySelector("#saleForm");
const closeSale = document.querySelector("#closeSale");
const cancelSale = document.querySelector("#cancelSale");
const saleSkinTitle = document.querySelector("#saleSkinTitle");
const saleTransactionId = document.querySelector("#saleTransactionId");
const salePrice = document.querySelector("#salePrice");
const saleFee = document.querySelector("#saleFee");
const saleDate = document.querySelector("#saleDate");

let transactions = loadTransactions();
let knownSkins = [];
let skinSearchTimer = null;
let skinSearchController = null;

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

openButton.addEventListener("click", async () => {
  form.reset();
  purchaseDate.valueAsDate = new Date();
  modal.showModal();
  await loadSkinSuggestions();
  skinNameInput.focus();
});

closeButton.addEventListener("click", () => modal.close());
cancelButton.addEventListener("click", () => modal.close());
closeSale.addEventListener("click", () => saleModal.close());
cancelSale.addEventListener("click", () => saleModal.close());

skinNameInput.addEventListener("change", () => {
  applySelectedSkin();
});

skinNameInput.addEventListener("input", () => {
  skinIdInput.value = "";
  skinRarityInput.value = "";
  skinRarityColorInput.value = "";
  hideSkinPreview();

  clearTimeout(skinSearchTimer);
  skinSearchTimer = setTimeout(() => {
    loadSkinSuggestions(skinNameInput.value);
  }, 220);
});

skinNameInput.addEventListener("focus", () => {
  if (knownSkins.length > 0) {
    renderSkinSearchResults();
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".skin-search")) {
    hideSkinSearchResults();
  }
});

skinSearchResults.addEventListener("click", (event) => {
  const option = event.target.closest("[data-skin-index]");
  if (!option) return;

  const selected = knownSkins[Number(option.dataset.skinIndex)];
  if (!selected) return;

  skinNameInput.value = selected.name;
  fillSkinFields(selected);
  showSkinPreview(selected);
  hideSkinSearchResults();
  skinNameInput.focus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await hydrateSkinFromApi();

  const formData = new FormData(form);
  const transaction = {
    id: crypto.randomUUID(),
    skinId: formData.get("skinId"),
    skinName: formData.get("skinName").trim(),
    skinRarity: formData.get("skinRarity"),
    skinRarityColor: formData.get("skinRarityColor"),
    buyPrice: Number(formData.get("buyPrice")) || 0,
    purchaseDate: formData.get("purchaseDate") || new Date().toISOString().slice(0, 10),
    skinImage: getSelectedSkinImage(formData.get("skinName")),
    notes: formData.get("notes").trim(),
  };

  transactions = [transaction, ...transactions];
  saveTransactions();
  render();
  modal.close();
});

skinGrid.addEventListener("click", (event) => {
  const saleButton = event.target.closest("[data-sale-id]");
  if (saleButton) {
    openSaleModal(saleButton.dataset.saleId);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-id]");
  if (!deleteButton) return;

  transactions = transactions.filter((transaction) => transaction.id !== deleteButton.dataset.deleteId);
  saveTransactions();
  render();
});

saleForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(saleForm);
  const transactionId = formData.get("saleTransactionId");
  const nextSalePrice = Number(formData.get("salePrice")) || 0;
  const nextSaleFee = Number(formData.get("saleFee")) || 0;
  const nextSaleDate = formData.get("saleDate") || new Date().toISOString().slice(0, 10);

  transactions = transactions.map((transaction) => {
    if (transaction.id !== transactionId) return transaction;
    return {
      ...transaction,
      salePrice: nextSalePrice,
      saleFee: nextSaleFee,
      saleDate: nextSaleDate,
    };
  });

  saveTransactions();
  render();
  saleModal.close();
});

function loadTransactions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function render() {
  emptyState.hidden = transactions.length > 0;
  skinGrid.innerHTML = transactions.map(createSkinCard).join("");

  const invested = transactions.reduce((sum, transaction) => sum + transaction.buyPrice, 0);
  const sold = transactions.reduce((sum, transaction) => {
    if (!hasSale(transaction)) return sum;
    return sum + getNetSale(transaction);
  }, 0);
  const pnl = transactions.reduce((sum, transaction) => {
    if (!hasSale(transaction)) return sum;
    return sum + getPnl(transaction);
  }, 0);

  totalSkins.textContent = transactions.length;
  totalInvested.textContent = moneyFormatter.format(invested);
  totalSold.textContent = moneyFormatter.format(sold);
  totalPnl.textContent = moneyFormatter.format(pnl);
  totalPnl.className = getPnlClass(pnl);
}

function createSkinCard(transaction) {
  const image = transaction.skinImage
    ? `<img src="${escapeAttribute(transaction.skinImage)}" alt="${escapeAttribute(transaction.skinName)}" loading="lazy" />`
    : `<span class="skin-placeholder" aria-hidden="true">${escapeHtml(getInitials(transaction.skinName))}</span>`;

  const notes = transaction.notes
    ? `<p class="notes">${escapeHtml(transaction.notes)}</p>`
    : "";
  const saleLabel = hasSale(transaction) ? "Editar venda" : "Venda";
  const saleBlock = hasSale(transaction)
    ? `
      <div>
        <span class="meta-label">Venda</span>
        <strong>${moneyFormatter.format(getNetSale(transaction))} em ${formatDate(transaction.saleDate)}</strong>
        <span class="meta-label">Bruto ${moneyFormatter.format(transaction.salePrice)} - taxa ${moneyFormatter.format(getSaleFee(transaction))}</span>
      </div>
    `
    : "";
  const pnlValue = hasSale(transaction) ? getPnl(transaction) : 0;
  const pnlText = hasSale(transaction)
    ? `${moneyFormatter.format(pnlValue)} (${formatProfitPercent(transaction)}%)`
    : "Aguardando venda";
  const pnlClass = hasSale(transaction) ? getPnlClass(pnlValue) : "";
  return `
    <article class="skin-card">
      <button class="sale-button" type="button" data-sale-id="${transaction.id}">
        ${saleLabel}
      </button>
      <div class="skin-image">${image}</div>
      <div class="skin-content">
        <h3 class="skin-title">${escapeHtml(transaction.skinName)}</h3>
        <div class="skin-meta">
          <div>
            <span class="meta-label">Compra</span>
            <strong>${moneyFormatter.format(transaction.buyPrice)}</strong>
          </div>
          <div>
            <span class="meta-label">Data</span>
            <strong>${formatDate(transaction.purchaseDate)}</strong>
          </div>
          ${saleBlock}
          <div>
            <span class="meta-label">PnL</span>
            <strong class="${pnlClass}">${pnlText}</strong>
          </div>
          ${notes}
        </div>
        <button class="delete-button" type="button" data-delete-id="${transaction.id}">
          Remover
        </button>
      </div>
    </article>
  `;
}

function openSaleModal(transactionId) {
  const transaction = transactions.find((item) => item.id === transactionId);
  if (!transaction) return;

  saleForm.reset();
  saleSkinTitle.textContent = transaction.skinName;
  saleTransactionId.value = transaction.id;
  salePrice.value = transaction.salePrice ?? "";
  saleFee.value = transaction.saleFee ?? "";
  saleDate.value = transaction.saleDate ?? new Date().toISOString().slice(0, 10);
  saleModal.showModal();
  salePrice.focus();
}

function hasSale(transaction) {
  return Number.isFinite(transaction.salePrice);
}

function getPnl(transaction) {
  return getNetSale(transaction) - transaction.buyPrice;
}

function getNetSale(transaction) {
  return transaction.salePrice - getSaleFee(transaction);
}

function getSaleFee(transaction) {
  return Number(transaction.saleFee) || 0;
}

function getPnlClass(value) {
  if (value > 0) return "pnl-positive";
  if (value < 0) return "pnl-negative";
  return "";
}

function formatProfitPercent(transaction) {
  if (transaction.buyPrice <= 0) return "0,00";

  const percent = (getPnl(transaction) / transaction.buyPrice) * 100;
  return percent.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function getInitials(name) {
  return name
    .split(/[\s|-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

async function loadSkinSuggestions(query = "") {
  knownSkins = fallbackSkins.map((name) => ({ name }));

  try {
    skinSearchController?.abort();
    skinSearchController = new AbortController();

    const params = new URLSearchParams({
      limit: query ? "30" : "700",
    });

    if (query.trim()) {
      params.set("q", query.trim());
    }

    const response = await fetch(`/api/skins?${params}`, {
      signal: skinSearchController.signal,
    });

    if (!response.ok) throw new Error("API unavailable");
    const discovered = await response.json();
    knownSkins = [...discovered, ...knownSkins]
      .filter((skin, index, all) => all.findIndex((item) => item.name === skin.name) === index)
      .slice(0, 700);

    if (query.trim()) {
      applySelectedSkin();
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    // If the API is not running, the manual form still works with fallback suggestions.
  }

  renderSkinSearchResults();
}

function applySelectedSkin() {
  const selected = knownSkins.find((skin) => skin.name === skinNameInput.value);
  if (!selected) return;

  fillSkinFields(selected);
  showSkinPreview(selected);
}

async function hydrateSkinFromApi() {
  applySelectedSkin();

  if (getSelectedSkinImage(skinNameInput.value) || !skinNameInput.value.trim()) return;

  try {
    const params = new URLSearchParams({ name: skinNameInput.value.trim() });
    const response = await fetch(`/api/skin-image?${params}`);
    if (!response.ok) return;

    const skin = await response.json();
    knownSkins = [skin, ...knownSkins].filter(
      (item, index, all) => all.findIndex((candidate) => candidate.name === item.name) === index,
    );
    fillSkinFields(skin);
    showSkinPreview(skin);
  } catch {
    // Manual transactions remain available even without API metadata.
  }
}

function fillSkinFields(skin) {
  skinIdInput.value = skin.id ?? "";
  skinRarityInput.value = skin.rarity ?? "";
  skinRarityColorInput.value = skin.rarityColor ?? "";
}

function getSelectedSkinImage(skinName) {
  const selected = knownSkins.find((skin) => skin.name === skinName);
  return selected?.image ?? "";
}

function showSkinPreview(skin) {
  if (!skin.image) {
    hideSkinPreview();
    return;
  }

  skinPreview.hidden = false;
  skinPreviewImage.src = skin.image;
  skinPreviewImage.alt = skin.name;
  skinPreviewName.textContent = skin.name;
  skinPreviewRarity.textContent = skin.rarity || "Raridade nao informada";
  skinPreviewRarity.style.color = skin.rarityColor || "";
}

function hideSkinPreview() {
  skinPreview.hidden = true;
  skinPreviewImage.removeAttribute("src");
  skinPreviewImage.alt = "";
  skinPreviewName.textContent = "";
  skinPreviewRarity.textContent = "";
  skinPreviewRarity.style.color = "";
}

function renderSkinSearchResults() {
  const visibleSkins = knownSkins.filter((skin) => skin.image).slice(0, 8);

  if (visibleSkins.length === 0 || !skinNameInput.value.trim()) {
    hideSkinSearchResults();
    return;
  }

  skinSearchResults.hidden = false;
  skinSearchResults.innerHTML = visibleSkins
    .map((skin, index) => {
      const originalIndex = knownSkins.indexOf(skin);
      const rarity = skin.rarity || "Raridade nao informada";

      return `
        <button class="skin-search-option" type="button" data-skin-index="${originalIndex}">
          <span class="skin-search-thumb">
            <img src="${escapeAttribute(skin.image)}" alt="${escapeAttribute(skin.name)}" loading="lazy" />
          </span>
          <span>
            <strong>${escapeHtml(skin.name)}</strong>
            <small style="color: ${escapeAttribute(skin.rarityColor || "#99a8a3")}">${escapeHtml(rarity)}</small>
          </span>
        </button>
      `;
    })
    .join("");
}

function hideSkinSearchResults() {
  skinSearchResults.hidden = true;
  skinSearchResults.innerHTML = "";
}

render();
