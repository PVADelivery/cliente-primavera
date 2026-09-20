export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Instabilidade Temporária — MT 24horas express</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 14px/1.5 system-ui, -apple-system, sans-serif; background: #09090b; color: #f4f4f5; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; box-sizing: border-box; }
      .card { max-width: 26rem; width: 100%; text-align: center; padding: 2rem; background: #18181b; border: 1px solid #27272a; border-radius: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
      .icon { width: 3.5rem; height: 3.5rem; border-radius: 1rem; background: rgba(245, 158, 11, 0.15); color: #f59e0b; display: inline-flex; align-items: center; justify-content: center; font-size: 1.75rem; margin-bottom: 1rem; border: 1px solid rgba(245, 158, 11, 0.3); }
      h1 { font-size: 1.25rem; font-weight: 800; margin: 0 0 0.5rem; color: #fafafa; }
      p { color: #a1a1aa; font-size: 0.875rem; line-height: 1.5; margin: 0 0 1.25rem; }
      .actions { display: flex; flex-direction: column; gap: 0.5rem; }
      .row-actions { display: flex; gap: 0.5rem; }
      a, button { padding: 0.75rem 1rem; border-radius: 0.75rem; font-size: 0.8125rem; font-weight: 700; cursor: pointer; text-decoration: none; border: 1px solid transparent; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; }
      .wa { background: #25D366; color: #ffffff; }
      .wa:hover { background: #1fb457; }
      .primary { background: #facc15; color: #09090b; flex: 1; }
      .primary:hover { background: #eab308; }
      .secondary { background: #27272a; color: #f4f4f5; border-color: #3f3f46; flex: 1; }
      .secondary:hover { background: #3f3f46; }
      #lovable-badge-container, .lovable-badge-container, #lovable-badge, .lovable-badge, lovable-badge, div[id*="lovable"], div[class*="lovable"], span[class*="lovable"], a[href*="lovable"], iframe[src*="lovable"], [data-lovable-badge], [data-component-tag] { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; position: absolute !important; top: -9999px !important; left: -9999px !important; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">⚠️</div>
      <h1>Instabilidade Temporária</h1>
      <p>Ocorreu uma falha no carregamento. Por favor, <strong>envie este erro para o suporte da BonaSoft</strong> para correção imediata.</p>
      <div class="actions">
        <a class="wa" href="https://wa.me/556697196937?text=Ol%C3%A1%20equipe%20BonaSoft%2C%20ocorreu%20um%20erro%20no%20app%20MT%2024horas%20express." target="_blank">Mandar para a BonaSoft (WhatsApp)</a>
        <div class="row-actions">
          <button class="primary" onclick="location.reload()">Tentar de novo</button>
          <a class="secondary" href="/">Início</a>
        </div>
      </div>
    </div>
  </body>
</html>`;
}
