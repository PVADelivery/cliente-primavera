## Objetivo
Deixar o fundo com "sol" iluminando o app de forma consistente, sem prejudicar legibilidade nem performance, em desktop e mobile, no dark mode.

## Escopo
Somente `src/components/marketplace/MarketplaceLayout.tsx` e um pequeno ajuste em `src/styles.css` para a animação. Nenhuma alteração de lógica ou dados.

## Mudanças

### 1. Fundo responsivo (mobile ↔ desktop)
Hoje os dois halos usam tamanhos fixos em px (900px / 420px) posicionados com `-top/-right` em px. No mobile isso cobre metade da tela; no desktop fica minúsculo no canto.
- Trocar para tamanhos fluidos com `clamp()` via `vw`, ex: `clamp(420px, 55vw, 900px)` para o halo grande e `clamp(220px, 28vw, 520px)` para o núcleo.
- Posicionar como fração do próprio tamanho (`translate(-30%, -30%)` a partir de `top-0 right-0`) para que a proporção "quanto do sol aparece" seja igual em qualquer viewport.

### 2. Brilho e posicionamento
- Reduzir a intensidade central do halo grande (0.35 → 0.22) e do núcleo (0.55 → 0.38) para não ofuscar textos/botões.
- Encurtar o alcance: o halo grande cai a 0 aos ~60% (hoje 75%), evitando "vazamento" amarelado atrás do cartão do hero e da barra de busca.
- Manter o núcleo mais concentrado (0 aos ~50%) só no canto.

### 3. Animação suave, sem flicker
- Adicionar uma respiração muito lenta (opacity 0.9 ↔ 1, 8s ease-in-out infinite) via classe utilitária em `src/styles.css` (`@utility sun-breathe`), com `will-change: opacity` e `prefers-reduced-motion` desabilitando.
- Sem transform animado (evita repaints caros do blur) — apenas opacity.
- Manter `filter: blur()` estático; blur animado é o principal causador de jank em mobile.

### 4. Contraste e legibilidade
- Adicionar uma vinheta sutil no topo/laterais opostas (radial escuro a partir do canto inferior esquerdo, `rgba(0,0,0,0.35)` → transparente) só no dark mode, garantindo que títulos do hero e a barra de busca fiquem legíveis mesmo quando o sol está próximo.
- Garantir `z-0` no fundo e `z-10` no `<main>` (já está) — nenhuma mudança estrutural.
- Nenhuma cor hardcoded em componentes de conteúdo; o card preto do hero já contrasta.

## Fora do escopo
- Não alterar a home (`marketplace.index.tsx`), o card do hero, categorias, lista de lojas.
- Não mexer em roteamento, dados, Supabase, auth.
- Não introduzir bibliotecas novas.

## Validação
- Build passa.
- Verificar visualmente em 375px (mobile) e 1280px (desktop): proporção do sol equivalente; sem faixa amarela atrás da busca; textos nítidos.
- Sem novos erros de hidratação (o fundo é puramente CSS, não depende de `Date`/`window`).
