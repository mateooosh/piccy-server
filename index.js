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