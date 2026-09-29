import type { Product } from "@/types/database";

export function getFallbackProductsForCompany(companyId: string, companyCategory?: string | null, companyName?: string | null): (Product & { promo?: number })[] {
  const normCat = (companyCategory || "").toLowerCase().trim();
  const normName = (companyName || "").toLowerCase().trim();

  const isLanche = normCat.includes("lanche") || normName.includes("burger") || normName.includes("lanche");
  const isPizza = normCat.includes("pizza") || normName.includes("pizza");
  const isAcai = normCat.includes("açaí") || normCat.includes("acai") || normCat.includes("sorvet") || normCat.includes("doce") || normName.includes("açaí") || normName.includes("acai") || normName.includes("sorvet");
  const isPadaria = normCat.includes("padaria") || normCat.includes("café") || normCat.includes("cafe") || normName.includes("pão") || normName.includes("pao");
  const isFarmacia = normCat.includes("farmácia") || normCat.includes("farmacia") || normCat.includes("drogaria") || normName.includes("farma") || normName.includes("popular");
  const isBebida = normCat.includes("bebida") || normCat.includes("adega") || normCat.includes("distribuidora") || normName.includes("bebida");

  let templates: Array<{
    name: string;
    price: number;
    description: string;
    category: string;
    imageUrl: string;
    promo?: number;
  }> = [];

  if (isPizza) {
    templates = [
      {
        name: "Pizza Grande Calabresa Especial",
        price: 49.90,
        description: "Molho de tomate artesanal, bastante mussarela, calabresa fininha fatiada, cebola e azeitonas pretas.",
        category: "Pizzas Salgadas",
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
        promo: 10,
      },
      {
        name: "Pizza Grande Quatro Queijos",
        price: 54.90,
        description: "Combinação nobre de mussarela, provolone curado, gorgonzola e requeijão cremoso Catupiry.",
        category: "Pizzas Salgadas",
        imageUrl: "https://images.unsplash.com/photo-1573821663912-569905455b1c?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Pizza Grande Frango com Catupiry",
        price: 52.00,
        description: "Peito de frango desfiado e temperado na manteiga de ervas, coberto com Catupiry e mussarela.",
        category: "Pizzas Salgadas",
        imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Pizza Média Portuguesa Tradicional",
        price: 44.00,
        description: "Presunto fatiado, ovos cozidos, ervilhas frescas, cebola, mussarela e orégano chileno.",
        category: "Pizzas Salgadas",
        imageUrl: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Brotinho Doce de Nutella com Morango",
        price: 29.90,
        description: "Massa fininha e crocante, recheada com Nutella pura e pedaços de morangos selecionados.",
        category: "Pizzas Doces",
        imageUrl: "https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Refrigerante 2 Litros Gelado",
        price: 14.00,
        description: "Garrafa de 2 litros perfeita para acompanhar sua pizza em família.",
        category: "Bebidas",
        imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
      },
    ];
  } else if (isAcai) {
    templates = [
      {
        name: "Copo Açaí Especial 500ml",
        price: 22.00,
        description: "Açaí cremoso batido com guaraná, leite condensado, leite Ninho e rodelas de banana.",
        category: "Açaí no Copo",
        imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=80",
        promo: 15,
      },
      {
        name: "Taça Suprema Açaí com Nutella e Morango",
        price: 28.00,
        description: "Camadas generosas de açaí artesanal, Nutella pura, leite Ninho e morango fresco.",
        category: "Taças Especiais",
        imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Pote de Sorvete Artesanal 1 Litro",
        price: 32.00,
        description: "Massa super cremosa produzida diariamente com os melhores ingredientes.",
        category: "Sorvetes",
        imageUrl: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Picolé Gourmet Trufado",
        price: 8.50,
        description: "Picolé artesanal coberto com casquinha crocante de chocolate belga.",
        category: "Picolés",
        imageUrl: "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Bolo de Pote Ninho com Nutella",
        price: 14.00,
        description: "Massa fofinha de chocolate com recheio cremoso de Ninho e Nutella.",
        category: "Sobremesas",
        imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Água Mineral com Gás 500ml",
        price: 4.00,
        description: "Água mineral gelada para refrescar.",
        category: "Bebidas",
        imageUrl: "https://images.unsplash.com/photo-1559839914-1b3334208a50?w=600&auto=format&fit=crop&q=80",
      },
    ];
  } else if (isPadaria) {
    templates = [
      {
        name: "Combo Café da Manhã Especial",
        price: 24.00,
        description: "Pão francês na chapa com requeijão tostado, café com leite cremoso e fatia de bolo caseiro.",
        category: "Combos Matinais",
        imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Pão de Queijo Mineiro (Porção 6 unidades)",
        price: 15.00,
        description: "Quentinhos, crocantes por fora e macios por dentro com queijo da Canastra.",
        category: "Salgados",
        imageUrl: "https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Croissant Misto Quente Folhado",
        price: 16.50,
        description: "Massa folhada amanteigada com recheio de presunto e queijo derretido.",
        category: "Folhados",
        imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Cappuccino Italiano Cremoso 300ml",
        price: 11.00,
        description: "Café expresso especial com leite vaporizado, toque de cacau e canela em pó.",
        category: "Cafés",
        imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Torta de Frango com Requeijão (Fatia)",
        price: 14.00,
        description: "Massa leve que derrete na boca, recheio úmido e muito temperado.",
        category: "Tortas",
        imageUrl: "https://images.unsplash.com/photo-1519869325930-281384150729?w=600&auto=format&fit=crop&q=80",
      },
    ];
  } else if (isFarmacia) {
    templates = [
      {
        name: "Kit Primeiros Socorros Família",
        price: 29.90,
        description: "Contém curativos adesivos hipoalergênicos, gaze estéril, esparadrapo e álcool antisséptico 70%.",
        category: "Primeiros Socorros",
        imageUrl: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Protetor Solar Facial Toque Seco FPS 50",
        price: 55.00,
        description: "Alta proteção UVA/UVB com controle de oleosidade e rápida absorção na pele.",
        category: "Cuidados Diários",
        imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Vitamina C + Zinco Efervescente (10 comp)",
        price: 18.50,
        description: "Ajuda no fortalecimento da imunidade e disposição diária com sabor laranja.",
        category: "Vitaminas",
        imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Hidratante Corporal Pele Seca 400ml",
        price: 38.00,
        description: "Hidratação profunda por 24 horas, textura leve e suave fragrância.",
        category: "Cuidados Diários",
        imageUrl: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Dipirona Monoidratada 500mg (10 comprimidos)",
        price: 8.90,
        description: "Analgésico e antitérmico para alívio rápido de dores e febre.",
        category: "Medicamentos",
        imageUrl: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop&q=80",
      },
    ];
  } else if (isBebida) {
    templates = [
      {
        name: "Água Mineral Natural sem Gás 500ml",
        price: 3.50,
        description: "Água mineral pura e cristalina, super gelada.",
        category: "Águas",
        imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Refrigerante Coca-Cola 2 Litros",
        price: 13.90,
        description: "O sabor clássico inconfundível bem gelado entregue na sua porta.",
        category: "Refrigerantes",
        imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Refrigerante Guaraná Antarctica 2L",
        price: 11.50,
        description: "O original do Brasil, bem gelado.",
        category: "Refrigerantes",
        imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Cerveja Puro Malte Long Neck (Pack 6 un)",
        price: 39.90,
        description: "Pack com 6 cervejas long neck puro malte trincando de geladas.",
        category: "Cervejas",
        imageUrl: "https://images.unsplash.com/photo-1608270119330-9b48f6c44dd3?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Energético Lata 250ml",
        price: 9.90,
        description: "Bebida energética estimulante e refrescante.",
        category: "Energéticos",
        imageUrl: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Pacote de Gelo Filtrado em Cubos 5kg",
        price: 15.00,
        description: "Gelo produzido com água 100% filtrada para suas bebidas.",
        category: "Gelo & Acessórios",
        imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80",
      },
    ];
  } else {
    // Default Lanches / Restaurantes
    templates = [
      {
        name: "Combo Burger Clássico + Batata Frita",
        price: 34.90,
        description: "Pão brioche selado na manteiga, blend suculento 160g, queijo cheddar derretido, maionese especial e porção de batata frita.",
        category: "Combos & Lanches",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
        promo: 10,
      },
      {
        name: "X-Tudo Especial da Casa",
        price: 28.00,
        description: "Hambúrguer bovino, ovo, bacon crocante, presunto, queijo mussarela, alface, tomate fresco e milho no pão macio.",
        category: "Lanches Tradicionais",
        imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Smash Burger Duplo Cheddar e Bacon",
        price: 26.50,
        description: "2 carnes smash fininhas com crostinha saborosa, dobro de queijo cheddar fatiado e fatias de bacon crocante.",
        category: "Combos & Lanches",
        imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Batata Frita Crocante com Cheddar e Bacon",
        price: 22.00,
        description: "Porção generosa de batatas fritas douradas, cobertas com molho cheddar cremoso e pedacinhos de bacon frito.",
        category: "Porções & Acompanhamentos",
        imageUrl: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Refrigerante Lata 350ml Gelado",
        price: 6.00,
        description: "Refrigerante bem gelado para acompanhar seu lanche ou refeição.",
        category: "Bebidas",
        imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Suco Natural de Laranja 500ml",
        price: 10.00,
        description: "Suco 100% natural, espremido na hora, sem conservantes.",
        category: "Bebidas",
        imageUrl: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80",
      },
    ];
  }

  return templates.map((t, idx) => ({
    id: `fb-${companyId.slice(0, 8)}-${idx + 1}`,
    company_id: companyId,
    name: t.name,
    price: t.price,
    description: t.description,
    category: t.category,
    image_url: t.imageUrl,
    image_urls: [t.imageUrl],
    is_active: true,
    promo: t.promo,
  }));
}
