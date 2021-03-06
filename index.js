const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const websocket = require("socket.io");
const cluster = require('cluster');
const totalCPUs = require('os').cpus().length;
const auth = require('./middleware/token');

// if (cluster.isMaster) {
//   console.log(`Number of CPUs is ${totalCPUs}`);
//   for (let i = 0; i < totalCPUs; i++) {
//     cluster.fork();
//   }
//
//   cluster.on("exit", (worker, code, signal) => {
//     cluster.fork();
//   });
// } else {
  const app = express();
  const port = 3000;

  app.use(bodyParser.json({limit: '20mb', extended: true}));
  app.use(bodyParser.urlencoded({limit: '20mb', extended: true}));
  app.use(cors())

  const connection = require('./connection/connection').connection;

// //import my functions
  const fun = require('./functions/functions');
  const bcrypt = require("bcrypt");


  const server = app.listen(port);

  const io = websocket(server);
  app.use(function (req, res, next) {
    req.io = io
    next()
  })


  const activeUsers = new Set();

//rest routes
  require('./routes/login')(app, connection);
  require('./routes/users')(app, connection);
  require('./routes/posts')(app, connection);
  require('./routes/comments')(app, connection);
  require('./routes/reports')(app, connection);
  require('./routes/messages')(app, connection);
  require('./routes/tags')(app, connection);
  require('./routes/admin')(app, connection);

  io.on("connection", function (socket) {

    //  BODY
    // - idUser
    // - oldPassword
    // - newPassword
    // reset password
    app.put('/reset/password', auth, (req, res) => {
      console.log('reset');
      connection.query(`SELECT password FROM users WHERE id=${req.body.idUser}`,
        (err, rows, fields) => {
          if (err) throw err;
          let correctOldPassword = bcrypt.compareSync(req.body.oldPassword, rows[0].password);

          if (correctOldPassword) {
            bcrypt.hash(req.body.newPassword, 10, function (err, hash) {
              if (err) throw err;
              const query = `UPDATE users SET password='${hash}' WHERE id=${req.body.idUser}`;
              connection.query(query, function (err, result) {
                if (err) throw err;
                res.json({
                  message: {
                    variant: 'success',
                    en: "Password has been changed.",
                    pl: "Has??o zosta??o zmienione."
                  }
                });
              })
            });
          } else {
            res.json({
              message: {
                variant: 'error',
                en: "Wrong old password.",
                pl: "B????dne stare has??o."
              }
            });
          }
        }
      )
    })

    socket.on('message-from-user', (message) => {
      console.log(message);
      const query = `INSERT INTO messages VALUES(NULL, ${message.idSender}, ${message.idReciever}, ${message.idChannel}, '${message.message}', null)`;
      connection.query(query, function (err, result) {
        if (err) throw err;

        // mark message as unread
        const updateQuery = `UPDATE users_channels SET status=1 WHERE idChannel=${message.idChannel} AND idUser=${message.idReciever}`;
        connection.query(updateQuery, (err, result) => {
          if (err) throw err;
          io.emit(`message-to-user-${message.idReciever}`, message);
        })
      })
    })

    socket.on('mark-as-read', (idUser, idChannel) => {
      // mark message as read
      const updateQuery = `UPDATE users_channels SET status=0 WHERE idChannel=${idChannel} AND idUser=${idUser}`;
      connection.query(updateQuery, (err, result) => {
        if (err) throw err;
      })
    })

    socket.on("new-user", function (data) {
      console.log('new user')
      socket.username = data;
      activeUsers.add(data);

      console.log(activeUsers)
    })

    socket.on("log-out", function (data) {
      console.log('disconnect', data)
      activeUsers.delete(data)
      console.log(activeUsers)
    })
  })
// }


