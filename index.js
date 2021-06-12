const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const socket = require("socket.io");

const app = express();
const port = 3000;
 
app.use(bodyParser.json({limit: '10mb', extended: true }));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true }));
app.use(cors())


var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "praca_inzynierska"
});
connection.connect();


//get users
app.get('/users', (req, res) => {
  let query = '';
  if(req.query.idUser){
    query = `SELECT id, username, email, name, photo, description, (SELECT COUNT(*) FROM posts WHERE idUser=${req.query.idUser}) as postsAmount, (SELECT COUNT(*) FROM followers WHERE idUser=${req.query.idUser}) as following, (SELECT COUNT(*) FROM followers WHERE idFollower=${req.query.idUser}) as followers FROM users WHERE id=${req.query.idUser}`;
  }
  else if(req.query.username && req.query.myIdUser){ 
    query = `SELECT id, username, email, name, photo, description, 
      (SELECT COUNT(*) FROM posts WHERE idUser=(SELECT id from users WHERE username='${req.query.username}')) as postsAmount, 
      (SELECT COUNT(*) FROM followers WHERE idUser=(SELECT id from users WHERE username='${req.query.username}')) as following, 
      (SELECT COUNT(*) FROM followers WHERE idFollower=(SELECT id from users WHERE username='${req.query.username}')) as followers,
      CASE WHEN 
        (SELECT id FROM followers WHERE idFollower IN (SELECT id FROM users WHERE username='${req.query.username}') AND idUser=${req.query.myIdUser}) THEN 1 ELSE 0 END as amIFollowing
      FROM users WHERE id=(SELECT id from users WHERE username='${req.query.username}')`; 
  }
  else{
    query = 'SELECT id, username, email, name, photo, description FROM users';
  }

  connection.query(query, (err, rows, fields) => {
    if(err) throw err;
    rows.map(item => {
      if(item.photo){
        let buff = Buffer.from(item.photo);
        let base64data = buff.toString('base64');  
        item.photo = 'data:image/jpeg;base64,' + base64data;
      }
    })
    res.json(rows);    
  })
})

//create a new user
app.post('/users', (req, res) => {
  bcrypt.hash(req.body.password, 10, function(err, hash) { 
    if (err) throw err;
    const query = `INSERT INTO users VALUES(NULL, '${req.body.username}', '${req.body.email}', '${hash}', '${req.body.name}');`;
    connection.query(query, function (err, result) {
      if(err) throw err;
      res.json({message:"User was created"});
    })
  });
})

//get post by id
app.get('/posts/:id', (req, res) => {
  let query = `SELECT p.id, u.username, p.description, p.uploadDate, p.photo, u.photo as userPhoto, count(l.idPost) as likes, CASE WHEN ${req.query.idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost group by p.id HAVING p.id=${req.params.id}`;
  

  connection.query(query, 
    function (err, rows, fields) {
      if(err) throw err; 
      rows.map(item => {
        let buff = Buffer.from(item.photo);
        let base64data = buff.toString('base64');  
        item.photo = 'data:image/jpeg;base64,' + base64data;

        if(item.userPhoto){
          buff = Buffer.from(item.userPhoto);
          base64data = buff.toString('base64');  
          item.userPhoto = 'data:image/jpeg;base64,' + base64data;
        }
      })
      res.json(rows);    
    })
})

