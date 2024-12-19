import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import GridBackground from "./components/ui/GridBackground.jsx";
import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink } from "@apollo/client";

// Apollo Client setup
const client = new ApolloClient({
  link: new HttpLink({
    uri: import.meta.env.VITE_NODE_ENV === "development"
      ? "http://localhost:4000/graphql"  // Development API endpoint
      : "/graphql",                     // Production endpoint (Vite proxy)
    credentials: "include",             // Ensures cookies are sent with the requests
  }),
  cache: new InMemoryCache(),            // Cache setup for Apollo Client
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <GridBackground>
        <ApolloProvider client={client}> {/* Wrap your app with ApolloProvider */}
          <App />
        </ApolloProvider>
      </GridBackground>
    </BrowserRouter>
  </React.StrictMode>
);
