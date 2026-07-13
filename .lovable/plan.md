## Objetivo

Remover do painel hero (em `src/routes/marketplace.index.tsx`) os elementos que foram adicionados sem pedido:

- Badge "Entregando agora" (com o ponto verde pulsante)
- Bloco de métricas rápidas: "⚡ 30 min / entrega média" e "★ N+ lojas / na sua cidade"

## Escopo

Arquivo único: `src/routes/marketplace.index.tsx`, apenas na seção `{/* ── Hero ── */}`.

Manter intacto tudo que já estava aprovado:
- Fundo preto + gradiente radial escuro/dourado
- Sol (halo + núcleo) no canto superior direito
- Textura de grão sutil
- Título `{greeting},` + `{firstName}.` com o nome em gradiente dourado
- Subtítulo "O que você quer pedir hoje na sua cidade?"
- `<SmartSearchBar />`

## Alterações

Dentro da `<section>` do hero, remover:
1. O `<div>` com o selo "Entregando agora" (badge no topo do conteúdo).
2. O `<div className="flex items-center gap-5 pt-1 ...">` que contém as duas métricas e o divisor vertical.

Nada mais é tocado — sem mudanças em categorias, banners, listas, tokens de tema ou outros arquivos.
