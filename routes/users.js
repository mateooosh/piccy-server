const fun = require("../functions/functions");

module.exports = (app, connection) => {

  //import my functions
  const fun = require('../functions/functions');

  const router = require('express').Router();

  //get users
  router.get('/users', (req, res) => {
    let query = '';
    if (req.query.idUser) {
      query = `SELECT id, username, email, name, photo, description, (SELECT COUNT(*) FROM posts WHERE idUser=${req.query.idUser}) as postsAmount, (SELECT COUNT(*) FROM followers WHERE idUser=${req.query.idUser}) as following, (SELECT COUNT(*) FROM followers WHERE idFollower=${req.query.idUser}) as followers FROM users WHERE id=${req.query.idUser}`;
    } else if (req.query.username && req.query.myIdUser) {
      query = `SELECT id, username, email, name, photo, description, 
        (SELECT COUNT(*) FROM posts WHERE idUser=(SELECT id from users WHERE username='${req.query.username}')) as postsAmount, 
        (SELECT COUNT(*) FROM followers WHERE idUser=(SELECT id from users WHERE username='${req.query.username}')) as following, 
        (SELECT COUNT(*) FROM followers WHERE idFollower=(SELECT id from users WHERE username='${req.query.username}')) as followers,
        CASE WHEN 
          (SELECT id FROM followers WHERE idFollower IN (SELECT id FROM users WHERE username='${req.query.username}') AND idUser=${req.query.myIdUser}) THEN 1 ELSE 0 END as amIFollowing
        FROM users WHERE id=(SELECT id from users WHERE username='${req.query.username}')`;
    } else {
      query = 'SELECT id, username, email, name, photo, description, (SELECT COUNT(*) FROM followers WHERE idFollower=users.id) as followers FROM users ORDER BY followers DESC';
    }

    connection.query(query, (err, rows, fields) => {
      if (err) throw err;
      rows.map(item => {
        if (item.photo) {
          item.photo = fun.bufferToBase64(item.photo);
        }
      })
      res.json(rows);
    })
  })

  //get user by id
  router.get('/users/:id/get', (req, res) => {
    let query = `SELECT id, username, email, name, photo, description FROM users WHERE id=${req.params.id}`;

    connection.query(query, (err, rows) => {
      if (err) throw err;
      if (rows[0].photo) {
        rows[0].photo = fun.bufferToBase64(rows[0].photo);
      }
      res.json(rows[0]);
    })
  })

  //create a new user
  router.post('/users', (req, res) => {
    bcrypt.hash(req.body.password, 10, function (err, hash) {
      if (err) throw err;
      const query = `INSERT INTO users VALUES(NULL, '${req.body.username}', '${req.body.email}', '${hash}', '${req.body.name}', NULL, NULL);`;
      connection.query(query, function (err, result) {
        if (err) throw err;
        res.json({message: "User was created"});
      })
    });
  })

  //follow user
  router.post('/users/:id/follow/:idFollower', (req, res) => {
    const query = `INSERT INTO followers VALUES(NULL, '${req.params.id}', '${req.params.idFollower}');`;
    connection.query(query, function (err, result) {
      if (err) throw err;
      res.json({message: "Followed"});
    })
  })

  //unfollow user
  router.delete('/users/:id/follow/:idFollower', (req, res) => {
    const query = `DELETE FROM followers WHERE idUser=${req.params.id} AND idFollower=${req.params.idFollower};`;
    connection.query(query, function (err, result) {
      if (err) throw err;
      res.json({message: "Unfollowed"});
    })
  })

  // search user by username
  router.get('/users/:query', (req, res) => {
    let query = `SELECT id, username, email, name, photo, (SELECT COUNT(*) FROM followers WHERE idFollower=u.id) as followers from USERS u WHERE username LIKE '%${req.params.query}%' OR name LIKE '%${req.params.query}%' ORDER BY followers DESC`;

    //dorobic page


    connection.query(query,
      function (err, rows, fields) {
        if (err) throw err;
        rows.map(item => {
          if (item.photo) {
            item.photo = fun.bufferToBase64(item.photo);
          }
        })
        res.json(rows);
      })
  })

  // update user's info
  router.put('/users/:id', (req, res) => {
    const photoHex = fun.base64ToHex(req.body.photo);
    console.log(photoHex)
    const query = `
    UPDATE users 
    SET username='${req.body.username}', email='${req.body.email}', name='${req.body.name}', description='${req.body.description}', photo=${photoHex} 
    WHERE id=${req.params.id}`;
    console.log(query);

    connection.query(query, function (err, result) {
      if (err) throw err;
      res.json({message: 'Saved changes'});
    })
  })

  app.use('/', router);
}