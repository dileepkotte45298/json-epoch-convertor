// Web Worker: runs epoch detection and transformation off the main thread
// so the UI never freezes, even for 50MB JSON files.

const EPOCH_PATTERN = /^\d{10,19}$/;

function looksLikeEpoch(numStr) {
    if (!EPOCH_PATTERN.test(numStr)) return false;
    const n = parseFloat(numStr);
    return (n >= 1e9  && n <= 2e10)  ||
           (n >= 1e12 && n <= 2e13)  ||
           (n >= 1e15 && n <= 2e16)  ||
           (n >= 1e18);
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

function preprocessJsonString(jsonStr) {
    return jsonStr.replace(/([:,\[]\s*)(\d{19,})(\s*[,\]\}])/g, '$1"$2"$3');
}

function epochStrToMs(s) {
    const digits = s.trim().length;
    if (digits >= 19) {
        try {
            const big = BigInt(s.trim());
            return Number(big / 1000000n);
        } catch {
            return Math.floor(parseFloat(s) / 1e6);
        }
    }
    if (digits >= 16) return Math.floor(Number(s) / 1000);
    if (digits >= 13) return Number(s);
    return Number(s) * 1000;
}

function formatEpoch(epochStr, timezone, javaPattern) {
    const ms = epochStrToMs(epochStr);
    const date = new Date(ms);
    const tz = timezone || 'UTC';
    const pattern = javaPattern || 'yyyy-MM-dd HH:mm:ss z';

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
    if (hour24 === '24') hour24 = '00';
    const minute = get(p24, 'minute');
    const second = get(p24, 'second');
    const hour12 = get(p12, 'hour').padStart(2, '0');
    const ampm   = (get(p12, 'dayPeriod') || '').toUpperCase() || (parseInt(hour24) < 12 ? 'AM' : 'PM');
    const tzShort = get(pShort, 'timeZoneName');

    let rawOffset = get(pOffset, 'timeZoneName').replace(/^GMT/, '') || '+00:00';
    if (!rawOffset) rawOffset = '+00:00';
    rawOffset = rawOffset.replace(/^([+-])(\d):/, '$10$2:');
    if (/^[+-]\d{2}$/.test(rawOffset)) rawOffset += ':00';

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
            case 'H': result += count >= 2 ? hour24.padStart(2,'0') : String(parseInt(hour24,10)); break;
            case 'h': result += count >= 2 ? hour12 : String(parseInt(hour12,10)); break;
            case 'm': result += count >= 2 ? minute : String(parseInt(minute,10)); break;
            case 's': result += count >= 2 ? second : String(parseInt(second,10)); break;
            case 'a': result += ampm; break;
            case 'z': result += tzShort; break;
            case 'Z': result += rawOffset.replace(':', ''); break;
            case 'X':
                if (rawOffset === '+00:00') { result += 'Z'; break; }
                if (count === 1)      result += rawOffset.replace(/:00$/, '');
                else if (count === 2) result += rawOffset.replace(':', '');
                else                  result += rawOffset;
                break;
            default: result += ch.repeat(count);
        }
    }
    return result;
}

function detectEpochFieldsInTree(root) {
    const detected = new Set();
    function walk(node) {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(walk); return; }
        for (const [key, value] of Object.entries(node)) {
            if (extractEpochStr(value) !== null) detected.add(key);
            else walk(value);
        }
    }
    walk(root);
    return [...detected];
}

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

self.onmessage = function(e) {
    const { type, payload } = e.data;

    try {
        if (type === 'detect') {
            const preprocessed = preprocessJsonString(payload.jsonText);
            const parsed = JSON.parse(preprocessed);
            const fields = detectEpochFieldsInTree(parsed);
            self.postMessage({ type: 'detect-result', fields, parsed: preprocessed });

        } else if (type === 'transform') {
            const { jsonText, fields, timezone, dateFormat } = payload;
            const preprocessed = preprocessJsonString(jsonText);
            const parsed = JSON.parse(preprocessed);
            const fieldSet = new Set(fields);
            const { transformed, count } = transformTree(parsed, fieldSet, timezone, dateFormat);
            const resultJson = JSON.stringify(transformed, null, 2);
            self.postMessage({ type: 'transform-result', resultJson, count });
        }
    } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
    }
};
