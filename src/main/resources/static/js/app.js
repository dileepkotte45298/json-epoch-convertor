// ===== State =====
const state = {
    selectedFields: new Set(),
    lastTransformedJson: '',
    allTimezones: ['UTC'],
};

// ===== DOM refs =====
const jsonInput        = document.getElementById('jsonInput');
const jsonHint         = document.getElementById('jsonHint');
const detectBtn        = document.getElementById('detectBtn');
const clearJsonBtn     = document.getElementById('clearJsonBtn');
const fieldChips       = document.getElementById('fieldChips');
const manualField      = document.getElementById('manualField');
const addFieldBtn      = document.getElementById('addFieldBtn');
const timezoneSearch   = document.getElementById('timezoneSearch');
const timezoneSelect   = document.getElementById('timezoneSelect');
const dateFormat       = document.getElementById('dateFormat');
const transformBtn     = document.getElementById('transformBtn');
const outputArea       = document.getElementById('outputArea');
const errorBanner      = document.getElementById('errorBanner');
const copyBtn          = document.getElementById('copyBtn');
const downloadBtn      = document.getElementById('downloadBtn');
const expandAllBtn     = document.getElementById('expandAllBtn');
const collapseAllBtn   = document.getElementById('collapseAllBtn');
const transformedCount = document.getElementById('transformedCount');
const fileInput        = document.getElementById('fileInput');
const dropZone         = document.getElementById('dropZone');
const dropOverlay      = document.getElementById('dropOverlay');
const shareBtn         = document.getElementById('shareBtn');
const copyInputBtn     = document.getElementById('copyInputBtn');
const epochSeconds     = document.getElementById('epochSeconds');
const epochMillis      = document.getElementById('epochMillis');
const copyEpochSeconds = document.getElementById('copyEpochSeconds');
const copyEpochMillis  = document.getElementById('copyEpochMillis');

// ===== Init =====
async function init() {
    await loadTimezones();
    bindEvents();
    syncActivePreset();
}

async function loadTimezones() {
    try {
        const res = await fetch('/api/timezones');
        const zones = await res.json();
        state.allTimezones = Array.isArray(zones) && zones.length ? zones : ['UTC'];
        renderTimezoneOptions('', 'UTC');
    } catch {
        state.allTimezones = ['UTC'];
        renderTimezoneOptions('', 'UTC');
    }
}

// ===== Events =====
function bindEvents() {
    detectBtn.addEventListener('click', detectFields);
    clearJsonBtn.addEventListener('click', clearAll);
    addFieldBtn.addEventListener('click', addManualField);
    shareBtn.addEventListener('click', shareApp);
    copyInputBtn.addEventListener('click', copyInput);
    fileInput.addEventListener('change', handleFileSelect);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    manualField.addEventListener('keydown', e => { if (e.key === 'Enter') addManualField(); });
    transformBtn.addEventListener('click', transformJson);
    copyBtn.addEventListener('click', copyOutput);
    downloadBtn.addEventListener('click', downloadOutput);
    expandAllBtn.addEventListener('click', expandAll);
    collapseAllBtn.addEventListener('click', collapseAll);
    timezoneSearch.addEventListener('input', () => {
        renderTimezoneOptions(timezoneSearch.value, timezoneSelect.value || 'UTC');
    });

    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            dateFormat.value = btn.dataset.fmt;
            document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function renderTimezoneOptions(searchValue, preferredZone) {
    const query = (searchValue || '').trim().toLowerCase();
    const filtered = state.allTimezones.filter(zone => zone.toLowerCase().includes(query));
    const fallbackZone = filtered.includes('UTC') ? 'UTC' : (filtered[0] || 'UTC');
    const selectedZone = filtered.includes(preferredZone) ? preferredZone : fallbackZone;

    timezoneSelect.innerHTML = '';
    filtered.forEach(zone => {
        const opt = document.createElement('option');
        opt.value = zone;
        opt.textContent = zone;
        opt.selected = zone === selectedZone;
        timezoneSelect.appendChild(opt);
    });

    if (timezoneSelect.options.length === 0) {
        const opt = document.createElement('option');
        opt.value = 'UTC';
        opt.textContent = 'No matches (using UTC)';
        opt.selected = true;
        timezoneSelect.appendChild(opt);
    }
}

// ===== Copy Input =====
function copyInput() {
    const text = jsonInput.value.trim();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        copyInputBtn.classList.add('copied');
        copyInputBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        setTimeout(() => {
            copyInputBtn.classList.remove('copied');
            copyInputBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        }, 1500);
    });
}

