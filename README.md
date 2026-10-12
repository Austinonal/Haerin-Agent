# Haerin Agent

ผู้ช่วย AI ส่วนตัวที่มีบุคลิกสุขุม สงบ ช่างสังเกต — **Haerin เป็นตัวละคร AI ที่สร้างขึ้นใหม่ ไม่ใช่บุคคลจริง** และไม่ได้อ้างว่ารู้จักหรือพูดแทนใคร

ใช้ได้ 3 โหมด:

| โหมด | ประมวลผลที่ไหน | ต้องใช้อินเทอร์เน็ต? | ข้อมูลออกจากเครื่อง? |
|---|---|---|---|
| **Local Only** | Ollama บนคอมพิวเตอร์ของคุณ | ไม่ต้อง (หลังติดตั้งโมเดลแล้ว) | ไม่ |
| **Cloud** | Google Gemini ผ่าน Backend (Cloudflare Worker) ของคุณเอง | ต้องใช้ | ใช่ — ถามยืนยันก่อนส่งครั้งแรกของแต่ละบทสนทนา |
| **Hybrid** | เลือกตามกฎที่คุณตั้ง (ข้อความที่มีคำส่วนตัว → Local เสมอ) | แล้วแต่ข้อความ | เฉพาะข้อความที่ไป Cloud |

ทุกคำตอบจะแสดงว่า **ใช้ Provider และโมเดลไหนตอบจริง** และแอป **ไม่สลับ Provider ให้เองแบบเงียบ ๆ** ถ้า Local ใช้ไม่ได้ จะแจ้ง Error แล้วให้คุณกดเลือกเองว่าจะลองใหม่หรือส่งผ่านทางอื่น (โหมด Local Only จะไม่มีปุ่มส่งไป Cloud เลย)

---

