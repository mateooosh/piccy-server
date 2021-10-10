module.exports = (app, connection) => {

  //import my functions
  const fun = require('../functions/functions');

  const auth = require("../middleware/token");

  const router = require('express').Router();
  

  //get post by id
  router.get('/comments/:idPost', auth,(req, res) => {
    let query = `SELECT c.*, u.username, u.photo FROM comments c JOIN users u ON c.idUser=u.id WHERE c.idPost=${req.params.idPost} ORDER BY id DESC`;
     
    connection.query(query, 
      function (err, rows, fields) {
        if(err) throw err;

        rows.map(item => {
          item.photo = fun.bufferToBase64(item.photo);
        })

        res.json(rows);    
      })
  });

  //  BODY
  // - idUser
  // - content
  //add comment
  router.post('/comments/:idPost', auth, (req, res) => {
    const query = `INSERT INTO comments VALUES (NULL, ${req.params.idPost}, ${req.body.idUser}, NULL, '${req.body.content}')`;
    
    connection.query(query,
      (err, rows, fields) => {
        if(err) throw err;

        res.json({message: "Comment has been created"});
      }  
    )
  })

  

  app.use('/', router);
}