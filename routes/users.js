const bcrypt = require('bcrypt');
module.exports = (app, connection) => {

  //import my functions
  const fun = require('../functions/functions');

  const auth = require('../middleware/token');

  const router = require('express').Router();

  const bcrypt = require('bcrypt');


  function canCreateAccount(username, email) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM users WHERE username='${username}' OR email='${email}'`;
      connection.query(query, (err, rows, fields) => {
        if (err) reject(err);
        if (rows.length === 0)
          resolve();
        else
          reject();
      })
    })
  }

  //get users
  router.get('/users', auth, (req, res) => {
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
  router.get('/users/:id/get', auth, (req, res) => {
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
  // BODY
  // - username
  // - password
  // - email
  // - name
  router.post('/users', (req, res) => {
    const {username, password, email, name} = req.body;

    canCreateAccount(username, email)
      .then(() => {
        bcrypt.hash(password, 10, function (err, hash) {
          if (err) throw err;
          const query = `INSERT INTO users VALUES(NULL, '${username}', '${email}', '${hash}', '${name}', NULL, NULL);`;
          connection.query(query, function (err, result) {
            if (err) throw err;
            res.json({message: 'Account has been created! Now You can log in', created: true});
          })
        })
      })
      .catch(() => res.json({message: 'Cannot create user account! Given username or email already exists in our database. Try again.', created: false}))
  })

  //follow user
  router.post('/users/:id/follow/:idFollower', auth, (req, res) => {
    const query = `INSERT INTO followers VALUES(NULL, '${req.params.id}', '${req.params.idFollower}');`;
    connection.query(query, function (err, result) {
      if (err) throw err;
      res.json({message: 'Followed'});
    })
  })

  //unfollow user
  router.delete('/users/:id/follow/:idFollower', auth, (req, res) => {
    const query = `DELETE FROM followers WHERE idUser=${req.params.id} AND idFollower=${req.params.idFollower};`;
    connection.query(query, function (err, result) {
      if (err) throw err;
      res.json({message: 'Unfollowed'});
    })
  })

  // search user by username
  router.get('/users/:query', auth, (req, res) => {
    let query = `SELECT id, username, email, name, photo, (SELECT COUNT(*) FROM followers 
        WHERE idFollower=u.id) as followers from USERS u 
        WHERE username LIKE '%${req.params.query}%' OR name LIKE '%${req.params.query}%' 
        ORDER BY followers DESC`;

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
  router.put('/users/:id', auth, (req, res) => {
    const photoHex = fun.base64ToHex(req.body.photo);

    const query = `
    UPDATE users 
    SET username='${req.body.username}', email='${req.body.email}', name='${req.body.name}', description='${req.body.description}', photo=${photoHex} WHERE id=${req.params.id}`;

    console.log(query.slice(query.length-200, query.length ))

    connection.query(query, function (err, result) {
      if (err) throw err;
      res.json({message: 'Changed have been saved!'});
    })
  })

  // remove user's account
  router.delete('/users/:id', (req, res) => {
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
                    res.json({message: 'Account has been deleted! You will be logged off'})
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