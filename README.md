Vacation Tracker - Vite + React + Express (Demo)

Run instructions:
1. Install dependencies for server and client:
   npm run install:all
2. Start development servers (server on 3000, client on 5173):
   npx concurrently "npm:start --prefix server" "npm:dev --prefix client"
3. Open http://localhost:5173 in your browser.

Notes:
- Click any empty cell to add a leave (enter one of the category codes: AL,SL,MS,NS,...).
- Click on a filled cell to delete the leave (demo).
- This project uses a simple JSON file (server/data.json) for demo persistence.
- For production, replace JSON storage with a proper database and add authentication.
