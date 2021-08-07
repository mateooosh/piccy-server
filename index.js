const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const websocket = require("socket.io");

const app = express();
const port = 3000;

app.use(bodyParser.json({limit: '10mb', extended: true}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
app.use(cors())

const connection = require('./connection/connection').connection;

// //import my functions
const fun = require('./functions/functions');


const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
});

const io = websocket(server);
const activeUsers = new Set();

io.on("connection", function (socket) {
  console.log("Made socket connection");

  //rest routes
  require('./routes/test')(app, connection);
  require('./routes/users')(app, connection);
  require('./routes/posts')(app, connection);
  require('./routes/auth')(app, connection);
  require('./routes/comments')(app, connection);


  // get all user's followers
  app.get('/followers/:id', (req, res) => {
    const query = `SELECT f.id, f.idUser, u.username, u.name, u.photo as userPhoto, (SELECT COUNT(*) FROM followers WHERE idFollower=u.id) as followers FROM followers f JOIN users u ON f.idUser=u.id WHERE f.idFollower=${req.params.id} ORDER BY followers DESC`;
    connection.query(query, async function (err, rows, fields) {
      if (err) throw err;

      for (item of rows) {
        if (item.userPhoto) {
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
    connection.query(query, async function (err, rows, fields) {
      if (err) throw err;

      for (item of rows) {
        if (item.userPhoto) {
          const image = await fun.resizeImage(item.userPhoto, 40, 40);
          item.userPhoto = fun.bufferToBase64(image);
        }
      }

      res.json(rows);
    })
  })

  app.post('/message', (req, res) => {
    socket.emit('message', req.body.message);
    res.json(req.body.message);
  })

  socket.on("new-user", function (data) {
    socket.userId = data;
    activeUsers.push(data);

    console.log(activeUsers)
  });

  let counter = 0;

  setInterval(() => {
    socket.emit('test', counter++);
  }, 1000)
});
