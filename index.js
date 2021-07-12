const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const socket = require("socket.io");

const app = express();
const port = 3000;
 
app.use(bodyParser.json({limit: '10mb', extended: true }));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true }));
app.use(cors())

const connection = require('./connection/connection').connection;

  
//rest routes
require('./routes/test')(app, connection);
require('./routes/users')(app, connection);
require('./routes/posts')(app, connection);



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


// search user by username
app.get('/users/:query', (req, res) => {
  let query = `SELECT id, username, email, name, photo from USERS WHERE username LIKE '%${req.params.query}%' OR name LIKE '%${req.params.query}%'`;

  //dorobic page


  connection.query(query, 
    function (err, rows, fields) {
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