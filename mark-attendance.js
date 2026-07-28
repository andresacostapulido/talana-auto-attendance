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
    
    confirmar: 'body > div.tln\\:fixed.tln\\:inset-0.tln\\:z-10000000 > div > div.tln\\:flex.tln\\:justify-end.tln\\:gap-2.tln\\:p-4 > button.tln\\:bg-gray-900 > div',
};

async function markAttendance() {
    const tipo = process.env.TIPO || 'entrada';
    
    // Delay aleatorio entre 1 y 5 minutos para que el horario de marcaje varíe
    const initialDelay = Math.floor(Math.random() * 240000) + 60000;
    console.log(`⏳ Esperando ${Math.floor(initialDelay/1000)}s (${Math.floor(initialDelay/60000)} min) antes de iniciar...`);
    await sleep(initialDelay);
    
    console.log(`🤖 Iniciando marcaje de ${tipo.toUpperCase()}...`);
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    let page;
    try {
        page = await browser.newPage();
        await page.setDefaultNavigationTimeout(30000);
        await page.setViewport({ width: 1280, height: 800 });
        
        // === LOGIN (nuevo flujo 2 pasos: RUT → Continuar → Password → Login) ===
        console.log('🔐 Navegando a login...');
        await page.goto('https://talana.com/app/#/auth/login', { waitUntil: 'networkidle2', timeout: 30000 });
        
        await page.screenshot({ path: 'step-01-login-page.png', fullPage: true });
        console.log('📸 step-01: Página de login cargada');
        console.log('📍 URL:', page.url());
        
        // === PASO 1: Ingresar RUT ===
        console.log('✍️ Paso 1: Ingresando RUT...');
        await page.waitForSelector('#remote-app-login input', { timeout: 15000 });
        const rutInput = await page.$('#remote-app-login input');
        if (!rutInput) {
            await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
            throw new Error('No se encontró el campo de RUT');
        }
        
        await rutInput.click();
        await rutInput.type(TALANA_USER, { delay: Math.random() * 80 + 30 });
        await randomDelay(300, 600);
        
        await page.screenshot({ path: 'step-02-rut-filled.png', fullPage: true });
        console.log('📸 step-02: RUT ingresado');
        
        // Click en botón "Continuar"
        console.log('🖱️ Haciendo click en Continuar...');
        const continuarClicked = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')];
            const btn = btns.find(el => el.textContent.trim().includes('Continuar'));
            if (btn) { btn.click(); return true; }
            return false;
        });
        if (!continuarClicked) {
            console.log('  ⚠️ Botón Continuar no encontrado, presionando Enter...');
            await page.keyboard.press('Enter');
        } else {
            console.log('  📌 Botón Continuar clickeado');
        }
        
        // === PASO 2: Esperar campo de contraseña (~10s) ===
        console.log('⏳ Esperando campo de contraseña...');
        await sleep(10000);
        
        await page.screenshot({ path: 'step-03-waiting-password.png', fullPage: true });
        console.log('📸 step-03: Esperando campo contraseña');
        
        let passInput = await page.$('#remote-app-login input[type="password"]');
        if (!passInput) {
            // Fallback: cualquier input que no sea el de RUT
            const allInputs = await page.$$('#remote-app-login input');
            if (allInputs.length > 1) passInput = allInputs[allInputs.length - 1];
        }
        if (!passInput) {
            await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
            throw new Error('No se encontró el campo de contraseña');
        }
        
        console.log('✍️ Paso 2: Ingresando contraseña...');
        await passInput.click();
        await passInput.type(TALANA_PASS, { delay: Math.random() * 80 + 30 });
        await randomDelay(300, 600);
        
        await page.screenshot({ path: 'step-04-password-filled.png', fullPage: true });
        console.log('📸 step-04: Contraseña ingresada');
        
        // Click en botón de login final
        console.log('🖱️ Haciendo login...');
        const loginClicked = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')];
            const btn = btns.find(el => {
                const txt = el.textContent.trim();
                return txt.includes('Iniciar') || txt.includes('Ingresar') || txt.includes('Entrar');
            }) || btns.find(el => el.type === 'submit');
            if (btn) { btn.click(); return btn.textContent.trim(); }
            return false;
        });
        if (!loginClicked) {
            console.log('  ⚠️ Botón login no encontrado, presionando Enter...');
            await page.keyboard.press('Enter');
        } else {
            console.log(`  📌 Botón "${loginClicked}" clickeado`);
        }
        
        await sleep(3000);
        await page.screenshot({ path: 'step-04b-after-login.png', fullPage: true });
        console.log('📸 step-04b: Después del login');
        console.log('📍 URL:', page.url());
        
        // Esperar redirección
        console.log('⏳ Esperando redirección...');
        try {
            await page.waitForFunction(
                () => window.location.href.includes('mi.talana.com') || 
                      window.location.href.includes('/home') ||
                      (window.location.href.includes('/app/') && !window.location.href.includes('/auth/')),
                { timeout: 20000 }
            );
        } catch (navErr) {
            await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
            const currentUrl = page.url();
            const pageContent = await page.evaluate(() => document.body?.innerText?.substring(0, 500));
            console.error(`📍 URL actual: ${currentUrl}`);
            console.error(`📄 Contenido visible: ${pageContent}`);
            throw new Error(`Login no redirigió. URL: ${currentUrl}`);
        }
        
        await randomDelay(1500, 3000);
        console.log('✅ Login exitoso');
        await page.screenshot({ path: 'step-03-logged-in.png', fullPage: true });
        console.log('📸 step-03: Sesión iniciada');
        console.log('📍 URL:', page.url());
        
        // === MARCAR ASISTENCIA ===
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
        
        const isDisabled = await page.$eval(SEL.confirmar, el => el.disabled);
        if (isDisabled) throw new Error('Botón de confirmar está deshabilitado');
        
        await randomDelay(500, 1000);
        await page.click(SEL.confirmar);
        await sleep(2000);
        
        console.log(`✅ ${tipo.toUpperCase()} MARCADA EXITOSAMENTE!`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (page) {
            try {
                await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
                console.log('📸 Screenshot de error guardado');
                console.log('📍 URL al momento del error:', page.url());
            } catch (e) { /* ignore */ }
        }
        throw error;
    } finally {
        await browser.close();
    }
}

markAttendance().catch(error => {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
});
