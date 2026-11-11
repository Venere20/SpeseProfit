const fs=require('node:fs');const path=require('node:path');const sharp=require(process.env.SHARP_MODULE||'sharp');
const root=path.resolve(__dirname,'..');const dir=path.join(root,'assets/ui');fs.mkdirSync(dir,{recursive:true});
const icons={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
 list:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',chart:'<path d="M3 3v18h18M6 16l5-6 4 3 5-8"/>',
 settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M13 14h2M7 18h2"/>',
 basket:'<path d="m3 9 3 12h12l3-12ZM8 9l4-6 4 6M9 13v4M15 13v4"/>',
 coffee:'<path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4ZM17 9h2a3 3 0 0 1 0 6h-2M7 3v2M12 3v2"/>',
 car:'<path d="m4 10 2-6h12l2 6M3 10h18v8H3ZM6 18v3M18 18v3M6 14h2M16 14h2"/>',
 bag:'<rect x="4" y="7" width="16" height="14" rx="2"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
 up:'<path d="m3 17 6-6 4 4 8-10M15 5h6v6"/>',down:'<path d="m3 7 6 6 4-4 8 10M15 19h6v-6"/>',
 warning:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16v1"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',filter:'<path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',wallet:'<path d="M20 7V4H5a2 2 0 0 0 0 4h16v13H5a2 2 0 0 1-2-2V6M17 12h4v5h-4Z"/>',
 heart:'<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 5 3 11 8 15 5-4 13-10 8-15Z"/>',
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',equal:'<path d="M5 8h14M5 16h14"/>',
 fuel:'<path d="M4 21V4h10v17M3 21h12M6 7h6v5H6ZM14 12h3v5a2 2 0 0 0 4 0V8l-3-3"/>',
};
(async()=>{for(const[name,body]of Object.entries(icons)){const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;fs.writeFileSync(path.join(dir,name+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(dir,name+'.png'));}console.log(Object.keys(icons).length+' icone generate');})().catch(e=>{console.error(e);process.exitCode=1;});
