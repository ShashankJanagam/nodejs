
// import express from 'express';
// import bcrypt from 'bcryptjs';
// import authMiddleware from '../middleware/auth.js';
// import db from '../db.js';
// import sqlite3 from 'sqlite3';

// const router=express.Router();

// const sessionDB=new sqlite3.Database("./sessions.sqlite",(err)=>{ 

//     if(err){
//         console.log("Error connecting to session database",err);
//     }else{
//         console.log("Connected to SQLite session database");}
// });
// router.post("/register",async (req,res)=>{

//     const {email,password}=req.body;

//     try{

//       const hashedpass=await bcrypt.hash(password,10);

//       db.run(
//         "insert into users (email,hashedpass) values (?,?)",
//         [email,hashedpass],

//         function(err){
//           if(err){
//             return res.status(400).json({message:"user already existed"});
//           }
//           res.status(201).json({message:"user registered succcessfully"});
//         }


//       );


//     }catch(err){
//     return res.status(500).json({message:"Internal server error"});
//     }
//     console.log("User registered:",email);
// });

// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
//     if (err) return res.status(500).json({ message: "DB error" });
//     if (!user) return res.status(400).json({ message: "Invalid email" });

//     const isMatch = await bcrypt.compare(password, user.hashedpass);
//     if (!isMatch) return res.status(400).json({ message: "Invalid password" });

//     req.session.user = {
//       id: user.id,
//       email: user.email,
//       loginCount: (req.session.user?.loginCount || 0) + 1
//     };

//     req.session.ua = req.headers["user-agent"];

//     console.log("User logged in:", req.session.user);

//     // 🔥 ENSURE SESSION SAVED BEFORE RESPONDING
//     req.session.save((err) => {
//       if (err) {
//         console.error("Session save error:", err);
//         return res.status(500).json({ message: "Session not saved" });
//       }

//       res.json({ message: "Login successful" });
//     });
//   });
// });


// router.get("/profile",authMiddleware,(req,res)=>{

//     console.log("inside protected route");

//     res.json({  
//         message:"welcome to protected route",
//         user:req.user   
// });


// });
// router.post("/logout-all", authMiddleware, (req, res) => {
//   const userID = req.user.id;

//   // STEP 1: Destroy current session FIRST
//   req.session.destroy(() => {

//     sessionDB.all("SELECT sid, sess FROM sessions", (err, rows) => {
//       if (err) return res.status(500).json({ message: "DB Error" });

//       const sidsToDelete = rows
//         .map(row => {
//           try {
//             const session = JSON.parse(row.sess);
//             if (session.user && session.user.id === userID) {
//               return row.sid;
//             }
//           } catch {}
//           return null;
//         })
//         .filter(Boolean);

//       if (sidsToDelete.length === 0) {
//         return res.json({ message: "No active sessions" });
//       }

//       const placeholders = sidsToDelete.map(() => "?").join(",");

//       sessionDB.run(
//         `DELETE FROM sessions WHERE sid IN (${placeholders})`,
//         sidsToDelete,
//         function () {
//           res.json({
//             message: "Logged out from all devices",
//             deleted: this.changes
//           });
//         }
//       );
//     });

//   });
// });



// export default router;





import express from 'express'
import bcrypt from 'bcryptjs'
import db from "../db.js"

const router=express.Router()

router.post("/register",async (req,res)=>{
  const {email,password}=req.body
  const hashedpass=await bcrypt.hash(password,10)


  db.run("insert into users (email,hashedpass) values(?,?)",[email,hashedpass],(err)=>{
    if(err) return res.status(400).json({message:"user exists"})

    res.json({message:"registered successfully"})
  })


})

router.post("/login",(req,res)=>{
  const {email,password}=req.body


  db.get("select * from users where email =?",[email], async (err,user)=>{
    if(!user) return res.status(400).json({message:"user not found"})
    
    const isMatch=await bcrypt.compare(password,user.hashedpass)

    if(!isMatch) return res.status(400).json({message:"invalid password"})

    req.session.user={id:user.id,email:user.email}

    req.session.save(()=>res.json({message:"login success"}))
  })

})


export default router