const puppeteer = require('puppeteer');

const TALANA_USER = process.env.TALANA_USER;
const TALANA_PASS = process.env.TALANA_PASS;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1)) + min);

async function markAttendance() {
    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    
    // 8:45 AM - 9:30 AM Chile = 11:45 - 12:30 UTC (entrada)
    // Después de 9:30 AM = salida por defecto
    let tipo = 'salida';
    
    if ((hour === 11 && minute >= 45) || (hour === 12 && minute <= 30)) {
        tipo = 'entrada';
    }
    
    // Delay aleatorio inicial (0-3 minutos) para no marcar siempre a la misma hora
    const initialDelay = Math.floor(Math.random() * 180000); // 0-3 min en ms
    console.log(`⏳ Esperando ${Math.floor(initialDelay/1000)}s antes de iniciar...`);
    await sleep(initialDelay);
    
    console.log(`🤖 Iniciando marcaje de ${tipo.toUpperCase()}...`);
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Login
        console.log('🔐 Navegando a login...');
        await page.goto('https://talana.com/es/remuneraciones/login-vue', { waitUntil: 'networkidle2' });
        
        console.log('✍️ Llenando credenciales...');
        await page.waitForSelector('input[type="text"]');
        await page.type('input[type="text"]', TALANA_USER, { delay: Math.random() * 100 + 50 });
        await randomDelay(300, 800);
        await page.type('input[type="password"]', TALANA_PASS, { delay: Math.random() * 100 + 50 });
        
        console.log('🖱️ Haciendo login...');
        const form = await page.$('form');
        if (form) {
            await form.evaluate(f => f.requestSubmit());
        } else {
            await page.click('button.btn-type-talana-principal.btn');
        }
        
        console.log('⏳ Esperando redirección a mi.talana.com...');
        await page.waitForFunction(
            () => window.location.href.includes('mi.talana.com'),
            { timeout: 15000 }
        );
        await randomDelay(1500, 3000);
        
        console.log('✅ Login exitoso');
        
        // Marcar asistencia
        console.log('📍 Esperando botón "Marcar asistencia"...');
        await page.waitForSelector('button[data-cy="pdt-mark-attendance"]', { timeout: 10000 });
        await page.click('button[data-cy="pdt-mark-attendance"]');
        
        console.log('🔽 Abriendo dropdown...');
        const dropdownSelector = 'body > div.tln\\:fixed div.tln\\:max-h-\\[calc\\(100vh-14rem\\)\\] > div > div > div > div > div:nth-child(1) > div';
        await page.waitForSelector(dropdownSelector, { timeout: 5000 });
        await randomDelay(500, 1000);
        await page.click(dropdownSelector);
        await randomDelay(1000, 2000);
        
        const texto = tipo === 'entrada' ? 'Entrada' : 'Salida';
        const childIndex = tipo === 'entrada' ? 1 : 2;
        
        console.log(`✅ Seleccionando ${texto}...`);
        const opcionSelector = `body > div.tln\\:fixed div.tln\\:max-h-\\[calc\\(100vh-14rem\\)\\] > div > div > div > div > div:nth-child(2) > div > div > div > div > div > div:nth-child(${childIndex}) > a`;
        
        await page.waitForSelector(opcionSelector, { timeout: 5000 });
        await randomDelay(300, 800);
        await page.click(opcionSelector);
        
        console.log('✅ Confirmando...');
        await page.waitForSelector('button[data-cy="pdt-mark-confirmMarkAttendance"]', { timeout: 5000 });
        
        const isDisabled = await page.$eval('button[data-cy="pdt-mark-confirmMarkAttendance"]', btn => btn.disabled);
        
        if (isDisabled) {
            throw new Error('Botón de confirmar está deshabilitado');
        }
        
        await randomDelay(500, 1000);
        await page.click('button[data-cy="pdt-mark-confirmMarkAttendance"]');
        await sleep(2000);
        
        const modalCerrado = await page.$('body > div.tln\\:fixed.tln\\:inset-0') === null;
        if (!modalCerrado) {
            throw new Error('El modal no se cerró después de confirmar');
        }
        
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
