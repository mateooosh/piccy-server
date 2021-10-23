module.exports = (app, connection) => {

  //import my functions
  const fun = require('../functions/functions');

  const auth = require("../middleware/token");

  const router = require('express').Router();

  //get messages by idUser
  router.get('/messages/:idUser', auth, (req, res) => {

    let idChannel = null;
    new Promise((resolve, reject) => {
      const idChannelQuery = `SELECT idChannel FROM users_channels WHERE idChannel IN (SELECT idChannel FROM users_channels WHERE idUser=${req.params.idUser}) AND idChannel IN (SELECT idChannel FROM users_channels WHERE idUser=${req.query.myIdUser})`
      connection.query(idChannelQuery, (err, rows) => {
        if (err) throw(err);

        if (rows.length > 0)
          idChannel = rows[0].idChannel;
        resolve();
      })
    })
      .then(() => {
        if (!idChannel) {
          connection.query(`SELECT MAX(idChannel) as max FROM users_channels`, (err, rows) => {
            if (err) throw err;
            idChannel = rows[0].max + 1;

            connection.query(`INSERT INTO users_channels(idUser, idChannel) VALUES(${req.params.idUser}, ${idChannel}), (${req.query.myIdUser}, ${idChannel});`)

            const queryCreateChannel = `INSERT INTO channels VALUES(${idChannel})`
            connection.query(queryCreateChannel, (err, rows) => {
              if (err) throw err;
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

  //get channels by idUser
  router.get('/channels', auth, (req, res) => {
    // console.log(req.query);
    if (req.query.idUser) {
      const query = `SELECT idUser, uc.idChannel, username, name, photo, (SELECT message from messages m WHERE m.idChannel=uc.idChannel ORDER BY m.id DESC LIMIT 1) as lastMessage, 
                    (SELECT createdAt from messages m WHERE m.idChannel=uc.idChannel ORDER BY createdAt DESC LIMIT 1) as createdAt, 
                    (SELECT status from users_channels WHERE idChannel=uc.idChannel AND idUser=${req.query.idUser}) as status 
                    FROM users 
                    JOIN users_channels uc ON users.id=uc.idUser 
                    WHERE uc.idChannel IN (SELECT idChannel FROM users_channels WHERE idUser=${req.query.idUser}) 
                    AND uc.idUser!=${req.query.idUser} 
                    AND (SELECT message from messages m WHERE m.idChannel=uc.idChannel ORDER BY createdAt DESC LIMIT 1)!='' 
                    ORDER BY createdAt DESC`

      connection.query(query, async (err, rows) => {
        if (err) throw err;
        for (let item of rows) {
          if (item.photo) {
            const image = await fun.resizeImage(item.photo, 60, 60);
            item.photo = fun.bufferToBase64(image);
          }
          // item.isActive = activeUsers.has(item.username);
        }

        res.json(rows);
      })
    } else {
      res.json({message: 'You need to add query to your request url'});
    }
  })

  app.use('/', router);
}