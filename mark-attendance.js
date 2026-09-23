const puppeteer = require('puppeteer');

const TALANA_USER = process.env.TALANA_USER;
const TALANA_PASS = process.env.TALANA_PASS;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1)) + min);
const ATTENDANCE_MODAL = 'body > div[class*="tln:fixed"][class*="tln:z-10000000"]';
const ATTENDANCE_TYPE_DROPDOWN = 'body > div.tln\\:fixed.tln\\:inset-0.tln\\:z-10000000.tln\\:flex.tln\\:p-4.tln\\:items-start.tln\\:justify-center.tln\\:pointer-events-auto.tln\\:bg-black-400 > div > div > div.tln\\:max-h-\\[calc\\(100vh-14rem\\)\\].tln\\:overflow-y-auto.tln\\:p-4 > div > div > div > div > div:nth-child(1) > div > div.tln\\:me-3.tln\\:flex.tln\\:items-center.tln\\:gap-2';
const CONFIRM_MARK_BUTTON = 'body > div.tln\\:fixed.tln\\:inset-0.tln\\:z-10000000.tln\\:flex.tln\\:p-4.tln\\:items-start.tln\\:justify-center.tln\\:pointer-events-auto.tln\\:bg-black-400 > div > div > div.tln\\:flex.tln\\:justify-end.tln\\:gap-2.tln\\:p-4 > div:nth-child(2) > button';
const ATTENDANCE_TYPE_OPTIONS = {
    entrada: 'body > div.tln\\:fixed.tln\\:inset-0.tln\\:z-10000000.tln\\:flex.tln\\:p-4.tln\\:items-start.tln\\:justify-center.tln\\:pointer-events-auto.tln\\:bg-black-400 > div > div > div.tln\\:max-h-\\[calc\\(100vh-14rem\\)\\].tln\\:overflow-y-auto.tln\\:p-4 > div > div > div > div > div:nth-child(2) > div > div > div > div > div > div > div:nth-child(1) > a',
    salida: 'body > div.tln\\:fixed.tln\\:inset-0.tln\\:z-10000000.tln\\:flex.tln\\:p-4.tln\\:items-start.tln\\:justify-center.tln\\:pointer-events-auto.tln\\:bg-black-400 > div > div > div.tln\\:max-h-\\[calc\\(100vh-14rem\\)\\].tln\\:overflow-y-auto.tln\\:p-4 > div > div > div > div > div:nth-child(2) > div > div > div > div > div > div > div:nth-child(2) > a'
};

const waitForVisibleText = (page, text, useLastMatch = false, requireEnabled = false, timeout = 5000, scopeSelector = null) =>
    page.waitForFunction(
        (expectedText, useLast, enabled, scope) => {
            const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
            const normalizedText = normalize(expectedText);
            const root = scope ? document.querySelector(scope) : document;
            if (!root) return false;
            const matches = [...root.querySelectorAll('button, a, input, select, [role="button"], [role="option"], [role="combobox"], div, span')]
                .filter(element => {
                    const style = window.getComputedStyle(element);
                    const bounds = element.getBoundingClientRect();
                    const labels = [
                        element.innerText,
                        element.textContent,
                        element.value,
                        element.getAttribute('aria-label'),
                        element.getAttribute('title')
                    ].map(normalize);
                    return labels.includes(normalizedText) &&
                        style.visibility !== 'hidden' && style.display !== 'none' &&
                        bounds.width > 0 && bounds.height > 0;
                });
            const orderedMatches = matches.sort((first, second) =>
                normalize(first.textContent).length - normalize(second.textContent).length
            );
            const element = useLast ? orderedMatches.at(-1) : orderedMatches[0];
            return element && (!enabled || !element.disabled) ? element : false;
        },
        { timeout },
        text,
        useLastMatch,
        requireEnabled,
        scopeSelector
    );

const clickInteractiveElement = async (elementHandle) => {
    const interactiveHandle = await elementHandle.evaluateHandle(element =>
        element.closest('button, a, [role="button"], [role="option"], [role="combobox"], select, input') || element
    );
    const interactiveElement = interactiveHandle.asElement();
    if (!interactiveElement) throw new Error('No se encontró un control interactivo para hacer clic');
    await interactiveElement.click();
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
        const markButton = await page.waitForFunction(
            () => [...document.querySelectorAll('button')].find(button => {
                const text = button.textContent.trim().toLowerCase();
                const style = window.getComputedStyle(button);
                return text.includes('marcar asistencia') &&
                    style.visibility !== 'hidden' &&
                    style.display !== 'none' &&
                    !button.disabled;
            }),
            { timeout: 10000 }
        );
        await markButton.evaluate(button => button.click());
        
        await waitForVisibleText(page, 'Cancelar', false, false, 8000, ATTENDANCE_MODAL);

        console.log('🔽 Abriendo selector de tipo...');
        await randomDelay(500, 1000);
        try {
            await page.waitForSelector(ATTENDANCE_TYPE_DROPDOWN, { visible: true, timeout: 5000 });
            await page.click(ATTENDANCE_TYPE_DROPDOWN);
        } catch (error) {
            console.log('  ⚠️ Selector del desplegable no encontrado; usando búsqueda por texto...');
            const typeDropdown = await waitForVisibleText(page, 'Marca', false, false, 5000, ATTENDANCE_MODAL);
            await clickInteractiveElement(typeDropdown);
        }
        await randomDelay(1000, 2000);
        await page.screenshot({ path: 'step-05-dropdown-open.png', fullPage: true });
        
        const tipoLabel = tipo === 'entrada' ? 'Entrada' : 'Salida';
        console.log(`✅ Seleccionando ${tipoLabel}...`);
        await randomDelay(300, 800);
        try {
            await page.waitForSelector(ATTENDANCE_TYPE_OPTIONS[tipo], { visible: true, timeout: 5000 });
            await page.click(ATTENDANCE_TYPE_OPTIONS[tipo]);
        } catch (error) {
            console.log(`  ⚠️ Selector de ${tipoLabel} no encontrado; usando búsqueda por texto...`);
            const typeOption = await waitForVisibleText(page, tipoLabel, true, false, 5000, ATTENDANCE_MODAL);
            await clickInteractiveElement(typeOption);
        }
        await page.screenshot({ path: 'step-05-type-selected.png', fullPage: true });
        
        console.log('✅ Confirmando...');
        let confirmButton;
        try {
            confirmButton = await page.waitForFunction(
                selector => {
                    const button = document.querySelector(selector);
                    return button && !button.disabled ? button : false;
                },
                { timeout: 8000 },
                CONFIRM_MARK_BUTTON
            );
        } catch (error) {
            console.log('  ⚠️ Selector del botón Marcar no encontrado; usando búsqueda por texto...');
            confirmButton = await waitForVisibleText(page, 'Marcar', false, true, 5000, ATTENDANCE_MODAL);
        }
        
        await randomDelay(500, 1000);
        await confirmButton.evaluate(button => button.click());
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
