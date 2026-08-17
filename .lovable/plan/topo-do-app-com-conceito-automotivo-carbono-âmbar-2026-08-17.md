# Topo do app com conceito automotivo (carbono + âmbar)

Refazer a primeira dobra da home (`/marketplace`) com linguagem de carro de corrida: fibra de carbono, cortes aerodinâmicos, luz âmbar como farol. Nada muda de posição — mesma ordem: hero, categorias, Entrega/PPP, Táxi, Espaço Social/Central de Negócios.

## Paleta
Mantém preto + âmbar (#F9A03F / #FFBE5A). Sem vermelho. O "vermelho Ferrari" entra só como atitude: contraste alto, superfícies escuras polidas, brilho especular.

## Hero
- Superfície escura com verniz automotivo: gradiente radial escuro + faixa de reflexo diagonal (highlight de lataria) atravessando o card.
- Sol âmbar no canto direito mantido, agora lendo como farol: núcleo quente + halo, com leve reação ao hover.
- Trama de fibra de carbono sutil sobre o preto (padrão SVG repetido, opacidade baixa) substituindo o grão atual.
- Saudação em display black, itálico levemente inclinado (postura de livery), com número/etiqueta discreta tipo "MT-24" em canto — detalhe fino, não poluído.
- Barra de busca vira "entrada de ar": cantos com chanfro, borda âmbar fina que acende no foco.

## Categorias (placas aerodinâmicas)
- Trocar os círculos por placas inclinadas tipo aerofólio: card escuro com corte diagonal (clip-path), skew leve, reflexo metálico no topo.
- Ícone em âmbar sobre carbono; ao tocar, a placa "acelera" (translada + o reflexo varre a superfície).
- Grid mantido 4 colunas no mobile / 8 no desktop, rótulos abaixo.

## Cards de ação (Entrega, PPP, Táxi, Social, Negócios)
- Mesmo layout e textos. Acabamento novo: painel carbono, borda de 1px que acende âmbar no hover, faixa de velocidade diagonal atravessando o canto.
- Ícone dentro de um "medidor" circular com aro âmbar.
- Card Táxi ganha marca d'água tipográfica maior e mais nítida (estilo número de carro), com faixas de vento à direita.
- Micro-animação: elevação + varredura de luz, sem exagero.

## Técnico
- Alterações concentradas em `src/routes/marketplace.index.tsx` (hero, `CATEGORIES`, banners) e utilitários novos em `src/styles.css`: `@utility carbon-weave`, `@utility spec-sheen`, `@utility aero-plate` (clip-path/skew) e um keyframe de varredura.
- Sem novas dependências; animações com framer-motion já instalado e CSS.
- Sem mudança de dados, rotas ou lógica de negócio.
