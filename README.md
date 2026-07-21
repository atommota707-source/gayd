# CYBERSHOP Гайды

Киберпанк-сайт на русском языке с поиском по секретному шифру, анимациями, рекламой CYBERSHOP и подготовкой под Railway.

## Railway deployment
1. Railway → New Project → Deploy from GitHub repo.
2. Select `atommota707-source/-`.
3. Build command: `npm run build`
4. Start command: `npm run start`
5. Open Settings → Networking to get the public URL or add a custom domain.

## Тестовый шифр
`vHtqhqY8p0TmcY3CQbA94D63OZarguy73o54uZ`

## Масштабирование до 100000 гайдов
Сайт работает через структуру данных `src/guides.json`. Для настоящих 100000 гайдов по 5000+ слов лучше использовать Railway PostgreSQL/API, а не один огромный JSON-файл в браузере.
