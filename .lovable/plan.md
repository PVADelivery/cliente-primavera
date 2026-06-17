## Objetivo
Transformar a página da loja (`/marketplace/store/:storeId`) — hoje um banner laranja chapado com cards genéricos — em uma experiência nível iFood/Rappi: cover real, header com parallax + sticky condensado, chips de categoria com scroll-spy, cards de prato com imagem e badge promo.

## Escopo (1 arquivo)
Editar apenas `src/routes/marketplace.store.$storeId.tsx` + gerar imagens.
Não mexer em backend, contextos, ou outras rotas.

## Mudanças visuais

### 1. Hero / Cover
- Trocar o `bg-secondary + gradient overlay` por imagem de capa real (cover-italian.jpg que já existe) com gradiente escuro de baixo p/ cima para garantir legibilidade.
- Altura: `h-56` (mobile) / `h-72` (sm+), full-bleed `-mx-4`.
- Botões flutuantes no topo: voltar (esquerda) + favoritar/compartilhar (direita), em pill `bg-background/80 backdrop-blur-md` com shadow-elegant.
- Logo da loja em card branco rounded-2xl flutuante sobreposto na borda inferior do cover (estilo iFood), com `--shadow-premium`.

### 2. Header da loja (info)
- Nome em font-display, 2xl/3xl bold.
- Linha de meta com pills: ★ rating · categoria · "Aberto agora" (verde).
- Card de info de entrega: grid 3 colunas (Entrega, Tempo estimado, Pedido mínimo) com ícones (Bike, Clock, ShoppingBag), separadores sutis, em card `rounded-2xl border bg-card`.
- Search inline "Buscar no cardápio..." com ícone.

### 3. Navegação de categorias (sticky)
- Barra horizontal scrollável de chips com nomes das categorias (Pratos, Sobremesas, ...).
- `sticky top-0 z-20 bg-background/95 backdrop-blur` com borda inferior.
- Chip ativo = `bg-primary text-primary-foreground`, inativos = `bg-muted`.
- Clicar rola até a seção (`scrollIntoView`); scroll-spy via IntersectionObserver atualiza chip ativo.

### 4. Cards de produto (premium)
- Layout horizontal: texto à esquerda, imagem quadrada 88×88 rounded-xl à direita, botão "+" flutuando no canto inferior direito da imagem (estilo iFood).
- Quando sem imagem: placeholder com gradient sutil + ícone de prato.
- Mostrar preço com destaque; se houver promo (mockado em 1 item), mostrar preço original riscado + badge "-20%" no canto da imagem.
- Hover: leve lift (`hover:-translate-y-0.5 transition-transform`), `shadow-sm` → `shadow-md`.
- Espaçamento generoso entre seções; títulos de categoria com tamanho lg e sublinhe sutil opcional.

### 5. Animações (framer-motion já no projeto)
- `motion.div` no hero com fade-in.
- Stagger nos cards de produto (`initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}}`).

## Imagens
Gerar 3 imagens em `src/assets/`:
- `dish-lasagna.jpg` — lasanha à bolonhesa, top-down, premium food photo.
- `dish-gnocchi.jpg` — nhoque ao sugo.
- `dish-tiramisu.jpg` — tiramisu fatia.

Mapear nos MOCK_PRODUCTS via `image_url`.
Cover continua usando `cover-italian.jpg` existente.

## Detalhes técnicos
- Imports adicionais: `Bike`, `Clock`, `ShoppingBag`, `Search`, `Heart`, `Share2`, `Minus` de lucide-react; `motion` de `framer-motion`; `useState`, `useEffect`, `useRef`.
- Scroll-spy: `useRef` por seção + IntersectionObserver para definir `activeCategory`.
- Tokens: usar `--shadow-premium`, `--shadow-elegant`, `--gradient-mesh` já definidos em `src/styles.css`. Sem cores hardcoded.
- Mobile-first; tudo cabe em 375px.

## Fora de escopo
- Não alterar carrinho, auth, layout global, ou outras telas.
- Não criar tabelas/políticas.
