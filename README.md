# Poker Client Full-Stack Texas Hold'em Project (WIP)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/jiyulei/pokerclient)
This project is a **full-stack Texas Hold'em poker platform** designed to showcase my full-stack development skills. It features a modern frontend-backend separation architecture, including a custom game engine, backend services, GraphQL real-time subscriptions, and a modern interactive frontend. **This is a Work in Progress (WIP)**—stay tuned for updates!

---

## Project Structure

```
pokerclient/
├── client/   # Frontend: Next.js + React + Apollo Client
├── server/   # Backend: Express + Apollo Server + Prisma
```

---

## Main Features (Completed)

### 1. Game Engine

- Custom Texas Hold'em core logic, supporting multi-player, dealing, betting, settlement, and full game flow
- Modular code, easy to extend and test

### 2. Backend Service

- Built with Express and Apollo Server, providing a GraphQL API
- Integrated with Prisma for database management (users, rooms, games, etc.)
- Supports GraphQL Subscriptions for real-time communication (e.g., game state, player actions)

### 3. Real-Time Frontend-Backend Connection

- Frontend uses Apollo Client and graphql-ws to establish WebSocket connections for real-time game updates

---

## In Progress

- Frontend UI and user interaction (Next.js + React + TailwindCSS)
- Game room, table, leaderboard pages
- User registration, login, authentication
- Richer animations and interactive details

---

## Tech Stack

### Frontend

- [Next.js](https://nextjs.org/) (App Router architecture)
- [React 19](https://react.dev/)
- [Apollo Client](https://www.apollographql.com/docs/react/)
- [TailwindCSS](https://tailwindcss.com/)
- TypeScript

### Backend

- [Express](https://expressjs.com/)
- [Apollo Server](https://www.apollographql.com/docs/apollo-server/)
- [Prisma ORM](https://www.prisma.io/)
- [GraphQL](https://graphql.org/)
- [graphql-ws](https://github.com/enisdenjo/graphql-ws) (WebSocket subscriptions)
- [pokersolver](https://github.com/chenosaurus/pokersolver) (hand evaluation)

---

## Getting Started

### Backend

```bash
cd server
npm install
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs at [http://localhost:3000](http://localhost:3000) by default.

---

## Progress & Roadmap

- [x] Game engine development & testing
- [x] Backend GraphQL API & subscriptions
- [x] Database modeling & connection
- [ ] Frontend page development & user interaction
- [ ] User system & security
- [ ] Deployment & launch

---

## Notes

This project is a personal full-stack showcase and is under active development. Stars, forks, and suggestions are welcome!

---

For more technical details or collaboration, feel free to reach out!
