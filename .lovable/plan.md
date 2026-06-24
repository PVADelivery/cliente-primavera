## Objetivo

Eliminar todos os depoimentos/avaliações falsos (mocks) do app e fazer com que o rating exibido das lojas reflita avaliações reais: toda loja começa em 5,0 estrelas e só cai quando houver reviews ruins reais; se só houver reviews boas, mantém 5,0.

## Mudanças

### 1. `src/routes/marketplace.store.$storeId.tsx`
- Remover a constante `MOCK_REVIEWS` (linhas 48–52).
- Remover toda a seção "Avaliações" do hero (linhas 319–344), incluindo o carrossel de cards de depoimentos.
- Remover o import `MessageCircleHeart` (não usado depois).
- Buscar reviews reais via TanStack Query na tabela `reviews` do Supabase filtrando por `company_id = storeId` (com fallback gracioso: se a tabela não existir / erro / vazio → considera 5,0, count 0).
- Calcular `rating` no componente:
  - Se `reviewCount === 0` → `5.0`.
  - Caso contrário → média das `rating` das reviews (clamp 1–5, 1 casa decimal).
- Substituir o pill de rating no hero (linhas 282–286) para mostrar a nota calculada e `(N)` em vez de `(320+)` fixo; quando count = 0, mostrar apenas "Novo" ou a estrela com "5,0 · Novo".
- Remover dependência de `store?.rating` para exibição (mas manter a coluna no banco intacta — não alteramos schema).

### 2. `src/routes/marketplace.index.tsx`
- Nos MOCKs (`m1`–`m4`), trocar `rating` fixo (4.8, 4.6, 4.4, 4.9) por `5` para refletir o "começa em 5".
- Onde o card exibe rating (linhas ~420, 451, 651), exibir `s.rating?.toFixed(1) ?? "5,0"` (ou apenas `5.0` quando null).
- Manter ordenação `sort === "rating"` funcionando (já tolera null).
- Não vamos puxar reviews por loja na listagem (custo). A nota da listagem continua vindo de `companies.rating`, que o backend deve atualizar a partir das reviews reais (fora deste escopo de frontend). Default visual: 5,0 quando null.

### 3. Sem mudanças de schema
Não vamos criar nem alterar tabelas. Se a tabela `reviews` ainda não existir no Supabase, o fetch falha silenciosamente e a tela mostra 5,0 / "Novo". Quando a tabela existir (estrutura esperada mínima: `company_id uuid`, `rating int 1..5`, `comment text`, `created_at`, `customer_name text`), os dados reais aparecem automaticamente.

## Fora do escopo
- Criar tabela `reviews` e trigger para atualizar `companies.rating` (pode ser pedido em seguida).
- Tela para o cliente enviar avaliação após o pedido.

Após sua aprovação eu aplico as mudanças.