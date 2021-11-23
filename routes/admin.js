const auth = require("../middleware/token");
const fun = require("../functions/functions");
module.exports = (app, connection) => {

  //import my functions
  const fun = require('../functions/functions');

  const auth = require("../middleware/token");

  const router = require('express').Router();

  //get all users
  router.get('/admin/users', (req, res) => {
    let query = `SELECT id, username, email, name, photo, description, (SELECT COUNT(*) FROM followers WHERE idFollower=users.id) as followers FROM users ORDER BY followers DESC`;

    connection.query(query,
      async function (err, rows) {
        if(err) throw err;
        for (let item of rows) {
          if (item.photo) {
            const image = await fun.resizeImage(item.photo, 50, 50);
            item.photo = fun.bufferToBase64(image);
          }
        }
        res.json(rows);
      })
  });

  // remove user's account
  router.delete('/admin/users/:id',(req, res) => {
    const id = req.params.id;
    //delete from users
    let query = `DELETE FROM users WHERE id=${id}`;
    connection.query(query, (err, result) => {
      if (err) throw err;
      //delete from comments
      query = `DELETE FROM comments WHERE idUser=${id}`;
      connection.query(query, (err, result) => {
        if (err) throw err;
        // delete from followers
        query = `DELETE FROM followers WHERE idUser=${id} OR idFollower=${id}`;
        connection.query(query, (err, result) => {
          if (err) throw err;
          // delete from likes
          query = `DELETE FROM likes WHERE idUser=${id}`;
          connection.query(query, (err, result) => {
            if (err) throw err;
            // delete from posts
            query = `DELETE FROM posts WHERE idUser=${id}`;
            connection.query(query, (err, result) => {
              if (err) throw err;

              //delete from channels
              query = `DELETE FROM channels WHERE id IN (SELECT idChannel FROM users_channels WHERE idUser=${id})`;
              connection.query(query, (err, result) => {
                if (err) throw err;

                // delete from messages
                query = `DELETE FROM messages WHERE idChannel IN (SELECT idChannel FROM users_channels WHERE idUser=${id})`;
                connection.query(query, (err, result) => {
                  if (err) throw err;

                  // delete from users_channels
                  query = `DELETE FROM users_channels WHERE idUser=${id}`;
                  connection.query(query, (err, result) => {
                    if (err) throw err;
                    res.json({message: 'Account has been deleted!'})
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  app.use('/', router);
}