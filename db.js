import sqlite3 from 'sqlite3';

const db=new sqlite3.Database("app.sqlite");

db.serialize(()=>{

    db.run(`
    create table if not exists users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        hashedpass TEXT
    )
    `);

db.run(`
    create table if not exists messages(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user TEXT,
        message TEXT,
        date TEXT
        )
    `);



})



export default db;