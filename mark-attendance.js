const puppeteer = require('puppeteer');

const TALANA_USER = process.env.TALANA_USER;
const TALANA_PASS = process.env.TALANA_PASS;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1)) + min);

// Selectores actualizados
const SEL = {
    markBtn: '#q-app > div > div.q-page-container > main > main > div.tln\\:flex.tln\\:flex-wrap.tln\\:gap-4.tln\\:lg\\:flex-nowrap > div.tln\\:w-full.tln\\:order-first.tln\\:md\\:order-0.tln\\:md\\:w-4\\/12 > div > div:nth-child(1) > div:nth-child(3) > button',
    
    dropdown: 'body > div.tln\\:fixed.tln\\:inset-0.tln\\:z-10000000.tln\\:flex.tln\\:p-4.tln\\:items-start.tln\\:justify-center.tln\\:pointer-events-auto.tln\\:bg-black-400 > div > div.tln\\:max-h-\\[calc\\(100vh-14rem\\)\\].tln\\:overflow-y-auto.tln\\:p-4 > div > div > div > div > div:nth-child(1) > div > div.tln\\:me-3.tln\\:flex.tln\\:items-center.tln\\:gap-2',
    
    entrada: 'body > div.tln\\:fixed.tln\\:inset-0.tln\\:z-10000000.tln\\:flex.tln\\:p-4.tln\\:items-start.tln\\:justify-center.tln\\:pointer-events-auto.tln\\:bg-black-400 > div > div.tln\\:max-h-\\[calc\\(100vh-14rem\\)\\].tln\\:overflow-y-auto.tln\\:p-4 > div > div > div > div > div:nth-child(2) > div > div > div > div > div > div:nth-child(1) > a',
    
    salida: 'body > div.tln\\:fixed.tln\\:inset-0.tln\\:z-10000000.tln\\:flex.tln\\:p-4.tln\\:items-start.tln\\:justify-center.tln\\:pointer-events-auto.tln\\:bg-black-400 > div > div.tln\\:max-h-\\[calc\\(100vh-14rem\\)\\].tln\\:overflow-y-auto.tln\\:p-4 > div > div > div > div > div:nth-child(2) > div > div > div > div > div > div:nth-child(2) > a',
    
    confirmar: 'body > div.tln\\:fixed.tln\\:inset-0.tln\\:z-10000000.tln\\:flex.tln\\:p-4.tln\\:items-start.tln\\:justify-center.tln\\:pointer-events-auto.tln\\:bg-black-400 > div > div.tln\\:flex.tln\\:justify-end.tln\\:gap-2.tln\\:p-4 > button.tln\\:relative.tln\\:flex.tln\\:items-center.tln\\:justify-center.tln\\:rounded-lg.tln\\:border.tln\\:border-solid.tln\\:font-medium.tln\\:focus-visible\\:ring-3.tln\\:focus-visible\\:outline-none.tln\\:border-transparent.tln\\:bg-gray-900.tln\\:text-white-900.tln\\:hover\\:bg-gray-700.tln\\:focus-visible\\:ring-purple-500.tln\\:active\\:bg-gray-500.tln\\:disabled\\:bg-black-50.tln\\:disabled\\:text-black-500.tln\\:px-\\[11px\\].tln\\:py-\\[9px\\].tln\\:text-body-md > div',
};

async function markAttendance() {
    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    
    let tipo = 'salida';
    if ((hour === 11 && minute >= 45) || (hour === 12 && minute <= 30)) {
        tipo = 'entrada';
    }
    
    const initialDelay = Math.floor(Math.random() * 180000);
    console.log(`⏳ Esperando ${Math.floor(initialDelay/1000)}s antes de iniciar...`);
    await sleep(initialDelay);
    
    console.log(`🤖 Iniciando marcaje de ${tipo.toUpperCase()}...`);
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(30000);
        
        console.log('🔐 Navegando a login...');
        await page.goto('https://talana.com/es/remuneraciones/login-vue', { waitUntil: 'networkidle2', timeout: 30000 });
        
        console.log('✍️ Llenando credenciales...');
        await page.waitForSelector('input[type="text"]', { timeout: 10000 });
        await page.type('input[type="text"]', TALANA_USER, { delay: Math.random() * 100 + 50 });
        await randomDelay(300, 800);
        await page.type('input[type="password"]', TALANA_PASS, { delay: Math.random() * 100 + 50 });
        await randomDelay(300, 600);
        
        console.log('🖱️ Haciendo login...');
        await page.evaluate(() => {
            const form = document.querySelector('form');
            if (form) { form.requestSubmit(); return; }
            const btn = document.querySelector('button[type="submit"]');
            if (btn) { btn.click(); return; }
            document.querySelector('button.btn-type-talana-principal')?.click();
        });
        
        console.log('⏳ Esperando redirección a mi.talana.com...');
        await page.waitForFunction(
            () => window.location.href.includes('mi.talana.com'),
            { timeout: 15000 }
        );
        
        await randomDelay(1500, 3000);
        console.log('✅ Login exitoso');
        
        console.log('📍 Esperando botón "Marcar asistencia"...');
        await page.waitForSelector(SEL.markBtn, { timeout: 10000 });
        await page.click(SEL.markBtn);
        
        console.log('🔽 Abriendo dropdown...');
        await page.waitForSelector(SEL.dropdown, { timeout: 8000 });
        await randomDelay(500, 1000);
        await page.click(SEL.dropdown);
        await randomDelay(1000, 2000);
        
        const opcionSelector = tipo === 'entrada' ? SEL.entrada : SEL.salida;
        console.log(`✅ Seleccionando ${tipo === 'entrada' ? 'Entrada' : 'Salida'}...`);
        await page.waitForSelector(opcionSelector, { timeout: 5000 });
        await randomDelay(300, 800);
        await page.click(opcionSelector);
        
        console.log('✅ Confirmando...');
        await page.waitForSelector(SEL.confirmar, { timeout: 5000 });
        
        const isDisabled = await page.$eval(SEL.confirmar, el => el.closest('button').disabled);
        if (isDisabled) throw new Error('Botón de confirmar está deshabilitado');
        
        await randomDelay(500, 1000);
        await page.click(SEL.confirmar);
        await sleep(2000);
        
        console.log(`✅ ${tipo.toUpperCase()} MARCADA EXITOSAMENTE!`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

markAttendance().catch(error => {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
});
