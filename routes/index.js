var express = require('express');
var router = express.Router();
let { escape } = require('sqlstring')
const redis = require("redis")

//redis connection details
const redis_client = redis.createClient({
  password: '#YOUR_API_KEY',
  socket: {
    host: '127.0.0.1',
    port: 17089
  }
});

try {
  redis_client.connect().then(() => console.log("redis connected"))
}
catch {
  console.log("unable to connect redis")
}

//postgres connection details
const { Client } = require('pg')
const client = new Client({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'test',
  password: '#YOUR_PASSWORD',
  port: 5432,
})

client.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});

//Adds a new user to the platform.
router.post('/api/users/', function (req, res, next) {
  const { username, password, email } = req.body
  //password can be hashed using bcrypt
  const sql = `INSERT INTO users (username,email,password) values (${escape(username)},${escape(email)}, ${escape(password)});`
  const data = client.query(sql)
  res.send({ message: "OK" })
});

//Retrieves details of a specific user
router.get('/api/users/:id', async function (req, res, next) {
  const { id } = req.params
  const sql = `SELECT * FROM users where id=${escape(id)}`
  const data = await client.query(sql)
  res.send(data.rows)
});

/*
This code snippet is a route handler for a PUT request that updates user information in a database.
It retrieves the user's ID, username, password, email, and new_password from the request parameters and body.
The code then checks if the provided password matches the password stored in the database.
If they match, it constructs an SQL update query to modify the user's information and executes it.
Finally, the code sends a response indicating whether the update was successful or if the password was incorrect.
*/
router.put('/api/users/:id', async function (req, res, next) {
  const { id } = req.params
  const { username, password, email, new_password } = req.body
  const sql = `SELECT * FROM users where id=${escape(id)}`
  const data = await client.query(sql)
  console.log(password === data.rows[0].password)
  console.log(data.rows[0].password)
  if (password === data.rows[0].password) {
    let update_query = `update users set `
    if (username) update_query += ` username = ${escape(username)},`
    if (new_password) update_query += ` password = ${escape(new_password)},`
    if (email) update_query += ` email = ${escape(email)},`
    update_query = update_query.slice(0, -1)
    update_query += `where id = ${escape(id)}`
    console.log(update_query)
    await client.query(update_query)
    res.send({ message: "OK" })
  } else {
    res.send({ message: "Password Incorrect" })
  }
});

//Creates a new post
router.post('/api/posts/', function (req, res, next) {
  const { user_id, content, post_date } = req.body
  const sql = `INSERT INTO posts (user_id,content,post_date) values (${escape(user_id)},${escape(content)}, ${escape(post_date)});`
  const data = client.query(sql)
  res.send({ message: "OK" })
});

//Gets post according to post ID.
router.get('/api/posts/:id', async function (req, res, next) {
  const { id } = req.params
  const sql = `SELECT * FROM posts where id=${escape(id)}`
  const data = await client.query(sql)
  res.send(data.rows)
});

/*
The code snippet is a route handler for updating a post in a database.
It checks if the provided password matches the password retrieved from the database for the corresponding user.
If the passwords match, it constructs and executes an SQL query to update the post with the provided details.
If the passwords do not match, it sends a response indicating that the password is incorrect.
*/
router.put('/api/posts/:id', async function (req, res, next) {
  const { id } = req.params
  const { user_id, content, password, post_date } = req.body
  const sql = `SELECT * FROM users where id=${escape(user_id)}`
  const data = await client.query(sql)
  console.log(password === data.rows[0].password)
  console.log(data.rows[0].password)
  if (password === data.rows[0].password) {
    let update_query = `update posts set `
    if (username) update_query += ` user_id = ${escape(user_id)},`
    if (new_password) update_query += ` content = ${escape(content)},`
    if (email) update_query += ` post_date = ${escape(post_date)},`
    update_query = update_query.slice(0, -1)
    update_query += `where id = ${escape(id)}`
    console.log(update_query)
    await client.query(update_query)
    res.send({ message: "OK" })
  } else {
    res.send({ message: "Password Incorrect" })
  }
});

/*
This code is a router endpoint for handling a GET request to '/api/posts'.
It checks if there is cached data in a Redis database for the 'posts' key.
If there is, it returns the cached data.
If not, it queries a SQL database to retrieve the data, stores it as cached data in Redis, and returns the retrieved data.
*/
router.get('/api/posts', async function (req, res, next) {
  let cacheData = await redis_client.get('posts')
  console.log(cacheData)
  if (cacheData) {
    cacheData = JSON.parse(cacheData)
    res.send({ fromCache: true, cacheData })
  }
  else {
    const sql = `SELECT * FROM posts`
    const data = await client.query(sql)
    await redis_client.set("posts", JSON.stringify(data.rows), {
      EX: 180,
      NX: true,
    })
    res.send(data.rows)
  }
});

module.exports = router;
