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
const bcrypt = require("bcrypt");


const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
});

const io = websocket(server);
const activeUsers = new Set();

//rest routes
require('./routes/auth')(app, connection);
require('./routes/test')(app, connection);
require('./routes/users')(app, connection);
require('./routes/posts')(app, connection);
require('./routes/comments')(app, connection);

io.on("connection", function (socket) {
  console.log("Made socket connection");

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
                    WHERE uc.idChannel IN (SELECT idChannel FROM users_channels WHERE idUser=${req.query.idUser}) AND uc.idUser!=${req.query.idUser} AND (SELECT message from messages m WHERE m.idChannel=uc.idChannel ORDER BY createdAt DESC LIMIT 1)!='' ORDER BY createdAt DESC`;
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

  //get messages by idUser
  app.get('/messages/:idUser', (req, res) => {

    let idChannel = null;
    new Promise((resolve, reject) => {
      const idChannelQuery = `SELECT idChannel FROM users_channels WHERE idChannel IN (SELECT idChannel FROM users_channels WHERE idUser=${req.params.idUser}) AND idChannel IN (SELECT idChannel FROM users_channels WHERE idUser=${req.query.myIdUser})`
      connection.query(idChannelQuery, (err, rows) => {
        if(err) throw(err);

        if(rows.length > 0)
          idChannel = rows[0].idChannel;
        resolve();
      })
    })
      .then(() => {
        if(!idChannel) {
          connection.query(`SELECT MAX(idChannel) as max FROM users_channels`, (err, rows) => {
            if(err) throw err;
            idChannel = rows[0].max + 1;

            connection.query(`INSERT INTO users_channels(idUser, idChannel) VALUES(${req.params.idUser}, ${idChannel}), (${req.query.myIdUser}, ${idChannel});`)

            const queryCreateChannel = `INSERT INTO channels VALUES(${idChannel})`
            connection.query(queryCreateChannel, (err, rows) => {
              if(err) throw err;
              getMessages(idChannel);
            })
          })
        } else {
          getMessages(idChannel);
        }
      })

    function getMessages(idChannel) {
      const messagesQuery = `SELECT id, idSender, message, createdAt FROM messages WHERE idChannel=${idChannel}`;

      const result = {};
      new Promise((resolve, reject) => {
        connection.query(messagesQuery, (err, rows) => {
          if (err) throw err;
          result.messages = rows;
          resolve();
        })
      })
      .then(() => {
        const usersQuery = `SELECT id as idUser, username, photo, name FROM USERS WHERE id IN (SELECT idUser FROM users_channels WHERE idChannel=${idChannel})`;
        connection.query(usersQuery, async (err, rows) => {
          if (err) throw err;

          for (let item of rows) {
            if (item.photo) {
              const image = await fun.resizeImage(item.photo, 60, 60);
              item.photo = fun.bufferToBase64(image);
            }
            // item.isActive = activeUsers.has(item.username);
          }

          result.users = rows;
          res.json({...result, idChannel})
        })
      })
    }
  })

  //  BODY
  // - idUser
  // - oldPassword
  // - newPassword
  // reset password
  app.put('/reset/password', (req, res) => {

    connection.query(`SELECT password FROM users WHERE id=39`,
      (err, rows, fields) => {
        if (err) throw err;
        let correctOldPassword = bcrypt.compareSync(req.body.oldPassword, rows[0].password);

        if (correctOldPassword) {
          bcrypt.hash(req.body.newPassword, 10, function (err, hash) {
            if (err) throw err;
            const query = `UPDATE users SET password='${hash}' WHERE id=${req.body.idUser}`;
            connection.query(query, function (err, result) {
              if (err) throw err;
              res.json({message: "Password has been changed"});
            })
          });
        } else {
          res.json({message: "Wrong old password"});
        }
      }
    )
  })

  // get tags by query
  app.get('/tags', (req, res) => {
    if(req.query.query) {
      const query = `SELECT tag FROM tags WHERE tag LIKE '%${req.query.query}%'`;
      connection.query(query, function (err, rows) {
        if (err) throw err;
        res.json(rows.map(item => item.tag));
      })
    } else {
      const query = `SELECT * FROM tags`;
      connection.query(query, function (err, rows) {
        if (err) throw err;
        res.json(rows.map(item => item.tag));
      })
    }

  })

  //  BODY
  // - idReporter
  // - description
  // report bug
  app.post('/report/bug', (req, res) => {
    const query = `INSERT INTO bugs VALUES(NULL, '${req.body.idReporter}', NULL, '${req.body.description}', 'opened')`;
    connection.query(query, function (err, result) {
      if (err) throw err;
      res.json({message: "Thank You! Bug has been reported"});
    })
  })

  socket.on('message-from-user', (message) => {
    console.log(message);
    const query = `INSERT INTO messages VALUES(NULL, ${message.idSender}, ${message.idReciever}, ${message.idChannel}, '${message.message}', '${message.createdAt}')`;
    connection.query(query, function (err, result) {
      if (err) throw err;
      io.emit(`message-to-user-${message.idReciever}`, message);
    })
  })

  socket.on("new-user", function (data) {
    socket.username = data;
    activeUsers.add(data);

    console.log(activeUsers)
  })

})
