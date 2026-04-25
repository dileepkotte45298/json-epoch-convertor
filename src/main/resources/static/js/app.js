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
const aboutBtn         = document.getElementById('aboutBtn');
const aboutModal       = document.getElementById('aboutModal');
const aboutModalClose  = document.getElementById('aboutModalClose');

// ===== Init =====
function init() {
    loadTimezones();
    bindEvents();
    syncActivePreset();
}

// ===== Timezones — fully client-side via Intl API =====
function loadTimezones() {
    try {
        const zones = Intl.supportedValuesOf('timeZone');
        state.allTimezones = zones.length ? zones.sort() : ['UTC'];
    } catch {
        // Fallback for browsers that don't support Intl.supportedValuesOf
        state.allTimezones = [
            'UTC',
            'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos',
            'America/Anchorage', 'America/Argentina/Buenos_Aires', 'America/Chicago',
            'America/Denver', 'America/Halifax', 'America/Honolulu',
            'America/Los_Angeles', 'America/Mexico_City', 'America/New_York',
            'America/Sao_Paulo', 'America/Toronto', 'America/Vancouver',
            'Asia/Bangkok', 'Asia/Colombo', 'Asia/Dhaka', 'Asia/Dubai',
            'Asia/Hong_Kong', 'Asia/Jakarta', 'Asia/Karachi', 'Asia/Kolkata',
            'Asia/Kuala_Lumpur', 'Asia/Manila', 'Asia/Seoul', 'Asia/Shanghai',
            'Asia/Singapore', 'Asia/Taipei', 'Asia/Tehran', 'Asia/Tokyo',
            'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Melbourne',
            'Australia/Perth', 'Australia/Sydney',
            'Europe/Amsterdam', 'Europe/Athens', 'Europe/Berlin', 'Europe/Brussels',
            'Europe/Budapest', 'Europe/Copenhagen', 'Europe/Dublin', 'Europe/Helsinki',
            'Europe/Istanbul', 'Europe/Kiev', 'Europe/Lisbon', 'Europe/London',
            'Europe/Madrid', 'Europe/Moscow', 'Europe/Oslo', 'Europe/Paris',
            'Europe/Prague', 'Europe/Rome', 'Europe/Stockholm', 'Europe/Vienna',
            'Europe/Warsaw', 'Europe/Zurich',
            'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Honolulu',
            'US/Alaska', 'US/Arizona', 'US/Central', 'US/Eastern',
            'US/Hawaii', 'US/Mountain', 'US/Pacific',
        ];
    }
    renderTimezoneOptions('', 'UTC');
}

// ===== Events =====
function bindEvents() {
    detectBtn.addEventListener('click', detectFields);
    clearJsonBtn.addEventListener('click', clearAll);
    addFieldBtn.addEventListener('click', addManualField);
    aboutBtn.addEventListener('click', () => aboutModal.classList.remove('hidden'));
    aboutModalClose.addEventListener('click', () => aboutModal.classList.add('hidden'));
    aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) aboutModal.classList.add('hidden'); });
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
            const parsed = JSON.parse(preprocessJsonString(text));
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

// ===== JSON Preprocessing =====
// Replace bare 19+ digit integers with quoted strings before JSON.parse
// to prevent JavaScript from losing nanosecond precision
// (Number.MAX_SAFE_INTEGER ≈ 9×10^15, nano timestamps are ~10^18)
function preprocessJsonString(jsonStr) {
    return jsonStr.replace(/([:,\[]\s*)(\d{19,})(\s*[,\]\}])/g, '$1"$2"$3');
}

function safeParseJson(text) {
    return JSON.parse(preprocessJsonString(text));
}

// ===== Client-side Epoch Detection =====

const EPOCH_PATTERN = /^\d{10,19}$/;

