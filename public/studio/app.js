const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

const state = {
  studioConfig: null,
  catalog: null,
  lastPayFetchResult: null,
  lastReceipt: null,
};

const fallbackResources = [
  {
    id: "rwa-alpha",
    label: "RWA Alpha Signal",
    method: "GET",
    url: "http://localhost:4021/alpha/rwa",
    price: "0.003 USDC",
    body: null,
  },
  {
    id: "research-summary",
    label: "Research Summarizer",
    method: "POST",
    url: "http://localhost:4021/research/summarize",
    price: "0.005 USDC",
    body: { prompt: "Summarize why x402 matters for Pharos AI agents" },
  },
];

function pretty(value) {
  return JSON.stringify(value ?? {}, null, 2);
}

function nowLabel() {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function log(message, payload) {
  const list = $("#eventLog");
  if (!list) return;
  const item = document.createElement("li");
  item.innerHTML = `<time>${nowLabel()}</time><span>${escapeHtml(message)}</span>`;
  if (payload !== undefined) {
    const pre = document.createElement("pre");
    pre.className = "code-block small";
    pre.textContent = typeof payload === "string" ? payload : pretty(payload);
    item.append(pre);
  }
  list.prepend(item);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

async function requestJson(url, options = {}) {
  const { allowHttpError = false, ...fetchOptions } = options;
  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      ...(fetchOptions.body ? { "content-type": "application/json" } : {}),
      ...(fetchOptions.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok && !allowHttpError) {
    const message = typeof data === "object" && data && "error" in data ? data.error : response.statusText;
    const error = new Error(`${response.status} ${message}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function resourceList() {
  return state.studioConfig?.demoResources?.length ? state.studioConfig.demoResources : fallbackResources;
}

function selectedResource() {
  const value = $("#resourceSelect").value;
  return resourceList().find((resource) => resource.id === value) || null;
}

function setStep(step, status) {
  const element = document.querySelector(`[data-step="${step}"]`);
  if (!element) return;
  element.classList.remove("active", "done", "error");
  if (status) element.classList.add(status);

  const label = element.querySelector(".step-footer span");
  const time = element.querySelector(".step-footer em");
  if (label) {
    label.textContent = status === "done" ? "Completed" : status === "active" ? "In Progress" : status === "error" ? "Failed" : "Ready";
  }
  if (time && status === "done") {
    time.textContent = `${Math.floor(110 + Math.random() * 740)}ms`;
  } else if (time && status === "active") {
    time.textContent = "…";
  }
}

function resetSteps() {
  $$(".flow-step").forEach((step) => step.classList.remove("active", "done", "error"));
  $$(".step-footer span").forEach((label) => { label.textContent = "Ready"; });
  $$(".step-footer em").forEach((label) => { label.textContent = "—"; });
  setText("#flowSummary", "Payment Required");
}

function setBusy(isBusy) {
  ["#runDemoButton", "#discoverButton", "#payFetchButton", "#decodeButton", "#refreshButton"].forEach((selector) => {
    const element = $(selector);
    if (element) element.disabled = isBusy;
  });
}

function showResponse(result) {
  state.lastPayFetchResult = result;
  setText("#responseJson", pretty(result));
  setText("#responseStatus", result.ok ? `HTTP ${result.status}` : `Error ${result.status ?? ""}`);

  const data = result.data;
  const preview = $("#dataPreview");
  if (!result.ok) {
    preview.className = "data-preview";
    preview.innerHTML = `<strong>Payment flow failed.</strong><span>${escapeHtml(result.error || "Check the JSON output and console trace.")}</span>`;
    return;
  }

  if (data?.signal) {
    preview.className = "data-preview";
    preview.innerHTML = `
      <strong>${escapeHtml(data.signal.assetClass || "Premium alpha unlocked")}</strong>
      <span>${escapeHtml(data.signal.thesis || "Paid response returned successfully.")}</span>
      <div class="data-chips">
        <span>${escapeHtml(data.signal.sentiment || "signal")}</span>
        <span>confidence ${escapeHtml(data.signal.confidence ?? "n/a")}</span>
        <span>${escapeHtml(data.signal.suggestedAgentAction || "agent action")}</span>
      </div>
    `;
    return;
  }

  if (data?.summary) {
    const bullets = Array.isArray(data.summary.bullets) ? data.summary.bullets : [];
    preview.className = "data-preview";
    preview.innerHTML = `
      <strong>Research summary unlocked</strong>
      <span>${escapeHtml(data.summary.prompt || "Paid summary response")}</span>
      <div class="data-chips">${bullets.slice(0, 3).map((bullet) => `<span>${escapeHtml(bullet)}</span>`).join("")}</div>
    `;
    return;
  }

  preview.className = "data-preview";
  preview.innerHTML = `<strong>Paid response unlocked.</strong><span>The protected endpoint returned JSON data.</span>`;
}

function showReceipt(receipt) {
  state.lastReceipt = receipt || null;
  setText("#receiptJson", pretty(receipt || {}));

  if (!receipt) {
    setText("#receiptValue", "No payment yet");
    setText("#receiptSubValue", "Waiting for payment");
    setText("#receiptMode", "Pending");
    setText("#receiptTx", "—");
    setText("#receiptNetwork", "—");
    setText("#receiptPayer", "—");
    setText("#receiptAmount", "—");
    return;
  }

  setText("#receiptValue", receipt.transaction || "receipt");
  setText("#receiptSubValue", receipt.success ? "Payment Successful" : "Payment response");
  setText("#receiptMode", receipt.success ? "Verified" : (receipt.mode || "Receipt"));
  setText("#receiptTx", receipt.transaction || "—");
  setText("#receiptNetwork", receipt.network || "—");
  setText("#receiptPayer", receipt.payer || "—");
  setText("#receiptAmount", receipt.amount ? `${receipt.amount} atomic USDC` : "—");
}

function syncResourceFields() {
  const resource = selectedResource();
  const isCustom = $("#resourceSelect").value === "custom";
  $("#urlInput").disabled = !isCustom;

  if (resource) {
    $("#urlInput").value = resource.url;
    $("#methodInput").value = resource.method;
    if (resource.body) {
      $("#bodyInput").value = pretty(resource.body);
    }
  }

  const method = $("#methodInput").value;
  $("#bodyField").classList.toggle("hidden", method === "GET" || method === "HEAD");
  setText("#methodPreview", method);

  const price = resource?.price || "custom";
  setText("#pricePreview", price);
  const numericPrice = typeof price === "string" ? price.replace(/\s*USDC$/i, "") : "0.003";
  setText("#payAmountPreview", numericPrice === "custom" ? "—" : numericPrice);
}

function buildRequestInput() {
  const method = $("#methodInput").value;
  const bodyText = $("#bodyInput").value.trim();
  let body;
  if (method !== "GET" && method !== "HEAD" && bodyText.length) {
    try {
      body = JSON.parse(bodyText);
    } catch (error) {
      throw new Error(`Invalid JSON body: ${error.message}`);
    }
  }

  return {
    url: $("#urlInput").value.trim(),
    method,
    mode: $("#modeInput").value,
    maxUsd: Number($("#maxUsdInput").value),
    idempotencyKey: $("#idempotencyInput").value.trim() || undefined,
    ...(body === undefined ? {} : { body }),
  };
}

async function loadStudioConfig() {
  try {
    const [config, health, catalog] = await Promise.all([
      requestJson("/studio/config"),
      requestJson("/health"),
      requestJson("/skills/catalog"),
    ]);
    state.studioConfig = config;
    state.catalog = catalog;
    renderConfig(config, health, catalog);
    renderResourceOptions(config.demoResources || fallbackResources);
    renderCatalog(catalog);
    log("Studio connected to Skill API", { health, config: config.defaults });
  } catch (error) {
  $("#skillStatus").classList.add("offline");
    if ($("#skillStatus")?.lastChild) $("#skillStatus").lastChild.textContent = " Skill API offline";
    log("Could not load Studio config", error.data || error.message);
  }
}

function renderConfig(config, health, catalog) {
  const defaults = config.defaults || {};
  $("#skillStatus").classList.remove("offline");
  if ($("#skillStatus")?.lastChild) $("#skillStatus").lastChild.textContent = " Skill API live";
  setText("#modeBadge", `${defaults.mode || "mock"} mode`);
  $("#modeInput").value = defaults.mode || "mock";
  setText("#networkValue", defaults.network || health.network || catalog.network || "eip155:688689");
  setText("#sidebarNetwork", defaults.network || catalog.network || "eip155:688689");
  setText("#chainValue", `Chain ID ${defaults.chainId || catalog.chainId || "688689"}`);
  setText("#assetValue", shortAddress(defaults.asset || catalog.defaultAsset || "USDC"));
  setText("#budgetValue", `$${defaults.maxUsd || 0.01}`);
  $("#maxUsdInput").value = defaults.maxUsd || 0.01;
}

function renderResourceOptions(resources) {
  const select = $("#resourceSelect");
  const current = select.value;
  select.innerHTML = "";
  for (const resource of resources) {
    const option = document.createElement("option");
    option.value = resource.id;
    option.textContent = `${resource.label} · ${resource.method} · ${resource.price}`;
    select.append(option);
  }
  const custom = document.createElement("option");
  custom.value = "custom";
  custom.textContent = "Custom x402 URL";
  select.append(custom);
  if ([...select.options].some((option) => option.value === current)) select.value = current;
  syncResourceFields();
}

function renderCatalog(catalog) {
  const container = $("#skillsCatalog");
  if (!catalog?.skills?.length) {
    container.innerHTML = `<div class="skill-item"><small>No catalog loaded yet.</small></div>`;
    return;
  }

  container.innerHTML = catalog.skills.map((skill) => `
    <div class="skill-item">
      <strong>${escapeHtml(skill.id)}</strong>
      <span>${escapeHtml(skill.endpoint)}</span>
      <small>${escapeHtml(skill.description)}</small>
    </div>
  `).join("");
}

function shortAddress(value) {
  if (!value || typeof value !== "string") return "USDC";
  if (!value.startsWith("0x") || value.length < 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function setNewIdempotencyKey() {
  const suffix = Math.random().toString(16).slice(2, 10);
  const resource = selectedResource()?.id || "custom";
  $("#idempotencyInput").value = `studio-${resource}-${suffix}`;
}

async function discoverFlow() {
  const input = buildRequestInput();
  resetSteps();
  setStep("discover", "active");
  setText("#flowSummary", "Probing resource for HTTP 402 requirements…");
  log("Discovering paid resource", { url: input.url, method: input.method });

  const result = await requestJson("/skills/discover", {
    method: "POST",
    body: JSON.stringify({
      url: input.url,
      method: input.method,
      ...(input.body === undefined ? {} : { body: input.body }),
    }),
  });

  setStep("discover", result.requiresPayment ? "done" : "error");
  if (result.requiresPayment) {
    setStep("budget", "active");
    setText("#flowSummary", `Payment required: ${result.price || "unknown"} USDC on ${result.network || "Pharos"}`);
  } else {
    setText("#flowSummary", `No payment required. HTTP ${result.status}`);
  }
  setText("#responseJson", pretty(result));
  setText("#responseStatus", `HTTP ${result.status}`);
  log("Discovery complete", result);
  return result;
}

async function payFetchFlow({ skipDiscover = false } = {}) {
  const input = buildRequestInput();
  if (!Number.isFinite(input.maxUsd) || input.maxUsd <= 0) {
    throw new Error("Max USD must be a positive number.");
  }

  if (!skipDiscover) {
    await discoverFlow();
  }

  setStep("budget", "done");
  setStep("payment", "active");
  setText("#flowSummary", "Creating x402 payment payload and retrying request…");
  log("Calling pay-fetch skill", input);

  const result = await requestJson("/skills/pay-fetch", {
    method: "POST",
    body: JSON.stringify(input),
    allowHttpError: true,
  });

  if (result.ok) {
    setStep("payment", "done");
    setStep("data", "done");
    setStep("receipt", result.receipt ? "done" : "active");
    setText("#flowSummary", result.receipt
      ? "Paid data unlocked and receipt stored."
      : "Data fetched; no payment receipt header was returned.");
  } else {
    setStep("payment", "error");
    setStep("data", "error");
    setText("#flowSummary", result.error || "Payment request failed.");
  }

  showResponse(result);
  showReceipt(result.receipt);
  log("pay-fetch result", result);
  return result;
}

async function decodeReceiptFlow() {
  const rawHeader = state.lastReceipt?.rawHeader;
  if (!rawHeader) {
    throw new Error("No raw PAYMENT-RESPONSE header available yet. Run Pay & fetch first.");
  }

  log("Decoding PAYMENT-RESPONSE header");
  const decoded = await requestJson("/skills/decode-receipt", {
    method: "POST",
    body: JSON.stringify({ rawHeader }),
  });
  showReceipt(decoded);
  setStep("receipt", "done");
  log("Decoded receipt", decoded);
}

async function withBusy(action) {
  try {
    setBusy(true);
    await action();
  } catch (error) {
    const payload = error.data || error.message || String(error);
    setText("#responseStatus", "error");
    setText("#responseJson", pretty(payload));
    setText("#flowSummary", error.message || "Action failed");
    const activeStep = document.querySelector(".flow-step.active");
    if (activeStep) {
      activeStep.classList.remove("active");
      activeStep.classList.add("error");
    }
    log("Action failed", payload);
  } finally {
    setBusy(false);
  }
}

function bindEvents() {
  $("#resourceSelect").addEventListener("change", () => {
    syncResourceFields();
    setNewIdempotencyKey();
  });
  $("#methodInput").addEventListener("change", syncResourceFields);
  $("#newKeyButton").addEventListener("click", setNewIdempotencyKey);
  $("#refreshButton").addEventListener("click", () => withBusy(loadStudioConfig));
  $("#loadCatalogButton").addEventListener("click", () => withBusy(async () => {
    state.catalog = await requestJson("/skills/catalog");
    renderCatalog(state.catalog);
    log("Reloaded skill catalog", state.catalog);
  }));
  $("#clearLogButton").addEventListener("click", () => {
    $("#eventLog").innerHTML = "";
  });
  $("#discoverButton").addEventListener("click", () => withBusy(discoverFlow));
  $("#decodeButton").addEventListener("click", () => withBusy(decodeReceiptFlow));
  $("#runDemoButton").addEventListener("click", () => withBusy(async () => {
    if ($("#resourceSelect").value === "custom") {
      $("#resourceSelect").value = "rwa-alpha";
      syncResourceFields();
    }
    setNewIdempotencyKey();
    await payFetchFlow({ skipDiscover: false });
  }));
  $("#requestForm").addEventListener("submit", (event) => {
    event.preventDefault();
    withBusy(() => payFetchFlow({ skipDiscover: false }));
  });
}

bindEvents();
syncResourceFields();
setNewIdempotencyKey();
showReceipt(null);
loadStudioConfig();
