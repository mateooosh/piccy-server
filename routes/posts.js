module.exports = (app, connection) => {

  //import my functions
  const fun = require('../functions/functions');

  const router = require('express').Router();

  //get post by id
  router.get('/posts/:id', (req, res) => {
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

        if (rows[0].userPhoto) {
          const image = await fun.resizeImage(rows[0].userPhoto, 40, 40);
          rows[0].userPhoto = fun.bufferToBase64(image);
        }

        res.json(rows);
      })
  })

  //get all posts
  router.get('/posts', (req, res) => {
    let query = '';
    const offset = req.query.page * 5 - 5;
    if (req.query.username) {
      if (req.query.onlyUserPosts == 'true') {
        query = `SELECT p.id, u.username, p.description, p.uploadDate, p.photo, count(l.idPost) as likes, (SELECT count(*) FROM comments c WHERE c.idPost=p.id) as comments, CASE WHEN (SELECT id FROM users WHERE username='${req.query.username}') IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost WHERE p.idUser=(SELECT id FROM users WHERE username='${req.query.username}') group by p.id ORDER BY p.uploadDate DESC`;
      } else {
        query = `SELECT p.id, u.username, p.description, p.uploadDate, u.photo as userPhoto, count(l.idPost) as likes, (SELECT count(*) FROM comments c WHERE c.idPost=p.id) as comments, CASE WHEN ${req.query.idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost group by p.id ORDER BY p.uploadDate DESC LIMIT 5 OFFSET ${offset}`;
      }
    } else {
      if (req.query.onlyUserPosts == 'true') {
        query = `SELECT p.id, u.username, p.description, p.uploadDate, p.photo, count(l.idPost) as likes, (SELECT count(*) FROM comments c WHERE c.idPost=p.id) as comments, CASE WHEN ${req.query.idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost WHERE p.idUser=${req.query.idUser} group by p.id ORDER BY p.uploadDate DESC`;
      } else {
        query = `SELECT p.id, u.username, p.description, p.uploadDate, u.photo as userPhoto, count(l.idPost) as likes, (SELECT count(*) FROM comments c WHERE c.idPost=p.id) as comments, CASE WHEN ${req.query.idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost group by p.id ORDER BY p.uploadDate DESC LIMIT 5 OFFSET ${offset}`;
      }
    }

    connection.query(query,
      async function (err, rows, fields) {
        if (err) throw err;
        for (item of rows) {
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
  router.post('/posts', (req, res) => {
    const photoHex = fun.base64ToHex(req.body.photo);
    const query = `INSERT INTO posts (id, idUser, description, uploadDate, photo) VALUES (NULL, ${req.body.idUser}, '${req.body.description}', current_timestamp(), ${photoHex});`;
    connection.query(query, function (err, result) {
      if (err) throw err;
      res.json({message: "Post was created"});
    })
  })

  // get post photo by id
  router.get('/posts/:id/photo', (req, res) => {
    const query = `SELECT photo FROM posts WHERE id=${req.params.id}`
    connection.query(query, function (err, rows, fields) {
      if (err) throw err;
      rows[0].photo = fun.bufferToBase64(rows[0].photo);
      res.json(rows[0])
    })
  })

  // report post
  router.post('/reports', (req, res) => {
    const query = `INSERT INTO reports VALUES(NULL, ${req.body.idPost}, ${req.body.idReporter}, NULL, '${req.body.reason}', 'active')`;
    connection.query(query, function (err, result) {
      if (err) throw  err;
      res.json({message: 'Post has been reported!'})
    })
  })

  //like post
  router.post('/likes', (req, res) => {
    const query = `INSERT INTO likes VALUES(NULL, '${req.body.idUser}', '${req.body.idPost}');`;
    connection.query(query, function (err, result) {
      if (err) throw err;
      res.json({message: "Liked"});
    })
  })

  //dislike post
  router.delete('/likes', (req, res) => {
    const query = `DELETE FROM likes WHERE idUser=${req.body.idUser} AND idPost=${req.body.idPost};`;
    connection.query(query, function (err, result) {
      if (err) throw err;
      res.json({message: "Disliked"});
    })
  })

  app.use('/', router);
}