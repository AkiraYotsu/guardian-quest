# Guardian Quest Google Sheets Setup

## 1. Buat Apps Script

1. Buka `https://script.google.com/`.
2. Buat project kosong.
3. Paste isi file `google-apps-script/Code.gs` ke editor Apps Script.
4. Klik `Deploy > New deployment`.
5. Pilih type `Web app`.
6. Set:
   - `Execute as`: `Me`
   - `Who has access`: `Anyone`
7. Deploy, lalu copy `Web app URL`.

Backend akan membuat file Google Spreadsheet bernama `Guardian Quest Database` otomatis pada request pertama.

## 2. Kirim URL ke Codex

Kirim URL deploy itu ke saya. Saya akan ganti placeholder ini:

```js
const SHEETS_WEBAPP_URL='PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
```

di `js/sheets_connector.js`.

## 3. Struktur sheet yang dibuat

- `Accounts`: username, password plain text, status akun, admin flag, login/save time, ringkasan character.
- `PlayerState`: character, level, EXP, gold, stats, dungeon/floor saat ini, raw player JSON.
- `Items`: item per account.
- `Weapons`: weapon per account.
- `Skills`: skill level per account.
- `Quests`: active/done/progress quest JSON.
- `Events`: log register, login, dan save.

## 4. Cara kerja di game

- Jika URL belum dipasang, game tetap berjalan dengan `localStorage`.
- Setelah URL dipasang, register/login akan membaca dan menulis ke Google Sheets.
- `savePL()` tetap menyimpan lokal, lalu mengirim salinan data ke Google Sheets.
- Save remote dikirim saat character dibuat, item/gold/stat berubah, masuk dungeon, pindah floor, mati, respawn, retreat, dan logout.
