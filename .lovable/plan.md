## Diagnóstico (o que está realmente quebrado)

Olhando o print da tela /marketplace, há 3 problemas concretos — não é "design ruim", é app quebrado:

1. **Conteúdo não carrega** — "Em destaque" e "Lojas próximas" ficam infinitos em skeleton (3 caixas brancas vazias), e o chip mostra "0 lojas". Causa raiz no código (`src/lib/supabase.ts` linhas 10–15 e `src/routes/marketplace.index.tsx` linhas 489–497):
   - O arquivo `supabase.ts` lê `VITE_SUPABASE_ANON_KEY`, mas o `.env` do projeto só tem `VITE_SUPABASE_PUBLISHABLE_KEY` (o novo nome). Resultado: a chave cai no placeholder `"YOUR-ANON-KEY"`.
   - `isSupabaseConfigured` então fica `false` em alguns cenários e `true` em outros (dependendo de qual env Vite injeta). Quando vira `true`, o `select` em `companies` chama Supabase com credencial inválida e o `useQuery` fica preso sem resolver — daí o skeleton infinito.

2. **Aba "Aberto agora" duplicada** — aparece nas opções de ordenação (`SORT_OPTIONS` linha 323) **e** como toggle separado (linha 364). Duas abas com o mesmo nome lado a lado.

3. **Hero com logo estourando** — em viewport estreito (~948px no print) o bloco preto à direita com o logo cobre metade do hero e empurra o título; o `max-w-[48%]` colide com a faixa preta `w-[52%]`.

A página `/marketplace/store/:storeId` também usa `MOCK_PRODUCTS` puro — não consulta Supabase de verdade — e o hero/cabeçalho precisa do mesmo tratamento responsivo.

## Etapa 1 — Destravar o carregamento de dados (prioridade máxima)

**Arquivo: `src/lib/supabase.ts`**
- Aceitar os 3 nomes possíveis de chave anônima/publishable, na ordem: `VITE_SUPABASE_PUBLISHABLE_KEY` → `VITE_SUPABASE_ANON_KEY` → placeholder.
- Trocar a heurística `isSupabaseConfigured` para validar formato real (URL com `supabase.co` E chave começando com `eyJ` ou `sb_publishable_`), em vez de só conferir o texto `"YOUR-"`.
- Exportar `isSupabaseConfigured` consistente para uso no resto do app.

**Arquivo: `src/routes/marketplace.index.tsx`** (linhas 489–497)
- Envolver a chamada Supabase em `Promise.race` com timeout de 4s → se demorar, retorna `MOCK` em vez de pendurar a UI.
- Adicionar `try/catch` explícito; qualquer erro também cai em `MOCK`.
- Garantir que `stores` nunca fique `undefined` por muito tempo: usar `placeholderData: MOCK` no `useQuery` para a UI renderizar com dados imediatamente enquanto a query resolve.

**Arquivo: `src/routes/marketplace.store.$storeId.tsx`**
- Aplicar a mesma estratégia: timeout + fallback para MOCK, `placeholderData` no `useQuery`.

Resultado esperado: a home mostra as 4 lojas do mock instantaneamente; quando Supabase real estiver configurado, ele assume sem flash de loading.

## Etapa 2 — Corrigir bugs visíveis na home

**Arquivo: `src/routes/marketplace.index.tsx`**

- **Remover duplicação da aba "Aberto agora"**: tirar a opção `{ key: "open", label: "Aberto agora" }` do `SORT_OPTIONS` (linha 323). O toggle `openOnly` (linhas 353–365) é o único controle válido e fica destacado em verde quando ativo. Atualizar o tipo `SortKey` para `"relevance" | "rating" | "fee"`.

- **Corrigir o hero responsivo** (linhas 515–542):
  - Em telas <640px o bloco preto da logo cobre 52% e estoura. Reduzir para `w-[44%]` em mobile e `sm:w-[48%]`, com `max-w-[56%]` no bloco de texto à esquerda.
  - Diminuir `rounded-l-[130px]` para `rounded-l-[80px] sm:rounded-l-[130px]` (curva proporcional).
  - Diminuir headline para `text-[24px] sm:text-[28px]` e dar `min-h` ao hero para evitar colapso quando o seletor de endereço estiver vazio.
  - Garantir `z-10` real no texto e no `SmartSearchBar` para nunca sumirem atrás do bloco preto.

- **Polimento da grid de categorias** (linhas 545–569): mostrar todas as 8 categorias em mobile usando `grid-cols-4` (já faz) mas ajustar gap e tamanho do círculo para `w-14 h-14` para ficar mais Rappi/iFood; adicionar leve `bg-gradient` no hover do círculo.

## Etapa 3 — Refinar a página da loja

**Arquivo: `src/routes/marketplace.store.$storeId.tsx`**

- Aplicar o mesmo padrão responsivo do hero (não há print novo, mas o usuário disse "ambas").
- Garantir que a barra sticky de categorias não fique escondida atrás do header global do `MarketplaceLayout` (ajustar `top-` do `sticky`).
- Reduzir tamanho de imagens dos pratos em mobile (`80×80` em vez de `88×88`) para não estourar largura em viewport ~360px.
- Adicionar estado vazio bonito quando `filteredProducts.length === 0` (mensagem "Nenhum item encontrado para '...'" com ilustração leve).

## Detalhes técnicos

- Nenhuma mudança em schema/RLS — toda a etapa 1 é ajuste de cliente.
- Nenhum novo `npm` package.
- Não tocar em `MarketplaceLayout`, rotas de autenticação, ou outras telas.
- Validação após cada etapa: `browser--screenshot` em viewport 390×844 (mobile) e 1280×800 (desktop) para confirmar que a home mostra as 4 lojas e a página da loja exibe os pratos.

## Fora de escopo

- Não vou refazer o design todo (você pediu "corrija tudo em etapas", não redesign). Se depois quiser 3 direções visuais novas, abrimos uma nova rodada.
- Não vou popular a tabela `companies` real no Supabase — quando você quiser dados reais, basta inserir lojas na tabela e o app passa a usar automaticamente.
