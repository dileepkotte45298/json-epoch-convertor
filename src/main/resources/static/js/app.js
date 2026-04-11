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
    if (state.selectedFields.size === 0) { showError('Please select at least one field to transform.'); return; }

    hideHint();
    hideError();
    transformBtn.disabled = true;
    transformBtn.classList.add('loading');
    transformBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg> Transforming...`;

    try {
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
function renderOutput(json, count) {
    state.lastTransformedJson = json;

    const wrap = document.createElement('div');
    wrap.className = 'json-tree fade-in';

    try {
        wrap.appendChild(buildTreeNode(JSON.parse(json), null, true));
    } catch {
        const pre = document.createElement('pre');
        pre.style.cssText = 'padding:14px;font-size:13px;line-height:1.7;white-space:pre-wrap;word-break:break-all;';
        pre.innerHTML = syntaxHighlight(json);
        wrap.appendChild(pre);
    }

    outputArea.innerHTML = '';
    outputArea.appendChild(wrap);

    copyBtn.disabled = false;
    downloadBtn.disabled = false;
    expandAllBtn.disabled = false;
    collapseAllBtn.disabled = false;
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
    a.download = 'transformed.json';
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

// ===== Start =====
init();
