## World-Play-Backend

Node.js backend for an interactive live-streaming trivia platform featuring real-time game logic via Socket.io and WebRTC.

## Docker

## Prisma
npx prisma studio- אפשרות לראות את השרת בניתוב - בעצם כמו שפתחנו את המונגו DB 

npx prisma migrate dev --name init_user_table - ליצירת טבלאות בשביל שבעצם הם יוצרות גם בSQL והיה אפשר להשמש במודלים שכתבנו הPRISMA
 


## Code Quality and Standards:

This project enforces strict code quality and formatting standards using ESLint and Prettier. This ensures consistency across the codebase, making the code easier to read, maintain, and collaborate on.
Automation (Git Hooks) To prevent code with style errors or critical issues from entering the repository, we use Husky and lint-staged.

# Pre-Commit Hook: Before every git commit, the system automatically runs the following process on all staged files (git add .):

npm run lint:
fix: Automatically fixes simple, auto-fixable ESLint errors (e.g., unused variables that can be removed).
npm run format: Runs Prettier to enforce consistent code styling (e.g., indentation, semicolons, single quotes).
Note: If any critical, non-fixable ESLint errors are detected, the commit will be blocked until the errors are resolved manually.

# Manual Commands:

Developers should use the following commands regularly during development:Command,Description
npm run lint, Runs ESLint to check for all code quality and logical issues.
npm run lint:fix, Runs ESLint and automatically fixes all fixable errors.
npm run format, Runs Prettier to reformat and style the entire codebase.
