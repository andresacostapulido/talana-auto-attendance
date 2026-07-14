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
        
        // === LOGIN ===
        console.log('🔐 Navegando a login...');
        await page.goto('https://talana.com/es/remuneraciones/login-vue', { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Screenshot post-carga de login
        await page.screenshot({ path: 'step-01-login-page.png', fullPage: true });
        console.log('📸 step-01: Página de login cargada');
        console.log('📍 URL:', page.url());
        
        console.log('✍️ Llenando credenciales...');
        // Intentar múltiples selectores para el campo de usuario
        const userSelectors = [
            '#login input[type=text]',
            'input[name="username"]',
            'input[placeholder*="mail"]',
            'input[type="email"]',
            '#login input:first-of-type'
        ];
        
        let userInput = null;
        for (const sel of userSelectors) {
            userInput = await page.$(sel);
            if (userInput) {
                console.log(`  📌 Usuario encontrado con: ${sel}`);
                break;
            }
        }
        if (!userInput) {
            await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
            throw new Error('No se encontró el campo de usuario en ningún selector');
        }
        
        await userInput.click();
        await userInput.type(TALANA_USER, { delay: Math.random() * 80 + 30 });
        await randomDelay(300, 600);
        
        // Campo de password
        const passSelectors = [
            '#login input[type=password]',
            'input[type="password"]',
            'input[name="password"]'
        ];
        
        let passInput = null;
        for (const sel of passSelectors) {
            passInput = await page.$(sel);
            if (passInput) {
                console.log(`  📌 Password encontrado con: ${sel}`);
                break;
            }
        }
        if (!passInput) {
            await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
            throw new Error('No se encontró el campo de password');
        }
        
        await passInput.click();
        await passInput.type(TALANA_PASS, { delay: Math.random() * 80 + 30 });
        await randomDelay(300, 600);
        
        await page.screenshot({ path: 'step-02-credentials-filled.png', fullPage: true });
        console.log('📸 step-02: Credenciales llenadas');
        
        // Botón de login - múltiples estrategias
        console.log('🖱️ Haciendo login...');
        
        // Estrategia 1: buscar el elemento que contiene "Iniciar sesión" y hacer click nativo
        const clicked = await page.evaluate(() => {
            // Buscar en TODOS los elementos del DOM
            const all = document.querySelectorAll('*');
            for (const el of all) {
                if (el.children.length === 0 && el.textContent.trim() === 'Iniciar sesión') {
                    // Encontrar el elemento clickeable más cercano (padre)
                    let target = el;
                    while (target && target.tagName !== 'BODY') {
                        if (target.tagName === 'BUTTON' || target.tagName === 'T-BUTTON' || 
                            target.tagName === 'A' || target.getAttribute('role') === 'button' ||
                            target.onclick || target.style.cursor === 'pointer') {
                            target.click();
                            return 'clicked-parent: ' + target.tagName;
                        }
                        target = target.parentElement;
                    }
                    // Si no encontró padre clickeable, click en el elemento mismo
                    el.click();
                    return 'clicked-self: ' + el.tagName;
                }
            }
            return null;
        });
        
        if (clicked) {
            console.log(`  📌 ${clicked}`);
        } else {
            // Estrategia 2: Enter
            console.log('  ⚠️ No encontró texto "Iniciar sesión", probando Enter...');
            await page.keyboard.press('Enter');
        }
        
        await sleep(3000);
        await page.screenshot({ path: 'step-02b-after-login-click.png', fullPage: true });
        console.log('📸 step-02b: Después del click/enter');
        console.log('📍 URL:', page.url());
        
        // Esperar redirección - con más tiempo y mejor diagnóstico
        console.log('⏳ Esperando redirección...');
        try {
            await page.waitForFunction(
                () => window.location.href.includes('mi.talana.com') || 
                      window.location.href.includes('/home') ||
                      window.location.href.includes('/dashboard'),
                { timeout: 20000 }
            );
        } catch (navErr) {
            // Si no redirigió, capturar estado actual
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
