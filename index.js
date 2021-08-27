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

      for (let item of rows) {
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

      for (let item of rows) {
        if (item.userPhoto) {
          const image = await fun.resizeImage(item.userPhoto, 40, 40);
          item.userPhoto = fun.bufferToBase64(image);
        }
      }

      res.json(rows);
    })
  })

  //get channels by idUser
  app.get('/channels', (req, res) => {
    // console.log(req.query);
    if (req.query.idUser) {
      const query = `SELECT idUser, idChannel, username, name, photo, (SELECT message from messages m WHERE m.idChannel=uc.idChannel ORDER BY createdAt DESC LIMIT 1) as lastMessage, 
                    (SELECT createdAt from messages m WHERE m.idChannel=uc.idChannel ORDER BY createdAt DESC LIMIT 1) as createdAt FROM users JOIN users_channels uc ON users.id=uc.idUser 
                    WHERE uc.idChannel IN (SELECT idChannel FROM users_channels WHERE idUser=${req.query.idUser}) AND uc.idUser!=${req.query.idUser} ORDER BY createdAt DESC`;
      connection.query(query, async (err, rows) => {
        if (err) throw err;
        for (let item of rows) {
          if (item.photo) {
            const image = await fun.resizeImage(item.photo, 60, 60);
            item.photo = fun.bufferToBase64(image);
          }
          item.isActive = activeUsers.has(item.username);
        }

        res.json(rows);
      })
    } else {
      res.json({message: 'You need to add query to your request url'});
    }
  })

  //get messages by channel
  app.get('/messages/:channel', (req, res) => {
    // console.log(req.query);
    const messagesQuery = `SELECT id, idSender, message, createdAt FROM messages WHERE idChannel=${req.params.channel}`;

    const result = {};
    let promise = new Promise((resolve, reject) => {
      connection.query(messagesQuery, (err, rows) => {
        if (err) throw err;
        result.messages = rows;
        resolve();
      })
    })

    promise.then(() => {
      const usersQuery = `SELECT id as idUser, username, photo, name FROM USERS WHERE id IN (SELECT idUser FROM users_channels WHERE idChannel=${req.params.channel})`;
      connection.query(usersQuery, async (err, rows) => {
        if (err) throw err;

        for (let item of rows) {
          if (item.photo) {
            const image = await fun.resizeImage(item.photo, 60, 60);
            item.photo = fun.bufferToBase64(image);
          }
          item.isActive = activeUsers.has(item.username);
        }

        result.users = rows;
        res.json(result)
      })
    })
  })

  socket.on('message-from-user', (message) => {
    console.log('message from user', message);

    const query = `INSERT INTO messages VALUES(NULL, ${message.idSender}, ${message.idChannel}, '${message.message}', current_timestamp())`;
    connection.query(query, function (err, result) {
      if (err) throw err;
      console.log('saved')
      // socket.broadcast.emit('message-from-server', message);
      message.idSender = 41;
      socket.emit('message-from-server', message);
    })
  })

  // setInterval(() => {
  //     socket.emit('message-from-server', {idUser: 12, message: 'message from serv', date: new Date()});
  // }, 2000)

  socket.on("new-user", function (data) {
    socket.username = data;
    activeUsers.add(data);

    console.log(activeUsers)
  });

});
