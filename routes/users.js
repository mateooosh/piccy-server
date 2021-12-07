const fun = require("../functions/functions");
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

      if (rows.length === 0) {
        res.sendStatus(404)
      } else {
        rows.map(item => {
          if (item.photo) {
            item.photo = fun.bufferToBase64(item.photo);
          }
        })

        res.json(rows);
      }
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
          const query = `INSERT INTO users VALUES(NULL, '${username}', '${email}', '${hash}', '${name}', NULL, '', 1);`;
          connection.query(query, function (err, result) {
            if (err) throw err;
            res.json({
              message: {
                en: 'Account has been created! Now You can log in.',
                pl: 'Konto zostało utworzone! Teraz możesz się zalogować.'
              },
              variant: 'success',
              created: true
            });
          })
        })
      })
      .catch(() => res.json({
        message: {
          en: 'Cannot create user account! Given username or e-mail already exists in our database. Try again.',
          pl: 'Nie można utworzyć konta! Podana nazwa użytkownika lub e-mail już istnieje w naszej bazie. Spróbuj ponownie.'
        },
        variant: 'error',
        created: false
      }))
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
    const photoHex = req.body.photo && fun.base64ToHex(req.body.photo);

    const query = `
    UPDATE users 
    SET name='${req.body.name}', description='${req.body.description}', photo=${photoHex} WHERE id=${req.params.id}`;

    console.log(query.slice(0, 100))
    connection.query(query, function (err, result) {
      if (err) throw err;
      res.json({
        message: {
          en: 'Changes have been saved!',
          pl: 'Zmiany zostały zapisane!'
        }
      });
    })
  })

  // get all user's followers
  router.get('/followers/:id', auth, (req, res) => {
    const query = `SELECT f.id, f.idUser, u.username, u.name, u.photo as userPhoto, (SELECT COUNT(*) FROM followers WHERE idFollower=u.id) as followers FROM followers f JOIN users u ON f.idUser=u.id WHERE f.idFollower=${req.params.id} ORDER BY followers DESC`;
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

  // get all user's following
  router.get('/following/:id', auth, (req, res) => {
    const query = `SELECT f.id, f.idUser, u.username, u.name, u.photo as userPhoto, (SELECT COUNT(*) FROM followers WHERE idFollower=u.id) as followers FROM followers f JOIN users u ON f.idFollower=u.id WHERE f.idUser=${req.params.id} ORDER BY followers DESC`;
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

  // remove user's account
  router.delete('/users/:id', auth, (req, res) => {
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
                    res.json({
                      message: {
                        en: 'Account has been deleted! You will be logged off.',
                        pl: 'Konto zostało usunięte! Nastąpi wylogowanie.'
                      }
                    })
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