import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import passport from "passport";
import session from "express-session";
import connectMongo from "connect-mongodb-session";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";

import { buildContext } from "graphql-passport";

import mergedResolvers from "./resolvers/index.js";
import mergedTypeDefs from "./typeDefs/index.js";

import { connectDB } from "./db/connectDB.js";
import { configurePassport } from "./passport/passport.config.js";

import job from "./cron.js";

// Load environment variables
dotenv.config();

// Configure passport
configurePassport();

// Start cron jobs
job.start();

const __dirname = path.resolve();
const app = express();

// Create HTTP server
const httpServer = http.createServer(app);

// MongoDB session store setup
const MongoDBStore = connectMongo(session);

const store = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: "sessions",
});

store.on("error", (err) => {
  console.error("Session store error:", err);
});

// Express session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "defaultsecret", // Use a default secret if not set
    resave: false, // Prevents session from being saved if not modified
    saveUninitialized: false, // Prevents saving uninitialized sessions
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true, // Prevents access to cookies via client-side scripts
    },
    store: store,
  })
);

// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Initialize Apollo Server
const server = new ApolloServer({
  typeDefs: mergedTypeDefs,
  resolvers: mergedResolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

(async () => {
  // Wait for Apollo Server to start before applying middleware
  await server.start();

  // Apply Apollo server middleware
  app.use(
    "/graphql",
    cors({
      origin: "http://localhost:3000", // Allow frontend requests
      credentials: true, // Allow cookies to be sent
    }),
    express.json(), // Parse JSON payloads
    expressMiddleware(server, {
      context: async ({ req, res }) => buildContext({ req, res }), // Build GraphQL context
    })
  );

  // Serve static files from frontend
  app.use(express.static(path.join(__dirname, "frontend/dist")));

  // Handle all other routes with the frontend app
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/dist", "index.html"));
  });

  // Connect to the database and start the server
  await connectDB();
  httpServer.listen(4000, () => {
    console.log("🚀 Server ready at http://localhost:4000/graphql");
  });
})();

// Error handling for unhandled rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});
