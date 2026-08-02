## Objetivo

Adicionar dois novos cards na home (`src/routes/marketplace.index.tsx`), logo abaixo do card "Táxi & Moto Táxi":

- **Espaço Social** → classificados sociais (vagas, achados e perdidos, doações, serviços)
- **Central de Negócios** → portal de imóveis (imobiliárias e afins)

## Home

Nova `<section className="grid grid-cols-2 gap-3">` abaixo do Táxi, no mesmo estilo dos cards "Solicitar Entrega"/"Agenda da Cidade" (rounded-3xl, `bg-card`, borda, `--shadow-card`, ícone lucide em `text-primary`):

- "Espaço Social" / "Classificados da cidade" → `/marketplace/social`
- "Central de Negócios" / "Imóveis e locação" → `/marketplace/business`

## Central de Negócios — `/marketplace/business`

Tela de listagem de imóveis, mobile-first, lendo do Supabase externo:

- Filtros no topo: tipo de negócio (Locação/Venda) e tipo de imóvel (Casa, Apartamento, Sala, Kitnet, Terreno), além de busca por bairro.
- Card por imóvel: selo de negócio + tipo, bairro + cidade/UF, descrição, e linha de atributos com ícones (área m², quartos, vagas, banheiros — só aparecem os que existirem), e valor em destaque ("Valor: R$ 1.200,00" ou "Consulte" quando nulo).
- Ordenação por valor crescente, imóveis sem valor por último.
- Detalhe do imóvel em `/marketplace/business/$propertyId` com descrição completa, atributos e botão de contato (WhatsApp/telefone da imobiliária).
- Estados de loading (skeleton), vazio e erro.

## Espaço Social — `/marketplace/social`

Lista de classificados sociais com abas por categoria (Vagas, Achados e perdidos, Doações, Serviços), card com título, categoria, descrição, autor/contato e data, além de botão "Publicar" (exige login) com formulário simples.

## Banco de dados (Supabase externo)

Vou gerar dois scripts SQL em `scripts/` para você rodar no seu projeto — não altero seu banco sozinho:

- `scripts/properties.sql`: tabela `public.properties` (id, agency_id/owner user_id, deal_type, property_type, neighborhood, city, state, description, total_area, built_area, bedrooms, bathrooms, parking, price nullable, contact_phone, images, is_active, timestamps), GRANTs (`SELECT` para `anon`/`authenticated`, `ALL` para `service_role`), RLS habilitada, policy pública de leitura de ativos e policies de escrita restritas ao dono/admin via `has_role()`. Inclui INSERTs com os 12 imóveis que você colou.
- `scripts/social_posts.sql`: tabela `public.social_posts` (id, user_id, category enum, title, body, contact, images, is_active, created_at) com o mesmo padrão de GRANTs + RLS (leitura pública, escrita apenas do próprio usuário).

## Detalhes técnicos

- Rotas file-based do TanStack: `src/routes/marketplace.business.tsx`, `src/routes/marketplace.business.$propertyId.tsx`, `src/routes/marketplace.social.tsx`.
- Cada rota com `head()` próprio (title/description/og).
- Tipos novos em `src/types/database.ts` (`Property`, `SocialPost`) e entradas em `Database["public"]["Tables"]`.
- Consultas via `supabase` de `src/lib/supabase.ts` com `useQuery`; enquanto as tabelas não existirem, a tela mostra o estado vazio sem quebrar (tratamento de `PGRST205`).
- Sem alterações no hero, tema ou tokens existentes.
