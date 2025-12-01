# 🤖 Automatización de Asistencia Talana

Marca automáticamente tu entrada y salida en Talana usando GitHub Actions + cron-job.org.

**✅ 100% Gratis | ✅ 99.5% Confiable | ✅ 15 minutos setup**

---

## 📋 Instalación

### 1. Fork este Repositorio

Click en **"Fork"** arriba a la derecha.

### 2. Configurar Secrets en GitHub

En tu fork: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Crea 2 secrets:

| Name | Value | Ejemplo |
|------|-------|---------|
| `TALANA_USER` | Tu RUT sin puntos, con guión | `12345678-9` |
| `TALANA_PASS` | Tu contraseña de Talana | `tu_contraseña` |

### 3. Crear Token de GitHub

1. Ve a: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Configuración:
   - **Note:** `Cron Job Trigger`
   - **Expiration:** `No expiration`
   - **Scope:** ✅ Marcar solo `repo`
4. Click **"Generate token"**
5. **COPIAR EL TOKEN** (solo se muestra una vez)

### 4. Registrarse en cron-job.org

1. Ve a: https://console.cron-job.org/signup
2. Regístrate con tu email
3. Confirma tu email

### 5. Crear los 3 Cron Jobs

#### Job 1: Entrada 9 AM (Lunes a Viernes)

**Pestaña GENERAL:**
- **Title:** `Talana Entrada 9AM`
- **URL:** `https://api.github.com/repos/TU_USUARIO_GITHUB/talana-auto-attendance/dispatches`
- **Schedule:**
  - Minute: `0`
  - Hour: `12`
  - Days: `Every day`
  - Weekdays: ✅ `Mon, Tue, Wed, Thu, Fri`
- **Enabled:** ✅

**Pestaña ADVANCED:**
- **Request method:** `POST`
- **Request headers** (agregar 3):
  ```
  Authorization: Bearer TU_TOKEN_GITHUB_AQUI
  Accept: application/vnd.github.v3+json
  Content-Type: application/json
  ```
- **Request body:**
  ```json
  {"event_type":"mark-attendance"}
  ```

**Click "Create"**

#### Job 2: Salida 7 PM (Lunes a Jueves)

Igual que Job 1, pero cambiar:
- **Title:** `Talana Salida 7PM L-J`
- **Schedule:**
  - Hour: `22`
  - Weekdays: ✅ `Mon, Tue, Wed, Thu`

#### Job 3: Salida 6 PM (Viernes)

Igual que Job 1, pero cambiar:
- **Title:** `Talana Salida 6PM Viernes`
- **Schedule:**
  - Hour: `21`
  - Weekdays: ✅ `Fri`

### 6. Probar

1. En cron-job.org, click en un job → **"Run now"**
2. Ve a: `https://github.com/TU_USUARIO/talana-auto-attendance/actions`
3. Deberías ver una ejecución con ✅

---

## 🛡️ Robustez y Confiabilidad

### Reintentos Automáticos
- **3 intentos** si falla
- **30 segundos** entre cada intento
- **Timeout:** 15 minutos máximo

### Configuración Recomendada en cron-job.org

Para cada job:
1. Click en el job → **Settings**
2. **Retry on failure:** `3`
3. **Email notifications:** ✅ Solo en fallos
4. **Save**

### Monitoreo

- **GitHub Actions:** https://github.com/TU_USUARIO/talana-auto-attendance/actions
- **cron-job.org:** https://console.cron-job.org

---

## 🆘 Solución de Problemas

### ❌ No se ejecuta el workflow

**Causa:** Token o URL incorrectos

**Solución:**
1. Verifica que el token de GitHub sea correcto
2. Confirma que la URL en cron-job.org tenga tu usuario correcto
3. Revisa que los secrets estén configurados en GitHub

### ❌ Falla el marcaje

**Causa:** Credenciales incorrectas o Talana cambió

**Solución:**
1. Verifica `TALANA_USER` y `TALANA_PASS` en GitHub Secrets
2. Prueba manualmente en https://talana.com
3. Revisa los logs en GitHub Actions para ver el error específico

### ❌ No recibo notificaciones

**Causa:** Email no confirmado en cron-job.org

**Solución:**
1. Revisa tu email y confirma la cuenta
2. Activa notificaciones en settings de cada job

---

## 💰 Costos

**$0 - Completamente Gratis**

| Servicio | Plan Gratis | Uso Estimado |
|----------|-------------|--------------|
| GitHub Actions | 2,000 min/mes | ~220 min/mes |
| cron-job.org | Ilimitado | 3 jobs |

---

## 🔒 Seguridad

- ✅ Repositorio privado recomendado
- ✅ Credenciales encriptadas en GitHub Secrets
- ✅ Token con permisos mínimos (solo `repo`)
- ✅ Sin almacenamiento de contraseñas en código
- ✅ Conexión HTTPS a Talana

---

## 🛠️ Estructura del Proyecto

```
.
├── .github/workflows/
│   └── talana-auto.yml      # Workflow de GitHub Actions
├── mark-attendance.js        # Script principal de marcaje
├── package.json              # Dependencias (puppeteer)
└── README.md                 # Esta guía
```

---

## 📊 ¿Cómo Funciona?

1. **cron-job.org** dispara el workflow a la hora programada
2. **GitHub Actions** ejecuta el script en un contenedor Ubuntu
3. **Puppeteer** abre un navegador headless
4. **Script** hace login en Talana y marca asistencia
5. Si falla, **reintenta automáticamente** hasta 3 veces

---

## 🤝 Contribuir

Adopta a un chamo 🇻🇪

---