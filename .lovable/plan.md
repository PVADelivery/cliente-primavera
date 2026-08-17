# Padronizar o estilo "aero" em todo o app

Hoje só a home (`/marketplace`) usa a linguagem automotiva (fibra de carbono, verniz, placas aerodinâmicas, varredura de luz). O resto do app ainda usa cards genéricos. O plano leva esse estilo para todas as telas e corrige responsividade/acessibilidade.

## 1. Sistema de componentes "aero" (base)

Criar componentes reutilizáveis em `src/components/aero/`:

- `AeroTile` — mover o card da home para componente compartilhado (aro âmbar, faixa de velocidade, sheen no hover, ícone, título, subtítulo).
- `AeroCard` — superfície padrão (carbono + verniz + borda que acende) para substituir os cards soltos das outras telas.
- `AeroPlate` — chip/botão chanfrado usado em categorias, filtros, abas e chips de filtro.
- `AeroButton` — variantes `primary` (âmbar), `ghost` e `danger`, com estados de foco visíveis.
- `AeroField` — wrapper de input/select com label, foco âmbar e mensagem de erro.
- `AeroSection` — cabeçalho de seção com etiqueta técnica (ex. "MT-24 / 02").

Complementar `src/styles.css` com utilitários faltantes: `aero-focus` (anel de foco âmbar consistente), `aero-surface` e ajustes de `aero-plate` para funcionar em telas estreitas.

## 2. Home: grade responsiva e hierarquia

- Categorias em grade fluida: 2 colunas em telas muito estreitas, 3 em mobile padrão, 4–6 em tablet/desktop, com scroll horizontal apenas como opção, nunca cortando conteúdo.
- Cards de ação (Entrega, PPP, Táxi, Espaço Social, Central de Negócios) em grade `1 / 2 / 3` colunas com alturas iguais e espaçamento consistente.
- Título, busca e etiqueta técnica reorganizados para não se sobrepor em nenhuma largura (grid com `minmax(0,1fr)` + `min-w-0` + `truncate`).

## 3. Microinterações (framer-motion)

Padrão único aplicado a todos os cards/botões:
- entrada em cascata (`fade + rise`, stagger curto);
- `whileHover` com leve elevação e brilho da borda;
- `whileTap` com compressão (feedback tátil);
- varredura de luz no hover/press;
- tudo respeitando `prefers-reduced-motion`.

## 4. Aplicar o estilo em todas as telas

Refatorar visualmente (sem mudar regras de negócio) usando os componentes acima:

- Lojas: `/marketplace` listagem, `/marketplace/store/$storeId`
- Fluxo de compra: carrinho, checkout, endereços, pedidos e detalhe do pedido
- Serviços: táxi, entregas (errands), corridas
- Diretório PPP, Espaço Social
- Central de Negócios: listagem, detalhe do imóvel, veículos (abas, filtros e chips viram `AeroPlate`)
- Perfil, busca, login, cadastro, termos e privacidade
- `MarketplaceLayout`: barra inferior e cabeçalho no mesmo acabamento, com área de toque mínima de 44px e indicador âmbar do item ativo

## 5. Contraste, tipografia e acessibilidade

- Substituir cores hardcoded/opacidades por tokens semânticos, garantindo contraste AA nos temas claro e escuro.
- Corpo de texto mínimo 14px, rótulos 12px com peso maior; títulos com escala responsiva.
- `focus-visible` visível em todos os botões, links, inputs e abas; navegação por teclado nas abas e chips.
- Verificar em 320px, 390px, 768px e 1280px que nada fica escondido atrás de barras fixas (padding inferior seguro em todas as telas).

## Detalhes técnicos

- Novos arquivos em `src/components/aero/*`; utilitários adicionais no `src/styles.css` via `@utility` (Tailwind v4).
- Alterações restritas a apresentação: nenhuma query Supabase, RLS, preço ou fluxo de dados é modificado.
- Verificação final com Playwright: capturas em mobile e desktop das telas principais e checagem do console.