// ===== Share =====
function shareApp() {
    const url = 'https://jsonepochconverter.org';
    navigator.clipboard.writeText(url).then(() => {
        shareBtn.classList.add('copied');
        shareBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
            </svg> Link Copied!`;
        setTimeout(() => {
            shareBtn.classList.remove('copied');
            shareBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg> Share`;
        }, 2000);
    });
}

// ===== File Upload / Drag & Drop =====
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) loadFile(file);
    fileInput.value = '';
}

function handleDragOver(e) {
    e.preventDefault();
    dropOverlay.classList.remove('hidden');
}

function handleDragLeave(e) {
    if (!dropZone.contains(e.relatedTarget)) {
        dropOverlay.classList.add('hidden');
    }
}

function handleDrop(e) {
    e.preventDefault();
    dropOverlay.classList.add('hidden');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        showHint('Please drop a .json file');
        return;
    }
    loadFile(file);
}

function loadFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        try {
            const parsed = JSON.parse(text);
            jsonInput.value = JSON.stringify(parsed, null, 2);
        } catch {
            jsonInput.value = text;
        }
        hideHint();
        hideError();
        state.selectedFields.clear();
        renderChips();
        clearOutput();
    };
    reader.onerror = () => showHint('Failed to read file');
    reader.readAsText(file);
}

// ===== Field Detection =====
async function detectFields() {
    const json = jsonInput.value.trim();
    if (!json) { showHint('Paste JSON first'); return; }

    detectBtn.textContent = 'Detecting...';
    detectBtn.disabled = true;
    hideHint();

    try {
        const res = await fetch('/api/detect-fields', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonInput: json })
        });
        const data = await res.json();
        if (data.fields && data.fields.length > 0) {
            data.fields.forEach(f => state.selectedFields.add(f));
            renderChips();
        } else {
            showHint('No epoch-like fields detected. Add fields manually.');
        }
    } catch (err) {
        showHint('Detection failed: ' + err.message);
    } finally {
        detectBtn.textContent = 'Auto-detect fields';
        detectBtn.disabled = false;
    }
}

function addManualField() {
    const val = manualField.value.trim();
    if (!val) return;
    state.selectedFields.add(val);
    manualField.value = '';
    renderChips();
}

function removeField(field) {
    state.selectedFields.delete(field);
    renderChips();
}

function renderChips() {
    if (state.selectedFields.size === 0) {
        fieldChips.innerHTML = '<span class="placeholder-text">No fields selected yet</span>';
        return;
    }
    fieldChips.innerHTML = '';
    state.selectedFields.forEach(field => {
        const chip = document.createElement('span');
        chip.className = 'chip fade-in';
        chip.innerHTML = `${escapeHtml(field)}<button class="chip-remove" title="Remove">×</button>`;
        chip.querySelector('.chip-remove').addEventListener('click', () => removeField(field));
        fieldChips.appendChild(chip);
    });
}

// ===== Clear =====
function clearAll() {
    jsonInput.value = '';
    state.selectedFields.clear();
    renderChips();
    clearOutput();
    hideHint();
    hideError();
}

