// import express from 'express';
// import authRoutes from './routes/authRoutes.js';
// import dotenv from "dotenv";
// import cookieParser from 'cookie-parser';
// import cors from 'cors';
// import session from 'express-session';
// import db from './db.js';
// import connectSqlite3 from 'connect-sqlite3';
// import sqlite3 from 'sqlite3';

// dotenv.config();

// const app = express();

// const SQLiteStore = connectSqlite3(session);

// app.use(cors({
//   origin: "http://localhost:5500",
//   credentials: true
// }));

// app.use(express.json());
// app.use(cookieParser());

// const sessionDB = new sqlite3.Database("./sessions.sqlite", (err) => { 
//   if (err) console.log("Error connecting to session database", err);
//   else console.log("Connected to SQLite session database");
// });

// app.use(express.static("public"));
// app.use(session({
//   name: "sid",
//   store: new SQLiteStore({
//     db: "sessions.sqlite",
//     dir: "./"
//   }),
//   secret: process.env.SECRET_KEY,
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     maxAge: 1000 * 60 * 60 * 2,
//     sameSite: "lax",   // 🔥 FIX
//     secure: false      // 🔥 because you are NOT using https
//   }
// }));


// console.log("users:",db.all("select * from users"));

// app.use('/auth', authRoutes);

// app.listen(5500, () => {
//   console.log("Server is running on port 5500");
// });



import http from 'http'
import express from 'express'
import session from 'express-session'
import connectSqlite3 from 'connect-sqlite3'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes from './/routes/authRoutes.js'
import {initWebSocket} from './websocket.js'

dotenv.config()

const app=express()
const server=http.createServer(app)

// -----------------------------------------------------
const SQLiteStore =connectSqlite3(session)
export const sessionMiddleware=session({
  name:"sid",
  store: new SQLiteStore({
    db:"session.sqlite",
    dir:"./"
  }),

  secret:process.env.SECRET_KEY,
  resave:false,
  saveUninitialized:false,
  cookie:{
    maxAge:1000*60*60*2,
    httpOnly:true,
    sameSite:"none",
    secure:true
  }

})

// ------------------------------------------------------------
app.use(cors({
  origin: [
    "http://localhost:5500",
    "https://nodejs-umber-five.vercel.app"

  ],
  credentials: true
}));


app.use(express.json())
app.use(sessionMiddleware)


app.use("/auth",authRoutes)

app.use(express.static("public"))
const PORT = process.env.PORT;
initWebSocket(server,sessionMiddleware)
server.listen(PORT,()=>{
  console.log("server running at http://localhost:5500")
})