function looksLikeEpoch(numStr) {
    if (!EPOCH_PATTERN.test(numStr)) return false;
    const n = parseFloat(numStr);
    return (n >= 1e9  && n <= 2e10)  ||  // seconds (10-11 digits)
           (n >= 1e12 && n <= 2e13)  ||  // milliseconds (13-14 digits)
           (n >= 1e15 && n <= 2e16)  ||  // microseconds (16-17 digits)
           (n >= 1e18);                   // nanoseconds (19+ digits)
}

function extractEpochStr(value) {
    if (typeof value === 'number') {
        const s = String(Math.round(value));
        return looksLikeEpoch(s) ? s : null;
    }
    if (typeof value === 'string') {
        const s = value.trim();
        return looksLikeEpoch(s) ? s : null;
    }
    return null;
}

function detectEpochFieldsInTree(root) {
    const detected = new Set();
    function walk(node) {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
            node.forEach(walk);
        } else {
            for (const [key, value] of Object.entries(node)) {
                if (extractEpochStr(value) !== null) {
                    detected.add(key);
                } else {
                    walk(value);
                }
            }
        }
    }
    walk(root);
    return [...detected];
}

// ===== Client-side Epoch Conversion =====

function epochStrToMs(s) {
    const digits = s.trim().length;
    if (digits >= 19) {
        try {
            // Use BigInt to preserve nanosecond precision
            const big = BigInt(s.trim());
            return Number(big / 1000000n);
        } catch {
            return Math.floor(parseFloat(s) / 1e6);
        }
    }
    if (digits >= 16) return Math.floor(Number(s) / 1000);  // microseconds
    if (digits >= 13) return Number(s);                       // milliseconds
    return Number(s) * 1000;                                  // seconds
}

// Convert epoch string to formatted date string using a Java DateTimeFormatter pattern.
// Supported tokens: yyyy/yy, MM/M, dd/d, HH/H, hh/h, mm/m, ss/s, a, z, Z, X/XX/XXX, 'literal'
function formatEpoch(epochStr, timezone, javaPattern) {
    const ms = epochStrToMs(epochStr);
    const date = new Date(ms);
    const tz = timezone || 'UTC';
    const pattern = javaPattern || 'yyyy-MM-dd HH:mm:ss z';

    // Build component sets via Intl.DateTimeFormat to handle any timezone
    const p24 = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    }).formatToParts(date);

    const p12 = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit', minute: '2-digit',
        hour12: true
    }).formatToParts(date);

    const pShort = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'short'
    }).formatToParts(date);

    const pOffset = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'longOffset'
    }).formatToParts(date);

    const get = (parts, type) => (parts.find(p => p.type === type) || {}).value || '';

    const year   = get(p24, 'year');
    const month  = get(p24, 'month');
    const day    = get(p24, 'day');
    let hour24   = get(p24, 'hour');
    if (hour24 === '24') hour24 = '00';   // some browsers use 24 for midnight
    const minute = get(p24, 'minute');
    const second = get(p24, 'second');
    const hour12 = get(p12, 'hour').padStart(2, '0');
    const ampm   = (get(p12, 'dayPeriod') || '').toUpperCase() || (parseInt(hour24) < 12 ? 'AM' : 'PM');
    const tzShort = get(pShort, 'timeZoneName');

    // rawOffset: "+05:30", "-05:00", or "+00:00"
    let rawOffset = get(pOffset, 'timeZoneName').replace(/^GMT/, '') || '+00:00';
    if (!rawOffset || rawOffset === '') rawOffset = '+00:00';
    rawOffset = rawOffset.replace(/^([+-])(\d):/, '$10$2:'); // +5:30 → +05:30
    if (/^[+-]\d{2}$/.test(rawOffset)) rawOffset += ':00';  // +05 → +05:00

    let result = '';
    let i = 0;

    while (i < pattern.length) {
        const ch = pattern[i];

        if (ch === "'") {
            i++;
            while (i < pattern.length && pattern[i] !== "'") result += pattern[i++];
            if (i < pattern.length) i++;
            continue;
        }

        let j = i;
        while (j < pattern.length && pattern[j] === ch) j++;
        const count = j - i;
        i = j;

        switch (ch) {
            case 'y': result += count >= 4 ? year : year.slice(-2); break;
            case 'M': result += count >= 2 ? month : String(parseInt(month, 10)); break;
            case 'd': result += count >= 2 ? day   : String(parseInt(day, 10)); break;
            case 'H': result += count >= 2 ? hour24.padStart(2, '0') : String(parseInt(hour24, 10)); break;
            case 'h': result += count >= 2 ? hour12 : String(parseInt(hour12, 10)); break;
            case 'm': result += count >= 2 ? minute : String(parseInt(minute, 10)); break;
            case 's': result += count >= 2 ? second : String(parseInt(second, 10)); break;
            case 'a': result += ampm; break;
            case 'z': result += tzShort; break;
            case 'Z': result += rawOffset.replace(':', ''); break;
            case 'X':
                if (rawOffset === '+00:00') { result += 'Z'; break; }
                if (count === 1)       result += rawOffset.replace(/:00$/, '');
                else if (count === 2)  result += rawOffset.replace(':', '');
                else                   result += rawOffset;
                break;
            default:
                result += ch.repeat(count);
        }
    }

    return result;
}