## สารบัญ
- [A. สิ่งที่ต้องติดตั้ง](#a-สิ่งที่ต้องติดตั้ง)
- [B. เปิดโปรเจกต์ครั้งแรก](#b-เปิดโปรเจกต์ครั้งแรก)
- [C. ตั้งค่า Cloud AI (Gemini)](#c-ตั้งค่า-cloud-ai-gemini)
- [D. ตั้งค่า Local AI (Ollama)](#d-ตั้งค่า-local-ai-ollama)
- [E. เปิดใช้งาน](#e-เปิดใช้งาน)
- [F. Web App, PWA และ Windows .exe](#f-web-app-pwa-และ-windows-exe)
- [G. แก้ปัญหา](#g-แก้ปัญหา)
- [คำสั่งทั้งหมด](#คำสั่งทั้งหมด) · [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์) · [ความเป็นส่วนตัวและข้อจำกัด](#ความเป็นส่วนตัวและข้อจำกัด)

---

## A. สิ่งที่ต้องติดตั้ง

| โปรแกรม | จำเป็นไหม | ดาวน์โหลด (เว็บทางการเท่านั้น) |
|---|---|---|
| **Node.js 22.12 ขึ้นไป** (แนะนำรุ่น LTS) | จำเป็น | https://nodejs.org |
| **Git** | ถ้าจะ clone โปรเจกต์ | https://git-scm.com |
| **Visual Studio Code** | ถ้าต้องการแก้โค้ด | https://code.visualstudio.com |
| **Ollama** | ถ้าใช้ Local AI | https://ollama.com/download |
| บัญชี **Google AI Studio** | ถ้าใช้ Cloud AI | https://aistudio.google.com |
| บัญชี **Cloudflare** (ฟรี) | ถ้าจะ deploy Backend ขึ้นออนไลน์ | https://dash.cloudflare.com |

ตรวจว่า Node ติดตั้งแล้ว: เปิด Terminal แล้วพิมพ์

```bash
node -v
npm -v
```

ต้องเห็นเลขเวอร์ชัน (Node ต้อง `v22.12` หรือใหม่กว่า)

## B. เปิดโปรเจกต์ครั้งแรก

1. เปิด VS Code → เมนู **File → Open Folder…** → เลือกโฟลเดอร์ `Haerin-Agent`
2. เปิด Terminal ใน VS Code: เมนู **Terminal → New Terminal** (บน Windows จะเป็น PowerShell)
3. ติดตั้งแพ็กเกจ (ครั้งแรกครั้งเดียว ใช้เวลาสักพัก):

   ```bash
   npm install
   ```

4. เปิดแอป:

   ```bash
   npm run dev
   ```

   Terminal จะแสดงบรรทัด `Local: http://localhost:5173/` — เปิด URL **ที่ Terminal แสดงจริง** ในเบราว์เซอร์ (ถ้าพอร์ต 5173 ถูกใช้อยู่ Vite จะเลือกพอร์ตอื่นให้)

ตอนนี้แอปเปิดได้แล้ว แต่ยังตอบไม่ได้จนกว่าจะตั้งค่า Local AI (ข้อ D) หรือ Cloud AI (ข้อ C) อย่างน้อยหนึ่งอย่าง

## C. ตั้งค่า Cloud AI (Gemini)

> ⚠️ **API Key เป็นความลับ** ห้ามวางใน Frontend, ห้ามใส่ในไฟล์ `.env` ที่ขึ้นต้นด้วย `VITE_`, ห้าม commit ขึ้น Git และห้ามส่ง Key ให้ AI ในแชต แอปนี้ไม่มีช่องให้กรอก Key โดยตั้งใจ — Key อยู่ที่ Backend เท่านั้น

### ขั้นที่ 1: ขอ API Key
1. ไปที่ https://aistudio.google.com → ล็อกอินด้วยบัญชี Google
2. กด **Get API key** → **Create API key**
3. คัดลอก Key เก็บไว้ (อย่าแชร์ให้ใคร)

> Free Tier มีขีดจำกัดจำนวนคำขอ และ **เงื่อนไขอาจเปลี่ยนได้ตลอด** ตรวจสอบที่ https://ai.google.dev/gemini-api/docs/rate-limits และนโยบายการใช้ข้อมูลของ Google ก่อนใช้งานจริง แอปนี้ไม่รับประกันว่าใช้ฟรีได้ตลอดไป

### ขั้นที่ 2: เก็บ Key ไว้ที่ Backend (สำหรับทดสอบในเครื่อง)
สร้างไฟล์ชื่อ `.dev.vars` ที่โฟลเดอร์หลักของโปรเจกต์ (ไฟล์นี้ถูก `.gitignore` ไว้แล้ว จะไม่ขึ้น Git):

```
GEMINI_API_KEY=วาง-key-ของคุณที่นี่
```

### ขั้นที่ 3: รัน Backend ในเครื่อง
เปิด Terminal **อีกหน้าต่าง** (ให้ `npm run dev` ทำงานต่อในหน้าต่างแรก):

```bash
npm run dev:worker
```

Backend จะทำงานที่ `http://localhost:8787` และหน้าเว็บ (`npm run dev`) จะส่งคำขอ `/api` ไปหามันให้อัตโนมัติ

### ขั้นที่ 4: ทดสอบ
ในแอป: **ตั้งค่า → AI และการเชื่อมต่อ → ทดสอบ Backend** ต้องขึ้น "Backend พร้อม (ตั้งค่า Key แล้ว)" จากนั้นเลือกโหมด **Cloud** แล้วลองส่งข้อความ
(ปุ่มทดสอบยืนยันว่ามี Key อยู่ แต่ยืนยันว่า Key ใช้ได้จริงไม่ได้ ข้อความแรกที่ส่งจะเป็นตัวยืนยัน)

### ขั้นที่ 5 (ไม่บังคับ): Deploy Backend ขึ้นออนไลน์ — ใช้เมื่ออยากใช้จากมือถือ
```bash
npx wrangler login                   # ล็อกอิน Cloudflare ผ่านเบราว์เซอร์
npx wrangler secret put GEMINI_API_KEY   # วาง Key เมื่อถูกถาม (ถูกเก็บเป็น Secret ของ Cloudflare)
npm run deploy:worker
```
จะได้ URL แบบ `https://haerin-agent-api.<ชื่อบัญชี>.workers.dev`
- ใส่ URL นี้ใน **ตั้งค่า → AI → Backend URL** หรือใส่ใน `VITE_API_BASE_URL` (ดู `.env.example`) ก่อน build
- แก้ `ALLOWED_ORIGINS` ใน `wrangler.toml` ให้มีโดเมนของหน้าเว็บที่คุณ deploy แล้ว deploy ใหม่
- โมเดลที่ใช้กำหนดที่ `GEMINI_MODEL` ใน `wrangler.toml` (ค่าเริ่มต้น `gemini-flash-latest` ซึ่งจะชี้ไปรุ่น Flash ล่าสุด ถ้าต้องการพฤติกรรมคงที่ ให้ใส่ชื่อรุ่น stable ที่ตรวจจาก https://ai.google.dev/gemini-api/docs/models)

## D. ตั้งค่า Local AI (Ollama)

1. ติดตั้ง Ollama จาก https://ollama.com/download แล้วเปิดโปรแกรม (บน Windows จะมีไอคอนที่ taskbar)
2. ตรวจว่าทำงาน: เปิดเบราว์เซอร์ไปที่ http://localhost:11434 ต้องเห็นข้อความ `Ollama is running`
3. ดาวน์โหลดโมเดล — เลือกชื่อจาก https://ollama.com/library แล้วรัน (ตัวอย่าง):

   ```bash
   ollama pull llama3.2:3b
   ```

   ดูรายการที่ติดตั้งแล้ว: `ollama list`
   ดาวน์โหลดครั้งเดียวพอ แอปไม่บังคับโหลดใหม่ทุกครั้งที่เปิด

4. ในแอป: **ตั้งค่า → AI → ทดสอบการเชื่อมต่อ / โหลดรายชื่อโมเดล** → เลือกโมเดล → เลือกโหมด **Local Only**

### เลือกขนาดโมเดลสำหรับเครื่อง RAM 16 GB
| ขนาด | ไฟล์โดยประมาณ (แบบ quantized ทั่วไป) | ความรู้สึกบนเครื่อง 16 GB |
|---|---|---|
| ~1–3B | 1–2 GB | เร็ว ใช้ CPU ได้สบาย ความฉลาดจำกัด |
| ~7–8B | 4–5 GB | ใช้ได้ แต่ช้าลงชัดเจนถ้าไม่มี GPU |
| 13B ขึ้นไป | 8 GB+ | ไม่แนะนำบน 16 GB ที่ไม่มี GPU แยก |

ตัวเลขเป็นค่าประมาณ ความเร็วจริงขึ้นกับ CPU, GPU/VRAM และโปรแกรมอื่นที่เปิดอยู่ ภาษาไทยของโมเดลเล็กอาจไม่ดีเท่าโมเดลใหญ่หรือ Cloud

### CORS / เปิดแอปจากโดเมนอื่น
ถ้าเปิดแอปจาก `http://localhost:...` (ตอนพัฒนา) โดยปกติ Ollama อนุญาตอยู่แล้ว
ถ้าเปิดแอปจากโดเมนอื่น (เช่นเว็บที่ deploy แล้ว) ต้องตั้ง Environment Variable `OLLAMA_ORIGINS` บน Windows:
1. ปิด Ollama (คลิกขวาที่ไอคอน → Quit)
2. Start → พิมพ์ "environment variables" → **Edit environment variables for your account**
3. New → Name: `OLLAMA_ORIGINS` Value: `https://โดเมนของคุณ` → OK
4. เปิด Ollama ใหม่

> ⚠️ **อย่าเปิด Ollama ให้เข้าถึงจากอินเทอร์เน็ต** (เช่นตั้ง `OLLAMA_HOST=0.0.0.0` แล้ว forward port) Ollama ไม่มีระบบล็อกอิน ใครเข้าถึงได้ก็ใช้เครื่องคุณได้ แอปนี้ยอมรับ Ollama URL เฉพาะ localhost และ IP วงภายใน (192.168.x.x, 10.x.x.x, 172.16–31.x.x) เท่านั้น

### Local AI บนมือถือ
โทรศัพท์เรียก `localhost` ของคอมพิวเตอร์ **ไม่ได้** บนมือถือให้ใช้โหมด Cloud เป็นหลัก การใช้ Ollama ของคอมพิวเตอร์จากมือถือต้องตั้งเครือข่ายเพิ่ม (เช่น VPN ส่วนตัวอย่าง Tailscale) ซึ่งยังไม่ได้ทำในเวอร์ชันนี้

## E. เปิดใช้งาน

ทุกครั้งที่จะใช้ (ในเครื่อง):

```bash
npm run dev            # หน้าเว็บ — เปิด URL ที่ Terminal แสดง
npm run dev:worker     # (เฉพาะถ้าใช้ Cloud) Backend ในอีกหน้าต่าง Terminal
```

และเปิดโปรแกรม Ollama ไว้ถ้าใช้ Local

## F. Web App, PWA และ Windows .exe

สามอย่างนี้ **ต่างกัน**:

| | คืออะไร | สถานะในเวอร์ชันนี้ |
|---|---|---|
| **Web App** | เปิดในเบราว์เซอร์ | ✅ ใช้ได้ |
| **PWA** | "ติดตั้ง" เว็บแอปเป็นไอคอนบนเครื่อง/มือถือผ่านเบราว์เซอร์ ไม่มีไฟล์ `.exe` | ✅ มี Manifest + Service Worker (ตรวจแล้วว่าแคชและเปิดออฟไลน์ได้บน Chromium — ยังไม่ได้ทดสอบกดติดตั้งบนมือถือจริง) |
| **Windows Desktop (.exe)** | โปรแกรมติดตั้งแยก (เช่นสร้างด้วย Tauri) | ❌ **ยังไม่ได้ทำ** — ยังไม่มีไฟล์ `.exe` |

### Build Web App / PWA
```bash
npm run build      # ได้โฟลเดอร์ dist/
npm run preview    # ลองเปิดเวอร์ชัน production ในเครื่อง (http://localhost:4173)
```
นำโฟลเดอร์ `dist/` ไปวางบนโฮสต์ที่เป็น **HTTPS** (เช่น Cloudflare Pages) — PWA ติดตั้งได้เฉพาะบน HTTPS หรือ localhost
- **Android (Chrome):** เปิดเว็บ → เมนู ⋮ → **Install app / ติดตั้งแอป**
- **iPhone (Safari):** ปุ่มแชร์ → **Add to Home Screen**
- **Windows (Chrome/Edge):** ไอคอนติดตั้งที่แถบที่อยู่

เปิดแอปได้ขณะออฟไลน์ (หลังเคยเปิดครั้งแรกแล้ว) แต่ **Cloud AI ใช้ไม่ได้เมื่อออฟไลน์** แอปจะแสดงป้าย "ออฟไลน์" Service Worker แคชเฉพาะไฟล์ของแอป ไม่แคชบทสนทนาหรือคำตอบจาก `/api`

### Windows .exe (แผนงาน ยังไม่ได้ทำ)
แนวทางที่วางไว้คือห่อด้วย [Tauri](https://tauri.app) ต้องมี Rust, Microsoft C++ Build Tools และ WebView2 บนเครื่อง Windows (ดู https://tauri.app/start/prerequisites/) ข้อควรรู้ล่วงหน้า:
- ไฟล์ที่ยังไม่ได้ลงนามดิจิทัลจะถูก Windows SmartScreen เตือนตอนเปิด
- ต้องเพิ่ม origin ของแอป Tauri ใน `ALLOWED_ORIGINS` ของ Backend และอาจต้องตั้ง `OLLAMA_ORIGINS`

## G. แก้ปัญหา

| อาการ | สาเหตุที่เป็นไปได้ | วิธีแก้ |
|---|---|---|
| `node` / `npm` is not recognized | ยังไม่ได้ติดตั้ง Node หรือยังไม่ได้เปิด Terminal ใหม่หลังติดตั้ง | ติดตั้งจาก nodejs.org แล้วปิด-เปิด VS Code ใหม่ ตรวจด้วย `node -v` |
| `npm install` ล้ม / ขึ้น `EBADENGINE` | Node เก่ากว่า 22.12 | อัปเดต Node เป็น LTS ล่าสุด |
| `Port 5173 is in use` / `Address already in use` (8787) | มีโปรแกรมอื่นใช้พอร์ตอยู่ | ปิดหน้าต่าง Terminal เก่าที่รันค้าง หรือรัน `npm run dev -- --port 5174` (ใช้ URL ที่ Terminal แสดง) |
| "เชื่อมต่อ Backend ไม่ได้" | ไม่ได้รัน `npm run dev:worker` หรือ Backend URL ผิด | รัน `npm run dev:worker` / ตรวจ Backend URL ในตั้งค่า |
| "Backend ยังไม่ได้ตั้งค่า GEMINI_API_KEY" | ไม่มี `.dev.vars` หรือยังไม่ได้ `wrangler secret put` | ทำตามข้อ C ขั้นที่ 2 หรือ 5 แล้วรีสตาร์ต worker |
| "API Key ของ Gemini ไม่ถูกต้องหรือไม่มีสิทธิ์" | Key ผิด/ถูกลบ/คัดลอกไม่ครบ | สร้าง Key ใหม่ใน AI Studio แล้วตั้งใหม่ |
| "ไม่พบโมเดล Gemini ที่ตั้งไว้" | ชื่อใน `GEMINI_MODEL` เลิกใช้หรือพิมพ์ผิด | ตรวจชื่อจาก ai.google.dev/gemini-api/docs/models |
| "ถึงขีดจำกัดการใช้งาน/โควตา" (429) | ใช้เกิน Free Tier / rate limit | รอแล้วลองใหม่ หรือใช้ Local แทน |
| Backend เริ่มไม่ได้ | ไฟล์ `wrangler.toml` ผิด หรือ Node เก่า | ดูข้อความใน Terminal ของ `npm run dev:worker` |
| "เชื่อมต่อ Ollama ไม่ได้" | Ollama ไม่ได้เปิด หรือโดน CORS | เปิด Ollama, ตรวจ http://localhost:11434 และตั้ง `OLLAMA_ORIGINS` ถ้าเปิดแอปจากโดเมนอื่น |
| "ไม่พบโมเดล ..." / "ยังไม่ได้เลือกโมเดล" | ยังไม่ได้ `ollama pull` หรือชื่อไม่ตรง | `ollama list` ดูชื่อจริง แล้วเลือกในตั้งค่า |
| CORS error ใน Console ของเบราว์เซอร์ | origin ของหน้าเว็บไม่อยู่ใน `ALLOWED_ORIGINS` / `OLLAMA_ORIGINS` | เพิ่ม origin ให้ตรง (รวม `http://`/`https://` และพอร์ต) |
| ป้าย "ออฟไลน์" / ส่ง Cloud ไม่ได้ | ไม่มีอินเทอร์เน็ต | ต่อเน็ต หรือใช้ Local Only |
| `npm run build` ไม่ผ่าน | Error จาก TypeScript | อ่านบรรทัดที่ระบุไฟล์และเลขบรรทัด รัน `npm run typecheck` เพื่อดูรายละเอียด |
| เปิดแอปได้แต่ส่งข้อความไม่ได้ | ยังไม่ได้ตั้ง Provider ของโหมดที่เลือก | ดูข้อความ Error ใต้ข้อความ (บอกสาเหตุ) → ตั้งค่า → AI → กดปุ่มทดสอบ |
| ข้อมูลหายหลังล้างเบราว์เซอร์ | ข้อมูลอยู่ใน IndexedDB ของเบราว์เซอร์ | ส่งออกไฟล์สำรองเป็นประจำ (ตั้งค่า → ข้อมูล) |

---

## คำสั่งทั้งหมด

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | เปิดหน้าเว็บโหมดพัฒนา (Vite) |
| `npm run dev:worker` | เปิด Backend ในเครื่อง (Wrangler, พอร์ต 8787) |
| `npm run build` | ตรวจ TypeScript แล้ว build เป็น `dist/` |
| `npm run preview` | เปิดผล build ในเครื่อง |
| `npm run typecheck` | ตรวจ TypeScript (Frontend + Worker) |
| `npm run lint` | ตรวจโค้ดด้วย ESLint |
| `npm run test` | รันชุดทดสอบ (Vitest) |
| `npm run deploy:worker` | Deploy Backend ขึ้น Cloudflare |

## โครงสร้างโปรเจกต์

```
shared/protocol.ts          รูปแบบข้อมูลกลางระหว่างเบราว์เซอร์กับ Backend + ตัวตรวจ request
workers/src/index.ts        Backend: /api/health, /api/chat, CORS, จำกัดขนาด, ไม่ log เนื้อหา
workers/src/gemini.ts       แปลงคำขอ/คำตอบ Gemini ↔ รูปแบบกลาง
src/services/ai/            Provider Layer: ollama.ts, cloud.ts, router.ts (เลือก Provider), types.ts
src/services/storage/       IndexedDB (db.ts), การตั้งค่า (settings.ts), ส่งออก/นำเข้า (backup.ts)
src/features/personality/   คำสั่งบุคลิก + การประกอบ prompt (prompt.ts)
src/features/memory/        ตัวตรวจข้อมูลลับก่อนบันทึกความจำ
src/app/useApp.ts           สถานะของแอปและลำดับการส่งข้อความ
src/components/             UI: chat/, layout/, settings/, memory/, common/
src/styles/tokens.css       Design tokens (สี ตัวอักษร ระยะ) ธีมสว่าง/มืด
public/                     manifest, service worker, ไอคอน
tests/                      ชุดทดสอบ
docs/decisions/             บันทึกการตัดสินใจด้านสถาปัตยกรรม
```

## ความเป็นส่วนตัวและข้อจำกัด

- บทสนทนาและความจำเก็บใน IndexedDB ของเบราว์เซอร์นั้น ๆ เท่านั้น ไม่ซิงก์ข้ามอุปกรณ์ และ **ไม่ได้เข้ารหัส** ใครที่ใช้เครื่อง/โปรไฟล์เบราว์เซอร์เดียวกันเปิดดูได้
- โหมด Cloud: ข้อความล่าสุด ประวัติบางส่วนของบทสนทนานั้น และคำสั่งบุคลิก ถูกส่งไปยัง Google ผ่าน Backend ของคุณ อยู่ภายใต้ข้อกำหนดของ Google ความจำจะไม่ถูกส่งไป Cloud เว้นแต่คุณเปิดอนุญาต
- Backend ไม่บันทึกเนื้อหาข้อความลง Log และส่งต่อได้เฉพาะไปยัง Gemini (ไม่ใช่ proxy เปิด)
- **ความเสี่ยงที่ยังมี:** Backend ที่ deploy แล้วไม่มีระบบล็อกอิน การจำกัด origin ด้วย CORS กันได้เฉพาะเบราว์เซอร์ ไม่กันคนที่เรียก API ตรง ๆ ถ้ามีคนรู้ URL ก็ใช้โควตาของคุณได้ แนะนำให้ตั้ง Rate Limiting Rule ใน Cloudflare dashboard หรือป้องกันด้วย Cloudflare Access
- ตัวตรวจข้อมูลลับในความจำเป็นแบบ heuristic อาจพลาดได้ทั้งสองทาง
- ไม่มีระบบใดปลอดภัย 100% — ใช้ด้วยความเข้าใจข้อจำกัดข้างต้น

## แผนงานต่อยอด (ยังไม่อยู่ใน MVP)
Windows .exe (Tauri) · ซิงก์ข้ามอุปกรณ์แบบสมัครใจ (Supabase + RLS) · Local AI จากมือถือผ่านเครือข่ายส่วนตัว · โปรไฟล์บุคลิกเพิ่มเติม (Tutor, Creative Partner, Research Assistant) · Art & Design Assistant + Color Wheel · Puzzle & Critical Thinking · Study planner
