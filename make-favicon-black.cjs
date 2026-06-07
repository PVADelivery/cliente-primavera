const { Jimp } = require("jimp");

async function fixFavicon() {
  try {
    const image = await Jimp.read("public/favicon.png");
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      const a = this.bitmap.data[idx + 3];

      // Se for quase branco, pinta de preto
      if (r > 240 && g > 240 && b > 240 && a > 100) {
        this.bitmap.data[idx + 0] = 10; // Quase preto (fundo igual da imagem enviada)
        this.bitmap.data[idx + 1] = 10;
        this.bitmap.data[idx + 2] = 10;
        this.bitmap.data[idx + 3] = 255;
      }
    });

    await image.write("public/favicon.png");
    console.log("Favicon corrigido: Fundo branco substituído por preto.");
  } catch (e) {
    console.error("Erro:", e);
  }
}

fixFavicon();