// ===== Client-side Transformation =====

function transformTree(root, fieldSet, timezone, pattern) {
    let count = 0;

    function walk(node) {
        if (node === null || typeof node !== 'object') return node;
        if (Array.isArray(node)) return node.map(walk);

        const obj = {};
        for (const [key, value] of Object.entries(node)) {
            if (fieldSet.has(key)) {
                const epochStr = extractEpochStr(value);
                if (epochStr !== null) {
                    obj[key] = formatEpoch(epochStr, timezone, pattern);
                    count++;
                } else {
                    obj[key] = walk(value);
                }
            } else {
                obj[key] = walk(value);
            }
        }
        return obj;
    }

    const transformed = walk(root);
    return { transformed, count };
}

// ===== Field Detection (client-side) =====
function detectFields() {
    const json = jsonInput.value.trim();
    if (!json) { showHint('Paste JSON first'); return; }

    detectBtn.textContent = 'Detecting...';
    detectBtn.disabled = true;
    hideHint();

    try {
        const parsed = safeParseJson(json);
        const fields = detectEpochFieldsInTree(parsed);
        if (fields.length > 0) {
            fields.forEach(f => state.selectedFields.add(f));
            renderChips();
        } else {
            showHint('No epoch-like fields detected. Add fields manually.');
        }
    } catch (err) {
        showHint('Invalid JSON: ' + err.message);
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

// ===== Transform (fully client-side) =====
function transformJson() {
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

    // Use setTimeout to allow the browser to repaint before heavy work
    setTimeout(() => {
        try {
            const parsed = safeParseJson(json);

            if (state.selectedFields.size === 0) {
                const fields = detectEpochFieldsInTree(parsed);
                if (fields.length === 0) {
                    showError('No epoch fields detected. Add fields manually.');
                    return;
                }
                fields.forEach(f => state.selectedFields.add(f));
                renderChips();
            }

            const timezone = timezoneSelect.value || 'UTC';
            const pattern  = dateFormat.value.trim() || 'yyyy-MM-dd HH:mm:ss z';

            const { transformed, count } = transformTree(parsed, state.selectedFields, timezone, pattern);
            const resultJson = JSON.stringify(transformed, null, 2);
            renderOutput(resultJson, count);
        } catch (err) {
            showError('Transform failed: ' + err.message);
        } finally {
            transformBtn.disabled = false;
            transformBtn.classList.remove('loading');
            transformBtn.innerHTML = `Transform <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
        }
    }, 10);
}

// ===== Output Rendering =====
const TREE_NODE_LIMIT = 500;

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

// ===== FAQ Accordion =====
document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        item.classList.toggle('open');
    });
});

// ===== Start =====
init();
