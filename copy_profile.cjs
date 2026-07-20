const fs = require('fs');
let code = fs.readFileSync('C:\\Users\\antho\\.gemini\\antigravity-ide\\scratch\\eprajadelivery01-del\\instant-hub-343007e1\\src\\pages\\marketplace\\Profile.tsx', 'utf-8');

code = code.replace(/import \{ useNavigate \} from 'react-router-dom';/g, 
  "import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';\n\nexport const Route = createFileRoute('/marketplace/profile')({\n  head: () => ({ meta: [{ title: 'Perfil — MT Express' }] }),\n  component: Profile,\n});\n");

code = code.replace(/export default function Profile/g, 'function Profile');
code = code.replace(/<MarketplaceLayout>/g, '<div className="min-h-screen bg-background pb-20">');
code = code.replace(/<\/MarketplaceLayout>/g, '</div>');
code = code.replace(/import MarketplaceLayout/g, '// import MarketplaceLayout');

fs.writeFileSync('C:\\Users\\antho\\.gemini\\antigravity-ide\\scratch\\pva-delivery-primavera\\cliente-primavera\\src\\routes\\marketplace.profile.tsx', code);
