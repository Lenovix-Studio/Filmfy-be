PRISMA COMMAND;
npx prisma db pull
npx prisma generate
npx prisma db push --env-file .env.dev

MVP Backend
| Module    | Fungsi                                |
| --------- | ------------------------------------- |
| `genres`  | Master genre                          |


Push DB:
- Untuk Dev: npm run db:push:dev
- Untuk Prod: npm run db:push:prod