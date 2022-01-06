const fun = require("../functions/functions");
const auth = require("../middleware/token");
const cluster = require("cluster");
module.exports = (app, connection, socket) => {

  //import my functions
  const fun = require('../functions/functions');

  const auth = require('../middleware/token');

  const router = require('express').Router();

  //get post by id
  router.get('/posts/:id', auth, (req, res) => {
    let query = `
      SELECT 
      p.id, u.username, p.description, p.uploadDate, u.photo as userPhoto, 
      count(l.idPost) as likes, 
      (SELECT count(*) FROM comments c WHERE c.idPost=${req.params.id}) as comments, 
      CASE WHEN ${req.query.idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked 
      FROM users u 
      JOIN posts p ON u.id=p.idUser 
      LEFT JOIN likes l ON p.id=l.idPost 
      GROUP BY p.id HAVING p.id=${req.params.id}`;


    connection.query(query,
      async function (err, rows, fields) {
        if (err) throw err;

        if (rows.length === 0) {
          res.sendStatus(404)
        } else {
          if (rows[0]?.userPhoto) {
            const image = await fun.resizeImage(rows[0].userPhoto, 40, 40);
            rows[0].userPhoto = fun.bufferToBase64(rows[0].userPhoto);
          }

          res.json(rows);
        }
      })
  })

  //get all posts
  router.get('/posts', auth, (req, res) => {
    const {onlyUserPosts, idUser, username} = req.query;
    const offset = req.query.page * 5 - 5;

    let query = '';
    if (username) {
      if (onlyUserPosts == 'true') {
        query = `SELECT p.id, u.username, p.description, p.uploadDate, p.photo, count(l.idPost) as likes, (SELECT count(*) FROM comments c WHERE c.idPost=p.id) as comments, CASE WHEN (SELECT id FROM users WHERE username='${username}') IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost WHERE p.idUser=(SELECT id FROM users WHERE username='${username}') group by p.id ORDER BY p.id DESC`;
      } else {
        query = `SELECT p.id, u.username, p.description, p.uploadDate, u.photo as userPhoto, count(l.idPost) as likes, (SELECT count(*) FROM comments c WHERE c.idPost=p.id) as comments, CASE WHEN ${idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost group by p.id ORDER BY p.id DESC LIMIT 5 OFFSET ${offset}`;
      }
    } else {
      if (onlyUserPosts == 'true') {
        query = `SELECT p.id, u.username, p.description, p.uploadDate, p.photo, count(l.idPost) as likes, (SELECT count(*) FROM comments c WHERE c.idPost=p.id) as comments, CASE WHEN ${idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost WHERE p.idUser=${idUser} group by p.id ORDER BY p.id DESC`;
      } else {
        query = `SELECT p.id, u.username, p.description, p.uploadDate, u.photo as userPhoto, count(l.idPost) as likes, (SELECT count(*) FROM comments c WHERE c.idPost=p.id) as comments, CASE WHEN ${idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost WHERE p.idUser IN (SELECT idFollower FROM followers WHERE idUser=${idUser}) group by p.id ORDER BY p.id DESC LIMIT 5 OFFSET ${offset}`;
      }
    }

    connection.query(query,
      async function (err, rows, fields) {
        if (err) throw err;
        for (let item of rows) {
          if (item.photo) {
            item.photo = fun.bufferToBase64(item.photo);
          }

          if (item.userPhoto) {
            const image = await fun.resizeImage(item.userPhoto, 40, 40);
            item.userPhoto = fun.bufferToBase64(image);
          }
        }
        res.json(rows);
      })
  })

  //create a new post
  router.post('/posts', auth, (req, res) => {
    const {photo, idUser, description} = req.body;
    const photoHex = fun.base64ToHex(photo);

    //get tags
    let tags = description.split(' ').filter(item => item.startsWith('#'))
    console.log(tags)

    if (tags.length > 0) {
      tags = tags.map(tag => `(NULL, '${tag}')`);
      const values = tags.join(',');
      const query = `INSERT IGNORE INTO tags VALUES ${values}`;

      connection.query(query, (err, result) => {
        if (err) throw err;

        const query = `INSERT INTO posts (id, idUser, description, uploadDate, photo) VALUES (NULL, ${idUser}, '${description}', current_timestamp(), ${photoHex});`;
        connection.query(query, function (err, result) {
          if (err) throw err;

          console.log('1')
          res.json({
            message: {
              en: 'Post has been created.',
              pl: 'Post został utworzony.'
            }
          });
        })
      })
    } else {
      const query = `INSERT INTO posts (id, idUser, description, uploadDate, photo) VALUES (NULL, ${idUser}, '${description}', current_timestamp(), ${photoHex});`;
      connection.query(query, function (err, result) {
        if (err) throw err;

        console.log('2')
        res.json({
          message: {
            en: 'Post has been created.',
            pl: 'Post został utworzony.'
          }
        });
      })
    }


  })

  //delete post by id
  router.delete('/posts/:id', auth, (req, res) => {
    const idPost = req.params.id;

    let query = `DELETE FROM posts WHERE id=${idPost};`;
    connection.query(query, (err, result) => {
      if (err) throw err;

      query = `DELETE FROM reports WHERE idPost=${idPost};`;
      connection.query(query, (err, result) => {
        if (err) throw err;

        query = `DELETE FROM likes WHERE idPost=${idPost};`;
        connection.query(query, (err, result) => {
          if (err) throw err;

          query = `DELETE FROM comments WHERE idPost=${idPost}`;
          connection.query(query, (err, result) => {
            if (err) throw err;
            res.json({
              message: {
                en: 'Post has been removed.',
                pl: 'Post został usunięty.'
              }
            });
          })
        })
      })
    })
  })

  // get photo by id post
  router.get('/posts/:id/photo', auth, (req, res) => {
    const query = `SELECT photo FROM posts WHERE id=${req.params.id}`
    connection.query(query, async function (err, rows, fields) {
      if (err) throw err;

      rows[0].photo = fun.bufferToBase64(rows[0].photo);
      res.json(rows[0])
    })
  })

  //like post
  router.post('/likes', auth, (req, res) => {
    const {idUser, idPost} = req.body;

    const query = `INSERT INTO likes VALUES(NULL, '${idUser}', '${idPost}');`;
    connection.query(query, function (err, result) {
      if (err) throw err;
      res.json({message: 'Post has been liked'});
    })
  })

  //dislike post
  router.delete('/likes', auth, (req, res) => {
    const {idUser, idPost} = req.body;

    const query = `DELETE FROM likes WHERE idUser=${idUser} AND idPost=${idPost};`;
    connection.query(query, function (err, result) {
      if (err) throw err;
      res.json({message: 'Post has been disliked'});
    })
  })

  // get all users which like post
  router.get('/likes/:idPost', auth, (req, res) => {
    const query = `SELECT l.id, users.id as idUser, users.username, users.name, users.photo as userPhoto FROM users JOIN likes l ON users.id=l.idUser WHERE idPost=${req.params.idPost}`;
    connection.query(query, async function (err, rows, fields) {
      if (err) throw err;

      for (let item of rows) {
        if (item.userPhoto) {
          const image = await fun.resizeImage(item.userPhoto, 50, 50);
          item.userPhoto = fun.bufferToBase64(image);
        }
      }
      res.json(rows);
    })
  })

  app.use('/', router);
}