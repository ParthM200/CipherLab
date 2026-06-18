window.CipherLab = window.CipherLab || {};

CipherLab.charts = (() => {
  const { getLetterFrequencies, EN_FREQ, ALPHA } = CipherLab.ciphers;

  let freqChart = null;

  function initFreqChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (freqChart) { freqChart.destroy(); freqChart = null; }

    freqChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ALPHA.split(''),
        datasets: [
          {
            label: 'Your Text',
            data: new Array(26).fill(0),
            backgroundColor: 'rgba(0,200,255,0.55)',
            borderColor: '#00C8FF',
            borderWidth: 1,
            order: 1
          },
          {
            label: 'English Baseline',
            data: ALPHA.split('').map(c => EN_FREQ[c]),
            type: 'line',
            borderColor: 'rgba(255,179,0,0.75)',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 2,
            pointBackgroundColor: '#FFB300',
            tension: 0.35,
            order: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 120 },
        plugins: {
          legend: {
            labels: { color: '#5A7A9A', font: { size: 10, family: 'JetBrains Mono' } }
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#5A7A9A', font: { size: 9, family: 'JetBrains Mono' } },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          y: {
            ticks: { color: '#5A7A9A', font: { size: 9 }, callback: v => v + '%' },
            grid: { color: 'rgba(255,255,255,0.04)' },
            max: 16,
            min: 0
          }
        }
      }
    });
  }

  function updateFreqChart(text) {
    if (!freqChart) return;
    const { freq } = getLetterFrequencies(text);
    freqChart.data.datasets[0].data = ALPHA.split('').map(c => +(freq[c] || 0).toFixed(2));
    freqChart.update('none');
  }

  // Caesar cipher wheel — two concentric rings, outer = plaintext, inner rotated by shift
  function drawCipherWheel(canvasId, shift) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const OR = Math.min(cx, cy) - 6;
    const IR = OR * 0.62;
    const OLR = OR - 16;
    const ILR = IR - 16;

    ctx.clearRect(0, 0, W, H);

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, OR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,200,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,200,255,0.04)';
    ctx.fill();

    // Inner ring
    ctx.beginPath();
    ctx.arc(cx, cy, IR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,179,0,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,179,0,0.04)';
    ctx.fill();

    // Tick marks between rings
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + (IR + 2) * Math.cos(angle);
      const y1 = cy + (IR + 2) * Math.sin(angle);
      const x2 = cx + (OR - 2) * Math.cos(angle);
      const y2 = cy + (OR - 2) * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Letters
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2 - Math.PI / 2;

      // Outer: plaintext A–Z
      ctx.fillStyle = '#00C8FF';
      ctx.font = 'bold 11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ALPHA[i], cx + OLR * Math.cos(angle), cy + OLR * Math.sin(angle));

      // Inner: ciphertext (shifted)
      const shifted = (i + shift) % 26;
      ctx.fillStyle = '#FFB300';
      ctx.fillText(ALPHA[shifted], cx + ILR * Math.cos(angle), cy + ILR * Math.sin(angle));
    }

    // Indicator arrow pointing up (12 o'clock)
    ctx.beginPath();
    ctx.moveTo(cx, cy - OR - 1);
    ctx.lineTo(cx - 5, cy - OR + 8);
    ctx.lineTo(cx + 5, cy - OR + 8);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,200,255,0.6)';
    ctx.fill();

    // Center label
    ctx.fillStyle = 'rgba(90,120,150,0.8)';
    ctx.font = '9px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`+${shift}`, cx, cy + 6);
    ctx.fillStyle = 'rgba(90,120,150,0.5)';
    ctx.font = '8px JetBrains Mono';
    ctx.fillText('SHIFT', cx, cy - 6);
  }

  // Rail fence zigzag — places each character on its rail visually
  function drawRailFence(canvasId, text, rails) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const chars = text.toUpperCase().replace(/[^A-Z ]/g, '').slice(0, 50);
    if (!chars.trim()) return;

    const n = chars.length;
    rails = Math.max(2, Math.min(rails, Math.ceil(n / 2)));
    const colW = (W - 24) / n;
    const rowH = (H - 16) / rails;
    const COLORS = ['#00C8FF', '#FFB300', '#00E676', '#CE93D8', '#FF3B5C', '#FF6B35', '#4FC3F7'];

    // Assign positions
    const positions = [];
    let rail = 0, dir = 1;
    for (let i = 0; i < n; i++) {
      positions.push(rail);
      if (rail === 0) dir = 1;
      else if (rail === rails - 1) dir = -1;
      rail += dir;
    }

    // Draw zigzag lines first
    ctx.beginPath();
    for (let i = 0; i < n - 1; i++) {
      const x1 = 12 + i * colW + colW / 2;
      const y1 = 8 + (positions[i] + 0.5) * rowH;
      const x2 = 12 + (i + 1) * colW + colW / 2;
      const y2 = 8 + (positions[i + 1] + 0.5) * rowH;
      if (i === 0) ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.strokeStyle = 'rgba(0,200,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw characters
    const fontSize = Math.min(12, colW * 0.9);
    ctx.font = `bold ${fontSize}px JetBrains Mono`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const x = 12 + i * colW + colW / 2;
      const y = 8 + (positions[i] + 0.5) * rowH;

      // Dot behind char
      ctx.beginPath();
      ctx.arc(x, y, fontSize * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = `${COLORS[positions[i] % COLORS.length]}18`;
      ctx.fill();

      ctx.fillStyle = COLORS[positions[i] % COLORS.length];
      ctx.fillText(chars[i], x, y);
    }
  }

  return { initFreqChart, updateFreqChart, drawCipherWheel, drawRailFence };
})();
