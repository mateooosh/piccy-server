module.exports = (app, connection) => {

  //import my functions
  const fun = require('../functions/functions');

  const auth = require("../middleware/token");

  const router = require('express').Router();
  

  //get comments by idPost
  router.get('/comments/:idPost', auth,(req, res) => {
    const {idPost} = req.params;
    let query = `SELECT c.*, u.username FROM comments c JOIN users u ON c.idUser=u.id WHERE c.idPost=${idPost} ORDER BY id DESC`;
     
    connection.query(query, 
      function (err, rows, fields) {
        if(err) throw err;

        res.json(rows);    
      })
  });

  //  BODY
  // - idUser
  // - content
  // create comment
  router.post('/comments/:idPost', auth, (req, res) => {
    const {idUser, content} = req.body;
    const {idPost} = req.params;
    const query = `INSERT INTO comments VALUES (NULL, ${idPost}, ${idUser}, NULL, '${content}')`;
    
    connection.query(query,
      (err, rows, fields) => {
        if(err) throw err;

        res.json({message: "Comment has been created"});
      }  
    )
  })

  app.use('/', router);
}