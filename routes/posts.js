module.exports = (app, connection) => {

  const router = require('express').Router();

  //get post by id
  router.get('/posts/:id', (req, res) => {
    let query = `SELECT p.id, u.username, p.description, p.uploadDate, p.photo, u.photo as userPhoto, count(l.idPost) as likes, CASE WHEN ${req.query.idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost group by p.id HAVING p.id=${req.params.id}`;
    

    connection.query(query, 
      function (err, rows, fields) {
        if(err) throw err; 
        rows.map(item => {
          let buff = Buffer.from(item.photo);
          let base64data = buff.toString('base64');  
          item.photo = 'data:image/jpeg;base64,' + base64data;

          if(item.userPhoto){
            buff = Buffer.from(item.userPhoto);
            base64data = buff.toString('base64');  
            item.userPhoto = 'data:image/jpeg;base64,' + base64data;
          }
        })
        res.json(rows);    
      })
  })

  //get all posts
  router.get('/posts', (req, res) => {
    let query = '';
    if(req.query.username){
      if(req.query.onlyUserPosts == 'true'){
        query = `SELECT p.id, u.username, p.description, p.uploadDate, p.photo, count(l.idPost) as likes, CASE WHEN (SELECT id FROM users WHERE username='${req.query.username}') IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost WHERE p.idUser=(SELECT id FROM users WHERE username='${req.query.username}') group by p.id ORDER BY p.uploadDate DESC`;
      }
      else {
        query = `SELECT p.id, u.username, p.description, p.uploadDate, p.photo, u.photo as userPhoto, count(l.idPost) as likes, CASE WHEN ${req.query.idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost group by p.id ORDER BY p.uploadDate DESC`; 
      }
    }
    else{
      if(req.query.onlyUserPosts == 'true'){
        query = `SELECT p.id, u.username, p.description, p.uploadDate, p.photo, count(l.idPost) as likes, CASE WHEN ${req.query.idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost WHERE p.idUser=${req.query.idUser} group by p.id ORDER BY p.uploadDate DESC`;
      }
      else{
        query = `SELECT p.id, u.username, p.description, p.uploadDate, p.photo, u.photo as userPhoto, count(l.idPost) as likes, CASE WHEN ${req.query.idUser} IN (SELECT idUser from likes WHERE likes.idPost=p.id) THEN 1 ELSE 0 END as liked from users u join posts p on u.id=p.idUser left join likes l on p.id=l.idPost group by p.id ORDER BY p.uploadDate DESC`;
      }
    }

    connection.query(query, 
      function (err, rows, fields) {
        if(err) throw err; 
        rows.map(item => {
          let buff = Buffer.from(item.photo);
          let base64data = buff.toString('base64');  
          item.photo = 'data:image/jpeg;base64,' + base64data;

          if(item.userPhoto){
            buff = Buffer.from(item.userPhoto);
            base64data = buff.toString('base64');  
            item.userPhoto = 'data:image/jpeg;base64,' + base64data;
          }
        })
        res.json(rows);    
      })
  })

  //create a new post
  router.post('/posts', (req, res) => {
    const bufferValue = Buffer.from(`${req.body.photo}`,"base64");
    let photoHex = '0x'+bufferValue.toString('hex');
    const query = `INSERT INTO posts (id, idUser, description, uploadDate, photo) VALUES (NULL, ${req.body.idUser}, '${req.body.description}', current_timestamp(), ${photoHex});`;
    connection.query(query, function (err, result) {
      if(err) throw err;
      res.json({message:"Post was created"});
    })
  })

  app.use('/', router);
}