const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const socket = require("socket.io");

const app = express();
const port = 3000;
 
app.use(bodyParser.json({limit: '10mb', extended: true }));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true }));
app.use(cors())

const connection = require('./connection/connection').connection;

// //import my functions
const fun = require('./functions/functions');


  
//rest routes
require('./routes/test')(app, connection);
require('./routes/users')(app, connection);
require('./routes/posts')(app, connection);
require('./routes/auth')(app, connection);
require('./routes/comments')(app, connection);



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

// get all user's followers
app.get('/followers/:id', (req, res) => {
  const query = `SELECT f.id, f.idUser, u.username, u.name, u.photo as userPhoto, (SELECT COUNT(*) FROM followers WHERE idFollower=u.id) as followers FROM followers f JOIN users u ON f.idUser=u.id WHERE f.idFollower=${req.params.id} ORDER BY followers DESC`;
  connection.query(query, async function(err, rows, fields) {
    if(err) throw err;

    for(item of rows) {
      if(item.userPhoto){
        const image = await fun.resizeImage(item.userPhoto, 40, 40);
        item.userPhoto = fun.bufferToBase64(image);
      }
    }

    res.json(rows);
  })
})

// get all user's following
app.get('/following/:id', (req, res) => {
  const query = `SELECT f.id, f.idUser, u.username, u.name, u.photo as userPhoto, (SELECT COUNT(*) FROM followers WHERE idFollower=u.id) as followers FROM followers f JOIN users u ON f.idFollower=u.id WHERE f.idUser=${req.params.id} ORDER BY followers DESC`;
  connection.query(query, async function(err, rows, fields) {
    if(err) throw err;

    for(item of rows) {
      if(item.userPhoto){
        const image = await fun.resizeImage(item.userPhoto, 40, 40);
        item.userPhoto = fun.bufferToBase64(image);
      }
    }

    res.json(rows);
  })
})

const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
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