// ===== Transform =====
async function transformJson() {
    const json = jsonInput.value.trim();
    if (!json) { showHint('Paste JSON first'); return; }

    hideHint();
    hideError();
    transformBtn.disabled = true;
    transformBtn.classList.add('loading');
    transformBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg> Transforming...`;

    try {
        // Auto-detect fields if none selected
        if (state.selectedFields.size === 0) {
            const detRes = await fetch('/api/detect-fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonInput: json })
            });
            const detData = await detRes.json();
            if (detData.fields && detData.fields.length > 0) {
                detData.fields.forEach(f => state.selectedFields.add(f));
                renderChips();
            } else {
                showError('No epoch fields detected. Add fields manually.');
                transformBtn.disabled = false;
                transformBtn.classList.remove('loading');
                transformBtn.innerHTML = `Transform <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
                return;
            }
        }

        const res = await fetch('/api/transform', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonInput: json,
                fields: [...state.selectedFields],
                timezone: timezoneSelect.value,
                dateFormat: dateFormat.value.trim() || 'yyyy-MM-dd HH:mm:ss z'
            })
        });
        const data = await res.json();
        if (data.error) {
            showError(data.error);
            clearOutput();
        } else {
            renderOutput(data.transformedJson, data.fieldsTransformed);
        }
    } catch (err) {
        showError('Request failed: ' + err.message);
    } finally {
        transformBtn.disabled = false;
        transformBtn.classList.remove('loading');
        transformBtn.innerHTML = `Transform <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
    }
}

// ===== Output Rendering =====
const TREE_NODE_LIMIT = 500; // fall back to raw view above this

function countNodes(node) {
    if (!node || typeof node !== 'object') return 1;
    let total = 1;
    if (Array.isArray(node)) {
        for (const item of node) { total += countNodes(item); if (total > TREE_NODE_LIMIT) break; }
    } else {
        for (const k of Object.keys(node)) { total += countNodes(node[k]); if (total > TREE_NODE_LIMIT) break; }
    }
    return total;
}

function renderOutput(json, count) {
    state.lastTransformedJson = json;

    const wrap = document.createElement('div');
    wrap.className = 'json-tree fade-in';

    try {
        const parsed = JSON.parse(json);
        const nodeCount = countNodes(parsed);
        if (nodeCount > TREE_NODE_LIMIT) {
            // Raw view for large JSON — tree renderer would freeze the browser
            const pre = document.createElement('pre');
            pre.style.cssText = 'padding:14px;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-all;';
            pre.textContent = json;
            const note = document.createElement('div');
            note.style.cssText = 'padding:6px 14px;font-size:11px;color:#64748b;border-bottom:1px solid #e2e8f0;';
            note.textContent = `Large output (${nodeCount}+ nodes) — displayed as raw text for performance`;
            wrap.appendChild(note);
            wrap.appendChild(pre);
            expandAllBtn.disabled = true;
            collapseAllBtn.disabled = true;
        } else {
            wrap.appendChild(buildTreeNode(parsed, null, true));
            expandAllBtn.disabled = false;
            collapseAllBtn.disabled = false;
        }
    } catch {
        const pre = document.createElement('pre');
        pre.style.cssText = 'padding:14px;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-all;';
        pre.innerHTML = syntaxHighlight(json);
        wrap.appendChild(pre);
        expandAllBtn.disabled = true;
        collapseAllBtn.disabled = true;
    }

    outputArea.innerHTML = '';
    outputArea.appendChild(wrap);

    copyBtn.disabled = false;
    downloadBtn.disabled = false;
    transformedCount.textContent = `${count} field${count !== 1 ? 's' : ''} transformed`;
    transformedCount.classList.remove('hidden');
}

function clearOutput() {
    state.lastTransformedJson = '';
    outputArea.innerHTML = `
        <div class="output-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
            </svg>
            <p>Output appears here after transform...</p>
        </div>`;
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    expandAllBtn.disabled = true;
    collapseAllBtn.disabled = true;
    transformedCount.classList.add('hidden');
}

// ===== Collapsible JSON Tree =====
function buildTreeNode(value, keyName, isLast) {
    const node = document.createElement('div');
    node.className = 'jt-node';

    if (value === null || typeof value !== 'object') {
        const row = document.createElement('div');
        row.className = 'jt-row';
        row.appendChild(mkSpan('', 'jt-spacer'));
        if (keyName !== null) {
            row.appendChild(mkSpan(JSON.stringify(keyName), 'jt-key'));
            row.appendChild(mkSpan(': ', 'jt-punct'));
        }
        row.appendChild(mkValueSpan(value));
        if (!isLast) row.appendChild(mkSpan(',', 'jt-punct'));
        node.appendChild(row);
        return node;
    }

    const isArr = Array.isArray(value);
    const open  = isArr ? '[' : '{';
    const close = isArr ? ']' : '}';
    const keys  = isArr ? null : Object.keys(value);
    const len   = isArr ? value.length : keys.length;
    const summary = isArr
        ? `${len} item${len !== 1 ? 's' : ''}`
        : `${len} key${len !== 1 ? 's' : ''}`;

    const openRow = document.createElement('div');
    openRow.className = 'jt-row';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'jt-toggle';
    toggleBtn.title = 'Collapse';
    toggleBtn.textContent = '▼';
    openRow.appendChild(toggleBtn);

    if (keyName !== null) {
        openRow.appendChild(mkSpan(JSON.stringify(keyName), 'jt-key'));
        openRow.appendChild(mkSpan(': ', 'jt-punct'));
    }
    openRow.appendChild(mkSpan(open, 'jt-brace'));

    const inlineSummary = mkSpan(` ${summary} ${close}${isLast ? '' : ','}`, 'jt-inline-summary');
    inlineSummary.classList.add('hidden');
    openRow.appendChild(inlineSummary);

    const childrenDiv = document.createElement('div');
    childrenDiv.className = 'jt-children';

    if (isArr) {
        value.forEach((item, i) =>
            childrenDiv.appendChild(buildTreeNode(item, null, i === value.length - 1)));
    } else {
        keys.forEach((k, i) =>
            childrenDiv.appendChild(buildTreeNode(value[k], k, i === keys.length - 1)));
    }

    const closeRow = document.createElement('div');
    closeRow.className = 'jt-row jt-close-row';
    closeRow.appendChild(mkSpan('', 'jt-spacer'));
    closeRow.appendChild(mkSpan(close + (isLast ? '' : ','), 'jt-brace'));

    let collapsed = false;
    toggleBtn.addEventListener('click', () => {
        collapsed = !collapsed;
        toggleBtn.textContent = collapsed ? '▶' : '▼';
        toggleBtn.title = collapsed ? 'Expand' : 'Collapse';
        childrenDiv.classList.toggle('hidden', collapsed);
        closeRow.classList.toggle('hidden', collapsed);
        inlineSummary.classList.toggle('hidden', !collapsed);
    });

    node.appendChild(openRow);
    node.appendChild(childrenDiv);
    node.appendChild(closeRow);
    return node;
}

function mkSpan(text, cls) {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    return s;
}

function mkValueSpan(value) {
    if (typeof value === 'string')  return mkSpan(JSON.stringify(value), 'json-string');
    if (typeof value === 'number')  return mkSpan(String(value), 'json-number');
    if (typeof value === 'boolean') return mkSpan(String(value), 'json-boolean');
    return mkSpan('null', 'json-null');
}

// ===== Expand / Collapse All =====
function expandAll() {
    outputArea.querySelectorAll('.jt-toggle').forEach(btn => {
        if (btn.textContent === '▶') btn.click();
    });
}

function collapseAll() {
    [...outputArea.querySelectorAll('.jt-toggle')].reverse().forEach(btn => {
        if (btn.textContent === '▼') btn.click();
    });
}

// ===== Copy / Download =====
function copyOutput() {
    if (!state.lastTransformedJson) return;
    navigator.clipboard.writeText(state.lastTransformedJson).then(() => {
        const orig = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = orig; }, 1500);
    });
}

function downloadOutput() {
    if (!state.lastTransformedJson) return;
    const blob = new Blob([state.lastTransformedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted.json';
    a.click();
    URL.revokeObjectURL(url);
}

// ===== Hints / Errors =====
function showHint(msg) {
    jsonHint.textContent = msg;
    jsonHint.classList.remove('hidden');
}
function hideHint() { jsonHint.classList.add('hidden'); }

function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.remove('hidden');
}
function hideError() { errorBanner.classList.add('hidden'); }

// ===== Syntax Highlight (fallback) =====
function syntaxHighlight(json) {
    return escapeHtml(json).replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        match => {
            let cls = 'json-number';
            if (/^"/.test(match)) cls = /:$/.test(match) ? 'json-key' : 'json-string';
            else if (/true|false/.test(match)) cls = 'json-boolean';
            else if (/null/.test(match)) cls = 'json-null';
            return `<span class="${cls}">${match}</span>`;
        }
    );
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function syncActivePreset() {
    const activeFmt = dateFormat.value.trim();
    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.fmt === activeFmt);
    });
}

// ===== Live Epoch Clock =====
function tickEpoch() {
    const now = Date.now();
    epochSeconds.textContent = Math.floor(now / 1000).toLocaleString('en-US', { useGrouping: false });
    epochMillis.textContent  = now.toLocaleString('en-US', { useGrouping: false });
}
tickEpoch();
setInterval(tickEpoch, 1000);

function copyEpochValue(btn, getVal) {
    navigator.clipboard.writeText(getVal()).then(() => {
        const orig = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = orig; }, 1500);
    });
}

copyEpochSeconds.addEventListener('click', () => copyEpochValue(copyEpochSeconds, () => epochSeconds.textContent));
copyEpochMillis.addEventListener('click',  () => copyEpochValue(copyEpochMillis,  () => epochMillis.textContent));

// ===== Start =====
init();
