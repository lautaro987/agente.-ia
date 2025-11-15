## 🔌 API Endpoints

### Público
- `GET /api/version` → `{ version: "v3", lastUpdate: "2025-04-10T10:00:00Z" }`

### Autenticado (X-Auth-Token header)
- `POST /api/update-system` → body `{ code: string, note?: string }`
- `POST /api/rollback` → restaura último backup
- `GET /api/history` → lista de backups
- `POST /api/upload` → subida de archivos (multipart)
- `POST /api/chat` → mock LLM: `{ message: string, contextIds: string[] }`