//get all posts
app.get('/posts', (req, res) => {
  let query = '';
  if(req.query.username){
    if(req.query.onlyUserPosts == 'true'){
      query = `SELECT p.id, u.username, p.description, p.uploadDate, p.photo, count(l.idPost) as likes, CASE WHEN (SELECT id FROM users WHERE username='${req.query.username}') IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost WHERE p.idUser=(SELECT id FROM users WHERE username='${req.query.username}') group by p.id ORDER BY p.uploadDate DESC`;
    }
    else {
      query = `SELECT p.id, u.username, p.description, p.uploadDate, p.photo, u.photo as userPhoto, count(l.idPost) as likes, CASE WHEN ${req.query.idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost group by p.id ORDER BY p.uploadDate DESC`; 
    }
  }
  else{
    if(req.query.onlyUserPosts == 'true'){
      query = `SELECT p.id, u.username, p.description, p.uploadDate, p.photo, count(l.idPost) as likes, CASE WHEN ${req.query.idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost WHERE p.idUser=${req.query.idUser} group by p.id ORDER BY p.uploadDate DESC`;
    }
    else{
      query = `SELECT p.id, u.username, p.description, p.uploadDate, p.photo, u.photo as userPhoto, count(l.idPost) as likes, CASE WHEN ${req.query.idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost group by p.id ORDER BY p.uploadDate DESC`;
    }
  }

  connection.query(query, 
    function (err, rows, fields) {
      if(err) throw err; 
      rows.map(item => {
        let buff = Buffer.from(item.photo);
        let base64data = buff.toString('base64');  
        item.photo = 'data:image/jpeg;base64,' + base64data;

        if(item.userPhoto){
          buff = Buffer.from(item.userPhoto);
          base64data = buff.toString('base64');  
          item.userPhoto = 'data:image/jpeg;base64,' + base64data;
        }
      })
      res.json(rows);    
    })
})

//create a new post
app.post('/posts', (req, res) => {
  const bufferValue = Buffer.from(`${req.body.photo}`,"base64");
  let photoHex = '0x'+bufferValue.toString('hex');
  const query = `INSERT INTO posts (id, idUser, description, uploadDate, photo) VALUES (NULL, ${req.body.idUser}, '${req.body.description}', current_timestamp(), ${photoHex});`;
  connection.query(query, function (err, result) {
    if(err) throw err;
    res.json({message:"Post was created"});
  })
})

//like post
app.post('/likes', (req, res) => {
  const query = `INSERT INTO likes VALUES(NULL, '${req.body.idUser}', '${req.body.idPost}');`;
  connection.query(query, function (err, result) {
    if(err) throw err;
    res.json({message:"Liked"});
  })
})

//dislike post
app.delete('/likes', (req, res) => {
  const query = `DELETE FROM likes WHERE idUser=${req.body.idUser} AND idPost=${req.body.idPost};`;
  connection.query(query, function (err, result) {
    if(err) throw err;
    res.json({message:"Disliked"});
  })
})

//log in
app.post('/auth', (req, res) => {
  const query = `SELECT password, id, username from USERS WHERE username='${req.body.username}'`;
  connection.query(query, function (err, rows, fields) {
    if(err) throw err;
    //compare passwords and send response
    if(rows.length > 0){
      bcrypt.compare(req.body.password, rows[0].password, function(err, result) {
        if(err) throw err;
        if(result){
          //generate token
          const accessToken = jwt.sign({id: rows[0].id}, 'secretKey', {expiresIn: 86400})
          res.json({
            message:'Logged',
            id: rows[0].id,
            username: rows[0].username,
            token: accessToken
          });
        }
          
        else
          res.sendStatus(404);
      });
    }
    else
      res.sendStatus(404);
  })
});




//follow user
app.post('/users/:id/follow/:idFollower', (req, res) => {
  const query = `INSERT INTO followers VALUES(NULL, '${req.params.id}', '${req.params.idFollower}');`;
  connection.query(query, function (err, result) {
    if(err) throw err;
    res.json({message:"Followed"}); 
  })
})

//unfollow user
app.delete('/users/:id/follow/:idFollower', (req, res) => {
  const query = `DELETE FROM followers WHERE idUser=${req.params.id} AND idFollower=${req.params.idFollower};`;
  connection.query(query, function (err, result) {
    if(err) throw err;
    res.json({message:"Unfollowed"});
  })
})


const server = app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});

const io = socket(server);
const activeUsers = new Set();

io.on("connection", function (socket) {
  console.log("Made socket connection");

  socket.on("new user", function (data) {
    socket.userId = data;
    activeUsers.add(data);

    // setTimeout(() => {
    //   io.emit("notification", [...activeUsers]);
    // }, 1000);


    // console.log('socket', data);
    console.log(activeUsers)
  });

});