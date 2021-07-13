module.exports = (app, connection) => {

  const router = require('express').Router();

  //get users
  router.get('/users', (req, res) => {
    let query = '';
    if(req.query.idUser){
      query = `SELECT id, username, email, name, photo, description, (SELECT COUNT(*) FROM posts WHERE idUser=${req.query.idUser}) as postsAmount, (SELECT COUNT(*) FROM followers WHERE idUser=${req.query.idUser}) as following, (SELECT COUNT(*) FROM followers WHERE idFollower=${req.query.idUser}) as followers FROM users WHERE id=${req.query.idUser}`;
    }
    else if(req.query.username && req.query.myIdUser){ 
      query = `SELECT id, username, email, name, photo, description, 
        (SELECT COUNT(*) FROM posts WHERE idUser=(SELECT id from users WHERE username='${req.query.username}')) as postsAmount, 
        (SELECT COUNT(*) FROM followers WHERE idUser=(SELECT id from users WHERE username='${req.query.username}')) as following, 
        (SELECT COUNT(*) FROM followers WHERE idFollower=(SELECT id from users WHERE username='${req.query.username}')) as followers,
        CASE WHEN 
          (SELECT id FROM followers WHERE idFollower IN (SELECT id FROM users WHERE username='${req.query.username}') AND idUser=${req.query.myIdUser}) THEN 1 ELSE 0 END as amIFollowing
        FROM users WHERE id=(SELECT id from users WHERE username='${req.query.username}')`; 
    }
    else{
      query = 'SELECT id, username, email, name, photo, description FROM users';
    }

    connection.query(query, (err, rows, fields) => {
      if(err) throw err;
      rows.map(item => {
        if(item.photo){
          let buff = Buffer.from(item.photo);
          let base64data = buff.toString('base64');  
          item.photo = 'data:image/jpeg;base64,' + base64data;
        }
      })
      res.json(rows);    
    })
  })

  //create a new user
  router.post('/users', (req, res) => {
    bcrypt.hash(req.body.password, 10, function(err, hash) { 
      if (err) throw err;
      const query = `INSERT INTO users VALUES(NULL, '${req.body.username}', '${req.body.email}', '${hash}', '${req.body.name}', NULL, NULL);`;
      connection.query(query, function (err, result) {
        if(err) throw err;
        res.json({message:"User was created"});
      })
    });
  })

//follow user
router.post('/users/:id/follow/:idFollower', (req, res) => {
  const query = `INSERT INTO followers VALUES(NULL, '${req.params.id}', '${req.params.idFollower}');`;
  connection.query(query, function (err, result) {
    if(err) throw err;
    res.json({message:"Followed"}); 
  })
})

//unfollow user
router.delete('/users/:id/follow/:idFollower', (req, res) => {
  const query = `DELETE FROM followers WHERE idUser=${req.params.id} AND idFollower=${req.params.idFollower};`;
  connection.query(query, function (err, result) {
    if(err) throw err;
    res.json({message:"Unfollowed"});
  })
})

// search user by username
router.get('/users/:query', (req, res) => {
  let query = `SELECT id, username, email, name, photo from USERS WHERE username LIKE '%${req.params.query}%' OR name LIKE '%${req.params.query}%'`;

  //dorobic page


  connection.query(query, 
    function (err, rows, fields) {
      if(err) throw err; 
      rows.map(item => {
        if(item.photo){
          let buff = Buffer.from(item.photo);
          let base64data = buff.toString('base64');  
          item.photo = 'data:image/jpeg;base64,' + base64data;
        }
      })
      res.json(rows);      
    })
})

  app.use('/', router);
}