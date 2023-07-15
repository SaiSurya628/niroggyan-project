const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require("sqlite");
const path = require("path");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "database.db");

const app = express();

app.use(cors());
app.use(express.json());

let db = null;

const initialization = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        password TEXT NOT NULL
      )
    `);
     
    await db.exec(`
    CREATE TABLE IF NOT EXISTS health_report (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL,
      disease TEXT NOT NULL
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reportId INTEGER NOT NULL,
      testName TEXT NOT NULL,
      result TEXT NOT NULL,
      range TEXT NOT NULL,
      FOREIGN KEY(reportId) REFERENCES health_report(id)
    )
  `);

    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  } catch (error) {
    console.log(`DB error: ${error}`);
    process.exit(1);
  }
};

initialization();

app.post("/signup", async (request, response) => {
    try {
      const { username, password } = request.body;
      const userCheck = await db.get(`SELECT * FROM user WHERE username = ?`, [username]);
      const hashedPassword = await bcrypt.hash(password, 10);
      if (userCheck === undefined) {
        const insertData = `INSERT INTO user(username, password) VALUES(?, ?)`;
        await db.run(insertData, [username, hashedPassword]);
        const newUserId = this.lastID;
        response.json({ message: `Created new user with ID: ${newUserId}` });
      } else {
        response.status(400);
        response.json({ error: "User already exists" });
      }
    } catch (error) {
      console.log(error);
      response.sendStatus(500);
    }
  });
  
  app.post('/login', async (request, response) => {
    try {
      const { username, password } = request.body;
      const userVerify = await db.get(`SELECT * FROM user WHERE username = ?`, [username]);
      if (userVerify === undefined) {
        response.status(400);
        response.json({ error: "Invalid user" });
      } else {
        const isPasswordValid = await bcrypt.compare(password, userVerify.password);
        if (isPasswordValid) {
          const payload = { username: username };
          const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
          response.json({ jwtToken });
        } else {
          response.status(400);
          response.json({ error: "Invalid password" });
        }
      }
    } catch (error) {
      console.log(error);
      response.sendStatus(500);
    }
  });


  
  app.post("/userhealth-report", async (request, response) => {
    try {
      const { name, age, gender, disease, tests } = request.body;
      const insertData = `INSERT INTO health_report(name, age, gender, disease) VALUES(?, ?, ?, ?)`;
      await db.run(insertData, [name, age, gender, disease]);
  
      const reportId = this.lastID; // <-- Replace this line with the following code
      const { lastID } = await db.get("SELECT last_insert_rowid() AS lastID");
  
      for (const test of tests) {
        const { testName, result, range } = test;
        const insertResultData = `INSERT INTO test_results(reportId, testName, result, range) VALUES(?, ?, ?, ?)`;
        await db.run(insertResultData, [lastID, testName, result, range]);
      }
  
      response.json({ message: lastID });
    } catch (error) {
      console.log(error);
      response.sendStatus(500);
    }
  });
  
app.get("/smart-report/:id", async(request,response)=>{
   const {id}=request.params
  const fetchingData=`SELECT * FROM health_report WHERE id=${id}`
  const data=await db.get(fetchingData);
  const fetchTests=await db.all(`SELECT * FROM test_results where reportId=${id}`)
  response.json({user:data,tests:fetchTests});
})


app.put("/edit/:id", async (request, response) => {
  try {
    const { id } = request.params;
    console.log(id)
    const { name, age, gender } = request.body;

    const updateData = `UPDATE health_report SET name = ?, age = ?, gender = ? WHERE id = ?`;
    await db.run(updateData, [name, age, gender, id]);

    response.json({ message: "Data updated successfully" });
  } catch (error) {
    console.log(error);
    response.sendStatus(500);
  }
});

module.exports=app;