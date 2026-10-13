# Visual HTML – Chapters + Admin (Vercel ready)
Build by Yash Srivastava

## Local chalana
    npm install
    npm start
Site: http://localhost:3000   Admin: http://localhost:3000/yadm  (login nahi hai, seedha khulta hai)
Local pe state `data/state.json` me save hoti hai.

## Vercel pe deploy (step by step)
1. GitHub pe naya repo banao aur is poore folder ka code push karo
   (`node_modules` push mat karna – `.gitignore` me already hai).
2. vercel.com -> Add New -> Project -> apna GitHub repo Import karo.
   Framework: "Other", Build/Output settings default chhod do. Deploy dabao.
3. **Zaroori:** Vercel pe file save nahi hoti, isliye open/close state ke liye free Redis connect karo:
   Project -> Storage (ya Marketplace) -> **Upstash Redis** -> Create -> apne project se Connect.
   Ye `KV_REST_API_URL` aur `KV_REST_API_TOKEN` env variables khud add kar deta hai.
4. Project -> Deployments -> latest deploy -> Redeploy (taaki env variables lag jayein).
5. Open karo: `https://your-app.vercel.app/` aur admin `https://your-app.vercel.app/yadm`.

Optional env variable: `ADMIN_PATH` (default `/yadm`) – admin URL badalna ho to, jaise `/yadm-x7k29q`.

## Dhyan do
- Admin me login nahi hai, to jisko `/yadm` ka link pata hai wo chapters open/close kar sakta hai.
  Isliye link kisi ko mat dena, ya `ADMIN_PATH` me lamba random naam rakh lo.
- Redis connect nahi hua to admin page pe peela warning dikhta hai aur state redeploy pe reset ho jati hai.
- Redis down ho jaye to chapters 503 dete hain (closed chapter galti se khul na jaye).
