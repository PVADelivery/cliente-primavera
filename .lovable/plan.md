# Inverter cores dos botões da home + nuvem branca

Inverter as cores dos botões da home (fundo preto → âmbar; interior âmbar → preto) e adicionar um halo branco difuso ("nuvem") atrás deles. Escopo: placas de categoria + cards de serviço visíveis no print (Solicitar Entrega, PPP, Táxi & Moto Táxi, Espaço Social, Central de Negócios).

## Escopo confirmado
- **Placas de categoria** (Restaurantes, Mercado, Farmácia, Pizza, Doces, Cafés, Shopping, Bebidas)
- **Cards de serviço**: `AeroPanel` (Solicitar Entrega, PPP, Espaço Social, Central de Negócios) e o link do **Táxi & Moto Táxi**
- Não inclui a barra de busca do hero nem a navegação inferior.

## Inversão de cores
Cada botão troca fundo×interior:

| Antes (escuro/carbono)         | Depois (âmbar)                          |
|---------------------------------|-----------------------------------------|
| Fundo: gradiente preto/carbono  | Fundo: gradiente âmbar (`#FFBE5A → #F9A03F → #E8892B`) |
| Ícone âmbar sobre carbono       | Ícone preto (`text-black`)              |
| Texto branco                    | Texto preto (`text-black` / `text-zinc-900`) |
| Círculo do ícone: âmbar/anel    | Círculo do ícone: preto, anel preto     |

Mantém `carbon-weave`/`clearcoat`/`spec-sheen` como textura sutil sobre o novo fundo âmbar (em opacidade baixa) para não perder a identidade "aero", e o chanfro `aero-plate` nas categorias.

## Nuvem (halo branco difuso)
Atrás de cada botão, um elemento absoluto `pointer-events-none`:
```
<span aria-hidden className="absolute -inset-3 rounded-[2rem] bg-white/45 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
```
- Aparece no hover/tap (e visível por padrão numa opacidade baixa, ex. `opacity-60`, para o efeito "nuvem ao redor" mesmo sem interação).
- Atras do conteúdo (`-z-10`) para não cobrir o ícone/texto.
- Respeita `prefers-reduced-motion` (sem varredura de luz).

## Arquivos a editar
- `src/routes/marketplace.index.tsx`
  - `AeroPanel` (linhas ~62–93): inverter cores do fundo, círculo do ícone e textos; adicionar nuvem.
  - Bloco das **categorias** (linhas ~626–642): inverter fundo da placa, ícone e label; adicionar nuvem.
  - Link do **Táxi** (linhas ~657–677): inverter fundo, ícone e textos; adicionar nuvem.

## Detalhes técnicos
- Apenas apresentação: nenhuma query, RLS, preço ou rota é alterada.
- Cores via valores oklch/hex inline já usados no arquivo (mesma paleta `#F9A03F`/`#FFBE5A`/`#E8892B`), sem introduzir tokens hardcoded novos no sistema.
- Verificação final: captura Playwright mobile da home confirmando fundo âmbar, ícones pretos e halo branco visível no hover.
