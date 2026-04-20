import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("feed", "routes/feed.tsx"),
  route("network", "routes/network.tsx"),
  route("chat", "routes/chat.tsx"),
  route("opportunities", "routes/opportunities.tsx"),
  route("events", "routes/events.tsx"),
  route("events/create", "routes/events.create.tsx"),
  route("events/:id", "routes/events.$id.tsx"),
  route("events/scan/:id", "routes/events.scan.tsx"),
  route("profile", "routes/profile.tsx"),
  route("profile/:userId", "routes/profile.$userId.tsx"),
  route("leaderboard", "routes/leaderboard.tsx"),
  route("admin-rewards", "routes/admin-rewards.tsx"),
] satisfies RouteConfig;

// Trigger rebuild
