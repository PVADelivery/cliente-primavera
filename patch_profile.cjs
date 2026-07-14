const fs = require('fs');
let code = fs.readFileSync('C:\\Users\\antho\\.gemini\\antigravity-ide\\scratch\\pva-delivery-primavera\\cliente-primavera\\src\\routes\\marketplace.profile.tsx', 'utf-8');

code = code.replace(/import \{ useTheme \} from '@\/contexts\/ThemeContext';/g, '');
code = code.replace(/import \{ useAddress \} from '@\/contexts\/AddressContext';/g, '');
code = code.replace(/const \{ theme, toggleTheme \} = useTheme\(\);/g, 
  "const theme = localStorage.getItem('theme') || 'light';\n  const toggleTheme = () => {\n    const newTheme = theme === 'light' ? 'dark' : 'light';\n    localStorage.setItem('theme', newTheme);\n    if (newTheme === 'dark') document.documentElement.classList.add('dark');\n    else document.documentElement.classList.remove('dark');\n    window.dispatchEvent(new Event('storage'));\n  };"
);
code = code.replace(/const \{ selectedAddress \} = useAddress\(\);/g, "const selectedAddress = { region_id: 'none' };");
code = code.replace(/import \{ SupportChat \} from '@\/components\/chat\/SupportChat';/g, "import { SupportChat } from '@/components/chat/SupportChat';");

fs.writeFileSync('C:\\Users\\antho\\.gemini\\antigravity-ide\\scratch\\pva-delivery-primavera\\cliente-primavera\\src\\routes\\marketplace.profile.tsx', code);
