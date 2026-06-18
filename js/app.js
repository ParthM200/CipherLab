window.CipherLab = window.CipherLab || {};

CipherLab.app = (() => {
  const C = CipherLab.ciphers;
  const A = CipherLab.attacks;
  const CH = CipherLab.charts;

  let activeCipher = 'caesar';
  let subKey = C.generateSubKey();

  const CIPHER_META = {
    caesar: {
      name: 'Caesar Cipher', year: '~50 BC', era: 'Roman Empire',
      history: 'Julius Caesar shifted every letter in his military dispatches by 3 positions. A became D, B became E. He used it to communicate with his generals across the Roman Empire. The cipher is named after him, though simple shift ciphers existed long before.',
      broken: 'Only 25 possible keys — a computer tries all of them in microseconds and scores each against English letter frequencies. The correct decryption floats to the top. This is a brute force attack. Key space too small: game over.',
      attack: 'brute-force'
    },
    atbash: {
      name: 'Atbash Cipher', year: '~600 BC', era: 'Ancient Hebrew',
      history: 'Used by Hebrew scribes to encode sensitive text, including passages in the Bible (Jeremiah 25:26 — "Sheshach" is Babylon in Atbash). The name comes from the first, last, second, and second-to-last letters of the Hebrew alphabet.',
      broken: 'There is no key — the mapping is always A↔Z, B↔Y, C↔X. Applying it once encrypts, applying it again decrypts. Zero mystery. It was purely a scribal convention, not a security tool.',
      attack: 'none'
    },
    rot13: {
      name: 'ROT-13', year: '1980s', era: 'Early Internet',
      history: 'Used in Usenet groups and early internet forums to hide spoilers, punchlines, and off-topic content. Readers could choose to decode by rotating letters 13 positions. Because 13+13=26, applying ROT-13 twice gives back the original — it is its own inverse.',
      broken: 'ROT-13 is Caesar with a fixed shift of 13. No key, no mystery, no security. It was never meant to be secure — just a social courtesy to hide content from casual readers.',
      attack: 'none'
    },
    vigenere: {
      name: 'Vigenère Cipher', year: '1553', era: 'Renaissance',
      history: 'Published by Giovan Battista Bellaso but misattributed to Blaise de Vigenère for centuries. Uses a repeating keyword: each letter is shifted by a different amount based on the corresponding keyword letter. Called "le chiffre indéchiffrable" — the unbreakable cipher — for 300 years.',
      broken: 'Charles Babbage (~1854) and Friedrich Kasiski (1863) independently cracked it. Repeated sequences in the ciphertext appear at distances that are multiples of the key length. Find those distances, take the GCD, and you have the key length. Then split the message into groups and frequency-analyze each — it becomes multiple Caesar ciphers.',
      attack: 'kasiski'
    },
    railfence: {
      name: 'Rail Fence Cipher', year: 'Ancient', era: 'Classical / Civil War',
      history: 'Ancient Greeks used a variant called the scytale — a wooden staff that you wrapped a strip of leather around and wrote across. Without the same-diameter staff, the message was unreadable. Also used in the American Civil War for field communications.',
      broken: 'A transposition cipher: letters are rearranged, not replaced. Letter frequencies match plaintext, so frequency analysis is useless. But the rail count is almost always small (2–8), making brute force trivial — try every count, score for English.',
      attack: 'railforce'
    },
    substitution: {
      name: 'Simple Substitution', year: 'Ancient', era: 'General',
      history: 'Each letter maps to a fixed different letter — a full 26-letter scrambled alphabet as the key. The key space is 26! ≈ 4×10²⁶, which is impossibly large to brute force even with modern computers.',
      broken: 'Al-Kindi, a 9th-century Arab polymath, discovered that letter frequencies survive substitution. In English, E always appears ~12.7% of the time regardless of what letter it encrypts to. Map the most frequent ciphertext letter to E, second-most to T, and so on — the message decodes itself. Huge key space, zero security.',
      attack: 'frequency'
    }
  };

  const ATTACK_DESC = {
    'brute-force': 'Try all 25 possible shift keys. Score each decryption by how closely its letter frequencies match English (chi-squared test). Lowest score = most English-like = correct key.',
    'kasiski': 'Scan ciphertext for repeated sequences of 3+ letters. Their distances are multiples of the key length. Factor the distances, find the most common divisor, then split the message and break each column as a Caesar cipher.',
    'frequency': 'Count every letter\'s frequency in the ciphertext. Map the most frequent ciphertext letter to E (12.7% in English), second to T, and so on. The result is an approximation — usually readable.',
    'railforce': 'Try each possible rail count (2–8). Score each decrypted output for English likelihood using chi-squared. Lowest score wins.'
  };

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  function init() {
    CH.initFreqChart('freq-chart');
    bindTabs();
    bindControls();
    bindAttacks();
    showCipher('caesar');
    $('input-text').value = 'The quick brown fox jumps over the lazy dog';
    handleInputChange();
    updateSubKeyDisplay();
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  function bindTabs() {
    $$('.cipher-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.cipher-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        showCipher(tab.dataset.cipher);
      });
    });
  }

  function showCipher(id) {
    activeCipher = id;

    $$('.cipher-controls').forEach(el => el.style.display = 'none');
    const ctrl = $(`controls-${id}`);
    if (ctrl) ctrl.style.display = 'flex';

    $('cipher-wheel-wrap').style.display = id === 'caesar' ? 'flex' : 'none';
    $('rail-fence-wrap').style.display   = id === 'railfence' ? 'block' : 'none';
    $('sub-key-wrap').style.display      = id === 'substitution' ? 'block' : 'none';

    updateAttackPanel(id);
    updateCipherInfo(id);
    $('attack-results').innerHTML = '';
    $('attack-results').style.display = 'none';
    handleInputChange();
  }

  function updateAttackPanel(id) {
    const meta = CIPHER_META[id];
    const type = meta.attack;

    $$('.attack-action').forEach(btn => btn.style.display = 'none');
    const desc = $('attack-desc');
    const runArea = $('attack-run-area');

    if (type === 'none') {
      desc.textContent = 'No key to find — this cipher is always directly reversible.';
      runArea.style.display = 'none';
    } else {
      desc.textContent = ATTACK_DESC[type] || '';
      runArea.style.display = 'block';
      const btn = $(`attack-${type}`);
      if (btn) btn.style.display = 'inline-flex';
    }
  }

  function updateCipherInfo(id) {
    const m = CIPHER_META[id];
    $('info-name').textContent    = m.name;
    $('info-year').textContent    = m.year;
    $('info-era').textContent     = m.era;
    $('info-history').textContent = m.history;
    $('info-broken').textContent  = m.broken;
  }

  // ── Controls ──────────────────────────────────────────────────────────────

  function bindControls() {
    $('input-text').addEventListener('input', handleInputChange);
    $('btn-encrypt').addEventListener('click', encrypt);
    $('btn-decrypt').addEventListener('click', decrypt);
    $('btn-swap').addEventListener('click', swapTexts);
    $('btn-copy').addEventListener('click', copyOutput);

    const shiftIn = $('caesar-shift');
    const shiftLbl = $('caesar-shift-val');
    shiftIn?.addEventListener('input', () => {
      shiftLbl.textContent = shiftIn.value;
      CH.drawCipherWheel('cipher-wheel', parseInt(shiftIn.value));
      handleInputChange();
    });

    const railIn = $('rail-count');
    const railLbl = $('rail-count-val');
    railIn?.addEventListener('input', () => {
      railLbl.textContent = railIn.value;
      handleInputChange();
    });

    $('btn-gen-key')?.addEventListener('click', () => {
      subKey = C.generateSubKey();
      updateSubKeyDisplay();
      handleInputChange();
    });

    $('vigenere-key')?.addEventListener('input', handleInputChange);
  }

  function updateSubKeyDisplay() {
    const el = $('sub-key-display');
    if (!el) return;
    el.innerHTML = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) =>
      `<span class="sub-pair"><span class="sub-plain">${c}</span><span class="sub-arrow">↓</span><span class="sub-cipher">${subKey[i]}</span></span>`
    ).join('');
  }

  function getKey() {
    switch (activeCipher) {
      case 'caesar':       return parseInt($('caesar-shift')?.value || 3);
      case 'vigenere':     return $('vigenere-key')?.value || 'KEY';
      case 'railfence':    return parseInt($('rail-count')?.value || 3);
      case 'substitution': return subKey;
      default:             return null;
    }
  }

  function encode(text) {
    const k = getKey();
    switch (activeCipher) {
      case 'caesar':       return C.caesar(text, k);
      case 'atbash':       return C.atbash(text);
      case 'rot13':        return C.rot13(text);
      case 'vigenere':     return C.vigenere(text, k);
      case 'railfence':    return C.railFenceEncrypt(text, k);
      case 'substitution': return C.substitution(text, k);
      default:             return text;
    }
  }

  function decode(text) {
    const k = getKey();
    switch (activeCipher) {
      case 'caesar':       return C.caesar(text, k, true);
      case 'atbash':       return C.atbash(text);
      case 'rot13':        return C.rot13(text);
      case 'vigenere':     return C.vigenere(text, k, true);
      case 'railfence':    return C.railFenceDecrypt(text, k);
      case 'substitution': return C.substitution(text, k, true);
      default:             return text;
    }
  }

  function encrypt() {
    const result = encode($('input-text').value);
    setOutput(result);
    if (activeCipher === 'railfence')
      CH.drawRailFence('rail-canvas', $('input-text').value, getKey());
  }

  function decrypt() {
    setOutput(decode($('input-text').value));
  }

  function setOutput(text) {
    $('output-text').value = text;
    CH.updateFreqChart(text);
    updateStats(text);
    flashOutput();
  }

  function swapTexts() {
    const out = $('output-text').value;
    if (!out) return;
    $('input-text').value = out;
    $('output-text').value = '';
    handleInputChange();
  }

  function copyOutput() {
    const text = $('output-text').value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const btn = $('btn-copy');
      btn.textContent = 'COPIED ✓';
      setTimeout(() => btn.textContent = 'COPY', 1600);
    });
  }

  function handleInputChange() {
    const text = $('input-text').value;
    CH.updateFreqChart(text);
    updateStats(text);
    if (activeCipher === 'caesar') CH.drawCipherWheel('cipher-wheel', getKey());
    if (activeCipher === 'railfence') CH.drawRailFence('rail-canvas', text, getKey());
  }

  function updateStats(text) {
    const ic  = A.indexOfCoincidence(text);
    const ent = A.entropy(text);
    const len = text.replace(/[^a-zA-Z]/g, '').length;

    $('stat-ic').textContent      = ic.toFixed(4);
    $('stat-entropy').textContent = ent.toFixed(2);
    $('stat-chars').textContent   = len;

    const icEl = $('stat-ic');
    if      (ic > 0.060) icEl.style.color = 'var(--green)';
    else if (ic > 0.045) icEl.style.color = 'var(--amber)';
    else                 icEl.style.color = 'var(--accent)';
  }

  function flashOutput() {
    const el = $('output-text');
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  // ── Attacks ───────────────────────────────────────────────────────────────

  function bindAttacks() {
    $('attack-brute-force')?.addEventListener('click', runBruteForce);
    $('attack-kasiski')?.addEventListener('click', runKasiski);
    $('attack-frequency')?.addEventListener('click', runFrequency);
    $('attack-railforce')?.addEventListener('click', runRailForce);
  }

  function showResults(html) {
    const el = $('attack-results');
    el.innerHTML = html;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function runBruteForce() {
    const text = $('input-text').value;
    const results = A.bruteForceCaesar(text);
    const rows = results.map((r, i) => `
      <div class="bf-row ${i === 0 ? 'bf-best' : ''}">
        <span class="bf-shift">KEY&nbsp;${String(r.shift).padStart(2,'0')}</span>
        <span class="bf-score">χ²&nbsp;${r.score.toFixed(1)}</span>
        <span class="bf-text">${escHtml(r.decrypted.slice(0, 72))}${r.decrypted.length > 72 ? '…' : ''}</span>
      </div>`).join('');

    showResults(`
      <div class="result-hdr">BRUTE FORCE — 25 KEYS RANKED BY ENGLISH LIKELIHOOD</div>
      <p class="result-note">Lower χ² = closer to English letter distribution = more likely correct decryption. <span style="color:var(--green)">Green row = best match.</span></p>
      <div class="bf-list">${rows}</div>`);

    setOutput(results[0].decrypted);
    $('caesar-shift').value = results[0].shift;
    $('caesar-shift-val').textContent = results[0].shift;
    CH.drawCipherWheel('cipher-wheel', results[0].shift);
  }

  function runKasiski() {
    const text = $('input-text').value;
    const up = text.toUpperCase().replace(/[^A-Z]/g, '');

    if (up.length < 30) {
      showResults('<div class="result-hdr">Need at least 30 letters for a reliable attack — paste more ciphertext.</div>');
      return;
    }

    // IC sweep — most reliable signal for key length
    const icRanked = A.icKeyLengths(text, Math.min(14, Math.floor(up.length / 4)));

    // Kasiski — confirms IC via repeated trigram distances
    const { keyLengths: kasiskiLens, ngrams } = A.kasiskiKeyLength(text);

    // Merge: prefer IC top pick, use Kasiski as confirmation
    const bestLen = icRanked[0].length;
    const { key, decrypted } = A.breakVigenere(text, bestLen);

    const ngramHtml = ngrams.length
      ? ngrams.slice(0, 5).map(g =>
          `<div class="kasiski-row"><span class="gram">"${g.gram}"</span> positions [${g.positions.join(', ')}] — gaps: ${g.distances.join(', ')}</div>`
        ).join('')
      : '<div class="kasiski-row" style="color:var(--muted)">No repeated trigrams found (text may be short)</div>';

    const icHtml = icRanked.slice(0, 6).map((kl, i) => {
      const kasMatch = kasiskiLens.find(k => k.length === kl.length);
      const confirmed = kasMatch ? ' ✓' : '';
      return `<div class="kl-row ${i === 0 ? 'kl-best' : ''}">
        <span>Length ${kl.length}${confirmed}</span>
        <span class="kl-bar"><span style="width:${Math.min(100, (kl.ic / 0.0667) * 100)}%"></span></span>
        <span>IC ${kl.ic.toFixed(4)}</span>
      </div>`;
    }).join('');

    showResults(`
      <div class="result-hdr">KASISKI + INDEX OF COINCIDENCE ATTACK</div>
      <div class="kasiski-grid">
        <div>
          <div class="result-sub">STEP 1 — KASISKI: REPEATED TRIGRAMS</div>
          ${ngramHtml}
        </div>
        <div>
          <div class="result-sub">STEP 2 — IC SWEEP: KEY LENGTH CANDIDATES <span style="color:var(--muted);font-weight:400">(English IC ≈ 0.0667)</span></div>
          ${icHtml}
        </div>
        <div class="kasiski-answer">
          <div class="result-sub">STEP 3 — KEY RECOVERED (length ${bestLen})</div>
          <div class="key-badge">${key}</div>
          <div class="result-preview">${escHtml(decrypted.slice(0, 300))}${decrypted.length > 300 ? '…' : ''}</div>
        </div>
      </div>`);

    setOutput(decrypted);
    const kInp = $('vigenere-key');
    if (kInp) { kInp.value = key; }
  }

  function runFrequency() {
    const text = $('input-text').value;
    const { freq } = C.getLetterFrequencies(text);
    const mapping = A.frequencyMap(text);
    const result  = A.applyMapping(text, mapping);

    const mapRows = Object.entries(mapping)
      .sort((a, b) => (freq[b[0]] || 0) - (freq[a[0]] || 0))
      .map(([ci, pl]) => `
        <div class="fm-row">
          <span class="fm-c">${ci}</span><span class="fm-arr">→</span><span class="fm-p">${pl}</span>
          <div class="fm-bar"><div style="width:${Math.min(100,(freq[ci]||0)/12.7*100)}%;background:var(--accent)"></div></div>
          <span class="fm-pct">${(freq[ci]||0).toFixed(1)}%</span>
        </div>`).join('');

    showResults(`
      <div class="result-hdr">FREQUENCY ANALYSIS ATTACK</div>
      <p class="result-note">Top-frequency ciphertext letters mapped to top-frequency English letters. Works perfectly on monoalphabetic ciphers. May need minor manual corrections on short texts.</p>
      <div class="fa-grid">
        <div>
          <div class="result-sub">LETTER MAPPING (by frequency)</div>
          <div class="fm-list">${mapRows}</div>
        </div>
        <div>
          <div class="result-sub">AUTO-DECRYPTED OUTPUT</div>
          <div class="result-preview">${escHtml(result.slice(0, 400))}</div>
        </div>
      </div>`);

    setOutput(result);
  }

  function runRailForce() {
    const text = $('input-text').value;
    const maxRails = Math.min(8, Math.floor(text.replace(/[^a-zA-Z]/g,'').length / 2) || 2);
    const results = [];
    for (let r = 2; r <= maxRails; r++) {
      const dec = C.railFenceDecrypt(text, r);
      results.push({ rails: r, decrypted: dec, score: A.chiSquared(dec) });
    }
    results.sort((a, b) => a.score - b.score);

    const rows = results.map((r, i) => `
      <div class="bf-row ${i === 0 ? 'bf-best' : ''}">
        <span class="bf-shift">${r.rails} RAILS</span>
        <span class="bf-score">χ²&nbsp;${r.score.toFixed(1)}</span>
        <span class="bf-text">${escHtml(r.decrypted.slice(0, 72))}${r.decrypted.length > 72 ? '…' : ''}</span>
      </div>`).join('');

    showResults(`
      <div class="result-hdr">RAIL FENCE BRUTE FORCE</div>
      <div class="bf-list">${rows}</div>`);

    setOutput(results[0].decrypted);
    if ($('rail-count')) {
      $('rail-count').value = results[0].rails;
      $('rail-count-val').textContent = results[0].rails;
    }
    CH.drawRailFence('rail-canvas', $('input-text').value, results[0].rails);
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  document.addEventListener('DOMContentLoaded', init);
  return {};
})();
