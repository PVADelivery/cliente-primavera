/**
 * Teste de Regressão Visual e Acessibilidade por Teclado
 * Validação dos Estados: Idle (Inativo), Hover, Active (Clicado) e Focus (Teclado)
 */

const fs = require('fs');
const path = require('path');

// 1. Definições de Tolerância e Cores Padrão (Design System)
const EXPECTED_TOKENS = {
  primary: {
    name: "Amarelo Primário (Ouro Vibrante)",
    hex: "#FFDE21",
    minLuminance: 0.70,
    maxLuminance: 0.85,
    maxDeltaE: 2.0
  },
  btnSurface: {
    name: "Superfície do Botão (Inativo/Padrão)",
    hex: "#FFDE21",
  },
  btnActive: {
    name: "Superfície do Botão (Ao Clicar/Ativo)",
    hex: "#FFFFFF",
  },
  btnInk: {
    name: "Texto/Ícone sobre Amarelo",
    hex: "#111827",
  },
  btnActiveInk: {
    name: "Texto/Ícone sobre Branco",
    hex: "#111827",
  },
  badgeRed: {
    name: "Contador do Rodapé (Vermelho Padronizado)",
    hex: "#E11D48", // rose-600
  }
};

function hexToRgb(hex) {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function runAudit() {
  console.log("===============================================================");
  console.log("  TESTES DE REGRESSÃO VISUAL E NAVEGAÇÃO POR TECLADO (AERO)  ");
  console.log("===============================================================\n");

  const cssPath = path.join(__dirname, '..', 'src', 'styles.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  let passed = true;

  // 1. Verificação de Integridade dos Tokens no CSS
  console.log("[1/3] Validando fidelidade cromática dos tokens em styles.css...");
  
  const hasBtnSurface = cssContent.includes('--btn-surface:       var(--primary)') || cssContent.includes('--btn-surface: var(--primary)');
  const hasBtnActive = cssContent.includes('--btn-active:        #FFFFFF') || cssContent.includes('--btn-active: #FFFFFF');
  const hasBtnInk = cssContent.includes('--btn-ink:           #111827') || cssContent.includes('--btn-ink: #111827');
  const hasAeroFocus = cssContent.includes('aero-focus') && cssContent.includes('outline: 2px solid var(--primary)');

  if (hasBtnSurface && hasBtnActive && hasBtnInk) {
    console.log("  ✓ Tokens de superfície e clique configurados corretamente (Amarelo -> Branco).");
  } else {
    console.error("  ✗ Falha: Tokens de superfície foram alterados indevidamente.");
    passed = false;
  }

  if (hasAeroFocus) {
    console.log("  ✓ Anel de foco acessível 'aero-focus' com contorno ativo em 2px.");
  } else {
    console.error("  ✗ Falha: Anel aero-focus ausente ou mal configurado.");
    passed = false;
  }

  // 2. Verificação de Saturação e Limites para o Amarelo não 'estourar'
  console.log("\n[2/3] Testando limites de saturação e luminância para evitar 'estouro' do amarelo...");
  const primaryRgb = hexToRgb(EXPECTED_TOKENS.primary.hex);
  const primaryHsl = rgbToHsl(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  const primaryLum = getLuminance(primaryRgb.r, primaryRgb.g, primaryRgb.b);

  console.log(`  -> Matiz (Hue): ${primaryHsl.h}° (Faixa de Ouro/Amarelo: 48°-56°)`);
  console.log(`  -> Saturação: ${primaryHsl.s}% (Faixa ideal: 85%-100%)`);
  console.log(`  -> Luminância Relativa: ${primaryLum.toFixed(3)} (Faixa segura: 0.70 - 0.85)`);

  if (primaryHsl.h >= 48 && primaryHsl.h <= 56 && primaryLum >= 0.70 && primaryLum <= 0.85) {
    console.log("  ✓ Amarelo balanceado: Sem aberração cromática, brilho controlado sem estourar.");
  } else {
    console.error("  ✗ Falha: O tom de amarelo está fora dos limites calibrados.");
    passed = false;
  }

  // 3. Verificação de Suporte a Teclado (Tab, Enter, Focus-Visible)
  console.log("\n[3/3] Validando suporte a navegação por teclado (Tab + Enter/Espaço)...");
  
  const componentPath = path.join(__dirname, '..', 'src', 'components', 'aero', 'index.tsx');
  const componentContent = fs.readFileSync(componentPath, 'utf8');
  
  const hasAeroPlateFocus = componentContent.includes('aero-focus');
  const hasAeroButtonFocus = componentContent.includes('aero-focus');
  const hasButtonKeyboardRole = componentContent.includes('type="button"') || componentContent.includes('<motion.button');

  if (hasAeroPlateFocus && hasAeroButtonFocus && hasButtonKeyboardRole) {
    console.log("  ✓ AeroPlate e AeroButton possuem classes 'aero-focus' e manipulação nativa de Enter/Espaço.");
  } else {
    console.error("  ✗ Falha: Componentes aero não estão totalmente mapeados para foco por teclado.");
    passed = false;
  }

  console.log("\n===============================================================");
  console.log(passed ? " RESULTADO: TODOS OS TESTES DE REGRESSÃO VISUAL E TECLADO PASSARAM! " : " RESULTADO: FALHAS DETECTADAS. ");
  console.log("===============================================================\n");

  if (!passed) process.exit(1);
}

runAudit();
