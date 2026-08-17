# Padronização Aero + Acessibilidade

## 1. Nova ordem da barra inferior
Reordenar para: **Início, Carrinho, Pedidos, Corridas, PPP, Perfil** (em `MarketplaceLayout.tsx`), mantendo o badge de quantidade no Carrinho e o indicador de rota ativa.

## 2. Auditoria de acessibilidade (home e primeiras telas)
- Verificar contraste de textos sobre carbono/âmbar e trocar cores soltas por tokens do tema.
- Garantir foco visível (anel âmbar) em todos os botões, links, inputs e selects.
- Navegação por teclado completa: ordem lógica, sem armadilhas, `aria-label` em botões só de ícone.
- Alvos de toque de 44px e nenhum elemento cortado/escondido em 360–430px de largura.
- Um único `<main>`, hierarquia de títulos correta e `aria-live` nos avisos de carregamento/erro.

## 3. Estados padrão de botões e inputs
Padronizar no `AeroButton`/`AeroField` e nos utilitários de estilo:
- **foco**: anel âmbar visível por teclado
- **disabled**: opacidade reduzida, sem brilho, cursor bloqueado
- **erro**: borda vermelha + mensagem com ícone (não só cor)
- **loading**: spinner interno, botão bloqueado, texto de progresso

## 4. Componentes compartilhados
Ampliar a biblioteca Aero (`src/components/aero`) com: `AeroChip` (filtros âmbar), `AeroTabs` (placas aerodinâmicas), `AeroEmptyState`, `AeroSkeleton`.
Substituir as implementações soltas em: PPP, Central de Negócios, Veículos, Espaço Social, Busca, Loja, Carrinho, Checkout, Pedidos, Corridas, Perfil, Endereços.

## 5. Skeletons e carregamento
Adicionar skeletons com brilho suave (mesma altura do conteúdo final, sem "pulo" de layout) nas telas que buscam dados: home (lojas/categorias), PPP, Negócios, Veículos, Social, Busca, Loja, Pedidos, Corridas. Estados vazios e de erro com ação de tentar novamente.

## 6. Checklist de responsividade
Rodar verificação automatizada em 360, 390, 430, 768, 1024 e 1280px nas rotas principais, conferindo: sem rolagem horizontal, grids fluidos, textos legíveis, hover/varredura funcionando e respeito a `prefers-reduced-motion`. Correções aplicadas onde falhar.

## Notas técnicas
- Sem mudanças de backend, regras de negócio ou consultas ao Supabase.
- Motion continua via framer-motion, com fallback para movimento reduzido.
- Tokens e utilitários seguem em `src/styles.css` (Tailwind v4 `@utility`).
